# Wave 4 accessibility and responsive evidence

Status: focused executable and rendered-browser evidence for the current Bots
design baseline.

This document records deterministic checks added in the Wave 4
accessibility/responsive stream. It does not change gameplay, copy, visibility,
layout, or interaction parity. The checks exercise the published gameplay UI
and its existing CSS contracts.

## Scope

The evidence covers:

- English Fresh, expanded LTR `en-XA`, and mirrored RTL `ar-XB` full-slice
  rendering;
- canonical resource and facility source order under RTL;
- keyboard focus and native semantics across resources, Tinker, facilities,
  Info, purchase settings and Bot Distribution;
- full-slice axe scans for Fresh, Assembly-revealed, and later-progression
  states;
- the 320 CSS-pixel compact, compact-landscape, 600 CSS-pixel medium, and
  1024 CSS-pixel wide layout contracts;
- a deterministic 200% zoom/reflow proxy based on the compact single-column,
  bounded-inline-size, wrapping, and vertical-scroll contracts; and
- reduced-motion and forced-colors routing through the gameplay surfaces.

The test fixtures supply immutable frontend snapshots and an injected player
dispatcher. They do not invoke the simulation, advance active time, infer an
unlock, or reproduce a gameplay rule.

## Executable evidence

| Requirement | Evidence |
| --- | --- |
| Expanded pseudo-locale | `ReadyDysonSlice.test.tsx` renders the complete Assembly-revealed slice with the compiled `en-XA` catalog and proves expanded localized output under `dir="ltr"`. |
| Mirrored RTL | `ReadyDysonSlice.test.tsx` renders the later-progression slice with the compiled `ar-XB` catalog, proves `dir="rtl"`, and preserves the canonical Cash/Total Bots/Science and Assembly Lines/AI Managers DOM order. |
| Keyboard and focus order | Full-slice tests preserve the skip link, native resource detail controls, Tinker and purchase actions. Info, purchase settings and Bot Distribution use native buttons, checkbox and range input with explicit accessible names and state. |
| Full-slice semantics | Axe scans English Fresh, expanded-LTR Assembly, and mirrored-RTL later progression. Color contrast remains in semantic-token and real-browser checks because jsdom has no computed paint; the duplicate responsive navigation landmarks are checked by their mutually exclusive CSS contract. |
| Responsive bands | `DysonGameplayShell.test.tsx` locks the compact default, compact-landscape override, 600px rail transition, 1024px wide stage, bounded inline sizing, and the sub-360px stacked facility action. |
| 200% zoom/reflow proxy | The compact CSS proxy requires one bounded content column, vertical scrolling, logical sizing, and no fixed pixel minimum inline width. A real browser is still required for rendered zoom acceptance. |
| Reduced motion | The token contract reduces both motion durations to zero while Tinker transitions consume those duration tokens. |
| Forced colors and focus | Shell navigation, Tinker, and facility surfaces retain forced-color adjustments; navigation and Tinker retain explicit three-pixel focus outlines. |

## Reproduction

From `Web/`:

```powershell
npx vitest run src/ui/gameplay/dyson/ReadyDysonSlice.test.tsx src/ui/gameplay/tinker/TinkerSurface.test.tsx src/ui/gameplay/facilities/BasicFacilityRegion.test.tsx src/ui/gameplay/shell/DysonGameplayShell.test.tsx
npm run lint
npm run build
```

The committed evidence records the exact focused results below:

- Focused tests: 57 passed across 4 files.
- Lint: passed with no diagnostics.
- Localization extraction and English/expanded-LTR/mirrored-RTL catalog
  compilation: passed.
- TypeScript and production build: passed. The build measured 208.39 KiB gzip
  JavaScript and 6.96 KiB gzip CSS; the JavaScript measurement is reported
  against the provisional target, not relabeled as a performance pass.
- Rendered in the open in-app browser at its 1280x720 default and a temporary
  390x844 compact viewport. The compact view preserved the bottom navigation,
  resource header, small swarm, bottom-anchored Tinker panel, Info, single
  production line and complete distribution control without visible horizontal
  overflow. The purchase-settings disclosure was also rendered at 390x844.

## Limits and remaining release evidence

These deterministic tests intentionally do not claim browser layout geometry
from jsdom. Wave 4 still requires real-browser checks for:

- horizontal overflow at 320 CSS pixels and at 200% zoom;
- computed focus visibility, contrast, reduced motion, and Windows forced
  colors;
- compact-landscape, medium, and wide screenshots;
- keyboard-only completion in a production build; and
- NVDA on Windows plus VoiceOver on iOS.

Those checks supplement this evidence rather than replacing it. The complete
browser/device and named assistive-technology matrix remains a release gate; it
is not claimed by this Bots visual checkpoint and is not replaced by unit
tests.
