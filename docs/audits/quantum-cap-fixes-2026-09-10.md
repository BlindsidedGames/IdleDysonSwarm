# Quantum cap fixes — 10 September 2026

B02, B03, and B04 are implemented and reviewed in the working tree based on
`4a56278d`. Automated verification is complete. Live browser/device verification
is not complete; no merge, upload, or release is claimed.

## Result

- B02: Cash/Science ownership remains exact signed 64-bit bigint. The final
  production multiplier alone converts to floating point, retaining the existing
  5%-per-level formula. The erroneous safe-integer restriction no longer rejects
  otherwise valid purchases. Invalid ownership beyond the existing cap still fails.
- B03: cumulative earned/spent totals remain exact bigint values in their existing
  fields. Only the current wallet is capped. Both Quantum-reset grants and
  Entanglement can replenish a spent wallet beyond the former lifetime ceiling.
  Partial conversion consumes exactly 42 IP per credited Shard and keeps unused IP.
- B04: one shared constant-time quantity helper supplies command Max and UI Max.
  Fixed batches beyond remaining capacity reject without charge. Influence Max
  matches repeated Buy 1, including the existing partial last increment at the cap.

There are no new save fields, migration layers, background loops, global numeric
limit changes, cost changes, or conversion-rate changes. Cumulative ledger totals
can exceed signed 64-bit without changing the save codec. At astronomical levels,
adjacent exact counts can share a floating-point production value; this follows the
existing continuous production model, while ownership and spending remain exact.

## Review and verification

Separate agents implemented each item. The coordinating review rejected an initial
change that would have removed Influence's final partial single purchase; it was
corrected and retested. A second cross-review of all three fixes found no remaining
issue. A 405-state differential check compared Max with repeated Buy 1 for all three
boosters, small boundary headrooms, empty/funded wallets, and cumulative spending
above signed 64-bit.

The independent application integration test uses the real
`CanonicalGameApplicationFacade` and `PortableSaveRepository` over an in-memory
text storage adapter. It buys Cash at the full cap, earns another 100 Shards,
rejects an oversized Influence batch without mutation, purchases the correct Max,
spends above the old cumulative ceiling, checkpoints, starts a new application,
checks exact balances/ownership/previews, and advances the simulation again.

Automated gates:

- Full suite: 134 files, 1,451 tests passed.
- TypeScript project build and lint passed.
- Production Web and native-mode Web bundles built successfully.
- Production Store boundary check passed.
- Generated data and first-Dyson parity checks passed.
- Localization extraction, translation validation, and compilation passed for
  all supported locales and pseudo-locales; the in-game 4.1.8 Wiki has one concise
  localized Quantum fix bullet.
- `git diff --check` passed.

The builds retain the existing large-chunk advisory; no new bundle architecture
was introduced. The `tsx` command wrapper could not create its IPC socket under
this host's restrictions, so equivalent check scripts were successfully run with
`node --import tsx` (no IPC listener).

## Verification boundary

Starting a local HTTP preview failed with `listen EPERM`. A local-file preview
was also explicitly blocked by browser URL policy; that restriction was not
worked around. Rendered React component tests verify quantity labels, disabled
states, Maxed state, and click dispatch, but do not establish live-browser or
physical-device visual acceptance. Native-mode bundle success is not a native
archive or installed-device test. Remaining manual release checks stay in the
backlog's release-certification section.
