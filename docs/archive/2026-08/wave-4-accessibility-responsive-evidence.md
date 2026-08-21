# Wave 4 accessibility and responsive evidence

Status: accepted focused executable and rendered-browser evidence for the Bots
design baseline. Deferred release certification is listed separately below.

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
- the 320 CSS-pixel compact, 844x390 compact-landscape, 768 CSS-pixel
  medium, 1023 CSS-pixel compact-boundary, 1024 CSS-pixel rail-boundary and
  1440 CSS-pixel wide layout contracts;
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
| Keyboard and focus order | Full-slice tests preserve the skip link, native resource detail controls, Tinker and purchase actions. Collapsed Info exposes the canonical goal; its button reveals the remaining facts. Purchase settings and Bot Distribution use native buttons, checkbox and range input with explicit accessible names and state. |
| Full-slice semantics | Axe scans English Fresh, expanded-LTR Assembly, and mirrored-RTL later progression. Color contrast remains in semantic-token and real-browser checks because jsdom has no computed paint; the duplicate responsive navigation landmarks are checked by their mutually exclusive CSS contract. |
| Responsive bands | `DysonGameplayShell.test.tsx` locks the compact default, compact-landscape override, 1024px persistent-rail transition, bounded inline sizing, and the sub-360px stacked facility action. |
| 200% zoom/reflow proxy | The compact CSS proxy requires one bounded content column, vertical scrolling, logical sizing, and no fixed pixel minimum inline width. A real browser is still required for rendered zoom acceptance. |
| Reduced motion | Tinker and facility progress consume a shared live media-query hook. Under `prefers-reduced-motion: reduce`, they paint the authoritative progress value and schedule no presentation animation frame. |
| Forced colors and focus | Shell navigation, Tinker, and facility surfaces retain forced-color adjustments and explicit focus-visible outlines. The compact drawer and facility dialog enter focus, trap Tab/Shift+Tab, close on Escape and restore focus. |

## Reproduction

From `Web/`:

```powershell
npx vitest run src/ui/gameplay/dyson/ReadyDysonSlice.test.tsx src/ui/gameplay/tinker/TinkerSurface.test.tsx src/ui/gameplay/facilities/BasicFacilityRegion.test.tsx src/ui/gameplay/shell/DysonGameplayShell.test.tsx
npm run lint
npm run build
```

The accepted evidence records the exact focused results below:

- Coordinator integration suite: 116 passed across 11 files. This includes the
  full English/expanded-LTR/mirrored-RTL slice, Tinker, facilities and Details
  dialog, responsive shell, startup/manual-text recovery, production
  IndexedDB reconstruction and writer fencing, localization, CSP, packaging
  and bundle-policy checks.
- A stale full-slice facility fixture and a closed-drawer navigation assertion
  failed during coordinator review. They were corrected and the complete
  116-test integration set was rerun successfully.
- Lint and diff validation: passed with no diagnostics.
- Localization extraction and English/expanded-LTR/mirrored-RTL catalog
  compilation: passed.
- TypeScript and production build: passed. The deterministic report measured
  208.41 KiB gzip boot JavaScript (reported as a provisional warning),
  213.35 KiB gzip JavaScript after the fresh Bots facility chunk, 7.45 KiB
  gzip CSS, 3.86 KiB gzip English catalog and 230.21 KiB transferred
  source-locale fonts. Enforced CSS, locale, font, production-fixture and
  commit-probe checks passed.
- Rendered in the open Chromium in-app browser at 320x568, 390x844, 844x390,
  768x1024, 1023x768, 1024x768 and 1440x900 CSS pixels. Every measured viewport
  had zero document-level horizontal overflow. Bottom navigation remained
  active through 1023 pixels; the persistent 352-pixel side rail began at
  1024 pixels.
- At 390x844, opening the menu moved focus to Close, made the game content
  inert, and Escape restored focus to Open menu. The fresh route retained the
  resource header, compact swarm, always-visible next-tier teaser,
  bottom-anchored Tinker, collapsed goal-only Info, one production line and
  complete Bot Distribution control.

## Limits and remaining release evidence

This checkpoint does not claim exact browser zoom/text-resize certification,
Windows forced-colors visual certification, physical-device touch/lifecycle
certification, or named assistive-technology results such as NVDA and
VoiceOver. The production IndexedDB proof uses the deterministic IndexedDB API
harness with the real production composition; physical browser-profile,
quota/update and crashed-owner matrices remain host/release work.

Those deferrals supplement this evidence rather than replacing it. They are not
relabeled as passing and do not weaken the deterministic command, persistence,
focus, reflow, reduced-motion, localization or packaging checks accepted for
the Bots design baseline.
