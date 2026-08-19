# Web performance baseline: 2026-08-19

Status: post-icon-conversion diagnostic baseline, not acceptance evidence

Captured: 2026-08-19 15:59 AEST

Purpose: preserve the exact save, environment and runtime-lane measurements to
compare against the frontend projection and Skills work in
`docs/web-release-readiness-plan-2026-08-19.md`.

## Source identity

| Property | Value |
| --- | --- |
| Git HEAD | `79605fe3aaeaabb006027c91d1d69247161e193d` |
| Working-tree source fingerprint | `6a97e1878586805ea6fd43a48ce436298401e4be829b7733a6260ddc64598d34` |
| Fingerprint scope | 628 files under `Web/src`, `Web/scripts`, package manifests and TypeScript/Vite configuration |
| Build | Instrumented Vite production/performance build |
| Command | `npm run report:performance:lanes:focused` |
| Raw report | `Web/output/performance/lane-attribution-sublanes.json` (ignored diagnostic output) |

The working tree contains reviewed-but-uncommitted UI and asset changes. The
fingerprint records their content for this diagnostic baseline; the first plan
phase must create the immutable checkpoint used for later release evidence.

## Save identity

| Property | Value |
| --- | --- |
| Repository path | `Documentation/SaveBackups/MainSave.txt` |
| SHA-256 | `10e2e48cd989618918118e16d0900af7d80f0f5dfb1aad475423ac165ab00c78` |
| Source schema | 8 |
| Prepared target schema | 12 |
| Decoded bytes | 25,095 |
| Numeric repairs | 0 |
| Production validation | valid |

The save is an advanced Dyson fixture with one Infinity Point. It is suitable
for comparing Bots, Skills and Settings work, but it is not a mature Reality,
Simulations or Quantum fixture. Later stage measurements require the valid
fixtures defined in Phase 8; they must not replace this save for direct
before-and-after comparisons.

## Environment

| Property | Value |
| --- | --- |
| Operating system | Windows NT 10.0.26200.0 x64 |
| Browser | Google Chrome 151.0.7922.138, isolated headless profiles |
| Node | 24.11.1 |
| npm | 11.6.2 |
| Desktop profile | 1440 by 900 CSS pixels, device scale factor 1 |
| Mobile Web profile | 390 by 844 CSS pixels, device scale factor 2 |
| CPU throttle | 4x |
| Measurement window | 5,000 ms per route |
| Trials | one diagnostic trial per route/profile |

Android and iOS are deliberately excluded. The mobile profile is a Web browser
viewport, not native-device evidence.

## Baseline measurements

All lane values are median milliseconds per observed canonical update. React
P95 is included separately. Busy share is Chrome `TaskDuration` divided by the
five-second measurement window.

| Profile | State / route | Canonical | Event model | Projection | Route preview | Publication | React median | React P95 | Busy share |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | Fresh Bots | 15.4 | 10.8 | 2.5 | 0.2 | 0.0 | 5.7 | 7.2 | 8.1% |
| Desktop | Advanced Bots | 15.1 | 8.0 | 3.2 | 0.5 | 0.1 | 12.5 | 14.4 | 49.5% |
| Desktop | Advanced Skills | 18.6 | 12.6 | 5.1 | 2.4 | 0.1 | 10.9 | 12.5 | 18.6% |
| Desktop | Advanced Settings | 21.1 | 15.3 | 2.7 | 0.0 | 0.0 | 4.3 | 5.5 | 13.1% |
| Mobile Web | Fresh Bots | 17.1 | 11.4 | 2.9 | 0.2 | 0.1 | 6.5 | 7.4 | 9.3% |
| Mobile Web | Advanced Bots | 14.6 | 8.4 | 3.5 | 0.5 | 0.1 | 13.1 | 15.0 | 51.9% |
| Mobile Web | Advanced Skills | 18.1 | 12.3 | 5.2 | 2.4 | 0.1 | 10.6 | 11.8 | 17.8% |
| Mobile Web | Advanced Settings | 20.1 | 14.2 | 2.8 | 0.0 | 0.1 | 4.6 | 5.2 | 14.0% |

No greater-than-50-ms long task was observed in these focused five-second
windows.

## Interpretation and comparison rules

- Snapshot publication remains negligible. Compare frontend projection and
  React timings after presentation slicing.
- Skills route preview adds about 2.4 ms per update in this baseline.
- Skills React median is about 10.6 to 10.9 ms per observed update.
- Advanced Bots keeps an active visualization cadence, while static routes can
  be timer-throttled by headless Chrome. Per-update medians are more reliable
  than comparing route busy percentages directly.
- A single five-second trial is diagnostic, not statistically sufficient for a
  release claim.

For a direct reprofile, keep the save path and SHA-256, browser profiles, CPU
throttle, measurement duration and command unchanged. Compare lane medians and
P95 values first. Run repeated acceptance-oriented trials only after the
implementation stabilizes.

## Asset state included in this baseline

- 104 deterministic transparent skill WebPs at 256 by 256 pixels.
- Total WebP bytes: 665,170.
- Unity skill PNG sources: about 6.33 MB and retained outside the Web asset
  output as authoritative exporter inputs.
- Avotation meditation WebP: 92,238 bytes.
