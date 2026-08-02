# Authoritative simulation contract

This document is the active cross-platform contract for porting Idle Dyson
Swarm's simulation from Unity to TypeScript. Historical implementation plans in
the Unity repository are evidence, not authority.

## Source of truth

- Unity commit `717e4bf` is the behavioral reference at the start of the port.
- TypeScript parity fixtures must state the Unity commit that produced them.
- Continuous values produced by platform math libraries are compared by
  relative error. The captured Break target-100 threshold differs by two
  representable doubles between Unity/Mono and V8 (`2.7e-16` relative), while
  the resulting discrete reward remains exact.
- Existing Unity saves remain canonical input. The web engine must not narrow
  continuous values while importing or simulating them.
- When implementation and this contract disagree, stop and characterize the
  Unity behavior before changing either side.

## Numeric categories

- JavaScript `number` stores continuous/high-scale values: bots, money, science,
  Dyson facility amounts, high-scale Dream facilities, research levels and
  progress, rates, multipliers, timers, and durations.
- `bigint` stores genuinely discrete values that were C# `long`: currencies,
  counters, statistics, bounded ownership counts, and reset totals.
- Bounded enums, indices, authored settings and versions use `number` only after
  integer/range validation.
- Gameplay state must remain finite. Technical `NaN` and infinities are invalid;
  gameplay Overflow remains a separate future design.

## Shared timeline

- Active play and stored time call the same pure simulation model.
- Time is simulated independently from rendering and wall-clock time.
- Reality, Dyson and Dream advance concurrently.
- Automation has its own phase-preserving clock, initially 0.1 seconds.
- Stored time may force Buy Max, but must not change the saved active-play mode.
- Player commands are timestamped boundaries. They affect only unprocessed time.

## Boundary ordering

At a coincident event timestamp:

1. Advance all continuous systems using the state captured at the start of the
   segment.
2. Apply production/resource arrivals.
3. Apply queued player input.
4. Apply automation and conversions.
5. Recompute derived state, timers and Double Time.
6. Apply Dream reset.
7. Apply the durable finite bot-cap transition.
8. Apply ordinary or Break Infinity reset.

Facilities acquired or restored at a boundary produce only after that boundary.
Dream therefore resolves before Infinity when both become ready simultaneously.

## Exact reference before projection

- The initial TypeScript engine is an exact event scheduler with acceleration
  disabled.
- Its automation phase, command boundaries, event order and partitioned-time
  results must match Unity characterization fixtures.
- Projection is an optional model optimization layered behind the same
  interface. Rejection must preserve the exact path.
- No projection result becomes authoritative until it is compared with both a
  coarser and a refined model and checked against representative Unity fixtures.

## Persistence boundary

- Raw decoded save graphs cannot construct an engine. Startup requires an
  opaque prepared-save proof produced by decode, migrate, repair and validate.
- Stored-time work operates on an isolated candidate state.
- A candidate is published only after its matching save and stored-time
  deduction are durably committed.
- Cancellation or persistence failure preserves all uncommitted stored time.
- Reset rewards, bot-cap rewards and one-time flags must be idempotent across
  save/reload boundaries.
- Active state revision and durable save revision are separate application
  concepts. Rejected, stale and no-op commands advance neither.

## Initial parity fixtures

The first golden-master set will cover:

- production with no automation or reset;
- automation at, before and after a 0.1-second boundary;
- a queued Break slider change between boundaries;
- ordinary Infinity and Break Infinity reset boundaries;
- simultaneous Dream and Infinity readiness;
- stored-time forced Buy Max without mode mutation;
- finite bot-cap transition with interrupted checkpoints;
- partitioning the same duration into different frame/job chunks.

Projection benchmarks and long-duration tuning are deliberately later. They must
not alter this exact semantic layer.

The current TypeScript reference composes Dyson, research, skills, Tinker,
Infinity, Dream, Reality, Quantum, Avocado and time resources in one event-time
model. Active automation preserves configured buy modes; stored-time
automation forces Buy Max for both facilities and research without mutating
those settings. The model covers ordinary/Break thresholds and rewards, the
1/60-second minimum Infinity cycle, queued Quantum action, Dream reset order,
Reality generation, Double Time, transient Tinker exclusion from away/stored
time, and every finite bot-cap checkpoint entry state.

The lifecycle coordinator publishes stored-time, returned-time and bot-cap
candidates only through the commit-first persistence lane. Imported Unity saves
resume before pending, after pending, or after the reward checkpoint without
duplicate rewards. The headless integration regression checkpoints and
reconstructs a fresh runtime session, then proves the next continuation remains
equivalent.
