# Bug-hunt fixes and facility balance — 24 September 2026

Implemented on discovery-prototype; no merge or deployment.

## Fixes

- Cloud serialization preserves the in-game Developer Options purchase and its enabled setting. Store entitlements remain excluded. Selecting an older stripped Cloud checkpoint retains a proven local earned unlock; manual sharing still excludes it.
- iOS app/project and Swift package minimums are 16. Xcode's resolved deployment target is 16.0. Capacitor reads the project target when regenerating package platform requirements. No older-iOS timeout polyfill was added.
- Discovery automatically completes Avotation's sixth (Research) secret when that step is reached, on unlocking Discovery, and on opening an existing save at that step. Earlier steps and the seventh-step reward remain unchanged.
- Purchases, achievement SP accounting and Developer SP recalculation use one complete base/augment registry. Recalculation excludes free Fractured skills and is idempotent.
- Negative Discovery-completion and Transcendence-Point adjustments subtract and clamp at zero.
- Promotion rotation keeps session history authoritative after a storage failure.

## Approved balance

| Facility | Initial Cash cost | Per-purchase growth | Base output interval |
|---|---:|---:|---:|
| Assembly Lines | 100 | 21% | 10 seconds |
| AI Managers | 5,000 | 22% | 1 minute |
| Servers | 5 million | 23% | 10 minutes |
| Data Centers | 300 million | 24% | 15 minutes |
| Planets | 1 billion | 25% | 1 hour |
| Matrioshka Brains | 10 billion | 25% | 2 hours |
| Birch Planets | 100 billion | 25% | 4 hours |
| Galactic Brains | 1 trillion | 25% | 8 hours |

Current balance overrides are authored in `src/game-data/facilityBalance.ts`; frozen Unity inputs remain untouched. Megastructure derivation validates and reads the catalog rather than duplicating its tuning values. Existing counts, unlocks and production modifiers are preserved.

The slower bases expose the existing two-decimal display's rounding to zero. Facility presentation now preserves three significant digits below 0.01, using scientific notation below 0.000001. Exact zero retains its existing display. No calculation changes accompany this formatting fix.

Corrected localized descriptions (Cash purchases do not consume structures):
- Matrioshka Brains: “Massive stellar computing structures that produce Planets.”
- Birch Planets: “Supermassive planetary shells that produce Matrioshka Brains.”
- Galactic Brains: “The ultimate mega-structure. Produces Birch Planets.”

## Evidence

- 1,851 tests passed across 180 files. Focused additions cover Cloud startup/purchase durability and old uploads, manual sharing exclusion, signed adjustments, SP recalculation, augments, Avotation ordering/reload/reward, rotation storage failures, current cash curves/output rates, and tiny-value localized presentation.
- Type check, lint, data validation, localization extraction/compilation/checks, canonical fixture parity, web build and native-relative Vite build passed. Existing bundle-size advisory remains.
- Xcode `-showBuildSettings` resolves `IPHONEOS_DEPLOYMENT_TARGET = 16.0`.
- Hands-on isolated browser: imported the previously stuck secret fixture and observed 6/7; subtracted a TP (9 → 8); added then subtracted Discovery completions without clearing them; recalculated SP successfully.
- Hands-on facility fixture: confirmed unmodified mega output intervals of 120/240/480 minutes and next prices of 12.5B/125B/1.25T after one paid purchase. Bought a second Matrioshka: Cash decreased by 12.5B, manual count rose to two, next price became 15.625B and production doubled.
- Visually inspected cards and production details at 360 pixels. Small output now reads 0.000139 base and approximately 0.00028/s for two Matrioshkas instead of 0.00. New descriptions fit.
- Reviewed the changed code for duplicate pricing authority, Cloud ownership separation, ordered secret completion, and unchanged reward boundaries. No known defect in these changes remains.

## Limits

No native iOS/Android/Steam interaction, real Steam achievement unlock, or real cross-device Cloud session was exercised for this patch. Cloud tests exercise production serialization/startup with controlled storage adapters. New balance is implemented as approved, not certified against a full playthrough to Transcendence. The previous base rates are reduced by 7,200×/144×/2,880× respectively, before unchanged modifiers; long-term progression needs playtesting.

## Full branch follow-up review

Reviewed the complete `discovery-prototype` delta against freshly fetched `origin/main`, including uncommitted fixes and new files: Discovery calculations and effect conversions, application admission/commit boundaries, reset retention, legacy migration authority, Cloud/export ownership, UI projections and phase-specific descriptions, facility tuning, native version configuration, localization and regression coverage.

- Added four concise, localized 4.1.10 notes covering facility/mega balancing, the sixth Avotation secret, the bug fixes and minimum iOS 16.
- Found and fixed one presentation omission: preset import previews still showed worker/scientist allocation after Discovery unlocked. They now use the same phase-aware summary as the preset list; the stored preset stays compatible.
- Re-ran the full suite: 1,850 passed; the only failure was the existing patch-note test expecting the previous six bullets. Updated its expected content, then both affected Wiki and skill-assignment test files passed (5 tests). No failing test remains from that run.
- Build/type check, lint, data check, localization extraction/validation/compilation, fixture parity and whitespace checks passed. Existing bundle-size advisory remains.
- In an isolated localhost preview, purchased Discovery through its confirmation, opened preset management, exported a disposable preset and previewed its import. Both preset summaries showed only the skill count, without allocation. Inspected the rendered dialog and the ten current 4.1.10 patch-note bullets.
- No further confirmed code defect identified in this review. This is a primary-agent review, not an additional independent-agent or native-device QA pass. The native/Cloud/playthrough limits above still apply. No merge or deployment performed.
