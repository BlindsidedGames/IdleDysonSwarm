# Product backlog

This is the action list for near-term product fixes, remaining release
certification, and deferred investigations. Detailed evidence belongs in the linked audits
and release documents rather than being duplicated here.

Status conventions:

- `[ ]` accepted work not yet verified complete.
- **In progress** means another isolated task currently owns implementation.
- **Deferred** means the work is intentionally outside the current release.

## Discord follow-up — 22 September 2026

- [ ] **Deferred by Matthew · Mobile double-tap zoom.** A player reported that
  double-tapping zoomed the interface again, but could not reliably reproduce it.
  Investigate rapid taps on individual controls in a future task; preserve
  accessibility zoom and do not change zoom behaviour in the current SRS work.
  [Discord report](https://discord.com/channels/712304553931833385/1535228461176590389/1551555264329809953).

## Performance and maintainability — 12 September 2026

- [ ] **In progress:** measured performance, clean-code, duplication and complete
  individual-test review on `codex/performance-maintainability`; see the
  [decision log](audits/performance-review-decisions-2026-09-12.md). Keep gameplay
  decisions pending user approval while continuing independent improvements.
- [ ] **Investigate:** full interaction report's missing Event Timing samples for
  very fast desktop interactions; retain the existing gate until evidence is sound.
- **Deferred design:** destination locale splitting and larger startup bundle
  architecture. Baseline already exceeds JavaScript and shared-English ceilings;
  do not raise those ceilings to claim success.

## Next few days — Discord follow-up and Stored Time UI

Updated 10 September 2026; this list was collected from Discord on
8 September at 19:23 AEST against `main` (`4a56278`). Work through one checkbox at a time. Keep the B identifiers
stable when reordering, and tick an item only after its acceptance check passes
or an investigation records an evidence-backed disposition. **Confirmed** means
reproduced or established in current code; **Investigate** means the cause is
still unknown. These are actionable follow-ups, not fifteen confirmed bugs.

- [x] **B02 · Implemented / automated and browser QA passed · Quantum Cash/Science Buy Max.**
  Exact signed 64-bit ownership now works through production derivation, full-cap
  purchases, and save/reload. Existing level caps and the 5%-per-level rate remain.
- [x] **B03 · Implemented / automated and browser QA passed · Quantum Shard replenishment.**
  The existing cap now applies to the wallet, with exact cumulative earned/spent
  totals retained in the existing save format. Spending frees capacity; partial
  conversion preserves unused IP. Reset grants and serialized reload are covered.
- [x] **B04 · Implemented / automated and browser QA passed · Quantum Max preview.**
  UI and transaction share the executable maximum; oversized fixed batches are
  disabled/rejected without charge. Influence retains its final partial purchase.
  Browser checks cover exact Max quantities, purchases, replenishment, and
  autosave/reload at phone/tablet/desktop sizes. Physical-device certification
  remains separate; see
  [Quantum fix verification](audits/quantum-cap-fixes-2026-09-10.md).
- [ ] **B06 · Deferred by Matthew (2026-09-13) · Auto Infinity recommendation becomes stale or zero.**
  Await more evidence and Matthew's decision before changing the estimator,
  warning, Infinity reset flicker, or reset timing. The separately approved
  stacking Durability card is outside this deferral. Recommended retains a manual-run peak;
  changing the interval clears it and automatic play does not rebuild it. The
  warning compares target sizes rather than actual throughput. The reported
  large rate discrepancy remains unverified without the affected save and units.
  The current rate calculation already uses the configured interval. A forecast
  based on complete cycles is a proposal only, not an approved implementation.
- [x] **B07 · Intended behavior confirmed · Buy Max ignores rounding.**
  Matthew confirmed on 13 September that Max buys every affordable unit once;
  it neither rounds nor repeats while held. Rounding applies only to fixed
  quantities: Buy 10 targets multiples of 10, Buy 50 multiples of 50, and
  Buy 100 multiples of 100, continuing above 100. An unaffordable next
  milestone waits without spending. The existing shared quantity resolver
  already implements this rule; regression tests cover boundary quantities,
  insufficient funds, and preview/manual/automation agreement.
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
- [ ] **B12 · Investigate · Holding Tinker prevents a second-finger purchase.**
  Current code has no confirmed global pointer restriction; true simultaneous
  touch was not available in the earlier browser check. Reproduce with two
  touch pointers on a supported host. If needed, fix per-control activation
  with pointer matching, cancellation, and synthetic-click deduplication;
  verify both actions work without double activation.
- [x] **B13 · Implemented locally · Show Max Storage beneath the Stored Time bar.**
  Add a row directly under the storage bar with **Max Storage** aligned left
  and the current maximum duration aligned right. Use the description font
  size of “Choose how much time to simulate now”, rather than the “Stored
  Offline Time” heading size. Localize the label and duration, update it after
  capacity upgrades, and check alignment/readability on narrow screens.
  Implemented with localized capacity text and sidebar quick spends (1 M,
  10 M, 1 HR); verified desktop/phone layout and spending from Bots.
- [x] **B14 · Implemented / Android emulator QA passed · Excessive safe-area gaps.**
  Reproduced duplicate native/WebView spacing on Android 15 with WebView 124.
  The bridge now reports only system-bar/cutout overlap remaining inside the
  measured WebView. Before/after QA covered gesture/button navigation and both
  orientations; a separate edge-to-edge control retained necessary insets.
  The exact reported S20 configuration remains unavailable, and the control
  does not substitute for testing a newer WebView version. See
  [mobile/Stored Time QA](audits/mobile-stored-time-2026-09-13.md).
- [x] **B15 · Implemented / browser and Android QA passed · Stored Time All endpoint.**
  Confirmed browser normalization of fractional maxima with whole-second steps;
  this did not establish time loss. The last slider position now maps to the
  exact bank, and amount/result labels retain up to three fractional digits.
  Verified All, dragging, keyboard endpoints, route return, confirmation,
  cancellation/retry, repeated spends, empty/fractional/integral banks, and
  exported/reloaded balances. Max Storage and sidebar quick spends received
  adjacent regression coverage; no timing or save policy changed. See the
  [QA record](audits/mobile-stored-time-2026-09-13.md).
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

- [ ] **B11 · Deferred · Progress lost after updating an older installation.**
  Reported loss was not reproduced; the original build and pre-update save are
  unavailable. Revisit if new reports provide build/save evidence for an exact
  in-place upgrade reproduction. Preserve existing recovery protections.

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
