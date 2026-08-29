# Web skill-tree runtime audit — 2026-08-20

> Historical evidence only. The repair findings in this audit were implemented,
> and its Unity comparisons are not current gameplay authority. Current
> TypeScript simulation contracts, generated Web catalogs, and executable tests
> supersede any historical engine behavior recorded below.

> **Timing supersession:** This audit preserves historical evidence, but every adaptive/representative-group, fixed-100-ms, and 4,096-group processing statement below is retired. It is not an implementation requirement. The current authority is `docs/contracts/game-processing-and-offline-time-contract.md`.

## Outcome

The generated Web catalog contains exactly **104 authored skills**. Every one is accounted for below and was traced from generated presentation/catalog data through canonical ownership and transaction code, effect materialization or bespoke evaluation, the downstream simulation/reset/automation consumer, persistence, and the React surface.

This report is the single home for skill-tree findings. Skill definitions, effects, unlocks, presets, purchase/refund interaction differences, downstream production/offline behavior, shared Unity defects, and Web-only omissions were removed from the general Unity-Web parity report to avoid duplicated tracking.

The primary-effect verdicts are:

| Verdict | Count | Meaning |
| --- | ---: | --- |
| Verified (`V`) | 67 | The advertised primary effect reaches a player-state or production consumer with compatible semantics. |
| Dead/no-op (`N`) | 18 | The advertised effect has no effective Web consumer, or its required state never advances. |
| Confirmed bug/partial (`B`) | 6 | Some behavior reaches runtime, but a material advertised branch is wrong or absent. |
| Description/data mismatch (`D`) | 13 | Runtime is connected, but the authored number/operation/threshold disagrees with the player-facing text. |
| **Total** | **104** | One primary verdict per authored node. |

This is not a claim that 67 nodes are globally issue-free. In particular, **given sufficient points and a queued prerequisite closure, all 33 Quantum-unlocked line nodes can be assigned while locked through an imported preset at Infinity reset** (F-01). Unity's presentation-backed and headless autoassignment executors omit the same line-unlock check, so the executor defect is shared; Web preset import is the confirmed ingress, while Web's live autoassignment is stricter. Gate reconciliation with Unity confirmed that the 21 `firstRunBlocked` nodes intentionally unlock together after the first Infinity; there are no separately authored Reality or Simulation skill gates (F-02).

## Proof standard and methodology

A node was not marked working merely because its generated skill references an effect. For each node the audit required:

1. Presentation identity, cost and text in `src/game-data/generated/skill-tree-presentation.json`, byte-materialized from the versioned Web handoff capsule.
2. Canonical skill flags, requirements, exclusivities, refundability and effect references in `runtime-catalog.json`.
3. Ownership and unlock behavior in canonical purchase/refund/preset/Infinity-reset transactions.
4. A materialized or bespoke effect calculation with an owned-skill check.
5. A downstream consumer that changes a production rate, price, reset result, automation quote, resource balance or other player-visible state.
6. Save hydration/serialization/migration and UI preview/confirmation behavior.

Static tracing was supplemented with direct TypeScript runtime probes of the canonical functions. The focused test run covered 21 catalog, transaction, preset, derivation, dynamic-effect, automation, reset, event-model, UI and migration files: **255/255 tests passed**. Those tests certify the existing contracts; they do not disprove the gaps found by tracing and probes.

Catalog integrity checks found 104 presentation nodes, 104 skill definitions, 149 total effect assets (134 skill-linked effects), 135 total skill-point cost, seven roots, seven fragment nodes, seven intrinsically non-refundable nodes, 20 exclusivity references, no presentation/runtime cost mismatches, and no missing/orphan skill icons. All 134 referenced effect targets are accepted by the Web materializer. The Unity reconciliation found zero source-hash mismatches. One extra VPT Tinker effect asset exists in both projections but is unreferenced by the skill and is not part of VPT's displayed promise.

### Runtime probes

| Probe | Observed result | Consequence |
| --- | --- | --- |
| Panel Warranty with 1/2/3 fragment count | `1s / 2s / 4s` | Does not produce the documented `+5s` doubling family. |
| Imported locked `fragmentAssembly` queued, fragments unlock false, one permanent point, Infinity reset | Skill became assigned | Web reset autoassignment bypasses the unlock gate; Unity's reset/live assignment executors mirror the missing check. |
| Regulated Academia at one fragment | Money add was approximately `0.001` in the canonical fixture | The implemented base is 1.02, not a 20% increase. |
| Advance an owned Androids, Pocket Androids and Super-Radiant Scattering state by one active second | All three `timerSeconds` remained `0` | New Web purchases cannot ramp. |
| Advance shoulders-based auxiliary effects | Research levels and fractional progress did not change | The calculated auxiliary rates are not committed. |
| Toggle all Swarm-line nodes | Facility production rates were identical | The line has no effective production consumer. |
| Toggle Terra Nova/Gloriae with a large planet state | Planet purchase cost was identical | Both advertised price reductions are absent. |

## Unity reconciliation

The separate Unity catalog/runtime audit was reconciled before finalizing these Web verdicts. It confirmed exact structural parity—104 skills, 149 effect assets, 134 referenced effects, and zero generated source-hash mismatches—but also supplied the missing behavioral control for several negative Web traces:

| Domain | Unity authority | Reconciled conclusion |
| --- | --- | --- |
| Gates | `Assets/Scripts/SkillTreeStuff/SkillTreeManager.cs:765-775` | F-02 is verified parity: 21 first-Infinity nodes plus six Quantum-unlocked lines; no Reality/Simulation gate. |
| Reset/preset assignment | `Assets/Scripts/Expansion/Oracle.cs:2820-2890,3033-3048`; `Assets/Scripts/SkillTreeStuff/SkillsAutoAssignment.cs:54-100` | Unity's headless and presentation-backed assignment executors both omit current line-unlock checks. F-01 is therefore a shared executor defect, not exporter drift; Web preset import supplies a confirmed reachable path, while Web live assignment checks the gate. |
| Active timers | `Assets/Scripts/Systems/ProductionSystem.cs:109-113` | Unity advances Androids, Pocket Androids and Super-Radiant each tick; Web does not. F-03 is a Web runtime omission, not ambiguous copy. |
| Idle Electric Sheep | `Assets/Scripts/Systems/OfflineProgressSystem.cs:426-427` | Unity doubles admitted away time; Web has no equivalent consumer. F-04 is a Web omission. |
| Manual-building/Swarm scaling | `Assets/Scripts/Systems/ProductionMath.cs:53-62`; `Assets/Scripts/Systems/Stats/FacilityModifierPipeline.cs:518-617` | Unity applies the purchased-building threshold/divisor pipeline and Terra count substitution; Web lacks the whole layer. This confirms F-05/F-06/F-09. Historical Unity `e68bbc3a:Assets/Scripts/Buildings/PlanetManager.cs:105-119` also defines the price formulas lost in the later refactor: Terra Nova divides Planet base cost by `planetModifier`, then Terra Gloriae divides it by total Planets. |
| Shoulders accrual | `Assets/Scripts/Systems/ProductionSystem.cs:109,222-230`; `Assets/Scripts/Expansion/Oracle.cs:2553-2556,2597-2633` | Unity commits the calculated science/cash rates as fractional research progress and whole research levels. Web derives the same auxiliaries but never commits them, confirming F-07. |
| Stellar sacrifice | `Assets/Scripts/Systems/ProductionSystem.cs:385-403` | Unity debits bots atomically after eligibility; Web grants the planet production without the debit, confirming F-08. |
| Mirrored/orphan authoring | Generated catalogs and the same authored skill/effect assets | Terra Nova/Gloriae are dead in the current refactored Unity and Web paths, but historical Unity source proves both previously had exact price consumers; they are regressions rather than undefined authoring. The unreferenced VPT Tinker x1.5 effect is orphaned in both and is not in VPT's displayed promise. Several copy/formula mismatches below are mirrored legacy semantics, not exporter drift. |
| Manual purchase UX | Unity `SkillTreeManager` versus Web canonical purchase closure | Unity buys one available node; Web intentionally purchases missing prerequisite closure atomically. Costs/ownership remain canonical in both. |

## Cross-cutting and high-priority findings

| ID | Severity | Classification | Evidence | Player impact | Suggested implementation | My decision |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | Critical | Confirmed shared reset bug / Web import exposure | Web normal purchase and live preset assignment call the canonical unlock resolver, but Infinity reset captures only queued IDs/points and assigns them without rechecking unlock flags. Web preset import accepts any known, non-exclusive ID, and the probe assigned locked `fragmentAssembly`. Unity's presentation-backed and headless assignment executors also omit current line-unlock checks. | With sufficient points and queued prerequisites, imported presets can acquire any of the 33 fragment/Purity/Terra/Power/Paragade/Stellar nodes before their Quantum unlocks are earned. The reset-executor omission is shared; Web's import path makes it directly reproducible. | Define the intended source contract, then apply the same unlock resolver during reset assignment and import preview; retain blocked IDs in the queue without spending their points or dropping them. | **Approved.** Fix in the Web runtime as described. Locked Skills should remain queued until their actual line is unlocked. Unity does not need a corresponding implementation because Unity support is being retired. |
| F-02 | Info | Verified gate parity | Web `resolveUnlock`, generated flags, Unity `SkillTreeManager.EnableSKills`, and the authored definitions agree: 21 nodes use `firstRunBlocked`; the other 33 gated nodes use six Quantum-upgrade line flags. There is no separate Reality or Simulation gate in either source. | None; “Reality/Simulation” are not authored skill-tree gate categories. | Preserve the explicit flags; do not infer extra gates from node position or theme. | **Approved parity.** No implementation change is required. Preserve the authored first-Infinity and six Quantum-line gates, and ensure the F-01 reset fix respects them. |
| F-03 | Critical | Dead/no-op effects | Androids, Pocket Androids and Super-Radiant Scattering read `skills.byId.*.timerSeconds`; no Web active-time event advances those fields. Reset/migration can clear or import them only. Probe: all remained zero after a canonical second. Unity advances all three every production tick. | Fresh Web purchases provide their zero-time value indefinitely. Old imported saves with non-zero timers may behave differently. | Advance each timer in the canonical event model while its Skill is owned/assigned and running, follow its authored ramp and maximum rather than applying a generic cap, and preserve the existing reset semantics. | **Approved.** Fix all three timer-backed Skills in Web according to their intended individual ramp behavior and limits. |
| F-04 | High | Dead/no-op effect | Idle Electric Sheep has presentation and persisted `idleElectricSheepTimer`, but no Web derivation, offline-time or event-model consumer uses it. Unity directly doubles away time when owned. | Two skill points do nothing on Web. | Connect it to admitted offline time with Unity-compatible ordering; add active/offline integration tests. | **Approved.** Fix Web so owning Idle Electric Sheep doubles eligible away-time simulation, without affecting active play or manually spent Stored Time and without allowing duplicate replay. |
| F-05 | Critical | Dead/no-op line | Super Swarm, Mega Swarm and Ultimate Swarm have no Web purchased-building production consumer. Production Scaling increments the shared fragment count but its advertised cutoff is unused. Toggle probe produced identical rates. Web also lacks Unity's base manual-purchase production milestones: 2x at 50 and another 2x at 100. Unity's scaling layer uses cutoff 90/100 and divisors 50, integer `100/3`, or 20. | The base manual-purchase rewards and up to eight points of advertised Swarm/Production Scaling progression do not affect Web facility production. The separate Avocados 2x effect at 69 purchases already works and is not part of this defect. | Port one canonical manual-purchase function into every facility rate: preserve the 50/100 milestone doublers, apply Production Scaling's fragment-dependent threshold, and apply exact 1%/2%/3%/5% post-threshold rates. Implement the approved F-19 threshold and rate formulas in this same repair rather than copying the legacy defects or splitting the work. | **Approved.** Restore the base 50/100 purchase milestones and the Production Scaling, Super Swarm, Mega Swarm and Ultimate Swarm effects in Web through one shared calculation. Production Scaling uses the F-19 threshold sequence 90, 85, 80, 75, etc., defensively clamped to zero, and the Swarm progression uses exact 1%/2%/3%/5% rates. Leave the already-working Avocados 69-purchase doubler intact and allow all applicable multipliers to combine during ordinary play. Supernova suppresses this complete manual-purchase production layer, including the Avocados doubler, as specified in F-09. |
| F-06 | Critical | Dead/no-op/partial line and refactor regressions | Web never applies Terra Firma/Eculeo/Infirma/Nullius planet-count substitution. Terra Irradiant is used only for a goal-progress/manual-planet path and VPT input, not the shared twelve-times count. Current Unity applies those five through its manual-building modifier layer. Terra Nova/Gloriae no longer enter Planet price in current Unity or Web, but historical Unity `PlanetManager` proves the exact lost behavior: Nova divides base cost by Planet Boost (`planetModifier`) and Gloriae then divides it by total Planets, with a nonzero-Planet guard. | The seven-point Terra route largely does nothing on Web. Five count effects are missing, and two previously working price reductions were lost during Unity's facility refactor and never ported. | Port the shared count layer for Nullius, Infirma, Eculeo, Firma and Irradiant. Restore Terra Nova as `Planet base cost / Planet Boost` and Terra Gloriae as the resulting base cost divided by total Planets; let both stack, guard zero, and use the same calculation for previews, affordability, manual purchase and automation. | **Approved.** Restore all seven Terra effects in Web using the verified historical formulas for Nova and Gloriae and the canonical count substitutions for the other five. Do not invent replacement formulas or modify Unity, which is being retired. |
| F-07 | Critical | Dead auxiliary economy | Shoulders of Giants and What Could Have Been calculate `scienceBoostPerSecond`; Shoulders of the Enlightened calculates `moneyUpgradePerSecond`; Shoulder Surgery adds the Fallen bonus to What Could Have Been's Pocket-Dimension science-boost path. `canonicalDysonDerivation` exposes both rates under `auxiliary`, but `canonicalEventTimeModel` never applies them. Unity commits both rates every production tick. | The advertised science/cash-boost generation and Shoulder Surgery do not progress their upgrade levels on Web. | Add explicit event arrivals/commits for the two auxiliary rates, including active play, admitted offline time, event-boundary behavior, fractional progress and numerical safety. | **Approved.** Commit both auxiliary accrual streams during active play and eligible offline simulation, including Shoulder Surgery's contribution. Science Boost and Cash Boost are authored with `maxLevel: -1`, so progression remains uncapped; retain fractional progress and enforce numerical safety without inventing a balance cap or permitting replay duplication. |
| F-08 | High | Confirmed partial bug | Web uses Bots only as an eligibility threshold for Stellar Sacrifices; no per-second debit is emitted. Unity performs the debit after the same eligibility check. Stellar Dominance inherits the missing Web sacrifice and has a mirrored strict-boundary inconsistency. | Web players receive the Planet upside without the documented ongoing Bot cost; exact-threshold and within-step funding behavior are inconsistent. | Emit an atomic Bot-debit/Planet-credit event and cap each canonical simulated interval/event step by the sacrifice duration affordable from Bots available at the start of that interval only. Credit Bots produced during the interval to state, but make them eligible to fund sacrifices only on the next interval/step. Allow exact-cost activation, prevent negative Bots, and test deterministic replay for the same active or adaptive Stored Time grouping plus same-interval produced-Bot exclusion. | **Approved, with adaptive Stored Time semantics.** Repair the five-skill Stellar branch as one coordinated change and treat the player-facing descriptions as authoritative. For each active tick or adaptive Stored Time representative interval, Stellar Sacrifices may spend only Bots available at the start of that interval. Its Bot debit and Planet credit remain atomic for the same affordable duration, including when starting Bots exactly equal the cost; the debit must never make Bots negative. Bots produced during that same interval are still credited to state but cannot be re-spent until the next active tick or representative interval. Active play retains its normal tick cadence. Longer Stored Time spends retain the established adaptive representative-group schedule: each group reads start state/rates, commits production and Stellar settlement, advances timers and Shoulders progress, and the next group recalculates from that updated state. Replay with the same grouping is deterministic, but representative results are intentionally approximate and are not required to equal a raw 100 ms replay. Its Planet rate is `max(0, log10(Stellar Galaxies Engulfed)) ^ 2` across the full range, rather than the current unsquared low-galaxy branch. Preserve and integration-test the working modifiers from Stellar Dominance and Stellar Improvements, and make Stellar Obliteration's Cash/Science penalty use documented Stellar Galaxies rather than ordinary galaxies. |
| F-09 | High | Confirmed partial bug | Supernova's 1000x Stellar Sacrifices galaxy term reaches the Web Planet formula, but Web has no manual-building modifier layer to disable. Unity excludes that layer while Supernova is owned. | The upside works on Web while the stated loss of manual-building production does not, and the current player-facing surfaces cannot preview the complete suppressed set. | Port the manual-building layer and make Supernova disable it as part of the coordinated F-05/F-19 repair. Update the skill description, purchase/refund previews and effect breakdown to enumerate Avocados, the 50/100 milestones, Production Scaling and every Swarm multiplier, and accurately quote the production change before confirmation; costs/unlocks must still see manual purchases. | **Approved.** Add Supernova to the shared manual-purchase production work from F-05 and F-19. While the current Supernova is owned, suppress the entire manual-purchase production layer, including the base 50/100 bonuses, Production Scaling and exact Swarm multipliers, and the Avocados 69-purchase doubler. Purchases remain valid and continue to count for costs, ownership, unlocks and non-production requirements. The player-facing skill description, purchase preview, refund preview and effect breakdown must explicitly warn that all of those categories are suppressed and accurately preview the resulting production loss or restoration before confirmation. Possible future galvanized-Supernova choices or subskills may remove or alter this downside, but they are outside this repair. |
| F-10 | High | Confirmed formula bug | Panel Warranty parses as `(5 * fragments > 1) ? 2^(fragments-1) : 1`, returning 1/2/4 in the probe. | The fragment lifetime bonus is much smaller than described. | Parenthesize and encode the documented base/doubling formula; test the exact examples printed in the UI. | **Approved.** Panel Warranty grants 5 seconds when it is the only owned Fragment Skill, then doubles for each other owned Fragment Skill: 5, 10, 20, 40 seconds for one through four Fragments. Implement `5 * 2^(fragmentCount - 1)` while owned, return no bonus while unowned, correct the contradictory displayed examples to 5 seconds for one and 20 seconds for three, and test zero plus one through four Fragments. |
| F-11 | High | Confirmed formula bug | Regulated Academia uses `1.02 + 1.01 * (fragments - 1)` in both money and science paths. | One fragment supplies 2% rather than 20%; the second causes a discontinuous jump to 103%. | Express the intended percentage in one named helper and test fragment counts 1, 2, 3 and 7. | **Approved.** Increase both Science Boost and Cash Boost base effects by 20% while Regulated Academia is the only owned Fragment Skill, then add 10 percentage points for every other owned Fragment Skill. The progression is 20%, 30%, 40%, 50% for one through four Fragments; use one shared calculation for both paths and test the unowned case plus representative Fragment counts. |

## Connected-but-mismatched findings

Unity reconciliation shows F-10 through F-20 are mirrored authored/legacy semantics rather than generated-data drift. They remain current player-facing defects or ambiguities; “mirrored” does not make the copy true.

| ID | Severity | Skills | Runtime versus description | Fix direction | My decision |
| --- | --- | --- | --- | --- | --- |
| F-12 | Medium | Purity of Mind, Body, S-Essence | The current formulas scale linearly as `1.5 * points`, `1.25 * points` and `1.42 * points`. They return the neutral 1x at zero and match the one-point values, but they do not compound each unspent point. The existing “more ... for each” descriptions do not state the selected compounding behavior clearly. | Use true per-point compounding, return the neutral 1x at zero points, multiply Essence with the applicable Mind and Body results, update all three technical descriptions, and preserve the legacy `purityOfSEssence` identifier for save compatibility. Test 0/1/2 points and the reachable 34-point maximum, including purchase/refund quotes and resulting production at 33→34 and 34→33 unspent points so the UI accurately exposes the spend-a-point consequence. | **Approved intentional balance change with accepted cliff.** Purity of Mind is `1.5^unspentPoints` for Cash and Science, Purity of Body is `1.25^unspentPoints` for Bots, and Purity of Essence is `1.42^unspentPoints` for everything. Each unspent point compounds independently, and Essence stacks multiplicatively with Mind and Body. At 34 unspent points, the combined Mind+Essence and Body+Essence multipliers are intentionally extreme. Spending a point can sharply reduce production and creates a strong hoarding incentive; the user knowingly accepts that trade-off rather than treating it as an unresolved balance question. Purchase/refund previews and effect breakdowns must report the 33↔34 consequence accurately before confirmation. |
| F-13 | Medium | Worker Boost, Produced as Science | Allocation percent is used directly as a multiplier; 1% allocation produces x1 instead of the documented +100% (x2). | Add the neutral 1x base to the allocated percentage-point multiplier and test the full slider range, including Bot Multitasking. | **Approved.** Follow the descriptions: each percentage point allocated to Workers adds +100% Cash production, and each percentage point allocated to Science adds +100% Science production. Use `1 + allocatedPercentagePoints`, so 0%, 1% and 100% produce 1x, 2x and 101x respectively. Bot Multitasking treats both effects as fully allocated. The bonus adds within each skill and the resulting multiplier combines multiplicatively with other upgrades. |
| F-14 | Medium | Citadel Council | Runtime adds `log base 1.2(panels decayed)` seconds to lifetime; text says lifetime is multiplied by that value. | Apply the logarithm as a multiplier to completed Panel Lifetime, retain a defensive minimum and finite-result guard, and update the effect breakdown and active/offline tests. | **Approved.** Use `max(1, log1.2(totalPanelsDecayed))` as a multiplier rather than a flat addition. Apply it after flat lifetime additions such as Shepherd, Panel Warranty and the 20-second upgrade so it multiplies the completed lifetime value. The 1x floor is defensive for unusual imported or reset states and must prevent the skill from reducing lifetime. |
| F-15 | Medium | Reapers | Runtime multiplier is `1 + log2(panels)/10`; text states `log2(panels)/10`. | Remove the extra neutral term, apply the documented logarithmic multiplier with a defensive floor, and test the effect against the shared cumulative Panels Decayed statistic. | **Approved.** Reapers uses `max(1, log2(totalPanelsDecayed) / 10)` as the complete Panel Production multiplier. Remove the current extra `+1`; retain the 1x floor solely to prevent low or unusual states from reducing production. Update the effect breakdown and test exact values including 1,024 Panels Decayed, where the multiplier must be 1x rather than the current 2x. |
| F-16 | Medium | Worthy Sacrifice | Catalog multiplies Assembly modifier by 2.5 while text promises 5x; the 50% lifetime penalty is connected. | Change the Assembly Line production multiplier from 2.5x to 5x, retain the existing 50% Panel Lifetime penalty, allow normal multiplicative stacking with other Assembly modifiers, and update the effect breakdown plus focused stacking tests. | **Approved.** Follow the advertised trade-off: Assembly Line production is multiplied by 5x, the existing 50% Panel Lifetime penalty remains, and the reward stacks normally with other Assembly modifiers. |
| F-17 | Medium | Dyson Subsidies | Cash-before-star branch works, but Assembly production switches only when `floor(stars) > 1`, leaving the first surrounded star without the promised 2x Bot branch. | Make the branches hand off at the first surrounded star: below 1 star use the 3x Cash branch; at exactly 1 star and above disable it and use the 2x Bot/Assembly production branch. Test values just below, exactly at and above 1 to prove there is no gap or overlap. | **Approved.** Follow the description. Before 1 surrounded star, Dyson Subsidies grants 3x Cash production. At exactly 1 surrounded star and above, the Cash branch turns off and the 2x Bot production branch, implemented through Assembly Line production, turns on. The transition must have no gap. |
| F-18 | Medium | Galactic Pradigm Shift | Planet modifier switches to 3x only when `floor(galaxies) > 1`, not after the first engulfed galaxy as described. | Make the Planet-production branches switch at the first engulfed galaxy: below 1 galaxy use 1.5x and at exactly 1 galaxy and above use 3x. Preserve the legacy-spelled internal identifier `galacticPradigmShift` for save compatibility and test values just below, exactly at and above 1. | **Approved.** Follow the description. Before 1 engulfed galaxy, Planet production is multiplied by 1.5x; at exactly 1 engulfed galaxy and above, it is multiplied by 3x. Preserve the legacy `galacticPradigmShift` identifier for save compatibility. |
| F-19 | Medium | Production Scaling, Mega Swarm | The source manual-building layer makes Production Scaling a fixed cutoff of 90, ignoring the promised additional -5 per other purchased Fragment Skill. Mega Swarm uses integer `100/3 = 33` as its divisor, yielding about 3.03% per step rather than exactly 3%. Web currently lacks the whole base manual-purchase production layer and its existing 50/100 milestones (F-05), so these are latent as well as mirrored. | Implement one shared manual-purchase production calculation for the missing base multiplier, its 50- and 100-purchase milestones, Production Scaling and the complete Swarm progression. Production Scaling's threshold is `max(0, 90 - 5 * otherPurchasedFragmentSkills)`, and only purchases beyond that threshold earn scaling: at 90, purchase 91 is first; at 85, purchase 86 is first. Use exact post-threshold rates together in that layer: base 1%, Super Swarm 2%, Mega Swarm 3% and Ultimate Swarm 5%; do not use integer divisors. Make player-facing copy say “beyond” or “after” the threshold, integrate F-09 suppression, and test 89/90/91, analogous reduced thresholds, 49/50/51 and 99/100/101 milestone boundaries. | **Approved as one coordinated repair.** Restore the currently missing base manual-purchase production multiplier and its existing 50/100 milestones in the same shared layer as Production Scaling and the Swarm Skills. When Production Scaling is purchased, its threshold is 90 minus 5 for every other purchased Fragment Skill (90, 85, 80, 75, etc.), clamped to a minimum of zero defensively. The threshold purchase itself earns no scaling increment: a threshold of 90 makes purchase 91 the first increment, a threshold of 85 makes purchase 86 first, and so on. Player-facing copy must explicitly describe buildings purchased beyond/after the threshold. The exact progression is base 1%, Super Swarm 2%, Mega Swarm 3% and Ultimate Swarm 5%; avoid the legacy integer-divisor approximation for 3%. This work includes the earlier manual-purchase multiplier decision from F-05 and Supernova suppression from F-09 and must not be fragmented into separate tasks. |
| F-20 | Medium | One Minute Plan, Pocket Androids, Stellar Obliteration, Versatile Production Tactics | One Minute Plan uses a strict `> 60` check on calculated Panel Lifetime, so it still gives x1.5 at exactly 60 seconds instead of x5. Pocket Androids' timer does not advance (F-03), and its current formula reaches the 100x cap at 3,564 seconds rather than one hour. Stellar Obliteration divides Cash/Science by ordinary galaxies although the copy says Stellar Galaxies. VPT's first branch increases Assembly Lines produced by existing AI Managers rather than production of AI Managers themselves; its 50% Planet-production branch at 100 Planets already works. | Correct One Minute Plan's calculated-lifetime boundary to below 60 seconds versus 60 seconds and above. Repair Pocket Androids with F-03, using a linear multiplier `1 + 99 * min(timerSeconds, 3600) / 3600`. For VPT, retain the existing authoritative player-facing text and retarget the underlying authored/generated effect from Assembly Line output by existing AI Managers to the process that creates AI Managers. Update the source asset/effect target, generated catalog and effect ID or define a stable-ID migration strategy, effect breakdown and tests without breaking existing saves; preserve the working Planet branch. Retain F-08's approved Stellar-Galaxies correction and add exact boundary, midpoint, cap and target tests. | **Fully approved.** One Minute Plan uses calculated Panel Lifetime, not ownership duration: below 60 seconds gives x1.5 Assembly Line production, while exactly 60 seconds and above gives x5. Pocket Androids' timer must advance as part of F-03; its multiplier starts at x1, distributes the remaining 99x linearly across exactly 3,600 seconds, reaches x50.5 at 1,800 seconds and exactly x100 at 3,600 seconds, then remains capped at x100. Replace the current early 3,564-second cap. VPT's existing player-facing description remains authoritative and must not be rewritten to describe the old behavior: its first branch makes the process that creates AI Managers produce 50% more AI Managers (x1.5), rather than increasing Assembly Lines produced by existing AI Managers. Retarget its authored/generated effect and effect breakdown accordingly while preserving save compatibility and the working second branch that boosts Planet production by 50% at 100 Planets. Stellar Obliteration uses Stellar Galaxies as already approved in F-08. |

## Transactions, ownership, fragments, automation, saves and UI

| Area | Result | Evidence/limitations |
| --- | --- | --- |
| Purchase | Verified | Cost, ownership, prerequisites, exclusivities and current unlock flags are checked canonically. Insufficient points and duplicate ownership are rejected. Web intentionally buys missing prerequisite closure in one transaction, whereas Unity's manual click buys only the selected available node. |
| Refund | Verified | Refundability, `unrefundableWithIds` and dependent descendants are checked. Refunding also removes the skill from all five preset queues. The seven intrinsic non-refundable nodes are Banking, Investment Portfolio and the five locked Shoulders chain nodes. Once Shoulders of Giants is owned, nine foundations are additionally locked: Start Here, Assembly Line, AI Manager, Server, Data Center, Planets, Parallel Processing, Pocket Dimensions and Scientific Planets. |
| Exclusivities | Verified | Twenty directed exclusivity references are enforced in purchase, preview, preset composition and import. Several arrays are deliberately asymmetric descendant branch-locks rather than ten reciprocal pairs; Web consumes the authored direction exactly. Cascading preset removal preserves closure. |
| Presets | Partial; F-01 | Dependency closure and exclusivity are enforced for normal editing; import validates IDs/exclusivity but not dependency closure or current unlock. Web live preset activation uses gated autoassignment, but Web Infinity-reset assignment does not. Unity live and headless assignment also omit the gate, making the executor omission shared while the confirmed import exposure is Web-specific. |
| Ownership/effects | Verified where marked `V` | Catalog materialization checks assigned ownership, facility tags, conditions and dynamic resolvers. All 134 skill-linked effects target a supported stat. Nodes marked `N/B/D` were traced beyond this layer to their real (or missing) consumer. |
| Fragment count | Connected, with approved node repairs | The canonical count is assigned fragment skills. It reaches fragment formulas, but Production Scaling's primary effect is absent; its approved F-19 repair uses other purchased Fragment Skills to produce a threshold sequence of 90, 85, 80, 75, etc., clamped to zero. Panel Warranty and Regulated Academia formulas are wrong and have their approved repairs in F-10 and F-11. |
| Automation | Verified except shared reset-gate bypass | Assembly Megalines reaches automated assembly pricing; Repeatable Research reaches manual and automated research quotes; reset banking/investment reach Infinity reset. Automation consumes canonical derived rates. |
| Save persistence/migration | Structurally verified | All 104 IDs exist in migration maps. Hydration/serialization materialize state and bitsets for all skills, five queues and five presets; legacy saves are normalized. Timer fields persist, but persistence does not make the missing timer/event consumers work. |
| Frontend | Structurally verified; interaction/localization gaps | `SkillsSurface` filters by canonical visibility, shows generated text/cost/icon, and uses canonical purchase/refund/cascade previews and confirmations. Unity persists a `skillsBuyOnTap` preference that changes click/refund behavior (`Assets/Scripts/SkillTreeStuff/SkillTreeManager.cs:790-818,922-957`); Web preserves/classifies that imported preference but does not consume it or expose an equivalent setting. Web instead uses its own inspect/confirm interaction. All 312 generated skill message IDs are absent from the authored locale catalogs; the localization helper therefore relies on generated English fallback for these fields. Non-English skill-node copy needs product confirmation/testing. |

## Complete per-skill ledger

Notation: `req` lists direct prerequisites; `excl` lists the mutually exclusive node; `NR` means intrinsically non-refundable. Gate names are the exact Unity/Web schema categories, not inferred progression labels. `F-01` applies to every Fragment/Purity/Terra/Power/Paragade/Stellar row. The First Infinity gate itself is verified under F-02.

### Base / always-unlocked schema (50)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 001 | `aiManagerTree` (1) | req `startHereTree` | Catalog facility modifier → Manager production rate | V |
| 002 | `androids` (2) | req `workerEfficiencyTree`, `panelLifetime20Tree` | Panel dynamic reads a timer that never advances | N — F-03 |
| 003 | `artificiallyEnhancedPanels` (1) | req `panelLifetime20Tree` | Panel dynamic → lifetime | V |
| 004 | `assemblyLineTree` (1) | req `startHereTree` | Catalog facility modifier → Assembly production rate | V |
| 005 | `assemblyMegaLines` (1) | req `assemblyLineTree` | Automation price quote for Assembly Lines | V |
| 006 | `avocados` (2) | root | Owned + facility-count condition (`>=69`) → all facility production rates | V |
| 007 | `banking` (1, NR) | root | Infinity-reset skill-point bank | V |
| 008 | `burnOut` (1) | req `manualLabour` | Panel lifetime penalty and panel-rate multiplier → rates | V |
| 009 | `coldFusion` (1) | req `fusionReactors` | Money/science dynamic → income rates | V |
| 010 | `dataCenterTree` (1) | req `startHereTree` | Catalog facility modifier → Data Center production rate | V |
| 011 | `doubleScienceTree` (1) | req `startHereTree` | Catalog science multiplier → science rate | V |
| 012 | `dysonSubsidies` (1) | req `manualLabour` | Star-conditional Cash/Assembly dynamic has a first-star gap; approved handoff is 3x Cash below 1 star and 2x Bot/Assembly production from exactly 1 star | D — F-17 |
| 013 | `economicDominance` (1) | req `economicRevolution`; excl `scientificDominance` | Money/science catalog multipliers → income rates | V |
| 014 | `economicRevolution` (1) | req `workerEfficiencyTree` | Dynamic money multiplier → money rate | V |
| 015 | `endOfTheLine` (1) | req `worthySacrifice` | Assembly/planet facility modifiers → production | V |
| 016 | `fusionReactors` (1) | req `burnOut` | Money penalty and panel-rate multiplier → rates | V |
| 017 | `galacticPradigmShift` (1) | req `dysonSubsidies` | Galaxy-conditional Planet modifier switches only after >1 galaxy; approved boundary is 1.5x below 1 and 3x from exactly 1, retaining the legacy ID | D — F-18 |
| 018 | `higgsBoson` (2) | req `startHereTree` | Dynamic money multiplier → money rate | V |
| 019 | `hubbleTelescope` (1) | req `scientificPlanets` | Planet-generation dynamic (scientific planet term x2) | V |
| 020 | `idleElectricSheep` (2) | root | Persisted timer only; no offline/event consumer | N — F-04 |
| 021 | `idleSpaceFlight` (3) | req `producedAsScienceTree` | Active-panel-count dynamic science multiplier → science rate | V |
| 022 | `investmentPortfolio` (1, NR) | req `banking` | Infinity-reset skill-point bank modifier | V |
| 023 | `jamesWebbTelescope` (1) | req `hubbleTelescope` | Planet-generation dynamic (scientific planet term x4) | V |
| 024 | `manualLabour` (1) | root | Tinker yield → tinker event/credit | V |
| 025 | `megaSwarm` (2) | req `superSwarm` | No purchased-building multiplier consumer | N — F-05 |
| 026 | `oneMinutePlan` (1) | req `worthySacrifice`, `dysonSubsidies` | Assembly modifier uses calculated Panel Lifetime but incorrectly requires >60s; approved boundary is x1.5 below 60s and x5 from exactly 60s | D — F-20 |
| 027 | `panelLifetime20Tree` (1) | req `startHereTree` | Catalog lifetime add → panel lifetime | V |
| 028 | `parallelProcessing` (1) | req `serverTree`, `aiManagerTree`, `assemblyLineTree` | Dynamic Server modifier → facility production | V |
| 029 | `planetAssembly` (1) | req `galacticPradigmShift`, `versatileProductionTactics` | Planet-generation dynamic → planet rate | V |
| 030 | `planetsTree` (1) | req `startHereTree` | Catalog Planet modifier → planet facility rate | V |
| 031 | `pocketDimensions` (1) | req `parallelProcessing`, `dataCenterTree` | Dynamic Planet production add → planet facility rate | V |
| 032 | `powerOverwhelming` (1) | req `powerUnderwhelming` | Money per-second power operation → money rate | V |
| 033 | `powerUnderwhelming` (1) | req `coldFusion` | Science per-second power operation → science rate | V |
| 034 | `producedAsScienceTree` (1) | req `doubleScienceTree` | Worker allocation dynamic → science; missing neutral base | D — F-13 |
| 035 | `repeatableResearch` (1) | req `doubleScienceTree` | Manual and automated research purchase quote | V |
| 036 | `renewableEnergy` (1) | req `artificiallyEnhancedPanels` | Lifetime multiplier → panel lifetime | V |
| 037 | `rocketMania` (3) | req `endOfTheLine` | Dynamic panel-rate multiplier → panel rate | V |
| 038 | `scientificDominance` (1) | req `scientificRevolution`; excl `economicDominance` | Science/money catalog multipliers → income rates | V |
| 039 | `scientificPlanets` (1) | req `planetsTree`, `pocketDimensions` | Planet-generation dynamic → planet rate | V |
| 040 | `scientificRevolution` (1) | req `doubleScienceTree` | Dynamic science multiplier → science rate | V |
| 041 | `serverTree` (1) | req `startHereTree` | Catalog Server modifier → Server production rate | V |
| 042 | `shellWorlds` (1) | req `planetAssembly` | Planet-generation dynamic → planet rate | V |
| 043 | `startHereTree` (1) | root | Money/science multipliers → both income rates | V |
| 044 | `stayingPower` (2) | req `artificiallyEnhancedPanels` | Assembly production multiplier → Assembly rate | V |
| 045 | `superSwarm` (2) | req `manualLabour` | No purchased-building multiplier consumer | N — F-05 |
| 046 | `ultimateSwarm` (3) | req `megaSwarm` | No purchased-building multiplier consumer | N — F-05 |
| 047 | `versatileProductionTactics` (1) | req `oneMinutePlan` | First authored/generated effect targets Assembly output from existing AI Managers instead of the AI Manager creation process; retarget it without changing authoritative copy or breaking saves, while preserving the working 50% Planet branch at 100 Planets | D — F-20 |
| 048 | `workerBoost` (1) | req `workerEfficiencyTree` | Worker allocation dynamic → money; missing neutral base | D — F-13 |
| 049 | `workerEfficiencyTree` (1) | req `startHereTree` | Panel-rate multiplier → panel rate | V |
| 050 | `worthySacrifice` (1) | req `burnOut` | Lifetime penalty works; Assembly value is 2.5x rather than the approved advertised 5x, which should stack normally | D — F-16 |

### First Infinity gate (21)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 051 | `agressiveAlgorithms` (1) | req `unsuspiciousAlgorithms` | Facility dynamic trade-off → production | V |
| 052 | `clusterNetworking` (1) | req `rudimentarySingularity` | Dynamic Server modifier plus Rudimentary Singularity multiplier → production | V |
| 053 | `dimensionalCatCables` (1) | req `pocketDimensions` | Pocket Dimensions x5 plus 0.75x Planet modifier → production | V |
| 054 | `hypercubeNetworks` (1) | req `whatWillComeToPass`; excl `whatCouldHaveBeen` | Dynamic Data Center modifier → production | V |
| 055 | `parallelComputation` (1) | req `hypercubeNetworks`, `clusterNetworking`; excl `whatCouldHaveBeen` | Data Center production multiplier → production | V |
| 056 | `pocketAndroids` (1) | req `solarBubbles`; excl `whatCouldHaveBeen` | Timer never advances; approved F-03/F-20 repair ramps linearly from x1 to x100 over exactly 3,600s instead of capping at 3,564s | N — F-03; F-20 |
| 057 | `pocketMultiverse` (2) | req `pocketProtectors` | Derived Pocket Dimension modifier → production | V |
| 058 | `pocketProtectors` (1) | req `dimensionalCatCables` | Derived Pocket Dimension modifier → production | V |
| 059 | `quantumComputing` (1) | req `parallelComputation`; excl `whatCouldHaveBeen` | Pocket Dimensions multiplier from Rudimentary Singularity production → Data Center production | V |
| 060 | `rudimentarySingularity` (1) | req `parallelProcessing` | Dynamic Data Center production add → production | V |
| 061 | `shouldersOfGiants` (1, NR) | req `scientificPlanets` | Calculates `scienceBoostPerSecond`; no event commit | N — F-07 |
| 062 | `shouldersOfPrecursors` (1, NR) | req `shouldersOfGiants`; excl `shouldersOfTheEnlightened` | Money dynamic using precursor state → money rate | V |
| 063 | `shouldersOfTheEnlightened` (1, NR) | req `shouldersOfGiants`; excl `shouldersOfPrecursors` | Calculates `moneyUpgradePerSecond`; no event commit | N — F-07 |
| 064 | `shouldersOfTheFallen` (1, NR) | req `shouldersOfPrecursors`; excl `shouldersOfTheEnlightened` | Planet-generation dynamic → planet rate | V |
| 065 | `shouldersOfTheRevolution` (1, NR) | req `shouldersOfTheEnlightened`; excl `shouldersOfPrecursors` | Dynamic money multiplier → money rate | V |
| 066 | `shoulderSurgery` (1) | req `whatCouldHaveBeen`; excl `whatWillComeToPass` | Modifies the dead Pocket-Dimension science-boost path only | N — F-07 |
| 067 | `solarBubbles` (1) | req `whatWillComeToPass`; excl `whatCouldHaveBeen` | Derived Data Center/Pocket intermediate → production | V |
| 068 | `superRadiantScattering` (3) | req `scientificPlanets` | Global dynamic reads timer that never advances | N — F-03 |
| 069 | `unsuspiciousAlgorithms` (1) | req `rudimentarySingularity` | Derived algorithm modifier → production | V |
| 070 | `whatCouldHaveBeen` (1) | req `dimensionalCatCables`, `shouldersOfGiants`; excl `whatWillComeToPass` | Calculates extra `scienceBoostPerSecond`; no event commit | N — F-07 |
| 071 | `whatWillComeToPass` (1) | req `dimensionalCatCables`; excl `whatCouldHaveBeen` | Dynamic Data Center modifier → production | V |

### Fragment gate (7)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 072 | `fragmentAssembly` (1) | root | Fragment-count facility modifiers → all facility rates | V; F-01 |
| 073 | `monetaryPolicy` (1) | req `workerEfficiencyTree` | Fragment-count money multiplier → money rate | V; F-01 |
| 074 | `panelWarranty` (1) | req `panelLifetime20Tree` | Lifetime dynamic has precedence/base bug | B — F-10; F-01 |
| 075 | `productionScaling` (1) | req `superSwarm` | Counts as a fragment, but no advertised scaling-cutoff consumer; approved semantics make the purchase after the threshold the first increment (91 after 90, 86 after 85) | N — F-05; F-01 |
| 076 | `progressiveAssembly` (1) | req `assemblyLineTree` | Fragment-count Assembly modifier → production | V; F-01 |
| 077 | `regulatedAcademia` (1) | req `coldFusion` | Money/science dynamic uses wrong base/step formula | B — F-11; F-01 |
| 078 | `terraformingProtocols` (1) | req `scientificPlanets` | Fragment-count planet-generation dynamic → planet rate | V; F-01 |

### Purity gate (3)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 079 | `purityOfMind` (2) | req `manualLabour` | Unspent-point money/science multiplier is linear rather than approved compounding; accepted high-point spend/refund cliff requires accurate quotes | D — F-12; F-01 |
| 080 | `purityOfBody` (2) | req `purityOfMind` | Unspent-point Assembly modifier is linear rather than approved compounding; accepted high-point spend/refund cliff requires accurate quotes | D — F-12; F-01 |
| 081 | `purityOfSEssence` (3) | req `purityOfBody` | Unspent-point global/facility multiplier is linear rather than approved compounding; preserve legacy ID and expose the accepted combined high-point cliff | D — F-12; F-01 |

### Terra gate (7)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 082 | `terraFirma` (1) | req `galacticPradigmShift` | No planet→Data Center effective-count transform | N — F-06; F-01 |
| 083 | `terraEculeo` (1) | req `terraFirma` | No planet→Server effective-count transform | N — F-06; F-01 |
| 084 | `terraInfirma` (1) | req `terraEculeo` | No planet→Manager effective-count transform | N — F-06; F-01 |
| 085 | `terraNullius` (1) | req `terraInfirma` | No planet→Assembly effective-count transform | N — F-06; F-01 |
| 086 | `terraNova` (1) | req `terraFirma` | No Planet Boost→planet-cost consumer; cost probe unchanged | N — F-06; F-01 |
| 087 | `terraGloriae` (1) | req `terraNova` | No total-planets→planet-cost consumer; cost probe unchanged | N — F-06; F-01 |
| 088 | `terraIrradiant` (1) | req `terraNullius`, `terraGloriae` | Partial goal/VPT effective-planet use; universal 12x count absent | B — F-06; F-01 |

### Power gate (4)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 089 | `superchargedPower` (1) | req `workerEfficiencyTree` | Global/facility production multipliers → rates | V; F-01 |
| 090 | `tasteOfPower` (1) | req `superchargedPower` | Dynamic global/facility power term and debuff → rates | V; F-01 |
| 091 | `indulgingInPower` (1) | req `tasteOfPower` | Facility multipliers → rates | V; F-01 |
| 092 | `addictionToPower` (1) | req `indulgingInPower` | Facility multipliers → rates | V; F-01 |

### Paragade gate (7)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 093 | `panelMaintenance` (3) | req `manualLabour` | Dynamic lifetime → panel lifetime | V; F-01 |
| 094 | `paragon` (1) | req `panelMaintenance`; excl `renegade` | Science multiplier → science rate | V; F-01 |
| 095 | `shepherd` (1) | req `paragon`; excl `renegade` | Lifetime add → panel lifetime | V; F-01 |
| 096 | `citadelCouncil` (1) | req `shepherd`; excl `renegade` | Adds logarithmic seconds rather than multiplying lifetime | D — F-14; F-01 |
| 097 | `renegade` (1) | req `panelMaintenance`; excl `paragon` | Money multiplier → money rate | V; F-01 |
| 098 | `saren` (1) | req `renegade`; excl `paragon` | Panel-rate multiplier → panel rate | V; F-01 |
| 099 | `reapers` (1) | req `saren`; excl `paragon` | Panel-rate formula includes undocumented neutral +1 | D — F-15; F-01 |

### Stellar gate (5)

| # | Skill (cost) | Requirements | Actual Web consumer | Verdict |
| ---: | --- | --- | --- | --- |
| 100 | `stellarSacrifices` (2) | root | Planet generation works; no Bot debit. Approved repair atomically spends only interval-start Bots, deferring same-step produced Bots to the next step | B — F-08; F-01 |
| 101 | `stellarDominance` (3) | req `stellarSacrifices` | Lifetime/money/stellar scaling work; bot cost absent and boundary strict | B — F-08; F-01 |
| 102 | `stellarImprovements` (3) | req `stellarSacrifices` | Lowers Stellar Sacrifice bot threshold → planet-generation eligibility | V; F-01 |
| 103 | `stellarObliteration` (2) | req `stellarSacrifices` | Divides income by ordinary rather than documented Stellar Galaxies; correction approved in F-08/F-20 | D — F-20; F-01 |
| 104 | `supernova` (4) | req `stellarObliteration` | 1000x stellar Planet term works; full manual-building suppression and explicit Avocados/milestone/Scaling/Swarm loss previews are absent | B — F-09; F-01 |

## Coverage reconciliation

- The 104 ledger IDs are unique and exactly match the generated presentation and runtime skill IDs.
- Primary verdict arithmetic: 67 `V` + 18 `N` + 6 `B` + 13 `D` = 104.
- Formal gates and authored costs: 50 Base / 63 SP + 21 First Infinity / 24 SP + 7 Fragment / 7 SP + 3 Purity / 7 SP + 7 Terra / 7 SP + 4 Power / 4 SP + 7 Paragade / 9 SP + 5 Stellar / 14 SP = 104 skills / 135 SP.
- The absence of separate Reality/Simulation gates is verified Unity/Web parity (F-02), not a defect.
- The reset-time line-unlock omission is shared Unity/Web behavior (F-01); Web's preset import is the confirmed path that makes the bypass reproducible from normalized Web state.

## Web evidence map

These are the principal source ranges used to follow the generated data to a real consumer:

- `src/simulation/canonicalSkillTransactions.ts:531-663,666-794` — autoassignment, unlock resolution, visual availability, refundability, descendants and queue cleanup.
- `src/simulation/canonicalSkillPresetTransactions.ts:76-194,217-283,328-389` — dependency closure, cascading removal, import validation and preset normalization.
- `src/simulation/canonicalInfinityReset.ts:118-210,328-545` — point banking, captured preset rules, reset and autoassignment; the missing unlock recheck behind F-01.
- `src/simulation/canonicalDysonDerivation.ts:255-405,733-810` — catalog/dynamic materialization, global/facility/auxiliary derivation and effect target dispatch.
- `src/simulation/dysonModel.ts:160-276` — effective facility counts and final money/science/panel/facility rate consumers.
- `src/simulation/canonicalEventTimeModel.ts:430-479,525-558,628-688` — production/tinker arrivals and commits; the missing timer and Shoulders auxiliary commits.
- `src/simulation/panelDynamicEffects.ts:34-86` — Panel Warranty, Androids, Citadel/Stellar, Reapers and Rocket Mania.
- `src/simulation/moneyScienceSkillEffects.ts:105-204,228-292,326-406` — Regulated Academia, allocation, Purity, Power and Stellar money/science formulas.
- `src/simulation/dynamicFacilitySkillEffects.ts:50-94` — fragment, Purity, threshold and timer-backed facility formulas.
- `src/simulation/planetGenerationDynamicEffects.ts:61-152` — scientific planets, telescope, Terraforming and Stellar Sacrifices generation/eligibility.
- `src/simulation/shouldersTinkerDynamicEffects.ts:46-150` — Shoulders auxiliary and Tinker/VPT formulas.
- `src/simulation/dysonDerivedIntermediates.ts:49-120` — algorithms, Pocket line, Solar Bubbles and Quantum Computing intermediates.
- `src/simulation/dysonAutomation.ts:404-421` and `src/simulation/researchAutomation.ts:519-535` — Assembly Megalines and Repeatable Research automation consumers.
- `src/game-state/mapping.ts:274-292,657-715` and `src/save/migrate.ts:258-370` — hydration, serialization, all-skill materialization, timer handling and preset/queue migration.
- `src/ui/gameplay/skills/SkillsSurface.tsx:258-278,1215-1477` and `src/game-data/skillPresentationLocalization.ts` — visibility, generated presentation fallback, canonical previews and confirmations.

## Implementation verification (2026-08-20)

> Historical verification record. The Stored Time implementation and performance claims in this section describe the superseded 2026-08-20 engine and are not current acceptance requirements. The current authority is `docs/contracts/game-processing-and-offline-time-contract.md`.

The verdicts and probes above remain the pre-repair evidence baseline. The approved Web repair contract is now implemented and the following completion record supersedes their implementation status:

- F-01 and F-02: imported presets annotate currently locked IDs, reset assignment rechecks the authored first-Infinity and six Quantum-line gates, and a blocked ID remains queued without spending points until its real gate unlocks.
- F-03, F-04, F-07 and F-08: timer, offline-time, auxiliary-economy and Stellar Sacrifice changes were certified against the engine that existed when this audit was completed. Its representative-group and adaptive-grouping behavior has since been retired; those processing details must not be used as current requirements.
- F-05, F-06, F-09 and F-19: one shared manual-purchase layer now supplies the 50/100 milestones, exact Swarm rates, Fragment-dependent Production Scaling boundaries, Terra count substitutions, Terra planet pricing and complete Supernova suppression. Avocados eligibility remains isolated to each facility's own raw manual-purchase count; Terra-substituted counts cannot unlock it. Terra Nova and Terra Gloriae retain the historical nonzero-total-Planet guard in both quote and purchase paths. Terra Nova's historical Planet Boost divisor includes the Planet 50/100 milestones and post-threshold scaling but excludes the separately applied Avocados doubler; Supernova suppresses those included layers. Purchase previews, affordability, manual purchase, automation, derivation and direct or cascading Supernova purchase/refund reporting use the same repaired calculations.
- F-10 through F-20: all approved formulas, inclusivity boundaries, authored descriptions, generated targets and stable-ID constraints are covered by focused tests. This includes exponential Purity quotes, the VPT AI-Manager target with its legacy effect ID retained, `purityOfSEssence`, `galacticPradigmShift`, Stellar-Galaxy penalties, the 3,600-second Pocket Android ramp and the One Minute Plan 60-second boundary.
- Generated game-data and localization catalogs were rebuilt from the repaired authored assets. The first-run catalog provenance, canonical progression artifact and first-Dyson parity fixture were refreshed to the new deterministic hashes without changing the legacy save schema.
- Automated verification passed: `npm test` (179 files, 1,700 tests), `npm run build`, `npx tsc -b --pretty false`, `npm run lint`, `npm run data:check`, `npm run i18n:check` and `npm run parity:first-dyson:check`.
- The one-day Stored Time performance figures recorded by this historical audit belong to the retired representative-group engine. They are retained only as historical evidence and are not comparable to the current shared-step presets.
- Visible browser verification on a clean local origin exercised the English skill tree after unlocking all six authored Quantum lines. Production Scaling, Purity, Supernova, VPT and Panel Warranty rendered the repaired copy; Purity and Supernova displayed their forced production-impact confirmations; Supernova ownership and prerequisites survived a timed checkpoint and full reload; the direct and cascading refund previews described the complete restored manual-purchase layer; and the browser reported no runtime warnings or errors.

## Limitations and integration notes

- This document began as an investigation-only audit. Its original ledger classifications and source ranges intentionally preserve the evidence that motivated the repairs; use the implementation verification section above for current completion status.
- The current active and Stored Time processing contract supersedes this audit's former exact/adaptive split. Refer to `docs/contracts/game-processing-and-offline-time-contract.md` for present ordering, approximation, and determinism requirements.
- The browser pass targeted the current English-only product boundary and the changed Skill surfaces. It was not a general accessibility, responsive-layout, audio, Store/native-host or localization certification, all of which remain separately routed.
- Unity catalog metadata and runtime behavior were used as evidence. Unity runtime support is being retired; only authored source assets required to keep Web generation coherent were changed, and the repairs execute in Web.
