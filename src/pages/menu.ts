import { createDrinkCard } from "../components/drink-card";
import type { AppContext } from "../lib/context";
import { CATEGORIES, categoryLabel, methodLabel } from "../lib/data";
import { h, fill } from "../lib/dom";
import { normalize } from "../lib/fuzzy";
import { icon } from "../lib/icons";
import type { ParsedRoute } from "../lib/router";
import type { Categoria, Drink } from "../lib/types";

type SortKey = "az" | "za" | "receita" | "ingredientes" | "usado";
type MethodFilter = "todos" | "Shake" | "Stir" | "direta";
type AlcoholFilter = "todas" | "com" | "sem";

interface MenuState {
  q: string;
  category: Categoria | "todas";
  recipeOnly: boolean;
  method: MethodFilter;
  alcohol: AlcoholFilter;
  sort: SortKey;
  ingredientId: string | null;
}

function initialCategory(value: string | null): Categoria | "todas" {
  return CATEGORIES.some((category) => category.id === value) ? (value as Categoria) : "todas";
}

function readState(route: ParsedRoute): MenuState {
  return {
    q: route.query.get("q") ?? "",
    category: initialCategory(route.query.get("cat")),
    recipeOnly: route.query.get("receita") === "1",
    method: (route.query.get("metodo") as MethodFilter) || "todos",
    alcohol: (route.query.get("alcool") as AlcoholFilter) || "todas",
    sort: (route.query.get("ordenar") as SortKey) || "az",
    ingredientId: route.query.get("ing"),
  };
}

export function renderMenu(ctx: AppContext, route: ParsedRoute): HTMLElement {
  const { data } = ctx;
  const state = readState(route);
  const ingredient = state.ingredientId
    ? data.ingredients.find((item) => item.id === state.ingredientId)
    : null;
  const ingredientName = ingredient?.nome ?? "Ingrediente não catalogado";

  const matchesIngredient = (drink: Drink): boolean => {
    if (!state.ingredientId) return true;
    return drink.receitas.some((recipe) =>
      recipe.reagentes.some((reactant) => reactant.id === state.ingredientId),
    );
  };

  const matches = (drink: Drink): boolean => {
    if (!matchesIngredient(drink)) return false;
    if (state.category !== "todas" && drink.categoria !== state.category) return false;
    if (state.recipeOnly && drink.receitas.length === 0) return false;
    if (state.alcohol === "com" && !drink.alcoolica) return false;
    if (state.alcohol === "sem" && drink.alcoolica) return false;
    if (state.method !== "todos") {
      if (state.method === "direta") {
        if (!drink.receitas.some((recipe) => recipe.metodo === null)) return false;
      } else if (!drink.receitas.some((recipe) => recipe.metodo === state.method)) {
        return false;
      }
    }
    if (state.q.trim()) {
      const query = normalize(state.q);
      const haystack = normalize([
        drink.nome,
        drink.id,
        drink.descricao,
        drink.sabor ?? "",
        categoryLabel(drink.categoria),
        ...drink.receitas.flatMap((recipe) => recipe.reagentes.map((item) => item.nome)),
      ].join(" "));
      if (!query.split(" ").every((token) => haystack.includes(token))) return false;
    }
    return true;
  };

  const sortDrinks = (items: Drink[]): Drink[] => {
    const list = [...items];
    if (state.sort === "az") return list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (state.sort === "za") return list.sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));
    if (state.sort === "receita") {
      return list.sort((a, b) => Number(b.receitas.length > 0) - Number(a.receitas.length > 0) || a.nome.localeCompare(b.nome, "pt-BR"));
    }
    if (state.sort === "ingredientes") {
      return list.sort((a, b) => Math.max(0, ...b.receitas.map((recipe) => recipe.reagentes.length)) - Math.max(0, ...a.receitas.map((recipe) => recipe.reagentes.length)) || a.nome.localeCompare(b.nome, "pt-BR"));
    }
    return list.sort((a, b) => b.usadoEm.length - a.usadoEm.length || a.nome.localeCompare(b.nome, "pt-BR"));
  };

  const resultsNode = h("div", { class: "card-grid card-grid--menu", id: "menu-results" });
  const countNode = h("h2", { class: "menu-count", "aria-live": "polite" });
  const activeFilters = h("div", {
    class: "active-filters",
    role: "group",
    "aria-label": "Filtros ativos",
  });

  const searchInput = h("input", {
    type: "search",
    class: "field-input menu-search",
    placeholder: "Filtrar por nome, sabor ou ingrediente…",
    value: state.q,
    "aria-label": "Filtrar o menu",
    autocomplete: "off",
  }) as HTMLInputElement;

  const categoryGroup = h(
    "div",
    { class: "filter-pills", role: "group", "aria-label": "Categoria" },
    h(
      "button",
      {
        type: "button",
        class: "pill",
        "data-cat": "todas",
        "aria-pressed": state.category === "todas" ? "true" : "false",
        onclick: () => setCategory("todas"),
      },
      "Todas ",
      h("span", { class: "pill-count", text: String(data.drinks.length) }),
    ),
    ...CATEGORIES.map((category) => {
      const count = data.drinks.filter((drink) => drink.categoria === category.id).length;
      return h(
        "button",
        {
          type: "button",
          class: "pill",
          "data-cat": category.id,
          "aria-pressed": state.category === category.id ? "true" : "false",
          onclick: () => setCategory(category.id),
        },
        category.nome,
        h("span", { class: "pill-count", text: String(count) }),
      );
    }),
  );

  const recipeToggle = h(
    "label",
    { class: "check-control" },
    h("input", {
      type: "checkbox",
      checked: state.recipeOnly,
      onchange: (event: Event) => {
        state.recipeOnly = (event.target as HTMLInputElement).checked;
        update();
      },
    }),
    h("span", { class: "check-mark", "aria-hidden": "true" }),
    "Só com receita",
  );

  const alcoholSelect = h(
    "select",
    {
      class: "field-select",
      "aria-label": "Filtrar por álcool",
      onchange: (event: Event) => {
        state.alcohol = (event.target as HTMLSelectElement).value as AlcoholFilter;
        update();
      },
    },
    h("option", { value: "todas", selected: state.alcohol === "todas" ? "true" : undefined }, "Com e sem álcool"),
    h("option", { value: "com", selected: state.alcohol === "com" ? "true" : undefined }, "Só alcoólicas"),
    h("option", { value: "sem", selected: state.alcohol === "sem" ? "true" : undefined }, "Só sem álcool"),
  ) as HTMLSelectElement;

  const methodSelect = h(
    "select",
    {
      class: "field-select",
      "aria-label": "Filtrar por método",
      onchange: (event: Event) => {
        state.method = (event.target as HTMLSelectElement).value as MethodFilter;
        update();
      },
    },
    h("option", { value: "todos", selected: state.method === "todos" ? "true" : undefined }, "Todos os métodos"),
    h("option", { value: "Shake", selected: state.method === "Shake" ? "true" : undefined }, "Agitar"),
    h("option", { value: "Stir", selected: state.method === "Stir" ? "true" : undefined }, "Mexer"),
    h("option", { value: "direta", selected: state.method === "direta" ? "true" : undefined }, "Mistura direta"),
  ) as HTMLSelectElement;

  const sortSelect = h(
    "select",
    {
      class: "field-select",
      "aria-label": "Ordenar o menu",
      onchange: (event: Event) => {
        state.sort = (event.target as HTMLSelectElement).value as SortKey;
        update();
      },
    },
    h("option", { value: "az", selected: state.sort === "az" ? "true" : undefined }, "Nome · A–Z"),
    h("option", { value: "za", selected: state.sort === "za" ? "true" : undefined }, "Nome · Z–A"),
    h("option", { value: "receita", selected: state.sort === "receita" ? "true" : undefined }, "Com receita primeiro"),
    h("option", { value: "ingredientes", selected: state.sort === "ingredientes" ? "true" : undefined }, "Mais ingredientes"),
    h("option", { value: "usado", selected: state.sort === "usado" ? "true" : undefined }, "Mais usado em drinks"),
  ) as HTMLSelectElement;

  const updateUrl = (): void => {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.category !== "todas") params.set("cat", state.category);
    if (state.recipeOnly) params.set("receita", "1");
    if (state.method !== "todos") params.set("metodo", state.method);
    if (state.alcohol !== "todas") params.set("alcool", state.alcohol);
    if (state.sort !== "az") params.set("ordenar", state.sort);
    if (state.ingredientId) params.set("ing", state.ingredientId);
    const next = params.toString();
    history.replaceState(null, "", `#/menu${next ? `?${next}` : ""}`);
  };

  const paintActiveFilters = (): void => {
    fill(activeFilters);
    const add = (label: string, onRemove: () => void): void => {
      activeFilters.appendChild(
        h(
          "button",
          { type: "button", class: "filter-chip", onclick: onRemove },
          label,
          h("span", { html: icon("x") }),
        ),
      );
    };
    if (state.q) add(`Busca: “${state.q}”`, () => { state.q = ""; searchInput.value = ""; update(); });
    if (state.category !== "todas") add(`Categoria: ${categoryLabel(state.category)}`, () => setCategory("todas"));
    if (state.recipeOnly) add("Só com receita", () => { state.recipeOnly = false; recipeToggle.querySelector<HTMLInputElement>("input")!.checked = false; update(); });
    if (state.method !== "todos") add(`Método: ${state.method === "direta" ? "Mistura direta" : methodLabel(data, state.method)}`, () => { state.method = "todos"; methodSelect.value = "todos"; update(); });
    if (state.alcohol !== "todas") add(state.alcohol === "com" ? "Alcoólicas" : "Sem álcool", () => { state.alcohol = "todas"; alcoholSelect.value = "todas"; update(); });
    if (state.ingredientId) add(`Ingrediente: ${ingredientName}`, () => { state.ingredientId = null; update(); });
  };

  const update = (): void => {
    updateUrl();
    if (ingredientBanner) ingredientBanner.hidden = !state.ingredientId;
    const filtered = sortDrinks(data.drinks.filter(matches));
    countNode.textContent = `${filtered.length} ${filtered.length === 1 ? "bebida" : "bebidas"}${state.ingredientId ? ` com ${ingredientName}` : ""}`;
    fill(resultsNode);
    if (!filtered.length) {
      resultsNode.appendChild(
        h(
          "div",
          { class: "empty-state empty-state--wide" },
          h("span", { class: "empty-state__icon", html: icon("search") }),
          h("h3", { text: "Nenhuma bebida com esses filtros." }),
          h("p", { text: "Tente outra busca ou limpe os filtros para ver o menu inteiro." }),
          h("button", { type: "button", class: "button button--primary", onclick: reset }, "Limpar filtros"),
        ),
      );
    } else {
      resultsNode.append(...filtered.map((drink) => createDrinkCard(drink, data, { scale: 3 })));
    }
    paintActiveFilters();
  };

  const setCategory = (category: Categoria | "todas"): void => {
    state.category = category;
    categoryGroup.querySelectorAll<HTMLButtonElement>("[data-cat]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.cat === category ? "true" : "false");
    });
    update();
  };

  const reset = (): void => {
    state.q = "";
    state.category = "todas";
    state.recipeOnly = false;
    state.method = "todos";
    state.alcohol = "todas";
    state.sort = "az";
    state.ingredientId = null;
    searchInput.value = "";
    recipeToggle.querySelector<HTMLInputElement>("input")!.checked = false;
    methodSelect.value = "todos";
    alcoholSelect.value = "todas";
    sortSelect.value = "az";
    setCategory("todas");
  };

  searchInput.addEventListener("input", () => {
    state.q = searchInput.value;
    update();
  });

  const ingredientBanner = ingredient
    ? h(
        "div",
        { class: "ingredient-banner" },
        h(
          "div",
          {},
          h("p", { class: "eyebrow", text: "Filtro por ingrediente" }),
          h("h2", { text: `Bebidas com ${ingredient.nome}` }),
          h("p", { class: "ingredient-banner__desc", text: ingredient.descricao }),
        ),
        h(
          "button",
          {
            type: "button",
            class: "button button--ghost button--small",
            onclick: () => {
              state.ingredientId = null;
              update();
            },
          },
          h("span", { html: icon("x") }),
          "Remover filtro",
        ),
      )
    : null;

  update();

  return h(
    "div",
    { class: "page page--menu" },
    h(
      "header",
      { class: "page-head" },
      h("p", { class: "eyebrow", text: "Cardápio completo" }),
      h("div", { class: "page-head__row" }, h("h1", { text: "Menu" }), h("p", { class: "page-head__note", text: "Tudo o que passa pelo balcão do Dumont Station." })),
    ),
    ingredientBanner,
    h(
      "section",
      { class: "menu-toolbar", "aria-label": "Filtros do menu" },
      h(
        "div",
        { class: "menu-search-row" },
        h("span", { class: "field-icon", html: icon("search") }),
        searchInput,
        h("button", { type: "button", class: "button button--ghost button--small", onclick: reset }, "Limpar"),
      ),
      h(
        "div",
        { class: "menu-filter-row" },
        categoryGroup,
      ),
      h(
        "div",
        { class: "menu-controls" },
        recipeToggle,
        h("label", { class: "field field--inline" }, h("span", { class: "field-label", text: "Álcool" }), alcoholSelect),
        h("label", { class: "field field--inline" }, h("span", { class: "field-label", text: "Método" }), methodSelect),
        h("label", { class: "field field--inline" }, h("span", { class: "field-label", text: "Ordenar" }), sortSelect),
      ),
      activeFilters,
    ),
    h(
      "div",
      { class: "menu-results-head" },
      countNode,
      h("p", { class: "menu-results-note", text: "Dados extraídos dos protótipos; receitas ausentes aparecem como base de bar." }),
    ),
    resultsNode,
  );
}
