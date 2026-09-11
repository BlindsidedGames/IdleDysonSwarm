# Augment tree visual QA — 11 September 2026

Live browser review of the local Skills augment-tree prototype at `/play/`.

| Viewport | Reviewed | Result |
| --- | --- | --- |
| 1137 × 1324 | Main tree, augment tree, Supermassive Panels details | Readable; controls and dialog fit |
| 1440 × 900 | Augment tree | Branches and controls fit |
| 768 × 1024 | Main and augment trees | Portrait layout fits |
| 1024 × 768 | Augment tree, Extended Warranty details | Landscape layout and dialog fit |
| 390 × 844 | Augment tree, Supermassive Panels details | Dialog fits; canvas supports navigation |
| 320 × 568 | Augment tree, Supermassive Panels details, tree settings | Text and actions fit; panning reaches lower and right branches |

## Issues fixed during review

| Observed symptom | Owner | Fix and acceptance |
| --- | --- | --- |
| Vertical connections ran behind node-label letters | `skills.css`, node labels | Compact opaque label backing; inspected on desktop, tablet and phone |
| Panned labels could overlap the fixed augment heading | `skills.css`, augment controls | Opaque heading backing; inspected on the smallest phone |

Checked label visibility toggling, return navigation, pan/zoom, and centering. Restored labels, cleared the QA search, removed the temporary viewport override, and left the desktop augment tree centered.

## Validation and limits

- Focused SkillsSurface augment, search, assignment, and SkillDetailsDialog tests: 4 files, 7 tests passed.
- Lint, web build (including TypeScript), and `git diff --check` passed after the CSS fixes.
- Browser evidence only; no native Simulator/device validation in this pass.
- The preview had zero available Skill Points, so purchases were unavailable and were not exercised during visual QA.
- Local changes remain uncommitted and unpushed.
