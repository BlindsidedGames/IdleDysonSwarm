# Achievement, platform-statistics and rich-presence architecture audit

Scope: investigation and design only from current Unity and Web source, 2026-08-20. This report is the sole requested write. Confirmed means direct source evidence; recommended means a design decision; dashboard unknown requires Steamworks, Google Play Console, or App Store Connect access.

## Confirmed findings

- The archived Unity registry has 27 references. The Web handoff catalog preserves 27 achievement assets and `steamAchievementId` values, while `Web/source-assets/achievements/legacy-unity/` preserves 27 hash-verified PNG masters. Historical `Assets/` paths in this audit resolve against `archive/unity-development-handoff-2026-08-21`.
- The runtime catalog intentionally has no achievement definition: Web/src/game-data/runtimeCatalogContract.ts:21-100 contains no achievement kinds, and generated/runtime-catalog.json contains none of FIRST_BOT, BOTS_42QI, or AchievementRegistry.
- Unity evaluates gameplay and publishes Steam in one service. It starts with presence/check, then uses 5 s presence, 10 s achievement, and 30 s stat/flush cadence (Assets/Scripts/Services/Steam/SteamIntegrationMonitor.cs:51-115; serialized values Assets/Scenes/Game.unity:154719-154723).
- Web provides only AchievementAdapter and PresenceAdapter contracts (Web/src/platform/contracts.ts:25-39). There is no Web evaluator or publisher. Electron has Steam Inventory/entitlement support, not achievements; Capacitor bridge has save/lifecycle/store calls only (Web/src/platform/nativeHostBridge.ts:47-81).
- Steam app ID 4348570 is in steam_appid.txt and Assets/Scripts/Systems/Platform/SteamManager.cs:165-190. SteamManager pumps callbacks per frame (:230-239); ServiceProvider registers SteamIntegrationService (:96-99).

## Complete achievement mapping

Canonical fact is the recommended platform-neutral semantic ID. Current platform ownership is external and must not be stored in GameState.

| Canonical fact | Steam ID / player-facing description | Exact active condition and progress source | Reset/reconstruction and evidence |
|---|---|---|---|
| achievement.first_bot | FIRST_BOT — Hello, World! — Build your first bot. | InfinityData.bots >= 1. | Recompute after load/import; retain external unlock. cond_first_bot.asset; ResourceThresholdCondition.cs:10-25,46-62. |
| achievement.first_assembly_line | FIRST_ASSEMBLY_LINE — First Assembly Line. | total automatic + manual assembly_lines >= 1. | Recompute facility arrays. cond_first_assembly_line.asset; FacilityCountCondition.cs:46-79. |
| achievement.first_data_center | FIRST_DATA_CENTER — First Data Center. | total data_centers >= 1. | Recompute. cond_first_data_center.asset; FacilityCountCondition.cs:60-63. |
| achievement.first_planet | FIRST_PLANET — First Planet. | total planets >= 1. | Recompute. cond_first_planet.asset; FacilityCountCondition.cs:64-67. |
| achievement.first_influence | FIRST_INFLUENCE — Influential. | saveData.influence >= 1. | Recompute. cond_first_influence.asset; ResourceThresholdCondition.cs:56-60. |
| achievement.first_infinity_point | FIRST_INFINITY_POINT — Infinity and Beyond. | PrestigeData.infinityPoints >= 1. | Recompute prestige. cond_first_infinity.asset; PrestigeThresholdCondition.cs:64-81. |
| achievement.first_quantum_shard | FIRST_QUANTUM_SHARD — Quantum Leap; description says Quantum Point. | PrestigePlus.points >= 1. | Recompute prestige-plus. Preserve ID; resolve Point/Shard wording separately. cond_first_quantum.asset; PrestigeThresholdCondition.cs:69-80. |
| achievement.first_strange_matter | FIRST_STRANGE_MATTER — Strange New Worlds. | sdPrestige.strangeMatter >= 1. | Recompute. cond_first_strange_matter.asset; ResourceThresholdCondition.cs:56-60. |
| achievement.first_ai_manager | FIRST_AI_MANAGER — AI Assisted. | total ai_managers >= 1. | Recompute. cond_first_ai_manager.asset; FacilityCountCondition.cs:52-54. |
| achievement.first_server | FIRST_SERVER — Server Room. | total servers >= 1. | Recompute. cond_first_server.asset; FacilityCountCondition.cs:56-58. |
| achievement.secrets_of_universe_maxed | SECRETS_MAXED — Master of Secrets. | No active condition: unlockCondition is fileID 0, so service cannot unlock it. Archive says secretsOfTheUniverse >= 27. | Recommended approved rule: prestige.secretsOfTheUniverse >= 27. Confirmed broken wiring: ach_secrets_maxed.asset; archive ALLACHIEVEMENTS.md:36. |
| achievement.divisions_complete | DIVISIONS_COMPLETE — Division Master. | PrestigePlus.divisionsPurchased > 10: serialized operator 2 is GreaterThan. | Recompute. Archive says all 10; product decision required. cond_divisions_complete.asset; ComparisonOperator.cs:6-24; PrestigeThresholdCondition.cs:69-80. |
| achievement.unlock_terra | UNLOCK_TERRA — Terrific. | PrestigePlus.terra. | Recompute. cond_unlock_terra.asset; QuantumUpgradeCondition.cs:57-65. |
| achievement.unlock_purity | UNLOCK_PURITY — Pureness. | PrestigePlus.purity. | Recompute. cond_unlock_purity.asset; QuantumUpgradeCondition.cs:57-65. |
| achievement.unlock_power | UNLOCK_POWER — Unlimited Power. | PrestigePlus.power. | Recompute. cond_unlock_power.asset; QuantumUpgradeCondition.cs:57-65. |
| achievement.unlock_stellar | UNLOCK_STELLAR — Stellar Job. | PrestigePlus.stellar. | Recompute. cond_unlock_stellar.asset; QuantumUpgradeCondition.cs:57-65. |
| achievement.unlock_paragade | UNLOCK_PARAGADE — Paragon of Quantum. | PrestigePlus.paragade. | Recompute. cond_unlock_paragade.asset; QuantumUpgradeCondition.cs:57-65. |
| achievement.unlock_avocato | UNLOCK_AVOCATO — Avocato Unlocked. | PrestigePlus.avocatoPurchased. | Recompute. cond_unlock_avocato.asset; QuantumUpgradeCondition.cs:57-65. |
| achievement.counteractions_complete | ALL_COUNTERACTIONS — Crisis Averted. | Intended AND of counterMeteor, counterAi, counterGw; active child GUIDs have no matching meta. AndCondition skips nulls and returns true when no child survives. | Recommended rule: all three current sdPrestige booleans. cond_all_counteractions.asset; AndCondition.cs:19-33; SimulationFlagCondition.cs:111-113. |
| achievement.speed_upgrades_complete | ALL_SPEED_UPGRADES — Maximum Speed. | Only sdPrestige.speed8 is checked, not all eight. | Recompute speed1..8; decide current versus intended meaning. cond_all_speed_upgrades.asset; SimulationFlagCondition.cs:93-100. |
| achievement.translation_upgrades_complete | ALL_TRANSLATION_UPGRADES — Lost in Translation. | Only sdPrestige.translation8 is checked, not all eight. | Recompute translation1..8; decision required. cond_all_translation_upgrades.asset; SimulationFlagCondition.cs:102-109. |
| achievement.simulation_upgrades_complete | ALL_SIMULATION_UPGRADES — Simulation Complete. | All listed flags: engineering 3, shipping 2, world trade 3, world peace 4, mathematics 3, advanced physics 4, hunters 4, gatherers 4, boosts 3, bots 2, rockets 3, solar factories 3, railguns 2, speed 8, translation 8 = 56. | Recompute flags. AllSimulationUpgradesCondition.cs:14-82,96-202; archive says 59. |
| achievement.developer_options | DEV_OPTIONS — Developer Mode; hidden. | StaticSaveSettings.debugOptions == true. | Recompute; provider-policy decision required. cond_dev_options.asset; DevOptionsCondition.cs:17-32. |
| achievement.avotation_secrets_complete | EASTER_SECRETS — Secret Hunter. | avotation ? 7 : clamp(avotationProgressStep, 0, 7), then >= 7; progress maximum 7. | Recompute save state, not transient found-secret set. cond_all_secrets_found.asset; SecretsFoundCondition.cs:21-33; SteamIntegrationService.cs:513-540. Archive says 10/all. |
| achievement.avocados_skill | EASTER_AVOCADOS — Avocados! | Skill ID avocados owned; modern dictionary, simple dictionary, then legacy fallback. | Recompute. cond_avocados_skill.asset; Assets/Data/IDs/Skills/avocados.asset:13-15; SkillOwnedCondition.cs:22-55. |
| achievement.bots_42qi | BOTS_42QI — The Answer. | Actual unlock bots >= 1e19; progress floor(log10(bots)), target 19. | Recompute resettable bots; retain unlock. cond_bots_42qi.asset; SteamIntegrationService.cs:429-443. Player/archive 42 Qi text conflicts. |
| achievement.skill_points_42 | SKILLS_ASSIGNED — Point Blank. | Sum costs of currently owned skillStateById entries >= 42; progress target 42. | Absolute value can fall after reset/refund. cond_skills_assigned_42.asset; SkillPointsAssignedCondition.cs:22-51; SteamIntegrationService.cs:462-507. |

## Complete platform statistics and presence mapping

| Canonical fact / type | Unity / Steam field and exact update | Reconstruction / recommended shared fact |
|---|---|---|
| stat.play_time_seconds / additive delta | TOTAL_PLAY_TIME, float. Every 30 s and on pause/quit get provider value, add unscaled session accumulator, set, then flush. | No shown durable gameplay total. Use a host-owned durable delta outbox with UUID + acknowledgement; never retry remote-plus-accumulator. SteamIntegrationMonitor.cs:84-115,117-133. |
| stat.highest_bot_exponent / monotonic maximum | HIGHEST_BOT_EXPONENT, int: floor(log10(bots)), only write if greater; BOTS progress target 19. | Evaluate canonical bots; publish max(remote/local/candidate), never lower on reset. SteamIntegrationService.cs:424-443. |
| stat.highest_influence_exponent / monotonic maximum | HIGHEST_INFLUENCE_EXPONENT, int: floor(log10(saveData.influence)), only write if greater. | Same maximum reconciliation. No achievement consumes it. SteamIntegrationService.cs:446-456. |
| stat.skill_points_assigned / absolute | SKILL_POINTS_ASSIGNED, int: current owned skill cost sum; set on change; progress 42. | Latest recomputed canonical value wins. SteamIntegrationService.cs:462-507. |
| stat.avotation_secrets_found / absolute | SECRETS_FOUND, int: current 0–7 Avotation progress; set on change; progress max 7. | Recompute from save; archive claims increment-only but code sets absolute. SteamIntegrationService.cs:513-540. |
| stat.secrets_of_universe / absolute | SECRETE_OF_THE_UNIVERSE, int, singular/typo: clamped PrestigeData.secretsOfTheUniverse. | Recompute/clamp. Dashboard name/type unknown because archive omits it. SteamIntegrationService.cs:545-560; ALLACHIEVEMENTS.md:7-14. |
| presence.template / ephemeral | steam_display = #Status_InGame. | Set active/clear on exit. Host-only localisation token. SteamIntegrationService.cs:132-138,253-260. |
| presence.status / ephemeral | status is Early bots; Infinity IP + bots; Quantum QP + IP; Reality + QP; Avocado multiplier + QP. Tier priority Avocado, reality (QP or 27 secrets), quantum, infinity, early. | Separate PresenceSnapshot, preserving current MAX/ERR formatting. SteamIntegrationService.cs:59-77,141-250,575-580; ProgressionTier.cs:10-26. |

`Web/source-assets/achievements/legacy-unity/ALLACHIEVEMENTS.md` documents five apparent stats and three progress calls. It is not evidence of live dashboard configuration. API names/types/defaults/increment policy, visibility, localisation, tokens, icons and uploads are dashboard unknown.

## Recommended design

The architecture is: validated canonical GameState plus session clock feeds one deterministic AchievementFactEvaluator with no SDK or provider ID. It yields canonical achievement facts and statistic facts with absolute, monotonic-maximum, or additive-delta semantics. A shared PublicationCoordinator owns a durable host outbox. Browser uses a no-op adapter; Electron renderer calls an Electron-main Steam adapter; Android calls Google Play Games; iOS calls Game Center. Separately, a PresenceSnapshotEvaluator feeds platform presence adapters; it never shares achievement queue or failure ownership.

Run fact evaluation after validated hydrate/import publication, after canonical revision changes, and in a bounded safety sweep. The current low-level contract methods remain host primitives, but renderer callers must submit canonical fact batches, never Steam names.

Reliability rules:

1. Retroactive unlocks: after hydrate/import, evaluate all 27 approved predicates; query or tolerate already-complete provider records, then submit reached facts. Do not infer unresolved legacy behaviour.
2. Idempotency: persist records keyed by platform account, canonical ID and command UUID. Completion is replay-safe; acknowledgements suppress repeats. Keep ownership outside GameState as already required by Web/docs/contracts/game-state-contract.md:87-90.
3. Semantics: latest revision wins for absolute values; maxima merge upward; play time is sequenced, acknowledged delta. Never coalesce an unacknowledged delta.
4. Offline/reconnect: host-private outbox stores canonical ID, semantics, value/delta, revision, command ID, attempt, retry time and receipt. Use bounded exponential backoff with jitter; nonretryable authentication/map errors become diagnostics.
5. Lifecycle: bounded flush at checkpoint/background/Electron-close preparation. Clear presence after final publish attempt. Mobile termination remains best effort under Web/docs/platform/native-host-foundation.md:58-62. Platform failures cannot delay or roll back canonical save.
6. Reconciliation: remote achievement completion wins; maxima merge up; absolute values come from canonical state; total deltas require account acknowledgement/sequence de-duplication. Do not promise cross-provider account sync before certification.

## Ownership boundaries, concrete directories and exclusions

| Location | Owns | Must never contain |
|---|---|---|
| Web/src/gameplay/achievements/ | canonical IDs, selectors, predicates, evaluator, fixtures | provider IDs, SDK imports, artwork, dashboard metadata |
| Web/src/platform/achievement-publication/ | coordinator, outbox, semantics, lifecycle, browser no-op | provider IDs or SDK imports |
| Web/src/platform/presence/ | presence snapshot evaluator | achievement logic, provider tokens, SDK imports |
| Web/hosts/electron/steam-achievements/ | Electron-main Steam map, binding, presence map | renderer imports or mobile code |
| Web/hosts/capacitor/android/.../platformachievements/ | Google Play Games native adapter/IDs | Steam data/artwork |
| Web/hosts/capacitor/ios/App/App/PlatformAchievements/ | Game Center native adapter/IDs | Steam/Google data |
| protected dashboard workspace outside Web/src | provider exports, achieved/locked art masters, credentials, provider localisation | canonical rule authority |

Only approved player-facing copy and canonical IDs may enter generated runtime catalog. Each host independently maps canonical fact ID to its provider ID. Preserve native output separation at Web/vite.config.ts:63-107 and narrow bridge rules at Web/hosts/electron/main.mjs:61-77 and Web/docs/platform/native-host-foundation.md:80-88.

Required build/package tests:

1. Reject Web/src imports from Web/hosts, and provider SDK/ID/art/dashboard markers in browser dist.
2. Scan dist-native: canonical facts may exist, but Steam app ID/API names/dashboard metadata/art must not. Scan Android/iOS for Steam markers and Electron package for Google/Game Center markers.
3. Test preload/native bridge accepts only canonical batches and typed receipts, never generic SDK calls, provider IDs, account tokens, dashboard config or arbitrary I/O.
4. Fixture-test 27 definitions, six statistics, all semantics, import reconstruction, duplicate retry, offline replay, lifecycle timeout and browser no-op.

## Shared work versus certification work

| Shared now | Provider/dashboard deferred work |
|---|---|
| canonical predicates/IDs, evaluator, public-copy policy, outbox/retry/receipt, import reconstruction, lifecycle isolation, no-op | Steam app/stat/achievement configuration, #Status_InGame, callback pump, Electron-main SDK binding, icons, hidden state, localisation |
| presence snapshot and diagnostic vocabulary | Google Play Games project/OAuth/test-track/Android mapping |
| validation saves and bundle exclusions | Game Center IDs/capability, sandbox account, completion policy, App Store Connect setup |

No source proves Google Play Games or Game Center achievement configuration. The archived `GAME_KIT_API_ENABLED` project setting is not dashboard evidence. The 27 PNGs prove prepared images, not achieved/locked variants or upload.

## Staged implementation plan and gates

1. Preserve and decide now: capture below, freeze 27 source map, resolve every broken/conflicting predicate. Gate: each canonical ID has one approved predicate and missing references never count as valid.
2. Shared foundation now: project approved provider-neutral definitions; build evaluator/outbox/coordinator/no-op, import reconstruction and lifecycle tests. Gate: deterministic reset/import/retry tests plus exclusion scans.
3. Electron Steam later: main-process binding/map and typed preload. Gate: fake SDK tests, then private/test Steam app validates every ID, type, progress, retry, close flush/clear, dashboard copy/art.
4. Android later: Google Play Games host only after project/test track exists. Gate: signed internal-track test covers unlock, reconnect, activity recreation.
5. iOS later: Game Center host after App Store Connect setup. Gate: sandbox device authentication, retroactive reporting, percentage/background behaviour.
6. Per-release: compare map with provider export, inspect package, test clean/old/imported saves and offline/reconnect. Browser remains no-op unless explicitly authorised otherwise.

## Unity-removal preservation record

- [x] The exact source tree, GUID metadata, service code, scene serialization, project settings, and plugins are retained on the public archive branch/tag.
- [x] The Web-authored handoff capsule preserves all 27 definition records and their referenced condition data with historical path, GUID, and source-hash provenance.
- [x] `Web/hosts/electron/steam_appid.txt` preserves the development app ID.
- [x] All 27 PNG masters, one ALLACHIEVEMENTS copy, message, soundtrack master, and Steam icon are retained under `Web/source-assets/` with automated hash checks.
- [ ] Read-only dashboard exports: Steam APIs/types/defaults/increment rules, hidden/progress/localisation/#Status_InGame/art; equivalent Google/App Store evidence only for planned releases.

## Verification performed

- Counted 27 registry references, 27 active assets, 27 source-catalog IDs and 27 archive PNGs; confirmed no runtime-catalog achievement ID.
- Reconciled every definition with referenced condition/evaluator source, then checked monitor/service/stat/presence/scene and current Web host contracts.
- This report is the only intended write. Validate diff whitespace, table completeness and internal anchors after creation.
