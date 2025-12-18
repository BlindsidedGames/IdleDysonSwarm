# IDS Unity -> Web/Tauri Rewrite Plan (1:1 Gameplay + Balance)

This document is a migration plan to rebuild this Unity project as a standalone web app + desktop app without Unity, while preserving gameplay and balance 1:1.

## Goal and constraints

- Goal: feature-for-feature rebuild using:
  - pnpm workspace monorepo
  - Desktop shell: Tauri (Rust)
  - Frontend: Vite + React 18 + TypeScript
  - Engine: UI-agnostic TypeScript core running in a Web Worker
  - Balance/tuning: TypeScript + Zod schemas
  - Tooling: Vitest, ESLint, Prettier, react-window
- Hard constraint: no rebalancing. Every number/formula/threshold matches Unity.
- Source of truth: Unity scripts + serialized scene values (not only code defaults).

## What we are rebuilding (current gameplay map)

This game is effectively 3 intertwined systems:

1. DysonVerse (main idle loop): money/science/bots + producer chain (Assembly Lines -> Managers -> Servers -> Data Centers -> Planets), research upgrades, skill tree, Infinity resets, secrets, and "Quantum" (PrestigePlus).
2. Reality layer: "workers ready to go" accumulate up to 128 then convert into Influence; translation/speed upgrades; double-time boost; automation.
3. Simulation (Dream1): a nested incremental simulation (hunters/gatherers -> community -> housing/villages/cities -> factories/bots/rockets -> space factories -> dyson panels -> railguns -> swarm panels), disasters, and Strange Matter prestige currency used to buy upgrades.

All three share and/or feed each other via the shared save model in `Assets/Scripts/Expansion/Oracle.cs`.

## Source-of-truth files (read during planning)

### Core gameplay and save model
- `Assets/Scripts/Systems/GameManager.cs` (main tick loop, production, modifiers, prestige trigger)
- `Assets/Scripts/Expansion/Oracle.cs` (save/load, Infinity/PrestigePlus resets, clipboard export/import, global settings)
- `Assets/Scripts/Systems/StaticMethods.cs`, `Assets/Scripts/Incremental/BuyMultiple.cs`
- `Assets/Scripts/Blindsided/Utilities/CalcUtils.cs`, `Assets/Scripts/Systems/CalcUtils.cs`

### DysonVerse systems
- Buildings: `Assets/Scripts/Buildings/*`
- Research upgrades: `Assets/Scripts/Research/*`
- Infinity shop: `Assets/Scripts/InfinityManager.cs`
- PrestigePlus ("Quantum") shop: `Assets/Scripts/PrestigePlusUpdater.cs`
- Skill tree UI + mapping: `Assets/Scripts/SkillTresStuff/*`
- Story unlocks: `Assets/Scripts/StoryManager.cs`

### Reality + Simulation systems
- Reality (Influence): `Assets/Scripts/Expansion/InceptionController.cs`
- Reality upgrades + Simulation upgrades: `Assets/Scripts/Expansion/ResearchManager.cs`
- Artifact (translation/speed effects): `Assets/Scripts/Expansion/ArtifactController.cs`
- DoubleTime boost: `Assets/Scripts/Expansion/DoubleTimeManager.cs`
- Simulation loop: `Assets/Scripts/Expansion/Dream1/*`
- Simulation prestige/disasters: `Assets/Scripts/Expansion/SimulationPrestigeManager.cs`

### Purchases / entitlements
- Unity IAP catalog: `Assets/Resources/IAPProductCatalog.json`
- Purchase handling: `Assets/Scripts/DebugPurchaseHandler.cs`

### Serialized tuning values (balance-critical)
- `Assets/Scenes/Game.unity` contains the authoritative serialized values for:
  - Skill tree item definitions (names/costs/requirements/line membership)
  - Building + research base costs and exponents
  - Panel lifetime upgrade costs
  - `Oracle.infinityExponent`
  - `GameManager.maxInfinityBuff`
  - `ResearchManager` translation/speed costs

## Balance-critical extracted values (from `Assets/Scenes/Game.unity`)

These values must be replicated exactly in the new TS balance layer.

### DysonVerse building costs (Money)
Cost formula is implemented in `Assets/Scripts/Blindsided/Utilities/CalcUtils.cs` (`BuyXCost`, `MaxAffordable`) and `Assets/Scripts/Buildings/Building.cs`.

| Building | Script | baseCost | exponent | wordUsed | productionWordUsed |
|---|---|---:|---:|---|---|
| Assembly Lines | `Assets/Scripts/Buildings/AssemblyLineManager.cs` | 100 | 1.22 | Producing | Bot |
| AI Managers | `Assets/Scripts/Buildings/ManagerManager.cs` | 5,000 | 1.23 | Generating | Assembly Line |
| Servers | `Assets/Scripts/Buildings/ServerManager.cs` | 5,000,000 | 1.24 | Training | AI Manager |
| Data Centers | `Assets/Scripts/Buildings/DataCenterManager.cs` | 300,000,000 | 1.23 | Deploying | Server |
| Planets | `Assets/Scripts/Buildings/PlanetManager.cs` | 1,000,000,000 | 1.25 | Creating | Data Center |

### DysonVerse research upgrade costs (Science)
These are `Assets/Scripts/Research/*.cs` components and use the same buy-multiple math as buildings, but spend Science.

| Upgrade | Script | baseCost | exponent | Notes |
|---|---|---:|---:|---|
| Science | `Assets/Scripts/Research/ScienceBoostUpgrade.cs` | 10,000 | 1.55 | Disabled by skill `shouldersOfGiants` |
| Cash | `Assets/Scripts/Research/MoneyMultiUpgrade.cs` | 5,000 | 1.77 | Disabled by skills `shouldersOfTheEnlightened`/`shouldersOfPrecursors` |
| Assembly Line | `Assets/Scripts/Research/AssemblyLineUpgrade.cs` | 50,000 | 1.40 |  |
| AI Manager | `Assets/Scripts/Research/AiManagerUpgrade.cs` | 1,000,000 | 1.50 |  |
| Server | `Assets/Scripts/Research/ServerManagerUpgrade.cs` | 100,000,000 | 1.60 |  |
| Data Center | `Assets/Scripts/Research/DataCenterManagerUpgrade.cs` | 1,000,000,000 | 1.70 |  |
| Planet | `Assets/Scripts/Research/PlanetManagerUpgrade.cs` | 2,000,000,000 | 1.80 |  |

Percent-per-level defaults live in `Assets/Scripts/Expansion/Oracle.cs` (`DysonVerseInfinityData.*Percent`) and are modified by `GameManager.SecretBuffs()` depending on secrets owned.

### Panel lifetime upgrades (Science, one-time)
Source: `Assets/Scripts/PanelLifetime1.cs` + scene overrides.

| Upgrade id | Cost (_cost) | Save flag | Effect in `GameManager.UpdatePanelLifetime()` |
|---:|---:|---|---|
| 1 | 1,000,000,000 | `panelLifetime1` | +1s base lifetime |
| 2 | 1,000,000,000,000 | `panelLifetime2` | +2s base lifetime |
| 3 | 1,000,000,000,000,000 | `panelLifetime3` | +3s base lifetime |
| 4 | 1e18 | `panelLifetime4` | +4s base lifetime |

### Infinity exponent (critical progression parameter)
`Oracle.infinityExponent` is serialized and used by:
- `Systems.StaticMethods.InfinityPointsToGain(...)`
- `User Interface/SidePanelManager.cs` (fill bar math)
- `Expansion/Oracle.cs` (infinity break logic)

Value in scene: `infinityExponent = 3.92`

### Max infinity buff cap
`GameManager.maxInfinityBuff` is serialized and used in building multipliers.

Value in scene: `maxInfinityBuff = 1e+308`

### Reality upgrade costs (Strange Matter): Translation + Speed
These are scene-overridden costs on `Assets/Scripts/Expansion/ResearchManager.cs` and must not use code defaults.

Translation costs (each purchase also grants +1 DysonVerse skill point via `dvst.skillPointsTree++`):
- 1: 8
- 2: 16
- 3: 32
- 4: 64
- 5: 128
- 6: 256
- 7: 512
- 8: 1024

Speed costs (each purchase also grants +1 DysonVerse skill point via `dvst.skillPointsTree++`):
- 1: 2048
- 2: 4096
- 3: 8192
- 4: 16384
- 5: 32768
- 6: 65536
- 7: 131072
- 8: 262144

## Purchases / upgrades inventory (must be 1:1)

### IAP products (Unity IAP catalog)
Source: `Assets/Resources/IAPProductCatalog.json`

- Consumables (tips): `ids.tiptier1`, `ids.tiptier2`, `ids.tiptier3`
- Non-consumables:
  - `ids.devoptions` ("Access Developer Options")
  - `ids.doubleip` ("Double Infinity Points")

Implementation details:
- `Assets/Scripts/DebugPurchaseHandler.cs` also allows buying dev options with in-game currency:
  - Cost: 100,000 `prestigePlus.points` and 500,000 `sdPrestige.strangeMatter`
  - Persists via `PlayerPrefs` keys `debug` and `doubleip`

### DysonVerse Infinity shop
Source: `Assets/Scripts/InfinityManager.cs`

- Secrets of the Universe:
  - Max: 27
  - Cost: 1 Infinity Point each
  - Effects: `GameManager.SecretBuffs()` and UI reveal logic in `InfinityManager.UpdateSecret()`
- Permanent skill points:
  - Max: 10
  - Cost: 1 Infinity Point each
  - Effects: increments `dvst.skillPointsTree` and `dvpd.permanentSkillPoint`
- Infinity "starter packs" (+10 to buildings):
  - Assembly Lines / AI Managers / Servers / Data Centers / Planets
  - Cost: 1 Infinity Point each
  - Sets `dvpd.infinity* = true` and adds +10 to manual counts (`dvid.*[1] += 10`)
- Automation unlocks:
  - Auto Research: cost 3 IP (`dvpd.infinityAutoResearch = true`)
  - Auto Bots: cost 3 IP (`dvpd.infinityAutoBots = true`)

### PrestigePlus ("Quantum") shop
Source: `Assets/Scripts/PrestigePlusUpdater.cs` and resets in `Assets/Scripts/Expansion/Oracle.cs` (`EnactPrestigePlus`, `PrestigeDoubleWiper`).

Purchases (costs in `pp.points - pp.spentPoints`):
- 1 point each:
  - `botMultitasking` (locks bot distribution slider; bots work and research simultaneously)
  - `doubleIP` (multiplies Infinity Points gained)
  - `automation` (enables `dvpd.infinityAutoBots` + `dvpd.infinityAutoResearch`)
  - `secrets` (adds +3 secrets per purchase until 27; also increments `dvpd.secretsOfTheUniverse`)
- Divisions:
  - Cost escalates: `divisionCost = (divisionsPurchased >= 1 ? 2 * 2^divisionsPurchased : 2)`
  - Max: 19 purchases
  - Effect: reduces the auto-prestige bot threshold (see `GameManager.Update()` and `SidePanelManager.HandleInfinity()`)
- Break The Loop (cost 6): `pp.breakTheLoop = true`
- Quantum Entanglement (cost 12): converts leftover IP into PrestigePlus points on enactment
- Avocato (cost 42): enables Avocato feeder system (see below)
- Category unlocks (gate whole skill-tree lines):
  - Fragments (2), Purity (3), Terra (2), Power (2), Paragade (1), Stellar (4)
- Infinite-repeat purchases:
  - Influence: +4 influence/sec (cost 1 each)
  - Cash: +5% cash (cost 1 each)
  - Science: +5% science (cost 1 each)

### Avocato systems
Sources:
- Purchase: `Assets/Scripts/PrestigePlusUpdater.cs` (sets `pp.avocatoPurchased`)
- Feeding: `Assets/Scripts/AvocadoFeeder.cs`
- Meditation unlock: `Assets/Scripts/AvocadoMeditation.cs` (sets `saveSettings.avotation` and grants +4 skill points once)
- Overflow behavior: `Assets/Scripts/Expansion/Oracle.cs` (overflow detection increments `pp.avocatoOverflow`)

### Simulation (Dream1) prestige currency: Strange Matter
Source: `Assets/Scripts/Expansion/SimulationPrestigeManager.cs` + `Assets/Scripts/Expansion/ResearchManager.cs`

- Simulation prestige triggers depend on `sp.disasterStage` and simulation progress:
  - Stage 0/1: if `sd1.cities >= 1`, prestige for +1 Strange Matter
  - Stage 2: if `sd1.bots >= 100`, prestige for +10 Strange Matter
  - Stage 3: if `sd1.spaceFactories >= 5`, prestige for +20 Strange Matter
  - "Black Hole" (unlocked by countering global warming): prestige for `(int)sd1.swarmPanels` Strange Matter
- Prestige wipes Dream1 save twice (`oracle.WipeDream1Save()`), then applies research via `ResearchManager.ApplyResearch()`

### Strange Matter upgrade shop (Simulation upgrades)
Source: `Assets/Scripts/Expansion/ResearchManager.cs`

All costs are in Strange Matter (`sp.strangeMatter`). Effects are applied immediately on purchase and re-applied after prestige via `ApplyResearch()`.

Countermeasures (also set `sp.disasterStage`):
- Counter Meteor (cost 4) -> `counterMeteor = true`, `disasterStage = 2`
- Counter AI (cost 42) -> `counterAi = true`, `disasterStage = 3`
- Counter GW (cost 128) -> `counterGw = true`, `disasterStage = 42` and unlocks Black Hole

Education (affects Dream1 research times/completions):
- Engineering I (2) -> `engineeringResearchTime = 300`
- Engineering II (10) -> `engineeringResearchTime = 60`
- Engineering III (42) -> `engineeringComplete = true`
- Shipping I (18) -> `shippingResearchTime = 600`
- Shipping II (27) -> `shippingComplete = true`
- World Trade I (44) -> `worldTradeResearchTime = 1800`
- World Trade II (88) -> `worldTradeResearchTime = 600`
- World Trade III (124) -> `worldTradeComplete = true`
- World Peace I (52) -> `worldPeaceResearchTime = 3600`
- World Peace II (74) -> `worldPeaceResearchTime = 1800`
- World Peace III (188) -> `worldPeaceResearchTime = 600`
- World Peace IV (324) -> `worldPeaceComplete = true`
- Mathematics I (44) -> `mathematicsResearchTime = 1800`
- Mathematics II (88) -> `mathematicsResearchTime = 600`
- Mathematics III (124) -> `mathematicsComplete = true`
- Advanced Physics I (92) -> `advancedPhysicsResearchTime = 3600`
- Advanced Physics II (126) -> `advancedPhysicsResearchTime = 1800`
- Advanced Physics III (381) -> `advancedPhysicsResearchTime = 600`
- Advanced Physics IV (654) -> `advancedPhysicsComplete = true`

Foundational era (starting counts + purchase amounts):
- Hunters I (2) -> `sd1.hunters = max(sd1.hunters, 1)`
- Hunters II (20) -> `sd1.hunters = max(sd1.hunters, 10)`
- Hunters III (40) -> `sd1.hunters = max(sd1.hunters, 1000)`
- Hunters IV (40) -> `saveData.huntersPerPurchase = 1000`
- Gatherers I/II/III/IV mirror hunters (costs 2/20/40/40)
- Worker Boost (42) -> `workerBoostActivator = true`
- Cities Boost (1337) -> `citiesBoostActivator = true`

Information era:
- Factories Boost (21) -> `factoriesBoostActivator = true`
- Bots I (211) -> `botsBoost1Activator = true`
- Bots II (1111) -> `botsBoost2Activator = true`
- Rockets I/II/III (1111/2222/3333) -> `sd1.rocketsPerSpaceFactory = 5/3/1`

Space age:
- Space Factory Capacity I/II/III (1221/12221/122221) -> `sfActivator1/2/3 = true`
- Railguns I/II (1221/12221) -> reduces railgun firing time (`_TotalfireTime`) via activators

Reality QoL:
- Double Time (cost 5) -> `doubleTimeOwned = true`, `doubleTime = 600`
- Automate Influence (cost 10) -> `saveData.workerAutoConvert = true`

### Dream1 purchases (Influence) and key constants

Primary Dream1 purchases spend Influence (`saveData.influence`) and are implemented in:
- `Assets/Scripts/Expansion/Dream1/FoundationalEraManager.cs`
- `Assets/Scripts/Expansion/Dream1/InformationEraManager.cs`
- `Assets/Scripts/Expansion/Dream1/SpaceAgeManager.cs`

Defaults live in `Assets/Scripts/Expansion/Oracle.cs` (`SaveDataDream1` and `SaveData`):
- Hunters purchase:
  - Cost: `sd1.hunterCost` (default 100)
  - Amount gained: `saveData.huntersPerPurchase` (default 1, upgraded by Strange Matter shop)
- Gatherers purchase:
  - Cost: `sd1.gathererCost` (default 100)
  - Amount gained: `saveData.gatherersPerPurchase` (default 1, upgraded by Strange Matter shop)
- Community boost:
  - Cost: `sd1.communityBoostCost` (default 0 in save model)
  - Duration: `sd1.communityBoostDuration` (default 1200s)
- Education research "start" purchases (each sets a `sd1.* = true` flag and then progresses over time):
  - Engineering cost 1000, Shipping 5000, World Trade 7000, World Peace 8000, Mathematics 10000, Advanced Physics 11000
- Factories boost:
  - Cost: `sd1.factoriesBoostCost` (default 5000)
  - Duration: `sd1.factoriesBoostDuration` (default 1200s)
- Energy purchases:
  - Solar panel cost 50 (adds `sd1.solarPanels++`)
  - Fusion generator cost 100000 (adds `sd1.fusion++`)

Key conversion thresholds (these are effectively "implicit purchases"):
- Housing -> Village at 10 Housing
- Villages -> City at 25 Villages
- Rockets -> Space Factory at `sd1.rocketsPerSpaceFactory` (default 10; can become 5/3/1 via Strange Matter shop)

### Settings, UX, and misc parity checklist

These are not "balance numbers" but must behave the same as Unity:

- Buy modes and rounding: `SaveDataSettings.buyMode`, `researchBuyMode`, `roundedBulkBuy`, `researchRoundedBulkBuy`
- Number formatting: `SaveDataSettings.numberFormatting` (Standard/Scientific/Engineering) and matching `CalcUtils.FormatNumber` output
- Hide purchased: `SaveDataSettings.hidePurchased` and its UI behavior
- Offline time: `SaveDataSettings.offlineTime` / `maxOfflineTime`, spend-time UI, and the "double max" button logic (`Assets/Scripts/OfflineTimeManager.cs`)
- Audio: `PlayerPrefs` keys `musicVolume` and `buttonVolume`, plus `SaveDataSettings.globalMute` (`Assets/Scripts/SoundController.cs`)
- UI state persistence:
  - category open/closed state via `PlayerPrefs` (CategoryStateSaver scripts)
  - default/initial screen via `PlayerPrefs` key `initialScreen`
  - disclaimer dismissal via `PlayerPrefs` key `disclaimer`
- News ticker: fetch from `https://blindsidedgames.github.io/BlindsidedGames/newsTicker` (`Assets/Scripts/Expansion/Oracle.cs`)
- External links: Discord, App Store link, Wiki link (various `Assets/Scripts/User Interface/*` scripts)
- Achievements: `CloudOnce` achievements calls in `Assets/Scripts/Systems/GameManager.cs` (decide replacement: local-only, Steam, etc.)
- Visual-only parity: Rotator/panels effect (`Assets/Rotator.cs`) and other UI/FX scripts (recreate similarly or accept visual drift while keeping numbers exact)

## DysonVerse skill tree inventory (IDs 1-104)

Skill definitions (names, costs, requirements, exclusive locks, line membership) are serialized in `Assets/Scenes/Game.unity`.

Skill effects are applied by mapping ownership -> `DysonVerseSkillTreeData` flags in:
- `Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs`

The full extracted inventory (id, flag, popup, cost, requirements, exclusives, tags) is in:
- `skill_tree_inventory.md`

If `Assets/Scenes/Game.unity` or `Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs` changes, regenerate the inventory and re-export balance JSON during migration.

## Target architecture (monorepo)

Recommended workspace layout:

```
apps/
  web/              # Vite + React (deployable as web)
  desktop/          # Tauri wrapper (reuses the web UI)
packages/
  core/             # UI-agnostic simulation engine (runs in worker)
  balance/          # Zod schemas + tuned JSON data
  ui/               # Shared UI components/hooks (optional)
  testkit/          # Golden master + scenario runner (optional)
tools/
  unity-export/     # Parsers/exporters reading Unity YAML to JSON (Node scripts)
```

Key principles:
- Worker owns the truth: game state lives in the Worker. UI sends intent/actions and receives snapshots.
- Pure deterministic core: the core package is pure functions operating on plain JS objects and numbers, mirroring C# doubles (JS number is IEEE-754 double).
- All balance data externalized: scene-derived numbers (costs/exponents/caps/skill metadata) live in `packages/balance` as JSON validated by Zod.

Optional improvements if the project grows:
- Use `comlink` (or a tiny typed RPC) for worker communication.
- Add `turbo` (Turborepo) for task caching across pnpm workspaces.

## Porting strategy (keep parity, avoid drift)

### 1) Freeze and export balance data from Unity

Build a repeatable export pipeline that reads:
- `Assets/Scenes/Game.unity`
- `Assets/Resources/IAPProductCatalog.json`
- any other serialized gameplay parameters discovered later

Output JSON assets in the new monorepo:
- `packages/balance/src/dysonverse/buildings.json` (baseCost/exponent/strings)
- `packages/balance/src/dysonverse/research.json`
- `packages/balance/src/dysonverse/panelLifetime.json`
- `packages/balance/src/dysonverse/skillTree.json` (104 skills incl. requirements/exclusives/line tags)
- `packages/balance/src/reality/costs.json` (translation/speed costs)

Validate with Zod and commit the exported JSON so it becomes stable, reviewable source of truth.

### 2) Implement the core simulation engine (TypeScript)

Core modules to port 1:1:
- Math helpers: buy-multiple math, formatting, clamp behavior, etc.
- State model: translate `Oracle.SaveDataSettings` and nested save types into TS interfaces.
- Tick loop: replicate Unity cadence:
  - per-frame update: production + timers
  - 1s update: modifier recomputation (`CalculateModifiers`)
  - periodic checks (negative guard, prestige checks, etc.)
- Purchases & actions: implement every purchase path:
  - building purchases (manual + auto)
  - research purchases (manual + auto)
  - panel lifetime purchases
  - skill tree assign/unassign + presets + auto-assign list behavior
  - Infinity purchases + Prestige resets
  - PrestigePlus purchases + enactment behavior
  - Reality upgrades (translation/speed/doubleTime/automation)
  - Dream1 purchases and Strange Matter upgrades

### 3) Build UI in React (parity with Unity screens)

Translate Unity UI screens into route/layout structure (or a single-screen app with panels):
- Load screen (import/export, recovery, progress)
- Main DysonVerse loop (resources, building panels, research panels, buy modes)
- Skill tree (graph + lines + confirmation modal + presets)
- Infinity shop (secrets/skills/boosts/automation)
- PrestigePlus shop (Quantum)
- Reality panel (workers/influence + translation/speed)
- Simulation panel (Dream1 + Strange Matter shop)
- Story, Wiki, Stats, Settings, Audio, Debug menu

Use `react-window` for long lists (research lists, history/log panels, etc.). The skill tree itself is best rendered via SVG/canvas or a graph UI library.

### 4) Persistence and offline time

Implement save backends:
- Web: IndexedDB (or localStorage for small saves) + periodic autosave
- Desktop (Tauri): filesystem save in app data dir

Unity save/import details to preserve (optional but strongly recommended):
- Unity currently saves `SaveDataSettings` via Easy Save 3 (`ES3.Save("saveSettings", saveSettings)`) in `Oracle.SaveState()`.
- Fallback load exists for an Odin-serialized file: `<persistentDataPath>/betaTestTwo.idsOdin` (`Oracle.LoadState()`).
- Clipboard export/import uses Odin Serializer JSON (`SerializationUtility.SerializeValue(..., DataFormat.JSON)`) and Base64 in `Oracle.SaveToClipboard()` / `Oracle.LoadFromClipboard()`.
- Some entitlements/preferences are stored in `PlayerPrefs` (e.g., `debug`, `doubleip`, volume, category states). Decide whether to migrate these into the main save or keep them separate.

Port offline systems:
- Oracle's "AwayForSeconds" mechanism
- DysonVerse offline "return screen" and "spend stored time"
- Reality worker generation while away

### 5) Verification: enforce 1:1 balance

Add a parity harness early, before UI polish:
- Golden scenarios: a suite of state snapshots + dt sequences + expected outputs.
- Generate expected outputs from Unity by adding a scenario runner that logs state after N seconds.
- In TS, run the same scenarios under Vitest and compare:
  - resources, building counts, modifiers, timers, prestige triggers, upgrade flags
  - tolerate only minimal floating error where Unity/JS differ (ideally none; both are double)

### 6) Purchases / entitlements replacement

Apple/Google IAP won't exist in a pure web/Tauri build, so decide on replacements:
- Tips: external links (Ko-fi/Patreon) or Stripe checkout
- Dev options + Double IP: license key / "supporter unlock" flag stored in save

Keep gameplay effects identical to Unity even if the purchase plumbing changes.

## Implementation milestones (suggested)

1. Create pnpm workspace + tooling (ESLint/Prettier/Vitest) and empty apps/packages.
2. Implement `packages/balance` Zod schemas + Unity exporter scripts.
3. Implement `packages/core` state model + math helpers + deterministic tick loop.
4. Port DysonVerse base loop: production, buildings, research, panel lifetime.
5. Port Infinity + secrets + prestige reset logic.
6. Port skill tree purchase/refund + auto assignment + presets.
7. Port PrestigePlus + Avocato + division/break-the-loop logic.
8. Port Reality (workers/influence), translation/speed, artifact, doubleTime.
9. Port Dream1 simulation loop + disasters + Strange Matter shop.
10. Build React UI parity screens and hook into worker.
11. Add golden master tests and lock parity.
12. Package web + desktop (Tauri), add save migrations/import if needed.
