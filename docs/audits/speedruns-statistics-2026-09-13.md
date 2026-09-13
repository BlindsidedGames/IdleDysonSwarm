# Speedruns Statistics and Debug qualification

Implemented from `d4b6fd54` in the isolated `ae20` worktree after Matthew approved the plan. Matthew subsequently authorized committing, pushing, and opening a PR. No merge, deployment, or store action is included.

## Behavior

- One run covers the whole save. Elapsed real time includes time away and is independent of simulated time and 2× game speed. Ordinary gameplay resets retain the run; a newly created save starts clean.
- Milestones: First Infinity, First Quantum Leap, Reality unlocked, 2× game speed unlocked, and holding 10 available Overflow Points (Debug qualification).
- Debug purchase spends exactly 10 Overflow Points. Quantum Shards and Strange Matter are untouched. Existing ownership still enables access without another charge.
- Qualification is observed independently of ownership and before a purchase can spend the points. Recording it does not spend anything.
- Stored Time and Debug have persistent Yes/No/Unknown usage states. Each milestone snapshots usage at that point. Later Debug gameplay changes invalidate the whole run while retaining its historical measurements.
- Purchase, opening, enabling, disabling, failed actions and actual no-ops do not mark Debug usage. Resource edits, progression presets, Reality unlock, Stored Time grants and unlock-all-tabs do.
- Stored Time is allowed. Its detached candidate contains the usage/milestone records; cancelled work cannot publish them. A zero-consumption bot-cap checkpoint does not mark usage.
- Existing saves get unknown usage history; already-reached milestones have unknown historical times. Ambiguous legacy dates are not guessed. Clock rollback makes timing unverified. Imports preserve the imported run rather than merging receiver history.
- A regression test covers schema-13 recovery using a fresh recovery template: that template must not certify the old imported run as clean.
- Existing Statistics sections and Infinity performance calculations are retained. Explanation text is in an accessible disclosure to keep phone layouts compact.

## Validation

Automated checks passed: full Vitest suite (157 files, 1,564 tests), production TypeScript/Vite build, lint, localization extraction/translation/compilation, data catalog check, first-Dyson parity check, Electron host syntax checks, and `git diff --check`.

Coverage includes clocks and clock rollback, unchanged 2× processing, milestone snapshot/idempotency, 9/10 Overflow thresholds, existing Debug ownership, no-op versus mutating Debug actions, whole-save reset boundaries, Stored Time commit/cancellation, serialization, import, legacy recovery, and retained historical uncertainty. The frozen first-Dyson prepared-save fingerprint was regenerated for the new persistent unknown-history record.

Browser QA used dedicated loopback hosts and disposable Chromium profiles with `--use-mock-keychain`. Captured and inspected before/after Statistics and Debug screens. Production interaction checks passed at 1440, 360 and 320 CSS pixels: denied purchase at nine points, successful purchase at ten, eligible immediately afterward, ineligible after Add Cash, persisted status on reload, disclosure open/close, 130% text, no document horizontal overflow, and access to the existing Statistics sections. German and Japanese Statistics/Debug screens were also visually inspected at 360px; all shipped catalogs compiled and passed translation checks.

Native QA used only disposable test installations:

- iOS 26.4 / iPhone 17 Pro, simulator `IDS-Speedruns-QA` (`729BF3D7-F8A7-4B62-8AD1-33C4D7201C8B`), unique bundle ID `com.blindsidedgames.idledysonswarm.speedrunsqa`. Xcode build passed. Actual Simulator clicks verified purchase, clean eligibility after purchase, Debug Add Cash taint, and cold-launch persistence. Final compact Statistics layout was inspected after rebuilding/reinstalling. Simulator automation did not establish a reliable drag/scroll gesture; do not count this as iOS touch-scroll certification.
- Android API 35 / Pixel 7, dedicated AVD `ids-speedruns-ae20`, emulator `emulator-5592`, `.debug` package. Gradle build passed. Native WebView checks verified nine/ten-point purchase behavior, usage flagging, reload, cold launch, enlarged text, retained Statistics sections, and real synthesized touch scrolling. Native save completion was awaited explicitly. Screenshots were captured from the emulator and inspected.

These are browser/emulator results, not physical-device certification. Existing native inset behavior belongs to the separate mobile-layout task. No connected physical device, player save, existing emulator, or primary-checkout server was modified.

Local evidence (ignored, not checked in): `output/qa/speedruns-2026-09-13/`. It contains baseline/final screenshots and automated/native build logs. All QA saves are synthetic.

## Integration boundary

`idsSpeedruns` is an optional versioned portable root field mapped to `statistics.speedruns`. It is validated in both save and canonical validation. Shared edits are in canonical application/session plumbing, first-run creation, game-state mapping/types, and schema-13 recovery. `ReadyDysonSlice.tsx` and Auto Infinity recommendation code were not edited.

The save/Debug task reported PR #197, commit `838276a303d11698beae9b049cfa922f5ce62265`. It adds `lock-tabs`, makes disabling Debug clear `unlockAllTabs`, gates hydrated unlocked tabs on Debug being enabled, and adds import intent `save-reset`. Those changes were not merged here. At an authorized integration, preserve both sets of shared-file hunks. Classify its new `lock-tabs` action as access-only, like disabling Debug, while keeping `unlock-all-tabs` tainting. Preserve the fresh factory's new clean run on a full save reset and the imported run on normal imports. This classification and schema handoff were sent directly to the peer task.
