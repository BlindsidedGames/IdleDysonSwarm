# Classic and modern foundation — 15 October 2026

## Status and scope

Implemented locally on `codex/classic-modern-foundation-20261015`, based on
`c7c81ec176e0c00c75dace25a031b10d38ec589c`, in
`/tmp/ids-classic-modern-foundation`. Shared main was clean and has not been edited.
No push, merge, release, store mutation, permission change, community message or
real-save launch was performed.

**This is an executable, tested foundation, not an activated public upgrade.**
The current beta host composition and its native/browser isolation policies remain
in force. The new drawer control appears only when a verified host supplies the
mode-controller context. See the remaining activation gates below.

## Mobile public baseline evidence

| Platform | Fresh read-only evidence | Source conclusion |
| --- | --- | --- |
| Google Play | Existing authenticated Safari Production console, 15 October 2026 UTC: **Active Latest release: 4.1.10 (2026092801)**, 178 countries/regions. This was Production, not Internal testing. | `/Users/matthewrushworth/Builds/ids-release-2026092801/RELEASE.md` records exact source `0dde63fbaad175362df49feeb981f85dc6af4a5e`, AAB SHA-256 `ce69b801ba42a0e9b069c4b7380e0b114f2ee5bcf345a5c0f3731860154d10e1`. The repository release ledger records the same candidate's later production review submission. |
| Apple | Public App Store listing shows **4.1.10**, dated 1 October. App Store Connect redirected to login with `authResult=FAILED`; the released build could not be freshly read. | The 29 September ledger records submitted build **2609.29.01** (displayed **2609.29.1**) with all 294 gameplay assets matching the Android candidate. This is submission evidence, not confirmation of the exact currently released Apple build. **Apple public source remains unverified.** |

Sources:

- [Google Play Production console](https://play.google.com/console/u/0/developers/8315705273233616064/app/4975918856678556086/tracks/production).
- [Apple public listing](https://apps.apple.com/us/app/idle-dyson-swarm/id1631060225).
- [Release ledger](../platform/release-ledger.md), 2026092801 and 29 September entries.
- Local Apple submission archive/upload evidence is retained under
  `/Users/matthewrushworth/Builds/ids-submission-20260929/`.

The `classic/` package is therefore explicitly labelled **Google-public verified,
Apple-submission candidate**. It is not an invented common mobile baseline.
Main/internal source `c7c81ec1`, Play Internal `2026101502`, TestFlight `2610.15.2`
and Steam beta `25952495` are modern rework identities. Steam public `25569496`
was not used to establish either mobile public identity.

## Implemented separation

`classic/` retains 681 production source/identity files from the exact Play source,
including its own game data, schema/decoder, command handlers, simulation engine,
Reality, Quantum, Simulations, offline policy, Stored Time worker and frontend
projection. Only two original files have local patches: the drawer shell and its
CSS, for shared mode navigation. `baseline.json` preserves every upstream hash
and records those patches separately. `npm run modes:check` verifies them.
The candidate compiles independently. Maintaining two source graphs is deliberate:
a modern gameplay refactor cannot silently change Classic's old consumers.
Classic's SR Workers consumers are unchanged; the modern augment target gap is
not retargeted or rebalanced.

`createClassicModeSession` and `createModernModeSession` each construct their own
runtime/application/worker graph. They share transport and lifecycle protocols,
not gameplay implementations. The local adapters have no native bridge, IDB,
Cloud, account, achievement publication or purchase service. Their working
repositories are memory maps; each primary publication must pass through the
owning mode controller and durable mode store. Raw per-runtime imports are
rejected in favour of the labelled mode-import boundary.

`GameModeController` serializes transitions. The outgoing graph receives a real
terminating lifecycle receipt, settles active time, checkpoints and tears down
its listeners, scheduled work and worker owner before the next graph opens.
Late callbacks lose their session fence. Detach callbacks allow a host to unmount
all old presentation state before mounting the next graph. A failed checkpoint
blocks selection and preserves the durable save. The first real-runtime test
caught missing departure stamping; the adapter fix now credits the inactive
Classic interval exactly once in that test.

## Save protocol and startup

`ModeSaveStore` accepts the existing rooted `SaveStorageAdapter` and a mandatory
host authority assertion. One host writer lease must cover the manifest and both
mode graphs; storage mutations must retain the underlying platform's fencing.

- Classic and modern have distinct payload namespaces, mode-specific validators,
  four bounded reusable checkpoint slots each, and SHA-256 integrity checks.
- Slots referenced by the current manifest, previous manifest or pinned
  pre-migration Classic source are never overwritten. Unreferenced slots are
  reusable, so normal autosaves do not grow storage indefinitely.
- A verified temporary manifest is atomically replaced only after all payloads
  are retained/read back. The previous manifest is copied for explicit recovery.
- Interrupted conversion/publication leaves the previous complete selection or
  the new complete pair. Lost acknowledgements are resolved by reopening the
  manifest. There is no automatic fallback to an older selection that could hide
  a migrated save. Missing/corrupt selection data blocks startup instead of
  classifying the player as new.
- First startup requires an explicit complete-discovery inventory. The host must
  inspect public current/backups, Unity legacy candidates, beta storage and Cloud
  availability before attesting completion. Unreadable/unavailable discovery is
  not absence. Existing Classic takes priority; an existing modern-only beta is
  retained; only a proved new installation defaults to modern.
- Each save owns its own active/departure timestamps and offline bank. Switching
  settles the departing mode, and reopening uses that mode's own offline rules.

Labelled pair exports contain both current saves and the active selection, with
integrity hashes. Imports validate both slots before publishing either; conflicts
require approval for an exact generation and stale approval is rejected. Existing
local pinned migration evidence remains retained across an import. Portable pair
exports carry the current two saves, not the entire local checkpoint history.
Recovery UX for a damaged manifest remains a host integration task; underlying
current, backup and pinned payloads are preserved.

## Migration policy and conflict handling

There is exactly one conversion API, Classic → modern. It preserves Classic,
pins its source snapshot, and refuses **any** existing modern destination. The
UI then offers continuing that modern save; it has no migration-overwrite button.
Returning to a preserved Classic save is a normal selection, never reverse
conversion. Classic's own decoder rejects modern saves.

The controller requires the host to choose a conversion policy explicitly.
`convertClassicUsingExistingKeepPolicy` reuses the existing rework `keep` mapping;
it invents no currency, rewards or augment changes and never processes offline
time. This mapping still retires the modern Quantum bank/old automatic Reality
and Avocato paths according to the existing rework rules. Original Classic
progress remains available in Classic. The two-mode product flow still needs a
reviewed decision on whether that exact existing mapping is the desired migration
contract, including how old challenge restrictions and no-modern-consumer rewards
should be described. No new compensation or replacement target was invented.

## UI review hook

Both drawer shells have the same optional bottom control. It reuses the Infinity
bottom-settings composition: visible mode button below options that expand
upward, shared `Button`, existing panel/theme colours and body/control roles.
Touch minimums are explicitly at least 44px (48px for coarse pointers), independent
of the root Interface scale. Confirmation states explain source retention and the
one-way rule; existing destination conflict, pending and failed/recovery states
are implemented. DOM tests cover these interactions and button semantics.

No new palette, artwork, specialist screen convention or economy text convention
is approved here. This is a composition of existing primitives under the user's
implementation authorization; final visual acceptance remains pending.

`npm run modes:ui` uses the existing isolated Chromium harness (including
`--use-mock-keychain` on macOS), a loopback-only Map-backed UI fixture, and blocks
non-loopback requests. It never constructs a gameplay or account graph. This
executor rejected binding `127.0.0.1:5196` with `EPERM`; no security flag,
permission escalation or protection change was used to enable the preview.

Consequently **pixels/reference comparison remain unverified** at desktop
80/100/130/150% Interface sizes, mobile 360×800/130% text, 320px/enlarged text,
landscape, long locale/RTL, reduced motion, real keyboard/touch and native hosts.
The browser script and fixture are retained for a supported host. DOM checks do
not constitute visual acceptance. New copy has message IDs and English defaults;
production localization/catalog integration remains pending.

## Validation

- `npm run modes:check`: 681 source files verified, two documented chrome patches;
  Classic/fixture TypeScript compilation and **28 focused tests passed**.
- Root TypeScript compilation and `npm run lint`: passed.
- Production build, promotion catalog check, production store boundary and
  generated legacy-data compatibility: passed. `npm run build` initially hit
  the sandbox's `tsx` CLI IPC socket restriction. Executing the identical check
  scripts with `node --import tsx` and the Vite binary passed without a listener
  or protection change. Existing large-chunk warnings remain.
- Final aggregate suite: **224 files / 2,509 tests passed** (24 seconds).
- Synthetic real-runtime tests cover new-modern startup, actual reverse-codec
  rejection, mature Simulations/late Quantum Classic state, old Quantum commands,
  graph disposal, one-way migration/source retention, active time settlement and
  offline time without duplicate credit.
- Transport/controller tests cover both discovered saves, restarts, repeated
  switches, late callbacks, failed final checkpoint, conversion failure, all four
  migration mutation interruption points, lost acknowledgement, destination
  conflicts, pair import/export, stale import approval, damaged data, bounded
  rotation, pinned source retention and host authority loss.
- OS/native launches, real accounts/Cloud, purchases, browser Worker-in-flight
  switching and full legacy gameplay/balance playthroughs were not exercised.

## Activation gates and next work

1. Reauthenticate App Store Connect and verify the **released** Apple build and
   source. If it differs, preserve per-platform Classic baselines or resolve the
   difference explicitly before selecting a common baseline.
2. Implement read-only historical save discovery and attested upgrade adoption
   for each host, preserving originals and existing internal/public separation.
   Do not point the retained historical Classic bootstrap at a live save.
3. Compose the common host writer authority, mode controller and separately
   mounted UI/document roots. Scope device preferences, route/disclosure state,
   downloads and departure markers per mode; isolate CSS/global presentation
   effects as well. The current foundation fences gameplay and callbacks but
   **does not claim complete UI preference isolation in a production host**.
4. Add pair-import/export settings/recovery UX and mode-specific purchase/account
   policy. Decide Cloud naming, publication, merge/conflict and cross-device
   restore semantics before enabling either mode's Cloud publisher.
5. Review the explicit existing `keep` migration policy. Approve any additional
   mappings/rewards as product work; do not silently invent them.
6. Run supported browser and native visual/interaction checks, localization,
   process-death upgrade/migration tests and real Worker cancellation checks with
   disposable save roots and account/Cloud writes disabled. Then review locally.

No merge, push, release or external communication is authorized by this report.
