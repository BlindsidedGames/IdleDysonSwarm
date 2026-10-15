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
projection. 11 original files have documented infrastructure patches: drawer navigation,
mode-scoped presentation storage and the shared Window bridge type declaration.
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
not constitute visual acceptance. New copy has message IDs and English defaults;
production localization/catalog integration remains pending.

## Validation

- `npm run modes:check`: 681 source files verified, 11 documented infrastructure patches;
  Classic/fixture TypeScript compilation and **48 focused tests passed**.
- Root and Classic TypeScript compilation and `npm run lint`: passed.
- Production build, promotion catalog check, production store boundary and
  generated legacy-data compatibility: passed. `npm run build` initially hit
  the sandbox's `tsx` CLI IPC socket restriction. Executing the identical check
  scripts with `node --import tsx` and the Vite binary passed without a listener
  or protection change. Existing large-chunk warnings remain.
- Final aggregate suite: **228 files / 2,529 tests passed** (25.70 seconds).
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

1. Verify the **released** Apple build/source with authenticated read-only App
   Store Connect evidence. The existing session is expired; Matthew must restore
   it or provide equivalent release evidence. No account/authentication changes
   were attempted. If the released source differs from Google, preserve separate
   platform baselines or resolve that difference before selecting a common one.
2. Bind the implemented discovery/adoption ports to verified public/Unity/beta
   roots per host, preserving existing public/internal separation. Compose the
   exclusive writer lease/fencing across manifest, both sessions and host
   persistence. The development host deliberately supplies only synthetic roots.
3. Implement provider-specific mode namespace storage and old public Cloud
   discovery mapping, plus host purchase/account entitlement wiring. Only mocked
   Cloud adapters were exercised. Existing production providers are not enabled
   by this change, and no real Cloud or purchase write was performed.
4. Add player-facing pair-import/export and damaged-manifest recovery settings
   using the implemented labelled/conflict-safe APIs. The APIs retain both saves;
   complete production recovery/settings screens are not delivered here.
5. Run supported browser and native visual/interaction acceptance, localization,
   process-death upgrade/migration and real Worker cancellation checks with
   disposable roots and account/Cloud writes disabled. Loopback bind denial
   currently blocks browser pixels; no protection was relaxed. Native hosts,
   mobile/long locale/RTL, applicable UI scales and touch/keyboard remain
   unverified. Production localization/catalog integration is pending.
6. Keep each mode in a separate document or equally isolated host process/root
   with proven CSS/module-state disposal. Do not reuse a mode document after its
   preference scope has been revoked. Review any additional economy/reward
   mappings separately; existing conservative `keep` conversion is implemented.

Local foundation commits remain reviewable on the branch; no merge, push,
release or external communication is authorized by this report.
