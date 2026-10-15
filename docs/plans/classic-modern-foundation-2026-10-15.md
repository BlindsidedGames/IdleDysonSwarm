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
projection. 14 original files have documented infrastructure patches: drawer navigation,
mode-scoped presentation storage, shared Window bridge typing, parent-owned save
settings, shared mode-chrome localization and isolated-development telemetry.
Gameplay data and engines are unchanged. `baseline.json` preserves every upstream
hash and records patch reasons/current hashes separately. `npm run modes:check` verifies them.
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

## Upgrade adoption, presentation and Cloud continuation

The follow-up closes independently implementable composition gaps without opening
any public storage or real Cloud account:

- `upgradeDiscovery.ts` reads host-supplied public current/backups, retained legacy
  recovery, Unity candidates and separate beta roots through read-only ports.
  Corrupt primary data may recover from its own valid backup; future schema and
  unreadable/unknown sources block first-run classification. Distinct local/Cloud
  sources need an explicit choice. Older same-device Unity data cannot supersede
  a canonical public save. Every original byte string is archived/read back, and
  discovery is rechecked immediately before atomic adoption. Hosts still must
  supply verified real roots and their writer authority.
- Presentation services and direct UI preference helpers use revocable,
  mode-prefixed storage. This covers notation, locale, Research visibility,
  navigation text, disclosures, skill UI keys and recovery reload flags. Existing
  normal hosts retain their existing storage behavior. A mode document leaving
  its scope gets a revoked no-op storage port rather than falling back to public
  localStorage. Each actual development session receives a **fresh iframe
  document** so CSS, module singletons and route/component state are discarded.
  Reusing one document across sessions is not a supported composition.
- `createModeHost` composes discovery, durable selection, controller and optional
  Cloud coordinator. Cloud uses separate `idleds-classic-v1` and
  `idleds-modern-v1` adapters, separate serializers/backup recovery, per-mode
  conflict choice, durable acknowledgement receipts and publication gates.
  It preserves the locally earned debug purchase, strips device ownership claims,
  waits for the departing graph's final Cloud checkpoint, and rejects stale
  callbacks or changed remote input. Failed optional reads/acknowledgements after
  a durable choice keep local play available with publication paused. Receipt
  retries never reimport over later local progress. Pair exports omit these
  device-local Cloud receipts. Distinct mock objects prove coordination behavior,
  not actual provider namespace support.

The actual App integration is opt-in development-only:
`VITE_IDS_DUAL_MODE_FOUNDATION=1`, a loopback hostname and no native bridge are all
required. The branch runs before account/store/public persistence startup. The
parent owns private Map-backed saves/preferences; each child dynamically mounts
its corresponding independent App and runtime graph. `?classic=1` seeds a fresh
synthetic Classic installation, otherwise a fresh synthetic modern installation
is used. Reloading the parent deliberately resets scratch saves. This is not a
persistent production upgrade or a release switch. Production build inspection
confirms neither Classic nor this development graph is emitted.

Parent-owned status/retry remains available when a child fails or times out. A
failed iframe and bridge are removed; retry reopens the saved selection rather
than manufacturing another save. Controlled jsdom bridge tests verify this,
foreign-caller rejection and revoked old contexts without executing iframe game
scripts or launching a browser. Real Apps are also mounted in-memory to exercise
the bottom drawer through Classic → modern → Classic, retaining both saves and
resetting disclosure state. Public localStorage is a throwing tripwire in these
tests; no real-save/account/Cloud capabilities are supplied.

An independent read-only correctness review found and prompted fixes for local
availability during Cloud failure, Cloud dedup after a new download, final
checkpoint ordering, local debug purchase retention, legacy recovery discovery,
and recovery controls after child teardown. A final pass found one postcommit
Cloud revalidation failure that could still block local play; it is now inside
optional completion with a dedicated regression. Native/provider behavior and
visual acceptance remain outside this review's evidence.

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
progress remains available in Classic. The development migration uses that explicit existing policy and describes the
copy as compatible progress. Any additional rewards, replacement targets or
changes to old challenge restrictions require a separate product decision. No
new compensation or replacement target was invented.

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
not constitute visual acceptance. All 40 shared mode messages are extracted and compiled through the existing
catalog pipeline for English, all seven production translations and both
pseudo-locales. Classic overlays only `modes.*` chrome entries and retains its
original gameplay catalog. Actual-entrypoint DOM coverage changes Classic to
French and returns to an independently English modern save. Language review and
pixel/overflow acceptance remain pending.

## Integrated host bindings and settings

The real `main.tsx` development branch now composes the host adapters, optional
Cloud coordinator, independently selected App/runtime and parent-owned save
manager. This goes beyond invoking a renderer fixture:

| Binding | Implemented and exercised | Deliberately inactive external surface |
| --- | --- | --- |
| Browser | Existing `IndexedDbSaveStorageAdapter` and expiring writer lease. Public and beta database names/paths are explicit read-only discovery sources; only `idle-dyson-swarm-dual-modes-v1` gets a writer. Reopened adapters retain both saves; competing leases and stale writes reject. Development supplies private database-protocol Maps. | The development path never selects the ambient/global IDB factory or opens real browser profiles. Real browser persistence/lease timing is not visually or operationally accepted here. |
| Electron | Existing rooted native adapter and single-renderer authority, plus `hosts/electron/modeStorage.mjs` with distinct, nonoverlapping roots, read-only historical capabilities, safe relative paths, symlink rejection and fsynced writes/atomic rename. A canonical `mkdtemp` fixture verifies actual filesystem reopen and untouched historical files. | Existing beta IPC/bootstrap is unchanged. No `userData`, Steam account root or public filesystem capability was selected. Production root registration/attestation is an explicit activation step. |
| iOS/Android | Existing Capacitor rooted-file protocol bound to separate destination/public/beta capabilities and the host writer authority; the same bindings run against private native-file Maps in development and tests. | No Capacitor plugin/native process was launched, re-rooted or connected to a device. The current beta-only bridge cannot substitute for the required three attested capabilities. Native registration, lifecycle and document-picker acceptance remain gated. |
| Cloud | Account/namespace-scoped provider adapter, durable local receipts, guarded compare/publish and account-change rejection. Steam's existing file transport has explicit Classic/modern subdirectories and separate local markers. Old public Cloud primary/backups are read without acknowledgement/marker writes. Raw upgrade discovery includes acknowledged primaries and backup-only progress. | All services/accounts are mocks or synthetic filesystem fixtures. Existing published Steam Auto-Cloud rules are nonrecursive and do **not** include the new subdirectories; cross-device availability is not claimed. No provider account, Steamworks setting or store mutation occurred. |
| Transfers | Existing browser download adapter and native `writeClipboardText`/`exportSaveFile` protocol. Native exports keep the existing allowlisted filename `idle-dyson-swarm-save.idsw`; labelled contents distinguish playable pair exports from forensic archives. Cancelled pickers are not reported as saved. | Native picker/clipboard effects are private mocks in development. No native filename/path whitelist was expanded and no real native file/clipboard export was invoked. |

Development selects the concrete adapter with `?host=browser` (default),
`?host=electron`, `?host=ios` or `?host=android`. These select disposable host
protocols, not native applications. The selected mobile profile uses its own
mode's mobile lifecycle policy. `?classic=1` seeds a fresh synthetic public
Classic source; `?cloud=classic` or `?cloud=modern` seeds a fresh mock remote.
The developer toolbar can simulate a remote conflict or restart the selected
saved game. All this requires the development flag, loopback hostname and absence
of a real native bridge. Reloading the parent resets the scratch installation.

Both actual Settings screens replace their single-runtime transfer controls with
labelled pair import/export/recovery when a mode host is present. The manager
lives in the parent, so quiescing/replacing a child cannot lose an export or
approval. Imports pause/checkpoint before preview, invalidate approval on edited
input and require explicit replacement for the reviewed generation. Missing
modes in an import remain retained; unlabelled saves and recovery archives cannot
enter this pair-import boundary. A Cloud choice can overlay a transfer without
losing its draft or pending operation.

Recovery never silently adopts an older manifest. The player first reviews a
verified retained checkpoint, then explicitly restores its exact source identity.
Raw damaged/newer manifests and payloads are retained in content-addressed
archives with a durable index before replacement. Later slot rotation does not
remove that history from recovery exports. Evidence-only `IDS-MODE-RECOVERY-1`
exports salvage readable sources and report missing/damaged index/files as
per-source errors; invalid index paths are never followed. Partial evidence is
labelled in the dialog. `IDS-MODE-EXPORT-1` remains the separate playable format.

Shutdown cancels pending choices, fences further management requests and aborts
pending frame startup before draining the controller and releasing the host
writer. The returned host handle is available during startup; `main.tsx` installs
its page-hide handler before awaiting readiness. Failed teardown prevents any new
graph or save mutation until the host is reopened. Ambient development telemetry
is disabled under this experiment flag, so the actual game cannot emit its usual
loopback telemetry POSTs from disposable mode sessions.

The parent manager reuses the existing Settings palette/dialog, semantic roles,
shared buttons, applicable frame font/text scale, locale direction and CJK font
families. It has keyboard focus containment and visible file/string controls.
These are code/DOM checks, not accepted pixels. All native/visual states listed
above remain unverified; no new shared design convention is asserted.

## Validation

- `npm run modes:check`: **681 baseline files / 14 documented infrastructure
  patches**, independent Classic compilation and **68 focused tests passed**.
- Root TypeScript build and lint: passed, **no lint warnings**.
- Final aggregate suite: **231 files / 2,549 tests passed**. This includes real
  mode engines, actual App/settings and actual main/frame bootstrap coverage.
- Actual entrypoint test: new Modern → Classic → Classic Settings in French →
  Modern in English → parent pair export after child replacement. The test runs
  real bootstrap functions against jsdom frame documents, with public storage,
  IDB opening and network as throwing tripwires. Vitest's public `jsdom.window`
  normalizes its parent-window proxy; production security checks are unmodified.
  jsdom does not execute browser-loaded module scripts or prove isolated JS/CSS
  realms/pixels. Real Worker cancellation still needs supported host QA.
- Existing legacy tests retain mature Simulations/Quantum, Classic commands,
  active/offline settlement and no duplicate credit. This continuation adds
  concrete host adapter reopen, account/namespace, real file transport, backup-
  only first discovery, pair/settings/recovery, live locale and shutdown checks.
- Independent read-only review prompted fixes for indexed recovery retention,
  salvage export, failed teardown fencing, atomic mock CAS, locale-load fallback,
  parent theme scope, backup-only discovery and close during a pending choice.
  Its final pass found no remaining concrete issues in those fixes.
- Negative controls demonstrably failed for the intended reasons when removing
  the teardown fence, atomic provider compare/publish, telemetry isolation and
  pre-close choice cancellation. Backup-only discovery also failed before its
  repair (incorrectly selecting fresh modern). Restored code passes.
- Production build, promotion catalog, Store boundary, legacy generated-data
  compatibility and translation completeness/ICU checks: passed. Production
  manifest inspection excludes Classic and development mode graphs. Check
  scripts use `node --import tsx` to avoid the sandbox's `tsx` IPC listener; no
  protection change is involved. Existing Vite large-chunk warnings remain.
- No browser server, OS/native game, real account, real save root, purchase,
  external Cloud, release or deployment was used for this continuation.

## Bounded activation and acceptance checklist

1. **Apple baseline evidence.** Matthew must restore the expired authenticated
   App Store Connect session or provide equivalent read-only evidence of the
   released build/source. Do not substitute internal/TestFlight or submission
   evidence. If Apple differs, preserve per-platform Classic sources or explicitly
   resolve the difference before selecting a common baseline.
2. **Production host registration.** Keep the current beta-only roots/IPC intact.
   Before enabling this path, each host must supply the implemented bindings with
   attested public/Unity/beta read-only sources, a separate account-scoped dual-
   mode destination and the existing exclusive writer/lifecycle authority. The
   callable adapter/file-root bindings are implemented; production native bridge
   exposure/root selection remains intentionally unregistered. Verify this on
   disposable native/browser installations before connecting any real root.
3. **External Cloud availability.** Validate each real provider's namespace,
   account switch and conditional-publication semantics with isolated test
   accounts. Mobile hosts without a Cloud provider remain local-only. Steam
   requires separately reviewed/published rules for its new subdirectories;
   existing nonrecursive public rules are unchanged. Do not advertise cross-
   device availability until tester evidence exists. Store/provider mutations
   need a separate authorization.
4. **Native and browser acceptance.** On a supported executor, use disposable
   profiles/roots, disabled real account/Cloud writes and mock Keychain on macOS.
   Verify module-loaded frames, native process death during adoption/import/
   recovery, in-flight Worker cancellation, mobile lifecycle replay, writer loss,
   native picker cancellation and large export limits. The loopback bind denial
   has not been retried or bypassed; native plugin registration/compilation and
   OS file-picking were not exercised here.
5. **UI/localization acceptance.** Compare bottom controls and save dialogs with
   Infinity/Settings at desktop 80/100/130/150%, mobile 360×800/130% text, 320px,
   landscape, long locale/RTL and reduced motion. Check actual targets, last
   control reachability, keyboard/focus, touch meaning, overflow and copy. All
   production/pseudo catalogs compile; language review and pixels remain open.
6. **Migration scope.** Compatible progress uses the existing explicit `keep`
   conversion. Classic-only progress stays playable in Classic. No additional
   rewards, augment targets or compensation were invented. A different mapping
   is a separate concrete product decision, not a blocker to this foundation.

The implemented development path is reachable for both games and settings. Real
native roots/accounts, cross-device Cloud, OS lifecycle/pickers and accepted
pixels are not reachable under the current safe gate. Both engines remain
independently maintained; there is no modern → Classic conversion.

Local work stays on `codex/classic-modern-foundation-20261015` in
`/tmp/ids-classic-modern-foundation`, preserving `a8d8bd1d` and `1d2ab1c1`.
No merge, push, release or external communication is authorized by this report.
