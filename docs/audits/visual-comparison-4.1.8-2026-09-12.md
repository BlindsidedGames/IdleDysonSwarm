# Original 4.1.8 versus final optimization candidate

Baseline is untouched `878f5bffecd59c699712103172e668d12853d16a`, built separately
from the primary checkout. Candidate is the frozen v6 production web output,
with production changes through `b9b47d65` and tooling through `7bc88cd7`.
No player saves were used. Both builds imported the checked-in maximum-skills
fixture through Settings and used separate temporary browser profiles.

## Chromium comparison

Inspected all 15 paired screenshots (30 captures) for Bots, Research, Skills,
Wiki and Settings at 390×900, 768×900 and 1440×900 CSS pixels. No new visual
regression was observed: font shapes, wrapping, card spacing, controls, Skills
art and navigation agree. Selected layout landmark rectangles and visible button
labels/disabled states matched exactly in every pair. No horizontal overflow or
broken image was found. All 133 mounted Skills images loaded in both builds at
all three widths. These checks concern selected visible viewports, not every
possible scrolled state or game route.

Bots and Research automation controls were exercised separately in both builds
at all widths: one toggle changed state, then three rapid toggles settled back
to the original state. All 12 surface/build/width combinations passed. Import
and route navigation also completed through the actual application UI. Controls
were invoked through DOM handlers; this does not exercise physical touch hit testing.

Simulation remained live. Header numbers and progress may differ slightly due
to capture timing; this is not claimed as a whole-page pixel equality test.
Screenshots were visually inspected in addition to DOM comparison.

Local artifacts, relative to the worktree:

- `output/visual-qa-4.1.8/index.html`: before/after gallery.
- `output/visual-qa-4.1.8/results.json`: snapshots and interaction results.
- `output/visual-qa-4.1.8/summary.json`: 15-pair comparison summary.
- `output/visual-qa-4.1.8/compare.ts`: reproducible browser procedure.
- `output/visual-qa-4.1.8/pair-*.jpg`: inspected side-by-side images.

## Additional evidence

The dedicated [iOS 17.5 WKWebView comparison](ios-webkit-comparison-2026-09-12.md)
is complete: ten paired observations matched selected text, layout and controls;
all six Wiki screenshot pairs were pixel-identical. It compares
native-mode web assets, not a signed shipping Capacitor application. Earlier
Chromium Wiki checks covered all 19 lore chapters and archived patch notes
through English/French/English switching at mobile/desktop widths. Isolated
font probes separately compared 6,261 pixel/metric cases in each of Chromium
and iOS WebKit. See the Wiki, font, and native WebKit review records.

No CSS/layout corrections were needed during this final comparison. Production
code remained frozen throughout; only audit documentation and local QA artifacts
were added. This is evidence for the reviewed surfaces and does not establish
universal native-device or release acceptance.
