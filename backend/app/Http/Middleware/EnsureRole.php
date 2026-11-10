<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'Accès réservé.', 'code' => 'forbidden_role'], 403);
        }
        if (! $user->isActive()) {
            return response()->json(['message' => 'Votre compte est suspendu.', 'code' => 'suspended'], 403);
        }

        return $next($request);
    }
}
