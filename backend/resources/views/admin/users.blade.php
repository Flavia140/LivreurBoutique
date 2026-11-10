@extends('admin.layout')
@section('title', 'Comptes')
@section('content')
<h1>Comptes</h1>
<form class="row" style="margin-bottom:14px"><input name="q" value="{{ $q }}" placeholder="Nom ou téléphone" style="width:260px"><button class="btn out">Rechercher</button></form>
<table>
  <tr><th>Nom</th><th>Téléphone</th><th>Profil</th><th>Statut</th><th>Inscrit</th><th></th></tr>
  @foreach ($users as $u)
    <tr><td>{{ $u->first_name }} {{ $u->last_name }}</td><td>{{ $u->phone }}</td><td>{{ ['client' => 'Client', 'courier' => 'Livreur', 'merchant' => 'Commerçant'][$u->role] ?? $u->role }}</td>
      <td><span class="pill {{ $u->status === 'active' ? 'ok' : '' }}">{{ $u->status === 'active' ? 'actif' : 'suspendu' }}</span></td><td class="muted">{{ $u->created_at->format('d/m/Y') }}</td>
      <td><form method="post" action="{{ route('admin.users.toggle', $u) }}" class="inline">@csrf<button class="btn sm {{ $u->status === 'active' ? 'ko' : 'out' }}">{{ $u->status === 'active' ? 'Suspendre' : 'Réactiver' }}</button></form></td></tr>
  @endforeach
</table>
{{ $users->links() }}
@endsection
