import { useI18n } from "../i18n";

export function ProgressBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const { t } = useI18n();

  return (
    <div className={`progress ${compact ? "progress--compact" : ""}`} aria-label={t("common.progress")}>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
      {!compact && <span>{Math.round(value)}%</span>}
    </div>
  );
}
