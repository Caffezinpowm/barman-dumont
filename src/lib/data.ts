import type {
  Categoria,
  Drink,
  Equipment,
  Method,
  SiteData,
  SpriteRsi,
  SpriteState,
} from "./types";

const baseUrl = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function assetPath(path: string): string {
  return `${baseUrl}${path.replace(/^\/+/, "")}`;
}

export async function loadSiteData(): Promise<SiteData> {
  const files = [
    "bebidas.json",
    "ingredientes.json",
    "vidraria.json",
    "guia.json",
    "sprites.json",
    "creditos.json",
  ] as const;

  const response = await Promise.all(
    files.map(async (file) => {
      const res = await fetch(assetPath(`data/${file}`));
      if (!res.ok) throw new Error(`Falha ao carregar data/${file} (${res.status})`);
      return res.json() as Promise<unknown>;
    }),
  );

  const [drinks, ingredients, glassware, guide, sprites, credits] = response as [
    SiteData["drinks"],
    SiteData["ingredients"],
    SiteData["glassware"],
    SiteData["guide"],
    SiteData["sprites"],
    SiteData["credits"],
  ];

  return { drinks, ingredients, glassware, guide, sprites, credits };
}

export interface CategoryInfo {
  id: Categoria;
  nome: string;
  descricao: string;
  cor: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "alcoolica",
    nome: "Alcoólicas",
    descricao: "Coquetéis, destilados e clássicos de balcão.",
    cor: "#b06a4a",
  },
  {
    id: "sem-alcool",
    nome: "Sem álcool",
    descricao: "Drinks leves, cremosos e refrescantes.",
    cor: "#7f9270",
  },
  {
    id: "refrigerante",
    nome: "Refrigerantes",
    descricao: "Bases gaseificadas e misturas de soda.",
    cor: "#b59a57",
  },
  {
    id: "suco",
    nome: "Sucos",
    descricao: "Frutas, extrações e bases naturais.",
    cor: "#c08052",
  },
  {
    id: "outro",
    nome: "Outros",
    descricao: "Bebidas que não se encaixam nas bases principais.",
    cor: "#8e8174",
  },
];

export function categoryInfo(id: Categoria): CategoryInfo {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function categoryLabel(id: Categoria): string {
  return categoryInfo(id).nome;
}

export function validColor(value: string | null | undefined): string {
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : "#b08d57";
}

export function spriteState(
  data: SiteData,
  rsi: string | null | undefined,
  state: string | null | undefined,
): SpriteState | null {
  if (!rsi || !state) return null;
  const bundle: SpriteRsi | undefined = data.sprites.rsis[rsi];
  return bundle?.estados[state] ?? null;
}

export function spriteLicense(data: SiteData, rsi: string): { licenca: string; copyright: string } {
  const bundle = data.sprites.rsis[rsi];
  return {
    licenca: bundle?.licenca || "Não declarada",
    copyright: bundle?.copyright || "",
  };
}

export function methodById(data: SiteData, id: string | null | undefined): Method | null {
  if (!id) return null;
  return data.guide.metodos.find((method) => method.id === id) ?? null;
}

const FALLBACK_METHODS: Record<string, string> = {
  Shake: "Agitar",
  Stir: "Mexer",
  Holy: "Abençoar",
  Centrifuge: "Centrifugar",
  Electrolysis: "Eletrolisar",
};

export function methodLabel(data: SiteData, id: string | null | undefined): string {
  if (!id) return "Mistura direta";
  return methodById(data, id)?.verbo ?? FALLBACK_METHODS[id] ?? "Método especial";
}

export function methodSentence(data: SiteData, id: string | null | undefined): string {
  if (!id) return "Sem método especial: misture os ingredientes no recipiente.";
  return methodById(data, id)?.descricao ?? "Método de mistura definido pelo jogo.";
}

export function vessels(data: SiteData): Equipment[] {
  const seen = new Set<string>();
  return [...data.glassware, ...data.guide.vidraria, ...data.guide.extras]
    .filter((item) => item.capacidade !== null && item.capacidade > 0)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => (a.capacidade ?? 0) - (b.capacidade ?? 0));
}

export function recipeDrinks(data: SiteData): Drink[] {
  return data.drinks.filter((drink) => drink.receitas.length > 0);
}

export function translationLabel(traducao: string): string | null {
  if (traducao === "en") return "Texto original em inglês";
  if (traducao === "id") return "Texto derivado do identificador";
  return null;
}

export function drinkOrdinal(data: SiteData, drink: Drink): string {
  const index = data.drinks.findIndex((item) => item.id === drink.id);
  return String(index + 1).padStart(3, "0");
}

export function sourceLabel(file: string, line: number): string {
  return `${file}:${line}`;
}
