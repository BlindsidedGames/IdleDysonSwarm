# Mobile safe areas and Stored Time QA — 2026-09-13

Baseline: `d4b6fd54`. This record covers B14/B15 reproduction and local validation before publication.

## Reproduction and changes

- **B14:** the unmodified app on an isolated Android 15/API 35 Pixel 7 emulator,
  WebView `124.0.6367.219`, had a WebView already inset by 136 physical pixels at
  the top and 63 at the bottom in gesture portrait. The custom bridge additionally
  requested 51.809525 and 24 CSS pixels respectively. Button navigation increased
  the duplicate bottom reservation to 48 CSS pixels. Landscape also duplicated
  the cutout and navigation-side insets.
- The bridge now subtracts space already outside the WebView from the system-bar
  and cutout insets. Layout and inset changes refresh the values after layout;
  identical notifications are suppressed. The CSS, inset units, and Capacitor's
  layout policy are unchanged.
- **B15:** with a 1.5-second bank, All retained a 1.5-second request while Chromium
  normalized the native range value to 1. The thumb stayed at the beginning.
  Equivalent mismatches occurred for 59.9 and 60.5 seconds. The full bank now has
  a representable final slider position, mapped back to its exact duration.
  Interior selections retain whole-second stepping. A retained fractional draft
  is not silently normalized by the browser. A zero selection disables spending.
- Stored Time bank, selection, repeat, and completion labels show up to three
  fractional digits using the existing localized formatter. No global formatter,
  bank accounting, simulation, cancellation, timing, or persistence policy changed.

## Visual and interaction evidence

Screenshots and numeric measurements are retained outside the repository in the
task's local evidence folder. Only checked-in fixture-derived synthetic states
were used. No player saves, Discord exports, physical Android device, existing
browser profile, or another task's emulator/server was modified.

| Surface | Coverage | Result |
| --- | --- | --- |
| Native inset reproduction | Default Capacitor configuration, gesture/button navigation, portrait/landscape | Before/after screenshots and WebView/DOM bounds confirm duplicate reservation removed; controls remain outside system bars |
| Native edge-to-edge control | Same emulator, temporary generated debug asset with `SystemBars.insetsHandling=disable`, gesture/button navigation, portrait/landscape | WebView spans the window; bridge retains full required insets and controls remain protected. Default generated configuration restored afterward |
| Browser slider | Banks 0, 0.5, 1, 1.5, 59.1, 59.9, 60, 60.5, 600.5 seconds | All, actual pointer drag, keyboard Home/End, route departure/return, full spend, and reload passed |
| Partial/repeated spends | 120.5-second bank, two 60-second spends then final 0.5 | Exact expected remainder at each stage; no overcharge or stranded fraction |
| Cancellation | Real worker, accurate 86,400-second job | Cancel simulation preserves bank; subsequent 60-second spend succeeds |
| Responsive layout | 390×844; 360×780 at 130% text; 844×390; 1440×900 | Max Storage readable; amount and actions usable, scrolling where required; completion remains dismissible |
| Adjacent controls | Sidebar quick spends from Bots; capacity upgrade | Two quick spends preserve final fraction; upgrade updates Max Storage to two days using existing bank-reset behavior |
| Android touch | All, drag to endpoint, route return, cancel confirmation, full spend, export | Fractional and integral spends complete without remainder; controls recover |
| Persistence | Browser export decoding and actual page reload; Android export decoding | Full-bank results persist as zero; cancellation/retry export retains 86,340 seconds |

The Android edge-to-edge control exercises the measured geometry branch; it is
**not** a claim of actual WebView 140+ or S20-device acceptance. The reporter's
exact S20 model/OS/WebView configuration remains unavailable. No iOS device or
Simulator acceptance is claimed.

## Automated validation

- 62 focused/regression tests passed: Offline Time UI and quick spends, canonical
  Stored Time integration, worker simulation, and native-host bridge tests.
- Android debug assembly and 13 JVM unit tests passed, including five geometry
  tests for padded, edge-to-edge, partial, landscape, and keyboard/window-offset
  cases.
- Full web suite initially passed 1,559 of 1,560 tests. The sole failure was the
  soundtrack master still being a Git LFS pointer in this new worktree. Fetching
  that exact tracked LFS object fixed it; both asset-integrity tests then passed.
- TypeScript, lint, production web build/store-boundary check, native web build,
  and `git diff --check` passed. Existing large-chunk build warnings remain.

## Separate finding and integration boundary

At 844×390, the existing Settings import dialog places Review Save below the
viewport. Its unchanged Settings component/CSS is outside this task's save
recovery ownership. Evidence was captured; landscape Stored Time QA imported
in portrait before rotating. This limitation remains open and should be handled
by the save/dialog owner.

Implementation is confined to the Android inset bridge/helper and Offline Time
surface/tests. There are no edits to `ReadyDysonSlice.tsx`, canonical application
or save plumbing, shared shell CSS/components, or secret visibility. Integrate
the small B14/B15 backlog edits alongside peer task entries. No store release or
deployment was performed during QA.

## Pre-merge review

The change was reviewed for inset ownership/lifecycle updates, slider mapping,
and bank accounting/persistence; no blocking findings remained. It rebased cleanly
onto `a24d0f57` (responsive-text fixes). All 1,561 tests on the integrated tree
passed, along with lint, data/localization validation, web/native builds, and
Electron boundary checks.
