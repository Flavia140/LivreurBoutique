@extends('admin.layout')
@section('title', 'Zones et tarifs')
@section('content')
<h1>Zones et tarifs</h1>
<h2>Zones</h2>
<table>
  <tr><th>Ville</th><th>Zone</th><th>Département</th><th>Statut</th><th></th></tr>
  @foreach ($zones as $z)
    <tr><td>{{ $z->city }}</td><td>{{ $z->name }}</td><td>{{ $z->department }}</td><td><span class="pill {{ $z->active ? 'ok' : '' }}">{{ $z->active ? 'Active' : 'Inactive' }}</span></td>
      <td><form method="post" action="{{ route('admin.zones.toggle', $z) }}" class="inline">@csrf<button class="btn sm out">{{ $z->active ? 'Désactiver' : 'Activer' }}</button></form></td></tr>
  @endforeach
</table>
<form method="post" action="{{ route('admin.zones.store') }}" class="card row" style="margin-top:12px">@csrf
  <strong>Nouvelle zone</strong><input name="city" placeholder="Ville" required><input name="name" placeholder="Zone / quartier" required><input name="department" placeholder="Département"><button class="btn">Ajouter</button>
</form>

<h2>Tarifs</h2>
<p class="muted">Prix payé au livreur et commission YAKO ; le client paie la somme des deux. Un tarif vaut dans les deux sens.</p>
<table>
  <tr><th>De</th><th>Vers</th><th>Type</th><th>Prix livreur</th><th>Commission</th><th>Total client</th><th></th></tr>
  @foreach ($tariffs as $t)
    @php $f = 'tariff-'.$t->id; @endphp
    <tr>
      <td>{{ $t->fromZone->name }}</td><td>{{ $t->toZone->name }}</td>
      <td><select name="link_type" form="{{ $f }}">@foreach ($linkTypes as $lt)<option @selected($lt === $t->link_type)>{{ $lt }}</option>@endforeach</select></td>
      <td><input name="price" form="{{ $f }}" type="number" min="0" value="{{ $t->price }}" style="width:100px"></td>
      <td><input name="commission" form="{{ $f }}" type="number" min="0" value="{{ $t->commission }}" style="width:90px"></td>
      <td>{{ number_format($t->price + $t->commission, 0, ',', ' ') }}</td>
      <td><form id="{{ $f }}" method="post" action="{{ route('admin.tariffs.save') }}">@csrf
        <input type="hidden" name="from_zone_id" value="{{ $t->from_zone_id }}"><input type="hidden" name="to_zone_id" value="{{ $t->to_zone_id }}">
        <button class="btn sm out">Enregistrer</button></form></td>
    </tr>
  @endforeach
</table>
<form method="post" action="{{ route('admin.tariffs.save') }}" class="card row" style="margin-top:12px">@csrf
  <strong>Nouveau tarif</strong>
  <select name="from_zone_id">@foreach ($zones as $z)<option value="{{ $z->id }}">{{ $z->name }}</option>@endforeach</select>
  <select name="to_zone_id">@foreach ($zones as $z)<option value="{{ $z->id }}">{{ $z->name }}</option>@endforeach</select>
  <select name="link_type">@foreach ($linkTypes as $lt)<option>{{ $lt }}</option>@endforeach</select>
  <input name="price" type="number" min="0" placeholder="Prix livreur" required style="width:120px"><input name="commission" type="number" min="0" placeholder="Commission" required style="width:110px">
  <button class="btn">Enregistrer</button>
</form>
@endsection
