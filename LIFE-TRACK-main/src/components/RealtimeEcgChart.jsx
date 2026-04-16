import { useEffect, useMemo, useRef, useState } from "react";
import { ecgSignalToSvgPath, normalizeEcgSignal } from "../services/ecgService";

export function RealtimeEcgChart({
  signal,
  signalVersion = 0,
  height = 200,
  stroke = "#1b6d24",
  strokeWidth = 2.5,
  durationMs = 5000,
}) {
  const [currentSignal, setCurrentSignal] = useState([]);
  const [queuedSignals, setQueuedSignals] = useState([]);
  const [progress, setProgress] = useState(0);
  const animationFrameRef = useRef(null);
  const cycleStartRef = useRef(null);
  const latestVersionRef = useRef(-1);

  useEffect(() => {
    const normalizedSignal = normalizeEcgSignal(signal);

    if (!normalizedSignal.length) {
      latestVersionRef.current = -1;
      setCurrentSignal([]);
      setQueuedSignals([]);
      setProgress(0);
      return;
    }

    if (signalVersion <= latestVersionRef.current) {
      return;
    }

    latestVersionRef.current = signalVersion;

    setCurrentSignal((existingSignal) => {
      if (!existingSignal.length) {
        return normalizedSignal;
      }

      setQueuedSignals((existingQueue) => {
        const dedupedQueue = existingQueue.filter((queuedSignal) => queuedSignal.version !== signalVersion);
        return [...dedupedQueue, { version: signalVersion, signal: normalizedSignal }];
      });

      return existingSignal;
    });
  }, [signal, signalVersion]);

  useEffect(() => {
    if (!queuedSignals.length) {
      setProgress(0);
      cycleStartRef.current = null;
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return undefined;
    }

    const animate = (timestamp) => {
      if (cycleStartRef.current === null) {
        cycleStartRef.current = timestamp;
      }

      const elapsed = timestamp - cycleStartRef.current;
      const nextProgress = Math.min(elapsed / Math.max(durationMs, 250), 1);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        const nextQueuedSignal = queuedSignals[0];
        setCurrentSignal(nextQueuedSignal?.signal ?? []);
        setQueuedSignals((existingQueue) => existingQueue.slice(1));
        setProgress(0);
        cycleStartRef.current = null;
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [durationMs, queuedSignals]);

  const nextSignal = queuedSignals[0]?.signal ?? null;

  const currentPath = useMemo(
    () => ecgSignalToSvgPath(currentSignal, 1000, height),
    [currentSignal, height],
  );
  const nextPath = useMemo(
    () => ecgSignalToSvgPath(nextSignal ?? [], 1000, height),
    [nextSignal, height],
  );

  if (!currentSignal.length) {
    return null;
  }

  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox={`0 0 1000 ${height}`}>
      <g transform={nextSignal ? `translate(${-progress * 1000} 0)` : undefined}>
        <path
          className="ecg-line"
          d={currentPath}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        {nextSignal && (
          <path
            className="ecg-line"
            d={nextPath}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
            transform="translate(1000 0)"
          />
        )}
      </g>
    </svg>
  );
}
