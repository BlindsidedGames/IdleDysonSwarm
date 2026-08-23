# Adaptive bottom navigation validation — 2026-08-23

Scope: replace the released Compact/Standard/Large selector with an Include
text preference, derive compact-bar sizing from selected destinations and
available width, and remove the Settings route's extra inner bottom frame.
Infinity gameplay, reset behavior, target controls, and planning documents were
not changed.

## Accepted behavior

- Include text applies labels consistently to every displayed bottom-bar
  button, including More, and persists only on the current device.
- A released Large preference migrates to Include text enabled; Compact and
  Standard migrate to disabled. A valid new preference takes precedence.
- Portable save import/export cannot read, write, or transfer Include text.
- Icon, label, and slot sizes adapt deterministically to the number of selected
  destinations and available width. Visuals shrink continuously so every
  selection remains visible without ellipsis or removal, and grow only to the
  former Large ceiling. Bar height follows the scaled content, the More glyph
  scales proportionally, and controls retain their full-height interaction
  area.
- No minimum destination count is enforced. More remains present and opens the
  complete drawer when every destination is removed from the bar.
- Offline Time keeps its stored-amount screen-reader name but does not render a
  navigation progress bar; progress treatment remains reserved for locked-tab
  reveal conditions.
- Settings now owns the whole route-content viewport, so its background and
  scroll extent meet the actual bottom-bar boundary without the generic route
  padding layer.

## Release evidence

Focused preference, import/export, Settings, mapping, navigation, shell, and
CSS regression tests pass (76 tests). The complete test suite passes (1,917
tests), as do lint, TypeScript compilation, production bundling, and the Store
boundary check.

Visible Chromium checks against the running app covered:

- 320 x 700 portrait with every available destination selected, labels both
  hidden and enabled: icons and labels reduced continuously, every destination
  remained present, and there was no horizontal page overflow.
- 390 x 844 portrait with labels enabled, plus a sparse two-destination state:
  every displayed button used a label and sparse icons stopped at the 36-pixel
  former Large ceiling.
- 568 x 320 landscape with every available destination selected and labels
  enabled: the bar remained one row and full labels scaled without overlap.
- Enlarged browser zoom at 390 x 844: continuous scaling retained every
  selected destination and More in one row without clipping the route.
- Include text and destination selections survived a reload. With every
  destination deselected, More was the sole bar control and both Bots and
  Settings were reached through the drawer.
- At the end of Settings scrolling, the surface ended exactly at the bar
  boundary (zero-pixel gap), its route-content padding was zero, and no inner
  background frame remained. The browser console contained no errors or
  warnings during the matrix.

The broader Web accessibility backlog remains open for physical-device,
screen-reader, real-touch, native safe-area, and browser-native zoom
certification.
