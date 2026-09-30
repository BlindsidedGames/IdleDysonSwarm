# Idle Dyson Swarm storefront screenshot review package v1

This package contains five complete, review-only screenshot sets generated from the current app at `main` commit `e25694743506a1891c51d0259a1dddb84bf642de` on 2026-08-30.

Nothing was uploaded. No repository source file was changed. All capture, composition, evidence, and regeneration tooling is local to this artifact directory.

## Deliverables

| Set | Count | Final size | Presentation |
|---|---:|---:|---|
| `iphone/` | 8 | 1320 × 2868 | Approved v3 mobile language |
| `ipad/` | 8 | 2732 × 2048 | Approved v3 mobile language |
| `android-phone/` | 8 | 1080 × 1920 | Approved mobile language at Google’s recommended 9:16 ratio |
| `android-tablet/` | 8 | 1920 × 1080 | Approved mobile language at Google’s recommended 16:9 ratio |
| `steam/` | 8 | 1920 × 1080 | Genuine gameplay only; no headline, gradient, frame, or device treatment |

Each set has a matching `contact-sheet-*.png` at the package root. `manifest.json` contains exact checksums, fixtures, routes, viewports, output inventory, and the official guidance snapshot.

## Official platform guidance checked

The following was verified against official primary documentation on 2026-08-30. Store rules can change, so refresh these sources before an actual upload.

### Apple App Store

[Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) say one to ten screenshots can be uploaded in JPEG, JPG, or PNG and images cannot have alpha/transparency.

- Chosen iPhone review target: **1320 × 2868 portrait**, one of Apple’s accepted 6.9-inch sizes.
- Chosen iPad review target: **2732 × 2048 landscape**, one of Apple’s accepted 13-inch sizes.
- Apple marks iPad screenshots as required when the app runs on iPad. Smaller device-size sets can use Apple’s scaling when the highest-resolution set is supplied, subject to the current App Store Connect configuration.

### Google Play

[Google Play preview asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) says developers can add up to eight screenshots for each supported device type. The general mandatory format is JPEG or 24-bit PNG without alpha, with dimensions from 320 to 3840 pixels and the longest side no more than twice the shortest.

Google labels several discovery-oriented items as highly recommended rather than universal publishing requirements. For games, eligibility for screenshot-driven recommendations calls for at least three genuine gameplay screenshots at 9:16 portrait or 16:9 landscape with minimum 1080 resolution. Large-screen sections accept four or more screenshots from 1080 to 7680 pixels and recommend 16:9 landscape or 9:16 portrait. Google also recommends keeping optional taglines under 20% of the image and prioritizing actual UI in the first three.

- Chosen phone review target: **1080 × 1920 portrait**.
- Chosen tablet review target: **1920 × 1080 landscape**.
- This package supplies the maximum eight for both device types and uses separately captured responsive layouts.

### Steam

[Steamworks graphical asset guidance](https://partner.steamgames.com/doc/store/assets?l=english) lists screenshots as required, at a **16:9 ratio** and **1920 × 1080 minimum**.

- Chosen review target: **1920 × 1080**.
- The selected eight are normal app captures with no marketing wrapper. The first four are the visually strongest desktop surfaces: Skills, Quantum, Research, and Statistics.

## Eight-image mobile story

1. **From one bot to Galactic Brains** — mature Bots economy, with Matrioshka Brains, Birch Planets, and Galactic Brains visible.
2. **Choose your path** — populated maximum non-conflicting Skill tree with 4 genuinely available points.
3. **Break Infinity. Keep going.** — mature Infinity shop at the brink of a Reality break.
4. **Leap into the Quantum** — late Quantum upgrades after 420 canonical leap cycles.
5. **Watch the numbers explode** — 422 Infinities and 17.7K lifetime Infinity Points in Statistics.
6. **Meet Avocato** — the unlocked interdimensional avocado-cat economy.
7. **Automate the impossible** — populated mature Research with late facility boosts.
8. **Unlock a strange story** — the in-game narrative across multiple unlocked chapters.

Apple cards 1 and 3 are copied byte-for-byte from the approved v3 package. Card 2 preserves the approved composition but was recaptured after review with 4 genuine available Skill points instead of the stress fixture's 73. The five additions use the same dedicated full-width cosmic header above the gameplay, with one continuous rounded border and an identical-radius clip. No headline or gradient overlays gameplay.

Simulations and Reality were evaluated but rejected. The committed `mature-simulations` state currently renders an empty Simulations-era canvas, while Reality presents undefined/zero content. The package uses stronger truthful surfaces instead of dressing up weak or misleading states.

## Fixtures and evidence

| Fixture | SHA-256 | Used for |
|---|---|---|
| `mature-infinity` | `7757466ec7b55d505cfafff4c1b4b4a6ebae5daadd529602080a1e1eae902e63` | Bots, Infinity, Research |
| `maximum-skills` | `576febff052c4a23ff76afa894b8e7f9f039356a2a38dc3ecbe9d2ed5e46a552` | Source for derived Skills fixture |
| `maximum-skills-4-points` | `4606f891dc9f420a6e1eec466953109ef300eee95178c26b0bf9703e4fd10186` | Skills capture derived from `maximum-skills` |
| `late-quantum` | `40ab29561a1826ff74a2dae9e5ac7cd0cf15ad82d75a9cca5f72f9122ccf3ff2` | Quantum, Statistics, Avocato, Story |

Every save was imported through the production Settings UI and checked against its SHA. The Skills capture uses an artifact-local canonical derivation: `derive-skills-fixture.ts` decodes the certified `maximum-skills` save, changes only `dysonVerseSkillTreeData.skillPointsTree` from 73 to 4, and reserializes it with the app's own `serializeWebSave`. Ownership, route state, and the skill-tree camera remain unchanged. The derivation evidence is in `fixtures/maximum-skills-4-points.json`; each rendered `raw/*/02-skills.json` independently records the derived SHA and live UI text. No number was painted or edited into a PNG.

The capture harness freezes the date at `2026-08-19T00:00:00Z` and holds the normal 33 ms active scheduler before import so the state cannot advance or reset during composition.

Raw PNGs and per-capture JSON evidence are stored under `raw/<profile>/`. Apple’s first three source captures and evidence remain in the approved v2/v3 predecessor directories referenced by `manifest.json` and `composition.json`.

## Responsive capture matrix

| Profile | CSS viewport | DPR | Raw pixels | Notes |
|---|---:|---:|---:|---|
| iPhone | 430 × 932 | 3 | 1290 × 2796 | Phone navigation and portrait layout |
| iPad | 1366 × 1024 | 2 | 2732 × 2048 | Genuine sidebar/multi-column tablet layout |
| Android phone | 470 × 812 | 2 | 940 × 1624 | Separate phone capture sized exactly to its framed gameplay region |
| Android tablet | 1280 × 640 | 1.5 | 1920 × 960 | Separate responsive landscape layout, not stretched portrait |
| Steam | 1920 × 1080 | 1 | 1920 × 1080 | Direct desktop capture, used without composition |

The compositor’s screenshot regions preserve each raw aspect ratio exactly. Final resizing is uniform; no capture is independently stretched by axis.

## Prerequisites

- A clean checkout of the recorded commit, or a deliberately reviewed newer `main`.
- The repository dependencies already installed (`npm ci` if needed).
- Node.js and a Chromium-family browser executable.
- Set `IDS_CHROMIUM_PATH` to that executable. The review run used a temporary Playwright Chromium under `/private/tmp`; this is not a repository dependency.

If a temporary browser is needed on a clean machine, one reproducible option is:

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ids-store-chromium npx -y playwright@1.55.0 install chromium
```

## Full regeneration

From the repository root:

```sh
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

In another terminal:

```sh
./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/derive-skills-fixture.ts

IDS_CHROMIUM_PATH=/absolute/path/to/Chromium \
  ./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/capture.ts

./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/compose.ts

./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/generate-manifest.ts

./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/qa.ts
```

`derive-skills-fixture.ts` reproducibly creates the documented 4-point Skills state. `capture.ts` imports each fixture, selects the real route, applies only documented presentation positioning, writes JSON evidence, and records the viewport PNG. `compose.ts` builds mobile cards and direct Steam outputs, then contact sheets. `generate-manifest.ts` records final checksums, and `qa.ts` writes `qa-report.json`.

## Replace one screenshot only

Both capture and composition support comma-separated filters. For example, to replace only iPhone scene 7 and rebuild its contact sheet:

```sh
IDS_CHROMIUM_PATH=/absolute/path/to/Chromium \
IDS_STORE_CAPTURE_PROFILES=iphone \
IDS_STORE_CAPTURE_SCENES=07-research \
  ./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/capture.ts

IDS_STORE_COMPOSE_PROFILES=iphone \
IDS_STORE_COMPOSE_SCENES=07 \
  ./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/compose.ts

./node_modules/.bin/tsx /absolute/path/to/store-screenshot-package-v1/generate-manifest.ts
```

Available capture profiles are `iphone`, `ipad`, `android-phone`, `android-tablet`, and `steam`. Scene IDs are recorded in `capture.ts` and the manifest. Existing untouched finals are reused when the filtered contact sheet is regenerated.

For approved Apple cards 1 and 3, replace the predecessor v3 card only after explicit design approval; `compose.ts` intentionally copies those two cards. Card 2 is composed from the current genuine 4-point capture.

## QA checklist

- Verify the JSON evidence route, fixture ID, fixture SHA, viewport, and route theme.
- Inspect the screenshot at full resolution for readable text and the intended populated state.
- Confirm mobile headlines are wholly above gameplay and occupy less than 20% of Google Play cards.
- Inspect all four frame corners: one continuous border, identical-radius crop, no exposed tips or side strokes.
- Confirm tablet captures show the sidebar/multi-column responsive layout and were not derived from portrait.
- Confirm Steam images contain only genuine gameplay UI.
- Verify exact dimensions, RGB color space, and `hasAlpha: no` with `sips` or equivalent.
- Compare Apple cards 1 and 3 checksums with the approved v3 source; verify card 2 evidence and visible footer both say 4.
- Rebuild contact sheets and review the order at thumbnail size.
- Confirm `git status --short --branch` is clean before handoff.
- Refresh official platform documentation immediately before upload.

## Limitations

- This is a review package, not native simulator or physical-device screenshot evidence.
- Additional headline copy is English-only and must be localized for localized store listings.
- Avocato is intentionally shown at its genuinely unlocked but unfunded starting state.
- No assets have been uploaded or placed into a live store listing.
