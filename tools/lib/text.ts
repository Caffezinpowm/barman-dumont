/** Utilitários de texto compartilhados pela extração. */

export function humanizeId(id: string): string {
  const spaced = id
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!spaced) return id;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cleanFtlValue(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\s+$/g, "")
    .trim();
}

/** Evita que uma chave crua de localização chegue à interface. */
export function looksLikeLocaleKey(value: string): boolean {
  return /^(reagent|ent|flavor|mixing|guide|dataset|verb|ui|chat|alerts?|metabolism|species|job|station)-[a-z0-9][a-z0-9.-]*$/i.test(
    value.trim(),
  );
}

export function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
