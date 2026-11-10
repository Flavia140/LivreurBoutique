@extends('admin.layout')
@section('title', 'Livreurs')
@section('content')
<h1>Livreurs</h1>
<div class="tabs">@foreach (['pending' => 'À valider', 'approved' => 'Validés', 'rejected' => 'Refusés'] as $k => $l)<a href="?status={{ $k }}" class="{{ $status === $k ? 'on' : '' }}">{{ $l }}</a>@endforeach</div>
<table>
  <tr><th>Nom</th><th>Téléphone</th><th>Université</th><th>Véhicule</th><th>Documents</th><th>Note</th><th>Inscrit</th><th></th></tr>
  @forelse ($couriers as $c)
    <tr><td>{{ $c->user->first_name }} {{ $c->user->last_name }} @if ($c->user->status !== 'active')<span class="pill">suspendu</span>@endif</td><td>{{ $c->user->phone }}</td><td>{{ $c->university }}<div class="muted">{{ $c->study_level }}</div></td>
      <td>{{ $c->vehicle_type }} <span class="muted">{{ $c->plate_number }}</span></td>
      <td>{{ $c->documents->count() }} / {{ count(\App\Models\CourierProfile::REQUIRED_DOCUMENTS) }}</td>
      <td>{{ $c->rating_avg ? number_format($c->rating_avg, 1).' ★' : '—' }}</td><td class="muted">{{ $c->created_at->format('d/m/Y') }}</td>
      <td><a class="btn sm out" href="{{ route('admin.courier', $c) }}">Ouvrir</a></td></tr>
  @empty <tr><td colspan="8" class="muted">Aucun livreur dans cette liste.</td></tr> @endforelse
</table>
{{ $couriers->links() }}
@endsection
