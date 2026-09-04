# Steam readiness and implementation outline — 4 September 2026

Implementation authorized 2026-09-04. Starting baseline 3ee99f4d. Worktree: /Users/matthewrushworth/Projects/ids-steam-release; branch codex/steam-release-preparation. Raw partner exports remain outside the repository.

## Verified configuration

- App ID: 4348570; released game, Windows/macOS/Linux.
- 27 client-set achievements; DEV_OPTIONS is the only hidden achievement. English copy, localization tokens and both icon references are captured in steam-schema.json and the original VDF.
- Six stats, all default zero. See exact table below.
- Steam Cloud: byte quota 0, file quota 0; developer-only and dynamic suspend/resume sync unchecked; shared App ID 0. Auto-Cloud paths cannot be configured until quotas are set. Cloud is not presently configured to operate.
- Inventory Service enabled. Economy points to the Steam Inventory asset server. The page offers ItemDef upload but did not expose an existing item catalog. Numeric purchase ItemDefs remain unverified; no IDs are invented.
- The current new-app store config has five null product mappings and enabled=false. The native binding returns null. Targeted archived Unity purchase API searches also did not reveal ItemDef mappings.
- Publishing > View Diffs lists only a new policies section, last modified 2 September. No stats/achievement/UFS differences were listed. Leave that unrelated draft untouched.
- Existing local depot scripts name Windows 4348571, Linux 4348572 and macOS 4348573; these depot assignments were not checked against the current partner configuration this turn.

## Implementation boundaries

1. Create an isolated Steam implementation worktree. Keep Steam SDK initialization, callbacks, account identity, numeric ItemDefs, API names, inventory, stats and rich presence in hosts/electron. Use one initialized Steam client for all these services.
2. Add pure read-only achievement predicates over validated canonical state. Activate evaluation and publication only in the Steam Electron composition. Send allowlisted canonical facts through a narrow typed preload interface; never expose arbitrary SDK methods. No new Game Center or Play Games integration in this scope.
3. Keep the existing iOS/Android billing adapters, save formats, progression equations, UI and lifecycle contracts intact. The shared native build mode currently serves all hosts, so mode=native alone is not a safe Steam switch. Gate on the explicit Steam desktop distribution and Electron host capability. Ensure Steam modules, IDs and redistributables are absent from mobile artifacts.
4. Steam failures must not block startup, saving, import, reset or progression. Bound close-time publication independently of the canonical save checkpoint.

## Achievements and stats

Preserve every existing API name and already-earned achievement. Evaluate after load/import and relevant gameplay changes; retrospectively award only achievements demonstrably supported by current saved evidence. Do not guess milestones erased by an old reset. Missing Steam access must not affect play.

Use the SDK local offline cache and StoreStats acknowledgements; avoid a second competing mirror of Steam stat totals. Retry sets/unlocks idempotently. Keep any pre-submission evidence account-scoped and separate from saves. TOTAL_PLAY_TIME requires careful session accounting and ambiguous-ack tests: Steam has no arbitrary UUID deduplication interface, so a homemade delta queue is not proof of exactly-once accumulation. Never count accelerated/offline game simulation as actual session play time.

Respect the configured increment-only rules: preserve maxima for both exponent stats, SECRETS_FOUND and SECRETE_OF_THE_UNIVERSE. SKILL_POINTS_ASSIGNED is an absolute current allocation and may decrease. Preserve the historical spelling SECRETE_OF_THE_UNIVERSE.

Recommended rule corrections for review before implementation:

- BOTS_42QI: use the exact 42 quintillion threshold (4.2e19) promised by the description. The existing HIGHEST_BOT_EXPONENT 0–19 association auto-unlocks at 1e19 under the old floor(log10) calculation. Correcting code alone cannot solve that: remove/change that progress association in a separately reviewed Steamworks change while preserving the achievement ID and exponent stat meaning.
- DIVISIONS_COMPLETE: all 19 current divisions, using QUANTUM_CONSTANTS.maximumDivisions, replacing the archived >10 check. Existing unlocks remain earned.
- SECRETS_MAXED: 27 secrets; the old explicit condition is missing but the dashboard progress stat can award it. Implement the predicate and stat correctly.
- ALL_COUNTERACTIONS: require all three real counteraction flags. Missing condition references must never count as success.
- ALL_SPEED_UPGRADES / ALL_TRANSLATION_UPGRADES / ALL_SIMULATION_UPGRADES: explicit complete sets from the current game's definitions; verify the prerequisite/reset semantics rather than blindly copying the old terminal-flag checks or obsolete totals.
- EASTER_SECRETS: retain the configured seven-step completion target and validate its mapping to current Avotation progress.
- DEV_OPTIONS: use the current trusted entitlement authority, not an imported debug flag; review behavior for developer-enabled sessions before enabling publication.

## Cloud and migration

Start with launch/exit Steam Auto-Cloud over a dedicated, account-scoped desktop cloud-save location. Choose the smallest complete, validated save snapshot and bounded backups; measure sizes before choosing quotas. Use matching logical filenames with Windows/macOS/Linux root overrides. Do not sync the whole Electron userData directory, encrypted entitlement caches, account tokens, logs, temporary writes or device preferences.

Preserve original Unity saves during conversion. If both a downloaded new save and an old local Unity save exist, use the established validated recovery policy rather than blindly importing or choosing modification time. Publish a cloud snapshot only after a successful canonical checkpoint. If the current storage set cannot provide a coherent portable snapshot, add an Electron-only export/import boundary. Keep dynamic cloud sync off until suspend/resume and externally changed files are supported.

Test old Steam install -> new build; two machines in both directions; different operating systems; offline changes/conflicts; interrupted write; corrupt save; Steam account switching; cloud disabled; rollback to the old build. A private branch does not by itself give separate per-account Cloud storage, so use dedicated test accounts and backups.

## Purchases — approved new catalog

User confirmed there have never been Steam IAPs. No historical Steam purchase migration is required. Create new non-tradable, non-marketable item definitions after verifying IDs unused: 1001 ids.tiptier1 AUD149; 1002 ids.tiptier2 AUD699; 1003 ids.tiptier3 AUD3099; 1004 ids.devoptions AUD1599; 1005 ids.doubleip AUD499 (minor currency units). Verify website baseline before publishing. Use existing copy/artwork and provider localized prices. Permanent items have purchase_limit 1 and owned purchase buttons disabled; supporter tiers are repeatable and stackable, all granting the same gallery access. No generators, drops, trading, market or web Item Store.

Retain supporter items as durable provider evidence; REMOVE the consumption-oriented implementation. Verified inventory determines ownership and revocation, with account-bound encrypted offline caching. Keep mobile/web ownership intact. No new cross-platform purchase transfer. Implement a narrow pinned official-SDK Node-API binding in Electron for identity, callbacks, achievements, stats, inventory and presence. Verify schema before enabling mappings. An occupied reserved ID blocks publication instead of overwriting it.

Matthew performs actual transactions: the released app/private beta is not assumed sandboxed. Agent validates mocks and provider reads until a documented no-charge environment exists.

## Delivery gates

First prove packaged Steam launch, identity and a narrow stats/achievement smoke test. Then complete all 27 predicates, old-save migration, purchases and Cloud. Validate on each supported desktop OS; capture real Steam unlock/persistence and cross-machine evidence. Run normal repository gates and focused regression coverage, inspect iOS/Android artifacts for Steam leakage, and smoke-test mobile save/reload, store and background/resume. Record the final trailer only from a validated desktop candidate.

## Exact stat definitions

| API name | Type | Increment only | Default |
|---|---|---|---|
| `TOTAL_PLAY_TIME` | FLOAT | Yes | 0 |
| `HIGHEST_BOT_EXPONENT` | INT | Yes | 0 |
| `HIGHEST_INFLUENCE_EXPONENT` | INT | Yes | 0 |
| `SKILL_POINTS_ASSIGNED` | INT | No | 0 |
| `SECRETS_FOUND` | INT | Yes | 0 |
| `SECRETE_OF_THE_UNIVERSE` | INT | Yes | 0 |

## All 27 achievements

| API name | Display name | Description | Progress | Hidden |
|---|---|---|---|---|
| `FIRST_BOT` | Hello, World! | Build your first bot. | — | No |
| `FIRST_ASSEMBLY_LINE` | Assembly Required | Build your first Assembly Line. | — | No |
| `FIRST_DATA_CENTER` | Data Driven | Build your first Data Center. | — | No |
| `FIRST_PLANET` | Planetary Expansion | Colonize your first Planet. | — | No |
| `FIRST_INFLUENCE` | Influential | Earn your first Influence point. | — | No |
| `FIRST_INFINITY_POINT` | Infinity and Beyond | Earn your first Infinity Point. | — | No |
| `FIRST_QUANTUM_SHARD` | Quantum Leap | Earn your first Quantum Shard. | — | No |
| `FIRST_STRANGE_MATTER` | Strange New Worlds | Collect your first Strange Matter. | — | No |
| `FIRST_AI_MANAGER` | AI Assisted | Build your first AI Manager. | — | No |
| `FIRST_SERVER` | Server Room | Build your first Server. | — | No |
| `SECRETS_MAXED` | Master of Secrets | Unlock all 27 Secrets of the Universe. | SECRETE_OF_THE_UNIVERSE (0–27) | No |
| `DIVISIONS_COMPLETE` | Division Master | Purchase all Divisions. | — | No |
| `UNLOCK_TERRA` | Terrific | Unlock the Terra quantum line. | — | No |
| `UNLOCK_PURITY` | Pureness | Unlock the Purity quantum line. | — | No |
| `UNLOCK_POWER` | Unlimited Power | Unlock the Power quantum line. | — | No |
| `UNLOCK_STELLAR` | Stellar Job | Unlock the Stellar quantum line. | — | No |
| `UNLOCK_PARAGADE` | Paragon of Quantum | Unlock the Paragade quantum line. | — | No |
| `UNLOCK_AVOCATO` | Avocato Unlocked | Purchase the Avocato system. | — | No |
| `ALL_COUNTERACTIONS` | Crisis Averted | Counter all three disasters. | — | No |
| `ALL_SPEED_UPGRADES` | Maximum Speed | Purchase all simulation speed upgrades. | — | No |
| `ALL_TRANSLATION_UPGRADES` | Lost in Translation | Purchase all translation upgrades. | — | No |
| `ALL_SIMULATION_UPGRADES` | Simulation Complete | Purchase all simulation upgrades. | — | No |
| `DEV_OPTIONS` | Developer Mode | Unlock developer options. | — | Yes |
| `EASTER_SECRETS` | Secret Hunter | Find all secret buttons. | SECRETS_FOUND (0–7) | No |
| `EASTER_AVOCADOS` | Avocados! | Unlock the Avocados skill. | — | No |
| `BOTS_42QI` | The Answer | Reach 42 Quintillion bots. | HIGHEST_BOT_EXPONENT (0–19) | No |
| `SKILLS_ASSIGNED` | Point Blank | Assign 42 skill points. | SKILL_POINTS_ASSIGNED (0–42) | No |

## Sources

- https://partner.steamgames.com/apps/achievements/4348570
- https://partner.steamgames.com/apps/stats/4348570
- https://partner.steamgames.com/apps/raw/4348570/5
- https://partner.steamgames.com/apps/cloud/4348570
- https://partner.steamgames.com/apps/inventoryservice/4348570
- https://partner.steamgames.com/apps/publishing/4348570 (View Diffs only)
- https://partner.steamgames.com/doc/features/achievements
- https://partner.steamgames.com/doc/api/ISteamInventory#StartPurchase
- Current repository: docs/audits/achievement-platform-architecture-audit-2026-08-20.md; hosts/electron; src/platform/nativeHostBridge.ts; src/platform/contracts.ts; src/simulation/quantumUpgrades.ts; vite.config.ts.
- Historical source: archive/unity-development-handoff-2026-08-21. Historical findings require current predicate verification during implementation.

## Fixed implementation decisions and resumption checklist

This section supersedes tentative recommendations above. Future iOS/Android adapters reuse canonical predicates; mobile/browser hosts omit optional publication capability and run no achievement work. Capture committed state before reset and rebind on load/import. No new developer-mode achievement suppression. Use all 19 divisions, 27 secrets, seven Avotation steps, 42 allocated skill points, and exact 42 quintillion bots. Remove the bot exponent progress association, preserving earned unlocks and existing IDs. Freeze applicable simulation upgrade sets in coverage tests.

Cloud: launch/exit Auto-Cloud; one portable snapshot plus three backups, account-scoped, initial 256 MiB/16 files after size verification. Validate through existing recovery pipeline, preserve both conflicting candidates and require choice. Exclude local preferences/jobs/credentials. Dynamic sync off. No account identity means local play without Cloud publication.

Delivery: private Steam branch steam-refresh-test; Windows depot 4348571, Linux 4348572, macOS 4348573 (confirm first). Public Steam build/mobile releases/store updates remain separate. Steam settings are app-wide; unrelated pending policies must not be published accidentally. Trailer: 45–60 seconds, actual validated desktop gameplay, early production/automation/later progression, existing licensed audio, review export first.

- [x] Isolated worktree from verified origin/main; commit plan first.
- [ ] Platform-neutral predicates and optional host capability; mobile isolation.
- [ ] Native Steam addon; packaged initialization/identity/callback proof.
- [ ] All 27 achievements, six stats and presence; offline/reset/import tests.
- [ ] New catalog verified/published; retained supporter purchase implementation.
- [ ] Existing Unity compatibility; Cloud snapshot/conflict flow/configuration.
- [ ] Full repository gates; desktop package checks; mobile regressions.
- [ ] Private Steam build uploaded; exact commit/BuildID/manifests recorded.
- [ ] Matthew beta acceptance and actual purchase/cross-machine testing.
- [ ] Trailer capture and review export.

Record evidence and external blockers below after every milestone. Never mark provider verification complete from mocks alone.

### Evidence

- Starting main/origin/main: 3ee99f4d5310c079ff02b15a39df9a3f2e181230, clean; existing worktrees preserved.

### Implementation checkpoint — 2026-09-04

Implemented (provider acceptance still outstanding):
- Pure 27-achievement evaluator with canonical IDs; exact 42Qi threshold and coverage of 59 applicable simulation upgrade flags. Optional Electron capability leaves mobile publication dormant.
- Transient milestone evidence captured before automatic Infinity/Dream/Quantum resets, carried with candidate state and published only after committed state. This adds no save-format fields. Imported/replaced sessions get fresh observers/evidence.
- Official SDK 1.65 Node-API addon compiled for macOS arm64. Startup failures are nonfatal; callbacks are pumped; services are pinned to launch account; bounded shutdown; absolute stat/playtime retries. Historical formatted rich presence retained in Electron.
- Retained/stacking supporter ownership, no consumption, durable ownership refresh/revocation, repeat permanent purchases prevented. ItemDef JSON prepared; mappings remain disabled pending authoritative provider schema verification.
- Account-scoped Cloud files with fsynced replacement/three backups, downloaded originals/conflicts preserved locally, validated startup recovery, and no publication after unreadable Cloud startup. Valid portable saves precede automatic Unity migration. Unity originals remain untouched; automatic same-device migration is claimed by one Steam account; other accounts do not inherit it.

Evidence:
- Full repository suite: 111 files / 1,171 tests passed before final currency test addition; lint, TypeScript and data checks pass. Tests include reset parity, ambiguous stat acknowledgement, account switches, retained stacked supporters, cancellation/revocation and Cloud recovery.
- First macOS arm64 development package built with Electron 43.2.0. Missing Steam client smoke test reached renderer ready and exited 0. Native addon and matching dylib are outside ASAR; no Steam binaries inside ASAR. This is a development smoke package, NOT an uploaded candidate.
- Website AUD baseline matches item catalog. Steam prices use hundredths for all currencies (including JPY/KWD), verified against https://partner.steamgames.com/doc/store/pricing/currencies .
- Official SDK archive SHA-256: 8c42792e09100988e31e3dc069de2eb1bc60702a0445bb37298ba0c54067c202. SDK is local outside repo at /Users/matthewrushworth/Builds/steamworks-1.65/sdk.

External gates and next steps:
1. Steam desktop client stopped after a successful initial native identity probe. Await running signed-in client; Steamworks browser authentication is separate. Recheck definition-ready callback before treating the empty ItemDef list as authoritative. Do NOT publish reserved IDs until that succeeds.
2. No Steam settings/catalog/build mutations have been made. Unrelated pending `policies` change exists; inspect diff again and isolate it before publishing the bot-progress/Cloud settings. No public build promotion authorized.
3. Complete metadata/catalog provider checks, mobile artifact and simulator/emulator QA, signed macOS and Windows/Linux builds, Cloud cross-machine testing and private beta upload. Record exact source commit, hashes, depot manifests and BuildID; currently no uploaded BuildID.
4. Matthew performs real transactions and accepts beta. Capture final trailer only from accepted candidate. Storyboard can be prepared before acceptance.

### Mobile and packaging checkpoint — 2026-09-04

- Full suite now 111 files / 1,172 tests passing; production web build, TypeScript, lint and data checks pass.
- iOS Simulator compilation passed; scanned the complete `.app` (229 files) for Steam provider leakage. Existing 13-bot QA save survived background/resume and force termination/relaunch; saved checkpoint validates through the production preparation/hydration pipeline. Store screen loads mobile copy, with products unavailable in this unsigned Simulator context; no transaction attempted.
- Android debug APK assembled successfully; scanned the extracted artifact (704 files). The existing Google billing constant named `DEV_OPTIONS` is explicitly distinguished from Steam mappings; its value remains `ids.devoptions`. A dedicated API 35 arm64 emulator was created and the debug package launched. Canonical checkpoints validate before/after process restart (fresh zero-bot state). Full Android interactive store/background QA is still pending: CUA cannot select the emulator's unbundled Qt process.
- Mobile source/metadata remain unchanged. Capacitor synchronization temporarily generated worktree-specific dependency paths; these were restored after successful builds.
- SDK build script now verifies hashes of the pinned 1.65 headers and redistributables before compilation. `scripts/verify-steam-catalog.mjs` validates local schema and provides explicit read-only before/after provider gates; `scripts/check-steam-mobile-boundary.mjs` scans native artifacts.
- Cloud disk root is explicitly pinned to OS AppData / `Idle Dyson Swarm`, independent of Electron package-name metadata. Prepared provider settings are in `hosts/electron/steam/cloud-settings.json`; four 32 MiB snapshots fit within 256 MiB/16 files. Nothing has been applied to Steamworks.
- Playtime pauses for OS suspension and window background independently. Final trailer storyboard is in `docs/plans/steam-trailer-storyboard.md`; no final footage captured or published.
- Private evidence directory: `/Users/matthewrushworth/Builds/steam-readiness-2026-09-04/`. Includes mobile checkpoint copies and iOS screenshots; raw provider exports remain outside repo.
