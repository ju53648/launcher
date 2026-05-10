import { useEffect, useRef, useState } from "react";

import { AppShell, type AppRoute } from "./components/AppShell";
import { EmptyState } from "./components/EmptyState";
import { ErrorToast } from "./components/ErrorToast";
import { PersonalizationDialog } from "./components/PersonalizationDialog";
import {
  embeddedGameEventName,
  getEmbeddedGameId,
  setEmbeddedGameId as persistEmbeddedGameId
} from "./domain/embeddedGameSession";
import { EchoProtocolGameShell } from "./echo-protocol/EchoProtocolApp";
import { useI18n } from "./i18n";
import { AboutView } from "./views/AboutView";
import { DownloadsView } from "./views/DownloadsView";
import { GameDetailView } from "./views/GameDetailView";
import { HomeView } from "./views/HomeView";
import { LibraryView } from "./views/LibraryView";
import { OnboardingView } from "./views/OnboardingView";
import { SettingsView } from "./views/SettingsView";
import { SocialsView } from "./views/SocialsView";
import { ShopView } from "./views/ShopView";
import { useLauncher } from "./store/LauncherStore";
import type { LauncherSnapshot } from "./domain/types";

const ECHO_PROTOCOL_ITEM_ID = "com.lumorix.echo-protocol";
const ECHO_PROTOCOL_ROUTE: AppRoute = `item:${ECHO_PROTOCOL_ITEM_ID}`;

export function App() {
  const { t } = useI18n();
  const {
    snapshot,
    loading,
    error,
    clearError,
    personalization,
    activeProfileId,
    closeItem
  } = useLauncher();
  const [route, setRoute] = useState<AppRoute>("home");
  const [lastLauncherRoute, setLastLauncherRoute] = useState<AppRoute>(ECHO_PROTOCOL_ROUTE);
  const [manifestWarningDismissed, setManifestWarningDismissed] = useState(false);
  const [embeddedGameId, setEmbeddedGameId] = useState<string | null>(() => getEmbeddedGameId());
  const previousEmbeddedGameIdRef = useRef<string | null>(embeddedGameId);
  const manifestWarning =
    !manifestWarningDismissed && snapshot?.manifestErrors.length
      ? {
          code: "manifest",
          message:
            snapshot.manifestErrors.length === 1
              ? snapshot.manifestErrors[0]
              : t("app.manifestWarning.multiple", {
                  message: snapshot.manifestErrors[0],
                  count: snapshot.manifestErrors.length
                })
        }
      : null;

  useEffect(() => {
    const syncEmbeddedGame = () => setEmbeddedGameId(getEmbeddedGameId());
    syncEmbeddedGame();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "lumorix.embeddedGame.active") {
        syncEmbeddedGame();
      }
    };
    const onCustom = () => syncEmbeddedGame();

    window.addEventListener("storage", onStorage);
    window.addEventListener(embeddedGameEventName(), onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(embeddedGameEventName(), onCustom);
    };
  }, []);

  useEffect(() => {
    const previousEmbeddedGameId = previousEmbeddedGameIdRef.current;

    if (embeddedGameId && previousEmbeddedGameId !== embeddedGameId) {
      setLastLauncherRoute(route);
    }

    if (!embeddedGameId && previousEmbeddedGameId) {
      setRoute(lastLauncherRoute);
    }

    previousEmbeddedGameIdRef.current = embeddedGameId;
  }, [embeddedGameId, lastLauncherRoute, route]);

  useEffect(() => {
    if (embeddedGameId !== ECHO_PROTOCOL_ITEM_ID) {
      return;
    }
    if (!snapshot) {
      return;
    }

    const embeddedItem = snapshot.items.find((entry) => entry.catalog.id === embeddedGameId);
    if (embeddedItem?.isRunning) {
      return;
    }

    persistEmbeddedGameId(null);
  }, [embeddedGameId, snapshot]);

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="brand">
          <span className="brand__mark">LX</span>
          <span>
            <strong>{t("common.brandName")}</strong>
            <small>{t("common.brandProduct")}</small>
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
          title={t("app.stateUnavailable.title")}
          body={t("app.stateUnavailable.body")}
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

  if (embeddedGameId === ECHO_PROTOCOL_ITEM_ID) {
    return (
      <>
        <EchoProtocolGameShell
          onExit={() => {
            void closeItem(ECHO_PROTOCOL_ITEM_ID);
          }}
        />
        {error && <ErrorToast error={error} onClose={clearError} />}
      </>
    );
  }

  return (
    <>
      <AppShell route={route} setRoute={setRoute} snapshot={snapshot}>
        <div key={`${activeProfileId}:${route}`} className="route-scene">
          {renderRoute(route, setRoute, snapshot, t)}
        </div>
      </AppShell>
      <PersonalizationDialog open={!personalization.displayName} required />
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
  snapshot: LauncherSnapshot,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
) {
  if (route.startsWith("item:")) {
    const id = route.slice("item:".length);
    const item = snapshot.items.find((entry) => entry.catalog.id === id);
    return item ? (
      <GameDetailView item={item} setRoute={setRoute} />
    ) : (
      <EmptyState title={t("app.itemNotFound.title")} body={t("app.itemNotFound.body")} />
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
      return <DownloadsView setRoute={setRoute} />;
    case "socials":
      return <SocialsView />;
    case "settings":
      return <SettingsView />;
    case "about":
      return <AboutView setRoute={setRoute} />;
    default:
      return <HomeView setRoute={setRoute} />;
  }
}
