# Legacy data authority

The deprecated Unity compatibility capsule is frozen provenance, not a blanket
runtime contract. Authority is determined at the current consumer boundary:

- a generated value remains active when a canonical TypeScript module
  explicitly loads and validates it;
- an unconsumed field has no gameplay effect and cannot be used to reconstruct
  retired behavior;
- an explicit TypeScript definition, living contract, and executable test form
  a deliberate override when they differ from a retained field; and
- active values should move to Web-owned authored catalogs before ordinary
  balance or content editing resumes.

## Current explicit overrides

Mega-structure purchase eligibility is owned by
`src/simulation/dysonFacilityCatalog.ts` and
`src/simulation/unifiedFacilitySystem.test.ts`. After its sequential Quantum
upgrade is purchased, each mega-structure remains visible and purchasable by
manual commands and automation after resets even when its predecessor count is
zero. The predecessor requirements retained in the frozen capsule are not
consumed by this command path and must not be restored as parity fixes.

Add future deliberate differences here or migrate the affected value into a
Web-owned catalog. Do not use this contract to excuse unexplained drift in a
generated value that the runtime still consumes.
