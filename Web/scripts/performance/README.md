# First-slice production performance reports

These commands build the production application, serve `dist/` through Vite
Preview, launch a clean headless Chrome/Edge profile and write machine-readable
JSON plus text summaries under the ignored `Web/output/performance/` directory.
They use Node's built-in WebSocket client and the Chromium DevTools Protocol, so
they add no browser-automation dependency.

Set `IDS_CHROMIUM_PATH` when Chrome or Edge is not installed in a standard
location.

## Interaction trace and synthetic Web Vitals

Run the shortened one-profile smoke trial:

```powershell
npm run report:performance:interaction:smoke
```

Run the acceptance command:

```powershell
npm run report:performance:interaction
```

The acceptance command runs five 30-second trials at desktop 1440x900 and
mobile 390x844 with 4x CPU throttling. It records presentation long tasks,
pointer activation to visible Tinker pressed-state feedback, Event Timing
interactions for synthetic INP, layout-shift session windows for CLS and LCP.
The report applies the fixed P75 trial aggregation and P95 feedback budgets from
`product-ui-foundation.md`.

For harness debugging only, smoke duration and trial count are configurable:

```powershell
npx tsx scripts/performance/runInteractionReport.ts --smoke --duration-ms=5000 --trials=1
```

A smoke report is always marked `acceptanceEligible: false`, even when its
observed budgets pass.

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
