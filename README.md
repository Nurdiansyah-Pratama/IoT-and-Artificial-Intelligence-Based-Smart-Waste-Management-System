# Smart Waste Management Berbasis IoT dan AI

Aplikasi simulasi monitoring TPS/tempat sampah berbasis Laravel API dan React JavaScript. Halaman utama langsung masuk ke dashboard simulasi, bukan landing page.

## Fitur

- Dashboard monitoring TPS dengan status Rendah, Sedang, dan Prioritas tinggi.
- Simulasi sensor IoT real-time dengan Start, Pause, Reset, dan Step Simulation.
- Rekomendasi prioritas AI sederhana berdasarkan tingkat kepenuhan tertinggi.
- Animasi truk pengangkut menggunakan `requestAnimationFrame`, interpolasi posisi, easing, dan stop singkat di setiap TPS.
- Endpoint API Laravel:
  - `GET /api/bins`
  - `POST /api/simulate/update`
  - `POST /api/route/calculate`
  - `POST /api/collect`
- Data dummy fallback tetap tersedia, plus model, migration, dan seeder `bins` agar mudah dikembangkan ke MySQL.

## Struktur Utama

```text
app/
  Http/Controllers/Api/SmartWasteController.php
  Models/Bin.php
  Services/SmartWasteSimulationService.php
database/
  migrations/2026_06_30_000000_create_bins_table.php
  seeders/BinSeeder.php
resources/
  css/app.css
  js/app.jsx
  js/components/
    Dashboard.jsx
    MapSimulation.jsx
    BinMarker.jsx
    TruckAnimation.jsx
    SensorTable.jsx
    RouteRecommendation.jsx
    SimulationControls.jsx
    SystemLog.jsx
routes/
  api.php
  web.php
tests/
  Feature/SmartWasteApiTest.php
```

## Cara Menjalankan

```bash
composer install
npm install
php artisan migrate --seed
php artisan serve
npm run dev
```

Buka aplikasi di:

```text
http://127.0.0.1:8000
```

Untuk build production:

```bash
npm run build
```

Untuk menjalankan test:

```bash
php artisan test
```
