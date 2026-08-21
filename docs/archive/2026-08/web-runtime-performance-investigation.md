# Web runtime performance investigation

Status: confirmed investigation findings; remediation not started
Investigation date: 2026-08-03 to 2026-08-04
Primary symptom: sustained web play makes a mobile device hot
Source inspected: local `main` at `82cd16a`, with the relevant runtime,
snapshot, visualization and facility code compared against `origin/main`
through `bba288d`

## Purpose

This document records the current evidence and divides the performance work
into independent changes that can be implemented and measured one at a time.
It is not an implementation plan approval and does not claim that any issue is
fixed.

## Executive summary

The canonical simulation is running at the intended 10 Hz. The always-present
`requestAnimationFrame` scheduler samples the foreground clock at display rate,
but it only delivers active time after 100 milliseconds have accumulated. Its
direct callback cost was negligible in the measured profile.

The primary CPU problem is the amount of work performed by each valid 10 Hz
tick. A tick repeatedly clones and validates whole state graphs, copies static
definitions, copies every statistics window, derives and previews every
gameplay domain, clones and freezes a complete frontend snapshot, and publishes
that snapshot through the React root.

Separate presentation systems do perform work at display rate. Progress
interpolation uses JavaScript animation-frame callbacks and React state updates,
while the default-enabled Dyson visualization animates hundreds of SVG elements
with nested transforms and filters. Hiding the visualization removed all
observed per-frame style/layout passes and reduced measured main-thread work by
about 24 percent in the fresh-save scene.

The current evidence therefore points to three distinct sources of power use:

1. Excessive canonical work and allocation at 10 Hz.
2. React/DOM progress interpolation at display rate.
3. Continuous SVG style, layout, raster and compositing work at display rate.

## Important correction: 10 Hz versus frame rate

The simulation cadence itself has not silently reverted to 60 Hz:

- `DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS` is 100 ms in
  `src/ui/runtime/activeTimeDriver.ts`.
- `DEFAULT_AUTOMATION_INTERVAL_SECONDS` is 0.1 seconds in
  `src/simulation/eventTime.ts`.
- A four-second runtime trace observed 38 canonical ticks, consistent with the
  intended 10 Hz cadence after startup/timing boundaries.
- The foreground scheduling RAF ran approximately 60 times per second, but its
  direct callbacks consumed only about 25 to 37 ms across an eight-second
  window, approximately 0.3 to 0.5 percent of wall time.

The RAF scheduler is unnecessary display-rate polling and can eventually be
simplified, but it is not the cause of the thermal problem. The expensive work
starts when it delivers a real 10 Hz tick.

Frequency alone also changes a 60 Hz loop into a 10 Hz loop by a factor of six.
Orders-of-magnitude savings require the work inside a tick to be incremental.
The current implementation instead reconstructs and republishes most of the
application every tick.

## Measurement method and limitations

The existing production `dist` was served locally and profiled in headless
Chromium 150 using:

- 390 by 844 mobile viewport;
- device scale factor 2;
- 4x CPU throttling;
- eight-second measurement windows;
- DevTools `Performance.getMetrics` counters;
- wrappers around `requestAnimationFrame` callbacks and `structuredClone`;
- a fresh-save game state.

No source or production build output was changed for the profiling run.

These are main-thread browser measurements, not physical-device energy
measurements. Headless Chromium does not provide representative mobile GPU,
battery or thermal data. The late-game visualization and large mature saves
also remain to be measured on hardware.

### Eight-second results

| Scene | Main-thread task time | Busy share | JS RAF callbacks | `structuredClone` calls | Layout/style passes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle, visualization visible | 3.249 s | 40.6% | 480 | 20,254 | 480 / 480 |
| Idle, visualization `display:none` | 2.474 s | 30.9% | 480 | 19,992 | 0 / 0 |
| Hidden visualization and CSS motion disabled | 2.279 s | 28.5% | 480 | 19,985 | 0 / 0 |
| Tinker held, visualization visible | 4.428 s | 55.3% | 956 | 19,471 | 478 / 478 |

The CSS-motion-disabled result was recorded after the visualization had already
been hidden. It must not be presented as an independent measurement of the
visible visualization.

`structuredClone` itself accounted for approximately 1.1 seconds of each
eight-second idle window. This timing includes the profiling wrapper overhead,
so it is most useful as attribution and comparison evidence rather than a
standalone production benchmark.

## Confirmed finding 1: clone amplification per canonical tick

A separate four-second clone-shape trace observed 38 ticks and attributed:

| Clone shape | Calls | Approximate calls per tick |
| --- | ---: | ---: |
| Complete canonical runtime state | 380 | 10 |
| Complete canonical game state | 114 | 3 |
| Complete frontend-ready snapshot | 38 | 1 |
| Static definition objects | 9,272 | 244 |
| Evaluation snapshots | 78 | about 2 |
| Quantum preview objects | 38 | 1 |

This is at least 14 broad state/snapshot clones plus 244 small definition clones
for every 100 ms of foreground play.

The amplification is distributed across several ownership boundaries:

- `TransactionalSimulationEngine.transition()` clones authoritative state into
  a candidate.
- Candidate validation, copying, acceptance and snapshot publication introduce
  additional clones.
- `CanonicalEventTimeModel` clones its carrier during construction, advancement
  and state access.
- `CanonicalGameApplicationFacade` clones state for bot-cap and frontend
  snapshot operations.
- `FrontendSnapshotStore` clones and recursively freezes the published snapshot.

Relevant sources:

- `src/core/simulationEngine.ts`
- `src/simulation/canonicalEventTimeModel.ts`
- `src/application/canonicalGameApplication.ts`
- `src/application/frontendSnapshot.ts`
- `src/ui/runtime/frontendSnapshotStore.ts`

## Confirmed finding 2: repeated whole-state validation and definition copying

The transactional/event-time path performs approximately four complete numeric
validation passes per tick. `validateCanonicalGameState()` recursively walks
the state graph, including collections such as skills and statistics, and
constructs diagnostic property paths even when all values are valid.

Constructing `CanonicalEventTimeModel` also clones its runtime carrier and
copies definition maps. Because model construction and validation occur
repeatedly during ordinary advancement, immutable game definitions are copied
thousands of times per measurement window even though they do not change.

Validation is valuable at trust and persistence boundaries. Performing repeated
full-graph safety validation inside every normal production tick converts that
safety mechanism into sustained runtime load.

## Confirmed finding 3: all 138 statistics buckets are copied at 10 Hz

Canonical statistics retain:

- 60 minute windows;
- 48 half-hour windows;
- 30 daily windows.

`recordCanonicalStatisticsSegment()` calls `recordWindow()` for all three
collections. `recordWindow()` begins by cloning every bucket with
`source.map(bucket => ({ ...bucket }))`, even when only the current bucket needs
to change.

This means all 138 retained buckets are copied every 100 ms during active play.
The ordinary update should be constant-time with respect to historical window
count.

Relevant source: `src/simulation/canonicalStatistics.ts`.

## Confirmed finding 4: full-game projection and previews every tick

`selectFrontendGameplaySnapshot()` does not project only the active route or
changed domains. Every canonical publication currently includes work for:

- five basic facilities and mega structures;
- the full research catalog;
- Dream foundational, space, upgrade and education actions;
- Reality upgrades and worker-derived state;
- Quantum upgrades, sections and leap state;
- Infinity shop and reset previews;
- Avocado, stored time and skills;
- story and other derived facts;
- definition-coverage inspection.

Several preview paths execute transaction-like speculative purchase or reset
logic against candidate state. Definition coverage is also rescanned even
though the underlying definitions are static for the running build.

The result is then cloned, recursively frozen and published to the root React
snapshot subscriber. Components can avoid some DOM changes, but the
application has already paid the simulation, derivation, allocation and root
publication costs.

Relevant sources:

- `src/application/frontendSnapshot.ts`
- `src/ui/runtime/frontendSnapshotStore.ts`
- `src/ui/runtime/useBrowserRuntime.ts`
- `src/ui/gameplay/dyson/ReadyDysonSlice.tsx`

## Confirmed finding 5: progress interpolation is implemented as React work

A mathematical interpolation is cheap. The current delivery mechanism is not:

1. Each interpolated component owns a JavaScript RAF loop.
2. The callback calls a React state setter at display rate.
3. React renders the component.
4. The DOM `<progress>` value is updated.
5. Incoming 10 Hz canonical snapshots can restart interpolation effects.

`FacilityProductionProgress` can create one such loop for every visible active
facility. React may batch multiple state updates in the same frame, so the
current evidence does not prove one complete React-tree commit per facility per
frame. It does confirm separate callbacks and state traffic.

Tinker owns another RAF-based visual loop. Holding Tinker increased observed
RAF callbacks from about 60 to about 120 per second and increased main-thread
busy share from 40.6 to 55.3 percent in the measured scene. The increase also
contains Tinker's repeated gameplay and resulting React/DOM work, so it must not
be attributed solely to arithmetic inside the RAF callback.

Relevant sources:

- `src/ui/gameplay/facilities/BasicFacilityRegion.tsx`
- `src/ui/gameplay/tinker/TinkerSurface.tsx`

## Confirmed finding 6: the visualization is a large filtered SVG scene

The default visualization is not only a few rotating vectors. Depending on its
phase, its mounted SVG graph contains:

- 64 exact collector circles;
- 11 dense layers with 32 collectors each;
- 416 collector circles in total, including currently invisible collectors;
- 420 galaxy lights and 36 core lights;
- 84 nested galaxy-image groups in the galaxy-field phase;
- 144 field dust circles;
- four orbit groups plus additional independently animated groups;
- animated `drop-shadow`, brightness and saturation filters.

Nested SVG transforms with filters are not guaranteed to remain a single cheap
compositor operation. They can require style recalculation, layout, offscreen
rasterization, filtering and compositing.

In the fresh-save profile, the visible visualization caused exactly 480 style
recalculations and 480 layout passes over eight seconds: 60 of each per second.
Applying `display:none` reduced both counts to zero and lowered total measured
main-thread task time from 3.249 seconds to 2.474 seconds, approximately a
24-percent reduction.

The preference defaults to visible unless local storage explicitly records
`hidden`, so this cost is enabled for new users.

Relevant sources:

- `src/ui/gameplay/dyson/DysonSwarmVisual.tsx`
- `src/ui/gameplay/dyson/dysonSwarmVisual.css`
- `src/ui/gameplay/dyson/ReadyDysonSlice.tsx`

## Confirmed finding 7: truly backgrounded web play is suspended

The browser lifecycle does not deliberately keep canonical active time running
after the document becomes hidden. The `background` phase suspends active-time
delivery, saves according to policy and later handles elapsed time through the
away-time path.

The web policy does continue active time for a visible but unfocused desktop
window because `saveOnFocusLoss` is false. Native/mobile policies can stop on
focus loss. Therefore:

- hidden tab or backgrounded mobile browser: active simulation should stop;
- visible but unfocused desktop page: active simulation continues by policy;
- visible foreground page: canonical simulation runs at 10 Hz while
  presentation animation may run at display rate.

If a physical mobile test shows continued canonical ticks after the document
becomes hidden, that would contradict the inspected path and should be logged as
a separate lifecycle defect with visibility-state telemetry.

Relevant sources:

- `src/simulation/lifecycleAwayTime.ts`
- `src/platform/browserLifecycle.ts`
- `src/ui/runtime/browserRuntimeFoundation.ts`

## Items not currently considered root causes

- The foreground scheduling RAF: measurable but directly cheap.
- Writer-lease heartbeat: five-second interval, not tick-rate work.
- Durable checkpoint timer: 30-second interval.
- PWA update check: one-hour interval.

These should not distract from the state pipeline, UI interpolation and SVG
work unless later evidence changes their classification.

## Provisional conclusions requiring device evidence

- The exact percentage of battery and thermal load attributable to CPU versus
  GPU is unknown.
- Animated filtered SVG likely costs more on a physical mobile GPU than the
  headless main-thread profile shows, but that has not been measured.
- The 84-galaxy late-game field is likely more expensive than the fresh-save
  scene, but no representative late-game trace has been captured.
- Mature saves may increase clone, validation and derivation costs. The current
  clone counts are confirmed, but late-game duration scaling is not.
- React may batch facility progress updates. Exact commit counts require React
  profiling or production commit instrumentation.

## Ordered remediation backlog

Each item should be implemented, profiled and accepted independently. Do not
combine unrelated cleanup into the same change, because that would make the
power and performance result impossible to attribute.

### 1. Establish repeatable CPU and device baselines

Scope:

- Preserve the current four browser scenes as a repeatable sustained-work test.
- Add clone count/time, canonical tick count, task duration, layout/style count
  and RAF callback count to the report.
- Add representative early-, mid- and late-game save fixtures.
- Record a physical Android foreground/background thermal and battery trace.

Done when:

- Every later remediation can be compared against the same scenes.
- Browser acceptance and physical-device observations are stored separately.
- The test fails on meaningful sustained CPU regressions, not only latency,
  retained heap or bundle size.

### 2. Remove immutable definition cloning from active ticks

Scope:

- Capture immutable definitions once for the runtime/model lifetime.
- Stop cloning complete definition objects during ordinary model construction
  and validation.
- Preserve mutation safety at actual ownership boundaries.

Done when:

- Definition clone count during steady active ticks is zero or demonstrably
  constant independent of catalog size.
- Simulation and parity tests retain their current correctness guarantees.

### 3. Collapse whole-state clones and repeated validation

Scope:

- Trace every runtime/game-state clone through one active tick.
- Define the minimum authoritative candidate and publication copies.
- Move complete production validation to trust, load, import, persistence or
  explicit diagnostic boundaries where safe.
- Keep targeted invariants around the mutation actually performed.

Done when:

- The broad clone count per tick has a documented small upper bound.
- Normal ticks no longer perform repeated complete numeric-graph validation.
- Transaction rejection and state-isolation tests still pass.

This is the highest-risk change because cloning and validation currently encode
safety guarantees. It should not be mixed with projection or UI work.

### 4. Make statistics windows incremental

Scope:

- Update or replace only the current bucket.
- Rotate/replace a window only when its time boundary changes.
- Avoid copying all 138 buckets every 100 ms.

Done when:

- An ordinary tick allocates no historical bucket copies.
- Boundary rotation, reset and offline/event segmentation tests pass.
- Statistics cost is constant with respect to retained bucket count during an
  ordinary same-window tick.

### 5. Separate canonical state advancement from full frontend projection

Scope:

- Identify which domains changed during a tick.
- Cache static definition coverage.
- Compute expensive purchase/reset previews only for relevant visible or
  invalidated domains.
- Avoid deriving every game system solely because elapsed time advanced.

Done when:

- An idle tick does not execute every domain's preview path.
- Static coverage is calculated once per definition/catalog version.
- Opening or changing routes still produces immediately correct information.

### 6. Stop cloning, freezing and replacing the complete root snapshot

Scope:

- Publish stable, revisioned domain slices or structurally shared snapshots.
- Preserve frontend immutability without recursively cloning/freezing the full
  application graph every 100 ms.
- Ensure route-level subscribers rerender only for changed data.

Done when:

- Unchanged route/domain object identities remain stable across ticks.
- Root publication no longer requires one full frontend-snapshot clone.
- Rejected/no-op commands still publish nothing.

This should follow item 5 so the public snapshot shape reflects actual
invalidation boundaries.

### 7. Replace per-component RAF/React progress interpolation

Scope:

- Prefer compositor-friendly CSS transforms or animations for purely visual
  progress.
- Otherwise use one shared presentation clock with a deliberate mobile cap,
  rather than one RAF loop per progress component.
- Avoid React state updates for every display frame.
- Stop/reduce animation when hidden, occluded or motion-reduced.

Done when:

- Five visible facility bars do not create five independent RAF callbacks.
- Interpolation does not cause display-rate React commits.
- Canonical displayed values remain correct at tick boundaries.
- Reduced-motion and background behavior are verified.

### 8. Redesign the Dyson visualization rendering path

Scope:

- Do not mount collectors or scene members that cannot currently be seen.
- Remove filters from continuously transformed SVG groups where possible.
- Reduce independent animated layers.
- Compare a low-power SVG version with Canvas, WebGL or a pre-rasterized layer.
- Consider a reduced-detail mobile default while retaining an explicit visual
  quality control.

Done when:

- The fresh-save visualization no longer forces style/layout at 60 Hz.
- The late-game 84-galaxy scene meets an agreed physical-device frame-time and
  thermal budget.
- Hiding the visualization no longer produces a large CPU difference because
  the visible path is already efficient.

### 9. Replace the active-time polling RAF if still worthwhile

Scope:

- After the higher-impact work, compare RAF polling with a 100 ms timer or an
  elapsed-time scheduler that preserves canonical delivery semantics.
- Preserve coalescing, lifecycle suspension, away-time handling and catch-up.

Done when:

- Tick cadence and lifecycle tests remain deterministic.
- The change produces a measurable benefit or simplifies ownership enough to
  justify itself.

This is deliberately last because current measurements show that its direct
cost is negligible.

### 10. Lock sustained-work regressions into the performance gate

Scope:

- Extend the existing latency, heap and resource checks with sustained CPU and
  rendering-work budgets.
- Include idle foreground, Tinker held, multiple active facilities,
  visualization phases and hidden/background lifecycle scenes.
- Keep physical-device certification separate from synthetic Chromium checks.

Done when:

- A change that restores the current clone storm or 60 Hz layout loop fails
  automated performance verification.
- Release evidence includes a representative mobile thermal run.

## Recommended implementation order

The backlog order is intentional:

1. Baseline measurement.
2. Immutable definitions.
3. Transactional clones and validation.
4. Statistics.
5. Projection invalidation.
6. Snapshot publication.
7. Progress interpolation.
8. Visualization.
9. Scheduler cleanup.
10. Final regression gates.

Items 2 through 4 address canonical CPU/allocation cost without changing the UI
contract. Items 5 and 6 then establish incremental publication. Items 7 and 8
remove genuine display-rate work. Item 9 should only be pursued if measurement
still justifies it.

## Success criteria for the overall investigation

The thermal regression should not be considered resolved merely because one
microbenchmark improves. Completion requires:

- canonical simulation remains 10 Hz and deterministic;
- idle ticks perform bounded incremental work;
- steady-state clone and allocation volume is dramatically lower;
- inactive domains do not run previews every tick;
- progress smoothing does not drive React at display rate;
- the visible visualization does not force 60 style/layout passes per second;
- hidden/backgrounded play produces no canonical active ticks;
- representative mobile hardware remains thermally stable during a sustained
  foreground session.
