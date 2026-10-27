<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmartWasteApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_smart_waste_api_flow(): void
    {
        $binsResponse = $this->getJson('/api/bins')
            ->assertOk()
            ->assertJsonStructure([
                'bins' => [
                    '*' => ['code', 'location', 'fill_level', 'status', 'priority', 'x', 'y'],
                ],
                'depot',
            ]);

        $bins = $binsResponse->json('bins');

        $this->postJson('/api/simulate/update', ['bins' => $bins])
            ->assertOk()
            ->assertJsonStructure(['bins', 'route' => ['route', 'estimated_distance_km', 'eta_minutes']]);

        $routeResponse = $this->postJson('/api/route/calculate', ['bins' => $bins])
            ->assertOk()
            ->assertJsonStructure(['route', 'stops', 'method', 'priority_threshold', 'fleet_capacity', 'estimated_distance_km', 'eta_minutes']);

        $this->assertSame(
            collect($routeResponse->json('route'))->sortByDesc('fill_level')->pluck('code')->values()->all(),
            collect($routeResponse->json('route'))->pluck('code')->values()->all()
        );

        $parameterizedRoute = $this->postJson('/api/route/calculate', [
            'bins' => $bins,
            'method' => 'djikstra',
            'threshold' => 70,
            'fleet_capacity' => 2,
        ])
            ->assertOk()
            ->assertJsonPath('method', 'dijkstra')
            ->assertJsonPath('priority_threshold', 70)
            ->assertJsonPath('fleet_capacity', 2)
            ->assertJsonPath('returns_to_depot', true)
            ->json('stops');

        $this->assertLessThanOrEqual(2, count($parameterizedRoute));
        $this->assertTrue(collect($parameterizedRoute)->every(fn (array $bin): bool => $bin['fill_level'] >= 70));

        $path = $this->postJson('/api/route/calculate', [
            'bins' => $bins,
            'method' => 'hybrid',
            'threshold' => 60,
            'fleet_capacity' => 5,
        ])->json('path');

        $this->assertSame('DEPOT-01', $path[0]['code']);
        $this->assertSame('DEPOT-01', $path[count($path) - 1]['code']);

        $this->postJson('/api/collect', ['bins' => $bins, 'code' => $bins[0]['code'], 'threshold' => 70, 'fleet_capacity' => 2])
            ->assertOk()
            ->assertJsonStructure(['bins', 'collected_bin', 'route']);
    }
}
