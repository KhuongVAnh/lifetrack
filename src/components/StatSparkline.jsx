export function StatSparkline({ series, colorClass = "bg-primary" }) {
  const max = Math.max(...series.map((item) => item.numeric));
  const min = Math.min(...series.map((item) => item.numeric));
  const range = max - min || 1;

  return (
    <div className="flex h-24 items-end gap-2">
      {series.map((point) => {
        const height = 28 + ((point.numeric - min) / range) * 60;

        return (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="text-[11px] font-bold text-on-surface">{point.value}</div>
            <div className={`w-full rounded-t-2xl ${colorClass}`} style={{ height: `${height}px`, opacity: 0.9 }} />
            <div className="text-[11px] font-medium text-on-surface-variant">{point.label}</div>
          </div>
        );
      })}
    </div>
  );
}
