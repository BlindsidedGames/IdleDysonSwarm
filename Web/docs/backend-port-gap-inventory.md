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

The current project has a strong save and domain foundation, but it does not
yet satisfy those six conditions.

## Required runtime composition

### Canonical session carrier

The simulation engine must not run on `CanonicalGameStateV1` alone. It needs a
versioned carrier equivalent to:

```ts
interface CanonicalRuntimeStateV1 {
  readonly gameState: CanonicalGameStateV1
  readonly dysonEvaluationSnapshot: DysonSkillEffectEvaluationSnapshot
  readonly dysonCompatibilityTuning: DysonCompatibilityTuning
}
```

`dysonEvaluationSnapshot` is an evolving compatibility input. Each successful
Dyson recalculation reads the old snapshot and replaces it on the isolated
candidate with `nextEvaluationSnapshot`. A rejected transition must leave both
game state and the snapshot unchanged.

`dysonCompatibilityTuning` is immutable for one loaded save, but it is still
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

Required proof:

- one long advance and equivalent split advances produce the same game state
  and next evaluation snapshot;
- a command between split advances sees the snapshot published by the first
  advance;
- rejected and invalid staged transitions preserve both values;
- a checkpoint followed by a fresh session reconstructs the same next-step
  result;
- import replaces both the game state and save-specific tuning/snapshot; and
- a commit-first failure publishes neither half of the candidate.

Without these tests, a model-private cache or mutable closure can appear
correct in one engine instance and fail after checkpoint, import or reload.

## Gameplay and application inventory

Status meanings:

- **Ready**: a tested canonical domain authority exists.
- **Partial**: useful pure behavior exists, but a command, whole-game adapter
  or persistence coordinator is still missing.
- **Missing**: the frontend would currently have to reproduce Unity behavior.

| Surface | Current authority | Status | Remaining work | Gate |
| --- | --- | --- | --- | --- |
| IDB1 decode, migration, numeric repair and validation | `src/save` | Ready for development use | Complete field-by-field Unity schema-12 comparison before enabling release writes | Release/host |
| Transactional repository, startup, import and checkpoint lane | `src/save/repository.ts`, `src/save/startupResolver.ts`, `src/application/gameApplication.ts` | Ready generic boundary | Supply a concrete canonical runtime session and application factory | UI-start |
| Canonical Unity graph mapping | `src/game-state/mapping.ts` | Partial | Close the executable coverage manifest and certify an authentic schema-12 round trip | Release/host |
| Dyson compatibility tuning | `src/game-state/compatibilityTuning.ts` | Ready extraction | Put it in the per-session runtime context; do not capture the first save forever | UI-start |
| Dyson evaluation snapshot | `src/game-state/skillEffectEvaluationSnapshot.ts` | Ready extraction and atomic save composition | Carry and replace it in every accepted runtime transition | UI-start |
| Numeric transactions and buy-mode math | `src/simulation/numeric.ts`, `src/simulation/transactions.ts` | Ready primitives | Add immutable canonical adapters for basic facility purchases | UI-start |
| Dyson production and derived rates | Dyson derivation, effect, mega-rate and arrival modules under `src/simulation` | Ready domain primitives | Wire all rates and arrivals into the whole-game event model | UI-start |
| Manual mega-structure purchase | `src/simulation/canonicalDysonCommands.ts` | Ready domain command | Route through the canonical command union | UI-start |
| Eight-facility automation | `src/simulation/canonicalDysonCommands.ts` | Ready domain command | Run at the exact scheduler automation boundary | UI-start |
| Research automation | `src/simulation/researchAutomation.ts` | Ready domain command | Run in the same ordered automation boundary as facility automation | UI-start |
| Manual basic facility purchase | Mutable basic slice exists in `src/simulation/transactions.ts` | Partial | Add a `CanonicalGameStateV1` adapter with unlock checks and immutable replacement | UI-start |
| Manual research purchase | Purchase logic is internal to research automation | Partial | Export one canonical transaction using the same definitions, prerequisites, costs and buy mode | UI-start |
| Early-game Tinker | Dynamic yield/cooldown effects exist; Unity authority is `Assets/Scripts/Buildings/ManualBotCreation.cs` | Missing | Port the durable cooldown plus transient action progress, bot/assembly yield switch, repeat behavior and event scheduling | UI-start |
| Infinity reward and trigger | Basic Infinity math and canonical reset are tested | Partial | Add the exact canonical reward/event-horizon adapter used by the whole-game model | UI-start |
| Ordinary and Break Infinity reset | `src/simulation/canonicalInfinityReset.ts` | Ready domain transition | Route automatic and explicit boundary behavior through the runtime model | UI-start |
| Finite bot-cap transition | `src/simulation/canonicalBotCapCheckpoint.ts` | Partial | Coordinate pending, reward and reset candidates with the application persistence lane | UI-start and release |
| Infinity shop | `src/simulation/canonicalInfinityShop.ts` | Ready domain transaction | Route secrets, permanent skill points, retained facility chain and automation purchases | UI-start |
| Skill purchase/refund/reset/auto-assignment | `src/simulation/canonicalSkillTransactions.ts` | Domain transition added in the current checkpoint | Route commands and finish preset/queue editing commands | UI-start |
| Skill presets and active auto-assignment queue | Canonical durable state is mapped | Partial | Add select, rename, replace queue, add/remove queue item, bot-distribution sync and auto-assign policy commands | UI-start |
| Dream foundational/information/space production and purchases | Dream modules under `src/simulation` | Ready domain primitives | Wire all production, conversions, education, upgrades, railgun and purchase commands into the runtime | UI-start |
| Dream resets | `src/simulation/canonicalDreamReset.ts` | Ready domain transitions | Trigger at the exact event boundary and route any explicit action | UI-start |
| Reality worker generation and gather | `src/simulation/realityWorkers.ts` | Ready domain primitives | Wire time advance, manual gather and auto-gather into the runtime | UI-start |
| Reality upgrades | `src/simulation/realityUpgrades.ts` | Ready domain transaction | Route purchases and expose authoritative eligibility | UI-start |
| Quantum upgrades | `src/simulation/quantumUpgrades.ts` | Ready domain transaction | Route purchases and expose authoritative eligibility | UI-start |
| Quantum Entanglement | `src/simulation/quantumTransitions.ts` | Ready domain transition | Route it with the same Quantum action gate as Unity | UI-start |
| Quantum Leap reset | `src/simulation/quantumTransitions.ts` | Partial | Enforce Unity's total-42 Infinity Point gate and supply exact artifact skill points before reset | UI-start |
| Artifact skill points | Unity authority is `Oracle.ArtifactSkillPoints()` | Missing canonical derivation | Sum owned Reality `AddSkillPoints` effects using Unity rounding, then add four for completed Avotation | UI-start |
| Avocado feeding and multiplier | `src/simulation/avocadoDomain.ts` | Ready domain transaction | Route all feed sources and expose derived multiplier | UI-start |
| Avocado meditation | `src/simulation/avocadoMeditation.ts` | Ready domain transaction | Route the ordered step command; keep help countdown presentation-only | UI-start |
| Returned/stored-time math | `src/simulation/timeResources.ts` | Ready primitives | Add a concrete spend command that advances the full model and debits the bank commit-first | UI-start |
| Stored-time capacity upgrade | `src/simulation/timeResources.ts` | Ready primitive | Route the purchase/reset transaction | UI-start |
| Dream Double Time | `src/simulation/timeResources.ts` | Ready tick math | Route rate changes and integrate preparation/debit into whole-game advancement | UI-start |
| Lifecycle/away replay policy | `src/simulation/lifecycleAwayTime.ts` | Ready pure policy | Build the application coordinator for clock samples, replay, save intents and cancellation/yield continuation | UI-start |
| Statistics | `src/simulation/canonicalStatistics.ts` | Ready recorder | Record exactly one combined segment for each accepted interval after all domain effects are known | UI-start |
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
- gather Reality influence and set auto-gather;
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

## Recommended composition files

### `src/application/canonicalRuntimeSession.ts`

- Define and clone `CanonicalRuntimeStateV1`.
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

## Dependency-ordered completion plan

1. Land the runtime carrier, event model and command router with split-call,
   rejection and fresh-session tests.
2. Add the remaining canonical adapters for Tinker and artifact skill points,
   then route the completed basic-facility, manual-research, Infinity
   reward/horizon, Infinity-shop and Avocado-meditation domains.
3. Route every remaining settings, preset, Dream, Reality, Quantum, Avocado and
   stored-time command.
4. Build the lifecycle coordinator, bot-cap persistence orchestration and
   single-segment statistics integration.
5. Build and contract-test the read-only frontend snapshot.
6. Run the full tests, type check, lint, production build and deterministic
   data check, then make a local checkpoint.
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
