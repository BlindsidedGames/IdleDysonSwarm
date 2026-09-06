# Galvanization QA — 6 September 2026

Worktree: `ids-infinity-challenges`, branch `codex/blank-slate`, baseline
`825a1b07`. The user requested a local checkpoint followed by an extensive QA pass. It has not been released.

## Implemented behavior

- Save schema 17 stores permanent base skill IDs alongside challenge state.
  Galvanization persists before publishing its irreversible spend; failed saves
  leave both ownership and currency unchanged.
- Revealed base skills cost one Galvanizer, return invested ordinary points,
  retain their benefits without their approved downsides, and survive Infinity,
  Quantum, challenge restarts and Overflow. Normal conditions and new-run timer
  resets remain in effect. Permanent bases satisfy prerequisites themselves.
- Cash & Science offers three independent refundable one-point subskills:
  five seconds of panel lifetime, ten credits per decayed panel, and double
  Cash/Science production. All three can be owned together.
- Preset order now controls spending priority. Prerequisites are resolved before
  each target; the allocator waits for enough points instead of buying a later
  affordable target. Display order remains player controlled.
- Priority lists support pointer dragging, edge auto-scroll, up/down buttons
  and removal of a skill plus its queued dependents. An icon-only up/down
  button opens a replacement preset view with one top-left Back button.
  Permanent bases appear in a separate section and use a fractured background.
  Non-refundable skills use red icon glyphs without a coloured row background. Updated help
  and effective descriptions are translated into all seven supported languages.

## Browser observations

Used the local game at `http://127.0.0.1:58505/play/` with an isolated QA save.
Inspected rendered screenshots at 390×844, 768×1024, 1024×768, 1280×900 and the
normal 837×940 browser viewport. No clipping was observed in the changed dialogs.

- Spent the earned Galvanizer on Cash & Science through the real confirmation;
  its green permanent base and zero-balance wallet survived reload.
- Assigned all three subskills, refunded and repurchased decay, then reloaded:
  all three stayed owned and their preset checkboxes remained checked.
- Imported a preset, moved entries using arrows, and verified saved ordering.
- Initial native HTML dragging failed in this browser. Replaced it with captured
  pointer handling; actual last-to-first drags succeeded at desktop and phone
  widths. The resulting order survived reload and challenge enter/abandon.
- Entered Blank Slate with all three subskills owned. The permanent base remained
  active; every subskill cleared and assignment/preset controls were disabled.
  Abandoning kept the base, restored normal mode and enabled preset editing.
- Removed an empty action area beneath permanent skill details.

## Automated checks

- `npm test`: 129 files, 1,303 tests passed.
- `npm run build`: passed, including TypeScript and production-store boundary.
- `npm run lint`, `npm run data:check`, `npm run i18n:check`: passed.
- `npm run parity:first-dyson:check`: passed.
- `npm run native:electron:check`: passed (syntax checks).
- `git diff --check`: passed.

Focused coverage includes irreversible save failure/delay, save migration/reload,
all reset boundaries, descendant/refund/exclusion handling, strict priority in
live and reset allocation, actual production/lifetime/decay derivation, and
partial Power galvanization preserving the remaining ordinary penalties.

This is browser and simulation validation. No signed native build, physical
device run, store submission or release was performed for this follow-up.

## Follow-up interaction checks

- Removed arithmetic punctuation from subskill buttons: plain Assign/Refund,
  with a separate 1 Skill Point cost.
- Used a temporary, inactive preset with 48 spending entries and one permanent
  base. Verified phone list scrolling, captured-pointer edge auto-scroll,
  arrow reordering and a fixed header. No number dropdowns remain.
- The icon-only priority button is directly on each preset. Management retains
  its ellipsis button; each has a minimum 44 by 44 pixel target, keyboard focus
  styling and an accessible name. The surrounding button area responds to taps.
- Removing AI Managers previewed five queued dependents. Cancel retained all
  48 entries; Confirm removed six and left 42, with Cash & Science still in
  the separate Galvanized section. The 42-entry result survived reload.
- Removing Investment, which had no queued dependents in this QA preset,
  immediately removed only that entry. Removing from a preset does not refund
  the currently owned skill.
- A rapid reload originally lost a recent reorder before autosave. Active and
  inactive assignment edits now save before publishing completion. Two new
  integration cases verify failed saves preserve the prior order, delayed
  commits keep it unpublished, and immediate reopen sees the new order.
  An immediate browser reload also retained the completed change.
- Restored the temporary preset to its original empty Preset 5 configuration.
  Preset 2 remained selected throughout this QA pass.
- Inspected the revised UI at 390×844, 768×1024, 1024×768 and 1280×900.
  Restored the normal browser viewport after checking.

## Augment badge and fracture pulse

- Player-facing optional subskills are now called Augments, including localized
  headings/help. Galvanized Cash & Science shows assigned/available augments
  in the original cost-badge position, with the Galvanizer currency icon on its
  left. Other galvanized bases omit the badge when they have no augments.
- Browser verification observed 0/3, then 1/3 after assigning lifetime, then
  refunded that temporary assignment back to 0/3 and restored its point.
- Fracture lines now fade from dark to light over a ten-second CSS opacity
  cycle. Static facets, skill artwork, tile colour and badges do not animate.
  The line-only mask is reused in the tree, skill details and permanent list.
  There is no per-frame JavaScript or React animation loop.
- Browser checks observed changing overlay opacity, a paused tree animation
  behind the open details dialog, and continued animation in the detail icon.
  Emulating reduced motion produced animation:none and opacity:0; the media
  override was then cleared. This is browser behavior verification, not a
  native-device GPU benchmark.
- Build, lint, localization and diff checks passed for the follow-up.

## Latest skill detail presentation

- Full-size skill icons sit beside the title. Description text stays aligned
  with the title, wraps beneath the close button, and has a 4px title gap.
- The effect remains full width. Augments have no divider or extra outer
  spacing, and permanent-skill explanatory text appears after the augments.
- Galvanize is hidden with no Galvanizers available. Its visible cost uses
  the currency icon, with a complete text label for assistive technology.
- These details were inspected in the live browser, including narrow widths.
  An extensive follow-up QA pass is pending after this checkpoint.
