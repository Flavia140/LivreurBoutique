@extends('admin.layout')
@section('title', 'Commerçants')
@section('content')
<h1>Commerçants</h1>
<div class="tabs">@foreach (['pending' => 'À valider', 'approved' => 'Validés', 'rejected' => 'Refusés'] as $k => $l)<a href="?status={{ $k }}" class="{{ $status === $k ? 'on' : '' }}">{{ $l }}</a>@endforeach</div>
<table>
  <tr><th>Commerce</th><th>Responsable</th><th>Adresse</th><th>IFU / RCCM</th><th>Pièces</th><th>Décision</th></tr>
  @forelse ($applications as $a)
    <tr><td><strong>{{ $a->business_name }}</strong><div class="muted">{{ $a->category }}</div>@if ($a->description)<div class="muted">{{ \Illuminate\Support\Str::limit($a->description, 80) }}</div>@endif</td>
      <td>{{ $a->user->first_name }} {{ $a->user->last_name }}<div class="muted">{{ $a->user->phone }}</div></td>
      <td>{{ $a->address }}<div class="muted">{{ $a->zone?->name }}</div></td><td>{{ $a->ifu ?? '—' }}<div class="muted">{{ $a->rccm ?? '—' }}</div></td>
      <td>@forelse ($a->documents ?? [] as $i => $p)<a href="{{ route('admin.merchant.document', [$a, $i]) }}" target="_blank">Pièce {{ $i + 1 }}</a><br>@empty <span class="muted">Aucune</span> @endforelse</td>
      <td>
        <form method="post" action="{{ route('admin.merchant.decide', $a) }}">@csrf
          <input name="notes" placeholder="Note (facultatif)" value="{{ $a->admin_notes }}" style="width:100%; margin-bottom:6px">
          <div class="row">@if ($a->status !== 'approved')<button class="btn sm" name="decision" value="approve">Valider</button>@endif
            @if ($a->status !== 'rejected')<button class="btn sm ko" name="decision" value="reject">Refuser</button>@endif</div>
        </form>
      </td></tr>
  @empty <tr><td colspan="6" class="muted">Aucune demande dans cette liste.</td></tr> @endforelse
</table>
{{ $applications->links() }}
@endsection
