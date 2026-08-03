# Web runtime performance baseline: 2026-08-04

Status: diagnostic snapshot, not acceptance evidence
Captured: 2026-08-04 08:15 AEST
Source commit: `82cd16a2c95a2b4dc1e641fb8e5c7adcd9a146e3`
Build command: `npm run build`

## Scope

This is the before-change snapshot for the sustained web-runtime performance
investigation. It records the current production behavior without applying any
runtime optimization. In particular, no immutable-definition, state-cloning,
snapshot-projection, progress-interpolation or visualization code was changed.

This snapshot is intended to make the first optimization discussion measurable.
It is a single diagnostic trial per scene, not a release certification or a
statistically aggregated acceptance run.

## Environment

| Property | Value |
| --- | --- |
| Browser | Google Chrome `150.0.7871.188`, headless production profile |
| Platform | Windows x64 |
| Viewport | 390 by 844 CSS pixels |
| Device scale factor | 2 |
| CPU throttle | 4x |
| Warm-up | 2,000 ms per isolated scene |
| Measurement window | 8,000 ms per scene |
| Browser state | New temporary browser profile for each scene |
| Application state | Fresh save / first playable slice |
| Production server | Local Vite preview of the newly built `dist` |

The profiling wrapper counted `structuredClone` calls and JavaScript
`requestAnimationFrame` callbacks. DevTools `Performance.getMetrics` supplied
task, script, layout and style counters.

## Summary results

| Scene | Main-thread task time | Busy share | Clone calls | Clone time | JS RAF callbacks | Layout / style passes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Idle, visualization visible | 3.212 s | 40.1% | 19,992 | 1.098 s | 480 | 480 / 480 |
| Idle, visualization hidden | 2.410 s | 30.1% | 20,248 | 1.111 s | 480 | 0 / 0 |
| Idle, visualization visible, reduced motion | 2.379 s | 29.7% | 20,255 | 1.115 s | 481 | 0 / 0 |
| Tinker held, visualization visible | 4.601 s | 57.5% | 20,200 | 1.150 s | 930 | 481 / 483 |

Busy share is `TaskDuration / 8 seconds`. Clone time includes measurement-wrapper
overhead and should be used for attribution and before/after comparison, not as
an uninstrumented production timing.

## Detailed browser metrics

All duration values are deltas across the eight-second measurement window.

| Scene | Script | Layout | Style recalculation | Layout count | Style count |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle, visualization visible | 0.275 s | 0.139 s | 0.090 s | 480 | 480 |
| Idle, visualization hidden | 0.267 s | 0 s | 0 s | 0 | 0 |
| Idle, visualization visible, reduced motion | 0.261 s | 0 s | 0 s | 0 | 0 |
| Tinker held, visualization visible | 0.597 s | 0.427 s | 0.158 s | 481 | 483 |

## JavaScript animation-frame observations

| Scene | Callbacks | Callback rate | Direct callback time | Active RAFs at sample end |
| --- | ---: | ---: | ---: | ---: |
| Idle, visualization visible | 480 | 60.0/s | 35.1 ms | 1 |
| Idle, visualization hidden | 480 | 60.0/s | 30.2 ms | 1 |
| Idle, visualization visible, reduced motion | 481 | 60.1/s | 18.9 ms | 1 |
| Tinker held, visualization visible | 930 | 116.3/s | 49.8 ms | 2 |

The single idle RAF is the active-time clock sampler. Its direct callback time
remains small. Holding Tinker creates the second active RAF. Work scheduled by a
callback, such as React rendering and browser layout, is not necessarily charged
to the direct callback duration.

CSS/SVG animation does not create JavaScript RAF callbacks, which is why hiding
or reducing visualization motion changes layout/style counts without changing
the approximately 60-per-second JavaScript RAF count.

## Resource counts at sample end

| Scene | Documents | DOM nodes | JS event listeners | Intervals | Active RAFs | Active pointers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Idle, visualization visible | 1 | 807 | 392 | 3 | 1 | 0 |
| Idle, visualization hidden | 2 | 1,104 | 620 | 3 | 1 | 0 |
| Idle, visualization visible, reduced motion | 1 | 807 | 424 | 3 | 1 | 0 |
| Tinker held, visualization visible | 1 | 807 | 242 | 3 | 2 | 1 |

The hidden-visualization scene navigated twice in the same isolated browser
profile to set the real persisted visualization preference before measurement.
Its document, node and listener totals are therefore not directly comparable to
the other scenes. The performance window itself began after the second
navigation and warm-up.

## Confirmed comparisons

### Visualization motion

Hiding the visualization reduced main-thread task time from 3.212 seconds to
2.410 seconds, a 25.0-percent reduction in this scene. It removed all 480 layout
and 480 style-recalculation passes.

Keeping the visualization mounted while emulating `prefers-reduced-motion:
reduce` produced the same zero layout/style-pass result and reduced task time to
2.379 seconds. This isolates continuous visualization motion, rather than the
mere presence of its 807-node document, as the cause of the measured 60 Hz
layout/style loop.

This confirms browser main-thread cost. It does not measure the physical GPU
energy used by SVG transforms, filtered layers or image compositing.

### Clone pressure

Every scene performed approximately 20,000 `structuredClone` calls in eight
seconds, about 2,500 calls per second. Hiding motion did not materially change
that volume. The clone pipeline therefore belongs to the canonical tick and
frontend publication path, not the visualization animation.

The earlier shape-attribution trace remains the source for the per-tick split:
10 runtime-state clones, 3 game-state clones, 1 frontend snapshot clone and 244
definition-object clones per canonical tick.

### Held Tinker

Holding Tinker increased main-thread busy share from 40.1 to 57.5 percent and
increased JavaScript RAF callbacks from 480 to 930. Script, layout and style
time all increased. This scene includes the complete held-input behavior:
Tinker's RAF loop, repeated commands, snapshot publication, React work and DOM
rendering. The increase must not be attributed only to interpolation arithmetic.

## Metrics deliberately excluded from conclusions

`JSHeapUsedSize` changed substantially between these short isolated profiles,
but no explicit garbage collection was performed at both boundaries. Those
deltas are not retained-heap evidence and are intentionally omitted from the
summary. The existing explicit-GC soak test remains the appropriate retained
memory measurement.

The following also remain outside this snapshot:

- physical Android battery draw and temperature;
- mobile GPU utilization and raster/compositor timing;
- mid-game and late-game saves;
- several simultaneously active facility progress bars;
- repeated trials, medians and variance;
- a background/foreground lifecycle trace;
- React commit counts by component.

## Reproduction outline

1. Check out source commit `82cd16a2c95a2b4dc1e641fb8e5c7adcd9a146e3`.
2. Run `npm run build` from `Web`.
3. Serve `dist` through Vite preview on localhost.
4. For each scene, launch a new Chrome profile with the environment above.
5. Install clone and RAF counters before page scripts execute.
6. Navigate to the production page and wait two seconds after the Tinker control
   becomes available.
7. Record DevTools performance counters before and after exactly eight seconds.
8. For the hidden scene, persist
   `idle-dyson-swarm.show-visualization=hidden`, navigate again, then warm up.
9. For reduced motion, emulate `prefers-reduced-motion: reduce` before
   navigation.
10. For held Tinker, dispatch pointer-down at the start of the window and
    pointer-up after reading the final counters.

## Baseline conclusion

This snapshot establishes three distinct before-change signatures:

- canonical allocation: approximately 20,000 clone calls per eight seconds in
  every scene;
- visualization motion: exactly 60 layout and style passes per second when
  enabled, zero when hidden or motion-reduced;
- held Tinker: a second JavaScript RAF plus materially higher script and
  rendering work.

No optimization is included in this snapshot. The next implementation target
must be discussed and authorized separately.
