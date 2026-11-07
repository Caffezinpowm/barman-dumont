import { readFileSync } from "node:fs";
import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  type Document,
  type Node,
} from "yaml";

export interface SourceRef {
  arquivo: string;
  linha: number;
}

export interface ParsedYamlFile {
  arquivo: string;
  itens: Record<string, unknown>[];
  avisos: string[];
  erro?: string;
}

/** Converte um nó YAML em JS preservando as tags !type:... como __tag. */
function nodeToPlain(node: unknown, doc: Document): unknown {
  if (!node) return null;
  if (isAlias(node)) {
    const resolved = node.resolve(doc);
    return resolved ? nodeToPlain(resolved, doc) : null;
  }
  if (isSeq(node)) {
    return node.items.map((item) => nodeToPlain(item, doc));
  }
  if (isMap(node)) {
    const out: Record<string, unknown> = {};
    for (const pair of node.items) {
      const keyNode = pair.key as Node | null;
      let key: string;
      if (isScalar(keyNode)) key = String(keyNode.value);
      else if (keyNode && "range" in keyNode) key = String(keyNode);
      else key = "?";
      out[key] = nodeToPlain(pair.value, doc);
    }
    if (node.tag) out.__tag = node.tag.replace(/^!type:/, "");
    return out;
  }
  if (isScalar(node)) {
    if (node.tag) {
      return { __tag: node.tag.replace(/^!type:/, ""), __value: node.value ?? null };
    }
    return node.value ?? null;
  }
  return null;
}

export function lineFromOffset(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Lê um YAML do SS14. O parser usa o schema padrão do pacote `yaml`, que
 * registra as tags desconhecidas como avisos (não como erro) e preserva o
 * nome da tag no nó. Também mantemos a linha de cada protótipo.
 */
export function parseYamlFile(absolutePath: string, repoRelativePath: string): ParsedYamlFile {
  const text = readFileSync(absolutePath, "utf8");
  const doc = parseDocument(text, {
    prettyErrors: false,
    strict: false,
    uniqueKeys: false,
    logLevel: "silent",
  });

  const itens: Record<string, unknown>[] = [];
  if (!doc.errors.length && isSeq(doc.contents)) {
    for (const item of doc.contents.items) {
      const plain = nodeToPlain(item, doc);
      if (plain && typeof plain === "object" && !Array.isArray(plain)) {
        const obj = plain as Record<string, unknown>;
        const offset = (item as Node | null)?.range?.[0] ?? 0;
        obj.__line = lineFromOffset(text, offset);
        itens.push(obj);
      }
    }
  }

  return {
    arquivo: repoRelativePath,
    itens,
    avisos: doc.warnings.map((w) => w.message.split("\n")[0]),
    erro: doc.errors.length ? doc.errors.map((e) => e.message).join("\n") : undefined,
  };
}

export function tagOf(value: unknown): string | null {
  if (value && typeof value === "object" && "__tag" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).__tag);
  }
  return null;
}

export function tagData(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    delete copy.__tag;
    delete copy.__value;
    return copy;
  }
  return {};
}

export function asArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === undefined || value === null || value === "") return [];
  return [value as T];
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function isAbstract(proto: Record<string, unknown>): boolean {
  return proto.abstract === true;
}
