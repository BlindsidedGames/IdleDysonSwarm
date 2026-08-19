# Web release verification evidence — 2026-08-19

This is Phase 9 Track A evidence for the Web release only. It does not
authorize or perform a deployment, a push, a native-platform test, a Stripe
payment, or an automatic dependency upgrade.

## Candidate boundary

- Branch at inspection: `main`.
- Inspected commit: `c01ae415f86d2cf52945ed7e26fc5132537d1643` plus real
  uncommitted verification/hardening changes, parallel performance work,
  generated line-ending noise, and preserved local artifact directories.
- Local `main` was 12 commits ahead of the locally known `origin/main` and the
  worktree was dirty. This is not yet a clean deployable SHA.
- Known generated JSON line-ending noise and existing local artifact folders
  were preserved.
- `npm run data:check` verified 559 authored Unity assets across 34 types, 371
  projected runtime assets and all 104 Skill-tree presentation nodes. The
  deterministic WebP icon comparison is intentionally slow (about 93 seconds
  on this machine).

## Save and recovery evidence

The focused release command ran 25 test files and 302 tests:

```powershell
npm test -- --run src/save/decodeIdb1.test.ts src/save/migrate.test.ts `
  src/save/import.test.ts src/save/serialization.test.ts `
  src/save/repository.test.ts src/save/startupResolver.test.ts `
  src/save/prepare.test.ts src/simulation/lifecycleAwayTime.test.ts `
  test/support/progressionMatrixFixtures.test.ts `
  scripts/pwaPackage.test.ts src/pwa/serviceWorkerUpdate.test.ts `
  src/pwa/PwaUpdatePrompt.test.tsx src/browser/productionPackaging.test.ts `
  src/browser/productionBrowserComposition.test.ts `
  src/platform/browserSaveDatabase.test.ts `
  src/ui/runtime/browserRuntimeFoundation.test.ts `
  src/ui/gameplay/settings/SettingsSurface.test.tsx `
  src/workers/storedTime/storedTimeJobRunner.test.ts `
  src/workers/storedTime/storedTimeProtocol.test.ts `
  src/store/developmentStore.test.ts src/store/browserStripe.test.ts `
  src/store/storefront.test.ts src/platform/releaseFoundation.test.ts `
  src/productionHostComposition.test.ts `
  src/ui/gameplay/dyson/ReadyDysonSlice.test.tsx
```

Result: **302 passed, 0 failed**.

This covers:

- the repository's production `Documentation/SaveBackups/MainSave.txt` via
  its byte-identical checked-in Web and Unity fixture copies (SHA-256
  `10e2e48cd989618918118e16d0900af7d80f0f5dfb1aad475423ac165ab00c78`);
- supported Unity schemas 0, 8, 10 and 11 migrating to schema 12;
- the authentic public Unity 3.0.328 support save and current production save;
- all nine immutable progression saves, their pinned hashes, production
  validation, import and runtime reconstruction;
- canonical Web export/deserialize round trips, BigInt precision, compressed
  saves and portable-entitlement stripping;
- malformed base64, malformed envelopes, invalid UTF-8, oversized payloads,
  future schemas and non-finite values failing closed;
- manual import lifecycle reset, same-device Unity lifecycle preservation and
  presentation-preference retention;
- atomic publication, three verified backup rotations, newest-valid-backup
  restoration, invalid-backup blocking and recovery-publication failure;
- the production-browser composition retaining the deployed
  IndexedDB/profile/current-save identity, enabling canonical writes,
  publishing three backups, reconstructing through a fresh runtime, retaining
  an invalid current save, and restoring the newest valid backup;
- safe reload and accepted-update checkpoint ordering, including refusal to
  shut down or reload after an unverified checkpoint.

## PWA and application-update evidence

`npm run build` passed TypeScript, the production Vite build and the Store
production-boundary check. `npm run verify:pwa:production` is a checked-in,
repeatable Chrome DevTools Protocol harness. It builds two different production
packages, runs them successively at the same origin, and writes the complete
machine-readable result to
`docs/pwa-production-verification-2026-08-19.json`.

The recorded run used Chrome `151.0.7922.138` on `win32-x64`. Package SHA-256
values were `a53ab7db8818311a40f06ee9638c98702bfe6d8fc4a1db4a9d9c8e7bc8f27800`
and `cea322284e8b9f11df9982bc69a48ce8317c99dbb5d2568cce49aadf098b5640`.

Observed sequence:

1. First install registered `/play/service-worker.js` at `/play/`, activated
   it, controlled the page and populated one versioned app cache.
2. The harness changed canonical state from bots `0`, distribution `0.50` to
   the distinctive bots `1`, distribution `0.73`, then waited for its verified
   periodic checkpoint.
3. A normal repeat load and an offline reload both preserved schema `12`, bots
   `1`, and distribution `0.73`. Full serialized hashes changed because
   lifecycle timestamps legitimately advance; the chosen gameplay fingerprint
   is stable and exact.
4. A second production package built with a distinct build identity
   downloaded into a new cache and remained waiting. The running package was
   not replaced automatically.
5. The visible **Save and update** action was accepted. The app checkpointed,
   shut down, activated the waiting worker and reloaded.
6. After reload the new worker was active, no worker was waiting, and the exact
   canonical schema/bot/distribution fingerprint remained in the stable
   compatibility database `idle-dyson-swarm-web-development-v1` at
   `/development-only/development-only-default-profile/current.idsw`.
7. Both the prior real app cache and an injected
   `idle-dyson-swarm-app-obsolete-verification` cache were deleted. Only the
   new app cache remained.
8. The JSON evidence captures both package hashes, both cache names, the
   browser version, database name/path, and every save fingerprint. Separately,
   the Stored Time runner regression proves that a mismatched worker identity
   is terminated and the bounded cooperative implementation completes the
   spend instead.

The storage name retains `development` wording intentionally: deployed Web
builds already used that location. Renaming it would strand existing saves or
require a riskier cross-database migration. Production now adopts this
location as an explicit compatibility contract instead of relying on a runtime
default.

## Store evidence

- The development adapter exposes the real five-product catalog.
- Deterministic success, cancellation and failure outcomes pass without a
  network or provider port.
- Durable Developer Options and Double Infinity Points purchases require host
  verification; tips remain repeatable and never grant ownership.
- Restore, entitlement refresh and the separation between free development
  controls and actual Developer Options ownership pass.
- Production build inspection passed: the Stripe endpoint is present and the
  development adapter markers are absent.
- A read-only live `GET` to
  `https://ids.blindsidedgames.com/api/ids/stripe/catalog` returned `200`
  JSON with all five canonical product IDs available.

No checkout endpoint was called. Creating and abandoning a real Stripe
Checkout session remains a production smoke-test boundary requiring explicit
release approval; no charge or paid flow was initiated here.

## Dependency security

Read-only audits were run; no package was installed, upgraded or fixed.

- `npm audit --omit=dev --json`: **0 production vulnerabilities** across 13
  production dependencies.
- `npm audit --json`: four development-tool findings — high `nanoid` through
  Vite/PostCSS, plus moderate `uuid`, `xcode` and `@capacitor/cli` findings in
  the native build toolchain.
- `nanoid@3.3.16` is pulled through `postcss@8.5.23` and `vite@8.1.5`.
- `uuid@7.0.3` is pulled through `xcode@3.0.1` and
  `@capacitor/cli@8.5.0`.

These do not ship as production runtime dependencies. They should be reviewed
as a deliberate toolchain update after this Web release candidate rather than
changed automatically during verification.

## Remaining boundaries

- The repository must be checkpointed intentionally, made clean, and all
  release gates rerun against the exact resulting SHA before deployment.
- Immediately before that checkpoint, regenerate `git status --short`; the
  dirty tree includes real hardening work, parallel performance work,
  generated noise, and preserved local artifact directories.
- The real unpaid Checkout-session creation/cancellation smoke test remains
  unperformed by design.
- Android and iOS verification are explicitly outside this Web plan.
- Production interaction and soak evidence are tracked separately in the final
  performance phase.
