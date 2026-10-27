<?php

use App\Http\Controllers\Api\SmartWasteController;
use Illuminate\Support\Facades\Route;

Route::get('/bins', [SmartWasteController::class, 'bins']);
Route::post('/simulate/update', [SmartWasteController::class, 'simulateUpdate']);
Route::post('/route/calculate', [SmartWasteController::class, 'calculateRoute']);
Route::post('/collect', [SmartWasteController::class, 'collect']);
