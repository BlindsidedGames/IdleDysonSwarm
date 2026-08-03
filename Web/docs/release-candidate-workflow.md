# Native release-candidate workflow

`Prepare native release candidate` is a manual, private preparation workflow.
It never deploys the website, publishes a public store release, or introduces
cloud save synchronization. It runs only through `workflow_dispatch` on the
exact selected repository commit.

## Safe default

The default `package-only` mode uses standard GitHub-hosted Ubuntu, Windows,
and macOS runners. It builds:

- a pinned Web archive without deploying it;
- unsigned Electron Windows portable, macOS zip, and Linux AppImage packages;
- an explicitly unsigned Android release APK/App Bundle; and
- an unsigned iOS simulator application archive.

Every output contains `manifest.json` and `SHA256SUMS`, bound to the full source
commit, release-candidate ID, source commit timestamp, platform, and signing
profile. Manifests contain no wall-clock generation timestamp or credential
material. These records make a candidate traceable and independently
verifiable; they do not claim byte-for-byte reproducibility until a separate
two-build comparison proves that property. GitHub retains these candidate
artifacts for one day.

The Android release build still fails closed by default when signing properties
are absent. Only the package-only job passes
`IDS_ALLOW_UNSIGNED_RELEASE=true`; this produces non-publishable inspection
artifacts and cannot be mistaken for the signed bundle.

## Protected signing

Selecting `signed-packages` also enters the `native-release-signing` GitHub
Environment. Configure that Environment with required reviewers and restrict it
to the release branch before adding these secrets:

### Android

- `IDS_ANDROID_KEYSTORE_PASSWORD`
- `IDS_ANDROID_KEY_ALIAS`
- `IDS_ANDROID_KEY_PASSWORD`
- `IDS_ANDROID_KEYSTORE_BASE64`
- `IDS_ANDROID_KEYSTORE_CERT_SHA256`

The workflow never reads the tracked
`Assets/KeyStore/idledysonswarm.keystore`. It reconstructs the protected
keystore bytes under `RUNNER_TEMP`, checks the selected alias certificate
against the approved SHA-256 fingerprint, and removes the temporary file in an
`always()` step. Removing the historical tracked keystore and rotating or
confirming its upload identity remain external release gates; password
protection does not make a public repository an appropriate credential store.

### iOS

- `IDS_APPLE_CERTIFICATE_P12_BASE64`
- `IDS_APPLE_CERTIFICATE_PASSWORD`
- `IDS_APPLE_PROVISIONING_PROFILE_BASE64`
- `IDS_APPLE_DEVELOPMENT_TEAM`
- `IDS_APPLE_PROVISIONING_PROFILE_SPECIFIER`
- `IDS_APPLE_EXPORT_OPTIONS_PLIST_BASE64`
- `IDS_APPLE_KEYCHAIN_PASSWORD`

The certificate, profile, export options, and temporary keychain are created
only on the protected macOS runner and removed in an `always()` cleanup step.

### macOS

- `IDS_MAC_CERTIFICATE_P12_BASE64`
- `IDS_MAC_CERTIFICATE_PASSWORD`
- `IDS_APPLE_API_KEY_P8_BASE64`
- `IDS_APPLE_API_KEY_ID`
- `IDS_APPLE_API_ISSUER`

Electron Builder signs with hardened runtime entitlements and requests Apple
notarization. Missing signing or notarization inputs stop the job; the workflow
does not relabel an unsigned zip as signed.

## Private uploads

`private-upload` requires the additional confirmation checkbox, an explicit
`private_upload_destination`, the matching signed package, and approval of
`private-release-uploads`. The only implemented destination is `testflight`:

- `app-store-testflight` uploads the exact retained IPA through App Store
  Connect API credentials. Before credentials are exposed, it verifies that the
  downloaded manifest identifies the requested release ID, exact source SHA,
  iOS platform, release-signed profile, checksum, and exactly one IPA. It does
  not submit the build for public review.

Google Play internal and Steam private-beta uploads are external gates. The
workflow does not schedule placeholder jobs for either destination, so a
successful TestFlight upload cannot be followed by an intentional Play/Steam
failure that makes the run ambiguous. Add either destination only after its
upload adapter, protected Environment, private-track behavior, and recovery
procedure receive a separate review.

TestFlight requires `IDS_APP_STORE_CONNECT_KEY_ID`,
`IDS_APP_STORE_CONNECT_ISSUER_ID`, and
`IDS_APP_STORE_CONNECT_PRIVATE_KEY_P8_BASE64`.

## Required GitHub Environment configuration

Repository configuration is outside source control. Before enabling signing or
private upload, verify this exact checklist in **Settings -> Environments**:

1. Create `native-release-signing`. Restrict deployment branches/tags to the
   repository's release branch policy, disable administrator bypass where the
   account permits it, enable **Prevent self-review**, and add the Android, iOS,
   and macOS secrets listed above. If GitHub does not offer Prevent self-review
   for the current repository/plan, signing remains blocked until that control
   is available or an equivalent independent approval is documented.
2. Create `private-release-uploads` with the same release-ref restriction. Add
   required reviewer protection and enable **Prevent self-review**. If either
   control is unavailable, private upload remains blocked. This Environment
   contains no store credential.
3. Create `app-store-testflight` with the same release-ref restriction and
   required reviewer protection, with **Prevent self-review** enabled. If either
   control is unavailable, TestFlight upload remains blocked. Add only the
   three App Store Connect secrets listed above.
4. Do not create Play or Steam upload Environments yet. Their jobs do not exist
   until those adapters are reviewed.
5. Confirm forked pull requests cannot access Environment secrets, Actions has
   read-only default repository permissions, and no secret is duplicated as a
   repository-level variable or secret.
6. Run `package-only` first and inspect its manifests. Run `signed-packages`
   separately before authorizing a later `private-upload` to `testflight`.

The protected jobs install dependencies and prepare Web/native source before
any credential is placed in an environment variable or any Apple signing
identity is unlocked. Signing and upload steps then receive only the minimum
credentials they require, followed by unconditional cleanup.

Private upload success is not public-release authority. Play production,
App Store submission/release, Steam default-branch publication, and website
deployment remain separate manual decisions outside this workflow.

## External certification still required

Automation cannot replace:

- matching the Android upload certificate to Play Console;
- an Xcode archive and StoreKit sandbox purchase/restore run on the available
  Mac and physical iPhone;
- a Google Play internal-track install and Billing purchase/restore run on a
  physical Android device;
- Steam depot/upload configuration and a private-beta purchase/restore run;
- existing-install Unity-save migration checks on each platform; and
- final human review of checksums, store metadata, release notes, and rollback
  instructions.

No larger or paid GitHub runners are referenced. Actual GitHub Actions billing
still follows the repository visibility and the owner's current GitHub plan, so
the run should be cancelled rather than moved to paid runners if the account's
included allowance is insufficient.
