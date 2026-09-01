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
