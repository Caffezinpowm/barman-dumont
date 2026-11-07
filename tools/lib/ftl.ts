import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanFtlValue } from "./text.js";

export type LocaleMap = Map<string, string>;

export interface LocaleBundle {
  maps: Record<string, LocaleMap>;
  arquivos: Record<string, string[]>;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && entry.name.endsWith(".ftl")) out.push(p);
  }
  return out;
}

/**
 * Parser tolerante de FTL suficiente para nomes e descrições de protótipos.
 * Suporta atributos (`.desc`, `.suffix`) e continuações indentadas.
 */
export function parseFtlFile(path: string, map: LocaleMap): void {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  let currentKey: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/g, "");
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const attr = line.match(/^\s+\.([A-Za-z0-9_-]+)\s*=\s*(.*)$/);
    if (attr && currentKey) {
      map.set(`${currentKey}.${attr[1]}`, cleanFtlValue(attr[2]));
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      map.set(currentKey, cleanFtlValue(kv[2]));
      continue;
    }

    if (/^\s+/.test(line) && currentKey) {
      const previous = map.get(currentKey) ?? "";
      map.set(currentKey, `${previous}\n${line.trim()}`.trim());
    }
  }
}

export function loadLocales(localeRoot: string, languages: string[]): LocaleBundle {
  const maps: Record<string, LocaleMap> = {};
  const arquivos: Record<string, string[]> = {};
  for (const lang of languages) {
    const map: LocaleMap = new Map();
    const files = walk(join(localeRoot, lang));
    for (const file of files) parseFtlFile(file, map);
    maps[lang] = map;
    arquivos[lang] = files;
  }
  return { maps, arquivos };
}

/** Resolve referências FTL simples como `{ ent-Foo }`. */
function resolveReferences(value: string, map: LocaleMap, depth = 0): string {
  if (depth > 4 || !value.includes("{")) return value;
  return value.replace(/\{\s*([A-Za-z0-9_.-]+)\s*\}/g, (whole, key: string) => {
    const found = map.get(key);
    return found ? resolveReferences(found, map, depth + 1) : whole;
  });
}

export interface LocalizedText {
  valor: string;
  traducao: "pt" | "en" | "id";
}

export interface LocaleLookupOptions {
  chaveNome?: string | null;
  chaveDescricao?: string | null;
  literalNome?: string | null;
  literalDescricao?: string | null;
  fallbackNome: string;
  preferirLiteral?: boolean;
}

/**
 * Resolve um texto com prioridade pt-BR → en-US → literal → id humanizado.
 * Nunca devolve uma chave crua de localização.
 */
export function localize(
  bundle: LocaleBundle,
  options: LocaleLookupOptions,
): { nome: LocalizedText; descricao: LocalizedText } {
  const pt = bundle.maps["pt-BR"];
  const en = bundle.maps["en-US"];

  const read = (map: LocaleMap | undefined, key: string | null | undefined): string | null => {
    if (!map || !key) return null;
    const raw = map.get(key);
    if (!raw) return null;
    const resolved = resolveReferences(raw, map);
    if (/\{\s*[A-Za-z0-9_.-]+\s*\}/.test(resolved)) return null;
    return resolved;
  };

  const fallback = options.fallbackNome;
  const literalName = options.literalNome ?? null;
  const literalDesc = options.literalDescricao ?? null;

  let nome: LocalizedText;
  const ptName = read(pt, options.chaveNome);
  const enName = read(en, options.chaveNome);
  if (ptName) nome = { valor: ptName, traducao: "pt" };
  else if (enName) nome = { valor: enName, traducao: "en" };
  else if (literalName && literalName.trim()) {
    const fromPt = pt?.get(literalName);
    const fromEn = en?.get(literalName);
    if (fromPt) nome = { valor: fromPt, traducao: "pt" };
    else if (fromEn) nome = { valor: fromEn, traducao: "en" };
    else nome = { valor: literalName.trim(), traducao: "en" };
  } else nome = { valor: fallback, traducao: "id" };

  let descricao: LocalizedText;
  const ptDesc = read(pt, options.chaveDescricao);
  const enDesc = read(en, options.chaveDescricao);
  if (ptDesc) descricao = { valor: ptDesc, traducao: "pt" };
  else if (enDesc) descricao = { valor: enDesc, traducao: "en" };
  else if (literalDesc && literalDesc.trim()) {
    const fromPt = pt?.get(literalDesc);
    const fromEn = en?.get(literalDesc);
    if (fromPt) descricao = { valor: fromPt, traducao: "pt" };
    else if (fromEn) descricao = { valor: fromEn, traducao: "en" };
    else descricao = { valor: literalDesc.trim(), traducao: "en" };
  } else descricao = { valor: "", traducao: "id" };

  return { nome, descricao };
}
