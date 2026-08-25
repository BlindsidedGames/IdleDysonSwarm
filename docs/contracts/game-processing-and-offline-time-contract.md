# Game processing and Offline Time contract

IDS uses one authoritative gameplay update for active play and manually spent
Offline Time. This adapts Antimatter Dimensions' bounded coarse-replay model to
IDS mechanics; it does not import AD progression, upgrades or balance rules.

## Shared update

Each update receives base elapsed seconds and a source. Permanent Double Time
ownership converts base time to 2x game time. Gameplay systems use game time;
UI, input, lifecycle, persistence, worker budgets and the Infinity throughput
clock use base time.

At one update boundary the engine may perform one automation decision, one
automatic Dream reset and at most one automatic Infinity. Continuous
production then advances for the update's game time. Manual commands remain
immediate revision-checked boundaries. Tinker is intentionally active-only and
frozen during Stored Time.

Active play uses the saved 33-200 ms delivery interval, defaulting to 33 ms.
Elapsed time delayed behind an in-flight update is coalesced into the next
delivered update, so automation occurs once per delivered loop. A foreground
gap over 60 seconds is credited to Offline Time instead of executing an
unbounded active update.

Ordinary active updates use the writer lease's local epoch/deadline signal at
admission and do not inspect IndexedDB on every update. Once admitted, an
update is not rejected after mutating memory; a later ownership-loss signal
discards the old graph. Bot-cap boundaries dynamically escalate inside the
update to the repository's commit-first, database-fenced persistence path.
Failed bot-cap persistence leaves an explicit continuation rather than
silently treating the update as durable.

## Stored Time

Away time fills a bank and never starts simulation automatically. The player
chooses an amount and confirms before processing begins. Fast, Balanced and
Accurate select total update budgets of 5,000, 100,000 and 1,000,000. Replay
uses nominal 50 ms updates until the selected total budget would be exceeded;
then all remaining time is redistributed across the remaining updates.

Every coarse update calls the same gameplay transition and sees all permanent
state changes from the preceding update. Automation is offered once per coarse
update; skipped fine-grained automation is not reconstructed and no IP
compensation is awarded. The player-facing consequence is: "Simulation becomes
less accurate at larger time steps."

Speed Up halves only the remaining update count, never below 500, and
redistributes all remaining elapsed time. Time is conserved while accuracy is
reduced. There is no Skip action.

The entire replay operates on one detached candidate under one total update
budget. Bot-cap transitions settle inside that candidate before the update's
ordinary automation. Cancellation or any failure returns no candidate. A
successful result deducts the consumed bank and becomes visible only after one
verified commit.

## Compatibility and acceptance

Existing saves retain Double Time ownership. On first migration, any legacy
Double Time bank is transferred into Offline Time up to current capacity, then
legacy enabled/rate/bank values are cleared; a marker makes this idempotent.
Exports during processing use the frozen pre-job save. Confirmed import/reset
cancels and discards the job before replacing state.

Acceptance requires deterministic results for identical state, elapsed time,
settings and delivered-boundary sequence; exact bank conservation; no more
than one automation/reset opportunity per update; persistent gains affecting
the next update; atomic cancellation/failure; save round-trip and real upgrade
coverage; broad progression/automation/skill scenarios; desktop benchmarks;
and final browser plus Android device validation. Performance acceptance
covers both ordinary active updates and an active bot-cap persistence boundary
so the dynamically durable path remains visible.
