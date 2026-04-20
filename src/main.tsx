import { createRoot } from "react-dom/client";

import { App } from "./App";
import { LauncherProvider } from "./store/LauncherStore";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";

createRoot(document.getElementById("root")!).render(
  <LauncherProvider>
    <App />
  </LauncherProvider>
);
