<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/** Back-office : session web réservée aux comptes administrateur actifs. */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->isAdmin() || ! $user->isActive()) {
            Auth::guard('web')->logout();

            return redirect()->route('admin.login');
        }

        return $next($request);
    }
}
