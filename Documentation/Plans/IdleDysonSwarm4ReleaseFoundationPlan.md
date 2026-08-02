# Idle Dyson Swarm 4.0 Save, Platform, and Release Foundation

## Summary

Complete the Web-runtime transition for website, Android, iOS, Windows, macOS, and Linux while preserving public Unity 3.0.328/schema-11 saves.

The release uses local persistence and compact manual save sharing only—no cloud sync, remote telemetry, or backend. This phase includes private TestFlight, Google Play internal-track, and Steam beta uploads with real purchase/restore testing. Public rollout remains a later, separately authorized phase.

Before implementation, checkpoint the current UI work and start a clean `save-native-release-foundation` branch without disturbing existing work.

## 1. Canonical save and migration foundation

- Freeze Unity commit `9b840fb`—public version 3.0.328/schema 11—as the final certification baseline.
- Add an editor-only neutral snapshot exporter in a disposable pinned Unity worktree. Generate first-run, pre-Infinity, post-Infinity, Quantum/Reality, late-game, automation/preset/preference, and valid-debug fixtures.
- Preserve the existing genuine schema 0, 7, 8, 10, and 11 support fixtures and malformed import exactly, including hashes and provenance.
- Replace the incomplete schema-12 coverage manifest with a schema-11 leaf-field manifest. Every durable field must be classified as canonical, transformed, derived, duplicate, preference, platform entitlement, or invalid. Release writes remain disabled until there are zero unclassified fields.
- Introduce `IDSWEB1:` as gzip-compressed Base64 containing minified canonical Web JSON. Native files, IndexedDB, downloads, and clipboard exports all use the identical string.
- Accept Unity `IDB1` schema 0–11, canonical `IDSWEB1`, and transitional plain Web JSON for the one-time upgrade of current development saves.
- Reject future schemas and malformed saves without publishing partial state.
- Require `IDSWEB1` output to remain no larger than 125% of equivalent Unity `IDB1` across the certified corpus.
- Preserve player-facing gameplay state, unlocks, automation, presets, tutorial state, navigation choices, statistics, and valid debug progression.
- Manual/shared imports retain the receiving device's language, audio, display, and accessibility settings.
- Double IP and Developer Options are excluded from shared saves. Imports can never grant either entitlement.
- Automatic same-device Unity migration grants capped elapsed offline credit exactly once, preserves the Unity source permanently, and writes `idle_dyson_swarm_web_save.idsw` transactionally.
- Manual/shared import preserves stored offline credit, grants no additional time since export, checkpoints the displaced Web save, and applies without a second confirmation.
- Continue dirty checkpoints at a maximum 30-second loss window, plus immediate checkpoints after purchases, imports, resets, major progression transactions, backgrounding, page hide, and safe reload.
- Maintain three rotating verified Web backups. On startup, attempt current save and then the newest valid backup; notify the player when recovery was required.
- Recovery UI offers Retry, Copy Original, and Start Fresh. Starting fresh records the choice but never deletes the Unity source.

### Save interfaces

Introduce stable boundaries for:

- `CanonicalWebSaveV1` and the `IDSWEB1` codec.
- `SaveRepository` for verified temporary writes, rotation, recovery, and atomic publication.
- `ImportContext` distinguishing automatic migration, manual/shared import, and transitional Web upgrade.
- `PlatformSaveStorage` for IndexedDB, Capacitor files, and Electron files.
- `NativeMigrationSource` for read-only Unity discovery.
- `PreferenceTransferPolicy` and `EntitlementTransferPolicy`.
- `MigrationOutcome` covering success, unsupported version, invalid input, recovery required, and player-declined outcomes.

## 2. Platform hosts, entitlements, and store

- Build Capacitor Android/iOS hosts and Electron Windows/macOS/Linux hosts from the same Web runtime.
- Preserve `com.blindsidedgames.idledysonswarm` and the existing Android/iOS signing identities so store installations update in place.
- Probe Unity storage read-only on mobile and in the Windows LocalLow, macOS Application Support, and Linux unity3d paths for Steam.
- Never overwrite or delete Unity files. Store Web saves and backups in separate application-owned locations.
- Add platform adapters for lifecycle, filesystem, native sharing, entitlements, purchases, local diagnostics, and app metadata.
- Add a native-only Store tab with three consumable tips (`ids.tiptier1`, `ids.tiptier2`, `ids.tiptier3`) and two non-consumables (`ids.doubleip`, `ids.devoptions`).
- Use live Apple/Google pricing and localized store-provided currency. Mirror their base price bands on Steam with recommended regional conversions.
- Implement StoreKit 2, Google Play Billing, and Steam Inventory Service adapters.
- Steam tips are consumable and repeatable with no gameplay benefit. Double IP and Developer Options are non-tradable permanent inventory entitlements.
- Restore Purchases restores only Double IP and Developer Options.
- Cache verified ownership locally for offline use. Network failure does not revoke an already verified entitlement.
- Trust valid same-device Unity evidence once during migration, but never transfer that evidence through a shared save.
- Keep Developer Options' in-game Quantum Shard/Strange Matter unlock as an alternative to purchasing it.
- Preserve hard-reset and soft-reset entitlement semantics.
- Hide the Store tab on the website until a separate Web payment provider is deliberately planned.
- Provide local-only, redacted diagnostic export. Collect no remote telemetry.

## 3. Website and PWA integration

- Build an installable PWA with base path and service-worker scope `/play/`.
- Use hashed precached assets, network-first navigation with offline fallback, and never place save data in the service-worker cache.
- Download updates in the background, but apply them only after a verified checkpoint and explicit player acceptance.
- Use the existing Blindsided Games Cloudflare Pages project. `https://ids.blindsidedgames.com/` redirects to `/play/`, and `https://ids.blindsidedgames.com/play/` is the canonical playable URL.
- Refresh the existing Idle Dyson Swarm product page, retain all platform and policy links, and add a prominent Play on Web action.
- Keep the PWA under `/play/` in the website repository and merge its route-specific security rules into the website's root `_headers`.
- Add a manual promotion workflow that tests and builds the Web release, records version/SHA/checksums, copies pinned output into the website repository, and opens a protected website PR.
- Use the website PR's Cloudflare preview for acceptance. Do not merge the production deployment PR without separate authorization.
- Introduce no Cloudflare storage, Functions, accounts, or sync backend.

## 4. CI, signing, packaging, and private store validation

- Set marketing version `4.0.0`.
- Generate release-candidate IDs as UTC `YYYYMMDDNN`: Android integer version code, Apple-valid `YYMM.DD.NN`, and Electron/package metadata `YYYYMMDDNN`.
- Use standard public-repository GitHub-hosted Linux, Windows, and macOS runners only. Prohibit larger runners, configure a zero-overage budget, use conservative caches, and retain artifacts for one day.
- Ordinary commits run unsigned tests and build checks. A protected manual release-candidate workflow performs signing, packaging, and private uploads.
- Reuse the existing Android Play upload key through protected secrets. Remove the keystore from the current tracked tree without rewriting history.
- Use protected App Store Connect credentials, distribution certificate, and provisioning profile for signed iOS and notarized macOS packages.
- Package Electron depots for Windows, macOS, and Linux under Steam AppID `4348570`; Windows remains unsigned.
- Upload to Play internal testing, TestFlight, and a private Steam beta branch.
- Execute real private-store tests on the available iPhone, Android device, and Steam PC for tips, Double IP, Developer Options, restoration, offline ownership, and save-transfer isolation.
- Produce checksummed submission artifacts, release notes, store metadata checklist, and a rollback record. Public promotion remains outside this phase.

## 5. Verification, commits, and completion gates

Automate codec round-trips, genuine and controlled fixture imports, zero-unclassified-field coverage, save-size limits, preference retention, entitlement stripping, offline-time rules, fault-injected backup recovery, reset behavior, PWA offline/update behavior, existing-install native upgrades, purchase flows, accessibility, localization, and performance regression checks.

Use focused commits for:

1. Public Unity fixture exporter and schema-11 coverage manifest.
2. `IDSWEB1` codec, mapping, import, and transactional repository.
3. Save-management/recovery UI and offline-time rules.
4. Platform services and entitlement isolation.
5. Store UI and Apple/Google/Steam adapters.
6. Capacitor and Electron hosts with Unity migration.
7. PWA, website integration, and automated website PR promotion.
8. CI signing, packaging, private uploads, and certification documentation.

Each major implementation surface receives focused tests and independent review before acceptance. Baseline failures are reported separately from regressions.

The phase completes only when all fixtures pass, every schema-11 field is classified, signed packages and Steam depots are reproducible, existing Unity installations migrate safely, real private-store purchases/restores pass, the PWA passes preview/offline/update testing, and all original/recovery saves remain intact.

Explicitly excluded are cloud sync, remote telemetry, Web-to-Unity export, production store rollout, and paid CI dependencies.

## Implementation status (2026-08-02)

Completed, committed, and independently reviewed:

- Compact deterministic `IDSWEB1` persistence and shared-save entitlement stripping.
- Public Unity schema-11 fixture coverage and field classification.
- Installable `/play/` PWA and protected website-promotion package.
- Context-aware import, capped automatic-migration away credit, rotating recovery, and recovery UI.
- Browser, Capacitor, and Electron save-storage and read-only Unity-discovery boundaries.
- Native-only Store surface, entitlement projection, purchase restoration, and audit-safe Unity evidence promotion.

Implemented in the current native-host checkpoint and undergoing final independent review:

- Pinned Capacitor Android/iOS and Electron Windows/macOS/Linux applications using the native-relative Web build.
- Native application-owned save storage, single-writer Electron operation, lifecycle checkpoints, metadata, diagnostics, and read-only Unity discovery.
- StoreKit 2 and Google Play Billing adapters with localized prices, repeatable tips, durable Double IP and Developer Options, restoration, and offline entitlement caches.
- Standard-runner, zero-overage verification for Web, Electron, Android, and unsigned iOS simulator builds.
- Reproducible native release metadata for marketing version `4.0.0`, release candidate `2026080200`, Android version code, Apple build number, and Electron package metadata.

Still required before the phase can be certified:

- Implement the Steam Inventory adapter through a supported Steamworks native binding; the current Electron dependency does not expose the required inventory purchase surface.
- Verify the tracked Android keystore's exact upload-key identity and rotation path before removing it from the current tree; release signing already fails closed without protected inputs.
- Add the protected manual release-candidate workflow for signing, checksums, and private TestFlight, Play internal-track, and Steam beta uploads.
- Compile and archive the iOS host on the available Mac/Xcode environment.
- Complete physical-device existing-install migration and real purchase/restore certification.
- Exercise the Cloudflare preview acceptance flow; public promotion remains separately authorized.
