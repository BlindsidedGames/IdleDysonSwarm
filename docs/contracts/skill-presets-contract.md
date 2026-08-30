# Skill preset contract

This contract defines the current product behavior for Skill presets, live
Skill ownership, automatic assignment, preset switching, and retained
unrefundable Skills. Presets are player-owned durable state. A command must not
silently rewrite a preset other than the one the player explicitly edits.

## State model

Each of the five Skill presets is an independent saved **desired layout**. A
desired layout records the ordered Skills the player wants automatically
assigned, including Skills that are currently locked or unaffordable. Live
Skill ownership after a preset rebuild is the portion of that desired layout
that the current unlocks, available Skill Points, exclusivity rules, and
retained Skills allow the game to apply. Between rebuilds, the player may edit
desired membership without purchasing or refunding, so a refundable Skill may
temporarily remain owned after it has been removed from the selected preset.
That explicit queue-only edit is not preset drift.

The selected preset's desired layout and the live automatic-assignment queue
stay synchronized immediately. Reselecting a preset or restarting the game is
never required to publish or persist an edit. The other four presets remain
byte-for-byte unchanged unless the player explicitly edits, imports, or selects
and then edits them.

## Editing and ownership

- Assigning a Skill adds that Skill and its required dependency closure to live
  ownership, the live automatic-assignment queue, and the selected preset only.
- Unassigning a Skill refunds the canonical affected ownership closure and
  removes that Skill and its dependent closure from the live queue and the
  selected preset only. It never removes them from another preset.
- The `Included in <preset>` control edits the selected preset's desired layout
  and matching live queue without purchasing or refunding a Skill. This allows
  locked and currently unaffordable Skills to be planned safely.
- `Reset Skills` refunds every currently refundable Skill, clears the selected
  preset's desired layout and matching live queue, and retains the canonical
  unrefundable overlay. It never clears or rewrites another preset.
- Renaming, recolouring, changing distribution, importing, or otherwise
  managing a named preset changes only the explicitly targeted preset. Importing
  into the selected preset may apply that imported layout; importing into any
  other preset cannot change live ownership or the selected preset.
- Dependency and exclusivity consequences are previewed before confirmation.
  The resulting state must never be inferred by the UI independently of the
  canonical transaction.

## Switching with unrefundable Skills

Switching presets remains available even when currently owned Skills cannot be
refunded. Preset activation follows this order:

1. Preflight the complete transition, including refundable ownership,
   intrinsically or dynamically unrefundable ownership, available points,
   unlocks, dependencies, and exclusivities.
2. Refund the currently refundable Skills.
3. Retain every currently unrefundable owned Skill as a temporary global
   overlay for the current progression state.
4. Select the target preset without rewriting either the source or target
   stored layout.
5. Apply as much of the target desired layout as the resulting state permits,
   in stable dependency-safe order.

The effective live layout is the retained unrefundable overlay plus the
selected preset's desired layout. Retained Skills do not become stored members
of every preset. A target Skill blocked by retained ownership remains in its
preset and is reported as `Blocked by retained <skill>` rather than being
silently removed. Locked and unaffordable target Skills likewise remain queued.

If retained ownership prevents the target layout from being applied completely,
the switch preview names the retained and blocked Skills and offers `Switch
anyway` and `Cancel`. `Switch anyway` applies every compatible part of the
target; the presence of retained Skills must not make preset switching
unavailable.

Reselecting the current preset is an explicit rebuild of its already stored
desired layout. It may refund and reapply compatible ownership, but it cannot
copy live state back into the preset or otherwise perform hidden
synchronization.

A player-configured Bots or Research tab preset override is prior consent to
switch. Automatic tab entry therefore applies the compatible portion without a
blocking confirmation dialog and surfaces a non-blocking retained/blocked
result. It uses the same canonical preflight and execution transaction as a
manual `Switch anyway`; it cannot silently discard or rewrite target entries.

When a higher reset legitimately clears the retained ownership, the selected
preset remains unchanged and its previously blocked desired Skills become
eligible for normal automatic assignment. Intrinsic and dynamic
unrefundability use the same switching rule for as long as the canonical
refund transaction says the Skill cannot be removed.

## Persistence and presentation

Save, export, import, reload, and host lifecycle transitions preserve all five
independent desired layouts, the selected preset, and the canonical live queue.
Reload may reconstruct the retained overlay deterministically from canonical
ownership, but it cannot use startup as an implicit preset-editing or repair
step.

Saves written before this contract may contain a live queue that is newer than
the selected preset because earlier assignment updated only the live queue. A
single versioned compatibility migration treats that live queue as the most
recent current-preset intent and copies it into the selected preset only. It
must not touch the other four presets, alter ownership, select a different
preset, or run again after the save has been migrated. This bounded migration
is the sole permitted startup reconciliation.

Preset presentation distinguishes stored intent from current application. At a
minimum it exposes the selected preset, queued preset Skills, retained Skills,
and Skills blocked by retained ownership. A partially applied preset must not
be presented as completely active, and no delayed UI refresh may conceal a
canonical preset mutation. The exact canonical application result is published
as transient runtime feedback, survives navigation from Bots or Research into
Skills, and remains available until the player dismisses it or a later preset
application replaces it. This feedback is not persisted into the save.
Players may disable these post-application notification panels through a
device-local presentation preference. Disabling them does not bypass retained
conflict confirmations or change preset application behavior.

On Bots, an automatic partial application uses a top-of-route banner with the
preset name, retained count, blocked count, and Skills call to action visually
emphasized. The banner has a six-second progress track, fades automatically,
and may be dismissed by tapping it. On Skills, the exact result uses the
standard dimmed modal treatment and lists only the target preset Skills that
remain blocked and queued. The player may close it with the standard close
control, Escape, or a pointer press on the backdrop.

## Verification requirements

Characterization and regression coverage must include:

- assignment and unassignment while each of two distinct presets is selected;
- dependency cascades without mutation of the other four presets;
- intrinsic and dynamically unrefundable retained overlays;
- compatible and conflicting preset switches, including `Switch anyway`;
- explicit same-preset rebuild and automatic tab-driven partial application;
- locked, unaffordable, and retained-blocked desired Skills;
- `Reset Skills` clearing only the selected desired layout;
- migration of a legacy live-queue/selected-preset mismatch without changing
  the other four presets;
- Infinity and higher-reset reapplication; and
- checkpoint, reload, export/import, browser, and representative native-host
  persistence.
