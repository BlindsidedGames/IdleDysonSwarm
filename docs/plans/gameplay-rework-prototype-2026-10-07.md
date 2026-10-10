# IDS first stripping prototype — 7 October 2026

Current integration status: Matthew authorized local main integration on 10 October. See [combined beta readiness](../audits/ids-rework-beta-readiness-2026-10-10.md) for the final scope and remaining blockers. The checkpoint history below is preserved; its earlier no-merge statements describe those earlier runs.

This implements the user-authorized first cut after review of [the stripping plan](gameplay-rework-2026-10-07.md). Baseline is `main` at `bdd95551912f8524c5abd02f52417fe9b9f7b799`; branch is `codex/ids-gameplay-rework-plan-20261007`. This is a local prototype for trying the reduced game and reviewing its appearance.

The current [consuming civilization opening](civilization-consuming-opening-2026-10-07.md) replaces the Sims placeholder with twelve connected recipes, automatic crews, retained workers/housing/equipment and three finite resource-funded Catalyst offers using the existing wallet and skill-tree flow. It supersedes the rejected independent-output phase-one prototype. The verification numbers below record the earlier stripping/Avocato checkpoint; the consuming-opening document records current verification and screenshots.

The user's subsequent UI rejection is addressed by [the compact progress-row revision](civilization-ui-revision-2026-10-08.md). It changes presentation and optional disclosures, with no economy changes.

## Implemented

- Quantum currency/reset/Entanglement, Reality, the old Sim producer/disaster loop and Avocato feeds are disconnected from player commands, automatic processing and navigation. Compatibility definitions and save fields remain readable; retained perk flags back the moved effects.
- Fifteen useful Quantum benefits and Double Time are purchasable with IP below the regular Infinity upgrades. Costs are provisional: 3–40 IP, with Division starting at 5 and doubling. Spending debits available IP without reducing its earned production multiplier. Purchased entitlements remain separate.
- Redundant Permanent Automation and Permanent Secrets purchases are removed. Ordinary Automate Research/Bots and Secrets already survive Infinity and are cleared by Transcendence. Keep folds old Automation into both ordinary unlocks and keeps the greater ordinary/permanent Secret count. Fresh preserves existing ordinary unlocks and Secret count. Retired backing flags are cleared in both choices. Double Time purchase or removal invalidates previous rate calibration and automatic throughput samples.
- Transcendence contains Discovery progress bars and their expandable details. The restored Avocato tab sits directly beneath it and unlocks at the same time, without a Quantum purchase gate. Avocato contains the TP balance, confirmed Transcendence reset, Discovery/tier unlocks and permanent upgrades, using its established portrait/store layout without feeding tracks or added flavour text. Reset placement follows the original Avocato layout; its reward and reset rules are unchanged. During this prototype the tab can be reached after first Infinity; civilization-completion reveal is deferred with the civilization system.
- Old challenge entry is disabled and earned history is preserved. Challenge prerequisites no longer prevent spending a saved Catalyst on a fracture. Phase 1 adds finite Catalyst acquisition from civilization resources without requiring challenge history.
- Civilization Sims now runs the twelve-recipe forager opening. Jobs consume and reserve their inputs, retained workers receive automatic assignments, housing supports recruitment, and tools/clothing equip workers. Existing fractured base IDs provide one additive global Sim speed bonus. Current entry remains available from a fresh game. See the consuming-opening document for provisional tuning and persistence contracts.
- Legacy saves receive a one-time developer popup titled “Hey guys, Dev here”, with exactly two direct Keep/Fresh choices. It initially focuses the dialog, traps keyboard focus, makes the game inert, and ignores Escape/backdrop clicks. The choice is commit-first and persists through reload/import. Both retain base production, IP, TP, Discovery, purchased entitlements and earned history. Keep retains equivalent perks and fractures. Fresh clears relocated perks and former fractured ownership without refunding its already-free SP; invalid augments and affected paid descendants are unassigned/refunded. Unrelated ordinary allocations survive. Inferred legacy Quantum completion is stamped before retiring QP, retaining the earned Assembly Line starter through the next Infinity.
- The old Reality/Avotation sources stop supplying their 20 SP on normal resets. Existing unrelated allocations are preserved by migration. The replacement challenge reward distribution remains undecided.
- Wiki, live statistics and debug shortcuts no longer guide players into the removed layers. New copy and changed retained guidance are present in all seven translation catalogs, English and both pseudo-locales.

## Verification

- Initial full legacy run: 206 files, 2,027/2,214 tests passed and 187 failed. It exposed real save-recovery migration marker leakage, ownership identity/performance loss, and missing Double Time rate invalidation. Those owners are repaired; applicable historical fixtures/tests were adapted without changing frozen source artifacts.
- Corrected full run: 206 files, 2,123/2,218 tests passed and 95 failed. Two failures came from the new developer popup in an unrelated Stored Time test fixture. That fixture now explicitly represents a migrated player; the subsequent Stored Time/migration run passes 23/23. Pre-restoration full rerun: 2,125/2,218 tests pass. Final Avocato restoration rerun: **2,131/2,224 tests pass; the identical 93 deliberately obsolete expectations fail across 16 of 207 files; zero tests are skipped/pending.** All remaining failures are classified in the taskroot `legacy-failure-classification.json`.
- Migration owner tests pass 17/17, covering idempotent save/reload, Keep/Fresh, free-fracture SP safety, automation/Secrets consolidation and Infinity versus Transcendence persistence, Double Time measurement invalidation, and unchanged purchases/IP/TP/Discovery. The four newly expanded regression cases demonstrably fail on the prior local checkpoint for the intended reason and pass on the corrected owner.
- Historical V2 checkpoint recovery, first-run parity, frontend fractures/cache/reload, browser-save Division purchase/reload, portable feedback settings, held Patient Hands interaction and sparse-research reset suites pass in the corrected focused run. The mixed router/event-time suites retain three/eight deliberate old-layer failures.
- All nine byte-identical checked-in progression fixtures start and advance 1,000ms through the production factory with valid canonical state and frozen retired layers. Manifest content hashes and original file bytes match. Old hydrated fingerprints and retired route expectations remain explicitly obsolete; immutable fixtures were not regenerated.
- TypeScript, oxlint, `git diff --check`, bundled-promotion verification, production Vite build and production-store boundary verification pass. The existing large-chunk build warning remains. All seven complete translation catalogs have 2,398 keys and all ten catalogs compile; pre-existing glossary review counts remain.
- Twenty-two actual corrected Mac test-Chromium screenshots cover desktop and 360×800 at 130% text, restored Avocato/navigation, expanded/collapsed cards, reset confirmation, final controls and German copy. Eleven review PNGs are saved to Library. Popup has exactly two choices, correct initial focus/inert behavior, no Escape/backdrop dismissal and no repeat after accepted choice/reload. No runtime exceptions or horizontal overflow. Independent semantic and actual visual review reports no material issues. Parent review of the actual images remains required before user delivery.
- The original `main` Sims UI is preserved as collapsed and expanded reference screenshots from a temporary archive at the exact baseline commit. It is not the placeholder's design substitute.
- Browsers use fresh disposable profiles and `--use-mock-keychain`, with isolation checked before opening the game and all non-loopback requests blocked. Checked-in and synthetic saves only; no real player/account data. Test profiles and loopback servers close afterwards. Electron/mobile hosts remain unverified.

The final Avocato restoration focused run passes 70 checks, including actual rendered route order/admission for both migration choices and existing Discovery, store purchase/save/reopen, reset confirmation/cancellation/retry, and unchanged Discovery/migration semantics. Four new route cases demonstrably fail on the prior checkpoint because Avocato is absent, and pass after restoration.

Remaining failures are deliberately reported rather than skipped: old challenge entry/restrictions/rewards; Quantum purchase/reset/bonus routes; old Reality/Dream processing and artifact points; old route visibility; old Sims UI; old hydrated performance-fixture fingerprints. Their deliberate retirement/compatibility test audit remains follow-on work. This prototype does **not** claim a fully green legacy suite.

## Provisional Infinity prices

Regular purchases remain first: Secrets 1 IP (maximum 27), permanent SP 1 IP (maximum 10), Automate Research/Bots 3 IP each, and each of five retained facility starters 1 IP.

| Advanced purchase | IP cost |
| --- | ---: |
| Double IP, Bot Multitasking, Fragments, Cash Booster, Science/Discovery Booster | 3 each |
| Break the Loop | 10 |
| Division | 5 × 2^purchased, maximum 19 purchases |
| Purity / Terra / Power / Paragade / Stellar | 5 / 8 / 12 / 16 / 20 |
| Matrioshka Brains / Birch Planets / Galactic Brains | 15 / 25 / 40 |
| Double Time | 20 |

Bot Multitasking is hidden after Discovery unlocks. Science Booster is labelled Discovery Booster then, with the Discovery speed effect displayed. Existing upgrade prerequisites/maxima remain in force; costs are provisional balancing assumptions.

## Try the prototype

From this isolated checkout, run `npm run dev -- --host 127.0.0.1 --port 5197 --strictPort` and visit `http://127.0.0.1:5197/play/` in a disposable browser profile. Use a copied/exported save only after retaining the original. Browser saves are scoped to this local origin and profile; do not point a native host at real save roots for this review.

Dependencies and `dist/` are available in this worktree. The working browser screenshots and machine-readable QA evidence are saved in the parent task's `screenshots-avocato/` directory; user-facing PNGs are also saved to ChatGPT Library.

## Deferred

Later civilization eras, full 104-base retargeting, completion-gated Transcendence, later automatic Sims, challenge rules/SP design, replacement achievement goals and obsolete speedrun retirement remain follow-on design and implementation work. Phase 1 starts fresh for both migration choices; old SM/upgrades are not imported into it. Offline time continues to bank Stored Time. This prototype does not select direct passive offline civilization advancement or introduce an extra migration reset.

No push, merge, deployment, Steam upload, mobile update or external post was performed. The primary checkout and all six existing stashes remain unchanged.
