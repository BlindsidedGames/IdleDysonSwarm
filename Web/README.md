# Idle Dyson Swarm Web

TypeScript/React rebuild workspace for Idle Dyson Swarm.

The compatibility foundation can decode and prepare existing Unity/Odin
`IDB1:` saves without starting Unity. It performs base64 and gzip envelope
decoding, reconstructs the old C# object graph, applies schema-12 migrations and
normalization, repairs numeric state, and validates the publishable graph.

## Proven compatibility

- Canonical schema 8 fixture with exact money, date, and 64-bit prestige sentinels.
- Historical support fixtures at schemas 0, 10, and 11.
- The current local production save at schema 12.
- Complete stream consumption for every tested valid save.
- Objects, lists, dictionaries, arrays, primitive arrays, type tables, and
  internal references.
- Schema migration, numeric repair and validation pass for every immutable
  fixture.
- The current local schema-12 production save passes the complete preparation
  pipeline with zero repairs.

The local schema 12 save was read in place during validation and was not copied
into this repository.

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

## Prepared port foundation

- Pure TypeScript core/simulation boundary with no React dependency.
- Deterministic exporter for 559 Unity data assets, including stable IDs,
  resolved GUID references and source hashes.
- Compact legacy skill/research ID and dependency catalogs for migrations.
- Unity-compatible save normalization, migration, numeric repair and validation.
- Precision-preserving canonical web save serialization for `bigint` and bytes.
- Platform-neutral transactional repository and seamless first-launch migration
  orchestration.
- Golden-master fixture schema and exact/subset graph comparison tooling.
- Audited platform capability contracts for Electron and Capacitor shells.

See [architecture.md](docs/architecture.md),
[parity-fixtures.md](docs/parity-fixtures.md), and
[platform-port-inventory.md](docs/platform-port-inventory.md).

## Current playable boundary

The first playable vertical slice is the Bot tab. It uses the pure TypeScript
event-time scheduler for active 10 Hz Dyson production, early Tinker
progression, bot distribution, facility purchases and the basic five-facility
chain. Continuous counters are smoothed by a presentation-only animation layer
that never mutates canonical simulation state.

The existing-save decoder and transactional repository are not yet connected to
the playable UI, so refreshing still starts a new in-memory game. Research,
Skills, the complete Infinity experience, Dream, Reality, Quantum, platform
shells and release persistence remain later porting work.

## Project layout

```text
scripts/
  decode-save.ts       Standalone read-only decoder command
  prepare-save.ts      Decode + migrate + repair + validate command
  export-unity-data.ts Deterministic ScriptableObject exporter
src/
  core/                React-independent simulation contracts
  game-data/           Runtime types and generated Unity catalogs
  game/                Playable Bot-tab state adapter
  parity/              Golden-master fixture and graph comparison tools
  platform/            Electron/Capacitor capability contracts
  save/
    decodeIdb1.ts      IDB1 envelope API
    odinBinary.ts      Odin binary protocol compatibility reader
    migrate.ts         Unity schema normalization/migration
    numericRepair.ts   Finite/range repair contract
    validate.ts        Publishable-save validation
    repository.ts      Platform-neutral transactional repository
  simulation/          Pure event-time Dyson and Infinity foundations
  ui/                  Number formatting and smooth presentation helpers
public/fixtures/       Browser diagnostic fixtures
test/fixtures/         Immutable test copies
test/parity/           Executable save cases and simulation fixture schema
```

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the Odin binary protocol
source attribution.
