# Unified Event-Time Reset and Simulation Plan

Status: In progress; shared-engine foundation checkpointed locally
Approved: 2026-07-27

## Scope and fixed decisions

Replace the mixture of rendered-frame logic, fixed-tick reset execution,
offline-only analytical code, and the adaptive prototype with one pure
event-time simulation engine shared by active play and stored-time processing.

- Break Infinity remains automatic at the slider-selected IP target.
- Production advances continuously between discrete events.
- Automation has an independent authored clock, initially 0.1 simulated
  seconds, and is not coupled to reset speed.
- Ordinary and Break Infinity have a minimum cycle duration of 1/60 simulated
  second.
- Dream uses its calculated natural cycle duration and has no artificial
  minimum.
- Reality, Dyson, and Dream advance concurrently as independent event streams.
- Dream reset resolves before Infinity at the same timestamp.
- Stored time forces Buy Max without changing saved active-play modes.
- Player actions are queued to the next safe boundary. A Break target change
  affects only unprocessed time; completed aggregates are never rolled back.
- Quantum Entanglement, full Quantum, and black-hole conversion remain
  player-invoked.
- Continuous and high-scale values remain `double` under the approved Numeric
  Safety contract.
- Future gameplay Overflow is separate and undecided. The finite
  `double.MaxValue` bot-cap transition remains an exact, durable special event.

## Pure simulation contract

The model-only layer has no `MonoBehaviour`, UI, coroutine, logging,
persistence, or wall-clock effects.

`SimulationAdvanceRequest` contains the starting state, requested duration,
active/stored mode, automation policy and phase, queued inputs, and processing
budget.

`SimulationAdvanceResult` contains the candidate state, consumed and remaining
time, validation status, reset/reward aggregates, one-time events, and a
presentation summary.

Material events include automation, affordability, timer/research/boost
expiry, Double Time depletion, Reality capacity, Dream reset, Infinity reset,
bot-cap transition, queued input, and endpoint.

At coincident timestamps the required order is:

1. production and resource arrival;
2. queued input, automation, and conversion;
3. derived state, durable timers, and Double Time;
4. Dream reset;
5. finite bot-cap transition;
6. ordinary or Break Infinity.

Facilities acquired or restored at an event affect only subsequent simulated
time. Newly auto-gathered Influence is available to Dream automation at the
same event.

## Reset acceleration

An exact pure one-cycle transition is the canonical reference and fallback.
Blocks split at every signature change, including unlocks, first-run events,
automation, input/mode changes, boost/research expiry, Double Time depletion,
caps, Quantum actions, and Dream stage changes.

Infinity reachability uses monotone bracketing. An unreachable target advances
without inventing a reset. When a threshold is reached before the 1/60-second
minimum, production continues and the actual reward at the reset instant is
awarded.

Ordinary and Break aggregation models changing IP power; it must not assume
identical cycles. Coarse and deterministically subdivided projections refine
until reset count, IP, and affected continuous state agree within 0.1%.
Discrete flags, unlocks, purchases, caps, and special rewards remain exact.
The integer number of cycles fitting the interval is located, the aggregate is
applied once, and the remainder is advanced normally.

Dream has an independent clock. Stable identical disaster cycles may be
counted exactly, including many Dream resets inside one Infinity or automation
interval. Any zero-time post-reset loop is rejected and diagnosed.

If a block cannot validate, the exact reference path runs in resumable
four-millisecond slices. Accuracy is never loosened automatically.

## Stored time, Reality, and persistence

Reality worker generation is part of the shared deterministic engine. Its
fractional accumulator is a finite `double`. With auto-gather disabled it
stops at 128 ready workers while Dyson and Dream continue. With auto-gather
enabled, completed workers become Influence before same-event Dream
automation. The old immediate return-time Reality grant is removed.

Stored time runs on an isolated candidate. A durable checkpoint atomically
persists the candidate state, matching statistics, and matching bank
deduction; only a successful write is published to live runtime. Cancellation,
save failure, or closure discards the uncommitted candidate and preserves its
unprocessed stored time.

The legacy passive offline-IP award is removed. IP is earned only by simulated
Infinity resets.

## Statistics and presentation

New truthful statistics begin at this update and never estimate legacy totals:

- lifetime and current-Quantum-run totals;
- last completed cycle and recent processed segment;
- ordinary and Break counts/IP separately and combined;
- bot-cap normal Infinity reward plus separate 1,000 IP and +1 Overflow
  special rewards;
- Dream reset counts and Strange Matter by meteor, AI, global warming, and
  black hole;
- Reality workers, automatic/manual Influence, and capacity-stall time;
- 60 one-minute, 48 half-hour, and 30 daily simulated-time windows.

Full Quantum preserves lifetime/history and starts a new run segment. Valid
legacy last-cycle context may survive, but historical totals start at zero
with a visible “tracked since update” basis.

Active state renders once per frame, never once per compressed reset.
First-time/tutorial events remain individual. Stored time presents one combined
Infinity, Dream, and Reality summary, with repeated Dream alerts collapsed by
cause/reward. Statistics show current run, last cycle, recent batch, average
cycle, and seconds per IP.

## Rollout sequence

1. Correct historical evidence and characterize pre-Infinity, ordinary,
   Break, Dream, Reality, Quantum, and bot-cap behavior.
2. Extract pure state, clocks, events/results, and pure reset functions; prove
   one-cycle parity.
3. Move active and stored simulation onto the shared continuous timeline and
   independent automation stream.
4. Add the validated varying-IP Infinity accelerator and live input
   invalidation.
5. Add independent Dream-cycle aggregation and Dream-before-Infinity ties.
6. Add transactional stored-time checkpoints, statistics migration, rolling
   history, and aggregate presentation; remove passive IP.
7. Run developer shadow comparison, cut over authoritative callers, and delete
   superseded paths only after characterization passes.

## Acceptance

- Cover pre-Infinity and first unlocks; ordinary and Break cycles at 1.2
  seconds, exactly 1/60 second, and faster-than-minimum reachability;
  unreachable/barely reachable targets; input changes during yielded work;
  retained above-threshold starts; every automation mode; every Dream stage;
  faster-than-60-per-second Dream cycles; Reality fractional/cap behavior;
  Quantum; bot cap; and interrupted checkpoints.
- Results are deterministic across rendered-frame chunking, yield points, and
  stored-time partitioning.
- Aggregated reset count, IP, and affected continuous state remain within 0.1%;
  discrete state and cap equality are exact.
- No zero-time reward loop, non-finite state, negative bank, or lost time.
  Save failure publishes nothing and cancellation preserves all uncommitted
  time.
- Active processing targets 2 ms with a hard 4 ms yield slice.
- Performance acceptance is based on simulated work, not one selected away
  duration. Fixtures span one minute through 100 days and report:
  scheduler passes, exact material events, analytical blocks, rejected blocks,
  reset cycles represented, and simulated seconds per block.
- A stable interval must require work proportional to logarithmic transition
  composition, not its number of 0.1-second ticks.
- A repeated-reset interval must require work proportional to signature
  changes, validation checkpoints, and aggregate blocks, not the raw number of
  Infinity or Dream resets represented.
- Doubling away time without adding a signature change must not approximately
  double exact event work. Tests compare work-count ratios across the duration
  matrix rather than accepting one machine-specific elapsed time.
- Wall-clock measurements remain secondary regression evidence, recorded
  cold/warm on representative hardware. The four-millisecond yield contract
  governs responsiveness when exact fallback is genuinely required.
- Final source changes require the full EditMode suite, relevant PlayMode
  coverage, and supported local IL2CPP builds.

If performance requires violating the accuracy contract, implementation stops
for design review rather than relaxing either requirement.

## Local implementation checkpoint

The active and stored-time callers now use the shared event-time scheduler.
The local implementation includes deterministic event ordering, queued player
inputs, an independent 0.1-second automation clock, concurrent
Reality/Dyson/Dream advancement, exact durable bot-cap handling, isolated
stored-time candidates, cancellation, post-persistence publication, truthful
statistics, rolling history, and aggregate stored-time presentation. Legacy
passive offline IP has been removed.

Validated accelerators cover stable analytical production, retained-state
ordinary Infinity, proven stable Dream intervals, and a now-authoritative
stable-signature Break recurrence. The Break recurrence evaluates reward and
1/60-grid duration as functions of current IP, finds the next IP at which
either value changes, and applies each constant run arithmetically. It does
not assume every cycle is identical.

The exact stable Break path is shared by active and stored time. Active blocks
stop at the independent 0.1-second automation boundary and advance Dream in
canonical 1/60-second event slices, so a rendered-frame backlog cannot change
Dream state. Stored time may use the validated long-Dream projector. Dyson
automation may be skipped across a Break block only once sampled cycles are
pinned to the 1/60 minimum, where same-boundary purchases are wiped by the
reset and cannot affect the reward. Before that stable minimum regime,
automation-sensitive cycles remain on the exact event path.

Infinity reset completion now immediately rebuilds bot distribution and
derived production. This fixes the historical dead interval in which retained
facilities existed after a reset but produced nothing until a later unrelated
recalculation. With that canonical defect repaired, the earlier 1.064% result
is obsolete: a corrected 600-second comparison now produces exactly 950 IP in
both canonical and accelerated paths.

Focused local validation on 2026-07-27:

- Full Unity EditMode suite after the final source changes: 391/391 passed.
- Fresh macOS Universal IL2CPP development build succeeded; the player binary
  contains both `x86_64` and `arm64` architectures. The temporary build harness
  was removed after validation and the artifact remains outside the repository.
- Pure stable-cycle projection: 8/8 tests passed, including changing
  duration/reward boundaries, refusal of an unproven signature, and refusal of
  an unrepresentable `long` aggregate.
- Integrated runtime/offline fixture: 24/24 tests passed.
- Active Break: a single 10-second backlog matches both the exact canonical
  scheduler and 100 separate 0.1-second advances for IP, reset counts, bots,
  and Dream state.
- Stored Break: the 600-second canonical comparison is 950/950 IP; stable
  duration fixtures represent 60 seconds, one hour, and 100 days with 32, 44,
  and 51 exact material events respectively.
- The representative 18-hour enabled-automation Break fixture completed in
  about 1.05 seconds, with 25 Break aggregate blocks and 681 exact material
  events. This is secondary measurement evidence, not a duration-specific
  acceptance contract.
- The representative non-reset automation matrix represented 60 seconds, one
  hour, and 18 hours with 6, 195, and 1,916 material events. A bounded 100-day
  diagnostic showed that this separate path remains proportional to genuine
  repeated Buy-Max purchase boundaries: after ten seconds of processing it
  had represented about 8.6 simulated days, 1,249 analytical blocks, and 8,303
  scheduler events. It is not per-tick replay, but it still needs a future
  validated purchase-transition compressor to make very long, purchase-dense
  intervals near-instant.

The remaining Infinity expansion is the plan's full pure one-cycle transition
for signatures that are not yet covered by the exact stable evaluator:
persistent skill side effects, changing pre-minimum automation purchases,
retained upstream production chains, and other discrete reset-side changes.
These continue through the exact resumable fallback rather than an unproven
projection. Superseded canonical paths remain as characterization and safety
fallbacks until those signatures and developer shadow comparison are covered.
