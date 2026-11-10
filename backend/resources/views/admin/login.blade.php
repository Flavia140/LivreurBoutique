<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connexion · YAKO</title>
<style>body{margin:0;font:15px system-ui,sans-serif;background:#FFF1E6;display:flex;align-items:center;justify-content:center;min-height:100vh}
form{background:#fff;padding:32px;border-radius:16px;width:340px;box-shadow:0 8px 30px rgba(0,0,0,.06)}h1{color:#FF6B00;margin:0 0 4px;font-size:30px}p{color:#5F6368;margin:0 0 22px}
label{display:block;font-size:13px;color:#5F6368;margin-bottom:6px}input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #E3E3E3;border-radius:10px;font:inherit;margin-bottom:14px}
button{width:100%;padding:13px;border:0;border-radius:10px;background:#FF6B00;color:#fff;font:inherit;font-weight:700;cursor:pointer}.err{color:#D93025;font-size:13px;margin-bottom:12px}</style></head>
<body><form method="post" action="{{ route('admin.login.submit') }}">@csrf
<h1>YAKO</h1><p>Back-office</p>
@if ($errors->any())<div class="err">{{ $errors->first() }}</div>@endif
<label for="phone">Téléphone</label><input id="phone" name="phone" value="{{ old('phone') }}" placeholder="01 97 00 00 00" required autofocus>
<label for="password">Mot de passe</label><input id="password" type="password" name="password" required>
<button>Se connecter</button></form></body></html>
