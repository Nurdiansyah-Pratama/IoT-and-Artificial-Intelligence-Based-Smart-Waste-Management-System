<?php

namespace Database\Seeders;

use App\Models\Bin;
use Illuminate\Database\Seeder;

class BinSeeder extends Seeder
{
    public function run(): void
    {
        collect([
            ['code' => 'TPS-01', 'location' => 'Pasar Kota', 'district' => 'Zona Niaga', 'fill_level' => 86, 'map_x' => 28, 'map_y' => 28, 'capacity_kg' => 1200],
            ['code' => 'TPS-02', 'location' => 'Permukiman Melati', 'district' => 'Zona Barat', 'fill_level' => 54, 'map_x' => 17, 'map_y' => 54, 'capacity_kg' => 900],
            ['code' => 'TPS-03', 'location' => 'Terminal Utama', 'district' => 'Zona Transit', 'fill_level' => 78, 'map_x' => 53, 'map_y' => 22, 'capacity_kg' => 1100],
            ['code' => 'TPS-04', 'location' => 'Kampus Teknologi', 'district' => 'Zona Edukasi', 'fill_level' => 41, 'map_x' => 74, 'map_y' => 36, 'capacity_kg' => 850],
            ['code' => 'TPS-05', 'location' => 'Taman Selatan', 'district' => 'Zona Publik', 'fill_level' => 67, 'map_x' => 68, 'map_y' => 66, 'capacity_kg' => 950],
            ['code' => 'TPS-06', 'location' => 'Rusun Harapan', 'district' => 'Zona Timur', 'fill_level' => 91, 'map_x' => 42, 'map_y' => 73, 'capacity_kg' => 1000],
            ['code' => 'TPS-07', 'location' => 'Sentra Kuliner', 'district' => 'Zona Niaga', 'fill_level' => 73, 'map_x' => 84, 'map_y' => 55, 'capacity_kg' => 1050],
            ['code' => 'TPS-08', 'location' => 'Puskesmas Indah', 'district' => 'Zona Layanan', 'fill_level' => 35, 'map_x' => 36, 'map_y' => 48, 'capacity_kg' => 750],
        ])->each(function (array $bin): void {
            $bin['waste_kg'] = (int) round($bin['capacity_kg'] * ($bin['fill_level'] / 100));
            $bin['last_reported_at'] = now();

            Bin::query()->updateOrCreate(['code' => $bin['code']], $bin);
        });
    }
}
