import type { AppContext } from "../lib/context";
import { h } from "../lib/dom";
import { icon } from "../lib/icons";
import { parseHash } from "../lib/router";
import {
  favoritesCount,
  getThemePreference,
  setThemePreference,
  themePreferenceLabel,
  type ThemePreference,
} from "../lib/state";

const NAV_ITEMS = [
  { path: "/", label: "Início", match: ["/"] },
  { path: "/menu", label: "Menu", match: ["/menu", "/bebida"] },
  { path: "/o-que-posso-fazer", label: "O que posso fazer?", match: ["/o-que-posso-fazer"] },
  { path: "/guia", label: "Guia", match: ["/guia"] },
  { path: "/favoritos", label: "Favoritos", match: ["/favoritos"] },
];

function activeFor(path: string): string {
  const item = NAV_ITEMS.find((entry) =>
    entry.match.some((match) => (match === "/" ? path === "/" : path === match || path.startsWith(`${match}/`))),
  );
  return item?.path ?? "";
}

function themeIcon(preference: ThemePreference): string {
  if (preference === "claro") return "sun";
  if (preference === "escuro") return "moon";
  return "monitor";
}

export function createHeader(ctx: AppContext): HTMLElement {
  const favoriteCount = h("span", { class: "favorite-count", text: String(favoritesCount()) });
  const mobileFavoriteCount = h("span", { class: "favorite-count", text: String(favoritesCount()) });

  const navLinks = NAV_ITEMS.map((item) =>
    h(
      "a",
      { class: "nav-link", href: `#${item.path}`, "data-nav": item.path },
      item.label,
      item.path === "/favoritos" ? favoriteCount : null,
    ),
  );
  const mobileLinks = NAV_ITEMS.map((item) =>
    h(
      "a",
      { class: "mobile-nav-link", href: `#${item.path}`, "data-nav": item.path },
      item.label,
      item.path === "/favoritos" ? mobileFavoriteCount : null,
    ),
  );

  const searchButton = h(
    "button",
    {
      type: "button",
      class: "search-trigger",
      "aria-describedby": "busca-global-ajuda",
      title: "Abrir busca global (Ctrl K)",
      onclick: () => ctx.actions.openSearch(),
    },
    h("span", { class: "search-trigger__icon", html: icon("search") }),
    h("span", { class: "search-trigger__label", text: "Buscar" }),
    h("kbd", { class: "search-trigger__kbd", text: "/" }),
  );

  const preference = getThemePreference();
  const themeIconSlot = h("span", { class: "theme-icon", html: icon(themeIcon(preference)) });
  const themeLabel = h("span", { class: "theme-label", text: themePreferenceLabel(preference) });
  const themeButtons = (["auto", "escuro", "claro"] as ThemePreference[]).map((value) =>
    h(
      "button",
      {
        type: "button",
        class: "theme-option",
        "data-theme-option": value,
        "aria-pressed": value === preference ? "true" : "false",
        onclick: (event: MouseEvent) => {
          event.stopPropagation();
          setThemePreference(value);
          themeDetails.open = false;
        },
      },
      h("span", { class: "theme-option__icon", html: icon(themeIcon(value)) }),
      h("span", { text: themePreferenceLabel(value) }),
      h("span", { class: "theme-option__check", html: icon("check") }),
    ),
  );

  const themeDetails = h(
    "details",
    { class: "theme-switcher" },
    h(
      "summary",
      { class: "theme-summary" },
      themeIconSlot,
      h("span", { class: "visually-hidden", text: "Tema: " }),
      themeLabel,
      h("span", { class: "theme-chevron", html: icon("chevron") }),
    ),
    h(
      "div",
      { class: "theme-menu", role: "group", "aria-label": "Tema da interface" },
      h("p", { class: "theme-menu__title", text: "Tema" }),
      ...themeButtons,
    ),
  ) as HTMLDetailsElement;

  const mobileToggle = h(
    "button",
    {
      type: "button",
      class: "mobile-toggle",
      "aria-label": "Abrir menu",
      "aria-expanded": "false",
      onclick: () => {
        const open = mobileToggle.getAttribute("aria-expanded") !== "true";
        mobileToggle.setAttribute("aria-expanded", String(open));
        mobileToggle.classList.toggle("is-open", open);
        mobileNav.hidden = !open;
        mobileToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      },
    },
    h("span", { html: icon("menu") }),
  );

  const mobileNav = h(
    "nav",
    { class: "mobile-nav", id: "mobile-nav", "aria-label": "Navegação principal" },
    ...mobileLinks,
    h("p", { class: "mobile-nav-note", text: "Guia de fã, não oficial · Dumont Station SS14" }),
  );
  mobileNav.hidden = true;

  const header = h(
    "header",
    { class: "site-header" },
    h(
      "div",
      { class: "header-inner wrap" },
      h(
        "a",
        { class: "brand", href: "#/" },
        h("span", { class: "brand-mark", "aria-hidden": "true", text: "DS" }),
        h(
          "span",
          { class: "brand-copy" },
          h("span", { class: "brand-kicker", text: "Dumont Station · SS14" }),
          h("span", { class: "brand-name", text: "Guia do Barman" }),
        ),
      ),
      h("nav", { class: "main-nav", "aria-label": "Navegação principal" }, ...navLinks),
      h("span", {
        id: "busca-global-ajuda",
        class: "visually-hidden",
        text: "Abre a busca global. Atalhos: barra ou Ctrl K.",
      }),
      h(
        "div",
        { class: "header-actions" },
        searchButton,
        themeDetails,
        mobileToggle,
      ),
    ),
    mobileNav,
  );

  const syncActive = (): void => {
    const path = parseHash().path;
    const active = activeFor(path);
    header.querySelectorAll<HTMLElement>("[data-nav]").forEach((link) => {
      const isActive = link.dataset.nav === active;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    mobileNav.hidden = true;
    mobileToggle.setAttribute("aria-expanded", "false");
    mobileToggle.classList.remove("is-open");
    mobileToggle.setAttribute("aria-label", "Abrir menu");
  };

  const syncTheme = (): void => {
    const current = getThemePreference();
    themeIconSlot.innerHTML = icon(themeIcon(current));
    themeLabel.textContent = themePreferenceLabel(current);
    themeDetails.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.themeOption === current ? "true" : "false");
    });
  };

  const syncFavorites = (): void => {
    favoriteCount.textContent = String(favoritesCount());
    mobileFavoriteCount.textContent = String(favoritesCount());
  };

  window.addEventListener("hashchange", syncActive);
  window.addEventListener("guia:tema", syncTheme);
  window.addEventListener("guia:favoritos", syncFavorites);
  document.addEventListener("click", (event) => {
    if (!themeDetails.open) return;
    if (!themeDetails.contains(event.target as Node)) themeDetails.open = false;
  });
  syncActive();
  syncTheme();
  syncFavorites();

  return header;
}

export function createFooter(ctx: AppContext): HTMLElement {
  const credits = ctx.data.credits;
  return h(
    "footer",
    { class: "site-footer" },
    h(
      "div",
      { class: "wrap footer-grid" },
      h(
        "div",
        { class: "footer-brand" },
        h(
          "a",
          { class: "brand brand--footer", href: "#/" },
          h("span", { class: "brand-mark", "aria-hidden": "true", text: "DS" }),
          h(
            "span",
            { class: "brand-copy" },
            h("span", { class: "brand-kicker", text: "Guia de fã · não oficial" }),
            h("span", { class: "brand-name", text: "Guia do Barman" }),
          ),
        ),
        h("p", { class: "footer-note", text: credits.aviso }),
      ),
      h(
        "nav",
        { class: "footer-nav", "aria-label": "Links do rodapé" },
        h("p", { class: "footer-title", text: "Navegar" }),
        h("a", { href: "#/menu", text: "Menu completo" }),
        h("a", { href: "#/o-que-posso-fazer", text: "O que posso fazer?" }),
        h("a", { href: "#/guia", text: "Guia do barman" }),
        h("a", { href: "#/favoritos", text: "Favoritos" }),
        h("a", { href: "#/creditos", text: "Créditos e licenças" }),
      ),
      h(
        "div",
        { class: "footer-meta" },
        h("p", { class: "footer-title", text: "Sobre os dados" }),
        h("p", {
          class: "footer-meta-line",
          text: `${ctx.data.drinks.length} bebidas e ${ctx.data.drinks.reduce((sum, drink) => sum + drink.receitas.length, 0)} receitas lidas dos protótipos do jogo.`,
        }),
        h("p", { class: "footer-meta-line" }, "Commit ", h("code", { text: credits.fonte.commit })),
        h(
          "a",
          { class: "footer-link", href: "#/creditos" },
          "Licenças dos sprites e atribuições ",
          h("span", { html: icon("arrow") }),
        ),
        h("p", { class: "footer-meta-line footer-meta-line--shortcuts" }, "Atalhos: ", h("kbd", { text: "/" }), " busca · ", h("kbd", { text: "Ctrl K" }), " busca rápida"),
      ),
    ),
    h(
      "div",
      { class: "footer-bottom wrap" },
      h("span", { text: "Feito por fãs, para fãs de bartending em SS14." }),
      h("span", { text: "Dumont Station · Gaby Station · Space Station 14" }),
    ),
  );
}
