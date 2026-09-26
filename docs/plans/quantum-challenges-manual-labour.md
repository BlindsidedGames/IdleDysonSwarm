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
earn one SP, enough to assign Hand Assembly even though later facility goals are
blocked. No extra SP or hidden goal rewards are granted.

## Manual Labour tuning

All four augments cost one SP. Hand Assembly requires Manual Labour; the other
three require Hand Assembly. All require the parent to be Fractured, and are
refundable. Their counters survive refunds/save/load but reset with Infinity and
Quantum. No new persistence service or save schema is needed.

- Hand Assembly: 5% of current Bots, minimum one, every 0.2 seconds; replaces
  Assembly Line tinkering, with no AI Manager requirement.
- Practice Makes Perfect: +1% manual Bot yield per completed activation while
  assigned; additive.
- Working Smarter: +10% yield per Assembly Line research level; Discovery
  completions replace retired research after unlock. No Science suppresses old
  research's contribution.
- Patient Hands: +100% yield per idle game-minute, capped at +1,000% after ten
  minutes. Consumed on activation. Repeat cycles cannot reuse the captured bonus.
  Stored Time may build the waiting bonus but does not perform tinkering.

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
- Checks: full suite 1,937 tests / 187 files passed, TypeScript, lint, data,
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
- Live Built by Hand: earned the first goal point, assigned Hand Assembly through
  its dialog, and held repeat. At 150 seconds it was producing 6.42 quadrillion
  Bots per activation; within 200 seconds it completed an automatic Infinity,
  earned 1 IP, and resumed the next run. Facilities remained at zero, including
  after the reset. No other Manual Labour augment was assigned for this run.
- The post-reset shop inspection revealed Infinity retention purchases also
  grant facilities immediately. These are now blocked wherever the challenge
  forbids those purchases, with an inactive label, shared eligibility and focused
  tests. Desktop/narrow interaction inspection verifies the disabled control.
- Final self-review: no known unresolved correctness findings. Long-term balance
  of the new tuning remains a playtesting task, separate from these checks.
- Native iOS/Android interaction QA has not been performed for these changes.
- No deployment or merge is part of this request.


## Player-facing augment descriptions

- **Hand Assembly:** Manual Labour produces 5% of your current Bots every 0.2
  seconds, with a minimum of 1 Bot. Replaces Assembly Line tinkering; no AI Manager
  required.
- **Practice Makes Perfect:** Each completed Hand Assembly increases its Bot
  yield by 1% this Infinity. Refunding preserves practice. Bonuses are additive.
- **Working Smarter:** Increase Hand Assembly Bot yield by 10% per Assembly Line
  research level. After unlocking Discovery, use completed Discoveries instead.
  Bonuses are additive.
- **Patient Hands:** Increase Hand Assembly Bot yield by 100% per minute without
  activating it, up to +1,000% after 10 minutes. Consumed on activation. Bonuses
  are additive.

All new text is in the existing localization catalogs. 4.1.10 patch notes mention
the expanded Quantum challenges, their disabled Quantum upgrades and the four
Manual Labour augments.


### Scroll follow-up

The expanded Challenges list had `overflow-y: auto` but no constrained height,
so its parent clipped the content. Set its block size to the available route
height with a zero minimum. Live wheel scrolling now reaches Supply Shortage
at 1280x600 and 360x780 with 130% text; narrow content scrolls 1,351px while the
bottom navigation stays visible. Evidence: `/tmp/ids-quantum-qa/scroll-360.png`.
