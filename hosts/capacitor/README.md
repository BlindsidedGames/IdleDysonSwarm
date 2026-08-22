# Capacitor native boundary

`IdleDysonNative` is the first-party bridge shared by the generated Android and
iOS hosts. The Web runtime obtains it through Capacitor; browser builds never
receive these capabilities.

## Save ownership

The bridge exposes only rooted relative-path operations below
`web-runtime-v1`. Android uses the application internal files directory. iOS
uses `Documents/web-runtime-v1`, keeping the Web save separate from Unity's
historical save at the Documents root. Both implementations reject absolute
paths, traversal, empty path segments and symbolic links. Text payloads are
bounded to 32 MiB.

The portable save repository owns three-backup rotation. Native `copy` stages
and atomically replaces each backup; `replaceAtomically` publishes the already
flushed temporary save without a delete-then-move window. A platform that
cannot provide an atomic move fails the operation instead of silently
publishing a weaker write.

## Unity discovery

`discoverUnitySaveCandidates` is read-only and returns an opaque automatic
same-device candidate:

- Android reads `idle_dyson_swarm_save.txt` from the retained external-files
  application container.
- iOS reads the same file name from the retained Documents container.

Absolute native paths never cross the bridge. There is deliberately no method
that writes, renames or deletes the Unity source. In-place continuity still
requires the production application ID/bundle ID and signing identity.

## Lifecycle, metadata and diagnostics

The native single-renderer authority and its Android/iOS/Electron invariants are
documented in [the platform architecture note](../../docs/platform/native-writer-authority.md).

`currentLifecycle` plus `lifecycleChanged` normalize host state to `active`,
`focus-lost`, `background` and `terminating`. The durable checkpoint boundary
is `focus-lost`/`background`: mobile operating systems do not guarantee a final
termination callback. Android only emits `terminating` when its Activity is
actually finishing, not during configuration-driven Activity recreation. iOS
uses `willTerminate` as best-effort telemetry only. Duplicate native callbacks
are suppressed. `metadata` returns only the app version, build, platform and
locale.

`exportDiagnostics` accepts only a safe `.json` name, the JSON MIME type, a
64-KiB payload and the closed diagnostic key vocabulary. It writes a temporary
file and opens the native share sheet. It never exports a save, absolute path,
credential, receipt or arbitrary device log.

## Store boundary

The bridge preserves the five canonical Unity product IDs. Android uses Google
Play Billing 9.1 and iOS uses StoreKit 2. Native providers return opaque,
localized price strings. The three tip products are repeatable consumables and
have no gameplay effect; Google consumes them and Apple finishes them. Double
IP and Developer Options are durable products, acknowledged/finished only after
their verified ownership is cached. Purchase tokens, receipts and Store objects
never cross into the Web renderer.

The latest provider-verified durable ownership is cached in app-private native
storage so a previously verified benefit remains available offline. That cache
is not transferable and is never included in game exports. Android automatic
app-data backup is disabled; iOS uses a non-synchronizing, this-device-only
Keychain record. Live provider state is authoritative when available.
Developer Options' existing in-game unlock is a separate gameplay route and is
neither replaced nor written by the Store.

One compatibility exception is accepted only during automatic same-device
Unity migration. Native discovery reads Unity's retained `doubleip`
PlayerPrefs value and, only when it is affirmative, binds the native save's
SHA-256 to a one-use in-memory token. Promotion ignores renderer-provided
booleans, provenance, hashes and schema claims; it accepts only that token and
records its opaque ID, fixed native source/path class, native content hash and
promotion time. Manual or shared imports cannot mint the token. Save-carried
Developer Options and Double IP claims never grant ownership.

The Store adapters require the five matching products to be configured in App
Store Connect and Play Console. Google device testing requires the signed
package on a Play test track and a licensed tester. Apple sandbox testing
requires a Sandbox Apple Account on a real device; Xcode StoreKit configuration
may be used for local UI flow tests but is not release certification.

Real release certification requires an Android device updated from the signed
Unity package and an iOS device updated under the retained bundle identity.
Windows can statically verify both implementations and compile Android;
Swift/iOS compilation remains a macOS/Xcode gate.
