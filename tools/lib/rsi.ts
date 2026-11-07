import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readPngSize } from "./png.js";

export interface RsiMetaState {
  name: string;
  directions?: number;
  delayer?: number;
}

export interface RsiMeta {
  version?: number;
  size: { x: number; y: number };
  license?: string;
  copyright?: string;
  states: RsiMetaState[];
}

export interface CopiedSprite {
  path: string;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
  directions: number;
  cols: number;
  rows: number;
}

export interface RsiCopy {
  rsi: string;
  meta: RsiMeta;
  states: Record<string, CopiedSprite>;
}

export function readRsiMeta(repo: string, rsi: string): RsiMeta {
  const path = join(repo, "Resources", "Textures", rsi, "meta.json");
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as RsiMeta;
}

function frameLayout(
  meta: RsiMeta,
  state: RsiMetaState,
  sheetWidth: number,
  sheetHeight: number,
): { directions: number; cols: number; rows: number } {
  const directions = Math.max(1, state.directions ?? 1);
  const w = meta.size.x;
  const h = meta.size.y;

  if (directions <= 1) return { directions: 1, cols: 1, rows: 1 };

  if (sheetWidth === w * directions && sheetHeight === h) {
    return { directions, cols: directions, rows: 1 };
  }
  if (sheetHeight === h * directions && sheetWidth === w) {
    return { directions, cols: 1, rows: directions };
  }
  if (sheetWidth === w * 2 && sheetHeight === h * Math.ceil(directions / 2)) {
    return { directions, cols: 2, rows: Math.ceil(directions / 2) };
  }
  // Fallback seguro: assume disposição horizontal.
  return { directions, cols: directions, rows: 1 };
}

/**
 * Copia um estado de RSI sem alterar o PNG. O meta.json também é copiado
 * para preservar licença e atribuição.
 */
export function copyRsiState(
  repo: string,
  spritesRoot: string,
  rsi: string,
  stateName: string,
): { rsiCopy: RsiCopy; sprite: CopiedSprite } {
  const meta = readRsiMeta(repo, rsi);
  const state = meta.states.find((s) => s.name === stateName);
  if (!state) throw new Error(`Estado "${stateName}" não existe em ${rsi}`);

  const source = join(repo, "Resources", "Textures", rsi, `${stateName}.png`);
  if (!existsSync(source)) throw new Error(`PNG não encontrado: ${source}`);

  const destination = join(spritesRoot, rsi, `${stateName}.png`);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);

  const metaDestination = join(spritesRoot, rsi, "meta.json");
  if (!existsSync(metaDestination)) {
    mkdirSync(dirname(metaDestination), { recursive: true });
    copyFileSync(join(repo, "Resources", "Textures", rsi, "meta.json"), metaDestination);
  }

  const size = readPngSize(source);
  const layout = frameLayout(meta, state, size.width, size.height);
  const sprite: CopiedSprite = {
    path: `sprites/${rsi}/${stateName}.png`,
    width: meta.size.x,
    height: meta.size.y,
    sheetWidth: size.width,
    sheetHeight: size.height,
    ...layout,
  };

  return {
    rsiCopy: { rsi, meta, states: { [stateName]: sprite } },
    sprite,
  };
}

export function mergeRsiCopy(target: Map<string, RsiCopy>, incoming: RsiCopy): void {
  const current = target.get(incoming.rsi);
  if (!current) {
    target.set(incoming.rsi, incoming);
    return;
  }
  Object.assign(current.states, incoming.states);
}
