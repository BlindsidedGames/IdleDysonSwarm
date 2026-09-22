# Discord fixes and SRS rework — 22 September 2026

## Changes

- Tinker input no longer suspends/restarts the active-time delivery clock on every
  click. Commands still enter the serialized lifecycle lane with session/revision
  checks. Frequent input previously postponed ticks, then replayed accumulated
  time in a burst when input stopped.
- Stellar Memory costs 5 SP. While assigned, it multiplies other SRS augment
  benefits by `1 + 0.25 × log10(max(1, banked seconds))`. Infinity and Quantum bank
  only newly generated charge while assigned; new deposits apply next run.
  Challenge restarts do not deposit. Existing tracked lifetime seconds become the
  initial bank without inventing historical charge.
- Hot Start scales its 30-minute grant and tops up only the missing difference
  when Stellar Memory is assigned later. Its grant accounting persists across
  save/reload and refund/reassignment of Stellar Memory. Hot Start is now
  non-refundable; Banking and Investment are refundable in both live and reset
  assignment paths.
- Afterglow scales retention from 10% to a maximum of 50%, using the ending run's
  bank before its new deposit. Quantum clears retained charge. Deep Exposure,
  Focused Beam, Research Conversion and Research Activity scale their benefits;
  penalties and durations are unchanged. Charging bonuses remain additive.
- Player-facing Galvanizers/Galvanized terminology becomes Catalysts/Fractured.
  Save identifiers stay unchanged. Seven translated catalogs are updated;
  historical release notes retain the names used at their release.

## Investigations and deferred work

- **Planets:** the reported 4.36 Data Centers/s with zero Planets is intentional
  Pocket Dimensions production, reproduced with 22,900 Worker Bots. No production
  calculation change is needed.
- **Black-hole reward:** added the approved visible `+` before the reward value.
  The existing accessible label already explicitly describes the positive gain.
- **Double-tap zoom:** explicitly deferred in `docs/BACKLOG.md`.
- **Legacy Stellar Memory cost:** schema 18 unassigns an existing legacy purchase
  and refunds its original 2 SP once. It preserves the bank, Hot Start grant
  markers and saved preset intent, but removes Stellar Memory from the live
  auto-assignment queue so it is not immediately repurchased for 5 SP. This uses the recommended migration announced during implementation.

## QA evidence

- **Chromium interaction:** disposable profile with `--use-mock-keychain`.
  `scripts/verify-tinker-input.ts` exercised 100 clicks/second, normal taps, hold
  latching, release and navigation cleanup. Time continued at real-time speed
  during input and after release; no catch-up burst.
- **Browser visual/gameplay QA:** inspected all seven SRS augment descriptions at
  desktop size and a narrow viewport with 130% text. Exercised manual assignment,
  reset and reload. Descriptions fit and displayed controls remained usable.
  Also verified preset and auto-assignment paths in both Hot Start/Stellar Memory
  assignment orders. Spending 600 seconds of Stored Time increased SRS charge
  from approximately 4,053 to 6,908 seconds while the bank remained 100,000.
- **iOS Simulator interaction:** rebuilt and launched disposable bundle
  `com.blindsidedgames.idledysonswarm.discordqa` on simulator beginning `729BF`.
  Opened Skills, searched SRS, then opened Stellar Memory. Description fitted;
  refund of 5 SP and reassignment for 5 SP were visually verified. The persisted
  checkpoint retained bank `100000` and Hot Start secondary grant `2250` through
  a cold launch.
- **Android:** built, installed and launched. The available computer-use surface
  could not target the emulator; no Android interaction or visual acceptance is
  claimed from that build/launch check.
- **Independent code review:** found Banking's initial live-only refundable
  override omitted Infinity reset auto-assignment. Moving it into the shared
  runtime catalog fixes both consumers; a regression covers reset with
  non-refundable auto-assignment disabled. Tinker review found no actionable
  serialization/session race in the revised dispatch path. The legacy cost
  migration received a separate ordering, idempotence and schema review; final
  independent review found no unresolved actionable defects.
- **Completed focused checks:** SRS regression suite passed 22 tests; challenge
  and augment UI suites passed 10 tests. `npm run i18n:check` passed extraction,
  translation parity and compilation for all supported and pseudo locales.
  Final integrated checks: all **1,770 tests across 171 files** passed. Production
  build/typecheck, lint, frozen-data validation, first-Dyson fixture parity and
  whitespace checks passed. A final iOS rebuild also passed; upgrading the
  disposable installation visibly refunded exactly 2 SP (84 → 86). Its
  schema-18 checkpoint retained the 100,000-second bank and 2,250-second Hot Start
  extra-grant marker while Stellar Memory was unassigned.

No deployment or store-submission changes are part of this work. Native
interaction evidence above is simulator evidence, not physical-device coverage.

## Exact English technical descriptions

Flavour descriptions are unchanged. The following text is extracted from the
current message definitions; translated equivalents are maintained in all seven
supported non-English catalogs.

### Stellar Memory

On Infinity or Quantum reset, bank newly generated SRS charge, excluding Hot Start and Afterglow. While assigned, boosts SRS augment benefits by 1 + 0.25 × log10(max(1, banked seconds)).

### Hot Start

Gain 30 minutes of SRS charge on first assignment each Infinity, multiplied by Stellar Memory. Assigning Stellar Memory later adds any missing charge once. Non-refundable.

### Afterglow

Retain 10% of SRS charge through Infinity, multiplied by Stellar Memory up to 50% retention. Adds to Hot Start. Quantum Leap clears retained charge.

### Deep Exposure

Increase SRS charging speed by 10% per minute this augment is assigned, up to 200% after 20 minutes. Stellar Memory multiplies these bonuses. Resets on Infinity or Quantum Leap. Bonuses are additive.

### Focused Beam

Increase the SRS bonus above 1× by 50% for Cash or Science, whichever has more Bots assigned. Stellar Memory multiplies this increase. Halve the bonus for the other resource. Equal allocation leaves both unchanged.

### Research Conversion

Reduce Science production by 50%. Increase SRS charging speed by 100%, multiplied by Stellar Memory. Bonuses are additive.

### Research Activity

Gaining a research level increases SRS charging speed by 150%, multiplied by Stellar Memory, for 30 seconds. Generated levels count. Further gains refresh the duration. Bonuses are additive.

## Generated-charge banking follow-up

- Stellar Memory now deposits only charge generated by the interval integrator.
  Its previously unused runtime timer stores this run's earned charge, including
  charging bonuses and before-assignment generation. Existing persistence handles
  save/reload; refunds preserve it and run resets clear it. Hot Start and Afterglow
  never increment this counter. Existing banks are preserved; older saves begin
  tracking new eligible charge from the update, without guessing historical sources.
- Regression checks cover 100 instant Infinity/Quantum resets, assignment/top-ups,
  refunds, save/reload, one-time deposits, restart exclusion and split/bulk charging.
  Full suite: 1,774 tests passed; typecheck, lint and localization checks passed.
- Browser: inspected the approved concise description, performed Infinity with the
  disposable SRS preset, reloaded and confirmed the assigned augments and description.
  Exact deposit arithmetic is covered by simulation tests, not inferred from the UI.
- This follow-up has not been deployed or rechecked on native devices.

### Pre-merge live QA — 22 September 2026

- Used the running localhost game and its Settings export UI, rather than injected
  browser state, to verify an actual Infinity reset. Bank increased from
  101177.73699999996 to 104933.7080779696. The ending run excluded
  10376.074777055255 seconds of grants/carryover. Reconstructing the next run's
  Hot Start and Afterglow from exported checkpoints matched exactly
  (7240.918599082543 seconds); the newly earned tally restarted separately.
- Reload retained the bank and generated-charge tally. Imported a disposable
  checkpoint with Quantum Entanglement disabled and completed the two-step
  Quantum reset. The new charge minus earned charge was exactly the new Hot Start
  grant (4063.190669004557 seconds, within floating-point precision), with no
  Afterglow carryover. All seven augments auto-assigned.
- Refunded and reassigned Stellar Memory through the skill dialog. Bank stayed
  106982.46437562504 and Hot Start's grant stayed unchanged. Spent ten minutes
  through the Stored Time confirmation/progress/completion UI: earned charge
  increased, bank stayed fixed, and charge minus earned charge remained the same
  Hot Start grant.
- Visually inspected the final Stellar Memory description and controls at normal
  preview width and 360 × 780. No clipped description or overlapping controls.
  These additional checks are browser interaction evidence, not new native QA.
