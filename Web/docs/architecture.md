# Port architecture

The rebuild keeps gameplay, persistence and platform work independent from any
future product frontend. The React/Vite entrypoint is a developer-only save
diagnostic and is not part of the product architecture.

```text
future product frontend (not selected)
  |
  v
application commands and read-only snapshots
  |
  v
TransactionalSimulationEngine (pure TypeScript)
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

## Planned runtime ownership

The final simulation runs outside the presentation layer. The selected frontend
will send typed, revision-checked command envelopes and receive detached,
read-only snapshots. Ordinary object and array graphs are recursively frozen;
byte views are detached and expose a non-mutating type. Accepted state changes
publish one monotonically increasing revision; rejected, stale and no-op
commands publish nothing.

`TransactionalSimulationEngine` now enforces those publication rules for any
typed state and command union. The version-1 mapper now separates the prepared
Unity compatibility graph from canonical domain state while privately
preserving unmapped fields. It is not yet the whole-game engine: domain
transition functions and the application coordinator remain follow-on work.

Active-play mutations may publish to memory before a later checkpoint.
Recovery, import and stored-time work are commit-first flows: their isolated
candidate cannot become visible until its matching save has been durably
verified. The engine exposes single-use staged transitions for that coordinator;
the startup/lifecycle coordinator itself remains follow-on work.

The existing simulation performance work is accepted for the current stage.
Further discretionary tuning is deferred until the full gameplay port is
complete unless a correctness defect or measured regression requires earlier
work.
