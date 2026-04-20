export function ProgressBar({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div className={`progress ${compact ? "progress--compact" : ""}`} aria-label="Progress">
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
      {!compact && <span>{Math.round(value)}%</span>}
    </div>
  );
}
