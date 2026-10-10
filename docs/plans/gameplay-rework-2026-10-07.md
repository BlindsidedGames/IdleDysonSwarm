# IDS gameplay rework: stripping plan

Planning only, 7 October 2026. Baseline: `main` at `bdd95551912f8524c5abd02f52417fe9b9f7b799`. Isolated branch: `codex/ids-gameplay-rework-plan-20261007`. No gameplay changes are authorized by this document; implementation follows review. The discarded challenge-reward experiment is not a source or starting point.

The intended loop is **base game / Infinity → early persistent civilization Sims → era resources → Catalysts → permanent base fractures → faster civilizations → civilization completion reveals Transcendence → main Transcendence push → later automatic Sims**. Challenge rules are a separate redesign. A future transcended skill tree is not needed to complete this loop.

## REMOVE

| Gameplay to strip | Scope and boundary |
| --- | --- |
| Quantum currency, reset and shop | Remove QP/Shards, the 42-IP Quantum Leap, Entanglement conversion, Quantum run/reset bookkeeping, shop costs/reveals and Quantum navigation. Move selected useful effects first; do not leave a hidden Quantum reset behind. |
| Reality | Remove Influence generation/gathering, worker conversion, consumed universes, artifact translation/speed purchases and their 16 SP. Retire the Reality tab and its unlock path. Double Time needs a separate disposition below. |
| Old Simulations | Replace the bought producer chain, education, energy/overdrive/railgun/panel launches, Black Hole rewards, Strange Matter, disasters/countermeasures and old upgrades. This includes the 43 Simulation and 18 Reality upgrade definitions and their consumers. New Sims do not inherit SM or these upgrades. |
| Avocato feeds and purchase gate | Remove IP, Influence and SM feeding and all three logarithmic feed bonuses. Remove Quantum `Avocado` entirely. Extract TP, main Transcendence and Discovery responsibilities before removing their Avocato container/surface. |
| Avotation reward path | Remove the old four-SP source. Rename/reuse its achievements with obtainable replacement goals; any retained secrets presentation must not leave a dangling four-point grant. |
| Old challenge architecture | Replace the Infinity/Quantum split, rules, reward endpoints and Quantum suppression assumptions as part of the deferred redesign. Do not simply attach SP to the current challenge rules. Remove the current challenge-only Catalyst acquisition/gating dependency. |

Removing a gameplay layer also means removing its current commands, auto-actions, live statistics, route shortcuts, Wiki guidance, tooltips, localization and achievement predicates. Legacy save readers may temporarily retain old fields solely to perform migration; those fields must not keep producing rewards.

## MOVE

| Existing feature | Proposed destination / decision still needed |
| --- | --- |
| Break the Loop; Division | Infinity upgrades or challenge rewards. Preserve their useful progression roles; choose thresholds, costs, caps and reset retention later. |
| Fragments, Purity, Terra, Power, Paragade, Stellar | Move all six skill-line unlocks out of Quantum. Update assignment, presets and reset reconstruction together so an unlocked line stays usable. |
| Matrioshka Brains, Birch Planets, Galactic Brains | Infinity/challenge unlock progression. Keep the facilities; replace Quantum flags in visibility, purchases, production and augment consumers. |
| Automation, permanent Secrets, Bot Multitasking | Fold useful benefits into Infinity/challenges. Reconcile existing Infinity automation/Secrets purchases and Discovery's replacement of research/allocation; avoid duplicate or ineffective rewards. |
| Gameplay Double IP, cash/science boosters | Candidate Infinity/challenge benefits. Gameplay Double IP remains distinct from purchased Double IP. Science benefits must also have an explicit Discovery-era effect. Exact scaling and repeatability are undecided. |
| Double Time | It is currently the Reality permanent whole-game ×2 reward, **not a Quantum upgrade**. Decide whether to relocate that benefit into the new reward progression; delete its SM purchase and prevent stranded legacy ownership. No new destination/cost is selected here. |
| Catalyst economy and fracture ownership | New era resources buy Catalysts; eventual Transcendence can also supply them. Make this progression independent of challenge completion and of the `challenges` save container. Preserve atomic spend/refund and permanent ownership. |
| Main Transcendence and TP | Give them independent state and navigation. Civilization completion reveals the tab; the main push follows. Reveal is separate from the existing 1-TP Discovery purchase that replaces Science/Research. |
| Existing skill/augment effects aimed at old Sims or Avocato | Audit and retarget useful effects to civilization progress or the retained base game. Do not remove nodes casually: the target remains all 104 base nodes eventually fractured. New era resources and milestones need designed effects, not old producer formulas transplanted unchanged. |

`QuantumEntanglement`, `InfluenceSpeed` and `Avocado` have no destination: their mechanisms are removed. Other Quantum benefits above are candidates for preservation, not approval of every old formula.

## KEEP

- The base production game, Infinity progression, ten goal SP and ten Infinity-shop SP; useful skill lines, facilities, presets and augments remain part of the audit.
- Permanent base fractures and their coexistence. Catalysts eventually permit all **104 base nodes** to be fractured; fracture order and count milestones accelerate civilization progress. Child augments remain separate SP allocations, not another set of fracture targets.
- Purchased bonuses and entitlements, including Bot Boost and purchased Double IP, as a separate system. Do not convert purchases into gameplay rewards or clear entitlement state during the rework.
- Stored Time, including the ability to rush new Sims. Offline time currently banks Stored Time; direct passive offline civilization advancement has not been selected. Active play and spending Stored Time must share civilization advancement/reward rules.
- **Settled player migration choice:** accept equivalent relocated upgrades immediately, or decline compensation and earn the upgrades through Infinity. Keep-progress retains fractures; fresh progression removes fractures and invalid augments. Both preserve existing Transcendence progress, including TP and Discovery tiers/upgrades, and start new Sims fresh. Preserve all unaffected progress unless a specific migration need is demonstrated. Do not add a reset or assume lost power justifies resetting other base/Infinity progress.
- Rename/reuse **all old achievements** with obtainable goals. Retain relevant speedruns; deleting obsolete speedrun categories remains future policy. Changed goals need version-aware treatment of earned records.
- Persistent automatic civilization bars with richer early progress, several era resources and Catalyst purchases. Target pacing is roughly a day initially, then roughly 6h, 4h, 3h, 2h and 1h as progression accelerates. These are pacing targets, not six fixed eras or approved milestone thresholds. Infinity persistence is intended. Challenge reset rules and new-Sim reset behaviour are explicitly deferred; the challenge redesign could include a Sim reset.

## DEFER / decisions for review

- **Challenges:** entirely new rules, entry/completion conditions, reward order and restrictions. Favoured SP proposal: Manual Labour gives 4, eight other challenge slots give 2 each, totaling 20. This nine-slot arithmetic is a proposal, not an implementation or adoption of today's rules. Current challenges give **16 Catalysts, not 20 SP**.
- **Reward balance:** exact Infinity costs/gates, which benefits are challenge rewards, era resource names/rates, Catalyst prices/supply, fracture-count milestones, civilization pacing formulas and later auto-Sim unlock/behaviour.
- **Transcendence boundary:** retain the main push; choose the final threshold/reward/reset retention deliberately. Current baseline is 4e242 bots → 1 TP. Whether new civilization progress survives main Transcendence needs an explicit retention contract consistent with persistent Sims.
- **Migration implementation details:** map equivalent upgrades into their new destinations and handle specifically affected SP, preset, legacy Catalyst and challenge-record fields when those designs are ready. The player choice and preservation policies above are already set, not developer alternatives to re-decide or prerequisites for the first prototype. Do not invent a QP/SM/feed-balance exchange rate. Migration must not award a TP or perform an extra gameplay reset.
- **Achievement mappings/speedrun policy:** design obtainable replacement goals for every old achievement. Retain relevant speedruns and decide deletion of obsolete categories later. Preserve earned achievement records; do not relabel an old Quantum time as a new civilization time. Provider/account changes are outside this planning task.
- **Future transcended/new skill tree:** deferred entirely. It is not a dependency for repeatable Catalysts, all 104 fractures, Transcendence access or a complete initial rework.

The nominal current 40-SP progression is **10 goals + 10 Infinity shop + 16 Reality + 4 Avotation**. Removing the latter 20 leaves 20; the proposed challenge 20 would restore that nominal total. Catalysts and permanent fracture refunds are separate from that budget.

## Staged removal order

| Stage | Work package and completion boundary |
| --- | --- |
| 1. Scope the first prototype | Review this cut list using the settled player migration/preservation policies. Map retained Quantum benefits and obsolete skill/augment targets; define the prototype's first Sim access and reachable Catalyst. Challenge rules, new-Sim reset behaviour, later balance and achievement mappings remain deferred and do not require re-deciding settled policies before the first prototype. |
| 2. Untangle retained progression | Extract TP/main Transcendence/Discovery from Avocato, and Catalyst/fracture ownership from challenges. Change transaction, preview and save-validation gates together. Keep legacy input readable. A Sim-earned Catalyst must support a valid first fracture with no challenge completion. |
| 3. Relocate benefits | Implement the agreed Infinity/challenge reward destinations and update all consumers, assignments, presets, visibility, reset reconstruction and achievement facts. Preserve purchased entitlement handling separately. Remove reliance on Quantum flags before removing their state. |
| 4. Replace Sims | Introduce persistent civilization state, bars, era resources, atomic Catalyst purchases and fracture/milestone acceleration; connect active play and spending Stored Time, retaining offline banking. Separate Sim-completion tab reveal from Discovery unlock and main Transcendence eligibility. Resolve challenge/new-Sim reset rules and later auto-Sim behaviour separately when designed. |
| 5. Strip old gameplay | Remove Quantum/Entanglement, Reality, old Dream production/reset/upgrade actions and feeds; delete their scheduled callbacks and multiplier consumers as well as UI. Drop Reality/Avotation SP derivation only with the agreed SP transition. Challenge replacement remains its own reviewed package; final rework must not ship obsolete Quantum-dependent challenges. |
| 6. Migrate and retire | Present and apply the player's migration choice once and idempotently, retaining TP/Discovery under both choices and starting Sims fresh. Preserve unaffected progress; adjust specifically affected allocations/presets and remove invalid augments for the fresh option. Version reward/record semantics and retire legacy live fields after compatibility needs are met. Finish navigation, Wiki/localization, obtainable replacements for all old achievements and the later speedrun policy. |

Stages describe dependencies, not independently releasable player builds. Use synthetic legacy/fresh fixtures for migration and reset verification before any real saves. Required eventual checks are observable progression/reward conservation, first-Sim-Catalyst fracture/save/reload, both migration choices, all reset boundaries, retained skill/facility access, Stored Time parity and visual QA of replacement screens. No tests, app launch, save/account access or implementation occurred in this planning turn.

## Verified baseline anchors

The prior [Reality study](../../../../../2026-10-06/task-5/reality-research/BRIEFING.md) informed the audit; current branch code was checked for the facts below. Historical plans are context, not authority for this rework.

| Fact / removal hazard | Current source |
| --- | --- |
| Entanglement converts complete groups of 42 **unspent** IP without a wipe; it reduces `infinity.points`. Ordinary Infinity purchases increase `spentPoints`, while facility production uses total `points`. Avocato IP feeds also reduce total `points`. Relocated purchases should not inherit the conversion debit accidentally. | [quantumTransitions.ts](../../src/simulation/quantumTransitions.ts#L39), [canonicalInfinityShop.ts](../../src/simulation/canonicalInfinityShop.ts#L372), [canonicalDysonDerivation.ts](../../src/simulation/canonicalDysonDerivation.ts#L1553), [avocadoDomain.ts](../../src/simulation/avocadoDomain.ts#L77) |
| Main Transcendence eligibility is the overflow boundary, not the Avocado purchase. Its current reset grants one TP in Avocato state and resets earlier layers, including old Dream state. | [overflowBoundary.ts](../../src/simulation/overflowBoundary.ts#L4), [canonicalOverflowReset.ts](../../src/simulation/canonicalOverflowReset.ts#L16) |
| Transcendence tab visibility/replacement of Research currently follows Discovery ownership. Discovery unlock costs one TP; Sim completion must become a distinct reveal condition. | [ReadyDysonSlice.tsx](../../src/ui/gameplay/dyson/ReadyDysonSlice.tsx#L676), [discovery.ts](../../src/simulation/discovery.ts#L101) |
| Fracture transaction and preview require a completed challenge; validation rejects fractured ownership without completion. Ownership and the Catalyst wallet live in challenge state. | [canonicalSkillTransactions.ts](../../src/simulation/canonicalSkillTransactions.ts#L189), [infinityChallenges.ts](../../src/simulation/infinityChallenges.ts#L48), [galvanization.ts](../../src/simulation/galvanization.ts#L7) |
| Two Infinity challenges give one Catalyst each; seven Quantum challenges give two each, once: 16 total. Fractured bases drop dependencies/exclusions; augments require a fractured parent. | [canonicalInfinityReset.ts](../../src/simulation/canonicalInfinityReset.ts#L168), [quantumTransitions.ts](../../src/simulation/quantumTransitions.ts#L269), [galvanization.ts](../../src/simulation/galvanization.ts#L36), [skillSubskills.ts](../../src/simulation/skillSubskills.ts#L113) |
| Authored catalog has 104 base skill definitions, 43 layer-0 and 18 layer-1 Simulation upgrades. Sixteen layer-1 speed/translation purchases each grant one SP; Avotation separately grants four. Quantum has 20 runtime upgrade IDs, including three fallback mega unlock definitions. | [runtime-catalog.json](../../src/game-data/generated/runtime-catalog.json), [quantumUpgrades.ts](../../src/simulation/quantumUpgrades.ts#L21), [canonicalEventTimeModel.ts](../../src/simulation/canonicalEventTimeModel.ts#L1350), [avocadoMeditation.ts](../../src/simulation/avocadoMeditation.ts#L9) |
| Reality owns Double Time; game stepping applies its permanent ×2 speed. Self-Replicating Workers currently targets old producer counts, so existing Sim synergy cannot be presumed suitable for civilization bars. | [realityUpgrades.ts](../../src/simulation/realityUpgrades.ts#L485), [gameStep.ts](../../src/simulation/gameStep.ts#L107), [swarmAugments.ts](../../src/simulation/swarmAugments.ts#L107) |
| Canonical commands, event scheduling, save mapping and front-end projection all embed old domains. Current mapping requires legacy Reality/Quantum/Avocato/Dream records; deleting interfaces alone would break imports. | [canonicalGameCommands.ts](../../src/application/canonicalGameCommands.ts#L251), [canonicalEventTimeModel.ts](../../src/simulation/canonicalEventTimeModel.ts#L584), [mapping.ts](../../src/game-state/mapping.ts#L191), [frontendSnapshot.ts](../../src/application/frontendSnapshot.ts#L1223) |
| Achievement facts still reference Influence/SM/Quantum/Avocato/old upgrades. Existing speedrun categories include first Infinity, first Quantum, Reality, double speed, first Transcendence and debug qualification. | [evaluate.ts](../../src/achievements/evaluate.ts#L19), [speedrunStatistics.ts](../../src/simulation/speedrunStatistics.ts#L5) |

Worktree creation left the primary checkout and all six pre-existing stashes unchanged. At the planning checkpoint this branch contained only this document. The user subsequently authorized the first stripping prototype; its implementation and verification are recorded in [the prototype checkpoint](gameplay-rework-prototype-2026-10-07.md). No push, merge or release is part of the task.
