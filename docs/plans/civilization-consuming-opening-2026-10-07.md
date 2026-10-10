# Consuming civilization opening — 7 October 2026

Historical revision: superseded by [focus and automatic milestones](civilization-focus-and-milestones-2026-10-08.md). The purchase and manual crew descriptions below record the earlier prototype.

The user rejected this checkpoint's presentation. The current [focused UI revision](civilization-ui-revision-2026-10-08.md) replaces its large header and repetitive activity cards while preserving all mechanics below. Earlier screenshot readability/overflow checks did not establish product acceptance.

This local rewrite replaces the rejected independent-output/support prototype at `024c3026f5f4505e6c1770a1254cd2cc45a2eef8`. It is implemented in the isolated `codex/ids-gameplay-rework-plan-20261007` checkout. The opening now uses connected recipes, retained workers and housing, optional equipment and automatic crews. Agriculture, later eras, robotics and the Transcendence energy-routing tree remain deferred.

## Production and automatic play

A fresh opening has three workers, six housing places and zero stocks. Family Gathering runs without inputs or an assigned worker, allowing recovery from depleted stocks. Each other activity needs an assigned crew and all recipe inputs. A funded cycle deducts its complete inputs exactly once at admission; an unfunded cycle waits. Outputs of simultaneous completions settle before new cycles are admitted in displayed order, so competing jobs cannot spend the same stock. Already-paid work pauses when its crew is removed and resumes from the same saved progress without charging again.

Crews are assigned automatically as activities unlock. Toolmaking, Hunting, recruitment and Shelter Building receive one worker first; Gathering then receives up to two additional workers, Toolmaking up to three additional workers, and each later activity one worker as population permits. This keeps the food/material/tool/housing backbone working and reaches all twelve activities without manual action. Surplus workers remain retained and available. The optional minus/plus controls make a job's assignment manual; Restore Auto returns it to the default plan. An assigned worker cannot perform two jobs.

Camp Provisioning consumes food to recruit one retained worker, subject to housing. Each shelter provides two housing places and each camp eight. Camp Expansion converts three shelters to one camp: the six places from its paid shelters remain available while conversion is unfinished, then the camp supplies eight. Conversion never temporarily removes occupied housing.

Equipping one worker consumes two tools and one clothing. Equipped workers remain equipped, with one useful set per worker. Gathering, Hunting and Fishing receive a speed multiplier of `1 + equipped / population`; resources themselves never provide a stockpile speed boost. Construction and conversions consume food, materials, tools, shelters, hides, clothing and provisions. There is no arbitrary economic storage cap. Existing Int64 representability guards hold an unfinished paid job at the numeric boundary rather than overflowing its output.

## Provisional recipes

Durations are base work seconds, divided by assigned labor and applicable speed bonuses. Gathering also has one unit of family labor. Each activity unlocks after the previous activity's first completion, except Toolmaking requires two Gathering completions and Seasonal Expeditions requires two Food Preservation completions.

| Activity | Base work | Inputs per cycle | Output per cycle |
| --- | ---: | --- | --- |
| Gathering | 20s | None | 4 Food, 2 Materials |
| Toolmaking | 40s | 2 Food, 2 Materials | 1 Tool |
| Hunting | 60s | 1 Food, 1 Tool | 10 Food, 2 Hides |
| Camp Provisioning | 90s | 8 Food | 1 retained worker |
| Shelter Building | 120s | 6 Food, 6 Materials, 2 Tools | 1 Shelter |
| Hideworking | 80s | 2 Food, 3 Hides, 1 Tool | 1 Clothing |
| Fishing | 60s | 1 Food, 1 Tool | 8 Food |
| Food Preservation | 70s | 6 Food | 1 Provision |
| Seasonal Expeditions | 180s | 2 Provisions, 1 Clothing, 2 Tools | 12 Materials, 6 Hides |
| Camp Expansion | 240s | 12 Food, 8 Materials, 3 Shelters, 3 Tools | 1 Camp |
| Craft Specialization | 100s | 1 Provision, 4 Materials | 3 Tools |
| Exchange Networks | 180s | 10 Food, 2 Hides, 1 Clothing | 3 Provisions, 1 Tool |

Measured one-second ticks from a fresh game, with default crews, no equipment, no fractures, no Double Time, no Stored Time and no purchases: the first Catalyst is affordable at 590 gameplay seconds; Exchange Networks unlocks at 1,584s and first completes at 1,764s (29m 24s). After 9,000s the automatic economy holds 3,028 Food, 514 Materials, 427 Tools, 158 Hides, 17 Clothing, 74 Provisions, zero unreserved Shelters, 23 Camps and 100 Workers. At 86,400s it holds 28,428 Food, 4,728 Materials, 4,577 Tools, 1,557 Hides, 124 Clothing, 836 Provisions, zero unreserved Shelters, 238 Camps and 960 Workers. These measured opening values are provisional, not a complete rich-era/day target.

## Existing Catalysts and fractures

The existing `challenges.galvanizers` wallet and `challenges.galvanizedSkillIds` permanent ownership remain authoritative. There is no new fracture owner, counter, onboarding or choose-a-base CTA. The existing skill-tree detail/confirmation flow spends Catalysts and retains its SP-refund and permanent reconstruction rules. A uniform line explains that each actual fractured base contributes five percent overall Sim speed. The speed multiplier is `1 + 0.05 × fractured base count`, applied equally to all civilization jobs; ordinary owned skills and lifetime activity completions add no such bonus.

Three finite offers preserve their existing claim IDs and each credit one Catalyst through a single commit-first stock/claim/wallet transaction. Confirmation cancellation and failed saves credit nothing; retries and double clicks cannot duplicate the claim.

| Offer | Required milestone | Price |
| --- | --- | --- |
| `forager-catalyst-1` | Camp Provisioning: 1 completion | 20 Food, 3 Tools |
| `forager-catalyst-2` | Fishing: 2 completions | 3 Provisions, 2 Clothing, 4 Tools |
| `forager-catalyst-3` | Exchange Networks: 1 completion | 6 Provisions, 4 Clothing, 6 Tools |

## Persistence and retained screens

Civilization save version 2 includes paid-active state, work progress, crew and automatic/manual preference, all stocks, population, equipment and finite claims. Commands changing crews, equipment and Catalyst purchases are commit-first; failed persistence restores the unchanged visible and durable state. Stocks, paid work, equipment, housing and the existing Catalyst/fracture state survive Infinity and main Transcendence.

The rejected local prototype's Food/Materials, completions and claim IDs are retained on import. Its unused Knowledge is archived as `legacyKnowledge`; unpaid timers restart and its standalone fracture fields import into the existing wallet/ownership, then disappear from subsequent saves. Old SM/producers/upgrades do not become new worker or equipment capacity. Both Keep and Fresh migrations begin the new civilization system normally; pending migration prevents advance/actions behind the developer popup.

Active play and Stored Time use the existing event-time owner. Away time banks Stored Time rather than producing civilization resources passively. Cancelled detached work is discarded; successful repeated spends debit admitted time once. Existing whole-game Double Time/Offline Boost continue applying through that owner.

The purple information palette, compact progress bars, expandable recipe/details, original neighboring Sims density, Avocato portrait/store and deferred Transcendence progress surface are retained. Waiting text identifies missing inputs, workers or housing. Optional worker controls use the established light button gradient. Cultivation & Herding is a later-phase preview after the first Exchange Networks completion; current jobs continue running.

## Verification and review artifacts

- Focused production/domain/save run: **295/295 tests across 15 files**. Final UI/domain rerun after visual corrections: **25/25**. Coverage includes shortages, bootstrap recovery, competing inputs, automatic play, recruitment/housing conversion, equipment sinks, pause/reload/resume, failed commits, finite claims, existing skill-tree fractures, migration, Infinity/Transcendence, large/small tick equivalence and interrupted/repeated Stored Time.
- Final aggregate: **2,156/2,249 tests pass across 209 files; the identical 93 baseline failures remain across 16 files, zero new failures and zero skipped/pending tests**. Failures retain the earlier retired-layer classifications. The five selected new regressions fail against the rejected checkpoint for intended behavior: three extra-CTA cases, absent equipment and absent paid input reservation. The 20 unselected tests in that filtered proof are not skipped in the aggregate.
- TypeScript, oxlint, `git diff --check`, generated game-data check, promotions check, production build and store boundary pass. All seven translations have 2,461 keys, all ten catalogs compile, and existing glossary review counts remain. The existing build chunk-size warning remains.
- Actual browser review: **29 refreshed PNGs, zero runtime exceptions, five external requests blocked**, desktop, tablet, 360×800 at 130% text, German, shortages/recovery, reserved paid work, optional controls, equipment/Catalyst confirmations and reload, existing fracture flow/global bonus, bank-funded boost, preserved Avocato/Transcendence and an actual isolated Transcendence reset. No horizontal overflow; final controls clear the bottom navigation.
- Browser isolation was verified before navigation: new disposable profile, initial `about:blank`, absent IndexedDB, `--use-mock-keychain`, loopback-only requests, checked-in/synthetic saves and no real account/cloud/save ports. The test profile and loopback server close afterward. Native hosts remain unverified.

The parent task's `evidence-consumption/` contains the final test results, logs, regression proof and pacing measurements. `screenshots-consumption/` contains the 29 PNGs and `qa-evidence.json`. Twenty selected review images and their hashes are recorded in `screenshots-consumption/library-manifest.json` and the exact upload request is in `library-consumption/request.json`.

The twenty original screenshots were subsequently saved to Library after the user explicitly approved that delivery. Their IDs and applied metadata are recorded in the manifest. The user rejected the presentation they showed; the UI revision has four new representative Library screenshots and its own manifest. Parent review of the new actual pixels remains required before user delivery.

The primary checkout remains clean at `bdd95551912f8524c5abd02f52417fe9b9f7b799`, and all six original stashes remain untouched. No push, merge, release, native-host launch or external post occurred.
