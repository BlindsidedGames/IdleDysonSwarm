# Steam, iOS and Android internal readiness

Matthew's 09:33 and 09:34 corrections supersede the web callback assignment and public-beta rollout framing. Shipping targets are **Steam, iOS and Android only**. The immediate goal is internal builds followed by an extended period of internal testing. Browser preview is local QA infrastructure; no web version, Stripe callback, website route, PWA deployment or public rollout infrastructure is needed for that goal. This checkpoint authorizes no distribution, native game launch, real-save write, actual transaction, remote push or release.

## Completed technical baseline

Local main already contains IDLEDS/schema 21, retained historical readers, exact-source one-way archives, separate native beta progress and relevant entitlement caches selected before startup, cloud saves off and automatic public-save discovery off. Existing package/bundle IDs, Steam App ID, product bindings and provider accounts are retained; purchases and Restore remain visible/enabled. Native renderer startup requires host attestation of the storage/cache/discovery/cloud policy before progress access. An old unattested host fails closed. The Restore repair accepts verified ownership already applied to the running game, while failed changed-ownership writes still report failure and preserve the prior checkpoint.

The integrated baseline passed **2,305/2,305** tests, TypeScript, oxlint, normal/native renderer builds and native host syntax. Actual Electron startup with a fake SDK verifies beta account-owned storage, no Cloud/publication construction, available fake-provider catalog/purchase/Restore, untouched public data and account-switch refusal. Android's actual cache/session source compiles and passes the isolated preferences probe for public seed, beta-only writes, revocation/reopen and Gallery grant. Changed Swift parses and StoreKit/session source typechecks; this is not a packaged iOS/device certification.

After scope correction, the native renderer was rebuilt from the integrated baseline and Capacitor Android sync completed in the isolated checkout. It produced renderer/assets and generated Android project data only; no app was installed or launched. Generated machine-relative plugin paths were restored rather than landed. Logs: `/tmp/ids-internal-native-build.log` and `/tmp/ids-internal-cap-sync-android.log`.

Further native build verification stopped at environment limits:

- Offline Android compile used JDK 21, an isolated copy of Gradle's cache/wrapper, and workspace-owned output paths. Gradle could not start its lock-coordination socket: `java.net.SocketException: Operation not permitted`. No dependency/provider network call was attempted. Log: `/tmp/ids-internal-android-compile.log`.
- SwiftPM entitlement/export owner tests used workspace scratch/cache/config/security/module-cache paths. Manifest execution was denied by `sandbox-exec: sandbox_apply: Operation not permitted`. No sandbox setting or permission was changed to continue. Log: `/tmp/ids-internal-swift-tests.log`.

No APK, IPA, signed Steam package or tester availability is certified by these attempts. These are execution-environment/build verification limits, not established defects in the game code.

## Internal build and test gates

1. Build actual Steam, iOS and Android packages in a permitted build environment; inspect their resolved save, backup/recovery, Stored Time and entitlement cache roots before any native launch. Verify cloud/discovery stay off at host startup. Select internal build/version identifiers when preparing distribution; do not invent store configuration changes.
2. In approved disposable profiles/devices, verify first launch, IDLEDS checkpoint/reopen, intentional historical import/Keep/Fresh/archive failure, beta backup recovery, unsupported future saves, suspend/resume and interrupted Stored Time. Prove public progress remains untouched across installation/channel switching. Source/mock proof remains useful but does not replace packaged-host verification.
3. Exercise the existing native catalog, purchase flow and provider Restore with authorized sandbox/test transactions when requested. No transactions were performed here. Steam tips remain inventory-restorable; durable iOS/Android purchases are provider-restorable. Existing public Gallery ownership seeds beta. A new consumed mobile tip's Gallery flag is currently beta-local; whether to share that positive ownership receipt back to public remains a pending user decision. Do not silently grant it or classify the retired Stripe question as a native blocker.
4. Record current Forager/Farming behavior during internal testing. The seventh Forager point, finite continuation/migration policy and Farming reward banking remain gameplay decisions, with current behavior and limits documented. Do not implement unapproved placements or quantities. Internal-test readiness and later public-release acceptance are separate gates.
5. When Matthew explicitly requests internal distribution, follow the established three-platform internal shorthand and verify tester availability. Until that request, no upload, activation, TestFlight/Play distribution or Steam branch change is authorized. Public release is later work, after extended internal testing.

## Stopped web-only work

The completed callback changes are preserved solely in local branches/checkouts and are **not integrated into primary IDS main or primary website**:

- IDS isolated branch `codex/ids-beta-checkout-20261010`, commit `a3fa6b0d6068e9434dc54756d2e531007000aa98`: explicit Stripe beta return path, persist-before-query-cleanup, malformed response/retry handling and its documentation/tests.
- Website isolated checkout `/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/website-beta-checkout`, same branch name, commit `bda3a0ef04b3080c56e77f1f41d5dcdbd33a1a69`: finite callback path allowlist with existing public/origin defaults and fake-provider endpoint tests.

Those stopped candidates passed 2,311 IDS cases, six website cases and disposable real-handler/fake-provider browser checks before the correction. Their missing website type dependency and hosting follow-up are irrelevant to native internal readiness. No further website edits, callback implementation or hosting work continues. Retained browser storage/preview infrastructure serves isolated local QA only. Preserve these branches as history; do not apply them or delete unrelated data.

Primary main's approved migration/isolation/Restore code remains. All six stashes and the shared rework checkout are preserved. The [older readiness audit](ids-rework-beta-readiness-2026-10-10.md) and [storage audit](ids-beta-storage-isolation-2026-10-10.md) defer their shipping-scope and release-gate interpretation to this document.
