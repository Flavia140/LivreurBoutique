<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function form(): View
    {
        return view('admin.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $data = $request->validate(['phone' => ['required', 'string'], 'password' => ['required', 'string']]);
        $key = 'admin-login:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return back()->withErrors(['phone' => 'Trop de tentatives. Réessayez dans une minute.']);
        }
        $digits = preg_replace('/\D/', '', $data['phone']);
        $phone = str_starts_with($digits, '229') ? "+{$digits}" : "+229{$digits}";

        if (! Auth::attempt(['phone' => $phone, 'password' => $data['password'], 'role' => User::ROLE_ADMIN, 'status' => 'active'])) {
            RateLimiter::hit($key);

            return back()->withInput(['phone' => $data['phone']])->withErrors(['phone' => 'Identifiants incorrects.']);
        }
        RateLimiter::clear($key);
        $request->session()->regenerate();

        return redirect()->intended(route('admin.dashboard'));
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
