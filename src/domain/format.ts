import type {
  CatalogItemType,
  InstallJob,
  InstallOperation,
  InstallPhase,
  ItemCollectionStatus,
  ItemInstallState,
  LibraryStatus
} from "./types";

export type Translate = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function resolveIntlLocale(locale: string): "en" | "de" | "pl" {
  const normalized = locale.toLowerCase();
  if (normalized === "shakespeare" || normalized.startsWith("en")) return "en";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("pl")) return "pl";
  return "en";
}

export function formatBytes(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const decimals = value >= 10 || index === 0 ? 0 : 1;
  const safeLocale = resolveIntlLocale(locale);
  return `${new Intl.NumberFormat(safeLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)} ${units[index]}`;
}

export function formatDate(value: string | null, locale: string, t: Translate): string {
  if (!value) return t("common.never");
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return value;
  const safeLocale = resolveIntlLocale(locale);
  return new Intl.DateTimeFormat(safeLocale, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

export function installStateLabel(status: ItemInstallState, t: Translate): string {
  return t(`status.install.${status}`);
}

export function collectionStatusLabel(status: ItemCollectionStatus, t: Translate): string {
  return t(`status.collection.${status}`);
}

export function libraryStatusLabel(status: LibraryStatus, t: Translate): string {
  return t(`status.library.${status}`);
}

export function jobStatusLabel(status: InstallJob["status"], t: Translate): string {
  return t(`status.job.${status}`);
}

export function phaseLabel(phase: InstallPhase, t: Translate): string {
  return t(`status.phase.${phase}`);
}

export function operationLabel(operation: InstallOperation, t: Translate): string {
  return t(`status.operation.${operation}`);
}

export function itemTypeLabel(itemType: CatalogItemType, t: Translate): string {
  return t(`status.itemType.${itemType}`);
}

export function jobProgressLabel(
  job: Pick<InstallJob, "operation" | "phase">,
  t: Translate
) {
  return t("downloads.row.progress", {
    operation: operationLabel(job.operation, t),
    phase: phaseLabel(job.phase, t)
  });
}
