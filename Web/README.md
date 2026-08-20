# Idle Dyson Swarm Web

Headless TypeScript port foundation for Idle Dyson Swarm, with a small
developer-only browser harness for save compatibility diagnostics.

There is intentionally no playable product frontend at this checkpoint. The
earlier Bot-tab slice was removed because the project does not yet have an
approved product, design, interaction, accessibility or performance baseline.
The diagnostic harness must not be treated as a product UI reference.

## Compatibility foundation

The port can decode and prepare existing Unity/Odin `IDB1:` saves without
starting Unity. It performs base64 and gzip envelope decoding, reconstructs the
old C# object graph, applies schema-12 migrations and normalization, repairs
numeric state, and validates the publishable graph.

Proven compatibility currently covers:

- Canonical schema 8 fixture with exact money, date and 64-bit prestige
  sentinels.
- Historical support fixtures at schemas 0, 10 and 11.
- The current local production save at schema 12.
- Objects, lists, dictionaries, arrays, primitive arrays, type tables and
  internal references.
- Complete stream consumption for every tested valid save.
- Schema migration, numeric repair and validation for every immutable fixture.

The local schema-12 production save was read in place during validation and was
not copied into this repository.

## Port foundation

- Typed, revision-checked transactional engine boundary with detached read-only
  snapshots and no React dependency.
- Concrete runtime session, whole-game application facade and serialized
  lifecycle coordinator for active, returned and stored time.
- Exhaustive typed player-command inventory, exact per-target previews and a
  frozen presentation-neutral snapshot of resources, progression, derived
  gameplay facts and transient Tinker progress.
- Exact event-time simulation across Dyson, Infinity, Dream, Reality, Quantum,
  Avocado and time-resource systems.
- Deterministic exporter for 559 Unity data assets, including stable IDs,
  resolved GUID references and source hashes.
- Compact legacy skill/research ID and dependency catalogs.
- Unity-compatible save normalization, migration, numeric repair and
  validation.
- Typed version-1 game-state hydration/dehydration across the major durable
  domains, with source preservation and an executable partial-coverage gate.
- Precision-preserving `IDSWEB1` serialization for 64-bit integers and bytes.
- Platform-neutral transactional save repository with an opaque prepared-save
  gate on load and commit.
- Golden-master fixture and comparison tooling.
- Platform capability contracts for future Electron and Capacitor adapters.

The existing simulation and performance work is accepted as complete for the
current port stage. Further discretionary performance tuning is deferred until
the full gameplay port is complete. Correctness defects and measured
regressions remain valid reasons to revisit it earlier.

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run data:check
npm run decode-save -- /path/to/idle_dyson_swarm_save.txt
npm run prepare-save -- /path/to/idle_dyson_swarm_save.txt
```

`npm run dev` opens the developer save-compatibility harness. It is not the
game frontend.

## Project layout

```text
scripts/
  decode-save.ts       Standalone read-only decoder command
  prepare-save.ts      Decode + migrate + repair + validate command
  export-unity-data.ts Deterministic ScriptableObject exporter
src/
  application/         Runtime session, commands, lifecycle and UI read boundary
  core/                Framework-independent simulation contracts
  game-data/           Runtime types and generated Unity catalogs
  parity/              Golden-master fixture and graph comparison tools
  platform/            Replaceable platform capability contracts
  save/                Decode, migration, repair, validation and repository
  simulation/          Whole-game event-time domains and parity authorities
public/fixtures/       Browser diagnostic fixtures
test/fixtures/         Immutable save fixtures
test/parity/           Executable save and simulation parity cases
```

Before creating another product frontend, satisfy
[frontend-readiness-gate.md](docs/contracts/frontend-readiness-gate.md). See
also the [documentation index](docs/README.md), the active
[product backlog](docs/BACKLOG.md),
[product-ui-foundation.md](docs/contracts/product-ui-foundation.md),
[architecture.md](docs/contracts/architecture.md),
[game-state-contract.md](docs/contracts/game-state-contract.md),
[simulation-contract.md](docs/contracts/simulation-contract.md), and
[parity-fixtures.md](docs/contracts/parity-fixtures.md). The superseded platform
inventory is retained under `docs/archive/`.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the Odin binary
protocol source attribution.
