# IDS feedback review — 5 November 2026

## Baseline and preservation

Mac main and a fresh GitHub read both resolve to
`3d1f2efede4e75b9aa82a0159ca94c6d44aa4f72`. Matthew reports the PC matches,
with only Local Apple sign-in guidance uncommitted in its AGENTS.md and the
civilization rework remaining shelved. Neither PC work nor other Mac worktrees
was changed. SSH to the previously recorded PC address timed out; the PC state
is Matthew's report, not an independent remote inspection.

The latest recorded internal release is 4.1.12 / 2026103101, source
`353c2748e8643e16e4bbcd91ac124384e624a77e`; main adds only its release record.
The older dirty Mac QA worktree's ten source files match that deployed source;
its working localization entries are also preserved in that release. This work
uses the separate `codex/ids-feedback-20261105` checkout.

## Changes

- Infinity's time input has a 16 CSS pixel minimum, preserving ordinary page zoom.
- Drawer balances remain beside their labels instead of forcing a second row.
- Every selected bottom destination remains rendered. Excess tabs scroll
  horizontally with full-size targets; current tabs reveal themselves after
  navigation or resize. Explicitly unselected tabs remain unselected.
- Quantum purchase and Leap text use the existing shared control typography.
- Settings tab toggles show the matching symbols, including their correct masks.
- Completed Avotation unlocks a device-local Show dabocados toggle. Unfinished
  discovery markers and completed replay behavior retain their existing paths.
- Collapsed Space Age retains the existing Swarm Stats card, without duplicating
  it when expanded or adding blank space before it unlocks.
- All 21 first-Infinity skill gates are removed through the current runtime
  catalogue. Numeric Unity flags are normalized; other dependencies/unlocks and
  Banking/Investment Portfolio refundability remain intact. Frozen data is unchanged.
- Active challenges have a named symbol/button above every route, opening
  Challenges and coexisting with Overflow notices. Header safe-area ownership is singular.
- Debug's misleading instant action now says and sets the ordinary 0.5 second
  Tinker duration. Both new labels are translated in all seven shipping locales.

Small cleanup stayed within these changes: composed catalogue overrides,
reused challenge-name metadata, removed the obsolete tab-truncation helper,
named the presentation preference, and added a reusable collapsed-summary slot.

## Verification

Passed TypeScript, lint, data integrity, all translation/catalogue checks,
production and native-relative builds, Electron entry-point checks and the
approved save-safety suite (3 files, 16 cases). No archived or new gameplay
tests were added. Existing large-chunk build advisories remain.

Actual game checks used synthetic data and disposable Chromium profiles with
mock Keychain. Both development and built-production origins were exercised.
An early gated skill was visible and assigned through its normal dependency
confirmation before first Infinity. Debug produced the displayed 0.50s Tinker
duration. Dabocados were hidden, restored and retained through reload. Swarm
Stats remained singular across collapse/expand. Starting Blank Slate displayed
the persistent marker; its action opened Challenges.

At 390px, all 15 opted-in tabs remained present in a 334px scrolling region with
47.75px slots. A touch swipe advanced it by 220px; keyboard focus revealed an
offscreen destination. RTL layout revealed the current tab at scrollLeft -382
without page overflow. Drawer Store/Offline Time rows measured 44px with long
balances. Infinity's input measured 16px and 44px high.

Inspected portrait and landscape images of every changed surface, against Bots
and Research references. Coverage includes 390x844, 844x390, 360x800 with 130%
text, German labels, and desktop 80/100/150% Interface sizes. The marker's initial
low-contrast inherited fill was corrected and recaptured. This is browser
visual acceptance, not blanket native certification.

A fresh iPhone 17 Pro / iOS 26.4 Simulator additionally checked the exact Infinity
field markup and shipped CSS in an isolated page. Previous 13.12px text zoomed
Safari's viewport to 1.219x; current 16px text stayed at 1.000x (402 CSS pixels).
This controlled focus check is not a full packaged WKWebView run. Temporary QA
pages were removed, and only the disposable simulator was shut down.

Screenshots and raw synthetic reset observations are outside the repository at
`/Users/matthewrushworth/Documents/Codex/2026-11-05/task-2/qa-evidence/`.

## Older items

| Item | Current-source disposition |
| --- | --- |
| Spend-time popup/sidebar softlock; outside completion dismissal | Historical fixes exist; the current live boost slider supersedes that popup flow. Other popup interactions are not certified by this. |
| Stellar Sacrifices | Completed integration audit is on main; see stellar-sacrifices-audit-2026-09-25.md. |
| Tinker repeating during offline processing | Blocked interaction and repeating presentation are suppressed. |
| Store Bot boost in speedruns | Both automatic production and Tinker record actual boosted usage. |
| IP estimate tick rate | Uses the processing interval and observed cycles at matching settings. |
| Free Community boost | Authored zero-cost boosts are accepted. |
| 42Qi goal with Division | Uses the Division-adjusted Infinity threshold. |
| Export timestamps; iOS file export | Implemented, including native document export. |
| Hold purchases; disabled gradients | Repeatable Infinity/Quantum holds and disabled-flat styling are present. |
| First non-refundable warning | Present for manual, preset and tab-automation paths. |
| Retain speedrun bests on reset | Reset import preserves recipient bests. |
| Challenge marker | Implemented in this change. |
| Before/after values | Skill assignment/refund comparisons exist; broader upgrade scope remains unspecified. |
| Skill-tree wiki | Explains links and badges. |
| Background statistics | Active panels, surrounded stars and engulfed galaxies are present. |
| Bottom sizing/tab controls | Adaptive sizing and settings exist; selected-tab truncation fixed here. A separate sizing slider is not implemented. |
| More presets | Ten slots exist. |
| Offline boost autoactivation | Off/Last/Max exists and resumes through lifecycle handling. |
| Flashing production text | Fitted text avoids alternating enlargement; the reported state still needs reproduction. |

## Offline-time finding and decisions

Actual import/reset/export flows distinguish banked time from selected speed:

| Action | Selected speed | Bank result |
| --- | --- | --- |
| Manual Quantum | 5x to 1x | Retained, less ordinary foreground consumption |
| Entanglement conversion | 5x to 1x | Retained, less ordinary foreground consumption |
| Manual Black Hole/Reality | 5x to 1x | Retained, less ordinary foreground consumption |
| Automatic AI Reality reset | 5x to 5x | 83.292s consumed over 20.841 wall seconds, matching 4s/s |

The manual pause was an intentional older policy in canonicalGameApplication;
no direct reset-bank clearing was found. Genuine intermittent bank loss is not
proven absent. Matthew subsequently chose the existing Off/Last/Max return
setting for manual Quantum/Entanglement and both Reality resets. These commands
now resume through that existing helper using the post-command integrity flag.
Manual Infinity, challenge, Overflow and automatic reset paths retain their
existing behavior. No save schema, mapping or bank fields changed.

Independent source review found no blocker. Running-game checks with disposable
imports covered all four manual commands under Off/Last/Max: speed returned to
1/5/42x respectively while remembered Last remained 5x. Banked time was retained,
less ordinary foreground consumption. A manual Infinity still paused at 1x;
subsequent Quantum with Last restored remembered 5x. Deliberately selecting 1x
remembered 1x and Last Quantum stayed at 1x. Empty-bank Max stayed at 1x, and a
rejected Quantum did not resume acceleration. A normal Quantum
Engage/Confirm UI flow also retained Last 5x and consumed only ordinary banked
time. Most matrix cases used the mounted game's production import/export and
dispatch callbacks; they are not claimed as twelve separate pointer flows.
One Dream case raced an automatic Meteor reset and passed on an isolated retry.
The cheat guard was reviewed statically; an imported true flag deliberately
inherits the receiving game's integrity and was not bypassed for this check.

Both 390x844 and 844x390 Offline Time screenshots were inspected after closing
onboarding: speed, bank and selected Last setting are visible without clipping.
TypeScript, lint, generated data and the approved 3-file/16-case save-safety
suite passed after this change. This follow-up is source verification; native
release artifacts remain pending a final identity and pricing decision.

Other unresolved design scope: the new Time Bonus price curve; Transcendent
offline-time generation/permanent effects; whether hiding Challenges means more
than the existing bottom-tab preference; and which additional live augment
values should be exposed. Existing augment descriptions/comparisons are present.

## Release state

No upload, deployment or public release has occurred. Matthew confirmed the
current standalone Classic game should use the next 4.2.x after his latest
4.2 TestFlight version. Classic/Modern hosting is not being restored. Historical
4.2.3 source 47bae597 used the shelved rework, a different Modern save schema
and no Time Bonus; it is not this release's gameplay baseline. Current Classic
retains IDSWEB1/schema 20 and existing save storage.

Fresh account verification used the existing authorized Xcode Organizer:
Crashes > Idle Dyson Swarm (iOS) > Version > More Versions queried and loaded
the full list with 4.2.3 highest; More Builds returned only 2610.17.1. Reload
Organizer and another version-list read agreed. This is fresh account-query
evidence rather than an inference from local archives. The candidate is now
4.2.4 / 2026110501 (Apple 2611.05.01), with all generated host metadata synced.
Fresh Google All app bundles search returned zero matches for 2026110501.

Organizer's version/build records do not establish current TestFlight testing,
compliance or group availability. Safari App Store Connect remains signed out.
Saved-password AutoFill access was denied by automatic approval review; it was
not retried, and no password, passkey, cookie, token or Keychain was accessed for
the Organizer query. Tester availability still requires separate verification.

Website publication is not assumed. Read-only preflight found
Android Internal 2026103101 / 4.1.12 available to testers and production
2026103001 / 4.1.11 at full rollout, with no unpublished changes. Existing Apple
and Steamworks web sessions were signed out; their current identities need
verification before upload. Candidate 2026110501 is unused on Google; Apple
collision checking remains outstanding. Current local asset builds retain the
old metadata and must not be uploaded as a new release.

Local Java/Android SDK/upload-key setup, Xcode and signing identities exist.
Final source, notes and unique metadata must be frozen before the canonical
clean-tree release gate. Steam needs candidate-specific Electron packages/VDFs;
the generic legacy Unity uploader is inappropriate.

## Time Bonus pricing investigation and approved change

Actual canonical transactions in disposable source copies compared candidate A
(42M/42B/42T/42Qa shards, x1000 throughout) with Matthew's original B
(42B/42T/42Qa/42Qi). A first-only variation (42M/42T/42Qa/42Qi) was also calculated
separately. Matthew subsequently approved A. The shared price helper now uses
42,000,000 x 1000^owned-level exactly as bigint; fallback and upgrade-definition
metadata use that same helper. The four-purchase cap and all bonus effects are
unchanged. Existing owned levels and spending records are not repriced.

All experimental A purchases accepted with exact debits and valid resulting states. B's
42Qi final purchase rejected even at the maximum valid wallet: its
42,000,000,000,000,000,000-shard price exceeds the 9,223,372,036,854,775,807
wallet limit. No numeric/save-contract expansion was made.

The first purchase requires 1.764B IP for A versus 1.764T for B. In a synthetic
1T-IP conversion followed by an unchanged underlying payout with fully matured
bonus, A reaches level 2 and B level 1. At maximum Bots, 19 Divisions and both
Double IP bonuses, A's optimistic per-tier payout bounds are 1/1/1/112 at full
maturity, or 1/1/1/183 at 300 seconds. B's are 1/2/443/impossible at full maturity.
These are affordability bounds, not production progression or playtime proof.
Existing ownership/savings, varying run ages and production feedback can alter
pacing. Time Bonus levels replace the previous level's multiplier; their
21/81/321/1281 maxima do not multiply together.

All other bounded Quantum upgrades cost only 1,048,694 shards together; the
three unlimited boosters retain their one-shard prices. Current canonical
conversion spends 42 IP per shard and removes that IP's facility multiplier.
Both the enormous flat booster ownership and this immediate IP multiplier loss
were included in the analysis. Repricing Time Bonus alone does not balance the
rest of the store. Existing purchased levels remain owned.

Running-game verification of the approved implementation used normal purchase
buttons for all four levels: each exact price was debited, level advanced to
four, and stored time stayed at 43,200 seconds. With 41,999,999 shards, the first
button was disabled and the production command rejected purchase without a
debit. Synthetic legacy-owned levels 1-4 retained their old spent ledger and
123 available shards through import/export/reimport/browser reload. Reload's
ordinary away-time credit was distinguished from the price transactions.
No schema migration, wallet-limit change or real-save access was needed.

Raw ordered transactions, candidate command logs, reward bounds and the two
new screenshots are under the external qa-evidence directory alongside the
original review images. Disposable experimental source copies and helpers were
removed; no real saves were used.
