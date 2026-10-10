# Rework beta save safety — 10 October 2026

Status: Matthew selected `IDLEDS` and authorized one-way migration code with synthetic verification. The isolated candidate now writes `IDLEDS:`/schema 21 and retains supported historical readers. Deployed startup/publication is deliberately held pending storage/account namespace approval. No app identity, namespace, migration choice, compensation, real-save path or actual account/cloud data has been changed. No native game was launched.

## Authorized candidate implementation

- `src/save/serialization.ts` emits only `IDLEDS:` with inner `format: IDLEDS`; bounded `IDB1`/historical canonical `IDSWEB1` and historical V2 import behavior remain. Envelope/prefix mismatches fail rather than being ambiguously reclassified. Normal checkpoints use prepared schema 21; schema 22 is incompatible and does not fall back to older backups.
- `PortableSaveRepository` retains exact public/legacy/manual/cloud source text before replacement. It writes `<legacyRecovery>.one-way/<sha256>.source.txt` once, verifies the bytes, writes/verifies separate local metadata (source format/schema, SHA, archive UTC, destination IDLEDS/21). Source build is explicitly null when unknown. Archives are outside rotating backup slots, survive subsequent commits, and are never automatically deleted or overwritten. An existing recovery original is itself archived and verified before its slot can be replaced. Interrupted replacement can reuse a matching archive. Failed archive verification stops before converted temporary publication.
- Keep/Fresh retains its existing once-per-save marker and consequences. No new reward delta, compensation or choice UI is implemented by the format migration. Manual import and Cloud selection pass their exact source text to the commit boundary; automatic Unity archival precedes host purchase-evidence promotion.
- `reworkPublicationPolicy.ts` supplies a deployment hold to both production browser and native compositions. Runtime checks it before writer acquisition, Store initialization, application creation and legacy recovery. Repository checks it before recovery/discovery/publication. Existing database/profile/native roots are unchanged. The resulting production runtime is **blocked**, not playable, until an approved isolated policy replaces this hold.
- Existing Steam Cloud rejects IDLEDS for both publication and conflict preservation before rotation, current, conflict or marker writes. Public historical reads/backups remain supported. No production cloud namespace or account selection has been changed. Existing native host-level SDK/profile initializers are not certified as isolated; this guard does not authorize a native launch.

`output/save-safety/idleds-migration.json` proves actual chosen IDLEDS/21 fed to pinned public 4.1.11 returns `recovered-backup`, with rejected-copy/temporary/replace writes. Our held repository performs zero writes/discovery and preserves current. Isolated conversion preserves exact source, reopens at 21, Keep/Fresh retries do not change state, and schema 22 returns `unsupported-future-version` with zero writes. These are source/in-memory checks, not packaged native execution.

The archive is durable source evidence; metadata is not a transferable ownership or gameplay reward receipt. Schema/format plus existing choice/award receipts identify the converted state. There is no public-game exporter or reverse converter. Archive retention/deletion, host identity, shared-account behavior and reward policy remain decisions for Matthew before rollout.

## Verified source and synthetic probes

Public source is archived at `bdd95551912f8524c5abd02f52417fe9b9f7b799`; its checked-in desktop metadata identifies 4.1.11, build 2026100404. At the 32b88866 audit checkpoint, rework and that snapshot both used schema 20 and the `IDSWEB1` envelope; the authorized candidate described above now uses IDLEDS/21. The public snapshot uses the isolated current dependency runtime; probes invoke domain, serialization and in-memory repository boundaries, not a packaged public binary.

Four synthetic saves contain actual replacement entry or completion plus a real 9,000-second Forager advancement. No player save/account data was read. Results:

| Synthetic rework input | Public 4.1.11 result | Consequence |
| --- | --- | --- |
| Active replacement Blank Slate | Accepted; next public Infinity clears legacy active state and grants a legacy Catalyst (6 → 7). | Public interprets the replacement as the old challenge. Returning that checkpoint to rework fails with `Invalid replacement challenge progress`. |
| Completed replacement Blank Slate | Accepted; an immediate public checkpoint preserves the new receipt and civilization data. After a public Infinity, available SP goes 2 → 0 while the new completion receipt remains. | Unknown-field preservation alone is insufficient for safe downgrade. This is a measured counter change, not a claim that all public gameplay/save fields are lost. |
| Active Lean Build, before or after its first incomplete Infinity | Public rejects challenge data as invalid. | Public startup with an older valid backup restores that backup, copies rejected bytes to recovery and replaces current. The synthetic repository performed three writes/copies. |
| Synthetic schema-21 envelope/state | Public returns `unsupported-future-version`. | With the same older backup available, startup performs zero writes and leaves current byte-for-byte unchanged. |

The ordinary public checkpoint preserved current civilization data, replacement receipts and migration marker in the accepted cases because the save mapping retains unknown source fields. This limited success does not establish downgrade support: running public mechanics demonstrably damages the replacement contract. No blanket unknown-field-discard claim is justified by this probe.

Exact probe output is `output/save-safety/cross-build.json` in the isolated task checkout. The standalone probe is `/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/cross-build-save-probe.mts`; the pinned source snapshot is alongside it. The initial loader attempts failed before producing results; the completed probe uses `.mts`, checked-in IDB1 input and actual public/current source boundaries.

## Shared identities and side effects

- `src/browser/productionBrowserStorage.ts` keeps the deployed IndexedDB name `idle-dyson-swarm-web-development-v1`, profile `development-only-default-profile`, and `/development-only/...` paths. A different URL path on the same origin does not isolate this database.
- Electron, Capacitor, Android release and both iOS build configurations use `com.blindsidedgames.idledysonswarm`. Android debug adds `.debug`, but that is not a coordinated beta identity across hosts.
- Native adapters use `web-runtime-v1`, with the same current/temporary/three backup/recovery relative paths. Electron's ordinary launch uses the established userData location. A temporary smoke userData root does not isolate every source: `discoverUnitySaves` still derives Unity paths from the real home directory, and Steam paths/SDK have their own handling.
- iOS code uses `UserDefaults.standard` for review/legacy entitlement reads; native StoreKit has a Keychain cache. Merely changing the web save root is not proof of preference, Keychain, purchase or account isolation. No CFPreferences/UserDefaults or Keychain runtime probe was attempted.
- Published Steam Auto Cloud uses app 4348570 and four nonrecursive files in `Idle Dyson Swarm/steam-cloud/{64BitSteamID}`. A Steam beta branch shares that app/account/cloud configuration; the branch name is not a data namespace. The Steam host also discovers legacy Unity saves and writes a migration-account claim.
- Existing repository publication verifies temporary bytes before atomic replacement and rotates three backups. Those rotating slots are recovery history, not an immutable pre-rework archive: normal play eventually replaces them. Existing manual import creates a rollback checkpoint of the receiving save; that is not necessarily an exact archive of the imported public source.

## IDS Web prefix investigation

Matthew's 07:02 direction approves one-way migration and the first two ages as
the beta scope. Matthew subsequently selected IDLEDS for the codec. This does not approve changing
production storage keys or account namespaces. "IDS Web" currently covers several independent identities:

| Identity | Current role | Rename consequences |
| --- | --- | --- |
| `IDSWEB1:` transport prefix and inner `format: IDSWEB1` | Bounded base64/gzip/CRC/value-codec discriminator in `src/save/serialization.ts:24`; envelope schema must match state schema. | Both decoder and encoder require a coordinated format change. Preserve `IDB1` and existing `IDSWEB1` import adapters; emit only the new format if approved. |
| Transitional V2 `IDSWEB1:` | Historical manual-import adapter in `src/save/import.ts:159` and `src/save/transitionalV2Checkpoint.ts:63`. | Historical input must retain its exact old discriminator; do not globally replace it. Future canonical formats must not fall through to historical recovery. |
| Steam portable snapshot validation | `hosts/electron/steam/cloud.mjs:8` rejects anything without the literal existing prefix. | An approved new codec needs host validation plus conflict/import certification. This is separate from permission to enable production cloud. |
| Browser IndexedDB/profile/path namespace | The deployed database/profile and runtime foundation both retain web-development identifiers. | Codec naming does not change data isolation. Database/profile migration and sidecars require their own transaction and stable beta origin. |
| Native `web-runtime-v1` | Electron/Android/iOS/platform adapter save roots, including account/offline recovery roots. | A transport rename leaves these paths shared. All hosts and recovery paths must agree on an approved new root. |
| `.idsw`, export filenames and fixture `.idsweb1.txt` names | Filename/fixture conventions, not the decoded schema discriminator. | Cosmetic renaming cannot establish incompatibility or data safety. Historical fixture bytes/names should remain historical. |

A second synthetic public-repository probe tested schema 21 with the existing
prefix, an `IDS1:` outer prefix, and both outer/inner `IDS1` identifiers. Existing
`IDSWEB1` returned `unsupported-future-version`, zero writes and unchanged current.
Both experimental `IDS1` variants returned `recovered-backup`: public copied the
rejected bytes, wrote temporary and replaced current with its older valid backup.
Thus a new prefix in a shared path weakens the proven fail-closed behavior. It
must not be used as the sole downgrade guard. Evidence is
`output/save-safety/prefix-rename.json`; the isolated probe is
`/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/prefix-rename-probe.mts`.

The earlier recommendation to retain IDSWEB1 for the first schema bump is superseded by Matthew's explicit IDLEDS choice. Dual old readers/new writer and fail-closed deployed publication now implement that choice without claiming that the prefix protects shared storage. The exact selected-prefix probe is `output/save-safety/idleds-migration.json`.

## Concrete one-way migration transaction proposal

1. Discover/import only approved old inputs; decode, bound and validate them
   without mutating the source. Identify schema, rework status and SHA-256.
2. Write and verify the exact source archive in private isolated recovery
   storage. A shared export is not an exact private backup. If archival fails,
   stop before conversion or rewards.
3. Build one schema-21 candidate with a versioned one-way migration receipt.
   Preserve earned achievements, historical times, ownership, existing reward
   receipts and paid-cycle settlement. Keep the existing Keep/Fresh choices and
   their concrete consequences until a separately reviewed replacement is
   approved; neither choice supports return to old gameplay. Do not silently
   invent compensation for retired currencies or continuation receipts.
4. Show the migration's concrete effect and one-way notice before the player's
   choice. Publish only the selected validated candidate through the existing
   verified-temp/atomic-replace boundary in its approved namespace. Do not mark
   migration complete, reveal new progress or grant a delta before commit.
5. Reopen that candidate and verify its receipt. Retries of the same conversion
   must not grant duplicate Catalysts/SP, repeat Fresh refunds or reuse a paid
   cycle. Preserve unsupported newer candidates without older-backup fallback.
6. Export only rework checkpoints going forward. Recovery archives remain data
   recovery sources; there is no reverse converter, downgrade UI or claim that
   the resulting rework state is valid in public gameplay.

Before rollout, approval is still needed for the exact storage/app/cloud
identity, archive retention/deletion policy and any reward compensation. The format-name decision is resolved as IDLEDS; the candidate transaction is implemented and held. The extra Forager Catalyst placement and historical finite-reward
policy are separate pending gameplay decisions. The candidate schema/codec change is local code only; no path/account choice or real-save migration has occurred.

## Recommended policy requiring approval

1. **Format boundary:** use schema 21 for rework checkpoints. Matthew approved IDLEDS; supported legacy IDSWEB1 readers remain, with schema-21 prepared checkpoints written only as IDLEDS. Import supported public schema ≤20 through the existing validated pipeline; present a concrete one-way migration flow before changing user choices or compensation. Public 4.1.11 already fails closed on 21, as proved above. A channel/version marker can identify rework history for diagnostics, but a schema-20 marker alone cannot protect older builds that ignore it. Rework checkpoints must never be converted back into playable public checkpoints. Original-data archives support recovery and migration diagnostics, not a sanctioned downgrade path.
2. **Persistent beta namespace:** use a stable `gameplay-rework-beta-v1` channel namespace, not a new directory per build. Give web beta a separate origin and explicit beta database/profile. Give every native beta save adapter a distinct `web-runtime-rework-beta-v1` root; keep all current/temporary/backups/recovery/Stored Time jobs under it. Keep production namespaces untouched. Before distributed beta approval, enumerate and verify every host's resolved paths.
3. **Local native QA:** use a separate beta app/bundle identity and clean simulator/test-device or disposable host account/profile. Disable real-home Unity discovery, real account/cloud initialization, purchasing and achievement publication in that QA mode. Verify the app-data, preference and Keychain identities before launch. A dedicated `.reworkbeta` identity is proposed, not configured. Store beta updates installed under the existing production identity require a separately approved path/account design; changing identity affects store-product/entitlement setup and is not a silent technical substitution.
4. **Cloud:** start this beta with local-only saves. Do not initialize the existing Steam cloud folder, publish achievements, write a production migration claim or automatically upload rework checkpoints. If cloud testing is required, provide an explicitly approved isolated provider namespace/test account and verify it before enabling. No shared-account behavior was changed here.
5. **Archive before conversion:** retain the exact unmodified public source in a write-once local archive with SHA-256, source schema/build and import timestamp. Verify its bytes before publishing a rework candidate; if archive verification fails, leave the old candidate untouched. Preserve existing three-slot beta backup rotation separately. An archive must survive Fresh, reinstall/export planning and ordinary rotation; its deletion and retention policy need approval. Do not rely on a shared export that deliberately strips device ownership/personal-best data as the exact private backup.
6. **Recovery:** classify a newer schema as incompatible, never corrupt. Preserve unsupported newer checkpoints and stop before scanning an older backup or legacy source. Channel-aware import/recovery should explain the one-way migration and recover original bytes without claiming that downgraded play is supported; the flow requires review before implementation. Keep current failed-save rollback and atomic commit behavior.

Namespace/app/account proposals remain pending. Codec/schema/archive/publication-hold code is authorized separately from localization and verified synthetically. Existing future-schema refusal remains intact. Native QA remains blocked on verified isolation; ordinary browser QA uses a disposable profile, synthetic save, mock Keychain, enabled Chromium sandbox and loopback-only requests.

## Follow-up verification after policy approval

Exercise public → beta Keep and Fresh; failed archive/write; beta checkpoint/reopen; corrupted current plus beta backups; mismatched/newer channel/schema with zero mutation; beta → public refusal; exact public archive restore; interrupted migration and Stored Time; cross-host export/import; and intentional cloud conflict tests only in the approved isolated environment. Preserve earned achievements, historical times, receipts and ownership records without inventing new reward compensation.

Retired achievement goals and old Quantum/Reality speedrun categories remain gameplay/content decisions. The recommended early-beta option is to preserve earned records and historical times while hiding obsolete acquisition claims; alternative is versioned replacement goals/categories. Neither option is applied by this audit.

## Candidate verification and landing boundary

Final candidate: 2,291/2,291 tests pass, zero failed/pending/todo. The earlier six new owner cases increased 2,287 to 2,293; two duplicate local/cloud choice matrix rows were consolidated when both choices became held for rework data. Provider tests still exercise public backup recovery, interrupted first conversion, account changes, future versions and public conflict preservation. Unsupported rework conflict publication has one owning filesystem regression. Legacy bidirectional new-save/public-cloud semantics are retired; forward public import plus held re-publication is the replacement contract.

Red-before-fix evidence: the initial five format/archive/hold expectations failed for their intended reasons (`idleds-pre-fix.json`). Extending the original-preservation owner test found a prior recovery original could be overwritten; it failed with a missing exact archive before `copyToLegacyRecovery` (`idleds-prior-recovery-pre-fix.json`). Steam conflict preservation initially resolved instead of refusing IDLEDS and wrote the conflict snapshot (`idleds-conflict-red.json`); the guard now stops that path. One initial probe attempt had a missing test fixture import, was corrected and was not counted as regression evidence.

TypeScript, zero-warning oxlint, promotion validation, Vite production build, production Store boundary and Steam host syntax pass. The npm build wrapper encountered the local tsx CLI IPC permission error; equivalent direct Node/tsx-loader build steps completed. The pre-existing >500kB bundle warning remains. Test-audit's OpenClaw/crabbox/autoreview wrappers/skills are unavailable in this repository/session; direct Vitest, executable checks and manual diff review were used. Historical IDB1/IDSWEB1 inputs and both old progression fixture sets are byte-unchanged. Current synthetic profiles were generated separately in `test/fixtures/progression-rework-idleds/`; first-Dyson's prepared-state digest updates solely for the new schema, while all gameplay snapshot facts remain unchanged.

The candidate is a local review commit, with no primary-main integration, push, release or real-save migration. Deployment is intentionally held rather than silently renaming deployed keys. Required decisions remain: stable web origin/database/profile; coordinated native root/app/preferences/Keychain identity; Steam/account/cloud and real-home legacy discovery policy; archive retention/export/deletion; and reward compensation/extra Forager placement. Actual 7+6 rewards remain a release blocker: the current opening still pays six Forager and six Farming points, with legacy Forager continuation intact. The Farming extension is a separate source-derived proposal at `ids-farming-city-readiness-proposal-2026-10-10.md`, not production gameplay.
