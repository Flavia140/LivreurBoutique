<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use App\Services\ServiceHours;
use App\Services\TariffService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZoneController extends Controller
{
    public function index(): JsonResponse
    {
        $zones = Zone::where('active', true)->orderBy('city')->orderBy('name')->get(['id', 'name', 'city', 'department', 'parent_id']);

        return response()->json(['data' => $zones]);
    }

    public function quote(Request $request, TariffService $tariffs): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'exists:zones,id'],
            'to' => ['required', 'exists:zones,id'],
        ]);
        $t = $tariffs->quote((int) $data['from'], (int) $data['to']);

        return response()->json(['data' => [
            'link_type' => $t->link_type, 'price' => $t->price, 'commission' => $t->commission, 'total' => $t->price + $t->commission, 'currency' => 'XOF',
        ]]);
    }

    public function serviceHours(ServiceHours $hours): JsonResponse
    {
        return response()->json(['data' => [
            'open' => $hours->isOpen(),
            'start' => config('yako.service_hours.start'),
            'end' => config('yako.service_hours.end'),
            'next_opening' => $hours->nextOpening()->toIso8601String(),
            'message' => $hours->message(),
        ]]);
    }
}
