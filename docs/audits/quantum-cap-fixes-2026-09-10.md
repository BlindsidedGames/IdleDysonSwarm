# Quantum cap fixes — 10 September 2026

B02, B03, and B04 are implemented in `a894fc24` and reviewed together with
the recovered 4.1.8 fixes from `e65cbc3e`. Automated and live browser
verification are complete for the scoped changes. Device/store certification
and release delivery remain separate.

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

- Combined full suite: 135 files, 1,470 tests passed on Node 22 and Node 24.
- TypeScript project build and lint passed.
- Production Web and native-mode Web bundles built successfully.
- Production Store boundary check passed.
- Generated data and first-Dyson parity checks passed.
- Localization extraction, translation validation, and compilation passed for
  all supported locales and pseudo-locales; the in-game 4.1.8 Wiki has one concise
  localized Quantum fix bullet.
- `git diff --check` passed.

The builds retain the existing large-chunk advisory; no new bundle architecture
was introduced. Earlier sandbox restrictions were lifted for integration verification; the
standard npm check scripts now pass.

## Live integration verification

The game ran at a local HTTP origin with the original preview save backed up
before testing and restored afterwards. A prepared canonical fixture started
with cumulative earned/spent Shards above signed 64-bit and two/three remaining
Cash/Science levels plus one partial Influence purchase.

- Buy 10 was disabled for all three boosters. Max displayed exactly 1/2/3.
- Buying those quantities charged six Shards and reached all three ownership caps.
- Entanglement then credited 100 Shards for exactly 4,200 unspent IP.
- After the normal automatic checkpoint and browser reload, the wallet was 194
  and all three boosters remained Maxed. The exported save was decoded outside
  the browser and checked against exact bigint values: earned MAX + 200,
  spent MAX + 6, three ownership values MAX, and IP total/spent both 7.
- Settings was changed to 200 ms, restored to Default (33 ms), and reloaded;
  the saved value remained 33 ms. Injected request-failure cases pass in the
  component regression suite.
- Quantum was visually inspected at 390x844, 768x1024, and 1366x900. Settings
  was also inspected at 390x844. No clipped purchase controls or horizontal
  document overflow were observed. The console had no warnings or errors.
- Electron startup and suspend/resume smoke tests exited successfully.
- Steam mobile boundary scan passed for all 214 native renderer files.

Screenshots and decoded-export evidence are local QA artifacts under
`/tmp/ids-integration-qa`; they are not distributable game assets.

## Remaining boundaries

An immediate browser reload before the periodic checkpoint reproduced the
existing unsaved-progress window. A later reload after autosave preserved the
changes. This is consistent with the separately documented, deferred B01
investigation; this integration does not change the 30-second checkpoint policy
or establish the cause of players' unexpected process restarts.

Steam offline-profile recovery has filesystem-backed account-isolation,
interrupted-copy, save-preservation, and Cloud conflict tests. Electron smoke
success does not establish signed-in Steam account-switching acceptance or
physical iOS/Android device certification. No upload or store release is claimed.
