# Canonical game-state contract

Unity schemas in this document describe historical import and characterization
surfaces. The Web application is the supported runtime and may evolve its
canonical model and `IDSWEB1` saves without preserving Unity write compatibility.

This decision record freezes the boundary used by parallel gameplay domain
ports. The first typed mapper now covers the durable gameplay roots. Its
executable coverage manifest is pinned to the public Unity 3.0.328/schema-11
save surface and remains deliberately incomplete for unresolved durable
fields.

## Three different versions

These concepts must never share one ambiguous `schema` name:

- Public Unity mapping certification: version 11 from application 3.0.328,
  used to prove field-level ownership against the save format players have.
- Development preparation schema: currently version 12, used internally by
  the compatibility decoder, migration, repair and validation pipeline. It is
  not evidence that schema 12 shipped publicly.
- Canonical game model version: begins at 1 when the typed whole-game mapper is
  implemented.
- Application snapshot contract version: currently 1, owned by the startup and
  persistence coordinator.

## Publication boundary

`TransactionalSimulationEngine<TState, TCommand>` is the framework-independent
publication mechanism.

- Commands are a closed TypeScript union supplied by the game domain.
- Every immediate command envelope carries an expected revision. Durable
  command IDs and simulation timestamps belong to the future queue/coordinator;
  the in-memory engine does not advertise semantics it cannot yet enforce.
- A stale revision rejects without executing domain code.
- Domain code mutates only an isolated candidate.
- Rejected, throwing, invalid and no-op candidates do not change state or
  revision and do not notify subscribers.
- Every accepted changed candidate advances the revision exactly once and
  notifies each current subscriber exactly once.
- Commit-first work uses `stageDispatch`/`stageAdvance`, persists the detached
  candidate, and calls `publish` only after verification. A stage is
  single-use and rejects if another publication made its base revision stale.
- Snapshots are detached from engine state and recursively frozen for normal
  object and array graphs.
- Listener failures are isolated from later listeners and authoritative state.

Expected validation failures return typed rejection results. They are not
control-flow exceptions.

## Save preparation boundary

`SaveRecord` is an opaque Unity compatibility DTO, not runtime gameplay state.
It contains legacy names, duplicate representations, cached derived values,
preferences and durable gameplay fields.

Only `PreparedSave` may cross into repository load/commit workflows.
`PreparedSave` can be created only by:

1. decoding the source envelope;
2. migrating to the supported Unity import schema;
3. applying numeric repair;
4. validating required structure, durable IDs and finite numeric state.

The repository normalizes and revalidates immediately before serialization,
verifies the temporary file byte-for-byte through decode and re-encode, and
only then invokes the platform's atomic replacement primitive. Canonical player
save writes are disabled by default; current partial-port work is restricted to
development storage.

## Canonical ownership

The typed canonical root will own these gameplay domains:

```text
GameState
  timeline
  meta
  dyson
  research
  skills
  infinity
  dream
  reality
  quantum
  avocado
  statistics
```

Player presentation preferences and platform entitlements are separate stores.
Achievement ownership remains platform-owned and is not persisted in
`GameState`.
Automation switches and scheduler phases that change autonomous gameplay remain
inside game state.

Each domain owns writes to its slice and may read the whole state through a
read-only view. Cross-domain purchases and resets are explicit transactions.
There is no generic event bus: the central whole-game stepper keeps the approved
boundary order visible and testable.

## Incremental mapping rule

The Unity-to-canonical mapper keeps the complete prepared source privately
while the port is incomplete. Dehydration clones that source and overwrites only
paths whose domain ownership is covered by executable parity tests. This
preserves not-yet-ported fields without treating the legacy graph as runtime
authority.

A mapping-coverage manifest must classify every leaf in the pinned public
Unity source schema as:

- canonically owned;
- derived and intentionally recomputed;
- legacy duplicate intentionally omitted;
- presentation preference;
- platform entitlement; or
- still unowned.

Wildcards may represent collection elements or dictionary keys, but never an
unknown field name. A leaf absent from the pinned catalog fails certification;
it is not silently assigned to the nearest object or domain.

The Web runtime writes its own schema-13 `IDSWEB1` player save. It never
overwrites a discovered Unity `IDB1` source and does not provide a Unity-readable
exporter. Public Unity mapping coverage certifies one-way import, not reverse
serialization or two-way synchronization.

## Implemented mapper checkpoint

- The version-1 root currently types Meta, Timeline, Dyson, Research, Skills,
  Infinity, Dream, Reality, Quantum, Avocado, secret progress and simulation
  statistics.
- Hydration accepts only `PreparedSave`.
- Dehydration clones the privately preserved source and writes only declared
  canonical paths.
- Authentic schemas 0, 8, 10 and 11 round-trip through preparation, hydration
  and dehydration. Public mapping coverage is certified against the authentic
  schema-11 support save and the schema-11 source-field catalog. A generated
  schema-12 entry verifies development-schema idempotence only; it is not the
  public release target.
- The executable coverage manifest separates supported Web schema-13 writes
  from the intentionally unsupported reverse Unity export path.

## Implemented application checkpoint

- Startup publishes no gameplay state until the selected save has passed
  migration, repair, validation and any required recovery write.
- Application state and durable revisions are tracked separately. Ordinary
  checkpoints capture an exact revision and may finish while active play
  advances; serialized checkpoint ordering prevents an older write from
  winning last.
- Stored-time candidates use a private commit-first stage and remain invisible
  until the repository verifies their write.
- Imports accept Unity `IDB1` and canonical `IDSWEB1`, require explicit
  overwrite approval, consume the remote quit timestamp, commit before
  publication and install a new clean application session.
- If a durable commit succeeds but the committed save cannot be reopened, the
  application blocks instead of resuming stale memory.

The Basic Dyson no-command fixture now runs through a real public engine
adapter. It remains a parity-only slice, not the canonical whole-game engine.
Canonical Dyson integration is blocked until the model owns or truthfully
recomputes current panels, production multipliers, panel lifetime, facility
modifiers and the remaining Infinity reward inputs.
