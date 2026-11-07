export type ThemePreference = "auto" | "escuro" | "claro";

const THEME_KEY = "guia-barman:tema";
const FAVORITES_KEY = "guia-barman:favoritos";
const INVENTORY_KEY = "guia-barman:estoque";

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Navegação privada ou armazenamento cheio: o site continua funcionando.
  }
}

/* -------------------------------------------------------------------------- */
/* Tema                                                                       */
/* -------------------------------------------------------------------------- */

export function getThemePreference(): ThemePreference {
  const stored = readJson<string>(THEME_KEY, "auto");
  return stored === "escuro" || stored === "claro" ? stored : "auto";
}

export function resolvedTheme(preference: ThemePreference = getThemePreference()): "guia" | "guia-claro" {
  if (preference === "escuro") return "guia";
  if (preference === "claro") return "guia-claro";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "guia-claro" : "guia";
}

export function applyTheme(preference: ThemePreference = getThemePreference()): void {
  const theme = resolvedTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "guia" ? "#17110e" : "#f4ecdd",
  );
}

export function setThemePreference(preference: ThemePreference): void {
  writeJson(THEME_KEY, preference);
  applyTheme(preference);
  window.dispatchEvent(new CustomEvent("guia:tema", { detail: preference }));
}

export function initTheme(): void {
  applyTheme();
  const media = window.matchMedia?.("(prefers-color-scheme: light)");
  media?.addEventListener("change", () => {
    if (getThemePreference() === "auto") {
      applyTheme("auto");
      window.dispatchEvent(new CustomEvent("guia:tema", { detail: "auto" }));
    }
  });
}

export function themePreferenceLabel(preference: ThemePreference): string {
  if (preference === "escuro") return "Escuro";
  if (preference === "claro") return "Claro";
  return "Automático";
}

/* -------------------------------------------------------------------------- */
/* Favoritos                                                                  */
/* -------------------------------------------------------------------------- */

let favoriteIds: string[] = readJson<string[]>(FAVORITES_KEY, []).filter(
  (id): id is string => typeof id === "string",
);

export function getFavorites(): readonly string[] {
  return favoriteIds;
}

export function isFavorite(id: string): boolean {
  return favoriteIds.includes(id);
}

export function favoritesCount(): number {
  return favoriteIds.length;
}

export function toggleFavorite(id: string): boolean {
  if (favoriteIds.includes(id)) {
    favoriteIds = favoriteIds.filter((item) => item !== id);
  } else {
    favoriteIds = [...favoriteIds, id];
  }
  writeJson(FAVORITES_KEY, favoriteIds);
  window.dispatchEvent(new CustomEvent("guia:favoritos", { detail: favoriteIds }));
  return favoriteIds.includes(id);
}

/* -------------------------------------------------------------------------- */
/* Estoque                                                                    */
/* -------------------------------------------------------------------------- */

let inventoryIds: string[] = readJson<string[]>(INVENTORY_KEY, []).filter(
  (id): id is string => typeof id === "string",
);

export function getInventory(): readonly string[] {
  return inventoryIds;
}

export function setInventory(ids: string[]): void {
  inventoryIds = [...new Set(ids)];
  writeJson(INVENTORY_KEY, inventoryIds);
  window.dispatchEvent(new CustomEvent("guia:estoque", { detail: inventoryIds }));
}

export function toggleInventory(id: string): void {
  setInventory(
    inventoryIds.includes(id)
      ? inventoryIds.filter((item) => item !== id)
      : [...inventoryIds, id],
  );
}

export function clearInventory(): void {
  setInventory([]);
}
