# Infinity and Reset Performance Investigation

Status: Historical evidence brief; superseded for implementation decisions by
the approved Unified Event-Time Reset and Simulation Plan
Last updated: 2026-07-27
Primary historical baseline: `83c4685` (immediately before Numeric Safety commit `cdab99d`)
Current reviewed baseline: `d8a4788` (analytical offline fast-forward checkpoint)

## Purpose

This document preserves the evidence needed to redesign Infinity and reset
performance as one whole-game problem rather than applying another offline-only
patch.

It answers four questions:

1. What did Infinity and the other reset layers do before the Numeric Safety
   scheduler changes?
2. What do the committed scheduler and offline solver do now?
3. Which costs and semantic problems affect active play as well as offline
   replay?
4. What must be decided before an implementation plan can safely be approved?

This is not an implementation plan. It deliberately does not choose accuracy
tolerances, change reset rewards, redefine Break Infinity, or approve the
current local adaptive-cycle experiment.

Future gameplay Overflow is outside this investigation. The finite bot-cap
transition is included only because it invokes an Infinity reset.

## Executive finding

The underlying problem is shared by active and offline play.

The game currently treats a reset as both:

- a gameplay state transition; and
- an immediate presentation operation involving GameObjects, text, skill-tree
  events, panel resets, alerts, and wall-clock history.

That is tolerable when a reset is rare. It becomes expensive and semantically
unstable when progression makes a reset possible every few seconds or every
0.1-second simulation tick.

The current active scheduler can execute up to ten complete simulation ticks in
one rendered frame. If each tick reaches an Infinity or Dream reset, it can also
run up to ten full reset/presentation sequences in that frame. The offline
fallback repeats the same complete sequence once per simulated reset.

The likely architectural direction is therefore a shared, model-only
event/reset engine used by both active and offline time, with presentation
observing aggregate results at a controlled rate. That direction is recorded
for later planning, but it is not yet approved and several gameplay semantics
must be decided first.

## Evidence layers

The working tree contains three distinct layers. Findings must not be quoted
without identifying the layer.

### Layer A: behavior before Numeric Safety

Commit `83c4685` is the parent of `cdab99d`.

At that point:

- Dyson production and the ordinary Infinity check ran once per rendered
  `GameManager.Update`, using `Time.deltaTime`.
- Ordinary Infinity was automatic.
- `breakTheLoop` prevented GameManager's ordinary automatic Infinity check,
  while `Oracle.Update` performed the separate automatic Break threshold check.
- The scene object named `ManualInfinityButton` is the holder for the Break
  target slider; it is not evidence of a player-invoked reset action.
- Facility automation used an unbounded `while (anyAutoBuy)` loop every rendered
  frame.
- Research automation could perform up to 100 full presenter passes per
  rendered frame.
- Dream reset evaluation ran in `SimulationPrestigeManager.Update`.
- Dream reset completion used a coroutine and waited one rendered frame before
  reapplying research.
- Offline Dyson progression used one 60-second production step per minute and
  did not replay automation or reset transitions.

This layer is the strongest source for original gameplay intent, but it also
contains the serious automation and frame-rate defects that prompted the
Numeric Safety work.

### Layer B: reviewed committed Numeric Safety/PR8 behavior

Commits `cdab99d` and `d8a4788` introduced:

- a canonical 10 Hz whole-game scheduler;
- bounded, deterministic automation;
- synchronous Infinity and Dream reset completion;
- event-aware analytical offline progression for eligible intervals; and
- canonical 0.1-second fallback for intervals that cannot be proven safe.

The committed baseline is the authority for what has been reviewed, tested, and
checkpointed. It does not contain a general repeated-reset accelerator.

### Layer C: local uncommitted performance experiments

The current working tree also contains substantial uncommitted performance
work, including an adaptive Infinity-cycle projection experiment, exact
bot-distribution batching, additional Dream batching, and presentation
suppression during offline replay.

Those changes are useful evidence, but they are not an approved architecture.
In particular, the adaptive experiment:

- observes three completed cycles;
- fits and validates a changing cycle model;
- projects segments of future rewards/durations;
- applies an aggregate IP/result state without executing every reset; and
- captures the Break slider target at offline-session start.

It is offline-specific and does not remove the active-play reset cost. It also
does not reproduce every per-reset side effect. It must therefore be treated as
a prototype, not as established semantics.

Previously reported modified-tree test/build results must not be presented as
evidence for the original baseline or as approval of this design.

## Historical and current time models

| Concern | Before `cdab99d` | Committed `d8a4788` |
|---|---|---|
| Dyson active production | Once per rendered frame with `Time.deltaTime` | Fixed 0.1-second ticks |
| Dream active production | Independent component/frame timing | Same fixed whole-game tick |
| Active catch-up | Implicitly one frame update | At most 10 fixed ticks per rendered frame; backlog remains |
| Ordinary Infinity | Automatic frame check | Automatic after each fixed tick |
| Break Infinity | Automatic in `Oracle.Update` when projected reward reached the slider target | Automatic when projected reward reaches slider target |
| Dream reset | Independent `Update`, coroutine completion | Fixed scheduler, synchronous completion |
| Offline Dyson | 60-second approximate steps | Analytical eligible intervals, otherwise exact 0.1-second replay |
| Offline Dream | Separate stored-time/manager behavior | Advanced concurrently with Dyson |
| Offline automation | Not replayed by the old minute solver | Forced Buy Max on complete fixed ticks |
| Offline reset continuation | Not replayed by the old minute solver | Replays reset and continues |
| Reality workers | Per-frame `Time.deltaTime`; separate O(1) offline handler | Still outside the canonical whole-game kernel |

## Current canonical fixed-tick order

`DeterministicSimulation.RunWholeGameTick` defines this order:

1. Dyson production.
2. Dream production, downstream eras first, using start-of-tick inputs.
3. Dyson automation.
4. Dream automation/conversions.
5. Dyson derived-state recomputation.
6. Dream durable timer synchronization.
7. Dream Double Time consumption.
8. Dream reset evaluation and completion.
9. finite bot-cap/Infinity reset evaluation and completion.

Newly produced facilities begin working on the next tick. When Dream and
Infinity reset conditions occur on the same tick, Dream resets first.

The order is deterministic, but deterministic execution of every tick is not
the same as scalable execution of repeated reset cycles.

## Infinity reward equations

Let:

- `B` be current bots;
- `T = 4.2e19 / 10^divisionsPurchased` be the ordinary bot threshold;
- `e = 3.9` be `infinityExponent`;
- `G(n, T, e)` be the geometric-series cost returned by
  `CalcUtils.BuyXCost(n, T, e, 0)`; and
- `M` be the product of the two independent x2 IP flags
  (`saveSettings.doubleIp` and `prestigePlus.doubleIP`).

`StaticMethods.InfinityPointsToGain(T, B)` returns the greatest whole `n` for
which `G(n, T, e) <= B`.

The two Infinity modes do not use that value in the same way:

- Ordinary `DysonInfinity` grants a fixed `1 * M` IP. Bot overshoot does not
  increase its reward.
- Break `AutomaticBreakInfinityReset` (historically named
  `ManualDysonInfinity`) grants
  `InfinityPointsToGain(T, B) * M`.

The current fixed scheduler automatically invokes the Break reset when that
projected reward reaches `infinityPointsToBreakFor`.

## Staged lifecycle map

### 1. Pre-Infinity

Trigger:

- ordinary bots threshold, initially about 42 quintillion bots.

Reward:

- fixed +1 IP, multiplied by the two x2 flags if already available through
  entitlements/progression.

Reset:

- current Dyson run state and current skill ownership are replaced/reset;
- persistent Infinity purchases, Quantum state, Reality, Avocado, and Dream
  state survive;
- retained starting bots/facilities and permanent skill points are restored;
- queued skills can be auto-assigned.

One-time presentation:

- first-Infinity and first-Reality menu visibility flags;
- early prestige screen behavior around the first 42 IP.

Performance status:

- long production intervals can be batched offline when they are affine and do
  not contain excluded persistent skill side effects;
- the boundary tick and reset are still executed canonically;
- active play always uses fixed ticks and a complete reset.

### 2. Repeated ordinary Infinity

The reward remains fixed per reset even if the player greatly exceeds the bot
threshold.

Quantum Divisions reduce the bot requirement by a factor of ten per purchase,
up to 19 purchases. At 19 Divisions, the threshold is 4.2 bots. Retention can
start a new run with 10 bots. That means a legitimate late-game state can meet
the next ordinary Infinity threshold immediately after reset and trigger
another reset on the next 0.1-second tick.

Performance status:

- committed PR8 stops analytical batches before the threshold and executes each
  reset separately;
- active play can execute up to ten such complete resets in one rendered frame;
- repeated ordinary cycles are therefore not solved as a general aggregate
  transition in the committed baseline.

### 3. Break Infinity

Historical intent evidence:

- the pre-Numeric-Safety `GameManager` only triggered the *ordinary* automatic
  Infinity path when `!breakTheLoop`;
- the same historical build's `Oracle.Update` independently calculated Break
  reward every rendered frame and automatically called `Prestige` when that
  reward reached `infinityPointsToBreakFor`;
- the scene object called `ManualInfinityButton` contains the reward-target
  slider. It does not contain a player-invoked reset button.

Current behavior:

- the fixed scheduler calculates the current Break reward every tick;
- when reward reaches the slider target, it automatically calls `Prestige`;
- the Break reward formula is applied and the full Infinity reset follows.

The Numeric Safety scheduler moved this automatic check from `Oracle.Update`
into the deterministic transition order; it did not change Break from manual
to automatic.

Slider details:

- stored target: integer `infinityPointsToBreakFor`;
- UI range: approximately 1 through 1100 on a logarithmic slider;
- current active scheduler reads the live stored value every tick;
- committed canonical offline fallback also reads it as it yields between
  ticks, so a player can currently change the target while replay is running;
- the local adaptive prototype instead captures the target at the beginning of
  the offline session.

The UI itself has two different Break progress concepts:

- `PrestigeFillBar` compares displayed reward to the selected target;
- `InfinityPanelManager` interpolates between the current and next geometric
  reward tier.

`PrestigeFillBar` also omits `saveSettings.doubleIp` from one fill calculation
while including it in the text. These inconsistencies are presentation defects,
but they also show why slider semantics cannot be inferred from one UI class.

Performance status:

- committed PR8 rejects Break mode from its main affine analytical path;
- it therefore replays each 0.1-second tick and each reset;
- the uncommitted adaptive prototype can project some repeated Break cycles but
  does not establish the final active/offline contract.

### 4. Passive offline Infinity Points

This is separate from simulated Infinity cycles.

Before the main offline simulation, the game adds:

`floor(awaySeconds * lastInfinityPointsGained / timeLastInfinity / 10)`

That is ten percent of the previous run’s average IP-per-second rate. It:

- directly increases IP;
- does not create bots;
- does not perform an Infinity reset;
- does not move the Break slider; and
- is O(1).

It was not the cause of the observed slowly repeating Break-reset bar.

The formula depends on `lastInfinityPointsGained` and `timeLastInfinity`, so
incorrect run-time bookkeeping during compressed/catch-up resets can affect
future passive IP.

### 5. Legacy finite bot-cap transition

This is not future gameplay Overflow.

When finite bots reach exactly `double.MaxValue`, Oracle uses a durable staged
transition:

1. mark the transition;
2. grant the legacy cap rewards once (+1 legacy Overflow/Avocado counter and
   +1,000 IP);
3. persist the reward checkpoint;
4. invoke `GameManager.Prestige`;
5. clear transition flags after the Infinity reset.

Non-finite bots are invalid technical state and are repaired to zero without a
reward.

`GameManager.Prestige` then chooses ordinary or Break Infinity reward/reset
logic according to the current `breakTheLoop` flag. The cap transition is
infrequent and persistence-heavy by design; it must never be folded into a
generic repeated-cycle accelerator.

### 6. Quantum Leap and Quantum Entanglement

At 42 available IP, the Quantum UI enables the leap action.

Without Quantum Entanglement:

- `EnactPrestigePlus` clears current skill ownership;
- starts `PrestigeDoubleWiper`, which is a coroutine;
- replaces Dyson Prestige and Infinity data;
- recalculates production;
- waits one rendered frame;
- replaces both Dyson data objects again;
- grants +1 Quantum point;
- restores permanent secrets, automation, and unlocked mega-structures;
- clears last-Infinity reward/time, offline-use counters, selected skill
  timers, fragments, and current skill points;
- auto-assigns persistent/artifact skills; and
- resets the rotating Dyson panel presentation.

This path remains frame-coupled and is not part of the canonical fixed
scheduler.

With Quantum Entanglement:

- the same UI action converts all available complete groups of 42 IP to Quantum
  points;
- debits those IP;
- performs no Dyson reset.

Archived documentation calls Quantum Entanglement “auto-prestige at 42 IP,” but
the current code only performs conversion when `EnactPrestigePlus` is invoked
by the UI event. That wording/code conflict must be resolved before treating it
as an automatic event in a shared solver.

Offline progression does not automatically invoke the Quantum UI action.

### 7. Reality workers and Avocado

Reality worker generation is a separate clock:

- `WorkerController.Update` adds `WorkerGenerationSpeed * Time.deltaTime`;
- completed workers are floored and added in one operation rather than a
  per-worker loop;
- auto-gather can convert workers to Influence;
- `WorkerService.ApplyOfflineProgress` computes the offline result in O(1).

This system is not currently advanced by the same fixed scheduler that advances
Dyson and Dream. Its offline event subscription receives the whole away
duration separately. Any future claim of a single whole-game time engine must
explicitly include or deliberately exclude this clock.

Avocado has no automatic prestige/reset loop. It manually consumes available
IP, Influence, and Strange Matter into persistent multiplier accumulators.
Those multipliers can materially change Dyson/Dream cycle durations, so their
state must be part of any reset-cycle model even though Avocado itself does not
reset.

### 8. Dream/Simulation resets

The canonical scheduler evaluates Dream resets before Infinity on each tick.

Automatic disaster stages:

- stage 0 or 1: one City grants 1 Strange Matter;
- stage 2: 100 Dream bots grants 10 Strange Matter;
- stage 3: five Space Factories grants 20 Strange Matter;
- stage 42: countermeasures are complete and no automatic disaster reset is
  selected by this switch.

The manual black-hole action grants current `swarmPanels` as Strange Matter.

Each reset:

- increments `simulationCount`;
- adds Strange Matter;
- replaces `SaveDataDream1`;
- reconstructs all Dream runtime timers/state; and
- reapplies every owned persistent Simulation upgrade.

Alerts and UI state are also changed by reset callers.

Performance status:

- quiet Dream intervals are analytically advanced until a timer, research,
  boost, conversion, railgun, Double Time, or reset boundary;
- the boundary is executed canonically;
- repeated Dream reset cycles are not represented as one aggregate reset map;
- retained research can make future cycles short, so this can become the same
  class of active/offline problem as Infinity.

### 9. Full save wipes

Soft/hard save wipes and startup recovery resets are user/support operations,
not gameplay prestige loops. They delete or replace broad save state, persist
immediately, and reload the scene. They must remain outside any gameplay-cycle
aggregation.

### 10. Later progression

There is no implemented deeper gameplay reset after the systems above.

The future monetization/progression document discusses a possible later deep
reset with galvanized skill-tree nodes. Its trigger, reward, reset scope, and
survival rules are explicitly undecided. It cannot constrain the present
solver except that the new architecture should make another reset policy
possible without another rewrite.

## What one Infinity reset currently costs

The durable gameplay mutation itself is not the only cost.

### State and formula work

- clear three current skill-state collections;
- clear legacy and database-backed skill ownership;
- allocate a new `DysonVerseInfinityData`;
- compute/add rewards;
- restore retained facilities and skill points;
- reset timers, fragments, offline-run counters, and transition flags;
- recompute modifiers/derived production.

### Skill-tree event work

`AutoAssignSkillsInvoke` invokes `GameManager.AssignSkills`, then recalculates
modifiers.

`SkillsAutoAssignment` can make up to `autoAssignIds.Count` passes over the full
queue. After each successful pass it invokes `GameManager.UpdateSkills`.

Subscribers include:

- every `LineManager`;
- every skill card through `SkillTreeManager`;
- save-state synchronization through `SetSkillsOnOracle`; and
- other skill/settings presentation listeners.

`GameManager.Prestige` invokes an additional whole-tree `UpdateSkills` after the
Oracle reset.

### Panel/GameObject work

`Rotator.ResetPanels` loops all 200 scene-wired Dyson panel GameObjects and
calls `SetActive(false)` on each reset. It also allocates a new `HashSet<int>`
inside the loop, producing 200 avoidable allocations per reset.

### Text and modal work

`GameManager.Prestige`:

- closes confirmation UI;
- formats elapsed time and reset count strings;
- rewrites prestige text;
- toggles first-run UI;
- can activate the prestige screen.

Several Infinity/Quantum UI components also recompute logarithms, geometric
costs, formatted numbers, button state, and text every rendered frame,
independently of whether their underlying state changed.

### Logging/presentation in automation

Some automated mega-structure purchase presentation paths emit purchase logs.
High-frequency automation/reset activity can amplify logging and stack-trace
costs in development players.

## Shared active-play failure modes

### Multiple full resets per rendered frame

The live scheduler executes at most ten pending 0.1-second ticks per rendered
frame. Each tick can run the complete reset path. A slow frame creates backlog,
and processing that backlog can cause more reset and UI work in the following
frame.

This is a feedback loop:

1. reset/presentation work makes a frame slow;
2. elapsed time adds several fixed ticks to the accumulator;
3. the next frame executes several resets;
4. those resets make that frame slow again.

### One-tick cycles are legitimate late-game state

At 19 Divisions, ordinary Infinity requires 4.2 bots. Retention can restart at
10 bots. The scheduler can therefore reset again without requiring meaningful
production growth. Optimizing production formulas alone cannot solve this
case.

### Simulated time and wall-clock history are mixed

`GameManager.Prestige` derives `timeLastInfinity` from `DateTime.UtcNow` and
`lastCollapseDate`.

That is reasonable for an ordinary active run, but not for:

- multiple fixed catch-up ticks in one rendered frame;
- offline canonical replay;
- an aggregate repeated-cycle calculation; or
- a paused/throttled presentation layer.

Several simulated resets can happen at nearly the same wall-clock instant. The
current fallback substitutes 10,000 seconds when the measured duration is not
positive. That value then feeds passive offline IP and run-history UI.

A future engine needs an explicit simulation clock and must define separately
when wall-clock timestamps are recorded.

### Presentation runs at simulation/reset frequency

Reset visuals, skill-tree refreshes, alerts, and formatted text are invoked as
part of the transition. There is no way to simulate 1,000 reset outcomes
without also requesting 1,000 presentations.

### Multiple independent clocks remain

Even after the fixed Dyson/Dream scheduler:

- Reality workers use rendered-frame delta time;
- some UI/research visibility logic runs every rendered frame;
- Quantum wipe waits for a rendered frame;
- offline entry uses a coroutine and a 4 ms yield budget; and
- reset history uses UTC wall time.

This prevents one authoritative definition of “advance the whole game by X
seconds.”

## Committed offline accelerator: what is fast and what is not

### Fast/analytical when eligible

PR8 can batch verified intervals involving:

- affine Dyson production chains;
- facility/research affordability horizons;
- quiet Dream production timers and research;
- boost expiry;
- energy/railgun boundaries;
- Dream Double Time depletion; and
- intervals before Infinity/Dream reset boundaries.

It validates candidate Dyson transitions against canonical behavior and stops
before material events.

### Canonical fallback

The committed solver falls back to 0.1-second ticks when:

- Break Infinity is active;
- listed skill effects have persistent/non-affine side effects;
- required automation/Dream managers are unavailable;
- the next Dream event is too close to batch safely;
- automation or reset is due; or
- the analytical transition fails validation.

Fallback yields after approximately 4 ms so the UI remains responsive, but it
does not reduce the total number of simulated ticks/resets.

### Important distinction

The solver can be excellent at crossing a long production interval and still
be slow when the interval contains thousands of resets. Reset-cycle
aggregation is a different operation from production batching.

## Approved decisions that resolved the former intent questions

### Break Infinity

Break remains automatic. The slider selects its auto-reset IP target. A queued
slider change affects the next unprocessed simulation segment; a completed
aggregate is not rolled back.

### Ordinary one-tick resets

Ordinary and Break Infinity have an authored minimum cycle duration of 1/60
simulated second. Reset cycles and the independent 0.1-second automation stream
must not be coupled.

### Active-play aggregation

Decide how often an aggregate result is allowed to become visible:

- immediately each rendered frame;
- at a capped presentation frequency; or
- only when the aggregate segment ends at a player-visible event.

The durable reward can be exact even if animation/text is not shown for every
individual reset.

### Reset history

Decide what `timeLastInfinity`, last reward, total reset count, achievements,
and run-history UI mean after N compressed cycles:

- values from the final cycle;
- aggregate values for the compressed segment; or
- a new explicit summary containing both.

### Quantum Entanglement

Decide whether it is:

- a button that converts all complete 42-IP groups, matching current code; or
- a true automatic conversion event, matching archived wording.

### Dream alerts and repeated resets

Decide whether N compressed Dream disasters:

- show one final alert with aggregate Strange Matter/reset count;
- queue a bounded number of alerts; or
- require canonical fallback because each alert is gameplay-significant.

## Candidate architecture for the later plan

The evidence supports investigating one shared architecture rather than
separate “online” and “offline” formulas.

### 1. Pure state model

Create model-only transition functions with no `MonoBehaviour`, GameObject,
text, coroutine, logging, or wall-clock side effects.

Examples:

- `AdvanceProduction(state, duration)`
- `EvaluateNextEvent(state, policies)`
- `ApplyInfinityReset(state, mode)`
- `ApplyDreamReset(state, disaster)`
- `ApplyQuantumLeap(state, mode)`

Each transition returns:

- new durable/model state;
- simulated time consumed;
- reward deltas;
- reset counts;
- one-time flags/achievement events;
- final-cycle history; and
- a presentation/event summary.

### 2. Explicit stage policies

Ordinary Infinity, Break Infinity, finite bot-cap, Quantum conversion/wipe, and
Dream reset must be separate policies. They share infrastructure but not reward
or reset semantics.

### 3. Event-driven shared time advancement

Both active and offline callers ask the same engine to advance by a duration.
The engine:

1. finds the next material event;
2. analytically advances to it when validated;
3. applies the pure event/reset transition;
4. detects whether repeated transitions can be aggregated;
5. continues until the requested endpoint or processing budget.

Active play supplies small durations each frame. Offline supplies a large
duration. They differ in budget and presentation, not in gameplay math.

### 4. Repeated-cycle acceleration

Do not require cycles to be identical.

The reset-to-reset transition can be treated as a recurrence over the small
state that actually changes between cycles, including:

- IP and spent IP;
- retained facilities/bots;
- permanent upgrades and Divisions;
- skill preset/auto-assignment outcome;
- Avocado multipliers;
- Dream state advancing concurrently;
- Double Time;
- selected Break threshold; and
- one-time flags.

Possible accelerators to evaluate in the plan:

- an exact closed form for genuinely invariant cycles;
- monotone event/reward recurrence solved in chunks;
- validated adaptive blocks for smoothly changing cycles;
- binary lifting/composition where a transition map can be safely reused; and
- bounded canonical fallback around discontinuities.

The engine should calculate an aggregate outcome and apply it once whenever it
can prove or validate the result. It should not execute every reset merely
because the cycle duration is 1.2 seconds rather than 0.1 seconds.

### 5. Separate presentation observer

Presentation subscribes to summaries after model state is committed.

For example:

- “Completed 4,812 Infinities”
- “Gained 93,204 IP”
- final slider progress and current run state
- final/aggregate Dream reward

Skill cards, panel GameObjects, alerts, formatted text, audio, and logs update at
a bounded presentation frequency, never once per simulated reset.

### 6. Explicit simulation clock

The engine owns simulated elapsed time. Wall-clock timestamps are only used at
lifecycle boundaries. Reset history is derived from simulated cycle duration,
not how long the CPU took to process it.

### 7. Safe fallback

Fallback remains necessary for:

- player input that changes a policy during a segment;
- one-time unlock/achievement boundaries;
- non-monotone or unmodelled skill effects;
- finite cap/bot-cap transitions;
- manual Quantum/wipe actions; and
- failed validation.

Fallback should process event-sized chunks and yield to a time budget. It must
not discard elapsed time.

## Approaches that are insufficient alone

### Offline-only adaptive projection

It can make a tested offline case fast, but leaves active reset storms and
duplicated semantics intact.

### Removing UI allocations only

The 200 panel operations, skill-tree refresh storm, and per-frame formatting
should be fixed, but one complete model reset per 0.1 second still does
unbounded total work over long offline durations.

### Increasing the frame budget

This shortens the progress screen by creating longer stalls. It does not reduce
work or resolve wall-clock/run-history semantics.

### One giant approximate formula

The whole game contains discontinuities: affordability, unlocks, selected
thresholds, retained state, Dream disasters, boosts, railgun events, Double
Time depletion, Quantum actions, finite caps, and one-time flags. One
unvalidated formula would be difficult to reason about and unsafe for saves.

The more promising design is one event engine with several small, validated
transition/aggregation strategies.

## Required planning fixtures and measurements

The later plan should require both active and offline measurements for the same
save fixtures.

### Progression fixtures

- first Infinity, no automation;
- early repeated ordinary Infinity;
- maximum Divisions without retained bots;
- maximum Divisions with 10 retained bots (one-tick ordinary reset);
- Break target at 1, a mid target, and slider maximum;
- Break cycle around 0.1 s, 1.2 s, 10 s, and minutes;
- both x2 IP flags independently and together;
- each persistent/non-affine skill currently rejected by PR8;
- full skill auto-assignment queue;
- first 42 IP and first Quantum Leap;
- Quantum Entanglement conversion;
- finite bot-cap transition at every crash checkpoint;
- each Dream disaster stage and completed countermeasures;
- repeated Dream resets with retained research;
- concurrent Dream and Infinity reset on the same tick;
- active Reality workers, auto-gather, and Avocado multipliers;
- Dream Double Time at 0, 1, and 10 with mid-segment depletion.

### Correctness comparisons

For short/reference durations, compare against the canonical tick engine:

- exact discrete currencies, ownership, flags, reset counts, and one-time
  events;
- exact cap equality;
- continuous relative error target chosen by the user during planning;
- final timer error target chosen by the user;
- final Break progress and threshold behavior;
- final-cycle and aggregate history values; and
- identical order when Dream and Infinity coincide.

### Performance measurements

Measure:

- pure model CPU time;
- reset transition CPU time;
- presentation CPU time;
- allocations;
- event/reset count;
- analytical segments accepted/rejected and rejection reason;
- canonical ticks used;
- active frame p50/p95/p99 and worst frame;
- offline wall-clock completion; and
- memory/GC on representative mobile IL2CPP hardware.

Benchmarks must include the complete runtime/coroutine/presentation path, not
only an isolated solver method.

## Source map

Primary runtime:

- `Assets/Scripts/Systems/GameManager.cs`
- `Assets/Scripts/Systems/DeterministicSimulation.cs`
- `Assets/Scripts/Systems/OfflineProgressSystem.cs`
- `Assets/Scripts/Systems/AnalyticalOfflineSimulation.cs`
- `Assets/Scripts/Systems/DreamAnalyticalOfflineSimulation.cs`
- `Assets/Scripts/Expansion/Oracle.cs`

Infinity/Quantum presentation and purchases:

- `Assets/Scripts/User Interface/PrestigeFillBar.cs`
- `Assets/Scripts/User Interface/InfinityPanelManager.cs`
- `Assets/Scripts/Systems/Infinity/InfinityManager.cs`
- `Assets/Scripts/User Interface/QuantumProgressBar.cs`
- `Assets/Scripts/User Interface/QuantumUpgradeUI.cs`

Reset side effects:

- `Assets/Scripts/SkillTreeStuff/SkillsAutoAssignment.cs`
- `Assets/Scripts/SkillTreeStuff/SkillTreeManager.cs`
- `Assets/Scripts/SkillTreeStuff/LineManager.cs`
- `Assets/Rotator.cs`

Dream/Reality:

- `Assets/Scripts/Expansion/SimulationPrestigeManager.cs`
- `Assets/Scripts/Expansion/ResearchManager.cs`
- `Assets/Scripts/Expansion/Dream1/FoundationalEraManager.cs`
- `Assets/Scripts/Expansion/Dream1/InformationEraManager.cs`
- `Assets/Scripts/Expansion/Dream1/SpaceAgeManager.cs`
- `Assets/Scripts/Expansion/WorkerController.cs`
- `Assets/Scripts/Services/WorkerService.cs`
- `Assets/Scripts/Systems/Avocado/AvocadoFeeder.cs`

Historical intent evidence:

- commit `83c4685`;
- scene tooltip in `Assets/Scenes/Game.unity`;
- `Documentation/Archive/QuantumAndRealityRefactorPlan.md`;
- `Documentation/Archive/RealitySystemAnalysis.md`.

Archived documents are supporting evidence only. Current code and explicit user
decisions remain authoritative.

## Implementation handoff

The approved Unified Event-Time Reset and Simulation Plan resolves the design
questions that originally ended this investigation:

- production is continuous between material events;
- automation has its own configurable 0.1-second clock;
- Infinity has a 1/60-second minimum cycle and Dream keeps its natural cycle;
- adaptive aggregation accepts at most 0.1% error in reset count, IP and
  affected continuous state while preserving discrete events exactly;
- Dream resolves before Infinity on a tie;
- Quantum actions and the black-hole reset remain queued player actions; and
- repeated stored-time results are summarized without changing rewards.

Implementation and verification status belongs in the approved plan document,
not in this historical evidence record.
PR sequence.
