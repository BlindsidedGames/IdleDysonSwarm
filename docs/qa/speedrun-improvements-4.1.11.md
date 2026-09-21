# 4.1.11 speedrun QA

Checked on 21 September 2026. Feature remains unmerged and unreleased.

## Implementation boundaries

Personal bests stay inside the existing speedrun checkpoint: at most one result per milestone. Pure helpers compare results, snapshot usage and migrate legacy checkpoints. Cloud preserves these records and imported provenance; shared text/file exports strip records. Import keeps only the recipient's records and marks the current run ineligible. Reset Save preserves records but clears current-run provenance and usage. No run-history database or new persistence service.

## Verified

- Full suite: 1,753 tests passed; subsequently added Statistics UI regression passed. Typecheck, lint, production/native builds, localization, data checks and diff whitespace checks passed.
- Browser, isolated localhost:5190: earned First Infinity, improved its best, confirmed frozen time, reloaded, reset, exported/imported, confirmed imported exclusion and retained best, then reset back to eligibility. Statistics selection survived navigation and reload.
- Desktop and 360px/130% system-text emulation: reviewed current/best cards, Unknown question marks, legend and keyboard-focus tooltips. Keyboard tab switching covered separately by UI regression.
- Browser development-only Test $0 Double IP: ownership/enabling left usage No; actual Infinity reward changed it to Yes in current run, frozen milestone and best. Reset cleared current usage while retaining the flagged best.
- Disposable iOS 18 Simulator: earned First Infinity; current and best both showed 3m26s. Terminated/relaunched the app; best and selected Speedruns tab remained.
- Isolated packaged macOS app: earned First Infinity at 5m39s; quit/reopened through the normal checkpoint path; best and selected tab remained.
- Packaged Steam/macOS startup smoke passed with Steam initialized. This is startup evidence, separate from the macOS interaction test.
- Regression coverage independently verifies Cloud serialization/normalization retention, manual-share exclusion, hostile import claims, migration, reset, ties and purchased Double IP rewards across manual/automatic/Stored Time paths.
- Independent code review found and resolved a Cloud serialization issue, redundant declarations and unnecessary reward computation. Final follow-up review reported no remaining actionable defects.

## Limitations

Android debug APK built and installed in the emulator. Interaction QA remains unverified: the computer-control tool cannot target its window and requested permission to use ADB input/screenshots was not received during this pass. No physical devices, real-money purchases, cross-device Cloud synchronization or Steam Cloud round-trip were tested. Release metadata stays at 4.1.10 pending later release preparation; localized 4.1.11 notes are included.

## Palette follow-up

The initial visual pass accepted insufficient contrast for unused indicators. Corrected after Matthew's review: used icons and result values now share `--statistics-value`; unused icons use the existing secondary text color; unknown icons use the existing soft violet control color and retain `?`. The legend has a separate row demonstrating all three states with the same Bot icon, with localized state labels instead of color names. Inspected the live cards and legend at normal and 360px widths and verified computed used-icon/value colors match. Focused UI regression, typecheck, lint and localization checks passed.
