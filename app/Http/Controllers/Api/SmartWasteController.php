<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SmartWasteSimulationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmartWasteController extends Controller
{
    public function __construct(private readonly SmartWasteSimulationService $simulation)
    {
    }

    public function bins(): JsonResponse
    {
        $bins = $this->simulation->bins();

        return response()->json([
            'data' => $bins,
            'bins' => $bins,
            'depot' => $this->simulation->depot(),
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    public function simulateUpdate(Request $request): JsonResponse
    {
        $options = $this->routeOptions($request);
        $bins = $this->simulation->simulateUpdate($request->input('bins', []), $options);

        return response()->json([
            'data' => $bins,
            'bins' => $bins,
            'route' => $this->simulation->calculateRoute($bins, $options),
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    public function calculateRoute(Request $request): JsonResponse
    {
        $route = $this->simulation->calculateRoute($request->input('bins', []), $this->routeOptions($request));

        return response()->json([
            'data' => $route,
            ...$route,
        ]);
    }

    public function collect(Request $request): JsonResponse
    {
        $payload = $this->simulation->collect(
            $request->input('bins', []),
            $request->input('code', $request->input('bin_id')),
            $this->routeOptions($request)
        );

        return response()->json([
            'data' => $payload['bins'],
            ...$payload,
        ]);
    }

    private function routeOptions(Request $request): array
    {
        $flatOptions = array_filter(
            $request->only([
                'method',
                'algorithm',
                'threshold',
                'priority_threshold',
                'fleet_capacity',
                'capacity',
                'growth_multiplier',
                'sensor_growth',
            ]),
            fn ($value): bool => $value !== null
        );

        return array_merge(
            $request->input('options', []),
            $flatOptions
        );
    }
}
