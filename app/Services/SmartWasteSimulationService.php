<?php

namespace App\Services;

use App\Models\Bin;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SmartWasteSimulationService
{
    private const DEPOT = [
        'id' => 'DEPOT',
        'code' => 'DEPOT-01',
        'location' => 'Garasi Armada Barat',
        'x' => 9,
        'y' => 84,
    ];

    public function depot(): array
    {
        return self::DEPOT;
    }

    public function bins(array $incomingBins = []): array
    {
        $source = count($incomingBins) > 0 ? $incomingBins : $this->storedBins();

        if (count($source) === 0) {
            $source = $this->defaultBins();
        }

        return collect($source)
            ->map(fn (array $bin) => $this->normalizeBin($bin))
            ->values()
            ->all();
    }

    public function simulateUpdate(array $incomingBins = [], array $options = []): array
    {
        $options = $this->resolveOptions($options);

        return collect($this->bins($incomingBins))
            ->map(function (array $bin) use ($options): array {
                $growth = random_int(-2, 7);
                $extraTraffic = $bin['fill_level'] >= 80 ? random_int(0, 2) : 0;
                $bin['fill_level'] = $this->clamp((int) round($bin['fill_level'] + (($growth + $extraTraffic) * $options['growth_multiplier'])), 5, 100);
                $bin['last_reported_at'] = now()->toIso8601String();

                return $this->normalizeBin($bin);
            })
            ->values()
            ->all();
    }

    public function calculateRoute(array $incomingBins = [], array $options = []): array
    {
        $options = $this->resolveOptions($options);
        $orderedBins = collect($this->bins($incomingBins))
            ->sortByDesc('fill_level')
            ->values();

        $candidates = $orderedBins
            ->filter(fn (array $bin): bool => $bin['fill_level'] >= $options['threshold'])
            ->take($options['fleet_capacity'])
            ->values();

        $route = $this->withDistances(
            $this->orderRoute($candidates, $options['method']),
            $options['threshold']
        );
        $recommendations = $this->withDistances($orderedBins, $options['threshold']);
        $distance = $route->sum('distance_from_previous_km')
            + ($route->isNotEmpty() ? $this->distanceBetween($route->last(), self::DEPOT) : 0);
        $returnDistance = $route->isNotEmpty() ? $this->distanceBetween($route->last(), self::DEPOT) : 0;
        $duration = max(8, (int) round($distance * 3.8 + $route->count() * 4));
        $usedCapacityKg = $route->sum('waste_kg');

        return [
            'depot' => self::DEPOT,
            'stops' => $route->values()->all(),
            'path' => collect([self::DEPOT])->merge($route)->push(self::DEPOT)->values()->all(),
            'route' => $route->values()->all(),
            'recommendations' => $recommendations->all(),
            'estimated_distance_km' => round($distance, 1),
            'estimated_duration_minutes' => $duration,
            'eta_minutes' => $duration,
            'return_distance_km' => $returnDistance,
            'returns_to_depot' => true,
            'method' => $options['method'],
            'method_label' => $this->methodLabel($options['method']),
            'priority_threshold' => $options['threshold'],
            'fleet_capacity' => $options['fleet_capacity'],
            'fleet_capacity_used_kg' => $usedCapacityKg,
            'candidate_count' => $orderedBins->where('fill_level', '>=', $options['threshold'])->count(),
            'skipped_count' => max(0, $orderedBins->where('fill_level', '>=', $options['threshold'])->count() - $route->count()),
            'strategy' => $this->strategyText($options),
            'updated_at' => now()->toIso8601String(),
        ];
    }

    public function collect(array $incomingBins = [], string|int|null $identifier = null, array $options = []): array
    {
        $bins = collect($this->bins($incomingBins));
        $route = $this->calculateRoute($bins->all(), $options);
        $targetIdentifier = $identifier ?: ($route['stops'][0]['code'] ?? $bins->sortByDesc('fill_level')->first()['code']);
        $collectedBin = null;

        $updatedBins = $bins
            ->map(function (array $bin) use ($targetIdentifier, &$collectedBin): array {
                if ($this->matchesIdentifier($bin, $targetIdentifier)) {
                    $bin['fill_level'] = random_int(8, 24);
                    $bin['last_reported_at'] = now()->toIso8601String();
                    $collectedBin = $this->normalizeBin($bin);
                }

                return $this->normalizeBin($bin);
            })
            ->values()
            ->all();

        $this->persistCollectedBin($collectedBin);

        return [
            'bins' => $updatedBins,
            'collected_bin' => $collectedBin,
            'route' => $this->calculateRoute($updatedBins, $options),
            'message' => $collectedBin
                ? "{$collectedBin['code']} berhasil diangkut. Level turun ke {$collectedBin['fill_level']}%."
                : 'Tidak ada TPS yang cocok untuk dikoleksi.',
            'updated_at' => now()->toIso8601String(),
        ];
    }

    private function storedBins(): array
    {
        try {
            if (! Schema::hasTable('bins') || Bin::query()->count() === 0) {
                return [];
            }

            return Bin::query()
                ->orderBy('code')
                ->get()
                ->map(fn (Bin $bin): array => [
                    'code' => $bin->code,
                    'location' => $bin->location,
                    'district' => $bin->district,
                    'id' => $bin->id,
                    'fill_level' => $bin->fill_level,
                    'x' => $bin->map_x,
                    'y' => $bin->map_y,
                    'capacity_kg' => $bin->capacity_kg,
                    'waste_kg' => $bin->waste_kg,
                    'last_reported_at' => optional($bin->last_reported_at)->toIso8601String(),
                ])
                ->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function persistCollectedBin(?array $collectedBin): void
    {
        if (! $collectedBin) {
            return;
        }

        try {
            if (! Schema::hasTable('bins')) {
                return;
            }

            Bin::query()
                ->where('code', $collectedBin['code'])
                ->update([
                    'fill_level' => $collectedBin['fill_level'],
                    'waste_kg' => $collectedBin['waste_kg'],
                    'last_reported_at' => now(),
                ]);
        } catch (Throwable) {
            // The simulation remains session-based if database persistence is unavailable.
        }
    }

    private function withDistances(Collection $orderedBins, int $threshold): Collection
    {
        $previous = self::DEPOT;

        return $orderedBins->map(function (array $bin, int $index) use (&$previous, $threshold): array {
            $distance = $this->distanceBetween($previous, $bin);
            $previous = $bin;

            return array_merge($bin, [
                'order' => $index + 1,
                'distance_from_previous_km' => $distance,
                'is_service_target' => $bin['fill_level'] >= $threshold,
                'threshold_gap' => $bin['fill_level'] - $threshold,
            ]);
        });
    }

    private function orderRoute(Collection $candidates, string $method): Collection
    {
        if ($candidates->isEmpty()) {
            return collect();
        }

        return match ($method) {
            'dijkstra' => $this->orderByShortestPath($candidates),
            'hybrid' => $this->orderByHybridScore($candidates),
            default => $this->orderByGreedyPriority($candidates),
        };
    }

    private function orderByGreedyPriority(Collection $candidates): Collection
    {
        $first = $candidates
            ->sortByDesc(fn (array $bin): int => $bin['fill_level'])
            ->first();
        $remaining = $candidates
            ->reject(fn (array $bin): bool => $bin['code'] === $first['code'])
            ->values();
        $route = collect([$first]);
        $current = $first;

        while ($remaining->isNotEmpty()) {
            $next = $this->nearestCandidate($remaining, $current);
            $route->push($next);
            $current = $next;
            $remaining = $remaining
                ->reject(fn (array $bin): bool => $bin['code'] === $next['code'])
                ->values();
        }

        return $this->twoOptClosedRoute($route, lockFirst: true);
    }

    private function orderByShortestPath(Collection $candidates): Collection
    {
        if ($candidates->count() <= 8) {
            return collect($this->exactShortestClosedRoute($candidates->values()->all()));
        }

        $remaining = $candidates->values();
        $current = self::DEPOT;
        $route = collect();

        while ($remaining->isNotEmpty()) {
            $next = $this->nearestCandidate($remaining, $current);
            $route->push($next);
            $current = $next;
            $remaining = $remaining
                ->reject(fn (array $bin): bool => $bin['code'] === $next['code'])
                ->values();
        }

        return $this->twoOptClosedRoute($route);
    }

    private function orderByHybridScore(Collection $candidates): Collection
    {
        $remaining = $candidates->values();
        $current = self::DEPOT;
        $route = collect();

        while ($remaining->isNotEmpty()) {
            $next = $remaining
                ->sortByDesc(fn (array $bin): float => $this->hybridScore($bin, $current))
                ->first();

            $route->push($next);
            $current = $next;
            $remaining = $remaining
                ->reject(fn (array $bin): bool => $bin['code'] === $next['code'])
                ->values();
        }

        return $this->twoOptClosedRoute($route);
    }

    private function nearestCandidate(Collection $remaining, array $current): array
    {
        return $remaining
            ->sort(function (array $a, array $b) use ($current): int {
                $distanceCompare = $this->distanceBetween($current, $a) <=> $this->distanceBetween($current, $b);

                return $distanceCompare !== 0 ? $distanceCompare : $b['fill_level'] <=> $a['fill_level'];
            })
            ->first();
    }

    private function exactShortestClosedRoute(array $bins): array
    {
        $bestRoute = [];
        $bestDistance = INF;
        $this->searchShortestRoute($bins, [], $bestRoute, $bestDistance, self::DEPOT, 0.0);

        return $bestRoute;
    }

    private function searchShortestRoute(
        array $remaining,
        array $path,
        array &$bestRoute,
        float &$bestDistance,
        array $current,
        float $distance
    ): void {
        if ($distance >= $bestDistance) {
            return;
        }

        if (count($remaining) === 0) {
            $totalDistance = $distance + $this->distanceBetween($current, self::DEPOT);
            if ($totalDistance < $bestDistance) {
                $bestDistance = $totalDistance;
                $bestRoute = $path;
            }

            return;
        }

        foreach ($remaining as $index => $bin) {
            $nextRemaining = $remaining;
            array_splice($nextRemaining, $index, 1);
            $this->searchShortestRoute(
                $nextRemaining,
                [...$path, $bin],
                $bestRoute,
                $bestDistance,
                $bin,
                $distance + $this->distanceBetween($current, $bin)
            );
        }
    }

    private function twoOptClosedRoute(Collection $route, bool $lockFirst = false): Collection
    {
        $items = $route->values()->all();
        $count = count($items);

        if ($count < 4) {
            return collect($items);
        }

        $improved = true;
        while ($improved) {
            $improved = false;
            $bestDistance = $this->closedRouteDistance($items);
            $startIndex = $lockFirst ? 1 : 0;

            for ($i = $startIndex; $i < $count - 2; $i++) {
                for ($k = $i + 1; $k < $count - 1; $k++) {
                    $candidate = $items;
                    array_splice($candidate, $i, $k - $i + 1, array_reverse(array_slice($candidate, $i, $k - $i + 1)));
                    $candidateDistance = $this->closedRouteDistance($candidate);

                    if ($candidateDistance + 0.01 < $bestDistance) {
                        $items = $candidate;
                        $bestDistance = $candidateDistance;
                        $improved = true;
                    }
                }
            }
        }

        return collect($items);
    }

    private function closedRouteDistance(array $route): float
    {
        $previous = self::DEPOT;
        $distance = 0.0;

        foreach ($route as $bin) {
            $distance += $this->distanceBetween($previous, $bin);
            $previous = $bin;
        }

        return $distance + (count($route) > 0 ? $this->distanceBetween($previous, self::DEPOT) : 0);
    }

    private function hybridScore(array $bin, array $current): float
    {
        $fillScore = $bin['fill_level'] / 100;
        $distancePenalty = min(1, $this->distanceBetween($current, $bin) / 12);
        $loadScore = min(1, $bin['waste_kg'] / max(1, $bin['capacity_kg']));

        return ($fillScore * 0.66) + ($loadScore * 0.18) - ($distancePenalty * 0.16);
    }

    private function resolveOptions(array $options): array
    {
        $method = strtolower((string) ($options['method'] ?? $options['algorithm'] ?? 'greedy'));
        $method = match ($method) {
            'nearest', 'greedy', 'priority' => 'greedy',
            'djikstra', 'dijkstra', 'shortest' => 'dijkstra',
            'hybrid', 'balanced' => 'hybrid',
            default => 'greedy',
        };

        return [
            'method' => $method,
            'threshold' => $this->clamp((int) ($options['threshold'] ?? $options['priority_threshold'] ?? 80), 55, 95),
            'fleet_capacity' => $this->clamp((int) ($options['fleet_capacity'] ?? $options['capacity'] ?? 6), 1, 12),
            'growth_multiplier' => max(0.4, min(2.4, (float) ($options['growth_multiplier'] ?? $options['sensor_growth'] ?? 1))),
        ];
    }

    private function methodLabel(string $method): string
    {
        return match ($method) {
            'dijkstra' => 'Dijkstra',
            'hybrid' => 'Hybrid',
            default => 'Greedy',
        };
    }

    private function strategyText(array $options): string
    {
        return match ($options['method']) {
            'dijkstra' => "Dijkstra: cari urutan tercepat untuk TPS di atas ambang {$options['threshold']}%, singgah sesuai kapasitas {$options['fleet_capacity']} titik, lalu kembali ke depot.",
            'hybrid' => "Hybrid: gabungkan kepenuhan, estimasi muatan, dan jarak untuk TPS di atas ambang {$options['threshold']}%, lalu optimalkan rute pulang-pergi ke depot.",
            default => "Greedy: mulai dari TPS paling penuh di atas ambang {$options['threshold']}%, lanjut ke titik terdekat, lalu kembali ke depot.",
        };
    }

    private function normalizeBin(array $bin): array
    {
        $code = (string) ($bin['code'] ?? $bin['kode'] ?? 'TPS-XX');
        $capacity = (int) ($bin['capacity_kg'] ?? 900);
        $fillLevel = $this->clamp((int) round($bin['fill_level'] ?? $bin['fillLevel'] ?? 0), 0, 100);
        $priority = $this->priorityFor($fillLevel);
        $wasteKg = (int) round($capacity * ($fillLevel / 100));
        $derivedId = (int) preg_replace('/\D+/', '', $code);

        return [
            'id' => (int) ($bin['id'] ?? ($derivedId > 0 ? $derivedId : 0)),
            'code' => $code,
            'location' => (string) ($bin['location'] ?? $bin['lokasi'] ?? 'Lokasi belum diberi nama'),
            'district' => (string) ($bin['district'] ?? 'Zona Simulasi'),
            'address' => (string) ($bin['address'] ?? $bin['district'] ?? 'Zona Simulasi'),
            'fill_level' => $fillLevel,
            'status' => $priority['status'],
            'priority' => $priority['label'],
            'priority_score' => $priority['score'],
            'x' => (float) ($bin['x'] ?? $bin['map_x'] ?? 50),
            'y' => (float) ($bin['y'] ?? $bin['map_y'] ?? 50),
            'capacity_kg' => $capacity,
            'capacity_liters' => (int) ($bin['capacity_liters'] ?? $capacity),
            'waste_kg' => $wasteKg,
            'last_reported_at' => $bin['last_reported_at'] ?? now()->toIso8601String(),
        ];
    }

    private function matchesIdentifier(array $bin, string|int|null $identifier): bool
    {
        if ($identifier === null) {
            return false;
        }

        return (string) $bin['code'] === (string) $identifier
            || (string) $bin['id'] === (string) $identifier;
    }

    private function priorityFor(int $fillLevel): array
    {
        if ($fillLevel >= 80) {
            return ['status' => 'Prioritas tinggi', 'label' => 'P1', 'score' => 3];
        }

        if ($fillLevel >= 60) {
            return ['status' => 'Sedang', 'label' => 'P2', 'score' => 2];
        }

        return ['status' => 'Rendah', 'label' => 'P3', 'score' => 1];
    }

    private function distanceBetween(array $from, array $to): float
    {
        $dx = ((float) $to['x']) - ((float) $from['x']);
        $dy = ((float) $to['y']) - ((float) $from['y']);

        return round(sqrt($dx ** 2 + $dy ** 2) * 0.12, 1);
    }

    private function clamp(int $value, int $min, int $max): int
    {
        return max($min, min($max, $value));
    }

    private function defaultBins(): array
    {
        return [
            ['code' => 'TPS-01', 'location' => 'Pasar Kota', 'district' => 'Zona Niaga', 'fill_level' => 86, 'x' => 28, 'y' => 28, 'capacity_kg' => 1200],
            ['code' => 'TPS-02', 'location' => 'Permukiman Melati', 'district' => 'Zona Barat', 'fill_level' => 54, 'x' => 17, 'y' => 54, 'capacity_kg' => 900],
            ['code' => 'TPS-03', 'location' => 'Terminal Utama', 'district' => 'Zona Transit', 'fill_level' => 78, 'x' => 53, 'y' => 22, 'capacity_kg' => 1100],
            ['code' => 'TPS-04', 'location' => 'Kampus Teknologi', 'district' => 'Zona Edukasi', 'fill_level' => 41, 'x' => 74, 'y' => 36, 'capacity_kg' => 850],
            ['code' => 'TPS-05', 'location' => 'Taman Selatan', 'district' => 'Zona Publik', 'fill_level' => 67, 'x' => 68, 'y' => 66, 'capacity_kg' => 950],
            ['code' => 'TPS-06', 'location' => 'Rusun Harapan', 'district' => 'Zona Timur', 'fill_level' => 91, 'x' => 42, 'y' => 73, 'capacity_kg' => 1000],
            ['code' => 'TPS-07', 'location' => 'Sentra Kuliner', 'district' => 'Zona Niaga', 'fill_level' => 73, 'x' => 84, 'y' => 55, 'capacity_kg' => 1050],
            ['code' => 'TPS-08', 'location' => 'Puskesmas Indah', 'district' => 'Zona Layanan', 'fill_level' => 35, 'x' => 36, 'y' => 48, 'capacity_kg' => 750],
        ];
    }
}
