import { createDrinkCard } from "../components/drink-card";
import type { AppContext } from "../lib/context";
import { h, fill } from "../lib/dom";
import { icon } from "../lib/icons";
import { getFavorites } from "../lib/state";
import type { Drink } from "../lib/types";

export function renderFavorites(ctx: AppContext): HTMLElement {
  const grid = h("div", { class: "card-grid card-grid--menu" });
  const count = h("p", { class: "menu-count", "aria-live": "polite" });
  const empty = h("div", { class: "empty-state empty-state--wide" });

  const paint = (): void => {
    const favorites = getFavorites();
    const drinks = favorites
      .map((id) => ctx.data.drinks.find((drink) => drink.id === id))
      .filter((drink): drink is Drink => Boolean(drink));
    count.textContent = `${drinks.length} ${drinks.length === 1 ? "drink salvo" : "drinks salvos"}`;
    fill(grid);
    fill(empty);
    if (!drinks.length) {
      empty.append(
        h("span", { class: "empty-state__icon", html: icon("heart") }),
        h("h2", { text: "Sua lista ainda está vazia." }),
        h("p", { text: "Toque no coração de qualquer drink para guardar a receita aqui. Os favoritos ficam apenas neste navegador." }),
        h(
          "div",
          { class: "empty-actions" },
          h("a", { class: "button button--primary", href: "#/menu" }, "Explorar o menu ", h("span", { html: icon("arrow") })),
          h("a", { class: "button button--ghost", href: "#/o-que-posso-fazer" }, "Ver o que posso fazer"),
        ),
      );
    } else {
      grid.append(...drinks.map((drink) => createDrinkCard(drink, ctx.data, { scale: 3 })));
    }
  };

  paint();
  const repaint = (): void => {
    window.setTimeout(paint, 0);
  };
  const cleanup = (): void => {
    window.removeEventListener("guia:favoritos", repaint);
    window.removeEventListener("hashchange", cleanup);
  };
  window.addEventListener("guia:favoritos", repaint);
  window.addEventListener("hashchange", cleanup);

  return h(
    "div",
    { class: "page page--favorites" },
    h(
      "header",
      { class: "page-head" },
      h("p", { class: "eyebrow", text: "Sua seleção" }),
      h("div", { class: "page-head__row" }, h("h1", { text: "Favoritos" }), h("p", { class: "page-head__note", text: "Os drinks que você não quer esquecer no meio do turno." })),
    ),
    h("div", { class: "favorites-head" }, count, h("p", { class: "favorites-note", text: "Salvos neste navegador, sem conta e sem servidor." })),
    empty,
    grid,
  );
}
