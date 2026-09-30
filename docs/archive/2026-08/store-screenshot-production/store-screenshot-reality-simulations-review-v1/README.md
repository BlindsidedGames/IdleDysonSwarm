# Reality and Simulations screenshot review

This is a non-destructive comparison against the current Statistics card in `store-screenshot-package-v1`. It does not replace that package and nothing has been uploaded.

## Recommendation

Use **Simulations — “REBUILD CIVILIZATION”** as the Statistics replacement.

Simulations tells a clearer gameplay story: visible resources advance from Hunters and Gatherers through Community, Housing, Villages, Workers, Cities, and the Information Era. It is colorful, immediately understandable, distinct from Bots/Research/Skills, and remains strong in both the dense phone ladder and genuine two-column tablet layout.

Reality is an interesting runner-up. “DECODE THE ANOMALY” adds mystery and shows the real upgrade structure, but it visually overlaps the progression-card language already used by Skills and Research. Its wide layout is also less dramatic than Simulations. The capture deliberately scrolls the incomplete artifact off-screen because the production UI truthfully labels its timer `Undefined` until the full late Speed chain is purchased; no value was hidden or repainted inside the captured region.

Statistics remains accurate and readable, but it is the least playful of the three and repeats numerical proof already present throughout the other seven screenshots.

## Files

- `comparison-iphone.png`
- `comparison-ipad.png`
- `comparison-android-phone.png`
- `comparison-android-tablet.png`
- Individual current/candidate cards under `iphone/`, `ipad/`, `android-phone/`, and `android-tablet/`
- Genuine captures and per-capture rendered evidence under `raw/<profile>/`
- Derived saves and transaction evidence under `fixtures/`
- `manifest.json` and `qa-report.json`

## Truthful state derivation

Both candidates start from the certified `mature-simulations` progression fixture, SHA-256 `775aa66227cd0639c3efb968856264fe99d4bd0493667ae328ea8f58663a18f0`.

Reality (`mature-reality-review`, SHA recorded in its evidence) applies five accepted canonical purchase transactions only: Translation I–III, Double Time, and automatic Worker conversion. The result has Designation 513, 312 Influence, automatic Influence generation, and the genuine next Translation/Speed purchase cards. It is validated, mapped back into the imported session, serialized with the production codec, re-imported, and validated again.

Simulations (`populated-simulations-review`, SHA recorded in its evidence) buys one additional Hunter and Gatherer through canonical transactions, then applies 24 one-hour canonical production advances and all resulting canonical automation conversions. No gameplay state field is directly assigned. The resulting reachable state includes 2 Hunters, 2 Gatherers, 75.7K Community, Housing, Villages, 523K Workers, and 1.12K Cities.

Every save is imported through the real Settings import UI. Capture evidence records fixture ID/hash, responsive viewport, route text, expanded sections, and whether any `Undefined` label intersects the visible viewport.

## Capture and composition

From the repository root, with a local Chromium executable available:

```sh
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
./node_modules/.bin/tsx /absolute/path/to/store-screenshot-reality-simulations-review-v1/derive-review-fixtures.ts
IDS_CHROMIUM_PATH=/absolute/path/to/Chromium \
  ./node_modules/.bin/tsx /absolute/path/to/store-screenshot-reality-simulations-review-v1/capture.ts
./node_modules/.bin/tsx /absolute/path/to/store-screenshot-reality-simulations-review-v1/compose.ts
./node_modules/.bin/tsx /absolute/path/to/store-screenshot-reality-simulations-review-v1/generate-manifest.ts
./node_modules/.bin/tsx /absolute/path/to/store-screenshot-reality-simulations-review-v1/qa.ts
```

Viewports are 430×932@3 for iPhone, 1024×768@2 for iPad landscape, 470×812@2 for Android phone, and 1280×640@1.5 for Android tablet. Final cards retain the approved package-v1 dimensions: 1320×2868, 2732×2048, 1080×1920, and 1920×1080 respectively.

The compositor preserves the approved language: full-width dedicated header above gameplay, no text overlay across the app, genuine separately captured responsive layouts, and a continuous frame whose screenshot clip uses the same rounded radius.

## QA

All candidates were inspected at original resolution. Automated QA verifies exact final dimensions, opaque output, visible-state evidence, and contact-sheet opacity. Check `qa-report.json` for the current result.

Observed capture checkout: commit `9577c5af2817ae573a3b5fdfd9aab69fcd033c4d` on `codex/skill-preset-independence`. The shared checkout already contained unrelated in-progress Skill Preset changes (recorded diff SHA-256 `98e836745f4feaeccf4f0ede86b3852af98b5fcf5734467c197f82200a789af2`). This review task did not modify, stage, or discard any repository file.
