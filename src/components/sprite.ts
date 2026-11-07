import { assetPath, spriteState, validColor } from "../lib/data";
import { h } from "../lib/dom";
import { icon } from "../lib/icons";
import type { Drink, Equipment, EquipmentSprite, SiteData, SpriteState } from "../lib/types";

interface ArtOptions {
  level?: number | "empty" | "full";
  scale?: number;
  label?: string;
}

function frame(
  state: SpriteState,
  scale: number,
  color: string | null = null,
  tinted = false,
): HTMLElement {
  const width = state.width * scale;
  const height = state.height * scale;
  const backgroundSize = `${state.sheetWidth * scale}px ${state.sheetHeight * scale}px`;
  const style: Record<string, string> = {
    width: `${width}px`,
    height: `${height}px`,
    backgroundImage: `url("${assetPath(state.path)}")`,
    backgroundSize,
    backgroundPosition: "0 0",
    backgroundRepeat: "no-repeat",
  };
  if (tinted && color) {
    style.backgroundColor = color;
    style.maskImage = `url("${assetPath(state.path)}")`;
    style.maskSize = backgroundSize;
    style.maskPosition = "0 0";
    style.maskRepeat = "no-repeat";
    style.webkitMaskImage = `url("${assetPath(state.path)}")`;
    style.webkitMaskSize = backgroundSize;
    style.webkitMaskPosition = "0 0";
    style.webkitMaskRepeat = "no-repeat";
    style.backgroundImage = "none";
  }
  return h("span", { class: "sprite-frame", style, "aria-hidden": "true" });
}

function fallbackGlass(color: string, size: number): HTMLElement {
  return h(
    "span",
    {
      class: "glass-fallback",
      style: {
        width: `${Math.max(36, size * 0.55)}px`,
        height: `${Math.max(52, size * 0.8)}px`,
        "--glass-color": color,
      },
      "aria-hidden": "true",
    },
    h("span", { class: "glass-fallback__liquid" }),
  );
}

export function createDrinkArt(drink: Drink, data: SiteData, options: ArtOptions = {}): HTMLElement {
  const scale = options.scale ?? 3;
  const level = options.level ?? "full";
  const color = validColor(drink.cor);
  const wrapper = h("div", {
    class: "drink-art",
    style: { "--drink-color": color },
    role: "img",
    "aria-label": options.label ?? `Ilustração de ${drink.nome}`,
  });

  let sprite = drink.sprite ?? data.sprites.padrao ?? null;
  let base = sprite ? spriteState(data, sprite.rsi, sprite.estado) : null;
  if (!base && data.sprites.padrao) {
    sprite = data.sprites.padrao;
    base = spriteState(data, sprite.rsi, sprite.estado);
  }
  if (!sprite || !base) {
    wrapper.appendChild(fallbackGlass(color, 32 * scale));
    return wrapper;
  }

  wrapper.appendChild(frame(base, scale));

  const fillStates = sprite.estadosPreenchimento;
  const fullLevel = Math.min(fillStates.length, Math.max(0, sprite.maxNiveis));
  const resolvedLevel =
    level === "empty"
      ? 0
      : level === "full"
        ? fullLevel
        : Math.max(0, Math.min(fullLevel, Math.round(level)));

  if (resolvedLevel > 0) {
    const stateName = fillStates[resolvedLevel - 1];
    const fill = spriteState(data, sprite.rsi, stateName);
    if (fill) {
      const fillFrame = frame(fill, scale, color, sprite.mudaCor);
      fillFrame.classList.add("sprite-frame--fill");
      wrapper.appendChild(fillFrame);
    }
  }

  if (sprite.estadoSobreposicao) {
    const overlay = spriteState(data, sprite.rsi, sprite.estadoSobreposicao);
    if (overlay) {
      const overlayFrame = frame(overlay, scale);
      overlayFrame.classList.add("sprite-frame--overlay");
      wrapper.appendChild(overlayFrame);
    }
  }

  wrapper.dataset.level = String(resolvedLevel);
  wrapper.dataset.maxLevel = String(fullLevel);
  return wrapper;
}

export function createEquipmentArt(
  equipment: Equipment,
  data: SiteData,
  scale = 3,
): HTMLElement {
  const wrapper = h("div", {
    class: "equipment-art",
    role: "img",
    "aria-label": `Ilustração de ${equipment.nome}`,
  });
  const state = equipment.sprite
    ? spriteState(data, equipment.sprite.rsi, equipment.sprite.estado)
    : null;
  if (state) wrapper.appendChild(frame(state, scale));
  else wrapper.innerHTML = icon("bottle");
  return wrapper;
}

export function createEquipmentSpriteArt(
  sprite: EquipmentSprite | null,
  data: SiteData,
  label: string,
  scale = 3,
): HTMLElement {
  const wrapper = h("div", {
    class: "equipment-art",
    role: "img",
    "aria-label": `Ilustração de ${label}`,
  });
  const state = sprite ? spriteState(data, sprite.rsi, sprite.estado) : null;
  if (state) wrapper.appendChild(frame(state, scale));
  else wrapper.innerHTML = icon("bottle");
  return wrapper;
}

export function createVendingArt(data: SiteData, scale = 3): HTMLElement | null {
  const vending = data.guide.vending;
  if (!vending) return null;
  return createEquipmentSpriteArt(vending.sprite, data, vending.nome, scale);
}
