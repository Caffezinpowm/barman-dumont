import { methodLabel } from "./data";
import type { Drink, Recipe, RecipeIngredient, SiteData } from "./types";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatAmount(value: number): string {
  return `${number.format(value)}u`;
}

export function formatNumber(value: number): string {
  return number.format(value);
}

export function scaledAmount(amount: number, multiplier: number): number {
  return Math.round(amount * multiplier * 100) / 100;
}

export function recipeTitle(recipe: Recipe, drink: Drink, index: number): string {
  if (recipe.id === drink.id && index === 0) return "Receita principal";
  if (recipe.id === drink.id) return "Receita principal";
  return `Receita ${index + 1}`;
}

export function ingredientHref(ingredient: Pick<RecipeIngredient, "id" | "bebida">): string {
  return ingredient.bebida
    ? `#/bebida/${encodeURIComponent(ingredient.id)}`
    : `#/menu?ing=${encodeURIComponent(ingredient.id)}`;
}

export function maxBatchesFor(recipe: Recipe, capacity: number): number {
  if (!recipe.produtoQuantidade || recipe.produtoQuantidade <= 0) return 0;
  return Math.floor(capacity / recipe.produtoQuantidade);
}

export function recipeChatText(
  data: SiteData,
  recipe: Recipe,
  drink: Drink,
  multiplier: number,
): string {
  const method = methodLabel(data, recipe.metodo);
  const ingredients = recipe.reagentes
    .map((ingredient) => `${ingredient.nome} ${formatAmount(scaledAmount(ingredient.quantidade, multiplier))}`)
    .join(", ");
  const total = formatAmount(scaledAmount(recipe.produtoQuantidade, multiplier));
  return `${drink.nome} (${multiplier}x, ${total}): ${ingredients} — ${method}.`;
}

export interface Makeability {
  ok: boolean;
  missing: string[];
  missingNames: string[];
  used: string[];
}

export function makeability(
  data: SiteData,
  drinkId: string,
  inventory: ReadonlySet<string>,
): Makeability {
  const memo = new Map<string, Makeability>();
  const visiting = new Set<string>();

  const resolve = (id: string): Makeability => {
    const cached = memo.get(id);
    if (cached) return cached;
    if (inventory.has(id)) {
      const result = { ok: true, missing: [], missingNames: [], used: [id] };
      memo.set(id, result);
      return result;
    }
    if (visiting.has(id)) {
      const result = { ok: false, missing: [id], missingNames: [], used: [] };
      return result;
    }

    const ingredient = data.ingredients.find((item) => item.id === id);
    const drink = data.drinks.find((item) => item.id === id);
    if (!drink || drink.receitas.length === 0) {
      const result = {
        ok: false,
        missing: [id],
        missingNames: [ingredient?.nome ?? id],
        used: [],
      };
      memo.set(id, result);
      return result;
    }

    visiting.add(id);
    let best: Makeability | null = null;
    for (const recipe of drink.receitas) {
      const missing = new Set<string>();
      const missingNames = new Set<string>();
      const used = new Set<string>();
      for (const reactant of recipe.reagentes) {
        const sub = resolve(reactant.id);
        for (const item of sub.missing) missing.add(item);
        for (const item of sub.missingNames) missingNames.add(item);
        for (const item of sub.used) used.add(item);
      }
      const candidate = { ok: missing.size === 0, missing: [...missing], missingNames: [...missingNames], used: [...used] };
      if (!best || candidate.missing.length < best.missing.length) best = candidate;
      if (candidate.ok) {
        best = candidate;
        break;
      }
    }
    visiting.delete(id);
    const result = best ?? { ok: false, missing: [id], missingNames: [ingredient?.nome ?? id], used: [] };
    memo.set(id, result);
    return result;
  };

  return resolve(drinkId);
}

export function drinkMakeability(
  data: SiteData,
  drink: Drink,
  inventory: ReadonlySet<string>,
): Makeability {
  if (!drink.receitas.length) {
    return {
      ok: inventory.has(drink.id),
      missing: inventory.has(drink.id) ? [] : [drink.id],
      missingNames: inventory.has(drink.id) ? [] : [drink.nome],
      used: inventory.has(drink.id) ? [drink.id] : [],
    };
  }
  return makeability(data, drink.id, inventory);
}
