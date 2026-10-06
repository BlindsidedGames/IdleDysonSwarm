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

## 2026100401 — 4.1.11 main internal deployment

4 October 2026 (AEDT, UTC+11). Primary checkout fast-forwarded to `main` at
`7fe0d4b52d4ddddf5fcf4b9948c9434053e68f4a`, matching the freshly fetched
`origin/main`. Previous local changes are preserved in the named stash
`Preserved local work before main internal deployment 20261004` and the
backup `/tmp/ids-pre-main-20261004/`; they were not reapplied over main.

| Destination | Identity | Verified state |
| --- | --- | --- |
| Google Play internal | 4.1.11 / 2026100401 | Available to internal testers; released 4 October at 18:25 AEDT |
| Internal TestFlight | 4.1.11 / 2610.4.1 | Testing; Internal group with 3 testers; export compliance complete and What to Test saved |
| Steam public-beta | 25706924 | Uploaded and active with Windows/Linux/macOS depots; all downloaded package files match the uploaded artifacts |

- Clean-source release gate passed: 199 shared suites / 2,114 tests, lint,
  localization, web/native builds, Electron boundary, Capacitor sync and signed
  Android packaging. Swift native units: 10 passed; Android native units: 14
  passed. Shared CI and final native candidate checks passed for the exact source;
  final native run: https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/37184288828.
- Android AAB: `output/local-release/2026100401/android/idle-dyson-swarm-2026100401.aab`,
  20,158,758 bytes; SHA-256
  `c0001aa8241d377bcd2f67c78df7f96158e0fb8fdcfed5db7f9b30c9eae2f3df`.
  Local manifest binds it to the source above. Internal notes saved in all eight
  languages from the committed 4.1.11 Stellar and Infinity repeat-purchase notes.
  Play's missing deobfuscation/native-symbol warnings were non-blocking.
- iOS archive: `/tmp/ids-pre-main-20261004/ios/IDS-2026100401.xcarchive`.
  Minimum iOS 16.0; all 294 bundled public asset files match the synchronized
  mobile build. Export requested Internal TestFlight-only distribution, but
  Apple rejected this repeat upload with the previously used build-number error.
  Reused the existing upload, which App Store Connect reports as validated and
  uploaded on 4 October at 18:03 AEDT, with the expected bundle ID, version,
  build number and minimum OS. Used the signed-in Codex browser to complete the
  missing export-compliance step and save focused testing notes. The build now
  shows **Testing** for the **Internal** group with **3 testers**. Store screenshots
  and accessibility snapshots are retained with the release logs. The rebuilt
  local archive's asset comparison is not a downloaded Apple binary comparison.
- Steam provenance records identify the exact source and build 25706924. Depot
  manifests: Windows `8262303015946039045`, Linux `2300222411545372136`, macOS
  `2020011504333316293`. Download verification: 76 Windows, 76 Linux and 265
  macOS regular package files matched, with no differences. The rebuilt macOS
  package passed startup with disposable state and mock Keychain; Steam client
  services were unavailable, so commerce/overlay were not reverified. No new
  mobile or Windows/Linux interaction QA is claimed.
- Steam default remains 25569496. No production, App Review, website or messaging
  publication was performed. Logs, upload configuration and download comparisons
  are under `/tmp/ids-pre-main-20261004/`.
- All three internal destinations are available. The final local change is this
  release-ledger entry; product source remains main. The earlier Safari sign-in
  blocker was resolved by using the existing signed-in Codex browser session.

## 2026100403 — 4.1.11 Offline Time trial and save export fixes

5 October 2026 (AEDT; release identity dated 4 October UTC). Released clean
isolated source `aa29c11d6f5c522f67a1ac681e0c7e3633e54da0` on
`codex/offline-speed-internal-2026100403`, based on main
`7fe0d4b52d4ddddf5fcf4b9948c9434053e68f4a`. The primary checkout remains on
that main revision; this trial was not merged or pushed. Prior local work and
the earlier ledger entry remain preserved.

| Destination | Identity | Verified state |
| --- | --- | --- |
| Google Play internal | 4.1.11 / 2026100403 | Available to internal testers; released 5 October at 00:02 AEDT |
| Internal TestFlight | 4.1.11 / 2610.4.3 | Testing; Internal group with 3 testers; compliance complete and testing notes persisted |
| Steam public-beta | 25709745 | Active across Windows/Linux/macOS; downloaded packages match uploaded files |

- Includes the supplied 1–42× direct Offline Time slider trial, separately
  stacked Double Time, and visible capacity-upgrade cost/affordability/max state.
  The foreground Tinker integration test passes; existing hold-release and
  focus-loss behavior remains intact. Tooltip-layout previews are not included.
- Matthew's screenshot showed a timestamp-enabled export failure. Electron and
  Android accepted only the fixed filename; both now accept the exact generated
  UTC filename format while rejecting unsafe names and oversized UTF-8 payloads.
  The timestamp checkbox now belongs only in Export Save. Narrow dialog rules
  now apply to the portalled dialog instead of the Settings container.
- Native iOS Save File uses a copy-export document picker to choose a Files
  destination. Save text and `.idsw` extension are preserved; success waits for
  picker completion, cancellation leaves the dialog usable, and temporary files
  are removed. Copy String remains available. Mobile Apple web browsers retain
  the clipboard route.
- Clean local release gate: 200 shared suites / 2,125 tests, lint, localization,
  web/native builds, Electron boundary, Capacitor sync and signed AAB. Native
  units: 13 Swift and 17 Android tests passed. The corrected iOS archive and
  simulator host compiled locally; no merged-main GitHub native run is claimed.
- Android AAB: isolated checkout `output/local-release/2026100403/android/idle-dyson-swarm-2026100403.aab`,
  20,159,867 bytes; SHA-256
  `59b9332316710e8114d4994b0d73881400d1d975292d983bbaec3d1e93c33b6b`.
  Source-bound manifest verified. Internal notes saved in all eight languages.
  Play's absent deobfuscation/native-symbol warnings were non-blocking.
- iOS: archive `/tmp/ids-offline-release-2026100403/ios/IDS-2026100403.xcarchive`,
  bundle `com.blindsidedgames.idledysonswarm`, minimum iOS 16.0; all 295 public
  asset files match the synchronized mobile build and simulator bundle. Upload
  used `testFlightInternalTestingOnly=true`. App Store Connect confirms Testing,
  Internal group/3 testers, and the saved testing notes after refresh.
- Export UI verified in disposable Chromium at desktop and 360px/130% size in
  English and German; timestamped browser download bytes matched the captured
  text. On a fresh iPhone 17 Pro / iOS 26.4 simulator, native Files cancellation
  produced no success/error feedback and cleaned staging; a subsequent save to
  On My iPhone preserved all 8,368 captured bytes and the timestamped filename,
  displayed success, and cleaned staging. Physical iPhone/iPad, Android document
  picker, and Windows/Linux interaction were not reverified.
- Steam manifests: Windows `2707393466804897265`, Linux
  `2821427975846619929`, macOS `5517216669830568468`. All 76 Windows, 75 Linux
  and 265 macOS regular downloaded package files matched. Corrected Mac package
  startup passed with disposable state and mock Keychain; Steam client commerce
  and overlay were not tested. Default branch remains 25569496.
- Superseded 0402 was uploaded before Matthew's correction: its Android draft
  was discarded without publishing; Apple 2610.4.2 remains Missing Compliance
  and was not made available to testers. Its build identity was not reused.
- Logs, store evidence and exact-byte comparisons: `/tmp/ids-offline-release-2026100403/`.
  Save regression/visual evidence: `/tmp/ids-offline-release-2026100402/`.
  Clean isolated checkout: `/private/tmp/ids-offline-internal-2026100402/`.
  No production, App Review, Steam default, website or community-message release.

## 2026100404 — complete main integration and skill-only tooltips

5 October 2026 (AEDT, UTC+11; release identity uses 4 October UTC).
All intended changes were squash-merged through
[PR #220](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/220) **before
building**. The primary checkout was clean and fast-forwarded to the same
remote-main candidate. The clean isolated build checkout was detached at exact
`fed35195b2545e7d57aa37d243dfd69f9e101b78`; its tree exactly matched the reviewed
integration head `3b06eb6d0b06fdd5571a3de1da6d870bc01a8b3d`.

| Destination | Identity | Verified state |
| --- | --- | --- |
| Google Play Internal testing | `2026100404` / `4.1.11` | **Available to internal testers**, released 5 October 00:41 AEDT |
| Internal TestFlight | `2610.4.4` / `4.1.11` | **Testing**, assigned to the existing Internal group with **3 testers** |
| Steam `public-beta` | `25710148` | Active; Windows, Linux and universal macOS depots downloaded and byte-verified |

This candidate includes the previously approved 1–42× Offline Time slider trial,
capacity presentation, timestamped exports and native file-save fixes. It also
applies the approved cleaner tooltips to production: bold title, ordinary-weight
technical effect, smaller Scientific Planets formula, actual SP icon/cost and
matching flat-white augment icon/count. Counts include the complete potential
subtree before fracture, with zero badges omitted. Fractured and Discovery
descriptions retain their actual effects. Generic delegated button/link tooltips
and native HTML `title` tooltips were removed throughout gameplay; accessible
names, full-precision labels, speedrun legends, visible facts and dialogs remain.
The 4.1.11 patch notes and shared UI style guide reflect this scope.

Verification:

- Required PR shared CI and merged-main shared CI passed. The canonical local
  `release:local -- --release-id 2026100404` gate passed **201 suites / 2,131
  tests**, lint, all-locale extraction/validation/compilation, production and
  native builds, Electron process checks, Capacitor synchronization and signed
  Android bundling. Data compatibility check passed before integration.
- [Final native candidate verification](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/37205977848)
  passed unsigned Android assembly and iOS simulator compilation against the
  exact merged SHA. The included native save changes retain their prior **13
  Swift / 17 Android** unit and actual iOS simulator Save/Cancel evidence above.
- Chrome QA used disposable profiles and `--use-mock-keychain`. Approved
  reference Library `libfile_bf1cd7a73eac81919e8ca167afeb81b1` version 2 was
  materialized and inspected. Actual production tooltips were inspected at
  desktop, 150% interface size and **360px / 130% game text** in English/German;
  no clipping, overflow or header collision occurred. All **16 unlocked routes**
  were audited for native title absence and non-tree accessible controls without
  hover bubbles. Simulated mobile touch opened actual skill details with no
  hover tooltip. Physical mobile devices and Windows/Linux interaction were not
  reverified in this tooltip iteration.
- Android AAB: **20,161,468 bytes**, SHA-256
  `60d1da4b2f4e67193706c9a62dfce2b397d4e80010ab7951b272ff7aa26fd798`;
  its manifest binds the artifact to the candidate SHA. All eight Play release
  note languages were saved. The usual nonblocking deobfuscation/native-symbol
  diagnostics warnings were inspected.
- iOS archive identity was `com.blindsidedgames.idledysonswarm`, `4.1.11`,
  `2610.04.04`, minimum iOS 16.0. All **295 public asset files** matched the
  synchronized Capacitor assets. Xcode upload used
  `testFlightInternalTestingOnly=true`. Export compliance was completed; What to Test persisted after refresh; the build lists the Internal group with 3 testers and the overview shows **Testing**.
- All three Steam ASAR manifests name the candidate SHA and Steam provider.
  Fresh authenticated downloads matched **76 Windows / 75 Linux / 265 macOS**
  files, with client manifests recording build `25710148` and `public-beta`.
  Packaged macOS smoke passed with isolated state; no running Steam client was
  available, so commerce/overlay behavior was not reverified. Default `public`
  remains `25569496`.

Evidence, upload logs, source-bound artifact manifest, store screenshots and
Steam download comparison are in `/tmp/ids-internal-release-2026100404/`;
tooltip screenshots and browser evidence are in `/tmp/ids-tooltip-integration/qa/`.
The prior unrelated skill/augment work remains preserved in its named stash and
backup. No production rollout, App Review submission, Steam default promotion,
website deployment or community message was performed.

## 2026100601 — pre-Reality checkpoint and Steam beta

6 October 2026 UTC (7 October AEDT). Product source is clean merged main
`04ea41f6b87a15905a75a207dbeaf1153b2f78f0`, preserved remotely by the annotated
tag `checkpoint/ids-pre-reality-rework-20261006`. No additional ready PR was
open. Main includes [PR #224](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/224)
(Fracture catalog invalidation, Patient Hands residual credit and atomic
offline/import receipts) and [PR #225](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/225)
(hide completed Durability research and preserve focus), plus the previously
reviewed speed, offline-credit and Wiki credits changes.

| Destination | Identity | Verified state |
| --- | --- | --- |
| Steam `public-beta` | `25764326` / `4.1.11` / `2026100601` | Active; Windows, Linux and universal macOS packages downloaded and hash-verified |

- The clean isolated packaging commit
  `5ae05fc386387233d78b5c605307a8dd30e112c8` has the product SHA as its sole
  parent and changes only the four synchronized release metadata files. All
  three ASAR manifests record that preparation SHA, Steam distribution,
  marketing version `4.1.11` and build version `2026100601`. This documentation
  follow-up does not change the released product source.
- Local verification passed **205 suites / 2,201 tests**, lint, generated-data
  compatibility, all localization extraction/validation/compilation,
  production/native-relative builds and the Electron process boundary.
  [Merged-main shared CI](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/37444902874)
  and [exact-source native candidate CI](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/37543194797)
  passed. The latter compiled unsigned Android debug and iOS simulator hosts;
  neither target was uploaded in this Steam-only release.
- Each ASAR's **293 renderer files** match the reviewed native build. Fresh
  authenticated beta downloads match **76 Windows / 76 Linux / 261 macOS**
  regular package files. Their client manifests record build `25764326` and
  `public-beta`. Depot manifests are Windows `6274378177269433804`, Linux
  `2917408467620863384` and macOS `2669826776444626391`.
  Steam default `public` remains `25569496`.
- Extracted, unchanged Steam host/renderer code passed actual macOS window-close
  checkpoint/quit and minimize/restore readiness checks. Before each diagnostic
  launch, fresh disposable roots and mock Keychain were configured, real
  Application Support reads were denied and Steam SDK loading was blocked
  before native account initialization. An initial generic-desktop close check
  timed out because generic macOS desktop mode intentionally stays running;
  the corrected Steam-mode close check passed. No product fix was needed.
  Steam account services, commerce/overlay and interactive Windows/Linux play
  were not reverified; Matthew's beta play test remains the next step.
- All **six existing stashes**, five dirty worktrees and the registered branch
  history were preserved. No stash was applied/dropped, worktree pruned or
  existing branch deleted. Reality implementation has not started; Androids
  remain parked and the Black Hole Capped label remains an unimplemented proposal.
- Evidence, checkpoint inventory, package SHA-256 manifests, diagnostic logs,
  upload receipt and downloaded depot manifests are retained on the release Mac
  at `/Users/matthewrushworth/Documents/Codex/2026-10-05/task-8/evidence/pre-rework-20261006/`.
  No mobile upload, public/default promotion, website publication or announcement
  was performed for this candidate.
