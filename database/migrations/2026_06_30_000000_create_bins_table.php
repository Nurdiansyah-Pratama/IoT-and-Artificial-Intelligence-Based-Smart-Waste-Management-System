<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bins', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('location');
            $table->string('district')->nullable();
            $table->unsignedTinyInteger('fill_level')->default(0);
            $table->decimal('map_x', 5, 2);
            $table->decimal('map_y', 5, 2);
            $table->unsignedInteger('capacity_kg')->default(900);
            $table->unsignedInteger('waste_kg')->default(0);
            $table->timestamp('last_reported_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bins');
    }
};
