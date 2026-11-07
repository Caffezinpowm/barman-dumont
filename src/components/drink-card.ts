import { categoryInfo, drinkOrdinal, methodLabel } from "../lib/data";
import { h } from "../lib/dom";
import type { Drink, SiteData } from "../lib/types";
import { createFavoriteButton } from "./favorite-button";
import { createDrinkArt } from "./sprite";

interface DrinkCardOptions {
  showFavorite?: boolean;
  extra?: Node | null;
  scale?: number;
}

export function createDrinkCard(
  drink: Drink,
  data: SiteData,
  options: DrinkCardOptions = {},
): HTMLElement {
  const category = categoryInfo(drink.categoria);
  const href = `#/bebida/${encodeURIComponent(drink.id)}`;
  const recipeCount = drink.receitas.length;
  const firstRecipe = drink.receitas[0];
  const method = firstRecipe ? methodLabel(data, firstRecipe.metodo) : null;
  const meta = recipeCount
    ? recipeCount === 1
      ? method ?? "Receita da casa"
      : `${recipeCount} receitas`
    : "Sem receita registrada";

  return h(
    "article",
    {
      class: `drink-card category-${drink.categoria}`,
      style: { "--category-color": category.cor, "--drink-color": drink.cor },
    },
    h(
      "div",
      { class: "drink-card__media" },
      h("span", { class: "drink-card__number", text: `Nº ${drinkOrdinal(data, drink)}` }),
      options.showFavorite === false ? null : createFavoriteButton(drink),
      h(
        "a",
        { href, class: "drink-card__art-link", tabindex: "-1", "aria-hidden": "true" },
        createDrinkArt(drink, data, { scale: options.scale ?? 3 }),
      ),
    ),
    h(
      "div",
      { class: "drink-card__body" },
      h(
        "p",
        { class: "drink-card__kicker" },
        h("span", { class: "category-dot", "aria-hidden": "true" }),
        category.nome,
        drink.traducao === "en"
          ? h("span", {
              class: "lang-badge",
              title: "Texto original em inglês",
              "aria-label": "Texto original em inglês",
              text: "EN",
            })
          : null,
      ),
      h(
        "h3",
        { class: "drink-card__title" },
        h("a", { href, text: drink.nome }),
      ),
      h("p", { class: "drink-card__desc", text: drink.descricao || "Sem descrição no repositório." }),
      h(
        "div",
        { class: "drink-card__foot" },
        h("span", { class: "card-meta", text: meta }),
        options.extra ?? h("span", {
          class: recipeCount ? "card-status card-status--recipe" : "card-status",
          text: recipeCount ? "Com receita" : "Base de bar",
        }),
      ),
    ),
  );
}
