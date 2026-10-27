import { Activity, AlertCircle, CheckCircle2, Cpu, Route, Satellite } from 'lucide-react';
import { formatClock } from '../utils/status';

const iconMap = { success: CheckCircle2, danger: AlertCircle, sensor: Satellite, route: Route, ai: Cpu, info: Activity };
const toneMap = {
    success: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    danger: 'text-red-700 bg-red-50 border-red-100',
    sensor: 'text-teal-700 bg-teal-50 border-teal-100',
    route: 'text-amber-700 bg-amber-50 border-amber-100',
    ai: 'text-indigo-700 bg-indigo-50 border-indigo-100',
    info: 'text-zinc-700 bg-zinc-50 border-zinc-200',
};

export default function SystemLogFinal({ logs }) {
    return (
        <section className="rounded-lg border border-[#d5e3dd] bg-white shadow-sm">
            <div className="border-b border-[#e2ece7] px-4 py-3">
                <h2 className="text-base font-bold text-[#17231f]">System Log</h2>
                <p className="text-sm text-[#60716a]">Aktivitas API, sensor, AI, dan armada.</p>
            </div>

            <div className="max-h-[340px] space-y-2 overflow-y-auto p-4">
                {logs.map((log) => {
                    const Icon = iconMap[log.type] || Activity;
                    const tone = toneMap[log.type] || toneMap.info;

                    return (
                        <div key={log.id} className="flex gap-3 rounded-lg border border-[#e1ece6] bg-[#f8fbf9] p-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
                                <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-snug text-[#26352f]">{log.message}</p>
                                <p className="mt-1 text-xs text-[#718079]">{formatClock(log.time)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
