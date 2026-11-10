<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@yield('title', 'Back-office') · YAKO</title>
<style>
:root { --o:#FF6B00; --o-soft:#FFF1E6; --t:#111; --m:#5F6368; --b:#E3E3E3; --ok:#1E8E3E; --ko:#D93025; }
* { box-sizing:border-box; } body { margin:0; font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--t); background:#FAFAFA; }
a { color:var(--o); text-decoration:none; } a:hover { text-decoration:underline; }
.wrap { display:flex; min-height:100vh; }
nav { width:230px; background:#fff; border-right:1px solid var(--b); padding:20px 12px; flex-shrink:0; }
nav .brand { font-weight:800; font-size:22px; color:var(--o); padding:0 10px 18px; letter-spacing:.5px; }
nav a { display:flex; justify-content:space-between; padding:9px 10px; border-radius:8px; color:var(--t); margin-bottom:2px; }
nav a.on { background:var(--o-soft); color:var(--o); font-weight:600; } nav a:hover { text-decoration:none; background:#F4F4F4; }
nav .count { background:var(--o); color:#fff; border-radius:10px; padding:0 7px; font-size:12px; font-weight:700; }
main { flex:1; padding:28px 32px; max-width:1200px; }
h1 { font-size:24px; margin:0 0 18px; } h2 { font-size:17px; margin:26px 0 10px; }
.card { background:#fff; border:1px solid var(--b); border-radius:12px; padding:18px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
.stat .n { font-size:28px; font-weight:800; margin-top:4px; } .stat .l { color:var(--m); font-size:13px; }
table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--b); border-radius:12px; overflow:hidden; }
th,td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--b); vertical-align:top; } th { background:#F7F7F7; font-size:12px; color:var(--m); font-weight:600; text-transform:uppercase; letter-spacing:.3px; }
tr:last-child td { border-bottom:0; }
.btn { display:inline-block; border:1px solid var(--o); background:var(--o); color:#fff; border-radius:8px; padding:7px 14px; font:inherit; font-weight:600; cursor:pointer; }
.btn.out { background:#fff; color:var(--o); } .btn.ko { background:#fff; border-color:var(--ko); color:var(--ko); } .btn.sm { padding:4px 10px; font-size:13px; }
input,select,textarea { font:inherit; padding:7px 10px; border:1px solid var(--b); border-radius:8px; background:#fff; } input:focus,select:focus,textarea:focus { outline:2px solid var(--o-soft); border-color:var(--o); }
.tabs { display:flex; gap:6px; margin-bottom:14px; } .tabs a { padding:6px 14px; border-radius:16px; border:1px solid var(--b); color:var(--t); background:#fff; } .tabs a.on { border-color:var(--o); background:var(--o-soft); color:var(--o); font-weight:600; }
.flash { padding:10px 14px; border-radius:8px; margin-bottom:16px; } .flash.ok { background:#E8F5E9; color:var(--ok); } .flash.ko { background:#FDECEA; color:var(--ko); }
.muted { color:var(--m); font-size:13px; } .pill { display:inline-block; padding:2px 9px; border-radius:10px; font-size:12px; background:#F1F3F4; } .pill.ok { background:#E8F5E9; color:var(--ok); } .pill.o { background:var(--o-soft); color:var(--o); }
.row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; } form.inline { display:inline; }
.docs { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; } .docs a.doc { display:block; border:1px solid var(--b); border-radius:10px; padding:10px; background:#fff; color:var(--t); } .docs img { width:100%; height:120px; object-fit:cover; border-radius:6px; background:#f3f3f3; }
@media (max-width: 800px) { .wrap { flex-direction:column; } nav { width:auto; border-right:0; border-bottom:1px solid var(--b); } main { padding:18px; } }
</style>
</head>
<body>
@php
  $pending = [
    'couriers' => \App\Models\CourierProfile::where('validation_status','pending')->count(),
    'merchants' => \App\Models\MerchantApplication::where('status','pending')->count(),
    'shops' => \App\Models\Shop::where('status','pending_review')->count(),
  ];
  $links = [
    ['admin.dashboard','Tableau de bord',null], ['admin.couriers','Livreurs',$pending['couriers']], ['admin.merchants','Commerçants',$pending['merchants']],
    ['admin.shops','Boutiques',$pending['shops']], ['admin.cash','Espèces à reverser',null], ['admin.zones','Zones et tarifs',null],
    ['admin.users','Comptes',null], ['admin.settings','Réglages',null],
  ];
@endphp
<div class="wrap">
  <nav>
    <div class="brand">YAKO</div>
    @foreach ($links as [$route, $label, $count])
      <a href="{{ route($route) }}" class="{{ request()->routeIs($route.'*') ? 'on' : '' }}">{{ $label }} @if ($count)<span class="count">{{ $count }}</span>@endif</a>
    @endforeach
    <form method="post" action="{{ route('admin.logout') }}" style="margin-top:18px; padding:0 10px">@csrf<button class="btn out sm">Se déconnecter</button></form>
  </nav>
  <main>
    @if (session('ok'))<div class="flash ok">{{ session('ok') }}</div>@endif
    @if ($errors->any())<div class="flash ko">{{ $errors->first() }}</div>@endif
    @yield('content')
  </main>
</div>
</body>
</html>
