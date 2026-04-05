export function StatSparkline({ series, colorClass = "bg-primary" }) {
  const max = Math.max(...series.map((item) => item.numeric));
  const min = Math.min(...series.map((item) => item.numeric));
  const range = max - min || 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {series.map((point) => (
          <div key={`${point.label}-value`} className="text-center text-[11px] font-bold leading-none text-on-surface">
            {point.value}
          </div>
        ))}
      </div>

      <div className="grid h-28 grid-cols-5 items-end gap-2">
        {series.map((point) => {
          const height = 30 + ((point.numeric - min) / range) * 70;

          return (
            <div key={`${point.label}-bar`} className="flex h-full items-end">
              <div
                className={`w-full rounded-t-[1.5rem] ${colorClass}`}
                style={{ height: `${height}%`, opacity: 0.9 }}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {series.map((point) => (
          <div key={`${point.label}-label`} className="text-center text-[11px] font-medium text-on-surface-variant">
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}
