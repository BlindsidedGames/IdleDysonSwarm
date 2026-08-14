# Break Infinity migration handoff

## Handoff identity

- Repository: `BlindsidedGames/IdleDysonSwarm`
- Branch: `break-infinity-migration`
- Base before this migration checkpoint: `1aaae34`
- Prepared on: 2026-08-13 (Australia/Sydney)
- Product target: the TypeScript/Web application under `Web/`
- Deployment status: local source checkpoint only. No website deployment,
  native signing, store upload, TestFlight upload, release, or merge was
  performed as part of this handoff.

The remote branch was refreshed on 2026-08-13 and still resolves to checkpoint
`74e05605`. Live GitHub Actions run status was unavailable because the stored
`gh` credential for `BlindsidedGames` is invalid; do not infer remote CI status
from the green local gates below.

## Current state

The production Web composition now uses the V2 canonical game state and
schema-13 persistence while retaining one-way schema-12/legacy import support.
The branch contains the complete Break Infinity implementation through the
local Web activation, certification harnesses, browser/native packaging work,
Stored Time worker authority, and the post-activation correctness audit.

The latest adversarial audit fixes include:

- exact unit-fraction Bot distribution with Bot Multitasking and selected
  preset synchronization;
- one mutation lane for foreground commands, imports, and Stored Time results;
- schema-12 to schema-13 preservation of the selected skill preset and the
  complete preset command surface;
- exact `GameDecimal` V2 Tinker behavior above native-number range;
- route-demanded authoritative V2 previews for Dyson, Research, Infinity,
  Dream, Reality, Quantum, and Avocato, with immutable projection memoization;
- a mature synthetic schema-12 migration/import/recovery corpus; and
- V1/V2 command, codec, activated-command, checkpoint, and reload benchmarks.

Large-number presentation retains Unity's truncated three-significant-digit
suffix format through `DCe`. Above that range, both the scientific mantissa and
the exponent use the same compact formatter: for example, `9.8765e1000` is
shown as `9.87e1.00K`, and a near-ceiling value is shown as `9.87e8.99Qa`.
Canonical values and calculations remain unchanged.

## Validation at handoff

Run from `Web/` unless stated otherwise:

- `npm test -- --maxWorkers=1 --reporter=dot`
  - PASS: 227 files, 2,226 tests.
- `npx tsc -b --pretty false`
  - PASS.
- `npm run lint -- --quiet`
  - PASS.
- `npm run build`
  - PASS: 471 modules transformed.
- `npm run report:performance:migration`
  - PASS.
- `git diff --check`
  - PASS, with only existing line-ending conversion warnings.

Representative migration benchmark medians from the final Windows run:

| Operation | V1 | V2 |
| --- | ---: | ---: |
| Assembly-line purchase | 0.007 ms | 0.083 ms |
| Research purchase | 0.007 ms | 0.153 ms |
| Skill purchase | 0.022 ms | 3.257 ms |
| Infinity shop purchase | 0.001 ms | 2.218 ms |
| Save encode | 0.993 ms | 70.729 ms |
| Save decode | 10.722 ms | 76.179 ms |

Activated V2 facade medians were 7.528 ms for assembly purchase plus projection,
72.708 ms for a checkpoint, and 225.656 ms for a fresh controller reload. The
report script is `scripts/performance/runMigrationCommandReport.ts`; generated
output remains intentionally untracked.

## macOS continuation evidence

The receiver-local Developer Options presentation gap was closed on the same
branch after the original checkpoint. `BrowserUiRuntimeFoundation` now exposes
a read-only receiver-local entitlement projection. The V2 runtime sources it
from schema-13 platform sidecar state, and the Store receives it in production
builds without putting `debugEverEnabled` into portable save state.

Focused TypeScript, lint, runtime, storefront, browser-composition and
repository checks pass. A real dev-server run opened the production IndexedDB
database, verified an `ids-web-production-v2-checkpoint-v1` record containing
an `IDSWEB1:` portable save, persisted a navigation preference, and restored it
after reload. Developer Options then displayed as `Unlocked in game` both
before and after a second reload. Observed ready times were approximately
1.18 seconds and 1.12 seconds on this machine.

The interaction failures were subsequently resolved. Profiling showed that
each dirty autosave synchronously encoded schema 13 and then performed two
redundant full schema-13 decodes for staged/committed comparison. Trusted
runtime autosaves now encode in a dedicated module worker, transfer the result
as a Blob, and preserve exact staged/committed byte verification; startup and
import paths still perform strict full decoding. Tinker completion also now
uses an authenticated Dyson-only structural-share clone for event-time-issued
immutable states instead of cloning every unrelated system.

The acceptance harness now starts one accepted warm-up Tinker operation, waits
for its canonical commit, and lets its worker-backed autosave settle before
clearing measurements. The final five-trial, 30-second report is acceptance
eligible and passes every budget. Desktop and 4x-throttled mobile both recorded
zero presentation long tasks. Mobile synthetic INP P75 was 120 ms,
snapshot-selection-through-React-commit P95 was 2.7 ms, and LCP P75 was 404 ms.
Generated report files remain ignored under `output/performance/`.

The full automated suite is green: the serialized run passed 2,226 ordinary
tests and failed only the three real-browser certification cases because the
sandbox forbids their fixed localhost ports. Those three then passed with
loopback permission, giving a combined 2,229/2,229 result. Two Stored Time
Fast-plan completion/restart tests had previously exceeded a fixed 10-second
drain deadline after preceding CPU-heavy cases despite passing individually in
under four seconds. Their heavy-path drains now use the existing 60-second
checkpoint-driver bound and pass in the original full-file order (25/25).

## Save and recovery material

The repository includes the immutable canonical schema-12 fixture at
`test/fixtures/schema-12-canonical-idsweb1-first-run.txt`, its provenance file,
older schema fixtures, and the synthetic mature corpus in
`src/save/matureSchema12Migration.test.ts`.

No personal browser save is included. At handoff time the local dev origins on
ports 5173, 4180, and 4198 were closed, so there was no active browser-origin
save to export. A personal save is not needed to continue the implementation or
run the migration/recovery gates. If exact manual gameplay continuity between
machines is desired later, export it from Settings and transfer it separately.

The local `.migration-snapshots/` ZIP and generated `Web/dist-*`/`Web/output/`
directories are deliberately ignored because the commit itself is the durable
source checkpoint and all generated artifacts are reproducible.

## Known follow-up concerns

The original receiver-local Developer Options presentation concern is resolved
by the macOS continuation described above.

1. The schema-13 codec was optimized after this handoff checkpoint. The final
   macOS migration benchmark measured schema-13 encode at 2.877 ms, decode at
   4.329 ms, checkpoint at 3.129 ms, and fresh-controller reload at 65.066 ms.
   The original baseline was approximately 55.9 ms encode, 58.6 ms decode,
   55.3 ms checkpoint, and 171.3 ms reload. Persistence encoding still performs
   full semantic validation, deterministic save bytes are unchanged, and the
   bounded hostile-import parser remains in place.
2. The synthetic non-UI `previewDemand='all'` projection is intentionally
   expensive because it constructs every strict quote family. Activated play
   defaults to the Bots route, requests only the visible family, and memoizes
   identical immutable projections.
3. Physical-device certification and store distribution remain outside this
   checkpoint. GitHub build tests may continue, but do not deploy, sign, merge,
   or upload without explicit user authorization.
4. The live Stage-9 frontend bridge is retired. Production snapshots no longer
   convert current `CanonicalGameStateV2` into `CanonicalGameStateV1`.
   Progression, Dyson, Dream/Simulations, Infinity, Reality, Avocato,
   statistics, Tinker, Story, visibility, and previews are selected directly
   from V2 state and preserve `GameDecimal` values beyond `1e1000`. Static
   preview ordering and shapes are now native constants as well; the previous
   deterministic V1 metadata bootstrap has been removed. Legacy
   decode/import/recovery and the explicit developer projection remain
   intentionally available. Command plus projection
   measured 6.172 ms median versus the 7.352 ms pre-pass baseline. Boot
   JavaScript measured 337.31 KiB gzip versus 409.58 KiB before the pass, so
   further initial-load splitting remains useful but is separate work.

## Resume on macOS

```bash
git clone https://github.com/BlindsidedGames/IdleDysonSwarm.git
cd IdleDysonSwarm
git switch break-infinity-migration
cd Web
npm ci
npx tsc -b --pretty false
npm test -- --maxWorkers=1
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

If the repository already exists, run `git fetch origin`, switch to
`break-infinity-migration`, and use `git pull --ff-only`.

## Instructions for the receiving Codex agent

Read this file and `docs/break-infinity-migration-plan.md` before editing.
Preserve the existing architecture and exact numeric boundaries. Verify the
working tree before changes and use focused tests first. Do not deploy, merge,
publish, sign, or upload. The throttled-mobile backlog and long-task concern is
resolved and the automated suite is green. Stage 9 production frontend
projection is complete: no live-state or static-metadata V1 bridge remains in
the V2 snapshot path. Retain V1 only for legacy save decode/import/recovery and
the explicit developer/test projection until those diagnostic consumers are
retired.
Physical-device checks remain useful residual-risk evidence, but are not
migration completion gates and must not be treated as release readiness.
