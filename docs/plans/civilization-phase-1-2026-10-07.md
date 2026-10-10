# Civilization simulations — phase 1

**Superseded, rejected prototype.** The user rejected the independent production/support loop and separate fracture owner described below. The current implementation and verification are in [the consuming opening rewrite](civilization-consuming-opening-2026-10-07.md). This document is retained only as historical evidence.

Implemented in the isolated `codex/ids-gameplay-rework-plan-20261007` checkout after the user approved checkpoint `540d0649`. This is the opening civilization slice, superseding the old Sims placeholder; it does not implement the later civilization ladder.

## Admitted scope

The twelve automatic activities are Gathering → Toolmaking → Hunting; Camp Provisioning → Shelter Building → Hideworking; Fishing → Food Preservation → Seasonal Expeditions; Camp Expansion → Craft Specialization → Exchange Networks. Each activity keeps cycling after downstream activities unlock. The opening completes on the first Exchange Networks cycle and displays a Cultivation & Herding preview. Production continues. Agriculture, universe completion/repetition, challenges, Discovery payouts and the Transcendence energy-routing tree remain deferred.

The existing prototype entry point is retained: Simulations is available from a fresh game. A first-Infinity gate was proposed, not settled. A pending migration decision prevents new civilization progress/rewards behind the developer popup. Both Keep and Fresh start this system from zero; old SM, producers and old Simulation upgrades are not imported.

## Prototype contracts

- Food, Materials and Knowledge are spendable stocks. Installed support and unlocks use persisted lifetime activity completions, so spending stocks never reduces production or relocks an activity.
- Each activity cycle contributes 1% support to its connected activities, capped at 20% per source. Toolmaking supports Hunting, Shelter Building, Fishing and Craft Specialization. Seasonal Expeditions feeds back into Gathering/Hunting and supports Camp Expansion/Craft Specialization. These are fixed connections, not stock-consuming production recipes.
- Each permanent fractured base adds 5% civilization progress speed, additive with installed support. Double Time and the existing bank-funded Offline Boost apply as whole-game speed. Bot Boost does not become an invented civilization multiplier.
- Advancement settles support/unlock boundaries before batching stable-rate cycles. A newly unlocked activity receives only the time after its actual unlock; earlier bars keep advancing. Active play and Stored Time use the same owner. There are no automatic purchases.
- Three finite Catalyst offers use stable persisted IDs: `forager-catalyst-1`, `forager-catalyst-2`, `forager-catalyst-3`. Each credits exactly one Catalyst once. The claim, all stock debits and wallet credit are one commit-first transaction. Failed persistence retains the original stocks, wallet and claim; retry cannot duplicate credit.
- `fractures` is the canonical Catalyst wallet/permanent-base owner. Old challenge fields are backward-compatible import fallbacks/mirrors. New purchases and fractures work with no challenge container or completion history. Preview cache inputs, SP refunds, permanent reconstruction, achievements and save validation use canonical ownership.
- Civilization stocks, progress, claims, Catalyst balance and fractures survive Infinity and main Transcendence. This conservative persistent default introduces no new Sim reset; any later challenge/new-Sim reset policy needs its own decision.
- Away time banks Stored Time without passive civilization production. Cancelled detached Stored Time work is discarded without credit or bank debit. Repeated successful spends charge each admitted interval once.

## Provisional tuning

| Activity | Base cycle | Output | Unlock from preceding activity |
| --- | ---: | --- | ---: |
| Gathering | 30s | 4 Food | Immediately |
| Toolmaking | 60s | 4 Materials | 2 cycles |
| Hunting | 90s | 10 Food | 2 cycles |
| Camp Provisioning | 120s | 2 Knowledge | 2 cycles |
| Shelter Building | 180s | 6 Materials | 1 cycle |
| Hideworking | 240s | 2 Knowledge | 1 cycle |
| Fishing | 300s | 12 Food | 1 cycle |
| Food Preservation | 420s | 18 Food | 2 cycles |
| Seasonal Expeditions | 600s | 6 Knowledge | 2 cycles |
| Camp Expansion | 900s | 18 Materials | 2 cycles |
| Craft Specialization | 1200s | 10 Knowledge | 2 cycles |
| Exchange Networks | 1800s | 30 Materials | 2 cycles |

| Catalyst offer | Milestone | Food / Materials / Knowledge |
| --- | --- | --- |
| 1 | Camp Provisioning: 1 cycle | 100 / 40 / 6 |
| 2 | Fishing: 2 cycles | 300 / 180 / 24 |
| 3 | Exchange Networks: 1 cycle | 1000 / 600 / 80 |

An unboosted, unfractured first run can afford offer 1 at 640 gameplay seconds (10m 40s), during Hideworking. No Catalyst/fracture gate blocks Camp Provisioning. Exchange Networks unlocks at roughly 6466s and completes at roughly 7963s (2h 13m). These are measured prototype values for the opening slice, not approval of a complete-era day target or later-era balance. Central tuning and connection data live in `src/simulation/civilization.ts`; no old proposed Catalyst total is imported.

## Verification

The focused final run passes 291 tests across 15 files, including production application/UI purchase → fracture → durable reload for first-run, Keep and Fresh saves; confirmation cancellation/double clicks; failed commit/retry; challenge-free canonical ownership; exact stocks; all finite offers; Infinity/Transcendence retention; large/small interval parity; interrupted and repeated Stored Time; and offline banking. TypeScript and oxlint pass. All seven translations have 2438 keys; all ten catalogs compile. Generated game data and promotion checks pass; production build/store boundary pass with the existing chunk-size warning.

The final aggregate run has 209 files: **2152/2245 tests pass, with the identical 93 baseline failures across 16 files, zero new failures, and zero skipped/pending tests**. The new Catalyst command has an exhaustive routable example. Baseline comparison uses checkpoint `540d0649`; the three playable-civilization production UI cases demonstrably fail there because Gathering has no progress bar and pass here. The prior fixture files were not regenerated and the obsolete-layer failures were not weakened or skipped. Machine-readable results are `/tmp/ids-civilization-full-suite-final.json`, `/tmp/ids-pre-civilization-regressions.json`, and the parent task's updated `legacy-failure-classification.json`.

Actual browser QA uses a freshly created disposable Chromium profile, verified before navigation, `--use-mock-keychain`, loopback-only requests and synthetic/checked-in inputs. No account/cloud ports or real save roots are accessed. The final run has 23 captures, zero runtime exceptions, four blocked external requests and no horizontal overflow at 360px/130% text. The screenshot/evidence folder is the parent task's `screenshots-civilization/`; it covers desktop, tablet, narrow Catalyst confirmation, German copy, expanded details, last reachable panel, finite purchases, fracture/reload, bank-funded boost pause, both preserved Transcendence/Avocato surfaces and a real isolated Transcendence reset.

Seventeen selected review PNGs are saved to ChatGPT Library, with all returned metadata applied to the original files. `screenshots-civilization/library-manifest.json` records their confirmed IDs. The prepared-upload endpoint was unavailable before any transfer; the supported ordered batch-create fallback succeeded. Parent pixel review remains required before user delivery. Native hosts remain unverified.

No push, merge, release, native-host launch or external post is authorized. Main, unrelated worktrees and the six original stashes remain untouched.
