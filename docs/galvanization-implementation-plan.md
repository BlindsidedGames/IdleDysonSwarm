# Galvanization and preset priority

Authorized after baseline checkpoint `825a1b07` on 6 September 2026.

## Agreed behavior

- Any revealed base skill can be galvanized whether currently owned or not.
  A Galvanizer must never reveal gated Quantum skills.
- One Galvanizer per base skill; each skill can be galvanized once. Spending
  is irreversible. Return any ordinary points already invested in that skill.
- The base skill becomes permanently active without ordinary points, survives
  resets, and satisfies prerequisites without purchasing its ancestors.
- Remove numerical downsides and exclusions. Audit unusual resource-consuming,
  conditional and structural tradeoffs and present concrete cases to the user
  before implementing ambiguous overrides.
- Blank Slate remains replayable. Permanent galvanized bases stay active;
  ordinary allocation is blocked and optional subskills are cleared on entry.
  First completion unlocks galvanization. Timed achievements are future scope.
- Initially only Cash & Science receives subskills: +5 seconds panel lifetime;
  each actual decayed panel credits 10 instead of 1; panels produce 2x Cash and
  Science. Each is an independent ordinary one-point purchase. Any combination,
  including all three, is allowed. They follow ordinary refund/reset rules.
- Preset order expresses strict spending priority. Resolve prerequisites first,
  skip owned/galvanized requirements, and wait if the next purchase cannot be
  afforded. Preserve the player's displayed order. Existing editing prevents
  incompatible choices; do not add a speculative repair UI.
- Expose a dedicated priority view from an icon-only up/down arrow on each
  preset. Keep plain position numbers, dragging, arrows and dependent removal;
  show permanent galvanized bases separately below the spending list.

## Delivery sequence

1. Inspect current preset execution, persistence and presentation. Add priority
   ordering and dependency resolution with focused tests and browser QA.
2. Audit skill effects and present unusual downside cases. Establish explicit
   permanent-effect rules with user input where needed.
3. Implement galvanization storage/migration, transactional irreversible spending,
   permanent ownership and prerequisite boundaries, refunds, resets and presets.
4. Implement the three Cash & Science subskills and their independent allocation,
   production effects, save state and priority support.
5. Integrate user-approved galvanized-node presentation and update localized
   descriptions/help including Blank Slate. Match existing game surfaces.
6. Verify combined save/reload/reset/challenge/preset behavior, production and
   Stored Time consistency, full tests/build/lint/data/parity/localization gates,
   and actual responsive UI. Report exact validation and remaining limitations.

## Approved presentation

Optional subskills are named Augments. Their assigned/available count replaces
the cost badge on galvanized bases that have them, with a Galvanizer icon on
the left. The approved fractured background sits inside the skill tile and preserves
existing node artwork and the owned palette. Only the lines slowly fade between
dark and light using CSS opacity, with a static reduced-motion alternative.
Non-refundable priority entries
use red icons, with no red row background. Subskills appear in existing skill
details with separate preset checkboxes, plain Assign/Refund buttons and an
explicit one-point cost. The priority view has one top-left Back button and
no close X. Preset priority and management icon buttons have 44px minimum
touch targets.

Implementation authorization does not include merging or releasing.

Implementation and extensive local verification are complete in this worktree;
see `galvanization-qa-2026-09-06.md` for the checkpoint, QA fixes, 1,407 passing
tests and remaining native/release scope.

## Confirmed implementation decisions

- UX: preserve node artwork, use a fractured background; subskills in details.
- Stellar Sacrifices: produce planets without consuming or requiring Bots.
- Stellar Dominance: remove extra sacrifice cost and Cash penalty.
- Stellar Obliteration: remove Cash and Science penalty.
- Supernova: retain all manual-purchase bonuses.
- Shoulders of Precursors: multiply existing Cash multiplier by Science multiplier.
- Keep normal scaling/activation conditions and reset skill timers each run.
  This includes Androids, Pocket Androids, Super Radiant Scattering, Avocados,
  allocation-dependent bonuses, and other normal scaling mechanics.
