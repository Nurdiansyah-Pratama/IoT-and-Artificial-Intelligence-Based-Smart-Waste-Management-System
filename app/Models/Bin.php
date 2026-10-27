<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bin extends Model
{
    protected $fillable = [
        'code',
        'location',
        'district',
        'fill_level',
        'map_x',
        'map_y',
        'capacity_kg',
        'waste_kg',
        'last_reported_at',
    ];

    protected function casts(): array
    {
        return [
            'fill_level' => 'integer',
            'map_x' => 'float',
            'map_y' => 'float',
            'capacity_kg' => 'integer',
            'waste_kg' => 'integer',
            'last_reported_at' => 'datetime',
        ];
    }
}
