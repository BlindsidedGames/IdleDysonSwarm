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

The initial visual pass accepted insufficient contrast for unused indicators. Final presentation after Matthew's review: used bonuses share the cyan statistics-value color; unused and unknown icons are grey; used Debug is muted red because it disqualifies the run. Unknown retains a white question mark centered vertically over the right edge without changing layout width. The legend shows Used, Not used and Debug used; it omits Unknown and the eligibility explanation. Times sit beside Current run/Personal best labels, and the In progress text is omitted. Inspected live cards and legend; focused UI regression, typecheck and lint passed.

## Unboosted priority and selective clearing

Confirmed-unboosted results now take priority over assisted or historically unknown results; within the same class, faster wins and ties retain the existing result. Each milestone has a bottom-right clear control with a localized confirmation. It clears only that best, retaining the current milestone and other bests. Confirmation waits for a checkpoint; failed persistence leaves the dialog available for retry.

Interactive browser QA: a real Infinity reward at 3m29s replaced a fixture's 1s boosted best with an Unboosted best. Cancel and Escape retained records. Confirming cleared only First Infinity, preserved its frozen 3m29s current result, and an immediate reload kept it cleared while retaining the Quantum best. Desktop and 360px dialog layouts inspected. This pass caught and fixed missing command-family registration and an immediate-reload autosave race. These incremental controls were not re-tested in native hosts.

Validation: 1,757 tests passed, typecheck, lint, production build, localization and whitespace checks passed. Independent follow-up review performed for selection, clearing and persistence integration.
