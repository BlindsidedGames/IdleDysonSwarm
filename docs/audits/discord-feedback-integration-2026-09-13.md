# Discord feedback integration — 13 September 2026

Base: `62842fcd1ff9652b6afc35bbd62fe794ff7343b9`, including the already merged
responsive text (#194) and Android insets / Stored Time (#196) fixes.

## Included PR heads, in merge order

| PR | Head | Scope |
| --- | --- | --- |
| #195 | `e40e945a44683723fa66e1c2651416ae81138e93` | Terra / Avocados effective purchases |
| #197 | `838276a303d11698beae9b049cfa922f5ce62265` | Debug tab toggle and Save Reset |
| #198 | `46b2ffe15b71ddde60bfaed3e0d82cbd8d72f278` | Simulation purchase persistence, formulas and row layout |
| #199 | `1298682803b8f87a1d1f797514abafea0467c352` | Quantum purchases, holds and V2 recovery compatibility |
| #200 | `9508d7538cc63725f0f6a593e675243c63181d0f` | Single stacking Durability card |
| #201 | `8b613b3ec29235819cc5322cab38b2ebb36d20b2` | Speedrun statistics and 10-Overflow-Point Debug purchase |

## Integration review

- Retained both canonical purchase-preference imports in ReadyDysonSlice and
  removed both obsolete local quantity states.
- Retained both Simulation and Quantum current-only V2 compatibility paths,
  both purchase validators / Speedrun validation, and all recovery regressions.
- Kept main's macOS-scoped mock-keychain option.
- Preserved the approved backlog dispositions: B05/B10 removal, B07's intended
  Max behavior, B11 deferral and B06 Infinity estimator/flicker deferral.
- Localization catalogs merged and regenerated without changes.
- Kept Debug classification unchanged as Matthew requested. Unlocking tabs
  records Debug use; locking or disabling does not erase it. Updated the
  inherited Debug test's two outdated expectations to retain that evidence.
  The earlier proposed lock-tabs classification exception is not included.
- The earlier Quantum compatibility finding is fixed in the included #199 head:
  older V2 payloads need not contain the newer purchase preference. Five cases
  verify the recovered progression and every purchase mode through serialization.
  Existing future-version and strict-schema protection tests remain intact.

No additional blocking implementation defect was identified in the combined
source review. The production changes match the previously reviewed rehearsal
plus the approved Quantum recovery fix; the Debug exception was not applied.

## Validation

- All 1,677 existing tests passed across 161 files with `--maxWorkers=1`.
- Two additional integration tests passed in `feedbackIntegration.test.ts`:
  both preferences and Debug evidence survive Overflow plus portable reload;
  the explicit production Save Reset path clears the override and starts a fresh
  speedrun while retaining purchased Debug ownership.
- Web build, native-relative build, TypeScript, lint, generated data, complete
  localization extraction/compilation, first-Dyson parity, Electron syntax and
  `git diff --check` passed. Localization regeneration left no tracked changes.
- CI on the resulting PR runs the complete 1,679-test suite and repository gates.

This integration review does not claim new browser, Simulator or physical-device
acceptance. Existing per-PR visual evidence and limitations remain in their audit
documents, including native long-press and iOS scrolling coverage gaps.
