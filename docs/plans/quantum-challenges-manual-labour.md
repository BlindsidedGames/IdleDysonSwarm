# Quantum challenges and Manual Labour

## Scope and decisions

Six new Quantum challenges join No Science; each grants two Catalysts once.
All Quantum challenges suppress Division, Quantum Double IP and Quantum
Entanglement without removing ownership. Purchased boosts, Discovery, Avocato,
Fractured skills and Fracturing remain available. Infinity challenges retain
their previous rules.

| Challenge | Rule |
| --- | --- |
| No Science | Existing Science/Research restriction |
| Short Circuit | Fixed two-second panel lifetime |
| Grounded | Planets and all megastructures cannot be purchased, generated or produce |
| Built by Hand | All facilities disabled, including starter/retained facilities and Manual Labour Assembly Lines |
| Hands Off | No facility purchases, including automation; one starter Assembly Line each reset; generated facilities work |
| Commitment Issues | No skill refunds, clear-all or replacement presets within an Infinity; edit preset queues for the next reset |
| Supply Shortage | Facility purchase growth factor is 2; generated facilities do not affect cost |

Built by Hand requires Fractured Manual Labour before entry. Its first ten Bots
earn one SP, enough to assign Hand Assembly. The two impossible facility goals
become **50 Tinkers** and **250 Tinkers**, each still awarding one SP. Patient
Hands stored work counts. All other goals remain unchanged. Completion uses the
existing work counter and goal stage, so refunds/reload cannot repeat awards;
Infinity resets the ladder normally. No bonus starting SP is granted.

## Manual Labour tuning

All four augments cost one SP. Hand Assembly requires Manual Labour; the other
three require Hand Assembly. All require the parent to be Fractured, and are
refundable. Their counters survive refunds/save/load but reset with Infinity and
Quantum. No new persistence service or save schema is needed.

- Hand Assembly: `(completed Hand Assemblies + 1)^5` Bots every 0.2 seconds,
  capped at `1e17` base Bots per activation. No current-Bot input, no AI Manager
  requirement, and no Assembly Line grants. Completed work uses the existing
  augment runtime counter. Rapid clicking receives no initial-progress shortcut.
- Practice Makes Perfect: `2n / (n + 500)` additive yield bonus, where `n` is
  work completed while assigned. Approaches +200% rather than growing forever.
- Working Smarter: `min(2, 0.25 × log10(1 + levels))` additive yield bonus.
  Assembly Line research supplies levels before Discovery; completed Discoveries
  afterward. Research-disabled challenges suppress the retired research input.
- Patient Hands: stores up to 42 gameplay seconds while idle. The next activation
  completes up to 210 stored work actions plus the normal activation. Stored work
  follows the same increasing work/practice curve as holding, with 25% more Bots
  on the stored actions only. Both counters advance accordingly. The charge is
  consumed once; repeating cannot reuse it. Stored Time can fill the charge but
  never activates the button or produces manual Bots by itself.

Practice and Working Smarter add together, bounding their combined yield factor
at 5×. These are prototype tuning values, not a guarantee of final challenge
pacing. The removed current-Bot percentage was a positive feedback loop: ordinary
production and every manual payout made the next payout larger. Neither input
can compound the replacement curve.

Initial tuning is centralized in `manualLabourAugments.ts`. Existing paid Bot
boost applies once. Ordinary production multipliers are not silently applied to
manual grants. Artwork follows the original high-resolution masters.

## Coverage and evidence

- Implemented: shared challenge IDs/completion helpers, saved completion list,
  durable entry/abandonment, one-time rewards and replay times, effect suppression,
  facility quote/automation gates, reset retention rules, Manual Labour calculations,
  repeat handling, preview values, localized UI descriptors and SVG masters.
- Focused tests: all Quantum challenge entry/Infinity/reload/completion/replay paths;
  paid versus Quantum Double IP; forbidden production and purchases; lifetime;
  retention; price growth; preset/refund restrictions; first-point bootstrap;
  augment stacking, refund/reload/reset, waiting consumption and numeric bounds.
- Checks: full suite 1,938 tests / 187 files passed, TypeScript, lint, data,
  localization, web/native bundles and first-Dyson parity passed. Disabled-facility/Discovery
  regressions also pass. Builds report the existing bundle-size warning.
- Live browser: entered and abandoned all seven Quantum challenges through their
  confirmation controls; assigned all four augments and inspected their costs,
  descriptions and production previews; held/released Tinker, observed repeated
  Bot production, navigated away to stop it, and reloaded after the normal
  30-second checkpoint to verify ownership/practice persistence.
- Visual QA: inspected desktop and 360x780 with 130% text, all four skill details,
  challenge cards/confirmations, and the original-master-based icons in the tree.
  Evidence is in `/tmp/ids-quantum-qa/` (local disposable-browser captures).
- Review fixes: invalidate skill preview eligibility when challenge state changes;
  hide refund/reset eligibility in Commitment Issues; suppress disabled facility
  intermediates so they cannot feed generated research or Discovery speed.
- The original Built by Hand live check exposed the self-compounding balance
  problem; its previous sub-200-second Infinity is superseded by the rebalance
  evidence below.
- The post-reset shop inspection revealed Infinity retention purchases also
  grant facilities immediately. These are now blocked wherever the challenge
  forbids those purchases, with an inactive label, shared eligibility and focused
  tests. Desktop/narrow interaction inspection verifies the disabled control.
- Final self-review: no known unresolved correctness findings. Long-term balance
  of the new tuning remains a playtesting task, separate from these checks.
- Native iOS/Android interaction QA has not been performed for these changes.
- No deployment or merge is part of this request.


## Player-facing augment descriptions

- **Hand Assembly:** Build Bots every 0.2 seconds without an AI Manager. Base yield is (completed Hand Assemblies + 1)^5, capped at 100 quadrillion Bots per activation. Replaces Assembly Line tinkering. Work resets on Infinity.
- **Practice Makes Perfect:** Increase Hand Assembly yield by up to 200% with practice: 200% × completions / (completions + 500). Practice resets on Infinity; refunds preserve it. Bonuses are additive.
- **Working Smarter:** Increase Hand Assembly yield by 25% × log10(1 + Assembly Line research levels), capped at +200%. After unlocking Discovery, use completed Discoveries instead. Bonuses are additive.
- **Patient Hands:** While idle, store up to 42 seconds of Hand Assembly. Your next activation completes the stored work with 25% more Bots. Stored work also builds practice. Consumed on activation.

All new text is in the existing localization catalogs. 4.1.10 patch notes mention
the expanded Quantum challenges, their disabled Quantum upgrades and the four
Manual Labour augments.


### Scroll follow-up

The expanded Challenges list had `overflow-y: auto` but no constrained height,
so its parent clipped the content. Set its block size to the available route
height with a zero minimum. Live wheel scrolling now reaches Supply Shortage
at 1280x600 and 360x780 with 130% text; narrow content scrolls 1,351px while the
bottom navigation stays visible. Evidence: `/tmp/ids-quantum-qa/scroll-360.png`.


## Manual Labour rebalance evidence

Measured by repeatedly applying the production and completion functions at five
activations/second, with no paid boost, Patient Hands waits, facility production
or resets included. Threshold is the normal first Infinity, `4.2e19` Bots.

| Assigned augments | Research levels | First Infinity threshold | Bots produced in one hour without resetting |
| --- | --- | --- | --- |
| Hand Assembly only | 0 | 8m 22.6s | 1.591e21 |
| All four, continuously held | 0 | 7m 9.6s | 4.575e21 |
| All four, continuously held | 1,000 | 6m 52s | 5.768e21 |
| All four, continuously held | 100,000,000 | 6m 30.8s | 7.756e21 |

Collecting Patient Hands every 42 seconds with all four augments and no research
reached the first Infinity threshold on the tenth collection (7m 2s, including
ten 0.2-second activations). Holding reached it in 7m 9.6s. This makes waiting
competitive without the proposed 42× burst.

The normal held-output ceiling is `2.5e18` Bots/second before the existing paid
boost. Patient Hands adds at most 25% to the stored portion, not another growing
multiplier. For a normal-production comparison, the non-conflicting maximum-skills
fixture was given the deterministic mature facility/Bot seed. Its Bot rate
started at `1.205e15`/second and reached `6.501e68`/second after ten one-second
production-only steps, without new purchases or manual work. This deliberately
late-game seeded comparison is not a player playthrough or a claim that every
possible build is balanced. Manual work can still
bootstrap Infinity, but cannot sustain the former exponential route to `4e242`.
Completed work and practice restart each Infinity; later resets do not inherit a
fully charged yield curve. A full Built by Hand Quantum still needs playtesting
for pacing; this pass does not claim a complete Quantum was played manually.

Ten thousand fully charged preview calculations took about 260 ms locally;
each calculation processes at most 211 actions regardless of elapsed offline time.
Regression checks cover equivalent stored/held work, single consumption, counters,
refund/reload/Infinity/Quantum, paid boosts, numeric caps and the 42-second preview.
The final local suite passes 1,938 tests across 187 files, plus TypeScript, lint,
data, localization, first-Dyson parity, and web/native bundle builds. The build
still reports its existing chunk-size warning. Self-review found no unresolved
correctness issues in the revised work counters, capped bonuses, waiting
consumption, reward paths or previews.

Browser rebalance QA verified all four updated descriptions, costs, assignment
and 42-second preview; held repeat; stopping on navigation; autosave/reload; and
all four details at 360x780 with 130% text. A real 42-second wait showed 28.3T
Bots per activation; clicking awarded 28.3T and consumed the stored work before
subsequent repeat activations. Evidence: `/tmp/ids-patient-rebalance-qa/` and
`/tmp/ids-manual-narrow-review/`. Native interaction QA was not repeated.


The rebalanced Built by Hand live run earned its first goal point, assigned Hand
Assembly alone through the skill dialog, and ran continuously for 550 seconds.
It crossed Infinity between the 500- and 550-second samples, automatically earned
1 IP, reassigned the queued augment and resumed at the fresh work curve. Every
facility remained zero, and retention purchases stayed inactive. Evidence:
`/tmp/ids-quantum-qa/built-live-9.png`, `built-live-10.png`, and
`built-live-infinity.png`; log: `/tmp/ids-built-rebalanced-live.log`.


### Built by Hand goal follow-up

The initial bootstrap QA reached Infinity but missed that five purchased Lines
blocked the remaining goal ladder and augment choices. Both facility-dependent
goals now have shared runtime/UI targets (50 and 250 Tinkers). Regression checks
cover exact thresholds, one-time rewards after reload, ordinary goals remaining
unchanged, Patient Hands catch-up, and frontend goal projection.

Live verification: entered Built by Hand, earned/assigned Hand Assembly, observed
“50 Tinkers”, then “250 Tinkers” with 2 SP available at 30 seconds, then the normal
star goal with 4 SP available at 60 seconds. All facilities stayed zero. The
additional point came from the normal decayed-panel goal. Screenshots:
`/tmp/ids-tinker-goals-qa/built-live-start.png`, `built-live-0.png`, and
`built-live-1.png`. Full suite: 1,943 tests / 187 files; type, lint, data,
localization, first-Dyson parity and web build pass.
