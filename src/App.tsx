import { useState } from "react";

import { AppShell, type AppRoute } from "./components/AppShell";
import { EmptyState } from "./components/EmptyState";
import { ErrorToast } from "./components/ErrorToast";
import { AboutView } from "./views/AboutView";
import { DownloadsView } from "./views/DownloadsView";
import { GameDetailView } from "./views/GameDetailView";
import { HomeView } from "./views/HomeView";
import { LibraryView } from "./views/LibraryView";
import { OnboardingView } from "./views/OnboardingView";
import { SettingsView } from "./views/SettingsView";
import { ShopView } from "./views/ShopView";
import { useLauncher } from "./store/LauncherStore";
import type { LauncherSnapshot } from "./domain/types";

export function App() {
  const { snapshot, loading, error, clearError } = useLauncher();
  const [route, setRoute] = useState<AppRoute>("home");
  const [manifestWarningDismissed, setManifestWarningDismissed] = useState(false);
  const manifestWarning =
    !manifestWarningDismissed && snapshot?.manifestErrors.length
      ? {
          code: "manifest",
          message:
            snapshot.manifestErrors.length === 1
              ? snapshot.manifestErrors[0]
              : `${snapshot.manifestErrors[0]} (${snapshot.manifestErrors.length} manifest issues total)`
        }
      : null;

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="brand">
          <span className="brand__mark">LX</span>
          <span>
            <strong>Lumorix</strong>
            <small>Launcher</small>
          </span>
        </div>
        <div className="loading-line" />
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="loading-screen">
        <EmptyState
          title="Launcher state unavailable"
          body="Lumorix could not initialize local storage. Check folder permissions and restart."
        />
        {error && <ErrorToast error={error} onClose={clearError} />}
      </main>
    );
  }

  if (!snapshot.config.onboardingCompleted) {
    return (
      <>
        <OnboardingView />
        {error && <ErrorToast error={error} onClose={clearError} />}
        {!error && manifestWarning && (
          <ErrorToast error={manifestWarning} onClose={() => setManifestWarningDismissed(true)} />
        )}
      </>
    );
  }

  return (
    <>
      <AppShell route={route} setRoute={setRoute} snapshot={snapshot}>
        {renderRoute(route, setRoute, snapshot)}
      </AppShell>
      {error && <ErrorToast error={error} onClose={clearError} />}
      {!error && manifestWarning && (
        <ErrorToast error={manifestWarning} onClose={() => setManifestWarningDismissed(true)} />
      )}
    </>
  );
}

function renderRoute(
  route: AppRoute,
  setRoute: (route: AppRoute) => void,
  snapshot: LauncherSnapshot
) {
  if (route.startsWith("item:")) {
    const id = route.slice("item:".length);
    const item = snapshot.items.find((entry) => entry.catalog.id === id);
    return item ? (
      <GameDetailView item={item} />
    ) : (
      <EmptyState title="Item not found" body="The catalog entry is no longer available." />
    );
  }

  switch (route) {
    case "home":
      return <HomeView setRoute={setRoute} />;
    case "shop":
      return <ShopView setRoute={setRoute} />;
    case "library":
      return <LibraryView setRoute={setRoute} />;
    case "downloads":
      return <DownloadsView />;
    case "settings":
      return <SettingsView />;
    case "about":
      return <AboutView />;
    default:
      return <HomeView setRoute={setRoute} />;
  }
}
