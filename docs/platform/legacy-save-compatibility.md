# Legacy save compatibility

Idle Dyson Swarm accepts supported saves from the retired Unity application so
existing players can continue in the canonical TypeScript product. This is a
one-way compatibility boundary, not a gameplay or balance authority.

## Certified legacy baseline

The pinned certified public baseline is application `3.0.328`, save schema
`11`, source revision
`9b840fb2547ad507d4e529a610a031cc13782847`. Its source catalog contains 519
leaf-field patterns with sorted-path SHA-256
`0b0559fc79cda740529fafd6cb075edd3725255147cd8fbd06a568b4e46970b4`.

These identifiers exist solely to keep decoder, migration, repair, and mapping
fixtures reproducible. They do not constrain current facilities, progression,
economy, presentation, or host behavior.

Older supported save representations remain valid migration inputs where the
decoder explicitly accepts them; schema 11 is the structural certification
surface, not a claim that no earlier save can be imported.

## Compatibility guarantees

- Unknown legacy fields fail classification rather than acquiring an assumed
  owner.
- Legacy duplicates, cached derived values, presentation preferences, and
  platform entitlements are classified separately from canonical gameplay.
- Imported data is repaired and validated before canonical hydration.
- Current TypeScript derivations recompute derived values and may deliberately
  supersede historical behavior.
- The original source save is never overwritten or deleted by migration.
- Existing authentic fixtures remain executable release evidence.

The implementation pins are `src/game-state/mappingCoverageSchema11.ts`, the
mapping coverage manifest, and `test/parity/save-migration-cases.json`. Any
change to compatibility must update the relevant fixtures and pass canonical
round-trip, import, recovery, and persistence tests.

## Adding another legacy format

Identify the exact released application and schema, derive its explicit source
fields, classify every added or removed field, add an authentic fixture, and
verify decode, migration, canonical hydration, export, reload, and recovery.
Never broaden a classifier wildcard merely to make an import pass.
