# First-slice production performance reports

These commands build the production application, serve `dist/` through Vite
Preview, launch a clean headless Chrome/Edge profile and write machine-readable
JSON plus text summaries under the ignored `output/performance/` directory.
They use Node's built-in WebSocket client and the Chromium DevTools Protocol, so
they add no browser-automation dependency.

Set `IDS_CHROMIUM_PATH` when Chrome or Edge is not installed in a standard
location.

Build the normal minified production application, record its boot graph and
completed fresh-Bots transfer, enforce the temporary 301 KiB gzip JavaScript
no-regression ceiling plus the CSS, English-catalog and aggregate source-font
ceilings, report the 250 KiB JavaScript milestone as a warning, and verify that
no performance-probe marker or recorder remains:

```powershell
npm run verify:normal-performance-build
```

The boot graph is the application entry plus the English catalog awaited before
React first renders. The report lists the lazy facility chunk separately because
the fresh-save `????` teaser requests it to complete the approved Bots surface.
The 250 KiB milestone does not make this command fail. Exceeding the 301 KiB
no-regression ceiling or an enforced CSS, catalog, or source-font limit does.
The 200 KiB figure remains an eventual architectural target, not a current
release gate.

## Interaction trace and synthetic Web Vitals

Run the shortened one-profile smoke trial:

```powershell
npm run report:performance:interaction:smoke
```

Run the acceptance command:

```powershell
npm run report:performance:interaction
```

The interaction commands create a minified production build in Vite's
`performance` mode. That mode statically selects a presentation-only probe
which starts immediately before the external-store snapshot selection and ends
in the layout effect for that exact committed snapshot revision. Initial mount,
same-revision rerenders, StrictMode effect replay and aborted renders do not
produce samples. Normal production builds statically select the unprobed host.
Each trial performs excluded warm-up Tinker activations only until its first
measured revision, then clears instrumentation and starts the timed trace. This
handles startup timing without accepting a missing sample, and the warm-up is
outside the timed trace.

The acceptance command runs five 30-second trials at desktop 1440x900 and
mobile 390x844 with 4x CPU throttling. It records presentation long tasks,
snapshot-selection-through-React-commit P95 (8 ms desktop, 16 ms mobile),
pointer activation to visible Tinker pressed-state feedback, Event Timing
interactions for synthetic INP, layout-shift session windows for CLS and LCP.
The report applies the fixed P75 trial aggregation and P95 budgets from
`product-ui-foundation.md`. The commit interval excludes browser paint,
command/coordinator time and input scheduling.

## Runtime lane attribution

Run the focused comparison used while optimizing canonical processing,
frontend projection, snapshot publication and React commits:

```powershell
npm run report:performance:lanes:focused
```

Run the wider diagnostic route set:

```powershell
npm run report:performance:lanes
```

Both commands build an instrumented production variant, start an isolated
Vite Preview server, and use `test/fixtures/schema-08-canonical-idb1-main-save.txt` for the
advanced-Dyson measurements. They write machine-readable results under the
ignored `output/performance/` directory. The focused report covers fresh Bots
plus advanced Bots, Skills and Settings at desktop and mobile viewports with
4x CPU throttling. These are diagnostic lane measurements, not acceptance
evidence. Keep the save path and SHA-256 recorded with a baseline unchanged
when making before-and-after comparisons.

For harness debugging only, smoke duration and trial count are configurable:

```powershell
npx tsx scripts/performance/runInteractionReport.ts --smoke --duration-ms=5000 --trials=1
```

A smoke report is always marked `acceptanceEligible: false`, even when its
observed budgets pass.

An acceptance-mode command exits nonzero if CLI overrides make it ineligible,
even when every observed metric is within budget. Only explicit `--smoke`
permits a successful diagnostic report which is not acceptance evidence.

## Explicit-GC retained-heap soak

Run the shortened smoke soak:

```powershell
npm run report:performance:soak:smoke
```

Run the required 30-minute acceptance soak:

```powershell
npm run report:performance:soak
```

The harness warms the playable slice before its baseline, forces two DevTools
heap collections at both baseline and completion, and records
`JSHeapUsedSize`, documents, DOM nodes, JavaScript event listeners, active
timeouts, intervals, animation frames and pointers. It also uses
`Runtime.queryObjects` to count live `Set` instances whose members are all
callbacks, recording both callback-subscription sets and members without
requiring a production debug hook. Retained heap may grow by the larger of
10 MiB or 20 percent of the post-warm-up baseline. Resource counts must return
to or below baseline.

For debugging, duration and warm-up are configurable:

```powershell
npx tsx scripts/performance/runSoakReport.ts --smoke --duration-ms=15000 --warmup-ms=7000
```

Do not cite a shortened report as acceptance evidence. Preserve the production
build output, JSON report, text report, browser version and command invocation
as CI artifacts for an acceptance run.

## Skill-effect evaluation differential and benchmark

Run the deterministic report while developing the compiled skill/effect path:

```powershell
npm run report:performance:skill-effects
```

The report uses the committed schema-08 compatibility fixture to construct a
bounded mature state; it never reads a developer's live save. It compares the
candidate materializer and dynamic resolver against frozen test-only copies of
the pre-optimization traversal and orchestration, then reports steady-state
materialization, alternating-ownership invalidation, dynamic-resolver sweeps,
and complete Dyson derivation timing. Semantic mismatch always fails.

After implementation, run the acceptance gate:

```powershell
npm run verify:performance:skill-effects
```

Acceptance requires 300 samples after warm-up, exact differential parity, at
least 35 percent lower median materialization time and at least 25 percent lower
P95. Use `--samples=<count>` only for local investigation; a reduced sample
count is not acceptance evidence. Keep the focused differential Vitest suite
alongside the timing report because timing alone cannot certify ordering,
condition, dynamic dependency, ownership-change, Infinity-reset, or
Quantum-reset semantics.

## Event Timing evidence limits

Synthetic INP still requires a positive interaction latency in every trial and
P75 at or below 200 ms. A missing trial fails even when the displayed aggregate
is below budget. JSON budget entries and text output now identify those trial
numbers explicitly; the legacy zero returned for an empty interaction set is a
missing-data sentinel, not measured zero latency.

The [W3C Event Timing specification](https://www.w3.org/TR/event-timing/#sec-should-add-performanceeventtiming)
clamps the event observer's duration threshold to at least 16 ms. `first-input`
bypasses that threshold only for the first input of a window. Fixture import
and warm-up already interact with the page, so observing `first-input` cannot
recover fast interactions later in the measured interval.

New trials record whether the event observer was installed, its threshold,
trusted pointerdown count, total event entries and entries with interaction IDs.
These diagnose absent instrumentation or input separately from an installed
observer receiving no qualifying entries. They do not prove an exact latency
for omitted entries and do not relax the acceptance gate. A future measurement
architecture would need independently validated browser paint tracing or a
separately specified censored-data bound; requestAnimationFrame timing, command
feedback time, artificial slowdowns and zero substitution are not INP samples.

The 12 September desktop run had missing-positive-measurement trials 1 and 2,
with 54 command feedback samples each, followed by 24/24/16 ms trials; its
24 ms P75 still fails. Mobile reported 24 ms in all five trials. The original
run predates observer diagnostics, so its absent entries cannot be conclusively
attributed to threshold filtering from that artifact alone.

## Soak and interaction build provenance

These runners resolve `IDS_PERFORMANCE_DIST` once (default `dist`), capture its
absolute directory and pass that exact directory to the preview. Report
`provenance.checkoutAtStart` identifies the measurement checkout before launch,
including whether it was dirty. It is explicitly not the source revision of a
previously built snapshot. `startedAtUtc` is separate from report completion.

`provenance.servedBuild` records the manifest and HTML hashes plus a sorted
path/size/SHA-256 inventory and combined hash of the complete build directory,
including lazy chunks, CSS, fonts and public files. Completion rechecks the
complete tree. Changed, removed or unreadable files set `passed` and
`acceptanceEligible` false and produce an explicit integrity failure in JSON and
text. Matching endpoint hashes establish start/end equality, not continuous
monitoring against a transient edit later reverted. Use a frozen output directory
for long runs. Snapshot capture requires ordinary files/directories and rejects
symlink entries rather than silently omitting their contents.

Existing reports without these additive provenance fields remain readable.
Earlier `runIdentity` values are not retroactive build ancestry evidence; see
`docs/audits/retention-soak-2026-09-12.json` for the historical frozen-build run.
The existing helper remains in other diagnostic runners outside this change;
only soak and interaction runs use the new provenance contract.

Validation on 12 September used the frozen `candidate-v4-dist` override on
isolated port 4296 with the normal 30-second warm-up and a 10-second smoke
measurement. All observed resource budgets passed; all 237 build files had
matching endpoint fingerprints, tree SHA-256
`559512a4ccc868c6de5c9e840a2bf71ec412029a5c0fa6a8673941abd2387193`.
The report explicitly remains `acceptanceEligible: false`. Local artifacts are
`output/performance/provenance-soak-candidate-v4.json` and `.txt`; the original
30-minute report was preserved. An earlier 5-second warm-up probe stopped before
baseline because Settings was unavailable; no measurement result was produced.
The bundle reporter was also exercised against this snapshot: enforced failures
retained exit code 1 and the provisional warning made no success claim.
