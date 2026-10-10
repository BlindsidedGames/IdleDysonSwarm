# Civilization focus and automatic milestones — 8 October 2026

Implemented locally for review. This supersedes the manual crew and resource-funded Catalyst offers in the previous local prototypes and their historical plans.

The player selects Balanced, Provisioning, Craft, Settlement, or Expeditions & Trade. Growing population follows fixed weighted crews, with foundational roles receiving one person first and every surplus worker distributed by largest remainder. Focus doubles the chosen path's weights. Input shortages preserve that choice rather than silently moving labor to remove its opportunity cost. The four paths unlock through interacting completion requirements. All five focuses reach all twelve activities unattended.

Catalysts are automatic, exactly-once development awards credited to the existing wallet. Awarding consumes no stock and has no purchase, claim, price, button or confirmation. Each marker and wallet credit enter the same canonical result. Overflowing wallets hold uncredited milestones until room becomes available. Earlier purchased reward IDs migrate to awarded IDs, preventing duplicate rewards. Existing paid version-two recipes retain their original reserved inputs, durations and outputs until completion. Existing permanent fractured IDs remain authoritative; unspent Catalysts confer no speed.

The next-Catalyst bar uses the minimum safe `log1p(current) / log1p(target)` across genuine completion requirements. Current includes funded cycle progress, which advances monotonically into completed work. Exact completion gates are independent of presentation; incomplete work never displays 100%. The era header always shows the additive fracture boost. Normal production recipes still consume inputs once when work starts. Recruitment consumes visibly increasing Food, housing remains necessary, and camp conversions preserve reserved shelter capacity.

Installed equipment consumes two Tools and one Clothing per worker. Useful equipped field workers add productive labor to Gathering, Hunting and Fishing; recruiting does not dilute total equipment contribution. There is no decay or upkeep. Equipment remains an optional bulk action with a concise confirmation; no per-job worker buttons remain.

The UI uses four functional sections, touching progress rows within each section, native disclosures, a desktop grid and modest section gaps. Recipes and equipment details remain expandable. Actual desktop and 360px mobile screenshots were inspected, including 130% text and German copy. The 320px/200% layout has no horizontal overflow. Browser QA used a fresh disposable profile, mock keychain and loopback-only requests; zero runtime exceptions, three blocked promotion requests. Native hosts remain unverified. These checks establish the implementation and observed layout, not user approval.

## Measured unboosted progression

| Focus | First award | Established camp | Exchange routes | Workers after two hours |
| --- | --- | --- | --- | --- |
| Balanced | 110s | 920s | 2645s | 134 |
| Provisioning | 110s | 920s | 2848s | 194 |
| Settlement | 110s | 920s | 2465s | 117 |
| Craft | 90s | 900s | 2760s | 92 |
| Expeditions & Trade | 110s | 920s | 2405s | 110 |

One-second synthetic simulations produced these values without gear, fractured nodes, Stored Time or mandatory focus changes. Later awards take longer and require several interacting paths. Day-long simulations continue progressing with Food shortages and different labor/population outcomes. Direct day-long event replay takes several seconds on this Mac; it is correctness evidence, not a latency certification. The existing Stored Time application processes detached candidates and cancellation continues to discard uncommitted awards and bank consumption.

## Verification and review deliverables

Focused domain/application tests pass 31/31. Coverage includes all focuses, first timing, recovery, weighted opportunity cost, large/irregular tick parity, automatic award stock conservation, exactly-once reloads, full-wallet holding, logarithmic edge cases and completion gates, equipment contribution, existing fracture ownership, reset retention, paid legacy migration, away-time banking, invalid saves, durable failure rollback and Stored Time cancellation. Production build, TypeScript, localization and lint pass. The aggregate has 2,162/2,255 passing tests and precisely the same 93 pre-existing failures as the prior revision; zero new failures or pending tests.

Parent task `evidence-focus-milestones/` holds source-derived progression JSON and timing traces. The prior `evidence-consumption/progression-spec.json` now points to the revised automatic-award mechanics. Parent task `screenshots-focus-milestones/` holds four actual PNGs, browser evidence and private Library receipts.

| Review view | Private Library ID |
| --- | --- |
| Early desktop, automatic milestone | `libfile_4177a1464e18819181b1b21003400a9c` |
| Mature desktop, Craft focus and +5% fracture boost | `libfile_accd9d8373d881919a633d6b88ab8fc3` |
| Mobile sections, 130% text | `libfile_cd519d51231c8191a8a566b4260a6815` |
| German mobile workforce details | `libfile_e14355e4b4b88191a6e8819a1cadd710` |

Local commit only. Main checkout and its six stashes remain untouched. No push, merge, deployment or native-host launch.
