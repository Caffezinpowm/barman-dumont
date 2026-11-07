import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  asArray,
  asNumber,
  asString,
  isAbstract,
  parseYamlFile,
  type ParsedYamlFile,
} from "./lib/yaml.js";
import { loadLocales, localize, type LocaleBundle, type LocalizedText } from "./lib/ftl.js";
import { humanizeId } from "./lib/text.js";
import {
  copyRsiState,
  mergeRsiCopy,
  type CopiedSprite,
  type RsiCopy,
} from "./lib/rsi.js";

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

interface Options {
  repo: string;
  out: string;
  sprites: string;
  report: string;
  projectRoot: string;
}

function argValue(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const withEquals = args.find((a) => a.startsWith(`${name}=`));
  return withEquals ? withEquals.slice(name.length + 1) : null;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const args = process.argv.slice(2);
const repoArg = argValue(args, "--repo") ?? process.env.DUMONT_REPO ?? "";
if (!repoArg) {
  console.error(
    [
      'Uso: npx tsx tools/extract-bar.ts --repo "<caminho-do-Dumont-Station>"',
      "",
      "Opções:",
      "  --repo <pasta>     repositório Dumont-Station (obrigatório)",
      "  --out <pasta>      destino dos JSONs (padrão: public/data)",
      "  --sprites <pasta>  destino dos sprites (padrão: public/sprites)",
      "  --report <arquivo> relatório Markdown (padrão: RELATORIO-EXTRACAO.md)",
    ].join("\n"),
  );
  process.exit(1);
}

const options: Options = {
  repo: resolve(repoArg),
  out: resolve(projectRoot, argValue(args, "--out") ?? "public/data"),
  sprites: resolve(projectRoot, argValue(args, "--sprites") ?? "public/sprites"),
  report: resolve(projectRoot, argValue(args, "--report") ?? "RELATORIO-EXTRACAO.md"),
  projectRoot,
};

function assertRepo(): void {
  const needed = [
    join(options.repo, "Resources", "Prototypes"),
    join(options.repo, "Resources", "Textures"),
    join(options.repo, "Resources", "Locale"),
    join(options.repo, "Resources", "ServerInfo", "Guidebook", "Service", "Bartender.xml"),
  ];
  for (const path of needed) {
    if (!existsSync(path)) {
      console.error(`Repositório inválido: não encontrei ${path}`);
      process.exit(1);
    }
  }
}

function assertSafeOutputs(): void {
  const outputs: Array<[string, string]> = [
    ["--out", options.out],
    ["--sprites", options.sprites],
    ["--report", options.report],
  ];
  for (const [flag, output] of outputs) {
    const rel = relative(options.repo, output);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
      console.error(
        `Destino inseguro em ${flag}: "${output}" está dentro do repositório de origem.\n` +
          "Escolha uma pasta fora de --repo; o extrator nunca deve escrever na fonte.",
      );
      process.exit(1);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Tipos internos                                                             */
/* -------------------------------------------------------------------------- */

type Obj = Record<string, any>;
type Proto = Obj & { __file: string; __line: number };
type Traducao = "pt" | "en" | "id";

interface DrinkSource {
  id: string;
  file: string;
  line: number;
}

interface RecipeIngredient {
  id: string;
  nome: string;
  quantidade: number;
  bebida: boolean;
}

interface Recipe {
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

interface Use {
  bebidaId: string;
  nome: string;
  quantidade: number;
  receitaId: string;
  metodo: string | null;
}

interface SpriteRef {
  rsi: string;
  estado: string;
  estadoSobreposicao: string | null;
  estadosPreenchimento: string[];
  maxNiveis: number;
  basePreenchimento: string;
  mudaCor: boolean;
}

interface Drink {
  id: string;
  nome: string;
  descricao: string;
  traducao: Traducao;
  nomeTraducao: Traducao;
  descricaoTraducao: Traducao;
  categoria: "alcoolica" | "sem-alcool" | "refrigerante" | "suco" | "outro";
  alcoolica: boolean;
  grupo: string;
  cor: string;
  sabor: string | null;
  sprite: SpriteRef | null;
  receitas: Recipe[];
  ingredienteBase: boolean;
  usadoEm: Use[];
  origem: DrinkSource;
}

interface Ingredient {
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
  origem: DrinkSource | null;
}

interface EquipmentSprite {
  rsi: string;
  estado: string;
  largura: number;
  altura: number;
  direcoes: number;
  colunas: number;
  linhas: number;
}

interface Equipment {
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
  origem: DrinkSource | null;
}

interface DispenserContent {
  reagenteId: string;
  nome: string;
  quantidade: number;
  garrafaId: string;
  garrafaNome: string;
  bebidaId: string | null;
}

interface Dispenser extends Equipment {
  conteudo: DispenserContent[];
}

interface VendingItem {
  id: string;
  nome: string;
  quantidade: number;
  tipo: string;
  traducao: Traducao;
  sprite: EquipmentSprite | null;
}

interface Vending {
  id: string;
  nome: string;
  descricao: string;
  traducao: Traducao;
  sprite: EquipmentSprite | null;
  inventario: VendingItem[];
  contrabando: VendingItem[];
  emagged: VendingItem[];
}

interface Method {
  id: string;
  verbo: string;
  verboTraducao: Traducao;
  entidadeId: string | null;
  entidadeNome: string | null;
  entidadeSprite: EquipmentSprite | null;
  descricao: string;
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function walk(dir: string, extension: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, extension, out);
    else if (entry.isFile() && extension.test(entry.name)) out.push(p);
  }
  return out;
}

function rel(path: string): string {
  return relative(options.repo, path).split(sep).join("/");
}

function record(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : null;
}

function arrayOf(value: unknown): unknown[] {
  return asArray(value);
}

function parentsOf(proto: Obj | null): string[] {
  if (!proto) return [];
  return asArray(proto.parent)
    .map((p) => (typeof p === "string" ? p : null))
    .filter((p): p is string => Boolean(p));
}

function firstField(chain: Obj[], key: string): unknown {
  for (const proto of chain) {
    if (proto[key] !== undefined && proto[key] !== null) return proto[key];
  }
  return undefined;
}

function firstComponent(chain: Obj[], type: string): Obj | null {
  for (const proto of chain) {
    for (const component of arrayOf(proto.components)) {
      const rec = record(component);
      if (rec?.type === type) return rec;
    }
  }
  return null;
}

function hasComponent(chain: Obj[], type: string): boolean {
  return firstComponent(chain, type) !== null;
}

function sourceOf(proto: Proto): DrinkSource {
  return { id: String(proto.id ?? ""), file: proto.__file, line: Number(proto.__line ?? 0) };
}

function translationOf(nome: LocalizedText, descricao: LocalizedText): Traducao {
  if (nome.traducao === "id" || descricao.traducao === "id") return "id";
  if (nome.traducao === "en" || descricao.traducao === "en") return "en";
  return "pt";
}

function colorOf(chain: Obj[]): string {
  const value = firstField(chain, "color");
  return typeof value === "string" && value.trim() ? value.trim() : "#b08d57";
}

function groupOf(chain: Obj[]): string {
  const value = firstField(chain, "group");
  return typeof value === "string" && value.trim() ? value.trim() : "Unknown";
}

function isAlcoholic(chain: Obj[]): boolean {
  return chain.some((p) => p.id === "BaseAlcohol") || groupOf(chain) === "AlcoholicDrinks";
}

function categoryOf(chain: Obj[]): Drink["categoria"] {
  const ids = new Set(chain.map((p) => String(p.id)));
  if (ids.has("BaseJuice")) return "suco";
  if (ids.has("BaseSoda")) return "refrigerante";
  if (ids.has("BaseAlcohol")) return "alcoolica";
  if (ids.has("BaseDrink")) return "sem-alcool";
  return "outro";
}

function recipeProductAmount(value: unknown): number {
  if (typeof value === "number") return value;
  const rec = record(value);
  if (rec) {
    const amount = asNumber(rec.amount ?? rec.Amount ?? rec.quantity ?? rec.Quantity);
    if (amount !== null) return amount;
  }
  return 1;
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function camelToWords(value: string): string {
  return humanizeId(value);
}

function readSpdx(path: string): string[] {
  try {
    const text = readFileSync(path, "utf8");
    const found = new Set<string>();
    for (const match of text.matchAll(/SPDX-License-Identifier:\s*([^\s*]+)/g)) {
      found.add(match[1].replace(/[*/]+$/, ""));
    }
    return [...found];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Leitura de protótipos                                                      */
/* -------------------------------------------------------------------------- */

assertRepo();
assertSafeOutputs();

const prototypesRoot = join(options.repo, "Resources", "Prototypes");
const yamlFiles = walk(prototypesRoot, /\.ya?ml$/i);
const parseErrors: Array<{ arquivo: string; erro: string }> = [];
const warningsByFile: Array<{ arquivo: string; avisos: string[] }> = [];
let warningCount = 0;

const reagents: Proto[] = [];
const reactions: Proto[] = [];
const entities: Proto[] = [];
const mixingCategories: Proto[] = [];
const vendingInventories: Proto[] = [];

for (const file of yamlFiles) {
  const parsed: ParsedYamlFile = parseYamlFile(file, rel(file));
  if (parsed.erro) {
    parseErrors.push({ arquivo: parsed.arquivo, erro: parsed.erro.split("\n")[0] });
    continue;
  }
  warningCount += parsed.avisos.length;
  if (parsed.avisos.length) warningsByFile.push({ arquivo: parsed.arquivo, avisos: parsed.avisos });
  for (const item of parsed.itens) {
    const proto = { ...item, __file: parsed.arquivo, __line: Number(item.__line ?? 0) } as Proto;
    switch (item.type) {
      case "reagent":
        reagents.push(proto);
        break;
      case "reaction":
        reactions.push(proto);
        break;
      case "entity":
        entities.push(proto);
        break;
      case "mixingCategory":
        mixingCategories.push(proto);
        break;
      case "vendingMachineInventory":
        vendingInventories.push(proto);
        break;
    }
  }
}

const reagentById = new Map<string, Proto>();
const entityById = new Map<string, Proto>();
const reactionById = new Map<string, Proto>();
const inventoryById = new Map<string, Proto>();
const duplicateIds: Array<{ tipo: string; id: string; ocorrencias: string[] }> = [];

function addUnique<T extends Proto>(target: Map<string, T>, proto: T, type: string): void {
  const id = String(proto.id ?? "");
  if (!id) return;
  const existing = target.get(id);
  if (existing) {
    duplicateIds.push({
      tipo: type,
      id,
      ocorrencias: [
        `${existing.__file}:${existing.__line}`,
        `${proto.__file}:${proto.__line}`,
      ],
    });
    return;
  }
  target.set(id, proto);
}

for (const reagent of reagents) addUnique(reagentById, reagent, "reagent");
for (const entity of entities) addUnique(entityById, entity, "entity");
for (const reaction of reactions) addUnique(reactionById, reaction, "reaction");
for (const inventory of vendingInventories) addUnique(inventoryById, inventory, "vendingMachineInventory");

function reagentChain(id: string): Obj[] {
  const chain: Obj[] = [];
  const seen = new Set<string>();
  let current = reagentById.get(id);
  while (current && !seen.has(String(current.id))) {
    chain.push(current);
    seen.add(String(current.id));
    current = reagentById.get(parentsOf(current)[0] ?? "");
  }
  return chain;
}

function entityChain(id: string): Obj[] {
  const chain: Obj[] = [];
  const seen = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const currentId = queue.shift()!;
    if (seen.has(currentId)) continue;
    seen.add(currentId);
    const current = entityById.get(currentId);
    if (!current) continue;
    chain.push(current);
    for (const parent of parentsOf(current)) queue.push(parent);
  }
  return chain;
}

/* -------------------------------------------------------------------------- */
/* Locales                                                                    */
/* -------------------------------------------------------------------------- */

const locales: LocaleBundle = loadLocales(join(options.repo, "Resources", "Locale"), ["pt-BR", "en-US"]);

function localizedReagent(id: string): { nome: LocalizedText; descricao: LocalizedText } {
  const proto = reagentById.get(id);
  if (!proto) {
    return {
      nome: { valor: humanizeId(id), traducao: "id" },
      descricao: { valor: "", traducao: "id" },
    };
  }
  return localize(locales, {
    chaveNome: asString(proto.name),
    chaveDescricao: asString(proto.desc),
    literalNome: asString(proto.name),
    literalDescricao: asString(proto.desc),
    fallbackNome: humanizeId(id),
  });
}

function localizedEntity(id: string): { nome: LocalizedText; descricao: LocalizedText } {
  const chain = entityChain(id);
  const own = chain[0] ?? null;
  const name = own ? asString(firstField(chain, "name")) : null;
  const description = own ? asString(firstField(chain, "description")) : null;
  return localize(locales, {
    chaveNome: `ent-${id}`,
    chaveDescricao: `ent-${id}.desc`,
    literalNome: name,
    literalDescricao: description,
    fallbackNome: humanizeId(id),
  });
}

/* -------------------------------------------------------------------------- */
/* Bebidas                                                                    */
/* -------------------------------------------------------------------------- */

const BASE_DRINK_IDS = new Set(["BaseDrink", "BaseAlcohol", "BaseSoda", "BaseJuice"]);

const drinkProtos = reagents
  .filter((reagent) => {
    if (isAbstract(reagent)) return false;
    const chain = reagentChain(String(reagent.id));
    return chain.some((p) => BASE_DRINK_IDS.has(String(p.id)));
  })
  .sort((a, b) => String(a.id).localeCompare(String(b.id), "en"));

const drinkIds = new Set(drinkProtos.map((p) => String(p.id)));

const drinkReactionFiles = new Set(
  yamlFiles
    .filter((file) => /[\\/]Recipes[\\/]Reactions[\\/]drinks\.ya?ml$/i.test(file))
    .map(rel),
);

const drinkReactions = reactions.filter(
  (reaction) => drinkReactionFiles.has(reaction.__file) && reaction.source !== true,
);

const unlinkedReactionProducts: Array<{ reacao: string; produto: string; arquivo: string }> = [];
const ignoredReactions: Array<{ id: string; motivo: string; arquivo: string }> = [];
const recipesByDrink = new Map<string, Recipe[]>();

function recipeFromReaction(reaction: Proto, productId: string): Recipe {
  const products = record(reaction.products) ?? {};
  const productAmount = recipeProductAmount(products[productId]);
  const methods = arrayOf(reaction.requiredMixerCategories)
    .map((v) => (typeof v === "string" ? v : null))
    .filter((v): v is string => Boolean(v));
  const reactants = record(reaction.reactants) ?? {};
  const ingredients: RecipeIngredient[] = [];
  for (const [reactantId, value] of Object.entries(reactants)) {
    const amount =
      typeof value === "number"
        ? value
        : asNumber(record(value)?.amount ?? record(value)?.Amount) ?? 1;
    const chain = reagentChain(reactantId);
    const localized = localizedReagent(reactantId);
    ingredients.push({
      id: reactantId,
      nome: localized.nome.valor,
      quantidade: amount,
      bebida: drinkIds.has(reactantId) || chain.some((p) => BASE_DRINK_IDS.has(String(p.id))),
    });
  }
  const observations: string[] = [];
  if (reaction.impact) observations.push(`Impacto: ${String(reaction.impact)}`);
  if (Array.isArray(reaction.effects) && reaction.effects.length) {
    observations.push("Reação com efeito especial no jogo.");
  }
  return {
    id: String(reaction.id),
    metodo: methods[0] ?? null,
    metodos: methods,
    reagentes: ingredients,
    produtoId: productId,
    produtoQuantidade: productAmount,
    temperaturaMinima: asNumber(reaction.minTemp),
    temperaturaMaxima: asNumber(reaction.maxTemp),
    observacoes: observations,
  };
}

function shouldAttach(reaction: Proto, productId: string): boolean {
  const id = String(reaction.id ?? "");
  if (/breakdown|decomposition/i.test(id)) return false;
  if (id === productId) return true;
  if (id.toLowerCase().startsWith(productId.toLowerCase()) && productId.length >= 4) return true;
  const methods = arrayOf(reaction.requiredMixerCategories).map(String);
  if (methods.includes("Shake") || methods.includes("Stir")) return true;
  return false;
}

for (const reaction of drinkReactions) {
  const products = record(reaction.products);
  if (!products) {
    ignoredReactions.push({ id: String(reaction.id), motivo: "sem produtos", arquivo: reaction.__file });
    continue;
  }
  const drinkProducts = Object.keys(products).filter((id) => drinkIds.has(id));
  if (!drinkProducts.length) {
    const firstProduct = Object.keys(products)[0];
    if (firstProduct) {
      const reagent = reagentById.get(firstProduct);
      if (!reagent) {
        unlinkedReactionProducts.push({
          reacao: String(reaction.id),
          produto: firstProduct,
          arquivo: reaction.__file,
        });
      }
    }
    ignoredReactions.push({
      id: String(reaction.id),
      motivo: "nenhum produto é uma bebida extraída",
      arquivo: reaction.__file,
    });
    continue;
  }
  for (const productId of drinkProducts) {
    if (!shouldAttach(reaction, productId)) {
      ignoredReactions.push({
        id: String(reaction.id),
        motivo: `produto ${productId} não corresponde à reação`,
        arquivo: reaction.__file,
      });
      continue;
    }
    const list = recipesByDrink.get(productId) ?? [];
    list.push(recipeFromReaction(reaction, productId));
    recipesByDrink.set(productId, list);
  }
}

for (const [productId, list] of recipesByDrink) {
  const ordered: Recipe[] = [];
  const seen = new Set<string>();
  const add = (recipe: Recipe) => {
    const key = `${recipe.id}|${recipe.produtoId}`;
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(recipe);
  };
  for (const recipe of list) if (recipe.id === productId) add(recipe);
  for (const recipe of list) if (recipe.metodo === "Shake" || recipe.metodo === "Stir") add(recipe);
  for (const recipe of list) add(recipe);
  recipesByDrink.set(productId, ordered);
}

/* -------------------------------------------------------------------------- */
/* Sprites                                                                    */
/* -------------------------------------------------------------------------- */

if (existsSync(options.sprites)) rmSync(options.sprites, { recursive: true, force: true });
mkdirSync(options.sprites, { recursive: true });

const rsiCopies = new Map<string, RsiCopy>();
const spriteErrors: Array<{ id: string; motivo: string }> = [];
const copiedStateCount = { value: 0 };

function ensureState(rsi: string, state: string, owner: string): EquipmentSprite | null {
  try {
    const existing = rsiCopies.get(rsi)?.states[state];
    if (existing) {
      return {
        rsi,
        estado: state,
        largura: existing.width,
        altura: existing.height,
        direcoes: existing.directions,
        colunas: existing.cols,
        linhas: existing.rows,
      };
    }
    const { rsiCopy, sprite } = copyRsiState(options.repo, options.sprites, rsi, state);
    mergeRsiCopy(rsiCopies, rsiCopy);
    copiedStateCount.value++;
    return {
      rsi,
      estado: state,
      largura: sprite.width,
      altura: sprite.height,
      direcoes: sprite.directions,
      colunas: sprite.cols,
      linhas: sprite.rows,
    };
  } catch (error) {
    spriteErrors.push({
      id: owner,
      motivo: `${rsi}/${state}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

function layerStateByMap(chain: Obj[], mapName: string): string | null {
  const sprite = firstComponent(chain, "Sprite");
  for (const layer of arrayOf(sprite?.layers)) {
    const rec = record(layer);
    if (!rec) continue;
    const mapped = arrayOf(rec.map).some((entry) => entry === mapName);
    if (!mapped) continue;
    const state = asString(rec.state);
    if (state) return state;
  }
  return null;
}

/**
 * O jogo usa `metamorphicDefaultSprite` quando o reagente não define um
 * sprite metamórfico próprio. É o copo autêntico exibido para água, água com
 * gás e as demais bebidas sem arte específica.
 */
function buildDefaultGlass(): SpriteRef | null {
  const chain = entityChain("DrinkGlass");
  const visuals = firstComponent(chain, "SolutionContainerVisuals");
  if (!visuals || visuals.metamorphic !== true) return null;

  const spec = record(visuals.metamorphicDefaultSprite);
  const rsi = spec ? asString(spec.sprite) : null;
  const baseState = spec ? asString(spec.state) : null;
  if (!rsi || !baseState) return null;

  const maxLevels = Math.max(0, asNumber(visuals.maxFillLevels) ?? 0);
  const fillBase = asString(visuals.fillBaseName) ?? "fill";
  if (!ensureState(rsi, baseState, "DrinkGlass")) return null;

  const fillStates: string[] = [];
  for (let i = 1; i <= maxLevels; i++) {
    const stateName = `${fillBase}${i}`;
    if (ensureState(rsi, stateName, "DrinkGlass")) fillStates.push(stateName);
  }

  const overlayName = layerStateByMap(chain, "enum.SolutionContainerLayers.Overlay");
  const overlayState =
    overlayName && ensureState(rsi, overlayName, "DrinkGlass") ? overlayName : null;

  return {
    rsi,
    estado: baseState,
    estadoSobreposicao: overlayState,
    estadosPreenchimento: fillStates,
    maxNiveis: fillStates.length || maxLevels,
    basePreenchimento: fillBase,
    mudaCor: visuals.changeColor !== false,
  };
}

const defaultGlass = buildDefaultGlass();
const drinkSprites = new Map<string, SpriteRef | null>();

for (const proto of drinkProtos) {
  const id = String(proto.id);
  const chain = reagentChain(id);
  const sprite = record(firstField(chain, "metamorphicSprite"));
  const rsi = sprite ? asString(sprite.sprite) : null;
  const baseState = sprite ? asString(sprite.state) : null;
  if (!rsi || !baseState) {
    drinkSprites.set(id, null);
    continue;
  }
  const maxLevels = Math.max(0, Number(firstField(chain, "metamorphicMaxFillLevels") ?? 0) || 0);
  const fillBase = asString(firstField(chain, "metamorphicFillBaseName")) ?? "fill-";
  const changeColor = firstField(chain, "metamorphicChangeColor") === true;
  const base = ensureState(rsi, baseState, id);
  if (!base) {
    drinkSprites.set(id, null);
    continue;
  }
  const fillStates: string[] = [];
  for (let i = 1; i <= maxLevels; i++) {
    const stateName = `${fillBase}${i}`;
    if (ensureState(rsi, stateName, id)) fillStates.push(stateName);
  }
  drinkSprites.set(id, {
    rsi,
    estado: baseState,
    estadoSobreposicao: null,
    estadosPreenchimento: fillStates,
    maxNiveis: fillStates.length || maxLevels,
    basePreenchimento: fillBase,
    mudaCor: changeColor,
  });
}

/* -------------------------------------------------------------------------- */
/* Bebidas finais + índice reverso                                            */
/* -------------------------------------------------------------------------- */

const allReactantIds = new Set<string>();
for (const list of recipesByDrink.values()) {
  for (const recipe of list) for (const ingredient of recipe.reagentes) allReactantIds.add(ingredient.id);
}

const ingredientById = new Map<string, Ingredient>();

function makeIngredient(id: string): Ingredient {
  const existing = ingredientById.get(id);
  if (existing) return existing;
  const chain = reagentChain(id);
  const localized = localizedReagent(id);
  const proto = reagentById.get(id);
  const isDrink = drinkIds.has(id);
  const ingredient: Ingredient = {
    id,
    nome: localized.nome.valor,
    descricao: localized.descricao.valor,
    traducao: translationOf(localized.nome, localized.descricao),
    nomeTraducao: localized.nome.traducao,
    descricaoTraducao: localized.descricao.traducao,
    cor: colorOf(chain),
    grupo: groupOf(chain),
    categoria: isDrink ? categoryOf(chain) : "insumo",
    bebida: isDrink,
    usadoEm: [],
    origem: proto ? sourceOf(proto) : null,
  };
  ingredientById.set(id, ingredient);
  return ingredient;
}

for (const id of allReactantIds) makeIngredient(id);

const drinkById = new Map<string, Drink>();

for (const proto of drinkProtos) {
  const id = String(proto.id);
  const chain = reagentChain(id);
  const localized = localizedReagent(id);
  const recipes = recipesByDrink.get(id) ?? [];
  const drink: Drink = {
    id,
    nome: localized.nome.valor,
    descricao: localized.descricao.valor,
    traducao: translationOf(localized.nome, localized.descricao),
    nomeTraducao: localized.nome.traducao,
    descricaoTraducao: localized.descricao.traducao,
    categoria: categoryOf(chain),
    alcoolica: isAlcoholic(chain),
    grupo: groupOf(chain),
    cor: colorOf(chain),
    sabor: asString(firstField(chain, "flavor")),
    sprite: drinkSprites.get(id) ?? null,
    receitas: recipes,
    ingredienteBase: recipes.length === 0,
    usadoEm: [],
    origem: sourceOf(proto),
  };
  drinkById.set(id, drink);
}

for (const [drinkId, drink] of drinkById) {
  for (const recipe of drink.receitas) {
    for (const reactant of recipe.reagentes) {
      const ingredient = makeIngredient(reactant.id);
      ingredient.usadoEm.push({
        bebidaId: drinkId,
        nome: drink.nome,
        quantidade: reactant.quantidade,
        receitaId: recipe.id,
        metodo: recipe.metodo,
      });
    }
  }
}

for (const ingredient of ingredientById.values()) {
  ingredient.usadoEm = uniqueBy(
    ingredient.usadoEm,
    (use) => `${use.bebidaId}|${use.receitaId}|${use.quantidade}`,
  ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

for (const drink of drinkById.values()) {
  const ingredient = ingredientById.get(drink.id);
  drink.usadoEm = ingredient?.usadoEm ?? [];
}

const drinks = [...drinkById.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
const ingredients = [...ingredientById.values()].sort((a, b) => {
  if (a.bebida !== b.bebida) return a.bebida ? -1 : 1;
  return a.nome.localeCompare(b.nome, "pt-BR");
});

/* -------------------------------------------------------------------------- */
/* Entidades, equipamentos e dispensas                                        */
/* -------------------------------------------------------------------------- */

const equipmentIds = [
  "BoozeDispenser",
  "SodaDispenser",
  "VendingMachineBooze",
  "DrinkGlass",
  "DrinkGlassCoupeShaped",
  "DrinkShaker",
  "DrinkJigger",
  "DrinkShotGlass",
  "Pitcher",
  "DrinkShakerBluespace",
  "BarSpoon",
  "DrinkIceBucket",
];

function resolveSpriteComponent(chain: Obj[]): { rsi: string; state: string } | null {
  // A herança do jogo mescla os campos do componente Sprite: o filho pode
  // sobrescrever só o RSI (ou só o estado) e herdar o restante dos pais.
  // Por isso combinamos os componentes ao longo da cadeia em vez de usar
  // apenas o primeiro encontrado.
  let rsi: string | null = null;
  let explicitState: string | null = null;
  let layerState: string | null = null;
  let explicitStateIndex = Number.POSITIVE_INFINITY;
  let layerStateIndex = Number.POSITIVE_INFINITY;

  for (const [protoIndex, proto] of chain.entries()) {
    for (const component of arrayOf(proto.components)) {
      const sprite = record(component);
      if (sprite?.type !== "Sprite") continue;

      if (!rsi) {
        const value = asString(sprite.sprite);
        if (value) rsi = value;
      }
      if (!explicitState) {
        const value = asString(sprite.state);
        if (value) {
          explicitState = value;
          explicitStateIndex = protoIndex;
        }
      }
      if (!layerState) {
        for (const layer of arrayOf(sprite.layers)) {
          const layerRec = record(layer);
          const value = layerRec ? asString(layerRec.state) : null;
          if (value) {
            layerState = value;
            layerStateIndex = protoIndex;
            break;
          }
        }
      }
    }
  }

  if (!rsi) return null;
  // O estado explícito herdado não deve sobrepor uma camada definida mais
  // perto da entidade (ex.: alco-bottle.rsi usa icon_blue/icon_green nas
  // camadas, mas o pai define state: icon).
  const state =
    layerState && layerStateIndex <= explicitStateIndex
      ? layerState
      : explicitState ?? layerState ?? "icon";
  // O estado padrão dos RSIs do jogo é "icon" quando o protótipo não
  // especifica estado nem camadas.
  return { rsi, state };
}

function capacityOf(chain: Obj[]): { capacidade: number | null; fonte: string | null } {
  const manager = firstComponent(chain, "SolutionContainerManager");
  const solutions = record(manager?.solutions);
  if (solutions) {
    const drink = record(solutions.drink);
    const drinkMax = asNumber(drink?.maxVol);
    if (drinkMax !== null) return { capacidade: drinkMax, fonte: "SolutionContainerManager.solutions.drink.maxVol" };
    for (const [name, solution] of Object.entries(solutions)) {
      const max = asNumber(record(solution)?.maxVol);
      if (max !== null) return { capacidade: max, fonte: `SolutionContainerManager.solutions.${name}.maxVol` };
    }
    for (const solution of Object.values(solutions)) {
      const rec = record(solution);
      const reagents = arrayOf(rec?.reagents);
      if (reagents.length) {
        let total = 0;
        for (const item of reagents) total += asNumber(record(item)?.Quantity) ?? 0;
        if (total > 0) return { capacidade: total, fonte: "soma dos reagentes iniciais" };
      }
    }
  }
  return { capacidade: null, fonte: null };
}

function equipmentType(id: string): string {
  if (id === "BoozeDispenser" || id === "SodaDispenser") return "dispensa";
  if (id === "VendingMachineBooze") return "vending";
  if (["DrinkGlass", "DrinkGlassCoupeShaped", "DrinkShotGlass", "Pitcher"].includes(id)) return "vidraria";
  if (["DrinkShaker", "DrinkShakerBluespace", "DrinkJigger", "BarSpoon", "DrinkIceBucket"].includes(id)) return "ferramenta";
  return "outro";
}

function buildEquipment(id: string): Equipment | null {
  const proto = entityById.get(id);
  if (!proto) return null;
  const chain = entityChain(id);
  const localized = localizedEntity(id);
  const { capacidade, fonte } = capacityOf(chain);
  const spriteInfo = resolveSpriteComponent(chain);
  const sprite = spriteInfo ? ensureState(spriteInfo.rsi, spriteInfo.state, id) : null;
  return {
    id,
    nome: localized.nome.valor,
    descricao: localized.descricao.valor,
    traducao: translationOf(localized.nome, localized.descricao),
    nomeTraducao: localized.nome.traducao,
    descricaoTraducao: localized.descricao.traducao,
    tipo: equipmentType(id),
    capacidade,
    capacidadeFonte: fonte,
    cabeNaDispensa: hasComponent(chain, "FitsInDispenser"),
    sprite,
    origem: sourceOf(proto),
  };
}

function bottleContents(bottleId: string): Array<{ reagenteId: string; quantidade: number }> {
  const proto = entityById.get(bottleId);
  if (!proto) return [];
  const chain = entityChain(bottleId);
  const manager = firstComponent(chain, "SolutionContainerManager");
  const solutions = record(manager?.solutions);
  if (!solutions) return [];
  const out: Array<{ reagenteId: string; quantidade: number }> = [];
  for (const solution of Object.values(solutions)) {
    const rec = record(solution);
    for (const item of arrayOf(rec?.reagents)) {
      const reagentId = asString(record(item)?.ReagentId ?? record(item)?.reagentId);
      const quantity = asNumber(record(item)?.Quantity ?? record(item)?.quantity);
      if (reagentId && quantity !== null) out.push({ reagenteId: reagentId, quantidade: quantity });
    }
  }
  return out;
}

function buildDispenser(id: string): Dispenser | null {
  const equipment = buildEquipment(id);
  if (!equipment) return null;
  const chain = entityChain(id);
  const fill = firstComponent(chain, "StorageFill");
  const contents = arrayOf(fill?.contents);
  const rows: DispenserContent[] = [];
  for (const raw of contents) {
    const rec = record(raw);
    const bottleId = rec ? asString(rec.id) : null;
    if (!bottleId) continue;
    const bottleName = localizedEntity(bottleId).nome.valor;
    const found = bottleContents(bottleId);
    if (!found.length) {
      rows.push({
        reagenteId: bottleId,
        nome: bottleName,
        quantidade: 0,
        garrafaId: bottleId,
        garrafaNome: bottleName,
        bebidaId: drinkIds.has(bottleId) ? bottleId : null,
      });
      continue;
    }
    for (const item of found) {
      const localized = localizedReagent(item.reagenteId);
      const reagent = reagentById.get(item.reagenteId);
      rows.push({
        reagenteId: item.reagenteId,
        nome: localized.nome.valor,
        quantidade: item.quantidade,
        garrafaId: bottleId,
        garrafaNome: bottleName,
        bebidaId: drinkIds.has(item.reagenteId) ? item.reagenteId : null,
      });
      void reagent;
    }
  }
  const aggregated = new Map<string, DispenserContent>();
  for (const row of rows) {
    const current = aggregated.get(row.reagenteId);
    if (current) {
      current.quantidade += row.quantidade;
      if (current.garrafaId !== row.garrafaId) current.garrafaId = `${current.garrafaId},${row.garrafaId}`;
      if (current.garrafaNome !== row.garrafaNome) current.garrafaNome = `${current.garrafaNome}, ${row.garrafaNome}`;
    } else {
      aggregated.set(row.reagenteId, { ...row });
    }
  }
  return { ...equipment, conteudo: [...aggregated.values()] };
}

const dispensers = ["BoozeDispenser", "SodaDispenser"]
  .map((id) => buildDispenser(id))
  .filter((d): d is Dispenser => Boolean(d));

function buildVending(): Vending | null {
  const id = "VendingMachineBooze";
  const equipment = buildEquipment(id);
  if (!equipment) return null;
  const proto = entityById.get(id);
  if (!proto) return null;
  const chain = entityChain(id);
  const vending = firstComponent(chain, "VendingMachine");
  const pack = asString(vending?.pack);
  const inventory = pack ? inventoryById.get(pack) : null;

  const toItems = (value: unknown): VendingItem[] => {
    const rec = record(value) ?? {};
    return Object.entries(rec)
      .map(([itemId, count]) => {
        const quantity = asNumber(count) ?? 0;
        const localized = localizedEntity(itemId);
        const itemChain = entityChain(itemId);
        const spriteInfo = resolveSpriteComponent(itemChain);
        const sprite = spriteInfo ? ensureState(spriteInfo.rsi, spriteInfo.state, itemId) : null;
        const hasSolution = hasComponent(itemChain, "SolutionContainerManager");
        const mixer = hasComponent(itemChain, "ReactionMixer");
        const type = hasSolution ? "garrafa" : mixer ? "ferramenta" : equipmentType(itemId);
        return {
          id: itemId,
          nome: localized.nome.valor,
          quantidade: quantity,
          tipo: type,
          traducao: translationOf(localized.nome, localized.descricao),
          sprite,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  };

  return {
    id,
    nome: equipment.nome,
    descricao: equipment.descricao,
    traducao: equipment.traducao,
    sprite: equipment.sprite,
    inventario: toItems(inventory?.startingInventory),
    contrabando: toItems(inventory?.contrabandInventory),
    emagged: toItems(inventory?.emaggedInventory),
  };
}

const vending = buildVending();
const equipmentList = equipmentIds
  .map((id) => buildEquipment(id))
  .filter((e): e is Equipment => Boolean(e));

/* -------------------------------------------------------------------------- */
/* Guia do barman (XML + equipamentos)                                        */
/* -------------------------------------------------------------------------- */

const guidePath = join(options.repo, "Resources", "ServerInfo", "Guidebook", "Service", "Bartender.xml");
const guideRaw = readFileSync(guidePath, "utf8").replace(/<!--[\s\S]*?-->/g, "");

const guideTranslations: Record<string, string> = {
  Bartender: "Barman",
  "The bartender has a pretty simple job: serve drinks. People will come up to you and request drinks, and your job is just to hand it to them.":
    "O barman tem um trabalho bem simples: servir bebidas. As pessoas chegam até você e pedem drinks; seu trabalho é só entregar.",
  "Click here to see a complete list of drinks.": "Veja aqui a lista completa de bebidas.",
  "The materials for these drinks can be found in various places:":
    "Os materiais para essas bebidas podem ser encontrados em vários lugares:",
  "Don't forget containers to serve them in!": "Não se esqueça dos recipientes para servir!",
  "You can find a list of every drink that can be requested under the Reference Tables entry.":
    "A lista de todas as bebidas que podem ser pedidas está no menu de bebidas.",
};

interface GuideBlock {
  tipo: "titulo" | "paragrafo" | "link" | "entidades";
  texto?: string;
  textoOriginal?: string;
  traducao?: Traducao;
  href?: string;
  entidades?: Array<{ id: string; legenda: string | null }>;
}

const guideBlocks: GuideBlock[] = [];
{
  const lines = guideRaw.split(/\r?\n/);
  let paragraph: string[] = [];
  let entityBox: Array<{ id: string; legenda: string | null }> | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(" ").replace(/\s+/g, " ").trim();
    paragraph = [];
    if (!text) return;
    const translated = guideTranslations[text];
    guideBlocks.push({
      tipo: "paragrafo",
      texto: translated ?? text,
      textoOriginal: text,
      traducao: translated ? "pt" : "en",
    });
  };

  const flushEntities = () => {
    if (entityBox && entityBox.length) {
      guideBlocks.push({ tipo: "entidades", entidades: entityBox });
    }
    entityBox = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line === "<Document>" || line === "</Document>") {
      flushParagraph();
      flushEntities();
      continue;
    }
    if (line === "<Box>") {
      flushParagraph();
      entityBox = [];
      continue;
    }
    if (line === "</Box>") {
      flushEntities();
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      const original = line.slice(2).trim();
      const translated = guideTranslations[original];
      guideBlocks.push({
        tipo: "titulo",
        texto: translated ?? original,
        textoOriginal: original,
        traducao: translated ? "pt" : "en",
      });
      continue;
    }
    const embed = line.match(/^<GuideEntityEmbed\s+(.+?)\s*\/>$/);
    if (embed) {
      flushParagraph();
      const attrs = embed[1];
      const entity = attrs.match(/Entity="([^"]+)"/)?.[1] ?? null;
      const caption = attrs.match(/Caption="([^"]+)"/)?.[1] ?? null;
      if (entity) {
        if (!entityBox) entityBox = [];
        entityBox.push({ id: entity, legenda: caption });
      }
      continue;
    }
    const link = line.match(/^\[textlink="(.*?)"\s+link="(.*?)"\]$/);
    if (link) {
      flushParagraph();
      const text = link[1];
      const target = link[2];
      const translated = guideTranslations[text];
      guideBlocks.push({
        tipo: "link",
        texto: translated ?? text,
        textoOriginal: text,
        traducao: translated ? "pt" : "en",
        href: target.toLowerCase() === "drinks" ? "#/menu" : "#/guia",
      });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushEntities();
}

const guideEntityIds = new Set<string>();
for (const block of guideBlocks) {
  for (const entity of block.entidades ?? []) guideEntityIds.add(entity.id);
}

const guideEquipment = [...guideEntityIds]
  .map((id) => buildEquipment(id))
  .filter((e): e is Equipment => Boolean(e));

const extraEquipment = equipmentList.filter(
  (equipment) => !guideEntityIds.has(equipment.id) && equipment.tipo !== "vending",
);

/* -------------------------------------------------------------------------- */
/* Métodos de mistura                                                         */
/* -------------------------------------------------------------------------- */

const methodEntityMap: Record<string, string[]> = {
  Shake: ["DrinkShaker", "DrinkShakerBluespace"],
  Stir: ["BarSpoon", "Spoon"],
  Holy: ["Bible"],
  Centrifuge: ["MachineCentrifuge"],
  Electrolysis: ["MachineElectrolysisUnit"],
};

const methodDescriptions: Record<string, string> = {
  Shake: "Coloque os ingredientes no shaker e agite. Necessário para receitas com a categoria Shake.",
  Stir: "Misture com a colher de bar. Necessário para receitas com a categoria Stir.",
  Holy: "Método especial de capela; aparece em reações fora do balcão.",
  Centrifuge: "Separação por centrífuga, usada em reações químicas específicas.",
  Electrolysis: "Eletrólise, usada em reações químicas específicas.",
  DummyMix: "Mistura padrão.",
  DummyGrind: "Trituração.",
  DummyJuice: "Extração de suco.",
  DummyCondense: "Condensação.",
};

function methodName(id: string): { valor: string; traducao: Traducao } {
  // O pt-BR do repositório não traduz os verbos Shake/Stir; usamos os
  // rótulos de interface combinados com a equipe do guia.
  const ui: Record<string, string> = {
    Shake: "Agitar",
    Stir: "Mexer",
    Holy: "Abençoar",
    Centrifuge: "Centrifugar",
    Electrolysis: "Eletrolisar",
  };
  if (ui[id]) return { valor: ui[id], traducao: "pt" };
  const proto = mixingCategories.find((m) => m.id === id);
  const key = proto ? asString(proto.verbText) : null;
  const pt = key ? locales.maps["pt-BR"].get(key) : null;
  const en = key ? locales.maps["en-US"].get(key) : null;
  if (pt) return { valor: pt, traducao: "pt" };
  if (en) return { valor: en, traducao: "en" };
  return { valor: humanizeId(id), traducao: "pt" };
}

const methodIds = new Set<string>();
for (const category of mixingCategories) methodIds.add(String(category.id));
for (const drink of drinks) for (const recipe of drink.receitas) for (const method of recipe.metodos) methodIds.add(method);

const methods: Method[] = [...methodIds]
  .map((id) => {
    const name = methodName(id);
    const entityId = methodEntityMap[id]?.[0] ?? null;
    const equipment = entityId ? buildEquipment(entityId) : null;
    return {
      id,
      verbo: name.valor,
      verboTraducao: name.traducao,
      entidadeId: entityId,
      entidadeNome: equipment?.nome ?? null,
      entidadeSprite: equipment?.sprite ?? null,
      descricao: methodDescriptions[id] ?? "Categoria de mistura definida pelo jogo.",
    };
  })
  .filter((method) => !method.id.startsWith("Dummy"))
  .sort((a, b) => {
    const order = ["Shake", "Stir", "Centrifuge", "Electrolysis", "Holy"];
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.verbo.localeCompare(b.verbo, "pt-BR");
  });

/* -------------------------------------------------------------------------- */
/* Espelhos para o site                                                       */
/* -------------------------------------------------------------------------- */

const vidraria = equipmentList
  .filter((equipment) => equipment.capacidade !== null && ["vidraria", "ferramenta"].includes(equipment.tipo))
  .map((equipment) => {
    let uso = "ferramenta";
    if (["DrinkGlass", "DrinkGlassCoupeShaped", "DrinkShotGlass", "Pitcher"].includes(equipment.id)) uso = "servir";
    else if (equipment.id === "DrinkJigger") uso = "medir";
    else if (equipment.id.startsWith("DrinkShaker")) uso = "misturar";
    return { ...equipment, uso };
  })
  .sort((a, b) => (b.capacidade ?? 0) - (a.capacidade ?? 0));

const guide = {
  titulo: "Guia do Barman",
  blocos: guideBlocks,
  equipamentos: guideEquipment,
  extras: extraEquipment,
  dispensas: dispensers,
  vending,
  metodos: methods,
  vidraria,
  fonte: {
    arquivo: rel(guidePath),
    url: "https://github.com/Project-Dumont/Dumont-Station",
  },
};

/* -------------------------------------------------------------------------- */
/* Sprites.json + créditos                                                    */
/* -------------------------------------------------------------------------- */

const spriteIndex: Record<string, unknown> = {};
for (const [rsi, copy] of [...rsiCopies.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const states: Record<string, CopiedSprite> = {};
  for (const [name, sprite] of Object.entries(copy.states).sort((a, b) => a[0].localeCompare(b[0]))) {
    states[name] = sprite;
  }
  spriteIndex[rsi] = {
    licenca: copy.meta.license ?? "Não declarada",
    copyright: copy.meta.copyright ?? "",
    tamanho: copy.meta.size,
    estados: states,
  };
}

const usedSourceFiles = new Set<string>();
for (const proto of drinkProtos) usedSourceFiles.add(proto.__file);
for (const reaction of drinkReactions) usedSourceFiles.add(reaction.__file);
for (const equipment of equipmentList) if (equipment.origem) usedSourceFiles.add(equipment.origem.file);
usedSourceFiles.add(rel(guidePath));

const licenseFiles: Array<{ arquivo: string; licencas: string[] }> = [];
for (const file of [...usedSourceFiles].sort()) {
  const licenses = readSpdx(join(options.repo, file));
  licenseFiles.push({ arquivo: file, licencas: licenses.length ? licenses : ["Não declarada no cabeçalho"] });
}

const spriteLicenses = [...rsiCopies.entries()]
  .map(([rsi, copy]) => ({
    rsi,
    licenca: copy.meta.license ?? "Não declarada",
    copyright: copy.meta.copyright ?? "",
    estados: Object.keys(copy.states).sort(),
  }))
  .sort((a, b) => a.rsi.localeCompare(b.rsi));

let commit = "desconhecido";
let remote = "https://github.com/Project-Dumont/Dumont-Station";
try {
  commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: options.repo,
    encoding: "utf8",
  }).trim();
  remote = execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: options.repo,
    encoding: "utf8",
  }).trim();
} catch {
  // O repositório pode ter sido copiado sem .git; seguimos com os padrões.
}

const generatedAt = new Date().toISOString();
const credits = {
  projeto: "Guia do Barman — Dumont Station",
  aviso:
    "Projeto de fã, não oficial e sem vínculo com a Project Dumont, Gaby Station, Goobstation ou Space Station 14. Os nomes, receitas e sprites pertencem aos seus respectivos autores.",
  fonte: {
    repositorio: remote,
    commit,
    geradoEm: generatedAt,
    comando:
      'npm run extract -- --repo "<caminho-do-Dumont-Station>"',
  },
  licencaProjeto:
    "Código e dados do repositório Dumont Station sob AGPL-3.0-or-later, salvo indicação diferente nos cabeçalhos dos arquivos. Assets seguem as licenças declaradas em cada meta.json.",
  creditos: [
    "Project Dumont — Dumont Station",
    "Gaby Station",
    "Space Station 14",
    "Goobstation",
    "Delta-V",
    "Frontier Station (_NF)",
    "RMC14",
    "Autores individuais citados nos metadados dos sprites",
  ],
  licencasSprites: spriteLicenses,
  licencasArquivos: licenseFiles,
  ferramentas: [
    "Vite",
    "TypeScript",
    "Tailwind CSS",
    "DaisyUI",
    "Pacote `yaml` para leitura tolerante de protótipos",
  ],
};

/* -------------------------------------------------------------------------- */
/* Relatório                                                                  */
/* -------------------------------------------------------------------------- */

function mdList(items: string[], empty = "_Nenhum._"): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

const noSprite = drinks.filter((drink) => !drink.sprite).map((drink) => `${drink.nome} (\`${drink.id}\`)`);
const fallbackEn = drinks
  .filter((drink) => drink.traducao === "en")
  .map((drink) => `${drink.nome} (\`${drink.id}\`)`);
const fallbackId = drinks
  .filter((drink) => drink.traducao === "id")
  .map((drink) => `${drink.nome} (\`${drink.id}\`)`);
const ingredientFallbackEn = ingredients
  .filter((ingredient) => ingredient.traducao === "en" && !ingredient.bebida)
  .map((ingredient) => `${ingredient.nome} (\`${ingredient.id}\`)`);
const ingredientFallbackId = ingredients
  .filter((ingredient) => ingredient.traducao === "id" && !ingredient.bebida)
  .map((ingredient) => `${ingredient.nome} (\`${ingredient.id}\`)`);

const sourceCounts = new Map<string, { bebidas: number; receitas: number }>();
for (const drink of drinks) {
  const entry = sourceCounts.get(drink.origem.file) ?? { bebidas: 0, receitas: 0 };
  entry.bebidas++;
  entry.receitas += drink.receitas.length;
  sourceCounts.set(drink.origem.file, entry);
}

const reportLines = [
  "# Relatório de extração — Guia do Barman",
  "",
  `Gerado em **${generatedAt}** a partir do repositório \`${basename(options.repo)}\` (commit \`${commit}\`).`,
  "",
  "## Números",
  "",
  `- Arquivos YAML lidos em \`Resources/Prototypes\`: **${yamlFiles.length}**`,
  `- Arquivos com erro de parse (ignorados): **${parseErrors.length}**`,
  `- Avisos de tags YAML desconhecidas: **${warningCount}**`,
  `- Reagentes totais: **${reagents.length}**`,
  `- Reagentes de bebida extraídos: **${drinks.length}**`,
  `- Bebidas com receita: **${drinks.filter((d) => d.receitas.length > 0).length}**`,
  `- Bebidas/base sem receita: **${drinks.filter((d) => d.receitas.length === 0).length}**`,
  `- Reações em arquivos de drinks: **${drinkReactions.length}**`,
  `- Receitas anexadas a bebidas: **${drinks.reduce((sum, d) => sum + d.receitas.length, 0)}**`,
  `- Ingredientes (bebidas + insumos) no índice reverso: **${ingredients.length}**`,
  `- Sprites copiados: **${copiedStateCount.value}** estados de **${rsiCopies.size}** RSIs`,
  `- Copo padrão de fallback: ${
    defaultGlass
      ? `\`${defaultGlass.rsi}/${defaultGlass.estado}\` com **${defaultGlass.maxNiveis}** níveis e sobreposição \`${defaultGlass.estadoSobreposicao ?? "—"}\``
      : "não encontrado"
  }`,
  `- Equipamentos do guia: **${guideEquipment.length}** + extras **${extraEquipment.length}**`,
  `- Dispensas: **${dispensers.length}**; itens na máquina de vendas: **${vending?.inventario.length ?? 0}**`,
  `- Métodos de mistura: **${methods.length}**`,
  "",
  "## Cobertura por arquivo de bebida",
  "",
  "| Arquivo | Bebidas | Receitas |",
  "| --- | ---: | ---: |",
  ...[...sourceCounts.entries()]
    .sort((a, b) => b[1].bebidas - a[1].bebidas)
    .map(([file, count]) => `| \`${file}\` | ${count.bebidas} | ${count.receitas} |`),
  "",
  "## Bebidas sem sprite metamórfico",
  "",
  mdList(noSprite),
  "",
  defaultGlass
    ? `Essas bebidas não definem \`metamorphicSprite\`. No jogo, o copo \`${defaultGlass.rsi}\` é o fallback autêntico; o site copia os estados \`${defaultGlass.estado}\`, ${defaultGlass.estadosPreenchimento.map((state) => `\`${state}\``).join(", ")} e \`${defaultGlass.estadoSobreposicao ?? "—"}\` e os exibe com o mesmo tingimento do jogo.`
    : "O copo padrão do jogo não foi encontrado; o site usa uma ilustração CSS apenas como último recurso.",
  "",
  "## Fallback de tradução (bebidas)",
  "",
  `Sem nome/descrição em pt-BR, usando en-US: **${fallbackEn.length}**.`,
  "",
  fallbackEn.length ? mdList(fallbackEn) : "_Nenhum._",
  "",
  `Sem nome/descrição nem en-US (nome derivado do ID): **${fallbackId.length}**.`,
  "",
  fallbackId.length ? mdList(fallbackId) : "_Nenhum._",
  "",
  "## Fallback de tradução (insumos não-bebida)",
  "",
  `Usando en-US: **${ingredientFallbackEn.length}**; derivados do ID: **${ingredientFallbackId.length}**.`,
  "",
  ingredientFallbackEn.length ? mdList(ingredientFallbackEn) : "_Nenhum._",
  ingredientFallbackId.length ? mdList(ingredientFallbackId) : "_Nenhum._",
  "",
  "## Reações não anexadas",
  "",
  ...(unlinkedReactionProducts.length
    ? [
        "Produtos de reação sem protótipo de reagente correspondente:",
        "",
        ...unlinkedReactionProducts.map(
          (item) => `- \`${item.reacao}\` → \`${item.produto}\` (\`${item.arquivo}\`)`,
        ),
      ]
    : ["_Nenhuma._"]),
  "",
  ...(ignoredReactions.length
    ? [
        "Reações ignoradas (fora do escopo ou sem produto de bebida):",
        "",
        ...ignoredReactions.map(
          (item) => `- \`${item.id}\`: ${item.motivo} (\`${item.arquivo}\`)`,
        ),
      ]
    : []),
  "",
  "## Erros de sprite",
  "",
  spriteErrors.length ? mdList(spriteErrors.map((e) => `${e.id}: ${e.motivo}`)) : "_Nenhum._",
  "",
  "## IDs duplicados",
  "",
  duplicateIds.length
    ? mdList(duplicateIds.map((d) => `${d.tipo} \`${d.id}\`: ${d.ocorrencias.join(" | ")}`))
    : "_Nenhum._",
  "",
  "## Erros de parse (fora do escopo de bebidas)",
  "",
  parseErrors.length
    ? mdList(parseErrors.map((e) => `\`${e.arquivo}\`: ${e.erro}`))
    : "_Nenhum._",
  "",
  "## Observações",
  "",
  "- O filtro `type: reaction` só considera arquivos `Recipes/Reactions/drinks.yml` (base e forks).",
  "- Reações de decomposição/sangue não são tratadas como receitas de bar.",
  "- `metamorphicChangeColor` controla o uso de máscara CSS no site; quando falso, o PNG de preenchimento é usado sem tingimento.",
  "- A capacidade das bebidas vem de `SolutionContainerManager.solutions.drink.maxVol` das entidades de vidraria.",
  "- O pt-BR não possui `mixing-verb-shake` nem `mixing-verb-stir`; o site usa rótulos de interface em português e mantém o dado original no JSON.",
  "- As licenças dos sprites são agregadas em `creditos.json`; cada RSI mantém seu `meta.json` original.",
  "",
  "## Reprodução",
  "",
  "```powershell",
  'cd "<caminho-do-projeto>"',
  'npm run extract -- --repo "<caminho-do-Dumont-Station>"',
  "npm run dev",
  "```",
  "",
];

mkdirSync(options.out, { recursive: true });
mkdirSync(dirname(options.report), { recursive: true });

const payload = {
  "bebidas.json": drinks,
  "ingredientes.json": ingredients,
  "vidraria.json": vidraria,
  "sprites.json": { padrao: defaultGlass, rsis: spriteIndex },
  "guia.json": guide,
  "creditos.json": credits,
};

for (const [file, data] of Object.entries(payload)) {
  writeFileSync(join(options.out, file), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const reportText = reportLines.join("\n");
writeFileSync(options.report, reportText, "utf8");
writeFileSync(join(options.out, "relatorio.md"), reportText, "utf8");

/* -------------------------------------------------------------------------- */
/* Resumo no terminal                                                         */
/* -------------------------------------------------------------------------- */

console.log("Extração concluída.");
console.log(`  Repositório: ${options.repo}`);
console.log(`  Bebidas: ${drinks.length} (${drinks.filter((d) => d.receitas.length > 0).length} com receita)`);
console.log(`  Ingredientes: ${ingredients.length}`);
console.log(`  Receitas: ${drinks.reduce((sum, d) => sum + d.receitas.length, 0)}`);
console.log(`  Sprites: ${copiedStateCount.value} estados / ${rsiCopies.size} RSIs`);
console.log(`  Dados: ${options.out}`);
console.log(`  Sprites: ${options.sprites}`);
console.log(`  Relatório: ${options.report}`);
if (parseErrors.length) console.log(`  Aviso: ${parseErrors.length} YAMLs fora do escopo não puderam ser lidos.`);
