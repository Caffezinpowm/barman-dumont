import { createEquipmentArt, createEquipmentSpriteArt, createVendingArt } from "../components/sprite";
import type { AppContext } from "../lib/context";
import { h, fill } from "../lib/dom";
import { icon } from "../lib/icons";
import type { ParsedRoute } from "../lib/router";
import type { Equipment, GuideBlock, VendingItem } from "../lib/types";

const TYPE_LABELS: Record<string, string> = {
  dispensa: "Dispensa",
  vending: "Máquina de vendas",
  vidraria: "Vidraria",
  ferramenta: "Ferramenta",
  outro: "Equipamento",
};

function equipmentTargetId(id: string): string {
  return `eq-${id.replace(/[^a-z0-9_-]/gi, "-")}`;
}

function createMethodCard(ctx: AppContext, methodId: string): HTMLElement {
  const method = ctx.data.guide.metodos.find((item) => item.id === methodId);
  if (!method) return h("div");
  const usages = ctx.data.drinks.reduce(
    (sum, drink) => sum + drink.receitas.filter((recipe) => recipe.metodo === method.id).length,
    0,
  );
  return h(
    "article",
    { class: "method-card", id: `metodo-${method.id}` },
    h("div", { class: "method-card__art" }, createEquipmentSpriteArt(method.entidadeSprite, ctx.data, method.entidadeNome ?? method.verbo, 3)),
    h(
      "div",
      { class: "method-card__copy" },
      h("p", { class: "eyebrow", text: `Método · ${usages} ${usages === 1 ? "receita" : "receitas"}` }),
      h("h3", { text: method.verbo }),
      method.entidadeNome ? h("p", { class: "method-tool", text: `Ferramenta: ${method.entidadeNome}` }) : null,
      h("p", { class: "method-desc", text: method.descricao }),
    ),
  );
}

function createEquipmentCard(ctx: AppContext, equipment: Equipment, options: { dispenser?: boolean } = {}): HTMLElement {
  return h(
    "article",
    { class: "equipment-card", id: equipmentTargetId(equipment.id) },
    h("div", { class: "equipment-card__art" }, createEquipmentArt(equipment, ctx.data, 3)),
    h(
      "div",
      { class: "equipment-card__copy" },
      h(
        "p",
        { class: "eyebrow" },
        TYPE_LABELS[equipment.tipo] ?? "Equipamento",
        equipment.capacidade !== null ? ` · ${equipment.capacidade}u` : "",
      ),
      h("h3", { text: equipment.nome }),
      h("p", { class: "equipment-desc", text: equipment.descricao || "Sem descrição no repositório." }),
      h(
        "div",
        { class: "equipment-meta" },
        equipment.capacidade !== null
          ? h("span", { class: "data-chip", text: `Capacidade ${equipment.capacidade}u` })
          : null,
        equipment.cabeNaDispensa ? h("span", { class: "data-chip", text: "Cabe na dispensa" }) : null,
        equipment.traducao === "en"
          ? h("span", { class: "lang-badge", title: "Texto original em inglês", text: "EN" })
          : null,
        options.dispenser
          ? h("a", { class: "text-link text-link--small", href: "#/guia?secao=dispensas" }, "Ver conteúdo ", h("span", { html: icon("arrow") }))
          : null,
      ),
    ),
  );
}

function createGuideBlocks(ctx: AppContext): HTMLElement[] {
  const lookup = new Map<string, Equipment>();
  for (const item of [
    ...ctx.data.guide.equipamentos,
    ...ctx.data.guide.extras,
    ...ctx.data.guide.vidraria,
    ...ctx.data.guide.dispensas,
  ]) lookup.set(item.id, item);

  return ctx.data.guide.blocos.map((block: GuideBlock) => {
    if (block.tipo === "titulo") {
      return h("h2", { class: "guide-block-title", text: block.texto ?? "" });
    }
    if (block.tipo === "paragrafo") {
      return h("p", { class: "guide-paragraph", text: block.texto ?? "" });
    }
    if (block.tipo === "link") {
      return h(
        "p",
        { class: "guide-paragraph" },
        h("a", { class: "text-link", href: block.href ?? "#/menu" }, block.texto ?? "Abrir", " ", h("span", { html: icon("arrow") })),
      );
    }
    return h(
      "div",
      { class: "guide-entity-strip" },
      ...(block.entidades ?? []).map((entity) => {
        const equipment = lookup.get(entity.id);
        if (!equipment) {
          return h("span", { class: "guide-entity-fallback", text: entity.legenda ?? "Equipamento" });
        }
        return h(
          "a",
          { class: "guide-entity", href: `#/guia?eq=${encodeURIComponent(equipment.id)}` },
          h("span", { class: "guide-entity__art" }, createEquipmentArt(equipment, ctx.data, 2)),
          h("span", { class: "guide-entity__name", text: equipment.nome }),
          entity.legenda ? h("span", { class: "guide-entity__caption", text: entity.legenda }) : null,
        );
      }),
    );
  });
}

function createDispenserSection(ctx: AppContext): HTMLElement {
  return h(
    "section",
    { class: "guide-section", id: "guide-dispensers", "aria-labelledby": "dispensers-heading" },
    h(
      "div",
      { class: "section-head" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Estoque inicial" }),
        h("h2", { id: "dispensers-heading", text: "Dispensas" }),
      ),
      h("span", { class: "section-count", text: `${ctx.data.guide.dispensas.length} máquinas` }),
    ),
    h("p", {
      class: "section-lede",
      text: "O que cada dispensa coloca à disposição no começo do turno. As quantidades são as dos frascos iniciais dos protótipos.",
    }),
    h(
      "div",
      { class: "dispenser-grid" },
      ...ctx.data.guide.dispensas.map((dispenser) =>
        h(
          "article",
          { class: "panel dispenser-panel", id: equipmentTargetId(dispenser.id) },
          h(
            "div",
            { class: "dispenser-head" },
            h("div", { class: "dispenser-head__art" }, createEquipmentArt(dispenser, ctx.data, 3)),
            h(
              "div",
              {},
              h("p", { class: "eyebrow", text: "Dispensa" }),
              h("h3", { text: dispenser.nome }),
              h("p", { class: "dispenser-sub", text: `${dispenser.conteudo.length} reagentes disponíveis` }),
            ),
          ),
          h(
            "ul",
            { class: "dispenser-list" },
            ...dispenser.conteudo
              .slice()
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((item) =>
                h(
                  "li",
                  { class: "dispenser-item" },
                  h(
                    "a",
                    { href: item.bebidaId ? `#/bebida/${encodeURIComponent(item.bebidaId)}` : `#/menu?ing=${encodeURIComponent(item.reagenteId)}`, class: "dispenser-name" },
                    item.nome,
                  ),
                  h("span", { class: "dispenser-amount", text: `${item.quantidade}u` }),
                ),
              ),
          ),
        ),
      ),
    ),
  );
}

function createVendingSection(ctx: AppContext): HTMLElement | null {
  const vending = ctx.data.guide.vending;
  if (!vending) return null;
  const groups: Array<{ id: string; label: string; items: VendingItem[] }> = [
    { id: "estoque", label: "Estoque", items: vending.inventario },
    { id: "contrabando", label: "Contrabando", items: vending.contrabando },
    { id: "emagged", label: "Destravada (emag)", items: vending.emagged },
  ].filter((group) => group.items.length > 0);
  const list = h("div", { class: "vending-list" });
  const buttons = h("div", { class: "vending-tabs", role: "group", "aria-label": "Categorias da máquina" });

  const paint = (groupId: string): void => {
    const group = groups.find((item) => item.id === groupId) ?? groups[0];
    buttons.replaceChildren(
      ...groups.map((entry) =>
        h(
          "button",
          {
            type: "button",
            class: "pill vending-tab",
            "aria-pressed": entry.id === group.id ? "true" : "false",
            onclick: () => paint(entry.id),
          },
          entry.label,
          h("span", { class: "pill-count", text: String(entry.items.length) }),
        ),
      ),
    );
    fill(
      list,
      ...group.items.map((item) =>
        h(
          "div",
          { class: "vending-item" },
          item.sprite
            ? h("span", { class: "vending-item__art" }, createEquipmentSpriteArt(item.sprite, ctx.data, item.nome, 2))
            : h("span", { class: "vending-item__art vending-item__art--empty", html: icon("bottle") }),
          h(
            "span",
            { class: "vending-item__copy" },
            h("span", { class: "vending-item__name", text: item.nome }),
            h("span", { class: "vending-item__type", text: item.tipo }),
          ),
          item.traducao === "en" ? h("span", { class: "lang-badge", title: "Texto original em inglês", text: "EN" }) : null,
          h("span", { class: "vending-item__qty", text: `${item.quantidade}×` }),
        ),
      ),
    );
  };
  paint(groups[0]?.id ?? "estoque");

  return h(
    "section",
    { class: "guide-section", "aria-labelledby": "vending-heading", id: equipmentTargetId(vending.id) },
    h(
      "div",
      { class: "section-head" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Reposição" }),
        h("h2", { id: "vending-heading", text: vending.nome }),
      ),
      h("span", { class: "section-count", text: `${vending.inventario.length} itens no estoque` }),
    ),
    h("p", {
      class: "section-lede",
      text: vending.descricao || "Máquina de vendas de bebidas do bar.",
    }),
    h(
      "div",
      { class: "vending-panel panel" },
      h("div", { class: "vending-panel__art" }, createVendingArt(ctx.data, 4)),
      h("div", { class: "vending-panel__content" }, buttons, list),
    ),
  );
}

function createGlassTable(ctx: AppContext): HTMLElement {
  const items = ctx.data.guide.vidraria;
  return h(
    "section",
    { class: "guide-section", id: "guide-vidraria", "aria-labelledby": "vidraria-heading" },
    h(
      "div",
      { class: "section-head" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Referência rápida" }),
        h("h2", { id: "vidraria-heading", text: "Vidraria e capacidades" }),
      ),
      h("span", { class: "section-count", text: `${items.length} recipientes` }),
    ),
    h("p", {
      class: "section-lede",
      text: "Use a calculadora de lote na página de cada drink para escolher a vasilha e não derramar. Capacidades reais dos protótipos.",
    }),
    h(
      "div",
      { class: "glass-table-wrap" },
      h(
        "table",
        { class: "glass-table" },
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            h("th", { scope: "col", text: "Recipiente" }),
            h("th", { scope: "col", text: "Uso" }),
            h("th", { scope: "col", text: "Tipo" }),
            h("th", { scope: "col", text: "Capacidade" }),
            h("th", { scope: "col", text: "Fonte da capacidade" }),
          ),
        ),
        h(
          "tbody",
          {},
          ...items.map((item) =>
            h(
              "tr",
              {},
              h("td", {}, h("span", { class: "glass-name" }, createEquipmentArt(item, ctx.data, 2), h("span", { text: item.nome }))),
              h("td", { text: item.uso ?? item.tipo }),
              h("td", { text: TYPE_LABELS[item.tipo] ?? item.tipo }),
              h("td", { class: "numeric" }, h("strong", { text: `${item.capacidade}u` })),
              h("td", {}, h("code", { class: "source-code", text: item.capacidadeFonte ?? "—" })),
            ),
          ),
        ),
      ),
    ),
    h("p", {
      class: "table-note",
      text: "O balde de gelo tem capacidade estimada pela soma dos reagentes iniciais; os demais valores vêm de maxVol.",
    }),
  );
}

export function renderGuide(ctx: AppContext, route: ParsedRoute): HTMLElement {
  const { data } = ctx;
  const equipment = [...data.guide.equipamentos, ...data.guide.extras].filter(
    (item, index, list) =>
      item.tipo !== "dispensa" &&
      item.tipo !== "vending" &&
      list.findIndex((other) => other.id === item.id) === index,
  );
  const methodsToShow = data.guide.metodos.filter((method) => ["Shake", "Stir", "Centrifuge", "Electrolysis", "Holy"].includes(method.id));
  const blocks = createGuideBlocks(ctx);
  const vending = createVendingSection(ctx);

  const highlight = (): void => {
    const eq = route.query.get("eq");
    const method = route.query.get("metodo");
    const section = route.query.get("secao");
    let targetId: string | null = null;
    if (eq) targetId = equipmentTargetId(eq);
    else if (method) targetId = `metodo-${method}`;
    else if (section === "vidraria") targetId = "guide-vidraria";
    else if (section === "dispensas") targetId = "guide-dispensers";
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    target.classList.add("is-target");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target.classList.remove("is-target"), 3400);
  };
  window.setTimeout(highlight, 80);

  return h(
    "div",
    { class: "page page--guide" },
    h(
      "header",
      { class: "page-head" },
      h("p", { class: "eyebrow", text: "Manual de balcão · Bartender.xml" }),
      h("div", { class: "page-head__row" }, h("h1", { text: "Guia do barman" }), h("p", { class: "page-head__note", text: "O básico do turno, os métodos e o equipamento que sustenta o balcão." })),
    ),
    h(
      "div",
      { class: "guide-intro-grid" },
      h("div", { class: "guide-prose" }, ...blocks),
      h(
        "aside",
        { class: "guide-index" },
        h("p", { class: "eyebrow", text: "Neste guia" }),
        h("a", { href: "#/guia?secao=dispensas" }, "Dispensas"),
        h("a", { href: "#/guia?secao=vidraria" }, "Vidraria e capacidades"),
        h("a", { href: "#/guia?metodo=Shake" }, "Métodos de mistura"),
        h("a", { href: "#/guia?eq=VendingMachineBooze" }, "Máquina de vendas"),
        h("a", { href: "#/creditos" }, "Créditos e licenças"),
      ),
    ),
    h(
      "section",
      { class: "guide-section", "aria-labelledby": "methods-heading" },
      h(
        "div",
        { class: "section-head" },
        h(
          "div",
          {},
          h("p", { class: "eyebrow", text: "Como misturar" }),
          h("h2", { id: "methods-heading", text: "Métodos" }),
        ),
        h("span", { class: "section-count", text: `${data.guide.metodos.length} métodos` }),
      ),
      h(
        "div",
        { class: "method-grid" },
        ...methodsToShow.map((method) => createMethodCard(ctx, method.id)),
      ),
      h("p", { class: "table-note", text: "Receitas sem método especial são misturadas diretamente no recipiente. Os rótulos Agitar e Mexer são a tradução de interface usada neste guia." }),
    ),
    h(
      "section",
      { class: "guide-section", "aria-labelledby": "equipment-heading" },
      h(
        "div",
        { class: "section-head" },
        h(
          "div",
          {},
          h("p", { class: "eyebrow", text: "A estação" }),
          h("h2", { id: "equipment-heading", text: "Equipamentos" }),
        ),
        h("span", { class: "section-count", text: `${equipment.length} itens` }),
      ),
      h(
        "div",
        { class: "equipment-grid" },
        ...equipment.map((item) => createEquipmentCard(ctx, item, { dispenser: item.tipo === "dispensa" })),
      ),
    ),
    createDispenserSection(ctx),
    vending ?? h("span"),
    createGlassTable(ctx),
    h(
      "section",
      { class: "guide-closing" },
      h(
        "div",
        {},
        h("p", { class: "eyebrow", text: "Antes de abrir o balcão" }),
        h("h2", { text: "Confira o pedido, o copo e o método." }),
        h("p", { text: "O guia é uma referência de fã. Em caso de divergência, valem os protótipos e as regras do servidor." }),
      ),
      h(
        "div",
        { class: "guide-closing__actions" },
        h("a", { class: "button button--primary", href: "#/menu" }, "Abrir menu ", h("span", { html: icon("arrow") })),
        h("a", { class: "button button--ghost", href: "#/o-que-posso-fazer" }, "Montar estoque"),
      ),
    ),
  );
}
