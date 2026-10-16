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
