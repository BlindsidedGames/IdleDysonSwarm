# Web bundle composition and destination separation

Date: 2026-08-19

## Reproduce the measurements

Run these commands from `Web`:

```powershell
npm run report:initial-request-bundle
npm run report:bundle-composition
```

The first command builds production output, follows Vite's static manifest graph, includes the awaited English catalog, and reports the additional JavaScript needed for a fresh Bots surface. The second command builds production output and writes per-chunk raw/gzip sizes plus rendered module composition to `reports/bundle-composition/`.

## Before and after

Both measurements used Vite 8.1.5 on the same Stage 4 checkpoint and machine.

| Measurement | Before | After | Change |
| --- | ---: | ---: | ---: |
| Entry chunk, raw | 1,039,415 B | 1,018,152 B | -21,263 B (-2.0%) |
| Entry chunk, gzip | 267,168 B | 266,012 B | -1,156 B (-0.4%) |
| Boot JavaScript including English | 300.03 KiB | 282.61 KiB | -17.42 KiB (-5.8%) |
| Completed fresh Bots JavaScript | 304.18 KiB | 286.75 KiB | -17.43 KiB (-5.7%) |
| Boot CSS, gzip | 19.16 KiB | 12.46 KiB | -6.70 KiB (-35.0%) |

The aggregate result is larger than the entry-only change because the old boot graph also pulled a shared React Intl chunk into the initial request. Destination separation changed that graph as well as the entry itself.

These reductions apply to the initial page request, JavaScript parsing, and
evaluation path. They do not currently reduce the eventual installed-PWA
download by the same amount: the generated service worker precaches every
player-facing emitted asset during installation or update. The composition
report therefore also measures that package. At this checkpoint it contains
153 precached assets totalling 4,638,449 raw bytes, or 2,430,361 bytes when each
asset is gzip-measured. Selective runtime caching would change offline/update
semantics and is deliberately deferred to the PWA verification stage rather
than hidden inside destination splitting.

## Boundaries introduced

- Settings and Debug now load only when their routes open.
- Simulation and Quantum route controls no longer pull their complete route surfaces into startup.
- Store checkout orchestration loads with the Store while a weak session cache preserves controller state across tab switches.
- The Avotation completion dialog loads only when it opens.
- Existing Wiki, Story, Statistics, Offline Time, Reality, Research, Skills, Infinity, Facilities, and Avocato route boundaries remain dynamic.
- Suspense fallbacks keep the active route/supplement labelled and busy while its first chunk resolves.

Representative new route chunks are 8.29 KiB gzip for Simulations, 4.00 KiB for Settings, 3.38 KiB for Quantum, 2.85 KiB for Store, and 2.04 KiB for Debug. The existing large Skills and Wiki destinations remain separate at 100.19 KiB and 31.77 KiB gzip respectively.

## Budget policy

The report now enforces a temporary 301 KiB boot-JavaScript no-regression ceiling. This is the smallest whole-KiB ceiling above the measured 300.03 KiB pre-stage baseline. The first milestone remains a provisional warning at 250 KiB, with 200 KiB retained as the longer-term target.

This pass deliberately does not force the 250 KiB milestone through manual vendor chunks or minifier tuning: those techniques rearrange files without reducing bytes. The largest remaining entry contributors are the React DOM client, the runtime catalog, the canonical application/simulation engine, snapshot projection/runtime ownership, save migration/encoding, and the genuinely immediate Bots shell. Reaching 250 KiB requires an architectural follow-up such as reducing the runtime catalog payload or moving a validated part of canonical engine startup behind a worker boundary. Either needs its own correctness and startup-latency measurements rather than being smuggled into route splitting.
