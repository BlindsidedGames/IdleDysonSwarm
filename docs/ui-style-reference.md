# Gameplay UI detailed reference

Open only the sections applicable to the component being changed. These detailed
rules retain their authority; they are not alternate designs. Start with the
[compact mandatory guide](ui-style-guide.md), not this entire document. Audit and
history are optional evidence, not routine context.

## Authority and four reference screens

**The four references are Bots, Research, Infinity and the Skill tree.** Bots
facility panels set ordinary density and visual weight; Research demonstrates
aligned purchase cards and production summaries; Infinity demonstrates persistent
progress and upward settings; Skill tree owns spatial nodes and detail learning.
“Entity” is resolved as Infinity. Transcendence has its own standard below and is
not a fifth ordinary reference or accidental drift.

The existing [August 28 app-wide plan](app-wide-visual-consistency-plan-2026-08-28.md)
already makes this choice. Its implementation is traceable to `77751d89`
(semantic UI roles), `e23d3b88` (Bots/Research docks), `d5cca2b1` (shared progress
controls) and `fb92966f` (currency presentation). The foundation contract governs
architecture/accessibility; current runtime tokens and shipped assets govern
actual numerical colour/font values. Its older reference palette and variable
Lexend prose are stale, **not alternate standards**. No new colour or font is
approved here.

Explicit current user requirements override historical prose. A prototype or
assistant proposal is not acceptance. See the separate [current Simulations
specification](plans/simulations-current-specification-2026-10-08.md): the Forager icon/quantity baseline at `45c13564` is accepted, while its compact
focus correction remains under review. `41cecf64` Forager
is not a visual baseline.

## Choose the named pattern by its job

| Pattern | Use it for | Required reference and composition |
| --- | --- | --- |
| **Dense gameplay** | Ordinary activities, facilities and purchase lists | Bots/Research: compact identity, primary production/value, short supporting detail, aligned action and any cycle track. Content determines height; shared padding/gaps and comparable optical weight |
| **Persistent progress dock** | Always-visible progression/status with secondary configuration | Infinity: summary left, full-target settings control right, settings expand above; primary resource totals retain their resource-header placement |
| **Spatial skill tree** | Skill/augment graph navigation and selection | Existing Skill tree: authored coordinates, contained node artwork, camera pan/zoom, native labelled node buttons and ordinary details. Do not convert to a card grid |

Do not choose a larger Discovery bar, generic progress layout or a bespoke row
merely because its CSS already exists. Existing specialist and grandfathered
usages are classified in the [audit appendix](audits/ui-design-system-audit-2026-10-08.md).
For new ordinary UI, start from Dense gameplay and extend only what the actual
user requirement needs. Preserve existing approved specialist screens.

## Ordinary typography and spacing

Use Lexend's shipped 400/600/700 faces and locale-specific body families. Use
regular 400 for explanation, 600 for secondary values/control emphasis, 700 for
identity/headings/primary values. Numeric values use the shared tabular-digit
family and formatter. Weight and colour distinguish meaning before adding a new
size. New ordinary card identity uses `--ui-text-card-title` (.9rem × text
multiplier); page/section headings use their semantic roles.

The **Dense gameplay** value/detail roles are the established Bots/Research
production .8rem × text multiplier at 600, and supporting .67rem × text multiplier
at 400. Keep their reference line heights: titles 1.12; production about
1.1–1.14; short supporting copy about 1.12–1.18. These compact roles serve
comparison rows; ordinary expanded prose uses the .82rem body role and body
line height. Do not turn all supporting copy into tiny metadata or all titles
into page headings.

| Shared role | Source coefficient, multiplied by `--game-text-scale` |
| --- | ---: |
| Meta / body / control | .72rem / .82rem / .84rem |
| Card / section / page title | .9rem / 1.05rem / 1.25rem |
| Dense production / supporting detail | .8rem / .67rem |

Reuse `--game-card-content-inset` .45rem and `--game-card-grid-gap` .35rem for
ordinary dense card interiors/lists; `--ui-card-gap` .4rem within ordinary content;
`--ui-control-gap` and `--ui-related-copy-gap` .25rem for related items. Route/section
insets are .5rem; panel/divider insets .6rem. Use one separation mechanism per
relationship. Do not double a gap with margins and padding. Match Bots' visual
weight before adding another decorative border/panel. Expanded reading/dialog
content may use the established roomy inset and body hierarchy.

Source anchors: [tokens.css](../src/ui/tokens/tokens.css), lines 83–157;
[facilities.css](../src/ui/gameplay/facilities/facilities.css), 132–189;
[research.css](../src/ui/gameplay/research/research.css), 108–153. The appendix
contains the complete numerical scale matrix and calculation basis.

## Scaling and interaction geometry

Desktop **Interface size** is device-local, .8–1.5 in .05 steps, default 1; it
changes root font size, so rem spacing/targets/bars change too. The separate
`--game-text-scale` multiplies semantic text (and explicitly authored specialist
heights) without generally multiplying spacing/targets. `em` icons follow their
surrounding type. Browser zoom and Skill tree camera zoom are separate mechanisms.
Do not substitute a 130% text override for checking the actual Interface setting.

Rows grow for content and translation; there is no universal fixed card height.
Ordinary buttons/disclosure rows use the shared minimum 2.75rem and touch role
3rem, but the product requirement is **44×44 actual CSS pixels, preferably 48×48
on touch**. At 80% root the 2.75rem token alone shrinks below that requirement.
Measure actual hit rectangles; record the existing gap and resolve it only in
an authorized scoped change. Do not shrink targets to make icons look compact.
Safe areas use the shared maximum of browser/native insets, logical edges and
the shell navigation reservation. Avoid double-counting the bottom inset.

## Compact symbols, numbers and learning

Prefer icon + quantity to redundant resource words in compact comparisons.
Reuse `InlineResourceAmount`: **baseline alignment, .16em intra-pair gutter and
LTR-isolated numeric bdi**, with shared formatting. Separate independent pairs
using the existing semantic card/control gap. Reuse `InlineImageSymbol` ordinary
.92em height, natural aspect ratio, contained tint mask and −.08em baseline.
Infinity's .06em optical correction is specific to its artwork. Inspect actual
symbols at minimum/default/enlarged sizes; transparent boxes alone do not prove
readability. Do not copy the rejected Forager 1.1em/.15em rules as a new standard.

Forager has a scoped readability iteration following explicit user feedback:
activity-header symbols use 1.1rem × text scale (17.6px by default), with
Food/Materials at 1.12× that size;
the existing top resource dropdown exposes a named legend at 1.3rem × text scale.
The ordinary .92em size remains the shared default and the collapsed stock/dock
role. This local exception preserves aspect ratio. Activity-header pairs centre
icons and quantities; recipes use body text at medium weight, a .12em number
gutter and the existing section gap between resources. Shared baseline/.16em
geometry remains the default elsewhere. The user accepted this local
icon/quantity baseline at `45c13564`; it does not redefine other screen roles. See the
[current Simulations specification](plans/simulations-current-specification-2026-10-08.md#resource-legend-and-readability-iteration).

Stock is what the player holds; cost is what starting/purchasing requires;
output/reward is what completion produces. Keep stock in the resource summary
and costs/outputs beside their activity/action. Do not infer one from another.
Research's projected-effect triangle `▶` (U+25B6) is the established conversion
mark; keep it distinct from the disclosure chevron. Use direction in compact
recipes and explicit localized Input/Output names in
details, not colour alone. New recipe composition must follow the Simulations
specification rather than a generic cost/timer header.

**Hover is never the only way to learn meaning.** Tap/click or Enter/Space on the
existing full-row `details/summary` or `CollapsibleSection` opens visible localized
names, quantities and mechanics. Skill nodes open ordinary skill details.
`title`, alt and accessible labels supplement that path; they do not teach a
sighted touch player by themselves. Do not add tiny icon buttons, long-press-only
learning or new hover bubbles. A new touch popover is an open shared-pattern gap,
not already approved work.

## Controls, progress and state

Reuse `Button`, native disclosures/shared `CollapsibleSection`, existing segmented
quantity controls and `ProgressControlsPanel`. Preserve full-row hit targets,
visible selection/focus, labelled states and keyboard/touch activation. Focus
options remain exposed in the active-era bottom panel when the screen requires
that; do not hide the choices in a selector or put them at the top. Simulations
focus is a single-choice radio group presented as raised tabs: every option has
a bordered surface and outward shadow; the selected tab is prominent, never
sunken. Reuse Research quantity surfaces and the shared Infinity settings
control's outward shadow, preserving radio keyboard behavior. The user's
Forager height correction explicitly chooses Bots presets' 2rem minimum
(32px at default scale) for focus. Actual hit height is also 32px, below shared
44px guidance; widths remain at least 44px. Other Forager disclosure/Settings
targets retain 44px minimums. See the current specification's
[Bots-height focus correction](plans/simulations-current-specification-2026-10-08.md#bots-height-focus-correction)
for measured reference and before/after dock heights. Focus still stays visible
when Settings collapses; a further collapse change awaits clarification.

**Ordinary cycle track:** begin with Bots' .72rem track, modest .2rem rounding,
dark track and 1px border aligned to its Details control. Preserve compact
supporting space rather than increasing card height. New cycle rows require
meaningful current/max/text semantics and a clearly associated timer.

**Persistent progression track:** Infinity's .48rem track, 1px border and .2rem
radius belongs in the bottom dock. Its heading/status stays compact and readable;
configuration opens upward without hiding the status/settings control. A
logarithmic milestone remains incomplete until exact gates pass; animation
never owns the award. Generic `Progress` is a semantic primitive, not authority
for choosing the recipe/timer composition. Preserve existing callers of other
tracks; new ordinary work does not choose among them arbitrarily.

Route page/panel/selected/divider/accent variables own surfaces and selected
controls. Current shared ink: primary #f7f4f8, secondary #c4bfc8, positive #91dd8f,
orange value #ffa45e, negative #ff6b6b, cyan focus/highlight #00e1ff. Warning is
**yellow #ffeb3b**. The requested Simulations missing/sufficient input states use
orange value/green positive, not the warning token. Explain state without colour
and retain forced-colour meaning. Preserve established disabled-flat and
available-action lighting treatments; never give locked requirements active-looking
controls. Canonical data owns reveal, costs, outputs and award checks.

## Skill tree: protected spatial standard

Preserve 76px square nodes with 7px padding, contained artwork, authored graph
coordinates/180-unit layout spacing and the existing camera. Current camera
range is .4–2.5 desktop, .4–1.5 mobile, default .8; these are spatial units, not
ordinary app spacing or recipe icon sizes. Do not resize nodes to match cards.
Keep pan/pinch distinct from activation, drag-cancel suppression, native labelled
buttons, selection and details. The player's optional double-activation setting
must not remove single-selection learning or keyboard access.

Desktop fine-pointer skill hover remains an enhancement: bold title 700, short
technical body 400, smaller .85em formula, SP cost and potential augment symbol
at 1.05em. Do not reproduce it for ordinary resource icons. Skill dialog/header
artwork keeps its own palette and optical compensation. Node controls, presets,
search and dialogs still obey common readable copy, formatting, touch/keyboard
and focus principles. The small-camera target gap is recorded, not automatically
accepted as accessibility compliance. Source and exact spans are in the appendix;
this revision audited source, not new native skill-tree pixels.

## Transcendence: separate specialist standard

The user explicitly confirms a different Transcendence standard. Preserve the
approved Discovery/Transcendence purple/Avocato family and its **three inset bars
in one panel**: time inside left, benefit inside right, associated icon immediately
outside right. Main bar is 2.5rem × text multiplier; supporting bars 1.8rem × text
multiplier, with their existing contained symbols and .4rem rounding. Preserve
its native full-panel disclosure and visible localized tier/speed details.

Do not normalize this to Bots' .72rem cycle rows, and do not use it as an ordinary
activity-row alternative. It shares common accessible semantics, formatting,
scale awareness and mobile learning while retaining the specialist composition.
The current rework wrapper may add gating/content; this documentation approves
no new Transcendence composition or mechanics.

## Acceptance and exceptions

Before editing, name which of the four references supplies the ordinary pattern,
or name the protected Transcendence variant. Compare the actual reference screen
at the **same usable width and scale**. Reuse its component/roles; a nearby local
measurement is not evidence of another approved standard.

Before declaring UI complete, operate and inspect:

- Fresh/mature, running/waiting/locked, selected/unselected, collapsed/expanded
  and confirmation states; reach the last row clear of dock/navigation.
- Applicable desktop Interface sizes 80/100/130/150%; separately 360×800 at 130%
  text multiplier, 320×568 enlarged text, portrait/compact landscape, and long
  German or relevant expanded LTR/RTL. Check 200% text and 400% browser zoom
  according to the foundation; do not equate them with camera zoom.
- Tap learning without hover/title, Enter/Space, visible effective focus,
  localized icon/quantity labels, actual target bounds, safe areas and native
  interaction semantics. Check reduced-motion and colour-independent state.
- Representative screenshots **beside the relevant reference**, at actual
  runtime size. Inspect hierarchy, icon optical bounds/baselines, gutters, track
  and timer composition, overflow and final control reachability. Name the
  engines/hosts actually checked; browser evidence is not native certification.

For a genuinely missing pattern, record the user need, closest reference,
reason reuse is insufficient, exact departure, touch/keyboard behavior and
approval status in the scoped spec/PR. Existing authorization may cover it;
assistant proposals and prototype pixels do not. Do not make the user choose
arbitrary sizes already established. This guide/AGENTS hook is a review process,
**not automatic enforcement by prose**. No application redesign is authorized
by this documentation revision.

## Copy: show the useful fact

- Keep visible text short, concrete and player-facing. Prefer the name, value,
  cost and action over a paragraph explaining the surrounding system.
- Do not add tutorial introductions, generic reassurance, redundant captions,
  implementation details or routine reset explanations beneath gameplay values.
- Put optional formulas and supporting mechanics in the existing Details or
  expandable area. Essential purchase consequences belong in the confirmation.
- Confirm irreversible purchases, resets and record deletion concisely; state
  what changes or is lost. Do not repeat an entire feature description.
- Technical skill descriptions explain the effect, condition and necessary cap.
  Retain **“Bonuses are additive.”** for additive effects. Flavour text can be
  quirky; it should not become a second technical description.
- Use existing resource symbols, number formatting and terminology. Do not add
  redundant currency words or punctuation where the established icon/value
  pattern already conveys them. Keep accessible labels explicit.
- Localize new and changed strings through the existing catalogs. Verify long
  translations; do not solve wrapping by making text smaller or truncating it.

## Composition: one clear hierarchy

- Start from the closest existing screen and its shared components. Match its
  optical density, alignment, control placement and expansion behaviour.
- **Do not put decorative panels inside panels.** Within a category use headings,
  spacing, rows and dividers. A collapsible purchase category should reveal its
  ordinary purchase cards without another enclosing card surface.
- Keep primary values and actions visible. Put supporting information behind a
  native, keyboard-operable disclosure; make the whole intended header/card the
  trigger rather than adding a stray information button.
- Expanded confirmations need clear separation from the preceding content and
  an aligned action row. Check the expanded state, not just the closed card.
- Checkbox labels use the full row, including text and spare width, as the hit
  target. Keep the existing minimum target height and a 1.35rem checkbox; Skills
  settings use the same padded, theme-coloured label treatment as Settings.
- Keep the timestamp-export checkbox inside Export Save, beside the file action,
  rather than on the Settings save panel.
- Let content determine height. Avoid empty filler, stretched cards and fixed
  heights that clip translations or enlarged text. Preserve usable hit targets.
- Preserve approved specialist compositions: Facility Details has numbered
  calculation stages; Discovery has its inset progress tracks. These are not
  permission to add nested panel decoration to other screens.

## Spacing and type: reuse semantic roles

Use these existing tokens rather than choosing a new nearby value per element:

| Relationship | Token |
| --- | --- |
| Route edge inset | `--ui-route-inset` / `--ui-page-gutter` |
| Separate sections | `--ui-section-stack-gap` / `--ui-section-gap` |
| Panel interior | `--ui-panel-inset` |
| Dense facility/purchase grid | `--game-card-grid-gap` |
| Dense card interior | `--game-card-content-inset` |
| Ordinary card content gap | `--ui-card-gap` |
| Controls in one group | `--ui-control-row-gap` / `--ui-control-gap` |
| Related label and copy | `--ui-related-copy-gap` |
| Divider inset | `--ui-divider-inset` |

- Do not compound child margins, parent gap and panel padding for the same
  separation. Related content should be closer than unrelated sections.
- Reuse `--ui-text-*` roles and the player's `--game-text-scale`. Keep numbers
  stable and align comparative values consistently.
- Drawer balances and timers use the shared navigation status style, aligned to
  the trailing edge like the other drawer values (including wrapped lines). Separate
  Offline Time's quick-use controls from its main button with the same gap as
  neighbouring navigation buttons, including compact-height layouts.
- Existing authored skill-tree spacing and icon optical sizes are separate
  layout rules; do not force them onto a text-card spacing scale.

## Colour, icons and progress

- Reuse the route's `--theme-*` palette and semantic text/state colours. No new
  hardcoded colours, arbitrary opacity or accent meanings for routine features.
- Hover tooltips are limited to skill-tree nodes. Use the approved bold title,
  ordinary-weight short technical description and smaller formula footer when
  present. Put the existing SP icon and cost at the top right; immediately before
  it show the flat white augment symbol and total potential subtree count,
  including before fracture. Hide a zero augment badge. Preserve accessible
  names and essential visible facts elsewhere without creating hover bubbles.
- Desktop skill tooltips follow the pointer into the opposite screen quadrant,
  stay inside the viewport, and reuse the corresponding skill-detail palette.
  Interface size uses the existing processing-slider style and a Default reset.
- Infinity keeps both point totals at their established size. Fit only the
  production-boost suffix on one line; retain a readable text floor and align
  shrinking text with the totals’ baseline.
- A dialog with its own palette must use it for close/back and secondary buttons
  too; do not inherit mismatched controls from the route underneath it.
- Discovery/Transcendence uses the approved purple/Avocato family, not the retired
  Science palette. Keep its three bars in one panel: time on the left, benefit
  inside on the right, associated icon immediately outside the right edge.
  Supporting bars are shorter than the main Discovery bar.
- Use primary text colour for readable timers and important values. Muting is
  for secondary or inactive content, not an excuse for illegible icons.
- Preserve icon aspect ratio, optical weight and transparent bounds. Inspect at
  actual runtime size. Follow [the artwork workflow](skill-icon-artwork.md) before
  changing artwork; begin with high-resolution masters.
- Progress motion is presentation only. Respect reduced motion; never delay or
  duplicate a gameplay reward to match an animation.
- Facility progress bars use the spare space above them instead of increasing
  card height. Match the Details button's black border and modest corner rounding,
  with both outer bottom borders aligned.
  Use the same gap between the bar and Details as between Purchase and Details.
- Enabled purchase/action buttons use the shared diagonal lighting tokens over
  their existing route colours: Research, Infinity, Quantum/challenges, Reality,
  Simulations, Avocato, Store, Offline Time and Settings. Use the softer dark-surface
  treatment for white-text buttons; preserve text contrast and semantic danger colours.
  Keep the gradient through hover/press, and omit it in forced-colour mode.
  Light actions keep dark text and an accent-based pressed fill; do not pair dark
  selected fills with dark text. Costs and labels inherit the same readable ink.
  Disabled purchases and disabled Details controls stay flat. Navigation, disclosures, quantity selectors,
  skill nodes and presets retain their existing designs.
- Store actions use a softer pink, mixed towards the selected surface, with
  gentler diagonal lighting than ordinary purchase buttons.
- Facility Details buttons and filled progress use the same approved lighting;
  the progress track stays dark.

## Scrolling and layering

- Main gameplay content scrolls **without a visible scrollbar**. Challenges,
  Transcendence, Quantum, Avocato, Bots and other route content should follow
  the established treatment. Hide the chrome, never the scrolling:

  ```css
  .route-content {
    min-block-size: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .route-content::-webkit-scrollbar { display: none; }
  ```

- Apply this to the actual scrolling container, not an arbitrary ancestor.
  Preserve wheel, touch and keyboard scrolling, and ensure the last action can
  scroll clear of navigation and safe areas. Do not use `overflow: hidden` to
  conceal a scrollbar on content that needs to scroll.
- Do not blanket-hide every scrollbar in the app. The existing side menu's thin,
  theme-coloured scrollbar and scrollable detail dialogs are deliberate patterns.
  Reuse them in those contexts; avoid browser-default chrome on new route bodies.
- Keep background galaxies/art behind headers and opaque content. Check stacking
  while scrolling, with drawers and confirmations open.

## Required visual check before calling UI work done

1. Read the closest existing screen and relevant styles before editing. Identify
   which shared components/tokens apply and any approved exception.
2. Use a disposable save to operate the changed UI: expand details, open the
   confirmation, reach the last item, and try the changed action where safe.
3. Inspect desktop and **360px width with 130% game text scale**. Also respect the
   foundation contract's broader responsive/accessibility requirements. Include
   a long translation when text changed. Check spacing, contrast, icon bounds,
   scroll chrome, overflow, focus and the final reachable control.
4. Check related surfaces: an augment may also change Bots details, assignment
   previews, Simulation output, Wiki copy or a reset confirmation. A correct
   calculation is not enough if its explanation is stale.
5. For applicable desktop hosts, review Interface size 80%, 100%, 130% and 150%
   separately from the 130% CSS text multiplier. Measure actual target rectangles
   (minimum 44×44 CSS pixels, preferably 48×48 on touch). Include 320×568,
   390×844, 768×1024, 1440×900 and compact landscape where the shared layout
   changes; check 200% text resizing and 400% browser zoom per the foundation.
   Include a long locale and relevant expanded LTR/RTL, safe areas, reduced motion
   and effective focus. Learn every unfamiliar icon using touch and keyboard
   without hover or native titles. Record any uncovered state rather than a pass.
6. Save representative screenshots and inspect them. Reset temporary viewport
   and text-scale overrides. Report the states and hosts actually checked;
   browser QA does not establish native device acceptance.

Do not add screenshot or CSS-literal unit tests for every cosmetic edit. Use
focused behavioural coverage for real regressions, plus actual visual inspection.

## Wiki Credits

Matthew approved the Credits content and rendered layout on 5 October 2026,
after reviewing the version 2 screenshots with Kad and Clémentine included.
Credits is an always-available Wiki topic. Preserve its existing Wiki palette,
role headings and section dividers, with two columns of names on desktop and
one column on narrow screens.

- Lead developer: Matthew Rushworth.
- Sound: Technishift.
- Special mentions, in reading order: MatHeadGetz, Nuclearion, Stupidophobia, Gudu,
  wiabobber, Wolfh, QUACKERS, Holg, Latimer Cross, Mentojacka, VashVash, Kad,
  Clémentine. Preserve spelling, case and accents; list each name once.

## Bots and Research preset shortcuts

Reuse the Skills preset control, with five buttons per row and its confirmation flow. In Bots,
place it immediately above Active/Lifetime/Decayed. Expanded purchase settings
show it; the independent, device-local “Always show preset quick actions” toggle
(default off) also keeps it visible when collapsed. The run-facts toggle does not
control these buttons. Keep preset colours, names, selected states and keyboard
focus consistent across Skills, Bots and Research. Research uses the same layout
above its production summary, with its own independent visibility toggle. Skills
settings can reveal presets 6–10 as a second row on all three screens. Hiding that
row preserves its saved presets. Use the same compact button height everywhere.
Bots and Research purchase settings expand
upward to fit their content rather than using the shared short scrolling height cap.
The preset management dialog remains scrollable on small screens with hidden
scrollbar chrome. The ten preset colours are distinct choices, not subtle shades
of the original five; each slot has its own default colour.
