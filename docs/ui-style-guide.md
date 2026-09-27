# Gameplay UI style guide

Read this before changing gameplay UI or player-facing copy. Use it alongside
[the UI foundation contract](contracts/product-ui-foundation.md), not as a new
visual system. Current shared components and `src/ui/tokens/tokens.css` own the
implementation and numerical values. Matthew's explicit design decisions take
precedence; update this guide when a decision becomes a shared convention.

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
- Existing authored skill-tree spacing and icon optical sizes are separate
  layout rules; do not force them onto a text-card spacing scale.

## Colour, icons and progress

- Reuse the route's `--theme-*` palette and semantic text/state colours. No new
  hardcoded colours, arbitrary opacity or accent meanings for routine features.
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
5. Save representative screenshots and inspect them. Reset temporary viewport
   and text-scale overrides. Report the states and hosts actually checked;
   browser QA does not establish native device acceptance.

Do not add screenshot or CSS-literal unit tests for every cosmetic edit. Use
focused behavioural coverage for real regressions, plus actual visual inspection.

## Bots preset shortcuts

Reuse the Skills preset control, with five buttons per row and its confirmation flow. In Bots,
place it immediately above Active/Lifetime/Decayed. Expanded purchase settings
show it; the independent, device-local “Always show preset quick actions” toggle
(default off) also keeps it visible when collapsed. The run-facts toggle does not
control these buttons. Keep preset colours, names, selected states and keyboard
focus consistent between both entry points. Skills settings can reveal presets
6–10 as a second row on both screens. Hiding that row preserves its saved presets.
Use the same compact button height on both screens. Bots purchase settings expand
upward to fit their content rather than using the shared short scrolling height cap.
The preset management dialog remains scrollable on small screens with hidden
scrollbar chrome. The ten preset colours are distinct choices, not subtle shades
of the original five; each slot has its own default colour.
