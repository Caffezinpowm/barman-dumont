import "./style.css";

import { createFooter, createHeader } from "./components/layout";
import { SearchDialog } from "./components/search-dialog";
import { loadSiteData } from "./lib/data";
import type { AppActions, AppContext } from "./lib/context";
import { h } from "./lib/dom";
import { icon } from "./lib/icons";
import { isFormField } from "./lib/dom";
import { parseHash, type ParsedRoute } from "./lib/router";
import { initTheme } from "./lib/state";
import { showToast } from "./lib/toast";
import { renderCredits } from "./pages/credits";
import { renderDrink } from "./pages/drink";
import { renderFavorites } from "./pages/favorites";
import { renderGuide } from "./pages/guide";
import { renderHome } from "./pages/home";
import { renderMaker } from "./pages/maker";
import { renderMenu } from "./pages/menu";
import { renderNotFound } from "./pages/not-found";

function requireAppRoot(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>("#app");
  if (!element) throw new Error("Elemento #app não encontrado.");
  return element;
}

const app = requireAppRoot();

initTheme();
paintBoot();

const BASE_TITLE = "Guia do Barman · Dumont Station";

function paintBoot(): void {
  document.title = "Abrindo o bar · Guia do Barman";
  app.replaceChildren(
    h(
      "div",
      { class: "boot" },
      h("span", { class: "boot__mark", text: "DS" }),
      h("p", { class: "eyebrow", text: "Dumont Station · SS14" }),
      h("h1", { text: "Guia do Barman" }),
      h("p", { class: "boot__status", text: "Lendo receitas, sprites e o manual do balcão…" }),
      h("div", { class: "boot__bar", role: "progressbar", "aria-label": "Carregando o guia" }, h("span")),
    ),
  );
}

function paintBootError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  document.title = "Falha ao carregar · Guia do Barman";
  app.replaceChildren(
    h(
      "div",
      { class: "boot boot--error" },
      h("span", { class: "boot__mark", text: "DS" }),
      h("p", { class: "eyebrow", text: "O balcão não abriu" }),
      h("h1", { text: "Falha ao carregar os dados" }),
      h("p", {
        class: "boot__error",
        text: "O site precisa dos arquivos JSON e dos sprites gerados pelo extrator. Confira se a extração foi executada e se o site está sendo servido por HTTP (npm run dev ou npm run preview).",
      }),
      h("p", { class: "boot__error" }, h("code", { text: message })),
      h(
        "div",
        { class: "boot__actions" },
        h(
          "button",
          { type: "button", class: "button button--primary", onclick: () => window.location.reload() },
          h("span", { html: icon("arrow") }),
          "Tentar novamente",
        ),
        h("a", { class: "button button--ghost", href: "#/" }, "Voltar ao início"),
      ),
    ),
  );
  console.error(error);
}

function crashPage(error: unknown): HTMLElement {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  return h(
    "div",
    { class: "page page--notfound" },
    h(
      "div",
      { class: "notfound-card" },
      h("p", { class: "eyebrow", text: "Erro inesperado" }),
      h("h1", { text: "Algo derramou no balcão." }),
      h("p", {
        class: "notfound-lede",
        text: "Esta página não pôde ser montada. Volte ao menu ou tente recarregar o guia.",
      }),
      h("p", { class: "boot__error" }, h("code", { text: message })),
      h(
        "div",
        { class: "notfound-actions" },
        h("a", { class: "button button--primary", href: "#/" }, "Ir para o início ", h("span", { html: icon("arrow") })),
        h("button", { type: "button", class: "button button--ghost", onclick: () => window.location.reload() }, "Recarregar"),
      ),
    ),
  );
}

function titleFor(route: ParsedRoute): string {
  switch (route.segments[0]) {
    case undefined:
      return BASE_TITLE;
    case "menu":
      return `Menu completo · Guia do Barman`;
    case "bebida":
      return `Drink · Guia do Barman`;
    case "o-que-posso-fazer":
      return `O que posso fazer? · Guia do Barman`;
    case "guia":
      return `Guia do barman · Guia do Barman`;
    case "favoritos":
      return `Favoritos · Guia do Barman`;
    case "creditos":
      return `Créditos e licenças · Guia do Barman`;
    default:
      return `Página não encontrada · Guia do Barman`;
  }
}

async function boot(): Promise<void> {
  let data;
  try {
    data = await loadSiteData();
  } catch (error) {
    paintBootError(error);
    return;
  }

  let searchDialog: SearchDialog | null = null;

  const actions: AppActions = {
    openSearch(query = "") {
      searchDialog?.open(query);
    },
    closeSearch() {
      searchDialog?.close();
    },
    toast(message, tone = "ok") {
      showToast(message, tone);
    },
    refreshHeader() {
      window.dispatchEvent(new CustomEvent("guia:tema"));
      window.dispatchEvent(new CustomEvent("guia:favoritos"));
    },
    currentPath() {
      return parseHash().path;
    },
  };

  const ctx: AppContext = { data, actions };

  const main = h("main", {
    class: "site-main",
    id: "conteudo",
    tabindex: "-1",
  });

  const skipLink = h(
    "a",
    {
      class: "skip-link",
      href: "#conteudo",
      onclick: (event: MouseEvent) => {
        event.preventDefault();
        main.focus();
        main.scrollIntoView({ block: "start" });
      },
    },
    "Pular para o conteúdo",
  );

  let firstRender = true;
  let currentRoute = "";

  const render = (): void => {
    const route = parseHash();
    const key = `${route.path}?${route.query.toString()}`;
    try {
      let page: HTMLElement;
      let managesTitle = false;

      switch (route.segments[0]) {
        case undefined:
          page = renderHome(ctx);
          break;
        case "menu":
          page = renderMenu(ctx, route);
          break;
        case "bebida":
          page = renderDrink(ctx, route);
          managesTitle = true;
          break;
        case "o-que-posso-fazer":
          page = renderMaker(ctx);
          break;
        case "guia":
          page = renderGuide(ctx, route);
          break;
        case "favoritos":
          page = renderFavorites(ctx);
          break;
        case "creditos":
          page = renderCredits(ctx);
          break;
        default:
          page = renderNotFound(ctx);
          managesTitle = true;
      }

      main.replaceChildren(page);
      if (!managesTitle) document.title = titleFor(route);

      const routeChanged = key !== currentRoute;
      currentRoute = key;
      if (routeChanged) {
        window.scrollTo({ top: 0, behavior: "auto" });
        if (!firstRender) main.focus({ preventScroll: true });
        firstRender = false;
      }
    } catch (error) {
      main.replaceChildren(crashPage(error));
      document.title = "Erro · Guia do Barman";
    }
  };

  searchDialog = new SearchDialog(ctx);

  const header = createHeader(ctx);
  const footer = createFooter(ctx);
  const toastRoot = h("div", { id: "toasts" });
  app.replaceChildren(skipLink, header, main, footer, toastRoot);

  render();

  window.addEventListener("hashchange", render);

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;

    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (searchDialog?.isOpen()) searchDialog.close();
      else searchDialog?.open();
      return;
    }

    if (
      event.key === "/" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isFormField(event.target)
    ) {
      event.preventDefault();
      searchDialog?.open();
    }
  });

  // Uma rota sem hash (por exemplo, /#/menu) já é tratada por parseHash.
  // Este listener cobre links colados com URL completa e recarregamentos.
  window.addEventListener("pageshow", () => {
    if (!window.location.hash) return;
    const key = `${parseHash().path}?${parseHash().query.toString()}`;
    if (key !== currentRoute) render();
  });

  // A árvore de preparo usa <details>; abre tudo na impressão e restaura depois.
  let printDetails: Array<[HTMLDetailsElement, boolean]> = [];
  window.addEventListener("beforeprint", () => {
    printDetails = Array.from(
      document.querySelectorAll<HTMLDetailsElement>("details.prep-tree, details.prep-branch"),
    ).map((element) => [element, element.open]);
    printDetails.forEach(([element]) => {
      element.open = true;
    });
  });
  window.addEventListener("afterprint", () => {
    printDetails.forEach(([element, open]) => {
      element.open = open;
    });
    printDetails = [];
  });
}

void boot();
