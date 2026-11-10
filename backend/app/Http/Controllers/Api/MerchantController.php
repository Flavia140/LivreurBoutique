<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ShopResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Shop;
use App\Models\Subscription;
use App\Services\FeexPayClient;
use App\Services\OrderService;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Espace commerçant : abonnement, boutique (modèles), produits, commandes, tableau de bord. */
class MerchantController extends Controller
{
    public function plans(): JsonResponse
    {
        return response()->json(['data' => collect(config('yako.plans'))->map(fn ($p, $k) => ['plan' => $k, ...$p])->values()]);
    }

    public function subscribe(Request $request, SubscriptionService $service): JsonResponse
    {
        $data = $request->validate([
            'plan' => ['required', Rule::in(array_keys(config('yako.plans')))],
            'network' => ['required', Rule::in(FeexPayClient::NETWORKS)],
            'phone' => ['required', 'string', 'regex:/^\+229\d{8,10}$/'],
        ]);
        [$subscription, $payment] = $service->start($request->user(), $data['plan'], $data['network'], $data['phone']);

        return response()->json(['data' => ['subscription_id' => $subscription->id, 'payment_status' => $payment->status, 'message' => 'Validez le paiement sur votre téléphone.']], 202);
    }

    public function subscriptionStatus(Request $request, Subscription $subscription, PaymentController $payments): JsonResponse
    {
        abort_unless($subscription->merchant_id === $request->user()->id, 404);
        $payment = Payment::where('subscription_id', $subscription->id)->latest('id')->first();
        if ($payment?->status === 'pending') {
            $payments->reconcile($payment);
        }
        $subscription->refresh();

        return response()->json(['data' => ['status' => $subscription->status, 'ends_at' => $subscription->ends_at]]);
    }

    public function show(Request $request): JsonResponse
    {
        $shop = $request->user()->shop()->first()?->load('zone', 'categories');
        $sub = $request->user()->activeSubscription();

        return response()->json(['data' => [
            'shop' => $shop ? new ShopResource($shop) : null,
            'application_status' => $request->user()->merchantApplication?->status,
            'subscription' => $sub ? ['plan' => $sub->plan, 'ends_at' => $sub->ends_at] : null,
            'templates' => Shop::TEMPLATES,
        ]]);
    }

    /** Création de la boutique à partir d'un modèle, puis personnalisation. */
    public function saveShop(Request $request): ShopResource
    {
        $user = $request->user();
        $shop = $user->shop()->first();
        $data = $request->validate([
            'name' => [$shop ? 'sometimes' : 'required', 'string', 'max:120'],
            'template' => [$shop ? 'sometimes' : 'required', Rule::in(Shop::TEMPLATES)],
            'color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'opening_hours' => ['sometimes', 'nullable', 'array'],
            'prep_minutes' => ['sometimes', 'integer', 'between:5,180'],
            'logo' => ['sometimes', 'image', 'max:3072'],
            'banner' => ['sometimes', 'image', 'max:5120'],
        ]);

        if ($request->hasFile('logo')) {
            $data['logo_path'] = $request->file('logo')->store('shops', 'public');
        }
        if ($request->hasFile('banner')) {
            $data['banner_path'] = $request->file('banner')->store('shops', 'public');
        }
        unset($data['logo'], $data['banner']);

        if (! $shop) {
            $application = $user->merchantApplication;
            if (! $application) {
                throw new BusinessRuleException("Aucune demande commerçant n'est associée à ce compte.", 403);
            }
            $shop = Shop::create([
                ...$data,
                'merchant_id' => $user->id,
                'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
                'category' => $application->category,
                'zone_id' => $application->zone_id,
                'address' => $application->address,
                'status' => 'draft',
            ]);
        } else {
            $shop->update($data);
        }

        return new ShopResource($shop->load('zone', 'categories'));
    }

    /** Demande de mise en ligne : commerce validé, abonnement actif, au moins un produit. */
    public function submitShop(Request $request): ShopResource
    {
        $user = $request->user();
        $shop = $user->shop()->first() ?? throw new BusinessRuleException("Créez d'abord votre boutique.", 409);
        if ($user->merchantApplication?->status !== 'approved') {
            throw new BusinessRuleException("Votre commerce doit d'abord être validé par l'équipe YAKO.", 403, 'merchant_not_approved');
        }
        if (! $user->activeSubscription()) {
            throw new BusinessRuleException('Choisissez un abonnement pour mettre votre boutique en ligne.', 402, 'no_subscription');
        }
        if (! $shop->products()->where('active', true)->exists()) {
            throw new BusinessRuleException('Ajoutez au moins un produit avant la mise en ligne.', 409, 'no_products');
        }
        if ($shop->status === 'draft') {
            $shop->update(['status' => 'pending_review']);
        }

        return new ShopResource($shop->load('zone', 'categories'));
    }

    public function addCategory(Request $request): JsonResponse
    {
        $shop = $this->shop($request);
        $data = $request->validate(['name' => ['required', 'string', 'max:60']]);
        $cat = $shop->categories()->create(['name' => $data['name'], 'position' => $shop->categories()->count()]);

        return response()->json(['data' => $cat->only('id', 'name')], 201);
    }

    public function deleteCategory(Request $request, ProductCategory $category): JsonResponse
    {
        abort_unless($category->shop_id === $this->shop($request)->id, 404);
        $category->delete();

        return response()->json(['ok' => true]);
    }

    public function products(Request $request)
    {
        $shop = $this->shop($request);
        $status = $request->query('status', 'all');

        return ProductResource::collection($shop->products()
            ->when($status === 'active', fn ($q) => $q->where('active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('active', false))
            ->when($request->query('q'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest()->paginate(30));
    }

    public function storeProduct(Request $request): ProductResource
    {
        $shop = $this->shop($request);
        $data = $this->validateProduct($request, $shop, true);

        return new ProductResource($shop->products()->create($data));
    }

    public function showProduct(Request $request, Product $product): ProductResource
    {
        abort_unless($product->shop_id === $this->shop($request)->id, 404);

        return new ProductResource($product);
    }

    public function updateProduct(Request $request, Product $product): ProductResource
    {
        $shop = $this->shop($request);
        abort_unless($product->shop_id === $shop->id, 404);
        $product->update($this->validateProduct($request, $shop, false));

        return new ProductResource($product);
    }

    public function deleteProduct(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->shop_id === $this->shop($request)->id, 404);
        $product->update(['active' => false]); // on garde l'historique des commandes

        return response()->json(['ok' => true]);
    }

    public function orders(Request $request)
    {
        $shop = $this->shop($request);
        $tab = $request->query('tab', 'all');
        $groups = [
            'in_progress' => [Order::PENDING_CONFIRMATION, Order::CONFIRMED, Order::IN_DELIVERY],
            'done' => [Order::DELIVERED, Order::REJECTED, Order::CANCELLED],
        ];

        return OrderResource::collection($shop->orders()->with('items', 'shop', 'delivery', 'client')
            ->where('status', '!=', Order::AWAITING_PAYMENT)
            ->when(isset($groups[$tab]), fn ($q) => $q->whereIn('status', $groups[$tab]))
            ->latest()->paginate(30));
    }

    public function confirmOrder(Request $request, Order $order, OrderService $service): OrderResource
    {
        return new OrderResource($service->confirm($request->user(), $order)->load('items', 'shop', 'delivery', 'client'));
    }

    public function rejectOrder(Request $request, Order $order, OrderService $service): OrderResource
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:300']]);

        return new OrderResource($service->reject($request->user(), $order, $data['reason'] ?? null)->load('items', 'shop', 'delivery', 'client'));
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $shop = $user->shop()->first();
        $sub = $user->activeSubscription();
        $base = fn () => $shop ? $shop->orders()->where('status', Order::DELIVERED)->where('created_at', '>=', now()->startOfMonth()) : null;

        return response()->json(['data' => [
            'shop' => $shop?->only('id', 'name', 'status'),
            'subscription' => $sub ? ['plan' => $sub->plan, 'label' => config("yako.plans.{$sub->plan}.label"), 'ends_at' => $sub->ends_at] : null,
            'month_sales' => $shop ? (int) $base()->sum('subtotal') : 0,
            'month_orders' => $shop ? $base()->count() : 0,
            'month_items_sold' => $shop ? (int) OrderItem::whereIn('order_id', $base()->select('id'))->sum('quantity') : 0,
            'month_clients' => $shop ? $base()->distinct('client_id')->count('client_id') : 0,
            'pending_orders' => $shop ? $shop->orders()->where('status', Order::PENDING_CONFIRMATION)->count() : 0,
        ]]);
    }

    private function shop(Request $request): Shop
    {
        return $request->user()->shop()->first() ?? throw new BusinessRuleException("Créez d'abord votre boutique.", 409, 'no_shop');
    }

    private function validateProduct(Request $request, Shop $shop, bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';
        $data = $request->validate([
            'name' => [$req, 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'price' => [$req, 'integer', 'min:50'],
            'promo_price' => ['sometimes', 'nullable', 'integer', 'min:50'],
            'stock' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
            'product_category_id' => ['sometimes', 'nullable', Rule::exists('product_categories', 'id')->where('shop_id', $shop->id)],
            'image' => ['sometimes', 'image', 'max:5120'],
        ]);
        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }
        unset($data['image']);

        return $data;
    }
}
