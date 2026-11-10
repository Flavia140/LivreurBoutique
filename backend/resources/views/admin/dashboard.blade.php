@extends('admin.layout')
@section('title', 'Tableau de bord')
@section('content')
<h1>Tableau de bord</h1>
<div class="grid">
  @foreach ($stats as $label => [$n, $url])
    <a class="card stat" href="{{ $url }}" style="color:inherit"><div class="l">{{ $label }}</div><div class="n" style="color:var(--o)">{{ $n }}</div></a>
  @endforeach
</div>
<h2>Aujourd'hui</h2>
<div class="grid">
  @foreach ($today as $label => $n)<div class="card stat"><div class="l">{{ $label }}</div><div class="n">{{ $n }}</div></div>@endforeach
</div>
<h2>Dernières livraisons</h2>
<table>
  <tr><th>Code</th><th>Trajet</th><th>Statut</th><th>Paiement</th><th>Livreur</th><th>Total</th><th>Créée</th></tr>
  @forelse ($recent as $d)
    <tr><td>{{ $d->code }}</td><td>{{ $d->pickupZone?->name }} → {{ $d->dropoffZone?->name }}</td><td><span class="pill {{ $d->status === 'delivered' ? 'ok' : 'o' }}">{{ \App\Http\Controllers\Admin\AdminController::DELIVERY_LABELS[$d->status] ?? $d->status }}</span></td>
      <td>{{ $d->payment_method === 'cash' ? 'Espèces' : 'Mobile Money' }}</td><td>{{ $d->courier?->first_name ?? '—' }}</td><td>{{ number_format($d->total, 0, ',', ' ') }}</td><td class="muted">{{ $d->created_at->format('d/m H:i') }}</td></tr>
  @empty <tr><td colspan="7" class="muted">Aucune livraison.</td></tr> @endforelse
</table>
@endsection
