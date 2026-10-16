# Classic and Modern save storage

The production host owns one writer and one running game graph. Classic keeps
its released file and decoder. Modern has its own file and decoder. Switching
settles and checkpoints the outgoing graph before its document is removed.
The existing drawer opens the other mode immediately; first Modern opening
copies/migrates Classic only when no Modern save exists.

The released Apple baseline was freshly confirmed in App Store Connect as
4.1.10, Ready for Distribution, build 2609.29.1, matching the previously recorded
submission artifact and common Classic source. The historical foundation report
retains its earlier unverified status as dated evidence.

## Canonical locations

All native paths below end in `save/idle_dyson_swarm_web_save.idsw`, with the
existing native backup and temporary filenames alongside it.

| Host | Classic root | Modern root |
| --- | --- | --- |
| iOS | Documents/web-runtime-v1 | Documents/idleds-modern-v1 |
| Android | filesDir/web-runtime-v1 | filesDir/idleds-modern-v1 |
| Electron desktop | userData/web-runtime-v1 | userData/idleds-modern-v1 |
| Steam signed in | userData/steam-local/SteamID/web-runtime-v1 | userData/steam-local/SteamID/idleds-modern-v1 |
| Steam offline | userData/steam-offline/web-runtime-v1 | userData/steam-offline/idleds-modern-v1 |

Existing account-owned offline-recovery selections remain authoritative. Modern
has a separate offline selection and recovery folder. Old rework-beta roots
(including retained offline progress) are read-only discovery inputs. Same-device
Unity originals remain read-only, and only native-attested purchase evidence can
restore host ownership; portable/manual save claims cannot.

Browser Classic keeps the released database/path. Modern keeps the separate
rework-beta database/path. The parent leases both plus the mode metadata database.
Presentation preferences remain fenced per mode.

## Atomic pair and recovery

`idleds-dual-modes-v1/modes-v1` contains the pair manifest, immutable checkpoint
slots, retained upgrade/migration sources and canonical publication receipts.
The manifest commits before publishing visible canonical files. Interrupted
publication retries from the committed pair; it never manufactures a fresh save.
A verified later write by the old Classic release is adopted on the next launch.
Both saves survive export/import and explicit recovery through Settings.

## Steam Cloud

Published and checked through Steam app metadata on 16 October 2026:
`steam-cloud/SteamID/current.idsw` and `backup-1.idsw` through `backup-3.idsw`
remain Classic. Modern uses `modern-current.idsw` and `modern-backup-1.idsw`
through `modern-backup-3.idsw` in that same account directory. Receipts and
publication gates are independent. Wrong-mode formats and changed Steam
identities are rejected. Temporary/local metadata and Unity originals are excluded.

Steamworks published these eight nonrecursive rules with the approved pending
Transcendent, Enlightened, Challenge Accepted, Breaking the Rules and Galaxy Brain
achievement definitions. Public build 25569496 was unchanged. Real two-device
Steam sync has not been exercised; filesystem/provider protocol checks do not
claim that evidence. Mobile remains local-only where no Cloud provider exists.

## Verification evidence and limits

The approved six-file save-safety suite passes 27 cases, including actual Steam
filesystem paths/format isolation, interrupted canonical publication and failed
adoption followed by recovery. TypeScript, lint, Classic source-integrity,
Web/native builds, Android debug assembly and iOS simulator compilation pass.

A disposable iOS 26.4 iPhone simulator was seeded only at the released Classic
path with the checked-in mature-infinity fixture. Classic opened, both switches
worked, and the native canonical files were distinct. Background/terminate/reopen
and reinstalling the debug app retained the pair; Modern remained byte-identical
while Classic played/restarted, then resumed its existing progress. Portrait and
landscape gameplay were inspected. An isolated Chrome profile with mock Keychain
opened the production build, switched both ways and opened paired export. Desktop
100%, 80% and 150% Interface states were exercised.

Android interaction, physical devices, Windows/Linux interaction, two-device
Cloud, native picker cancellation, long locales, 320/360px layouts and the full
UI acceptance matrix remain unverified. Simulator/build success is not physical
hardware or tester availability. Release records must state deployment separately.

## Reset Save and archived coverage review - 17 October 2026

Settings > Classic and Modern saves includes Reset Save in both games. The
confirmation names the mode being reset and says that the other save is kept.
Cancel/Escape does not reset it. Confirmation closes the old runtime, fences its
late writes and atomically replaces only that mode's pointer using its own reset
policy. Receiving-device preferences, local purchase state and existing reset
speedrun rules are retained. The other mode, its Cloud receipt and recovery
sources remain unchanged. Final publication is attempted through the existing per-mode Cloud
path before the reset runtime opens; failed publication retains the durable local
reset for the existing Cloud retry/conflict flow.

The missing-button regression was already present in the archived paired-save
panel: comparing SettingsSurface.tsx and ModeSaveSettings.tsx between archive
`fb7470d4018ebfc5ffbb35c101abffc3cdde3844` and release `455c878c` produces no diff.
The archived SettingsSurface.test.tsx passes an unused resetSave mock and tests
export/slider flows. nativeHostBridge.test.ts invokes resetSave directly to test
persistence and failure; it does not operate the button. The mode entrypoint and
save-management tests assert paired exports/import/recovery, not reset availability.
The speedrun reset test covers reset semantics, not the Settings control. None
would detect this specific missing button. Other archived tests contain stale UI
expectations, so this review does not claim the old suite passes unchanged today.
The archive was inspected read-only, not restored or run as the current suite.

The approved save-safety suite now checks reset isolation, old-runtime fencing,
reset policy and interrupted reset publication. Button availability, confirmation,
Cancel and keyboard/focus are checked in the actual game rather than extending
the automated suite into UI tests. Verification details and native gaps are
recorded with the fix's QA evidence.

Actual-game verification for this fix used an isolated Chrome for Testing profile
with mock Keychain and the production two-mode entry point. Classic reset returned
to zero cash/bots while Modern retained its worker and earned cash. The Modern
confirmation named Modern; Escape cancelled without resetting and restored focus
to Reset Save; Enter reopened it; Shift-Tab wrapped within the confirmation.
Desktop English 100%/150% and German 130% were inspected. The paired-save panel
uses the existing stacked Settings composition so long action labels cannot
squeeze its explanation. Reset uses the released red Settings styling and shared
Button semantics. No new shared UI convention is proposed.

A disposable iPhone 16 Pro / iOS 26.4 simulator with the checked-in mature Classic
fixture exercised Modern reset, zero-progress Bots, and terminate/reopen. Classic's
canonical file was byte-identical before reset, after reset and after restart
(SHA-256 `3ce9d5b3cb197ade08ad13c94bf651012e7ded23a08297ac71fd156d195bfaa4`).
This is simulator evidence, not physical hardware or Steam Cloud sync evidence.

An immediate browser reload initially failed because the new production host had
not composed the existing same-tab reload writer identity. It now reuses that
helper for its three leased databases, preserving generation fencing and fresh
ownership for non-reload navigation. The same populated browser profile reopened
successfully after an immediate reload; no save/database cleanup was used.

The approved six-file suite passes 31 cases. Lint, localization, Classic integrity
and Web/native builds pass. The archived suite was not executed. Android/Steam
interaction, physical devices, real Cloud failure/sync, reduced motion, 360px with
130% text, and the full locale/scale matrix remain unverified. This source fix is
not itself a new internal deployment.
