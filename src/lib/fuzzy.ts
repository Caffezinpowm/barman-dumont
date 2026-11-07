export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row++) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= b.length; column++) {
      const substitution = previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1);
      const value = Math.min(previous[column] + 1, current[column - 1] + 1, substitution);
      current[column] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

function typoScore(haystack: string, token: string): number {
  if (token.length < 3) return 0;
  const limit = token.length >= 7 ? 2 : 1;
  for (const word of haystack.split(" ")) {
    if (Math.abs(word.length - token.length) > limit) continue;
    const distance = editDistance(word, token, limit);
    if (distance <= limit) return distance === 1 ? 48 : 26;
  }
  return 0;
}

function tokenScore(haystack: string, token: string): number {
  if (!token) return 0;
  if (haystack === token) return 140;
  if (haystack.startsWith(token)) return 110;
  const wordStart = haystack.indexOf(` ${token}`);
  if (wordStart >= 0) return 90;
  const index = haystack.indexOf(token);
  if (index >= 0) return Math.max(35, 70 - index * 0.6);
  return typoScore(haystack, token);
}

/** Pontuação tolerante a acentos e a erros de digitação por palavra. */
export function fuzzyScore(query: string, text: string): number {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);
  if (!normalizedQuery || !normalizedText) return 0;

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(normalizedText, token);
    if (!score) return 0;
    total += score;
  }
  if (normalizedText === normalizedQuery) total += 240;
  if (normalizedText.startsWith(normalizedQuery)) total += 80;
  return total;
}
