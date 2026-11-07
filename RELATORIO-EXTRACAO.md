# Relatório de extração — Guia do Barman

Gerado em **2026-11-07T03:50:52.221Z** a partir do repositório `Dumont-Station` (commit `9a951396c2`).

## Números

- Arquivos YAML lidos em `Resources/Prototypes`: **5212**
- Arquivos com erro de parse (ignorados): **55**
- Avisos de tags YAML desconhecidas: **16337**
- Reagentes totais: **541**
- Reagentes de bebida extraídos: **191**
- Bebidas com receita: **133**
- Bebidas/base sem receita: **58**
- Reações em arquivos de drinks: **140**
- Receitas anexadas a bebidas: **138**
- Ingredientes (bebidas + insumos) no índice reverso: **113**
- Sprites copiados: **833** estados de **198** RSIs
- Copo padrão de fallback: `Objects/Consumable/Drinks/glass_clear.rsi/icon` com **9** níveis e sobreposição `icon-front`
- Equipamentos do guia: **7** + extras **5**
- Dispensas: **2**; itens na máquina de vendas: **47**
- Métodos de mistura: **5**

## Cobertura por arquivo de bebida

| Arquivo | Bebidas | Receitas |
| --- | ---: | ---: |
| `Resources/Prototypes/Reagents/Consumable/Drink/alcohol.yml` | 119 | 100 |
| `Resources/Prototypes/Reagents/Consumable/Drink/drinks.yml` | 27 | 19 |
| `Resources/Prototypes/Reagents/Consumable/Drink/soda.yml` | 19 | 8 |
| `Resources/Prototypes/Reagents/Consumable/Drink/juice.yml` | 15 | 0 |
| `Resources/Prototypes/_NF/Reagents/Comsumables/Drink/drinks.yml` | 5 | 5 |
| `Resources/Prototypes/_DV/Reagents/Consumable/Drink/alcohol.yml` | 1 | 4 |
| `Resources/Prototypes/_Goobstation/Heretic/Reagents/reagents.yml` | 1 | 0 |
| `Resources/Prototypes/_Gabystation/Reagents/Consumable/Drink/alcohol.yml` | 1 | 1 |
| `Resources/Prototypes/_Goobstation/Wizard/reagents.yml` | 1 | 0 |
| `Resources/Prototypes/_RMC14/Reagents/Consumable/Drink/juice.yml` | 1 | 0 |
| `Resources/Prototypes/_Goobstation/Reagents/drinks.yml` | 1 | 1 |

## Bebidas sem sprite metamórfico

- água (`Water`)
- água com gás (`SodaWater`)
- beast's blood (`BeastBlood`)
- blue pumpkin juice (`JuiceBluePumpkin`)
- bungo juice (`JuiceBungo`)
- Cacau Quente (`HotCocoa`)
- cherry juice (`JuiceCherry`)
- coconut water (`CoconutWater`)
- cream of coconut (`CreamOfCoconut`)
- eldritch essence (`EldritchEssence`)
- energético (`EnergyDrink`)
- Esfregágua (`Mopwata`)
- etanol (`Ethanol`)
- gilgamesh branco (`WhiteGilgamesh`)
- hooch (`Hooch`)
- miojo quente (`HotRamen`)
- miojo seco (`DryRamen`)
- picada de changeling (`ChangelingSting`)
- pilk (`Pilk`)
- posca (`Posca`)
- Pwr Game (`PwrGame`)
- refri de uva (`GrapeSoda`)
- refri lima-limão (`LemonLime`)
- Shambler's Juice (`ShamblersJuice`)
- Smite Cranberry (`LemonLimeCranberry`)
- starkist (`Starkist`)
- suco de abacaxi (`JuicePineapple`)
- suco de banana (`JuiceBanana`)
- suco de batata (`JuicePotato`)
- suco de cenoura (`JuiceCarrot`)
- suco de frutas venenosas (`JuiceBerryPoison`)
- suco de frutas vermelhas (`JuiceBerry`)
- suco de limão (`JuiceLime`)
- suco de maça (`JuiceApple`)
- suco de tomate (`JuiceTomato`)
- suco de uva (`JuiceGrape`)
- triple citrus (`TripleCitrus`)

Essas bebidas não definem `metamorphicSprite`. No jogo, o copo `Objects/Consumable/Drinks/glass_clear.rsi` é o fallback autêntico; o site copia os estados `icon`, `fill1`, `fill2`, `fill3`, `fill4`, `fill5`, `fill6`, `fill7`, `fill8`, `fill9` e `icon-front` e os exibe com o mesmo tingimento do jogo.

## Fallback de tradução (bebidas)

Sem nome/descrição em pt-BR, usando en-US: **55**.

- alien brain hemorrhage (`AlienBrainHemorrhage`)
- Arnold Palmer (`ArnoldPalmer`)
- bacchus's blessing (`BacchusBlessing`)
- beast's blood (`BeastBlood`)
- bee’s knees (`BeesKnees`)
- Blue Hawaiian (`BlueHawaiian`)
- blue pumpkin juice (`JuiceBluePumpkin`)
- Bronx (`Bronx`)
- budget insuls (`BudgetInsulsDrink`)
- bungo juice (`JuiceBungo`)
- cherry juice (`JuiceCherry`)
- coconut rum (`CoconutRum`)
- coconut water (`CoconutWater`)
- cosmopolitan (`Cosmopolitan`)
- cream of coconut (`CreamOfCoconut`)
- crush depth (`CrushDepth`)
- daiquiri (`Daiquiri`)
- dark & stormy (`DarkandStormy`)
- death in the afternoon (`DeathInTheAfternoon`)
- eggnog (`Eggnog`)
- eldritch essence (`EldritchEssence`)
- electric shark (`ElectricShark`)
- empress 75 (`Empress75`)
- espresso martini (`EspressoMartini`)
- gin and sonic (`GinAndSonic`)
- golden cat (`GoldenCat`)
- Irish bool (`IrishBool`)
- Jack rose (`JackRose`)
- jungle bird (`JungleBird`)
- kalimotxo (`Kalimotxo`)
- mayojito (`Mayojito`)
- mimeosa (`Mimeosa`)
- mimosa (`Mimosa`)
- monkey business (`MonkeyBusiness`)
- moscow mule (`MoscowMule`)
- mugwort tea (`Mugwort`)
- painkiller (`Painkiller`)
- Piña Colada (`PinaColada`)
- pineapple blast (`PineappleBlast`)
- radler (`Radler`)
- Roy Rogers (`RoyRogers`)
- rubberneck (`Rubberneck`)
- Shirley Temple (`ShirleyTemple`)
- Smite Cranberry (`LemonLimeCranberry`)
- Sol Dry (`SolDry`)
- the sun also rises (`TheSunAlsoRises`)
- torpedo juice (`TorpedoJuice`)
- Tortuga (`Tortuga`)
- triple citrus (`TripleCitrus`)
- vampiro (`Vampiro`)
- vodka red bool (`VodkaRedBool`)
- watermelon wakeup (`WatermelonWakeup`)
- whiskey sour (`WhiskeySour`)
- Xeno Basher (`XenoBasher`)
- Zombie (`ZombieCocktail`)

Sem nome/descrição nem en-US (nome derivado do ID): **0**.

_Nenhum._

## Fallback de tradução (insumos não-bebida)

Usando en-US: **2**; derivados do ID: **1**.

- Frost Oil (`FrostOil`)
- tea powder (`TeaPowder`)
- Coffee Grounds (`CoffeeGrounds`)

## Reações não anexadas

Produtos de reação sem protótipo de reagente correspondente:

- `PumpkinSpiceLatte` → `PumpkinSpiceLatte` (`Resources/Prototypes/_NF/Recipes/Reactions/drinks.yml`)

Reações ignoradas (fora do escopo ou sem produto de bebida):

- `MilkChoco`: nenhum produto é uma bebida extraída (`Resources/Prototypes/_Goobstation/Recipes/Reactions/drinks.yml`)
- `PumpkinSpiceLatte`: nenhum produto é uma bebida extraída (`Resources/Prototypes/_NF/Recipes/Reactions/drinks.yml`)

## Erros de sprite

_Nenhum._

## IDs duplicados

_Nenhum._

## Erros de parse (fora do escopo de bebidas)

- `Resources/Prototypes/Access/silicon.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Codewords/codeword_factions.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/adjectives.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/atv.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/autoborg.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/base.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/base_gendered.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/clown.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/death_commando.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/hologram.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/mushman_first.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/mushman_last.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/ninja.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/Names/scurret.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/news.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Datasets/rat_king_commands.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Entities/Objects/Specific/Xenoarchaeology/structure_xenoartifacts.yml`: Unexpected scalar at node end
- `Resources/Prototypes/InventoryTemplates/scurret_inventory_template.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Objectives/paradoxClone.yml`: Unexpected scalar at node end
- `Resources/Prototypes/Recipes/Construction/Graphs/structures/station_ai_core.yml`: Unexpected scalar at node end
- `Resources/Prototypes/SoundCollections/anomaly.yml`: Unexpected scalar at node end
- `Resources/Prototypes/SoundCollections/scurret.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_CorvaxGoob/Entities/Objects/Devices/Machine/production.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Dumont/Objectives/ninja.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_FarHorizons/Entities/Objects/Devices/Circuitboards/Machine/nuclear_machines.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Funkystation/Entities/Structures/Machines/Atmospherics/crystallizer.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Goobstation/Audio/war_collection.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Goobstation/Audio/xeno_start_collection.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Goobstation/Catalog/Fills/Crates/salvage.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Goobstation/Entities/Objects/Fun/tennis.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Goobstation/Entities/Specific/Medical/disease.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Goobstation/Recipes/Reactions/biological.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Lavaland/Entities/Objects/Decoration/cactus.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_NF/Entities/Objects/Consumable/Food/frozen.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_NF/Entities/Objects/Consumable/Food/ingredients.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_NF/Entities/Objects/Consumable/Food/produce.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_NF/Entities/Objects/Specific/Hydroponics/seeds.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_NF/Reagents/Consumables/Drink/drinks.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_NF/Reagents/Consumables/Food/ingredients.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_NF/Recipes/Lathes/electronics.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Orion/Antag/globalAntagonists.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Orion/Entities/Mobs/NPCs/base.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Orion/Entities/Objects/Misc/identification_cards.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Orion/Entities/Structures/Machines/vending_machines.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Orion/StatusIcon/job.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_RMC14/Entities/Structures/overhead_lattices.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_RMC14/Entities/Structures/prop_vehicles3.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_RMC14/Entities/Structures/rmc_filtration_props.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_RMC14/Entities/Structures/road_signs.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Trauma/Recipes/Reactions/toxins.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Trauma/Roles/Antags/wraith.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Trauma/Wraith/Abilities/wraith.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Trauma/Wraith/Actions/wraith.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Trauma/Wraith/Gamerules/ghost_roles.yml`: Unexpected scalar at node end
- `Resources/Prototypes/_Trauma/Wraith/Mobs/wraith.yml`: Unexpected scalar at node end

## Observações

- O filtro `type: reaction` só considera arquivos `Recipes/Reactions/drinks.yml` (base e forks).
- Reações de decomposição/sangue não são tratadas como receitas de bar.
- `metamorphicChangeColor` controla o uso de máscara CSS no site; quando falso, o PNG de preenchimento é usado sem tingimento.
- A capacidade das bebidas vem de `SolutionContainerManager.solutions.drink.maxVol` das entidades de vidraria.
- O pt-BR não possui `mixing-verb-shake` nem `mixing-verb-stir`; o site usa rótulos de interface em português e mantém o dado original no JSON.
- As licenças dos sprites são agregadas em `creditos.json`; cada RSI mantém seu `meta.json` original.

## Reprodução

```powershell
cd "<caminho-do-projeto>"
npm run extract -- --repo "<caminho-do-Dumont-Station>"
npm run dev
```
