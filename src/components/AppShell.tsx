import {
  Download,
  Gamepad2,
  Home,
  Info,
  Library,
  MessageSquare,
  ShoppingBag,
  Settings,
  ShieldCheck
} from "lucide-react";

import { useI18n } from "../i18n";
import { getActiveJobs, getDiscoverableItems, getLibraryItems } from "../domain/selectors";
import type { LauncherSnapshot } from "../domain/types";

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
  const activeJobs = getActiveJobs(snapshot);

  return (
    <div className="app-shell">
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

        <div className="privacy-chip">
          <ShieldCheck size={18} />
          <span>{t("common.messages.noAccountNoAdsLocalFirst")}</span>
        </div>
      </aside>

      <main className="shell-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{subtitleForRoute(route, t)}</p>
            <h1>{titleForRoute(route, snapshot, t)}</h1>
          </div>
          <div className="topbar__meta">
            <Gamepad2 size={16} />
            <span>{metaForRoute(route, snapshot, t)}</span>
          </div>
        </header>
        {children}
      </main>
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
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
): string {
  const discoverableCount = getDiscoverableItems(snapshot).length;
  const libraryCount = getLibraryItems(snapshot).length;
  const activeJobs = getActiveJobs(snapshot).length;

  if (route === "shop") {
    return t("shell.meta.shop", { count: discoverableCount });
  }
  if (route === "library" || route.startsWith("item:")) {
    return t("shell.meta.library", { count: libraryCount });
  }
  if (route === "downloads") {
    return activeJobs > 0 ? t("shell.meta.downloadsActive", { count: activeJobs }) : t("shell.meta.downloadsClear");
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
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
) {
  if (route.startsWith("item:")) {
    const id = route.slice("item:".length);
    return snapshot.items.find((item) => item.catalog.id === id)?.catalog.name ?? t("shell.title.itemFallback");
  }

  switch (route) {
    case "home":
      return t("shell.title.home");
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
