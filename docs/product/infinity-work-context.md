# Infinity controls and reset guidance

Status: Phase One panel work is merged. Phase Two behavior is implemented on
`codex/infinity-phase-two` and awaits final review and pull-request integration.

## Product behavior

- Infinity Points remain in the route header.
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

The Infinity panel displays:

- current projected IP/min, calculated as projected reward divided by elapsed
  current-cycle minutes; and
- the best IP/min observed in that cycle plus the reward available at that
  point.

The opening instant and a zero reward report zero rather than an infinite rate.
The peak is persisted for reload continuity, is updated by active and Stored
Time simulation through the same event model, and resets at Infinity and
Quantum boundaries. It is run-local guidance only: it never changes rewards,
the configured target, or the Auto Infinity preference.

## Compatibility and validation contract

- Existing automation preferences remain unchanged when loading an existing
  save; deterministic new-game creation explicitly starts with automation off.
- The canonical target range remains 1 through 2,147,483,647 IP.
- Target parsing never passes exact input through a floating-point conversion.
- Manual and automatic reset eligibility are separate simulation-authority
  paths, including the finite bot-cap checkpoint.
- Browser verification covers narrow phone and desktop layouts, exact input,
  invalid input, target persistence, peak persistence, and manual reward text.
- Automated coverage includes mapping round-trips, Stored Time, reset
  boundaries, target parsing, frontend projection, and control accessibility.

## Follow-up boundary

The Double Infinity Points purchase toggle remains a separate entitlement and
effect preference. Future tuning of rate sampling or visual density must not
couple it to reset automation or silently rewrite a player's exact target.
