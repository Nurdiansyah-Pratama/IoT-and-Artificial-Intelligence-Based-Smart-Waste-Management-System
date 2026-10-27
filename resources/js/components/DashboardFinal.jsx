import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BrainCircuit, Gauge, Navigation, RadioTower, Truck, Wifi } from 'lucide-react';
import MapSimulation from './MapSimulationFinal';
import RouteRecommendation from './RouteRecommendationFinal';
import SensorTable from './SensorTableFinal';
import SimulationControls from './SimulationControlsFinal';
import SystemLog from './SystemLogFinal';
import { formatClock } from '../utils/status';

const depotFallback = { code: 'DEPOT-01', location: 'Garasi Armada Barat', x: 9, y: 84 };
const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
const defaultRouteParams = {
    method: 'greedy',
    priorityThreshold: 80,
    fleetCapacity: 6,
    growthMultiplier: 1,
};

const methodLabels = {
    greedy: 'Greedy',
    dijkstra: 'Dijkstra',
    hybrid: 'Hybrid',
};

function logItem(message, type = 'info') {
    return { id: `${Date.now()}-${Math.random()}`, message, type, time: new Date().toISOString() };
}

function routePayload(params) {
    return {
        method: params.method,
        threshold: params.priorityThreshold,
        fleet_capacity: params.fleetCapacity,
        growth_multiplier: params.growthMultiplier,
    };
}

async function postJson(url, payload) {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Request gagal: ${response.status}`);
    return response.json();
}

export default function Dashboard() {
    const [bins, setBins] = useState([]);
    const [routeInfo, setRouteInfo] = useState({ depot: depotFallback, route: [], estimated_distance_km: 0, eta_minutes: 0 });
    const [logs, setLogs] = useState([logItem('Sistem siap. Data TPS awal dimuat dari API Laravel.', 'success')]);
    const [isRunning, setIsRunning] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [activeDispatch, setActiveDispatch] = useState([]);
    const [dispatchId, setDispatchId] = useState(0);
    const [fleetStatus, setFleetStatus] = useState('Siaga di depot');
    const [isFleetPaused, setIsFleetPaused] = useState(true);
    const [selectedBin, setSelectedBin] = useState(null);
    const [routeParams, setRouteParams] = useState(defaultRouteParams);
    const binsRef = useRef([]);
    const routeParamsRef = useRef(defaultRouteParams);
    const stepLock = useRef(false);
    const depot = routeInfo.depot || depotFallback;

    const pushLog = useCallback((message, type = 'info') => {
        setLogs((current) => [logItem(message, type), ...current].slice(0, 12));
    }, []);

    useEffect(() => { routeParamsRef.current = routeParams; }, [routeParams]);

    const calculateRoute = useCallback(async (currentBins, shouldLog = false, params = routeParamsRef.current) => {
        const data = await postJson('/api/route/calculate', { bins: currentBins, ...routePayload(params) });
        setRouteInfo(data);
        if (shouldLog && data.stops?.[0]) {
            pushLog(`${data.method_label || methodLabels[params.method]} memilih ${data.stops[0].code} sebagai tujuan pertama (${data.stops[0].fill_level}%).`, 'ai');
        }
        return data;
    }, [pushLog]);

    const loadBins = useCallback(async () => {
        setIsBusy(true);
        try {
            const response = await fetch('/api/bins', { headers: { Accept: 'application/json' } });
            const data = await response.json();
            setBins(data.bins);
            binsRef.current = data.bins;
            setLastUpdate(data.updated_at);
            await calculateRoute(data.bins, false, routeParamsRef.current);
            pushLog('Data sensor TPS berhasil dimuat.', 'success');
        } catch (error) {
            pushLog(`Gagal memuat data: ${error.message}`, 'danger');
        } finally {
            setIsBusy(false);
        }
    }, [calculateRoute, pushLog]);

    useEffect(() => { loadBins(); }, [loadBins]);
    useEffect(() => { binsRef.current = bins; }, [bins]);

    const dispatchTruck = useCallback(async (sourceRoute = routeInfo) => {
        const routeTargets = sourceRoute.stops || sourceRoute.route || [];
        const targets = routeTargets.slice(0, routeParamsRef.current.fleetCapacity);
        if (!targets.length) return pushLog('Tidak ada TPS yang perlu dikunjungi saat ini.', 'info');
        setActiveDispatch(targets);
        setIsFleetPaused(false);
        setDispatchId((value) => value + 1);
        setFleetStatus(`Menuju ${targets[0].code}`);
        pushLog(`Armada dikirim dengan metode ${sourceRoute.method_label || methodLabels[routeParamsRef.current.method]} ke ${targets.map((bin) => bin.code).join(', ')}.`, 'route');
    }, [pushLog, routeInfo]);

    const stepSimulation = useCallback(async (mode = 'manual') => {
        if (stepLock.current || binsRef.current.length === 0) return;
        stepLock.current = true;
        setIsBusy(true);
        try {
            const data = await postJson('/api/simulate/update', { bins: binsRef.current, ...routePayload(routeParamsRef.current) });
            setBins(data.bins);
            binsRef.current = data.bins;
            setRouteInfo(data.route);
            setLastUpdate(data.updated_at);
            const top = data.route?.stops?.[0];
            pushLog(top ? `${mode === 'auto' ? 'Sensor IoT update otomatis' : 'Step simulasi'}: ${top.code} kini prioritas tertinggi (${top.fill_level}%).` : 'Data sensor diperbarui.', mode === 'auto' ? 'sensor' : 'info');
        } catch (error) {
            pushLog(`Update simulasi gagal: ${error.message}`, 'danger');
        } finally {
            stepLock.current = false;
            setIsBusy(false);
        }
    }, [pushLog]);

    useEffect(() => {
        if (!isRunning) return undefined;
        const timer = window.setInterval(() => stepSimulation('auto'), 2600);
        return () => window.clearInterval(timer);
    }, [isRunning, stepSimulation]);

    const startSimulation = useCallback(async () => {
        setIsRunning(true);
        setIsFleetPaused(false);
        pushLog('Simulasi real-time dimulai.', 'success');
        if (activeDispatch.length === 0) {
            await dispatchTruck(routeInfo.route?.length ? routeInfo : await calculateRoute(binsRef.current, true));
        }
    }, [activeDispatch.length, calculateRoute, dispatchTruck, pushLog, routeInfo]);

    const pauseSimulation = useCallback(() => {
        setIsRunning(false);
        setIsFleetPaused(true);
        setFleetStatus(activeDispatch.length ? 'Simulasi dijeda' : 'Siaga di depot');
        pushLog('Simulasi dijeda. Sensor dan armada menunggu.', 'info');
    }, [activeDispatch.length, pushLog]);

    const resetSimulation = useCallback(async () => {
        setIsRunning(false);
        setActiveDispatch([]);
        setIsFleetPaused(true);
        setDispatchId((value) => value + 1);
        setFleetStatus('Siaga di depot');
        setSelectedBin(null);
        await loadBins();
        pushLog('Simulasi di-reset ke data awal.', 'success');
    }, [loadBins, pushLog]);

    const handleTruckArrive = useCallback(async (bin) => {
        setFleetStatus(`Mengangkut ${bin.code}`);
        try {
            const data = await postJson('/api/collect', { bins: binsRef.current, code: bin.code, ...routePayload(routeParamsRef.current) });
            setBins(data.bins);
            binsRef.current = data.bins;
            setRouteInfo(data.route);
            setLastUpdate(data.updated_at);
            pushLog(data.message, 'success');
        } catch (error) {
            pushLog(`Pengangkutan ${bin.code} gagal: ${error.message}`, 'danger');
        }
    }, [pushLog]);

    const updateRouteParams = useCallback((patch) => {
        setRouteParams((current) => ({ ...current, ...patch }));
    }, []);

    useEffect(() => {
        if (binsRef.current.length === 0) return;
        calculateRoute(binsRef.current, false, routeParams).catch((error) => {
            pushLog(`Gagal menghitung ulang rute: ${error.message}`, 'danger');
        });
    }, [calculateRoute, pushLog, routeParams]);

    const stats = useMemo(() => ({
        averageFill: bins.length ? Math.round(bins.reduce((total, bin) => total + bin.fill_level, 0) / bins.length) : 0,
        highPriority: bins.filter((bin) => bin.fill_level >= routeParams.priorityThreshold).length,
        serviceTargets: bins.filter((bin) => bin.fill_level >= routeParams.priorityThreshold).length,
        routeDistance: routeInfo.estimated_distance_km || 0,
        routeStops: (routeInfo.stops || routeInfo.route || []).length,
    }), [bins, routeInfo.estimated_distance_km, routeInfo.route, routeInfo.stops, routeParams.priorityThreshold]);

    return (
        <main className="min-h-screen bg-[#eef5f1] px-3 py-4 text-[#17231f] sm:px-5 lg:px-7">
            <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-4">
                <header className="flex flex-col gap-3 rounded-lg border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-teal-700">
                            <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1"><RadioTower className="h-3.5 w-3.5" />IoT Live Sensor</span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700"><BrainCircuit className="h-3.5 w-3.5" />AI Priority Engine</span>
                        </div>
                        <h1 className="mt-3 text-2xl font-bold leading-tight text-[#10201a] sm:text-3xl">Smart Waste Management Berbasis IoT dan AI</h1>
                        <p className="mt-1 max-w-3xl text-sm text-[#5f6f68]">Dashboard simulasi monitoring TPS, prioritas pengangkutan, dan animasi armada secara real-time.</p>
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-[#dbe8e2] bg-[#f8fbf9] p-3 text-sm sm:min-w-[260px]">
                        <div className="flex items-center justify-between gap-3"><span className="text-[#61716a]">Status simulasi</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-700'}`}><Wifi className="h-3.5 w-3.5" />{isRunning ? 'Berjalan' : 'Pause'}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-[#61716a]">Update terakhir</span><span className="font-semibold text-[#25332e]">{formatClock(lastUpdate)}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="text-[#61716a]">Metode rute</span><span className="font-semibold text-[#25332e]">{methodLabels[routeParams.method]}</span></div>
                    </div>
                </header>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard icon={Gauge} label="Rata-rata kepenuhan" value={`${stats.averageFill}%`} tone="teal" />
                    <StatCard icon={AlertTriangle} label={`TPS di atas ambang ${routeParams.priorityThreshold}%`} value={stats.highPriority} tone="red" />
                    <StatCard icon={Navigation} label="Estimasi jarak" value={`${stats.routeDistance} km`} tone="amber" />
                    <StatCard icon={Truck} label="Status armada" value={fleetStatus} tone="zinc" compact />
                </section>

                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.48fr)_minmax(340px,0.82fr)]">
                    <div className="flex min-w-0 flex-col gap-4">
                        <MapSimulation bins={bins} routeInfo={routeInfo} activeRoute={activeDispatch} depot={depot} selectedBin={selectedBin} dispatchId={dispatchId} priorityThreshold={routeParams.priorityThreshold} isTruckPaused={isFleetPaused || activeDispatch.length === 0} onSelectBin={setSelectedBin} onTruckArrive={handleTruckArrive} onTruckComplete={async () => { setActiveDispatch([]); setIsFleetPaused(true); setFleetStatus('Siaga di depot'); pushLog('Rute selesai. Armada kembali ke depot.', 'route'); await calculateRoute(binsRef.current, false, routeParamsRef.current); }} onTargetChange={(bin) => setFleetStatus(bin ? `Menuju ${bin.code}` : 'Kembali ke depot')} />
                        <SensorTable bins={bins} routeInfo={routeInfo} priorityThreshold={routeParams.priorityThreshold} />
                    </div>
                    <aside className="flex min-w-0 flex-col gap-4">
                        <SimulationControls isRunning={isRunning} isBusy={isBusy} hasActiveDispatch={activeDispatch.length > 0} params={routeParams} onParamsChange={updateRouteParams} onStart={startSimulation} onPause={pauseSimulation} onReset={resetSimulation} onStep={() => stepSimulation('manual')} />
                        <RouteRecommendation routeInfo={routeInfo} serviceTargets={stats.serviceTargets} routeParams={routeParams} onDispatch={() => dispatchTruck(routeInfo)} disabled={isBusy || stats.routeStops === 0} />
                        <SystemLog logs={logs} />
                    </aside>
                </section>
            </div>
        </main>
    );
}

function StatCard({ icon: Icon, label, value, tone, compact = false }) {
    const toneClass = { teal: 'bg-teal-50 text-teal-700 border-teal-100', red: 'bg-red-50 text-red-700 border-red-100', amber: 'bg-amber-50 text-amber-700 border-amber-100', zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200' }[tone];
    return (
        <article className="rounded-lg border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClass}`}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase text-[#68766f]">{label}</p><p className={`${compact ? 'text-base' : 'text-2xl'} truncate font-bold text-[#15251f]`}>{value}</p></div>
            </div>
        </article>
    );
}
