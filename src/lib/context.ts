import type { SiteData } from "./types";

export interface AppActions {
  openSearch(query?: string): void;
  closeSearch(): void;
  toast(message: string, tone?: "ok" | "error"): void;
  refreshHeader(): void;
  currentPath(): string;
}

export interface AppContext {
  data: SiteData;
  actions: AppActions;
}
