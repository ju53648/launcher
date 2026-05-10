const STORAGE_KEY = "lumorix.embeddedGame.active";
const EVENT_NAME = "lumorix:embedded-game-change";

export function getEmbeddedGameId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function setEmbeddedGameId(itemId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (itemId && itemId.trim()) {
      window.localStorage.setItem(STORAGE_KEY, itemId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage write failures in browser preview
  }

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: itemId ?? null }));
}

export function embeddedGameEventName() {
  return EVENT_NAME;
}
