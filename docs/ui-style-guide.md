# Gameplay UI standard: mandatory core

Read this core before UI work; then open only the applicable linked section and
component source. Do not routinely load the full reference, audit or history.
The repository is canonical; Library is a review copy.

## Choose the established pattern

Exactly four references: **Bots, Research, Infinity, Skill tree**. Bots defines
ordinary density and visual weight; Research aligned purchase cards/summaries;
Infinity persistent progress/settings; Skill tree spatial nodes and details.

- **Dense gameplay:** ordinary cards/activity lists follow Bots/Research identity,
  production/value, short supporting detail and aligned action. Content determines
  height; avoid nested decoration and compounded spacing.
- **Persistent progress dock:** follow Infinity: summary left, full-target settings
  right, configuration expands upward, resource totals stay in their header.
- **Spatial skill tree:** preserve authored coordinates, contained 76px nodes,
  pan/zoom and labelled button/detail interactions. Never flatten into card rows.

**Transcendence is separately protected:** purple/Avocato family; three inset bars
in one panel, time inside left, benefit inside right, icon outside right. Main
and supporting heights retain their specialist hierarchy. Do not normalize it
or copy it into ordinary activities.

## Reuse roles, not nearby measurements

Use shipped Lexend/locale faces: 400 explanation, 600 secondary values/controls,
700 identity/headings. Shared scaled roles: meta .72rem, body .82rem, control
.84rem, card .9rem, section 1.05rem, page 1.25rem. Dense production/support use
Bots/Research .8rem/.67rem roles and reference line heights.

Dense inset/grid gap: .45rem/.35rem; card gap .4rem; related/control gap .25rem;
route/section inset .5rem; panel inset .6rem. Use existing tokens/components.
Ordinary cycle tracks follow Bots’ .72rem; persistent status tracks Infinity’s
.48rem. Other current CSS values are not interchangeable choices.

Inline symbols/quantities reuse `InlineResourceAmount`: baseline, .16em gutter,
isolated numbers and shared formatters. `InlineImageSymbol` uses .92em height,
natural aspect ratio and −.08em baseline. Inspect actual optical bounds. Distinguish
stock, input cost and output/reward; explain direction and state without colour
alone. Runtime tokens/assets govern; older palette/variable-font prose is stale.

## Mobile, scale and acceptance

Desktop Interface size changes the root (.8–1.5); text multiplier, browser zoom
and Skill camera zoom are separate. Measure actual targets: minimum 44×44 CSS
pixels, preferably 48×48 touch. Tokens alone do not guarantee that at reduced
scale. Respect logical safe areas and existing navigation reservation.

Hover/title is never the only learning path. Tap/click or Enter/Space opens visible
localized names/quantities through existing full-row disclosures or skill details.
Preserve keyboard focus, selected states and disabled/locked semantics.

Compare representative screenshots against the relevant reference at the same
usable width/scale. Exercise fresh/mature, waiting/running/locked, selected,
expanded and confirmation states; reach the last control. Check applicable
80/100/130/150% Interface sizes, mobile 360px/130% text, narrow/enlarged text,
landscape and a long locale. Check targets, contrast, overflow, reduced motion
and touch/keyboard meaning; name unverified/native hosts. Tests alone are not
visual acceptance.

Document a genuinely needed exception, closest reference, exact departure and
approval status. Prototypes and assistant proposals are not approvals. Prose
provides a review process, not automatic enforcement.

## Open selectively

[Copy](ui-style-reference.md#copy-show-the-useful-fact) ·
[Scaling](ui-style-reference.md#scaling-and-interaction-geometry) ·
[Typography/spacing](ui-style-reference.md#ordinary-typography-and-spacing) ·
[Icons/learning](ui-style-reference.md#compact-symbols-numbers-and-learning) ·
[Controls/progress](ui-style-reference.md#controls-progress-and-state) ·
[Skill tree](ui-style-reference.md#skill-tree-protected-spatial-standard) ·
[Transcendence](ui-style-reference.md#transcendence-separate-specialist-standard) ·
[Visual checklist](ui-style-reference.md#acceptance-and-exceptions).
Only for Simulations: [current specification](plans/simulations-current-specification-2026-10-08.md).
