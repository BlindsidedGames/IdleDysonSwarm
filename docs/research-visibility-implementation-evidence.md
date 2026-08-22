# Device-local Research visibility implementation evidence

## Decision and authority boundaries

The Research purchase/settings panel exposes `Hide completed Research` as a
versioned device-local preference under
`idle-dyson-swarm.research-visibility.v1`. Existing Web installations with no
stored preference continue showing completed Research. The preference is read
once, publishes only on explicit changes, tolerates unavailable/corrupt/future
storage, and never enters canonical gameplay state.

Canonical Research presentation now reports `visible` from authored unlock and
prerequisite state independently of `maxed`. The React boundary applies the
device preference only after that projection and filters only cards whose
canonical `maxed` fact is true. Purchase eligibility, costs, prerequisites,
automation targets, levels, progress, settings, and presets remain canonical.
Automation settings continue to use the canonical visible set rather than the
filtered card list.

If a focused purchase disappears after reaching its cap, focus moves to the
next available purchase. If no displayed card remains, focus moves to the
explicit status message: `All currently available Research is completed and
hidden.` The ordinary no-unlocked-Research state retains its separate message.

## Persistence and migration contract

Portable `IDSWEB1` exports remove legacy `hidePurchased` data. Manual/shared
imports do not call the device-preference adopter and therefore cannot change
the receiving installation. After a successful automatic Unity migration
commit, and only when native provenance identity matches the repository
candidate and read-only Unity bridge path, a device with no established value
may adopt a legacy boolean once. Invalid values, failed commits, browser
retained imports, unprovenanced candidates, and identity/path mismatches do not
write the preference.

## Infinity validation

Canonical Infinity reset ownership remains in `applyCanonicalInfinityReset`;
no duplicate reset assignments or automation suppression were added. Full-path
regressions cover ordinary Infinity and Break Infinity from populated Research
levels/progress through immediate reset, runtime-session checkpoint, and
reopen. Both maps are empty at every boundary, while Research buy mode,
rounded-bulk choice, per-item automation, Skill presets, Research preset
automation, and the external hide preference remain intact.

The reset transaction itself does not run Research automation. A funded later
automation tick may legitimately repurchase enabled Research. One-time maxed
Research becomes canonically visible and unmaxed immediately after reset, so a
hidden completed card is displayed again until repurchased. Invalid reset
requests retain the complete source state unchanged.

## Automated validation

Focused coverage includes device storage/default/reload behavior, trusted and
rejected migration provenance, portable-export isolation, canonical
unlock/maxed separation, UI filtering and empty-state copy, keyboard focus
handoff, accessibility, ordinary and Break Infinity checkpoint/reopen, reset
rejection immutability, and subsequent-tick automation repurchase. The release
gate also runs the full Vitest suite, lint, TypeScript/production build,
localization catalog verification, data checks, and `git diff --check`.
