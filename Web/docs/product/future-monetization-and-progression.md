# Future Monetization and Progression Direction

**Status:** Deliberately deferred

**Last updated:** 2026-07-25

**Scope:** Design direction and future discovery only; not an implementation specification

## Purpose

This document records a possible future direction for optional cross-promotion, paid convenience, Developer Options, and a long-term progression layer.

Nothing here authorizes gameplay, UI, purchase, promotion, save, or balance implementation. The direction remains subject to player-experience review, platform-policy review, technical discovery, and balancing. Where this document gives a number or effect, its confidence is stated explicitly.

## Required Precondition

Do not begin feature implementation until the project has completed a baseline systems cleanup and architecture overhaul sufficient to make cross-cutting feature work safe.

That prerequisite should, at minimum, leave clear ownership and test seams for:

- temporary production modifiers across online and offline progress;
- durable entitlements and platform purchase restoration;
- timed-effect clocks, stacking, persistence, and lifecycle behavior;
- reset boundaries and save migration;
- skill-tree ownership, permanence, prerequisites, exclusions, and refunds;
- UI state shared across mobile and desktop layouts.

The scope and acceptance criteria for that architecture work must be agreed separately. This document does not claim the current architecture is ready or define the overhaul itself.

## Direction A: Developer Options Purchase

Reintroduce a Developer Options purchase as part of the future monetization direction.

The current project already contains an in-game currency unlock for Developer Options and a persistent debug entitlement. Discovery must determine whether the future purchase replaces that path, sits alongside it, or refers to a store entitlement with different behavior. No purchase type, product identifier, platform coverage, price, or migration rule is decided here.

### Open questions

- Is the intended purchase a real-money store product, an in-game currency purchase, or a combination?
- What exactly does the purchase unlock, and is the unlock permanent across hard resets, reinstalls, devices, and platforms?
- How should existing Developer Options unlocks and entitlements migrate?
- Does enabling Developer Options continue to mark a save as debug-enabled or otherwise affect achievements and progression integrity?
- Should this entitlement be independent from the paid cross-promotion convenience option?

## Direction B: Optional Renewable Cross-Promotion Boost

Add an optional, player-initiated boost flow:

1. The player taps a boost button.
2. The game shows a quick splash promoting the developer's other games.
3. The player receives five minutes of boost time.
4. Repeated activations add duration, capped at ten minutes of remaining boost time.

The interaction is intended to be optional and renewable. It is cross-promotion for the developer's own games; this plan does not assume a third-party advertising SDK, rewarded-ad network, external tracking, or a particular store-link flow.

### Current balance preference, not a final decision

- Likely effect: `2x` cash and science production.
- Infinity Points should probably not receive the multiplier.
- Five-minute grants and a ten-minute remaining-time cap are the present direction.

These values and exclusions require economy modelling and playtesting before approval. They must not be treated as final constants.

### Possible status presentation

The UI may show either a countdown or a radial progress indicator so the player can understand:

- whether the boost is active;
- how much boosted time remains;
- whether another activation would add time;
- when the boost can be refreshed.

The final presentation, placement, interaction states, copy, and mobile/desktop behavior are undecided.

### Open questions

- Does an activation always add five minutes, or fill remaining time toward the ten-minute cap?
- Can the player activate at any remaining duration, and what happens when less than five minutes of capacity remains?
- Does boost time run while the game is closed, pause while closed, or apply through offline progress?
- Which cash and science sources are multiplied, and at what point in the modifier pipeline?
- Are purchases, one-time grants, manual actions, simulations, or other special sources excluded?
- What does "refresh becomes available" mean if activations are otherwise unlimited and optional?
- How long is the splash, can it be dismissed, and what accessibility/localization requirements apply?
- How are promoted games selected, rotated, deep-linked, and handled when unavailable on the current platform?

## Direction C: Paid Cross-Promotion Convenience

A paid option is intended to remove the repeated cross-promotion/refresh ritual.

The exact entitlement and price are deliberately undecided. This document does not decide whether the purchase grants an automatic refresh, a persistent boost, a longer duration, a different activation flow, or another convenience. It also does not decide whether it is bundled with Developer Options.

### Open questions

- What player friction is being removed without making the free path feel punitive?
- What benefit remains fair relative to the free renewable boost?
- Is the entitlement permanent, subscription-like, platform-specific, or cross-platform?
- How are purchase restoration, refunds, revocation, and offline entitlement checks handled?
- Is the option sold separately from Developer Options or as part of a broader supporter purchase?
- What price is appropriate after the boost has been balanced and its long-term value is understood?

## Direction D: Deep Reset and Galvanized Skills

Add a later deep-reset layer that awards a new form of progression points. Players spend those points to **galvanize** selected skill-tree nodes, making those nodes permanent through the relevant reset.

The long-term aspiration is that continued progression could eventually galvanize the entire skill tree. This is intended as a substantial future content and progression layer, not a near-term feature.

### Open questions

- What milestone unlocks the deep reset, and what player state does it reset?
- How are deep-reset points earned and scaled?
- What does permanence survive: only the new deep reset, all existing resets, or some defined subset?
- Does galvanizing a node also preserve its prerequisites, or must prerequisite paths be galvanized separately?
- How do exclusive, non-refundable, dynamically priced, or otherwise special nodes behave?
- Can galvanized choices be refunded, respecced, or changed between runs?
- Are galvanized nodes active immediately after reset, or merely free to reassign?
- What pacing prevents early choices from becoming traps while still supporting the eventual full-tree goal?
- How should old saves initialize the new state, and what migration/versioning is required?
- How does this layer interact with achievements, automation, presets, balance tools, and debug-enabled saves?

## Cross-Cutting Risks

- **Economy distortion:** A global cash/science multiplier can shorten progression unevenly and may interact unexpectedly with offline progress, temporary boosts, or late-game multipliers.
- **Pay-to-win perception:** A paid option that changes boost access or duration may feel mandatory if the free refresh loop is too frequent or intrusive.
- **Promotional fatigue:** Repeated splashes can become a chore even when optional, undermining goodwill toward both this game and the promoted games.
- **Platform and policy compliance:** Store rules, disclosure requirements, age/privacy considerations, deep links, and purchase policies must be reviewed before committing to a flow.
- **Clock and stacking exploits:** Device-time changes, pause/resume, backgrounding, reloads, and offline simulation can duplicate or extend timed benefits unless one authoritative clock and stacking contract is used.
- **Entitlement fragmentation:** Developer Options, paid refresh removal, existing unlocks, and platform stores can create conflicting sources of truth.
- **Save compatibility:** New entitlements, active boost time, deep-reset currency, and galvanized-node state all require explicit durability and migration decisions.
- **Skill-tree rule conflicts:** Permanence can invalidate prerequisite, exclusive, refund, preset, auto-assignment, and non-refundable-node assumptions.
- **Scope coupling:** Implementing any one part before the baseline architecture work risks embedding another temporary subsystem in UI, save, and progression code.

## Decisions Required Before Scheduling

This direction should remain deferred until all of the following are complete:

- the baseline cleanup/architecture work is scoped, completed, and validated;
- the current Developer Options flow and entitlement state have been audited;
- the free boost's effect, source coverage, timing, stacking, and offline behavior have been modelled;
- the paid convenience entitlement and pricing have been selected;
- cross-promotion UX and platform-policy requirements have been reviewed;
- the deep reset, point economy, galvanization rules, and full-tree pacing have a balance proposal;
- save schema, migration, restoration, and regression-test plans exist;
- mobile and desktop UI behavior has an approved design and validation matrix.

Until those decisions are made, this document records intent only.
