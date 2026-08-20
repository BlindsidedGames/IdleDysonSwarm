# Unity-Web parity audit — non-skill-tree scope — 2026-08-20

## Executive summary

The Web implementation is substantially aligned with the authoritative Unity project for authored non-skill balance data, baseline gameplay/progression, reset behavior, automation, story unlocks, and statistics. The strongest structural evidence is the current Unity-data projection: the repository check byte-compared the generated Web artifacts with the Unity sources and verified 559 Unity data assets across 34 types and 371 projected runtime assets.

Skill definitions, effects, transactions, downstream consumers, and every skill-related Unity/Web difference have been moved to the separate [`skill-tree-audit-2026-08-20.md`](skill-tree-audit-2026-08-20.md). They are deliberately excluded from this report's findings, counts, parity claims, coverage matrix, and priorities.

The remaining drift is concentrated at the product and presentation boundary:

- the Electron/Steam host has no achievements, statistics, rich presence, or working Store binding;
- Unity's audio controls and several player-facing display/interaction preferences have no Web behavior;
- the active top-level screen is not retained across a Web reload;
- Unity's live message-of-the-day, developer links, and supporter-credit surface are absent.

No remaining source candidate was left at the “likely mismatch” confidence level. Device billing, in-place mobile migration, lifecycle replay, and touch/layout behavior still require runtime validation before release; they are recorded as validation gates, not asserted defects.

## Counts

| Result | Count | Severity split |
| --- | ---: | --- |
| Confirmed mismatch or platform gap | 6 | 1 × S1, 3 × S2, 2 × S3 |
| Likely mismatch needing runtime confirmation | 0 | No source-level candidate met the threshold |
| Intentional documented adaptation | 6 | Not defects unless product requirements change |
| Source-verified parity domain | 12 | Skill-tree behavior is outside this report's scope |
| Explicit runtime validation gate | 3 | Mobile migration/Store, lifecycle/offline, responsive input |

Severity means:

- **S1** — release-blocking platform, core progression/economy, paid-entitlement, or material data-risk issue.
- **S2** — material player-visible functionality or interoperability difference.
- **S3** — lower-risk presentation, content, or continuity difference.

## Methodology

This was an investigation-only source audit. The only file created or edited by this audit is this report.

1. Inventoried the Unity scripts, `Assets/Data`, `Assets/Scenes`, and `Assets/Prefabs`, plus the Web canonical state, simulation, application, save, UI, native host, Electron host, and generated-data layers.
2. Used Unity scripts and serialized scene/prefab references as authority. Tests and port-planning documents were used only as navigation aids; parity conclusions below come from the current implementation and assets.
3. Traced each gameplay domain from Unity ownership/formulas through Web canonical state, transitions/derivations, frontend projection, commands, and UI.
4. Compared save schema, codecs, import/export direction, device-preference ownership, entitlement handling, atomic storage, legacy discovery, and reset behavior.
5. Inspected platform distinctions separately: browser/PWA, Capacitor Android/iOS, and Electron/Steam.
6. Ran `npm.cmd run data:check` from `Web`. It completed successfully and byte-verified the current generated data against Unity. This is supporting evidence for authored-data parity, not evidence for runtime behavior.
7. Used repository-wide negative searches for concrete adapters and UI surfaces when documenting an absence, then checked the composition roots to avoid mistaking an unused contract for an implementation.
8. Excluded the complete skill-tree domain after reconciling it into `Web/docs/audits/skill-tree-audit-2026-08-20.md`, so the two reports have no duplicated findings.

### Evidence labels

- **Confirmed mismatch** — the authoritative Unity behavior exists and the current Web implementation demonstrably differs or omits it.
- **Likely mismatch** — source evidence suggests drift, but a runtime observation is required to distinguish a defect from host behavior. There are no entries at this confidence level in this audit.
- **Intentional adaptation** — the Web deliberately changes mechanism or trust ownership while preserving the intended gameplay outcome, or deliberately varies by host.
- **Verified parity** — the inspected Unity and Web source paths encode the same contract. This is source parity, not a claim that every device/browser has been exercised.
- **Runtime validation gate** — source looks aligned but release confidence requires a real host/device scenario.

## Confirmed findings

### P-01 — Steam achievements, stats, and rich presence have no Web implementation

- **Classification:** Confirmed mismatch
- **Severity:** S2
- **Unity evidence:** `Assets/Scripts/Services/Steam/SteamIntegrationMonitor.cs:7-23,51-58,68-114,117-132` periodically updates rich presence, evaluates achievements, accumulates play time, flushes stats, and clears presence. `Assets/Scripts/Services/Steam/SteamIntegrationService.cs:24-28,132-137,267-331,360-418` implements Steamworks rich presence, achievement unlock/evaluation, and integer/float stats. `Assets/Scenes/Game.unity:154719` serializes the monitor. `Assets/Data/Steam/Achievements` contains 27 achievement definitions, and `Web/src/game-data/generated/catalog.json:14785-15292` proves those definitions are visible to the exporter.
- **Web evidence:** `Web/src/platform/contracts.ts:65-75` declares achievement and presence ports, while `Web/src/platform/capabilityInventory.ts:59-77` still describes them as target boundaries. No concrete achievement evaluator, Steam stat writer, or presence adapter exists under `Web/src` or `Web/hosts/electron`; the projected runtime catalog does not contain the achievement definitions.
- **Player impact:** A Steam Web/Electron build cannot unlock the 27 shipped achievements, update Steam stats/play time, show progression-tier rich presence, or clear that presence on exit.
- **Validation/fix direction:** Project the achievement registry/conditions into the runtime catalog, evaluate them from canonical state at the Unity cadence or event boundaries, and implement Electron-main-process Steam achievement/stat/presence adapters. Validate unlock idempotency, progress stats, offline/resume behavior, explicit flush, and clear-on-exit against a test Steam app.

### P-02 — The Electron Steam Store is explicitly disabled

- **Classification:** Confirmed platform gap
- **Severity:** S1 for an Electron/Steam commercial release; not applicable to browser-only play
- **Unity evidence:** `Assets/Resources/IAPProductCatalog.json:1` defines the five product IDs and durable/consumable product types. `Assets/Scripts/Systems/Debugging/DebugPurchaseHandler.cs:89-149` applies the durable Developer Options and Double Infinity Points outcomes. The authoritative product IDs are `ids.tiptier1`, `ids.tiptier2`, `ids.tiptier3`, `ids.devoptions`, and `ids.doubleip`.
- **Web evidence:** `Web/hosts/electron/steam-inventory.json:1-11` sets `enabled` to `false` and maps all five item definitions to `null`. `Web/hosts/electron/steamInventoryBinding.mjs:1-12` documents that no supported inventory purchase/ownership binding exists and always returns `null`. `Web/hosts/electron/main.mjs:323-358` therefore constructs a fail-closed Store. Android and iOS have separate first-party billing implementations and are not included in this finding.
- **Player impact:** The Electron Store cannot list localized products, purchase tips or durable upgrades, restore ownership, or grant paid entitlements.
- **Validation/fix direction:** Treat this as a Steam release blocker unless the Steam SKU intentionally excludes the Store. Supply real Steam item-definition IDs and a supported main-process Inventory binding, then validate purchase, cancellation, pending completion, ownership restore, consumption, offline cache behavior, Steam-account switching, and renderer-restart recovery.

### P-03 — Unity audio/music behavior and volume controls are absent on Web

- **Classification:** Confirmed mismatch
- **Severity:** S2
- **Unity evidence:** `Assets/Scripts/Systems/Audio/SoundController.cs:8-26,39-64` loads, applies, and persists independent music and button volume values, with Unity defaults of `0.7` and `0.5`. The Unity scene also contains the music/audio presentation assets used by that controller.
- **Web evidence:** `Web/src/platform/contracts.ts:42-43` declares an `AudioSettingsAdapter`, and `Web/src/platform/capabilityInventory.ts:101-105` marks Web Audio/HTMLAudio as required, but there is no concrete audio adapter or playback implementation under `Web/src` or any host. `Web/src/ui/gameplay/settings/SettingsSurface.tsx:385-490` renders visualization, navigation, developer information, and save data with no music or effects controls.
- **Player impact:** The Web game is silent and imported/returning players cannot reproduce Unity's music/effect-volume choices.
- **Validation/fix direction:** Decide which Unity music and button cues are required, add a host-backed Web Audio/HTMLAudio implementation, persist device-local volume, expose accessible controls, and validate browser autoplay recovery, pause/resume, mobile interruption, and mute/volume behavior.

### P-04 — Several Unity presentation preferences are preserved as data but have no Web behavior

- **Classification:** Confirmed mismatch
- **Severity:** S2
- **Unity evidence:** `Assets/Scripts/User Interface/NotationToggler.cs:12-43` supports Standard, Scientific, and Engineering notation. `Assets/Scripts/User Interface/HidePurchasedToggle.cs:9-17` controls purchased-research visibility, consumed by `Assets/Scripts/Research/ResearchPresenter.cs:434-449`. `Assets/Scripts/User Interface/ScreensaverToggle.cs:13-27` controls the idle display, consumed by `Assets/Scripts/Expansion/LoadScreenMethods.cs:70-85`. `Assets/Scripts/User Interface/ButtonThings.cs:32-47` persists frame-rate choices.
- **Web evidence:** `Web/src/save/importContext.ts:17-46` and `Web/src/game-state/mappingCoverage.ts:470-498` classify these as receiving-device presentation preferences, but the runtime does not consume them. `Web/src/ui/i18n/formatters.ts:73-139` always uses one suffix/exponential formatting strategy. `Web/src/ui/gameplay/research/ResearchSurface.tsx:125-138,500-529` continues to render maxed cards as “Purchased.” `Web/src/ui/gameplay/settings/SettingsSurface.tsx:385-490` exposes none of notation, hide-purchased, screensaver, or frame-rate controls.
- **Player impact:** A migrated player can carry apparently preserved values that do nothing. Scientific/Engineering users see a different number presentation; purchased research cannot be hidden; the Unity idle screensaver disappears.
- **Validation/fix direction:** Make an explicit per-preference product decision. Re-express relevant preferences as device-local Web settings and bind them to formatting/UI behavior, or remove them from the “preserved” promise and document the Web interaction model. Frame rate may be intentionally browser-owned, but that should be recorded as an adaptation rather than silently retained.

### P-05 — Web always starts on Bots instead of restoring the last top-level screen

- **Classification:** Confirmed mismatch
- **Severity:** S3
- **Unity evidence:** `Assets/Scripts/User Interface/ButtonThings.cs:100-115` writes `initialScreen` whenever a menu is selected. `Assets/Scripts/Systems/WikiSetter.cs:29-75` restores that screen on startup.
- **Web evidence:** `Web/src/ui/gameplay/dyson/ReadyDysonSlice.tsx:209-235` and `303-329` initialize both ready hosts with `useState<ReadyGameRoute>('bots')`; route changes update only React state. No durable top-level-route preference is read on startup.
- **Player impact:** Reloading, restarting the PWA, or recreating the renderer returns the player to Bots instead of the top-level screen they were using.
- **Validation/fix direction:** Persist a validated device-local route ID and restore it only if the route is currently unlocked; otherwise fall back to Bots. Keep dialog/draft state transient.

### P-06 — Live MOTD, community links, and supporter credits are missing from Web

- **Classification:** Confirmed content/UI mismatch
- **Severity:** S3
- **Unity evidence:** `Assets/Scripts/Expansion/Oracle.cs:521-560` loads the developer news payload. `Assets/Scripts/User Interface/MessageOfTheDay.cs:5-20` renders the live message or a retrieval fallback. `Assets/Scripts/Systems/PatreonNameSetter.cs:9-44` displays supporter names and opens Patreon. `Assets/Scripts/User Interface/DiscordButton.cs:3-8` and `Assets/Scripts/User Interface/AppStoreLink.cs:3-9` open Discord and the developer site; their callbacks are serialized in `Assets/Scenes/Game.unity:183915,254057`.
- **Web evidence:** `Web/src/ui/gameplay/settings/messages.ts:3-14` defines only static “More by Blindsided Games” copy, and `Web/src/ui/gameplay/settings/SettingsSurface.tsx:436-443` renders no buttons or links. There is no Web fetch/render path for the Unity news/supporter payload.
- **Player impact:** Web players cannot reach the official site, Discord, or Patreon from the game and do not see current notices or supporter credits.
- **Validation/fix direction:** Add allowlisted external-navigation actions through the existing platform boundary. Decide whether live MOTD/supporter data remains a product requirement; if retained, fetch it with a safe timeout, text-only rendering, and a non-blocking fallback. If retired, preserve supporter attribution elsewhere and document the change.

## Likely mismatches requiring runtime confirmation

None. The audit found runtime-uncertified areas, but current source does not justify labelling them mismatches. They are listed as validation gates below.

## Intentional adaptations

### A-01 — Web owns a separate canonical save envelope and storage engine

Unity uses Odin-serialized `IDB1` in an atomic file store (`Assets/Scripts/Systems/Save/SaveCodec.cs`, `SaveSystem.cs`, and `OdinStringFileStorage.cs`). Web uses `IDSWEB1`, IndexedDB/native files, startup resolution, single-writer coordination, backups, bounded decode, and atomic replacement (`Web/src/save/serialization.ts`, `repository.ts`, `startupResolver.ts`, and the host compositions). The mechanism change is deliberate, including the one-way migration decision recorded in A-06.

### A-02 — Entitlements are host-owned and stripped from shared saves

Unity historically carries `doubleIp`/debug claims in save and PlayerPrefs (`Assets/Scripts/Expansion/Oracle.Clipboard.cs:90-123`). Web deliberately removes `doubleIp`, `debugOptions`, and `debugEverEnabled` from shared exports (`Web/src/save/serialization.ts:42-59`) and reapplies verified host ownership through the Store authority. This is a security improvement and should remain unless a signed portable entitlement format is introduced.

### A-03 — Browser Store absence is intentional; native Store is host-specific

The browser/PWA does not expose a production Store because a browser profile is not a purchase authority. Capacitor Android uses Google Play Billing and iOS uses StoreKit (`Web/hosts/capacitor/android/.../GooglePlayStore.kt`; `Web/hosts/capacitor/ios/App/App/IdleDysonStoreKit.swift`). This host distinction is sound. P-02 applies only because Electron currently exposes a planned Steam authority that is explicitly disabled.

### A-04 — Unity scene/prefab layout is re-expressed as responsive semantic UI

Web uses React, CSS breakpoints, safe-area environment variables, dialogs, focus restoration, keyboard access, and pointer events instead of duplicating Unity canvas transforms and `Game.unity`/prefab geometry. The authoritative requirement is reachable information and behavior, not pixel-identical serialization. Touch hold-to-purchase and modal focus handling are present in `Web/src/ui/gameplay/quantum/QuantumSurface.tsx` and `FacilityDetailsDialog.tsx`.

### A-05 — Web adds accessibility, localization infrastructure, and search/disclosure behavior

React Intl, semantic controls, screen-reader labels, focus trapping/restoration, reduced-motion CSS, and remembered disclosure state are Web enhancements rather than Unity parity defects. They must not move gameplay ownership into presentation code.

### A-06 — Save migration is intentionally one-way from Unity to Web

Web imports both Unity `IDB1` and Web `IDSWEB1` saves (`Web/src/save/import.ts:19-44`) but exports its own `IDSWEB1` format (`Web/src/save/serialization.ts:11-39`). Unity's retiring save codec has no `IDSWEB1` decoder (`Assets/Scripts/Systems/Save/SaveCodec.cs:40-44,97-125`). Because Unity support is planned for removal, Web-to-Unity transfer is not a product requirement and this asymmetry is intentional. Retain Unity import compatibility for the migration window and validate Web export/re-import and backup recovery; do not add reverse Unity support.

## Source-verified parity

The following non-skill contracts were compared directly. “Verified” means the current source agrees for the named contract; it does not replace runtime/device testing.

1. **Authored data projection:** `Web/scripts/export-unity-data.ts:22,92,300-318` reads the Unity assets. The current byte check passed for 559 assets across 34 types and 371 projected runtime assets. Non-skill runtime kinds include facilities, research, facility tuning, 61 simulation upgrades, and 17 quantum upgrades (`Web/src/game-data/runtimeCatalogContract.ts:34-98`).
2. **Dyson core:** authored facility definitions, ordinary purchases, Tinker/manual labour, bot caps/distribution, panels, decay, and baseline money/science are connected through `Assets/Scripts/Systems/ProductionSystem.cs`, `Assets/Scripts/Buildings/ManualBotCreation.cs`, the generated data, `Web/src/simulation/canonicalDysonDerivation.ts`, `canonicalDysonCommands.ts`, `canonicalTinker.ts`, and `dysonAutomation.ts`. Skill-driven modifiers are outside this report and are assessed in the skill-tree audit.
3. **Research core:** costs, prerequisites, effects, level caps, purchase quantities, rounded bulk, and automation flow from `Assets/Scripts/Research/ResearchPresenter.cs`, `ResearchAutoBuy.cs`, and authored definitions into `Web/src/simulation/researchAutomation.ts`, `dysonResearchEffects.ts`, and canonical commands. The hide-purchased preference exception is P-04.
4. **Infinity:** reward state, ordinary/Break reset accounting, Infinity Shop, targets, and non-skill automation are represented by `Assets/Scripts/Systems/InfinityResetModel.cs`, `InfinityResetTransitions.cs`, and `Assets/Scripts/Systems/GameManager.cs`, then by `Web/src/simulation/infinityCycle.ts`, `canonicalInfinityReset.ts`, `canonicalInfinityShop.ts`, and `canonicalEventTimeModel.ts`.
5. **Dream:** foundational, Space Age, Information/Education, disasters/countermeasures, dream upgrades, reset causes, automation, and statistics are represented by `Assets/Scripts/Expansion/Dream1`, `Assets/Scripts/Systems/DreamResetTransitions.cs`, and authored upgrade assets, then by `Web/src/simulation/dreamFoundationalInformation.ts`, `dreamSpaceAge.ts`, `dreamEducationUpgrades.ts`, and `canonicalDreamReset.ts`.
6. **Reality/Simulations:** Worker unlock/production, Reality currency/upgrades, simulation timers, prestige/reset behavior, and authored tuning are represented by Unity Worker/Simulation managers and `Assets/Data/Balance`, then by `Web/src/simulation/realityWorkers.ts`, `realityUpgrades.ts`, `canonicalDreamDerivedFacts.ts`, and `canonicalDreamReset.ts`.
7. **Quantum:** unspent Infinity Points convert in complete groups of 42, the reset boundary reuses Infinity reset semantics, and the 17 authored upgrades are projected. Compare `Assets/Scripts/Systems/Constants/QuantumConstants.cs`, `Assets/Scripts/Services/QuantumService.cs`, and `Assets/Scripts/User Interface/QuantumUpgradeUI.cs` with `Web/src/simulation/quantumTransitions.ts:35-84`, `quantumUpgrades.ts`, and the generated catalog.
8. **Avocato:** full-resource feeding, multiplier derivation, unlock ownership, and the meditation sequence are represented by `Assets/Scripts/Systems/Avocado/AvocadoFeeder.cs`, `AvocadoMeditation.cs`, and `Assets/Scripts/Services/AvocadoService.cs`, then by `Web/src/simulation/avocadoDomain.ts:41-87` and `avocadoMeditation.ts`.
9. **Automation/reset/unlocks:** non-skill Dyson, research, Infinity, Dream, Reality, and stored-time automation are canonical commands/transitions rather than UI mutations. Web route availability derives from canonical progression in `Web/src/application/frontendSnapshot.ts` and commands are enforced again by `canonicalGameCommands.ts`.
10. **Offline and stored time:** excluding skill modifiers, Unity and Web align on backward-clock handling, comparison integrity, stored-time capacity, Dream Double Time's whole-away credit, the second admitted-stored-time credit, cold-start save gating, and lifecycle intents (`Assets/Scripts/Expansion/Oracle.Persistence.cs:689-722`; `Assets/Scripts/Systems/OfflineProgressSystem.cs:298-388`; `Web/src/simulation/timeResources.ts:165-211`; `Web/src/simulation/lifecycleAwayTime.ts:98-130`).
11. **Story/unlocks:** Unity's six chapter gates (`Assets/Scripts/Systems/StoryManager.cs:57-99`) match the Web projection for goal stage, managers/servers, star/galaxy thresholds, Infinity counts 1-9, Quantum Leap, Reality unlock, and translation/speed completion (`Web/src/application/frontendSnapshot.ts:1640-1742`). Wiki Reality/Quantum/secret gates also match (`Assets/Scripts/User Interface/WikiCategoryEnabler.cs:15-20`; `Web/src/ui/gameplay/wiki/wikiProjection.ts:31-50`).
12. **Statistics:** ordinary/Break Infinity, Infinity points, Dream reset causes, Reality workers, current/previous run buckets, and aggregate presentation are updated inside Web canonical transitions and projected by `Web/src/simulation/canonicalStatistics.ts`, `canonicalInfinityReset.ts`, `canonicalDreamReset.ts`, and `Web/src/ui/gameplay/statistics/StatisticsSurface.tsx`, corresponding to Unity's reset/statistics managers. Steam publication is separately missing under P-01.

## Runtime validation gates

### R-01 — In-place mobile migration and paid ownership

Android looks for `idle_dyson_swarm_save.txt` in the retained external-files container and binds legacy `doubleip` PlayerPrefs evidence to the discovered save (`Web/hosts/capacitor/android/.../IdleDysonNativePlugin.kt:133-165,311-314`). iOS looks for the same canonical filename in Documents and binds `UserDefaults` evidence (`Web/hosts/capacitor/ios/App/App/IdleDysonNativePlugin.swift:192-234`). Both match `Assets/Scripts/Systems/Save/SavePaths.cs:9-16`. Validate real store upgrades over the shipped Unity app, first launch, failed/corrupt candidates, one-time evidence consumption, product restore, app reinstall, and account switching on physical Android and iOS devices.

### R-02 — Lifecycle/offline replay under real host event sequences

Base non-skill lifecycle ownership and formulas align, but browsers, Capacitor, and Electron deliver pause/focus/termination differently. Validate cold launch after a long absence, rapid focus flapping, background/foreground without process death, OS kill, clock rollback, storage-cap saturation, cancel/resume of long stored-time jobs, and automatic reset boundaries. Confirm exactly one departure baseline and one replay per away episode.

### R-03 — Responsive/touch/keyboard behavior

Validate narrow portrait, wide landscape, safe-area devices, zoomed text, reduced motion, pointer cancellation, multi-touch scrolling, Quantum hold-to-buy, Tinker hold/release, keyboard activation, dialog focus restoration, and route switching in the actual browser/PWA/native shells. This is needed to certify the intentional UI adaptation, not because source currently indicates a mismatch.

## Coverage matrix

| Domain | Unity authority inspected | Web implementation inspected | Result | Exceptions / remaining validation |
| --- | --- | --- | --- | --- |
| Authored balance/content data | `Assets/Data`, definition/condition scripts | exporter, generated catalogs, runtime contract | Verified parity | Current byte check passed; behavior still audited separately |
| Bots, Tinker, facilities, production, decay, money/science | building scripts, `ProductionMath`, `ProductionSystem`, assets/prefabs | Dyson derivation/commands/event model, Tinker, automation, facility UI | Verified parity in non-skill scope | Skill-driven modifiers are covered only by the skill-tree audit; audio is P-03 |
| Research | presenter, auto-buy, definitions/effects | research automation/effects/commands/UI | Verified parity | Hide-purchased preference is P-04 |
| Infinity and Infinity Shop | reset model/transitions, GameManager, shop data | Infinity cycle/reset/shop/automation/UI | Verified parity | Steam publication is P-01 |
| Dream and disasters | Dream managers, reset transitions, upgrade assets | foundational/Space Age/Education/reset/UI | Verified parity | Device lifecycle is R-02 |
| Reality and simulations | Worker/Simulation managers, tuning/upgrades, prefabs | workers/upgrades/effects/reset/UI | Verified parity | Device lifecycle is R-02 |
| Quantum | constants, service, upgrade UI/assets | transitions/upgrades/commands/UI | Verified parity | Touch hold requires R-03 |
| Avocato/meditation | feeder, service, meditation, prefab | avocado domain/meditation/UI | Verified parity | Gesture/animation requires R-03 |
| Purchase automation and reset ordering | Unity automation/reset coordinators | canonical coordinator/commands/transitions | Verified parity in non-skill scope | Long real-save soak remains advisable |
| Offline, stored time, Double Time | persistence, away calculator, offline progress, Double Time | lifecycle away time, time resources, stored-time worker | Verified parity in non-skill scope | Host sequencing is R-02; skill modifiers are covered separately |
| Save schema/import/startup/recovery | schema 12, `SaveCodec`, atomic storage/recovery | schema 12, IDB1 decoder, repository/startup resolver | Intentional adaptation | Web storage is A-01; one-way migration is A-06; mobile upgrade is R-01 |
| Entitlements | Unity save + PlayerPrefs outcomes | native host authority/cache, stripped shared exports | Intentional adaptation | R-01 |
| Store products | Unity IAP catalog/handlers | Web Store contracts, Google Play, StoreKit, Steam inventory | Host-dependent | Android/iOS source aligned; Electron gap is P-02; browser omission intentional |
| Steam achievements/stats/presence | service, monitor, 27 definitions, scene object | interfaces/inventory only | Confirmed mismatch | P-01 |
| Story | StoryManager and serialized content | canonical projection and Story UI | Verified parity | Text/layout runtime QA under R-03 |
| Wiki/patch notes/secrets | Wiki prefab/category gates and source content | Wiki content/projection/UI | Partial parity | Unlock gates align; live/supporter/community content is P-06 |
| Statistics | Unity statistics/reset managers | canonical statistics + Statistics UI | Verified parity | Steam stats publication is P-01 |
| Settings | Unity settings components and PlayerPrefs | Web Settings surface/device preference policy | Confirmed mismatch | P-03, P-04, P-05 |
| Main navigation | Unity `ButtonThings`/`WikiSetter` | React ready-host route state/shell | Partial parity | Last route is P-05; responsive shell is A-04/R-03 |
| Audio | `SoundController`, mixer, scene audio | adapter contract only | Confirmed mismatch | P-03 |
| MOTD/developer/supporters | Oracle news fetch, MOTD, links, Patreon names | static “More by” copy only | Confirmed mismatch | P-06 |
| Responsive layout, safe area, touch, accessibility | scene/prefab layout, safe-area/orientation and hold scripts | CSS safe areas/breakpoints, pointer/keyboard/dialog semantics | Intentional adaptation | R-03 |

## Recommended order

1. Resolve P-02 before treating Electron/Steam as a monetized release target.
2. Implement P-01 before Steam release certification so achievements and stats can be validated with real progression saves.
3. Complete R-01 on physical upgrade paths before mobile rollout; this protects progress and paid ownership.
4. Address P-03 and P-04 as one device-preferences/settings pass.
5. Address P-05 and P-06 as focused product-shell follow-ups.
6. Run R-03 across the supported browser/native viewport matrix after the functional gaps settle.
