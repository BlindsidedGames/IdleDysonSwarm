# Classic development restart — 28 October 2026

Matthew selected public Classic 4.1.10 plus the newer offline/Stored Time system.
Classic, Augments and future Transcendence design are the development focus.
No new Transcendence mechanics are selected by this change.

## Recovery points

- Public gameplay source: `0dde63fbaad175362df49feeb981f85dc6af4a5e`.
- Civilization rework: local branch `Matt/shelved-civilization-rework-20261028`,
  checkpoint `2458f4e8`. It retains the Forager/Farming work and save fixtures.
- Active development: `Matt/classic-offline-time`, based directly on public source.

The rework branch is preserved locally; it has not been pushed or deployed.
Its save format and the Classic save format remain distinct. Do not import a
Modern save into this older Classic engine or replace a player's save for QA.

## Offline port

The 4.1.11 foreground boost replaces the bulk-spend interface with a 1–42×
slider. Only the additional simulated seconds debit Stored Time; Double Time
stacks separately. The bank stops funding acceleration when empty. Classic has
no civilization-era gates. Existing capacity costs and limits remain unchanged.

The later Off / Last speed / Max speed return preference is retained, together
with acknowledged-departure receipts and manual-import replay suppression.
Commands update the runtime; the normal checkpoint/lifecycle system saves them.
Rate and countdown presentation reflects funded active speed.

Public Classic retains Quantum, Reality, its original Simulations, challenges,
Augments and Discovery tiers. This is not a reset or a release.

## Validation

The applicable approved save-safety suite contains serialization, repository and
offline checkpoint recovery cases. Paired-mode cases do not apply to this
standalone public baseline. The retired gameplay suite is not run.

TypeScript, lint, production build, translation validation and compilation pass.
The 16 applicable save-safety cases pass. Browser QA uses synthetic saves on
port 5186, separate from the player's port 5173 progress. Native packaging and
device lifecycle checks remain unverified.

Actual browser checks covered keyboard selection through 42×, the displayed
41-second bank debit, empty-bank fallback to 1×, a full-bank capacity purchase
(one day consumed, capacity doubled to two days), and Last speed surviving the
normal autosave/reload at 5×. Desktop English and 360 CSS-pixel German layouts
were inspected. Enlarged Interface/text settings and native hosts were not
rechecked. The player preview at `/play/` loaded its existing Classic progress;
no QA fixture was imported there. The temporary QA server was stopped afterward.

The previously approved side-menu scrollbar gutter, trailing metadata, 44px
minimum targets and selected-row contrast fixes were subsequently restored.
Desktop and 360 CSS-pixel English drawer layouts and Escape dismissal were
checked in the running game. TypeScript and lint pass; enlarged text, long
locales and native drawer hosts were not repeated for this follow-up.

## Remaining base-game improvements restored

Matthew subsequently approved all of the identified improvements. Production
changes through pre-civilization checkpoint `04ea41f6` were ported, retaining
the newer offline return preferences and restored drawer. This includes Stellar
effects/descriptions, shared runtime and allocation corrections, Railgun charge
rounding recovery, Patient Hands residual idle credit, Fracture preview refresh,
completed-Durability filtering, press/hold purchases, Tinker input cancellation,
interface scaling, desktop tooltips and 250% skill-tree zoom, native clipboard
and timestamped export, and imported speedrun eligibility/markers. No new
Transcendence economy was designed or introduced.

Later generic save/Cloud safeguards and preset-conflict episode deduplication
were adapted from the preserved branch. Classic still writes schema 20 IDSWEB1,
uses its existing paths and store identities, and has no mode-switch or Modern
migration flow. Recovery archive receipts identify Classic's actual destination.
The latest namespace-specific entitlement caches and two-mode hosting are not
applicable to this standalone branch. Existing public entitlements are retained.

The approved save-safety suite gained three cases within `repository.test.ts`:
failed legacy conversion retains/reuses exact source bytes; a malformed future
envelope cannot trigger backup replacement; and a remote change disables Cloud
publication without replacing the local checkpoint. All 16 cases pass. TypeScript,
lint, compatibility-data validation, first-Dyson parity, catalogs and production
build pass. Electron entry/preload/Cloud JavaScript syntax checks pass.

Actual isolated browser checks covered primary hold-repeat purchases in Infinity
and Quantum, non-primary hold rejection, Quantum release stopping further buys,
80%/100%/130%/150% Interface settings, a 250% skill-tree tooltip with cost/Augment
counts, timestamped file export, and preset copy/paste returning exported text.
The initial browser clipboard selection fallback reported success with an empty
paste; preferring the modern write API fixed the observed round trip while
retaining native writes and the legacy fallback. German at 360 CSS pixels/130%
Interface exposed Settings minimum-width overflow, which was corrected and
remeasured at scrollWidth = client width = 360; bottom targets measure about
44px high and 50px wide, with separate version text.

An imported synthetic stalled Railgun completed its final reserved shot in the
running game: remaining shots 1 to 0, reserved panels 6,151,980,295,879 to 0,
and swarm panels 22,700,000,000,000 to 28,851,980,295,879, confirmed through the
actual export dialog. This is targeted verification, not a full balance playthrough.
Patient Hands residual timing, every Stellar combination and automatic-conflict
episodes were source-reviewed rather than separately exercised end to end.
Native mobile compilation/exports/clipboard, native lifecycle and real multi-device
Steam Cloud remain unverified. No deployment or public progress replacement occurred.

## Offline Time layout preview - 28 October

Matthew approved trying the proposed speed-first composition. Uses the Infinity
persistent-progress pattern and Research purchase-row alignment: speed and storage
share available width at 56rem of content space (1.15:1 columns), stack below that,
and keep content-driven heights. Speed consumption, duration and the short stacking
note remain visible; the Details disclosure is removed. Storage shows balance/capacity
above its track and a separate cost/result/action row. Existing commands, eligibility
and save behavior remain unchanged.

Verified the running browser at the normal desktop width and 360px CSS width,
including stacked cards, no horizontal overflow, visible details, full-bank storage
and 1x speed. TypeScript passed. Native hosts, other Interface scales, long locales,
empty/maxed storage and boosted-state interaction were not rechecked for this layout.
Screenshots: output/offline-time-desktop.png and output/offline-time-mobile.png.

### Follow-up: combined panel

Matthew requested one panel instead of the two-column preview. Stored balance/bar
now comes first, with the speed slider directly below it. Game speed and multiplier
appear at the right of the Offline Time header, without Regular. Details stay visible.
Verified normal desktop browser rendering and TypeScript; narrow/scaled/native states
were not rechecked for this follow-up. See output/offline-time-combined.png.

### Follow-up: return-mode radios and values only

Matthew requested removing the visible consumption/duration labels and explanatory
copy, retaining the values. Labels remain available to assistive technology.
On return now uses native Off/Last speed/Max speed radio inputs in full label targets,
with the Double Capacity lavender action treatment and a selected inset outline.
Verified desktop and 360px browser appearance, changing Last speed then restoring Off,
no horizontal overflow and approximately 44px minimum target heights. TypeScript passed.
Other scales/locales and native hosts remain unverified for this revision.

### Current Offline Time presentation

Matthew approved a larger, more consistent text scale for this page. Panel headings,
consumption/duration values, capacity facts and action buttons now share the existing
1.05rem section-size token; the page header remains 1.25rem. This is an explicitly
requested page-specific density departure from ordinary Bots/Research body sizing.
Capacity comes first with its details adjacent; the segmented return-mode control
uses a light active segment and dark inactive segments, no circles or visible group
label. Groups favor opposite sides on a shared row and wrap left-aligned when needed.
Internal horizontal dividers and explanatory text are removed. Cost and New capacity
have a 1.2rem gap. Verified current browser at 989px, all five text roles computing to
16.8px and no horizontal overflow; TypeScript passed. The enlarged revision still
needs narrow/mobile, other Interface scales, long-locale and native-host verification.

### Skill-tree tooltip preference and checkbox review

Added Show tooltips to Skills settings on desktop hosts. It defaults on, uses the
existing device-local presentation storage helpers, updates the delegated hover host
immediately and persists independently of game saves. Touch-only input still has no
hover tooltip. All supported locale catalogs include the new label.

Reviewed checkbox markup in Bots, Research, Infinity, Quantum, Simulations, Skills and
general Settings, including automation grids, preset inclusion and timestamped export:
checkboxes already sit inside their full clickable labels. The public 4.1.10 Research
source also contains this structure. No duplicate click handlers were added.
Verified in the running browser that clicking the empty far-right area of the new
Skills row toggles it, hover has zero tooltips when off and one when on, and a blank
area of the general Mute all audio row toggles it. Restored audio to its original value
and left tooltips enabled. Other tabs received source review; locked Quantum and
Simulations controls were not exercised on the current save. Native hosts, other
Interface scales and translated rendering remain unverified for the new setting.
TypeScript and all locale compilation passed. Screenshot: output/skill-tooltip-setting.png.

### 4.1.11 patch-note reconciliation

Matthew selected 4.1.11 for the next public update; 4.1.12 is not being used.
Rewrote the latest Wiki notes against the restored standalone build and applied
Unslop to the final player-facing prose. Removed obsolete bulk-spend/Tinker-processing,
quick-amount, civilization-freeze and already-existing checkbox-label entries.
The 15 current bullets cover the speed bank/return controls, Stellar updates, hold
purchases, scaling/tooltips, navigation, export/clipboard, imported speedruns,
Railgun/Patient Hands, Fracture/Durability, save safety, preset notices, Infinity
summary and Wiki credits. Previous 4.1.10 and older history remains intact.
Updated all seven translations and compiled/pseudo-localized catalogs. TypeScript,
lint, translation structure and compilation passed. Verified all 15 bullets in the
running English Wiki at desktop and 288px CSS width, without horizontal overflow.
Native hosts and translated rendering were not rechecked. Release metadata and
store drafts remain unchanged; no upload or publication occurred.

## Internal release preparation - 28 October 2026

Authorized targets: Google Play Internal testing, Internal TestFlight, Steam beta.
Website and production/default tracks are excluded. Candidate metadata is 4.1.11,
Android/Electron build 2026102801, Apple build 2610.28.01. Store uniqueness must be
confirmed on the release Mac before uploading; no upload has been performed here.

Classic native paths match the released web-runtime-v1 paths retained by the paired
host, and standalone save transport remains IDSWEB1/schema 20. Modern saves are
separate and are not imported automatically. The applicable 16 save-safety cases,
compatibility data, first-Dyson parity, web production build, native-relative renderer
build, localization checks and Electron syntax checks pass on Windows. The local
release script and shared CI now invoke the approved save-safety suite.

This Windows session has no SSH host configured for the release Mac and the app
currently lists no remote Mac project. Native signing/store sessions live on that
Mac. Deployment is pending Mac access; no signed native packages or tester-availability
claims are made. Resume on the release Mac from the exact prepared source commit,
using a clean isolated checkout and npm run release:local -- --release-id 2026102801.
Then complete iOS archive/upload and Steam packages, activate only the requested
internal/beta destinations, and verify tester availability independently.
