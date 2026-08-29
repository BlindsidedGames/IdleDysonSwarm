# Deprecated Unity compatibility capsule

This directory is a byte-frozen input retained for legacy save decoding,
stable IDs, generated presentation content, and balance values that have not
yet been moved to Web-owned catalogs. It is not a blanket gameplay,
progression, economy, presentation, or product contract.

The canonical product is the root TypeScript/React application. Current
runtime behavior is owned by `src/simulation`, application commands, living
contracts, executable tests, and the generated catalog values those modules
explicitly consume. An unconsumed historical field is not authoritative merely
because it remains in the capsule. An explicit TypeScript rule or documented
override wins when it deliberately differs.

Do not infer prerequisites, gates, formulas, or UI behavior from fields that the
current runtime does not consume. In particular, mega-structure purchase gates
are owned by `DYSON_FACILITY_DEFINITIONS` and its executable tests; the capsule's
old predecessor fields do not apply. Do not edit the frozen JSON files in
place. Move an active value into an explicitly Web-owned catalog before
changing its source.

`scripts/build-web-data.ts` continues to copy the capsule byte-for-byte while
legacy consumers remain. Removing this directory requires first replacing all
imports of the corresponding generated files and preserving existing-player
save compatibility.
