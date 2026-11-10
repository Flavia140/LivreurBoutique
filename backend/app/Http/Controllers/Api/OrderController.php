<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Shop;
use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private OrderService $orders) {}

    public function index(Request $request)
    {
        return OrderResource::collection(Order::with('items', 'shop', 'delivery')->where('client_id', $request->user()->id)->latest()->paginate(20));
    }

    public function show(Request $request, Order $order): OrderResource
    {
        abort_unless($order->client_id === $request->user()->id, 404);

        return new OrderResource($order->load('items', 'shop', 'delivery'));
    }

    public function store(Request $request): OrderResource
    {
        $data = $request->validate([
            'shop_id' => ['required', 'exists:shops,id'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'between:1,99'],
            'dropoff_zone_id' => ['required', 'exists:zones,id'],
            'dropoff_address' => ['required', 'string', 'max:255'],
            'recipient_name' => ['nullable', 'string', 'max:120'],
            'recipient_phone' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $order = $this->orders->create($request->user(), Shop::findOrFail($data['shop_id']), $data['items'], $data);

        return new OrderResource($order->load('shop'));
    }

    public function rate(Request $request, Order $order)
    {
        abort_unless($order->client_id === $request->user()->id, 404);
        $data = $request->validate([
            'score' => ['required', 'integer', 'between:1,5'],
            'conformity' => ['nullable', 'integer', 'between:1,5'],
            'presentation' => ['nullable', 'integer', 'between:1,5'],
            'packaging' => ['nullable', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json(['data' => $this->orders->rate($request->user(), $order, $data)], 201);
    }
}
