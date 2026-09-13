# Purchase controls review and QA — 2026-09-13

Status: implementation, code review, and available QA complete. On 2026-09-13, Matthew accepted proceeding to PR with native long-press verification unavailable. That coverage limitation remains recorded below and is not counted as a pass.

## Agreed behavior

- Quantum quantity uses the canonical save/checkpoint path, matching Bots and Research. Old saves default to Buy 1 without rewriting their shape merely by loading them.
- Holding Quantum Buy 1/10/50/100 repeats serialized purchases and stops on release, cancellation, unavailability, or rejected purchase.
- Max buys every affordable unit once, ignores rounding, and does not repeat.
- Existing rounded fixed purchases target successive multiples, including 10/20/30/40/50 and milestones above 100. An unaffordable next milestone does not buy a partial batch.
- B12 simultaneous Tinker/purchase and Simulation quantity controls are outside this change.

## Code review

Reviewed the full diff: command routing and snapshot projection, optional save-field mapping and validation, reset preservation, pending dispatches, stale timer completion, pointer/keyboard cancellation, and the shared rounding resolver's preview/manual/automation paths. No remaining scoped code findings were identified. This was an author review, not an independent review.

Actual browser keyboard QA found that native Enter activation and focus loss while a button was pending could continue purchases after release. The final implementation prevents native repeated activation and observes key release at window level. Regression tests and a repeated browser interaction verified the fix.

## Automated checks

- Full Vitest suite: 157 files, 1,605 tests passed on the final implementation.
- TypeScript, lint, production build, data check, first-Dyson parity, translation catalog checks, and `git diff --check` passed.
- Isolated Capacitor native build and Xcode Simulator app build passed.
- Tests cover canonical checkpoint/restart, portable export/import, old/malformed settings, Quantum conversion and Overflow retention, fixed milestone affordability, Max rounding behavior, hold cancellation, ownership caps, and keyboard activation.

## Running browser app

Used generated progression fixtures and disposable Chrome profiles with `--use-mock-keychain`.

- Captured baseline and final phone/desktop screenshots; no horizontal overflow at 390×844 or 1366×900.
- Exercised held Buy 1/10/50/100, release, Max, empty-wallet state, Enter activation, keyboard auto-repeat, and key release after focus loss.
- Verified quantity persistence after the existing 30-second autosave and a reload.
- Max remained unchanged while held and bought the affordable amount once on release.

Local evidence: `/tmp/ids-purchase-qa/final-browser.json`, `final-{phone,desktop}-*.png`, `keyboard-after.png`, `keyboard-Max-final.png`, and `review-tests.log`.

## Native iOS app

Used only disposable `IDS-Purchase-QA` (iOS 26.4), generated save data, and an isolated temporary Capacitor host. No physical device or player save was used.

Direct Simulator clicks and visual inspection verified:

- Cash Booster progressed 25 → 26 → 36 → 86 → 186 with Buy 1/10/50/100; spending increased by exactly 1/10/50/100.
- Buy 100 and the purchased level survived background checkpoint, termination, and cold launch.
- Max spent the entire available shard balance once; subsequent fixed purchases were disabled and did not change the balance.
- Quantity controls, selected states, costs, disabled states, and the Quantum layout rendered correctly.

Local screenshots: `/tmp/ids-purchase-qa/native-buy100.png` and `native-empty-wallet.png`.

**Remaining acceptance gap:** native long-press repetition and release/cancellation are not certified. A temporary XCTest harness could read the WebView tree but its synthesized touches failed to activate even the unchanged purchase-settings button on iOS 26.4/18.5. Retrying with exclusive Simulator foreground did not resolve this. Direct Simulator clicks worked, but the available computer-use API has no duration-controlled hold. The failed XCTest run is not counted as a pass. Evidence: `/tmp/ids-purchase-qa/native-exclusive.log` and `native-exclusive.xcresult`.

To close this gap, exercise a sustained native Buy 10 press, release and drag-off cancellation, then hold Max and verify a single purchase. No Android or physical-device acceptance is claimed.

The native long-press coverage limitation is accepted for this PR; it is not an outstanding implementation blocker.

## PR integration

Integrated `main` at `62842fcd`. The Quantum quantity-button conflict was resolved by retaining the responsive `PurchaseQuantityLabel` from main and this change's canonical command dispatch and pending state. Full tests passed again: 158 files / 1,613 tests. TypeScript, production build, lint, data, parity, translation checks, and diff checks passed again. Phone and desktop purchase interactions and screenshots were rechecked with the combined implementation; evidence is under `/tmp/ids-purchase-qa/integration-*`. The direct native evidence above predates this label integration; no additional native acceptance is claimed.
