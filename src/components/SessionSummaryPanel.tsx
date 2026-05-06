import { Flame, Gamepad2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { resolveCatalogImageSrc } from "../domain/media";
import { getProfileScopedStorageKey } from "../domain/profileStorage";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";

interface SessionRecord {
  itemId: string;
  itemName: string;
  iconSrc: string | null;
  durationMinutes: number;
  totalMinutes: number;
}

const STREAK_KEY = "lumorix.play.streak";

interface StreakData {
  lastPlayedDate: string | null;
  streak: number;
}

function loadStreak(activeProfileId: string): StreakData {
  try {
    const raw =
      window.localStorage.getItem(getProfileScopedStorageKey(STREAK_KEY, activeProfileId)) ??
      window.localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as StreakData) : { lastPlayedDate: null, streak: 0 };
  } catch {
    return { lastPlayedDate: null, streak: 0 };
  }
}

function updateStreak(activeProfileId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const data = loadStreak(activeProfileId);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newStreak: number;

  if (data.lastPlayedDate === today) {
    newStreak = data.streak;
  } else if (data.lastPlayedDate === yesterday) {
    newStreak = data.streak + 1;
  } else {
    newStreak = 1;
  }

  try {
    window.localStorage.setItem(
      getProfileScopedStorageKey(STREAK_KEY, activeProfileId),
      JSON.stringify({ lastPlayedDate: today, streak: newStreak })
    );
  } catch {
    // ignore
  }
  return newStreak;
}

export function SessionSummaryPanel() {
  const { t } = useI18n();
  const { snapshot, activeProfileId } = useLauncher();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [streak, setStreak] = useState(0);
  const wasRunningRef = useRef<Map<string, { startedAt: number; totalMinutes: number }>>(new Map());

  useEffect(() => {
    if (!snapshot) return;
    for (const item of snapshot.items) {
      const prev = wasRunningRef.current.get(item.catalog.id);
      if (item.isRunning && !prev) {
        // Game just started
        wasRunningRef.current.set(item.catalog.id, {
          startedAt: Date.now(),
          totalMinutes: item.collectionEntry?.totalPlaytimeMinutes ?? 0
        });
      } else if (!item.isRunning && prev) {
        // Game just stopped
        wasRunningRef.current.delete(item.catalog.id);
        const durationMs = Date.now() - prev.startedAt;
        const durationMinutes = Math.round(durationMs / 60000);
        if (durationMinutes >= 1) {
          const newStreak = updateStreak(activeProfileId);
          setStreak(newStreak);
          const iconSrc = resolveCatalogImageSrc(
            item.catalog.iconImage,
            item.manifest?.version ?? item.catalog.releaseDate
          );
          setSession({
            itemId: item.catalog.id,
            itemName: item.catalog.name,
            iconSrc,
            durationMinutes,
            totalMinutes: item.collectionEntry?.totalPlaytimeMinutes ?? 0
          });
        }
      }
    }
  }, [activeProfileId, snapshot]);

  if (!session) return null;

  return (
    <div className="session-summary">
      <button
        className="icon-button session-summary__close"
        onClick={() => setSession(null)}
        type="button"
        aria-label={t("common.actions.close")}
      >
        <X size={14} />
      </button>
      <div className="session-summary__header">
        {session.iconSrc ? (
          <img src={session.iconSrc} alt="" className="session-summary__icon" />
        ) : (
          <span className="session-summary__icon session-summary__icon--fallback">
            <Gamepad2 size={18} />
          </span>
        )}
        <div>
          <p className="eyebrow">{t("home.sessionSummary.eyebrow")}</p>
          <strong>{session.itemName}</strong>
        </div>
      </div>
      <div className="session-summary__stats">
        <div>
          <span>{t("home.sessionSummary.duration")}</span>
          <strong>{t("home.sessionSummary.minutes", { count: session.durationMinutes })}</strong>
        </div>
        <div>
          <span>{t("home.sessionSummary.total")}</span>
          <strong>
            {session.totalMinutes >= 60
              ? t("home.sessionSummary.hours", { count: Math.round(session.totalMinutes / 60 * 10) / 10 })
              : t("home.sessionSummary.minutes", { count: session.totalMinutes })}
          </strong>
        </div>
        {streak > 1 && (
          <div className="session-summary__streak">
            <Flame size={14} />
            <span>{t("home.sessionSummary.streak", { count: streak })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
