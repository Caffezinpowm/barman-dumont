import type { AppContext } from "../lib/context";
import { h, fill } from "../lib/dom";
import { icon } from "../lib/icons";
import { buildSearchIndex, rankSearch, type SearchEntry, type SearchKind } from "../lib/search-index";

const KIND_ICONS: Record<SearchKind, string> = {
  Bebida: "glass",
  Ingrediente: "bottle",
  Equipamento: "sliders",
  Método: "book",
  Categoria: "filter",
  Guia: "book",
};

const SUGGESTIONS = ["Mojito", "Sem álcool", "shaker", "Café"];

export class SearchDialog {
  private dialog: HTMLDialogElement;
  private input: HTMLInputElement;
  private results: HTMLElement;
  private meta: HTMLElement;
  private entries: SearchEntry[];
  private activeIndex = 0;
  private current: SearchEntry[] = [];

  constructor(ctx: AppContext) {
    this.entries = buildSearchIndex(ctx.data);

    this.input = h("input", {
      type: "search",
      class: "search-input",
      placeholder: "Buscar bebida, ingrediente ou equipamento…",
      autocomplete: "off",
      spellcheck: "false",
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-controls": "search-results",
      "aria-expanded": "true",
      "aria-label": "Buscar no guia",
    }) as HTMLInputElement;

    this.results = h("div", {
      id: "search-results",
      class: "search-results",
      role: "listbox",
      "aria-label": "Resultados da busca",
    });

    this.meta = h("p", { class: "search-meta", "aria-live": "polite" });

    const closeButton = h(
      "button",
      {
        type: "button",
        class: "icon-button search-close",
        "aria-label": "Fechar busca",
        onclick: () => this.close(),
      },
      h("span", { html: icon("x") }),
    );

    this.dialog = h(
      "dialog",
      {
        class: "search-dialog",
        "aria-label": "Busca global",
      },
      h(
        "div",
        { class: "search-shell" },
        h(
          "div",
          { class: "search-head" },
          h("span", { class: "search-head-icon", html: icon("search") }),
          this.input,
          h("kbd", { class: "search-kbd", text: "Esc" }),
          closeButton,
        ),
        h(
          "div",
          { class: "search-status" },
          this.meta,
          h("span", { class: "search-status-note", text: "Bebidas, insumos e equipamentos" }),
        ),
        this.results,
        h(
          "div",
          { class: "search-foot" },
          h("span", {}, h("kbd", { text: "↑" }), h("kbd", { text: "↓" }), " navegar"),
          h("span", {}, h("kbd", { text: "Enter" }), " abrir"),
          h("span", {}, h("kbd", { text: "Esc" }), " fechar"),
        ),
      ),
    ) as HTMLDialogElement;

    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.close();
    });
    this.dialog.addEventListener("close", () => {
      this.input.setAttribute("aria-expanded", "false");
    });
    this.dialog.addEventListener("open", () => {
      this.input.setAttribute("aria-expanded", "true");
    });

    this.input.addEventListener("input", () => this.update());
    this.input.addEventListener("keydown", (event) => this.onKeydown(event));
    this.results.addEventListener("mousemove", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-result-index]");
      if (!target) return;
      const index = Number(target.dataset.resultIndex);
      if (Number.isFinite(index) && index !== this.activeIndex) {
        this.activeIndex = index;
        this.paintActive();
      }
    });

    this.update();
    document.body.appendChild(this.dialog);
  }

  open(query = ""): void {
    if (!this.dialog.open) this.dialog.showModal();
    this.input.value = query;
    this.input.focus();
    this.input.select();
    this.update();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  isOpen(): boolean {
    return this.dialog.open;
  }

  private update(): void {
    const query = this.input.value;
    this.current = rankSearch(this.entries, query, 18);
    this.activeIndex = 0;
    fill(this.results);

    if (!query.trim()) {
      this.meta.textContent = "Atalhos para começar";
      this.results.appendChild(
        h(
          "div",
          { class: "search-empty" },
          h("p", {
            class: "search-empty-title",
            text: "Procure pelo nome do drink, por um ingrediente ou pelo equipamento do balcão.",
          }),
          h(
            "div",
            { class: "search-suggestions" },
            ...SUGGESTIONS.map((suggestion) =>
              h(
                "button",
                {
                  type: "button",
                  class: "suggestion",
                  onclick: () => {
                    this.input.value = suggestion;
                    this.input.focus();
                    this.update();
                  },
                },
                h("span", { html: icon("search") }),
                suggestion,
              ),
            ),
          ),
          h(
            "p",
            { class: "search-empty-note" },
            "Dica: use ",
            h("kbd", { text: "/" }),
            " em qualquer página ou ",
            h("kbd", { text: "Ctrl K" }),
            " para abrir a busca.",
          ),
        ),
      );
      this.input.removeAttribute("aria-activedescendant");
      return;
    }

    this.meta.textContent = this.current.length
      ? `${this.current.length} ${this.current.length === 1 ? "resultado" : "resultados"} para “${query.trim()}”`
      : `Nenhum resultado para “${query.trim()}”`;

    if (!this.current.length) {
      this.results.appendChild(
        h(
          "div",
          { class: "search-empty" },
          h("p", {
            class: "search-empty-title",
            text: "Tente outro nome, ingrediente ou uma categoria.",
          }),
          h(
            "div",
            { class: "search-suggestions" },
            ...SUGGESTIONS.map((suggestion) =>
              h(
                "button",
                {
                  type: "button",
                  class: "suggestion",
                  onclick: () => {
                    this.input.value = suggestion;
                    this.input.focus();
                    this.update();
                  },
                },
                suggestion,
              ),
            ),
          ),
        ),
      );
      this.input.removeAttribute("aria-activedescendant");
      return;
    }

    this.current.forEach((entry, index) => {
      const link = h(
        "a",
        {
          href: entry.href,
          class: "search-result",
          role: "option",
          id: `search-option-${index}`,
          "data-result-index": String(index),
          "aria-selected": index === this.activeIndex ? "true" : "false",
          onclick: () => this.close(),
        },
        h("span", { class: "search-result-icon", html: icon(KIND_ICONS[entry.kind]) }),
        h(
          "span",
          { class: "search-result-copy" },
          h("span", { class: "search-result-title", text: entry.title }),
          h("span", { class: "search-result-subtitle", text: entry.subtitle }),
        ),
        h("span", { class: "search-result-kind", text: entry.kind }),
        h("span", { class: "search-result-arrow", html: icon("arrow") }),
      );
      this.results.appendChild(link);
    });

    this.paintActive();
  }

  private paintActive(): void {
    const options = this.results.querySelectorAll<HTMLAnchorElement>("[data-result-index]");
    options.forEach((option, index) => {
      option.setAttribute("aria-selected", index === this.activeIndex ? "true" : "false");
      option.classList.toggle("is-active", index === this.activeIndex);
    });
    const active = options[this.activeIndex];
    if (active) this.input.setAttribute("aria-activedescendant", active.id);
    else this.input.removeAttribute("aria-activedescendant");
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (this.current.length) {
        this.activeIndex = (this.activeIndex + 1) % this.current.length;
        this.paintActive();
        this.results.querySelector<HTMLElement>(".is-active")?.scrollIntoView({ block: "nearest" });
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (this.current.length) {
        this.activeIndex = (this.activeIndex - 1 + this.current.length) % this.current.length;
        this.paintActive();
        this.results.querySelector<HTMLElement>(".is-active")?.scrollIntoView({ block: "nearest" });
      }
    } else if (event.key === "Enter") {
      if (this.current.length) {
        event.preventDefault();
        this.results.querySelector<HTMLAnchorElement>(".is-active")?.click();
      }
    }
  }
}
