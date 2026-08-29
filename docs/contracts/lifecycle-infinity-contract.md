# Lifecycle and Infinity contract

This contract defines the persistence-sensitive boundary around returned time,
Stored Time, the finite bot cap, and Infinity. The modules are pure: they
produce immutable candidates and explicit intents, while
`TransactionalGameApplication` remains the only owner of durable publication.

## Returned time and lifecycle

Lifecycle policy is owned by the canonical TypeScript runtime:

- mobile pause and focus loss request a timestamped save;
- desktop pause and focus loss are no-ops;
- quit requests a timestamped save on every platform;
- focus gain requests away-time replay without reloading the whole game;
- the cold-start gate permits at most one forced save before replay, and that
  save preserves the historical quit timestamp;
- no later pre-replay lifecycle callback may overwrite that timestamp.

Away-time source selection is explicit and host-independent:

1. a missing quit timestamp grants nothing and remains unconsumed;
2. a valid quit timestamp is authoritative;
3. an invalid quit timestamp falls back to the saved start timestamp;
4. invalid quit and start timestamps fall back to the current UTC sample.

Backward clock movement grants zero and emits an integrity signal. A
non-missing replay consumes the quit timestamp in its canonical candidate so it
cannot be awarded twice.

The returned duration is credited to the Offline Time bank only up to its
capacity. Idle Electric Sheep doubles eligible away-time credit but does not
affect active play or manually spent Offline Time. A visible foreground gap
over 60 seconds uses the same retry-safe credit path instead of becoming one
unbounded active update.

Stored-time capacity upgrades require a full bank, empty that bank, double the
capacity and stop at the ceiling. Spending is started manually and remains a
commit-first application operation: one detached candidate is persisted before
it is published. Cancellation, failure, import or reset discards the complete
uncommitted candidate without charging the bank.

## Finite bot-cap recovery

The special finite cap is not one atomic in-memory reset. It is a durable
three-step state machine:

1. persist `botCapTransitionPending` before classifying rewards;
2. from a durable pending state, persist +1,000 Infinity Points, +1 Avocado
   Overflow, `botCapRewardsGranted` and `inProgress` together;
3. only a rewards-granted state may enter normal ordinary or Break Infinity.

A failed reward write rolls back to the pending candidate. Restarting from
either checkpoint resumes the next phase without granting the special reward
twice. Invalid bot values produce a separate repair candidate that zeros bots
and clears all transition flags before any further simulation.

Bot-cap statistics are recorded by the subsequent normal Infinity transition,
after the reward checkpoint is known to be durable.

## Infinity reset ownership

The reset transition may replace only the Dyson run, Research runtime, Skill
runtime, and Infinity-cycle metadata defined by the canonical reset contract.
Dream, Reality, Quantum, Avocado, secret progress, permanent progression, and
unrelated statistics are preserved.

The pure reset must:

- grant the already-classified ordinary or Break reward with saturating
  arithmetic and record the actual admitted delta;
- roll current stored-time usage into the previous-cycle field;
- retain ten manually owned units for each selected basic facility;
- start with ten bots when Assembly Line retention is active, otherwise one;
- rebuild available skill points from permanent, banked and explicitly
  supplied platform/artifact points;
- clear skill ownership, timers and fragments, then run dependency-aware
  auto-assignment in stable queued order;
- clear Infinity and bot-cap transition flags and mark the tutorial/first
  Infinity metadata complete.

The event-time coordinator, not the pure reset, owns automation phases,
Infinity-boundary phase, run clock and starting-point rollover. This separation
prevents an internal reset helper from silently disturbing deterministic
scheduler state.

## Runtime integration

The canonical engine routes candidates through the transactional application,
persists each checkpoint through the verified lane, and orders Infinity with
Dream and the remaining prestige domains before snapshot publication.
