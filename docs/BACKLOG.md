# Product backlog

This is the action list for near-term product fixes, remaining release
certification, and deferred investigations. Detailed evidence belongs in the linked audits
and release documents rather than being duplicated here.

Status conventions:

- `[ ]` accepted work not yet verified complete.
- **In progress** means another isolated task currently owns implementation.
- **Deferred** means the work is intentionally outside the current release.

## Next few days — Discord follow-up and Stored Time UI

Updated 10 September 2026; this list was collected from Discord on
8 September at 19:23 AEST against `main` (`4a56278`). Work through one checkbox at a time. Keep the B identifiers
stable when reordering, and tick an item only after its acceptance check passes
or an investigation records an evidence-backed disposition. **Confirmed** means
reproduced or established in current code; **Investigate** means the cause is
still unknown. These are actionable follow-ups, not fifteen confirmed bugs.

- [x] **B02 · Implemented / automated QA passed · Quantum Cash/Science Buy Max.**
  Exact signed 64-bit ownership now works through production derivation, full-cap
  purchases, and save/reload. Existing level caps and the 5%-per-level rate remain.
- [x] **B03 · Implemented / automated QA passed · Quantum Shard replenishment.**
  The existing cap now applies to the wallet, with exact cumulative earned/spent
  totals retained in the existing save format. Spending frees capacity; partial
  conversion preserves unused IP. Reset grants and serialized reload are covered.
- [x] **B04 · Implemented / automated QA passed · Quantum Max preview.**
  UI and transaction share the executable maximum; oversized fixed batches are
  disabled/rejected without charge. Influence retains its final partial purchase.
  Rendered component tests cover labels and click dispatch. Live browser/device
  verification remains part of release certification; see
  [Quantum fix verification](audits/quantum-cap-fixes-2026-09-10.md).
- [ ] **B05 · Investigate · Only seconds of Stored Time after a capacity upgrade.**
  Normal capacity math and a browser departure/return passed; the reported
  failure remains unreproduced. Capture the affected build/platform, save,
  departure/resume markers, and checkpoint outcomes. Compare backgrounding,
  termination, and cold launch; repair lost markers only if demonstrated,
  with duplicate-credit prevention. The upgrade draining the old bank is
  intentional and does not explain missing accrual the following day.
- [ ] **B06 · UX issue · Auto Infinity recommendation becomes stale or zero.**
  Recommended uses a saved manual-run peak while Current uses recent automatic
  throughput; changing the interval clears calibration. Show an uncalibrated
  state, identify stale production/preset/interval context, and suppress stale
  warnings or provide recalibration. Verify interval and preset changes;
  the current rate calculation already uses the configured interval.
- [ ] **B07 · Confirmed · Round bulk purchases is ignored by Buy Max.**
  The quantity resolver returns affordability before applying rounding.
  Define the intended milestone rule, including above 100, then share it
  across preview, manual purchase, and automation. Verify 49 → 50,
  50 → 100, 99 → 100, above-100, and insufficient-funds cases.
- [ ] **B08 · Confirmed · Compact Bots run facts wrap on narrow screens.**
  Equal-width cells cannot fit long label/value pairs; reproduced at 320px.
  Fit or abbreviate the compact summary while keeping each pair together
  and readable. Verify 320/360/393px, long numbers, notation choices, and
  translations; retain the expanded details and visibility setting.
- [ ] **B09 · Confirmed · Purity/Super-Radiant descriptions overstate effects.**
  Broad production wording includes systems the authored effects do not
  boost. Name the actual affected systems and relevant panel exclusions in
  localized technical copy. Verify copy against the effect catalog; any
  additional gameplay effect needs a separate balance decision.
- [ ] **B10 · Investigate · Intermittent Skills/preset halt or spontaneous reload.**
  The specific sparse-research preset failure is fixed, but generic reports
  remain unexplained. Capture the first rejected update, lifecycle phase,
  checkpoint result, writer ownership, and skill queue from a failing save.
  Reproduce the failure and verify recovery preserves the last good save.
  The related post-Infinity research/whole-state rollback investigation is
  deferred under B01 below.
- [ ] **B11 · Investigate · Progress lost after updating an older installation.**
  Original build/save provenance is missing. Obtain a preserved pre-update
  save or backup and reproduce the exact in-place upgrade path. Check legacy
  discovery and migration; verify unreadable saves retain recovery options
  and cannot be overwritten by a new game.
- [ ] **B12 · Investigate · Holding Tinker prevents a second-finger purchase.**
  Current code has no confirmed global pointer restriction; true simultaneous
  touch was not available in the earlier browser check. Reproduce with two
  touch pointers on a supported host. If needed, fix per-control activation
  with pointer matching, cancellation, and synthetic-click deduplication;
  verify both actions work without double activation.
- [ ] **B13 · Requested UI · Show Max Storage beneath the Stored Time bar.**
  Add a row directly under the storage bar with **Max Storage** aligned left
  and the current maximum duration aligned right. Use the description font
  size of “Choose how much time to simulate now”, rather than the “Stored
  Offline Time” heading size. Localize the label and duration, update it after
  capacity upgrades, and check alignment/readability on narrow screens.
- [ ] **B14 · New / Investigate · Excessive Android top and bottom safe-area gaps.**
  Latest screenshots show large blank insets; duplicate native/web inset
  application is a lead, not a proven cause. Reproduce on the reported Samsung
  S20-family device configuration (exact model still needed), trace inset
  ownership, and apply each inset once. Verify gesture and button navigation,
  portrait/landscape, and unobscured controls. Navigation buttons becoming
  smaller with more pinned tabs is expected and is not a separate confirmed bug.
- [ ] **B15 · New / Investigate · Stored Time All does not reach the slider end.**
  Latest report shows All selected with the thumb short of the endpoint and
  a possible one-second difference. The range combines a potentially fractional
  bank maximum with whole-second steps; investigate rounding and browser range
  normalization before claiming time loss. Verify fractional and whole-second
  banks, dragging to the end, All, and spending: the selected amount and thumb
  must agree, with no unintended remainder or extra time deducted.
- [ ] **B16 · New / Product decision · Completed avocado secrets remain visible.**
  Current code deliberately retains discovered/completed icons. Decide whether
  to hide completed secrets or offer a visibility setting, then implement the
  chosen behavior. Verify completion and reload preserve rewards and cannot
  restart or repay the secret sequence.

## Current release certification

1. [x] **Release blocker — repair Skill preset independence and switching.**
   Make assignment and unassignment synchronize the selected preset
   immediately without rewriting the other four presets; preserve independent
   desired layouts; and implement visible, switchable retained-unrefundable
   overlays without silent conflict loss. Add multi-preset, reset,
   persistence/reload, browser, and representative native-host regression
   evidence. Source: [Skill preset contract](contracts/skill-presets-contract.md).
   Certified with five-layout checkpoint/reload and export/import coverage,
   live 320/390-pixel browser switching through a real checkpoint and reload,
   and an in-place Android debug upgrade that retained the current save and
   its recovery rotation.
2. [ ] Complete the remaining manual Web checks: visible focus paint, complete
   contrast review, 200 percent visual appearance, browser-native 400 percent
   zoom, 320/390-pixel visual reflow, real-touch slider behavior, and screen
   reader behavior. Source: [accessibility review](release/web-accessibility-review-2026-08-19.md).
   The compact navigation subset has current 320/390 portrait, compact
   landscape, enlarged-text, reload-persistence, and drawer-reachability
   evidence in
   [the original 2026-08-23 validation note](release/compact-bottom-navigation-validation-2026-08-23.md)
   and its
   [adaptive-navigation follow-up](release/adaptive-bottom-navigation-validation-2026-08-23.md);
   this does not close the broader physical-device and assistive-technology gate.
3. [ ] Complete native Store and device certification. On physical devices and
   platform sandboxes, certify purchase success, cancellation,
   pending/interrupted transactions, durable ownership restore, account
   switching, reinstall, offline verified-cache behavior, and entitlement
   reapplication after import. Also certify in-place legacy-save migration,
   lifecycle/offline replay, update survival, and native accessibility before
   either Store submission. Sources: the native host, Store, legacy-save, and
   release workflow contracts.

## Deferred investigations

- [ ] **B01 · Deferred · Research returns after Infinity / simulation rollback on reload.**
  Players reported research returning after an unexpected reload, with a newly
  purchased research upgrade staying changed; later feedback suggests broader
  simulation rollback. Stale legacy research migration and restoration of an
  older checkpoint are separately reproduced mechanisms, but neither establishes
  the cause of the unexpected reload or explains every reported detail. Defer
  further investigation; do not treat iOS process termination as a proven cause.
  When revisited, distinguish selective research restoration from whole-state
  rollback using IP, bots, cash, and cycle time, and verify reset/save/reload
  behavior. Evidence: [simulation rollback investigation](audits/simulation-rollback-investigation-2026-09-10.md).
