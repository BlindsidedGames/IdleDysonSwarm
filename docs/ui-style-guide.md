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

Challenge Start/Replay actions use the shared `Button variant="purchase"` purple
palette, matching Simulations: pale lavender when enabled, dark purple when
disabled, with the shared hover/pressed lighting. Pink action fills are not the
approved purple theme. Keep destructive restart/abandon confirmation semantics.
Challenges is a flat list; no redundant Infinity Challenges category header or
large introductory/attempt-rules explainer (Matthew, 14 October 2026).

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

Selected Research drawer icon exception (Matthew, 14 October 2026): its fine
magnifying-glass strokes use the darker page foreground matching selected text,
rather than the panel foreground used by the other selected drawer icons.

Mode switch (Matthew, 16 October 2026): the bottom drawer trigger uses the same
navigation button styling as the other drawer entries, with the destination text
“Back to Classic” or “Back to Modern”, centered with no arrow (updated by Matthew, 16 October
2026). Both modes switch immediately without a disclosure.
Opening Modern for the first time copies and automatically migrates Classic
progress; subsequent switches continue the existing destination save. There
is no separate migration action or confirmation in the drawer. Classic also uses the modern drawer's
selected fill, icon contrast, scrollbar spacing and responsive target fixes.
The mode switch has no enclosing decorative panel or separate-save reminder.
Classic uses the independent release label C-1 (then C-2, C-3, and so on),
controlled by classic/release.json. Modern retains the normal packaged version.
Version metadata remains visible beneath the mode switch and has its own row
in compact navigation.
Standalone Classic imports in Modern enter migration automatically after the
save-replacement review (Matthew, 16 October 2026). The rework dialog offers
Return to Classic and Continue in Modern. Migration runs automatically when
Modern opens, using the former Earn upgrades again policy. The notice remains
until the player chooses where to continue, explaining that the two saves stay
separate and Classic remains available at any time. The separate Classic save
retains its original progression.
This automatic flow is scoped to the two-save host. Until that host is enabled
for a platform, its older single-save entry point retains the explicit Keep /
Earn upgrades again migration choice because it cannot offer Classic return.
Fresh saves need no choice. The Classic-to-Modern switch uses the same dialog.
Import and Export apply only to the current mode (Matthew, 17 October 2026).
Export produces that mode's normal standalone save string/file. Import replaces
only that mode after review, preserving the other mode even when it has no save
yet; old paired exports are not accepted through Settings. The panel uses the
existing Settings composition with Save data, Import Save and Export Save labels.
The import window closes on success to expose the
notice. Verified automatic migration before either action, Classic return,
reopening the migrated Modern save, desktop and 360px layouts, and keyboard
continuation. Other scales, long locales and native hosts
are unverified.
The development preview
has no persistent top toolbar; startup recovery appears only on failure.
Verified desktop and 360px Classic layouts, plum and green panel themes,
keyboard activation and direct Modern-to-Classic return. Other Interface/text
scales, long locales and native hosts are unverified.

The existing mode switch and save settings are now composed by the
production/native host (16 October 2026). Each mode mounts in a fresh owned
document, retaining the same drawer and Settings patterns; no new gameplay
layout convention is introduced. Current save paths and QA limits are recorded
in [Classic/Modern save storage](platform/classic-modern-save-storage.md).
