export type ColorMode = "system" | "dark" | "light";

const COLOR_MODE_STORAGE_KEY = "lumorix.ui.colorMode";
const COLOR_MODE_EVENT = "lumorix:color-mode-changed";

export function isColorMode(value: string | null | undefined): value is ColorMode {
  return value === "system" || value === "dark" || value === "light";
}

export function loadColorMode(): ColorMode {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  return isColorMode(stored) ? stored : "system";
}

export function saveColorMode(mode: ColorMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(COLOR_MODE_EVENT, { detail: mode }));
}

export function resolveEffectiveColorMode(mode: ColorMode): "dark" | "light" {
  if (mode === "dark" || mode === "light") {
    return mode;
  }
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyColorMode(mode: ColorMode): void {
  if (typeof document === "undefined") {
    return;
  }
  const effectiveMode = resolveEffectiveColorMode(mode);
  document.documentElement.setAttribute("data-color-mode", effectiveMode);
}

export function colorModeEventName(): string {
  return COLOR_MODE_EVENT;
}
