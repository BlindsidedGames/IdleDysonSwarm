# IDS PC source handoff — 13 October 2026

Matthew requested the current intended source committed and pushed to main for
PC work. Integration starts at `3a62e6ada6e33839372345284953cfc27ea6f73b`
(PR 228). No deployment, release, real-save migration or account operation is
part of this handoff. The final exact SHA and remote CI result are reported by
the integration task after publication; this document is included in that commit.

## Integrated current work

- Exact notification preview source at
  `/tmp/ids-notification-backlog-fix-jxhqla2u/source`: automatic preset notices
  deduplicate ongoing conflicts and retire stale feedback; live countdowns reuse
  Bots formatting; timers use natural current-text width; Farming start uses the
  shared purchase Button. Funded Forager jobs settle immediately at the requested
  handoff without advancing clocks or starting new Forager work.
- Corrected Cloud migration patch
  `/tmp/ids-cloud-migration-review-fixes-3a62e6ad.patch`, SHA-256
  `e1b6fdbbdd968619585c3ad116b8b7b9e01c6ac84bf737f74ed96505d8bddf56`:
  final-choice publication, exact-source preservation, retry/reopen protection
  and remote-change guards. Cloud and achievement publishers remain disabled.
  Its earlier `c16943cf…` candidate is superseded.
- Saved `9259f622a4062bbb8a21b15bedb029a917f3e898` packaging correction:
  macOS Steam shortcut uses the existing universal-runtime packager. Only its
  `package.json` hunk is integrated; no packaging or distribution is performed.
- Missing historical release entry from `3eea7c6b`: only the verified
  `2026100501` ledger entry is retained. Existing release identity files are
  unchanged, including the current `2026100404` default candidate metadata.

The preview and corrected Cloud candidate have disjoint production changes;
their append-only specification additions were combined. Source files were
compared byte-for-byte with both candidates after generation and builds.
The full review/test copies are preserved independently; their already-integrated
changes do not constitute additional pending product work.

## Verification

Pinned **Node 24.11.1**: **2,473 tests / 219 files passed**. Full lint, generated
gameplay data, localization extraction/translation integrity/all ten compiled
catalogs, TypeScript project build, web/native-relative asset builds, bundled
promotion and production Store boundary checks, and Electron/Cloud/packager
syntax checks passed. Generation did not change reviewed tracked source.
The existing build warning about chunks above 500 kB remains.

An additional `check-steam-mobile-boundary.mjs dist-native` invocation reports
`4348570` in the promotion bundle. The match is the existing public Steam store
link in `src/promotions/bundled.json`, byte-identical to original main. This
broad scanner remains a known limitation, not evidence that a Steam SDK/native
provider was added. It is outside the required shared-runtime CI workflow.
The initial invocation without a required asset directory ran no scan.

No game/browser/native host was launched. Corrected desktop 80/100/130/150%
Interface sizes, mobile/enlarged text, long locale/RTL, actual touch/keyboard
rectangles and native pixels remain unverified, as recorded by the original
owners. Tests/builds do not establish rendered acceptance. The timer/button
changes reuse Bots numeric roles and the existing Discovery/Infinity purchase
composition; no new shared UI exception is introduced. Actual Cloud-account
acceptance remains unverified; filesystem check-to-rename and selected-backup
check-to-acknowledgement race limits are retained with Cloud disabled.

Local evidence: `/tmp/ids-handoff-full-tests.log`,
`/tmp/ids-handoff-check-results.json`, `/tmp/ids-handoff-checks.log`,
`/tmp/ids-handoff-audit.json`, and the original candidate evidence. These
machine-local logs are not required to build the repository on the PC.

## Explicitly preserved exclusions

- Active stashes `30e84aaf03ff822512454d35486d3d5473ac6db0` and
  `78c75fdc0475c9aa2a6af6e64da6b9bcbb3e110f` remain untouched. They preserve
  older local/Stored Time experiments, not approved pending integration.
  October 4 quick-time controls were removed by `fed35195` in favor of the
  live slider; do not restore them.
- Four older stashes remain under `refs/archive/ids-stashes`: localization
  `a83984a6`, skill tree `e4dcefaf`, Unity scene/font `e16ef50c`, and scene/font
  layout `0fbcf1e1`. They are archived historical material, not current source.
- The removed augment-proposal worktree is recoverable through
  `.git/worktree-archives/ids-mac-handoff-proposal-20261010T230350Z/RECOVERY.txt`,
  its bundle, full-file archive and preserved design branch. Those private
  archives remain on the Mac and are not published by this source handoff.
- Stopped web checkout callback checkpoint `a3fa6b0d` and website `bda3a0e`
  remain held. This request does not reopen the stopped web scope.
- Display-only Farming rate patch and failed/intermediate continuous/migration
  candidates (including `6bfcb250`) are superseded by PR 228 and the corrected
  Cloud patch. Earlier timer patch plus follow-up are superseded by timer v2;
  overlapping deltas were not applied twice.
- Androids, broad augment design, balance suggestions, Catalyst-placement or
  banking proposals, preparation-exception guard, Black Hole Capped label,
  megastructure auto-buy and skill-clarity proposals remain parked/unimplemented.
  No new balance, reward or platform policy is invented here.
- Generated bundles, native binaries, local caches/configuration, archival audio
  masters, diagnostics and real saves are excluded. Delivery audio and required
  checked-in synthetic fixtures remain in the repository. The separate old
  `Idle Dyson Swarm Web` repository is unrelated and untouched.

## Registered worktrees

Clean statuses below apply only to valid repositories. Prunable registration
remnants may contain retained build/evidence directories without a `.git` pointer;
they are not silently reported as clean checkouts. No worktree is removed.

| Registered path | Recorded HEAD | Audit result |
| --- | --- | --- |
| `/Users/matthewrushworth/Projects/Idle Dyson Swarm` | `3a62e6ad` | Clean at audit; authorized integration committed in this task |
| `/private/tmp/ids-4.1.7-purchase-details` | `7258bd56` | Absent; stale registration |
| `/private/tmp/ids-combined-internal-20261005` | `eea1728d` | Stale registration; no valid checkout |
| `/private/tmp/ids-community-merge` | `43d14d15` | Stale registration; no valid checkout |
| `/private/tmp/ids-feedback-fixes` | `5c32569a` | Absent; stale registration |
| `/private/tmp/ids-fix-export` | `221e5288` | Absent; stale registration |
| `/private/tmp/ids-fix-offline-errors` | `6a15dbd0` | Absent; stale registration |
| `/private/tmp/ids-fix-research-copy` | `67e15934` | Absent; stale registration |
| `/private/tmp/ids-fix-research-reset` | `965828a3` | Absent; stale registration |
| `/private/tmp/ids-fix-slider` | `8faec9d1` | Absent; stale registration |
| `/private/tmp/ids-fix-terra` | `00315f10` | Absent; stale registration |
| `/private/tmp/ids-fractional-influence-gather` | `98e2ac96` | Absent; stale registration |
| `/private/tmp/ids-freeze-baseline-20261005` | `7fe0d4b5` | Stale registration; no valid checkout |
| `/private/tmp/ids-freeze-investigation-20261005` | `2b4653c0` | Stale registration; no valid checkout |
| `/private/tmp/ids-galvanization-integration` | `d91df861` | Absent; stale registration |
| `/private/tmp/ids-hold-gradient-audit` | `8f072ae1` | Stale registration; no valid checkout |
| `/private/tmp/ids-main-internal-20261005` | `4c032bfd` | Stale registration; no valid checkout |
| `/private/tmp/ids-offline-internal-2026100402` | `2b4653c0` | Stale registration; no valid checkout |
| `/private/tmp/ids-railgun-fix-20261005` | `2b4653c0` | Stale registration; no valid checkout |
| `/private/tmp/ids-release-2026090201` | `cf05954c` | Absent; stale registration |
| `/private/tmp/ids-release-2026092001` | `1a5007b8` | Stale registration; no valid checkout |
| `/private/tmp/ids-release-2026092002` | `7021f515` | Stale registration; no valid checkout |
| `/private/tmp/ids-release-4-1-8` | `878f5bff` | Absent; stale registration |
| `/private/tmp/ids-responsive-phone-baseline` | `d4b6fd54` | Absent; stale registration |
| `/private/tmp/ids-responsive-text-fix` | `3baaae48` | Absent; stale registration |
| `/private/tmp/ids-scientific-planets-dialog` | `db149773` | Absent; stale registration |
| `/private/tmp/ids-seven-pr-review` | `09a9e52b` | Absent; stale registration |
| `/private/tmp/ids-shared-simplification-20261005` | `2b4653c0` | Stale registration; no valid checkout |
| `/private/tmp/ids-skill-dialog-layout` | `120b6b37` | Absent; stale registration |
| `/private/tmp/ids-steam-2026090503` | `56c4f028` | Absent; stale registration |
| `/private/tmp/ids-steam-botboost` | `4c208fa6` | Stale registration; no valid checkout |
| `/Users/matthewrushworth/.codex/worktrees/internal-2026100501/Idle Dyson Swarm` | `3eea7c6b` | Clean valid repository |
| `/Users/matthewrushworth/Documents/Codex/2026-09-19/can-x20/work/ids-local-master` | `26c25275` | Clean valid repository |
| `/Users/matthewrushworth/Documents/Codex/2026-10-07/task-2/ids-rework` | `a168e549` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-4.1.7-baseline` | `80317164` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-4.1.7-wiki-polish` | `64a230f8` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-4.1.8-review-fixes` | `e65cbc3e` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-feedback-integration` | `8fdacdf6` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-game-center-icon` | `cedd8098` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-infinity-challenges` | `33fae517` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-mac-handoff-storefront` | `608eaaa6` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-mobile-achievements` | `9c38a211` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-overflow-boundary` | `d6a57390` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-performance-maintainability` | `747e003f` | Clean valid repository |
| `/Users/matthewrushworth/Projects/ids-steam-release` | `c2ad11f5` | Clean valid repository |

## Local branch/checkpoint inventory

An ancestor, an exact merged PR tip or an identical cherry-picked patch is
accounted for as integrated. Later supersession/reverts are called out below.
`5d1ad087` has an identical tree to PR 227 main `bff37d9a`. The remotely
preserved pre-rework tag resolves to `04ea41f6b87a15905a75a207dbeaf1153b2f78f0`.

| Branch | Tip | Disposition/evidence |
| --- | --- | --- |
| `archive/unity-development-handoff-2026-08-21` | `cc21ca0e` | integrated ancestor of main; merged PR #227, #226, #225 |
| `break-infinity-migration` | `05fe7f85` | Superseded migration certification for the retired Web layout; retained historical branch. |
| `codex/4.1.11-community-input-fixes` | `43d14d15` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/4.1.7-baseline` | `80317164` | squash-merged exact tip; merged PR #176 |
| `codex/4.1.7-purchase-details` | `7258bd56` | squash-merged exact tip; merged PR #176, #174 |
| `codex/4.1.7-wiki-polish` | `64a230f8` | squash-merged exact tip; merged PR #179 |
| `codex/4.1.8-review-fixes` | `e65cbc3e` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/archive-pre-rewrite-main-local-state-20260725` | `88830dfc` | Intentional archive of pre-realignment state; preserve without restoring old source or local settings. |
| `codex/avoid-duplicate-pr-ci` | `9fdc1950` | squash-merged exact tip; merged PR #160 |
| `codex/backup-skill-preset-independence-pre-pr143-20260830` | `e449733d` | identical cherry-picked patch in merged integration (`75ac67c3`) |
| `codex/blank-slate` | `33fae517` | included in merged integration history; merged PR #182 |
| `codex/bounded-stored-time-infinity` | `1281c3e8` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/challenge-notice-safe-area` | `e6de32de` | squash-merged exact tip; merged PR #191 |
| `codex/debug-tab-toggle-reset` | `838276a3` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/deferred-bot-cap-regression-hardening` | `e34ec1c6` | squash-merged exact tip; merged PR #150 |
| `codex/discord-campaign-finalization-2026090102` | `f4fd1205` | squash-merged exact tip; merged PR #168 |
| `codex/discord-division-goal-runtime` | `7732fe94` | squash-merged exact tip; merged PR #165 |
| `codex/discord-feedback-integration` | `8fdacdf6` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/discord-free-community-boost` | `9b167076` | squash-merged exact tip; merged PR #166 |
| `codex/discord-purity-runtime-flow` | `d3d433bc` | squash-merged exact tip; merged PR #164 |
| `codex/discord-srs-rework` | `af4d99ad` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/discord-universe-designation-64bit` | `da3a0af1` | squash-merged exact tip; merged PR #163 |
| `codex/fix-division-bot-goal` | `44d83cc4` | squash-merged exact tip; merged PR #155 |
| `codex/fix-purity-max-skill-save` | `d41e98ab` | squash-merged exact tip; merged PR #154 |
| `codex/fix-railgun-rounding` | `2b4653c0` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/fix-release-ledger-artifact-paths` | `33f9d36d` | squash-merged exact tip; merged PR #159 |
| `codex/fix-responsive-text` | `3baaae48` | squash-merged exact tip; merged PR #194 |
| `codex/fix-scientific-planets-dialog` | `db149773` | squash-merged exact tip; merged PR #185 |
| `codex/fix-stellar-overflow-lock` | `47756301` | squash-merged exact tip; merged PR #148 |
| `codex/fractional-influence-gather` | `98e2ac96` | squash-merged exact tip; merged PR #182, #181 |
| `codex/future-monetization-progression-docs` | `d8a4788f` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/galvanization-influence-integration` | `d91df861` | squash-merged exact tip; merged PR #182 |
| `codex/galvanized-augment-tree` | `dc717dcd` | squash-merged exact tip; merged PR #188 |
| `codex/game-center-button-icon` | `cedd8098` | squash-merged exact tip; merged PR #178 |
| `codex/game-number-signed-input` | `f2e98b39` | squash-merged exact tip; merged PR #151 |
| `codex/hold-repeat-gradient-audit` | `8f072ae1` | Held augment proposal; no design approval, preserved. |
| `codex/ids-feedback-fixes` | `5c32569a` | included in merged integration history; merged PR #176 |
| `codex/ids-fix-export` | `221e5288` | identical cherry-picked patch in merged integration (`b24e241c`) |
| `codex/ids-fix-offline-errors` | `6a15dbd0` | identical cherry-picked patch in merged integration (`72130114`) |
| `codex/ids-fix-research-copy` | `67e15934` | identical cherry-picked patch in merged integration (`0e0be199`) |
| `codex/ids-fix-research-reset` | `965828a3` | identical cherry-picked patch in merged integration (`8affd6c3`) |
| `codex/ids-fix-slider` | `8faec9d1` | identical cherry-picked patch in merged integration (`89bbfa01`) |
| `codex/ids-fix-terra` | `00315f10` | identical cherry-picked patch in merged integration (`c85cbdc5`) |
| `codex/ids-gameplay-rework-plan-20261007` | `a168e549` | Integrated by PR 227. The final equipment-calendar roundoff hunk is present; later PR 228 migration changes supersede this source snapshot. |
| `codex/ids-shared-simplification` | `2b4653c0` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/internal-2026100501-record` | `3eea7c6b` | Historical 3eea7c6b ledger entry integrated by this handoff; release identity files from its parent are deliberately not restored. |
| `codex/local-soundtrack-master` | `26c25275` | squash-merged exact tip; merged PR #206 |
| `codex/local-tested-main-20261010` | `5d1ad087` | included in merged integration history; merged PR #227 |
| `codex/mixed-notation-version-footer` | `83b991de` | squash-merged exact tip; merged PR #143 |
| `codex/mobile-achievements` | `9c38a211` | squash-merged exact tip; merged PR #177 |
| `codex/mobile-insets-stored-time` | `927a1840` | squash-merged exact tip; merged PR #196 |
| `codex/native-release-metadata-timeout` | `b8c28d69` | squash-merged exact tip; merged PR #146 |
| `codex/offline-time-completion-dismiss` | `c1551b8b` | squash-merged exact tip; merged PR #167 |
| `codex/offline-time-final-cap-fix` | `e220066e` | squash-merged exact tip; merged PR #149 |
| `codex/offline-time-outside-dismiss` | `ac522d16` | squash-merged exact tip; merged PR #156 |
| `codex/overflow-boundary` | `d6a57390` | included in merged integration history; merged PR #182 |
| `codex/patch-notes-415-four-fixes` | `75a4eb3c` | squash-merged exact tip; merged PR #157 |
| `codex/performance-maintainability` | `747e003f` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/promotional-bot-boost` | `a5186422` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/quantum-purchase-controls` | `12986828` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/railgun-shared-internal-20261005` | `eea1728d` | squash-merged exact tip; merged PR #222 |
| `codex/record-2026100404-internal-release` | `ebe52572` | squash-merged exact tip; merged PR #221 |
| `codex/release-2026082401` | `2d78c9b6` | Historical release/localization integration, superseded by later releases and the merged seven-locale implementation; no version rollback. |
| `codex/release-2026091101` | `80c01b49` | squash-merged exact tip; merged PR #189 |
| `codex/release-2026091102` | `99fb46cb` | squash-merged exact tip; merged PR #192 |
| `codex/release-4-1-6-2026090201` | `da514cc7` | squash-merged exact tip; merged PR #172 |
| `codex/release-4-1-8` | `ea8327a4` | squash-merged exact tip; merged PR #184 |
| `codex/release-4-1-8-build-02` | `004366c1` | squash-merged exact tip; merged PR #186 |
| `codex/release-ledger-2026090101` | `da9354fd` | squash-merged exact tip; merged PR #158 |
| `codex/remove-offline-quick-spend-test` | `50121f3b` | squash-merged exact tip; merged PR #190 |
| `codex/report-2-universe-designation` | `e902891b` | squash-merged exact tip; merged PR #153 |
| `codex/save-transfer-during-stored-time` | `1281c3e8` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/september-polish-checkpoint` | `35e82229` | squash-merged exact tip; merged PR #187 |
| `codex/shared-gameplay-notifications` | `68ab1cfe` | squash-merged exact tip; merged PR #171 |
| `codex/simulation-persistence-formulas-layout` | `46b2ffe1` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/skill-dialog-layout` | `120b6b37` | squash-merged exact tip; merged PR #183 |
| `codex/skill-only-tooltip-integration` | `3b06eb6d` | squash-merged exact tip; merged PR #220 |
| `codex/skill-preset-independence` | `87f919af` | squash-merged exact tip; merged PR #145 |
| `codex/skill-tree-repairs` | `c580df4e` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/speedruns-debug-overflow` | `8b613b3e` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/stacking-durability` | `9508d753` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/statistics-ui-polish` | `5537a5c9` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/steam-release-preparation` | `c2ad11f5` | included in merged integration history; merged PR #176 |
| `codex/streamline-contributor-guidance` | `20d1b18c` | identical cherry-picked patch in merged integration (`138f957d`) |
| `codex/subtle-release-footer` | `4005d918` | squash-merged exact tip; merged PR #144 |
| `codex/sync-native-version-contract` | `f44f047a` | squash-merged exact tip; merged PR #173 |
| `codex/terra-avocados-milestones` | `e40e945a` | integrated ancestor of main; merged PR #227, #226, #225 |
| `codex/update-4-1-5-patch-notes` | `3687a7ae` | squash-merged exact tip; merged PR #147 |
| `codex/update-415-patch-notes-pr148-151` | `44d96eb1` | squash-merged exact tip; merged PR #152 |
| `codex/website-managed-promotions` | `b066f2bc` | integrated ancestor of main; merged PR #227, #226, #225 |
| `design/augment-review-mac-20260930` | `ec737f17` | Paused proposal; six modified and 52 untracked files privately archived with recovery instructions. No augment design restored. |
| `discovery-prototype` | `127df61c` | integrated ancestor of main; merged PR #227, #226, #225 |
| `main` | `3a62e6ad` | integrated ancestor of main |
| `numeric-safety-and-tick-system` | `96e52560` | integrated ancestor of main; merged PR #227, #226, #225 |
| `numeric-safety-canonical-baseline` | `be409f9a` | Historical canonical baseline for numerical certification; preserve, no gameplay rollback. |
| `pre-tick-system-canonical-baseline` | `176e5f6d` | Historical pre-tick payout baseline; preserve, no gameplay rollback. |
| `skill-augment-proposal` | `8f072ae1` | Held augment/balance proposal, not approved implementation. |
| `speedrun-improvements` | `6cf6618a` | integrated ancestor of main; merged PR #227, #226, #225 |
| `test-audit-cleanup` | `bf5a23f6` | Identical documentation patch was applied as df70d794 then explicitly reverted in bfd59b73. Preserve the reverted state; do not resurrect storefront evidence. (`df70d794`) |
| `transcendence-tiers` | `58c57493` | integrated ancestor of main; merged PR #227, #226, #225 |
| `trial-and-error-challenge` | `59dec609` | integrated ancestor of main; merged PR #227, #226, #225 |

## Standalone source/review repositories

| Path | Checkpoint | Disposition |
| --- | --- | --- |
| `/Users/matthewrushworth/Documents/Codex/2026-10-05/task-6/ids-credits-preview` | `9f05e032` | Approved credits incorporated by PR 223. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-06/task-2/ids-audit` | `ecb0c0a1` | Main source already merged; untracked purchaseBoundaryDiagnostic.test.ts explicitly marked disposable/do not land. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/ids-accessibility-review` | `5eb66c54` | 5eb66c54 and 3226cfc8 incorporated by PR 227, with later save correction in PR 228. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/ids-approved-main-integration` | `9259f622` | 9259f622 shortcut integrated; 3877dd3a / 2fe6112c already incorporated by PR 227; a3fa6b0d callback held. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/ids-challenge-pilot` | `a4dd11b6` | Approved challenge/rework/isolation work incorporated by PR 227; preserve snapshots. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/ids-main-integration` | `727a545c` | Approved challenge/rework/isolation work incorporated by PR 227; preserve snapshots. |
| `/Users/matthewrushworth/Projects/Idle Dyson Swarm Web` | `b8e55736` | Separate legacy project; preserve unrelated work. |
| `/tmp/ids-cloud-corrected-review-3a62e6ad` | `3a62e6ad` | Independent review of corrected patch; duplicated source accounted for; probes retained locally. |
| `/tmp/ids-cloud-migration-3a62e6ad` | `3a62e6ad` | Earlier/red/review Cloud candidate superseded by e1b6fdbb; diagnostic probes retained locally. |
| `/tmp/ids-cloud-migration-review-fixes-3a62e6ad` | `3a62e6ad` | Exact corrected e1b6fdbb patch integrated. |
| `/tmp/ids-cloud-migration-review-red-owner-3a62e6ad` | `3a62e6ad` | Earlier/red/review Cloud candidate superseded by e1b6fdbb; diagnostic probes retained locally. |
| `/tmp/ids-cloud-review-3a62e6ad` | `3a62e6ad` | Earlier/red/review Cloud candidate superseded by e1b6fdbb; diagnostic probes retained locally. |
| `/tmp/ids-farming-carryover-bff37d9a` | `04c7bd06` | 04c7bd06 exact PR 228 source; already merged. |
| `/tmp/ids-farming-rate-bff37d9a` | `bff37d9a` | Display-only approach superseded by continuous owner in PR 228. |
| `/tmp/ids-notification-backlog-fix-jxhqla2u/source` | `3a62e6ad` | Exact final intended source integrated; independent preview namespace/configuration retained. |
| `/tmp/ids-timer-independent-review-3a62e6ad` | `3a62e6ad` | Earlier timer/notification review copy; final preview supersedes it. Independent probes are diagnostics. |

## Saved patch inventory

| Patch | Disposition |
| --- | --- |
| `/Users/matthewrushworth/Documents/Codex/2026-09-30/task-2/ids-handoff-evidence/index-before.patch` | Held experiment/proposal/archive evidence; preserve without integrating. |
| `/Users/matthewrushworth/Documents/Codex/2026-09-30/task-2/ids-handoff-evidence/tracked-before.patch` | Held experiment/proposal/archive evidence; preserve without integrating. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-05/task-6/evidence/ids-wiki-credits-approved.patch` | Approved credit implementation already incorporated by PR 223; original versions retained. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-05/task-6/evidence/ids-wiki-credits.patch` | Approved credit implementation already incorporated by PR 223; original versions retained. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-05/task-9/experimental/experiments/androids-prototype.patch` | Held experiment/proposal/archive evidence; preserve without integrating. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-05/task/IDS-shared-simplification.patch` | Railgun/shared-runtime work already integrated by PR 222; retained historical evidence. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-06/task-7/dirty-diff-evidence/08-ids-mac-handoff-proposal-working.patch` | Held experiment/proposal/archive evidence; preserve without integrating. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-06/task-7/dirty-diff-evidence/34-ids-railgun-fix-20261005-working.patch` | Railgun/shared-runtime work already integrated by PR 222; retained historical evidence. |
| `/Users/matthewrushworth/Documents/Codex/2026-10-06/task-7/dirty-diff-evidence/37-ids-shared-simplification-20261005-working.patch` | Railgun/shared-runtime work already integrated by PR 222; retained historical evidence. |
| `/tmp/ids-cloud-migration-3a62e6ad.patch` | Earlier candidate/subset superseded by corrected e1b6fdbb patch. |
| `/tmp/ids-cloud-migration-production.patch` | Earlier candidate/subset superseded by corrected e1b6fdbb patch. |
| `/tmp/ids-cloud-migration-review-fixes-3a62e6ad.patch` | Integrated exact corrected candidate. |
| `/tmp/ids-cloud-migration-review-fixes-only.patch` | Correction subset already contained in integrated corrected patch. |
| `/tmp/ids-farming-carryover-before-final-generated.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-farming-carryover-before-generated.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-farming-carryover-bff37d9a.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-farming-carryover-corrected-bff37d9a.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-farming-rate-bff37d9a.patch` | Superseded display-only approach; not applied. |
| `/tmp/ids-integration-current-tracked.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-migration-consolidated-bff37d9a.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-migration-consolidated-review-fixes-bff37d9a.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-migration-consolidation-only.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-migration-review-fixes.patch` | Intermediate/source review snapshots superseded by merged PR 228 and corrected Cloud patch. |
| `/tmp/ids-notification-backlog-fix-jxhqla2u/instant-forager-handoff.patch` | Integrated through exact final preview source. |
| `/tmp/ids-notification-backlog-fix-jxhqla2u/notification-backlog.patch` | Integrated through exact final preview source. |
| `/tmp/ids-notification-backlog-fix-jxhqla2u/timer-countdown-v2.patch` | Integrated through exact final preview source. |
| `/tmp/ids-notification-backlog-fix-jxhqla2u/timer-countdown.patch` | Superseded/subsumed by final timer v2 source. |
| `/tmp/ids-notification-backlog-fix-jxhqla2u/timer-gap-and-farming-button.patch` | Superseded/subsumed by final timer v2 source. |
