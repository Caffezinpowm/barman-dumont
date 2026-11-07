import { createDrinkArt } from "../components/sprite";
import type { AppContext } from "../lib/context";
import { categoryInfo, methodLabel } from "../lib/data";
import { h, fill } from "../lib/dom";
import { normalize } from "../lib/fuzzy";
import { icon } from "../lib/icons";
import { drinkMakeability, formatAmount } from "../lib/recipe";
import { clearInventory, getInventory, setInventory } from "../lib/state";
import type { Drink, Ingredient } from "../lib/types";

type MakerTab = "ready" | "almost" | "all";

interface Evaluated {
  drink: Drink;
  ok: boolean;
  missing: string[];
  missingNames: string[];
}

function stockIds(ctx: AppContext): string[] {
  return ctx.data.guide.dispensas.flatMap((dispenser) =>
    dispenser.conteudo.map((item) => item.reagenteId),
  );
}

export function renderMaker(ctx: AppContext): HTMLElement {
  const { data } = ctx;
  let inventory = new Set<string>(getInventory());
  let tab: MakerTab = "ready";
  let query = "";

  const allIngredients = data.ingredients;
  const checkboxById = new Map<string, HTMLInputElement>();
  const selectedChips = h("div", { class: "selected-chips" });
  const inventoryList = h("div", { class: "inventory-list" });
  const countLabel = h("p", { class: "inventory-count", "aria-live": "polite" });
  const resultsNode = h("div", { class: "make-list" });
  const resultsCount = h("p", { class: "make-count", "aria-live": "polite" });
  const summary = h("div", { class: "maker-summary" });
  const tabBar = h("div", { class: "result-tabs", role: "group", "aria-label": "Resultados" });
  const searchInput = h("input", {
    type: "search",
    class: "field-input",
    placeholder: "Filtrar estoque…",
    "aria-label": "Filtrar ingredientes do estoque",
    autocomplete: "off",
  }) as HTMLInputElement;

  const evaluate = (): Evaluated[] =>
    data.drinks
      .filter((drink) => drink.receitas.length > 0)
      .map((drink) => {
        const result = drinkMakeability(data, drink, inventory);
        return { drink, ok: result.ok, missing: result.missing, missingNames: result.missingNames };
      })
      .sort((a, b) => Number(b.ok) - Number(a.ok) || a.drink.nome.localeCompare(b.drink.nome, "pt-BR"));

  let evaluated = evaluate();

  const tabs: Array<{ id: MakerTab; label: string; count: () => number }> = [
    { id: "ready", label: "Prontas agora", count: () => evaluated.filter((item) => item.ok).length },
    { id: "almost", label: "Quase lá", count: () => evaluated.filter((item) => !item.ok && item.missing.length <= 2).length },
    { id: "all", label: "Todas as receitas", count: () => evaluated.length },
  ];

  const paintTabs = (): void => {
    fill(
      tabBar,
      ...tabs.map((entry) =>
        h(
          "button",
          {
            type: "button",
            class: "result-tab",
            "aria-pressed": tab === entry.id ? "true" : "false",
            onclick: () => {
              tab = entry.id;
              paintTabs();
              paintResults();
            },
          },
          entry.label,
          h("span", { class: "result-tab__count", text: String(entry.count()) }),
        ),
      ),
    );
  };

  const chipLabel = (ingredient: Ingredient): string => ingredient.nome;

  const paintSelectedChips = (): void => {
    fill(selectedChips);
    if (!inventory.size) {
      selectedChips.appendChild(h("p", { class: "selected-empty", text: "Nenhum item marcado ainda." }));
      return;
    }
    const picked = allIngredients
      .filter((ingredient) => inventory.has(ingredient.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    for (const ingredient of picked.slice(0, 14)) {
      selectedChips.appendChild(
        h(
          "button",
          {
            type: "button",
            class: "selected-chip",
            title: `Remover ${ingredient.nome}`,
            onclick: () => {
              inventory.delete(ingredient.id);
              setInventory([...inventory]);
              syncCheckboxes();
              onChange();
            },
          },
          chipLabel(ingredient),
          h("span", { html: icon("x") }),
        ),
      );
    }
    if (picked.length > 14) {
      selectedChips.appendChild(h("span", { class: "selected-more", text: `+${picked.length - 14}` }));
    }
  };

  const syncCheckboxes = (): void => {
    for (const [id, input] of checkboxById) input.checked = inventory.has(id);
  };

  function ingredientRow(ingredient: Ingredient): HTMLElement {
    const input = h("input", {
      type: "checkbox",
      checked: inventory.has(ingredient.id),
      onchange: () => {
        if (input.checked) inventory.add(ingredient.id);
        else inventory.delete(ingredient.id);
        setInventory([...inventory]);
        onChange();
      },
    }) as HTMLInputElement;
    checkboxById.set(ingredient.id, input);
    return h(
      "label",
      { class: "inventory-item" },
      input,
      h("span", { class: "check-mark", "aria-hidden": "true" }),
      h(
        "span",
        { class: "inventory-item__copy" },
        h("span", { class: "inventory-item__name", text: ingredient.nome }),
        h("span", {
          class: "inventory-item__meta",
          text: ingredient.bebida ? "Bebida / base" : `Insumo · ${ingredient.usadoEm.length} ${ingredient.usadoEm.length === 1 ? "receita" : "receitas"}`,
        }),
      ),
      ingredient.bebida ? h("span", { class: "inventory-item__kind", text: "bebida" }) : null,
    );
  }

  const paintInventory = (): void => {
    checkboxById.clear();
    const normalizedQuery = normalize(query);
    const filtered = allIngredients.filter((ingredient) => {
      if (!normalizedQuery) return true;
      return normalize(`${ingredient.nome} ${ingredient.id} ${ingredient.descricao}`).includes(normalizedQuery);
    });
    const drinks = filtered.filter((ingredient) => ingredient.bebida);
    const insumos = filtered.filter((ingredient) => !ingredient.bebida);
    fill(inventoryList);
    if (!filtered.length) {
      inventoryList.appendChild(h("p", { class: "inventory-empty", text: "Nenhum ingrediente com esse filtro." }));
      return;
    }
    if (drinks.length) {
      inventoryList.appendChild(h("p", { class: "inventory-group-title", text: "Bebidas e bases" }));
      inventoryList.append(...drinks.map(ingredientRow));
    }
    if (insumos.length) {
      inventoryList.appendChild(h("p", { class: "inventory-group-title", text: "Insumos" }));
      inventoryList.append(...insumos.map(ingredientRow));
    }
  };

  const paintSummary = (): void => {
    const ready = evaluated.filter((item) => item.ok).length;
    const almost = evaluated.filter((item) => !item.ok && item.missing.length <= 2).length;
    fill(
      summary,
      h(
        "div",
        { class: "maker-stat maker-stat--ready" },
        h("span", { class: "maker-stat__value", text: String(ready) }),
        h("span", { class: "maker-stat__label", text: "prontas agora" }),
      ),
      h(
        "div",
        { class: "maker-stat" },
        h("span", { class: "maker-stat__value", text: String(almost) }),
        h("span", { class: "maker-stat__label", text: "a até 2 itens" }),
      ),
      h(
        "div",
        { class: "maker-stat maker-stat--muted" },
        h("span", { class: "maker-stat__value", text: String(inventory.size) }),
        h("span", { class: "maker-stat__label", text: "itens no estoque" }),
      ),
    );
  };

  const missingChips = (item: Evaluated): HTMLElement => {
    const names = item.missingNames.length ? item.missingNames : ["Ingrediente não catalogado"];
    return h(
      "div",
      { class: "missing-list" },
      h("span", { class: "missing-label", text: "Falta:" }),
      ...names.slice(0, 5).map((name) => h("span", { class: "missing-chip", text: name })),
      names.length > 5 ? h("span", { class: "missing-chip", text: `+${names.length - 5}` }) : null,
    );
  };

  const paintResults = (): void => {
    const items =
      tab === "ready"
        ? evaluated.filter((item) => item.ok)
        : tab === "almost"
          ? evaluated.filter((item) => !item.ok && item.missing.length <= 2)
          : evaluated;

    paintSummary();
    resultsCount.textContent = `${items.length} ${items.length === 1 ? "receita" : "receitas"}`;
    fill(resultsNode);

    if (!inventory.size && tab === "ready") {
      resultsNode.appendChild(
        h(
          "div",
          { class: "empty-state" },
          h("span", { class: "empty-state__icon", html: icon("bottle") }),
          h("h3", { text: "Seu estoque está vazio." }),
          h("p", { text: "Marque ingredientes ao lado ou carregue o estoque básico das duas dispensas para começar." }),
          h(
            "button",
            {
              type: "button",
              class: "button button--primary",
              onclick: () => {
                inventory = new Set(stockIds(ctx));
                setInventory([...inventory]);
                syncCheckboxes();
                onChange();
              },
            },
            "Carregar estoque básico",
          ),
        ),
      );
      return;
    }

    if (!items.length) {
      resultsNode.appendChild(
        h(
          "div",
          { class: "empty-state" },
          h("span", { class: "empty-state__icon", html: icon(tab === "ready" ? "glass" : "bottle") }),
          h("h3", { text: tab === "ready" ? "Nada pronto com este estoque." : "Nada nesta faixa." }),
          h("p", {
            text: tab === "ready"
              ? "Veja “Quase lá” para descobrir o que falta ou marque mais ingredientes."
              : "Ajuste o estoque ou confira todas as receitas cadastradas.",
          }),
          tab === "ready"
            ? h(
                "button",
                {
                  type: "button",
                  class: "button button--ghost",
                  onclick: () => {
                    tab = "almost";
                    paintTabs();
                    paintResults();
                  },
                },
                "Ver quase lá",
              )
            : null,
        ),
      );
      return;
    }

    for (const item of items) {
      const category = categoryInfo(item.drink.categoria);
      const recipe = item.drink.receitas[0];
      resultsNode.appendChild(
        h(
          "article",
          { class: `make-row ${item.ok ? "is-ready" : ""}`, style: { "--category-color": category.cor } },
          h(
            "a",
            { class: "make-row__art", href: `#/bebida/${encodeURIComponent(item.drink.id)}`, "aria-hidden": "true", tabindex: "-1" },
            createDrinkArt(item.drink, data, { scale: 2 }),
          ),
          h(
            "div",
            { class: "make-row__copy" },
            h(
              "p",
              { class: "make-row__kicker" },
              h("span", { class: "category-dot", "aria-hidden": "true" }),
              category.nome,
              h("span", { class: "make-row__method", text: methodLabel(data, recipe?.metodo) }),
            ),
            h("h3", {}, h("a", { href: `#/bebida/${encodeURIComponent(item.drink.id)}`, text: item.drink.nome })),
            item.ok
              ? h(
                  "p",
                  { class: "make-row__note make-row__note--ready" },
                  h("span", { html: icon("check") }),
                  `Pronta para servir · ${formatAmount(recipe?.produtoQuantidade ?? 1)} por lote`,
                )
              : missingChips(item),
          ),
          h(
            "a",
            { class: "make-row__action", href: `#/bebida/${encodeURIComponent(item.drink.id)}` },
            item.ok ? "Abrir receita" : "Ver drink",
            h("span", { html: icon("arrow") }),
          ),
        ),
      );
    }
  };

  const onChange = (): void => {
    evaluated = evaluate();
    countLabel.textContent = `${inventory.size} ${inventory.size === 1 ? "item marcado" : "itens marcados"}`;
    paintSelectedChips();
    paintTabs();
    paintResults();
    // Se a aba atual ficou vazia, não força troca: o estado vazio orienta o próximo passo.
  };

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    paintInventory();
  });

  const loadBasic = (): void => {
    inventory = new Set(stockIds(ctx));
    setInventory([...inventory]);
    syncCheckboxes();
    onChange();
  };

  const clearAll = (): void => {
    inventory = new Set();
    clearInventory();
    syncCheckboxes();
    onChange();
  };

  paintInventory();
  paintSelectedChips();
  paintTabs();
  paintResults();
  countLabel.textContent = `${inventory.size} ${inventory.size === 1 ? "item marcado" : "itens marcados"}`;

  return h(
    "div",
    { class: "page page--maker" },
    h(
      "header",
      { class: "page-head" },
      h("p", { class: "eyebrow", text: "Do estoque ao copo" }),
      h(
        "div",
        { class: "page-head__row" },
        h("h1", { text: "O que posso fazer?" }),
        h("p", { class: "page-head__note", text: "Marque o que existe no seu balcão e encontre a próxima receita possível." }),
      ),
    ),
    h(
      "div",
      { class: "maker-layout" },
      h(
        "aside",
        { class: "inventory-panel", "aria-labelledby": "inventory-heading" },
        h(
          "div",
          { class: "inventory-head" },
          h("div", {}, h("p", { class: "eyebrow", text: "Sua dispensa" }), h("h2", { id: "inventory-heading", text: "Estoque" })),
          countLabel,
        ),
        h(
          "div",
          { class: "inventory-actions" },
          h("button", { type: "button", class: "button button--secondary button--small", onclick: loadBasic }, h("span", { html: icon("plus") }), "Estoque básico"),
          h("button", { type: "button", class: "text-button", onclick: clearAll }, "Limpar"),
        ),
        h("div", { class: "field-with-icon" }, h("span", { class: "field-icon", html: icon("search") }), searchInput),
        selectedChips,
        inventoryList,
        h("p", { class: "inventory-footnote", text: "“Estoque básico” marca tudo o que as duas dispensas fornecem. Bebidas prontas também podem ser marcadas." }),
      ),
      h(
        "section",
        { class: "maker-results", "aria-labelledby": "maker-results-heading" },
        summary,
        h(
          "div",
          { class: "section-head section-head--compact" },
          h(
            "div",
            {},
            h("p", { class: "eyebrow", text: "Resultados" }),
            h("h2", { id: "maker-results-heading", text: "Receitas possíveis" }),
          ),
          resultsCount,
        ),
        h("p", {
          class: "maker-method-note",
          text: "Uma receita entra em “prontas” quando todos os ingredientes estão no estoque ou podem ser preparados a partir dele. “Quase lá” mostra o que está a até dois itens de distância.",
        }),
        tabBar,
        resultsNode,
      ),
    ),
  );
}
