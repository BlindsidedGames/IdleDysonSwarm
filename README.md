# Idle Dyson Swarm Web

Canonical TypeScript/React edition of Idle Dyson Swarm, including the browser
game, installable PWA, Capacitor Android/iOS hosts, and Electron desktop host.

## Existing-player compatibility

The canonical product can decode and prepare supported legacy `IDB1:` saves.
It performs envelope decoding, reconstructs the compatibility graph, applies
migrations and normalization, repairs numeric state, and validates the
publishable canonical graph. Legacy formats are import inputs only; they do
not define current gameplay.

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

## Product foundation

- Typed, revision-checked transactional engine boundary with detached read-only
  snapshots and no React dependency.
- Concrete runtime session, whole-game application facade and serialized
  lifecycle coordinator for active, returned and stored time.
- Exhaustive typed player-command inventory, exact per-target previews and a
  frozen presentation-neutral snapshot of resources, progression, derived
  gameplay facts and transient Tinker progress.
- Exact event-time simulation across Dyson, Infinity, Dream, Reality, Quantum,
  Avocado and time-resource systems.
- Web-owned gameplay rules plus a deprecated compatibility capsule covering
  historical assets still required by generated-content consumers.
- Compact legacy skill/research ID and dependency catalogs.
- Legacy-save normalization, migration, numeric repair and
  validation.
- Typed game-state hydration/dehydration across the major durable domains.
- Precision-preserving `IDSWEB1` serialization for 64-bit integers and bytes.
- Platform-neutral transactional save repository with an opaque prepared-save
  gate on load and commit.
- Characterization, progression, and compatibility fixtures.
- Platform capability contracts for browser, Electron, and Capacitor hosts.

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
  build-web-data.ts    Frozen legacy-data materializer
  support/             Shared deterministic fixture/report support
src/
  application/         Runtime session, commands, lifecycle and UI read boundary
  core/                Framework-independent simulation contracts
  game-data/           Web-owned inputs plus deprecated compatibility catalogs
  parity/              Characterization and compatibility fixtures
  platform/            Replaceable platform capability contracts
  save/                Decode, migration, repair, validation and repository
  simulation/          Whole-game event-time domains and gameplay authority
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
[state-and-persistence-contract.md](docs/contracts/state-and-persistence-contract.md),
[simulation-contract.md](docs/contracts/simulation-contract.md), and
[legacy-save-compatibility.md](docs/platform/legacy-save-compatibility.md).

The retired Unity handoff is a deprecated, byte-frozen compatibility capsule,
not a blanket gameplay or product contract. Generated values remain active
where current modules explicitly consume them; explicit TypeScript rules and
documented overrides win. Read its local README before using a retained field
as evidence.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the Odin binary
protocol source attribution.
