# State and persistence contract

The root TypeScript model is the only gameplay-state authority. Presentation,
platform hosts, generated legacy catalogs, imported saves, and compatibility
DTOs cannot define current progression or state transitions.

## Version identities

Keep these identities separate:

- the portable save-envelope and preparation schema;
- the canonical game-state model version;
- the application snapshot contract version; and
- legacy source-save versions accepted only as import compatibility inputs.

A legacy source schema never becomes current gameplay authority merely because
the decoder accepts it.

## Publication boundary

`TransactionalSimulationEngine<TState, TCommand>` owns framework-independent
publication.

- Commands are a closed TypeScript union.
- Immediate command envelopes carry an expected revision.
- A stale revision rejects without executing domain code.
- Domain code mutates only an isolated candidate.
- Rejected, throwing, invalid, and no-op candidates do not change state,
  revision, or subscribers.
- Every accepted changed candidate advances the revision exactly once and
  notifies each current subscriber exactly once.
- Commit-first work stages a detached candidate, persists and verifies it,
  then publishes it. A stage is single-use and fails if its base revision has
  become stale.
- Published snapshots are detached and recursively frozen.
- Listener failures are isolated from authoritative state and later listeners.

Expected validation failures are typed rejection results, not control-flow
exceptions.

## Canonical ownership

`CanonicalGameStateV1` owns durable gameplay domains including timeline,
Dyson, Research, Skills, Infinity, Dream, Reality, Quantum, Avocado, and
Statistics. Each domain writes its own slice and may read the whole state
through a read-only view. Cross-domain purchases and resets are explicit,
atomic transactions. The whole-game stepper keeps ordering visible and
testable; there is no generic gameplay event bus.

Presentation preferences, credentials, store receipts, verified entitlements,
and platform achievement publication remain outside portable gameplay state.
Automation settings and scheduler phases that affect autonomous gameplay stay
inside canonical state.

## Save preparation and compatibility

Decoded legacy records are compatibility DTOs, never runtime gameplay state.
Only a prepared, repaired, and validated candidate may enter repository or
application workflows. Preparation must:

1. decode a supported envelope;
2. migrate its representation to the supported preparation schema;
3. repair explicitly supported numeric defects;
4. validate structure, durable IDs, numeric state, and ownership boundaries;
5. hydrate canonical state through the checked-in mapper.

Before serialization, the repository normalizes and revalidates the candidate,
verifies the encoded result through decode and re-encode, and only then uses
the host's atomic replacement primitive.

## Application guarantees

- Startup publishes no gameplay state until preparation and any required
  recovery write succeed.
- Application revisions and durable revisions are tracked separately.
- Serialized checkpoint ordering prevents an older asynchronous write from
  winning last.
- Stored Time and other commit-first candidates remain invisible until their
  durable write is verified.
- Imports require explicit overwrite approval, preserve host-owned
  entitlements, checkpoint displaced dirty progress, and install a new clean
  application session after commit.
- If a durable commit succeeds but cannot be reopened, the application blocks
  instead of resuming stale memory.
- Existing-player compatibility is protected by executable fixtures and the
  legacy-save contract, not by treating historical engine data as normative.

Legacy mapping coverage reports importer classification completeness only. It
does not gate canonical TypeScript writes and is not published as frontend
application readiness state. Removing that obsolete readiness projection is a
frontend snapshot contract change and therefore advances the snapshot version.
