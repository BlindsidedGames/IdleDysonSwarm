# Late Simulation rendered-control review — 2026-09-12

All 22 bounded browser scenarios passed against the original 4.1.8 web build
and the reviewed candidate web build. Trusted CDP pointer actions exercised
actual rendered controls. Stable exported purchase, education and reset outcomes
matched between builds. No production code was changed.

## Environment and state construction

- Baseline preview: `output/visual-qa-4.1.8/baseline-web`.
- Candidate preview: `output/performance/candidate-v6-dist`.
- Isolated Chromium headless-shell 1223 profiles, 1440 × 1000 viewport, port 4319.
- Settings Import loads serialized saves; Settings Export supplies the canonical
  outcome assertions. Navigation and import text entry use the existing browser
  fixture helper; gameplay actions use trusted pointer events and hit testing.
- Eight explicit synthetic saves extend the checked-in mature-simulations fixture
  with funding, Cities, Space Factories, panel inventory and completed education
  prerequisites. Six variants leave one education item unfinished; another has
  zero Influence. Serialization validation and rehydration pass for every seed.
  These are constructed UI coverage states, not naturally played progression.
- Countermeasure flags include their corresponding authored disaster stage 42.
  An initial inconsistent seed had the flags without that stage and correctly
  encountered the same catastrophe reset on both builds; it was corrected before
  the final run. An initial all-unfinished education seed exposed sequential
  visibility prerequisites, so the final scenarios isolate each eligible item.

## Verified rendered controls and outcomes

| Control | Evidence on both builds |
| --- | --- |
| Foundational Era, Information Era, Education, Space Age | Trusted collapse and restore; `aria-expanded` returns to true |
| Purchase settings | Opens the actual amount and formula controls |
| Show formulas inline | Formula rows appear and disappear after trusted checkbox clicks |
| Solar Panels | Purchases at 1, 10, 50 and 100 increase exported count from 200 to 361 |
| Fusion Generators | Purchases at 1, 10, 50 and 100 increase exported count from 10 to 171 |
| Buy Max + Solar purchase | Fresh funded seed exports 22,484 Solar Panels on both builds |
| Buy Max + Fusion purchase | Fresh funded seed exports 21,530 Fusion Generators on both builds |
| Zero-Influence Solar and Fusion | Buttons are disabled; trusted pointer attempts leave exported counts at 200 and 10 |
| Engineering, Shipping, World Trade, World Peace, Mathematics, Advanced Physics | All six eligible Start buttons become researching cards without a second Start button; exported active/complete flags match |
| Completed Education | Complete status and collapsed/expanded completed category render correctly |
| Black Hole, capped reward | Trusted click commits immediately; exported swarm and Solar counts become zero and reset count becomes 2 |
| Black Hole, uncapped reward | Trusted click resets the same resources, advances reset count and grants positive Strange Matter |
| Railguns and Space Factories | Actual live cards show charge, rounds, payload, stored panels and factory output; these are automatic-production panels with no purchase/fire button |

Black Hole has no confirmation dialog in these tested states. No cancellation
coverage is claimed. Education research was started, not waited through its full
real-time duration; completed rendering uses the explicit completed seeds.

Screenshots were inspected for baseline/current Space Age layout, inline
formulas, active education, disabled purchases and post-reset state. Labels,
controls and production rows remained legible, with no observed introduced
layout discrepancy at the tested desktop size. Timers and continuously produced
resources were not required to equal at different wall-clock instants; exact
comparison covers the stable fields named above. This supplements the separate
headless command differential and broader Reality/mobile reviews, and does not
claim every unbounded gameplay state or a new exhaustive Reality-tab sweep.

## Reproduction and artifacts

Ignored local artifacts:

- `output/player-review/late-sim-create.ts`: explicit validated seed construction.
- `output/player-review/late-sim-controls.ts`: 16 core browser scenarios.
- `output/player-review/late-sim-extra.ts`: six actual Max/uncapped-reset scenarios.
- `output/player-review/late-sim/controls.json` and `extra.json`: per-build outcomes.
- `output/player-review/late-sim/*.png`: inspected rendered screenshots.

Run each browser script with `npx tsx` and `IDS_CHROMIUM_PATH` pointing to the
installed Chromium headless-shell executable. The core suite records zero
runtime exceptions. Both scripts finish with explicit baseline/current equality
assertions over their stable outcome fields.
