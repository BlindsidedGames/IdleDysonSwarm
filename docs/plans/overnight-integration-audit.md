# Overnight integration audit — 27 September 2026

Scope: `732ba849..9bd365cf`, plus review fixes on `transcendence-tiers`.
No deployment, merge or store changes were performed.
Two independent GPT-6 Sol reviewers covered maintainability and bugs. Findings
were cross-reviewed after integration, rather than accepted solely by their author.

## Coverage tracker

| Area | Integration / hands-on QA | Review |
| --- | --- | --- |
| Discovery tiers, transfers, timers and purchases | Desktop/narrow bars, three detail sections, live cascading completions, all four permanent purchases; persistence/reset regression coverage | Complete |
| Skill conversion and previews | All ten Swarm/Fragment and four Manual Labour augments: technical descriptions, costs, prerequisites, assignment and applicable comparisons | Complete |
| Facility output and attribution | All eight facility detail dialogs; Stellar Swarm attributed to Galactic Brains rather than Planets; all three megastructure summary equations | Complete |
| Simulation integration | Self-Replicating Workers assignment/refund previews match Hunters/Gatherers and launched-panel production facts | Complete |
| Quantum challenges | All seven descriptions, scrolling, entry/abandon confirmations, Built by Hand facility gating, repeat/navigation cancellation, ordinary and held Tinker goals | Complete |
| Reality SP | Bought Translation II/III during No Science without adding challenge SP; restoration and reset paths covered by focused regressions | Complete |
| Swarm grants, paid/free counts and resets | Head Start grants all unlocked facilities, Pooled count 461, normal Reductive growth 1.195, Deferred Billing purchase; Infinity/Quantum/save regressions | Complete |
| Layout and input | Desktop, 360×780, 130% game text-scale, German Discovery labels, dialogs, lower challenge cards, flattened Avocato store, modal Tab/Escape | Complete |
| Localization and documentation | Seven translation catalogs, Wiki transfer correction, challenge contract and concise patch notes | Complete |

## Confirmed findings and fixes

1. **Wrong units in skill comparisons.** Elevation/Enlightenment speed and
   Cash/Bot multipliers were shown as `/s`. Replaced naming heuristics with an
   exhaustive typed metric descriptor containing the label and unit.
2. **Missing Self-Replicating Workers previews.** Added Hunters/Gatherers Community
   and launched-panel Energy comparisons using the same pure production facts as
   the Simulation screen. Purchase/refund parity tests verify no source mutation.
3. **Free work on automatic reset assignment.** Hand Assembly and Practice used
   level 1 for assignment, although that field counts completed work. They now
   start at 0 consistently with manual/preset assignment.
4. **Supply Shortage weakened by Reductive Scaling.** The fixed challenge price
   exponent now takes precedence over skill reductions in the shared quotation
   path. Other challenges retain ordinary price reductions.
5. **Stale Wiki transfer explanation.** Corrected all languages: transfers advance
   the previous bar by the stated gameplay time at its current speed.
6. **Impossible Built by Hand advice.** The ordinary Manual Labour fallback told
   players to buy an AI Manager despite facilities being disabled. It now uses
   existing concise Bot-yield copy without changing repeat/cooldown mechanics.
7. **Tinker goals ignored ordinary Tinkers.** Seventy ordinary Tinkers did not
   advance the 50-Tinker goal because it read Hand Assembly work only. A separate
   bounded per-run completion counter now includes ordinary Tinkers and stored
   work, survives saves, and resets with a new run. It does not inflate Hand
   Assembly output or infer historical work from Bots/legacy upgrade levels.
8. **Abandon confirmation described entry restrictions.** Separate localized
   confirmations now describe the normal Infinity/Quantum run created on exit.
9. **Megastructure summary equations omitted modifiers.** All three use the
   existing ordered calculation pipeline, showing the aggregate multiplier while
   retaining individual attribution exactly once. This changes the explanation,
   not actual production.
10. **Free grants labelled as direct purchases.** Shared details now say
    “Purchased / granted”, “Purchases & grants”, and
    “{count} {facility} purchased or granted”, covering Head Start and retention.

Compound Fragments attribution, Fragment augment counting, Stellar Swarm's
highest-facility targeting and the 70× initial Assembly Line combination were
checked; no additional defect was found there.

## Live evidence

- In Supply Shortage, a Data Center purchase changed its next price from $300M to
  $600M despite Reductive Scaling and three assigned Fragments.
- Starting at 49 ordinary Tinkers, the next real click completed the 50 goal.
  Assigning Hand Assembly then started at one Bot per activation rather than
  inheriting those 50 clicks. Held work completed the 250 goal. A real UI export
  contained `completedTinkers: 250`; checkpoint reload retained the new goal.
- Self-Replicating Workers showed Hunters 1→1.36 and Gatherers 1.10→1.85
  Community/s; refund showed and produced the reverse change. The narrow,
  enlarged-text confirmation kept its controls visible.
- All eight facilities were opened individually. Megastructure modifier equations
  now include SRS, Botnet and Discovery through the shared aggregate. Galactic
  Brains correctly explain purchased/granted units. Tab focused Close; Escape
  dismissed the detail dialog.
- Bought all four permanent Discovery upgrades: the wallet changed 100→96;
  starting benefits changed 10.1/10.1/30.1→15.1/15.1/35.1, with +25% speed.

Screenshots under `output/qa/night-audit/` are ignored local QA artifacts:
`discovery-desktop.png`, `discovery-360.png`, `discovery-german-360.png`,
`challenges-360-text130.png`, `self-replicating-360-text130.png`,
`built-by-hand-fixed.png`, `megastructure-equation-fixed.png`, plus individual
augment comparisons. Disposable `localhost` saves were separate from Matthew's
`127.0.0.1` save. Temporary text/viewport overrides were removed at handoff.

## Checks and limitations

Final integrated gate: **190 test files / 1,993 tests passed**. TypeScript, lint,
authored data, first-Dyson parity, localization checks/compilation and production
build passed. Electron syntax checks also passed. The build emits the existing
large-chunk advisory. Independent follow-up reviews found no remaining actionable
issue in this scope.

Interaction evidence is browser evidence. Native iOS/Android, packaged Steam,
Windows/Linux and cross-device Cloud were not re-run here. Reset, Stored Time and
checkpoint invariants additionally have focused regressions; those are not
presented as native interaction QA. Browser reload checks waited for the existing
checkpoint cadence; this audit does not claim immediate writes after every action.
