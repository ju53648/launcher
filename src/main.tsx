import { createRoot } from "react-dom/client";

import { App } from "./App";
import { I18nProvider } from "./i18n";
import { LauncherProvider } from "./store/LauncherStore";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <LauncherProvider>
      <App />
    </LauncherProvider>
  </I18nProvider>
);
