<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Resources\DeliveryResource;
use App\Models\CourierDocument;
use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Services\DeliveryService;
use App\Services\ServiceHours;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CourierController extends Controller
{
    public function __construct(private DeliveryService $service) {}

    public function uploadDocument(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(CourierProfile::REQUIRED_DOCUMENTS)],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'document_number' => ['nullable', 'string', 'max:60'],
            'expires_on' => ['nullable', 'date', 'after:today'],
        ]);

        $profile = $request->user()->courierProfile;
        if ($data['type'] === 'profile_photo' && $profile->isVerified()) {
            throw new BusinessRuleException('La photo de profil ne peut être changée qu\'avec l\'accord de l\'équipe YAKO.', 403);
        }

        $path = $request->file('file')->store("couriers/{$profile->id}", 'local');
        CourierDocument::updateOrCreate(
            ['courier_profile_id' => $profile->id, 'type' => $data['type']],
            ['path' => $path, 'document_number' => $data['document_number'] ?? null, 'expires_on' => $data['expires_on'] ?? null, 'status' => 'pending'],
        );
        if ($profile->validation_status === 'rejected') {
            $profile->update(['validation_status' => 'pending', 'rejection_reason' => null]);
        }

        return response()->json(['message' => 'Document reçu.', 'missing_documents' => $profile->missingDocuments()], 201);
    }

    public function availability(Request $request, ServiceHours $hours): JsonResponse
    {
        $data = $request->validate([
            'available' => ['required', 'boolean'],
            'zone_id' => ['nullable', 'exists:zones,id'],
        ]);
        $profile = $request->user()->courierProfile;
        if (! $profile->isVerified()) {
            throw new BusinessRuleException('Votre dossier est en cours de validation.', 403, 'courier_not_verified');
        }
        if ($data['available'] && ! $hours->isOpen()) {
            throw new BusinessRuleException($hours->message(), 403, 'outside_service_hours');
        }

        $profile->update(['available' => $data['available'], 'current_zone_id' => $data['zone_id'] ?? $profile->current_zone_id]);

        return response()->json(['data' => ['available' => $profile->available, 'zone_id' => $profile->current_zone_id]]);
    }

    /** Courses payées, sans livreur, dans la zone actuelle du livreur. */
    public function openMissions(Request $request)
    {
        $profile = $request->user()->courierProfile;
        if (! $profile->isVerified()) {
            throw new BusinessRuleException('Votre dossier est en cours de validation.', 403, 'courier_not_verified');
        }

        $missions = Delivery::with('pickupZone', 'dropoffZone', 'client')
            ->where('status', Delivery::PENDING)->whereNull('courier_id')
            ->when($profile->current_zone_id, fn ($q) => $q->where('pickup_zone_id', $profile->current_zone_id))
            ->oldest('paid_at')->limit(50)->get();

        return DeliveryResource::collection($missions);
    }

    public function current(Request $request)
    {
        $mission = Delivery::with('pickupZone', 'dropoffZone', 'client')
            ->where('courier_id', $request->user()->id)
            ->whereIn('status', [Delivery::ACCEPTED, Delivery::IN_PROGRESS])->first();

        return response()->json(['data' => $mission ? new DeliveryResource($mission) : null]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->courierProfile;
        $today = Delivery::where('courier_id', $user->id)->where('status', Delivery::DELIVERED)->where('delivered_at', '>=', now()->startOfDay());
        $current = Delivery::with('pickupZone', 'dropoffZone', 'client')->where('courier_id', $user->id)
            ->whereIn('status', [Delivery::ACCEPTED, Delivery::IN_PROGRESS])->first();

        return response()->json(['data' => [
            'online' => $profile->available,
            'verified' => $profile->isVerified(),
            'today_deliveries' => (clone $today)->count(),
            'today_earnings' => (int) (clone $today)->sum('price'),
            'rating_avg' => $profile->rating_avg,
            'rating_count' => $profile->rating_count,
            'current' => $current ? new DeliveryResource($current) : null,
        ]]);
    }

    /** Gains : le livreur touche le prix de la course ; YAKO garde la commission. Les frais d'annulation lui reviennent. */
    public function earnings(Request $request): JsonResponse
    {
        $period = $request->query('period', 'day');
        $from = match ($period) {
            'week' => now()->startOfWeek(), 'month' => now()->startOfMonth(), default => now()->startOfDay()
        };
        $id = $request->user()->id;

        $delivered = Delivery::where('courier_id', $id)->where('status', Delivery::DELIVERED)->where('delivered_at', '>=', $from);
        $cancelled = Delivery::where('courier_id', $id)->where('status', Delivery::CANCELLED)->where('cancellation_fee', '>', 0)->where('cancelled_at', '>=', $from);
        $history = Delivery::with('pickupZone', 'dropoffZone')->where('courier_id', $id)->whereIn('status', [Delivery::DELIVERED, Delivery::CANCELLED])
            ->where('updated_at', '>=', $from)->latest('updated_at')->limit(50)->get()
            ->map(fn ($d) => [
                'code' => $d->code, 'status' => $d->status,
                'route' => "{$d->pickupZone->name} → {$d->dropoffZone->name}",
                'amount' => $d->status === Delivery::DELIVERED ? $d->price : $d->cancellation_fee,
                'at' => $d->delivered_at ?? $d->cancelled_at,
            ]);

        $courses = (int) (clone $delivered)->sum('price');
        $fees = (int) (clone $cancelled)->sum('cancellation_fee');

        return response()->json(['data' => [
            'period' => $period, 'total' => $courses + $fees, 'deliveries' => (clone $delivered)->count(),
            'courses_amount' => $courses, 'bonus' => 0, 'cancellation_fees' => $fees, 'history' => $history,
        ]]);
    }

    public function location(Request $request): JsonResponse
    {
        $data = $request->validate(['lat' => ['required', 'numeric', 'between:-90,90'], 'lng' => ['required', 'numeric', 'between:-180,180']]);
        $delivery = $this->service->updateLocation($request->user(), (float) $data['lat'], (float) $data['lng']);

        return response()->json(['ok' => true, 'tracking' => (bool) $delivery]);
    }

    public function accept(Request $request, Delivery $delivery): DeliveryResource
    {
        return new DeliveryResource($this->service->accept($request->user(), $delivery->id)->load('pickupZone', 'dropoffZone', 'client'));
    }

    public function pickup(Request $request, Delivery $delivery): DeliveryResource
    {
        return new DeliveryResource($this->service->pickup($request->user(), $delivery)->load('pickupZone', 'dropoffZone', 'client'));
    }

    public function deliver(Request $request, Delivery $delivery): DeliveryResource
    {
        $data = $request->validate(['code' => ['required', 'digits:4']]);

        return new DeliveryResource($this->service->deliver($request->user(), $delivery, $data['code'])->load('pickupZone', 'dropoffZone', 'client'));
    }
}
