# Release ledger

This ledger records externally published release identities and the local artifacts used to publish them. Platform states are reported independently; an upload is not described as available until the relevant store says it is available.

## 2026090101 — mobile 4.1.5

Release performed on 1 September 2026 (AEST, UTC+10).

### Source and identity

- Frozen product source: `13bb3dde3870428c5d6d79ba1f5195a8f41c7df7`.
- Local-only release-preparation commit: `c5c09715ae18ec89a1a54ef2aedcf28caa69a13a`, whose sole parent is the frozen product source.
- Preparation scope: `hosts/native-release.json`, generated Android/iOS/Electron release identity files, and the bounded Electron release-identity assertion. No gameplay or product-behavior source changed.
- Marketing version: `4.1.5`.
- Android version code / release candidate: `2026090101`.
- Apple build number: `2609.01.01`.
- Store collision checks completed before building: neither exact release identity existed in Google Play Console or App Store Connect.

### Validation

- `npm run release:local -- --release-id 2026090101`: passed from the preparation commit.
- Automated tests: 103 files and 1,095 tests passed.
- Lint, localization extraction/translation/compilation, web build, production storefront boundary, Electron boundary, Capacitor Android and iOS sync, and signed Android release build: passed.
- `npm run data:check`: passed.
- Website publication was intentionally not requested and was not touched.

### Artifacts

| Platform | Local artifact | Size | SHA-256 |
| --- | --- | ---: | --- |
| Android | `/Users/matthewrushworth/Projects/Idle Dyson Swarm/output/local-release/2026090101/android/idle-dyson-swarm-2026090101.aab` | 17,147,835 bytes | `37ecd58ee20aad659ed0c308991a9a73fad72b49d913f2883d823158164ceda0` |
| iOS archive bundle | `/Users/matthewrushworth/Projects/Idle Dyson Swarm/output/local-release/2026090101/ios/App-2026090101.xcarchive` | directory | Companion zip below |
| iOS archive zip | `/Users/matthewrushworth/Projects/Idle Dyson Swarm/output/local-release/2026090101/ios/App-2026090101.xcarchive.zip` | 18,701,495 bytes | `a27871f31330328ab165a65583275241a935da98e6858d4d6b1d38e4918428ec` |

The archived `App` executable SHA-256 is `51309cc256f70bfe4c71098beffd70acaf41e498931657ff308735ee242c7fa4`. Xcode Organizer also has the archive at `/Users/matthewrushworth/Library/Developer/Xcode/Archives/2026-09-01/App-2026090101.xcarchive`.

### Distribution state at handoff

| Platform | Store identity | Timestamp | Verified state |
| --- | --- | --- | --- |
| Android | `4.1.5` (`2026090101`) | 1 Sep 2026 09:29 AEST | Google Play Internal testing: **Available to internal testers**. |
| iOS | `4.1.5` (`2609.01.01`) | 1 Sep 2026 09:34 AEST | Xcode Organizer: **Uploaded to Apple**. App Store Connect Build Uploads: **Complete**. |
| Website | Frozen source unchanged | — | **Untouched**. |

Google Play emitted non-blocking warnings for a missing deobfuscation file and native debug symbols. Xcode reported the upload complete without an upload error. Any later tester-group assignment remains a separate follow-up state.

## 2026090102 — Discord bug campaign mobile 4.1.5

Release performed on 1 September 2026 (AEST, UTC+10).

### Source and identity

- Frozen campaign base: `0259cfa4d78cb0b7ce0562fdd0b86bb06d206ebd`.
- Frozen product source: `37738d422ae55376fc6bfaef7ec970feb65998db`.
- Campaign integration: pull request [#168](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/168), squash-merged into `main` before final validation and packaging.
- Marketing version: `4.1.5`.
- Android version code / release candidate: `2026090102`.
- Apple build number: `2609.01.02`.

### Campaign provenance and approvals

The frozen `new-ids-bugs` intake was investigated in five isolated worktrees and integrated in overlap order:

| Report lane | Pull request | Campaign result |
| --- | --- | --- |
| Universe designation beyond signed 64-bit range | [#163](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/163) | Not reproducible; durable compatibility coverage added. |
| Purity at maximum Skill Points | [#164](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/164) | Not reproducible; durable production-runtime, Stored Time, persistence, and reload coverage added. |
| Division-adjusted final Bot goal | [#165](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/165) | Not reproducible; durable production-runtime and reload coverage added. |
| Free Community boost activation | [#166](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/166) | Confirmed and fixed. |
| Completed Offline Time dismissal | [#167](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/167) | Confirmed and fixed. |

- Human Gate A: on 1 September 2026, the user approved proceeding from the frozen evidence into the isolated investigations after accepting dated subsections as the patch-note standard.
- Human Gate B: on 1 September 2026, after reviewing the final patch notes, combined validation, and unsigned candidate result, the user explicitly approved deploying source `37738d422ae55376fc6bfaef7ec970feb65998db` as Android `2026090102` and Apple `2609.01.02` to internal testing.

### Validation

- Final combined validation on `main`: 104 test files and 1,099 tests passed, including 7 campaign-specific files and 39 tests.
- Lint, data validation, localization validation, web and native builds, storefront boundary, Electron checks, and the signed local release pipeline passed.
- The single unsigned native candidate workflow passed for Android debug and the iOS simulator: [run 33477982747](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/33477982747).
- `npm run release:local -- --release-id 2026090102`: passed from the frozen source.
- Website publication was not requested and was not touched.

### Artifacts

| Platform | Local artifact | Size | SHA-256 |
| --- | --- | ---: | --- |
| Android | `/Users/matthewrushworth/Projects/Idle Dyson Swarm/output/local-release/2026090102/android/idle-dyson-swarm-2026090102.aab` | 17,149,830 bytes | `ca69e2843377248461060b93a1825b98508e95c0f2a1899c47aa60e59b736499` |
| iOS archive bundle | `/Users/matthewrushworth/Projects/Idle Dyson Swarm/output/local-release/2026090102/ios/IdleDysonSwarm-4.1.5-2609.01.02.xcarchive` | directory | Companion zip below |
| iOS archive zip | `/Users/matthewrushworth/Projects/Idle Dyson Swarm/output/local-release/2026090102/ios/IdleDysonSwarm-4.1.5-2609.01.02.xcarchive.zip` | 18,713,523 bytes | `21fea6a26a636a446d9aa12a1004ef1b282cb8919f16d6be46f101f9c7066b5d` |

The archived `App` executable SHA-256 is `b0cd2958bc110c79cc3c115f75ed12cd6fd01d0f180afe25c3b36d383585c3e1`.

### Distribution state at handoff

| Platform | Store identity | Timestamp | Verified state |
| --- | --- | --- | --- |
| Android | `4.1.5` (`2026090102`) | 1 Sep 2026 16:48 AEST | Google Play Internal testing: **Available to internal testers**. |
| iOS | `4.1.5` (`2609.01.02`) | 1 Sep 2026 16:55 AEST | App Store Connect upload: **Succeeded; package processing**. Tester availability was not yet claimed. |
| Website | Frozen source unchanged | — | **Untouched**. |

Google Play emitted the existing non-blocking warnings for a missing deobfuscation file and native debug symbols. Apple's uploader completed without an upload error and explicitly reported that the uploaded package was processing.

## 2026092601 — 4.1.10 Transcendence tiers internal release

26 September 2026 (AEST). Built from clean source `4d52d93f1d89569df40c8f0d9dfd7b1853b7e8e0` on `transcendence-tiers`; gameplay through `41eb8f57`. PR #217 remains unmerged. Internal deployment only; no production, App Review, website or Steam default changes.

| Destination | Identity | Verified state |
| --- | --- | --- |
| Google Play internal | 4.1.10 / 2026092601 | Available to internal testers |
| Internal TestFlight | 4.1.10 / 2609.26.01 | Testing; Internal group, 3 testers; compliance completed |
| Steam public-beta | 25545377 | Active; Windows/Linux/macOS depots included; default remains 25430928 |

- Local release gate passed: 185 files / 1,910 tests, lint, localization, web/native builds, Electron boundary and signed Android packaging. iOS archive/upload succeeded; minimum iOS 16.0. All three Steam package provenance records identify the source above.
- Downloaded Steam public-beta to an isolated directory. Manifest confirms build 25545377; all 261 regular macOS package files match the built artifact. Both local and downloaded macOS smoke launches exited successfully. No new iOS/Android/Windows/Linux hands-on interaction QA is claimed by this deployment; earlier feature QA and its limits remain in the coverage document.
- Android AAB: `output/local-release/2026092601/android/idle-dyson-swarm-2026092601.aab`, 20,041,338 bytes; SHA-256 `3869211fb7593bcc6821eaf1ffecd1be8987db91726fbd5fd08bad32121226d6`.
- iOS archive: `/Users/matthewrushworth/Library/Developer/Xcode/Archives/2026-09-26/IDS-2026092601.xcarchive`; App executable SHA-256 `9f9fb19003c771a4b6825646a4c30e2338e47ec8e15281c47b3e678e53475561`.
- Steam manifests: Windows `3372032058052744835`, Linux `2983802536680200208`, macOS `3387550695810836494`.
- Local logs, distribution screenshots, upload configuration and downloaded beta: `/Users/matthewrushworth/Builds/ids-release-2026092601/`.
- Play's missing deobfuscation/native-symbol warnings were non-blocking. No distribution blocker remains.
- Changes since the previous September 24 internal build posted to the authorised Discord dev-ops channel: https://discord.com/channels/712304553931833385/1006856538893340692/1553341867545071627.

## 2026092602 — 4.1.10 Quantum challenges and skill augments internal release

27 September 2026 (AEST). Built from clean source `2abe37681b5401e35d247d8b14d1fc1b0556dc16` on `transcendence-tiers`; gameplay through `822625cd`. PR #217 remains unmerged. Internal deployment only; no production, App Review, website or Steam default changes.

| Destination | Identity | Verified state |
| --- | --- | --- |
| Google Play internal | 4.1.10 / 2026092602 | Available to internal testers |
| Internal TestFlight | 4.1.10 / 2609.26.02 | Testing; Internal group, 3 testers; compliance completed |
| Steam public-beta | 25548161 | Active; Windows/Linux/macOS depots included; default remains 25430928 |

- Existing localized 4.1.10 patch notes already include the new Quantum challenges, four Manual Labour augments and ten Swarm/Fragment augments; no duplicate entries were added.
- Local release gate passed: 188 files / 1,958 tests, lint, localization, web/native builds, Electron boundary and signed Android packaging. CI passed on the release source. iOS archive/upload succeeded; minimum iOS 16.0. All three Steam package provenance records identify the source above.
- Downloaded Steam public-beta to an isolated directory. Manifest confirms build 25548161; all 261 regular macOS package files match the built artifact. Both local and downloaded macOS smoke launches exited successfully. Steam services were unavailable in the isolated launch because the Steam client was not running; this is a renderer/startup check, not a commerce/overlay test. No new iOS/Android/Windows/Linux hands-on interaction QA is claimed by this deployment; feature QA and limits remain in `docs/plans/swarm-augments.md`.
- Android AAB: `output/local-release/2026092602/android/idle-dyson-swarm-2026092602.aab`, 20,107,439 bytes; SHA-256 `e76437f5fa503149767da31cbc0626b3cb716e72796adbed80977cc40b88c535`.
- iOS archive: `/Users/matthewrushworth/Library/Developer/Xcode/Archives/2026-09-27/IDS-2026092602.xcarchive`; App executable SHA-256 `63fdc13b8619ff4928a47a548cd0dd44e10055c404689aea2b797ff981095240`.
- Downloaded macOS depot manifest: `7895178977127011363`.
- Local logs, distribution screenshots, upload configuration and downloaded beta: `/Users/matthewrushworth/Builds/ids-release-2026092602/`.
- Play's missing deobfuscation/native-symbol warnings were non-blocking.
- Discord Dev Ops update through Eve: https://discord.com/channels/712304553931833385/1006856538893340692/1553415115104063592.

## 2026092701 — 4.1.10 audit fixes and speedrun follow-ups

27 September 2026 (AEST). Built from clean source `adaeda45f4e752a32172a8f90026123cc6d834dd` on `transcendence-tiers`, including follow-ups through `90569a4c`. PR #217 remains draft and unmerged.

| Destination | Identity | Verified state |
| --- | --- | --- |
| Google Play internal | 4.1.10 / 2026092701 | Available to internal testers |
| Internal TestFlight | 4.1.10 / 2609.27.01 | Testing; Internal group, 3 testers; compliance completed |
| Steam public-beta | 25556171 | Active; Windows/Linux/macOS depots included; default remains 25430928 |

- Includes the integration audit fixes, non-refundable skill confirmation and dialog palette correction, active-plus-consumed-Stored-Time speedrun records and First Transcendence milestone. Existing localized 4.1.10 patch notes include these changes.
- Local release gate passed: 191 files / 2,023 tests, lint, localization, web/native builds, Electron boundary and signed Android packaging. GitHub CI passed on the release source. iOS archive/upload succeeded with minimum iOS 16.0. All Steam package provenance records match the source above.
- Downloaded Steam public-beta to an isolated directory; build 25556171, macOS depot manifest 7741415523016461731. All 261 regular macOS package files match the built artifact. Local and downloaded macOS smoke launches passed with disposable data and mock Keychain. Steam services were unavailable because the Steam client was not running; this verifies renderer startup, not commerce or overlay.
- No new iOS/Android/Windows/Linux hands-on gameplay or cross-device Cloud QA is claimed for this deployment. Earlier feature interaction evidence and limits: `docs/plans/overnight-integration-audit.md` and `docs/qa/discord-followups-2026-09-27.md`.
- Android AAB: `output/local-release/2026092701/android/idle-dyson-swarm-2026092701.aab`, 20,116,120 bytes; SHA-256 `0bfe28fd4389d96d6f644d0f0b833c504b790411d480e493e6df2e4d44366146`.
- iOS archive: `/Users/matthewrushworth/Library/Developer/Xcode/Archives/2026-09-27/IDS-2026092701.xcarchive`; App executable SHA-256 `f687250a4868594127f7033c1e59071929bd9d825423297235e978eda0abe4fd`.
- Logs, screenshots, upload configuration and downloaded beta: `/Users/matthewrushworth/Builds/ids-release-2026092701/`.
- Play deobfuscation/native-symbol warnings were non-blocking. No production, App Review, Steam default, website deployment or Discord posting was performed.

## 2026092702 — 4.1.10 facility Tinker augments and UI follow-ups

Built from clean source `15550045af712c592b668a76b4d698f4a13ded0a` on
`transcendence-tiers`. PR #217 remains draft and unmerged.

- Includes seven facility Tinker augments, preserved Assembly Line tinkering with
  Hand Assembly, automatic augment-tree opening after Fracturing, five achievement
  definitions, ten presets and optional Bots/Research preset controls. The latest
  follow-up adds a right-aligned Stored Time balance and consistent quick-use spacing
  in the drawer. Localized 4.1.10 notes cover these changes.
- Release checks: 195 test files / 2,053 tests, lint, localization, generated data,
  TypeScript, web/native builds and Electron boundary pass. Signed Android and iOS
  archive/upload succeeded. GitHub PR checks passed on the release source.
- Android `2026092702` is available to internal testers. AAB size 20,126,405 bytes;
  SHA-256 `61689f58392ba3147c09fcf049e776a511b3a9b4d04442b17574b339944e9aa9`.
- Internal TestFlight `4.1.10 (2609.27.2)` is Testing with the Internal group
  (3 testers). Export compliance is complete and testing notes are saved.
- Steam `public-beta` is build `25559716`, with Windows/Linux/macOS depots.
  Default remains `25430928`. Downloaded macOS manifest `697281781650118373`;
  all 261 regular package files match the source artifact. Local and downloaded
  startup smoke checks pass using disposable data and mock Keychain. Steam client
  services were unavailable, so commerce/overlay are not reverified.
- Latest drawer interaction QA covered desktop, 360px/130% text, German and
  compact height; spending one minute updated the balance correctly. No new native
  mobile, Windows/Linux interaction or cross-device Cloud QA is claimed.
- New achievement provider definitions remain drafts/unpublished. Authenticated
  unlocks for these new records are not verified by this deployment.
- Logs, screenshots and downloaded beta:
  `/Users/matthewrushworth/Builds/ids-release-2026092702/`.
- Google deobfuscation/native-symbol warnings and the existing web chunk-size
  warning are non-blocking. Production, App Review, website and Discord are untouched.

## 2026092703 — 4.1.10 Compound Fragments stacking correction

Built from clean source `6d6193f2efd8d93ea9b968fb780d725a86ae7b4a` on
`transcendence-tiers`, including fix `94a861e4`. PR #217 remains unmerged.

- Compound Fragments multiplies normal purchase scaling instead of replacing it.
  Skill translations and Bots details match; Stellar Swarm consumes the combined
  factor. No save migration or exponent change.
- Local release gate: 195 files / 2,059 tests, lint, localization, web/native builds,
  Electron boundary and signed Android packaging passed. Data check and GitHub
  PR checks passed. Feature interaction evidence is in `docs/plans/swarm-augments.md`.
- Android **2026092703 (4.1.10)**: available to internal testers, released 27
  September at 22:45 AEST. AAB 20,126,423 bytes; SHA-256
  `751c5e4617fe1c4988f8c4cfb3a03a63cb8d8409ef0839db447f609e2f27d125`.
- Apple **4.1.10 (2609.27.03)**: signed archive and upload succeeded. Minimum iOS
  16.0. App Store Connect displays **2609.27.3 — Testing**, assigned to the
  **Internal** group (3 testers). Export compliance is complete and the focused
  Compound Fragments testing notes are saved.
- Steam **public-beta 25560133**: active with Windows/Linux/macOS depots; default
  remains **25430928**. Downloaded macOS manifest **3830610928221534327**. All 261
  regular package files match; both local and downloaded macOS startup checks
  passed with disposable data and mock Keychain. Steam client was not running,
  so commerce/overlay are not reverified.
- No new native mobile, Windows/Linux interaction or cross-device Cloud QA is
  claimed. Achievement provider definitions remain drafts/unpublished.
- Logs, screenshots, archive export options and downloaded beta:
  `/Users/matthewrushworth/Builds/ids-release-2026092703/`.
- Eve posted the combined 2026092701–2026092703 changes to Dev Ops on Matthew’s
  behalf: https://discord.com/channels/712304553931833385/1006856538893340692/1553751345129852970.
- No production, App Review or website changes. Google symbol warnings and the
  existing web chunk-size warning remain non-blocking.

## 2026092801 — 4.1.10 augment fixes and UI polish

Built from clean source `0dde63fbaad175362df49feeb981f85dc6af4a5e` on
`transcendence-tiers`. PR #217 remains draft and unmerged.

- Updated the in-game 4.1.10 notes in all eight languages. Includes logarithmic
  Stellar Swarm scaling, ending-run Steady Supply carryover, passive-only Hands
  Off and its generated Assembly Line goal, mobile orientation settings, default
  visualization, taller facility bars and route-coloured action gradients.
- Local release gate: 196 files / 2,064 tests, lint, localization, web/native builds,
  Electron checks and signed Android packaging pass. Data and GitHub PR checks pass.
  The initial run caught an outdated patch-note assertion; corrected before packaging.
- Android **2026092801 (4.1.10)**: available to internal testers, released
  28 September at 12:44 AEST. AAB 20,134,169 bytes; SHA-256
  `ce69b801ba42a0e9b069c4b7380e0b114f2ee5bcf345a5c0f3731860154d10e1`.
- Apple **4.1.10 (2609.28.01)** (ASC displays **2609.28.1**): processing complete,
  **Testing** for the **Internal** group with **3** invitations. What to Test saved.
  Internal-only upload; no App Review submission.
- Steam **public-beta 25569496** active with Windows/Linux/macOS depots; default
  remains **25430928**. Downloaded macOS manifest **3376903457660112542**;
  all 261 regular files match. Local and downloaded startup checks pass with
  disposable data and mock Keychain. Steam client services were unavailable, so
  commerce/overlay were not reverified.
- Browser interaction/layout evidence: `docs/qa/discord-investigation-2026-09-28.md`
  and `docs/qa/action-gradients-2026-09-28.md`. Updated notes render and scroll at
  narrow/enlarged text. Native orientation evidence is partial: iOS Landscape and
  restart were checked before the bridge deduplication; Portrait/Auto and Android
  interaction remain unverified. No new mobile gameplay, Windows/Linux interaction,
  full challenge pacing or cross-device Cloud claims.
- Existing Steam/mobile scan flags the public promotion catalog's Steam store URL.
  Inspected all 587 mobile asset files while exempting only those four exact public
  URLs: no SDK/provider markers. No application change was required.
- Google symbol warnings and the existing bundle-size warning remain non-blocking.
  New achievement provider definitions remain unpublished.
- Logs, screenshots and downloaded beta:
  `/Users/matthewrushworth/Builds/ids-release-2026092801/`.
- No production, App Review, website or Discord changes.

## 2026-09-29 — 4.1.10 submitted for production review

Matthew authorized Android/iOS review submission with developer-controlled release,
plus mobile achievement submission and Permanent 2× Bots availability checks.

- Android **2026092801 (4.1.10)**: promoted the existing internal-tested AAB into
  the production draft, replacing 2026092701. Submitted for review; automated
  checks completed; Google subsequently approved the update and Publishing
  overview now shows **Changes ready to publish** with **Publish 1 change**.
  **Managed publishing is on**, so approval does not release the update. Existing
  20% staged rollout configuration is preserved for the eventual manual release.
- Apple **4.1.10 (2609.29.01)**, displayed **2609.29.1**: rebuilt the same
  gameplay source as internal 2026092801 with only a command-line build-number
  override, because previous uploads are Internal TestFlight-only. All 294 bundled
  web assets matched the 28 September archive before packaging. Archive and upload
  succeeded with `testFlightInternalTestingOnly=false`; processing completed and
  the build is attached to the 4.1.10 version. **Manual release remains selected**.
  Export compliance is complete. Apple confirmed **6 Items Submitted**: the app
  and all five achievements together, on 29 September at 10:17 AEST.
  Submission ID: `f1e8fac3-23b7-42bb-9e9d-fe8e8ace5b5c`.
- Apple achievements: all five and the app show **Waiting for Review**.
- Google achievements: published all five definitions after Matthew requested
  completion. Play Games now shows **No changes to publish**. This publication
  is separate from the Android app, which is approved and held with managed
  publishing on. Google advises achievement propagation can take a few hours.
- Permanent **2× Bots** (`ids.botboost`): Apple shows **Approved**, with all
  countries/regions selected for sale; Google shows the `permanent` buy option
  **Active** in 174 countries/regions. No pricing or purchase settings changed.
  This is store-configuration verification, not a new purchase/restore test.
- Corrected obsolete augment counts in existing Apple/Google localized release
  notes; verified all eight saved Apple translations.
- No gameplay changes, new device gameplay QA, live app release, Steam changes,
  website deployment or merge. Previous release-gate evidence remains above.
- Archive: `/Users/matthewrushworth/Library/Developer/Xcode/Archives/2026-09-29/IDS-2026092901.xcarchive`.
  Logs, export options and screenshots: `/Users/matthewrushworth/Builds/ids-submission-20260929/`.
