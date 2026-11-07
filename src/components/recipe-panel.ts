import { methodLabel, methodSentence, vessels } from "../lib/data";
import { h, fill } from "../lib/dom";
import { icon } from "../lib/icons";
import { formatAmount, formatNumber, ingredientHref, maxBatchesFor, recipeChatText, recipeTitle, scaledAmount } from "../lib/recipe";
import { copyText } from "../lib/toast";
import type { Drink, Recipe, SiteData } from "../lib/types";

function methodChip(data: SiteData, recipe: Recipe): HTMLElement {
  return h(
    "span",
    { class: `method-chip ${recipe.metodo ? "" : "method-chip--direct"}` },
    h("span", { html: icon(recipe.metodo === "Shake" || recipe.metodo === "Stir" ? "glass" : "clock") }),
    methodLabel(data, recipe.metodo),
  );
}

function temperatureLabel(recipe: Recipe): string | null {
  const min = recipe.temperaturaMinima;
  const max = recipe.temperaturaMaxima;
  if (min === null && max === null) return null;
  const format = (kelvin: number): string => `${formatNumber(kelvin)} K (${formatNumber(kelvin - 273.15)} °C)`;
  if (min !== null && max !== null) return `${format(min)} a ${format(max)}`;
  if (min !== null) return `A partir de ${format(min)}`;
  return `Até ${format(max as number)}`;
}

function createBatchCalculator(recipe: Recipe, drink: Drink, data: SiteData): HTMLElement {
  const uid = recipe.id.replace(/[^a-z0-9_-]/gi, "-");
  const vesselOptions = vessels(data);
  const yieldPerBatch = recipe.produtoQuantidade || 1;
  const preferredVessel =
    vesselOptions.find((item) => item.id === "DrinkGlass" && (item.capacidade ?? 0) >= yieldPerBatch) ??
    vesselOptions.find((item) => (item.capacidade ?? 0) >= yieldPerBatch) ??
    vesselOptions[vesselOptions.length - 1];

  let multiplier = 1;
  let vessel = preferredVessel;

  const select = h(
    "select",
    { class: "field-select", "aria-label": "Vasilha para o lote" },
    ...vesselOptions.map((item) =>
      h(
        "option",
        { value: item.id, selected: item.id === vessel?.id ? "true" : undefined },
        `${item.nome} · ${item.capacidade}u${item.uso ? ` · ${item.uso}` : ""}`,
      ),
    ),
  ) as HTMLSelectElement;

  const count = h("input", {
    type: "number",
    class: "field-input",
    min: "1",
    max: "999",
    step: "1",
    value: "1",
    inputmode: "numeric",
    "aria-label": "Quantidade de lotes",
  }) as HTMLInputElement;

  const capacityNote = h("p", { class: "batch-note", "aria-live": "polite" });
  const body = h("div", { class: "batch-body" });

  const readValues = (): void => {
    multiplier = Math.max(1, Math.min(999, Math.round(Number(count.value) || 1)));
    count.value = String(multiplier);
    vessel = vesselOptions.find((item) => item.id === select.value) ?? preferredVessel;
  };

  const render = (): void => {
    readValues();
    const capacity = vessel?.capacidade ?? 0;
    const total = scaledAmount(yieldPerBatch, multiplier);
    const maxBatches = maxBatchesFor(recipe, capacity);
    capacityNote.classList.toggle("batch-note--warning", total > capacity);
    capacityNote.textContent = total > capacity
      ? `Não cabe em ${vessel?.nome ?? "uma vasilha de capacidade desconhecida"}: ${formatAmount(total)} para ${formatAmount(capacity)} de capacidade.`
      : `Cabe até ${maxBatches} ${maxBatches === 1 ? "lote" : "lotes"} em ${vessel?.nome ?? "vasilha"} (${formatAmount(capacity)}).`;

    fill(
      body,
      h(
        "div",
        { class: "batch-total" },
        h("span", { class: "batch-total__label", text: "Rendimento total" }),
        h("strong", { class: "batch-total__value", text: formatAmount(total) }),
        h("span", { class: "batch-total__sub", text: `${multiplier} × ${formatAmount(yieldPerBatch)} por lote` }),
      ),
      h(
        "table",
        { class: "batch-table" },
        h(
          "thead",
          {},
          h("tr", {}, h("th", { scope: "col", text: "Ingrediente" }), h("th", { scope: "col", text: "Quantidade" })),
        ),
        h(
          "tbody",
          {},
          ...recipe.reagentes.map((ingredient) =>
            h(
              "tr",
              {},
              h(
                "td",
                {},
                h("a", { href: ingredientHref(ingredient), text: ingredient.nome }),
              ),
              h("td", { class: "numeric", text: formatAmount(scaledAmount(ingredient.quantidade, multiplier)) }),
            ),
          ),
        ),
      ),
      h(
        "div",
        { class: "batch-actions" },
        h(
          "button",
          {
            type: "button",
            class: "button button--secondary button--small",
            onclick: () => {
              count.value = String(Math.max(1, maxBatches));
              render();
            },
          },
          h("span", { html: icon("sliders") }),
          "Ajustar à vasilha",
        ),
        h(
          "button",
          {
            type: "button",
            class: "button button--primary button--small",
            onclick: () =>
              copyText(
                recipeChatText(data, recipe, drink, multiplier),
                "Receita copiada para o chat do jogo.",
              ),
          },
          h("span", { html: icon("copy") }),
          "Copiar receita",
        ),
      ),
    );
  };

  select.addEventListener("change", render);
  count.addEventListener("input", render);
  render();

  return h(
    "section",
    { class: "batch", "aria-labelledby": `batch-title-${uid}` },
    h(
      "div",
      { class: "batch-head" },
      h("p", { class: "eyebrow", text: "Calculadora de lote" }),
      h("h3", { id: `batch-title-${uid}`, text: "Escale a receita pela capacidade real" }),
      h("p", {
        class: "batch-intro",
        text: "As capacidades abaixo vêm dos protótipos de vidraria do Dumont Station. Escolha a vasilha e quantos lotes vai preparar.",
      }),
    ),
    h(
      "div",
      { class: "batch-controls" },
      h("label", { class: "field" }, h("span", { class: "field-label", text: "Vasilha" }), select),
      h(
        "label",
        { class: "field field--small" },
        h("span", { class: "field-label", text: "Lotes" }),
        count,
      ),
    ),
    capacityNote,
    body,
    h("p", {
      class: "batch-source",
      text: "Capacidades extraídas de SolutionContainerManager. Recipientes fora do balcão podem ter outros limites.",
    }),
  );
}

interface PrepNode {
  ingredient: { id: string; nome: string; quantidade: number; bebida: boolean };
  recipe: Recipe | null;
  children: PrepNode[];
  cycle: boolean;
}

function buildPrepNode(
  data: SiteData,
  ingredient: { id: string; nome: string; quantidade: number; bebida: boolean },
  visited: Set<string>,
): PrepNode {
  if (visited.has(ingredient.id)) {
    return { ingredient, recipe: null, children: [], cycle: true };
  }
  const subDrink = data.drinks.find((item) => item.id === ingredient.id);
  if (!subDrink || subDrink.receitas.length === 0) {
    return { ingredient, recipe: null, children: [], cycle: false };
  }
  const subRecipe = subDrink.receitas.find((recipe) => recipe.id === subDrink.id) ?? subDrink.receitas[0];
  const nextVisited = new Set(visited);
  nextVisited.add(ingredient.id);
  const factor = ingredient.quantidade / (subRecipe.produtoQuantidade || 1);
  return {
    ingredient,
    recipe: subRecipe,
    children: subRecipe.reagentes.map((child) =>
      buildPrepNode(
        data,
        { ...child, quantidade: scaledAmount(child.quantidade, factor) },
        nextVisited,
      ),
    ),
    cycle: false,
  };
}

function renderPrepNode(node: PrepNode, data: SiteData): HTMLElement {
  const hasChildren = node.recipe !== null && node.children.length > 0;
  return h(
    "li",
    { class: hasChildren ? "prep-item prep-item--branch" : "prep-item" },
    h(
      "div",
      { class: "prep-line" },
      h("span", { class: "prep-name" }, h("a", { href: ingredientHref(node.ingredient), text: node.ingredient.nome })),
      h("span", { class: "prep-amount", text: formatAmount(node.ingredient.quantidade) }),
    ),
    node.cycle
      ? h("p", { class: "prep-cycle", text: "Referência circular evitada." })
      : null,
    hasChildren
      ? h(
          "details",
          { class: "prep-branch" },
          h("summary", {}, "Preparar antes"),
          h("p", {
            class: "prep-note",
            text: `Para ${formatAmount(node.ingredient.quantidade)}, use ${node.recipe?.id === node.ingredient.id ? "a receita principal" : "uma das receitas"} de ${node.ingredient.nome} (${formatAmount(node.recipe?.produtoQuantidade ?? 1)} por lote).`,
          }),
          h(
            "ul",
            { class: "prep-list" },
            ...node.children.map((child) => renderPrepNode(child, data)),
          ),
        )
      : null,
  );
}

function createPrepTree(recipe: Recipe, data: SiteData): HTMLElement {
  const roots = recipe.reagentes.map((ingredient) => buildPrepNode(data, ingredient, new Set([recipe.produtoId])));
  const hasIntermediates = roots.some((node) => node.recipe !== null);
  return h(
    "details",
    { class: "prep-tree" },
    h(
      "summary",
      {},
      h("span", { class: "prep-tree__icon", html: icon("book") }),
      h("span", {}, "Árvore de preparo"),
      h("span", { class: "prep-tree__hint", text: hasIntermediates ? "inclui bebidas intermediárias" : "ingredientes diretos" }),
    ),
    h("p", { class: "prep-intro", text: "Quantidades para 1 lote. Itens que precisam de preparo aparecem aninhados." }),
    h("ul", { class: "prep-list prep-list--root" }, ...roots.map((node) => renderPrepNode(node, data))),
  );
}

function createRecipeBody(recipe: Recipe, drink: Drink, data: SiteData): HTMLElement {
  const temperature = temperatureLabel(recipe);
  return h(
    "div",
    { class: "recipe-body" },
    h(
      "div",
      { class: "recipe-head" },
      h("div", { class: "recipe-head__main" }, methodChip(data, recipe)),
      h(
        "div",
        { class: "recipe-head__meta" },
        h("span", { class: "yield-badge", text: `Rende ${formatAmount(recipe.produtoQuantidade)}` }),
        temperature ? h("span", { class: "data-chip", text: temperature }) : null,
      ),
    ),
    h("p", { class: "recipe-method-note", text: methodSentence(data, recipe.metodo) }),
    h(
      "div",
      { class: "recipe-columns" },
      h(
        "section",
        { class: "recipe-ingredients" },
        h("h3", { text: "Ingredientes" }),
        h(
          "ul",
          { class: "ingredient-list" },
          ...recipe.reagentes.map((ingredient) =>
            h(
              "li",
              {},
              h(
                "span",
                { class: "ingredient-name" },
                h("a", { href: ingredientHref(ingredient), text: ingredient.nome }),
                ingredient.bebida ? h("span", { class: "ingredient-kind", text: "bebida" }) : null,
              ),
              h("span", { class: "ingredient-amount", text: formatAmount(ingredient.quantidade) }),
            ),
          ),
        ),
        recipe.observacoes.length
          ? h(
              "div",
              { class: "recipe-observations" },
              ...recipe.observacoes.map((note) => h("p", { text: note })),
            )
          : null,
      ),
      h(
        "div",
        { class: "recipe-aside" },
        createPrepTree(recipe, data),
        h(
          "p",
          { class: "recipe-source" },
          "Fonte: ",
          h("code", { text: `${drink.origem.file}:${drink.origem.line}` }),
        ),
      ),
    ),
    createBatchCalculator(recipe, drink, data),
  );
}

export function createRecipeSection(drink: Drink, data: SiteData): HTMLElement | null {
  if (!drink.receitas.length) return null;
  const recipeTabs = drink.receitas;
  const safeId = (id: string): string => id.replace(/[^a-z0-9_-]/gi, "-");
  const panels = recipeTabs.map((recipe) => {
    const panel = h(
      "div",
      {
        class: "recipe-panel",
        role: "tabpanel",
        id: `recipe-panel-${safeId(recipe.id)}`,
        "aria-labelledby": `recipe-tab-${safeId(recipe.id)}`,
      },
      createRecipeBody(recipe, drink, data),
    );
    return panel;
  });
  const tabs = recipeTabs.map((recipe, index) => {
    const button = h(
      "button",
      {
        type: "button",
        class: "recipe-tab",
        role: "tab",
        id: `recipe-tab-${safeId(recipe.id)}`,
        "aria-controls": `recipe-panel-${safeId(recipe.id)}`,
        "aria-selected": index === 0 ? "true" : "false",
        tabindex: index === 0 ? "0" : "-1",
        onclick: () => select(index),
      },
      h("span", { class: "recipe-tab__title", text: recipeTitle(recipe, drink, index) }),
      h("span", { class: "recipe-tab__meta", text: methodLabel(data, recipe.metodo) }),
    );
    return button;
  });

  function select(index: number): void {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle("is-active", selected);
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      select(next);
      tabs[next].focus();
    });
  });

  panels.forEach((panel, index) => {
    panel.hidden = index !== 0;
  });
  tabs[0]?.classList.add("is-active");

  return h(
    "section",
    { class: "panel recipe-section", "aria-labelledby": "recipes-heading" },
    h(
      "div",
      { class: "section-head section-head--compact" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: recipeTabs.length > 1 ? "Variações" : "Preparo" }),
        h("h2", { id: "recipes-heading", text: recipeTabs.length > 1 ? "Receitas" : "Receita" }),
      ),
      h("span", { class: "section-count", text: `${recipeTabs.length} ${recipeTabs.length === 1 ? "receita" : "receitas"}` }),
    ),
    recipeTabs.length > 1
      ? h(
          "div",
          { class: "recipe-tabs", role: "tablist", "aria-label": "Receitas disponíveis" },
          ...tabs,
        )
      : null,
    ...panels,
  );
}
