# Port architecture

The rebuild keeps gameplay, persistence and platform work independent from any
future product frontend. The React/Vite entrypoint is a developer-only save
diagnostic and is not part of the product architecture.

```text
future product frontend (not selected)
  |
  v
CanonicalLifecycleCoordinator
  |
  v
CanonicalGameApplicationFacade
  |                         \
  v                          v
typed player commands        immutable frontend snapshot
  |
  v
TransactionalGameApplication
  |                 \
  v                  v
TransactionalSimulationEngine    verified persistence lane
  |                \
  v                 v
game-data catalog   save preparation pipeline
                    decode -> migrate -> repair -> validate
  |                                   |
  v                                   v
platform contracts              SaveRepository
  |                                   |
  +----------- Electron / Capacitor --+
```

## Rules

- `src/core` contains game-facing ports and may not import React or a platform SDK.
- `src/game-data` is generated deterministically from Unity assets and contains no
  gameplay code.
- `src/save` owns compatibility, migration, validation and persistence envelopes.
- `src/application` owns the concrete runtime session, exhaustive player
  command boundary, whole-game facade, lifecycle serialization and immutable
  frontend projection.
- Raw `SaveRecord` values are compatibility DTOs only. Repository load and
  commit operations accept the opaque `PreparedSave` proof produced by the
  migration, repair and validation pipeline.
- `src/parity` owns engine-independent golden-master fixture and comparison tools.
- `src/platform` defines capabilities; Electron and Capacitor implementations
  remain replaceable.
- `src/App.tsx` is a developer save diagnostic only. It must not acquire product
  gameplay or become a visual baseline.
- The exact event-time scheduler follows `simulation-contract.md`. Gameplay
  models and projection remain behind the same pure boundary.
- No product frontend implementation begins until
  `frontend-readiness-gate.md` is satisfied.

## Runtime ownership

The simulation runs outside the presentation layer. A selected frontend sends
typed, revision-checked command envelopes and receives detached,
read-only snapshots. Ordinary object and array graphs are recursively frozen;
byte views are detached and expose a non-mutating type. Accepted state changes
publish one monotonically increasing revision; rejected, stale and no-op
commands publish nothing.

`TransactionalSimulationEngine` enforces those publication rules for any typed
state and command union. `TransactionalGameApplication` owns that engine, the
mapper session, application revisions and the single persistence lane. The
version-1 mapper separates the prepared Unity compatibility graph from
canonical domain state while privately preserving unmapped fields.
`CanonicalRuntimeSession` carries the game state together with save-specific
tuning, the evolving skill-effect evaluation snapshot, entitlements and
transient runtime facts. `CanonicalGameApplicationFacade` composes the
whole-game event model and keeps internal away-time, stored-time continuation
and bot-cap checkpoint commands inaccessible to a frontend.

Active-play mutations may publish to memory before a later checkpoint.
Recovery, import and stored-time work are commit-first flows: their isolated
candidate cannot become visible until its matching save has been durably
verified. `CanonicalLifecycleCoordinator` serializes active time, player
commands and platform lifecycle callbacks through that lane, including
returned-time replay, forced-Buy-Max stored time and resumable bot-cap
checkpoints.

`frontendSnapshot.ts` is the only UI read boundary. It publishes application
revisions, raw canonical resources and progression, exact transaction
previews, derived gameplay facts and transient Tinker progress. It contains no
formatting, layout or visual-design rules.

The existing simulation performance work is accepted for the current stage.
Further discretionary tuning is deferred until the full gameplay port is
complete unless a correctness defect or measured regression requires earlier
work.
