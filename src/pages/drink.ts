import { createDrinkCard } from "../components/drink-card";
import { createFavoriteButton } from "../components/favorite-button";
import { createRecipeSection } from "../components/recipe-panel";
import { createDrinkArt } from "../components/sprite";
import type { AppContext } from "../lib/context";
import { categoryInfo, methodLabel, sourceLabel, spriteLicense, translationLabel, validColor } from "../lib/data";
import { h, fill } from "../lib/dom";
import { icon } from "../lib/icons";
import { formatAmount } from "../lib/recipe";
import type { ParsedRoute } from "../lib/router";
import { copyText } from "../lib/toast";
import type { Drink, Use } from "../lib/types";
import { renderNotFound } from "./not-found";

function humanizeFlavor(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createFillControl(drink: Drink, data: AppContext["data"], artSlot: HTMLElement): HTMLElement | null {
  const sprite = drink.sprite ?? data.sprites.padrao;
  if (!sprite || sprite.maxNiveis <= 0) return null;
  const max = sprite.maxNiveis;
  const buttons: HTMLButtonElement[] = [];
  const currentLabel = h("span", { class: "fill-current", text: `Cheio · ${max}/${max}` });

  const paint = (level: number): void => {
    fill(artSlot, createDrinkArt(drink, data, { scale: 4, level }));
    buttons.forEach((button) => {
      const active = Number(button.dataset.level) === level;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("is-active", active);
    });
    currentLabel.textContent = level === 0 ? "Vazio" : level === max ? `Cheio · ${level}/${max}` : `Nível ${level} de ${max}`;
  };

  for (let level = 0; level <= max; level++) {
    buttons.push(
      h(
        "button",
        {
          type: "button",
          class: "fill-button",
          "data-level": String(level),
          "aria-pressed": "false",
          "aria-label": `Preenchimento ${level} de ${max}`,
          onclick: () => paint(level),
        },
        level === 0 ? "0" : String(level),
      ),
    );
  }

  paint(max);

  return h(
    "div",
    { class: "fill-control" },
    h(
      "div",
      { class: "fill-head" },
      h("span", { class: "field-label", text: "Nível de preenchimento" }),
      currentLabel,
    ),
    h("div", { class: "fill-buttons", role: "group", "aria-label": "Nível de preenchimento do copo" }, ...buttons),
    h("p", { class: "fill-note", text: "O visual usa os estados de preenchimento do jogo; o copo é apenas uma prévia." }),
  );
}

function groupUses(uses: Use[]): Array<{ drinkId: string; nome: string; total: number; methods: string[]; recipes: number }> {
  const map = new Map<string, { drinkId: string; nome: string; total: number; methods: Set<string>; recipes: Set<string> }>();
  for (const use of uses) {
    const current = map.get(use.bebidaId) ?? {
      drinkId: use.bebidaId,
      nome: use.nome,
      total: 0,
      methods: new Set<string>(),
      recipes: new Set<string>(),
    };
    current.total += use.quantidade;
    current.recipes.add(use.receitaId);
    if (use.metodo) current.methods.add(use.metodo);
    map.set(use.bebidaId, current);
  }
  return [...map.values()].map((item) => ({
    drinkId: item.drinkId,
    nome: item.nome,
    total: item.total,
    methods: [...item.methods],
    recipes: item.recipes.size,
  }));
}

function createUsedInPanel(drink: Drink, data: AppContext["data"]): HTMLElement {
  const uses = groupUses(drink.usadoEm);
  return h(
    "section",
    { class: "panel used-in", "aria-labelledby": "used-heading" },
    h(
      "div",
      { class: "section-head section-head--compact" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Índice reverso" }),
        h("h2", { id: "used-heading", text: "Aparece em" }),
      ),
      h("span", { class: "section-count", text: `${uses.length} ${uses.length === 1 ? "drink" : "drinks"}` }),
    ),
    uses.length
      ? h(
          "ul",
          { class: "used-list" },
          ...uses.map((use) =>
            h(
              "li",
              { class: "used-item" },
              h(
                "span",
                { class: "used-main" },
                h("a", { href: `#/bebida/${encodeURIComponent(use.drinkId)}`, text: use.nome }),
                h("span", { class: "used-note", text: `${formatAmount(use.total)} em ${use.recipes} ${use.recipes === 1 ? "receita" : "receitas"}` }),
              ),
              h(
                "span",
                { class: "used-methods" },
                ...(use.methods.length
                  ? use.methods.map((method) => h("span", { class: "data-chip", text: methodLabel(data, method) }))
                  : [h("span", { class: "data-chip", text: "Mistura direta" })]),
              ),
              h("span", { class: "used-arrow", html: icon("arrow") }),
            ),
          ),
        )
      : h("p", { class: "panel-empty", text: "Esta bebida ainda não aparece como ingrediente em nenhuma receita cadastrada. Ela pode ser servida diretamente ou usada como base livre." }),
  );
}

function createRelated(drink: Drink, data: AppContext["data"]): HTMLElement {
  const related = data.drinks
    .filter((item) => item.id !== drink.id && item.categoria === drink.categoria && item.receitas.length > 0 && item.sprite)
    .slice(0, 4);
  return h(
    "section",
    { class: "related", "aria-labelledby": "related-heading" },
    h(
      "div",
      { class: "section-head" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Na mesma prateleira" }),
        h("h2", { id: "related-heading", text: "Outras bebidas" }),
      ),
      h("a", { class: "text-link", href: `#/menu?cat=${drink.categoria}` }, "Ver categoria ", h("span", { html: icon("arrow") })),
    ),
    h(
      "div",
      { class: "card-grid card-grid--related" },
      ...related.map((item) => createDrinkCard(item, data, { scale: 3 })),
    ),
  );
}

function createTranslationBadge(drink: Drink): HTMLElement | null {
  const label = translationLabel(drink.traducao);
  if (!label) return null;
  return h(
    "span",
    { class: "translation-badge", title: label },
    h("span", { html: icon("info") }),
    label,
  );
}

export function renderDrink(ctx: AppContext, route: ParsedRoute): HTMLElement {
  const { data } = ctx;
  const id = route.segments[1] ?? "";
  const drink = data.drinks.find((item) => item.id === id);
  if (!drink) return renderNotFound(ctx);

  document.title = `${drink.nome} · Guia do Barman`;

  const category = categoryInfo(drink.categoria);
  const artSlot = h("div", { class: "detail-art__slot" });
  const sprite = drink.sprite ?? data.sprites.padrao ?? null;
  const fallback = !drink.sprite && Boolean(data.sprites.padrao);
  const fillControl = createFillControl(drink, data, artSlot);
  if (!fillControl) artSlot.appendChild(createDrinkArt(drink, data, { scale: 4 }));
  const license = sprite ? spriteLicense(data, sprite.rsi) : null;
  const source = sourceLabel(drink.origem.file, drink.origem.line);
  const recipeSection = createRecipeSection(drink, data);

  const copyLink = (): void => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#/bebida/${encodeURIComponent(drink.id)}`;
    void copyText(url, "Link do drink copiado.");
  };

  const top = h(
    "section",
    { class: "detail-hero" },
    h(
      "div",
      { class: "detail-art-column" },
      h(
        "div",
        { class: "detail-art-card", style: { "--drink-color": validColor(drink.cor), "--category-color": category.cor } },
        h("span", { class: "detail-art-index", text: `Nº ${String(data.drinks.findIndex((item) => item.id === drink.id) + 1).padStart(3, "0")}` }),
        artSlot,
        h("span", { class: "detail-art-category", text: category.nome }),
      ),
      fillControl,
      license
        ? h(
            "p",
            { class: "sprite-credit" },
            fallback ? "Copo padrão do jogo (sem sprite próprio): " : "Sprite: ",
            h("a", { href: "#/creditos", text: license.licenca }),
            license.copyright ? ` · ${license.copyright}` : "",
          )
        : h("p", { class: "sprite-credit", text: "Sem sprite metamórfico no repositório; a cor representa o líquido." }),
    ),
    h(
      "div",
      { class: "detail-copy" },
      h(
        "nav",
        { class: "breadcrumbs", "aria-label": "Trilha de navegação" },
        h("a", { href: "#/menu", text: "Menu" }),
        h("span", { "aria-hidden": "true", text: "/" }),
        h("span", { "aria-current": "page", text: drink.nome }),
      ),
      h(
        "p",
        { class: "eyebrow detail-eyebrow" },
        h("span", { class: "category-dot", "aria-hidden": "true" }),
        category.nome,
        " · ",
        drink.alcoolica ? "com álcool" : "sem álcool",
      ),
      h("h1", { class: "detail-title", text: drink.nome }),
      h("p", { class: "detail-description", text: drink.descricao || "Sem descrição no repositório." }),
      createTranslationBadge(drink),
      h(
        "dl",
        { class: "detail-facts" },
        h("div", {}, h("dt", { text: "Receitas" }), h("dd", { text: String(drink.receitas.length) })),
        h("div", {}, h("dt", { text: "Aparece em" }), h("dd", { text: String(groupUses(drink.usadoEm).length) })),
        h("div", {}, h("dt", { text: "Sabor" }), h("dd", { text: drink.sabor ? humanizeFlavor(drink.sabor) : "Não informado" })),
        h("div", {}, h("dt", { text: "Categoria" }), h("dd", { text: category.nome })),
      ),
      h(
        "div",
        { class: "detail-actions no-print" },
        createFavoriteButton(drink, { withLabel: true }),
        h(
          "button",
          { type: "button", class: "button button--ghost", onclick: copyLink },
          h("span", { html: icon("link") }),
          "Copiar link",
        ),
        h(
          "button",
          { type: "button", class: "button button--ghost", onclick: () => window.print() },
          h("span", { html: icon("printer") }),
          "Imprimir",
        ),
      ),
      h(
        "details",
        { class: "tech-details" },
        h("summary", {}, "Ficha técnica"),
        h(
          "dl",
          { class: "tech-list" },
          h("div", {}, h("dt", { text: "Cor" }), h("dd", {}, h("span", { class: "color-dot", style: { backgroundColor: validColor(drink.cor) } }), drink.cor)),
          h("div", {}, h("dt", { text: "Origem" }), h("dd", {}, h("code", { text: source }))),
          sprite
            ? h(
                "div",
                {},
                h("dt", { text: "Sprite" }),
                h("dd", {}, h("code", { text: `${sprite.rsi}/${sprite.estado}` }), fallback ? " · copo padrão" : ""),
              )
            : null,
          h("div", {}, h("dt", { text: "Texto" }), h("dd", { text: translationLabel(drink.traducao) ?? "Traduzido para pt-BR" })),
        ),
      ),
    ),
  );

  const printHeader = h(
    "div",
    { class: "print-only print-header" },
    h("strong", { text: "Guia do Barman · Dumont Station" }),
    h("span", { text: `Ficha de ${drink.nome} · ${new Date().toLocaleDateString("pt-BR")}` }),
  );

  return h(
    "div",
    { class: "page page--detail" },
    printHeader,
    h(
      "div",
      { class: "detail-topbar no-print" },
      h("a", { class: "back-link", href: "#/menu" }, h("span", { html: icon("arrow") }), "Voltar ao menu"),
      h("span", { class: "detail-topbar-note", text: recipeSection ? "Receita extraída dos protótipos" : "Base de bar sem receita registrada" }),
    ),
    top,
    h(
      "div",
      { class: "detail-layout" },
      h(
        "div",
        { class: "detail-main" },
        recipeSection
          ? recipeSection
          : h(
              "section",
              { class: "panel no-recipe", "aria-labelledby": "no-recipe-heading" },
              h("p", { class: "eyebrow", text: "Sem mistura registrada" }),
              h("h2", { id: "no-recipe-heading", text: "Esta bebida é uma base de bar" }),
              h("p", {
                text: "Não há uma reação de mistura para esta bebida nos arquivos de receitas de drinks. Ela ainda pode ser servida diretamente ou usada como ingrediente em outros drinks.",
              }),
              h(
                "a",
                { class: "button button--ghost button--small", href: `#/menu?ing=${encodeURIComponent(drink.id)}` },
                "Ver drinks que usam esta base ",
                h("span", { html: icon("arrow") }),
              ),
            ),
        createUsedInPanel(drink, data),
        createRelated(drink, data),
      ),
      h(
        "aside",
        { class: "detail-aside no-print" },
        h(
          "section",
          { class: "aside-card" },
          h("p", { class: "eyebrow", text: "No balcão" }),
          h("h2", { text: "Como servir" }),
          h("p", {
            text: drink.alcoolica
              ? "Confira o nível de preenchimento, a vasilha e o método antes de entregar. Bebidas alcoólicas podem ter efeitos no jogo."
              : "Bebidas sem álcool funcionam como alternativas leves; sirva no copo escolhido e confira o rendimento da receita.",
          }),
          h(
            "a",
            { class: "text-link", href: "#/guia?secao=vidraria" },
            "Ver capacidades de vidraria ",
            h("span", { html: icon("arrow") }),
          ),
        ),
        h(
          "section",
          { class: "aside-card aside-card--muted" },
          h("p", { class: "eyebrow", text: "Atalho" }),
          h("h2", { text: "Monte o pedido" }),
          h("p", { text: "Selecione o que você tem no balcão e veja se esta receita já pode sair." }),
          h(
            "a",
            { class: "button button--secondary button--small", href: "#/o-que-posso-fazer" },
            "Abrir estoque ",
            h("span", { html: icon("arrow") }),
          ),
        ),
      ),
    ),
  );
}
