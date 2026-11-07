# Guia do Barman — Dumont Station (SS14)

Site estático de fã, em português brasileiro, para consultar bebidas, receitas, ingredientes, equipamentos e capacidades reais do **Dumont Station / Gaby Station** em **Space Station 14**.

Os dados e sprites são extraídos do repositório local do servidor. **Nenhuma receita, quantidade ou capacidade foi digitada à mão no site.**

> **Aviso:** projeto não oficial, feito por fãs. Não é afiliado à Dumont Station, à Gaby Station, ao Space Station 14 ou aos seus mantenedores. Em caso de divergência, valem os protótipos e as regras do servidor.

---

## O que o site tem

- **191 bebidas**, sendo **133 com receita** e **58 bases/ingredientes sem receita registrada**.
- **113 ingredientes** no índice reverso, **138 receitas** e **833 estados de sprite** de **198 RSIs**.
- **Busca global fuzzy** por drink, ingrediente, equipamento, método, categoria ou guia.
  - Atalhos: `/` em qualquer página, `Ctrl+K` (ou `⌘K`), `↑`/`↓` para navegar, `Enter` para abrir e `Esc` para fechar.
  - Busca sem diferença de acentos e tolerante a pequenos erros de digitação.
- **Menu completo** com filtros por categoria, teor alcoólico, método, presença de receita e ingrediente; ordenação por nome, teor, número de receitas e outros critérios.
- **Ficha do drink** com:
  - arte em pixel art RSI e seletor de preenchimento do copo;
  - variantes de receita, ingredientes, método e temperatura;
  - árvore de preparo com receitas intermediárias;
  - índice reverso “Aparece em”;
  - calculadora de lote com as capacidades reais da vidraria;
  - botão para copiar a receita no formato do chat do jogo;
  - copiar link, favoritar e imprimir.
- **“O que posso fazer?”**: marque o que há no balcão e veja drinks prontos, quase prontos e todas as receitas, com o que falta.
- **Guia do barman** gerado a partir de `Bartender.xml`, com métodos, equipamentos, dispensas, máquina de vendas e tabela de vidraria/capacidades.
- **Favoritos e estoque** persistidos apenas no `localStorage` do navegador.
- **Tema escuro quente por padrão**, tema claro quente e modo automático conforme `prefers-color-scheme`.
- **Rotas profundas por hash**, layout responsivo, navegação por teclado, foco visível, `prefers-reduced-motion` e CSS de impressão.
- **Créditos e licenças** por RSI, com o `meta.json` original preservado.

---

## Início rápido (PowerShell)

Requisitos:

- Node.js **22.12+** (ou 20.19+) — testado com Node 24.22.1;
- npm 11+;
- uma cópia local do repositório Dumont-Station.

```powershell
cd "<caminho-do-projeto>"
npm ci

npm run extract -- --repo "<caminho-do-Dumont-Station>"

npm run dev
```

> Substitua os valores entre `<...>` pelos caminhos reais da sua máquina.

Abra <http://localhost:5173/>.

Para servir o build de produção localmente:

```powershell
npm run build
npm run preview
```

Abra <http://localhost:4173/>.

> O repositório de origem é somente leitura para o extrator. Ele lê YAMLs, locales, XMLs e texturas, mas grava apenas em `public/data`, `public/sprites` e no relatório do projeto.

---

## Extração

O extrator é TypeScript e roda com `tsx`. O comando é repetível: pode ser executado novamente após atualizar o checkout do servidor.

```powershell
npm run extract -- --repo "<caminho-do-Dumont-Station>"
```

Também é possível usar a variável de ambiente `DUMONT_REPO`:

```powershell
$env:DUMONT_REPO = "<caminho-do-Dumont-Station>"
npm run extract
Remove-Item Env:DUMONT_REPO
```

### Opções

| Opção | Padrão | Descrição |
| --- | --- | --- |
| `--repo <pasta>` | — (obrigatório) | Raiz do repositório Dumont-Station. |
| `--out <pasta>` | `public/data` | Destino dos JSONs gerados. |
| `--sprites <pasta>` | `public/sprites` | Destino dos sprites copiados. |
| `--report <arquivo>` | `RELATORIO-EXTRACAO.md` | Relatório Markdown da extração. |

Os caminhos de saída são validados: o extrator **recusa** qualquer `--out`, `--sprites` ou `--report` dentro de `--repo`, evitando writes acidentais na fonte.

### O que é gerado

| Arquivo | Conteúdo |
| --- | --- |
| `public/data/bebidas.json` | Bebidas, categorias, sabores, receitas, índice reverso e referência de sprite. |
| `public/data/ingredientes.json` | Bebidas e insumos usados como reagentes, com tradução e índice reverso. |
| `public/data/guia.json` | Blocos do `Bartender.xml`, métodos, equipamentos, dispensas, vending e vidraria. |
| `public/data/vidraria.json` | Vidraria e capacidades reais extraídas dos protótipos. |
| `public/data/sprites.json` | Índice das RSIs, estados disponíveis, dimensões e licenças. |
| `public/data/creditos.json` | Atribuições, commit de origem e licenças agregadas. |
| `public/sprites/**` | Somente os estados necessários, copiados sem alteração, mais o `meta.json` de cada RSI. |
| `RELATORIO-EXTRACAO.md` | Números, cobertura, fallbacks, reações não anexadas, erros e reprodução. |
| `public/data/relatorio.md` | Cópia do relatório servida pelo site. |

### Fontes lidas no repositório

- **Bebidas:** `Resources/Prototypes/Reagents/Consumable/Drink/*.yml`, incluindo forks relevantes (`_NF`, `_DV`, `_Gabystation`, `_Goobstation`, `_RMC14` etc.).
- **Receitas:** `Resources/Prototypes/**/Recipes/Reactions/drinks.yml`.
- **Textos:** `Resources/Locale/pt-BR` e `Resources/Locale/en-US` (FTL).
- **Sprites:** `Resources/Textures/Objects/Consumable/Drinks/**`, com `meta.json`.
- **Guia:** `Resources/ServerInfo/Guidebook/Service/Bartender.xml`.
- **Capacidades:** `SolutionContainerManager.solutions.drink.maxVol` das entidades de vidraria.
- **Dispensas e vending:** protótipos de máquinas e seus inventários.

---

## Fase 0 — reconhecimento e decisões

O reconhecimento foi feito no commit `9a951396c2` do repositório Dumont-Station.

### Números do inventário

- **5.212** arquivos YAML lidos em `Resources/Prototypes`.
- **55** arquivos com erro de parse, todos fora do escopo de bebidas.
- **16.337** avisos de tags YAML desconhecidas, preservadas durante a leitura.
- **541** reagentes no total; **191** reagentes de bebida extraídos.
- **133** bebidas com receita; **58** bases/ingredientes sem receita.
- **140** reações nos arquivos de drinks; **138** receitas anexadas.
- **113** ingredientes no índice reverso.
- **7** equipamentos do guia + **5** extras; **2** dispensas; **47** itens de vending.
- **5** métodos de mistura; **8** itens de vidraria.
- **833** estados de sprite de **198** RSIs.
- **0** erros de sprite e **0** IDs duplicados.

### Regras adotadas

1. **YAML com tags:** tags `!type:...` são preservadas como `__tag`; `parent` é resolvido e protótipos `abstract` são ignorados.
2. **Categoria pela cadeia de parentes:** `BaseJuice` → `suco`, `BaseSoda` → `refrigerante`, `BaseAlcohol` → `alcoolica`, `BaseDrink` → `sem-alcool`. O restante cai em `outro`.
3. **Receita pela reação:** a reação é anexada quando o ID do produto é igual ou começa com o ID da bebida, ou quando o método é `Shake`/`Stir`. Reações de decomposição/sangue não entram como receita de bar.
4. **Tradução:** `pt-BR` → `en-US` → nome derivado do ID. O campo `traducao` registra a origem (`pt`, `en` ou `id`), e o site mostra um selo quando o texto não é pt-BR. Nenhuma chave crua de localização é exibida.
5. **Sprites:** somente os estados usados são copiados, sem recompressão ou edição. O site usa `image-rendering: pixelated` e escala inteira. O tingimento por máscara CSS só é aplicado quando `metamorphicChangeColor: true`; caso contrário, o PNG de preenchimento é usado como está. Bebidas sem `metamorphicSprite` usam o copo padrão do jogo (`glass_clear.rsi`), com os mesmos estados de preenchimento e a sobreposição `icon-front`.
6. **Capacidades:** vêm de `SolutionContainerManager.solutions.drink.maxVol`; a calculadora de lote não estima nem arredonda capacidades por conta própria.
7. **Roteamento:** rotas em hash (`#/...`) para funcionar em hospedagem estática sem regra de rewrite no servidor.

### Achados que afetam a UI

- O locale pt-BR **não possui** `mixing-verb-shake` nem `mixing-verb-stir`. O dado original é mantido no JSON e a interface usa os rótulos **Agitar** e **Mexer**.
- **55 bebidas** usam fallback de nome/descrição em en-US, marcadas com o selo de tradução.
- **37 bebidas** não definem `metamorphicSprite` no repositório; a ficha e os cards usam o copo padrão autêntico do jogo (`glass_clear.rsi`), inclusive os nove níveis de preenchimento e o tingimento pela cor do reagente.
- **58 bebidas** são bases ou ingredientes sem receita registrada. O site não inventa receitas para elas.
- A reação `PumpkinSpiceLatte` produz um ID sem protótipo de reagente correspondente; ela aparece no relatório como não anexada.
- Os 55 YAMLs com erro de parse são de outros sistemas (datasets, objetivos, estruturas etc.) e não afetam o escopo de bebidas.
- Foram avaliados os temas `coffee` e `luxury` do DaisyUI; a identidade final usa temas próprios quentes: `guia` (escuro) e `guia-claro` (claro), com Newsreader + IBM Plex Sans/Mono.

O relatório completo, incluindo a lista de arquivos e fallbacks, fica em [`RELATORIO-EXTRACAO.md`](RELATORIO-EXTRACAO.md).

---

## Rotas

| Rota | Página |
| --- | --- |
| `#/` | Início, destaques e atalhos. |
| `#/menu` | Menu completo. |
| `#/menu?q=limao&cat=suco&ing=Vodka&receita=1&metodo=Shake&alcool=sem&ordenar=az` | Menu com estado nos parâmetros. |
| `#/bebida/:id` | Ficha da bebida, por exemplo `#/bebida/Mojito`. |
| `#/o-que-posso-fazer` | Estoque e receitas possíveis. |
| `#/guia` | Guia do barman. |
| `#/guia?eq=VendingMachineBooze` | Guia com destaque para um equipamento. |
| `#/guia?metodo=Shake` | Guia com destaque para um método. |
| `#/guia?secao=vidraria` / `#/guia?secao=dispensas` | Seções de vidraria e dispensas. |
| `#/favoritos` | Lista local de favoritos. |
| `#/creditos` | Créditos, licenças e comandos de reprodução. |
| Qualquer outra | Página 404 com caminho de volta. |

---

## Arquitetura

```text
guia-barman/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tools/
│  ├─ extract-bar.ts          # CLI e regras de extração
│  └─ lib/
│     ├─ yaml.ts              # parser tolerante, tags e parent
│     ├─ ftl.ts               # locales pt-BR/en-US
│     ├─ rsi.ts               # cópia de estados + meta.json
│     ├─ png.ts               # dimensões de PNG sem dependência externa
│     └─ text.ts              # humanização de IDs
├─ public/
│  ├─ data/                   # JSONs gerados
│  ├─ sprites/                # RSIs copiadas sem alteração
│  ├─ favicon.svg
│  └─ robots.txt
├─ src/
│  ├─ main.ts                 # bootstrap, rotas, atalhos e impressão
│  ├─ lib/                    # dados, busca, fuzzy, estado, router, tipos
│  ├─ components/             # layout, cards, sprite, busca, receita
│  ├─ pages/                  # home, menu, drink, maker, guide, favoritos...
│  └─ styles/                 # base, chrome, content, detail, pages, responsive
└─ RELATORIO-EXTRACAO.md
```

Stack: **Vite 8 + TypeScript 7 + Tailwind CSS 4 + DaisyUI 5**, sem framework de UI. O site é montado com DOM nativo e módulos pequenos.

### Dados principais

- `Drink.receitas[]`: receita com método, reagentes, produto, quantidade, temperaturas e observações.
- `Drink.usadoEm[]`: índice reverso com drink, quantidade, receita e método.
- `Drink.sprite`: RSI, estado base, estados de preenchimento, níveis e flag de mudança de cor.
- `Ingredient.usadoEm[]`: onde o insumo aparece como reagente.
- `Guide`: blocos do XML, equipamentos, extras, dispensas, vending, métodos e vidraria.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run extract -- --repo "<pasta>"` | Lê o repositório e regenera JSONs, sprites e relatório. |
| `npm run dev` | Servidor de desenvolvimento em `http://localhost:5173/`. |
| `npm run build` | Checagem TypeScript + build de produção em `dist/`. |
| `npm run preview` | Serve o build em `http://localhost:4173/`. |

O `npm run build` emite dois avisos internos do otimizador de CSS do DaisyUI sobre seletores `@scope` vazios. Eles não impedem o build e não vêm do CSS do projeto.

---

## Publicação no GitHub Pages

O `base` do Vite vem da variável `VITE_BASE` (veja `vite.config.ts`). Para um projeto publicado em `https://usuario.github.io/guia-barman/`:

```powershell
cd "<caminho-do-projeto>"
$env:VITE_BASE = "/guia-barman/"
npm run build
Remove-Item Env:VITE_BASE
```

Publique o conteúdo de `dist/`. Como o site usa rotas em hash, não é necessário configurar fallback 404 para deep links.

Para domínio próprio ou publicação na raiz, gere sem `VITE_BASE`:

```powershell
npm run build
```

Um fluxo mínimo de GitHub Actions seria:

```yaml
name: Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_BASE: /guia-barman/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

Ajuste `VITE_BASE` se o repositório tiver outro nome. O workflow não roda a extração: os JSONs e sprites gerados precisam estar versionados no repositório de entrega, ou o workflow precisa de um checkout adicional do repositório do servidor.

> O `.gitignore` exclui `node_modules/` e `dist/`. Versione o código, `package-lock.json`, `public/data` e `public/sprites`; o build do Pages é gerado pelo workflow.

---

## Verificação e QA

- `npm run build` passa (os dois avisos de CSS do DaisyUI são conhecidos).
- Lighthouse no build de produção: **100** em acessibilidade, boas práticas e SEO nas sete rotas principais, nos temas **claro** e **escuro**.
- Busca testada com teclado real: `/`, `Ctrl+K`, `↑`, `↓`, `Enter` e `Esc`.
- Cópia de link e de receita testada com fallback para `document.execCommand("copy")` quando a Clipboard API é bloqueada.
- Navegação e layout verificados em larguras de 320 px, 390 px e desktop, sem overflow horizontal nas rotas principais.
- Layout de impressão inspecionado com as regras `@media print` aplicadas; a árvore de preparo é aberta automaticamente via `beforeprint` e restaurada em `afterprint`.
- Favoritos e estoque persistem no navegador e o tema auto/escuro/claro atualiza `theme-color`.

---

## Limitações conhecidas

- **58 bebidas sem receita**: são bases/insumos; o site não preenche lacunas com receitas inventadas.
- **55 bebidas com fallback en-US**: o selo de tradução é exibido; não há tradução automática.
- **55 YAMLs fora do escopo** não puderam ser lidos pelo parser. Nenhum deles é arquivo de bebida no commit atual.
- **Uma reação não anexada** (`PumpkinSpiceLatte`) por falta de protótipo de reagente correspondente.
- O snapshot de dados é do commit `9a951396c2`; mudanças no servidor exigem rodar a extração novamente.
- Favoritos e estoque ficam só no navegador, sem conta, sincronização ou exportação.
- A busca é local e heurística; não há índice remoto nem sinônimos curados.
- O layout de impressão depende do suporte do navegador a `beforeprint`/`afterprint`; vale conferir a prévia no navegador usado.
- O projeto usa rotas em hash. Isso simplifica o Pages, mas não gera URLs limpas nem pré-renderização para buscadores.
- O extrator foi escrito para a estrutura atual do Dumont-Station; forks com caminhos ou formatos muito diferentes podem exigir ajustes.

---

## Melhorias futuras

- Testes automatizados do extrator (fixtures de YAML, locales e RSI) e validação de schema dos JSONs.
- Testes end-to-end com Playwright cobrindo busca, filtros, favoritos, estoque, cópia e impressão.
- Auditoria de acessibilidade (axe/Lighthouse) e regressão visual no CI.
- Workflow de publicação com Pages + cache de dependências, e checagem de links.
- PWA/offline para consulta durante o turno, com cache dos JSONs e sprites.
- Sinônimos e tags de busca (sabor, temperatura, “sem álcool”, nomes alternativos) e ranking ajustável.
- Importação/exportação do estoque e favoritos, além de presets por bar.
- Calculadora com múltiplas vasilhas, conversão de unidades e sugestão de lotes por capacidade.
- Histórico de versões dos dados por commit, com diff de receitas e capacidades.
- Parser tolerante para os YAMLs restantes ou exclusão explícita documentada por caminho.
- Pré-renderização/History API para URLs limpas e melhor SEO, mantendo fallback estático.
- Contribuição das traduções faltantes de volta ao projeto de locale do servidor.
- Otimização de entrega de sprites (atlas/formatos modernos) sem alterar os arquivos-fonte copiados.

---

## Créditos e licenças

- Dados, textos, sprites e o guia vêm do repositório **Dumont-Station** (commit `9a951396c2`).
- Space Station 14 e Dumont Station pertencem aos seus respectivos autores e mantenedores. Este é um projeto de fã, não oficial.
- Cada RSI mantém seu `meta.json` original. As licenças e atribuições agregadas estão na página **Créditos e licenças** (`#/creditos`) e em `public/data/creditos.json`.
- O código deste site é entregue como projeto de fã; os dados e sprites seguem as licenças do repositório de origem.

---

## Comandos úteis (resumo)

```powershell
# Instalar dependências
cd "<caminho-do-projeto>"
npm ci

# Regenerar dados e sprites a partir da fonte
npm run extract -- --repo "<caminho-do-Dumont-Station>"

# Desenvolvimento
npm run dev

# Build e prévia
npm run build
npm run preview

# Build para GitHub Pages em /guia-barman/
$env:VITE_BASE = "/guia-barman/"
npm run build
Remove-Item Env:VITE_BASE

# Conferir a fonte sem alterações
git -C "<caminho-do-Dumont-Station>" status --porcelain
```

Se a porta 5173 ou 4173 estiver ocupada:

```powershell
npm run dev -- --port 5174
npm run preview -- --port 4174
```
