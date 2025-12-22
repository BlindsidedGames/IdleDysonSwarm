# Bot Tab Balance (Unity IDS)

Sources:
- Assets/Scenes/Game.unity (component values on GameObjects)
- Assets/Scripts/Buildings/*.cs
- Assets/Scripts/Research/*.cs
- Assets/Scripts/Systems/GameManager.cs
- Assets/Scripts/Expansion/Oracle.cs
- Assets/Scripts/Blindsided/Utilities/CalcUtils.cs

## Summary: Buildings (scene values)
| Item | GameObject | baseCost | exponent | wordUsed | productionWordUsed | Script |
| --- | --- | --- | --- | --- | --- | --- |
| Assembly Lines | AssemblyLines | 100 | 1.22 | Producing | Bot | AssemblyLineManager |
| AI Managers | AIManagers | 5000 | 1.23 | Generating | Assembly Line | ManagerManager |
| Servers | Servers | 5000000 | 1.24 | Training | AI Manager | ServerManager |
| Data Centers | Data Centers | 300000000 | 1.23 | Deploying | Server | DataCenterManager |
| Planets | Planets | 1000000000 | 1.25 | Creating | Data Center | PlanetManager |

## Summary: Research upgrades (scene values)
| Upgrade | GameObject | baseCost | exponent | nameText | percentPerLevel | Script |
| --- | --- | --- | --- | --- | --- | --- |
| Assembly Line | AssemblyMulti | 50000 | 1.4 | Assembly Line | 0.03 | AssemblyLineUpgrade |
| AI Manager | AiMulti | 1000000 | 1.5 | AI Manager | 0.03 | AiManagerUpgrade |
| Server | ServerMulti | 100000000 | 1.6 | Server | 0.03 | ServerManagerUpgrade |
| Data Center | DataCenterMulti | 1000000000 | 1.7 | Data Center | 0.03 | DataCenterManagerUpgrade |
| Planet | PlanetMulti | 2000000000 | 1.8 | Planet | 0.03 | PlanetManagerUpgrade |
| Science | ScienceBoost | 10000 | 1.55 | Science | 0.05 | ScienceBoostUpgrade |
| Cash | MoneyMulti | 5000 | 1.77 | Cash | 0.05 | MoneyMultiUpgrade |

## Shared cost math
- Building cost (Money):
  - `cost = baseCost * exponent^currentLevel * ((exponent^numberToBuy - 1) / (exponent - 1))`
- Research cost (Science):
  - Same formula, but uses `BaseCostCalculated` (repeatableResearch can modify base cost).
- numberToBuy:
  - Uses `StaticBuyMode` / `StaticResearchBuyMode` with rounded bulk buy rules.

## Core data variables
- Storage arrays (auto/manual):
  - `assemblyLines[0/1]`, `managers[0/1]`, `servers[0/1]`, `dataCenters[0/1]`, `planets[0/1]`
- Modifiers:
  - `assemblyLineModifier`, `managerModifier`, `serverModifier`, `dataCenterModifier`, `planetModifier`
- Production outputs (displayed on bot tab):
  - `assemblyLineBotProduction`, `managerAssemblyLineProduction`, `serverManagerProduction`,
    `dataCenterServerProduction`, `planetsDataCenterProduction`
- Upgrade owned/percent:
  - `assemblyLineUpgradeOwned/Percent`, `aiManagerUpgradeOwned/Percent`, `serverUpgradeOwned/Percent`,
    `dataCenterUpgradeOwned/Percent`, `planetUpgradeOwned/Percent`, `scienceBoostOwned/Percent`,
    `moneyMultiUpgradeOwned/Percent`
- Automation and unlocks:
  - `StaticPrestigeData.infinityAssemblyLines / infinityAiManagers / infinityServers / infinityDataCenter / infinityPlanets`
  - `StaticPrestigeData.infinityAutoBots`, `StaticPrestigeData.infinityAutoResearch`
  - `StaticSaveSettings.infinityAutoAssembly / infinityAutoManagers / infinityAutoServers / infinityAutoDataCenters / infinityAutoPlanets`
  - `StaticSaveSettings.infinityAutoResearchToggleAssembly/Ai/Server/DataCenter/Planet/Science/Money`
- Constants:
  - `maxInfinityBuff = 1e44` (GameManager)
  - `infinityExponent = 3.9` (Oracle)

## Buildings: variables and formulas
### Assembly Lines
- Storage: `assemblyLines[0]` auto, `assemblyLines[1]` manual.
- CurrentLevel: `infinityAssemblyLines ? manual - 10 : manual`.
- ModifiedBaseCost: `baseCost / totalPlanets` when `assemblyMegaLines && totalPlanets > 0`.
- Production displayed: `assemblyLineBotProduction`.
- Base production:
  - `botProduction = (assemblyLines total) * 0.1 * assemblyLineModifier`.
- Extra production modifiers:
  - `stayingPower` uses `panelLifetime`.
  - `rule34` doubles if manual assembly lines >= 69.
  - `superchargedPower` multiplies by 1.5.
- Bot drain:
  - `stellarSacrifices` consumes bots when requirements are met.
- Auto buy:
  - `infinityAutoAssembly && infinityAutoBots`.

### AI Managers
- Storage: `managers[0]` auto, `managers[1]` manual.
- CurrentLevel: `infinityAiManagers ? manual - 10 : manual`.
- Production displayed: `managerAssemblyLineProduction`.
- Base production:
  - `assemblyLineProduction = (managers total) * 0.0166666666666667 * managerModifier`.
- Extra production modifiers:
  - `rule34` doubles if manual managers >= 69.
  - `superchargedPower` multiplies by 1.5.
  - `rudimentarySingularity` produces `rudimentrySingularityProduction` from assembly line production.
  - `clusterNetworking` scales `rudimentrySingularityProduction` by server count.
- Auto buy:
  - `infinityAutoManagers && infinityAutoBots`.

### Servers
- Storage: `servers[0]` auto, `servers[1]` manual.
- CurrentLevel: `infinityServers ? manual - 10 : manual`.
- Production displayed: `serverManagerProduction`.
- Base production:
  - `managerProduction = (servers total) * 0.0016666666666667 * serverModifier`.
- Extra production modifiers:
  - `rule34` doubles if manual servers >= 69.
  - `superchargedPower` multiplies by 1.5.
- Auto buy:
  - `infinityAutoServers && infinityAutoBots`.

### Data Centers
- Storage: `dataCenters[0]` auto, `dataCenters[1]` manual.
- CurrentLevel: `infinityDataCenter ? manual - 10 : manual`.
- Production displayed: `dataCenterServerProduction`.
- Base production:
  - `serverProduction = (dataCenters total) * 0.0011111111 * dataCenterModifier`.
- Extra production modifiers:
  - `rule34` doubles if manual data centers >= 69.
  - `superchargedPower` multiplies by 1.5.
  - `rudimentrySingularityProduction` is added to `serverProduction`.
  - `parallelComputation` adds `0.1 * log2(servers total)` servers per second (if servers total > 1).
- Auto buy:
  - `infinityAutoDataCenters && infinityAutoBots`.

### Planets
- Storage: `planets[0]` auto, `planets[1]` manual.
- CurrentLevel: `infinityPlanets ? manual - 10 : manual`.
- Production displayed: `planetsDataCenterProduction`.
- Base production:
  - `dataCenterProduction = (planets total) * 0.0002777777777777778 * planetModifier`.
- Extra production modifiers:
  - `rule34` doubles if manual planets >= 69.
  - `superchargedPower` multiplies by 1.5.
  - Pocket dimensions chain (see formula block below).
- Auto buy:
  - `infinityAutoPlanets && infinityAutoBots`.

## Research upgrades: variables and formulas
- Shared:
  - `BoostPercent = CurrentLevel * Percent * 100`.
  - Cost uses Science and the shared cost formula.
- Assembly Line:
  - `assemblyLineUpgradeOwned` (long), `assemblyLineUpgradePercent` (0.03 default).
- AI Manager:
  - `aiManagerUpgradeOwned` (long), `aiManagerUpgradePercent` (0.03 default).
- Server:
  - `serverUpgradeOwned` (long), `serverUpgradePercent` (0.03 default).
- Data Center:
  - `dataCenterUpgradeOwned` (long), `dataCenterUpgradePercent` (0.03 default).
- Planet:
  - `planetUpgradeOwned` (long), `planetUpgradePercent` (0.03 default).
- Science Boost:
  - `scienceBoostOwned` (double), `scienceBoostPercent` (0.05 default).
  - Disabled when `shouldersOfGiants`.
- Cash (Money Multi):
  - `moneyMultiUpgradeOwned` (double), `moneyMultiUpgradePercent` (0.05 default).
  - Disabled when `shouldersOfTheEnlightened` or `shouldersOfPrecursors`.
- Auto buy toggles:
  - `infinityAutoResearchToggleX && infinityAutoResearch`.

## Production chain formulas (GameManager)
```text
# Assembly lines -> bots
botProduction = (assemblyLines total) * 0.1 * assemblyLineModifier
if stayingPower: botProduction *= (1 + 0.01 * panelLifetime)
if rule34 && assemblyLines[1] >= 69: botProduction *= 2
if superchargedPower: botProduction *= 1.5
assemblyLineBotProduction = botProduction
bots += botProduction * deltaTime

# Managers -> assembly lines (+ rudimentary singularity)
assemblyLineProduction = (managers total) * 0.0166666666666667 * managerModifier
if rule34 && managers[1] >= 69: assemblyLineProduction *= 2
if superchargedPower: assemblyLineProduction *= 1.5
if rudimentarySingularity && assemblyLineProduction > 1:
  rudimentaryProduction = pow(log2(assemblyLineProduction),
                              1 + log10(assemblyLineProduction) / 10)
  if unsuspiciousAlgorithms: rudimentaryProduction *= 10
  if clusterNetworking && servers total > 1:
    rudimentaryProduction *= (1 + 0.05 * log10(servers total))
  rudimentrySingularityProduction = rudimentaryProduction
managerAssemblyLineProduction = assemblyLineProduction
assemblyLines[0] += assemblyLineProduction * deltaTime

# Servers -> managers
managerProduction = (servers total) * 0.0016666666666667 * serverModifier
if rule34 && servers[1] >= 69: managerProduction *= 2
if superchargedPower: managerProduction *= 1.5
serverManagerProduction = managerProduction
managers[0] += managerProduction * deltaTime

# Data centers -> servers
serverProduction = (dataCenters total) * 0.0011111111 * dataCenterModifier
if rule34 && dataCenters[1] >= 69: serverProduction *= 2
if superchargedPower: serverProduction *= 1.5
dataCenterServerProduction = serverProduction
serverProduction += rudimentrySingularityProduction
servers[0] += (parallelComputation && servers total > 1)
  ? serverProduction * deltaTime + 0.1 * log2(servers total)
  : serverProduction * deltaTime

# Planets -> data centers (base)
dataCenterProduction = (planets total) * 0.0002777777777777778 * planetModifier
if rule34 && planets[1] >= 69: dataCenterProduction *= 2
if superchargedPower: dataCenterProduction *= 1.5
planetsDataCenterProduction = dataCenterProduction
```

### Pocket dimensions chain (Planets)
```text
dataCenterProductionTemp = (pocketDimensions && workers > 1)
  ? log10(workers)
  : 0
pocketDimensionsWithoutAnythingElseProduction = dataCenterProductionTemp

if pocketMultiverse:
  multiplyBy = (pocketDimensions && researchers > 1) ? log10(researchers) : 0
  pocketMultiverseProduction =
    (researchers > 0) ? dataCenterProductionTemp * multiplyBy
                       - pocketDimensionsWithoutAnythingElseProduction
                     : 0
  if multiplyBy > 0: dataCenterProductionTemp *= multiplyBy
else:
  add = 0
  if pocketProtectors:
    add += (pocketDimensions && researchers > 1) ? log10(researchers) : 0
  pocketProtectorsProduction =
    dataCenterProductionTemp + add - pocketDimensionsWithoutAnythingElseProduction
  dataCenterProductionTemp += add

if dimensionalCatCables: dataCenterProductionTemp *= 5
if solarBubbles: dataCenterProductionTemp *= (1 + 0.01 * panelLifetime)
if pocketAndroids:
  dataCenterProductionTemp *= (pocketAndroidsTimer > 3564)
    ? 100
    : (1 + pocketAndroidsTimer / 36)
if quantumComputing:
  quantumMulti = 1 + (rudimentrySingularityProduction >= 1
    ? log2(rudimentrySingularityProduction)
    : 0)
  quantumComputingProduction = quantumMulti
  dataCenterProductionTemp *= quantumMulti

pocketDimensionsProduction = dataCenterProductionTemp
if pocketDimensions: dataCenterProduction += pocketDimensionsProduction
dataCenters[0] += dataCenterProduction * deltaTime
```

## Modifier formulas (GameManager)
### GlobalBuff()
- `purityOfSEssence && skillPointsTree > 0`: multiply by `1.42 * skillPointsTree`.
- `superRadiantScattering`: multiply by `1 + 0.01 * superRadiantScatteringTimer`.
- Avocato bonuses:
  - `log10(avocatoIP)` if `avocatoIP >= 10`
  - `log10(avocatoInfluence)` if `avocatoInfluence >= 10`
  - `log10(avocatoStrangeMatter)` if `avocatoStrangeMatter >= 10`
  - `1 + avocatoOverflow` if `avocatoOverflow >= 1`

### AmountForBuildingBoostAfterX / DivisionForBoostAfterX
- AmountForBuildingBoostAfterX:
  - `90` if `productionScaling`, else `100`.
- DivisionForBoostAfterX:
  - `20` if `superSwarm + megaSwarm + ultimateSwarm`.
  - `100/3` if `superSwarm + megaSwarm`.
  - `50` if `superSwarm`.
  - `100` otherwise.

### Assembly Line modifier (`assemblyLineModifier`)
- `totalBoost = 1 + assemblyLineUpgradeOwned * assemblyLineUpgradePercent`
- `totalBoost *= GlobalBuff()`
- `* 2` if `assemblyLineTree`
- `* 2` if `terraAmount >= 50 && !supernova`
- `* 2` if `terraAmount >= 100 && !supernova`
- `* 3` if `fragmentAssembly && fragments > 4`
- `* 2.5` if `worthySacrifice`
- `* 5` if `endOfTheLine`
- `* (planets total >= 100 ? 2 : 1.5)` if `versatileProductionTactics`
- `* perExtraBoost` if `terraAmount > AmountForBuildingBoostAfterX && !supernova`
- `* (panelLifetime > 60 ? 5 : 1.5)` if `oneMinutePlan`
- `* (1 + 0.5 * fragments)` if `progressiveAssembly`
- `* 1.5` if `tasteOfPower`; `* 2` if `indulgingInPower`; `* 3` if `addictionToPower`
- `* 3` if `agressiveAlgorithms`
- `* 2` if `dysonSubsidies && StarsSurrounded() > 1`
- `* (1.25 * skillPointsTree)` if `purityOfBody && skillPointsTree > 0`
- `* (1 + Clamp(infinityPoints, 0, maxInfinityBuff))`
- `* _secretAssemblyMulti`
- `terraAmount = assemblyLines[1] (+ planets[1] * 12 if terraIrradiant and terraNullius)`

### AI Manager modifier (`managerModifier`)
- `totalBoost = 1 + aiManagerUpgradeOwned * aiManagerUpgradePercent`
- `totalBoost *= GlobalBuff()`
- `* 2` if `aiManagerTree`
- `* 2` if `terraAmount >= 50 && !supernova`
- `* 2` if `terraAmount >= 100 && !supernova`
- `* 3` if `fragmentAssembly && fragments > 4`
- `* perExtraBoost` if `terraAmount > AmountForBuildingBoostAfterX && !supernova`
- `* 1.5` if `tasteOfPower`; `* 2` if `indulgingInPower`; `* 3` if `addictionToPower`
- `* 3` if `agressiveAlgorithms`
- `* (1 + Clamp(infinityPoints, 0, maxInfinityBuff))` when `infinityPoints >= 2`
- `* _secretAIMulti`
- `terraAmount = managers[1] (+ planets[1] * 12 if terraIrradiant and terraInfirma)`

### Server modifier (`serverModifier`)
- `totalBoost = 1 + serverUpgradeOwned * serverUpgradePercent`
- `totalBoost *= GlobalBuff()`
- `* 2` if `serverTree`
- `* 2` if `terraAmount >= 50 && !supernova`
- `* 2` if `terraAmount >= 100 && !supernova`
- `* 3` if `fragmentAssembly && fragments > 4`
- `* perExtraBoost` if `terraAmount > AmountForBuildingBoostAfterX && !supernova`
- `* 1.5` if `tasteOfPower`; `* 2` if `indulgingInPower`; `* 3` if `addictionToPower`
- `* 3` if `agressiveAlgorithms`
- `* (1 + 0.05 * log10(servers total))` if `clusterNetworking && servers total > 1`
- `* (1 + Clamp(infinityPoints, 0, maxInfinityBuff))` when `infinityPoints >= 3`
- `* _secretServerMulti`
- `* (1 + 0.05 * log2(servers total))` if `parallelProcessing && servers total > 1`
- `terraAmount = servers[1] (+ planets[1] * 12 if terraIrradiant and terraEculeo)`

### Data Center modifier (`dataCenterModifier`)
- `totalBoost = 1 + dataCenterUpgradeOwned * dataCenterUpgradePercent`
- `totalBoost *= GlobalBuff()`
- `* 2` if `dataCenterTree`
- `* 2` if `terraAmount >= 50 && !supernova`
- `* 2` if `terraAmount >= 100 && !supernova`
- `* 3` if `fragmentAssembly && fragments > 4`
- `* perExtraBoost` if `terraAmount > AmountForBuildingBoostAfterX && !supernova`
- `* 1.5` if `tasteOfPower`; `* 2` if `indulgingInPower`; `* 3` if `addictionToPower`
- `* (1 + 0.01 * dataCenters[1])` if `whatWillComeToPass`
- `* (1 + 0.1 * log10(servers total))` if `hypercubeNetworks && servers total > 1`
- `* (1 + Clamp(infinityPoints, 0, maxInfinityBuff))` when `infinityPoints >= 4`
- `/ 3` if `agressiveAlgorithms`
- `terraAmount = dataCenters[1] (+ planets[1] * 12 if terraIrradiant and terraFirma)`

### Planet modifier (`planetModifier`)
- `totalBoost = 1 + planetUpgradeOwned * planetUpgradePercent`
- `totalBoost *= GlobalBuff()`
- `* 2` if `planetsTree`
- `* 2` if `terraAmount >= 50 && !supernova`
- `* 2` if `terraAmount >= 100 && !supernova`
- `* 3` if `fragmentAssembly && fragments > 4`
- `* perExtraBoost` if `terraAmount > AmountForBuildingBoostAfterX && !supernova`
- `* (GalaxiesEngulfed() > 1 ? 3 : 1.5)` if `galacticPradigmShift`
- `* 1.5` if `tasteOfPower`; `* 2` if `indulgingInPower`; `* 3` if `addictionToPower`
- `* 0.75` if `dimensionalCatCables`
- `* (1 + Clamp(infinityPoints, 0, maxInfinityBuff))` when `infinityPoints >= 5`
- `* _secretPlanetMulti`
- `/ 2` if `endOfTheLine`
- `/ 3` if `agressiveAlgorithms`
- `terraAmount = planets[1] (x12 if terraIrradiant)`

### SecretBuffs (affects upgrade percent and secret multipliers)
- Upgrade percent changes:
  - `assemblyLineUpgradePercent`: 0.06 (case 1), 0.09 (case 4), 0.12 (case 12)
  - `aiManagerUpgradePercent`: 0.06 (case 5), 0.09 (case 13)
  - `serverUpgradePercent`: 0.06 (case 3), 0.09 (case 9)
  - `planetUpgradePercent`: 0.06 (case 7), 0.09 (case 14)
- Secret multipliers:
  - `_secretAssemblyMulti`, `_secretAIMulti`, `_secretServerMulti`, `_secretPlanetMulti`,
    `_secretCashMulti`, `_secretScienceMulti` set by `SecretBuffs` cases.
