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
Elapsed time delayed behind an in-flight update remains accumulated and is
delivered as consecutive configured-size gameplay updates. Sub-update residue
is retained for the next delivery, so scheduler jitter cannot change
automation opportunities or Infinity peak sampling. A foreground gap over 60
seconds is credited to Offline Time instead of executing unbounded active
catch-up updates. Catch-up processing yields after a bounded burst of updates
so a shorter foreground stall cannot monopolize the main thread.

Player commands are admitted against the last completed gameplay update.
Pending sub-update elapsed time stays queued for the next configured update;
a click or settings change never manufactures a fractional gameplay step.
Changing the interval applies the new cadence to all retained residue before
foreground processing restarts. When lifecycle or persistence must settle the
foreground clock, complete configured updates retain ordinary automation
semantics and only the final sub-update residue advances with automation
suppressed. That residue still uses the canonical bot-cap continuation: any
required checkpoint is persisted and the exact remaining tail resumes before
the lifecycle save is admitted.

Break Infinity guidance separates manual calibration from realized automatic
throughput. With Auto Infinity off, active updates sample projected IP/min and
track the best reward in the current manual run. Rates within two percent are
one throughput plateau and prefer the lower reward. A manual reset persists
that peak as the recommendation; enabling automation also captures the valid
manual peak already in progress after at least one second of active manual
observation. Disabling automation clears the active peak and starts that
deterministic observation window, so a partial post-reset update cannot replace
a completed recommendation. Automatic resets cannot clear or recalibrate it.
With Auto Infinity on, Current is the time-weighted reward/duration rate of up
to ten recent completed automatic Break cycles from active play at the current
target and processing cadence; Stored Time and other cadences remain in
Statistics but cannot contaminate Current. Recommended is the last manual
calibration. Both lines remain visible in the expanded settings and
their presentation updates at most every 250 ms without changing simulation
cadence. Stored Time never alters the manual calibration. The automatic-target
warning compares against that manual recommendation. Changing the configured
active interval invalidates both the active and persisted calibration. Each
actual Auto Infinity toggle starts a new automatic-throughput session, clearing
the separate Current sample history while leaving the manual recommendation
untouched. Purchasing permanent Double Time invalidates the current manual
calibration and automatic-throughput session because it changes the amount of
game time represented by every configured active update.

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

Stored Time capacity starts at one day. A full bank may be consumed to double
capacity, with no authored gameplay maximum. Every finite capacity is preserved
across checkpoint, export, import and reload. Arithmetic overflow saturates only
at JavaScript's largest finite number so persisted state never contains
infinity.

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

The processing and completion dialog inherits the Offline Time route palette
and remains open through the commit handoff. Completion is dismissed by the
player and is derived from the committed before/after states: it always shows
the simulated duration, remaining bank, selected accuracy, and actual number
of gameplay updates. If Speed Up reduced the remaining update budget, the
summary says so rather than presenting the original preset as unchanged;
conditionally it
shows tracked IP, Infinity, Simulation and Reality gains. Net facility and bot
gains are shown only when no Infinity occurred, because reset and
rebuild activity makes a start-to-end facility delta misleading. Per-Infinity
Offline Time usage belongs to Statistics rather than the spending screen.

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
