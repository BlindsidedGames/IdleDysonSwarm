# Stellar Sacrifices integration audit

Audited the highest-owned-facility change, all current skill/effect consumers and its presentation. Starting revision: `d3e2f874`. No deployment was requested for this audit.

## Findings fixed

1. Assign/refund comparisons omitted the sacrifice grant and Bot debit. They now reuse the canonical settlement calculation, including starting-balance affordability, with a Galactic Brains comparison row.
2. Facility details used normal technical descriptions for Fractured skills. They now share the skill tree's Fractured message map; Discovery-specific descriptions retain their existing priority.
3. The displayed sacrifice formula could overflow while the real calculation remained finite. It now uses the same bounded galaxy/multiplication helpers.
4. Matrioshka/Birch source rows attributed all automatically acquired facilities to their upstream producer, including past sacrifice grants. They now show the upstream production rate, consistently with basic facilities.
5. Stellar Obliteration's flavour still referred to artificial Planets. English and all seven translations now say facilities. Updated the current simulation and Fracturing contracts.

## Coverage and disposition

| Area | Inspection / verification |
| --- | --- |
| Target selection | Shared `highestOwnedFacility`; all eight tiers, generated-only fractional ownership, manual ownership and no-owned-facility cases covered. No target is persisted or cached. |
| Settlement / affordability | Starting Bots fund the interval. Partial and unrepresentable debits conservatively limit grants. Fractured Sacrifices has no Bot requirement. Existing large-number conservation tests pass. No-facility case consumes nothing. |
| Active / Stored Time | Both call the canonical interval. Infinity and Transcendence horizons already account for the sacrifice debit. Existing event-boundary coverage plus a new Stored Time Galactic Brain/checkpoint regression pass. |
| Skill modifiers | Reviewed Stellar Improvements, Dominance, Obliteration and Supernova's cost, lifetime, galaxy and penalty calculations, including Fractured exemptions and Supernova's manual-building suppression. Ordinary-range arithmetic tests preserve all six combinations. Inspected all five skill dialogs live. |
| Other production bonuses | Discovery multiplies the sacrifice grant once. Bot boosts affect ordinary Bot output, not the grant; regression passes. Facility/manual-purchase multipliers affect the generated facilities' subsequent output, not an extra direct sacrifice multiplier. |
| Assignment / refund / presets / auto-assignment | Generic transactions change ownership; each derivation/interval re-evaluates the target. No assignment path stores a separate Planet target. Live refund/reassign and Fracturing checked. Existing transaction/preset and every-skill permanence tests pass. |
| Facility details / comparisons | Existing all-tier attribution test passes. New refund comparisons cover Data Centers and Galactic Brains including Bot debit and source-state immutability. New rendered normal/Fractured tests cover wording and finite extreme-value formulas. |
| Resets / challenges | Canonical reset ownership determines the next target. Existing parameterized Fractured-skill tests include Sacrifices across Infinity, Quantum, challenge restart and Transcendence, save roundtrip and valid derivation. No Science challenge does not disable it. |
| Persistence / imports / Cloud | Generated facilities use the existing automatic ownership slot. Added Stored Time checkpoint/serialization/reload test confirms all eight counts and skill ownership. Imports and Cloud use that same full-state representation; no new save field or migration. No cross-device Cloud test performed. |
| Legacy compatibility | Old `stellarSacrificesProduction` is migration/repair metadata, not a current gameplay input. Authored `effect.stellarSacrifices.planets_per_second` remains a stable compatibility ID; derivation explicitly removes it from passive Planet arrivals before settling the highest-facility grant. Added a comment at its resolver. |
| Goals / achievements / statistics | Goals retain explicit manual-vs-total count rules (five manually bought Assembly Lines; twenty total Planets). Facility achievements read automatic plus manual ownership. Stored Time reports all eight facility deltas. Skill use is ordinary progression, not a new speedrun assistance flag. No Planet-only reward ledger requires changing. |
| Text / localization / Wiki | Runtime normal and Fractured descriptions verified; supporting skills and current patch note checked. All eight shipped languages have current sacrifice text. Frozen Unity handoff catalogs and historical release notes retain historical copy; shipped message catalogs override the legacy fallback. No current Wiki mechanic independently describes a Planet-only sacrifice. |
| Performance | Reused a scalar settlement helper for on-demand previews; no added timers, simulation passes, state history or persistence service. Fractured source detection uses the existing membership helper. |

## Live interaction evidence

Used a disposable `localhost:5192` origin, separate from Matthew's `127.0.0.1:5192` save.

- Imported a Data Center-only fixture. Data Centers increased; their details showed Sacrifices and a single Discovery factor.
- Purchased Galactic Brains through the actual purchase button. Sacrifice generation immediately moved there; the Data Center details no longer listed it.
- Opened refund confirmation: Galactic Brain production fell to zero and Bot output recovered its debit. Confirmed refund, then inspected and confirmed the reverse assignment comparison.
- Fractured Sacrifices through its confirmation: one Catalyst spent, two SP returned. Both skill and Galactic Brain details displayed “No Bots required or consumed.”
- Inspected the formula and descriptions at desktop size and 360 × 780. Text wrapped without overlapping the rate or controls. Screenshots captured in the task's tool transcript.
- Spent one minute of Stored Time. Completion reported **+1.84M Galactic Brains** and bank changed from 10m to 9m. Reload retained the counts, bank and Fractured state.
- Opened all supporting Stellar dialogs after reload; Obliteration's updated flavour and Discovery-specific penalty description were present. Runtime error log was empty.

## Checks and limits

- **182 test files, 1,880 tests passed.** Includes the five focused regressions added here.
- TypeScript, lint, data consistency, translation completeness, skill message coverage, production build and `git diff --check` passed. Build retains its existing large-chunk advisory.
- Reviewed the complete audit diff, shared settlement math, descriptor precedence, source-row types, translation edits and compatibility boundaries. No known unresolved Stellar Sacrifices integration defect remains from this audit.
- Interactive checks were in the browser. Native iOS/Android/Steam were not rebuilt or retested for these additional presentation fixes. Nothing was deployed, merged or submitted to a store.
