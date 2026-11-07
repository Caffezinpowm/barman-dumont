import type { AppContext } from "../lib/context";
import { assetPath } from "../lib/data";
import { h } from "../lib/dom";
import { icon } from "../lib/icons";
import { copyText } from "../lib/toast";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function renderCredits(ctx: AppContext): HTMLElement {
  const { credits } = ctx.data;
  const licenseCounts = new Map<string, number>();
  for (const sprite of credits.licencasSprites) {
    licenseCounts.set(sprite.licenca, (licenseCounts.get(sprite.licenca) ?? 0) + 1);
  }
  const sortedLicenses = [...licenseCounts.entries()].sort((a, b) => b[1] - a[1]);

  const command = `npm run extract -- --repo "<caminho-do-Dumont-Station>"`;

  return h(
    "div",
    { class: "page page--credits" },
    h(
      "header",
      { class: "page-head" },
      h("p", { class: "eyebrow", text: "Transparência" }),
      h("div", { class: "page-head__row" }, h("h1", { text: "Créditos e licenças" }), h("p", { class: "page-head__note", text: "De onde vêm os dados, as imagens e as palavras deste guia." })),
    ),
    h(
      "section",
      { class: "disclaimer" },
      h("span", { class: "disclaimer__mark", html: icon("info") }),
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Aviso importante" }),
        h("h2", { text: "Projeto de fã, não oficial." }),
        h("p", { text: credits.aviso }),
        h("p", { class: "disclaimer__small", text: "Não há vínculo com a Project Dumont, Gaby Station, Goobstation ou Space Station 14. Nomes de drinks, receitas e sprites pertencem aos seus respectivos autores." }),
      ),
    ),
    h(
      "div",
      { class: "credits-grid" },
      h(
        "section",
        { class: "panel credits-panel" },
        h("p", { class: "eyebrow", text: "Fonte dos dados" }),
        h("h2", { text: "Dumont Station" }),
        h(
          "dl",
          { class: "credits-list" },
          h("div", {}, h("dt", { text: "Repositório" }), h("dd", {}, h("a", { href: credits.fonte.repositorio, target: "_blank", rel: "noreferrer" }, credits.fonte.repositorio, " ", h("span", { html: icon("arrow-up-right") })))),
          h("div", {}, h("dt", { text: "Commit" }), h("dd", {}, h("code", { text: credits.fonte.commit }))),
          h("div", {}, h("dt", { text: "Extração" }), h("dd", { text: formatDate(credits.fonte.geradoEm) })),
        ),
        h("p", { class: "credits-note", text: "Todos os dados de bebidas, receitas e equipamentos foram lidos dos protótipos YAML do repositório. O site não mantém uma cópia editada à mão dessas informações." }),
        h(
          "div",
          { class: "command-box" },
          h("code", { text: command }),
          h(
            "button",
            {
              type: "button",
              class: "icon-button",
              "aria-label": "Copiar comando de extração",
              onclick: () => copyText(command, "Comando copiado."),
            },
            h("span", { html: icon("copy") }),
          ),
        ),
        h(
          "a",
          { class: "text-link", href: assetPath("data/relatorio.md"), target: "_blank", rel: "noreferrer" },
          "Abrir relatório de extração ",
          h("span", { html: icon("arrow-up-right") }),
        ),
      ),
      h(
        "section",
        { class: "panel credits-panel" },
        h("p", { class: "eyebrow", text: "Licença do projeto" }),
        h("h2", { text: "Código e dados" }),
        h("p", { text: credits.licencaProjeto }),
        h("p", { class: "license-note", text: "Cada sprite mantém o meta.json original com sua licença e atribuição. O site copia os PNGs sem alterar pixels; o tingimento de bebidas metamórficas é feito por máscara CSS no navegador." }),
        h(
          "div",
          { class: "license-summary" },
          ...sortedLicenses.map(([license, count]) =>
            h(
              "div",
              { class: "license-row" },
              h("span", { class: "license-name", text: license }),
              h("span", { class: "license-count", text: `${count} RSIs` }),
            ),
          ),
        ),
        h("p", { class: "credits-note", text: `${credits.licencasSprites.length} RSIs de bebidas e equipamentos catalogados, com ${credits.licencasArquivos.length} arquivos-fonte de licença registrados.` }),
      ),
      h(
        "section",
        { class: "panel credits-panel" },
        h("p", { class: "eyebrow", text: "Agradecimentos" }),
        h("h2", { text: "Quem fez o bar" }),
        h(
          "ul",
          { class: "credits-people" },
          ...credits.creditos.map((name) => h("li", { text: name })),
        ),
        h("p", { class: "credits-note", text: "Os nomes individuais de artistas e contribuidores estão nos metadados dos sprites, na tabela de licenças abaixo." }),
      ),
      h(
        "section",
        { class: "panel credits-panel" },
        h("p", { class: "eyebrow", text: "Ferramentas" }),
        h("h2", { text: "Como este guia foi feito" }),
        h(
          "ol",
          { class: "build-steps" },
          h("li", {}, h("strong", { text: "Leitura tolerante dos YAML" }), " — o extrator preserva tags desconhecidas e resolve cadeias de `parent`."),
          h("li", {}, h("strong", { text: "Locales pt-BR e en-US" }), " — o texto em português é preferido; quando não existe, a interface marca o fallback em inglês."),
          h("li", {}, h("strong", { text: "Sprites RSI" }), " — apenas os estados usados são copiados, sem recompressão ou alteração."),
          h("li", {}, h("strong", { text: "Site estático" }), " — Vite + TypeScript + Tailwind + DaisyUI, com rotas por hash para funcionar no GitHub Pages."),
        ),
        h(
          "ul",
          { class: "tools-list" },
          ...credits.ferramentas.map((tool) => h("li", { text: tool })),
        ),
        h(
          "a",
          { class: "text-link", href: "https://github.com/Project-Dumont/Dumont-Station", target: "_blank", rel: "noreferrer" },
          "Project Dumont no GitHub ",
          h("span", { html: icon("arrow-up-right") }),
        ),
      ),
    ),
    h(
      "details",
      { class: "license-details" },
      h("summary", {}, h("span", { html: icon("book") }), `Licenças de sprites (${credits.licencasSprites.length})`),
      h(
        "div",
        { class: "glass-table-wrap" },
        h(
          "table",
          { class: "glass-table license-table" },
          h(
            "thead",
            {},
            h(
              "tr",
              {},
              h("th", { scope: "col", text: "RSI" }),
              h("th", { scope: "col", text: "Licença" }),
              h("th", { scope: "col", text: "Atribuição" }),
              h("th", { scope: "col", text: "Estados" }),
            ),
          ),
          h(
            "tbody",
            {},
            ...credits.licencasSprites.map((sprite) =>
              h(
                "tr",
                {},
                h("td", {}, h("code", { class: "source-code", text: sprite.rsi })),
                h("td", {}, h("span", { class: "license-badge", text: sprite.licenca })),
                h("td", { class: "copyright-cell", text: sprite.copyright || "—" }),
                h("td", { class: "states-cell", text: sprite.estados.join(", ") }),
              ),
            ),
          ),
        ),
      ),
    ),
    h(
      "details",
      { class: "license-details" },
      h("summary", {}, h("span", { html: icon("book") }), `Licenças dos arquivos-fonte (${credits.licencasArquivos.length})`),
      h(
        "ul",
        { class: "source-license-list" },
        ...credits.licencasArquivos.map((file) =>
          h(
            "li",
            {},
            h("code", { text: file.arquivo }),
            h("span", { class: "license-badge", text: file.licencas.join(", ") }),
          ),
        ),
      ),
    ),
    h("p", { class: "credits-footer-note", text: "Se você é autor de um asset e quer correção de atribuição, abra uma issue no repositório do projeto." }),
  );
}
