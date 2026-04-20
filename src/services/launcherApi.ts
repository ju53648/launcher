import { mockApi } from "./mockApi";
import { isTauriRuntime, tauriApi } from "./tauri";

export const launcherApi = isTauriRuntime() ? tauriApi : mockApi;
