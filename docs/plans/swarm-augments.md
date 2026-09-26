# Swarm and Fragment augments

Source: Wia's consolidated Discord proposal, 26 September 2026, message 1553378841551052863. Initial numbers are prototype tuning, not a balance certification.

## Scope and decisions

- Super Swarm: Head Start (1 SP), Botnet (3), Deferred Billing (3).
- Mega Swarm: Pooled Purchases (3), Economy of Scale (1).
- Ultimate Swarm: Steady Supply (3), Self-Replicating Workers (5), Stellar Swarm (4).
- Production Scaling: Compound Fragments (3), Reductive Scaling (3).
- All require their Fractured parent, use normal assignment/preset/auto-assignment, and are refundable.
- Assigned Fragment augments count as Fragments for all existing Fragment-dependent calculations, including Production Scaling, Regulated Academia and Reductive Scaling. Swarm augments do not count as Fragments.
- Head Start includes unlocked megastructures (Matthew confirmed). Free grants respect challenge restrictions. A bounded per-run ledger excludes these grants from pricing and retention; refunds cannot grant them again.
- Steady Supply requires assignment at the ending Infinity and reassignment to restore the captured paid purchases. Challenge restarts and Quantum clear this bank. Restoring cannot duplicate purchases by refunding/reassigning.
- Pooled counts affect production calculations, never the physical inventory or price counter. Terra acts after pooling. Automatically generated buildings do not count as purchases.
- Economy of Scale retains Cash/Bot effects after Discovery. The Science benefit converts to G(multiplier − 1), using the existing bounded growing-source formula (Matthew confirmed).
- Self-Replicating Workers targets simulation Hunters/Gatherers and launched-panel Energy. It does not affect main-game Bot allocation. Compound Fragments replaces linear scaling; zero purchases stay neutral at 1×.
- Reductive Scaling subtracts 0.5 percentage points per assigned Fragment, including itself and Compound Fragments; growth has a 0.1% floor.
- Existing Swarm/Terra production bonuses remain scoped to basic facilities. Megastructure purchases join the pooled count, and their own purchase count can supply Stellar Swarm’s target multiplier; Botnet directly affects all eight facilities.

## Coverage checklist

- [x] Facility pricing: quotes, manual, automation, bulk, retained starters, discounts, challenges.
- [x] Production: basic facilities, megastructures, Cash/Science/Bots, Discovery and Stellar Sacrifices funding/attribution.
- [x] Assignment: prerequisites, refunds, presets, auto-assignment, previews.
- [x] Resets: Infinity capture/restore, challenge restarts, Quantum, Transcendence, Reset Save.
- [x] Persistence: grant ledger round trip, import/export, bounded data, no compatibility reconstruction.
- [x] Reality/simulation effects and active/Stored Time parity.
- [x] UI: names, flavour/technical descriptions, icons, production details, narrow layouts.
- [x] Focused regressions, repository checks, code review, actual interaction QA.

## Final technical descriptions

- **Head Start:** Gain 30 purchased units of each available facility once per Infinity, without increasing prices. Includes unlocked megastructures.

- **Botnet:** Multiplies all facility production by 1 + log20(Bots).

- **Deferred Billing:** Facility purchases require their full Cash price, but do not spend it.

- **Pooled Purchases:** Each facility uses the total purchased count of all facilities for purchase bonuses. Terra applies afterwards. Prices are unchanged.

- **Economy of Scale:** Multiplies Cash, Science and Bot production by log5(total facilities), with a minimum of 1×.

- **Steady Supply:** Keep paid facility purchases through Infinity. Assign before resetting and again to restore them. Free starter units do not accumulate. Quantum clears the supply.

- **Self-Replicating Workers:** Hunters and Gatherers gain (1 + Swarm rate × their count / 10)^0.75 production speed. Launched-panel Energy gains (1 + Swarm rate × launched panels / 100)^0.5.

- **Stellar Swarm:** Multiplies Stellar Sacrifices output by P^log12.5(Bots), where P is the purchase-scaling multiplier of your highest owned facility. Bot costs are unchanged.

- **Compound Fragments:** Replaces linear purchase scaling with (1 + Swarm rate)^floor((effective purchases / Fragment threshold)^0.825). The threshold has a minimum of 1.

- **Reductive Scaling:** Reduces facility price growth by 0.5 percentage points per active Fragment Skill, to a minimum of 0.1%.

After Discovery unlocks, Economy of Scale instead retains its Cash/Bot multiplier and adds `min(2, 0.1 × log10(M))` to Discovery speed, where `M = max(1, log5(total facilities))`. The existing tier-specific speed weights apply. Its phase-specific description includes “Bonuses are additive.”

## Verification (27 September 2026)

- Focused Swarm suite: 13 regressions covering grants, challenge restrictions, newly unlocked megastructures, paid/free retention, repeat refunds, Infinity auto-assignment, presets, Fragment counting, mapping, pricing/automation, pooled/Terra ordering, Discovery conversion, all-facility production, Stellar Sacrifices attribution and simulation worker/Energy production.
- Full suite: 188 files / 1,958 tests pass. TypeScript, lint, data, localization, first-Dyson parity and production web build pass. Existing large-chunk build warning remains.
- Self-review examined save/restore boundaries, assignment/preset paths, challenge gating, finite arithmetic, effect attribution and production-fact reuse. Fragment augments use canonical `isFragment` classification, not a separate derived counter; Fractured-parent gating applies independently of Fragment unlocks.
- Isolated Chrome with `--use-mock-keychain`: assigned all ten through actual skill controls; inspected names, costs, descriptions, tree layouts and facility details. Desktop and 360px/130% text views fit without horizontal overflow.
- Actual Infinity reset preserved 121 paid Assembly Lines plus the new run’s 30 Head Start units, rather than adding another free 30 to retained purchases. Quantum cleared the retained supply and kept the ordinary starter Assembly Line.
- Autosave/restart and re-export preserved the exact Head Start ledger, all assigned augments, and the Fragment count of 3.
- Economy of Scale’s Discovery-specific description was verified in the actual Assembly Line details, with focused UI regressions for both phases.
- Browser Simulation displayed 100 Hunters producing 1.36 Community/s, 200 Gatherers producing 1.85 Community/s, and 10,000 launched panels producing 24.4 kW with the augment. Spent one minute of Stored Time through the sidebar and inspected resulting production/charge.
- Local evidence: `output/qa/swarm-augments/` (ignored screenshots). Reproduction fixtures and live scripts remained disposable under `/tmp`; no player save was changed.
- Native iOS, Android and packaged Electron interaction checks were not repeated for these additions. No cross-device Cloud test or long-run balance certification is claimed. Prototype tuning remains as proposed; notably Compound Fragments replaces the early linear bonus and can be weaker before its later exponential growth dominates.

## Release

Do not deploy or merge this work. Update PR #217 after verification.
