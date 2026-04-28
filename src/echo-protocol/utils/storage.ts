import type { EchoGameState } from "../types/game";

const STORAGE_KEY = "lumorix.echo-protocol.save";

export function loadEchoSave(): EchoGameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EchoGameState;
    if (!parsed.currentSceneId || !parsed.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveEchoState(state: EchoGameState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearEchoSave(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasEchoSave(): boolean {
  return loadEchoSave() !== null;
}
