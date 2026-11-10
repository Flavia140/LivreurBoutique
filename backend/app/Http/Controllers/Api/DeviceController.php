<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeviceController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:500'], 'platform' => ['nullable', Rule::in(['android', 'ios'])]]);
        DeviceToken::updateOrCreate(['token' => $data['token']], ['user_id' => $request->user()->id, 'platform' => $data['platform'] ?? 'android']);

        return response()->json(['ok' => true], 201);
    }
}
