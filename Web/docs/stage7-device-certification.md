# Stage 7 dormant device certification

This gate exercises only the build-scoped `stage7-v2-certification` namespace.
It does not change `CURRENT_SAVE_SCHEMA`, open the certification repository at
normal startup, or activate the V2 runtime in a release build.

## Required matrix

| Matrix ID | Host | Required execution |
|---|---|---|
| `chrome-current` | Current stable Chrome and installed PWA | Automated browser gate |
| `android-api26-emulator` | Android 8.0/API 26 with its supported System WebView baseline | GitHub Android emulator |
| `android-api36-emulator` | Android API 36 and its current System WebView | GitHub Android emulator |
| `ios-current-simulator` | Current GitHub macOS iOS simulator and WKWebView | Unsigned GitHub simulator build and supported harness tests |

Physical-device behaviour is an explicitly unverified residual risk and is not
a completion gate. This certification workflow must not sign or upload an app.

Windows can build and statically certify Android. iOS compilation requires the
checked-in macOS/Xcode CI job. Store signing, Play tracks, TestFlight and store
credentials are deliberately outside this harness.

## Internal build

Run `npm run build:stage7-native-certification`. The command emits only
`dist-stage7-native-certification/public` beneath a separate asset root and
requires the compile-time certification
flag. It is not an input of `vite.config.ts`, `index.html`, `src/main.tsx`, or
the production Capacitor `webDir`.

For an Android debug certification APK:

1. Run `npm run build:stage7-native-certification`.
2. Run `npm run native:capacitor:sync:android` to refresh ordinary native assets.
3. From `hosts/capacitor/android`, run
   `gradlew.bat :app:assembleDebug -PIDS_STAGE7_CERTIFICATION=true`.
4. Never pass release signing properties. The resulting debug APK is not a
   publishable store artifact.

The flag adds the `.stage7certification` application-ID suffix. Install and
launch that separately named internal package to open the certification entry;
the ordinary debug application remains installed and continues to open its
production index. The iOS CI/manual build uses the matching separate bundle ID
and installs the verified certification `public` resource only after ordinary
Capacitor sync.

The Gradle property is the only path that overlays the certification
`public/index.html` and its relative worker assets. Without it, the ordinary
debug and release source sets contain only the production `public/index.html`.

## Physical-device script

For every manual matrix row, record every field exported by
`STAGE7_V2_DEVICE_EVIDENCE_FIELDS` in `deviceMatrix.ts`.

1. Install the internal certification build without uninstalling the prior
   test build. Record app, OS, WebView/WKWebView and worker identities.
2. Launch the ordinary app and confirm no certification worker or
   certification database/file is created. Then launch the separately suffixed
   certification package; it must show the idle certification entry with zero
   worker construction and no repository I/O.
3. Press **Run device certification**, then select Fast, Balanced,
   then Exact. Reload after each selection and confirm the preference remains
   installation-local and absent from portable export.
4. Run the certification action. Confirm the relative module worker reaches
   ready, checkpoint/readback succeeds, and process kill/relaunch resumes only
   the last durable checkpoint.
5. Background the app during work, return it, and confirm pause/Returned Time
   ordering and one-time credit. Repeat with forced process termination after a
   checkpoint and before acknowledgement.
6. Corrupt only the build-scoped current certification record. Confirm recovery
   chooses a verified backup. Confirm forward-schema/corrupt input never changes
   the last durable publication.
7. Exercise a long-offline value and the canonical `1e1000` fixture. Confirm no
   `Infinity`, `NaN`, locale text, narrowing, or main-thread worker fallback.
8. Optional residual-risk observation: before replacing build A, press
   **Record optional build A update baseline**. This
   atomically retains the trusted build identity, durable revision, Stored Time
   bank and portable-save hash in the certification namespace. Install build B
   over A without clearing certification storage, press **Run device
   certification**, then **Verify optional build B update observation**. The action must
   reject the same build, and succeeds only when B has a different trusted
   identity while the revision, bank and save hash exactly match A. Also confirm
   stale worker identity produces reload-required with bank/admission untouched.
   Native update-in-place continuity is not a completion gate without a
   physical-device operator; record any result as residual evidence rather
   than inferring cross-release worker continuation.
9. On a receiver where Developer Options is purchased but disabled, confirm the
   free-enable path is local. On an unowned receiver, confirm available Shards
   and Strange Matter debit atomically and lifetime ledgers do not decrease.
10. Confirm the device context shown/exported by the native certification bridge
    matches the actual API/OS and emulator-versus-physical device. Production
    packages must reject this debug-only bridge method.
11. Export bounded diagnostics, attach console/native crash output if present,
    record maximum chunk and atomic milliseconds, and mark the row PASS or FAIL.

API 26 and iOS 15 may use archived compatible WebView/WKWebView environments,
but the final Android and iOS rows must be physical current devices. Simulator
or emulator evidence never substitutes for a required physical row.
