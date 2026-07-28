# Port architecture

The rebuild is organised so the unfinished Unity tick overhaul has exactly one
future destination: an implementation of `SimulationEngine`.

```text
React UI
  |
  v
application commands and read-only snapshots
  |
  v
SimulationEngine (pure TypeScript; implementation intentionally deferred)
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
- `src/App.tsx` is presentation and diagnostics only.
- The exact event-time scheduler follows `simulation-contract.md`. Gameplay
  models and projection remain behind the same pure boundary.

## Planned runtime ownership

The simulation should run in a Web Worker. React sends typed commands and receives
coalesced immutable snapshots. The same engine is called directly for unit tests,
offline advancement and golden-master parity runs.
