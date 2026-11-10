<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeliveryResource;
use App\Models\Delivery;
use App\Services\DeliveryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DeliveryController extends Controller
{
    public function __construct(private DeliveryService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Delivery::with('pickupZone', 'dropoffZone', 'courier.courierProfile', 'client')->latest();
        $query->where($user->isCourier() ? 'courier_id' : 'client_id', $user->id);

        return DeliveryResource::collection($query->paginate(20));
    }

    public function show(Request $request, Delivery $delivery): DeliveryResource
    {
        $this->authorizeParticipant($request, $delivery);

        return new DeliveryResource($delivery->load('pickupZone', 'dropoffZone', 'courier.courierProfile', 'client'));
    }

    public function store(Request $request): DeliveryResource
    {
        $data = $request->validate([
            'pickup_zone_id' => ['required', 'exists:zones,id'],
            'pickup_address' => ['required', 'string', 'max:255'],
            'pickup_contact_phone' => ['nullable', 'string', 'max:20'],
            'dropoff_zone_id' => ['required', 'exists:zones,id'],
            'dropoff_address' => ['required', 'string', 'max:255'],
            'recipient_name' => ['nullable', 'string', 'max:120'],
            'recipient_phone' => ['required', 'string', 'max:20'],
            'parcel_type' => ['required', Rule::in(Delivery::PARCEL_TYPES)],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $delivery = $this->service->create($request->user(), $data);

        return new DeliveryResource($delivery->load('pickupZone', 'dropoffZone'));
    }

    public function cancel(Request $request, Delivery $delivery): DeliveryResource
    {
        abort_unless($delivery->client_id === $request->user()->id, 403);

        return new DeliveryResource($this->service->cancel($request->user(), $delivery)->load('pickupZone', 'dropoffZone', 'courier.courierProfile'));
    }

    public function rate(Request $request, Delivery $delivery)
    {
        abort_unless($delivery->client_id === $request->user()->id, 403);
        $data = $request->validate([
            'score' => ['required', 'integer', 'between:1,5'],
            'punctuality' => ['nullable', 'integer', 'between:1,5'],
            'care' => ['nullable', 'integer', 'between:1,5'],
            'politeness' => ['nullable', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json(['data' => $this->service->rate($request->user(), $delivery, $data)], 201);
    }

    private function authorizeParticipant(Request $request, Delivery $delivery): void
    {
        $id = $request->user()->id;
        abort_unless($delivery->client_id === $id || $delivery->courier_id === $id || $request->user()->isAdmin(), 403);
    }
}
