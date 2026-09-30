# Idle Dyson Swarm storefront deployment bundle v2

Upload-ready, English-language screenshot sets for iPhone, iPad, Android phone, Android tablet, and Steam. Nothing has been uploaded. Production repository files were not changed.

## Upload inventory

| Folder | Count | Exact size | Treatment |
|---|---:|---:|---|
| `iphone/` | 8 | 1320 × 2868 | Header above real gameplay; matched rounded frame/clip |
| `ipad/` | 8 | 2732 × 2048 | Header above separately captured responsive landscape gameplay |
| `android-phone/` | 8 | 1080 × 1920 | Header above real gameplay |
| `android-tablet/` | 8 | 1920 × 1080 | Header above separately captured responsive landscape gameplay |
| `steam/` | 8 | 1920 × 1080 | Direct genuine gameplay only; no wrapper, headline, frame, or device treatment |

Every deployable file is opaque sRGB PNG. `manifest.json` records SHA-256, dimensions, colorspace, alpha, route, order, provenance, and source equality. `qa-report.json` records all automated checks. The five root contact sheets are for review, not upload.

## Final story order

1. Bots — **FROM ONE BOT TO / GALACTIC BRAINS**
2. Skills — **CHOOSE YOUR PATH**
3. Infinity — **BREAK INFINITY. / KEEP GOING.**
4. Quantum — **LEAP INTO / THE QUANTUM**
5. Simulations — **REBUILD / CIVILIZATION**
6. Reality — **DECODE THE / ANOMALY**
7. Research — **AUTOMATE THE / IMPOSSIBLE**
8. Story — **UNLOCK A / STRANGE STORY**

Steam follows the same route order using clean gameplay only.

## Truthful state provenance

- Skills uses `maximum-skills-4-points`, SHA-256 `4606f891dc9f420a6e1eec466953109ef300eee95178c26b0bf9703e4fd10186`. The genuine app render shows **4** available points on every platform, including Steam; no number was painted.
- Simulations derives from certified `mature-simulations` (`775aa662…`) through documented canonical Hunter/Gatherer purchases, 24 one-hour production advances, and canonical conversions. Serialized save SHA-256: `16dc911…`.
- Reality derives from the same certified source through canonical Translation I–III, Double Time, and Worker Auto Convert purchases. Serialized save SHA-256: `f504410…`.
- Derived `.idsweb1` files, full hashes, mutation records, live rendered evidence, capture script, compositor, and QA tooling are retained under `reproduction/` and excluded from the deployment ZIP.

The two new Steam scenes were imported through the production Settings UI and captured directly from a frozen external Vite build. Reality was positioned through the real scroll container so its populated Anomaly/upgrade state is visible and the source fixture's top-level Undefined label is outside the accepted viewport. No UI value was altered or painted after capture.

## Checkout provenance

The frozen build was made from commit `9577c5af2817ae573a3b5fdfd9aab69fcd033c4d` on branch `codex/skill-preset-independence`. The shared checkout already contained unrelated concurrent edits; pre-build dirty-diff SHA-256 was `d6ae9d7302be607c723395221064182b3bfd5603871e5e4df7aadd329502d280`. Final observation recorded 43 status entries and dirty-diff SHA-256 `cb7f20ae17299c6902ff56f7384a1b004224c29f7cb7bd6143eea8b1e299afe8`. The build was frozen outside the repository before new capture, preventing later shared-checkout edits from changing it.

## Current official constraints checked 2026-08-30

- [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/): one to ten screenshots; accepted device-specific dimensions; PNG/JPEG/JPG; no alpha. Chosen targets are accepted 6.9-inch iPhone portrait and 13-inch iPad landscape sizes. iPad screenshots apply when the app runs on iPad.
- [Google Play preview asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en): up to eight screenshots per supported device type; JPEG or 24-bit PNG without alpha; 320–3840 px; longest side no more than twice the shortest. Google distinguishes mandatory rules from recommendations; the 1080-pixel 9:16 and 16:9 sets here satisfy game discovery guidance.
- [Steamworks graphical asset guidance](https://partner.steamgames.com/doc/store/assets?l=english): screenshots are required; current guidance specifies 16:9 and at least 1920 × 1080. This set uses exactly 1920 × 1080.

Refresh all three official pages immediately before uploading because store rules can change.

## Replacement workflow

To replace one approved existing scene, regenerate it with the original package's artifact-local scripts and copy it into the same numbered filename. To replace Reality or Simulations, edit only the scene/profile filter in `reproduction/capture-steam.ts` or use the retained review package's capture/composition scripts for mobile. Always import through Settings, preserve the fixture SHA evidence, and never edit displayed values in the PNG.

Then run from the repository root:

```sh
./node_modules/.bin/tsx /absolute/path/store-screenshot-deployment-bundle-v2/reproduction/assemble.ts
./node_modules/.bin/tsx /absolute/path/store-screenshot-deployment-bundle-v2/reproduction/finalize.ts
```

Rebuild the ZIP only after full-resolution visual inspection. Because `assemble.ts` deliberately copies reviewed files byte-for-byte, a one-scene replacement should first update its mapped reviewed source or the mapping itself.

## Upload checklist

- Confirm the numbered order in each storefront UI before saving.
- Use only files inside the matching platform folder; do not upload contact sheets.
- Verify localized listings do not reuse English headline cards unintentionally.
- Recheck official specifications and any current device-slot prompts.
- Confirm Skills visibly says 4; Simulations is populated; Reality contains no visible Undefined/blank panel.
- Inspect all four mobile frame corners at 100%; header must remain wholly above gameplay.
- Confirm Steam files contain only app UI.
- Compare local files with `manifest.json` SHA-256 values after transfer.
- Keep this archive as the immutable upload source and record the actual store upload date/version separately.

## Limitations

These are responsive browser captures, not native simulator/physical-device screenshots. Headline cards are English-only. The bundle is deployment-ready as image assets but has not been uploaded or validated inside live store listing editors.
