# Wave 3 parity layout reference

Status: committed design reference. Approved by the user on 2026-07-29 and
corrected against the canonical Bots baseline on 2026-07-30.

This is the first-slice composition reference required by
[`product-ui-foundation.md`](product-ui-foundation.md). It does not approve the
earlier conversation visualization. It is a relatively one-to-one responsive
port of the current Unity Dyson screen, with only the approved responsive and
accessibility deviations.

## Authority and state

The UI receives immutable backend-owned presentation facts: ordered visible
facilities, `showTinker`, and the next-tier-teaser fact. It renders those facts
as received and never calculates or duplicates their thresholds. A hidden
facility is absent from layout and accessibility tree. When the teaser fact is
present, exactly one generic `????` follows the final revealed facility.

`showTinker` controls whether the Tinker surface exists. Tinker progress,
eligibility, output and repeat state are transient backend facts. There is no
visible or persistent Repeat Tinker control. Tap/click/native activation starts
one cycle; rapid taps are not artificially debounced. Pointer hold or Space
hold requests repeat only after 500 ms and ends it on release; the UI never
awards a completion.

There is no current Auto Tinker skill. Manual Labour restores Tinker and can
change its output under its canonical conditions; it is not automation.
Facility automation upgrades do not automate Tinker.

### Unity visibility contract

Parity authority: `Assets/Scripts/Buildings/BotPanelManager.cs`. Facility-owned
pairs use the Unity order `[automatic, manual]`; `total` means their sum and
`any owned` means `total > 0`. These gates are implemented and tested only in
the backend projection. The UI receives their resulting ordered visibility,
`showTinker` and teaser facts; it must never contain these thresholds.

| Presentation fact | Unity gate |
| --- | --- |
| `Assembly Lines` visible | `bots >= 10` or Assembly Lines any owned |
| `AI Managers` visible | manual Assembly Lines `>= 5` or AI Managers any owned |
| `Servers` visible | manual AI Managers `>= 1` or Servers any owned |
| `Data Centers` visible | total Servers `>= 1` or Data Centers any owned |
| `Planets` visible | total Data Centers `>= 1` or Planets any owned |
| `showTinker` | `(((total Assembly Lines < 10) OR (manual AI Managers < 1)) AND no Data Centers) OR Manual Labour owned` |
| generic `????` teaser, pre-Quantum | visible until Planets are visible |
| generic `????` teaser, post-Quantum | visible until Galactic Brains are visible by the canonical mega visibility rule |

The exact example facts are:

- Fresh: 0 bots and no facilities. It contains Tinker and the one generic
  `????` teaser, but no named facility.
- Assembly revealed: bots >= 10, manual Assembly 0 and no owned managers. It
  contains `Assembly Lines` and the one generic `????` teaser, but no later
  facility.
- Later-progression grid: a distinct schematic only. The backend visibility
  collection includes at least `Assembly Lines` and `AI Managers`; it
  demonstrates row-major grid placement and never implies an absent facility.

Diagram key:

- `T`: Tinker only when `showTinker` is true.
- `????`: generic teaser only when backend-authorized.
- `Production summary`: the lower Unity production lines backed by snapshot
  facts. It fills the available lower region in this slice.
- The entire Bot Distribution region is deferred until its canonical controls
  and player commands are in scope. Read-only percentages are not presented as
  a premature substitute. Unity's separate `Info` card is deferred until its
  active-panel, lifetime and total-decayed facts are projected by the canonical
  snapshot.

## Shared layout and focus

Visual, keyboard and screen-reader order is: navigation only when at least two
destinations are available, the `Bots` route heading, resources, Tinker when
present, facilities in supplied order, optional teaser, then Production
summary. The route heading is visible when Bots is the sole destination and
visually hidden but accessible when multi-destination navigation identifies
the current route. The teaser is not a control and has no focus target. With
only the Bots destination, both the rail and bottom navigation are absent
rather than repeating the current page as a no-op control.

The resource header preserves Unity's hierarchy: `Cash`, `Total Bots`,
`Science`. Facility cards retain count, output, exact previewed cost and
primary purchase action. On narrow cards, action moves below the facts before
text truncates. Tinker is one native button surface with its label, output,
remaining time and progress—never a separate repeat control.

## Compact portrait — 320–599 CSS px

One content column and safe-area padding. Bottom navigation appears only after
a second real destination is available; when present, it does not cover the
final focused action or software keyboard.

```text
Fresh                                  Assembly revealed
+------------------------------+       +------------------------------+
| Bots                         |       | Bots                         |
+------------------------------+       +------------------------------+
| Cash | Total Bots | Science  |       | Cash | Total Bots | Science  |
+------------------------------+       +------------------------------+
| T                            |       | T                            |
+------------------------------+       +------------------------------+
| ????                         |       | Assembly Lines               |
+------------------------------+       +------------------------------+
| Production summary           |       | ????                         |
+------------------------------+       | Production summary           |
                                       +------------------------------+
```

## Medium/tablet — 600–1023 CSS px

Keep the same reading order. Use bottom navigation or compact rail only after a
second real destination is available. The approved Fresh and Assembly-revealed
states have no rail and remain one facility column because neither has two
visible facilities.

```text
Fresh                                  Assembly revealed
+------------------------------------+ +------------------------------------+
| Bots                               | | Bots                               |
+------------------------------------+ +------------------------------------+
| Cash | Total Bots | Science        | | Cash | Total Bots | Science        |
+------------------------------------+ +------------------------------------+
| T                                  | | T                                  |
+------------------------------------+ +------------------------------------+
| ????                               | | Assembly Lines                     |
+------------------------------------+ +------------------------------------+
| Production summary                 | | ????                               |
+------------------------------------+ +------------------------------------+
                                       | Production summary                 |
                                       +------------------------------------+
```

## Wide desktop — 1024 CSS px and above

Directly mirror Unity's broad hierarchy: a visible `Bots` heading while it is
the only destination; top `Cash`, `Total Bots`, `Science`; the Tinker surface;
a two-column row-major facility grid only when backend visibility supplies at
least two cards; one generic teaser after the last revealed card; and the
full-width lower Production summary. A persistent left rail replaces the
visible route-heading treatment only after at least two destinations exist.
Bound content width instead of stretching facility rows into long lines.

```text
Fresh
+--------------------------------------------------------------------------+
| Bots                                                                     |
+--------------------------------------------------------------------------+
| Cash                     Total Bots                         Science       |
+--------------------------------------------------------------------------+
| Tinker surface                                                           |
| ????                                                                     |
+--------------------------------------------------------------------------+
| Production summary                                                       |
+--------------------------------------------------------------------------+

Assembly revealed: bots >= 10, manual Assembly 0, no owned managers
+--------------------------------------------------------------------------+
| Bots                                                                     |
+--------------------------------------------------------------------------+
| Cash                     Total Bots                         Science       |
+--------------------------------------------------------------------------+
| Tinker surface                    | Assembly Lines                        |
|                                   +---------------------------------------+
|                                   | ????                                  |
+--------------------------------------------------------------------------+
| Production summary                                                       |
+--------------------------------------------------------------------------+
```

### Later-progression wide grid schematic

This is not Fresh or Assembly-revealed. It applies only when the backend's
ordered visible collection contains `Assembly Lines` followed by `AI Managers`.

```text
+--------------------------------------------------------------------------+
| Bots                                                                     |
+--------------------------------------------------------------------------+
| Cash                     Total Bots                         Science       |
+--------------------------------------------------------------------------+
| Tinker surface                    | Assembly Lines | AI Managers          |
|                                   +----------------+----------------------+
|                                   | ????                                  |
+--------------------------------------------------------------------------+
| Production summary                                                       |
+--------------------------------------------------------------------------+
```

The grid fills row-major from supplied order. Its final row does not fabricate a
second card. The teaser spans one complete row after the final visible card,
never before it and never once per column.

## Compact landscape — 320–599 CSS px wide

Retain bottom navigation only when at least two destinations exist. Use the
short height to place Tinker beside the first content area only when that
preserves the one-column facility reading order and 44-by-44 CSS-pixel targets;
otherwise use the compact-portrait stack. Never horizontally scroll.

```text
Fresh                                  Assembly revealed
+-----------------------------------+  +-----------------------------------+
| Bots                              |  | Bots                              |
+-----------------------------------+  +-----------------------------------+
| Cash | Total Bots | Science        |  | Cash | Total Bots | Science        |
+-------------------+---------------+  +-------------------+---------------+
| Tinker                            |  | Tinker            | Assembly Lines|
+-----------------------------------+  +-------------------+---------------+
| ????                              |  | ????                              |
+-----------------------------------+  +-----------------------------------+
| Production summary                |  | Production summary                |
+-----------------------------------+  +-----------------------------------+
```

## Reusable component and acceptance notes

Use existing foundation boundaries: resource values, one Tinker button/progress
surface, facility card, navigation and status feedback. Layout components
receive presentation facts; the facility list maps only backend-provided ordered
visible facilities and appends the single backend-authorized teaser.

Wave 3 acceptance for this reference:

- Verify the exact Fresh facts (0 bots/no facilities) and exact
  Assembly-revealed facts (bots >= 10/manual Assembly 0/no owned managers) in
  all four layouts. Fresh has no named facility; Assembly-revealed has only
  `Assembly Lines` plus the teaser.
- Verify the separate later-progression grid only with a backend collection
  containing at least `Assembly Lines` and `AI Managers`.
- Verify absent facilities and absent Tinker have neither visual nor
  accessibility-tree placeholders. Verify exactly one `????` follows the last
  revealed facility only when authorized.
- Verify click/tap/native activation starts one cycle, rapid taps are not
  debounced, and pointer/Space hold starts repeat only after 500 ms and ends on
  release, cancellation, lost capture, blur or unmount.
- Verify the existing Wave 3 keyboard, screen-reader, rapid-touch and
  independent multi-touch paths, LTR/RTL, safe areas, 200% zoom and no
  horizontal page scroll. Reduced motion retains text progress feedback.
- Preserve existing performance rules: no component timer advances gameplay, no
  full-tree per-frame render is introduced, and the Wave 3 bundle/report gate
  remains in force.
