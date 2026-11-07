import type { AppContext } from "../lib/context";
import { h } from "../lib/dom";
import { icon } from "../lib/icons";

export function renderNotFound(ctx: AppContext): HTMLElement {
  document.title = "Página não encontrada · Guia do Barman";
  return h(
    "div",
    { class: "page page--notfound" },
    h(
      "div",
      { class: "notfound-card" },
      h("p", { class: "eyebrow", text: "Erro 404 · fora do cardápio" }),
      h("h1", { text: "Essa bebida não está no balcão." }),
      h("p", {
        class: "notfound-lede",
        text: "O link pode estar incompleto, a bebida pode ter mudado de nome ou a página nunca existiu. O menu continua aberto.",
      }),
      h(
        "div",
        { class: "notfound-actions" },
        h("a", { class: "button button--primary", href: "#/menu" }, "Ir para o menu ", h("span", { html: icon("arrow") })),
        h("button", { type: "button", class: "button button--ghost", onclick: () => ctx.actions.openSearch() }, h("span", { html: icon("search") }), "Buscar um drink"),
      ),
      h("p", { class: "notfound-note", text: "Se você chegou por um link antigo, tente buscar pelo nome do drink." }),
    ),
  );
}
