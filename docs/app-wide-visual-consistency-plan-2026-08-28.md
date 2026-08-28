# App-wide visual consistency plan

Status: **Follow-up browser pass complete; ready for product review**

This plan covers the dedicated app-wide scale, spacing and surface-consistency
pass requested after the Discord todo first pass. It is intentionally separate
from the [Discord todo remediation plan](./discord-todo-remediation-plan-2026-08-28.md)
and from the deferred Skill Tree performance pass.

## Objective

Bring every route into one professional visual system without making the game
monochrome or forcing structurally different pages into the same layout. Bots
facility panels are the reference for ordinary interface density and visual
weight. Route colour, special visualization surfaces and reading-oriented
content may retain their identity.

## Fixed product decisions

### Typography and scale

- Use a small semantic type scale shared by every route: caption/meta, body and
  control text, card title, section title, and page/status title.
- Font weight, colour and italics may distinguish meaning without introducing
  another size.
- Bound resource-header, navigation and page-heading growth across phone,
  tablet and wide layouts so shell UI does not overpower page content.
- Preserve comfortable reading line-height for Story and Wiki within the same
  heading and body hierarchy.
- Treat the semantic sizes as shared defaults, not blanket fixed overrides.
  Preserve bounded adaptive sizing where the content and viewport genuinely
  require it, including the resource header.
- Let cards and panels derive their height from their content. A component may
  retain a local minimum interaction footprint only when its controls require
  one; there is no app-wide card-height rule.

### Spacing and layout rhythm

- Define shared roles for page gutters, compact card padding, roomy card
  padding, intra-card gaps, card-grid gaps and section gaps.
- At the same usable content width, Settings, Statistics, Store, Story, Wiki,
  Offline Time, Debug and progression routes use the same ordinary left and
  right content gutter.
- Use one vertical rhythm for space above the first ordinary panel, between
  sibling panels, between headings and supporting copy, and below the final
  scrollable item.
- Prevent nested components from accidentally doubling page or panel spacing.
- Base responsive changes on usable container width. Adding a side rail must
  not squeeze a page while its children retain a wide-screen arrangement.

### Borders, radii and surfaces

- Use one border hierarchy: subtle dividers and secondary surfaces, primary
  panel boundaries, and stronger focus rings that do not change layout.
- Constrain corner radii to a small set of semantic roles.
- Use route colour and content—not unrelated border widths or corner styles—to
  provide identity.
- Keep comparable cards and panels at comparable visual weight across routes.

### Edge-to-edge exceptions

- Bottom navigation, gameplay lower panels and other shell-owned bars may meet
  viewport edges where required for safe-area and interaction behavior.
- Ordinary route cards and content panels use the shared content gutter.
- The Skill Tree canvas and Dyson visualization may remain spatial surfaces;
  their surrounding shell, overlays, dialogs and controls use the shared scale
  and rhythm.

## Implementation workstreams

### V-01 — Foundation and shell

- Introduce semantic typography, spacing, gutter, border and radius tokens
  anchored to the current Bots facility-panel density.
- Replace viewport-proportional resource-header growth with bounded phone,
  tablet and wide roles.
- Give overlay navigation and permanent side navigation separate density rules.
- Reduce the visible scale of the permanent rail while preserving 44 CSS pixel
  touch targets and clear focus/hover states.
- Show the permanent rail from 1080 pixels, including iPad Mini landscape, and
  use a compact short-landscape treatment so all destinations fit without the
  rail overpowering page content.

### V-02 — Gameplay and progression routes

- Migrate Bots, Research, Infinity, Reality, Simulations and Quantum to the
  shared gameplay-card hierarchy and spacing roles.
- Retain route-specific colours and mechanics while aligning headings, metadata,
  controls, card padding, sibling gaps, borders and radii.
- Keep intentional lower gameplay panels edge-to-edge without double-applying
  safe-area or bottom-navigation spacing.

### V-03 — Utility and information routes

- Recompose Settings as one column at compact content widths and a deliberate
  two-column arrangement when its own content container supports it.
- Let each Settings column adapt its internal controls independently instead of
  treating the whole viewport as available width.
- Migrate Store, Offline Time, Statistics and Debug to shared utility-panel
  geometry and responsive grids.
- Apply the shared gutters, heading hierarchy, panel padding and border roles to
  Story and Wiki while retaining reading comfort.
- Ensure Settings and Statistics have identical ordinary horizontal gutters at
  the same usable width.

### V-04 — Skills and overlays

- Align Skill dialogs, search, presets and other overlays with the shared type,
  spacing, surface and control system.
- Preserve readable preset composition: reduce column count before primary
  labels wrap or clip, keep `Queued Skills` on its own line, and place the
  Workers/Scientists distribution on the following line.
- Do not include Skill Tree panning or rendering performance; that remains a
  separate backlog and profiling task.

### V-05 — Route-by-route refinement

- Review all ordinary, locked, empty, populated and late-game states for visual
  hierarchy rather than validating only the easiest state.
- Remove route-local near-duplicate measurements after their replacements are
  visually verified.
- Preserve deliberate exceptions in code comments or token naming so later work
  does not normalize them accidentally.

## Acceptance criteria

- Settings and Statistics have the same ordinary horizontal gutter at the same
  content width; every edge-to-edge surface is an explicit shell exception.
- Ordinary cards use the same compact or roomy padding roles and sibling-gap
  roles rather than route-specific near-duplicates.
- Primary panel borders have the same visual weight on every route. Internal
  dividers are consistently lighter and focus rings consistently stronger.
- Comparable headings, labels and supporting copy use the same semantic sizes
  across tabs.
- Resource totals, side navigation and page headings do not overpower content
  panels on tablet or wide layouts.
- The tablet-landscape rail transition does not create an oversized rail or
  header, or leave a squeezed page using desktop control composition.
- Route colours, reading comfort, special canvases and intentional edge-to-edge
  bottom panels retain their purposes.
- No horizontal overflow, clipped labels, unwanted one-line label wrapping,
  inaccessible touch targets or safe-area regressions are introduced.

## Validation and evidence

### Automated coverage

- Add CSS contract coverage for semantic tokens, shared gutters, border
  hierarchy, edge-to-edge exceptions and container-driven layouts.
- Retain focused component and interaction tests for any structure changed by
  the migration.
- Run the relevant focused suites during implementation and the full suite
  before the visual-system pass is presented for review.

### Browser matrix

- Review every available route in representative phone, tablet portrait, iPad
  Mini landscape and wide desktop configurations in the running Codex browser.
- Check Bots, Research, Skills overlays, Infinity, Reality, Simulations,
  Quantum, Store, Story, Wiki, Offline Time, Statistics, Debug and Settings.
- Exercise representative empty, populated, locked and late-game states.

### Native acceptance

- Native device and simulator testing is intentionally left to the product
  owner after this browser-complete pass is ready for review.
- The implementation pass must not depend on a single native screenshot: use
  the browser's fast device configurations to refine layout first.

### Visual review gate

- Capture and inspect before/after screenshots at every representative width and
  on each target device class.
- Compare related routes side by side for type hierarchy, gutters, vertical
  rhythm, card density, border weight and shell scale.
- Treat passing tests and computed CSS values as supporting evidence, not as
  substitutes for professional visual review.
- Do not mark the pass ready for product review until the screenshots have been
  inspected and visible regressions corrected.

## Tracking

| ID | Workstream | Status | Product review |
| --- | --- | --- | --- |
| V-01 | Foundation and shell | Follow-up pass complete | Review pending |
| V-02 | Gameplay and progression routes | Follow-up pass complete | Review pending |
| V-03 | Utility and information routes | Follow-up pass complete | Review pending |
| V-04 | Skills and overlays | Follow-up pass complete | Review pending |
| V-05 | Route-by-route refinement | Follow-up pass complete | Review pending |

## First-pass evidence

- A late-Quantum save was imported before route inspection so unlocked and
  populated content—not only early-game placeholders—was reviewed.
- Every available route was inspected at 390 x 844, 820 x 1180, 1133 x 744 and
  1366 x 900. No horizontal document overflow remained at those profiles.
- At 1133 x 744 the permanent rail is present, all destinations fit vertically,
  and the compact rail leaves the page as the dominant surface.
- Settings uses two columns only when its own content width supports them and
  returns to one column naturally on compact screens.
- Store action buttons remain contained on phone, tablet and wide layouts.
- Research and other ordinary cards retain natural content-driven heights.
- Skill Tree rendering and panning performance remains deliberately deferred to
  the separate performance backlog.

## Second-pass evidence

- Introduced role-specific route inset, section stack, panel inset,
  control-row, related-copy and divider tokens while retaining aliases for
  components that have not yet needed structural migration.
- Rebuilt Settings wide layouts as two independent content stacks. Audio and
  Game Processing use compact control grouping; Navigation Shortcuts is one
  full-width wrapping collection. Compact layouts keep the logical single-stack
  reading order and content-driven heights.
- Unified overlay-drawer and permanent-rail visual density. Tablet landscape
  receives the permanent rail from 960 CSS pixels while similarly wide portrait
  layouts retain the compact overlay drawer.
- An initial revision put the Research multitasking summary beside researcher
  production. Product review rejected that composition; the follow-up pass now
  stacks production above `Workers and Scientists efficiency at 100%`, matching
  the Bots information order.
- Visually reviewed Reality, Simulations, Story, Wiki, Offline Time,
  Statistics, Debug, Settings, Store, Bots, Research and Facility Details at
  phone portrait, phone landscape, tablet portrait, iPad landscape and wide
  desktop dimensions. Sparse routes retain empty space after their content
  rather than stretching panels.
- Corrected Store's doubled shell-and-route inset by making its route-owned
  scroller explicitly edge-to-edge at the shell boundary. A rendered audit of
  every route, including Offline Time and Avocato, confirmed no other page had
  the same duplicated shell padding.
- Final screenshot evidence is stored under `output/visual-consistency/`,
  including `second-pass-tablet-portrait-drawer.png`,
  `second-pass-ipad-landscape-research.png`,
  `second-pass-wide-settings.png` and `second-pass-phone-store.png`.
- Automated validation: 2,107 tests across 203 files passed; `npm run lint`
  passed; the production build and Store boundary check passed. The sandboxed
  build required a permitted rerun because TSX could not create its IPC socket.
- Native acceptance remains intentionally unperformed and belongs to the
  product owner after this browser pass.

## Second-pass implementation

The first review found that sharing individual values did not yet produce a
shared composition. This pass therefore standardized spatial roles and route
structures before applying further local polish. It preserves natural
content height and use optical judgement as well as numerical equality.

### S-01 — Define spatial roles, not one universal gap

- Separate the current broad spacing variables into explicit roles: route edge
  inset, section stack gap, panel inset, control-row gap, related-copy gap and
  divider inset.
- Make every scrolling route begin with equal leading, trailing and top route
  inset, and end with the same inset plus any safe area.
- Use smaller gaps within a related control group than between sibling panels.
- Keep interactive targets large through their hit area without turning the
  visible control row into excess whitespace.
- Do not stretch cards or panels to fill a short page. Empty space belongs after
  naturally sized content, not inside cards or between unrelated grid rows.

### S-02 — Rebuild Settings as independent content stacks

- Replace the row-coupled two-column grid with two independently flowing column
  stacks when the Settings container is wide enough. A short card in one column
  must not inherit dead space from a tall card opposite it.
- Preserve one logical reading order and a single stack at compact widths.
- Tighten Audio and Game Processing internally: compact the space above, between
  and below slider rows while retaining at least a 44 CSS pixel touch target.
- Treat Navigation Shortcuts as one full-width collection, not a descriptive
  left pane plus an unrelated right pane. Place its toggles in one compact
  wrapping grid whose columns are determined by readable item width.
- Review every Settings panel individually for optical density rather than
  inheriting one generic panel layout.

### S-03 — Unify overlay drawer and permanent rail density

- Give overlay drawers one compact scale at every width; remove the 721–1079px
  oversized menu treatment.
- Give the permanent rail its own compact variant instead of inheriting drawer
  dimensions.
- Standardize menu heading, icon, label, row, gap, padding and width roles while
  retaining minimum touch targets and height-aware fitting.
- Verify the drawer and rail at every width/orientation transition, including
  550, 964, 1079, 1080 and 1100 CSS pixels.

### S-04 — Align shared lower gameplay chrome

- Use the Bots lower bar as the alignment reference for Research and other
  gameplay tabs.
- Align production values to the leading edge.
- Keep the multitasking efficiency text in the same information row as the
  Researchers production text instead of centring it on a separate line.
- Preserve edge-to-edge lower chrome and safe-area handling.

### S-05 — Route-by-route composition migration

- Reality: normalize the worker-stage outer inset, inter-panel gap, internal
  padding and type hierarchy; retain its specialized artifact composition.
- Simulations: align era headers and facility cards with the Bots density while
  retaining simulation colours and content-driven empty space.
- Story: introduce a deliberate reading rhythm for chapter-to-chapter,
  heading-to-copy and paragraph-to-paragraph spacing instead of reusing card
  grid spacing.
- Wiki: separate the list/detail pane gap from each pane's internal inset and
  let short article content size naturally.
- Offline Time: align route inset, panel inset, control grouping and section
  separation with the shared roles.
- Statistics: normalize outer inset, sibling-card gaps, internal dividers,
  header padding and border weight without reducing data scanability.
- Debug: use the same utility-page scale as Settings and Statistics, with a
  denser action grid and clear grouping between destructive and ordinary tools.
- Facility Details: retain the composition that already reads well, then verify
  it against the same panel, divider, control and touch-target roles at phone,
  tablet and desktop widths.

### S-06 — Optical review and responsive acceptance

- Use the imported late-game save and inspect every available route at phone,
  tablet portrait, medium landscape, rail threshold and desktop profiles.
- Compare screenshots in matched sets: outer edge inset, sibling-panel gap,
  panel inset, text hierarchy, border weight and control height.
- Check both content-rich scrolling states and sparse states. Rich states must
  have consistent scroll-edge rhythm; sparse states must not be artificially
  stretched.
- Add computed-style assertions for the structural contracts, but require
  screenshot review before calling any route ready.
- Keep native acceptance with the product owner after the browser pass.

### Review findings covered

- Menu scale and cross-orientation consistency: comments 1 and 20.
- Settings scale, optical density, slider rhythm, dead grid space and Navigation
  Shortcuts composition: comments 2–7.
- Lower gameplay alignment: comments 8–9.
- Reality scale and spatial rhythm: comments 10–12.
- Simulations scale and spatial rhythm: comment 13.
- Story, Wiki, Offline Time, Statistics and Debug composition: comments 14–18.
- Facility Details cross-profile verification: comment 19.

### External guidance applied

- Apple Human Interface Guidelines: preserve hierarchy, alignment, logical
  grouping, safe areas and recognizable adaptation across resizable contexts.
- Android adaptive design guidance: respond to the available app window, change
  composition when needed and do not merely stretch controls into extra space.
- WCAG 2.2 target-size guidance: maintain usable pointer targets and adequate
  separation without requiring the visible artwork of every control to be tall.

## Follow-up implementation and evidence

- Basic and Mega facilities now share one responsive sequence. Matrioshka
  Brains follows Planets in a two-column layout rather than starting a separate
  row, and Mega production cards use the same production-progress treatment as
  ordinary facilities.
- Research facility cards follow the corresponding facility's canonical
  visibility. Mega research appears when its facility is visible, while
  Durability and the always-available general research remain independent.
- Research is unavailable on a genuinely fresh run until the first facility is
  visible, then remains permanently available after the first Infinity.
- Infinity becomes available as soon as the first run reaches the ordinary
  Infinity threshold, so the manual reset path remains reachable while Auto
  Infinity defaults off.
- Infinity upgrade cards use `Owned` for repeatable counts and `Maxed` for every
  completed one-time purchase. A device-local, default-off `Hide maxed
  upgrades` control filters completed cards.
- Automated facility purchase buttons show `Auto` while their facility is
  automated, without hiding the cost.
- Skill details use the shared compact dialog scale. A numbered preset switcher
  spans its own row immediately above tree search; the search field and fixed
  square zoom controls share the second row without stretching vertically.
- Infinity's default-off `Hide maxed upgrades` control lives inside the raised
  purchase-settings panel, matching the Bots and Research settings pattern.
- Once automation is unlocked, Bots and Research settings permanently expose
  every baseline control through Planets. Each megastructure purchase and
  research automation control appears permanently after that individual
  Quantum unlock, independent of the current Infinity cycle's card visibility.
- Tinker and Simulation permanent-upgrade cards now use the same card density,
  border weight and text hierarchy as ordinary gameplay cards; Simulation
  purchase actions display only their currency and cost.
- Simulation facility cards no longer reserve space for a `Details` action.
  Research effects remain visible on their cards, while a persistent
  default-off `Show formulas inline` control in purchase settings reveals the
  small amount of additional calculation detail directly beneath each card's
  full-width progress content.
- The collapsed Bots and Research control bars now share the same 47 CSS pixel
  outer height, 46 CSS pixel control row, responsive production typography,
  efficiency-line weight, summary inset and 44 CSS pixel Settings target.
  Allocation sliders and expanded settings retain their own spacing.
- Browser inspection used the imported late-game save at 1280 x 720, 1133 x
  744, 896 x 998 and 550 x 998. The iPad Mini landscape rail measured 172 CSS
  pixels, the phone Store had no horizontal overflow or bottom-shell gap, and
  the combined facility flow showed Planets, Matrioshka Brains and Birch Planets
  in one uninterrupted grid.
- Native testing remains intentionally assigned to the product owner after this
  browser review gate.
- Navigation now shows unassigned Skill Points beside Skills in the drawer and
  as a compact top-right icon badge outside the Skills route. The badge remains
  inside the navigation paint area and inherits the active route palette.
- Progression destinations receive a persistent device-local highlight when
  they transition from locked to unlocked; visiting the destination clears the
  highlight. Existing mature saves initialise without marking every available
  destination as new.
- After the first Infinity, all baseline facility cards through Planets remain
  visible across later resets. Megastructure cards become permanently visible
  from their individual Quantum unlocks, and the megastructure `????` teaser is
  no longer used.
