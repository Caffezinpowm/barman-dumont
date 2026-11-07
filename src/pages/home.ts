import type { AppContext } from "../lib/context";
import { CATEGORIES, categoryInfo, drinkOrdinal, methodLabel } from "../lib/data";
import { h } from "../lib/dom";
import { icon } from "../lib/icons";
import { createDrinkArt, createEquipmentArt } from "../components/sprite";
import { createDrinkCard } from "../components/drink-card";
import type { Drink } from "../lib/types";

function pickFeature(data: AppContext["data"], offset: number): Drink {
  const pool = data.drinks.filter((drink) => drink.receitas.length > 0 && drink.sprite);
  const list = pool.length ? pool : data.drinks.filter((drink) => drink.receitas.length > 0);
  const day = Math.floor(Date.now() / 86_400_000);
  return list[(day + offset) % list.length];
}

const CATEGORY_PICKS: Record<string, string> = {
  alcoolica: "Martini",
  "sem-alcool": "Coffee",
  refrigerante: "Cola",
  suco: "JuiceOrange",
};

function pickCategoryDrink(data: AppContext["data"], categoria: string): Drink | null {
  const preferred = CATEGORY_PICKS[categoria];
  const match = preferred
    ? data.drinks.find((drink) => drink.id === preferred && drink.sprite)
    : null;
  if (match) return match;
  return data.drinks.find((drink) => drink.categoria === categoria && drink.sprite) ?? null;
}

function methodCounts(ctx: AppContext): Array<{ id: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const drink of ctx.data.drinks) {
    for (const recipe of drink.receitas) {
      const key = recipe.metodo ?? "direta";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: id === "direta" ? "Mistura direta" : methodLabel(ctx.data, id),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export function renderHome(ctx: AppContext): HTMLElement {
  const { data } = ctx;
  const recipes = data.drinks.reduce((sum, drink) => sum + drink.receitas.length, 0);
  const ingredients = data.ingredients.filter((ingredient) => !ingredient.bebida).length;
  const featureDrinks = data.drinks
    .filter((drink) => drink.receitas.length > 0 && drink.sprite)
    .slice(0, 24);
  let offset = 0;

  const featureSlot = h("div", { class: "feature-slot" });
  const paintFeature = (): void => {
    const drink = pickFeature(data, offset);
    featureSlot.replaceChildren(
      h(
        "div",
        { class: "hero-feature__top" },
        h("span", { class: "eyebrow", text: "Sugestão da casa" }),
        h("span", { class: "feature-number", text: `Nº ${drinkOrdinal(data, drink)}` }),
      ),
      h("div", { class: "hero-feature__art" }, createDrinkArt(drink, data, { scale: 4 })),
      h(
        "div",
        { class: "hero-feature__copy" },
        h("p", { class: "feature-category" }, `${categoryInfo(drink.categoria).nome} · ${methodLabel(data, drink.receitas[0]?.metodo)}`),
        h("h2", {}, h("a", { href: `#/bebida/${encodeURIComponent(drink.id)}`, text: drink.nome })),
        h("p", { class: "feature-desc", text: drink.descricao }),
        h(
          "div",
          { class: "feature-actions" },
          h(
            "a",
            { class: "text-link", href: `#/bebida/${encodeURIComponent(drink.id)}` },
            "Abrir receita ",
            h("span", { html: icon("arrow") }),
          ),
          h(
            "button",
            {
              type: "button",
              class: "text-button",
              onclick: () => {
                offset += 1;
                paintFeature();
              },
            },
            "Outra sugestão",
          ),
        ),
      ),
    );
  };
  paintFeature();

  const welcome = h(
    "section",
    { class: "home-hero", "aria-labelledby": "home-title" },
    h(
      "div",
      { class: "hero-copy" },
      h("p", { class: "eyebrow hero-eyebrow", text: "Manual de balcão · edição SS14" }),
      h(
        "h1",
        { class: "hero-title", id: "home-title" },
        h("span", { class: "hero-title__small", text: "Guia do" }),
        h("span", { class: "hero-title__large", text: "Barman" }),
      ),
      h(
        "p",
        { class: "hero-lede" },
        "Receitas, ingredientes, vidraria e o ritual inteiro do balcão do ",
        h("strong", { text: "Dumont Station" }),
        ". Feito para consultar no meio do turno, com os dados reais dos protótipos do jogo.",
      ),
      h(
        "div",
        { class: "hero-actions" },
        h(
          "a",
          { class: "button button--primary", href: "#/menu" },
          "Abrir o menu ",
          h("span", { html: icon("arrow") }),
        ),
        h(
          "button",
          {
            type: "button",
            class: "button button--ghost",
            onclick: () => ctx.actions.openSearch(),
          },
          h("span", { html: icon("search") }),
          "Buscar no guia",
        ),
      ),
      h(
        "dl",
        { class: "hero-stats" },
        h("div", {}, h("dt", { text: "Bebidas" }), h("dd", { text: String(data.drinks.length) })),
        h("div", {}, h("dt", { text: "Receitas" }), h("dd", { text: String(recipes) })),
        h("div", {}, h("dt", { text: "Insumos" }), h("dd", { text: String(ingredients) })),
        h("div", {}, h("dt", { text: "Métodos" }), h("dd", { text: String(data.guide.metodos.length) })),
      ),
    ),
    h("aside", { class: "hero-feature", "aria-label": "Sugestão de drink" }, featureSlot),
  );

  const searchBand = h(
    "button",
    {
      type: "button",
      class: "home-search",
      onclick: () => ctx.actions.openSearch(),
      title: "Abrir busca global",
    },
    h("span", { class: "home-search__icon", html: icon("search") }),
    h("span", { class: "home-search__text", text: "Buscar por drink, ingrediente, sabor ou equipamento…" }),
    h("span", { class: "home-search__hint" }, h("kbd", { text: "/" }), " ou ", h("kbd", { text: "Ctrl K" })),
  );

  const categorySection = h(
    "section",
    { class: "home-section", "aria-labelledby": "categories-heading" },
    h(
      "div",
      { class: "section-head" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Por categoria" }),
        h("h2", { id: "categories-heading", text: "Encontre o seu balcão" }),
      ),
      h("a", { class: "text-link", href: "#/menu" }, "Ver todas as bebidas ", h("span", { html: icon("arrow") })),
    ),
    h(
      "div",
      { class: "category-grid" },
      ...CATEGORIES.filter((category) => category.id !== "outro").map((category) => {
        const count = data.drinks.filter((drink) => drink.categoria === category.id).length;
        const categoryDrink = pickCategoryDrink(data, category.id);
        return h(
          "a",
          {
            class: "category-tile",
            href: `#/menu?cat=${category.id}`,
            style: { "--category-color": category.cor },
          },
          h("span", { class: "category-tile__count", text: String(count).padStart(2, "0") }),
          categoryDrink
            ? h(
                "span",
                { class: "category-tile__art", "aria-hidden": "true" },
                createDrinkArt(categoryDrink, data, { scale: 3 }),
              )
            : null,
          h(
            "span",
            { class: "category-tile__name" },
            category.nome,
            h("span", { class: "category-tile__arrow", html: icon("arrow-up-right") }),
          ),
          h("span", { class: "category-tile__desc", text: category.descricao }),
        );
      }),
    ),
  );

  const featuredSection = h(
    "section",
    { class: "home-section", "aria-labelledby": "featured-heading" },
    h(
      "div",
      { class: "section-head" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Para começar o turno" }),
        h("h2", { id: "featured-heading", text: "Receitas da casa" }),
      ),
      h("a", { class: "text-link", href: "#/menu?receita=1" }, "Só com receita ", h("span", { html: icon("arrow") })),
    ),
    h(
      "div",
      { class: "card-grid card-grid--three" },
      ...featureDrinks.slice(0, 6).map((drink) => createDrinkCard(drink, data, { scale: 3 })),
    ),
  );

  const guideQuote = data.guide.blocos.find((block) => block.tipo === "paragrafo")?.texto
    ?? "O barman tem um trabalho simples: servir bebidas.";
  const shaker = data.guide.equipamentos.find((item) => item.id === "DrinkShaker");
  const guideTeaser = h(
    "section",
    { class: "guide-teaser", "aria-labelledby": "guide-teaser-heading" },
    h(
      "div",
      { class: "guide-teaser__copy" },
      h("p", { class: "eyebrow", text: "Do manual" }),
      h("h2", { id: "guide-teaser-heading", text: "O primeiro turno" }),
      h("blockquote", { text: guideQuote }),
      h(
        "div",
        { class: "teaser-methods" },
        ...methodCounts(ctx).map((method) =>
          h(
            "span",
            { class: "method-stat" },
            h("strong", { text: String(method.count) }),
            method.label,
          ),
        ),
      ),
      h(
        "a",
        { class: "text-link", href: "#/guia" },
        "Ler o guia do barman ",
        h("span", { html: icon("arrow") }),
      ),
    ),
    h(
      "div",
      { class: "guide-teaser__art" },
      shaker ? createEquipmentArt(shaker, data, 4) : null,
      h("span", { class: "teaser-stamp", text: "Bar · Dumont" }),
    ),
  );

  const dispenserRow = h(
    "div",
    { class: "maker-band__dispensers" },
    ...data.guide.dispensas.map((dispenser) =>
      h(
        "span",
        { class: "dispenser-mini" },
        h("span", { class: "dispenser-mini__dot", "aria-hidden": "true" }),
        h("span", { text: dispenser.nome }),
        h("small", { text: `${dispenser.conteudo.length} itens` }),
      ),
    ),
  );

  const makerBand = h(
    "section",
    { class: "maker-band", "aria-labelledby": "maker-heading" },
    h(
      "div",
      { class: "maker-band__copy" },
      h("p", { class: "eyebrow", text: "Estoque do balcão" }),
      h("h2", { id: "maker-heading", text: "O que dá para fazer agora?" }),
      h("p", {
        text: "Marque o que você tem na dispensa e o guia mostra as receitas que já podem sair — e o que falta para as próximas.",
      }),
      dispenserRow,
      h(
        "a",
        { class: "button button--primary", href: "#/o-que-posso-fazer" },
        "Montar meu estoque ",
        h("span", { html: icon("arrow") }),
      ),
    ),
    h(
      "div",
      { class: "maker-band__card" },
      h("span", { class: "maker-card__label", text: "Receita pronta" }),
      h("span", { class: "maker-card__big", text: "1" }),
      h("span", { class: "maker-card__text", text: "drink no balcão" }),
      h("span", { class: "maker-card__rule", "aria-hidden": "true" }),
      h("span", { class: "maker-card__label", text: "Quase lá" }),
      h("span", { class: "maker-card__big maker-card__big--small", text: "até 2" }),
      h("span", { class: "maker-card__text", text: "ingredientes faltando" }),
    ),
  );

  return h(
    "div",
    { class: "home" },
    welcome,
    searchBand,
    h(
      "div",
      { class: "home-grid" },
      h(
        "div",
        { class: "home-main" },
        categorySection,
        featuredSection,
      ),
      h(
        "aside",
        { class: "home-aside" },
        guideTeaser,
      ),
    ),
    makerBand,
  );
}
