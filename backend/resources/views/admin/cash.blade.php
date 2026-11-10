@extends('admin.layout')
@section('title', 'Espèces à reverser')
@section('content')
<h1>Espèces à reverser</h1>
<p class="muted">Montants encaissés en espèces par les livreurs, moins le prix de leurs courses. Marquez comme reversé à la réception de l'argent.</p>
<table>
  <tr><th>Livreur</th><th>Téléphone</th><th>Livraisons</th><th>Montant dû</th><th>Plus ancienne</th><th></th></tr>
  @forelse ($rows as $r)
    @php $c = $couriers[$r->courier_id]; @endphp
    <tr><td>{{ $c->first_name }} {{ $c->last_name }}</td><td>{{ $c->phone }}</td><td>{{ $r->deliveries }}</td><td><strong>{{ number_format($r->owed, 0, ',', ' ') }} FCFA</strong></td>
      <td class="muted">{{ \Illuminate\Support\Carbon::parse($r->oldest)->format('d/m/Y H:i') }}</td>
      <td><form method="post" action="{{ route('admin.cash.remit', $c) }}" class="inline" onsubmit="return confirm('Confirmer la réception de {{ number_format($r->owed, 0, ',', ' ') }} FCFA ?')">@csrf<button class="btn sm">Marquer reversé</button></form></td></tr>
  @empty <tr><td colspan="6" class="muted">Rien à récupérer.</td></tr> @endforelse
</table>
@endsection
