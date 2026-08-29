# Canonical product architecture

The React/Vite application is the canonical product frontend shared by the Web,
Capacitor mobile, and Electron desktop builds. Gameplay, persistence,
presentation, and host integrations remain separated by typed boundaries so no
frontend or platform SDK owns canonical state transitions.

```text
React product frontend
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
- `src/game-data/authored` contains versioned data inputs. The
  `unity-handoff` subdirectory is a deprecated, hash-verified compatibility
  capsule, not gameplay authority; `scripts/build-web-data.ts` materializes its
  remaining legacy consumers in `src/game-data/generated`.
- `src/save` owns compatibility, migration, validation and persistence envelopes.
- `src/application` owns the concrete runtime session, exhaustive player
  command boundary, whole-game facade, lifecycle serialization and immutable
  frontend projection.
- Raw `SaveRecord` values are compatibility DTOs only. Repository load and
  commit operations accept the opaque `PreparedSave` proof produced by the
  migration, repair and validation pipeline.
- `src/parity` owns engine-independent characterization and comparison tools.
- `src/platform` defines capabilities; Electron and Capacitor implementations
  remain replaceable.
- `src/App.tsx` composes the product UI and must communicate with gameplay only
  through application commands and immutable frontend snapshots.
- The shared active/Stored Time game-step contract follows
  `game-processing-and-offline-time-contract.md`. Gameplay models and
  projection remain behind the same pure boundary.
- Product UI changes must preserve the accessibility, responsive-layout,
  performance, and interaction contracts recorded alongside this document.

## Runtime ownership

The simulation runs outside the presentation layer. The product frontend sends
typed, revision-checked command envelopes and receives detached,
read-only snapshots. Ordinary object and array graphs are recursively frozen;
byte views are detached and expose a non-mutating type. Accepted state changes
publish one monotonically increasing revision; rejected, stale and no-op
commands publish nothing.

`TransactionalSimulationEngine` enforces those publication rules for any typed
state and command union. `TransactionalGameApplication` owns that engine, the
mapper session, application revisions and the single persistence lane. The
mapper separates a prepared legacy compatibility graph from canonical domain
state while privately preserving unmapped fields.
`CanonicalRuntimeSession` carries the game state together with save-specific
tuning, the evolving skill-effect evaluation snapshot, entitlements and
transient runtime facts. `CanonicalGameApplicationFacade` composes the
whole-game event model and keeps internal away-time and bot-cap checkpoint
commands inaccessible to a frontend.

Active-play mutations may publish to memory before a later checkpoint.
Recovery, import and stored-time work are commit-first flows: their isolated
candidate cannot become visible until its matching save has been durably
verified. `CanonicalLifecycleCoordinator` serializes active time, player
commands and platform lifecycle callbacks through that lane, including
returned-time credit, manually started Stored Time and resumable active-play
bot-cap checkpoints.

Confirmed save replacement may request Stored Time cancellation out-of-band,
then waits behind the coordinator lane until the detached candidate is
discarded or fully committed before import/reset installs a new session.
Commands retain their admission session across that boundary. Export does not
enter the occupied persistence lane: the application captures one validated,
immutable pre-job save, and the transfer UI reuses its exact encoded string for
display, copy and download. Once the job settles, export may capture only the
fully committed current session.

`frontendSnapshot.ts` is the only UI read boundary. It publishes application
revisions, raw canonical resources and progression, exact transaction
previews, derived gameplay facts and transient Tinker progress. It contains no
formatting, layout or visual-design rules.

Performance work remains evidence-led: measured regressions and correctness
defects are valid reasons to change the simulation or projection lanes, while
discretionary tuning must preserve deterministic gameplay behavior.
