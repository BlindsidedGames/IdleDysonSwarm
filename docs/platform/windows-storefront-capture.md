# Windows storefront capture and provenance

This runner retains the working September 2026 screenshot refresh procedure.
Use it with the intended frozen gameplay source and the approved August campaign
canvases. It supplements the workflow committed at
`bf5a23f62765a637c2ab48ac33badb878bc09fca`; it does not import that branch's gameplay.
It is a reproduction recipe for these eight scenes, not a generic screenshot API.
Recheck selectors, balance-dependent staging and platform behavior for another release.

## What the runner does

- Uses the repository Chromium harness and fresh disposable browser profiles.
- Imports saves through production Settings and exercises the production
  mobile-native application composition with `NativeHostBridgeApi.target = ios`.
  Persistence stays in a fresh in-memory map; paid entitlements are false and
  purchase services are unavailable. No personal save or account is accessed.
- Derives the requested intermediate Bots galaxy from the certified mid-swarm
  fixture, using canonical goal advancement and the production save codec.
  The recipe must produce exactly 30,000 panels / 1.5 surrounded stars.
- Captures the eight approved routes. Uses real zoom, scrolling, expansion and
  number-notation controls; it does not rewrite UI text, styles or images.
- Replaces only the archived inner gameplay rectangle in each supplied marketing
  canvas. The original frame, headline and background are retained exactly.
- Records viewport, browser environment, release metadata, fixture hash, source
  and tooling commits, visible UI evidence, exceptions and output hashes.
- Validates dimensions, sRGB/opacity, marketing pixel preservation and capture
  evidence; creates review sheets and a manifest. The separate audit reconstructs
  every final from its raw PNG and original canvas and compares decoded pixels.

The capture refuses an existing scene destination. Use a fresh output directory
for each revision, or select only uncaptured scenes when resuming a failed run.
Packaging and auditing require the complete sixteen-image set.

## Inputs and commands

Run from an isolated repository checkout with `npm ci` dependencies installed.
No new dependency is required: `tsx`, TypeScript and `sharp` are already locked.
Use the checked-in AGENTS instructions for the operating system. The shared
harness includes `--use-mock-keychain` on macOS and hides Windows child windows.

Materialize the approved original images using the current Library skill into
a consumer-local folder. It must contain `iphone69/01-...png` through `08-...png`
and the corresponding `ipad13` folder. The September archive is
`libfile_d8c96a52baf08191ae475abf844b831b`; images and ZIPs are not stored in Git.

The approved workflow archive must also exist locally. If it is absent from the
frozen checkout, extract only its docs from the recorded workflow commit with
`git archive` into an ignored output folder. Set the archive-root variable below
to the directory containing `store-screenshot-package-v1` and
`store-screenshot-reality-simulations-review-v1`.

Example PowerShell configuration for the submitted September build:

```powershell
$env:IDS_STORE_GAMEPLAY_COMMIT = '0dde63fbaad175362df49feeb981f85dc6af4a5e'
$env:IDS_STORE_WORKFLOW_COMMIT = 'bf5a23f62765a637c2ab48ac33badb878bc09fca'
$env:IDS_STORE_IOS_VERSION = '4.1.10'
$env:IDS_STORE_IOS_BUILD = '2609.29.1'
$env:IDS_STORE_ORIGINALS_ROOT = 'output/originals/extracted'
$env:IDS_STORE_ORIGINAL_LIBRARY_ID = 'libfile_d8c96a52baf08191ae475abf844b831b'
$env:IDS_STORE_WORKFLOW_ROOT = 'output/workflow/docs/archive/2026-08/store-screenshot-production'
$env:IDS_STORE_OUTPUT_ROOT = 'output/storefront-review-01'
$env:IDS_CHROMIUM_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node node_modules/vite/bin/vite.js build --mode native
node node_modules/tsx/dist/cli.mjs scripts/storefront/capture.ts
node scripts/storefront/package.mjs
node scripts/storefront/audit.mjs
```

Use verified native metadata for the intended package. No version/build value is
guessed by the runner. The source guard compares gameplay, host configuration,
dependencies and shared fixture/harness paths to the recorded gameplay commit,
allowing tooling/docs to be committed separately without changing gameplay.
Rebuild immediately before capture; the source guard does not independently
prove an existing bundle's source revision or compare it with a signed package.

Optional filters: `IDS_STORE_CAPTURE_SCENES='01,06'` and
`IDS_STORE_CAPTURE_PROFILES='iphone69'`. Clear them for a complete run. The default
build directory is `dist-native`; `IDS_STORE_BUILD_DIR` can select another frozen
native-mode build. Preview uses loopback port 4199 and refuses an occupied port.
The runner closes the page/profile and preview in `finally`, including failures.

## Manual acceptance and native limits

Inspect all sixteen finals and review sheets before using them. Automated checks
leave visual review pending; they never certify human inspection. Check headings,
all frame corners, route/content, readability, genuine viewport clipping, four
Skills points and the desired Bots phase. Package the numbered images, README,
manifest and QA report after recording the manual review; check ZIP integrity and
hashes. Review sheets are not storefront uploads. Store actions are separate and
require their own authorization.

The captured UI is genuine source rendering through the production host boundary.
It is **not** Capacitor/WKWebView, simulator or physical-device execution.
Capacitor itself still reports web; Settings/Store platform destinations and
native services are not validated by these eight scenes. Native status/home bars
and safe-area insets are absent. The iOS footer is rendered from explicit fixture
metadata, not independent inspection of a signed application.

English UI fonts are bundled Lexend and tabular digits. WebKit rasterization,
scrollbars and exact wrapping still require a native comparison. iPad
Simulations/Reality use the archived approved `1024x768@2` viewport; other iPad
scenes use `1366x1024@2`. Final canvas dimensions alone do not establish the CSS
viewport or device provenance. Phone uses `430x932@3`, composed at `1320x2868`;
iPad cards are `2732x2048`.

The staged scheduler freezes UTC at 2026-08-19, suppresses 33 ms active-time
delivery and intervals, following the archived workflow. The fixtures are
explicit staging states, not personal saves or recorded playthroughs. Skills
uses the approved synthetic four-point derivative. Reality's known `Undefined`
artifact header remains in the source and is outside the real scrolled viewport.
Reject it if visible; do not erase it from the DOM or pixels.

## September validation and handoff evidence

All sixteen approved images passed source/fixture, dimension, decoded-pixel and
visual review. A separate rebuild matched all 291 files of the captured local
bundle. This is independent local reproduction, not an assertion that the
signed package was rerun on Windows. No gameplay/content misrepresentation was
found. Debug Options is intentionally visible in production-native menus while
locked; the staging saves do not enable it or unlock all tabs.

Zero insets do change how much content fits. An illustrative CDP override with
62 px top / 34 px bottom reduced Bots' facility viewport by 91.55 CSS pixels.
Those values were diagnostic, not measured from the submitted app. Do not apply
guessed insets or paint OS bars. A submitted-build iPhone Bots and iPad
Reality/Simulations comparison can establish actual native geometry.

Library preserves the immutable artifacts:

- Approved sixteen-image package: `libfile_d21f2d81c890819181fbf7c4878ef072`.
  SHA-256: `910caf59afb0951f6606e864ebd57e660e3c706fd8206e4fa5f0d017360644fe`.
- Audit report, diagnostic captures and provenance evidence:
  `libfile_6fc3ced7dbe08191a32682e8fb43f942`.
  SHA-256: `af940a8705f1c65ca6071bc2276257a8d652f19629e1aee911fd9ea5157d68fc`.

Keep generated saves, images, dependency caches, transfers and browser profiles
outside Git. Retain only this recipe and the tooling; never change certification
fixtures to conceal drift or claim native-device validation from a browser run.

The retained runner was validated with a fresh complete sixteen-scene capture,
packaging and pixel reconstruction, plus overwrite rejection and preview cleanup.
The repository's configured `tsc -b` check passes. A standalone script/harness type
check traverses an existing `scripts/performance/reportArtifacts.ts:125` generic
return error; running the same check on the unchanged Chromium harness reproduces
it. It is outside this tooling-only change and remains unfixed in the frozen tree.
