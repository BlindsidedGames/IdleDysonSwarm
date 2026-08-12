# Break Infinity Stage 0 baseline

Captured on 2026-08-08 AEST. This is evidence for the migration starting
point; it is not a schema-13 implementation or release certification.

## Repository baseline

| Item | Captured value |
| --- | --- |
| Branch | `break-infinity-migration` |
| HEAD | `1aaae346dc073215ec1d2be18c56bfa50e49acf5` |
| HEAD subject | `perf(web): reuse prepared event contexts (#92)` |
| Upstream | None configured |
| Toolchain observed | Node `24.11.1`, Vite `8.1.5`, Vitest `4.1.10` |

The checkout was already dirty before this document was added. The existing
changes were `Web/README.md`, `Web/docs/architecture.md`, and
`Web/docs/game-state-contract.md`; `README.md` and
`Web/docs/break-infinity-migration-plan.md` were untracked. Stage 0 did not
modify those files.

## Save corpus and schema authority

All five checked-in `IDB1` files decode as complete Odin streams with root type
`Expansion.Oracle+SaveDataSettings, Assembly-CSharp`.

| Artifact | Decoded schema | SHA-256 | Authority and purpose |
| --- | ---: | --- | --- |
| `test/fixtures/schema-08-canonical-idb1-main-save.txt` | 8 | `10E2E48CD989618918118E16D0900AF7D80F0F5DFB1AAD475423AC165AB00C78` | Authentic historical compatibility and parity fixture. |
| `test/fixtures/support-case-01-attached-idb1.txt` | 11 | `341450A13E25B60000674F5E1C0A3F56D2511CCEBDDAF6C138596E8AB0423219` | Authentic public support fixture used by the public schema-11 coverage test. |
| `test/fixtures/support-case-02-inline-idb1.txt` | 0 | `1453170946DA5FB204A098AE4BEC40A14D30640ACAD6C98BBB0D78FDD0BA2EE4` | Authentic historical compatibility fixture. |
| `test/fixtures/support-case-03-inline-idb1.txt` | 10 | `341747C7ADAE709990D93C028AA08345409985214FE8EE49314777ABB3D6827A` | Authentic historical compatibility fixture. |
| `src/application/firstRun/generated/first-run-schema-12.idb1.txt` | 12 | `259EF04EFC4946C51A6FEA96064A2D2F05A8DB5778A1ECF4B3943A42A317D4FF` | Unity-generated development first-run artifact, not evidence of a public schema-12 release. |

Public certification remains Unity application `3.0.328`, schema 11, source
revision `9b840fb2547ad507d4e529a610a031cc13782847`, Unity `6000.3.9f1`.
`mappingCoverageSchema11.ts` pins 519 leaf patterns with catalog hash
`0b0559fc79cda740529fafd6cb075edd3725255147cd8fbd06a568b4e46970b4`.
The current executable mapping manifest has 519 entries, 53 still unowned,
`coverageComplete: false`, and release canonical writes disabled.

The schema-12 artifact has its own checked-in provenance. It was exported by
Unity `6000.5.5f1` with a fixed `2000-01-01T00:00:00Z` first-run timestamp
through the production snapshot/preparation/`IDB1` pipeline. Its tests verify
the artifact and generated-catalog hashes, classified normalization deltas,
and development repository reload. It must stay labelled development-only.

The schema-12 companion JSON identities are frozen separately from the save
text:

| Companion artifact | Canonical-text SHA-256 |
| --- | --- |
| `src/application/firstRun/generated/first-run-schema-12.provenance.json` | `194BFE52C0884DD2A0E1DFD74B617933A4938B96D1CEA7EC1AB95281E004F4A4` |
| `src/application/firstRun/generated/first-run-schema-12.parity-deltas.json` | `E9E1A05C789C574F6932D07D0A8334056EA2A69F36B5B85051D1EF23AE9B8C36` |

JSON identities in this document are SHA-256 over UTF-8 text after normalizing
CRLF or lone CR to LF. This matches the repository's portable generated-file
hash convention and avoids treating a checkout's line-ending policy as a data
change.

The pre-Stage-0 baseline had no checked-in schema-12 `IDSWEB1` golden fixture.
Stage 0 closed that gap with a deterministic, development-only, non-private
fixture derived only from the checked-in Unity first-run artifact:

| Stage 0 Web fixture file | Identity or role |
| --- | --- |
| `test/fixtures/schema-12-canonical-idsweb1-first-run.txt` | 6,872 exact UTF-8 bytes; SHA-256 `671DB2BAC4B4FDD23ACE6E988AD3C71BB9DA7C689C17FA46DB1CDB8F506DF489` |
| `test/fixtures/schema-12-canonical-idsweb1-first-run.provenance.json` | Records schema 12, source identities, generation contract, and explicit non-use of browser profiles, IndexedDB, local production saves, and player/support saves; canonical-text SHA-256 `2B17332A5EB37FCA7E37B7CDFFC274A59834C3218E9B5B54D14DD4795AB952BA` |
| `scripts/generate-schema12-web-fixture.ts` | `--generate` is the only write mode; default/`--check` compares exact fixture bytes and canonical provenance without writing. |
| `src/save/schema12WebGoldenFixture.test.ts` | Three tests prove deterministic source equality, bounded schema-12 decode/preparation, byte-identical encode/decode/encode, provenance, and privacy classification. |

The generator contract is
`createDeterministicUnityFirstRunPreparedSave -> copyValidatedState ->
serializeWebSave`. It loads the application source through Vite SSR, then uses
the sorted-key, gzip-level-9, `mtime: 0` `IDSWEB1` serializer. The checked-in
fixture is verified by `npm run fixture:schema12-web:check`; regeneration is
the separate, explicit `npm run fixture:schema12-web:generate` action.

## Active, away, stored-time, and accelerated authority

The eight checked-in JSON parity definitions are also frozen at the baseline:

| Parity artifact | Canonical-text SHA-256 |
| --- | --- |
| `test/parity/assembly-line-automation-modes.json` | `DA29A07FA2FD173C0806CDFFC02CB920D5A9C7C2E9A417884A62333140633B3C` |
| `test/parity/bot-cap-transition.json` | `A251CDE33F2DAE6EF5C1AD2824C25C52CDDE6DD3B420324CDF5817DEA5CF1122` |
| `test/parity/dyson-no-skills-two-ticks.json` | `00C51964BB72C8762A0E615634F2637B895DC28F811EE30C6E936C8543AD4BD4` |
| `test/parity/dyson-static-skills-one-tick.json` | `2B4FCACC84AC8AA4E377A6799993550D4D7AD104172B651395BE256AD5F87667` |
| `test/parity/infinity-reset-transitions.json` | `2AB3606EA576E1BCE63ECAB042CE2C6ED51838E4E3981B7AF3AFDCEE79B93690` |
| `test/parity/infinity-trigger-boundaries.json` | `045BE31754C2237E67BB65B0465031ABA65F1E0135094BD7F7134098FC2C74EF` |
| `test/parity/save-migration-cases.json` | `3FBA6C15E384160A094E1D1ECF59023C605EB03207B495D21DDBF1E35473B1FA` |
| `test/parity/simulation-fixture.schema.json` | `FBA0151A124C4D21826E4F7EB28110E9DE78EA2EF0B15332ABABE1BB1D64038E` |

| Path | Current authority | Confirmed behavior | Remaining parity gap |
| --- | --- | --- | --- |
| Active | `eventTime.ts`, `canonicalEventTimeModel.ts`, `CanonicalGameApplicationFacade.advanceActive` | Shared event scheduler, approved coincident order, 0.1-second automation phase, and deterministic caller-frame partitioning. | No Decimal/V2 path yet. |
| Away/offline return | `lifecycleAwayTime.ts`, `canonicalLifecycleCoordinator.ts`, `timeResources.ts` | Background/quit timestamp replay is commit-first; it credits stored time and Dream Double Time and consumes the timestamp atomically. It does not directly replay resource production while backgrounded. | No golden complete-state scenario from departure through later stored-time consumption. |
| Stored time | `CanonicalGameApplicationFacade.commitStoredTime` using the `storedTime` event context | Uses the same whole-game event model and immutable definitions as active time, forces Buy Max, excludes transient Tinker advancement, and persists before publication. | Tests cover shared domains and cancellation/checkpoints, but there is no single full-state active-versus-stored equality corpus across all prestige layers. |
| Acceleration | Dream Double Time in `timeResources.ts` and the shared event model | Prepared multipliers apply to active and stored time; tests cover expiry mid-tick and adaptive railgun work across acceleration boundaries. | There is no separate generic accelerated engine or complete active/offline/accelerated equivalence fixture. Numeric equality is presently `number`/`bigint` behavior, not normalized Decimal equality. |

The practical baseline is therefore shared implementation plus focused tests,
not a complete three-path golden parity proof. Stage 4 must add the missing
whole-state, slice-partitioned Decimal evidence rather than treating the
current focused tests as that proof.

## Generated-data ingress

`scripts/export-unity-data.ts` is the deterministic boundary. It reads
`Assets/Data`, `Assets/Resources/Balance`,
`Assets/Resources/QuantumUpgradeDatabase.asset`, skill prefabs/icons, and the
legacy Skill/Research ID maps. `npm run data:check` currently verifies 559
Unity assets across 34 types, 371 projected runtime assets, and 104 skill-tree
presentation nodes.

All five generated JSON catalog identities are frozen, including the two
runtime/presentation projections not listed by the first-run provenance:

| Generated JSON | Canonical-text SHA-256 |
| --- | --- |
| `src/game-data/generated/catalog.json` | `A7CD177E845F8AF443535E29BF3F0E61F67DCD0EC01068604422DDC31FB8E0A1` |
| `src/game-data/generated/runtime-catalog.json` | `44DEA41A0A9645C0B0072DDA7423FF64AA2D1DD57F367DBB62FF2A7223822FB2` |
| `src/game-data/generated/legacy-id-maps.json` | `C66215D18F9A06BAD753DDE297BE3A37EC3C7A40DFA967C8FA77FD7D5FA717D6` |
| `src/game-data/generated/skill-migration-data.json` | `C0D8FDE4CF971CFA5733CC02986C3CC729CC67570225E3CA9E95AAD8B6307507` |
| `src/game-data/generated/skill-tree-presentation.json` | `CC6A5B3E3E2E642E45D2D45A51CFC05F7FCBD60B63336790A09F87E9276AB936` |

| Generated input | Runtime ingress | Numeric relevance for V2 classification |
| --- | --- | --- |
| `generated/runtime-catalog.json` | `game-data/catalog.ts`, then production application composition and simulation owners | Facility costs/exponents/production, effect values/per-level values, Research costs/exponents/levels, Skill costs, balance entries, Reality tuning, Dream/Reality upgrade costs and effects, condition thresholds, and Quantum costs/scaling/levels. Lift scalable values at their typed use sites. |
| `generated/catalog.json` | Provenance and catalog/parity tests; first-Dyson fixture metadata | Complete transport/provenance catalog, not the preferred production gameplay ingress. |
| `generated/legacy-id-maps.json` and `generated/skill-migration-data.json` | `save/legacyIds.ts` | Legacy keys, bounded authored IDs, and migration data. Exact/bounded values must not narrow through an unclassified `number`. |
| `generated/skill-tree-presentation.json` | `SkillsSurface.tsx` | Presentation position/copy plus authored displayed cost; canonical affordability must continue to come from backend definitions, not this UI projection. |
| `first-run-schema-12.idb1.txt` and provenance/delta manifests | `application/firstRun/unityFirstRunSave.ts` | Development startup/import state; its legacy numeric leaves enter through prepare, hydrate, and mapping, never by direct catalog casting. |

`runtimeCatalogContract.ts` is the field allowlist, and
`runtimeCatalog.test.ts`/`catalog.test.ts` enforce projection integrity. The
captured pre-Stage-0 baseline began without a numeric classification manifest.
Stage 0 added `src/game-state/numericFieldManifest.ts` and its ten-test
`numericFieldManifest.test.ts` coverage gate.

The manifest now has 382 entries and zero validation errors: 210 current
canonical V1 numeric paths, 48 frontend resource paths, 45 generated runtime
catalog paths, 6 skill-tree presentation paths, 61 current unbounded runtime
carriers, 11 transaction/schema-13 DTO design entries, and 1 planned V2-only
entry. Tests prove exact current-inventory coverage, closed dynamic key sets,
mixed tuple semantics, metadata and direct-balance rules, generated and
presentation ingress, runtime carriers, and duplicate/incompatible rejection.

Mechanical coverage is deliberately deferred only for types that do not exist
in Stage 0: `CanonicalGameStateV2`, `WebSaveDtoV13`, V2 quote/commit DTOs, and
V2 frontend projections. Their manifest walks remain explicit activation gates
for Stages 2 and 7; they are not falsely reported as present-day type coverage.

## Performance evidence and budgets

The tracked `docs/web-runtime-performance-baseline-2026-08-04.md` is a
diagnostic snapshot from commit `82cd16a2c95a2b4dc1e641fb8e5c7adcd9a146e3`,
not acceptance evidence for current HEAD. It records the former clone pressure,
visualization layout/style loop, and held-Tinker cost.

The local ignored `output/performance` directory contains two 2026-08-04 smoke
reports, also not acceptance evidence:

- interaction smoke: desktop only, one 3-second trial, observed budgets passed,
  `acceptanceEligible: false`;
- retained-heap smoke: 30 seconds with 7-second warm-up, retained heap passed
  but DOM nodes ended at 348 versus a 347 baseline, so the report failed and
  is `acceptanceEligible: false`.

No checked-in or local acceptance-eligible interaction or 30-minute soak report
was found for current HEAD. Performance generation was not rerun during this
baseline because those commands replace ignored report outputs and a smoke run
would not close the acceptance gap.

The executable budgets in `scripts/performance/performanceReport.ts` are:

| Metric | Budget |
| --- | ---: |
| Maximum presentation long task | 50 ms |
| P95 visible command feedback | 100 ms |
| P95 snapshot selection through React commit | 8 ms desktop; 16 ms mobile |
| Synthetic INP P75 | 200 ms |
| Synthetic CLS P75 | 0.1 |
| Synthetic LCP P75 | 2,500 ms |
| Retained heap growth | larger of 10 MiB or 20% of warmed baseline |

The normal-build report additionally has a provisional 200 KiB initial
JavaScript target and enforced ceilings of 40 KiB initial CSS, 30 KiB shared
locale, and 250 KiB source-locale fonts.

## Current verification

Commands ran from `Web` with installed dependencies; no install, Unity command,
fixture-generation write mode, or performance generator was run.
The table records the final Stage 0 verification after the fixture, manifest,
and direct-`tsx` environment fixes.

| Command | Result on 2026-08-08 |
| --- | --- |
| `npm test` | PASS: 162 files, 1,495 tests. JSDOM emitted two expected canvas `getContext()` not-implemented messages. |
| `npm run lint` | PASS: `oxlint` reported no diagnostics. |
| `npm run build` | PASS: TypeScript and Vite production build; Vite warned that the main chunk exceeds 500 KiB. |
| `npm run data:check` | PASS: 559 assets, 34 types, 371 runtime assets, 104 skill nodes. |
| `npm run parity:first-dyson:check` | PASS after the Stage 0 tooling fix: raw `tsx` execution defaults an absent Vite `PROD` flag to recursive freezing and an absent `DEV` flag to full validation; the fixture comparison succeeded. |
| `npm run fixture:schema12-web:check` | PASS: exact deterministic schema-12 `IDSWEB1` fixture `671DB2BAC4B4FDD23ACE6E988AD3C71BB9DA7C689C17FA46DB1CDB8F506DF489` and canonical provenance matched. |
| `tsx scripts/decode-save.ts <fixture>` | PASS for all five `IDB1` files; schemas 8, 11, 0, 10, and 12; complete streams. |

The captured failure was caused by application modules assuming Vite had
injected `import.meta.env` even when the fixture checker loaded them directly
through `tsx`. The narrow guards preserve Vite production/development choices;
raw tooling takes the conservative recursive-freeze and full-validation paths.

## Reproducible Stage 0 gate

Run the following from PowerShell without opening Unity or regenerating tracked
artifacts:

```powershell
Set-Location 'C:\Users\mattr\Documents\Repositories\Idle Dyson Swarm'
git -c safe.directory='C:/Users/mattr/Documents/Repositories/Idle Dyson Swarm' status --short --branch
git -c safe.directory='C:/Users/mattr/Documents/Repositories/Idle Dyson Swarm' rev-parse HEAD

Set-Location Web
$idb1Fixtures = @(
  'test/fixtures/schema-08-canonical-idb1-main-save.txt',
  'test/fixtures/support-case-01-attached-idb1.txt',
  'test/fixtures/support-case-02-inline-idb1.txt',
  'test/fixtures/support-case-03-inline-idb1.txt',
  'src/application/firstRun/generated/first-run-schema-12.idb1.txt'
)
$idb1Fixtures | ForEach-Object { Get-FileHash -Algorithm SHA256 -LiteralPath $_ }
$idb1Fixtures | ForEach-Object { & '.\node_modules\.bin\tsx.cmd' 'scripts/decode-save.ts' $_ }

npm test
npm run lint
npm run build
npm run data:check
npm run parity:first-dyson:check
npm run fixture:schema12-web:check
```

The gate passes only when every command exits zero, the captured fixture hashes
above are unchanged or deliberately re-certified, the deterministic non-private
schema-12 `IDSWEB1` fixture and provenance match, and the Stage 0 numeric
manifest reports zero validation errors for every current canonical, frontend,
generated-data, presentation, and runtime-carrier numeric ingress. Future V2
type walks must remain explicit deferred activation gates until those types
exist.

Performance acceptance remains a separate, time-consuming evidence gate. When
required, preserve the resulting JSON/text artifacts, browser version, and
invocation rather than citing smoke output:

```powershell
npm run verify:normal-performance-build
npm run report:performance:interaction
npm run report:performance:soak
```
