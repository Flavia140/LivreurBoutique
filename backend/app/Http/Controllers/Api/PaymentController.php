<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Payment;
use App\Services\DeliveryService;
use App\Services\FeexPayClient;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function __construct(private FeexPayClient $feexpay, private DeliveryService $deliveries, private SubscriptionService $subscriptions) {}

    /** Le client lance le paiement Mobile Money ; il valide ensuite sur son téléphone. */
    public function pay(Request $request, Delivery $delivery): JsonResponse
    {
        abort_unless($delivery->client_id === $request->user()->id, 403);
        $data = $request->validate([
            'network' => ['required', Rule::in(FeexPayClient::NETWORKS)],
            'phone' => ['required', 'string', 'regex:/^\+229\d{8,10}$/'],
        ]);

        if ($delivery->status !== Delivery::AWAITING_PAYMENT) {
            throw new BusinessRuleException('Cette commande est déjà payée ou annulée.', 409, 'not_payable');
        }
        if ($delivery->payments()->where('status', 'pending')->where('created_at', '>', now()->subMinutes(2))->exists()) {
            throw new BusinessRuleException('Un paiement est déjà en cours. Validez-le sur votre téléphone.', 409, 'payment_in_progress');
        }

        $user = $request->user();
        $result = $this->feexpay->requestToPay($delivery->total, $data['phone'], $data['network'], trim("{$user->first_name} {$user->last_name}"), $user->email);

        $payment = $delivery->payments()->create([
            'reference' => $result['reference'],
            'network' => $data['network'],
            'phone' => $data['phone'],
            'amount' => $delivery->total,
            'status' => 'pending',
            'raw' => $result,
        ]);

        return response()->json(['data' => ['payment_id' => $payment->id, 'reference' => $payment->reference, 'status' => 'pending',
            'message' => 'Validez le paiement sur votre téléphone.']], 202);
    }

    /** L'app interroge ce point pour savoir si le paiement est confirmé. */
    public function status(Request $request, Delivery $delivery): JsonResponse
    {
        abort_unless($delivery->client_id === $request->user()->id, 403);
        $payment = $delivery->payments()->latest('id')->first();
        if ($payment && $payment->status === 'pending') {
            $this->reconcile($payment);
            $payment->refresh();
        }

        return response()->json(['data' => ['delivery_status' => $delivery->fresh()->status, 'payment_status' => $payment?->status]]);
    }

    /** Rappel de FeexPay. On ne fait jamais confiance au contenu : on revérifie le statut auprès de FeexPay. */
    public function webhook(Request $request): JsonResponse
    {
        $reference = $request->input('reference') ?? $request->input('data.reference');
        $payment = $reference ? Payment::where('reference', $reference)->first() : null;
        if (! $payment) {
            Log::warning('FeexPay webhook inconnu', $request->all());

            return response()->json(['ok' => true]);
        }

        $this->reconcile($payment);

        return response()->json(['ok' => true]);
    }

    public function reconcile(Payment $payment): void
    {
        $status = $this->feexpay->status($payment->reference);

        if ($status['status'] === 'SUCCESSFUL' && ($status['amount'] === null || $status['amount'] >= $payment->amount)) {
            $payment->subscription_id
                ? $this->subscriptions->activate($payment, $status['raw'])
                : $this->deliveries->markPaid($payment, $status['raw']);
        } elseif ($status['status'] === 'FAILED') {
            $payment->update(['status' => 'failed', 'raw' => $status['raw']]);
        }
    }
}
