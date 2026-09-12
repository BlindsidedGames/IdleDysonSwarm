# Player save compatibility review — 2026-09-12

No introduced save compatibility or recovery regression was found between baseline `878f5bffecd59c699712103172e668d12853d16a` and candidate `7bc88cd7`. This is a finite source and automated differential review, not a guarantee for every player save or acceptance of native storage SDKs. Browser import/export/reload interaction evidence is recorded separately.

## Changed production paths

- `src/save/legacyStructuralDefaults.ts`, `migrate.ts`, and `numericRepair.ts`: the same 22 structural default literals are shared between migration and repair. Consumers and mutation behavior were inspected; 176 full migration comparisons exercise eight missing/invalid/boundary values per field.
- `src/save/serialization.ts`: the removed intermediate object did not change recursive value encoding or lexical key order. Exact canonical and shared export bytes matched across 14 valid historical/progression inputs, with successful cross-version re-import in both formats.
- `src/platform/portableCloud.ts`: extracted remote/local preparation preserves operation order, first valid backup selection, future-schema blocking, and primary-load acknowledgment. Full ordered calls and normalized returned graphs matched in 17 startup scenarios.
- `src/application/productionApplicationFactory.ts`: cloud publication extraction preserves successful behavior; its intentional generation guard prevents an older failure from erasing a newer publication marker. The focused factory suite includes that regression.
- Repository, import-context preparation, validation, mapping, IDB1 decompression, and gzip integrity implementations are unchanged. Their current boundaries were nevertheless exercised because changes elsewhere can feed them different values.

## Fresh evidence

Candidate save/recovery/mapping suites passed **382/382** tests across 21 files; the corresponding baseline selection passed **379/379**. The three additional tests cover serialization ordering (two) and cloud retry generation (one). This selection includes 151 transitional-v2 checkpoint cases, 57 repository cases, 31 mapping cases, 15 browser database cases, Steam recovery, startup, offline checkpoints, import contexts, numeric migration, and save export.

The independently loaded baseline and candidate implementations passed **474 differential comparisons**. Comparisons use complete graph equality, exact serialized bytes, structured errors, and ordered storage traces rather than selected field snapshots:

| Area | Comparisons |
| --- | ---: |
| Decode; prepare; hydrate/dehydrate/serialize | 16; 15; 15 |
| Manual, automatic Unity, and transitional import contexts | 45 |
| Exact canonical/shared export bytes; cross-version re-import | 28; 28 |
| Truncation, invalid base64, checksum damage, whitespace | 60 |
| Supplied, compressed, and inflated size limits | 45 |
| Schema encoding boundaries; future-schema import rejection | 5; 2 |
| Shared structural defaults and numeric repair | 176 |
| Recursive serialization rejection/order boundaries | 5 |
| Cloud startup operation traces | 17 |
| Durable repository recovery and commit operation traces | 17 |

The corpus comprises seven historical/support inputs and nine progression fixtures. Fourteen complete the valid preparation pipeline. The schema-7 raw Odin debug object is inspectable but fails normal save validation in both versions; the deliberately malformed support attachment fails decoding in both. A comparison passing means identical behavior, including rejection or a returned blocked result; it does not mean every supplied input was accepted. The JSON uses `returnedWithoutThrow` for precisely this reason.

Prepared-save copies remain detached, decoded inputs and receiving import states remain unchanged, and all six injected commit failures preserve current-save bytes. Commit injections cover write, temporary read, backup copy, atomic replacement, corrupt temporary read-back, and substitution with another valid save. Startup comparisons cover healthy current, future current, corrupt current plus valid backup, a future newest backup, all invalid backups, legacy-only, corrupt current plus legacy, invalid legacy, missing artifacts, and healthy current plus a corrupt backup. Future save bytes remain intact; recovery may still preserve a corrupt primary into a recovery artifact before blocking, so this does not assert that the entire storage map is untouched.

The existing 151 transitional checkpoint tests were run in each version. They cover schema-13 checkpoint/recovery constraints, retirement proof, job/hash validation, and races; the new differential script does not claim to reconstruct all those scenarios independently.

## Pre-existing finding: legacy IDB1 CRC32 is not validated

`src/save/decodeIdb1.ts:252` checks inflated size but does not validate the gzip CRC32 trailer before returning. This code is unchanged from baseline. Canonical IDSWEB1 decoding explicitly validates its trailer at `src/save/serialization.ts:472`.

Flipping a CRC byte was accepted identically for all five valid historical IDB1 envelopes; the nine canonical progression envelopes rejected equivalent corruption. A bounded follow-up changed only the UTF-16LE `dateStarted` literal in the canonical schema-8 Odin fixture from `02/01/2026 01:56:16` to `12/01/2026 01:56:16`, recompressed it, and retained the old CRC32 while keeping the same size. Both versions decode and fully prepare that modified import, whereas Node zlib rejects its checksum. Complete decoded graph comparison confirmed that only the date field changed.

This demonstrates that a structurally valid legacy payload with a stale checksum can pass import validation. It is not evidence of spontaneous data loss, an introduced regression, or a failure in canonical write verification. No player save, external account, or real repository storage was modified by this experiment. A legacy checksum fix would intentionally change which historical inputs are accepted and is deferred to a separate compatibility change; no production code was altered during this review.

## Reproduction and scope

`docs/audits/player-save-review-2026-09-12.json` retains fixture hashes, comparison counts, suite results, and the bounded CRC finding. Local ignored artifacts are in `output/player-review/`: `save-differential.ts`, its full JSON rows, `idb1-crc-repro.ts` and JSON, and the three raw Vitest JSON reports. Run the scripts with `npx tsx` from the candidate checkout while the clean baseline source remains at the stated revision in the primary checkout.

Cloud and durable storage cases use in-memory adapters, fixed time, and complete operation traces. They verify application-level preservation and recovery behavior; real IndexedDB UI interactions, host filesystem atomicity, signed native SDKs, and live cloud account behavior require their own evidence.

## Independent review of browser assertions

Reviewed `output/player-review/save-browser.ts`, `save-transfer-browser.ts`, `offline-browser.ts`, their available results, the shared browser helpers, and the export implementation without repeating passing browser runs.

- Save browser results contain 18 successful fixture/build runs. Their marker verifies skill ownership/levels/presets, selected Infinity balances, and Quantum state. It deliberately omits ticking production, but also omits non-ticking progression such as research, manual facility ownership, Reality/Simulations state, stored time, and saved settings. A direct read of the retained exports confirmed that `reality-unlock` and `mature-simulations` have identical markers in both builds. The checks must therefore be described as selected progression preservation, not complete save equality.
- Export can request a fenced checkpoint when state is dirty (`browserRuntimeFoundation.ts`, `readCurrentSaveExport`). Export immediately before reload verifies durability with that assistance; it does not independently exercise normal automatic checkpoint timing. A representative command/settings change followed by reload without a preparatory export would close that separate acceptance gap. Assertions on saved settings must read the prepared save's actual root fields rather than assume that the hydrated simulation state contains them.
- The import fixture helper activates buttons and navigation with DOM `.click()` and inserts text via a native textarea setter. The subsequent shared action helper dispatches CDP mouse move/press/release events and checks the center hit target. Those actions provide browser mouse-path evidence, including obstruction detection; fixture import and route changes do not establish physical pointer delivery, and none establishes native touch acceptance.
- Offline results pass exact bank checks for both builds: arming/canceling retains 3,600 seconds; confirmed one-minute spend leaves 3,540; repeat leaves 3,480; running cancellation retains 3,480; speed-up consumes the remainder. This strongly checks spend accounting without a tolerance that could conceal a duplicate charge. It does not independently assert rollback of every working simulation field or bank durability after reload. Completion gain text is retained but differs with real elapsed active time and is not an exact gameplay-equivalence assertion.
- The corrected transfer result passes 12 checks per build: nine opposite-build selected-marker imports, exact downloaded bytes, exact clipboard bytes, and reviewed import of the downloaded file. The initial `Download File` versus actual `Save File` harness label error was corrected before acceptance. Exact download and clipboard byte comparisons are strong; repeat runs should use a unique empty download directory so an old artifact cannot satisfy the file wait. File-input assignment through CDP verifies web handling of a real file, not the operating system chooser UI.

These limitations were sent to the parent reviewer for targeted follow-up: broader stable progression/settings assertions, autosave reload without export assistance, offline cancellation durability, and the separately planned real IndexedDB multiwriter/backup recovery scenarios. No production defect is inferred from a missing assertion.

The parent expanded the save marker following review. Inspection confirms actual typed fields for manual facilities, research levels, automation, allocation, Dream reset/upgrades/education, Avocado, challenges, capacity, bank, and universe designation. The first expanded run exposed expected active behavior in the oracle: bank accrues a small amount on reload and universe designation advances automatically. It also exposed a fixture/default distinction: confirmed reset uses bot allocation 0 while the checked-in fresh progression fixture has 0.5. Those assertions require explicit monotonic or reset-contract treatment; their failures in baseline are not evidence of an introduced regression. The corrected expanded run passed all 18 fixture/build cases. Its stable marker retains capacity, uses Reality unlock status rather than the growing designation count, and excludes the accruing bank. Reset comparison explicitly accounts for the verified 0 default allocation. Direct decoding confirms that the final marker distinguishes all nine retained progression exports in both builds. This supersedes the original marker scope for same-build reload/cancel/reset/restore acceptance; the cross-build transfer script still uses its narrower marker. Bank persistence and autosave without export assistance remain separate checks.

## Follow-up: real browser storage and autosave oracle

Reviewed `storage-browser.ts`: both tabs share the same Chromium context and origin, the second tab must first show `Use this tab`, takeover is performed through the mouse helper, and the first tab must subsequently lose its gameplay UI. Both builds passed takeover with selected Skills/Quantum progression retained and old-tab UI fencing. This is not a direct attempt to force a stale writer through the storage API.

The harness navigates the surviving page to the same-origin manifest document and closes the second app page before injecting faults into disposable IndexedDB. Its evaluated Promise waits for the transaction to complete, and the inactive lease reset preserves generation. Both builds recovered the selected progression marker after deliberate corruption of primary bytes with a valid backup supplied. This establishes application startup recovery through real IndexedDB; it does not compare every recovered save field.

The first future-primary attempt displayed the correct generic blocked screen (`Saved progress needs attention`) but timed out because the harness awaited words not shown there. Exact-byte verification was downstream and therefore had not run in that attempt. The corrected final result passes all four storage checks in both builds, including absence of gameplay UI and an exact read-back match of the injected future primary despite valid backups. Both retained error inventories are empty. The screenshot currently named `-recovered.png` is taken after the future-block step and should not be described as a recovered game screenshot.

Independent inspection found a material false-pass possibility in the initial Skills autosave probe: its imported funded fixture has empty owned skills and active assignment queue, and the probe assigns then resets back to those same values before waiting 31.5 seconds. Reloading the original imported save could satisfy those checks if the later autosave never occurred. This finding was sent to the parent for a targeted correction: durably capture a nonempty assignment first, then reset and wait without exporting, or retain a new nonempty assignment through an autosave-only reload. The initial two passing results alone are not accepted as proof that reset was automatically persisted.

## [P2] Pre-existing: resetting Skills can revive its cleared queue after reload

The corrected autosave probe first checkpointed four owned skills and verified that nonempty sentinel by reload, then reset and waited 31.5 seconds without export assistance. Both builds reloaded with no owned skills, confirming that ownership reset was durably saved. However, the cleared live auto-assignment queue contained the same four IDs after reload. This is a pre-existing player-facing queue-persistence defect, not intended retention of saved preset layouts and not an introduced refactor regression.

A bounded pure-source reproduction independently confirms the mechanism in baseline and candidate:

1. Import the funded mid-swarm fixture and purchase `coldFusion`, which also purchases prerequisites. The queue becomes `[manualLabour, burnOut, fusionReactors, coldFusion]`.
2. Serialize the checkpoint and prepare/hydrate it again. Preparation materializes legacy `skillAutoAssignmentList` as `[56, 16, 66, 67]` in the preserved source.
3. `resetCanonicalSkills` explicitly clears the live queue at `src/simulation/canonicalSkillTransactions.ts:717` and refunds these four owned skills. Retaining independent saved presets is intentional; retaining the live queue is not.
4. Dehydration writes empty `skillAutoAssignmentIds` and empty bit representations at `src/game-state/mapping.ts:861`, but leaves the preserved legacy `skillAutoAssignmentList` populated.
5. On the next preparation, `src/save/migrate.ts:354` treats an empty ID array as a reason to fall back to that stale legacy list. Hydration revives all four queue IDs while ownership remains empty.

The baseline and candidate repro outputs are exactly equal. Immediate reset queue and ownership are empty; serialized canonical IDs are empty; serialized legacy list remains `[56, 16, 66, 67]`; post-reload queue contains all four skills. This can restore player-cleared auto-assignment intent on load. The experiment establishes queue revival, not an observed subsequent purchase or resource loss. No production fix was made. A separate fix should reconcile the legacy queue representation while preserving deliberate saved-preset retention and historical imports.

Reproduction: `npx tsx output/player-review/reset-queue-repro.ts`. Its compact result is included in the tracked JSON report. The script reads fixtures and runs application functions in memory; it does not touch player storage or external services.

## Historical browser import marker exception explained

The historical browser run accepted all five inputs in each build. Eight of ten cases matched the static prepared marker exactly. Both `support-case-01-attached-idb1.txt` cases exported two available Skill Points versus zero in the initially prepared input; all other compared marker fields matched. A bounded pure baseline/candidate reproduction using actual Dyson derivation confirms intended goal catch-up: initial `goalStage=2`, completed stages `[2,3]`, awarded points `2`, final `goalStage=4`, and points `2`. Owned skills remain unchanged, and a second catch-up pass awards zero. Results match exactly across both versions.

This follows the explicit imported-save catch-up contract in `src/simulation/canonicalGoalProgression.ts:30`, called by the canonical event model. It explains the observed two static-marker exceptions without changing production code or rerunning the browser. Evidence: `output/player-review/legacy-goal-catchup.{ts,json}`, with compact results retained in the tracked JSON report. The raw browser result still correctly records its original strict assertions rather than being rewritten as a passing run.
