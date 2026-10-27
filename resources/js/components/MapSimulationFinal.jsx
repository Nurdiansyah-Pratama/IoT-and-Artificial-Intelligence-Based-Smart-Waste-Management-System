import { Home, MapPin } from 'lucide-react';
import BinMarker from './BinMarkerFinal';
import TruckAnimation from './TruckAnimationFinal';

function pathFromPoints(points) {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export default function MapSimulationFinal({
    bins,
    routeInfo,
    activeRoute,
    depot,
    selectedBin,
    dispatchId,
    priorityThreshold,
    isTruckPaused,
    onSelectBin,
    onTruckArrive,
    onTruckComplete,
    onTargetChange,
}) {
    const routePreview = activeRoute.length > 0 ? activeRoute : (routeInfo.stops || routeInfo.route || []);
    const routePath = routePreview.length ? pathFromPoints([depot, ...routePreview, depot]) : '';
    const routeIndex = new Map(routePreview.map((bin, index) => [bin.code, index + 1]));

    return (
        <section className="overflow-hidden rounded-lg border border-[#d5e3dd] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#e2ece7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-[#17231f]">
                        <MapPin className="h-5 w-5 text-teal-700" />
                        Peta Simulasi TPS
                    </h2>
                    <p className="text-sm text-[#60716a]">Marker TPS, depot, garis rute, dan pergerakan truk pengangkut.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <Legend color="bg-emerald-500" label="Rendah < 60%" />
                    <Legend color="bg-amber-400" label="Sedang 60-79%" />
                    <Legend color="bg-red-500" label="Prioritas >= 80%" />
                    <Legend color="bg-teal-700" label={`Masuk rute >= ${priorityThreshold}%`} />
                </div>
            </div>

            <div className="relative h-[430px] min-h-[360px] overflow-hidden bg-[#dfeee5] sm:h-[520px] lg:h-[610px]">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#c9ddd4" strokeWidth="0.18" />
                        </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#map-grid)" />
                    <path d="M 4 82 C 18 72, 26 63, 38 51 S 64 34, 95 28" fill="none" stroke="#f8fbf9" strokeWidth="6.5" strokeLinecap="round" />
                    <path d="M 16 8 C 26 22, 38 27, 52 33 S 73 50, 91 72" fill="none" stroke="#f8fbf9" strokeWidth="5.5" strokeLinecap="round" />
                    <path d="M 8 48 C 25 42, 42 43, 59 49 S 78 57, 94 54" fill="none" stroke="#f8fbf9" strokeWidth="4.5" strokeLinecap="round" />
                    <path d="M 47 8 L 44 92" fill="none" stroke="#f8fbf9" strokeWidth="4" strokeLinecap="round" />
                    <path d="M 4 82 C 18 72, 26 63, 38 51 S 64 34, 95 28" fill="none" stroke="#b9cfc6" strokeWidth="0.8" strokeDasharray="1.5 2.5" />
                    <path d="M 16 8 C 26 22, 38 27, 52 33 S 73 50, 91 72" fill="none" stroke="#b9cfc6" strokeWidth="0.7" strokeDasharray="1.5 2.5" />
                    {routePath && <path d={routePath} fill="none" stroke="#0f766e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />}
                </svg>

                <MapLabel className="left-[7%] top-[9%]" text="Zona Niaga" />
                <MapLabel className="right-[8%] top-[16%]" text="Zona Edukasi" />
                <MapLabel className="bottom-[10%] right-[9%]" text="Zona Publik" />

                <div className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: `${depot.x}%`, top: `${depot.y}%` }}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-teal-200 bg-teal-700 text-white shadow-lg shadow-teal-900/20">
                        <Home className="h-5 w-5" />
                    </span>
                    <span className="rounded-md border border-teal-100 bg-white/90 px-2 py-0.5 text-[11px] font-bold text-teal-800 shadow-sm">DEPOT</span>
                </div>

                {bins.map((bin) => (
                    <BinMarker
                        key={bin.code}
                        bin={bin}
                        selected={selectedBin?.code === bin.code}
                        inRoute={routeIndex.has(bin.code)}
                        routeOrder={routeIndex.get(bin.code)}
                        priorityThreshold={priorityThreshold}
                        onClick={() => onSelectBin(bin)}
                    />
                ))}

                <TruckAnimation
                    route={activeRoute}
                    depot={depot}
                    dispatchId={dispatchId}
                    isPaused={isTruckPaused}
                    onArrive={onTruckArrive}
                    onComplete={onTruckComplete}
                    onTargetChange={onTargetChange}
                />
            </div>
        </section>
    );
}

function Legend({ color, label }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dce8e2] bg-[#f8fbf9] px-2.5 py-1 text-[#55675f]">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
        </span>
    );
}

function MapLabel({ className, text }) {
    return (
        <div className={`absolute rounded-md border border-white/70 bg-white/70 px-2 py-1 text-xs font-semibold text-[#5d6c65] shadow-sm ${className}`}>
            {text}
        </div>
    );
}
