# Offline-time loss investigation — 11 September 2026

## Finding

Confirmed on an Android emulator: abruptly stopping the active application, without a completed departure callback, loses the elapsed offline interval on cold launch. Ordinary background/resume and cold launch after a completed background save both credited time. This is a reproducible defect, but the affected players' exact closing sequence and saves are unavailable, so it is not yet proven to explain every report.

The subsequently approved shared-code fix is implemented locally and verified below. It has not been released.

## Player evidence

- Fresh EveBot refresh completed at 2026-09-11T04:02:09.402Z, run `b40a851a-4d67-41a4-aa9f-d6c81b7deea8`. All five configured channels succeeded; local feed counts and SHA-256 checksums matched the manifest. Threads were not included.
- Discord report `1546669483794632755`, 7 September: daily returns produced about 20 seconds after upgrading capacity. Follow-up `1547800928990793790`, 11 September: a full day away produced only minutes. Its screenshot shows Android 4.1.7, build 2026090503, with 3m 9s banked and a nearly empty bar. Follow-up `1547801301780402177` repeats the capacity-upgrade clue.
- Google Play Console's reviews and testing feedback were inspected. The matching review found by searching “offline” was dated 29 June 2026 on 3.0.324, Sony Xperia 10 VI / Android 15. It reports time not adding up alongside an old spending bug. That review predates the current implementation and is not evidence that the same cause applies. The newest public offline-related reviews concerned the spending UI, rather than missing accrual. No current private testing report was found on the latest feedback page.
- The user does not know whether affected players force-close or leave the app backgrounded. No player save was obtained or modified. Private exports and screenshots remain outside the repository.

## Android reproduction

Used the existing `ids-steam-regression` Android 15 emulator and the local 4.1.7-debug APK, build 2026090503. Inspected the real persisted native save after each operation; capacity was 86,400 seconds and nowhere near full. Emulator app data was backed up before testing and restored afterward; the original save was verified byte-for-byte.

| Sequence | Bank before | Bank after | Result |
| --- | ---: | ---: | --- |
| Home/background, then resume | 62.087 s | 80.610 s | Credited 18.523 s; departure was saved at 04:06:23.705 UTC. |
| Force-stop while active at approximately 04:06:49 UTC; relaunch at 04:07:09 UTC | 80.610 s | 80.610 s | Lost roughly 20 seconds. Persisted `dateQuitString` remained null. |
| Home/background, wait for departure save, then force-stop and cold launch | 80.610 s | 91.844 s | Credited 11.234 s from saved departure 04:07:49.380 UTC. |

`adb am force-stop` deliberately exercises an abrupt-stop path. It is not equivalent to every swipe-away, normal app switch, or OS background kill. A process killed after its departure save succeeds is covered by the third case and worked.

## Cause and limits

The Android plugin emits lifecycle phases in `handleOnPause`, `handleOnStop`, and `handleOnResume`, but does not persist a native departure timestamp. The renderer records a best-effort localStorage marker when it receives a non-active phase, then queues the canonical save. Both depend on lifecycle delivery before the process stops.

`CanonicalLifecycleCoordinator.replayAwayTime` selects the persisted quit timestamp or pending departure marker. `resolveAwayTime` explicitly grants zero when neither exists (`src/simulation/timeResources.ts`, missing-quit branch). Active saves normally contain a null quit timestamp after the preceding return has consumed it. There is no persisted active checkpoint timestamp used as a cold-start fallback. Consequently, an abrupt stop without departure delivery has no usable baseline, regardless of how long the player stays away.

Delayed JavaScript callback delivery is another plausible risk because receipt-time sampling happens in the renderer, but it was not reproduced in this investigation. Do not claim it as the cause of the reports without further evidence.

Capacity upgrades intentionally spend the previous bank. Direct current-code probes upgrading 1→2, 2→4, and 128→256 days each credited a subsequent 86,400-second absence correctly. The upgrade itself did not reproduce the lost-accrual symptom.

## Implemented repair

The user approved the smaller shared-code fix. Production persistence captures
`idsLastActiveAtUtc` with the save. Read-only exports do not sample a new clock.
Cold startup uses this checkpoint only when the normal departure timestamp is
missing. The credited bank and new baseline are committed atomically. Normal
focus events cannot consume the checkpoint as another away interval.

An unconsumed startup baseline survives save failures and later departure markers.
Manual imports clear the source device's baseline. Legacy saves without metadata
retain their existing behavior until their first new persistence commit. Reversed
clocks grant zero using the existing integrity behavior. Capacity limits and
Idle Electric Sheep remain governed by the existing shared grant calculation.

The clock is supplied by the shared production application factory. Pure canonical
fixtures do not acquire a wall-clock dependency. No Android/iOS lifecycle plugin
changes are required for this fix. Both platforms receive it in builds containing
these shared source changes; iOS hardware verification was not performed here.

## Fixed-build Android verification

Built and installed local 4.1.8-debug (`2026091002`) on the Android emulator. A real
autosave contained `idsLastActiveAtUtc = 2026-09-11T04:25:53.600Z`, a null quit
timestamp, and 62.087 seconds banked. Force-stopped the active app at about
04:26:21 UTC and relaunched at 04:26:46 UTC. The persisted bank became 115.863
seconds: 53.776 seconds recovered from the durable checkpoint. The persisted
baseline advanced to 04:26:47.627 UTC in that same credited save. Recovery includes
the unsaved interval since the checkpoint, consistent with restoring that saved
state. This is the formerly failing missing-departure path.

## Validation

- `npx vitest run src/simulation/lifecycleAwayTime.test.ts src/platform/nativeHostBridge.test.ts`: 34 tests passed.
- The existing pure lifecycle suite currently expects no grant when the quit timestamp is missing; passing it does not repair the cold-start hole.
- Direct capacity-upgrade/day-away probes passed at all three capacities above.
- Android native save inspection supplied the three reproduction results above.

### Fix validation

- Full suite: 141 files, 1,498 tests passed.
- Final focused recovery/Stored Time integration rerun: 26 tests passed after
  strengthening retries against a newer departure marker.
- New regression cases cover a day away at upgraded capacity, repeated launch,
  duplicate active events, normal departure precedence, failed persistence/retry,
  imports, legacy or invalid metadata, and clock reversal. Test persistence
  round-trips the real compressed save format.
- Type checks, lint, web build and native bundle build passed. Android debug APK
  assembled successfully. Existing bundle-size advisory remains.
- Emulator data is restored after QA. No TestFlight, Play Store, or web release
  was performed; all source changes remain local.
