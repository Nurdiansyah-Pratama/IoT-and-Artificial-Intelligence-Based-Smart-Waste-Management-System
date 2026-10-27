import { BrainCircuit, Navigation, Send, Timer } from 'lucide-react';
import { getBinTone, pct } from '../utils/status';

export default function RouteRecommendationFinal({ routeInfo, serviceTargets, routeParams, onDispatch, disabled }) {
    const route = routeInfo.stops || routeInfo.route || [];
    const methodLabel = routeInfo.method_label || { greedy: 'Greedy', dijkstra: 'Dijkstra', hybrid: 'Hybrid' }[routeParams.method] || 'Greedy';

    return (
        <section className="rounded-lg border border-[#d5e3dd] bg-white shadow-sm">
            <div className="border-b border-[#e2ece7] px-4 py-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#17231f]">
                    <BrainCircuit className="h-5 w-5 text-teal-700" />
                    Rekomendasi AI
                </h2>
                <p className="text-sm text-[#60716a]">Urutan TPS berdasarkan metode {methodLabel} dan ambang aktif.</p>
            </div>

            <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                    <Metric icon={Navigation} label="Jarak" value={`${routeInfo.estimated_distance_km || 0} km`} />
                    <Metric icon={Timer} label="ETA" value={`${routeInfo.eta_minutes || 0} menit`} />
                </div>

                <div className="grid gap-2 rounded-lg border border-[#dfeae5] bg-[#f8fbf9] p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[#60716a]">Ambang prioritas</span>
                        <span className="font-bold text-[#17231f]">{routeInfo.priority_threshold || routeParams.priorityThreshold}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[#60716a]">Kapasitas armada</span>
                        <span className="font-bold text-[#17231f]">{routeInfo.fleet_capacity || routeParams.fleetCapacity} TPS</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[#60716a]">Target di atas ambang</span>
                        <span className="font-bold text-[#17231f]">{serviceTargets} TPS</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {route.length === 0 && (
                        <div className="rounded-lg border border-dashed border-[#d9e7e1] bg-white p-4 text-sm text-[#60716a]">
                            Belum ada TPS yang melewati ambang prioritas.
                        </div>
                    )}

                    {route.map((bin) => {
                        const tone = getBinTone(bin.fill_level);

                        return (
                            <div key={bin.code} className="flex items-center gap-3 rounded-lg border border-[#dfeae5] bg-white p-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ecf5f1] text-sm font-bold text-teal-800">
                                    {bin.order}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate font-bold text-[#1f3029]">{bin.code}</p>
                                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone.soft}`}>{bin.priority}</span>
                                    </div>
                                    <p className="truncate text-xs text-[#6b7a73]">{bin.location}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`block text-sm font-bold ${tone.text}`}>{pct(bin.fill_level)}</span>
                                    <span className="text-[11px] font-semibold text-[#7a8982]">{bin.distance_from_previous_km || 0} km</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={onDispatch}
                    disabled={disabled}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:bg-zinc-300 disabled:text-zinc-600"
                >
                    <Send className="h-4 w-4" />
                    Kirim Armada Prioritas
                </button>
            </div>
        </section>
    );
}

function Metric({ icon: Icon, label, value }) {
    return (
        <div className="rounded-lg border border-[#dfeae5] bg-[#f8fbf9] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#68766f]">
                <Icon className="h-4 w-4 text-teal-700" />
                {label}
            </div>
            <p className="mt-1 text-lg font-bold text-[#17231f]">{value}</p>
        </div>
    );
}
