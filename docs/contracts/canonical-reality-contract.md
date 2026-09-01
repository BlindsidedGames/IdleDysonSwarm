# Canonical Reality contract

Reality is a deterministic worker and Influence domain over canonical player
state. Host components, frame callbacks, artifact animation, and presentation
events are outside this boundary. Current balance values and upgrade
definitions are canonical TypeScript inputs, not frontend constants. Some
values still originate in the deprecated compatibility capsule, but that
provenance does not make the capsule runtime authority.

## Authored inputs

`RealitySystemTuning` currently supplies:

- worker batch capacity: 128;
- base worker generation: 4 workers per second;
- artifact translation rules and speed-display intervals.

Worker generation speed is the authored base plus the permanent
Influence-speed bonus. The legacy source narrowed that result to a finite
`float` before simulation received it. Compatibility-sensitive calculations retain
that narrowing rather than silently substituting unrestricted JavaScript
double precision.

## Worker interval

An interval normalizes fractional progress into `[0, 1)`, repairs negative
workers, Influence and capacity to zero, and then applies these exact branches:

- invalid or non-positive speed/duration generates nothing and clamps ready
  workers to capacity;
- with manual gathering and a full batch at interval start, generation halts
  for the whole interval and reports the whole duration as capacity stall;
- otherwise, fractional progress plus `speed * seconds` is floored into whole
  workers;
- manual mode accepts only the remaining batch capacity, discards overflow,
  clears fractional progress when capacity is reached, and reports only
  accepted workers as generated;
- automatic mode offers every completed worker for direct conversion to
  Influence, consumes only the exact whole-worker delta represented by that
  continuous balance, and retains every uncredited worker in `workersReady`
  for a later interval;

The compatibility-sensitive manual-mode stall estimate is intentionally
approximate: when an
interval overfills the batch it uses
`seconds - acceptedWorkers / generationPerSecond`. It does not account for
fractional progress that existed at interval start. Change this established
formula only through an explicit gameplay decision.

Every generated worker advances Universe Designation exactly. The designation
is an unbounded non-negative ordinal identity label, not a discrete resource,
so it continues beyond the signed 64-bit discrete ceiling. Automatic conversion
may continue generating and counting workers after Influence is full; those
workers remain in `workersReady` up to its discrete ceiling. Overflow past that
ceiling retains the existing saturation and capacity-stall reporting behavior.

## Gather Influence transaction

The manual gather command is a single atomic exchange:

1. require at least one authored batch of ready workers;
2. debit the entire current ready-worker balance;
3. add exactly one batch-size amount of Influence;
4. reject without either debit if Influence cannot increase by the full amount.

The whole-balance debit is an established compatibility behavior. A repaired
normal state contains at most 128 ready workers, but a direct command against an oversized imported
balance consumes all of it and still grants only 128 Influence.

A successful manual gather records a zero-duration `manualInfluence` event.
Automatic intervals return worker, automatic-Influence and capacity-stall
metrics to the scheduler; they do not independently advance shared statistics
time.

## Navigation progression

The locked Reality destination is previewed after the first Secrets of the
Universe purchase. Its progress bar is exclusively `current Secrets / 27`;
current or spent Infinity Points must not reveal or fill that bar.

Fresh saves do not begin Reality worker or Influence generation until the
Reality destination has been visited for the first time. That visit is portable
route-discovery state, so generation remains active across reload, import,
offline processing and later resets. Legacy saves without route-discovery data
retain generation after the canonical Reality unlock to preserve established
progress.

Simulations remains absent until Reality is first visited. It then appears as a
locked destination whose progress follows the current manual worker batch out
of 128, including fractional worker-generation progress while its displayed
value remains whole. The first successful manual Gather Influence transaction
records 128 lifetime manual Influence, permanently unlocks Simulations and
creates the new-route highlight. Automatic Influence cannot advance this
preview or unlock. Existing saves with persisted
Simulation progress remain grandfathered into the unlocked state.

## Reality upgrades

The exported Reality layer contains 18 purchases:

- Translation I-VIII;
- Speed I-VIII;
- Enable Time Multiplier;
- Automate Gather Influence.

All debit Strange Matter atomically after ownership, prerequisites and authored
effects have been proven. Translation and Speed purchases set their permanent
flags and grant one current-run skill point. Their owned flags also contribute
one platform/artifact skill point each when a later Infinity reset rebuilds the
skill tree.

Enable Time Multiplier sets permanent Double Time ownership, which permanently
runs all gameplay domains at 2x game speed. It clears the retired mutable
enabled/rate/bank state. Automate Gather Influence sets the permanent
auto-convert flag but does not synchronously convert an already-full batch
inside the purchase transaction.

Artifact text substitution and animation speed are presentation consumers of
Translation and Speed ownership. They are not gameplay mutations in this
checkpoint.

## Scheduler and statistics ownership

Reality production runs in the shared production-arrival phase from the
interval-start state. The central scheduler later records one combined segment
for Reality, Dyson and Dream. It must incorporate Reality's returned:

- accepted/completed workers;
- actually credited automatic Influence;
- capacity-stall seconds.

Recording that segment inside the isolated Reality module would advance
`trackedSimulatedSeconds` more than once when the other domains are integrated.
Only the zero-duration manual-gather event belongs directly to the command.

## Runtime integration

The whole-game scheduler routes Reality production metrics into the combined
statistics segment, queues manual gathering and upgrades at command boundaries,
and owns ordering against Dream and Infinity resets. Candidates publish only
through the transactional application and verified persistence lane.

Canonical state represents worker progress, ready workers, Universe
Designation, Influence, auto-convert, permanent Reality upgrades, Double Time,
and statistics totals. Artifact presentation remains outside gameplay state.
