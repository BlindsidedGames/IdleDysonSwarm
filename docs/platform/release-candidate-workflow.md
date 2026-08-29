# Local release workflow

Idle Dyson Swarm releases are built and signed on the release Mac. GitHub
Actions verifies committed source on pushes and pull requests; it does not
hold store credentials, sign native packages, upload to Apple or Google, or
prepare website promotion pull requests.

## Release targeting and reporting

Android, iOS, and Website are independent release targets. Build, upload,
processing or review, tester availability, production deployment, and live
verification are distinct states; do not describe an earlier state as a later
one. Only prepare, upload, deploy, or publish a target when that target is
explicitly in the requested release scope.

The Website beta is intentionally paused. Restoring or replacing the deployed
`/play/` package is a product decision, not an automatic consequence of a
native release. Call out that effect before preparing a Website promotion and
proceed only when Website publication was explicitly requested.

## One-time local setup

Android uses the existing Google Play upload key, stored outside the repository
at:

`~/Library/Application Support/Blindsided Games/Idle Dyson Swarm/signing/idledysonswarm.keystore`

The keystore and key passwords are stored in macOS Keychain under account
`idledysonswarm` and these services:

- `com.blindsidedgames.idledysonswarm.android.keystore-password`
- `com.blindsidedgames.idledysonswarm.android.key-password`

The release JDK is Java 21 at:

`~/Library/Application Support/Blindsided Games/Idle Dyson Swarm/java/jdk-21.0.12.1+1/Contents/Home`

The command uses the Android SDK at `~/Library/Android/sdk` unless
`ANDROID_HOME` is already set.

The upload certificate SHA-256 fingerprint must remain:

`05:11:97:07:BB:6F:02:26:4C:0E:D3:76:AD:33:30:60:5F:55:F6:26:74:AC:25:FD:BA:D8:2F:D9:8A:C4:4B:9A`

This matches Google Play Console's **Upload key certificate**. Do not convert,
replace, commit, or upload the private keystore. The historical JKS format and
SHA-1 certificate signature are compatibility properties of the established
upload identity, not reasons to rotate it during an ordinary release.

## Prepare a release locally

Start from a clean checkout at the exact commit intended for release:

```bash
npm run release:local -- --release-id <YYYYMMDDNN>
```

Add `--clean-install` when dependencies must be rebuilt from the lockfile. The
default reuses the installed dependency tree to keep routine releases fast.

The command:

1. validates the release ID and clean checkout;
2. runs deterministic tests, lint, message-catalog checks, Web build, and the
   Electron process-boundary check;
3. builds native-relative assets once and synchronizes Capacitor;
4. reads Android passwords from Keychain without printing them;
5. creates a signed AAB under `output/local-release/<release-id>/android/`; and
6. records a source-bound manifest and SHA-256 checksum beside the AAB.

Android signing values are passed to Gradle through the child process
environment. They are not command-line arguments, repository files, GitHub
secrets, or build logs. A release build still fails closed if any protected
value is absent.

Use `--android-only` when the current job only needs the Play artifact. Without
it, the command also synchronizes the local iOS project.

## Apple release

Open `hosts/capacitor/ios/App/App.xcodeproj` in Xcode, confirm the
`com.blindsidedgames.idledysonswarm` target and the expected release ID, then
use **Product > Archive**. Validate and upload the archive through Organizer.
Automatic signing and the provisioning profile are owned by the local Xcode
account; they are not reconstructed in GitHub.

Uploading to TestFlight is not the same as submitting for review or releasing
to production. Report the archive, upload, processing, and tester-availability
states separately.

## Google Play release

Verify `manifest.json` and `SHA256SUMS`, then upload the generated AAB directly
to the intended Play track. Never reuse an Android version code. Report upload,
review/processing, and tester availability separately; a successful local
build does not mean the release is live.

## Website promotion

Skip this section for Android-only or iOS-only work. A Website promotion
restores or replaces the public `/play/` package and therefore requires the
explicit Website scope described above.

To prepare the website package in the same local run, pin the exact website
commit:

```bash
npm run release:local -- \
  --release-id <YYYYMMDDNN> \
  --website-ref <40-character-website-commit>
```

Apply that checksummed package to a clean checkout of the website repository
with `npm run website:promotion:apply`, review the exact `public/play` and
managed-header changes, then commit and push the website repository. Cloudflare
deploys from that repository. Treat its build, production deployment, and live
site verification as separate gates.

## Final release report

Record the source commit, release ID, validation commands and passing test
counts, then report every target independently:

- Android: artifact path, SHA-256, version identity, Play track, and whether it
  is built, uploaded, processing/reviewing, available to testers, or blocked.
- iOS: archive identity, marketing/build versions, App Store Connect or
  TestFlight state, and whether it is built, uploaded, processing, available to
  testers, submitted for review, released, or blocked.
- Website: game commit, website commit, promotion package/deployment identity,
  live verification result, rollback target, and whether it was intentionally
  untouched, built, committed, deployed, verified live, or blocked.

Finish with the local Git status and the observed `origin/main` commit so the
report distinguishes released source from uncommitted or unpublished work.

## GitHub's remaining job

`.github/workflows/verify-web-native.yml` remains automatic and
credential-free. It runs shared tests/builds plus unsigned Android debug and
unsigned iOS simulator compilation. It answers whether committed source is
healthy; it has no release authority and produces no store upload.

Old workflow runs remain in GitHub history for audit purposes. The obsolete
`native-release-signing` and `website-promotion` Environments were removed on
2026-08-24 after confirming no remaining workflow used them. The planned
`private-release-uploads` and `app-store-testflight` Environments were never
present.
