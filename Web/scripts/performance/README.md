# First-slice production performance reports

These commands build the production application, serve `dist/` through Vite
Preview, launch a clean headless Chrome/Edge profile and write machine-readable
JSON plus text summaries under the ignored `Web/output/performance/` directory.
They use Node's built-in WebSocket client and the Chromium DevTools Protocol, so
they add no browser-automation dependency.

Set `IDS_CHROMIUM_PATH` when Chrome or Edge is not installed in a standard
location.

Build the normal minified production application, record its boot graph and
completed fresh-Bots transfer, enforce the CSS, English-catalog and aggregate
source-font ceilings, report the provisional 200 KiB JavaScript target as a
warning, and verify that no performance-probe marker or recorder remains:

```powershell
npm run verify:normal-performance-build
```

The boot graph is the application entry plus the English catalog awaited before
React first renders. The report lists the lazy facility chunk separately because
the fresh-save `????` teaser requests it to complete the approved Bots surface.
The JavaScript target does not make this command fail during the current design
baseline. An enforced CSS, catalog, or source-font overage does.

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
Each trial starts one excluded warm-up Tinker operation, waits for its first
canonical Tinker commit, then lets that revision's worker-backed dirty checkpoint
settle before clearing instrumentation and starting the timed trace. This
handles startup timing without overlapping gestures, accepting a missing
sample, or leaking warm-up persistence into the measured trace.

The acceptance command runs five 30-second trials at desktop 1440x900 and
mobile 390x844 with 4x CPU throttling. It records presentation long tasks,
snapshot-selection-through-React-commit P95 (8 ms desktop, 16 ms mobile),
pointer activation to visible Tinker pressed-state feedback, Event Timing
interactions for synthetic INP, layout-shift session windows for CLS and LCP.
The report applies the fixed P75 trial aggregation and P95 budgets from
`product-ui-foundation.md`. The commit interval excludes browser paint,
command/coordinator time and input scheduling.

For harness debugging only, smoke duration and trial count are configurable:

```powershell
npx tsx scripts/performance/runInteractionReport.ts --smoke --duration-ms=5000 --trials=1
```

A smoke report is always marked `acceptanceEligible: false`, even when its
observed budgets pass.

An acceptance-mode command exits nonzero if CLI overrides make it ineligible,
even when every observed metric is within budget. Only explicit `--smoke`
permits a successful diagnostic report which is not acceptance evidence.

## Mature-save startup and lazy routes

Profile a synthetic, non-private mature schema-12 save through the real
production browser migration path:

```powershell
npm run report:performance:mature-browser
```

The run seeds an isolated Chromium profile with `1e300` cash, `1e250` bots and
27 secrets, measures navigation through the ready shell, then times first-open
loading of the Simulations and Quantum route chunks. It writes evidence to
`output/performance/mature-browser-profile.json` and never reads a player's
browser profile or private save.

Run the schema-13 range profile from the last native-number-comparable value
through the canonical GameDecimal ceiling:

```powershell
npm run report:performance:large-numbers
```

This synthetic report covers exponents 300, 1,000, 5,000, 10,000, 20,000,
1,000,000, and the maximum supported exponent. At the ceiling it separates a
single maximum Cash value from simultaneous saturation of every scalable
domain. It measures schema-13 codec, production startup, every gameplay route,
displayed Cash, per-domain projection safety, and rejection at the exclusive
exponent boundary.

## Explicit-GC retained-heap soak

Run the shortened smoke soak:

```powershell
npm run report:performance:soak:smoke
```

Run the required 30-minute acceptance soak:

```powershell
npm run report:performance:soak
```

The harness seeds a mature all-routes-unlocked schema-13 save, visits every
route before taking its baseline, warms the playable slice, forces two DevTools
heap collections at both baseline and completion, and records
`JSHeapUsedSize`, documents, DOM nodes, JavaScript event listeners, active
timeouts, intervals, animation frames and pointers. It also uses
`Runtime.queryObjects` to count live `Set` instances whose members are all
callbacks, recording both callback-subscription sets and members without
requiring a production debug hook. Retained heap may grow by the larger of
10 MiB or 20 percent of the post-warm-up baseline. Live document nodes are
counted separately from Chromium's total DOM nodes so ordinary progression UI
growth is not mistaken for detached-node retention. The first five-minute
sample is the settling ceiling for nodes outside the live document and for
JavaScript event listeners; later samples and the final sample must not exceed
it. Timers, animation frames, pointers, and callback registries must return to
or below baseline.
The explicit-GC plateau samples run every five minutes (every 2.5 seconds in
smoke mode), so a passing endpoint cannot conceal steady retained growth.

For debugging, duration and warm-up are configurable:

```powershell
npx tsx scripts/performance/runSoakReport.ts --smoke --duration-ms=15000 --warmup-ms=7000
```

Do not cite a shortened report as acceptance evidence. Preserve the production
build output, JSON report, text report, browser version and command invocation
as CI artifacts for an acceptance run.
