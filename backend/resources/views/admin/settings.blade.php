@extends('admin.layout')
@section('title', 'Réglages')
@section('content')
<h1>Réglages</h1>
<form method="post" action="{{ route('admin.settings.save') }}" class="card" style="max-width:520px">@csrf
  <label for="cash_limit"><strong>Plafond du paiement en espèces</strong></label>
  <p class="muted">Au-delà de ce montant (livraison + articles), le client doit payer en Mobile Money. Mettre 0 pour désactiver les espèces.</p>
  <div class="row"><input id="cash_limit" name="cash_limit" type="number" min="0" step="500" value="{{ $cashLimit }}" style="width:160px"> FCFA <button class="btn">Enregistrer</button></div>
</form>
@endsection
