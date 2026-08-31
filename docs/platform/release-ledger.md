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
| Android | `/Users/matthewrushworth/.codex/worktrees/5c68/Idle Dyson Swarm/output/local-release/2026090101/android/idle-dyson-swarm-2026090101.aab` | 17,147,835 bytes | `37ecd58ee20aad659ed0c308991a9a73fad72b49d913f2883d823158164ceda0` |
| iOS archive bundle | `/Users/matthewrushworth/.codex/worktrees/5c68/Idle Dyson Swarm/output/local-release/2026090101/ios/App-2026090101.xcarchive` | directory | Companion zip below |
| iOS archive zip | `/Users/matthewrushworth/.codex/worktrees/5c68/Idle Dyson Swarm/output/local-release/2026090101/ios/App-2026090101.xcarchive.zip` | 18,701,495 bytes | `a27871f31330328ab165a65583275241a935da98e6858d4d6b1d38e4918428ec` |

The archived `App` executable SHA-256 is `51309cc256f70bfe4c71098beffd70acaf41e498931657ff308735ee242c7fa4`. Xcode Organizer also has the archive at `/Users/matthewrushworth/Library/Developer/Xcode/Archives/2026-09-01/App-2026090101.xcarchive`.

### Distribution state at handoff

| Platform | Store identity | Timestamp | Verified state |
| --- | --- | --- | --- |
| Android | `4.1.5` (`2026090101`) | 1 Sep 2026 09:29 AEST | Google Play Internal testing: **Available to internal testers**. |
| iOS | `4.1.5` (`2609.01.01`) | 1 Sep 2026 09:34 AEST | Xcode Organizer: **Uploaded to Apple**. App Store Connect Build Uploads: **Processing**. |
| Website | Frozen source unchanged | — | **Untouched**. |

Google Play emitted non-blocking warnings for a missing deobfuscation file and native debug symbols. Xcode reported the upload complete without an upload error. Apple processing and any later tester-group assignment remain separate follow-up states.
