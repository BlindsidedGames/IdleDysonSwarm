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

1. Production Developer Options presentation does not yet receive the
   receiver-local `debugEverEnabled` entitlement. The entitlement itself is
   preserved, but the storefront can visually show it as unowned. Fix this by
   projecting a read-only receiver-local entitlement; never put the entitlement
   into portable save state.
2. Schema-13 encode/decode and fresh-controller reload are materially slower
   than schema 12. Profile actual IndexedDB, writer-lease, React, and browser
   reload behavior before further optimization. Normal arithmetic and purchase
   commands are fast in absolute terms.
3. The synthetic non-UI `previewDemand='all'` projection is intentionally
   expensive because it constructs every strict quote family. Activated play
   defaults to the Bots route, requests only the visible family, and memoizes
   identical immutable projections.
4. Physical-device certification and store distribution remain outside this
   checkpoint. GitHub build tests may continue, but do not deploy, sign, merge,
   or upload without explicit user authorization.

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
publish, sign, or upload. The next sensible work is the Developer Options
receiver-local presentation fix followed by real dev-server IndexedDB/save and
interaction benchmarking.
