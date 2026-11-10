@extends('admin.layout')
@section('title', 'Dossier livreur')
@php $labels = ['student_card' => 'Carte étudiant', 'id_card' => "Pièce d'identité", 'license' => 'Permis de conduire', 'registration' => 'Carte grise', 'insurance' => 'Assurance', 'vehicle_photo' => 'Photo du véhicule', 'profile_photo' => 'Photo de profil']; @endphp
@section('content')
<p><a href="{{ route('admin.couriers') }}">← Livreurs</a></p>
<h1>{{ $c->user->first_name }} {{ $c->user->last_name }} <span class="pill {{ $c->validation_status === 'approved' ? 'ok' : 'o' }}">{{ $c->validation_status }}</span></h1>
<div class="card">
  <div class="grid">
    <div><div class="muted">Téléphone</div>{{ $c->user->phone }}</div>
    <div><div class="muted">Université</div>{{ $c->university ?? '—' }}</div>
    <div><div class="muted">N° étudiant / niveau</div>{{ $c->student_number ?? '—' }} · {{ $c->study_level ?? '—' }}</div>
    <div><div class="muted">Véhicule</div>{{ $c->vehicle_type }} {{ $c->plate_number }}</div>
    <div><div class="muted">Zone</div>{{ $c->user->zone?->name ?? '—' }}</div>
    <div><div class="muted">Note</div>{{ $c->rating_avg ? number_format($c->rating_avg, 1).' ★ ('.$c->rating_count.')' : '—' }}</div>
  </div>
  @if ($c->rejection_reason)<p class="muted">Dernier motif de refus : {{ $c->rejection_reason }}</p>@endif
</div>
<h2>Documents</h2>
<div class="docs">
  @foreach ($labels as $type => $label)
    @php $doc = $c->documents->firstWhere('type', $type); @endphp
    @if ($doc)
      <a class="doc" href="{{ route('admin.courier.document', $doc) }}" target="_blank"><img src="{{ route('admin.courier.document', $doc) }}" alt="{{ $label }}"><div style="margin-top:6px">{{ $label }}</div></a>
    @else
      <div class="doc card" style="padding:10px"><div style="height:120px;display:flex;align-items:center;justify-content:center" class="muted">Manquant</div><div style="margin-top:6px">{{ $label }}</div></div>
    @endif
  @endforeach
</div>
<h2>Décision</h2>
<div class="card row">
  <form method="post" action="{{ route('admin.courier.decide', $c) }}" class="inline">@csrf<input type="hidden" name="decision" value="approve"><button class="btn">Valider le livreur</button></form>
  <form method="post" action="{{ route('admin.courier.decide', $c) }}" class="row" style="flex:1">@csrf<input type="hidden" name="decision" value="reject">
    <input name="reason" placeholder="Motif du refus (envoyé au livreur)" style="flex:1; min-width:240px" required><button class="btn ko">Refuser</button></form>
</div>
@endsection
