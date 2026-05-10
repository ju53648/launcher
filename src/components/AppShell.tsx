import {
  ArrowUp,
  Download,
  Gamepad2,
  Home,
  Info,
  Library,
  MessageSquare,
  ShoppingBag,
  Settings,
  ShieldCheck,
  WifiOff
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LauncherAvatar } from "./LauncherAvatar";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { QuickSearch } from "./QuickSearch";
import { SessionSummaryPanel } from "./SessionSummaryPanel";
import { UpdateNoticeToast } from "./UpdateNoticeToast";
import { useI18n } from "../i18n";
import { useLauncher } from "../store/LauncherStore";
import {
  getActiveJobs,
  getDiscoverableItems,
  getLibraryItems,
  getQueuedJobs,
  getRunningJobs
} from "../domain/selectors";
import type { LauncherSnapshot } from "../domain/types";
import { applyColorMode, colorModeEventName, loadColorMode } from "../domain/colorMode";

export type AppRoute =
  | "home"
  | "shop"
  | "library"
  | "downloads"
  | "socials"
  | "settings"
  | "about"
  | `item:${string}`;

const navItems: Array<{
  route: AppRoute;
  icon: typeof Home;
}> = [
  { route: "home", icon: Home },
  { route: "shop", icon: ShoppingBag },
  { route: "library", icon: Library },
  { route: "downloads", icon: Download },
  { route: "socials", icon: MessageSquare },
  { route: "settings", icon: Settings },
  { route: "about", icon: Info }
];

export function AppShell({
  route,
  setRoute,
  snapshot,
  children
}: {
  route: AppRoute;
  setRoute: (route: AppRoute) => void;
  snapshot: LauncherSnapshot;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { personalization } = useLauncher();
  const activeJobs = getActiveJobs(snapshot);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const shellMainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Numeric keyboard shortcuts 1–7 for nav
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(event.key) - 1;
      if (idx >= 0 && idx < navItems.length) {
        setRoute(navItems[idx].route);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setRoute]);

  // Apply custom accent color override to CSS variable
  useEffect(() => {
    if (personalization.accentColor) {
      document.documentElement.style.setProperty("--color-accent", personalization.accentColor);
    } else {
      document.documentElement.style.removeProperty("--color-accent");
    }
    return () => {
      document.documentElement.style.removeProperty("--color-accent");
    };
  }, [personalization.accentColor]);

  useEffect(() => {
    const applyCurrentMode = () => applyColorMode(loadColorMode());
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

    applyCurrentMode();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "lumorix.ui.colorMode") {
        applyCurrentMode();
      }
    };
    const onCustom = () => applyCurrentMode();
    const onSystemThemeChanged = () => {
      if (loadColorMode() === "system") {
        applyCurrentMode();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(colorModeEventName(), onCustom);
    mediaQuery.addEventListener("change", onSystemThemeChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(colorModeEventName(), onCustom);
      mediaQuery.removeEventListener("change", onSystemThemeChanged);
    };
  }, []);

  useEffect(() => {
    const node = shellMainRef.current;
    if (!node) return;

    const onScroll = () => {
      setShowScrollTop(node.scrollTop > 320);
    };

    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [route]);

  return (
    <div className={`app-shell app-shell--theme-${personalization.themeId}`}>
      {!isOnline && (
        <div className="offline-banner" role="alert">
          <WifiOff size={14} />
          <span>{t("offline.banner")}</span>
        </div>
      )}
      <aside className="sidebar">
        <button className="brand" onClick={() => setRoute("home")} type="button">
          <span className="brand__mark">LX</span>
          <span>
            <strong>{t("common.brandName")}</strong>
            <small>{t("common.brandProduct")}</small>
          </span>
        </button>

        <nav className="sidebar__nav" aria-label={t("shell.navigation")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(route, item.route, snapshot);
            return (
              <button
                key={item.route}
                className={`nav-item ${active ? "is-active" : ""}`}
                onClick={() => setRoute(item.route)}
                type="button"
              >
                <Icon size={18} />
                <span>{t(`shell.nav.${item.route}`)}</span>
                {item.route === "downloads" && activeJobs.length > 0 && <em>{activeJobs.length}</em>}
              </button>
            );
          })}
        </nav>

        <ProfileSwitcher />

        <div className="privacy-chip">
          <ShieldCheck size={18} />
          <span>{t("common.messages.noAccountNoAdsLocalFirst")}</span>
        </div>
      </aside>

      <main className="shell-main" ref={shellMainRef}>
        <header className="topbar">
          <div>
            <p className="eyebrow">{subtitleForRoute(route, t)}</p>
            <h1>{titleForRoute(route, snapshot, t, personalization.displayName)}</h1>
          </div>
          <div className="topbar__meta">
            <LauncherAvatar avatarId={personalization.avatarId} size="sm" />
            <Gamepad2 size={16} />
            <span>{metaForRoute(route, snapshot, t, personalization.displayName)}</span>
          </div>
        </header>
        {children}
        <button
          aria-label={t("common.actions.back")}
          className={`scroll-top-btn ${showScrollTop ? "is-visible" : ""}`}
          onClick={() => shellMainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          type="button"
        >
          <ArrowUp size={16} />
        </button>
      </main>
      <QuickSearch setRoute={setRoute} />
      <UpdateNoticeToast />
      <SessionSummaryPanel />
    </div>
  );
}

function isNavItemActive(route: AppRoute, itemRoute: AppRoute, snapshot: LauncherSnapshot): boolean {
  if (route === itemRoute) return true;
  if (!route.startsWith("item:")) return false;
  const id = route.slice("item:".length);
  const item = snapshot.items.find((entry) => entry.catalog.id === id);
  if (item?.collectionStatus === "notAdded") {
    return itemRoute === "shop";
  }
  return itemRoute === "library";
}

function metaForRoute(
  route: AppRoute,
  snapshot: LauncherSnapshot,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string,
  displayName: string
): string {
  const discoverableCount = getDiscoverableItems(snapshot).length;
  const libraryCount = getLibraryItems(snapshot).length;
  const runningJobs = getRunningJobs(snapshot).length;
  const queuedJobs = getQueuedJobs(snapshot).length;

  if (route === "home" && displayName) {
    return t("shell.meta.homePersonalized", { name: displayName });
  }

  if (route === "shop") {
    return t("shell.meta.shop", { count: discoverableCount });
  }
  if (route === "library" || route.startsWith("item:")) {
    return t("shell.meta.library", { count: libraryCount });
  }
  if (route === "downloads") {
    if (runningJobs > 0) {
      return t("shell.meta.downloadsActive", { count: runningJobs });
    }
    if (queuedJobs > 0) {
      return t("shell.meta.downloadsQueued", { count: queuedJobs });
    }
    return t("shell.meta.downloadsClear");
  }
  if (route === "socials") {
    return t("shell.meta.socials");
  }
  return t("shell.meta.fallback", { count: discoverableCount });
}

function subtitleForRoute(
  route: AppRoute,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
): string {
  if (route.startsWith("item:")) return t("shell.subtitle.item");
  switch (route) {
    case "home":
      return t("shell.subtitle.home");
    case "shop":
      return t("shell.subtitle.shop");
    case "library":
      return t("shell.subtitle.library");
    case "downloads":
      return t("shell.subtitle.downloads");
    case "socials":
      return t("shell.subtitle.socials");
    case "settings":
      return t("shell.subtitle.settings");
    case "about":
      return t("shell.subtitle.about");
    default:
      return t("shell.subtitle.fallback");
  }
}

function titleForRoute(
  route: AppRoute,
  snapshot: LauncherSnapshot,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string,
  displayName: string
) {
  if (route.startsWith("item:")) {
    const id = route.slice("item:".length);
    return snapshot.items.find((item) => item.catalog.id === id)?.catalog.name ?? t("shell.title.itemFallback");
  }

  switch (route) {
    case "home":
      return displayName ? t("shell.title.homePersonalized", { name: displayName }) : t("shell.title.home");
    case "shop":
      return t("shell.title.shop");
    case "library":
      return t("shell.title.library");
    case "downloads":
      return t("shell.title.downloads");
    case "socials":
      return t("shell.title.socials");
    case "settings":
      return t("shell.title.settings");
    case "about":
      return t("shell.title.about");
    default:
      return t("shell.title.fallback");
  }
}
