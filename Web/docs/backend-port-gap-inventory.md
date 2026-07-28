# Backend port gap inventory

## Scope and decision

This inventory defines the remaining headless gameplay work before a
replacement product frontend may begin.

In this document, **frontend** means the future product interface. The
developer-only save diagnostic may remain available for compatibility work.
The removed Bot-tab slice was a disposable integration experiment and is not a
product baseline.

The existing exact event-time scheduler and performance work are accepted as
complete for this port stage. The work below is integration and gameplay
correctness work, not a request to resume discretionary performance tuning.

## Gate definitions

- **UI-start blocker**: the product frontend would otherwise have to own,
  duplicate or guess canonical gameplay behavior.
- **Release/host blocker**: required for a shippable target or seamless
  migration, but does not prevent developing a frontend against an in-memory
  application boundary.
- **Product-design gate**: the separate requirements in
  `frontend-readiness-gate.md`. Completing the backend does not implicitly
  approve a product design.

The backend is ready for product frontend work only when:

1. one concrete runtime session owns all canonical game state and every
   save-specific evaluation input;
2. one whole-game engine advances all time-dependent systems and records one
   combined statistics segment for each accepted interval;
3. every player gameplay action has a typed, validated command or an explicit
   decision that it is presentation-only;
4. rejected, staged and commit-first transitions cannot leak partial state;
5. checkpoints and fresh session reconstruction preserve the same next-step
   result; and
6. the frontend can consume a read-only snapshot without recomputing costs,
   unlocks or command eligibility.

The backend checkpoint now satisfies those six conditions. Product frontend
work may read the canonical application snapshot and dispatch typed player
commands through the lifecycle coordinator without reimplementing gameplay
rules. The separate product-design and release/host gates remain open.

## Required runtime composition

### Canonical session carrier

The simulation engine must not run on `CanonicalGameStateV1` alone. It needs a
versioned carrier equivalent to:

```ts
interface CanonicalRuntimeState {
  readonly gameState: CanonicalGameStateV1
  readonly compatibilityTuning: DysonCompatibilityTuning
  readonly evaluationSnapshot: DysonSkillEffectEvaluationSnapshot
  readonly entitlements: DysonEntitlements
  readonly tinker: CanonicalTinkerRuntimeState
  readonly storedTimeCheater: boolean
  readonly selectedSkillPresetSlot: CanonicalSkillPresetSlot
}
```

`evaluationSnapshot` is an evolving compatibility input. Each successful
Dyson recalculation reads the old snapshot and replaces it on the isolated
candidate with `nextEvaluationSnapshot`. A rejected transition must leave both
game state and the snapshot unchanged.

`compatibilityTuning` is immutable for one loaded save, but it is still
save-specific. `TransactionalGameApplication` currently receives one static
engine definition and may later install a different save through import or
post-commit reload. Capturing tuning only in the original construction closure
would therefore apply the wrong tuning after a session replacement. Carrying
the frozen tuning in runtime state is the smallest safe solution. The
alternative is to change the generic application contract to create a new
engine definition from every opened session.

### Atomic persistence

The session's `prepare` path must:

1. map `runtime.gameState` onto the preserved prepared source;
2. apply `withDysonSkillEffectEvaluationSnapshot` to that same
   `PreparedSave`; and
3. submit the single composed candidate to `SaveRepository`.

Compatibility tuning remains preserved source data. It is re-extracted and
frozen whenever a session is opened.

Implemented proof:

- one long advance and equivalent split advances produce the same game state
  and next evaluation snapshot;
- a command between split advances sees the snapshot published by the first
  advance;
- rejected and invalid staged transitions preserve both values;
- a checkpoint followed by a fresh session reconstructs the same next-step
  result;
- import replaces both the game state and save-specific tuning/snapshot; and
- a commit-first failure publishes neither half of the candidate.

These regressions prevent a model-private cache or mutable closure from
appearing correct in one engine instance and then failing after checkpoint,
import or reload.

## Gameplay and application inventory

Status meanings:

- **Ready**: a tested canonical domain authority exists.
- **Partial**: useful pure behavior exists, but a command, whole-game adapter
  or persistence coordinator is still missing.
- **Missing**: the frontend would currently have to reproduce Unity behavior.

| Surface | Current authority | Status | Remaining work | Gate |
| --- | --- | --- | --- | --- |
| IDB1 decode, migration, numeric repair and validation | `src/save` | Ready for development use | Complete field-by-field Unity schema-12 comparison before enabling release writes | Release/host |
| Transactional repository, startup, import and checkpoint lane | `src/save/repository.ts`, `src/save/startupResolver.ts`, `src/application/canonicalRuntimeSession.ts`, `src/application/canonicalGameApplication.ts` | Ready | None for frontend start | Complete |
| Canonical Unity graph mapping | `src/game-state/mapping.ts` | Partial | Close the executable coverage manifest and certify an authentic schema-12 round trip | Release/host |
| Save-specific Dyson tuning and evaluation | `src/application/canonicalRuntimeSession.ts` | Ready | None for frontend start | Complete |
| Numeric transactions and buy-mode math | `src/simulation/numeric.ts`, `src/simulation/transactions.ts`, canonical Dyson/research adapters | Ready | None for frontend start | Complete |
| Dyson production, purchases, automation and derived facts | `src/simulation/canonicalEventTimeModel.ts`, `src/simulation/canonicalDysonCommands.ts`, `src/application/frontendSnapshot.ts` | Ready | None for frontend start | Complete |
| Early-game Tinker | `src/simulation/canonicalTinker.ts` and runtime-session transient state | Ready | None for frontend start | Complete |
| Infinity reward, bot-cap checkpoint, reset and shop | Canonical Infinity modules plus `src/application/canonicalLifecycleCoordinator.ts` | Ready | Host save adapter still required for release | UI-start complete; release/host open |
| Skills, presets and auto-assignment | `src/simulation/canonicalSkillTransactions.ts`, canonical command router | Ready | None for frontend start | Complete |
| Dream production, purchases, education, upgrades and resets | Canonical Dream modules and whole-game event model | Ready | None for frontend start | Complete |
| Reality generation, gather and upgrades | Canonical Reality modules and whole-game event model | Ready | None for frontend start | Complete |
| Quantum upgrades, Entanglement and Leap | `src/simulation/quantumTransitions.ts`, artifact-point derivation and canonical command router | Ready | None for frontend start | Complete |
| Avocado feeding, multiplier and meditation | Canonical Avocado modules and command router | Ready | None for frontend start | Complete |
| Returned time, stored time, capacity and Double Time | Whole-game event model, `src/simulation/storedTimeAccounting.ts`, lifecycle coordinator | Ready | None for frontend start | Complete |
| Lifecycle, commit-first continuation and statistics | `src/application/canonicalLifecycleCoordinator.ts`, `src/simulation/canonicalStatistics.ts` | Ready | Connect selected host lifecycle/save adapters for release | UI-start complete; release/host open |
| Typed command inventory and authoritative frontend snapshot | `src/application/canonicalPlayerCommands.ts`, `src/application/frontendSnapshot.ts` | Ready | Read snapshots from the application; route player commands and active wall time through the lifecycle coordinator | Complete |
| Achievement evaluation and publication | Platform contract only | Missing adapter/evaluator | Define canonical achievement facts, then implement Steam synchronization | Release/host |
| Rich presence and Steam statistics | Platform contract only | Missing adapters | Implement in the Electron/main-process host | Release/host |
| Audio, clipboard, links and local UI preferences | Platform contracts only | Missing adapters | Implement for selected hosts; unavailable stubs are sufficient for initial frontend development | Release/host |
| Desktop/mobile save discovery and atomic filesystem storage | Storage contract only | Missing adapters | Implement Electron and Capacitor adapters with retained identity and original-save recovery | Release/host |
| Browser save storage | In-memory repository is available for tests | Missing host adapter | Add IndexedDB only if browser is selected as an end-to-end acceptance target | Release/host, not UI-start by default |
| Safe area, orientation and touch navigation | Platform inventory only | Missing host/UI implementation | Specify and certify per target | Product-design and release |

## Typed command coverage required

The command union must be exhaustive and the router must reject unsupported or
invalid commands without changing object identity. Commands should carry only
intent; costs, prerequisites, unlocks and rewards belong to domain
transactions.

### Dyson and Infinity

- start Tinker;
- purchase a basic or mega facility;
- set facility buy mode and rounded-bulk behavior;
- set bot distribution using Unity's one-percent normalization and
  bot-multitasking rule;
- enable or disable each facility automation target;
- purchase research;
- set research buy mode and rounded-bulk behavior;
- enable or disable each research automation target;
- set the Break Infinity target;
- purchase every Infinity-shop item; and
- request the Unity Quantum action, selecting Entanglement or Leap from
  canonical unlock state and enforcing the total-42 gate.

### Skills

- purchase, refund and reset;
- run auto-assignment at the same reset/purchase points as Unity;
- select and rename a preset;
- replace, add to or remove from a preset queue;
- copy the selected preset to the active queue;
- update the selected preset's bot distribution; and
- set the non-refundable auto-assignment policy.

### Dream, Reality, Quantum and Avocado

- all foundational, information and space-age purchases;
- start education and purchase Simulation upgrades;
- gather Reality influence and purchase the authored permanent auto-gather
  upgrade;
- purchase Reality and Quantum upgrades;
- feed each supported resource to Avocado;
- complete the next valid Avocado meditation step; and
- set Double Time rate, upgrade stored-time capacity and spend stored time.

Confirmation prompts, pointer hold, countdown visuals, navigation, search and
panel state remain presentation concerns. A confirmation UI dispatches the same
canonical command only after confirmation; it does not create a second
gameplay path.

## Whole-game event model requirements

The concrete model must adapt existing pure modules without reimplementing
their formulas. At each event boundary it must preserve the established order:

1. continuous time advancement;
2. all production arrivals;
3. queued player input;
4. automation;
5. derived timers and Double Time debit;
6. Dream resets;
7. bot-cap transition; and
8. Infinity reset.

Additional correctness rules:

- compatibility tuning and entitlements are explicit deterministic inputs;
- all eight Dyson facilities, research, Dream and Reality participate in the
  same candidate;
- `nextEvaluationSnapshot` is replaced only on an accepted candidate;
- the Infinity horizon and reward use one canonical calculation;
- Quantum Leap rejects until total Infinity Points reach 42;
- artifact skill points are derived, not supplied by a frontend;
- automation target indices and remaining event clocks survive split calls and
  reload;
- one accepted interval produces one combined statistics record, rather than
  one record per subsystem; and
- unsupported dependencies fail closed with stable typed codes.

## Implemented composition files

### `src/application/canonicalRuntimeSession.ts`

- Define and clone `CanonicalRuntimeState`.
- Open a prepared save by hydrating canonical state, compatibility tuning and
  the previous evaluation snapshot.
- Validate all three parts.
- Prepare a save by mapping canonical game state and atomically writing the
  next evaluation snapshot.

### `src/application/canonicalGameApplication.ts`

- Construct the concrete whole-game engine definition.
- Inject exported data lookups, Reality/Dream tuning and explicit entitlement
  values.
- Apply the canonical command router and whole-game event model.
- Expose one factory used by developer tests and every future host.

### `src/application/canonicalLifecycleCoordinator.ts`

- Translate platform lifecycle events into clock samples and save intents.
- Run cold-start/returned-time replay.
- Continue yielded work without double-granting time.
- Execute stored-time spends and bot-cap checkpoints through the commit-first
  persistence lane.

### `src/application/frontendSnapshot.ts`

- Project immutable resources, rates, costs, progress, unlocks and command
  availability.
- Include revision/session information required for command envelopes.
- Centralize gameplay eligibility; do not format numbers, choose colors or
  encode layout.

### Host-specific adapters

Keep `browserSaveStorage.ts`, Electron filesystem/Steam adapters and Capacitor
filesystem/lifecycle adapters outside the gameplay composition. Their absence
must not cause the frontend to invent alternate game rules.

## Completed dependency order

1. Landed the runtime carrier, event model and command router with split-call,
   rejection and fresh-session tests.
2. Added the remaining canonical adapters for Tinker and artifact skill points,
   then route the completed basic-facility, manual-research, Infinity
   reward/horizon, Infinity-shop and Avocado-meditation domains.
3. Routed every remaining settings, preset, Dream, Reality, Quantum, Avocado and
   stored-time command.
4. Built the lifecycle coordinator, bot-cap persistence orchestration and
   single-segment statistics integration.
5. Built and contract-tested the read-only frontend snapshot.
6. Ran the full tests, type check, lint, production build and deterministic
   data check, then created the local checkpoint.
7. Separately satisfy the product-design gate before creating the replacement
   frontend.
8. Complete storage, Steam and device adapters plus canonical-write
   certification before release.

## Acceptance boundary

The backend-port milestone is complete when a headless integration test can:

1. load a representative Unity save;
2. execute every gameplay command family;
3. advance active, returned and stored time across multiple calls;
4. cross Infinity, Dream and Quantum boundaries;
5. checkpoint and reconstruct a fresh application;
6. continue with results equivalent to an uninterrupted run; and
7. expose the resulting state entirely through the frontend snapshot.

That milestone does not require final visual design, optional performance
tuning, Steam/mobile packaging or a production deployment.

The representative headless integration regression now exercises this complete
sequence. Full-suite validation is green and the local Git checkpoint is
complete.
