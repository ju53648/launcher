import { CheckCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "../i18n";
import type { InstallJob } from "../domain/types";
import { getProfileScopedStorageKey } from "../domain/profileStorage";
import { useLauncher } from "../store/LauncherStore";

interface UpdateNotice {
  id: string;
  itemName: string;
  version: string;
  changelog: Array<{ version: string; date: string; items: string[] }>;
}

const SHOWN_KEY = "lumorix.launcher.shownUpdateNotices";

function getShownIds(activeProfileId: string): Set<string> {
  try {
    const raw =
      window.localStorage.getItem(getProfileScopedStorageKey(SHOWN_KEY, activeProfileId)) ??
      window.localStorage.getItem(SHOWN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markShown(activeProfileId: string, id: string) {
  try {
    const shown = getShownIds(activeProfileId);
    shown.add(id);
    window.localStorage.setItem(getProfileScopedStorageKey(SHOWN_KEY, activeProfileId), JSON.stringify([...shown]));
  } catch {
    // ignore
  }
}

export function UpdateNoticeToast() {
  const { t } = useI18n();
  const { snapshot, activeProfileId } = useLauncher();
  const [notices, setNotices] = useState<UpdateNotice[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const prevJobsRef = useRef<InstallJob[]>([]);

  useEffect(() => {
    if (!snapshot) return;
    const prevJobs = prevJobsRef.current;
    const currentJobs = snapshot?.jobs ?? [];
    prevJobsRef.current = currentJobs;

    const shown = getShownIds(activeProfileId);
    const newNotices: UpdateNotice[] = [];

    for (const job of currentJobs) {
      if (job.status !== "completed" || job.operation !== "update") continue;
      const noticeId = `${job.itemId}-${job.id}`;
      if (shown.has(noticeId)) continue;
      // Only show if it just transitioned (was running before)
      const prev = prevJobs.find((j) => j.id === job.id);
      if (prev && prev.status !== "running" && prev.status !== "queued") continue;

      const item = snapshot.items.find((i) => i.catalog.id === job.itemId);
      const changelog = item?.manifest?.changelog ?? [];
      newNotices.push({
        id: noticeId,
        itemName: job.itemName,
        version: item?.manifest?.version ?? "",
        changelog: changelog.slice(0, 2)
      });
      markShown(activeProfileId, noticeId);
    }

    if (newNotices.length > 0) {
      setNotices((prev) => [...prev, ...newNotices]);
    }
  }, [activeProfileId, snapshot]);

  function dismiss(id: string) {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (notices.length === 0) return null;

  return (
    <div className="update-toast-stack">
      {notices.map((notice) => {
        const isExpanded = expanded.has(notice.id);
        return (
          <div key={notice.id} className="update-toast" role="status">
            <div className="update-toast__header">
              <CheckCircle size={16} className="update-toast__icon" />
              <div className="update-toast__title">
                <strong>{notice.itemName}</strong>
                {notice.version && (
                  <span>{t("updateNotice.version", { version: notice.version })}</span>
                )}
              </div>
              {notice.changelog.length > 0 && (
                <button
                  className="icon-button"
                  onClick={() => toggleExpand(notice.id)}
                  type="button"
                  aria-label={isExpanded ? t("updateNotice.collapseChangelog") : t("updateNotice.expandChangelog")}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              <button
                className="icon-button"
                onClick={() => dismiss(notice.id)}
                type="button"
                aria-label={t("common.actions.close")}
              >
                <X size={14} />
              </button>
            </div>
            {isExpanded && notice.changelog.length > 0 && (
              <div className="update-toast__changelog">
                {notice.changelog.map((entry) => (
                  <div key={`${entry.version}-${entry.date}`}>
                    <small>v{entry.version} · {entry.date}</small>
                    <ul>
                      {entry.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
