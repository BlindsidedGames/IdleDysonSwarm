# Unified Event-Time Reset and Simulation Plan

Status: Implemented locally; validated with the limits recorded below
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
- Active processing targets 2 ms with a hard 4 ms yield slice. Representative
  goals are 18 hours under 250 ms, stable 42,000,000 seconds under 2 seconds,
  and supported event-heavy cases under 10 seconds.
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
ordinary Infinity, representative changing-IP Break cycles, and proven stable
Dream cycles. Accelerators retain the exact event path as their fallback and
reject blocks whose validation error exceeds 0.1%.

Final local validation on 2026-07-27:

- Unity EditMode: 375/375 passed.
- Unity PlayMode invocation: completed successfully, but this project currently
  discovers zero PlayMode tests.
- macOS Universal IL2CPP: temporary player build succeeded for both arm64 and
  x86_64.
- Representative 600-second Break replay: canonical and accelerated results
  both ended at 820 IP.
- Representative 18-hour stored-time run with active Dyson automation and
  Dream: approximately 0.72-0.79 seconds in the Editor benchmark; the
  scene/coroutine/UI path measured approximately 0.73 seconds.
- Representative 18-hour changing-IP Break run: approximately 0.90 seconds.
- Stable 42,000,000-second whole-game analytical fixture: approximately
  0.44 milliseconds after fixture setup.

The original 250-millisecond 18-hour target is therefore not yet met by the
event-heavy representative fixtures, although they complete below one second
on this development machine. The 42,000,000-second stable target is met.

The current changing-IP Break projection is still expressed in 0.1-second
units. Break cycles shorter than 0.1 seconds are deliberately rejected by that
projection and run through the exact event-time fallback so a legitimate
1/60-second cycle is never rounded into incorrect rewards. Continuous-second
compression of those extreme Break cycles remains a performance follow-up;
accuracy is not relaxed.

The adaptive long-Dream validator currently proves convergence for community,
workers, cities, factories, bots, rockets, space factories, energy, panel
counts, and finite state. Housing and villages are advanced and covered by
short exact-parity tests, but they are not yet part of the long-block
coarse/fine maximum-error gate. Adding them to that gate currently rejects the
projection and exposes an under-processing defect in the fallback used by the
high-frequency ordinary-Infinity fixture. That attempted tightening was not
retained; a future change must solve the fallback/time-accounting interaction
before the full continuous-state 0.1% proof can be claimed.

Developer shadow comparison is represented by the model contract but is not
enabled as a live dual-run mode. Superseded fixed/canonical paths remain only
as conservative characterization and fallback paths until further runtime
observation justifies deletion.
