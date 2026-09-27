# Discord follow-ups: skill warning and speedrun timing

Scope: the three approved follow-ups on `transcendence-tiers`. No release,
deployment or merge is part of this change.

## Behaviour

- A device-local first-time confirmation explains that non-refundable skills
  also lock their prerequisite paths until Infinity or Quantum. Cancellation
  spends nothing. Confirmation is remembered across reloads. Manual assignment,
  preset application/import, explicit tab-preset configuration and enabling
  non-refundable assignment share the same acknowledgement. Previously enabled
  passive goal/reset/tab automation retains its saved opt-in; it does not pause
  simulation to request a new device acknowledgement.
- New complete speedrun histories use active playtime plus Stored Time actually
  consumed. The bank's unused balance and offline absence do not count. Game
  acceleration is excluded from the consumed-time counter, matching active time.
  The overview shows active, spent and combined totals separately.
- Milestones freeze both counters and assistance flags. Historical records keep
  their existing time and are identified by their previous timing basis. Missing
  historical spending is unknown, never reconstructed from the remaining bank.
  Unboosted precedence remains; within the same assistance class complete
  combined records supersede historical clocks before comparing times.
- First Transcendence records only a successful reset, not reaching the Bot cap
  or obtaining points. Older completed Transcendences receive no invented time or
  usage snapshot. Personal-best reset, clear, export/import and Cloud checkpoint
  rules continue to use the shared milestone model.
- English, all seven translations and both pseudolocales include the new copy
  and concise 4.1.10 patch-note updates.

## Interaction and visual QA

Used disposable saves on isolated origin `http://127.0.0.1:58347/play/`, separate
from Matthew's preview/save. Fixture setup used canonical save serialization;
the actions below used the normal game controls.

- Assigned Shoulders of Giants with its prerequisite path. Cancel/Escape kept
  the original points and returned focus; confirmation assigned the path once.
  Reloading retained acknowledgement and a subsequent locked purchase did not
  repeat the warning.
- Configured Bots' tab preset with non-refundable auto-assignment already enabled
  and no device acknowledgement. Cancelling kept the selector Off and 101 SP;
  confirming applied the preset once and left 91 SP. This query uses current
  canonical ownership even when the Skills screen has not been opened.
  Final Escape/cancel recheck restored focus to that selector without false
  error feedback, at 360px/130% text.
- Inspected the warning at desktop and 360px width with 130% game text, in English
  and German. Existing dialog palette, spacing and buttons remained readable.
- Spent one minute of Stored Time. This exposed floating-point dust displaying
  59 seconds; fixed accumulation at whole-second boundaries and retested the
  control showing exactly 1m 0s. Combined time increases by the consumed minute.
- Completed Transcendence through Avocato's confirmation. Current and best
  recorded 3m 48s. Spending Stored Time afterwards left that time and its unused
  Stored Time flag frozen. Reload retained the result and spent-time counter.
- Cleared the new milestone's best, reloaded, and confirmed it stayed cleared
  while the current-run milestone remained. The unusable clear button vanished.
- Exported and imported through Settings. The exported payload included timing
  counters/snapshots and excluded personal bests. Import retained the recipient's
  bests and marked the run ineligible. Reset Save restored eligibility and zero
  spent time while retaining bests.
- Inspected Statistics at desktop and 360px/130% text, scrolled through the new
  milestone and legend, and confirmed no horizontal overflow or visible route
  scrollbar. Statistics subtab memory survived reload and Reset Save.

Screenshots are under ignored `output/qa/discord-followups/`: `warning-desktop.png`,
`warning-360-text130.png`, `warning-de-360-text130.png`,
`statistics-after-reset-reload.png`, `statistics-360-text130.png`, and
`transcendence-360-text130.png`. The final tab configuration warning is captured
in `tab-preset-warning-360-text130.png`. Temporary viewport/text overrides were
reset, disposable browser/server closed, and fixture files removed from public
assets before the production build.

## Review and automated coverage

Focused regressions cover counter accumulation, accelerated Stored Time,
milestone snapshot order, old-history handling, timing comparison, validation,
commit failure/retry and warning cancellation/acknowledgement/assignment paths.
Independent maintainability and bug review identified an explicit tab-preset
warning bypass and false error feedback on cancellation. Both were fixed and
re-reviewed; no known actionable findings remain. Final full suite: 191 files,
2,023 passing tests. TypeScript/production build, lint, localization extraction,
translation coverage/compilation, data validation, first-Dyson parity, Electron
entrypoint syntax and diff whitespace checks pass. Vite retains the existing
large-chunk advisory; no new dependency or persistence service was added.

## Limits

This pass provides browser interaction evidence and canonical checkpoint tests.
iOS, Android, packaged Steam, Windows/Linux and cross-device Cloud were not
interactively retested. No store submission or deployed build changed.
