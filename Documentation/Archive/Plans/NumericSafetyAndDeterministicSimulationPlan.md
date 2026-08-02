# Numeric Safety and Deterministic Simulation Plan

Status: Archived on 2026-07-28; superseded by current repository evidence
Last updated: 2026-07-27

## Purpose

Numeric safety is a systemic concern in Idle Dyson Swarm rather than a collection of isolated edge cases. This plan establishes a finite, deterministic numeric contract across saves, purchases, online production, offline progression, automation, prestige transitions, UI adapters, diagnostics, and release validation.

The highest-priority failures addressed by the plan are:

- Unbounded facility automation can freeze when spending no longer changes a very large balance.
- Online and offline production use materially different chain ordering, and legacy offline replay invokes frame-delta production repeatedly inside minute steps.
- NaN, Infinity, narrowing casts, overflowing costs, and wrapped integers can reach transactions, saves, and resets.
- Discrete progress is inconsistently stored across `int`, `long`, and integral `double`.
- Production failures remain local when diagnostics are unavailable or disabled.

## Local implementation snapshot

Implemented and locally validated:

- Finite/saturating numeric primitives, checked conversions, atomic transaction
  helpers, finite UI/platform adapters, and boundary tests.
- Save schema 12 numeric repair, derived-cache invalidation, repair fixtures,
  durable-before-publication primary repair, and the durable/idempotent legacy
  finite bot-cap transition.
- Shared event-time active/stored ordering for Dyson, Dream, and Reality;
  an independent authored 10 Hz automation clock; start-of-segment
  production; synchronous Infinity/Dream reset completion and research
  reapplication; continuous Dream event horizons; Dream timer
  reconstruction; and proportional Double Time depletion.
- Canonical 0.1-second offline Dyson replay, one forced-Buy-Max automation
  phase per complete tick, no partial-remainder automation phase, saved
  online-mode restoration, four-millisecond yielding, and stored-time
  validation. Online facility and research automation retain the configured
  Buy 1/10/50/100/Max modes.
- Sub-ULP high-scale research accrual is retained in fractional progress until
  the whole-valued `double` level can advance, and Dream energy contribution
  arithmetic saturates finitely near the cap.
- Privacy-minimized local Diagnostics configuration and handled-exception
  reporting code.
- Event-aware offline fast-forward for verified affine Dyson production,
  facility/mega/research automation affordability, active Dream production
  timers, research, boost expiry, conversions, energy/railgun charging, and
  Dream Double Time depletion. Every material boundary is executed by the
  canonical 0.1-second scheduler before analytical batching resumes, so
  repeated Infinity and Dream resets continue through the remaining time.
- The reviewed PR8 checkpoint passed 343/343 Unity EditMode tests and a macOS
  Universal IL2CPP player build. The unified event-time follow-on adds
  characterization, performance, statistics, and input-boundary coverage and
  must record fresh full-suite/build evidence after its final source change.

Separate release validation:

- Representative iOS, Android, Windows, and physical-device builds; background
  and resume profiling; and representative mobile performance validation.
  Locally, verified constant-production Dyson and Dream states consume the full
  42,000,000-second bank in one sub-8-ms analytical operation. States with
  changing skill timers, continuously changing nonlinear modifiers, or dense
  railgun/production/purchase events intentionally use the bounded 4-ms
  canonical fallback and may need multiple rendered frames. The completed
  macOS Universal IL2CPP build is a local compilation gate, not store or
  physical-device validation.
- Unity Dashboard project verification, symbol upload, forced live report,
  Discord alerts, storefront disclosures, and privacy-policy review. These are
  release gates and were not performed by the local implementation.

## Terminology and scope boundary

These concepts must remain distinct:

- **Infinity** is the existing first prestige/reset layer, normally reached around 42 quintillion bots, subject to its existing mode variations. It is intentionally far below the numeric cap.
- **Future gameplay Overflow** is a separate, deliberately designed late-game mechanic. Its threshold, reward, reset scope, UI, and automation are not defined by this plan.
- **Technical arithmetic overflow**, NaN, and positive or negative Infinity are programming failures. They must never trigger or impersonate either Infinity or future gameplay Overflow.
- **Legacy finite bot-cap transition** is the existing special behavior associated with bots reaching finite `double.MaxValue`. This plan preserves that behavior through explicit durable state: grant the existing bot-cap reward once, then run the normal Infinity reward/reset. Preserving this legacy behavior does not define the future gameplay Overflow system.

The plan deliberately uses finite capped currencies rather than `decimal`, a large-number type, or non-finite gameplay values.

## Numeric contract

### Canonical types

- `double`: money/cash currencies, science currencies, bots, fractional facilities, rates, multipliers, continuous progress, continuous statistics, and durations.
- `long`: only genuinely discrete currencies, atomic ownership counts, purchase counts, bounded or moderately scaled repeatable levels, achievements, and statistics that are guaranteed to advance in whole units.
- `int`: bounded versions, indices, authored limits, and Dream Double Time rate `0–10`.
- `float`: Unity UI and rendering adapters only.
- Non-finite values are never valid gameplay state.

The type is determined by gameplay semantics, not by whether the current value happens to look like a whole number. No migration may quantize a value that can accrue fractionally.

#### Persistent continuous values that must remain `double`

- Dyson currencies and allocations: `DysonVerseInfinityData.money`, `science`, `bots`, `workers`, `researchers`, and `DysonVersePrestigeData.botDistribution`.
- Dyson facilities: both manual and automatic entries in `assemblyLines`, `managers`, `servers`, `dataCenters`, `planets`, `matrioshkaBrains`, `birchPlanets`, and `galacticBrains`, including their sparse `double` values.
- Dyson production and modifiers: every `*Production`, `*Modifier`, `*Multi`, `*Percent`, `panelsPerSec`, `panelLifetime`, skill timer, and continuous derived-rate field.
- Continuous Dyson statistics: `totalPanelsDecayed` and any later statistic that can advance by a fractional per-tick delta.
- Research: `researchProgressById` stores fractional progress toward the next level. `researchLevelsById` stores semantically whole-valued levels as finite `double` values because the Shoulders skills continuously generate Science Boost and Money Multiplier research at potentially extreme rates. Those two legacy mirrors, `scienceBoostOwned` and `moneyMultiUpgradeOwned`, also remain `double`. The other legacy upgrade mirrors remain `long`, but the stable-ID dictionary must not narrow high-scale levels to `long`.
- Save timers and stored time: `timeLastInfinity`, `manualCreationTime`, `offlineTime`, `offlineTimeUsedThisInfinity`, `offlineTimeUsedPreviousInfinity`, and `maxOfflineTime`.
- Dream high-scale state: `community`, `housing`, `villages`, `workers`, `cities`, `factories`, Dream `bots`, `rockets`, `energy`, `spaceFactories`, `railgunCharge`, `solarPanels`, and `fusion`. Current acquisition paths add whole units to most facility counts, but their `double` contract preserves the existing extreme-scale range and must not be narrowed without an explicit economy decision. `railgunCharge`, energy transfer, and timer-driven progress are continuous.
- Dream progress and duration fields: every research `*Progress`, `*ResearchTime`, boost `*Time`/`*Duration`, and persisted production-timer progress field.
- Legacy/cross-system continuous accumulators and multipliers: `PrestigePlus.avocatoIP`, `avocatoInfluence`, `avocatoStrangeMatter`, `avocatoOverflow`, plus `AvocadoData.infinityPoints`, `influence`, `strangeMatter`, and `overflowMultiplier`.

Bots in both Dyson and Dream remain canonical finite `double` values and may be fractional. The finite bot-cap transition is based on finite `double.MaxValue` behavior, never on a whole-number cast.

Money/cash and science currencies remain canonical finite `double` values wherever fractional accrual is possible. The fields `PrestigePlus.cash` and `PrestigePlus.science` are exceptions only in name: they are discrete purchased bonus levels, not balances, and therefore remain `long`.

#### Persistent discrete values

- Whole currencies and points: Infinity Points, spent Infinity Points, Secrets of the Universe, permanent and tree skill points, fragments, Prestige Plus points/spent points, Prestige Plus influence, Dream influence, Strange Matter, and whole worker/universe counters.
- Whole ownership and levels: bounded or moderately scaled upgrade levels, hunter/gatherer counts and per-purchase quantities, Dyson/swarm panel counts, simulation count, disaster stage, division/secret counts, and quantum/reality upgrade levels. Semantic integrality alone does not require `long`: high-scale research levels remain whole-valued finite `double`.
- Bounded selectors and schema metadata: save/migration versions, buy modes, formatting mode, selected preset, preset overrides, frame-rate selection, authored maximums, and Dream Double Time rate.
- Boolean state: ownership/unlock flags, automation toggles, completion flags, transition checkpoints, settings, tutorial state, recovery/repair notices, and achievement completion.
- Encoded sets and identifiers: bitsets, stable-ID strings, preset ID lists, sparse-array indices, and legacy integer keys. These are structural data rather than scalable gameplay magnitudes.

Fields representing authored costs or generation quantities may remain `long` only when the corresponding system guarantees whole units. They must be promoted to `double` if fractional authored values become valid later.

Whole-valued `double` state is exact only through `2^53`. Above that boundary, it preserves extreme magnitude but not single-level granularity. Research accrual and purchases must detect additions that round away; the implementation must not charge for, or claim, an increment that does not change the stored value. If exact unit accounting above `2^53` later becomes a gameplay requirement, that is a separate numeric-design decision rather than grounds for silently narrowing the field to `long`.

### Safe operations

Add centralized result-returning operations for:

- Saturating addition, subtraction, multiplication, and power.
- Bounded division.
- Finite conversion.
- Checked `int` and `long` conversion.

Every operation must distinguish:

- Success.
- Legitimate saturation.
- Invalid input.
- Division by zero.
- Unrepresentable output.

Non-bot continuous values saturate at finite `double.MaxValue`. Discrete values saturate at `long.MaxValue`. Capped balances display `MAX`.

## Legacy finite bot-cap transition

Bots reaching finite `double.MaxValue` set an explicit durable pending transition. The transition:

1. Grants the existing bot-cap reward exactly once: `+1` to the existing legacy Overflow reward counter and `+1,000` Infinity Points.
2. Runs the normal Infinity reward/reset.
3. Uses durable staged flags and immediate persistence so an interruption cannot duplicate or lose the reward.

This is preservation of existing legacy behavior. It is not the design of future gameplay Overflow.

Saved bot NaN or positive/negative Infinity is invalid technical state and is repaired to zero without granting a reward.

## Save schema, migration, and recovery

Migration and repair operate on an isolated copy before runtime publication.

Required repair rules:

- Saved bot NaN or positive/negative Infinity → zero, no reward.
- Legacy exact finite `double.MaxValue` bots → honor the legacy bot-cap reward once.
- Non-bot positive Infinity → finite `double.MaxValue`.
- NaN, negative Infinity, or forbidden negative progress → zero.
- Invalid multipliers, exponents, or structural durations → versioned authored default.
- Fractional legacy levels → floor to a whole value in their canonical storage type. High-scale research levels remain whole-valued finite `double`; only fields whose canonical type is `long` narrow through checked conversion.
- Derived production rates and caches → discard and recompute.
- Offline banks above `42,000,000` seconds → clamp and set the existing cheater flag.

Repair flow:

1. Preserve the original artifact.
2. Repair an isolated copy.
3. Fully revalidate it.
4. Atomically commit the repaired save immediately.
5. Publish it to runtime only after the commit succeeds.
6. Show the existing brief repair notice with exportable details.

There is no legacy dual-write. Downgrades are unsupported. Rollback releases must be forward hotfixes that retain the new schema.

The system must distinguish corrupt or invalid state from legitimate legacy state. It must not silently change gameplay semantics, rewards, reset behavior, or accepted legacy progress beyond the approved rules above.

## Transaction contract

Every manual, hold, automated, and Buy Max purchase uses one atomic transaction API.

Required rules:

- Cost must be finite and quantity must be positive.
- Zero cost is valid only when the authored definition explicitly marks the action `Free`.
- Ownership never changes unless the debit succeeds.
- If a positive debit would round away at the current balance, charge one representable `double` step.
- If the next repeatable cost is unrepresentable, or the owned count cannot increment, disable the purchase as `Maxed` without charging.
- Analytical Buy Max results must be checked against the final cost and adjusted safely for logarithm rounding.
- Exact-balance purchases succeed and leave zero.
- Failed, invalid, or maxed purchases leave both balance and ownership unchanged.

## Deterministic online simulation

Introduce a pure 10 Hz simulation kernel covering Dyson and Dream.

Each tick:

1. Capture the complete start-of-tick state.
2. Compute production deltas from that snapshot.
3. Apply all production deltas together.
4. Run automation.
5. Recompute derived rates.
6. Evaluate Infinity and Simulation reset transitions.

Newly produced facilities begin working on the next tick, matching established online chain behavior.

Online automation performs one configured Buy 1, 10, 50, 100, or Max transaction per enabled target per tick. Target priority rotates deterministically. Automation must not use retry loops, repeated affordability polling, or unbounded spending loops.

## Offline and fast-forward simulation

Replace legacy replay with event-aware analytical batching.

Required behavior:

- Use composed triangular state transitions for chained production.
- Split a batch only at a purchase, boost expiry, research completion, cap, Double Time depletion, Infinity, Dream reset, or requested endpoint.
- Force offline automation to Buy Max without changing the saved online buy mode.
- Run automatic Infinity and Dream resets fully, then continue simulating the remaining time.
- Keep the existing progress screen as a time-sliced fallback.
- Typical offline cases should complete in one analytical slice.

### Local analytical implementation status

The implemented analytical path adds a verified affine fast path for Dyson
intervals whose production transition is demonstrably linear. It constructs the
start-of-tick discrete transition, validates it at quarter, midpoint,
three-quarter, and endpoint states, applies it by cached saturating matrix
exponentiation, and stops before the next automation purchase, automatic
Infinity, or finite bot-cap boundary. Standard facilities, mega-structures, and
research expose non-mutating affordability checks against the predicted state.
The canonical boundary tick uses forced Buy Max without changing the saved
online mode, then rebuilds the transition. Persistent skill-timer and research
accrual side effects select the canonical fallback instead of being skipped.

Dream batching computes the next quiet horizon from every persisted production
timer, active research completion, boost expiry, housing/village and
rocket/factory conversion, railgun charge/firing boundary, reset threshold, and
Double Time depletion. It advances timer/research progress, boost time, energy,
railgun charge, and Double Time algebraically only before that boundary. The
boundary itself runs through the canonical whole-game tick, including
start-of-tick production, forced offline Buy Max, durable timer synchronization,
Double Time consumption, Dream reset, and Infinity reset. Simulation then
continues with the remaining ticks. The fallback yields after a 4 ms work budget
and never approximates or discards elapsed time. A final sub-tick remainder
advances Dyson and Dream together through the same production, durable-state,
Double Time, and reset order, while deliberately omitting automation so it
cannot create an extra purchase phase.

### Whole-game stored time

- Global stored time fast-forwards Dyson and Dream concurrently.
- Global and Dream Double Time banks each cap at exactly `42,000,000` seconds.
- Dream Double Time continues accumulating before Dream unlock.
- During fast-forward, Dream applies and consumes its selected Double Time rate exactly as active play would.
- Backward clock movement grants zero new time, sets the existing cheater flag, reports the anomaly, preserves already earned stored time, and never disables offline features.

## Timers and conversions

- Durable gameplay timers use `double`.
- Tick scheduling and duration calculations use finite checked arithmetic.
- Repeated per-unit or per-frame timer loops are replaced with bounded arithmetic or analytical batching.
- All `double` to `float` conversions occur at Unity UI/rendering boundaries and use explicit finite/range checks.
- All `double` to `long` or `int` conversions use checked conversion helpers with explicit fractional policy.
- Derived rates are never trusted from a save and are recomputed after load, repair, reset, and transaction-driven state changes.

## UI and platform adapters

- Finite capped values display `MAX`.
- Invalid technical values display an explicit error-safe representation and produce a diagnostic event; they are not presented as gameplay Overflow.
- Sliders use normalized UI values backed by canonical `double` state.
- Steam and other platform statistics use explicit finite and range-clamped adapters.
- No formatted UI string is parsed back into canonical gameplay state.

## Diagnostics and privacy

Local Unity Diagnostics Essential Data code and project configuration may be
prepared without a new player-facing consent surface. Shipping that configuration
remains gated on storefront privacy disclosures and privacy-policy review.

Report:

- Crashes.
- Exceptions.
- Assertions and errors.
- Corrupt numeric state.
- Failed transactions.
- Save repairs.

Do not report:

- Routine warnings.
- Raw saves.
- Balances or other game-state payloads.
- Player-entered text.
- Account identity.
- Advertising identifiers.
- Location.
- Legitimate cap arrivals.

Diagnostics use stable fault codes, redaction, deduplication, and rate limits. Symbols must be uploaded for release builds. New-problem and new-version alerts go to a private Discord channel.

Reportable runtime numeric, save, and transaction faults use Unity's documented
handled-exception path (`Debug.LogException`) with a message-only internal exception.
Ordinary `Debug.LogError` output is not treated as a standalone Diagnostics Issue.
EditMode repair characterization remains a normal log so expected corrupt-save
fixtures do not fail the test runner.

No in-game consent, agreement, declaration, or Diagnostics settings screen is
introduced by this plan. A later legal review may establish a different
requirement, but that is outside this implementation scope.

References:

- [Unity Diagnostics](https://docs.unity.com/en-us/cloud/developer-data/diagnostics)
- [Unity privacy and consent responsibilities](https://docs.unity.com/en-us/cloud/developer-data/user-consent)

## Test and acceptance matrix

### Numeric boundaries

Test:

- Zero and forbidden negatives.
- `2^53−1`, `2^53`, and `2^53+1`.
- `int.MaxValue`.
- `long.MaxValue`.
- `Math.BitDecrement(double.MaxValue)`.
- `double.MaxValue`.
- NaN and positive/negative Infinity.
- Zero denominators.
- Invalid exponents.

### Transactions

Test:

- Exact balance.
- One representable step below and above cost.
- Sub-ULP debit.
- Explicit free zero cost.
- Accidental zero or negative cost.
- Saturated cost.
- Count maximum.
- Every buy mode.
- Manual, hold, and automated purchase paths.
- A transaction concurrent with a reset boundary.

### Save fixtures

Create fixtures covering:

- Each invalid category individually and in combination.
- Legacy finite-max bots.
- Non-finite bots.
- Fractional discrete levels.
- Structural-default restoration.
- Both stored-time banks above cap.
- Interrupted repair.
- Interrupted bot reward/reset.
- Current and representative historical schemas.

### Simulation parity

Compare the sequential 10 Hz reference with analytical batching for:

- 0, 1, 2, and 10 ticks.
- Long-duration runs.
- Every producer tier.
- Automation affordability events.
- Boost and research expiry.
- Double Time rates 0, 1, and 10.
- Mid-batch Double Time depletion.
- Multiple Infinity cycles.
- Multiple Dream resets.
- The complete `42,000,000`-second boundary.

Acceptance:

- Exact equality for discrete state and flags.
- Maximum relative error `1e-9` for finite continuous state.
- Exact equality at caps.
- Timer error no greater than one 0.1-second tick.

### Performance

- No unbounded loop.
- Analytical work yields after a 4 ms frame budget.
- No simulation slice exceeds 8 ms on representative mobile hardware.

### Runtime and release validation

- Unity Editor validation.
- IL2CPP builds on representative iOS, Android, Windows, and macOS targets.
- Background, suspend, resume, and backward-clock cases.
- Forced crash and handled numeric-error reports.
- Symbolicated Unity dashboard report.
- Discord notification.
- Storefront privacy and data-safety review.
- Migration artifact restoration.
- Forward hotfix using the new schema.

An older binary is not a supported recovery path.

## PR-sized rollout

### PR 1 — Observability baseline

Enable and configure Diagnostics, stable fault codes, redaction, deduplication, rate limits, symbol upload, and private Discord integration.

Acceptance:

- A forced crash and handled numeric fault arrive symbolicated.
- No prohibited data is included.
- Storefront and privacy declarations are verified.

### PR 2 — Numeric primitives

Introduce finite/saturating helpers and boundary tests without changing gameplay call sites.

Acceptance:

- Every numeric status is independently tested.
- Helpers cannot return non-finite gameplay values.

### PR 3 — Save schema and migration

Introduce canonical `long` fields, durable timer doubles, explicit bot-cap transition state, field repair, immediate atomic persistence, and fixtures.

Acceptance:

- Original artifacts remain preserved.
- All migration and interruption fixtures pass.
- No invalid or future save reaches runtime publication.

### PR 4 — Transaction engine

Replace purchase and debit paths, add explicit free-action metadata, safe Buy Max solvers, and Maxed behavior.

Acceptance:

- Every purchase path satisfies the atomic transaction matrix.
- Automation cannot create free purchases or negative balances.

### PR 5 — Dyson 10 Hz kernel

Move Dyson production, timers, derived-state recomputation, and transition checks into a pure snapshot kernel.

Acceptance:

- Characterization tests pass before each legacy path is removed.
- Newly produced facilities begin work on the next tick.

### PR 6 — Dream 10 Hz kernel

Move Dream production timers, research, boosts, Double Time, and reset transitions into the deterministic kernel.

Acceptance:

- Dream active-play behavior is deterministic at 10 Hz.
- Timer and reset tests meet the stated tolerances.

### PR 7 — Automation migration

Use one deterministic transaction per enabled target per tick and remove unbounded or fixed 100-pass loops.

Acceptance:

- Every automation mode is deterministic.
- No automation operation retries indefinitely.

### PR 8 — Analytical fast-forward

Implement chained transition batching, the event solver, forced offline Buy Max, whole-game progression, reset continuation, and the responsive fallback.

Acceptance:

- The simulation parity and performance matrices pass.
- Offline and equivalent online elapsed time agree within the approved tolerances.

### PR 9 — Adapters and rollout

Finish finite UI formatting, normalized slider adapters, platform statistic clamps, IL2CPP validation, staged store rollout, forward-hotfix rollback exercises, and kill switches.

Acceptance:

- Supported platforms pass build and representative device validation.
- Dashboard and Discord reporting are verified.
- A forward hotfix can safely consume the new save schema.

Each PR must leave the game playable, preserve migration backups, and add characterization coverage before deleting the corresponding legacy path.

## Non-negotiable invariants

- Canonical gameplay state is finite.
- Technical NaN or Infinity never grants a gameplay reward.
- A failed debit never mutates ownership.
- An invalid or unrepresentable repeatable purchase becomes `Maxed` without charging.
- A save is repaired and validated before runtime publication.
- Repair never destroys the original artifact.
- The legacy finite bot-cap reward is granted at most once.
- Backward clock movement grants no new time and does not erase existing stored time.
- Online and offline simulation share the same canonical transition rules.
- No simulation, purchase, timer, or automation path contains an unbounded loop.
- Future gameplay Overflow remains a separate design decision.

## Deferred design

The following future gameplay Overflow decisions remain deliberately unresolved and outside this implementation plan:

- Trigger threshold or thresholds.
- Reward formula.
- Reset scope.
- Relationship to Infinity and Dream resets.
- UI, tutorial, and player messaging.
- Manual versus automatic activation.
- Automation and offline behavior.

No technical cap, non-finite sentinel, migration rule, or legacy finite bot-cap behavior should be treated as an answer to those design questions.
