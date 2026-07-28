# Frontend readiness gate

The removed Bot-tab slice proved that the TypeScript simulation can drive a
browser interface. It did not establish a product, interaction, design or
performance baseline and must not be used as one.

No replacement product frontend should begin until the following contracts are
written, reviewed and approved.

## Product contract

- Target platforms and input methods.
- Information architecture and dependency-ordered screen map.
- Required first playable journey and progression boundary.
- Save loading, offline progress, recovery and error behavior.
- Accessibility and responsive acceptance criteria.

## Design and interaction contract

- Visual tokens for typography, spacing, color, elevation and shape.
- Component states and ownership boundaries.
- Navigation, overlays, focus management and keyboard/controller behavior.
- Presentation rules for large numbers, rates, timers and progress.
- Loading, empty, locked, warning and failure states.

## Technical contract

- Framework and rendering architecture selected against the product needs.
- Separation between canonical simulation state and presentation state.
- Command, snapshot and persistence boundaries.
- Test strategy for unit, integration, visual and end-to-end coverage.
- Browser and device support matrix.

## Performance contract

- Representative desktop and mobile device tiers.
- Frame-time, input-latency, memory and bundle-size budgets.
- Canonical simulation cadence and snapshot/coalescing rules.
- Repeatable measurement scenes, durations and tooling.
- Regression thresholds and the required evidence for exceptions.

The existing event-time simulation and performance work is accepted as complete
for the current port stage. Do not resume discretionary performance tuning until
the full gameplay port is complete. Correctness failures and measured
regressions are exceptions.

## Prototype policy

Future experiments must be labelled disposable, isolated from production
architecture and prevented from silently defining product conventions. A
prototype becomes a baseline only through an explicit review decision.
