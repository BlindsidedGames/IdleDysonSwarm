# Compact bottom navigation validation — 2026-08-23

Scope: customizable compact bottom-bar destinations, Compact/Standard/Large
sizing, and deterministic menu overflow. Infinity gameplay, reset behavior,
target controls, and the Infinity surface were not changed.

## Automated evidence

- TypeScript build, lint, production bundle, and focused state/mapping/command/
  Settings/shell/route tests pass.
- The complete non-asset test suite passes. The two source-audio integrity
  tests cannot run from this worktree because `source-assets/audio/IDS-master.wav`
  is the checked-out Git LFS pointer (133 bytes), not the 57,882,296-byte master.
- Legacy saves retain the old three-field navigation representation until a
  new preference is selected, so untouched save fingerprints remain stable.
- Mapping coverage proves Compact upgrade behavior, the pre-existing visible
  destination composition, Large sizing, hidden Settings, and preservation of
  an unknown future destination ID through dehydrate/rehydrate.

## Visible browser evidence

Validated in Chromium through the local production UI:

- 390 × 844 portrait, Standard: the leading menu control and icon-only Bots,
  Research, Skills, and Infinity destinations fit one row with no horizontal
  page overflow.
- 320 × 700 portrait, Standard: deterministic overflow retains Bots, Research,
  Skills, and More. Measured controls were at least 50.7 CSS pixels high.
- 700 × 320 compact landscape, Large: one bottom row, no horizontal page
  overflow, labels under unlocked icons, progress in place of locked labels,
  and the menu retained at the leading edge.
- 390 × 844 with `--game-text-scale: 2`: Large labels ellipsized without
  overlap, the bar stayed one row, and measured controls remained at least
  62.7 CSS pixels high.
- Settings removal and Large sizing persisted after the normal 30-second
  canonical checkpoint and reload. The hidden Settings destination remained in
  the full drawer and successfully reopened Settings through More.
- Selected-route color, neutral unselected icons, logical-direction CSS,
  focus containment/restoration, screen-reader navigation names, and safe-area
  padding remain covered by the focused shell and full-slice tests.

The broader Web accessibility backlog remains open for physical-device,
screen-reader, real-touch, and native safe-area certification.
