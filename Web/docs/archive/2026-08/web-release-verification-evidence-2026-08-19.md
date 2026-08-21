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

The focused release command ran 25 test files and 305 tests:

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

Result: **305 passed, 0 failed**.

This covers:

- the repository's preserved `Web/test/fixtures/schema-08-canonical-idb1-main-save.txt` via
  its byte-identical checked-in Web and Unity fixture copies (SHA-256
  `10e2e48cd989618918118e16d0900af7d80f0f5dfb1aad475423ac165ab00c78`);
- supported Unity schemas 0, 8, 10 and 11 migrating to schema 12;
- the authentic public Unity 3.0.328 support save and current production save;
- all nine immutable progression saves, their pinned hashes, production
  validation, import, full production application/engine startup and a
  successful engine advance;
- pre-commit production-engine import preflight, including rejection of the
  former mature-fixture automation phase with the current save unchanged and
  no replacement commit;
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
`docs/archive/2026-08/pwa-production-verification-2026-08-19.json`.

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

## Track B: Web browser, accessibility and performance evidence

Track B was completed on 2026-08-20. It is Web-only and does not claim Android,
iOS, TalkBack, VoiceOver, heat, battery, or native lifecycle coverage. No
deployment, commit, push, or paid Store action was performed.

### Browser harness boundary

Chrome and Edge initially exited before opening their DevTools port with a GPU
process `0xC0000022` failure on this Windows host. The isolated verification
harness succeeded with `--no-sandbox`; the harness did not disable GPU
rendering, but it did not independently certify hardware acceleration.
That flag is confined to local test-process launch and is not shipped in the
application or recommended as a user browser setting. The production package
was served on isolated loopback ports so an unrelated existing preview process
was not interrupted.

### Progression route matrix

`npm run report:performance:matrix` rebuilt the performance package and ran the
complete matrix at desktop 1440x900 and mobile Web 390x844, with four-times CPU
throttling, three steady trials, fresh pages per route, and exact checked-in
save SHA verification. The current artifact is
`output/performance/progression-matrix.json`.

- 18 profile/fixture combinations and 186 reachable routes were measured.
- 0 fixtures were blocked; 0 console errors and 0 page errors were recorded.
- 0 routes had document-level horizontal overflow.
- The matrix measures reachable activation/performance only. Focused fixture
  and UI tests certify locked Avocato boundaries without warming Quantum on
  unrelated route pages; measured Avocato rows exercise the enabled entry.
- Skills was the largest first activation: maximum Skills reached ready in
  608.2 ms desktop and 569.9 ms mobile, with first-activation long tasks up to
  203 ms under throttling.
- The largest steady canonical-active sample was 56.4 ms in maximum-Skills
  Settings. Four isolated throttled steady long-task observations occurred in
  the maximum-Skills stress fixture across Research, Settings, and Offline
  Time; all other steady route trials had none.
- Frontend projection remained at or below 3.0 ms p95; canonical
  gameplay work was the dominant lane.

These stress observations are retained as follow-up optimization evidence.
They do not contradict the normal interaction acceptance trace below: the
matrix deliberately uses four-times CPU throttling and a maximum-Skills fixture
funded explicitly for catalog stress.

### Production interaction acceptance

`npm run report:performance:interaction` ran five 30-second trials per profile.
`output/performance/first-slice-interaction.json` passed every configured
budget after the checkpoint correction described below.
The gate now records the exact fresh fixture fingerprint/save SHA and candidate
run identity, captures console and page errors before navigation, and assigns
both a zero-error budget.

| Profile | Max long task | Feedback p95 | React selection-to-commit p95 | INP p75 | CLS p75 | LCP p75 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop 1440x900 | 0 ms | 0.4 ms | 0.8 ms | 32 ms | 0.012028 | 564 ms |
| Mobile 390x844 at 4x CPU | 0 ms | 1.8 ms | 4.6 ms | 128 ms | 0.070243 | 1,324 ms |

Temporary lane attribution identified the prior periodic mobile spike as the
30-second save checkpoint, specifically redundant deserialize, revalidation,
and deterministic recompression after an exact temporary read-back. The
repository now prepares and encodes once, verifies exact stored text, then
promotes the same owned, validated `PreparedSave`. Serializer trust boundaries
were tightened to reject lossy JavaScript graph values and reserved codec-tag
collisions before any write. An independent review exercised corruption,
different-valid-payload, lossy-value, codec-collision, write/read/replace/copy,
backup, and recovery cases and passed. Three subsequent 35-second mobile 4x
attribution trials recorded zero long tasks; the evidence is
`output/performance/mobile-long-task-attribution.json`.

### Thirty-minute retained-resource soak

`npm run report:performance:soak` imported the certified mid-swarm fixture,
cycled stable routes, returned to Settings for like-for-like snapshots, forced
four garbage collections, and ran for 1,800,000 ms. The final
`output/performance/first-slice-retained-heap.json` passed every budget:

- retained heap grew 3,669,176 bytes against a 10,485,760-byte allowance;
- document count remained 1, nodes 274, listeners 405;
- timeout/interval/animation-frame/pointer counts remained 1/3/0/0;
- subscription sets and members remained 7/7;
- route visibility boundaries were identical at start and finish.

The soak artifact records the exact mid-swarm fixture fingerprint/save SHA and
candidate run identity and fails its report if any console or page error occurs.

Earlier short diagnostics that compared a changing Bots surface or crossed an
unlock boundary were rejected as invalid baselines rather than reported as
leaks.

### Browser accessibility acceptance

`npm run verify:web-accessibility:browser` produced
`output/performance/web-accessibility-acceptance.json` for 320x800 and 390x844
Web viewports. This browser script is fail-closed and the current artifact has
`passed: true` with no acceptance issues. It recorded zero document overflow at
normal and 200 percent text sizing, a minimum 44 CSS-pixel interactive target,
zero running animations with reduced motion, representative
computed contrast ratios from 11.85:1 to 17.81:1, keyboard opening of Import,
real textarea editing, dialog focus containment, Escape close/focus restore,
and clean state after rapid trusted CDP touch activation. Console and page
errors are captured and must both remain empty.

This automation does not prove every painted contrast combination, visible
focus paint, browser-chrome 400 percent zoom, or actual screen-reader
announcements. A 320 CSS-pixel reflow proxy passed, but manual browser 400
percent zoom, screen-reader, visible-focus and full contrast checks remain
acceptance items before public deployment. The 200 percent text geometry is
now free of clipped interactive controls, but it and the remaining
element-edge diagnostics also require a manual visual review. Physical/native
accessibility checks remain explicitly outside this Web phase.

### Current bundle gate

The final production bundle report records a 260.28 KiB-gzip JavaScript entry
and a 283.11 KiB-gzip initial boot graph including the English catalog. The
boot graph passes the enforced 301 KiB no-regression ceiling and remains above
the provisional 250 KiB milestone. Boot CSS is 12.46 KiB gzip. The complete
PWA precache is 2,431,809 bytes gzip across 153 assets; destination separation
reduces initial request/evaluation work but does not claim to reduce eventual
background PWA installation transfer.

### Reproduction commands and remaining boundary

```powershell
npm run report:performance:matrix
npm run report:performance:interaction
npm run report:performance:soak
npm run verify:web-accessibility:browser
```

The evidence was generated from commit
`909782a03acdbd1f5b7d764e698bcc8e0ebc70c1` plus the dirty reviewed candidate.
It is not yet evidence for a deployable SHA. The work must be intentionally
checkpointed, then all release gates and the clean-repository audit rerun for
the exact committed candidate. Manual browser 400 percent zoom, 200 percent
text appearance, visible focus, full contrast, and screen-reader checks also
remain open; Android and iOS remain deferred by scope.
