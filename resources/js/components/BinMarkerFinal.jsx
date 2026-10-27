import { Trash2 } from 'lucide-react';
import { getBinTone, pct } from '../utils/status';

export default function BinMarkerFinal({ bin, selected, inRoute, routeOrder, priorityThreshold, onClick }) {
    const tone = getBinTone(bin.fill_level);
    const targetStatus = bin.fill_level >= priorityThreshold ? 'Masuk rute prioritas' : 'Di bawah ambang';

    return (
        <button
            type="button"
            onClick={onClick}
            className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus:outline-none"
            style={{ left: `${bin.x}%`, top: `${bin.y}%` }}
            aria-label={`${bin.code} ${bin.location} ${bin.fill_level}%`}
        >
            <span className={`relative flex h-12 w-12 items-center justify-center rounded-lg border-2 shadow-lg transition duration-200 group-hover:scale-105 ${tone.marker} ${selected ? `ring-4 ${tone.ring}` : ''} ${inRoute ? 'outline outline-4 outline-teal-300/60' : ''}`}>
                <Trash2 className="h-5 w-5" />
                {inRoute && (
                    <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-teal-800 text-[11px] font-black text-white shadow-sm">
                        {routeOrder}
                    </span>
                )}
            </span>
            <span className="max-w-24 rounded-md border border-white/80 bg-white/95 px-2 py-1 text-center text-[11px] font-bold leading-tight text-[#24332d] shadow-sm">
                {bin.code}
                <span className={`ml-1 ${tone.text}`}>{pct(bin.fill_level)}</span>
            </span>
            <span className="pointer-events-none absolute top-full mt-2 hidden w-48 rounded-lg border border-[#dbe7e1] bg-white p-3 text-left text-xs text-[#52645c] shadow-xl group-hover:block">
                <span className="block font-bold text-[#17231f]">{bin.location}</span>
                <span className="mt-1 block">{bin.district}</span>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-1 font-semibold ${tone.soft}`}>{bin.status}</span>
                <span className={`ml-1 mt-2 inline-flex rounded-full border px-2 py-1 font-semibold ${inRoute ? 'border-teal-100 bg-teal-50 text-teal-800' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}`}>{targetStatus}</span>
            </span>
        </button>
    );
}
