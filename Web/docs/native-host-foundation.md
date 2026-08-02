# Native host foundation

The generated Capacitor and Electron applications package the same relative,
service-worker-free `dist-native` Web build. They preserve application ID
`com.blindsidedgames.idledysonswarm`; existing-install continuity additionally
depends on retaining the production signing identities.

## Release identity

`hosts/native-release.json` is the only hand-edited version source. It pins the
4.0.0 marketing version and a safe local release-candidate default. Run
`npm run native:release:sync` (automatically included in `build:native`) to
generate:

- Android `versionName` and ten-digit integer `versionCode`.
- Apple marketing version and Apple-valid `YYMM.DD.NN` build number.
- Electron marketing and ten-digit build metadata.

CI overrides the default with `IDS_RELEASE_CANDIDATE_ID=YYYYMMDDNN`. The sync
script rejects malformed dates, build IDs at or below the public Unity build
328, and values above Android's version-code limit.

## Signing boundary

Debug Android builds require no signing inputs. A Gradle task containing
`release` fails closed unless CI supplies all four protected Gradle properties:

- `IDS_ANDROID_KEYSTORE_PATH`
- `IDS_ANDROID_KEYSTORE_PASSWORD`
- `IDS_ANDROID_KEY_ALIAS`
- `IDS_ANDROID_KEY_PASSWORD`

Use `ORG_GRADLE_PROJECT_<name>` environment variables in CI so values never
appear in tracked files or command arguments. Android requires API 26 or newer.

iOS Debug remains automatic. iOS Release explicitly uses manual distribution
signing and consumes `IDS_DEVELOPMENT_TEAM` and
`IDS_PROVISIONING_PROFILE_SPECIFIER` as protected `xcodebuild` settings. The
tracked xcconfig intentionally contains blank placeholders, not credentials.

Electron packaging is unsigned at this foundation stage. The sandboxed,
context-isolated renderer has Node integration disabled, all Electron permission
checks and requests are denied, new windows are denied, and only HTTPS links
may be delegated to the operating system. The smoke test waits for the Web
runtime's ready signal rather than treating HTML load as application readiness.

## Runtime composition

The renderer selects its host before constructing a runtime graph. Website
builds create the browser composition and IndexedDB persistence. Electron and
Capacitor builds require their typed bridge and create the native composition
instead. Native save bytes use the rooted filesystem adapter, native lifecycle
events feed the canonical lifecycle coordinator, and an in-process single-host
writer fence preserves cancellation semantics without opening IndexedDB. The
existing `idle-dyson-swarm-runtime-ready` signal remains the package smoke-test
readiness signal.

Mobile lifecycle normalization treats `focus-lost` and `background` as the
reliable checkpoint opportunities. `terminating` remains best effort because
neither Android nor iOS guarantees a final process callback. Android Activity
recreation is explicitly not reported as termination; repeated callbacks for
the same phase are suppressed on both mobile hosts.

Native packages inject their Store and entitlement services, so the Store
route is honestly native-only. Capacitor binds StoreKit 2 and Google Play
Billing to all five canonical products; Electron remains fail-closed until its
desktop provider is implemented. Browser test entitlements and save-carried
purchase claims are never substituted. Mobile durable ownership is cached in
app-private native storage for offline continuity and refreshed from the Store
whenever possible.

## Branding

`npm run native:branding:sync` regenerates Capacitor launcher and splash images
from the approved Idle Dyson Swarm bot/PWA artwork. Electron Builder uses the
same PWA icon. Re-run the command after intentionally changing the PWA brand.

## Storage and migration

The Web runtime owns a separate `web-runtime-v1` save root. Capacitor roots it
in `Filesystem.Directory.Data`; Electron roots it below `app.getPath('userData')`.
Renderer bridges must reject absolute paths and parent traversal.

Electron exposes only root-relative Web-save IPC. Repository backup rotation
remains shared TypeScript behavior; publication crosses the host boundary as a
temporary-file rename. Diagnostics are allowlisted JSON below the same
application-owned root. Raw paths, directory enumeration, receipts, purchase
tokens and native Store objects never cross into the renderer.

Unity discovery remains read-only. Android and iOS probe the retained native
container, while Electron probes the canonical Unity locations on Windows,
macOS, and Linux. Unity originals are never deleted, renamed, or overwritten.

Capacitor can promote same-device Unity Double IP evidence because each native
plugin reopens the exact discovered file and verifies the native candidate
before updating its device-only entitlement cache. Electron deliberately does
not expose that promotion method yet. Its main process can bind an opaque
candidate ID to a canonical Unity path, but the Odin binary decoder currently
exists only in the renderer TypeScript graph. Trusting renderer-supplied
provenance, booleans, or hashes would turn a portable claim into purchase
authority. Electron promotion therefore remains blocked until the vetted Odin
decoder is built as a separately tested, main-process-only bundle; the preload
must continue to omit any promotion IPC until that gate is complete.

The first-party Capacitor plugin is registered as `IdleDysonNative` on both
mobile hosts. It supplies the rooted file primitives consumed by
`CapacitorPlatformSaveStorageAdapter`; writes and copies are flushed and
published through same-volume atomic replacement, while the portable
repository remains responsible for its three-backup rotation. Paths are
relative, traversal-checked and symlink-rejected before native I/O.

The same plugin exposes read-only automatic Unity candidates, normalized
lifecycle events, bounded platform metadata, a closed-vocabulary diagnostic
share and real mobile Store provider adapters. Detailed method, entitlement,
test-account and safety rules are recorded in `hosts/capacitor/README.md`.

## Local verification

From `Web`:

```text
npm run build:native
npm run native:electron:check
npm run native:electron:smoke
npm test -- --run scripts/sync-native-release.test.ts scripts/native-host-scaffold.test.ts
```

On Windows, `hosts/capacitor/android/gradlew.bat assembleDebug` must succeed
without credentials. An unsigned `assembleRelease` must fail with the protected
input diagnostic. iOS archive/signing validation remains a macOS CI and device
gate.
