# Parity fixture contract

Two fixture layers are in place.

## Save preparation

`test/parity/save-migration-cases.json` runs real Odin fixtures through decode,
migration, numeric repair and validation. These fixtures are executable now
because save schema 12 is already authoritative.

## Simulation

`test/parity/simulation-fixture.schema.json` defines the future Unity
golden-master exchange:

- Complete persisted state immediately before the scenario.
- Timestamped player/automation commands.
- Exact elapsed simulated milliseconds.
- Complete persisted state after the scenario.
- Explicit tolerances only where exact floating-point equality is intentionally
  unavailable.

The fixture executor and graph comparator live in `src/parity`. The exact
cross-platform scheduler is now implemented, but no gameplay production model
or expected golden-master output is recorded yet. Those fixtures must be
captured from the pinned Unity reference before their corresponding TypeScript
model becomes authoritative.

Initial golden-master coverage after the overhaul should include idle production,
each automation family, coincident automation events, each reset boundary,
stored-time partitioning, offline acceleration, bot-cap recovery, Dream
transitions, and save/reload at an event boundary.
