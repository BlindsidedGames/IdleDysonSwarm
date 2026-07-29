# Product UI foundation

Status: proposed for product approval. This document does not authorize product
UI implementation. The frontend readiness gate remains closed until the
approval checklist at the end is accepted or amended.

## Decision basis

This contract is based on:

- the current Unity portrait and landscape captures under `Recordings/`;
- `Assets/Resources/DefaultUITheme.asset`, the Lexend font family under
  `Assets/Fonts/Fonts/`, and the current scene/prefab information hierarchy;
- the presentation-neutral boundary in `frontendSnapshot.ts`;
- the exhaustive player-intent union in `canonicalPlayerCommands.ts`; and
- the serialized active-time, command, persistence and platform lifecycle lane
  in `canonicalLifecycleCoordinator.ts`.

The removed Bot-tab prototype and the developer save diagnostic are not product
references.

## Product standard

### Port intent

The replacement is a relatively one-to-one port of the current Unity game:

- Preserve observable gameplay, progression order, terminology, unlock
  conditions, resource prominence and the broad screen hierarchy.
- Preserve the recognizable visual identity: Lexend typography, dark
  plum/charcoal surfaces, orange numeric emphasis, cyan highlights and
  era-specific colors.
- Preserve information density where it helps comparison, especially facility,
  research, skill and prestige lists.
- Do not reproduce accidental Unity limitations such as fixed-pixel layouts,
  mouse-only interactions, low-contrast text, clipped content or modal focus
  leaks.
- A deliberate gameplay, economy, content or navigation change requires its own
  product decision and backend contract change. It is not a UI cleanup.

This is behavioral and structural parity, not screenshot-level pixel parity.
Responsive reflow, semantic markup, accessible hit targets and contrast
corrections are required deviations.

### Target surfaces and inputs

The product frontend is one React application hosted by:

- Electron for Windows, Linux and macOS;
- Capacitor for iOS and Android; and
- a browser build for development, review and manual save recovery only.

A browser-only release cannot promise seamless migration from the Unity save.
Desktop and mobile release hosts must satisfy the discovery, signing, retained
container and lifecycle requirements in `platform-port-inventory.md`.

Every product path supports pointer, touch and keyboard. Controller navigation
is a later release gate unless controller support is explicitly promoted into
the first release scope. The DOM and focus model must not prevent a future
controller adapter.

### Information architecture

The Unity hierarchy remains the baseline, introduced by progression rather than
showing empty destinations:

1. Dyson: resources, Tinker, facilities, bot distribution and panel facts.
2. Research.
3. Skills.
4. Infinity and stored/returned time.
5. Dream.
6. Reality and simulations.
7. Quantum.
8. Avocado.
9. Story, wiki, settings and recovery/support surfaces.

On compact screens, primary unlocked destinations use a bottom navigation bar
with an overflow/menu destination. On wide screens, the same destinations use a
persistent side rail. Labels remain visible in both modes; icon-only primary
navigation is not acceptable.

Locked systems are hidden until their canonical reveal condition unless Unity
intentionally previews them. A previewed locked destination explains its
requirement from snapshot data; the UI does not infer unlock rules.

### First playable vertical slice

The first approved implementation slice ends at a small but real early-Dyson
loop:

1. Start through the lifecycle coordinator and render idle, starting, blocked
   and ready application phases.
2. Show the early Dyson resource header and current production facts from the
   frontend snapshot.
3. Let the player start Tinker once, hold to repeat, release to stop repeating,
   and observe backend-authored progress and bot/assembly-line awards.
4. Show the canonically available early basic-facility cards in Unity order,
   including owned counts, production, selected quantity, exact previewed cost,
   eligibility and rejection reason.
5. Dispatch basic-facility purchases and prove that active time, purchases and
   Tinker progress survive the supported checkpoint/reload flow.
6. Reflow the same journey across the compact, medium and wide layouts without a
   second interaction model.

Research, skills, bot distribution controls, prestige systems, settings and
content/reference screens are outside this slice except for disabled or locked
navigation required to explain the current state.

## Architecture standard

### Selected frontend foundation

Keep React 19, TypeScript and Vite. Add libraries only where a demonstrated
requirement cannot be met cleanly by React and platform APIs. The initial
foundation should use:

- semantic React components;
- a small external-store adapter using `useSyncExternalStore`;
- CSS custom properties for tokens and locally scoped component styles; and
- platform ports injected at the application composition root.

Do not introduce a frontend state-management library, component suite or CSS
framework in the foundation slice. This decision can be revisited with measured
component or state complexity.

### Runtime boundary

The product frontend has exactly one gameplay read path and two gameplay write
paths, composed behind one UI-facing runtime adapter:

```text
CanonicalGameApplicationFacade.frontendSnapshot()
  -> immutable UI read model

CanonicalLifecycleCoordinator
  <- dispatchPlayer(): revision-checked player intent
  <- advanceActive(): elapsed active wall time
  <- platform lifecycle phases
```

Platform phase changes also enter the lifecycle coordinator. Internal facade,
simulation, save and domain modules are not UI APIs.

The UI must not:

- import simulation-domain mutators or canonical save records;
- calculate affordability, rewards, production, unlocks, cooldown outcomes,
  reset outcomes or stored/returned-time effects;
- mutate or decorate a canonical snapshot in place;
- dispatch directly to `CanonicalGameApplicationFacade`;
- advance gameplay with a component timer; or
- optimistically alter gameplay resources, ownership or progression.

Formatting, sorting an already ordered presentation collection, responsive
layout, local disclosure state, focus state, animation state and draft settings
are presentation concerns. A presentation derivation must be pure, disposable
and unable to affect a command payload except for an explicit player selection.

### Active-time host

The application shell owns one active-time driver:

- Use a monotonic host clock to accumulate elapsed foreground time.
- `requestAnimationFrame` may schedule delivery, but it is not a gameplay tick
  and no fixed frame duration is assumed.
- Never overlap `advanceActive()` calls. Coalesce elapsed time while one call is
  pending and pass the exact accumulated non-negative milliseconds into the
  next call.
- Stop foreground accumulation before reporting background, focus-lost or
  terminating phases. Resume only through the coordinator's active phase.
- Do not turn a long hidden or suspended frame into foreground progress.
- Render only published snapshots. A visual progress interpolation may smooth
  between snapshots, but it awards nothing, drives no commands, stops when the
  app is not active and snaps back to every canonical update.

### Commands and concurrency

- Build every command envelope from the latest ready snapshot's session and
  state revisions at activation time.
- Use the snapshot's route availability and exact previews for controls.
  `routeAvailable` does not mean affordable or unlocked.
- Treat the coordinator result as authoritative. Show pending state without
  changing gameplay values.
- After a stale rejection, refresh from the latest snapshot and ask for a new
  activation; do not silently replay a purchase or prestige command.
- Prevent duplicate activation while the same destructive or purchase intent is
  pending. The coordinator remains the serialization authority.
- Never automatically retry a command that spends, resets, imports or
  overwrites.
- Surface a concise player-facing error and retain a diagnostic code for support
  when an action rejects.

### Startup, save and recovery

- `idle` and `starting`: show a stable branded shell, progress text and no
  gameplay controls.
- `blocked`: show the canonical blocking outcome, recovery/export actions that
  are actually available, and enough error detail for support. Never reveal a
  stale gameplay screen underneath.
- `ready`: render only the matching frontend snapshot and revision.
- Exclusive operations disable conflicting actions globally and announce their
  purpose and completion.
- Save import, overwrite, migration and recovery confirmations state the target,
  consequence and whether the source is preserved.

## Interaction standard

### General controls

- Use native `button`, `input`, `select`, `progress`, dialog and heading
  semantics before custom roles.
- Minimum target size is 44 by 44 CSS pixels; prefer 48 by 48 on touch layouts.
- Every control has visible default, hover where applicable, focus, pressed,
  pending, disabled, locked, success and failure treatment.
- Disabled controls remain discoverable when their reason is useful. Pair the
  state with concise explanatory text or an accessible description.
- Details are progressive disclosure, not a substitute for the owned count,
  output, cost and primary action on a facility card.
- Dangerous resets, imports and destructive settings require confirmation.
  Routine purchases and Tinker actions do not.

### Tinker

- The whole Tinker action surface is the primary button, with a visible label,
  current output, remaining time and progress.
- A tap/click or keyboard activation dispatches `tinker.start` with repeat
  disabled.
- Pointer/touch hold may request repeat after 500 milliseconds. Releasing,
  cancelling or losing capture dispatches repeat disabled. These gestures only
  change the canonical repeat command; the component never awards a completion.
- Keyboard users can toggle a clearly labelled repeat control without holding a
  key. Key auto-repeat must not generate repeated start commands.
- The component uses `runtime.tinker` for running, repeat, yield, cooldown,
  eligibility and completion time. It does not reproduce the Manual Labour or
  AI Manager rule.

### Numbers, rates and time

- Keep raw numbers in snapshot and command layers. Formatting occurs at the last
  presentation boundary.
- Use one locale-aware formatter family with deterministic notation thresholds.
  Preserve enough significant digits to distinguish costs and rates; never
  display an affordable preview as unaffordable because of rounding.
- Pair abbreviated values with an accessible/full-precision representation on
  focus, hover or details.
- Use `/s` for rates and explicit units for durations. Durations under one
  minute may use decimals only when the distinction affects interaction.
- `bigint` values remain `bigint` until string formatting. Never coerce them to
  `number`.
- Progress bars expose a text equivalent and canonical minimum/maximum/current
  values. Indeterminate operations use an indeterminate treatment rather than
  invented percentages.

## Visual standard

### Reference tokens

The first token set is derived from the Unity theme and may be contrast-adjusted
only through semantic aliases:

| Role | Reference |
| --- | --- |
| App background | `#1D151F` |
| Panel background | `rgba(26, 26, 38, 0.95)` |
| Border | `#4D4D66` |
| Button | `#33334D` |
| Button hover | `#4D4D66` |
| Button pressed | `#262633` |
| Accent/value | `#FFA45E` |
| Highlight/link | `#00E1FF` |
| Positive | `#91DD8F` |
| Warning | `#FFEB3B` |
| Negative | `#FF5757` |
| Primary text | `#F7F4F8` |
| Secondary text | `#B0B0B0` |

Use Lexend Regular for body text and Lexend SemiBold/Bold for hierarchy and
important values. Subset and self-host the repository font files for the
characters required by the shipped locales.

### Composition

- Start sections with their heading. Do not add decorative eyebrow labels or
  pill-shaped section tags.
- Use bordered, slightly rounded rectangular panels and controls. Pills are
  reserved for functional status, filters or compact metadata.
- Keep resource values and production rates visually stable with tabular
  numerals where available.
- Prefer spacing, alignment and type weight over shadows. Elevation is reserved
  for menus, dialogs and transient overlays.
- Motion explains state change or continuity. It is short, interruptible and
  disabled or reduced under `prefers-reduced-motion`.
- Color reinforces meaning but never carries it alone. Icons include labels or
  accessible names.

The Dyson background art can be used as a restrained scene/header treatment,
not behind dense text without an opaque contrast surface.

## Responsive standard

Layouts are content-driven, with these test bands:

- Compact: 320–599 CSS pixels, one content column, bottom navigation and safe
  area padding.
- Medium: 600–1023 CSS pixels, one or two columns as content permits and either
  bottom navigation or a compact rail.
- Wide: 1024 CSS pixels and above, persistent side rail and bounded readable
  content columns.

Requirements:

- Support portrait and landscape without requiring an application restart.
- Respect `env(safe-area-inset-*)` on mobile hosts.
- Do not horizontally scroll the page at 320 CSS pixels or at 200% zoom.
- Facility cards stack their purchase action below content before truncating
  labels or values.
- Navigation and the current resource summary remain reachable without covering
  the focused control or software keyboard.
- Large desktop widths increase comparison capacity, not line length. Dense
  screens use bounded columns and virtualize only after measurement proves it
  necessary.
- Source order matches reading and focus order in every layout. CSS reflow must
  not create a misleading keyboard sequence.

## Accessibility standard

WCAG 2.2 AA is the release baseline.

- Full keyboard operation with a persistent, high-contrast focus indicator.
- Skip link, one `main` landmark, meaningful headings and named navigation.
- Contrast of at least 4.5:1 for normal text, 3:1 for large text and essential
  UI boundaries. Adjust semantic token foreground/background pairs when a Unity
  reference color fails.
- Text resizing to 200% and browser zoom to 400% without loss of controls,
  content or task completion.
- Status announcements are deliberate. Announce command completion, rejection,
  blocking state and major unlocks; do not announce every resource tick.
- Dialog focus is trapped while open, begins on a safe element and returns to
  the invoking control.
- Touch gestures have a tap alternative. Holding Tinker is optional because the
  repeat toggle is keyboard and switch accessible.
- Animations honor reduced motion; audio cues have independent volume/mute and
  are never the only feedback.
- Number abbreviations, icons and progress visuals have understandable
  accessible names.

Automated checks supplement, but do not replace, keyboard-only, NVDA on Windows
and VoiceOver on iOS verification.

## Performance standard

Performance work in the simulation remains accepted. These budgets apply to the
new presentation and host integration.

### Representative tiers

- Desktop baseline: 4-core CPU, integrated graphics, 8 GB RAM, 1440×900.
- Compact Android baseline: 4 GB RAM device, 360×800 CSS viewport.
- Compact iOS baseline: 375×667 CSS viewport.

Test production builds with CPU throttling only as a repeatable supplement, not
as a substitute for at least one representative physical mobile device before
release.

### Budgets

- Initial first-slice JavaScript: at most 200 KiB gzip.
- Initial first-slice CSS: at most 40 KiB gzip.
- Initial fonts: at most 250 KiB transferred; later weights and art are lazy.
- No presentation long task over 50 ms during the 30-second first-slice
  interaction trace.
- P95 snapshot selection plus React commit: 8 ms desktop, 16 ms mobile.
- P95 visible command feedback: 100 ms after activation, even when canonical
  completion remains pending.
- Web Vitals release target: INP at most 200 ms, CLS at most 0.1 and LCP at most
  2.5 seconds at the 75th percentile for applicable browser telemetry.
- No unbounded growth in subscriptions, retained snapshots, command results or
  animation handles over a 30-minute foreground soak.

### Rendering rules

- Subscribe once at the application boundary and select narrow immutable views.
- Coalesce snapshot publication for React rendering when multiple coordinator
  operations settle in one frame. Never discard the newest revision.
- High-frequency visual progress may paint independently from the main resource
  tree, but it remains presentation-only and resynchronizes to canonical facts.
- Avoid polling, JSON cloning, deep equality and whole-snapshot context
  propagation in render paths.
- Lazy-load destinations after the first playable Dyson route.
- A budget exception requires a repeatable trace, identified device/build,
  cause, player impact and an approved follow-up.

## Testing standard

### Static and unit

- TypeScript strict build and lint pass.
- Architecture test prevents product UI imports from `simulation`, `save`
  implementation modules or internal application facade modules.
- Unit tests cover formatters, semantic token pairs, responsive selectors,
  command-envelope construction and presentation-only Tinker gesture state.
- Property/boundary tests cover `bigint`, non-finite display fallbacks, very long
  localized labels, zero/negative presentation edge cases and revision changes.

### Component and integration

- Use Vitest, Testing Library and `user-event` for semantic interaction tests.
- Use `axe-core` checks for each stable component state.
- Drive components with frozen frontend snapshots and a fake lifecycle
  coordinator port. Tests assert commands, revisions and coordinator results,
  not reimplemented economy outcomes.
- Cover idle, starting, blocked, ready, exclusive-operation, unavailable
  derivation, route gap, locked, unaffordable, pending, stale, rejected and
  successful states.
- Verify subscription cleanup, one active-time driver and no overlapping
  `advanceActive()` calls under delayed promises.

### End to end and parity

Use Playwright against a production build for:

- cold start to ready;
- blocked startup and recovery route;
- single Tinker completion;
- hold/repeat/release Tinker behavior;
- basic facility preview, purchase, rejection and stale-revision handling;
- background/focus/active routing without duplicate active time;
- checkpoint/reload continuity for the first slice; and
- keyboard-only completion of the same journey.

Capture visual regression baselines at 320×568, 390×844, 768×1024 and 1440×900,
plus one compact landscape viewport. Baselines compare the approved web design,
not raw Unity pixels. Keep separate content/parity assertions for Unity
terminology, order, values and outcomes.

Each vertical slice must pass existing backend tests plus its focused UI unit,
component, accessibility, end-to-end, responsive visual and performance checks.

## Dependency-first delivery order

After approval, implement in this order:

1. Host composition root, lifecycle coordinator port and startup phases.
2. Active-time driver and frozen-snapshot external store.
3. Command-envelope/dispatch adapter and standard result/error handling.
4. Fonts, semantic tokens, layout primitives and accessibility foundation.
5. Responsive shell and parity navigation skeleton.
6. Resource header and derived-rate presentation.
7. Tinker interaction using only canonical runtime facts and player commands.
8. Basic facility list using canonical previews and purchase commands.
9. Recovery/reload, accessibility, visual and performance acceptance for the
   complete slice.

Later gameplay destinations follow their backend dependency order. A screen is
not started merely because its navigation label exists.

## Approval checklist

Approval should explicitly confirm or amend:

- [ ] Behavioral/structural parity with accessibility and responsive
  corrections, rather than pixel-perfect Unity reproduction.
- [ ] React 19 + TypeScript + Vite, with no UI/state/CSS framework in the first
  slice.
- [ ] Electron desktop and Capacitor mobile as product hosts; browser as a
  development/review/recovery surface.
- [ ] Pointer, touch and keyboard required now; controller deferred.
- [ ] First slice ends after Tinker plus early basic-facility purchase and
  checkpoint/reload continuity.
- [ ] Unity-derived Lexend/dark-plum visual direction and the reference tokens
  above.
- [ ] WCAG 2.2 AA, responsive, performance and testing budgets above.
- [ ] All player commands, active time and platform phases route through
  `CanonicalLifecycleCoordinator`; no gameplay-rule duplication in UI.
