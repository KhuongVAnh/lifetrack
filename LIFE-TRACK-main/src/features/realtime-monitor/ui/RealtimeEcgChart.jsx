import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SAMPLE_RATE_HZ, normalizeEcgSignal } from "@/features/realtime-monitor/api/ecgApi";

const CHART_WIDTH = 1000;
const Y_MIN = -1.5;
const Y_MAX = 1.5;
const PLOT = {
  left: 0,
  right: 1000,
  top: 0,
  bottomOffset: 1,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPlot(height) {
  return {
    left: PLOT.left,
    right: PLOT.right,
    top: PLOT.top,
    bottom: Math.max(PLOT.top + 80, height - PLOT.bottomOffset),
  };
}

function timeToX(timeSeconds, durationSeconds, plot) {
  return plot.left + (timeSeconds / durationSeconds) * (plot.right - plot.left);
}

function voltageToY(voltage, plot) {
  const ratio = (voltage - Y_MIN) / (Y_MAX - Y_MIN);
  return plot.bottom - ratio * (plot.bottom - plot.top);
}

function normalizeSampleRate(sampleRate) {
  const numericRate = Number(sampleRate);
  return numericRate > 0 ? numericRate : DEFAULT_SAMPLE_RATE_HZ;
}

function getWindowSampleCount(sampleRate, windowSeconds) {
  return Math.max(2, Math.round(normalizeSampleRate(sampleRate) * windowSeconds));
}

function signalToPath(signal, durationSeconds, height) {
  const arr = normalizeEcgSignal(signal);
  if (!arr.length) return "";

  const plot = getPlot(height);
  if (arr.length === 1) {
    const y = clamp(voltageToY(arr[0], plot), plot.top, plot.bottom);
    return `M${plot.left},${y} L${plot.right},${y}`;
  }

  return arr
    .map((value, index) => {
      const timeSeconds = (index / (arr.length - 1)) * durationSeconds;
      const x = timeToX(timeSeconds, durationSeconds, plot);
      const y = clamp(voltageToY(value, plot), plot.top, plot.bottom);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function getSignalPoint(signal, index, durationSeconds, height) {
  if (!signal.length) return null;

  const plot = getPlot(height);
  const value = signal[index] ?? 0;
  const timeSeconds = signal.length > 1 ? (index / (signal.length - 1)) * durationSeconds : 0;
  const x = timeToX(timeSeconds, durationSeconds, plot);
  const y = clamp(voltageToY(value, plot), plot.top, plot.bottom);

  return { value, x, y, timeSeconds };
}

function buildTicks(durationSeconds, height) {
  const plot = getPlot(height);
  const xTicks = [];
  const yTicks = [];

  for (let time = 0; time <= durationSeconds + 1e-6; time += 0.5) {
    const rounded = Number(time.toFixed(1));
    xTicks.push({
      key: `x-${rounded}`,
      label: `${rounded.toFixed(1)}s`,
      x: timeToX(rounded, durationSeconds, plot),
    });
  }

  for (let voltage = Y_MIN; voltage <= Y_MAX + 1e-6; voltage += 0.5) {
    const rounded = Number(voltage.toFixed(1));
    yTicks.push({
      key: `y-${rounded}`,
      label: `${rounded.toFixed(1)}V`,
      y: voltageToY(rounded, plot),
    });
  }

  return { plot, xTicks, yTicks };
}

function buildGridLines(durationSeconds, height) {
  const plot = getPlot(height);
  const xLines = [];
  const yLines = [];

  for (let time = 0; time <= durationSeconds + 1e-6; time += 0.1) {
    const rounded = Number(time.toFixed(1));
    xLines.push({
      key: `grid-x-${rounded}`,
      x: timeToX(rounded, durationSeconds, plot),
    });
  }

  for (let voltage = Y_MIN; voltage <= Y_MAX + 1e-6; voltage += 0.1) {
    const rounded = Number(voltage.toFixed(1));
    yLines.push({
      key: `grid-y-${rounded}`,
      y: voltageToY(rounded, plot),
    });
  }

  return { plot, xLines, yLines };
}

function GridSvg({ durationSeconds, height }) {
  const { plot, xLines, yLines } = buildGridLines(durationSeconds, height);

  return (
    <g>
      <rect
        fill="#ffffff"
        height={plot.bottom - plot.top}
        width={plot.right - plot.left}
        x={plot.left}
        y={plot.top}
      />
      {xLines.map((line) => (
        <line
          key={line.key}
          stroke="rgba(0, 73, 118, 0.055)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          x1={line.x}
          x2={line.x}
          y1={plot.top}
          y2={plot.bottom}
        />
      ))}
      {yLines.map((line) => (
        <line
          key={line.key}
          stroke="rgba(0, 73, 118, 0.055)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          x1={plot.left}
          x2={plot.right}
          y1={line.y}
          y2={line.y}
        />
      ))}
    </g>
  );
}

function AxisSvg({ durationSeconds, height, clipPathId }) {
  const { plot, xTicks, yTicks } = buildTicks(durationSeconds, height);
  const axisColor = "rgba(71, 85, 105, 0.42)";

  return (
    <>
      <defs>
        <clipPath id={clipPathId}>
          <rect height={plot.bottom - plot.top} width={plot.right - plot.left} x={plot.left} y={plot.top} />
        </clipPath>
      </defs>

      <line
        stroke={axisColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={plot.bottom}
      />
      <line
        stroke={axisColor}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        x1={plot.left}
        x2={plot.right}
        y1={plot.bottom}
        y2={plot.bottom}
      />

      {xTicks.map((tick) => (
        <line
          key={tick.key}
          stroke={axisColor}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          x1={tick.x}
          x2={tick.x}
          y1={plot.bottom - 4}
          y2={plot.bottom + 4}
        />
      ))}
      {yTicks.map((tick) => (
        <line
          key={tick.key}
          stroke={axisColor}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          x1={plot.left - 4}
          x2={plot.left + 4}
          y1={tick.y}
          y2={tick.y}
        />
      ))}
    </>
  );
}

function AxisLabels({ durationSeconds, height }) {
  const { plot, xTicks, yTicks } = buildTicks(durationSeconds, height);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-[11px] font-bold text-slate-500">
      {yTicks.map((tick, index) => (
        <div
          key={tick.key}
          className={[
            "absolute rounded bg-white/70 px-1 py-0.5",
            index === 0 ? "-translate-y-full" : index === yTicks.length - 1 ? "" : "-translate-y-1/2",
          ].join(" ")}
          style={{ left: "6px", top: `${(tick.y / height) * 100}%` }}
        >
          {tick.label}
        </div>
      ))}

      {xTicks.map((tick, index) => (
        <div
          key={tick.key}
          className={[
            "absolute -translate-y-full rounded bg-white/70 px-1 py-0.5",
            index === 0 ? "" : index === xTicks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
          ].join(" ")}
          style={{ left: `${(tick.x / CHART_WIDTH) * 100}%`, top: `${((plot.bottom - 6) / height) * 100}%` }}
        >
          {tick.label}
        </div>
      ))}

      <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black uppercase tracking-wider text-slate-500/80">
        Biên độ (V)
      </div>
      <div
        className="absolute rounded bg-white/70 px-1.5 py-0.5 text-[12px] font-black text-slate-600"
        style={{ right: "12px", top: `${((plot.bottom - 32) / height) * 100}%` }}
      >
        Thời gian (s)
      </div>
      <div
        className="absolute rounded bg-white/70 px-1.5 py-0.5 text-[11px] font-black text-slate-600"
        style={{ left: "88px", top: `${((plot.bottom - 32) / height) * 100}%` }}
      >
        1 ô = 0.1s x 0.1V
      </div>
    </div>
  );
}

export function RealtimeEcgChart({
  signal,
  signalVersion = 0,
  height = 200,
  stroke = "#1b6d24",
  strokeWidth = 2.5,
  sampleRateHz = DEFAULT_SAMPLE_RATE_HZ,
  windowSeconds = 5,
  animateOnReceive = true,
}) {
  const [visibleSignal, setVisibleSignal] = useState([]);
  const [hoverPoint, setHoverPoint] = useState(null);
  const containerRef = useRef(null);
  const clipPathIdRef = useRef(`ecg-signal-${Math.random().toString(36).slice(2)}`);
  const visibleSignalRef = useRef([]);
  const pendingSamplesRef = useRef([]);
  const lastPaintedSampleRef = useRef(0);
  const animationFrameRef = useRef(null);
  const lastFrameAtRef = useRef(null);
  const playbackRemainderRef = useRef(0);
  const latestVersionRef = useRef(-1);
  const sampleRateRef = useRef(normalizeSampleRate(sampleRateHz));
  const windowSecondsRef = useRef(windowSeconds);
  const animateOnReceiveRef = useRef(animateOnReceive);

  useEffect(() => {
    sampleRateRef.current = normalizeSampleRate(sampleRateHz);
  }, [sampleRateHz]);

  useEffect(() => {
    windowSecondsRef.current = windowSeconds;
  }, [windowSeconds]);

  useEffect(() => {
    animateOnReceiveRef.current = animateOnReceive;
  }, [animateOnReceive]);

  const stopPlayback = () => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastFrameAtRef.current = null;
    playbackRemainderRef.current = 0;
  };

  const appendSamplesToVisibleBuffer = (sampleCount) => {
    const count = Math.max(0, sampleCount);
    if (!count) {
      return;
    }

    const samplesToAppend = [];
    for (let index = 0; index < count; index += 1) {
      const nextSample = pendingSamplesRef.current.length
        ? pendingSamplesRef.current.shift()
        : lastPaintedSampleRef.current;
      lastPaintedSampleRef.current = nextSample;
      samplesToAppend.push(nextSample);
    }

    const windowSampleCount = getWindowSampleCount(sampleRateRef.current, windowSecondsRef.current);
    const nextVisibleSignal = [...visibleSignalRef.current, ...samplesToAppend].slice(-windowSampleCount);
    visibleSignalRef.current = nextVisibleSignal;
    setVisibleSignal(nextVisibleSignal);
  };

  const playQueuedSamples = (timestamp) => {
    if (!animateOnReceiveRef.current || !visibleSignalRef.current.length) {
      animationFrameRef.current = null;
      return;
    }

    if (lastFrameAtRef.current === null) {
      lastFrameAtRef.current = timestamp;
    }

    const elapsedSeconds = Math.max(0, (timestamp - lastFrameAtRef.current) / 1000);
    lastFrameAtRef.current = timestamp;
    playbackRemainderRef.current += elapsedSeconds * sampleRateRef.current;

    const samplesToPaint = Math.floor(playbackRemainderRef.current);
    if (samplesToPaint > 0) {
      playbackRemainderRef.current -= samplesToPaint;
      appendSamplesToVisibleBuffer(samplesToPaint);
    }

    animationFrameRef.current = window.requestAnimationFrame(playQueuedSamples);
  };

  const startPlayback = () => {
    if (animationFrameRef.current) {
      return;
    }

    lastFrameAtRef.current = null;
    animationFrameRef.current = window.requestAnimationFrame(playQueuedSamples);
  };

  useEffect(() => {
    const normalizedSignal = normalizeEcgSignal(signal);

    if (!normalizedSignal.length) {
      latestVersionRef.current = -1;
      visibleSignalRef.current = [];
      pendingSamplesRef.current = [];
      lastPaintedSampleRef.current = 0;
      setVisibleSignal([]);
      setHoverPoint(null);
      stopPlayback();
      return;
    }

    if (signalVersion <= latestVersionRef.current) {
      return;
    }

    latestVersionRef.current = signalVersion;

    if (!animateOnReceive) {
      stopPlayback();
      pendingSamplesRef.current = [];
      visibleSignalRef.current = normalizedSignal;
      lastPaintedSampleRef.current = normalizedSignal[normalizedSignal.length - 1] ?? 0;
      setVisibleSignal(normalizedSignal);
      setHoverPoint(null);
      return;
    }

    const windowSampleCount = getWindowSampleCount(sampleRateHz, windowSeconds);
    if (visibleSignalRef.current.length !== windowSampleCount) {
      const baseline = visibleSignalRef.current[visibleSignalRef.current.length - 1] ?? normalizedSignal[0] ?? 0;
      const nextVisibleSignal = Array.from({ length: windowSampleCount }, () => baseline);
      visibleSignalRef.current = nextVisibleSignal;
      lastPaintedSampleRef.current = baseline;
      setVisibleSignal(nextVisibleSignal);
    }

    pendingSamplesRef.current.push(...normalizedSignal);
    setHoverPoint(null);
    startPlayback();

    return () => {
      stopPlayback();
    };
  }, [animateOnReceive, sampleRateHz, signal, signalVersion, windowSeconds]);

  const durationSeconds = windowSeconds;
  const plot = useMemo(() => getPlot(height), [height]);
  const plotWidth = plot.right - plot.left;
  const signalPath = useMemo(
    () => signalToPath(visibleSignal, durationSeconds, height),
    [durationSeconds, height, visibleSignal],
  );

  const handlePointerMove = (event) => {
    if (!visibleSignal.length || !containerRef.current) {
      setHoverPoint(null);
      return;
    }

    const bounds = containerRef.current.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const svgX = (relativeX / Math.max(bounds.width, 1)) * CHART_WIDTH;
    const signalRatio = clamp((svgX - plot.left) / Math.max(plotWidth, 1), 0, 1);
    const sampleIndex = Math.min(
      Math.max(Math.round(signalRatio * (visibleSignal.length - 1)), 0),
      visibleSignal.length - 1,
    );
    const point = getSignalPoint(visibleSignal, sampleIndex, durationSeconds, height);
    if (!point) {
      setHoverPoint(null);
      return;
    }

    setHoverPoint({
      ...point,
      leftPercent: (point.x / CHART_WIDTH) * 100,
      topPercent: (point.y / height) * 100,
      alignRight: point.x > 760,
      alignTop: point.y < height * 0.35,
    });
  };

  useEffect(() => () => stopPlayback(), []);

  if (!visibleSignal.length) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      onMouseLeave={() => setHoverPoint(null)}
      onMouseMove={handlePointerMove}
    >
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox={`0 0 1000 ${height}`}>
        <GridSvg durationSeconds={durationSeconds} height={height} />
        <AxisSvg clipPathId={clipPathIdRef.current} durationSeconds={durationSeconds} height={height} />
        <g clipPath={`url(#${clipPathIdRef.current})`}>
          <path
            className="ecg-line"
            d={signalPath}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        {hoverPoint && (
          <g>
            <line
              stroke="#0f172a"
              strokeDasharray="4 6"
              strokeOpacity="0.28"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              x1={hoverPoint.x}
              x2={hoverPoint.x}
              y1={plot.top}
              y2={plot.bottom}
            />
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              fill="#ffffff"
              r="5"
              stroke={stroke}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>
      <AxisLabels durationSeconds={durationSeconds} height={height} />
      {hoverPoint && (
        <div
          className="pointer-events-none absolute z-30 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg"
          style={{
            left: `${hoverPoint.leftPercent}%`,
            top: `${hoverPoint.topPercent}%`,
            transform: `translate(${hoverPoint.alignRight ? "calc(-100% - 12px)" : "12px"}, ${hoverPoint.alignTop ? "12px" : "calc(-100% - 12px)"})`,
          }}
        >
          <p className="text-secondary">{Number(hoverPoint.value).toFixed(3)} V</p>
          <p className="mt-0.5 text-slate-500">{hoverPoint.timeSeconds.toFixed(2)}s</p>
        </div>
      )}
    </div>
  );
}
