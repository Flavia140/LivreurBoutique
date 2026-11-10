@extends('admin.layout')
@section('title', 'Boutiques')
@section('content')
<h1>Boutiques</h1>
<div class="tabs">@foreach (['pending_review' => 'À mettre en ligne', 'live' => 'En ligne', 'draft' => 'Brouillons', 'suspended' => 'Suspendues'] as $k => $l)<a href="?status={{ $k }}" class="{{ $status === $k ? 'on' : '' }}">{{ $l }}</a>@endforeach</div>
<table>
  <tr><th></th><th>Boutique</th><th>Commerçant</th><th>Modèle</th><th>Produits</th><th>Abonnement</th><th>Actions</th></tr>
  @forelse ($shops as $s)
    @php $sub = $s->merchant->activeSubscription(); @endphp
    <tr><td><div style="width:44px;height:44px;border-radius:22px;border:3px solid {{ $s->color }};overflow:hidden;background:#fff">@if ($s->logo_path)<img src="{{ \Illuminate\Support\Facades\Storage::disk('public')->url($s->logo_path) }}" style="width:100%;height:100%;object-fit:cover" alt="">@endif</div></td>
      <td><strong>{{ $s->name }}</strong><div class="muted">{{ $s->zone?->name }} · {{ $s->address }}</div></td>
      <td>{{ $s->merchant->first_name }} {{ $s->merchant->last_name }}<div class="muted">{{ $s->merchant->phone }}</div></td>
      <td>{{ ['general' => 'Général', 'alimentation' => 'Alimentation', 'mode' => 'Mode', 'electronique' => 'Électronique'][$s->template] ?? $s->template }}</td><td>{{ $s->products_count }}</td>
      <td>@if ($sub)<span class="pill ok">{{ config("yako.plans.{$sub->plan}.label", $sub->plan) }}</span><div class="muted">jusqu'au {{ $sub->ends_at->format('d/m/Y') }}</div>@else<span class="pill">aucun</span>@endif</td>
      <td><form method="post" action="{{ route('admin.shop.status', $s) }}" class="row">@csrf
        @if ($s->status !== 'live')<button class="btn sm" name="status" value="live">Mettre en ligne</button>@endif
        @if ($s->status === 'pending_review')<button class="btn sm out" name="status" value="draft">À corriger</button>@endif
        @if ($s->status === 'live')<button class="btn sm ko" name="status" value="suspended">Suspendre</button>@endif
      </form></td></tr>
  @empty <tr><td colspan="7" class="muted">Aucune boutique dans cette liste.</td></tr> @endforelse
</table>
{{ $shops->links() }}
@endsection
