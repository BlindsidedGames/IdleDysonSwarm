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

## 2026102801 — standalone Classic 4.1.11 internal release

28 October 2026 (AEDT, UTC+11). Authorized targets were Google Play Internal,
Internal TestFlight and Steam `public-beta`. Product source is frozen at
`ad3bebc6ada1ab8c150ce54c526688f390ac0476` on merged main. Restoration PR
[#239](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/239) restored the
public 4.1.10 engine with approved base-game improvements and the new Stored Time
system. PR [#240](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/240) added
the missing Xcode target entries for the existing NativeSaveExport helper before
any upload. The superseded `c9687ed3` candidate was not uploaded.

The civilization rework remains preserved remotely on
`Matt/shelved-civilization-rework-20261028` at
`2458f4e84e7d74d9e71885f6b371def1c60d2df4`. This release has no mode switch or
automatic Modern conversion. Classic keeps IDSWEB1/schema 20, the released
`web-runtime-v1` native roots and Classic Steam `current.idsw` Cloud identity.

### Validation and artifacts

- Clean isolated Mac checkout; pinned Node 24.11.1. Canonical
  `npm run release:local -- --release-id 2026102801` passed: the approved three-file
  save-safety suite (16 cases), lint, catalogs, Web/native builds, Electron boundary,
  signed Android packaging and iOS sync. The archived gameplay suite was not run.
- Merged-source shared verification passed:
  [40607680634](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/40607680634).
  Final Android/iOS native verification passed:
  [40607688381](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/40607688381).
- Artifact/evidence root: `/Users/matthewrushworth/Builds/ids-release-2026102801/`.
  `source.txt`, `android/manifest.json`, `android/SHA256SUMS`, upload logs, package
  provenance, screenshots and full depot/download hashes are retained there.
- Android AAB: `android/idle-dyson-swarm-2026102801.aab`, 20,168,315 bytes,
  SHA-256 `058904a6b899e893b293470cdaecf85c865d664dc843c78c88d555f44382e695`. Established Play upload certificate fingerprint verified.
- iOS archive: `ios/IDS-2026102801.xcarchive`, bundle
  `com.blindsidedgames.idledysonswarm`, 4.1.11 / 2610.28.01. All 281 renderer assets
  matched the Android artifact. Archived App executable SHA-256
  `eea579559210149d7def1804a16824fd185ff45bbda927b53cbb93bb9f425e0f`.
  Xcode Internal-Only upload succeeded at 11:22 AEDT; this archive hash is not an
  uploaded IPA hash because Apple distribution resigning occurs during upload.
- Windows/Linux/universal macOS Steam ASARs all embed source `ad3bebc6`, version
  4.1.11/build 2026102801 and Steam distribution; standalone renderer and canonical
  Classic storage root verified. ASAR SHA-256
  `fc89c29d9fc75d6696fde810f66c75fc6847d538257782e4e6b356df97ad0018`.
  Native addon source and SDK lock were unchanged from the previously verified
  build; reused addons and matching official SDK libraries have recorded hashes.

### Verified distribution state

| Target | Identity | Final observed state |
| --- | --- | --- |
| Google Play Internal | 4.1.11 / 2026102801, release 125 | **Available to internal testers**, released 28 October 11:25 AEDT. Eight localized note blocks accepted. |
| Internal TestFlight | 4.1.11 / 2610.28.1 (uploaded 2610.28.01) | **Testing**, existing **Internal** group, 3 tester invites. Compliance and focused testing notes saved. |
| Steam `public-beta` | Build **26257907** | **Active**. Fresh Windows/Linux/macOS downloads match all 76/75/265 uploaded package files. |

Apple tester availability was verified in the coordinating Main IDS thread's
authenticated App Store Connect browser. [Candidate build](https://appstoreconnect.apple.com/teams/e12982c4-2977-4eeb-be29-6d750fd48ca7/apps/1631060225/testflight/ios/6f86c59e-016e-4797-ae48-a6145a20dc0e).
The Apple build UUID is `6f86c59e-016e-4797-ae48-a6145a20dc0e`; the coordinating
Windows screenshot is `output/testflight-4.1.11-internal.jpg`.
Steam default/public remained **25569496** before and after beta activation.
Google production was 4.1.10 / 2026092801 and was not changed. No App Review,
production/default promotion, website deployment, Cloud-rule or achievement
publication, or community message was performed by this release.

### Affected native checks and remaining limits

A new disposable iPhone 16 Pro / iOS 26.4 simulator loaded the checked-in Classic
mature fixture. The new Offline Time slider reached 42x with a 41s/second debit
and active countdown; it was restored to 1x / Off. Timestamped Save File opened
the native document picker; cancellation returned to a usable export dialog.
Background/terminate/reopen retained progressed Classic state. The canonical
checkpoint remained IDSWEB1/schema 20. A separate synthetic Modern file remained
byte-identical before and after restart; no player save was used or replaced.
Actual export destination file writing/readback was not performed.

Packaged macOS startup checks passed on arm64 and Rosetta x64 with disposable
data and mock Keychain. The SDK fell back when the package was not launched by
Steam, so these are packaging/startup checks, not live commerce/overlay or Cloud
interaction evidence. Physical Android/iPhone interaction, real cross-device
Steam Cloud, every locale/scale and the full gameplay acceptance matrix remain
unverified. Existing Google deobfuscation/native-symbol and Web chunk warnings
were non-blocking. This documentation follow-up does not change product source.

## 2026102802 — Infinity and first Catalyst 4.1.11 internal release

28 October 2026 (AEDT, UTC+11). Product source is frozen at merged main
`0630be7ca56b5a21169ac713869d25074103cc4a`, from PR
[#243](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/243). This iteration
changes Infinity rewards, IP/time Auto Infinity targets and rate guidance,
the Quantum Time bonus upgrade and comparison table, the once-only Beginnings
Catalyst reward including existing-save credit, and Steam achievement progress
caps. Marketing version remains 4.1.11.

### Validation and artifacts

- A clean isolated Mac checkout with Node 24.11.1 passed
  `npm run release:local -- --release-id 2026102802`: the approved three-file
  save-safety suite (16 cases), lint, catalogs, Web/native builds, Electron
  boundary, signed Android packaging and iOS sync. No archived suite was run.
- Shared verification on the merged source passed:
  [40640717479](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/40640717479).
  Final Android/iOS native verification passed before distribution:
  [40640741920](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/40640741920).
- Artifact/evidence root: `/Users/matthewrushworth/Builds/ids-release-2026102802/`.
  Source identity, manifests, upload/build logs, screenshots, native provenance
  and full Steam package/download hashes are retained there.
- Android AAB: `android/idle-dyson-swarm-2026102802.aab`, 20,185,047 bytes;
  SHA-256 `1da98ef478fda255c41c2cd4cef74a467ffdec2bb3f833b9a64fe0acdea602ad`.
  The established Play upload certificate fingerprint was verified.
- iOS archive: `ios/IDS-2026102802.xcarchive`, bundle
  `com.blindsidedgames.idledysonswarm`, 4.1.11 / 2610.28.02. All 296 renderer
  assets match Android. Archived App executable SHA-256
  `eefc19e9bbdd520f6060537c53cf65aa8d6932648e5d106d27e709b8fd89ece8`.
  Internal-only upload succeeded at 17:01:05 AEDT. The archive binary hash is not
  an uploaded IPA hash; Apple distribution resigning occurs during upload.
- Windows/Linux/universal macOS Steam packages embed the frozen source,
  4.1.11 / 2026102802 and Steam distribution. Their ASAR SHA-256 is
  `4ef7e3c8087099a860220438896b70e7d6c258203bc4d569f1a85435800c86f2`.
  Native addon source and SDK lock are unchanged from the preceding release;
  reused addon and official SDK library hashes were verified and recorded.

### Verified distribution state

| Target | Identity | Final observed state |
| --- | --- | --- |
| Google Play Internal | 4.1.11 / 2026102802, release 126 | **Available to internal testers**, released 28 October 17:02 AEDT. All eight localized note blocks accepted. |
| Internal TestFlight | 4.1.11 / 2610.28.2 (uploaded 2610.28.02) | **Testing**, existing **Internal** group, 3 invites and 90-day expiry. Compliance and focused testing notes saved. |
| Steam `public-beta` | Build **26263222** | **Active**. Fresh Windows/Linux/macOS downloads identify this BuildID and match all 76/75/265 uploaded package files. |

Apple availability was verified in the coordinating Main IDS thread's
authenticated App Store Connect browser. The [candidate build](https://appstoreconnect.apple.com/teams/e12982c4-2977-4eeb-be29-6d750fd48ca7/apps/1631060225/testflight/ios/ca285a45-51ad-44b4-808d-d5f5ae303f81)
has UUID `ca285a45-51ad-44b4-808d-d5f5ae303f81`; the coordinating Windows
screenshot is `output/internal-release-2026102802/testflight-testing.jpg`.

Steam default/public remains **25569496**. Google production remains
4.1.10 / 2026092801. No production/default promotion, App Review submission,
website deployment, Steam Cloud-rule or achievement-definition publication,
or community message was performed by this release.

### Affected native checks and remaining limits

The disposable iPhone 16 Pro / iOS 26.4 simulator was updated with the new app
while retaining its previous synthetic Classic save. It displayed the first
Catalyst notice and persisted exactly one Catalyst with the once-only reward
marker. A separate synthetic Modern file remained byte-identical. A derived
late-game fixture exercised the native IP/time Auto Infinity selector,
purchased Time bonus level 1 for 1,000 Quantum Shards, and opened the live
current-versus-next multiplier table. Terminate/relaunch retained the level,
1,000 Shards spent and single Catalyst, without repeating the first-Catalyst
notice. The simulator is shut down with its synthetic state retained.

Packaged macOS startup checks passed on arm64 and Rosetta x64 using disposable
profiles and mock Keychain. Steam SDK fallback outside a Steam launch means
these checks do not establish live achievements, commerce, overlay or Cloud
behavior. Physical Android/iPhone interaction, the native timed-reset plus
Stored Time exact-balance matrix, every locale/scale, and real cross-device
Steam Cloud remain unverified. Google debug-symbol/deobfuscation and Web chunk
warnings were non-blocking. This record changes documentation only.

## 2026103001 — Beginnings achievement and No Science fixes, 4.1.11

30 October 2026 (AEDT, UTC+11). Product source is frozen at
`c7de4af5595a7485614a30a425ae3a50a12417e7` on `main`. Beginnings now counts
for Challenge Accepted through the shared evaluator used by iOS, Android and
Steam. Fractured Shoulders of Precursors no longer suppresses Cash production
in No Science before Discovery. Provider achievement IDs are unchanged.

### Validation and artifacts

- Windows production build/TypeScript, lint, generated data, localization,
  Electron boundary syntax and the approved save-safety suite (three files,
  16 cases) passed. The clean Mac canonical release gate also passed, including
  signed Android packaging and iOS synchronization. No archived suite was run.
- Shared CI [40958952788](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/40958952788)
  and native CI [40958956043](https://github.com/BlindsidedGames/IdleDysonSwarm/actions/runs/40958956043)
  passed before uploads. An earlier candidate was replaced before packaging
  to synchronize its three generated native version files.
- Artifact/evidence root: `/Users/matthewrushworth/Builds/ids-release-2026103001/`.
  `RELEASE.md` and `release-summary.json` record manifests, signing verification,
  upload logs, screenshots and package comparisons. Windows evidence is under
  `output/release-2026103001/`, `output/beginnings-achievement-2026-10-30/`
  and `output/no-science-precursors-2026-10-30/`.
- Signed Android artifact: `android/idle-dyson-swarm-2026103001.aab`,
  20,186,083 bytes; SHA-256
  `54da78cda9cf4f3509c2988a8957e1e946753afe2c9b8ae98c813f472742929c`.
  The established upload certificate fingerprint was verified.
- Apple archive: `ios/IDS-2026103001.xcarchive`, 4.1.11 / `2610.30.01`,
  normalized by the console to `2610.30.1`. Archived App executable SHA-256
  `3d4e9dcf3b3a9ada3350b05a264b3a82da02c361f3787d42a0109c7a391260c3`.
  All 296 renderer assets match Android. Ordinary App Store Connect upload
  succeeded at 08:39:44 AEDT; the internal-only export flag was omitted so the
  same build could be tested internally and submitted for App Review.
  This executable hash is not an uploaded IPA hash.
- All three Steam packages embed the frozen source and release identity.
  Their shared ASAR SHA-256 is
  `f96a63b4c5620eb47856a3700fa28e0a0ae5c661a7b8fc2299769af588dd45bd`.
  Fresh beta downloads match all Windows/Linux/macOS package files
  (76/75/265 respectively), with no mismatches.

### Internal availability, verified before public actions

| Target | Identity | Verified state |
| --- | --- | --- |
| Google Play Internal | 4.1.11 / 2026103001, release 127 | Available to internal testers, released 08:41 AEDT. Eight localized note blocks accepted. |
| Internal TestFlight | 4.1.11 / 2610.30.1 | Testing in the existing Internal group with three testers and 90-day expiry. Compliance and focused test notes saved. |
| Steam `public-beta` | Build 26308657 | Active; fresh downloads verified for Windows, Linux and macOS. |

Apple build UUID: `8c1f1030-2d8f-4406-8900-a20892318ae0`.
The group's Testing state is captured in
`output/release-2026103001/testflight-internal-testing.txt` and `.jpg`.
The existing group assigned the build automatically after compliance completed.

Steam depot manifests for build 26308657:

- Windows 4348571: `2620559273283405656`.
- Linux 4348572: `1915318104354881052`.
- macOS 4348573: `1824204619860140402`.

### Public distribution

| Target | Identity | Observed state |
| --- | --- | --- |
| Google Play production | 4.1.11 / 2026103001, release 86 | Submitted; In review / Changes in review. Rollout explicitly set to 100%, with Start full rollout saved. Managed publishing off for automatic publication after approval. |
| Apple App Store | 4.1.11 / 2610.30.1 | Waiting for Review; one version/build submitted. Automatic release after approval, immediate release to all users and no phased release. |
| Steam `default` | Build 26308657 | Live after Steam Mobile confirmation. App Admin shows default and public-beta on the same verified build. Previous public build was 25569496. |

Apple submission UUID: `f12b5173-f750-46dc-a685-a7fd94c57bd6`.
All eight App Store localizations were saved and read back against the audited
notes. Existing ratings were retained. Google quick checks were still running
when submission was accepted; neither mobile build is described as approved or
publicly available. Before disabling managed publishing, the Google pending and
ready lists were verified empty. Only the production build's full rollout was
submitted; advertising, store and data-safety changes were not submitted.

The Steam public request followed verification of all three internal targets.
Steam Mobile confirmation completed and the public branch readback was verified
before reporting it live. Steam history records public activation at 08:50 AEDT.
An independent SteamCMD query confirms default and beta both report 26308657;
all three public depot manifests match the already verified beta downloads.
Website publication and community announcements were not performed.
Achievement definitions were already live on all providers and not republished.

### Actual game checks and limits

The isolated running game held Beginnings at 9/10 goals without the challenge
achievement. In a synthetic final-goal save, changing the actual worker slider
from 50% to 100% increased galaxies from 75 to 150, completed Beginnings,
awarded one Catalyst and published the existing Challenge Accepted neutral ID.
Export/import and reload retained completion, one Catalyst and the evidence.
The temporary native host adapter captured publication without unlocking a real
provider account; no test-only production API was added.

A disposable iOS simulator updated an existing synthetic save that had completed
Beginnings without the achievement. The new app persisted the missing evidence,
retained one Catalyst and Time bonus level 1, and left the separate Modern file
byte-identical. Packaged macOS startup checks passed on arm64 and Rosetta x64
with isolated profiles and mock Keychain.

The No Science in-game matrix covered fractured/unfractured Precursors before
and after Discovery, multiple derivations, a purchase and reload, entry, abandon
and completion. Cash production recovered while Science stayed disabled.

Fresh authenticated provider SDK unlocks, physical-device checks and real
cross-device Cloud remain unverified. These limits do not change the verified
shared game event, saved evidence, native update and mapping results. This
record changes documentation only; product source stays frozen.

## 2026103101 — internal 4.1.12

Release performed on 1 November 2026 (AEDT, UTC+11); the release identity uses
31 October UTC. This release targets internal testing only.

### Source and scope

- Frozen product source, merged and pushed to `main`:
  `353c2748e8643e16e4bbcd91ac124384e624a77e`.
- Marketing version: `4.1.12`. Android version code: `2026103101`.
  Apple build: `2610.31.01`, displayed by App Store Connect as `2610.31.1`.
- Reality Skill Points remain available during Quantum challenges, including
  points from Reality upgrades purchased during a challenge. Existing active
  challenge saves recover withheld points once when loaded. Wiki patch notes
  and translated player-facing copy are included in the frozen source.
- Active Mac QA source changes were compared with the final source: all ten
  source files match byte-for-byte. The original QA patch and native evidence
  remain preserved separately; historical shelved branches were not revived.

### Verified internal availability

| Target | Identity | Verified state |
| --- | --- | --- |
| Google Play Internal | 4.1.12 / 2026103101, release 128 | Available to internal testers; console release time 1 Nov 08:24 AEDT. Eight localized release-note entries saved. |
| Internal TestFlight | 4.1.12 / 2610.31.1 | Testing in the existing Internal group with three testers; 90-day expiry. Export compliance and focused What to Test notes saved. |
| Steam `public-beta` | Build 26351857 | Active for Windows, Linux and macOS; fresh authenticated downloads match the uploaded packages. |

Apple build UUID: `911bb095-7c43-46db-b7f4-0e9e0d8c8f09`.
The Internal group's Builds page explicitly shows Testing; the general build
list's Ready to Submit label was not used as evidence of tester availability.
No external TestFlight group or App Review submission was made.

Google production remains `2026103001`. Steam `default` remains `26308657`.
App Store production and the website were not changed. Google retained two
non-blocking warnings for absent R8 deobfuscation and native debug symbols.

### Validation and artifacts

- The clean frozen-source command
  `npm run release:local -- --release-id 2026103101` passed: approved save-safety
  suite (three files, 16 cases), lint, localization, TypeScript/production and
  native builds, Electron boundary checks, signed Android packaging and iOS
  synchronization. No archived or additional automated gameplay suite was run.
- The signed iOS archive and upload succeeded. All 298 archived renderer files
  match the final Capacitor payload. Archived App executable SHA-256:
  `2a918ab1b0e7d93c479e9b99af2ed4f3c0b3878e1eeb5432847515530fdd6a2e`.
  This is an executable hash, not an uploaded IPA hash.
- Android AAB: `android/idle-dyson-swarm-2026103101.aab`, 20,186,704 bytes;
  SHA-256 `745fd309e6a77f8b3d65629127ef27f4d3d5673e09b237690843c40e4662b0bc`.
  Windows independently checked the transferred bytes before its Google upload.
- Steam packages embed the full frozen commit, version 4.1.12 and Steam
  distribution identity. Six native runtime files were reused only after
  verifying unchanged source/SDK/build inputs and prior binary provenance.
  Fresh beta downloads match all 76 Windows, 75 Linux and 265 macOS files,
  with no missing files or hash mismatches.
- Artifact and evidence root:
  `/Users/matthewrushworth/Builds/ids-release-2026103101/`.
  `release-summary.json`, `steam-download-verification.json`,
  `steam-native-provenance.json`, `ios-archive-verification.json`, upload logs,
  package hashes and `ios-internal-testing.txt` / `.png` retain the evidence.
  Google's availability screenshot is under the Windows checkout at
  `output/local-release/2026103101/google-internal-available.png`.
- Two generated Capacitor dependency paths changed during synchronization;
  their resolved paths were proven equivalent, their diff was archived, and
  only those generated edits were restored after packaging. Product source
  stayed frozen.

### Actual game checks and limits

Focused running iOS Simulator checks covered challenge entry, purchases,
reload, abandonment, Infinity resets, one-time legacy point restoration and
Avotation retention using synthetic saves. The final native build's Wiki
shows version 4.1.12 and both new bullets above the unchanged 4.1.11 section,
readably at portrait phone width. A valid synthetic Avotation/Reality save
retained six points after the update and reload. Screenshots and exported
checkpoints are preserved; the isolated simulator was shut down afterward.

Physical devices, Android and Steam gameplay, fresh provider achievement
unlocks, real cross-device Cloud, other UI scales and long locales were not
rechecked for this release. Download integrity and native compilation do not
stand in for those checks. This release record is documentation only; it does
not change the frozen product source.
