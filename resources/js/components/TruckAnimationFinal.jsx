import { useEffect, useMemo, useRef, useState } from 'react';
import { Truck } from 'lucide-react';

function distance(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(from, to, amount) {
    return from + (to - from) * amount;
}

function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export default function TruckAnimationFinal({
    route,
    depot,
    dispatchId,
    isPaused,
    onArrive,
    onComplete,
    onTargetChange,
}) {
    const [position, setPosition] = useState({
        x: depot.x,
        y: depot.y,
        angle: 0,
        collectingCode: null,
        returningToDepot: false,
    });

    const callbacksRef = useRef({ onArrive, onComplete, onTargetChange });
    const pausedRef = useRef(isPaused);

    useEffect(() => {
        callbacksRef.current = { onArrive, onComplete, onTargetChange };
    }, [onArrive, onComplete, onTargetChange]);

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    const routeSignature = useMemo(() => route.map((bin) => bin.code).join('|'), [route]);
    const depotSignature = useMemo(() => `${depot.x}|${depot.y}`, [depot.x, depot.y]);

    useEffect(() => {
        const depotSnapshot = { ...depot };
        const routeSnapshot = route.map((bin) => ({ ...bin }));
        const points = [depotSnapshot, ...routeSnapshot, depotSnapshot];
        let frameId;
        const state = {
            segmentIndex: 0,
            segmentStart: null,
            stopUntil: 0,
            pauseStarted: null,
            completed: false,
            lastTargetIndex: null,
        };

        setPosition({ x: depotSnapshot.x, y: depotSnapshot.y, angle: 0, collectingCode: null, returningToDepot: false });

        if (routeSnapshot.length === 0) {
            return undefined;
        }

        const notifySegmentTarget = () => {
            if (state.lastTargetIndex === state.segmentIndex) {
                return;
            }

            state.lastTargetIndex = state.segmentIndex;
            callbacksRef.current.onTargetChange?.(routeSnapshot[state.segmentIndex] || null);
        };

        const animate = (now) => {
            if (pausedRef.current) {
                if (!state.pauseStarted) {
                    state.pauseStarted = now;
                }

                frameId = window.requestAnimationFrame(animate);
                return;
            }

            if (state.pauseStarted) {
                const pausedFor = now - state.pauseStarted;
                if (state.segmentStart !== null) {
                    state.segmentStart += pausedFor;
                }
                if (state.stopUntil > 0) {
                    state.stopUntil += pausedFor;
                }
                state.pauseStarted = null;
            }

            if (state.stopUntil > now) {
                frameId = window.requestAnimationFrame(animate);
                return;
            }

            if (state.segmentIndex >= points.length - 1) {
                if (!state.completed) {
                    state.completed = true;
                    callbacksRef.current.onComplete?.();
                }
                return;
            }

            if (state.segmentStart === null) {
                notifySegmentTarget();
                state.segmentStart = now;
            }

            const from = points[state.segmentIndex];
            const to = points[state.segmentIndex + 1];
            const segmentDistance = distance(from, to);
            const duration = Math.max(1300, Math.min(4600, segmentDistance * 58));
            const progress = Math.min((now - state.segmentStart) / duration, 1);
            const eased = easeInOutCubic(progress);
            const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);

            setPosition({
                x: lerp(from.x, to.x, eased),
                y: lerp(from.y, to.y, eased),
                angle,
                collectingCode: null,
                returningToDepot: state.segmentIndex >= routeSnapshot.length,
            });

            if (progress >= 1) {
                const arrivedBin = state.segmentIndex < routeSnapshot.length ? routeSnapshot[state.segmentIndex] : null;
                state.segmentIndex += 1;
                state.segmentStart = null;

                if (arrivedBin) {
                    setPosition({
                        x: arrivedBin.x,
                        y: arrivedBin.y,
                        angle,
                        collectingCode: arrivedBin.code,
                        returningToDepot: false,
                    });
                    callbacksRef.current.onArrive?.(arrivedBin);
                    state.stopUntil = now + 1150;
                }
            }

            frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);

        return () => {
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [depotSignature, dispatchId, routeSignature]);

    return (
        <div
            className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `translate(-50%, -50%) rotate(${position.angle}deg)`,
            }}
            aria-label="Truk pengangkut sampah"
        >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-teal-100 bg-white text-teal-800 shadow-xl shadow-teal-900/25">
                <Truck className="h-7 w-7" />
                <span className="absolute -bottom-1 h-2 w-7 rounded-full bg-teal-900/20 blur-sm" />
            </div>
            {position.collectingCode && (
                <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded-full border border-teal-100 bg-white px-2 py-1 text-[11px] font-bold text-teal-800 shadow-sm">
                    Angkut {position.collectingCode}
                </span>
            )}
            {!position.collectingCode && position.returningToDepot && (
                <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-sky-100 bg-white px-2 py-1 text-[11px] font-bold text-sky-800 shadow-sm">
                    Kembali ke depot
                </span>
            )}
        </div>
    );
}
