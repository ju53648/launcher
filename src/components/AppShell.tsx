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

import type { LauncherSnapshot } from "../domain/types";

export type AppRoute = "home" | "shop" | "library" | "downloads" | "settings" | "about" | `game:${string}`;

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
  const runningJobs = snapshot.jobs.filter((job) => job.status === "running" || job.status === "queued");

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
                {item.route === "downloads" && runningJobs.length > 0 && (
                  <em>{runningJobs.length}</em>
                )}
              </button>
            );
          })}
        </nav>

        <div className="privacy-chip">
          <ShieldCheck size={18} />
          <span>No account. No telemetry.</span>
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
  if (!route.startsWith("game:")) return false;
  const id = route.slice("game:".length);
  const game = snapshot.games.find((entry) => entry.manifest.id === id);
  if (game?.ownershipStatus === "notAdded") {
    return itemRoute === "shop";
  }
  return itemRoute === "library";
}

function metaForRoute(route: AppRoute, snapshot: LauncherSnapshot): string {
  const libraryCount = snapshot.games.filter((game) => game.ownershipStatus !== "notAdded").length;
  if (route === "shop") {
    return `${snapshot.games.length} ${snapshot.games.length === 1 ? "game" : "games"} available`;
  }
  if (route === "library" || route.startsWith("game:")) {
    return `${libraryCount} in library`;
  }
  return `${snapshot.games.length} catalog ${snapshot.games.length === 1 ? "title" : "titles"}`;
}

function subtitleForRoute(route: AppRoute): string {
  if (route.startsWith("game:")) return "Game details";
  switch (route) {
    case "home":     return "Overview";
    case "shop":     return "Discovery";
    case "library":  return "Your collection";
    case "downloads":return "Active installs";
    case "settings": return "Preferences";
    case "about":    return "Lumorix Launcher";
    default:         return "Lumorix";
  }
}

function titleForRoute(route: AppRoute, snapshot: LauncherSnapshot) {
  if (route.startsWith("game:")) {
    const id = route.slice("game:".length);
    return snapshot.games.find((game) => game.manifest.id === id)?.manifest.name ?? "Game";
  }

  switch (route) {
    case "home":
      return "Command Center";
    case "shop":
      return "Shop";
    case "library":
      return "Game Library";
    case "downloads":
      return "Install Queue";
    case "settings":
      return "Settings";
    case "about":
      return "About Lumorix";
    default:
      return "Lumorix";
  }
}
