# Canonical Dyson parity plan

The web port preserves Unity's observable gameplay while allowing internal
architecture to become typed, deterministic and platform independent. A value
is not copied into canonical state merely because Unity serializes it.

## Authority rules

- Durable player choices and progression are canonical state.
- Authored costs, coefficients and thresholds come from exported game data or
  explicit runtime tuning.
- Values Unity recalculates through its stat and production pipelines are
  derived state. The web runtime must reconstruct them from durable causes.
- Legacy mirrors remain import/export compatibility fields until their removal
  is explicitly approved.
- Platform ownership and entitlements are supplied through platform context,
  not persisted as ordinary gameplay progression.
- No adapter may use fallback constants to make an incomplete real save run.

## Dyson field classification

Canonical state already owns balances, all eight facility pairs, automation
choices and phases, research levels, stable skill ownership/timers, Infinity
progress, Quantum upgrades, Avocado progression and statistics.

Unity-derived fields to reconstruct include:

- `moneyMulti`, `scienceMulti`, `panelsPerSec` and `panelLifetime`;
- all eight facility modifiers;
- the complete production-rate chain and its mega-structure branches.

Unity legacy representations that remain compatibility-only include:

- scalar research ownership and panel-lifetime flags mirrored by
  `researchLevelsById`;
- sparse facility arrays normalized into the canonical two-slot pairs;
- legacy Android timers migrated into stable skill state;
- `timeThisInfinity` and `lastCollapseDate`, superseded by deterministic
  timeline checkpoints.

The following inputs must be resolved before a canonical Dyson adapter is
allowed:

- `panelsPerSecMulti`: determine whether Unity treats it as authored tuning or a
  durable per-save override;
- persisted research percentage coefficients: route them through the selected
  balance/stat authority rather than silently treating cached values as player
  progression;
- permanent double-IP: supply the platform entitlement independently from the
  canonical Quantum double-IP upgrade.

## First derivation checkpoint

The first pure canonical projection is intentionally bounded:

- Compatibility tuning is extracted from the prepared save session without
  becoming canonical player state.
- The exact neutral and three-characterized-static-skill rate vectors match
  their Unity golden masters.
- Skill ownership comes only from `skills.byId`; presets and auto-assignment do
  not implicitly activate effects.
- Automatic/manual facility slots fold identically for rate calculation.
- Unsupported active skills, research, secrets, Infinity modifiers, Avocado
  modifiers and mega-structures return typed issues instead of approximations.

This projection is derived-state evidence only. It does not yet make the
parity-only Basic Dyson model the canonical whole-game engine.

## Ordered effect checkpoint

The canonical projection now materializes and orders:

- all 14 stable research definitions, including imported coefficients and
  secret-derived coefficient overrides;
- the complete 27-level Secrets of the Universe buff table;
- Quantum cash/science bonuses;
- Infinity facility multipliers and unlock thresholds;
- Avocado logarithmic and Overflow multipliers from exported tuning;
- derived modifiers for all eight facility tiers.

Research content is fail-closed against its exact exported Unity contract:
unknown active IDs, fractional levels, changed targets/operations/orders,
conditions, facility filters, missing assets and unexpected definition shapes
all reject. Mega-structure modifiers are available, but their production chain
remains blocked until its exact facility effects and event ordering are ported.

## Required acceptance path

Every whole-slice acceptance fixture must use the real boundary:

```text
authentic IDB1
-> prepare and migrate
-> hydrate canonical state
-> reconstruct derived Dyson state
-> TransactionalGameApplication
-> prepare, commit and reload
-> rehydrate canonical state
```

Direct `BasicDysonState` tests remain domain-unit evidence and cannot establish
real-save parity.

## Integration gates

1. Hydrate authentic schemas 0, 8, 10, 11 and 12 with exact durable state.
2. Reconstruct rates and modifiers without reading persisted derived caches.
3. Match Unity at active-time and 100 ms automation boundaries.
4. Route typed purchases and automation for all eight facility tiers.
5. Match ordinary, Break and finite bot-cap Infinity boundaries and resets.
6. Prove tick, purchase, automation and Infinity changes survive commit/reload.
7. Prove partitioned time produces the same gameplay state and scheduler phase.
8. Prove restart boundaries cannot duplicate production, purchases or rewards.

Discrete values, IDs, flags and revisions compare exactly. Continuous
tolerances must be recorded per fixture; there is no blanket approximation.

## Missing Unity probes

- An authentic Unity-produced schema-12 `IDB1` save.
- Post-load canonical Dyson state and complete reconstructed rate vector.
- 99.999 ms, 100 ms, 100.001 ms, 200 ms and partitioned active-time captures.
- Buy-mode and rounding matrices for all eight facilities.
- Coincident production and multi-facility automation order.
- Ordinary and Break Infinity threshold/minimum-cycle matrices.
- A complete Infinity reset capture covering all domains.
- Authentic bot-cap saves before pending, after pending and after reward.
- Save/reload captures immediately around each material boundary.

Fixture metadata must identify the exact Unity commit used to generate it.
