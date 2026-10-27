import { GitBranch, Pause, Play, RotateCcw, SlidersHorizontal, StepForward } from 'lucide-react';

const methods = [
    { id: 'greedy', label: 'Greedy' },
    { id: 'dijkstra', label: 'Dijkstra' },
    { id: 'hybrid', label: 'Hybrid' },
];

export default function SimulationControlsFinal({ isRunning, isBusy, hasActiveDispatch, params, onParamsChange, onStart, onPause, onReset, onStep }) {
    return (
        <section className="rounded-lg border border-[#d5e3dd] bg-white shadow-sm">
            <div className="border-b border-[#e2ece7] px-4 py-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#17231f]">
                    <SlidersHorizontal className="h-5 w-5 text-teal-700" />
                    Kontrol Simulasi
                </h2>
                <p className="text-sm text-[#60716a]">Atur sensor real-time dan pergerakan armada.</p>
            </div>

            <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={onStart} disabled={isRunning || isBusy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-zinc-300 disabled:text-zinc-600">
                        <Play className="h-4 w-4" />Start
                    </button>
                    <button type="button" onClick={onPause} disabled={!isRunning && !hasActiveDispatch} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-800 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-900 disabled:bg-zinc-300 disabled:text-zinc-600">
                        <Pause className="h-4 w-4" />Pause
                    </button>
                    <button type="button" onClick={onReset} disabled={isBusy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d8e4de] bg-white px-3 text-sm font-bold text-[#25332e] shadow-sm transition hover:bg-[#f6faf8] disabled:text-zinc-400">
                        <RotateCcw className="h-4 w-4" />Reset
                    </button>
                    <button type="button" onClick={onStep} disabled={isBusy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-800 shadow-sm transition hover:bg-teal-100 disabled:text-zinc-400">
                        <StepForward className="h-4 w-4" />Step
                    </button>
                </div>

                <div className="rounded-lg border border-[#dfeae5] bg-[#f8fbf9] p-3">
                    <label className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-[#25332e]">
                        <span className="inline-flex items-center gap-2"><GitBranch className="h-4 w-4 text-teal-700" />Metode rute</span>
                        <span className="text-xs uppercase text-[#68766f]">{methods.find((method) => method.id === params.method)?.label}</span>
                    </label>
                    <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-[#d7e5df] bg-white">
                        {methods.map((method) => (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => onParamsChange({ method: method.id })}
                                className={`h-9 border-r border-[#d7e5df] text-xs font-bold last:border-r-0 ${params.method === method.id ? 'bg-teal-700 text-white' : 'bg-white text-[#61716a] hover:bg-[#eef7f3]'}`}
                            >
                                {method.label}
                            </button>
                        ))}
                    </div>
                </div>

                <SliderControl
                    label="Ambang prioritas"
                    value={`${params.priorityThreshold}%`}
                    min={55}
                    max={95}
                    step={5}
                    current={params.priorityThreshold}
                    onChange={(value) => onParamsChange({ priorityThreshold: value })}
                />
                <SliderControl
                    label="Kapasitas armada"
                    value={`${params.fleetCapacity} TPS`}
                    min={1}
                    max={8}
                    step={1}
                    current={params.fleetCapacity}
                    onChange={(value) => onParamsChange({ fleetCapacity: value })}
                />
                <SliderControl
                    label="Laju perubahan sensor"
                    value={`${Math.round(params.growthMultiplier * 100)}%`}
                    min={40}
                    max={220}
                    step={20}
                    current={Math.round(params.growthMultiplier * 100)}
                    onChange={(value) => onParamsChange({ growthMultiplier: value / 100 })}
                />
            </div>
        </section>
    );
}

function SliderControl({ label, value, min, max, step, current, onChange }) {
    return (
        <label className="block rounded-lg border border-[#dfeae5] bg-white p-3">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-[#25332e]">
                <span>{label}</span>
                <span className="rounded-full bg-[#eef7f3] px-2 py-0.5 text-xs font-bold text-teal-800">{value}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={current}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-teal-700"
            />
        </label>
    );
}
