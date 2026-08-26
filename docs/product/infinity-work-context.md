# Infinity controls and reset guidance

Status: Phase One and Phase Two are merged on `main` through PR #119. This
document records the shipped behavior and its compatibility boundaries.

## Merged baseline

- The shared progress-and-controls panel and its cross-tab visual treatment are
  merged for Bots, Research, Infinity, Skills, Simulations, and Quantum.
- Infinity Points remain in the Infinity route header.
- The Store-owned Double Infinity Points entitlement toggle is merged and
  remains independent from reset automation.
- Compact bottom-navigation work is complete and no longer blocks Infinity
  development.

## Infinity behavior

- Ordinary Infinity reaches a ready state instead of forcing a reset when Auto
  Infinity is off.
- Auto Infinity is available before Break The Loop, defaults off for a new
  game, and persists independently from the Store-owned Double Infinity Points
  effect.
- The manual Infinity action remains available whenever a manual run is
  eligible. In Break Infinity it displays the currently available reward and
  does not require the configured automatic target.
- Break Infinity uses an exact numeric target rather than a slider. The field
  accepts exact integers, grouped digits, scientific notation, and the common
  game suffixes. Invalid input never overwrites the saved target.
- Legacy and fresh saves with a missing or zero target normalize to the domain
  minimum of 1 IP. Existing valid slider targets are already stored as exact
  integers and round-trip without conversion loss.

## Run efficiency guidance

The expanded Infinity panel displays:

- with automation off, current projected IP/min and the best IP/min/reward
  observed during the current manual run; and
- with automation on, realized time-weighted IP/min from up to ten recent
  completed, wholly active automatic Break cycles at the current target and
  processing cadence, and the last persisted manual-run recommendation.

The opening instant and a zero reward report zero rather than an infinite rate.
The active peak resets at Infinity and Quantum boundaries. A valid manual peak
is also persisted for reload continuity when the player enables automation
after at least one explicitly accumulated second of active manual observation
or completes a manual reset. Stored Time never advances this observation
clock. Disabling automation starts a fresh observation window. Automatic
resets never replace or clear that manual
calibration. Stored Time does not alter it. Guidance is presentation-only: it
never changes rewards, the configured target, or the Auto Infinity preference,
and displayed values publish at most every 250 ms while gameplay keeps its
configured processing cadence.

The canonical statistics state also retains the ten most recently completed
Infinity runs, newest first. Each entry records whether the reset was ordinary
or Break Infinity, whether it was automatic or manual, the configured target,
the actual quantized reward, and the completed-cycle duration. Statistics shows
every retained run, while its current-target summary considers only automatic
Break Infinity runs recorded at the target currently selected. Infinity's
Current guidance uses a separate bounded history which Stored Time and
unrelated statistics entries cannot evict. Every actual Auto Infinity toggle
clears this separate history, so Current begins unmeasured for each automatic
session without changing the persisted manual recommendation. A cycle becomes
eligible only after an active automatic reset starts it; Stored Time,
target/cadence changes, and a manual-to-automatic handoff invalidate the mixed
cycle. Purchasing permanent Double Time also clears both the throughput session
and manual calibration because each active update begins representing twice as
much game time. The following wholly active cycle is the first one admitted, so
coarse Stored Time and stale cadences cannot distort the foreground rate. The
displayed average is time-weighted (`total reward / total duration`), accompanied
by the median and range of individual run rates. Recent-run durations use three
significant digits so short-cycle timing remains stable and explains small
IP/min changes.

## Compatibility and validation contract

- Existing automation preferences remain unchanged when loading an existing
  save; deterministic new-game creation explicitly starts with automation off.
- The canonical target range remains 1 through 2,147,483,647 IP.
- Target parsing never passes exact input through a floating-point conversion.
- Manual and automatic reset eligibility are separate simulation-authority
  paths, including the finite bot-cap checkpoint.
- Browser verification covers narrow phone and desktop layouts, exact input,
  invalid input, target persistence, peak persistence, manual reward text, and
  recent-run Statistics density.
- Automated coverage includes mapping round-trips, Stored Time, reset
  boundaries, bounded recent-run persistence, target-specific performance
  projection, target parsing, frontend projection, and control accessibility.

## Follow-up boundary

The Double Infinity Points purchase toggle remains a separate entitlement and
effect preference. Future tuning of rate sampling or visual density must not
couple it to reset automation or silently rewrite a player's exact target.
