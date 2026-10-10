# Challenge localization and accessibility — 10 October 2026

## Completed scope

Added the 40 replacement-challenge messages to each of French, German, Latin
American Spanish, Brazilian Portuguese, Russian, Japanese and Simplified Chinese:
280 translations, 2,618 keys per catalog. No previously translated value changed.
Existing challenge, skill, upgrade, Research, Discovery and Transcendence terms
were reused. German's section title uses a natural phrase that wraps at spaces.
ICU placeholders, operators, quantities and IP/SP are preserved. All ten compiled
catalogs pass the established extract, structural-check and FormatJS workflow.
Fluent-speaker review remains pending.

Research is the aligned-card reference; Infinity supplies the persistent controls
and existing action palette. Cards retain their shared layout and content-driven
height. Three observed accessibility defects were corrected locally:

- German title and long descriptions clipped at narrow/enlarged text. The route
  now permits wrapping, including individual long words at 320px/200% text.
- Replacing Start with restart confirmation left keyboard focus on the document
  body. Confirmation receives focus; failed saves return focus to Confirm; Cancel
  and accepted entry/abandonment restore focus to the originating card's action.
  A single UI-owner test failed before this change and passes after it. Real
  application admission, saving and receipts remain owned by integration tests.
- Enabled challenge actions used pale text on pale purple buttons. They now use
  Infinity's existing dark purchase-action ink and pressed palette. Rendered
  normal-state gradient contrast was approximately 1.47–2.77:1 and is now
  6.45–12.12:1. Hover and pressed computed colors were separately captured;
  browser forced colors resolve to black text/white buttons without the gradient.
  Danger borders and forced-color system handling are retained; shared controls
  elsewhere are unchanged.

This changes copy, wrapping, local contrast and focus delivery. Challenge targets,
eligibility, resets, payouts, receipts and migration choices are unchanged.

## Browser evidence

`scripts/challenge-localization-qa.ts` imports only a synthetic save into a
disposable Chromium profile, keeps its sandbox enabled, uses mock Keychain and
blocks requests outside loopback/data/blob. It exercises the actual interface,
including saved Supply Shortage entry and abandonment, rather than injecting a
completed run or a fake receipt.

The all-locale pass covers all seven translations plus enlarged-English and RTL
pseudo locales: nine cards, descriptions and reward/progress copy, keyboard
confirmation, 360px/130% text, the last action, and zero clipped horizontal text
or document overflow. Actual visible controls have names and measure at least
44×44 CSS pixels. German also covers desktop Interface 80/100/130/150% separately
from text enlargement and 800×360 landscape. German/Russian/Japanese/RTL cover
320px/200% text. German and RTL accessibility trees are captured. Confirmation,
Cancel and the last control are scrolled into view and checked for hit-test
occlusion. Research is captured at the same mobile usable width/text scale.

Task evidence lives under `output/challenge-localization-final/`; supporting
before/fix runs are `output/challenge-localization/`,
`output/challenge-localization-refinements/`, `output/challenge-keyboard-final/`
and `output/challenge-contrast-before/`. The original narrow "top" images in
the first directory captured a scrolled position; the refinement and final
runner explicitly reset every scrolling ancestor before capturing the top.
Exact catalog diff evidence is `output/integration/localization-diff-evidence.json`.
Before/after focus results are `output/integration/challenge-focus-before.json`
and `output/integration/challenge-focus-after.json`.

The final all-locale pass contains 54 check records and 50 captures, with no
runtime exceptions. An additional final French pass contains nine check records
and nine captures, covering the last pressed-palette correction, hover, pressed,
reduced-motion and forced-color emulation. Its evidence is
`output/challenge-action-states-final/`. Computed colors and the alpha-composited
normal-gradient luminance calculation are recorded in
`output/integration/challenge-action-contrast.json`. These contrast results apply
to the tested action states, not every route or operating-system theme. The final
pressed gradient's darkest endpoint is approximately 7.16:1.

## Validation

The full suite passes 2,287/2,287 with no skipped/pending/todo cases. TypeScript,
oxlint, all localization checks, production build, promotion validation and the
production Store boundary pass. The existing large-chunk build warning remains.
The one new test owns the observed focus defect and failed before its production
fix; no admission/receipt helper or production test seam was introduced. The
repository does not provide the test-audit skill's OpenClaw/crabbox wrappers, so
manual changed-code review and direct checks were used. An unused old test import
was removed to keep lint clean.

## Limits

These are browser-emulation results, not native-host acceptance. Native touch,
OS font scaling, screen-reader speech/focus delivery, platform safe areas,
forced-color behavior on supported operating systems and fluent-speaker review
remain unverified. Accessibility-tree names do not prove screen-reader delivery.
No player save, cloud account, native game or production publication was used.
The separate [save-safety audit](ids-rework-beta-save-safety-2026-10-10.md)
documents why native beta launches still require verified isolation.
