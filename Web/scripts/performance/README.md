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
