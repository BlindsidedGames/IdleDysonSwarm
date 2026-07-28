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
until aggregate reset count (rounded up to a whole cycle), IP, and affected
continuous state agree within the user-approved 1%. Discrete reset kinds,
flags, unlocks, caps, purchases, settings, and one-time rewards remain exact.
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
- Aggregated reset count (rounded up to a whole cycle), IP, and affected
  continuous state remain within the user-approved 1%; discrete reset kinds,
  flags, unlocks, caps, purchases, settings, and one-time rewards remain exact;
  discrete state and cap equality are exact.
- No zero-time reward loop, non-finite state, negative bank, or lost time.
  Save failure publishes nothing and cancellation preserves all uncommitted
  time.
- Active processing targets 2 ms with a hard 4 ms yield slice.
- Performance acceptance is based on simulated work, not one selected away
  duration. Fixtures span one minute, one hour, 100 days, and the full
  42,000,000-second stored-time cap, and report:
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
The implementation includes queued input boundaries, an independent
0.1-second automation clock, concurrent Reality/Dyson/Dream advancement,
durable bot-cap handling, isolated stored-time candidates, cancellation,
post-persistence publication, truthful statistics, rolling history, and
aggregate stored-time presentation. Legacy passive offline IP has been
removed.

An independent review on 2026-07-28 found that the first automated Break
projector was still linear for variable-duration cycles: it grouped resets
into 256-cycle containers but evaluated every reset inside those containers.
That structure is consistent with a multi-second or tens-of-seconds wait over
a large reset count and is not accepted as completed batching.

The current unvalidated working changes replace that fixed container with a
hierarchical projection:

- a stable candidate block may represent the entire remaining reachable
  interval; failed validation halves the candidate instead of growing upward
  through many smaller blocks;
- coarse and refined midpoint integrations begin with 4 and 8 segments;
- resolution may grow to 128 refined segments before the block is split;
- elapsed time, IP, last reward, affected continuous state, discrete retained
  state, automation phase, and the next exact reset signature are checked;
- any retained purchase, unlock, first-run transition, or other signature
  change forces a split and exact processing around that boundary;
- active play and stored time both use resumable projection work;
- active minimum-duration blocks stop before the independent automation
  boundary, allowing the shared scheduler to execute
  production -> automation -> reset in the authored order;
- threshold scheduling no longer promotes a merely-nearby bot balance to the
  Break target. The event horizon advances beyond representational rounding
  without changing a below-threshold starting state.
- stable cycles longer than five seconds cross the former probe horizon by
  advancing analytically to each real automation purchase, applying that event
  exactly, then resuming the analytical interval;
- the one-cycle probe, coarse/refined samples, and exact endpoint checks retain
  their isolated in-progress state and process no more than 16 material
  boundaries in one projection step, preventing an event-dense cycle from
  hiding an unbounded synchronous loop inside the outer frame budget;
- every one-cycle probe is also bounded by the simulated time it can usefully
  consume. Reaching the requested endpoint without a reset records a bounded
  no-reset result instead of continuing toward the million-boundary safety
  ceiling; endpoint validation compares the two candidates at the common
  requested time when neither projection can fit another reset;
- active Dream research, community/factory boosts, and Double Time advance in
  the same isolated candidate up to their independent completion, expiry, or
  depletion boundary;
- Dream coarse/fine refinement is resumable too: warmup, midpoint projection,
  exact tail, and validation advance in bounded 32-segment steps, retain the
  isolated candidate across yields, and publish only after convergence;
- post-disaster Dream states use validated adaptive projection, including
  partial charge and bulk railgun volleys with exact discrete shot/panel
  agreement; disaster stages 0-3 batch only whole ticks proven by the quiet
  horizon to contain no Dream material event, leaving the exact reset boundary
  to the canonical Dream-before-Infinity scheduler;
- failed concurrent Dream validation applies a retry delay instead of
  rebuilding the same accepted Infinity projection on every 0.1-second
  event.

The old background task has been removed. Projection work mutates only an
isolated candidate, can be abandoned without publishing, and is applied only
after validation. Stored-time publication remains guarded by successful
persistence.

Both the runtime and Editor/test assemblies compile successfully against the
current Unity-generated reference sets. Fresh Unity execution is still
required before this checkpoint can be called complete.
The previous 391/391 EditMode result and macOS IL2CPP build predate the latest
hierarchical-projector, active-automation, and threshold changes and therefore
must not be represented as final evidence. Required reruns are:

- focused one-cycle, threshold, active automation-tie, cancellation, and
  hierarchical-block tests;
- exact-reference comparisons for the one-minute, one-hour, 100-day, and
  42,000,000-second duration matrix;
- full EditMode and relevant PlayMode suites;
- a fresh supported IL2CPP build after the final source changes;
- cold and warm work-count plus wall-clock measurements from the complete
  stored-time runner, not only the projection helper.

The exact fallback remains necessary for persistent skill side effects and
other discrete reset-side changes that cannot yet be proven stable. Those
cases remain responsive through cooperative yielding. Both Infinity-cycle
evaluation and concurrent Dream refinement now retain isolated in-progress
state across those yields instead of hiding long validation work inside one
outer scheduler call.
