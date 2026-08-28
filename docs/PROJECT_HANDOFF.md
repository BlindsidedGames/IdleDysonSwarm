# Idle Dyson Swarm project handoff

Last reconciled: 2026-08-29 on the release Mac.

This is the first document a new Codex or ChatGPT account should read before
changing, reviewing, or releasing Idle Dyson Swarm (IDS). It records the
current project state, the non-negotiable product contracts, and the proven
local-first deployment lane. Detailed contracts remain authoritative where
linked; this handoff provides the map and the operational context.

## Current state

### Repositories

- Game source: `/Users/matthewrushworth/Projects/Idle Dyson Swarm`
  (`BlindsidedGames/IdleDysonSwarm`).
- Website and Cloudflare Pages source:
  `/Users/matthewrushworth/Projects/BlindsidedGames Website`
  (`BlindsidedGames/BlindsidedGames`).
- The root-level TypeScript/React code in the game repository is canonical.
  `docs/archive/unity-development-snapshot/` and old Unity paths are historical
  reference material, not the current implementation.

### Source and deployment snapshot

- Latest mobile release source: `1caf56d5961f31344570470cd91f23beff9ce2cb`
  (`Align Electron 4.1.5 release contract`). Release `2026082901` was built
  from that exact commit with
  marketing version `4.1.5`.
- This release includes the app-wide interface and Simulation/Reality
  progression work from PR #133 and the 4.1.5 patch notes from PR #134. It
  retains the uncapped Stored Time and Simulation-resource behavior from
  PR #131. Read `contracts/game-processing-and-offline-time-contract.md` and
  `contracts/canonical-dream-contract.md` before touching those limits.
- Release `2026082901` was validated with 203 test files / 2,155 tests, lint,
  localization checks, Web production build, Electron boundary checks,
  signed Android build, and iOS synchronization.
- Its retained Android artifact is
  `output/local-release/2026082901/android/idle-dyson-swarm-2026082901.aab`
  with SHA-256
  `e65ac240d66a8178aef9f865818202796f7915b9ed95c0b7d9e184ae1f7dff37`.
  Its retained iOS archive is
  `output/local-release/2026082901/ios/App-2026082901.xcarchive`.
- Android `4.1.5 (2026082901)` was confirmed **Available to internal testers**.
- iOS `4.1.5 (2608.29.01)` was archived and accepted by App Store Connect;
  the last observed state in that deployment was **uploaded and processing**.
  Do not claim current TestFlight availability without checking App Store
  Connect again.
- Website promotion commit `26fe440e2b30fc10d4e7a604a783d343325740b4`
  deployed the `2026082701` game package.
- The Website beta has since been intentionally paused. Website commits
  `11c2e83fd310f86ca3583d219a69af836a294ab3` and
  `6e7b029beec9534a7eb4d143061fd831657f3c73` replace only
  `/play/index.html` with a cache-safe
  beta-ended notice while preserving the game assets and backend. Cloudflare
  deployment `d57eb4d5` was verified live at
  `https://ids.blindsidedgames.com/play/`. Wrangler was reauthenticated on this
  Mac. A normal future game promotion replaces `public/play` and is the clean
  restoration path, but restoring the beta must be an explicit product choice.

Always refresh these facts before acting:

```bash
cd "/Users/matthewrushworth/Projects/Idle Dyson Swarm"
git status --short --branch
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
git worktree list --porcelain

cd "/Users/matthewrushworth/Projects/BlindsidedGames Website"
git status --short --branch
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
```

Do not assume this snapshot is still current after another merge or deployment.

## Product and engineering rules

### Save continuity is a release requirement

Existing players must upgrade in place. Never require a manual bridge/export
as the ordinary migration path. Preserve the application ID/bundle ID,
production signing identities, origin, save envelopes, native containers, and
the decode -> migrate -> repair -> validate pipeline.

The Web implementation reads Unity/Odin `IDB1:` saves, migrates them through
schema 12, and uses precision-preserving `IDSWEB1` serialization. Changes to
save structures require fixtures, round-trip coverage, a real existing save,
and the actual in-place upgrade path. Unity originals are read-only and must
never be deleted, renamed, or overwritten.

### Canonical runtime boundary

The React frontend sends typed, revision-checked commands and reads immutable
snapshots. It does not own gameplay state or calculate canonical outcomes.
The important ownership chain is:

```text
React UI
  -> CanonicalLifecycleCoordinator
  -> CanonicalGameApplicationFacade
  -> TransactionalGameApplication
  -> TransactionalSimulationEngine
  -> verified persistence lane
```

- `src/core`: platform- and React-independent ports.
- `src/application`: runtime session, player commands, lifecycle coordination,
  persistence serialization, and the UI snapshot boundary.
- `src/simulation`: deterministic gameplay domains and event-time authority.
- `src/save`: compatibility decoding, migration, repair, validation, and
  persistence envelopes.
- `src/game-data/authored`: versioned authored data; generated catalogs must be
  reproducible.
- `src/platform`: replaceable Web, Capacitor, and Electron capabilities.
- `src/ui` and `src/App.tsx`: presentation and composition only.

Read `contracts/architecture.md`, `contracts/game-state-contract.md`,
`contracts/simulation-contract.md`, and `contracts/parity-fixtures.md` before
changing these boundaries.

### Single-writer and persistence safety

Only one browser/PWA context may own the writable session. IndexedDB fencing is
authoritative; `BroadcastChannel` is advisory. Active play may publish memory
before a later checkpoint, but recovery, import, reset, and Stored Time are
commit-first operations. A candidate becomes visible only after its save is
verified.

During Stored Time processing:

- capture one immutable pre-job save for export;
- cancellation or import/reset must win before candidate publication;
- failed or cancelled processing publishes nothing and charges no bank;
- Tinker is frozen;
- replay uses the same gameplay update as active play, with coarser steps;
- there is no 25% Infinity Point compensation; and
- Speed Up reduces remaining update count while conserving time.

The detailed authority is
`contracts/game-processing-and-offline-time-contract.md`.

### Infinity guidance

Recommended and Current are deliberately different:

- **Recommended** is retained from a completed/manual calibration run.
- **Current** is recent realized automatic throughput at the current target and
  cadence.
- Stored Time must not contaminate either manual calibration or Current.
- Changing cadence, Double Time, or the relevant automation session invalidates
  only the state specified by the contract.

Do not collapse these values into one estimate. Read the Auto Infinity section
of `contracts/game-processing-and-offline-time-contract.md`.

### Product UI expectations

- Preserve progression order, terminology, unlock conditions, information
  hierarchy, and the recognizable Lexend/dark-plum/orange/cyan identity.
- Responsive reflow, semantic markup, accessible targets, and contrast fixes
  are required improvements over Unity, not parity failures.
- Locked/spoiler systems stay hidden until their canonical reveal condition.
- Bottom-docked progress/control panels share one structure across Bots,
  Research, Skills, Infinity, Simulations, and Quantum.
- Real browser/device behavior outranks a passing unit test or a visual guess.
  When the user reports a mismatch, reproduce that exact viewport/state before
  changing CSS again.
- Test resize recovery, persistence/reload, compact and wide layouts, touch,
  and the relevant physical device—not only a static desktop viewport.

The detailed UI contract is `contracts/product-ui-foundation.md`.

### Localization

English is the source catalog. Production translations currently include
French, German, Latin American Spanish, Brazilian Portuguese, Simplified
Chinese, Russian, and Japanese; `en-XA` and `ar-XB` are pseudo-locales. Player
strings use stable FormatJS descriptors. Locale changes must not remount or
restart gameplay. Run `npm run i18n:check` after player-facing copy changes.

### Commerce and platform boundaries

- Capacitor Android/iOS hosts use the same canonical bundle/application ID:
  `com.blindsidedgames.idledysonswarm`.
- Native purchases remain platform-native and verified behind the shared Store
  contract. Receipts/tokens never cross into the renderer.
- The Website repository owns `/api/ids/stripe`, live price bindings, and
  Cloudflare Pages functions. Never commit Stripe or Store credentials.
- The current first account-system direction is purchase transfer only; cloud
  save transfer is not part of that initial scope unless explicitly reopened.
- Electron Steam commerce, achievements, statistics, and rich presence remain
  deferred release work. See `BACKLOG.md`.

## Normal development and review workflow

1. Start from current `origin/main`; inspect every worktree before changing
   branches. The repository may contain long-lived experimental worktrees.
2. Preserve unrelated changes. Stage explicit reviewed paths only.
3. Diagnose reported behavior before implementing unless the request clearly
   includes a fix.
4. Keep living contracts, product direction, backlog, and release requirements
   updated in the same change when behavior changes.
5. Run focused tests while iterating, then the full gate appropriate to risk.
   A fresh test count comes only from the full Vitest suite.
6. For timing-sensitive tests, `--maxWorkers=1` is the accepted fallback when
   local IPC or scheduling makes the default run unreliable.
7. Do not commit or push merely because work is complete unless the user asked.
8. Before handoff, review `git diff --check`, the actual diff, the branch/upstream
   relationship, and any remaining untracked files.

Useful commands:

```bash
npm test -- --maxWorkers=1
npm run lint
npm run i18n:check
npm run build
npm run native:electron:check
npm run data:check
```

The known jsdom warning about `HTMLCanvasElement.getContext()` is not itself a
test failure. Judge the suite by its final result. If `tsx` reports
`listen EPERM`, treat it as a sandbox IPC restriction and rerun in the approved
local environment rather than changing product code.

## Local-first release workflow

### Release authority

Native signing, Store uploads, and Website promotion happen locally on this
release Mac. GitHub Actions is verification-only. It runs tests/builds plus
unsigned Android debug and iOS simulator compilation. Do not create a release
PR, dispatch an obsolete signing workflow, or move Store credentials into
GitHub.

Report Android, iOS, and Website independently as one of: built, uploaded,
processing/review, available to testers, Cloudflare deployed, live verified,
or blocked. A successful build is not a deployment; an upload is not tester
availability.

### 1. Freeze release identity

Use one reviewed source commit and a unique ten-digit release ID in
`YYYYMMDDNN` form. Before the build, update
`hosts/native-release.json`, then run:

```bash
npm run native:release:sync
```

Review and commit only these generated/version paths:

```text
hosts/native-release.json
hosts/capacitor/android/release-version.gradle
hosts/capacitor/ios/release-version.xcconfig
hosts/electron/release-version.yml
scripts/electron-native-host.test.ts
```

Android keeps the ten-digit ID as `versionCode`. Apple receives
`YYMM.DD.NN`. Marketing version is currently `4.0.0`. The protected release
script requires the checkout to remain clean, so the version metadata must be
reviewed and committed before the release gate.

### 2. Run the complete local gate

```bash
cd "/Users/matthewrushworth/Projects/Idle Dyson Swarm"
npm run release:local -- --release-id <YYYYMMDDNN>
```

Use `--clean-install` only when dependencies must be rebuilt from the lockfile.
Use `--android-only` only for an explicitly Play-only request. The command runs
tests serially, lint, localization checks, Web build, Electron boundary checks,
native build/sync, and the signed Android bundle. It retrieves Android signing
passwords from Keychain without printing them.

Output:

```text
output/local-release/<release-id>/android/
  idle-dyson-swarm-<release-id>.aab
  manifest.json
  SHA256SUMS
```

Verify `manifest.json` names the frozen source commit, recompute the AAB SHA-256,
and inspect the signer. The upload-certificate SHA-256 must remain:

```text
05:11:97:07:BB:6F:02:26:4C:0E:D3:76:AD:33:30:60:5F:55:F6:26:74:AC:25:FD:BA:D8:2F:D9:8A:C4:4B:9A
```

The historical JKS/SHA1 certificate warning is expected. Do not rotate or
replace the key during an ordinary release.

The release Mac's established Android inputs are outside git:

```text
Keystore:
~/Library/Application Support/Blindsided Games/Idle Dyson Swarm/signing/idledysonswarm.keystore

Java 21:
~/Library/Application Support/Blindsided Games/Idle Dyson Swarm/java/jdk-21.0.12.1+1/Contents/Home

Android SDK:
~/Library/Android/sdk

Key alias:
idledysonswarm
```

Passwords are stored in macOS Keychain for account `idledysonswarm` under
services
`com.blindsidedgames.idledysonswarm.android.keystore-password` and
`com.blindsidedgames.idledysonswarm.android.key-password`. Never print, copy
into chat, commit, or put them on a command line.

### 3. Google Play Internal testing

Upload the generated AAB directly to the Internal testing track:

`https://play.google.com/console/u/0/developers/8315705273233616064/app/4975918856678556086/tracks/internal-testing`

Create a new release, upload the AAB, wait for optimization, confirm the
suggested release name matches the release ID, and inspect the preview. Release
notes may remain blank when no notes were requested. Two longstanding
non-blocking warnings may appear: no R8/ProGuard deobfuscation file and no
native debug-symbol archive. Confirm the final publication dialog only when the
user requested deployment. Completion requires the track summary to say the
new version is **Available to internal testers**.

### 4. iOS archive and App Store Connect upload

The project is:

`hosts/capacitor/ios/App/App.xcodeproj`

Xcode Organizer is supported, but recent releases used the following local CLI
archive so the exact output stays with the release artifacts:

```bash
xcodebuild \
  -project hosts/capacitor/ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath "output/local-release/<release-id>/ios/App-<release-id>.xcarchive" \
  -allowProvisioningUpdates \
  archive
```

Automatic signing is owned by the signed-in local Xcode account. Bundle ID is
`com.blindsidedgames.idledysonswarm`; team ID is `AVX7SUF8Y6`. Do not put Apple
credentials or provisioning material in GitHub.

For a CLI upload, create an untracked/ignored `ExportOptions.plist` beside the
archive with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>destination</key><string>upload</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>method</key><string>app-store-connect</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>AVX7SUF8Y6</string>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
```

Then run:

```bash
xcodebuild \
  -exportArchive \
  -archivePath "output/local-release/<release-id>/ios/App-<release-id>.xcarchive" \
  -exportPath "output/local-release/<release-id>/ios/export" \
  -exportOptionsPlist "output/local-release/<release-id>/ios/ExportOptions.plist" \
  -allowProvisioningUpdates
```

With `destination=upload`, Xcode may not leave a local IPA. Success is the
`Upload succeeded` / `Uploaded package is processing` result. Verify the
archive's bundle ID, marketing version, and build number with `PlistBuddy`.
Check App Store Connect separately before saying the build is processing,
available in TestFlight, assigned to tester groups, or approved.

### 5. Website promotion and Cloudflare

Do this only when the Website target was explicitly requested. While the beta
is paused, a normal promotion also restores the game entry point, so call that
out before deploying.

Start from a clean Website checkout, fetch `origin/main`, and record its exact
40-character `HEAD`. From the game repository:

```bash
npm run website:promotion:prepare -- \
  --release-id <release-id> \
  --source-sha <full-game-source-sha> \
  --website-ref <full-website-head-sha>

npm run website:promotion:apply -- \
  --package "/Users/matthewrushworth/Projects/Idle Dyson Swarm/output/website-promotion/<release-id>-<source-prefix>" \
  --website-checkout "/Users/matthewrushworth/Projects/BlindsidedGames Website"
```

`--package` is the required flag; `--package-dir` is invalid. The apply step
verifies the pinned Website commit and every package hash, replaces
`public/play`, updates the managed `_headers` block, and writes
`promotions/idle-dyson-swarm/<release-id>.json`.

In the Website repository:

```bash
npm run test:ids-stripe
npm run build
git diff --check
git add public/play promotions/idle-dyson-swarm/<release-id>.json public/_headers
git diff --cached --check
git diff --cached --stat
git commit -m "Deploy Idle Dyson Swarm <release-id>"
git push origin main
```

Stage only paths that actually changed; do not add unrelated Website work.
`npm run check` currently prompts for optional `@astrojs/check`, which is not
installed. Do not silently change dependencies during a release merely to run
that optional command.

The Website repository is connected to Cloudflare Pages, so pushing `main`
normally triggers production. For an explicitly requested direct deployment:

```bash
npx wrangler whoami
npm run deploy:pages
```

If Wrangler authentication has expired, run `npx wrangler login` and let the
user complete Cloudflare authentication; do not infer login from a different
browser session.

The existing Pages project name is `blindsidedgames`. Reuse its
`ids.blindsidedgames.com` custom domain, DNS, managed TLS, environment bindings,
and secrets; an ordinary release must not recreate or rotate them.

Verify the exact production state instead of trusting an email or GitHub check:

- `/` redirects permanently to `/play/`;
- `/play` redirects permanently to `/play/`;
- `/play/` returns 200;
- for a live game, the HTML names the new hashed JS/CSS and the app visibly
  boots without console errors;
- while the beta is paused, `/play/` shows the beta-ended/back-soon notice,
  loads `beta-ended.css`, and loads no game bundle script;
- when Store/backend code changes, verify the Stripe catalog and an unpaid
  checkout session without completing a real payment.

### 6. Final release report

Record:

- release ID and full frozen game commit;
- test count and all validation gates;
- Android AAB path, SHA-256, upload state, and Internal tester state;
- iOS archive path, marketing/build version, upload and App Store/TestFlight
  state;
- Website pinned base commit, promotion commit, Cloudflare deployment, live
  route/asset evidence, and rollback target;
- final `git status` and `origin/main` equality for both repositories.

## Common failure interpretations

- A GitHub Actions failure does not prove Cloudflare failed, and a Cloudflare
  success email does not prove Android/iOS shipped. They are independent.
- GitHub authentication, browser login, git push credentials, local Android
  signing, Xcode provisioning, Play Console login, and Wrangler OAuth are
  separate credentials. Do not solve one by redirecting release work through
  GitHub.
- A GitHub compare/PR page is not required for this local-first deployment.
- If Xcode provisioning fails, first inspect the local target/team/profile and
  retry with `-allowProvisioningUpdates`; do not create a GitHub Apple build.
- Xcode Organizer may not list a CLI archive stored under `output/`; validate
  that archive directly and trust the export/upload result.
- Cloudflare Pages can deploy successfully from the Website push even when a
  separate GitHub workflow reports a failure. Verify the live custom domain.
- Never report all three platforms as simply “deployed.” Use their exact,
  separately verified states.

## Remaining certification and known future work

The current backlog still requires:

- the remaining manual accessibility and responsive browser checks;
- physical Android and iOS Store/device certification, including Unity-save
  upgrades, lifecycle/offline behavior, restore, cancellation, pending and
  interrupted purchases, reinstall/account switching, and native
  accessibility;
- deferred Steam commerce, achievements, statistics, and rich presence.

Read `BACKLOG.md` for the current list before declaring a release generally
certified.

## Authoritative reading order for a new account

1. This handoff.
2. `README.md` and `docs/README.md`.
3. `contracts/architecture.md`.
4. `contracts/game-state-contract.md` and `contracts/simulation-contract.md`.
5. `contracts/game-processing-and-offline-time-contract.md`.
6. `contracts/product-ui-foundation.md`.
7. `platform/release-candidate-workflow.md`.
8. `platform/website-deployment-rules.md`.
9. `platform/native-host-foundation.md` and `hosts/capacitor/README.md`.
10. `BACKLOG.md` and the relevant active audit/release evidence for the task.

When a document conflicts with current code or observed device behavior, stop,
reproduce the discrepancy, and update the contract and implementation together.

## Suggested first prompt after changing accounts

> Work in `/Users/matthewrushworth/Projects/Idle Dyson Swarm`. Read
> `docs/PROJECT_HANDOFF.md` and the linked current contracts before acting.
> Inspect `git status`, `origin/main`, and all worktrees. Preserve unrelated
> changes and existing-player save compatibility. Use the documented
> local-first release lane for Android, iOS, and Website; GitHub Actions is
> verification-only. Report each platform's exact verified state separately.
