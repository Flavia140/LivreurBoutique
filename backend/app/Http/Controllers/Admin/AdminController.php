<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CourierDocument;
use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\MerchantApplication;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Shop;
use App\Models\Subscription;
use App\Models\Tariff;
use App\Models\User;
use App\Models\Zone;
use App\Services\PushNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Back-office YAKO : validations, boutiques, zones et tarifs, réglages, espèces à reverser. */
class AdminController extends Controller
{
    public const DELIVERY_LABELS = [
        'awaiting_payment' => 'attente paiement', 'awaiting_merchant' => 'attente boutique', 'pending' => 'cherche livreur',
        'accepted' => 'acceptée', 'in_progress' => 'en cours', 'delivered' => 'livrée', 'cancelled' => 'annulée',
    ];

    public function __construct(private PushNotifier $push) {}

    public function dashboard(): View
    {
        $today = now()->startOfDay();

        return view('admin.dashboard', [
            'stats' => [
                'Livreurs à valider' => [CourierProfile::where('validation_status', 'pending')->count(), route('admin.couriers')],
                'Commerçants à valider' => [MerchantApplication::where('status', 'pending')->count(), route('admin.merchants')],
                'Boutiques à mettre en ligne' => [Shop::where('status', 'pending_review')->count(), route('admin.shops')],
                'Espèces à récupérer (FCFA)' => [number_format($this->cashOwedQuery()->get()->sum('owed'), 0, ',', ' '), route('admin.cash')],
            ],
            'today' => [
                'Livraisons du jour' => Delivery::where('created_at', '>=', $today)->whereNot('status', Delivery::AWAITING_PAYMENT)->count(),
                'Livrées' => Delivery::where('delivered_at', '>=', $today)->count(),
                'Commandes boutique' => Order::where('created_at', '>=', $today)->whereNot('status', Order::AWAITING_PAYMENT)->count(),
                'Commission YAKO (FCFA)' => number_format(Delivery::where('delivered_at', '>=', $today)->sum('commission'), 0, ',', ' '),
                'Livreurs en ligne' => CourierProfile::where('available', true)->count(),
                'Abonnements actifs' => Subscription::where('status', 'active')->where('ends_at', '>', now())->count(),
            ],
            'recent' => Delivery::with('pickupZone', 'dropoffZone', 'courier')->whereNot('status', Delivery::AWAITING_PAYMENT)->latest()->limit(10)->get(),
        ]);
    }

    // ---- Livreurs -------------------------------------------------------

    public function couriers(Request $request): View
    {
        $status = $request->query('status', 'pending');

        return view('admin.couriers', [
            'status' => $status,
            'couriers' => CourierProfile::with('user', 'documents')->where('validation_status', $status)->latest()->paginate(30)->withQueryString(),
        ]);
    }

    public function courier(CourierProfile $courier): View
    {
        return view('admin.courier', ['c' => $courier->load('user.zone', 'documents')]);
    }

    public function courierDocument(CourierDocument $document): StreamedResponse
    {
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->response($document->path);
    }

    public function decideCourier(Request $request, CourierProfile $courier): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'reason' => ['nullable', 'required_if:decision,reject', 'string', 'max:500']]);
        if ($data['decision'] === 'approve') {
            if ($courier->missingDocuments()) {
                return back()->withErrors(['decision' => 'Dossier incomplet : il manque des documents.']);
            }
            $courier->update(['validation_status' => 'approved', 'verified_at' => now(), 'rejection_reason' => null]);
            $courier->documents()->update(['status' => 'approved']);
            $this->push->send($courier->user, 'Compte validé', 'Bienvenue chez YAKO ! Vous pouvez maintenant accepter des courses.');
        } else {
            $courier->update(['validation_status' => 'rejected', 'rejection_reason' => $data['reason'], 'available' => false]);
            $this->push->send($courier->user, 'Dossier à compléter', $data['reason']);
        }

        return redirect()->route('admin.couriers')->with('ok', "Dossier de {$courier->user->first_name} mis à jour.");
    }

    // ---- Commerçants ----------------------------------------------------

    public function merchants(Request $request): View
    {
        $status = $request->query('status', 'pending');

        return view('admin.merchants', [
            'status' => $status,
            'applications' => MerchantApplication::with('user', 'zone')->where('status', $status)->latest()->paginate(30)->withQueryString(),
        ]);
    }

    public function merchantDocument(MerchantApplication $application, int $index): StreamedResponse
    {
        $path = $application->documents[$index] ?? abort(404);
        abort_unless(Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path);
    }

    public function decideMerchant(Request $request, MerchantApplication $application): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'notes' => ['nullable', 'string', 'max:500']]);
        $application->update(['status' => $data['decision'] === 'approve' ? 'approved' : 'rejected', 'admin_notes' => $data['notes'] ?? null]);
        $this->push->send($application->user, $data['decision'] === 'approve' ? 'Commerce validé' : 'Demande refusée',
            $data['decision'] === 'approve' ? 'Choisissez votre abonnement et créez votre boutique.' : ($data['notes'] ?? 'Contactez YAKO pour plus de détails.'));

        return back()->with('ok', "« {$application->business_name} » mis à jour.");
    }

    // ---- Boutiques ------------------------------------------------------

    public function shops(Request $request): View
    {
        $status = $request->query('status', 'pending_review');

        return view('admin.shops', [
            'status' => $status,
            'shops' => Shop::with('merchant', 'zone')->withCount('products')->where('status', $status)->latest()->paginate(30)->withQueryString(),
        ]);
    }

    public function setShopStatus(Request $request, Shop $shop): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['live', 'suspended', 'draft'])]]);
        $shop->update(['status' => $data['status']]);
        $messages = ['live' => 'Votre boutique est en ligne !', 'suspended' => 'Votre boutique a été suspendue. Contactez YAKO.', 'draft' => 'Votre boutique doit être corrigée avant la mise en ligne.'];
        $this->push->send($shop->merchant, $shop->name, $messages[$data['status']]);

        return back()->with('ok', "« {$shop->name} » : statut mis à jour.");
    }

    // ---- Zones et tarifs -------------------------------------------------

    public function zones(): View
    {
        return view('admin.zones', [
            'zones' => Zone::orderBy('city')->orderBy('name')->get(),
            'tariffs' => Tariff::with('fromZone', 'toZone')->orderBy('from_zone_id')->orderBy('to_zone_id')->get(),
            'linkTypes' => Tariff::LINK_TYPES,
        ]);
    }

    public function storeZone(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'], 'city' => ['required', 'string', 'max:80'], 'department' => ['nullable', 'string', 'max:80'],
        ]);
        $zone = Zone::firstOrCreate(['city' => $data['city'], 'name' => $data['name']], ['department' => $data['department'] ?? null]);

        return back()->with('ok', "Zone « {$zone->name} » ajoutée. Pensez à définir ses tarifs.");
    }

    public function toggleZone(Zone $zone): RedirectResponse
    {
        $zone->update(['active' => ! $zone->active]);

        return back()->with('ok', "Zone « {$zone->name} » ".($zone->active ? 'activée' : 'désactivée').'.');
    }

    public function saveTariff(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from_zone_id' => ['required', 'exists:zones,id'], 'to_zone_id' => ['required', 'exists:zones,id'],
            'link_type' => ['required', Rule::in(Tariff::LINK_TYPES)],
            'price' => ['required', 'integer', 'min:0'], 'commission' => ['required', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);
        [$a, $b] = [min($data['from_zone_id'], $data['to_zone_id']), max($data['from_zone_id'], $data['to_zone_id'])];
        $existing = Tariff::where(fn ($q) => $q->where('from_zone_id', $a)->where('to_zone_id', $b))
            ->orWhere(fn ($q) => $q->where('from_zone_id', $b)->where('to_zone_id', $a))->first();
        $values = ['link_type' => $data['link_type'], 'price' => $data['price'], 'commission' => $data['commission'], 'active' => $request->boolean('active', true)];
        $existing ? $existing->update($values) : Tariff::create(['from_zone_id' => $a, 'to_zone_id' => $b, ...$values]);

        return back()->with('ok', 'Tarif enregistré.');
    }

    // ---- Réglages -------------------------------------------------------

    public function settings(): View
    {
        return view('admin.settings', ['cashLimit' => Setting::cashLimit()]);
    }

    public function saveSettings(Request $request): RedirectResponse
    {
        $data = $request->validate(['cash_limit' => ['required', 'integer', 'min:0', 'max:1000000']]);
        Setting::put('cash_limit', $data['cash_limit']);

        return back()->with('ok', 'Réglages enregistrés.');
    }

    // ---- Espèces à reverser ----------------------------------------------

    private function cashOwedQuery()
    {
        return Delivery::query()->where('payment_method', 'cash')->whereNotNull('cash_collected_at')->whereNull('cash_remitted_at')
            ->selectRaw('courier_id, count(*) as deliveries, coalesce(sum(total - price), 0) as owed, min(cash_collected_at) as oldest')
            ->groupBy('courier_id');
    }

    public function cash(): View
    {
        $rows = $this->cashOwedQuery()->orderByDesc('owed')->get();
        $couriers = User::whereIn('id', $rows->pluck('courier_id'))->get()->keyBy('id');

        return view('admin.cash', ['rows' => $rows, 'couriers' => $couriers]);
    }

    public function remitCash(User $courier): RedirectResponse
    {
        $count = DB::transaction(fn () => Delivery::where('courier_id', $courier->id)->where('payment_method', 'cash')
            ->whereNotNull('cash_collected_at')->whereNull('cash_remitted_at')->lockForUpdate()->update(['cash_remitted_at' => now()]));

        return back()->with('ok', "{$count} livraison(s) de {$courier->first_name} marquées comme reversées.");
    }

    // ---- Comptes --------------------------------------------------------

    public function users(Request $request): View
    {
        $q = $request->query('q');

        return view('admin.users', [
            'q' => $q,
            'users' => User::when($q, fn ($query) => $query->where(fn ($w) => $w->where('phone', 'like', "%{$q}%")->orWhere('first_name', 'like', "%{$q}%")->orWhere('last_name', 'like', "%{$q}%")))
                ->whereNot('role', User::ROLE_ADMIN)->latest()->paginate(40)->withQueryString(),
        ]);
    }

    public function toggleUser(User $user): RedirectResponse
    {
        abort_if($user->isAdmin(), 403);
        $user->update(['status' => $user->status === 'active' ? 'suspended' : 'active']);
        if ($user->status === 'suspended') {
            $user->tokens()->delete();
            $user->courierProfile?->update(['available' => false]);
        }

        return back()->with('ok', "{$user->first_name} : compte ".($user->status === 'active' ? 'réactivé' : 'suspendu').'.');
    }
}
