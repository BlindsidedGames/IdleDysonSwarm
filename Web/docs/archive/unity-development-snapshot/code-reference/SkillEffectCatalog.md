# SkillEffectCatalog

## Purpose
`SkillEffectCatalog` is the canonical mapping from skill ids to effect ids/stat targets plus dynamic value resolvers for formulas that depend on current run state (facility counts, timers, modifiers, etc.). It is used by runtime stat pipelines and editor asset generation flows.

## Contract / behavior expectations
- `GetAll()` returns the authoritative effect list used to seed/refresh `EffectDefinition` assets.
- `TryResolveDynamicValue()` must return the exact runtime value for dynamic effects when an effect id is recognized.
- Parallel Computation contract:
  - Effect id: `effect.parallel_computation.data_centers`
  - Operation: Multiply
  - Runtime value: `1 + 0.1 * log2(totalServers)` when active and `totalServers > 1`; otherwise `1`.
- Hypercube Networks remains a separate data-center modifier multiplier (`1 + 0.1 * log10(totalServers)`).

## Data flow
1. `SkillEffectProvider` iterates owned skills/effects from `GameDataRegistry`.
2. For each effect, it calls `TryResolveDynamicValue()` when applicable.
3. Resulting `StatEffect` entries are consumed by `StatCalculator` through facility/global pipelines.
4. Contribution entries appear in breakdown UIs and debug reports.

## Save/load implications
- No new ids, no renamed ids, and no save-schema changes.
- Existing saves automatically pick up formula behavior changes because values are recomputed from current state each tick.
- Keep id stability (`effect.parallel_computation.data_centers`) to preserve compatibility with existing assets and ownership mappings.

## Performance pitfalls
- `TryResolveDynamicValue()` runs frequently; avoid allocations and expensive branching.
- Repeated transcendental operations (`Math.Log`) are expected but should remain minimal and isolated.
- Avoid introducing scene lookups or service calls in this resolver.

## Quick verification steps
1. Ensure effect spec for `parallelComputation` uses `StatOperation.Multiply` with default value `1`.
2. With `serversTotal = 1`, confirm contribution is skipped/effective `x1`.
3. With `serversTotal = 2`, confirm contribution value is `1.1`.
4. With `serversTotal = 1024`, confirm contribution value is `2.0`.
5. Confirm breakdown shows Parallel Computation as multiply, not additive.
