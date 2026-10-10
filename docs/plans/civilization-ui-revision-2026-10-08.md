# Civilization UI revision — 8 October 2026

Historical revision: superseded by [focus and automatic milestones](civilization-focus-and-milestones-2026-10-08.md). The purchase and manual crew descriptions below record the earlier prototype.

Status: implemented locally, verified and ready for product review. The user rejected the presentation at `b42df21a`: its resource/status header occupied most of the first phone viewport, repeated bordered cards obscured the progression, recipes repeated in collapsed and expanded states, and workforce controls competed with the automatic loop. Readability and lack of overflow were insufficient evidence of a good hierarchy. This revision changes no recipes, unlocks, capacities, speed formulas, commands, save semantics or reset behavior.

## Presentation

The design starts from the game's native Simulation and Discovery patterns: progress leads, mechanics expand on demand, and existing colors, type roles, hit targets and light action gradients remain. The original main Simulation's expanded cards and current Discovery's disclosure were inspected, alongside the existing Bots reference and style guide.

- The default header contains the era title, one compact worker-count disclosure, and inline Food/Materials/Tools balances. Opening the balances reveals the other stocks. Opening Workers reveals available crews, housing, equipment and the one overall fractured-base bonus. Equipment actions and their confirmation live there.
- Twelve compact activity rows share one purple panel. Each collapsed row presents its name, timer or waiting inputs, and progress track. Desktop uses two columns and phones one. There are no always-visible recipe paragraphs or worker buttons.
- Opening a row reveals one cycle cost/output pair, optional crew controls, completion/duration/speed facts and only the applicable supporting note. Manual crews can return to automatic assignment. Costs use labeled quantities, avoiding singular quantities paired with plural unit prose.
- Shortages remain visible on the affected collapsed row. Waiting for workers is a status rather than a direction implying that manual assignment is required. Failed actions report beside their own controls; they are not relegated to the end of the page.
- Catalysts retain the existing collapsed disclosure and confirmed finite purchases. The later-era boundary is a short preview. No new icons, tutorial introduction, fracture CTA or dashboard was added.

## Verification and limits

The actual default 360×800 view at 130% game text shows eleven complete activity rows before bottom navigation, with the main progression starting about 102px below the top. The German default shows ten rows, starting about 116px down. Desktop shows all twelve at once. These measurements corroborate the hierarchy change; they are not a claim of user approval. Expanded states intentionally occupy more space. The German equipment confirmation and the single expanded recipe/control view were inspected separately, including costs and readable percentages.

The browser pass uses a fresh disposable Chromium profile with `--use-mock-keychain`, initial `about:blank`, no initial IndexedDB, loopback-only requests and synthetic/checked-in saves. It checks default desktop, 768px tablet, 360px/130%, long German text, 320px/200% enlarged text, expanded stock/workforce/activity disclosures, keyboard Space activation, 44px worker controls, manual assignment/automatic restore, equipment cancellation/purchase, Catalyst confirmation/cancellation/purchase, automatic progress, final reachable controls and reduced motion. It records four screenshots, zero runtime exceptions and three blocked promotion requests. The browser and preview server close afterward.

Focused production/domain/save and retained-screen tests pass **198/198 across seven files**. The final aggregate retains **2,156/2,249 passing tests across 209 files, the identical 93 baseline failures, zero new failures and zero skipped/pending tests**. No legacy failure was weakened or skipped. TypeScript, oxlint, translations, production build and store-boundary checks pass. All seven translations retain 2,461 complete messages and all ten catalogs compile. The existing build chunk warning remains. Gameplay ownership and save files have no diff from `b42df21a`.

Native hosts/devices remain unverified. This is a focused browser presentation revision awaiting the user's review; no UI approval or release readiness is claimed.

## Review artifacts

The parent task's `screenshots-ui-revision/` contains the four actual PNGs, `qa-evidence.json` and `library-manifest.json`. All four are saved privately to Library with returned metadata applied to each original file:

| View | Library ID |
| --- | --- |
| Default desktop | `libfile_5df82fec9ca48191a0807dac25b0543a` |
| Default mobile, 130% text | `libfile_da9f2dd063088191b692704b567b0abe` |
| Shortages and expanded worker controls | `libfile_30dd13630d4c8191bdde7cb8c0bf6163` |
| German equipment confirmation | `libfile_8e0ca89e3bf4819197c125bfcca83752` |

`evidence-ui-revision/` contains verification results and logs. The source-grounded graph specification is `evidence-consumption/progression-spec.json`; it includes exact activity inputs/outputs, unlock prerequisites, base work durations, capacity/reservation semantics, finite Catalyst offers, speed feedback and persistence. The parent is producing the graph; no mechanics change was implied by that request.

No push, merge, release, primary-checkout change or native-host launch occurred. Parent inspection of the actual four images remains required before delivery to the user.
