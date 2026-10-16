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
Settings exports a normal standalone save for the current mode and imports only
into that mode. The other mode's save and Cloud receipt are preserved. Classic
saves imported into Modern still migrate automatically, without creating or
replacing a separate Classic save. Paired exports are rejected by Settings;
the pair format remains internal to atomic storage transactions and recovery.
Settings offers Import Save, Export Save and Reset Save; the Recover mode saves button was
removed at Matthew's request on 17 October 2026. Retained checkpoints and the
startup-failure recovery action remain available.

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

## Current-mode import/export - 17 October 2026

Import Save and Export Save now use only the mode where Settings was opened.
Exports are normal standalone save strings/files, without a paired-save wrapper.
Import review names Classic or Modern, and confirmation is bound to the reviewed
text, receiving mode and save generation. Imports preserve the other mode's
checkpoint and Cloud receipt. The approved save-safety suite still has 31 cases;
its existing import case now also covers importing into Modern when no Classic
save exists, rejecting paired exports at the Settings preparation boundary, and
retaining the inactive mode's Cloud receipt. The controller export check verifies
that the owning runtime supplies the shareable snapshot without replacing the
running session; rejected input also leaves that session current.

Actual-game checks used a disposable development host with private in-memory
storage: Classic and Modern standalone exports, paste import/review/confirmation
in both modes, the checked-in schema-08 Classic file, Modern-to-Classic rejection,
and Classic-to-Modern automatic migration. A mature Classic import left Modern at
zero bots/workers/IP; the later Modern import left Classic's earned IP and worker
progress available. English desktop and German 360px Settings were inspected,
including keyboard reachability of the final save control. The shared Settings
composition and existing controls retain the Infinity settings reference; no new
layout exception is introduced. Native hosts, native picker cancellation, real
Cloud sync, enlarged text and the full Interface-size/locale matrix remain
unverified for this change.

The current-mode Export Save dialog also retains the existing Timestamp export
filenames checkbox. Its preference is stored in the receiving mode's presentation
namespace, and both browser and native downloads use the existing UTC filename
formatter. Browser downloads were checked with the setting on and off, and the
setting survived reopening the dialog. Native picker interaction remains unverified.

The follow-up comparison with the original Settings flow restored the runtime's
shareable-save export boundary, including its immutable pre-Stored-Time snapshot
metadata. Local save bytes are not used as the player export, and opening Export
no longer tears down/reopens the game. Both modes provide import progress through
their own codecs (IP, QP and Skill Points), using the current mode's number notation.
Invalid input is rejected before closing the running graph. Confirmed imports use
the existing final Cloud publication hook before reopening the receiving mode.

Export now reads each owning application's validated transfer snapshot directly,
without requiring a storage checkpoint. This keeps backup export available after
a browser writer lease expires; it does not restore write authority. A disposable
game was checked with a deliberately expired lease and a confirmed failed
checkpoint: its standalone export, clipboard and fixed/timestamped file downloads
still succeeded. The open player tab was then reopened and downloaded its save
successfully. The failure setup and diagnostics were removed after verification.

The dialog reuses the existing copy/download success messages, file-input limits,
platform download availability and UTC filename formatter. It carries the Settings
theme and Interface/text scale across the frame boundary. Keyboard navigation
includes the timestamp checkbox, skips disabled controls and wraps within the
dialog. Closing/cancelling returns focus to the live Settings control even when
review replaced the game document; an immediate migration notice owns its own focus.

Follow-up actual-game checks used only the disposable in-memory browser host:
unchanged iframe/session across export in both modes; clipboard contents matching
the displayed string; a real timestamped download; invalid-input rejection without
session replacement; mature Classic and Modern file previews; cancellation and
successful-import focus restoration; a legacy Classic import into Modern with
keyboard focus inside its migration notice; and a Classic export still showing
zero IP/bots after the Modern imports. Enabling host Developer Options and then
decoding the shareable export confirmed that local developer flags were absent.
Desktop English 80%/100% and German 150%, plus German 360x800 at 150% Interface
size, were inspected; the smallest measured action target was 44px high. Copy
feedback, the timestamp checkbox and all three export actions were reachable.
The browser clipboard was restored and generated downloads were removed after QA.

All 31 approved save-safety cases, Classic integrity, lint and the production
build pass. Physical/native picker interaction, real two-device Cloud sync, a
live Stored Time worker export, 130% text enlargement and the remaining full
scale/locale matrix are not claimed by these browser checks.

The subsequent [4.1.10 export comparison](save-export-4.1.10-comparison-2026-10-17.md)
identified that the timestamp checkbox still missed the shell-scoped custom
appearance, despite its Settings row class. The shell and parent dialog now load
the shared checkbox rules. Checked/unchecked styles match the real Settings
references in both modes, including each mode's mobile square size. The export
buttons also retain the old 52px Settings / 48px dialog desktop dimensions at
100% scale, with responsive wrapping and minimum touch targets preserved.
