export function getBinTone(fillLevel) {
    if (fillLevel >= 80) {
        return {
            marker: 'border-red-600 bg-red-500 text-white shadow-red-900/20',
            ring: 'ring-red-200',
            soft: 'border-red-100 bg-red-50 text-red-700',
            text: 'text-red-700',
            bar: 'bg-red-500',
        };
    }

    if (fillLevel >= 60) {
        return {
            marker: 'border-amber-500 bg-amber-400 text-zinc-950 shadow-amber-900/20',
            ring: 'ring-amber-200',
            soft: 'border-amber-100 bg-amber-50 text-amber-700',
            text: 'text-amber-700',
            bar: 'bg-amber-400',
        };
    }

    return {
        marker: 'border-emerald-600 bg-emerald-500 text-white shadow-emerald-900/20',
        ring: 'ring-emerald-200',
        soft: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        bar: 'bg-emerald-500',
    };
}

export function formatClock(dateValue) {
    if (!dateValue) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(new Date(dateValue));
}

export function pct(value) {
    return `${Math.round(Number(value) || 0)}%`;
}
