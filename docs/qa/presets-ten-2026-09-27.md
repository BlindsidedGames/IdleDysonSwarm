# Ten presets and Bots settings — 27 September 2026

## Changes

- Bots purchase settings expand upward without the shared 58vh/30rem height cap.
  Contents and order are unchanged; no nested settings scrolling was added.
- Both quick-action surfaces use the existing Skills 32px button minimum height.
- Skills settings has a default-off, device-local **Show presets 6–10** toggle.
  Both quick-action surfaces and management use it. Hidden slots remain saved;
  an existing upper-row tab binding remains visible in its selector.
- Ten durable slots support normal editing, selection, automatic tab switching,
  checkpoints, imports/exports and resets. Schema 20 prevents older five-slot
  builds from silently dropping new data. Historical schema-13 input remains
  restricted to its original five slots; recovery creates five empty additions.
- Green, blue, violet, red and white extend the existing five colours. All ten
  are selectable for any preset. The selector uses two columns to fit mobile.
- Preset management scrolls without visible scrollbar chrome.

## Verification

- Full suite: 193 files / 2,041 tests. Focused coverage includes schema-19
  extension, stale legacy queues staying cleared, slot-10 editing and automatic
  selection, full/shared-save round trips, independent layouts, reset retention,
  browser/native-host persistence contracts, old schema-13 recovery, visibility
  preference and colour round trips.
- TypeScript/production build, lint, generated-data and localization checks pass.
  Regenerated deterministic fixtures differ because of ten slots/schema 20;
  authored gameplay and historical format definitions were not changed.
- Live Chromium QA used a disposable profile on localhost:5194 with
  `--use-mock-keychain`; the user's localhost:5193 save was not replaced.
- Operated Bots purchase settings, Skills settings, row toggle, preset-10
  selection, preset management, scrolling to slot 10, colour selection and
  keyboard Escape. Verified five/ten counts, shared 32px button heights and
  unchanged selection after hiding/revealing the row.
- Verified slot 10 and visibility survive reload after the normal 30-second
  autosave checkpoint. An earlier reload before the checkpoint was corrected
  in the QA procedure; no unrelated autosave behavior was changed.
- Inspected desktop 1280×900 and 360×780 with 130% text, English and German.
  Expanded Bots settings show automation, both preset rows and run facts without
  their own scrolling viewport. The management dialog reaches its final preset;
  all ten colour choices fit its two-column selector.
- Reviewed runtime slot bounds, canonical mapping, compatibility repair,
  migration-only legacy behavior, frozen legacy contracts, dynamic preset
  actions and shared presentation dependencies. No unresolved finding remains
  from these checks.

Evidence: [Bots](presets-ten/bots-narrow.png),
[preset management](presets-ten/presets-narrow.png),
[colour picker](presets-ten/color-picker.png).

Native iOS/Android/Electron interaction and cross-device Cloud were not rerun.
Native-host persistence contract tests are automated checks, not device QA.
No deployment, store changes or merge are part of this update.
