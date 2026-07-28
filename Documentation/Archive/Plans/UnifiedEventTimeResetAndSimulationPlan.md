# Unified Event-Time Reset and Simulation Plan

Status: Archived on 2026-07-28; a replacement completion plan is intentionally pending
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

The authoritative reference and fallback is one cycle through the shared
scheduler. The isolated pure transition remains a target for parity, but it is
not used as a calibration source until repeated-cycle—not merely first-cycle—
parity is proven. Blocks split at every signature change, including unlocks,
first-run events, automation, input/mode changes, boost/research expiry,
Double Time depletion, caps, Quantum actions, and Dream stage changes.

Infinity reachability uses monotone bracketing. An unreachable target advances
without inventing a reset. When a threshold is reached before the 1/60-second
minimum, production continues and the actual reward at the reset instant is
awarded.

Ordinary and Break aggregation models changing IP power; it must not assume
identical cycles. Accuracy is symmetric: a projection may finish above or
below the exact reference. During the architecture phase, end-to-end
percentage accuracy is characterization data rather than a fixed release
target. Sampling cadence and IP-growth block limits remain explicit tuning
controls so accuracy can be brought closer to or farther from exact results
after the stable fast path is established. Local projection self-checks remain
bounded and discrete reset kinds, flags, unlocks, caps, purchases, settings,
and one-time rewards remain exact. The integer number of cycles fitting the
interval is located, the aggregate is applied once, and the remainder is
advanced normally.

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
- Aggregated reset count, IP, and affected continuous state are reported
  against exact short fixtures and across stored-time partitions. No fixed
  end-to-end percentage is a completion gate during the architecture phase;
  tuning targets will be chosen from measured gameplay results afterward.
  Error is symmetric. Discrete reset kinds, flags, unlocks, caps, purchases,
  settings, and one-time rewards remain exact; discrete state and cap equality
  are exact.
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

If tuning exposes a trade-off that changes gameplay materially rather than
merely moving an approximate aggregate above or below its reference, it stops
for design review.

## Local implementation checkpoint

The active and stored-time callers now use the shared event-time scheduler.
The implementation includes queued input boundaries, an independent
0.1-second automation clock, concurrent Reality/Dyson/Dream advancement,
durable bot-cap handling, isolated stored-time candidates, cancellation,
post-persistence publication, truthful statistics, rolling history, and
aggregate stored-time presentation. Legacy passive offline IP has been
removed.

The original varying-duration projector was still effectively linear and its
coarse/refined self-check could approve two equally wrong models. The current
working implementation instead uses canonical-sampled adaptive blocks:

- fast cycles use twelve genuine shared-engine Break resets grouped into three
  four-cycle samples; slower automation-crossing cycles use twenty-four resets
  grouped into three eight-cycle samples, then four-cycle refresh samples;
- those samples fit the local changing-IP reward and duration recurrence;
- each accepted block is bounded by a duration-scaled percentage of current IP
  and skips all represented resets;
- the sampled model enforces the stable-signature gameplay direction: rising
  IP cannot make the IP-power cycle trend systematically slower and cannot
  make the slider reward trend systematically smaller;
- after every projected block the engine runs another genuine sample window;
  projected versus observed endpoint drift feeds a weighted controller;
- one phase spike does not contract the block, while sustained drift halves
  future block growth down to a 25% floor and stable checkpoints recover it;
- active and stored-time paths both call the same sampled projector. Stored
  time still forces Buy Max without changing the saved active mode;
- mode, slider, unlock, cap, one-time reward, reset kind, Dream boundary, and
  queued input changes remain exact split points;
- a rejected sample block returns to resumable canonical work and may
  recalibrate; it never approximates a reset that has not been proven
  reachable.

The old background task has been removed. Projection work mutates only an
isolated candidate, can be abandoned without publishing, and is applied only
after validation. Stored-time publication remains guarded by successful
persistence.

The private phone-save truth fixture remains outside the repository; only its
hash and aggregate benchmark results are documented. Against exact shared-tick
references:

- one minute exact: 238,212 IP and 1,191 Break resets;
- one minute sampled stored time: 234,212 IP (1.679% low), about 0.73 seconds;
- one minute sampled active time: 235,812 IP (1.008% low), about 0.78 seconds;
- one hour exact: 36,859,768 IP and 178,986 Break resets, about four minutes;
- one hour sampled stored time: 39,455,800 IP (7.043% high), about 1.13 seconds;
- one hour sampled active time: 38,871,607 IP (5.458% high), about 2.53 seconds.

Whole versus two-half one-hour projection on the 1,000,000-IP/all-finite-
Quantum fixture differed by 0.130% in final IP and 0.698% in reset count. This
partition stability is a stronger architecture check than forcing a selected
exact percentage before tuning.

The isolated continuous pure-cycle model was tested as a cheaper calibration
source and rejected: although its first cycle matched, repeated cycles produced
33 resets where the authoritative shared scheduler produced 37 in one minute.
Canonical samples therefore continue to come from the shared scheduler; the
non-parity model is not used to bias projected rewards.

These are complete-runner warm development-machine measurements, not device
guarantees. The benchmark artifact is
`Documentation/Benchmarks/TickSystemPhoneInfinityBaseline-2026-07-28.json`.

The Infinity accelerator is still uncommitted and awaiting the full regression
suite and independent review. Long-range Dream reset cycles remain a distinct
performance limiter: the intact phone save enters the Dream exact fallback
often enough that day/month whole-game benchmarks are not yet representative
of Dyson projection throughput. Per the current priority, Dream acceleration
is paused rather than silently removing Dream state or rewards. The full
EditMode suite, relevant PlayMode coverage, and a fresh supported IL2CPP build
must be rerun after final source changes.
