# Discord todo remediation plan

Status: **First pass plus visual follow-up ready for product review**

Source: the twelve items captured from the private Discord `#todo` channel on
2026-08-28, followed by source investigation against current root-level `main`.

This document is the tracker and implementation contract for the Discord todo
first pass. The eleven original active items and the mobile Store containment
issue found during device review are ready for product review. D-04 is retained
in the tracker but deferred to a separate agent and performance-focused pass.

The later app-wide scale, spacing and surface-consistency work is tracked
separately in [App-wide visual consistency plan](./app-wide-visual-consistency-plan-2026-08-28.md).
The Skill Tree performance item remains deferred; the visual follow-up adds
only the compact preset switcher and dialog-scale work, not rendering or panning
changes.

## Status model

- **Planned**: the behavior and validation contract are ready for review.
- **Implementing**: code work has started.
- **First pass ready**: implementation and developer validation are complete.
- **Changes requested**: product review found follow-up work.
- **Accepted**: product review passed and all required evidence is recorded.
- **Backlog — separate pass**: intentionally excluded from this implementation
  pass and awaiting its own agent, profiling cycle and product review.

| ID | Item | Priority | Status | Product review |
| --- | --- | --- | --- | --- |
| D-01 | Adaptive Settings layout | P1 | First pass ready | Pending |
| D-02 | iPad bottom-safe Bots allocation slider | P1 | First pass ready | Pending |
| D-03 | Progression-correct `????` facility teaser | P1 | First pass ready | Pending |
| D-04 | Skill Tree panning performance | P1 | Backlog — separate pass | Deferred |
| D-05 | Stable Double Infinity Points toggle | P2 | First pass ready | Pending |
| D-06 | Stable side-navigation icons | P2 | First pass ready | Pending |
| D-07 | Unclipped Skill search field | P2 | First pass ready | Pending |
| D-08 | Readable Skill Preset cards | P2 | First pass ready | Pending |
| D-09 | Double-click and double-tap Skill assignment | P2 | First pass ready | Pending |
| D-10 | Debug game-number parsing and resource caps | P2 | First pass ready | Pending |
| D-11 | Themed Facility Details scrollbar | P3 | First pass ready | Pending |
| D-12 | Complete Offline Time Wiki overview | P3 | First pass ready | Pending |
| D-13 | Contained mobile Store offer actions | P1 | First pass ready | Pending |

## Product decisions fixed for the first pass

### Facility teaser progression

Basic Facilities and Mega-Structures receive separate teaser projections. The
presentation must not infer one teaser from the other.

- Before every Basic Facility is visible, show one `????` card representing
  the next unavailable Basic Facility.
- Examples: Assembly Lines visible but AI Managers unavailable shows the
  teaser; Data Centers visible but Planets unavailable still shows it.
- Once Planets are visible, hide the Basic Facility teaser.
- Do not show a Basic teaser merely because Mega-Structures are still locked.
- Once Mega-Structures are unlocked, show the Mega-Structure teaser while a
  later Mega-Structure remains unavailable.
- Once the final Mega-Structure is visible, hide the Mega teaser.

These rules concern canonical visibility/unlock state, not whether the player
has manually purchased a particular facility.

### Skill Presets layout

- The number of rows and columns is content-driven: the grid may use any column
  count that leaves every preset card looking deliberate and readable.
- Keep the primary load label and preset name on one line. The grid must reduce
  its column count before allowing these labels to wrap, stack word by word or
  clip.
- Give `Queued Skills` its own summary line.
- Put the Workers/Scientists distribution together on a separate line directly
  below `Queued Skills`.
- The dialog may grow on wider screens when that improves card composition, but
  extra width is not itself a reason to add columns.

### Debug number input

Debug accepts the game's player-visible Standard magnitude vocabulary as
input, independently of the currently selected display notation.

- Accept exact integers, decimals, grouped digits and scientific notation.
- Accept every Standard suffix emitted by the canonical formatter, including
  `K`, `M`, `B`, `T`, `Qa`, `Qi`, `Sx`, `Sp`, `Oc` and all later compound
  suffixes through the end of the authored suffix table.
- Suffix matching is case-insensitive: `Qi`, `qi` and `QI` are equivalent.
- Whitespace before a suffix is optional: `100Qi` and `100 Qi` are equivalent.
- An optional multiplication separator is accepted: `100xQi`, `100 x Qi`,
  `100×Qi` and `100 × Qi` are equivalent to `100Qi`.
- Parsing is exact and must not round-trip discrete values through a JavaScript
  `number`.
- Continuous resources and discrete resources retain their different domain
  limits. Above-limit input reports the relevant limit instead of silently
  applying an unintended value.
- Resource-specific **Set to cap** actions supplement the shared amount field.

## Implementation workstreams

### Workstream A: responsive layout and safe areas

#### D-01 — Adaptive Settings layout

**Implementation**

- Make `settings-surface` an inline-size container.
- Use a deliberate two-column top-level composition when the Settings content
  container has sufficient usable width; retain one column below that point.
- Let each half-width panel adapt its own inner control layout instead of
  retaining the full-width desktop arrangement.
- Replace viewport-only compact decisions with container queries for panels,
  navigation controls, selects, processing controls, save controls and dialogs.
- Add a short-height treatment for landscape and split-window use without
  shrinking touch targets below the shared minimum.
- Preserve text selection and editing behavior in import/export fields.

**Acceptance**

- No overlap, clipping, horizontal scrolling or inconsistent panel structure
  at phone, tablet split view, iPad portrait/landscape or desktop widths.
- Audio and processing sliders remain at least 44 CSS pixels tall on touch
  devices.
- All controls remain keyboard reachable with visible focus.

**Tests and evidence**

- Extend `SettingsSurface.test.tsx` and CSS contract coverage for container
  breakpoints and minimum touch targets.
- Visually check 320×568, 390×844, 640×480, 820×1180, 1024×1366,
  1180×820 and 1440×900.
- Perform final portrait, landscape and split-view checks on a physical iPad.

#### D-02 — iPad bottom-safe Bots allocation slider

**Implementation**

- Give the lower gameplay regions their own bottom safe-area responsibility
  whenever bottom navigation is absent.
- Do not double-apply the inset while bottom navigation is present.
- Audit Tinker and other lower overlays at the same desktop/iPad breakpoint.

**Acceptance**

- The allocation slider and its full touch target sit above the home indicator
  at and above the 1024-pixel side-rail breakpoint.
- The change does not create excess empty space on desktop or devices without
  a bottom inset.

**Tests and evidence**

- Add shell CSS regression coverage for both navigation modes.
- Verify touch dragging on a physical iPad in portrait and landscape.

#### D-03 — Progression-correct `????` facility teaser

**Implementation**

- Replace the overloaded `showNextTierTeaser` projection with independently
  named Basic Facility and Mega-Structure teaser booleans.
- Derive each boolean from canonical facility visibility in
  `frontendSnapshot.ts`.
- Pass each boolean directly to its matching region.
- Retain one semantic list item for the teaser so grid placement remains
  ordinary and accessible.

**Acceptance**

- Basic teaser progression follows the fixed contract above from a fresh game
  through Planets.
- Mega teaser progression follows the fixed contract from first Mega unlock
  through the final Mega-Structure.
- Teasers appear exactly once in one-, two- and three-column grids.

**Tests and evidence**

- Add table-driven snapshot tests at every Basic and Mega visibility boundary.
- Add integrated render tests using real projected snapshots, not hand-authored
  contradictory visibility flags.
- Add visual checks around the 50rem and 80rem facility container breakpoints.

#### D-11 — Themed Facility Details scrollbar

**Implementation**

- Give the portalled dialog explicit scrollbar track, thumb and hover tokens
  matching its palette.
- Cover WebKit and Firefox while retaining ordinary touch scrolling,
  overscroll containment and forced-colour behavior.

**Acceptance**

- A scrollable dialog has a visible, themed affordance on pointer devices and
  remains smooth and unobstructed on touch devices.

### Deferred backlog: Skill Tree performance

#### D-04 — Skill Tree panning performance

**Deferral decision**

- Exclude D-04 from the coordinated visual-remediation implementation pass.
- Assign it to a separate agent so profiling, implementation and performance
  validation can proceed without muddying the visual diff or its review.
- Begin that pass with a clean before trace and finish with comparable device
  traces; do not treat subjective smoothness or focused tests as sufficient.
- D-04 remains open in this tracker, but it is not part of the eleven-item
  first-pass completion gate below.

**Implementation**

- Profile the current 104-node tree on iPad before changing it, recording
  frame time, long tasks, layer/raster behavior and input latency.
- During an active pan or pinch, mutate only the canvas transform at animation
  frame cadence rather than reconciling the complete React node/connector tree
  on every pointer move.
- Publish the final transform to React and the remembered view after the
  gesture, plus bounded checkpoints if required for interruption safety.
- Keep keyboard focus, search centring, resize recentering and route-return
  persistence intact.
- Reassess the permanent `will-change` layer after profiling; retain it only if
  device evidence shows it helps.

**Acceptance**

- Pan and pinch track the finger without visible refresh steps or dropped node
  imagery on the target iPad.
- A drag never opens a Skill, and a tap never shifts the tree.
- The remembered position and scale survive route switches and resizing.

**Tests and evidence**

- Retain and extend gesture, pointer-capture, resize and persistence tests.
- Add a render-count or equivalent regression proving pointer moves do not
  reconcile every Skill node.
- Compare before/after device traces using the same save and tree position.

### Workstream B: Skills interaction and layout

#### D-07 — Unclipped Skill search field

**Implementation**

- Reserve trailing space only for controls that are currently present, or move
  match status outside the editable text area.
- Keep the clear control, live result count and Enter-to-open behavior.

**Acceptance**

- `Search the tree…` is readable at supported widths and text scales.
- Typed text never runs beneath the match count or clear button.

#### D-08 — Readable Skill Preset cards

**Implementation**

- Make the preset dialog responsive to its own content width.
- Give the grid a card-width constraint derived from the content contract above
  and let the resulting number of columns vary by available width.
- Keep the load label and preset name unwrapped, with the Current badge and
  manage action placed without squeezing or clipping the primary label.
- Render `Queued Skills` as one summary row, then render the Workers/Scientists
  distribution as its own row immediately beneath it.
- When a card cannot satisfy this hierarchy, reduce the grid's column count
  before allowing the primary label to wrap or any content to clip.

**Acceptance**

- On iPad, compact devices and large desktop screens, the load label and preset
  name remain on one line without clipping or word-by-word stacking.
- `Queued Skills` occupies its own line, with Workers and Scientists together
  on the next line in every preset card.
- The grid may choose different column counts at different widths, provided
  every card preserves this hierarchy and remains visually balanced.
- All enabled locales remain usable; pseudo-locales are included in review, and
  the grid sheds columns when translated labels need more room.

#### D-09 — Double-click and double-tap Skill assignment

**Implementation**

- Add an explicit pointer gesture recognizer shared by mouse, pen and touch;
  do not depend solely on the browser's native `dblclick` event.
- A single activation continues to open Skill details.
- A double activation requests the same canonical purchase/queue action used
  by the details dialog.
- Confirmation-required, exclusive, cascading, locked, queued and
  non-refundable outcomes continue through the existing preview dialog; the
  shortcut never bypasses domain authority.
- Ensure the gesture cooperates with panning thresholds and the global native
  selection policy.

**Acceptance**

- Eligible no-warning Skills assign on double-click/double-tap.
- Warning-required Skills open the normal confirmation with no mutation until
  confirmed.
- Unavailable Skills explain or show their existing unavailable state without
  mutation.
- Slow taps, a pan beginning on a node and pinch gestures do not misfire.
- Gesture checks use the current panning implementation and do not depend on
  the deferred D-04 optimization.

### Workstream C: visual state stability

#### D-05 — Stable Double Infinity Points toggle

**Implementation**

- Keep the toggle's dimensions, label region and enabled/disabled styling
  stable across the pending projection.
- Present pending status without replacing the control with a visibly
  different state.
- Preserve controller serialization and rollback when runtime entitlement
  projection fails.

**Acceptance**

- Repeated toggles produce no card reflow, colour flash or transient opposite
  state.
- Success persists across route switches and reload; failure restores both the
  stored preference and runtime effect.

#### D-13 — Contained mobile Store offer actions

**Implementation**

- Stack each Store offer's action below its description at compact widths.
- Let the action fill the card's usable width while retaining the wider-screen
  side-by-side layout.
- Keep unavailable, price, owned and Double Infinity Points toggle states on
  the same stable control footprint.

**Acceptance**

- No Store action extends beyond its card or viewport on phone-sized screens.
- Labels remain centred and readable without squeezing the product copy.
- Wider tablet and desktop layouts retain balanced cards without unnecessary
  vertical stacking.

#### D-06 — Stable side-navigation icons

**Implementation**

- Keep a stable keyed link/icon subtree when a destination becomes current.
- Change semantic state and activation without swapping the icon's parent
  element type.
- Preserve `aria-current`, keyboard behavior, disabled destinations, progress
  bars and route-specific colours.

**Acceptance**

- Rapid route changes never blank an icon before recolouring it.
- Current-route semantics remain correct for screen readers and keyboards.
- Reduced-motion mode does not introduce a separate flash.

### Workstream D: Debug parsing and documentation

#### D-10 — Debug game-number parsing and resource caps

**Implementation**

- Extract the Standard suffix table into a shared immutable magnitude module
  consumed by both formatting and parsing, preventing vocabulary drift.
- Build an exact parser returning decimal/exponent information or a bigint,
  with structured failure reasons.
- Support the fixed input contract above, including optional `x`/`×` separators.
- Convert to `number` only at the continuous Cash, Bots and Offline Time
  boundary after finite-range validation.
- Keep Skill Points, Infinity Points, Quantum Shards, Influence and Strange
  Matter exact through their bigint boundary.
- Give each action resource-specific validation and cap feedback. Do not mark
  the shared field globally valid when the chosen action cannot accept it.
- Add explicit Set to cap actions for relevant resources.

**Acceptance**

- Equivalent Standard forms produce the same exact value.
- All formatter suffixes round-trip through the parser, subject to the target
  resource's legitimate domain cap.
- Values above a resource cap are rejected with the resource's formatted cap;
  they are never silently rounded or partially applied.
- Existing ordinary decimal workflows remain unchanged.

**Tests and evidence**

- Unit-test every suffix in mixed case and joined/spaced/`x`-separated forms.
- Cover grouped digits, fractional mantissas, exact scientific notation,
  malformed mixed separators, negatives, zero, non-integral discrete results,
  `Number.MAX_VALUE`, the discrete maximum and one step above each cap.
- Add DebugSurface action tests proving one input may be valid for Cash but
  rejected for a capped discrete resource with clear feedback.
- Add formatter/parser vocabulary parity so a future suffix addition cannot be
  made on only one side.

#### D-12 — Complete Offline Time Wiki overview

**Implementation**

- Replace the current three-sentence summary with player-facing sections for:
  earning and capacity; choosing time; Fast/Balanced/Accurate; processing and
  Speed Up; safe cancellation; systems intentionally frozen during replay;
  accuracy trade-offs; and completion results.
- Derive the mechanics from
  `docs/contracts/game-processing-and-offline-time-contract.md` without copying
  implementation-only detail into player prose.
- Update source and all enabled locale catalogs through the normal i18n
  workflow.

**Acceptance**

- The Wiki accurately explains current shipped behavior and contains no old
  automatic-replay or compensation semantics.
- Links/topic navigation, pseudo-locales and compact layouts remain usable.

## First-pass sequencing

The first pass should be implemented in this order to reduce overlapping edits
and make regressions easier to isolate:

1. Add shared test fixtures, viewport matrix and baseline device captures.
2. Implement D-03 so the progression contract is correct before visual layout
   work relies on teaser states.
3. Implement D-01, D-02 and D-11 as the responsive/safe-area batch.
4. Implement D-07, D-08 and D-09 together, preserving and regression-testing
   the current Skill Tree panning behavior.
5. Implement D-05 and D-06 as visual-state stability changes.
6. Implement D-10 with the shared formatter/parser magnitude vocabulary.
7. Implement D-12 only after the first pass has confirmed the current Offline
   Time behavior did not change.
8. Run complete validation, produce an evidence report and mark all successful
   active items **First pass ready**. D-04 remains in backlog for its separate
   agent and performance pass.

## Review workflow

After the complete first pass, review the active items individually in ID
order, skipping deferred D-04, unless a device-dependent grouping is more
convenient:

1. Present the before/after behavior, implementation summary and evidence for
   one item.
2. Record the result as **Accepted** or **Changes requested** in this tracker.
3. Apply requested refinements without disturbing already accepted behavior.
4. Re-run the affected focused checks plus any shared suite touched by the
   refinement.
5. Continue until all eleven active items are accepted. Review D-04 through its
   separate performance pass rather than folding it back into this batch.

No item is complete merely because its automated tests pass. Device-reported
behavior remains authoritative.

## Complete validation gate

Before declaring the first pass ready:

- Run focused unit/component/CSS tests for every changed surface.
- Run the complete Vitest suite, lint, i18n validation and production build.
- Run Android native sync/build and launch the debug package on the target
  Android device for regression coverage.
- Run the affected flows in Chromium and Safari/WebKit behavior where relevant.
- Perform iPad simulator checks for D-01, D-02, D-03, D-07, D-08, D-09 and
  D-11 in portrait and landscape, including split view where supported.
- Verify reload/persistence for D-05.
- Verify keyboard, focus, screen-reader semantics, reduced motion, touch target
  sizes and 200%/400% scaling on affected surfaces.
- Review the final diff for unrelated UI or save behavior changes.
- Update this tracker with evidence and flag any additional product,
  localization, release or workflow documentation changed by the work.

## First-pass evidence — 2026-08-28

- Complete Vitest suite: 203 files and 2,106 tests passed after the final
  responsive containment refinements.
- Production build, TypeScript, lint, production Store-boundary check, parity
  fixture check, i18n completeness and catalog compilation passed.
- All enabled locale catalogs remain complete; Standard-number input shares
  the formatter's complete magnitude vocabulary.
- Capacitor sync, Android Gradle debug build and iOS simulator build passed.
- The exact final bundle was installed and launched on an iPhone 16 Pro
  simulator, an iPad Pro 11-inch (M4) simulator and the connected Galaxy S25
  Ultra.
- Galaxy hands-on checks covered the progression teaser, Bots allocation,
  facility details and scrollbar, Skill search, Skill Presets, Wiki Offline
  Time sections, Debug gate, Store layout and compact navigation.
- iPad checks covered portrait and landscape Settings composition, safe-area
  placement, touch-sized sliders and contained select controls. iPhone checks
  covered compact safe areas, lower-region composition and navigation.
- The native Debug gate was intentionally not bypassed and unavailable Store
  products were not purchased. Parser/cap behavior and Double IP pending-state
  behavior are covered by component and domain tests without mutating player
  balances or ownership.

## Compatibility boundaries

- No save-schema change is planned.
- Existing saves, purchases, Skill presets, tree view behavior and Offline Time
  balances must remain compatible.
- Debug parsing is developer-facing and must not alter canonical numeric caps.
- Double-activation is a presentation shortcut only; canonical Skill commands
  remain authoritative.
- Teaser changes affect presentation visibility only, not facility unlock or
  purchase rules.
- Store visual stabilization must not weaken entitlement verification or
  rollback.
