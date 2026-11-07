import { CATEGORIES, categoryLabel } from "./data";
import { fuzzyScore } from "./fuzzy";
import type { SiteData } from "./types";

export type SearchKind = "Bebida" | "Ingrediente" | "Equipamento" | "Método" | "Categoria" | "Guia";

export interface SearchEntry {
  key: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
}

const KIND_ORDER: Record<SearchKind, number> = {
  Bebida: 0,
  Categoria: 1,
  Ingrediente: 2,
  Equipamento: 3,
  Método: 4,
  Guia: 5,
};

export function buildSearchIndex(data: SiteData): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const seenEquipment = new Set<string>();

  for (const drink of data.drinks) {
    const recipeKeywords = drink.receitas
      .flatMap((recipe) => recipe.reagentes.map((ingredient) => ingredient.nome))
      .join(" ");
    entries.push({
      key: `bebida:${drink.id}`,
      kind: "Bebida",
      title: drink.nome,
      subtitle: `${categoryLabel(drink.categoria)}${drink.receitas.length ? ` · ${drink.receitas.length} receita${drink.receitas.length > 1 ? "s" : ""}` : " · sem receita"}`,
      href: `#/bebida/${encodeURIComponent(drink.id)}`,
      keywords: [
        drink.nome,
        drink.id,
        drink.descricao,
        drink.sabor ?? "",
        categoryLabel(drink.categoria),
        drink.alcoolica ? "alcoólica álcool" : "sem álcool",
        recipeKeywords,
      ].join(" "),
    });
  }

  for (const ingredient of data.ingredients) {
    if (ingredient.bebida) continue;
    entries.push({
      key: `ingrediente:${ingredient.id}`,
      kind: "Ingrediente",
      title: ingredient.nome,
      subtitle: `Ingrediente · usado em ${ingredient.usadoEm.length} ${ingredient.usadoEm.length === 1 ? "receita" : "receitas"}`,
      href: `#/menu?ing=${encodeURIComponent(ingredient.id)}`,
      keywords: [ingredient.nome, ingredient.id, ingredient.descricao, ingredient.grupo].join(" "),
    });
  }

  const equipment = [
    ...data.guide.equipamentos,
    ...data.guide.extras,
    ...data.guide.vidraria,
    ...data.guide.dispensas,
  ];
  for (const item of equipment) {
    if (seenEquipment.has(item.id)) continue;
    seenEquipment.add(item.id);
    entries.push({
      key: `equipamento:${item.id}`,
      kind: "Equipamento",
      title: item.nome,
      subtitle: item.capacidade ? `${item.tipo} · ${item.capacidade}u` : item.tipo,
      href: `#/guia?eq=${encodeURIComponent(item.id)}`,
      keywords: [item.nome, item.id, item.descricao, item.tipo, item.uso ?? ""].join(" "),
    });
  }

  for (const method of data.guide.metodos) {
    entries.push({
      key: `metodo:${method.id}`,
      kind: "Método",
      title: method.verbo,
      subtitle: method.entidadeNome ? `Método · ${method.entidadeNome}` : "Método de mistura",
      href: `#/guia?metodo=${encodeURIComponent(method.id)}`,
      keywords: [method.verbo, method.id, method.descricao, method.entidadeNome ?? ""].join(" "),
    });
  }

  for (const category of CATEGORIES) {
    const count = data.drinks.filter((drink) => drink.categoria === category.id).length;
    entries.push({
      key: `categoria:${category.id}`,
      kind: "Categoria",
      title: category.nome,
      subtitle: `Categoria · ${count} bebidas`,
      href: `#/menu?cat=${category.id}`,
      keywords: [category.nome, category.descricao, category.id, "categoria"].join(" "),
    });
  }

  entries.push(
    {
      key: "guia:inicio",
      kind: "Guia",
      title: "Guia do barman",
      subtitle: "Manual de balcão, métodos e equipamentos",
      href: "#/guia",
      keywords: "guia manual barman bartender primeiro turno equipamentos dispensas",
    },
    {
      key: "guia:fazer",
      kind: "Guia",
      title: "O que posso fazer?",
      subtitle: "Monte seu estoque e encontre receitas possíveis",
      href: "#/o-que-posso-fazer",
      keywords: "estoque dispensa ingredientes receitas possíveis inventário",
    },
    {
      key: "guia:favoritos",
      kind: "Guia",
      title: "Favoritos",
      subtitle: "Sua lista pessoal de drinks",
      href: "#/favoritos",
      keywords: "favoritos salvos lista",
    },
  );

  return entries;
}

export function rankSearch(entries: SearchEntry[], query: string, limit = 16): SearchEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return entries
    .map((entry) => {
      const titleScore = fuzzyScore(trimmed, entry.title);
      const keywordScore = fuzzyScore(trimmed, entry.keywords);
      if (!titleScore && !keywordScore) return null;
      return {
        entry,
        score: titleScore * 3 + keywordScore - KIND_ORDER[entry.kind] * 4,
      };
    })
    .filter((item): item is { entry: SearchEntry; score: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "pt-BR"))
    .slice(0, limit)
    .map((item) => item.entry);
}
