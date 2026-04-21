import {
  Download,
  Gamepad2,
  Home,
  Info,
  Library,
  ShoppingBag,
  Settings,
  ShieldCheck
} from "lucide-react";

import { getActiveJobs, getDiscoverableItems, getLibraryItems } from "../domain/selectors";
import type { LauncherSnapshot } from "../domain/types";

export type AppRoute =
  | "home"
  | "shop"
  | "library"
  | "downloads"
  | "settings"
  | "about"
  | `item:${string}`;

const navItems: Array<{
  route: AppRoute;
  label: string;
  icon: typeof Home;
}> = [
  { route: "home", label: "Home", icon: Home },
  { route: "shop", label: "Shop", icon: ShoppingBag },
  { route: "library", label: "Library", icon: Library },
  { route: "downloads", label: "Downloads", icon: Download },
  { route: "settings", label: "Settings", icon: Settings },
  { route: "about", label: "About", icon: Info }
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
  const activeJobs = getActiveJobs(snapshot);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setRoute("home")} type="button">
          <span className="brand__mark">LX</span>
          <span>
            <strong>Lumorix</strong>
            <small>Launcher</small>
          </span>
        </button>

        <nav className="sidebar__nav" aria-label="Primary navigation">
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
                <span>{item.label}</span>
                {item.route === "downloads" && activeJobs.length > 0 && <em>{activeJobs.length}</em>}
              </button>
            );
          })}
        </nav>

        <div className="privacy-chip">
          <ShieldCheck size={18} />
          <span>No account. No ads. Local-first.</span>
        </div>
      </aside>

      <main className="shell-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{subtitleForRoute(route)}</p>
            <h1>{titleForRoute(route, snapshot)}</h1>
          </div>
          <div className="topbar__meta">
            <Gamepad2 size={16} />
            <span>{metaForRoute(route, snapshot)}</span>
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

function metaForRoute(route: AppRoute, snapshot: LauncherSnapshot): string {
  const discoverableCount = getDiscoverableItems(snapshot).length;
  const libraryCount = getLibraryItems(snapshot).length;
  const activeJobs = getActiveJobs(snapshot).length;

  if (route === "shop") {
    return `${discoverableCount} ${discoverableCount === 1 ? "item" : "items"} available`;
  }
  if (route === "library" || route.startsWith("item:")) {
    return `${libraryCount} in your collection`;
  }
  if (route === "downloads") {
    return activeJobs > 0
      ? `${activeJobs} active ${activeJobs === 1 ? "job" : "jobs"}`
      : "Queue is clear";
  }
  return `${discoverableCount} discoverable ${discoverableCount === 1 ? "item" : "items"}`;
}

function subtitleForRoute(route: AppRoute): string {
  if (route.startsWith("item:")) return "Item details";
  switch (route) {
    case "home":
      return "Personal dashboard";
    case "shop":
      return "Discovery";
    case "library":
      return "Your collection";
    case "downloads":
      return "Installs and updates";
    case "settings":
      return "Preferences";
    case "about":
      return "Lumorix Launcher";
    default:
      return "Lumorix";
  }
}

function titleForRoute(route: AppRoute, snapshot: LauncherSnapshot) {
  if (route.startsWith("item:")) {
    const id = route.slice("item:".length);
    return snapshot.items.find((item) => item.catalog.id === id)?.catalog.name ?? "Item";
  }

  switch (route) {
    case "home":
      return "Home";
    case "shop":
      return "Shop";
    case "library":
      return "Library";
    case "downloads":
      return "Downloads";
    case "settings":
      return "Settings";
    case "about":
      return "About Lumorix";
    default:
      return "Lumorix";
  }
}
