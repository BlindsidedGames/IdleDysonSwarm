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
SimulationEngine (pure TypeScript)
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

The final simulation should run outside the presentation layer. The selected
frontend will send typed commands and receive coalesced immutable snapshots.
The same engine remains directly callable for unit tests, offline advancement
and golden-master parity runs.

The existing simulation performance work is accepted for the current stage.
Further discretionary tuning is deferred until the full gameplay port is
complete unless a correctness defect or measured regression requires earlier
work.
