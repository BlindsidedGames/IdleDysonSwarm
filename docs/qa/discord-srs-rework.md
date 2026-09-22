# Discord fixes and SRS rework — 22 September 2026

## Changes

- Tinker input no longer suspends/restarts the active-time delivery clock on every
  click. Commands still enter the serialized lifecycle lane with session/revision
  checks. Frequent input previously postponed ticks, then replayed accumulated
  time in a burst when input stopped.
- Stellar Memory costs 5 SP. While assigned, it multiplies other SRS augment
  benefits by `1 + 0.25 × log10(max(1, banked seconds))`. Infinity and Quantum bank
  the full ending charge only while assigned; new deposits apply next run.
  Challenge restarts do not deposit. Existing tracked lifetime seconds become the
  initial bank without inventing historical charge.
- Hot Start scales its 30-minute grant and tops up only the missing difference
  when Stellar Memory is assigned later. Its grant accounting persists across
  save/reload and refund/reassignment of Stellar Memory. Hot Start is now
  non-refundable; Banking is refundable in both live and reset assignment paths.
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
- **Black-hole reward:** verified the current rendered reward lacks a plus sign.
  Proposed `+X` beside the Strange Matter symbol, with an accessible gain label.
  Implementation remains pending Matthew's approval.
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

While assigned, multiply the benefits of other SRS augments by 1 + 0.25 × log10(banked seconds), with a minimum of 1×. Bank all ending SRS charge on Infinity or Quantum Leap while assigned. Includes starting and retained charge. The bank survives resets; new deposits benefit the next run.

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
