# Stable production summary validation — 2026-08-23

Scope: keep the Worker Bot/Panel and Researcher/Science production summaries
on one line at compact Android widths, reduce their type when necessary, and
prevent changing formatted values from making the type grow and shrink.

## Accepted behavior

- Both production summaries always use a single line and clip only as a final
  safety fallback below the readability floor.
- A stable widest-case Standard-notation value sizes each sentence, covering
  the maximum authored suffix width as well as Scientific and Engineering
  exponent forms.
- Fitting observes only the available container and the stable sizing
  sentence. Live production updates do not enter the measurement path.
- The fitted scale can decrease when space or font metrics require it, but
  cannot increase during the mounted summary's lifetime. Rate and suffix
  changes therefore cannot create a large/small pulse.
- The shared purchase-settings panel and its minimum-size Settings target are
  unchanged. The fitter is applied only to the two production summaries.

## Release evidence

- Focused component, Research, and ready-Dyson tests pass (67 tests).
- The complete test suite passes (1,971 tests), as do lint, TypeScript,
  production bundling, the Store boundary check, and native Android sync.
- At a 360 x 800 Chromium viewport, the Worker sentence fit within its
  298-pixel content area at a retained 0.77 scale. The Research sentence fit
  at a retained 0.874 scale. Both remained `nowrap`, stayed within their
  containers, and retained the same scale while their displayed values
  changed. The browser console contained no errors or warnings.
- A debug update was installed in place on the connected Samsung SM-S938B
  running Android 16. Existing app progression remained present. Screenshots
  of both Bots and Research confirmed one-line summaries with their formatted
  values, Science symbol, and `/s` suffix fully visible in the native WebView.

Physical Android evidence covers the reported platform and current device.
Physical iOS and assistive-technology certification remain part of their
broader release gates rather than this narrow layout fix.
