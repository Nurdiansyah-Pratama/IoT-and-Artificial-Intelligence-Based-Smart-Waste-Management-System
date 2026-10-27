import { Database } from 'lucide-react';
import { formatClock, getBinTone, pct } from '../utils/status';

export default function SensorTableFinal({ bins, routeInfo, priorityThreshold }) {
    const routeIndex = new Map((routeInfo?.stops || routeInfo?.route || []).map((bin, index) => [bin.code, index + 1]));

    return (
        <section className="overflow-hidden rounded-lg border border-[#d5e3dd] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#e2ece7] px-4 py-3">
                <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-[#17231f]">
                        <Database className="h-5 w-5 text-teal-700" />
                        Data Sensor IoT
                    </h2>
                    <p className="text-sm text-[#60716a]">Tabel berubah otomatis saat simulasi berjalan.</p>
                </div>
                <span className="rounded-full border border-[#dbe8e2] bg-[#f8fbf9] px-2.5 py-1 text-xs font-semibold text-[#61716a]">
                    {bins.length} TPS
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-[#f6faf8] text-xs uppercase text-[#68766f]">
                        <tr>
                            <th className="px-4 py-3 font-bold">Kode TPS</th>
                            <th className="px-4 py-3 font-bold">Lokasi</th>
                            <th className="px-4 py-3 font-bold">Kepenuhan</th>
                            <th className="px-4 py-3 font-bold">Status</th>
                            <th className="px-4 py-3 font-bold">Prioritas</th>
                            <th className="px-4 py-3 font-bold">Keputusan</th>
                            <th className="px-4 py-3 font-bold">Update</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf3f0]">
                        {bins.map((bin) => {
                            const tone = getBinTone(bin.fill_level);
                            const order = routeIndex.get(bin.code);
                            const decision = order ? `Rute #${order}` : bin.fill_level >= priorityThreshold ? 'Antre kapasitas' : 'Pantau';
                            const decisionClass = order
                                ? 'border-teal-100 bg-teal-50 text-teal-800'
                                : bin.fill_level >= priorityThreshold
                                    ? 'border-amber-100 bg-amber-50 text-amber-800'
                                    : 'border-zinc-200 bg-zinc-50 text-zinc-600';

                            return (
                                <tr key={bin.code} className="hover:bg-[#f8fbf9]">
                                    <td className="px-4 py-3 font-bold text-[#1f3029]">{bin.code}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-[#25332e]">{bin.location}</div>
                                        <div className="text-xs text-[#718079]">{bin.district}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex min-w-[160px] items-center gap-3">
                                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e7efeb]">
                                                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: pct(bin.fill_level) }} />
                                            </div>
                                            <span className={`w-10 text-right font-bold ${tone.text}`}>{pct(bin.fill_level)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tone.soft}`}>{bin.status}</span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-[#25332e]">{bin.priority}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${decisionClass}`}>{decision}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[#61716a]">{formatClock(bin.last_reported_at)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
