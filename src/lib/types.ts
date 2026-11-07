export type Traducao = "pt" | "en" | "id";

export type Categoria = "alcoolica" | "sem-alcool" | "refrigerante" | "suco" | "outro";

export interface Origem {
  id: string;
  file: string;
  line: number;
}

export interface RecipeIngredient {
  id: string;
  nome: string;
  quantidade: number;
  bebida: boolean;
}

export interface Recipe {
  id: string;
  metodo: string | null;
  metodos: string[];
  reagentes: RecipeIngredient[];
  produtoId: string;
  produtoQuantidade: number;
  temperaturaMinima: number | null;
  temperaturaMaxima: number | null;
  observacoes: string[];
}

export interface Use {
  bebidaId: string;
  nome: string;
  quantidade: number;
  receitaId: string;
  metodo: string | null;
}

export interface SpriteRef {
  rsi: string;
  estado: string;
  estadoSobreposicao: string | null;
  estadosPreenchimento: string[];
  maxNiveis: number;
  basePreenchimento: string;
  mudaCor: boolean;
}

export interface Drink {
  id: string;
  nome: string;
  descricao: string;
  traducao: Traducao;
  nomeTraducao: Traducao;
  descricaoTraducao: Traducao;
  categoria: Categoria;
  alcoolica: boolean;
  grupo: string;
  cor: string;
  sabor: string | null;
  sprite: SpriteRef | null;
  receitas: Recipe[];
  ingredienteBase: boolean;
  usadoEm: Use[];
  origem: Origem;
}

export interface Ingredient {
  id: string;
  nome: string;
  descricao: string;
  traducao: Traducao;
  nomeTraducao: Traducao;
  descricaoTraducao: Traducao;
  cor: string;
  grupo: string;
  categoria: string;
  bebida: boolean;
  usadoEm: Use[];
  origem: Origem | null;
}

export interface EquipmentSprite {
  rsi: string;
  estado: string;
  largura: number;
  altura: number;
  direcoes: number;
  colunas: number;
  linhas: number;
}

export interface Equipment {
  id: string;
  nome: string;
  descricao: string;
  traducao: Traducao;
  nomeTraducao: Traducao;
  descricaoTraducao: Traducao;
  tipo: string;
  capacidade: number | null;
  capacidadeFonte: string | null;
  cabeNaDispensa: boolean;
  sprite: EquipmentSprite | null;
  origem: Origem | null;
  uso?: string;
}

export interface DispenserContent {
  reagenteId: string;
  nome: string;
  quantidade: number;
  garrafaId: string;
  garrafaNome: string;
  bebidaId: string | null;
}

export interface Dispenser extends Equipment {
  conteudo: DispenserContent[];
}

export interface VendingItem {
  id: string;
  nome: string;
  quantidade: number;
  tipo: string;
  traducao: Traducao;
  sprite: EquipmentSprite | null;
}

export interface Vending {
  id: string;
  nome: string;
  descricao: string;
  traducao: Traducao;
  sprite: EquipmentSprite | null;
  inventario: VendingItem[];
  contrabando: VendingItem[];
  emagged: VendingItem[];
}

export interface Method {
  id: string;
  verbo: string;
  verboTraducao: Traducao;
  entidadeId: string | null;
  entidadeNome: string | null;
  entidadeSprite: EquipmentSprite | null;
  descricao: string;
}

export type GuideBlockType = "titulo" | "paragrafo" | "link" | "entidades";

export interface GuideBlock {
  tipo: GuideBlockType;
  texto?: string;
  textoOriginal?: string;
  traducao?: Traducao;
  href?: string;
  entidades?: Array<{ id: string; legenda: string | null }>;
}

export interface Guide {
  titulo: string;
  blocos: GuideBlock[];
  equipamentos: Equipment[];
  extras: Equipment[];
  dispensas: Dispenser[];
  vending: Vending | null;
  metodos: Method[];
  vidraria: Equipment[];
  fonte: { arquivo: string; url: string };
}

export interface SpriteState {
  path: string;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
  directions: number;
  cols: number;
  rows: number;
}

export interface SpriteRsi {
  licenca: string;
  copyright: string;
  tamanho: { x: number; y: number };
  estados: Record<string, SpriteState>;
}

export interface SpriteIndex {
  padrao: SpriteRef | null;
  rsis: Record<string, SpriteRsi>;
}

export interface Credits {
  projeto: string;
  aviso: string;
  fonte: {
    repositorio: string;
    commit: string;
    geradoEm: string;
    comando: string;
  };
  licencaProjeto: string;
  creditos: string[];
  licencasSprites: Array<{
    rsi: string;
    licenca: string;
    copyright: string;
    estados: string[];
  }>;
  licencasArquivos: Array<{ arquivo: string; licencas: string[] }>;
  ferramentas: string[];
}

export interface SiteData {
  drinks: Drink[];
  ingredients: Ingredient[];
  glassware: Equipment[];
  guide: Guide;
  sprites: SpriteIndex;
  credits: Credits;
}
