# Steam readiness and implementation outline — 4 September 2026

Implementation authorized 2026-09-04. Starting baseline 3ee99f4d. Worktree: /Users/matthewrushworth/Projects/ids-steam-release; branch codex/steam-release-preparation. Raw partner exports remain outside the repository.

## Initial captured configuration (historical; see current checkpoint below)

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

### Latest packaged smoke evidence

- Package source commit: `29a77cd375bed794ec46d57388c1b5276a970772`; version 4.1.6 / build metadata 2026090201; macOS arm64, unsigned development package. Exact component SHA-256 hashes are recorded in the private `macos-development-build.json` manifest. This package is not a Steam candidate and has no Steam BuildID.
- Latest packaged missing-client + minimize/restore regression completed with exit 0. Steam initialization failure left the renderer playable; native libraries were confirmed outside ASAR. This does not substitute for Steam-client/overlay or OS-sleep testing.
- Catalog before-upload gate was run and failed closed because the Steam desktop client is not running. No upload or metadata publication attempted. Steamworks browser login alone does not satisfy this gate.
- Cloud retry follow-up: if checkpoint bytes were written but the acknowledgement marker failed, publishing the same checkpoint retries that marker instead of silently skipping it.

### Live catalog setup — desktop client now signed in

- The before-upload native gate received the definition-ready callback and confirmed an empty catalog: reserved IDs 1001–1005 unused.
- Uploaded the approved `itemdefs.json` through Steamworks Inventory Service. Server response: `Modified 5/5 item definitions. Flushed Econ caches: no.` This is an app-wide catalog change, not a beta-only change.
- First post-upload native definition refresh timed out; application mappings remain disabled pending verified provider readback. Do not upload again blindly. Inspect provider/cache propagation and complete the after-upload gate.

### Current provider checkpoint — 2026-09-04 21:12 AEST

- Desktop client authentication verified. All five uploaded definitions pass the authoritative after-upload SDK gate, including IDs, copy, prices, stacking/purchase limits and non-tradable/non-marketable flags. Enabled Electron mappings 1001–1005 only after this passed.
- Native Steam-returned AUD prices exactly match the website baseline: A$1.49 / A$6.99 / A$30.99 / A$15.99 / A$4.99. No transaction initiated.
- Corrected catalog verification for Steam's cached-definition behavior: LoadItemDefinitions requests refresh, but update callbacks are not emitted for every cached read. Pre-upload empty catalogs still require a callback; after-upload requires acknowledged prices and every expected concrete definition/property.
- Inspected the pending policies revision in full: it activates Inventory Service/economy, so it is required for this scope rather than an unrelated policy edit. No policy values changed manually.
- Published reviewed policies revision 1, stats revision 4 and UFS revision 1. Steamworks reports Publishing successful / changes now live. Stats diff removes only BOTS_42QI's HIGHEST_BOT_EXPONENT 0–19 progress association. Existing IDs and earned unlocks remain intact.
- Published Auto-Cloud: 268435456 bytes / 16 files, developer-only ON, dynamic sync OFF; four exact checkpoint/backup patterns, nonrecursive, All OSes, account-scoped subdirectory. WinAppDataRoaming maps to MacAppSupport and LinuxXdgConfigHome with empty added paths and replacement OFF. Developer-only is retained during testing; broader Cloud availability requires beta acceptance.
- Native verified inventory read succeeded with zero items after policy publication (previous result was EResultFail before activation). No purchase or achievement/stat mutation made by these probes.
- Focused Electron host tests: 9 passed after enabling verified mappings. No new Steam build uploaded; public branch and mobile releases unchanged.
- Remaining: packaged authenticated desktop/store QA, signed/cross-platform packages, updated Electron upload tooling (existing local uploader still validates old Unity payload names), private beta BuildID, cross-machine Cloud/transaction acceptance, final footage/trailer.

### Authenticated packaged UI and upload preflight checkpoint

- Source 77a0113b rebuilt into macOS arm64 development package, version 4.1.6 / 2026090201. Private manifest `macos-catalog-build.json` records exact source hash and ASAR/native-library hashes. No uploaded BuildID.
- Authenticated packaged smoke: SDK initialized; renderer ready; 20-second minimize/restore passed with exit 0. Interactive launch loaded existing Unity progress through migration; verified Steam prices visible and Restore Purchases completed against empty inventory. Normal close completed. No transaction initiated, no synthetic achievement fixture used. Existing progress may publish legitimately proven milestones through normal application behavior.
- Screenshots: `authenticated-store.png` and `authenticated-store-restored.png` in the private evidence directory. SDK probe logs and packaged logs remain there too.
- UI inspection found mobile restore copy incorrectly describing retained Steam supporters as consumable. Added Electron-only restore wording in all supported locales; mobile continues selecting its original message. This copy correction is newer than the tested package and needs inclusion in the next candidate.
- Live depot assignments confirmed: Windows 4348571, Linux 4348572, macOS 4348573. Public default BuildID remains 22353758; no beta branch/build exists yet.
- SteamCMD cached uploader authentication succeeded (exit 0). It reports a cached token expiry on 5 September; recheck authentication before upload. Desktop Steam login and SteamCMD uploader are separate accounts/sessions.
- No Developer ID Application signing identity is installed (only Apple Development identities). Windows/Linux native compilation environments are not configured locally. These and platform runtime evidence remain delivery gates; do not label the unsigned arm64 development package a validated multi-platform candidate.
- TypeScript, lint, translation completeness/compilation and focused Electron host tests passed after the copy change. Full baseline/mobile evidence remains recorded above; no mobile release performed.

### Updated delivery decision — public opt-in beta

Matthew explicitly requests **Public Beta**, branch `public-beta`, on existing App ID 4348570. No password, separate App ID, or private-beta access flow. It must support Windows x64, macOS Intel/Apple Silicon, and Linux x64/SteamOS. Default public branch remains BuildID 22353758 until separate release approval. Existing platform depots can carry beta-specific manifests. Finish platform packaging and runtime checks, then upload one recorded candidate and set only public-beta live. This supersedes earlier private steam-refresh-test wording.

Immediate execution checklist:
- [x] Build Windows x64 and Linux x64 native addons and packages; binary/package checks passed. Native OS launch acceptance remains pending.
- [x] Build universal macOS Intel and Apple Silicon package with matching addons; both architecture smoke checks passed.
- [x] Check launcher names, Steam libraries outside ASAR, and exact commit provenance.
- [x] Create Public Beta branch, upload all three platform depots, record manifests and BuildID.
- [ ] Install beta through Steam and verify launch/store/save behavior; Matthew performs real purchases and cross-machine acceptance.

### Three-platform Public Beta candidate uploaded

- Public branch `public-beta` / description Public Beta created without a password. Codex browser cannot display Steam's prompt() for creating branches; used already-authenticated Safari UI.
- Candidate source e72304e48f23c6de3353e8d1e979f6975bde96f8, version 4.1.6 / build 2026090201. Windows x64 and Linux x64 packages built; macOS universal package has Intel and Apple Silicon architectures. Correct platform Electron runtimes downloaded rather than copying local Mac runtime.
- Pinned Zig 0.15.2 downloaded from official distribution with verified SHA-256; builds Windows/Linux addons locally against the pinned SDK. Windows resolves Node-API from current Electron process via GetProcAddress, removing hard dependency on node.exe. Native library format/import checks passed. Mac universal renderer ASARs are byte-identical; skip redundant ASAR merge (upstream merge otherwise fails with pattern is too long). Native libraries remain outside ASAR.
- Corrected StoreRouteSurface host kind to desktop-native; previous checkpoint's TypeScript claim was premature. Actual rerun now passed TypeScript/lint/9 host tests. Full suite passed 111 files / 1172 tests.
- Universal Mac authenticated smoke passed for arm64 and x86_64 via Rosetta. Intel first launch was slow; did eventually reach renderer-ready and exit 0. Windows/Linux native runtime launch remains unverified on this Mac.
- Linux executable staged as Idle Dyson Swarm.x86_64 to preserve existing Steam launch configuration. Windows Idle Dyson Swarm.exe and macOS Idle Dyson Swarm.app already match configured launch paths.
- Uploaded BuildID **25123023**, with Windows manifest **1018312718083049240**, Linux **8825404052260497693**, macOS **1298483979878478106**. Private candidate-manifest.json records file hashes for all depots.
- Published UFS revision 2 removing only developer-only Cloud restriction, so public beta testers can use configured Cloud. Default public game build not intentionally changed.
- Clicked Set Build Live Now on preview explicitly targeting public-beta / 25123023. Browser click timed out; activation outcome must be independently verified before retrying or reporting live.

- ACTIVATION VERIFIED in independent Safari session: public-beta now points to **25123023**; default remains **22353758**. History explicitly records Set live BuildID 25123023 for branch public-beta. The in-app browser blocked on Steam's confirmation dialog; Safari confirmation completed successfully.
- Steam client UI automation is currently unavailable: nested Steam bundle capture fails with ScreenCaptureKit -3811, launcher bundle reports running application not found. Downloading beta through SteamCMD into a separate evidence directory for an independent depot installation check instead; do not claim GUI selector was observed.

### Download verification and handoff

- SteamCMD installed public-beta successfully into a separate directory. All **1,854** regular-file hashes in downloaded macOS depot match the recorded candidate manifest. Downloaded app initialized Steam, reached renderer-ready and exited 0 in smoke mode.
- Public Beta is live at **25123023**. Default remains **22353758**. Final package source is **e72304e48f23c6de3353e8d1e979f6975bde96f8**; later commits record evidence and automate the already-applied Linux launcher rename, without changing uploaded gameplay code.
- Matthew can now select Public Beta in Game Versions & Betas. No password or separate App ID. Remaining acceptance: actual Windows/Linux launches, purchases/cancellation/restoration with owned items, Cloud transfer/conflicts across machines, and final trailer after acceptance. Do not represent cross-compilation or package checks as real Windows/Linux runtime testing.


### Public Beta field failures — 2026-09-04

Matthew reports missing Steam overlay, Windows update failure “missing downloaded files”, and macOS close leaving Steam running. Candidate 25123023 is not accepted.

- Confirmed macOS last-window policy only quit non-Mac hosts. Steam distributions now quit after the existing bounded renderer checkpoint and Steam flush. Added `--close-smoke` to exercise real close/quit instead of bypassing it with app.exit. Development close smoke passed (exit 0); packaged verification pending. Also corrected development package metadata lookup.
- Overlay candidate: initialize SDK before app ready; configure in-process GPU and disable direct composition before ready; invalidate visible, non-minimized Steam windows at 60 Hz. Based on upstream steamworks.js Electron integration and Valve overlay rendering requirements. This is a candidate fix until visibly tested from Steam; no claim of Windows/Linux runtime validation. Non-Steam/mobile rendering untouched.
- Downloaded Windows public-beta from Steam with forced Windows platform. SteamCMD reported fully installed; all 1,669 regular files matched source SHA256, no missing/different files or symlinks. Evidence outside repo: public-beta-upload/download-windows.log and windows-download-verification.json. This does not reproduce an existing Windows installation transition; need affected client content_log.txt to diagnose that failure if it persists.
- References: https://github.com/ceifa/steamworks.js/blob/main/index.js and https://partner.steamgames.com/doc/features/overlay .

- Further Windows packaging inspection found Android Gradle intermediates auto-included by electron-builder through production @capacitor/android dependencies. Maximum relative path 271 characters, before Steam library prefix: a concrete Windows MAX_PATH compatibility hazard. Exclude all node_modules from desktop artifacts (Vite bundles renderer dependencies; main host uses only built-ins/local files), and fail Windows packaging on relative paths >160 characters or leaked node_modules. This is the likely update failure; affected Windows client must still confirm.


### Repair candidate live: 25123535

- Source ff8067f93702b3bf34a23be3c2f03214f3a0c3af, desktop version 4.1.6/build metadata 2026090201. Uploaded all three depots and auto-set only public-beta; Steamworks branch table/history verified Public Beta 25123535 and unchanged default 22353758.
- Manifests: Windows 4348571 = 8379148027259965851; Linux 4348572 = 3529454255836770338; macOS 4348573 = 1317556955101604223. Exact file hashes and upload logs: private steam-readiness-2026-09-04/public-beta-repair/.
- Windows package now 76 regular files, longest relative path 31 characters, no node_modules. Linux 75 regular files. Desktop dependencies are bundled in renderer; SDK/addon remains external resources.
- Upgraded the previously downloaded Windows beta through SteamCMD successfully; all 76 files match and old Android build intermediates were removed. This runs the Windows depot download on macOS, not a native Windows runtime test.
- Mac universal packaged --close-smoke passed with exit 0 and no checkpoint fallback warning. Also launched normal packaged game, clicked native close button through CUA and observed process exit 0; reopening installed game retained progress. Development suspend/resume smoke and 9 host tests plus lint passed.
- Overlay remains unverified: direct candidate launch shows game but no Shift+Tab overlay. Steam-launched verification still picked installed old BuildID 25123023 before the local client refreshed its update; quit that old build. Steam client GUI access is blocked by ScreenCaptureKit capture failure. Matthew should retest overlay after updating to 25123535; do not claim this issue resolved until visible evidence exists. If overlay still fails, investigate native render presentation rather than assuming SDK initialization proves overlay support.


### Installed-client verification — 2026-09-05

- Steam client was still running old 25123023 in a windowless process. After its close checkpoint, terminated that exact old process. Requested Steam file verification via steam://validate/4348570; content_log confirms successful client update to 25123535, Mac manifest 1317556955101604223, 2,400 removed obsolete files, result No Error.
- Launched 25123535 using steam://rungameid/4348570. Saved progress and localized Steam prices loaded. Clicked native close button; process exited and Steam gameprocess_log removed app from running list. This supersedes the earlier Steam-launch verification blocker for shutdown.
- All 111 test files / 1,172 tests passed; log public-beta-repair/regression-tests.log.
- Overlay library gameoverlayrenderer.dylib is mapped into the actual Steam-launched game process (private steam-launched-vmmap.txt). No overlay appeared with computer-control Shift+Tab; synthetic input may not traverse Steam's global shortcut hook. Physical shortcut confirmation is still required before attributing the remaining failure entirely to rendering. No purchase performed.


### Overlay diagnosis after physical shortcut confirmation

Matthew confirms physical Tab/Shift+Tab moves page focus; automated-key uncertainty is resolved. Do not suppress page navigation as an overlay fix.

Added opt-in --overlay-diagnostic host logging for IsOverlayEnabled, GameOverlayActivated callback state, and BOverlayNeedsPresent, plus diagnostic-only F8 calling ActivateGameOverlay("Friends") directly. Kept these APIs in Electron/official-SDK addon; no renderer or mobile capability added.

Local arm64 diagnostic, with the official Steam overlay dylib injected, reports enabled=false and active=false. Direct native activation briefly requests presentation (needsPresent=true) but produces no active callback or visible overlay. This points beyond keyboard routing; native presentation integration remains unresolved. Not uploaded: public-beta remains 25123535. Official API references: https://partner.steamgames.com/doc/api/ISteamUtils and https://partner.steamgames.com/doc/api/ISteamFriends . Nine host tests and lint pass; native arm64 addon compiled against pinned SDK1.65. Rebuild other native targets before packaging these new diagnostic APIs.


### Native presentation fix — working local proof

- Isolated Metal drawable test displayed Steam overlay, then returned to its native surface using Shift+Tab. Integrated a Metal child view in the existing Electron window. Chromium continues to own input and accessibility; host captures renderer pixels with at most one capture outstanding, while Metal presents for Steam. No second window or mobile/gameplay changes.
- Actual game opened Steam overlay with Shift+Tab; clicked Steam Back to Game successfully. SDK enabled=true; screenshots outside repo at steam-overlay-lab/game-overlay-open.png. Native presence and restored progress visible. This is local proof, not yet deployed.
- Added pause/minimize, capture failure fallback, pending-frame cancellation, and cleanup tests (13 tests across presentation and native host pass; lint passes). Cleanup remains allowed after account changes because it cannot publish account data.
- Removing Chromium in-process-GPU override on Mac now that native Metal owns presentation; performance recheck pending. Windows/Linux retain their existing Electron graphics configuration.
- Matthew appears to be testing a supporter transaction in the open game. Requested clarification and left that window untouched while rebuilding/testing independently. Do not close it while his purchase is in progress.

- Packaged universal overlay acceptance passed: Steam enabled=true/active=true, visible screenshot, Shift+Tab returned to gameplay, real window close exited 0. Screenshot steam-overlay-lab/packaged-overlay-open.png. Capture capped at 30 FPS; native drawable presents continuously for overlay.
- Found compiler default was embedding macOS 26 minimum in native addon although Electron package minimum is 12. Explicitly target macOS 12 for both native slices, verify Mach-O deployment targets before upload.


### Steam-installed overlay accepted — Public Beta 25133321

- Uploaded all three desktop depots from source 993eab06 with the native Metal presentation fix and macOS 12 deployment target. Steamworks branch table/history verified public-beta **25133321**; default remains **22353758**.
- Manifests: Windows 4348571 = 8663979863029922673; Linux 4348572 = 431210039147248582; macOS 4348573 = 2694046461517416028. Private upload log and candidate hashes: steam-overlay-lab/upload/.
- Matthew confirmed the purchase test could be closed. Steam still tracked completed local diagnostic sessions; used Steam Stop to clear those, then its Update button. Installed appmanifest now confirms build **25133321** and Mac manifest **2694046461517416028**.
- Launched using Steam Library Play. **Shift+Tab visibly opened the real Steam overlay**, including Game Overview and Friends. Shift+Tab closed it; clicking Bots navigated correctly and production continued. Screenshot evidence: steam-overlay-lab/steam-installed-overlay-open.png and steam-installed-overlay-closed.png.
- Clicked the native window close button. Main PID 11853 exited; Steam gameprocess_log removed AppID 4348570 from running list at 08:25:51 on 2026-09-05. Library returned to green Play with Cloud up to date. Screenshot: steam-installed-closed-play.png.
- Validation: full suite 112 files / 1176 tests passed; focused presentation/native host suite 13 tests passed after smoke changes; lint and TypeScript passed. Packaged close, overlay activation, and suspend/resume smoke passed. Both Mac native slices target macOS 12; all platform packages rebuilt.
- Mac overlay and shutdown are now verified on the Steam-installed public beta. Windows download packaging repair remains included; Windows/Linux actual runtime and overlay checks still require those platforms. Cross-machine Cloud and purchase lifecycle acceptance remain separate pending checks.


### Windows store and branding follow-up — 2026-09-05

Matthew confirms Windows now installs and Shift+Tab opens its overlay using the same Steam account. Remaining reports: Electron title-bar icon, all purchases unavailable, and purchase labels escaping the fixed-width buttons.

- Native ABI defect: Windows addon is compiled with MinGW ABI against Valve's MSVC DLL. The old virtual GetSteamID returns a CSteamID class; a compiler probe confirms MinGW expects a register return while MSVC uses an output pointer. This invalidates the authenticated identity used to enable the store. All SDK interface calls now use Valve's flat C exports, including scalar Steam IDs, inventory ownership checks and explicit integer/float stat APIs. No client ownership bypass.
- Add explicit BrowserWindow IDS icon and include its asset in desktop packages. Windows packaging keeps the builder's built-in icon/version resource editing enabled (`signExecutable: false` skips only signing). Resource read-back verifies branding.
- Reuse StableSingleLineText for purchase/status labels so fixed-width desktop buttons shrink their text. Verified five Unavailable labels fit at desktop width and grow back to normal size at 390px mobile width. Screenshots outside repo in steam-windows-store-fix/.
- Recompiled all native targets. Live Mac binding verifies authenticated identity, all five localized prices, inventory ownership read and integer/float stats. Full suite 112 files / 1176 tests passes; lint, TypeScript and native renderer build pass. Compiler and live results support the repair; actual Windows store retest is still required after upload.

- Public Beta **25133767** uploaded from source **3541bb0cf838d14db8930ac7c4aabb5244d2e6ed**. Steamworks branch table and history confirm activation; default remains **22353758**. Manifests: Windows **5705587130461681892**, Linux **4345693010510814203**, macOS **6788675287931996205**.
- Final Windows resource read-back confirms IDS ProductName/FileDescription, seven icon sizes (16–256), and matching packaged BrowserWindow asset. Windows still has 76 files / maximum relative path 31 characters. Packaged Mac overlay smoke with flat calls passes enabled/active, visible screenshot, Shift+Tab return and exit 0.
- Requested Windows retest on 25133767 for prices and branding. Actual Windows purchase lifecycle remains unverified; no purchases made by the agent. Private complete verification, compile probes, screenshots, upload logs and hashes: steam-windows-store-fix/.


### Desktop menu bar removal — 2026-09-05

- Matthew requests hiding the File/Edit/View/Window menu bar. Remove the native window menu on Windows/Linux when each game window is created; it cannot reappear when Alt is pressed. Keep the window title and controls. macOS uses its separate system menu bar.

- Live on Public Beta **25133846**, source **30e1b1881e9622f05030aafbc9530ddf50699e72**. Steamworks branch table/history verified; default remains **22353758**. Packaged host source checked for all three depots; nine host tests and lint pass. Windows manifest **3731595785356323512**, Linux **7643815618784112396**, macOS **1455413815582061205**. Private upload evidence: steam-menu-bar-fix/upload/.


### Windows acceptance confirmed — 2026-09-05

- Matthew confirms prices, IDS icon, fitted purchase-button text and hidden menu bar on Public Beta **25133846**. These Windows acceptance checks are complete. Earlier installation and overlay confirmation also stand. This does not establish completed payments, restoration with owned items, cross-machine Cloud transfer or Linux/SteamOS acceptance.

### Save recovery review and Android artifact — 2026-09-05

- Reviewed Cloud recovery with real temporary files, the canonical codec and PortableSaveRepository. Fixed conflict selection receiving a corrupt primary instead of the validated backup; acknowledgment now accepts the preserved damaged download's exact bytes. Future-version backups stop recovery rather than falling through to an older snapshot.
- Six filesystem scenarios cover local/cloud conflict choices with damaged headers and preserved originals, interrupted canonical replacement/retry, changed accounts, unreadable primary publication blocking, and future-backup downgrade prevention. Focused Cloud/inventory/publication suite: 20 tests pass. These are local failure/recovery checks, not proof of Steam transfer between machines.
- Android debug APK assembled with Java 21 and installed on dedicated emulator-5554. Extracted APK scan passes across 706 files. Interactive Store/background/restart QA awaits permission to control the unbundled emulator using ADB; desktop CUA cannot access it. Connected physical phone is untouched.
