# Bots parity layout reference

Status: corrected against the Unity fresh-save Bots screen and approved
direction on 2026-07-30.

This is the responsive composition reference for the first playable Bots
baseline. It preserves the current Unity screen's familiarity while allowing
responsive reflow, semantic controls, accessible targets and modest disclosure
improvements.

## Authority and interaction

The UI receives immutable backend-owned presentation facts: resources and
rates, Tinker presentation/runtime state, ordered visible facilities, the
active-panel metric, panel lifetime, panels decayed, automation settings and
Bot Distribution. It renders those facts and never calculates unlocks,
production, affordability, awards or progression.

All Tinker, facility purchase, buy-mode, rounded-bulk and Bot Distribution
actions dispatch canonical player commands through the UI runtime and
`CanonicalLifecycleCoordinator`. Active time also enters only through the
coordinator.

Tinker is one native button surface. Tap/click/native activation requests one
cycle. Pointer or Space hold requests repeat and release stops it; there is no
visible Repeat Tinker toggle. Later skills and progression may alter or remove
Tinker only through the canonical snapshot. The UI does not infer those rules.

Hidden facilities are absent from visual layout and the accessibility tree.
The frontend does not label an unrevealed AI Manager or another hidden building
with `????`. A generic teaser is rendered only if a distinct canonical teaser
fact is intentionally retained and approved for that progression state.

## Shared hierarchy

The recognizable Unity hierarchy is:

1. Wide side navigation or compact bottom navigation.
2. Cash, Total Bots and inline Science resource/value/rate groups.
3. A compact decorative swarm/sun region.
4. Tinker at the bottom of the available playfield, followed by visible
   facilities as progression supplies them.
5. One cohesive Info panel.
6. One worker-production line.
7. Bot Distribution with Workers on the left, its heading centered above the
   slider and Scientists on the right.

The Science symbol is an extracted image asset rendered inline with the
Science values. Inline image-symbol support is reusable for other TextMesh Pro
sprite symbols without replacing semantic accessible names.

The Info summary always contains Active panels. Its disclosure adds canonical
panel lifetime and total panels decayed. The separate gear opens building
purchase settings: x1, x10, x50, x100, Max and rounded bulk buying. Those are
settings commands, not local UI calculations.

The worker-production row appears once. It uses white explanatory text with
orange values. A second Science-production card is not present because Science
already has its value and rate in the resource header.

## Compact portrait

At widths below 600 CSS pixels, use one bounded content column and the Unity
bottom navigation. The page scrolls vertically without horizontal overflow,
and the navigation reserves safe-area space rather than covering the last
control.

```text
+----------------------------------+
| Cash      Total Bots      Science|
| rate                      rate   |
+----------------------------------+
|              sun                 |
|                                  |
|                                  |
| Tinker in your garage            |
| description                      |
| explanation                      |
| tip                              |
| [hold hint / progress]      10.0s|
+----------------------------------+
| Info                          gear|
| Active panels: value             |
+----------------------------------+
| value Worker Bots producing ...  |
+----------------------------------+
| Workers   Bot Distribution  Scientists
| 50%          [ slider ]          50%
+----------------------------------+
| menu | Bots | Research | Story | Settings
+----------------------------------+
```

Tinker remains close to the lower controls on a fresh save instead of sitting
directly under the resource header. As facility cards appear, the playfield
becomes a normal scrollable content region and preserves canonical card order.

## Compact landscape

Use the same reading and focus order with reduced vertical gaps and a smaller
swarm. Do not hide copy, shrink targets below 44 CSS pixels or introduce a
second interaction model simply to avoid scrolling.

## Medium

Keep the compact content order and allow comfortable gutters. Bottom navigation
may remain until the wide rail breakpoint; facility cards use one or two
columns only when the supplied content fits without truncating the canonical
facts and actions.

## Wide desktop

At 1024 CSS pixels and above, use the persistent Unity-style side menu and a
bounded main content column. The resource groups stay at the top, the swarm is
small, Tinker sits at the bottom of the playfield, and Info/production/
distribution form the lower stack. Visible facility cards use a row-major grid
in backend order.

Unavailable navigation destinations preserve the familiar shell but do not
open invented screens, reveal hidden gameplay information or imply that a
later route is implemented.

## Visual and responsive rules

- Lexend remains the source-locale family; logical CSS and the locale registry
  support future script-specific fonts and RTL.
- Preserve dark charcoal/plum surfaces, white labels, orange resource/value
  emphasis, magenta Workers and cyan Scientists.
- Tinker uses its exact fresh-save Unity copy and tip. Its progress track is
  thick enough to read and contains the hold hint, with remaining time beside
  it.
- Bot Distribution uses a taller track and larger handle suitable for touch.
- Text is selectable only where selection is useful. Controls use
  `user-select: none`, pointer identity and touch-action rules so rapid touch
  and independent pointers do not create accidental selection or duplicate
  compatibility clicks.
- Reduced motion preserves textual progress and state.
- Reflow must work at 320 CSS pixels and 200 percent text sizing without
  horizontal page scroll.

## Acceptance

- Compare fresh-save compact and wide renders to the Unity reference for
  hierarchy, wording, color roles and control placement.
- Verify hidden facilities have no placeholder and no accessibility-tree node.
- Verify the single Tinker command/hold lifecycle and all lower controls route
  only through the canonical runtime.
- Verify the Info disclosure and purchase-settings disclosure are independent.
- Verify the production line is not duplicated.
- Verify compact portrait, compact landscape, medium and wide geometry, plus
  keyboard focus, reduced motion, pseudo-localized LTR and mirrored RTL.
- Run focused component/interaction checks, localization extraction, lint,
  production build and rendered-browser review. Record bundle measurements;
  do not use raw test count or screenshot-level pixel identity as acceptance.
