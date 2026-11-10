<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ShopResource;
use App\Models\Product;
use App\Models\Shop;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Parcours client : villes, boutiques, produits, recherche. */
class CatalogController extends Controller
{
    public function cities(): JsonResponse
    {
        $cities = Zone::where('active', true)->select('city')->selectRaw('count(*) as zones')->groupBy('city')->orderBy('city')->get();

        return response()->json(['data' => $cities->map(fn ($c) => ['city' => $c->city, 'zones' => (int) $c->zones, 'available' => true])]);
    }

    public function shops(Request $request)
    {
        $data = $request->validate([
            'city' => ['nullable', 'string'], 'category' => ['nullable', 'string'], 'q' => ['nullable', 'string', 'max:80'], 'featured' => ['nullable', 'boolean'],
        ]);

        $shops = Shop::with('zone')->where('status', 'live')
            ->when($data['city'] ?? null, fn ($q, $city) => $q->whereHas('zone', fn ($z) => $z->where('city', $city)))
            ->when($data['category'] ?? null, fn ($q, $c) => $q->where('category', $c))
            ->when($data['q'] ?? null, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->boolean('featured'), fn ($q) => $q->where('featured', true))
            ->orderByDesc('featured')->orderByDesc('rating_avg')->paginate(20);

        return ShopResource::collection($shops);
    }

    public function shop(Shop $shop): ShopResource
    {
        abort_unless($shop->isLive(), 404);

        return new ShopResource($shop->load('zone', 'categories'));
    }

    public function shopProducts(Request $request, Shop $shop)
    {
        abort_unless($shop->isLive(), 404);
        $products = $shop->products()->where('active', true)
            ->when($request->query('category'), fn ($q, $c) => $q->where('product_category_id', $c))
            ->when($request->query('q'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderByDesc('sold_count')->paginate(30);

        return ProductResource::collection($products);
    }

    public function product(Product $product): ProductResource
    {
        abort_unless($product->active && $product->shop->isLive(), 404);

        return new ProductResource($product->load('shop'));
    }

    public function search(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:2', 'max:80'], 'city' => ['nullable', 'string']]);
        $inCity = fn ($q) => $data['city'] ?? null ? $q->whereHas('zone', fn ($z) => $z->where('city', $data['city'])) : $q;

        $shops = $inCity(Shop::with('zone')->where('status', 'live')->where('name', 'like', "%{$data['q']}%"))->limit(10)->get();
        $products = Product::with('shop')->where('active', true)->where('name', 'like', "%{$data['q']}%")
            ->whereHas('shop', fn ($q) => $inCity($q->where('status', 'live')))->limit(20)->get();

        return response()->json(['data' => ['shops' => ShopResource::collection($shops), 'products' => ProductResource::collection($products)]]);
    }
}
