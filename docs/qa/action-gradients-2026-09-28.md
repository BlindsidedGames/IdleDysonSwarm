# Shared action gradients — 28 September 2026

## Scope

Extended the approved facility lighting to Research purchases, Infinity purchases,
challenge Start/Replay/confirmation actions, Quantum purchases, Reality purchases
and Gather Influence, Simulation purchases, Avocato feeding/Transcend/Discovery
purchases, Store purchase/restore actions, Offline Time actions, and Settings actions.

Two shared neutral overlay tokens preserve existing route, hover and pressed base
colours. White-text/dark surfaces shade towards the bottom-right without lightening the
base, preserving white-text contrast (including Discord's branded blue).
Disabled purchases stay flat. Navigation, disclosure headers, quantity selectors,
skill nodes and presets are excluded. Existing specialist progress/reset controls
retain their design. There are no gameplay, layout or copy changes in this pass.

## Checks

- Isolated browser origin `127.0.0.1:5298`, disposable imported saves. The user's
  early-game preview on port 5193 was preserved.
- Visually inspected Research, Infinity, Challenges, Quantum, Reality,
  Simulations, Avocato, Store, Offline Time and Settings; desktop and 360px/130%
  text coverage across their purchase/action surfaces.
- Expanded challenge confirmation then cancelled; opened Settings import/review
  dialogs, imported disposable fixtures; gathered Influence; unlocked Discovery
  and expanded its upgrades; opened/cancelled Offline Time's spend confirmation.
- Checked enabled/disabled/maxed appearance, keyboard focus, retained route
  colours, wrapping, reachable last purchases and unchanged selector/preset styles.
- Inspected hover/active computed styles; the action gradient persists. Emulated
  forced colours removes the gradient. No animation was added.
- Screenshot evidence: `/tmp/ids-action-gradients/` (local, not committed binaries).
- Production Vite build, lint and `git diff --check` passed. Build retains its
  existing large-chunk advisory. No new CSS-literal tests added.

## Limits

Browser visual QA only: no new iOS, Android or packaged desktop interaction run.
Store purchase/restore transactions were not executed. Offline Time capacity was
already maxed in the fixture; processing-job and unavailable reset variants were
reviewed in CSS rather than exercised individually. No release or deployment.
