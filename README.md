# Idle Dyson Swarm Web

Canonical TypeScript/React edition of Idle Dyson Swarm, including the browser
game, installable PWA, Capacitor Android/iOS hosts, and Electron desktop host.

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
- Versioned Web-owned gameplay-data capsule covering 559 historical assets,
  with deterministic byte and structure validation.
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

The existing simulation and performance baseline is accepted for the current
product. Further tuning should be driven by measured regressions or correctness
defects and must preserve deterministic gameplay behavior.

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

`npm run dev` starts the playable game for local development.

## Project layout

```text
scripts/
  decode-save.ts       Standalone read-only decoder command
  prepare-save.ts      Decode + migrate + repair + validate command
  build-web-data.ts    Deterministic Web-authored data materializer
  support/             Shared deterministic fixture/report support
src/
  application/         Runtime session, commands, lifecycle and UI read boundary
  core/                Framework-independent simulation contracts
  game-data/           Web-owned authored inputs and generated runtime catalogs
  parity/              Golden-master fixture and graph comparison tools
  platform/            Replaceable platform capability contracts
  save/                Decode, migration, repair, validation and repository
  simulation/          Whole-game event-time domains and parity authorities
public/                Shipped browser assets
source-assets/         Non-shipped masters and platform reference assets
hosts/                 Capacitor mobile and Electron desktop hosts
test/fixtures/         Immutable save fixtures
test/parity/           Executable save and simulation parity cases
```

The Vitest suite is deliberately contract-first. It protects saves, canonical
transactions, deterministic time progression, persistence/writer authority,
and release packaging. Add focused tests for changed behavior; do not recreate
exhaustive component-markup or static-data-restatement coverage.

See the [documentation index](docs/README.md), the active
[product backlog](docs/BACKLOG.md),
[product-ui-foundation.md](docs/contracts/product-ui-foundation.md),
[architecture.md](docs/contracts/architecture.md),
[game-state-contract.md](docs/contracts/game-state-contract.md),
[simulation-contract.md](docs/contracts/simulation-contract.md), and
[parity-fixtures.md](docs/contracts/parity-fixtures.md). The superseded platform
inventory is retained under `docs/archive/`.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the Odin binary
protocol source attribution.
