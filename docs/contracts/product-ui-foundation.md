# Product UI foundation

Status: approved on 2026-07-29 for dependency-first implementation through the
earliest playable Tinker/basic-facility slice. The frontend readiness gate is
open only for the scope and delivery waves defined by this document and
[`web-ui-delivery-waves.md`](../archive/2026-08/web-ui-delivery-waves.md). The Tinker, facility
visibility and first-slice layout corrections below were approved by the user
on 2026-07-29.

Implementation coordination, review gates and recoverable checkpoints are
defined separately in [`web-ui-delivery-waves.md`](../archive/2026-08/web-ui-delivery-waves.md).

Scope decision (2026-07-30): the current checkpoint target is a high-quality
Bots/Dyson product-design baseline, not a Unity-migration UI or complete
browser/native release certification. This changes delivery sequencing only.
It does not waive save integrity, single-writer fencing, lifecycle-coordinator
authority, production persistence, recovery, security, accessibility,
responsive or performance standards. Deferred host/release work must remain
explicit and must not be reported as passed.

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
- a browser/PWA build for product use, development and review.

The Bots/Dyson baseline starts a fresh profile from the authenticated first-run
artifact. An optional manually pasted Unity `IDB1` text string may remain as a
recovery/support route through the existing bounded decode, migrate, repair and
validation pipeline. No file picker, drag-and-drop surface or first-run Unity
migration prompt is required for this baseline. If the optional route is
exposed, it retains the supplied original for recovery/export, writes only to
the isolated web-development profile while release writes are gated and never
overwrites the player's Unity save.

Steam/native save discovery is separate host integration. A desktop host can
target the known Idle Dyson Swarm application-support directory rather than
asking the browser UI to discover an arbitrary path. Retained-container mobile
upgrades have their own identity, signing and container requirements. Complete
migration promises still require canonical mapping, the pinned public Unity
3.0.328/schema-11 leaf certification, development-schema idempotence,
release-write and applicable host gates in
`../archive/2026-08/platform-port-inventory.md`.

Every product path supports pointer, touch and keyboard. Controller navigation
is a later release gate unless controller support is explicitly promoted into
the first release scope. The DOM and focus model must not prevent a future
controller adapter.

### First-slice reference host

The browser/PWA production build is the reference host for the first playable
slice. It must use a real IndexedDB-backed transactional save adapter, not an
in-memory or test repository, and must prove checkpoint/reconstruction
continuity before the slice is accepted. The browser host also supplies the
monotonic clock,
visibility/focus lifecycle, recovery-blob export, clipboard and external-link
ports required by that journey. A manually pasted recovery string may use the
already-built import port, but migration UI is not part of the baseline.

Until `mappingCoverageManifest.coverageComplete` and
`releaseCanonicalWriteAllowed` are both true, this reference implementation
uses a separately named development database/profile. Passing first-slice
checkpoint/reconstruction tests proves continuity inside that isolated profile;
it does not certify immediate native refresh, canonical Unity-save overwrite or
release migration.

An empty development profile starts from a checked-in schema-12 first-run
artifact generated by Unity's production save-preparation and codec pipeline.
TypeScript may replace classified lifecycle metadata such as the start
timestamp, but it must not hand-copy or independently invent gameplay defaults.
The artifact records its Unity version, schema and generated-data provenance
and passes Unity-to-Web normalized parity before product UI consumes it.

Exactly one browser tab or installed PWA window may own a writable game session
for an origin/profile:

- Acquire an atomic IndexedDB lease with a unique owner token and monotonically
  increasing fencing generation before opening the writable repository or
  starting `CanonicalLifecycleCoordinator`. Renew it with a bounded heartbeat
  and release it on orderly shutdown. Every save mutation validates the current
  token/generation in the same transaction, so a stale owner cannot write after
  takeover.
- `BroadcastChannel` may accelerate ownership notices, but it is advisory; the
  transactional lease remains authoritative. A supported Web Locks
  implementation may reinforce the lease but is not the compatibility baseline.
- A second context remains blocked/read-only and cannot advance time, dispatch a
  player command or write a save. It may request takeover only after explicit
  release or lease expiry; it never steals a live lease.
- Revalidate ownership before resuming from background. Losing ownership stops
  the active-time driver and rejects further player dispatch before the context
  can publish or persist another transition.
- Baseline tests cover simultaneous open and safe secondary-context blocking
  without duplicate active or away time. Immediate native-refresh and
  explicit-tab-handoff acceleration are deferred host/release gates. The
  transactional lease, fencing validation, orderly release path and
  expired-owner safety remain mandatory; deferral permits a temporarily blocked
  context, never two writers or an unsafe takeover.

Browser lifecycle events and active elapsed time still enter only through
`CanonicalLifecycleCoordinator`. A service-worker or asset update must not
reload an active session automatically. It may activate after a verified
checkpoint and an explicit safe-reload prompt.

The host requests persistent browser storage where supported, records whether
the request succeeded and never treats success as guaranteed durability. Denial,
quota pressure and commit failure preserve the last verified save, surface a
clear warning and keep export/recovery available.

While the application snapshot is dirty, the UI runtime port requests a
checkpoint through the facade persistence lane at least every 30 seconds and
before a safe update reload. Background/focus lifecycle saves still route
through the coordinator. `pagehide`/termination persistence is best effort and
is never the only protection against progress loss.

Electron and Capacitor remain product hosts, but their filesystem, retained
container, signing, Steam and native lifecycle certification are later host
release gates. The browser reference host does not weaken those requirements.

### Browser and engine support policy

Release support certification covers:

- the current and previous stable major versions of desktop Chrome, Edge and
  Firefox;
- the current and previous major macOS/iOS Safari engine generations;
- the current and previous stable Android Chrome and Android System WebView
  generations; and
- the exact Chromium/WKWebView versions pinned by the Electron and Capacitor
  release hosts when those hosts enter certification.

Automated browser projects cover the minimum and current supported engines where
the test runner provides them. At least one supported physical iOS device and
one supported physical Android device cover touch, lifecycle and persistence
before release. Unsupported engines receive a clear non-destructive message;
they must never reach a partially initialized save-writing state.

Complete current/previous-major browser coverage, physical-mobile evidence and
assistive-technology certification are release gates, not blockers to the
2026-07-30 Bots/Dyson design-baseline checkpoint. Baseline evidence names the
engines and devices actually exercised and never converts an untested target
into a pass.

### Information architecture

The Unity hierarchy remains the baseline, introduced by progression rather than
showing empty destinations:

1. Dyson: resources, Tinker, facilities and panel-production facts. Bot
   Distribution arrives as one complete region when its canonical controls
   and player commands are ready.
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
4. Show only the backend-authored visible early basic-facility cards in the
   backend-authored Unity order, followed by the one backend-authored next-tier
   teaser when present. Cards include owned counts, production, selected
   quantity, exact previewed cost, eligibility and rejection reason.
5. Preserve the Unity lower-screen hierarchy: a cohesive Info panel whose
   collapsed line shows the canonical current goal and whose expanded state
   contains the active-panel, lifetime and total-decayed facts; one worker
   production line; and the complete Bot Distribution control. The Info gear
   exposes the canonical building buy-mode and rounded-bulk settings.
6. Dispatch distribution, buy-setting and basic-facility commands through the
   lifecycle coordinator and prove that active time, purchases and
   Tinker progress checkpoint and reconstruct from production IndexedDB.
   Accelerated native refresh and immediate tab handoff remain separate
   host/release gates.
7. Reflow the same journey across the compact, medium and wide layouts without a
   second interaction model.

Research, Skills, prestige systems and content/reference screens are outside
this slice except for the familiar Unity navigation shell. That shell may show
non-active destinations as unavailable, but it does not fabricate their content
or unlock rules. Bot Distribution and building buy settings are in scope
because their complete canonical controls and player-command routes now exist.

### First-slice acceptance fixture

Before product component code begins, freeze one canonical early-Dyson
acceptance fixture. Its contract records:

- the prepared starting save and hashes of the save and generated gameplay
  catalog;
- the exact initial frontend snapshot facts shown by the slice;
- the Tinker and basic-facility command envelopes and expected revision changes;
- the authoritative accepted, stale and rejected coordinator results; and
- the expected checkpointed state after a fresh application reconstructs from
  IndexedDB.

Expected gameplay values and outcomes are generated or asserted by canonical
application tests. UI tests may consume the frozen snapshot/result artifacts but
must not calculate those expectations independently.

## Architecture standard

### Selected frontend foundation

Keep React 19, TypeScript and Vite. Add libraries only where a demonstrated
requirement cannot be met cleanly by React and platform APIs. The initial
foundation should use:

- semantic React components;
- a small external-store adapter using `useSyncExternalStore`;
- FormatJS/React Intl with extracted ICU MessageFormat catalogs;
- CSS custom properties for tokens and locally scoped component styles; and
- platform ports injected at the application composition root.

Do not introduce a frontend state-management library, component suite or CSS
framework in the foundation slice. This decision can be revisited with measured
component or state complexity.

### Localization architecture

Internationalization is foundation work, not a later string-replacement pass:

- Every player-facing string uses a stable message descriptor with an English
  default and translator description. Raw UI strings fail lint outside tests,
  diagnostics and explicitly non-player-facing developer tools.
- Use FormatJS extraction and compiled ICU MessageFormat catalogs for plurals,
  select rules, interpolation, number/date/time formatting and translator-safe
  sentence structure. Do not concatenate translated fragments.
- Organize catalogs by gameplay destination and shared UI. Load the active
  locale's shared catalog at startup and lazy-load destination catalogs with
  their route.
- Keep gameplay IDs, save keys, command kinds, diagnostic codes and canonical
  enum values language-neutral. Translate them only through presentation
  metadata.
- Use `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` and
  `Intl.PluralRules` behind shared cached helpers. Preserve canonical `bigint`
  and numeric values until formatting.
- Locale selection, fallback and persistence belong to a presentation
  preference service. Locale changes replace catalogs and document
  `lang`/`dir`; they do not restart or mutate the simulation.
- Support left-to-right and right-to-left layout from the start with logical CSS
  properties and direction-aware icons. Mirroring is semantic; numbers,
  scientific notation and universal media controls are not blindly mirrored.
- English is the source locale. Two pseudo-locales are required before the first
  vertical slice is accepted: expanded/accented LTR `en-XA` and mirrored RTL
  `ar-XB`. They test different failure modes and are not selectable production
  translations.
- English plus `en-XA` and `ar-XB` are the only enabled first-slice locales.
  Japanese and Chinese font routing is foundation-ready, but Noto Sans JP/SC/TC
  assets and destination catalogs are neither shipped nor requested until a
  corresponding translation is enabled in the typed locale registry.
- Each enabled locale registry entry declares its language tag, direction, font
  family, shared catalog and destination chunks. An unavailable browser locale
  falls back to English without exposing a partially translated route.
- Translation completeness, ICU syntax, missing/orphaned keys and unsupported
  rich-text markup fail CI for a release locale.

Player-authored names and imported legacy text are data, not messages. They must
be escaped and rendered in the surrounding locale without passing through the
message parser.

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

### Reuse and shared helpers

Reuse is explicit at stable presentation boundaries:

- `ui/runtime` owns the one snapshot subscription, lifecycle/command adapter and
  standard pending/result mapping.
- `ui/i18n` owns message loading, locale selection and cached formatters.
- `ui/tokens` owns semantic color, typography, spacing, motion and responsive
  tokens.
- `ui/components` owns accessible primitives such as buttons, dialogs, resource
  values, progress, facility cards, navigation and status feedback.
- Feature folders compose those primitives and own feature-specific
  presentation state. They do not become generic merely because two screens
  currently look similar.
- Shared helpers are pure, focused and tested. They accept presentation data,
  never reach into canonical state globally and never reproduce a gameplay
  calculation.

Prefer composition and narrow typed props over large configurable components.
Extract a shared abstraction after its contract is understood; duplicated
gameplay logic is forbidden immediately, while small temporary presentation
duplication is safer than a premature universal component.

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
- Any enabled save import, overwrite, migration or recovery confirmation states
  the target, consequence and whether the source is preserved. The baseline
  does not require a first-run migration prompt.

### Failure containment, security and diagnostics

- A top-level product error boundary protects the shell and available
  recovery/export actions. A render failure never resets, mutates, retries or
  replaces canonical state.
- Treat every supplied save string as untrusted input. If a later host adds
  dropped or selected files, the same rule applies. The checked-in
  IDB1 fixtures measured 6.7–7.6 KiB of UTF-8 envelope text, 5.0–5.7 KiB of
  decoded/compressed payload and 24.0–25.3 KiB of inflated Odin binary on
  2026-07-29. Initial host ceilings are 2 MiB supplied UTF-8 text, 1 MiB decoded
  payload and 8 MiB inflated binary. Enforce each ceiling before the next
  allocation stage; bounded decompression aborts at the binary ceiling rather
  than inflating an unbounded payload and checking afterward. Reject oversized
  or malformed input before promotion and preserve the existing save. Any later
  increase requires a representative valid save, a memory trace and review.
- Render player-authored and imported text as text, never executable markup.
  Product UI does not use unsanitized HTML injection.
- Browser/PWA builds ship a restrictive Content Security Policy. Electron keeps
  context isolation enabled, disables renderer Node integration and exposes only
  narrow typed preload capabilities. Capacitor navigation and external links
  use an explicit allowlist.
- Local support diagnostics may include build, host, locale, lifecycle phase,
  diagnostic code and revisions. They exclude save payloads, imported/player
  text, filesystem paths, clipboard contents and platform credentials.
- Production analytics, remote crash reporting and real-user performance
  monitoring are outside this foundation's scope. The first slice does not add
  a provider SDK, telemetry consent flow or release gate that depends on player
  data. Revisit those capabilities through a separate product, privacy and
  retention decision. Performance budgets still run in deterministic local and
  CI acceptance traces plus the representative physical-device checks below.

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

### Touch and rapid activation

- Use Pointer Events so mouse, pen, single-touch and multi-touch share one
  interaction path. Track pointer IDs independently and use pointer capture for
  press/hold controls.
- Simultaneous touches on different enabled controls remain independently
  responsive. A single-touch control ignores additional pointers on that same
  control unless it explicitly defines a multi-touch gesture.
- Apply `touch-action: manipulation` to ordinary controls and preserve native
  vertical scrolling and pinch zoom. Use stricter values only on a bounded
  gesture surface with an accessible non-gesture alternative.
- Apply `user-select: none` only to interactive chrome while pressed or to
  controls whose text is not useful to copy. Descriptions, values, errors,
  recovery codes and other content remain selectable.
- Suppress native drag/long-press selection only for the active control, and
  always clean up on pointer-up, pointer-cancel, lost capture, blur and
  unmount.
- Rapid taps must not incur an artificial debounce. Distinct safe commands may
  queue through the lifecycle coordinator; a command that cannot safely
  duplicate uses its standard pending guard and visibly acknowledges the first
  activation.
- Touch handling must not create both pointer and compatibility-click
  activations. Keyboard activation continues to use native button semantics.

### Tinker

- The whole Tinker action surface is the primary button, with a visible label,
  current output, remaining time and progress.
- A tap, click or native button activation starts one cycle. Rapid taps are not
  debounced; each activation follows the normal canonical pending/result path.
- A pointer hold becomes repeat only after a transient 500-millisecond hold.
  Capture the initiating pointer. Pointer-up, cancel, lost capture, application
  blur and unmount end that hold and request repeat disabled. Another pointer
  cannot steal or cancel the active pointer.
- Space follows the same transient hold/release behavior: start one cycle on
  initial key-down, request repeat after 500 milliseconds while Space remains
  held, and request repeat disabled on key-up, blur or unmount. Ignore keyboard
  auto-repeat key-down events so they do not create additional starts.
- There is no visible or persistent Repeat Tinker toggle, switch, preference or
  saved setting. Hold state only changes the canonical repeat command; the
  component never awards a completion.
- The component uses `runtime.tinker` for running, repeat, yield, cooldown,
  eligibility and completion time. It does not reproduce the Manual Labour or
  AI Manager rule, skill-tree automation or any later Tinker progression.
  Automatic behavior, availability and output changes appear only when the
  canonical runtime publishes them; the hold gesture is not a saved automation
  setting.

### Facility visibility and teaser

- The snapshot/runtime adapter owns and publishes the authoritative ordered
  facility presentation facts: visible facilities, `showTinker`, and the
  presence/order of the next-tier teaser. The UI consumes those facts as-is and
  never duplicates visibility, Tinker-removal or progression thresholds.
- A hidden facility is absent entirely: it has no disabled card, placeholder,
  spacer, accessibility-tree entry or inferred unlock message. After the final
  revealed facility, render at most one generic `????` teaser when the
  backend-owned next-tier-teaser fact says to render it.

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
- Number notation is a versioned device-local preference with Standard,
  Scientific, and Engineering choices. Portable saves exclude it; manual
  imports retain the receiving device's choice. Automatic same-device Unity
  migration may adopt a valid legacy choice once when no device preference is
  established, but only when the native provenance identity matches both the
  repository candidate identity and its read-only Unity bridge path. See
  [implementation evidence](../number-notation-implementation-evidence.md).
- Routine digit changes use the shared tabular-digit presentation without
  fixed-width containers. Decimal separators, signs, units, and suffixes keep
  natural spacing, and genuine magnitude/suffix transitions may change width.
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

Typography decision: approved 2026-07-29.

Lexend is the Latin-script brand face, not a universal-font assumption. The
Google Fonts Lexend family is OFL-licensed and covers Latin, Latin Extended and
Vietnamese. Use its variable font for supported Latin locales. Use Noto Sans JP
for Japanese (`ja`), Noto Sans SC for Simplified Chinese (`zh-Hans`) and Noto
Sans TC for Traditional Chinese (`zh-Hant`). Select the appropriate Noto family
when onboarding Cyrillic/Greek, Arabic, Hebrew, Indic and other scripts. Noto's
coordinated families preserve a related sans voice while providing correct
script shaping.

Self-host production fonts for reliable offline Electron, Capacitor and PWA
operation. Subset by script, lazy-load only the active locale's additional
family, declare metric-compatible system fallbacks and prevent invisible text
during loading. Typography tokens are locale-overridable because line height,
weight and density requirements vary by script.

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

### Approved layout reference

[`wave-3-parity-layout-reference.md`](../archive/2026-08/wave-3-parity-layout-reference.md) is the
approved 2026-07-29 composition reference for the first slice. It covers fresh
and Assembly-revealed state at compact portrait, medium/tablet, wide desktop
and compact landscape. It settles hierarchy, navigation placement, resource
prominence, Tinker interaction, facility-card density, focus order and safe
area behavior. It is a responsive composition contract, not a source of
gameplay facts.

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
- The same layout must work in `dir="ltr"` and `dir="rtl"` using logical
  margins, padding, borders, alignment and inset properties.

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
- Touch gestures have a tap alternative. Holding Tinker is optional because
  tap/native activation starts one cycle and Space provides the matching
  keyboard hold/release interaction.
- Animations honor reduced motion; audio cues have independent volume/mute and
  are never the only feedback.
- Number abbreviations, icons and progress visuals have understandable
  accessible names.
- The document and localized regions expose the correct language and direction;
  language changes are announced without moving focus.

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

- Initial first-slice JavaScript is measured and reported on every production
  checkpoint. The temporary no-regression ceiling is 301 KiB gzip and is
  enforced. The first reduction milestone is 250 KiB gzip and currently warns;
  200 KiB remains the eventual architectural target. Do not trade familiar UI,
  canonical correctness, or honest transfer accounting for an arbitrary
  one-number reduction.
- Initial first-slice CSS: at most 40 KiB gzip.
- Initial source-locale fonts: at most 250 KiB transferred. Additional
  script-specific fonts and locale catalogs are lazy and separately budgeted.
- Initial shared locale catalog: at most 30 KiB gzip; a first-slice destination
  catalog is at most 20 KiB gzip.
- No presentation long task over 50 ms during the 30-second first-slice
  interaction trace.
- P95 snapshot selection plus React commit: 8 ms desktop, 16 ms mobile.
- P95 visible command feedback: 100 ms after activation, even when canonical
  completion remains pending.
- Web Vitals acceptance target: INP at most 200 ms, CLS at most 0.1 and LCP at
  most 2.5 seconds at the 75th percentile across the fixed local/CI trial set
  for each representative viewport and device tier. This is a synthetic
  regression gate, not a requirement to collect real-user measurements.
- In a repeatable Chromium test build with explicit garbage collection, retained
  JavaScript heap after the 30-minute first-slice foreground soak is no more
  than 10 MiB or 20 percent above the post-warm-up baseline, whichever allowance
  is greater.
- Subscriptions, retained snapshots, pending command results, event listeners,
  timers, pointer records and animation handles return to their post-warm-up
  counts after the soak; none may grow with completed interactions.

### Rendering rules

- Subscribe once at the application boundary and select narrow immutable views.
- Coalesce snapshot publication for React rendering when multiple coordinator
  operations settle in one frame. Never discard the newest revision.
- High-frequency visual progress may paint independently from the main resource
  tree, but it remains presentation-only and resynchronizes to canonical facts.
- Avoid polling, JSON cloning, deep equality and whole-snapshot context
  propagation in render paths.
- Lazy-load destinations after the first playable Dyson route.
- Precompile ICU messages and cache formatter instances by locale/options;
  message parsing and formatter construction do not occur in hot render loops.
- A budget exception requires a repeatable trace, identified device/build,
  cause, player impact and an approved follow-up.
- UI-affecting changes publish bundle-size, interaction-trace and retained-heap
  reports as CI artifacts. The implementation defines one documented command
  for reproducing each report locally against a production build.

### Initial-request bundle report

Run `npm run report:initial-request-bundle` from ``. It creates a fresh
production build, follows its Vite manifest from the `index.html` application
entry (which loads `src/main.tsx`), and adds the selected English shared-locale
request which startup awaits before React first renders. That boot graph is
reported separately from the lazy facility chunk requested to complete the
approved fresh-save Bots surface. The report also measures the aggregate raw
transfer size of the source-locale fonts and writes deterministic text and JSON
under `reports/initial-request-bundle/`.

JavaScript and CSS assets are measured with gzip rather than guessed or manually
named chunks. The 301 KiB boot-JavaScript no-regression ceiling is enforced;
the 250 KiB first milestone produces a warning, and 200 KiB remains the eventual
target. Enforced JavaScript, CSS, shared-locale, or source-font overages exit
nonzero.

## Testing standard

### Static and unit

- TypeScript strict build and lint pass.
- Architecture test prevents product UI imports from `simulation`, `save`
  implementation modules or internal application facade modules.
- Unit tests cover formatters, semantic token pairs, responsive selectors,
  command-envelope construction and presentation-only Tinker gesture state.
- Catalog tests cover extraction, ICU validity, fallback, pseudo-localization,
  expansion, plural categories and right-to-left direction.
- Property/boundary tests cover `bigint`, non-finite display fallbacks, very long
  localized labels, zero/negative presentation edge cases and revision changes.

### Component and integration

- Use Vitest, Testing Library and `user-event` for semantic interaction tests.
- Use `axe-core` checks for each stable component state.
- Drive components through a fake unified UI runtime port. It publishes frozen
  frontend snapshots and records coordinator-backed command and active-time
  requests without exposing the facade or coordinator directly. Tests assert
  commands, revisions and coordinator results, not reimplemented economy
  outcomes.
- Cover idle, starting, blocked, ready, exclusive-operation, unavailable
  derivation, route gap, locked, unaffordable, pending, stale, rejected and
  successful states.
- Verify subscription cleanup, one active-time driver and no overlapping
  `advanceActive()` calls under delayed promises.
- Verify two simultaneous pointer IDs, rapid taps, pointer cancellation, lost
  capture, scroll preservation and absence of accidental text selection or
  duplicate compatibility-click commands.

### End to end and parity

For the Bots/Dyson design-baseline checkpoint, exercise a production build in a
real browser for:

- cold start to the ready Bots route;
- single and hold/repeat/release Tinker behavior, including keyboard-only
  activation;
- basic-facility visibility, preview and purchase through canonical commands;
- production-IndexedDB checkpoint and reconstruction of accepted slice state;
- simultaneous-open safe writer blocking;
- expanded LTR `en-XA` and mirrored RTL `ar-XB` design checks where the
  baseline enables them;
- the approved compact, compact-landscape, medium and wide geometry; and
- reduced-motion and keyboard-focus behavior.

The in-app browser is sufficient for interactive design review. Browser
automation may use the existing browser-control surface when repeatability is
valuable, but this checkpoint does not require a separate Playwright CLI
installation or a duplicated browser harness. Name every engine and viewport
actually exercised. Persistence tests use the production IndexedDB adapter and
reconstruct a new application instance; an in-memory repository is permitted
only in focused unit tests.

The following are deferred host/release certification and do not block the
2026-07-30 Bots/Dyson design-baseline checkpoint:

- immediate native-refresh and explicit tab-handoff acceleration;
- complete current/previous-major browser and embedded-engine coverage;
- physical iOS/Android touch, lifecycle and persistence certification;
- NVDA, VoiceOver and other named assistive-technology certification;
- exact browser zoom and text-resize certification across the supported matrix;
- expired-owner, storage-persistence denial, quota/commit-failure and update
  recovery in the complete production-host matrix; and
- first-run Unity migration UI and native save-discovery journeys.

Deferral does not mark these paths as passing and does not remove deterministic
unit/integration coverage for lease fencing, expiry, quota/commit failure,
periodic checkpointing, lifecycle serialization, recovery retention or
bounded untrusted-input handling. Release certification must exercise the
deferred paths in their named real hosts.

Capture visual regression baselines at 320×568, 390×844, 768×1024 and 1440×900,
plus one compact landscape viewport. Baselines compare the approved web design,
not raw Unity pixels. Keep separate content/parity assertions for Unity
terminology, order, values and outcomes.

Each vertical slice runs the focused backend and UI checks affected by its
changes plus production build, localization and rendered-browser review.
Broader suites run at integration/release boundaries or when a shared contract
changes; raw test count is never an acceptance criterion.

## Dependency-first delivery order

After approval, implement in this order:

1. Freeze the canonical first-slice acceptance fixture, any enabled
   recovery-input ceilings and the annotated compact, medium, wide and
   compact-landscape layout reference.
2. Implement the browser IndexedDB repository, single-writer ownership lease,
   persistent-storage/quota handling, periodic checkpointing, lifecycle/clock,
   recovery/export, optional manual-text import, clipboard and external-link
   ports, then compose them behind the unified UI runtime port and lifecycle
   coordinator.
3. Generate and verify the authentic Unity schema-12 first-run artifact, then
   add the backend-owned production application factory, first-run save factory
   and authoritative event-context/entitlement composition.
4. Add startup phases, the top-level error boundary, safe update handling,
   redacted diagnostics and the production Content Security Policy.
5. Implement the active-time driver and frozen-snapshot external store.
6. Implement the command-envelope/dispatch adapter and standard result/error
   handling.
7. Add the localization runtime, typed locale registry, English/source and
   pseudo catalogs, and locale-aware formatters.
8. Add script-aware font routing, semantic tokens, shared components and the
   accessibility
   foundation.
9. Build the responsive LTR/RTL shell and parity navigation skeleton.
10. Add the resource header and derived-rate presentation.
11. Add pointer/multi-touch Tinker interaction using only canonical runtime facts
   and player commands.
12. Add the basic facility list using canonical previews and purchase commands.
13. Add the cohesive Info panel, canonical building buy settings, single worker
    production line and complete Bot Distribution command surface.
14. Checkpoint the approved Bots/Dyson design baseline after focused canonical,
    localization, responsive, accessibility and rendered-browser review.
    Record measured bundle/runtime evidence without treating the provisional
    JavaScript target or deferred host/release matrix as a pass.

Later gameplay destinations follow their backend dependency order. A screen is
not started merely because its navigation label exists.

## Approval checklist

Approval should explicitly confirm or amend:

- [x] Behavioral/structural parity with accessibility and responsive
  corrections, rather than pixel-perfect Unity reproduction.
- [x] React 19 + TypeScript + Vite, with no UI/state/CSS framework in the first
  slice.
- [x] Scope decision approved 2026-07-30: checkpoint a high-quality Bots/Dyson
  design baseline; do not require file-picker/drop/first-run Unity migration UI
  or complete host/release certification at this checkpoint.
- [x] Electron desktop, Capacitor mobile and browser/PWA as product-capable
  hosts; optional manual-text recovery remains user-mediated and first-slice
  writes stay in an isolated development profile until canonical mapping and
  release-write certification close.
- [x] Browser/PWA is the first-slice reference host, backed by production
  IndexedDB persistence and browser lifecycle ports; native-host certification
  remains a later release gate.
- [x] Browser/PWA enforces one writable owner, persistent-storage/quota
  handling, a maximum 30-second dirty checkpoint window and recovery/export
  behavior above.
- [x] The current/previous browser-engine, physical iOS/Android and named
  assistive-technology policies remain release requirements, explicitly
  deferred from the Bots/Dyson design-baseline checkpoint.
- [x] Pointer, rapid touch, multi-touch and keyboard required now; controller
  deferred.
- [x] First slice ends after Tinker plus early basic-facility purchase and
  production-IndexedDB checkpoint/reconstruction continuity.
- [x] A frozen canonical first-slice fixture and annotated compact, medium, wide
  and compact-landscape layout reference precede component implementation.
- [x] Extracted ICU MessageFormat catalogs, pseudo-localization and LTR/RTL
  architecture are foundation requirements; English, expanded LTR `en-XA` and
  mirrored RTL `ar-XB` are the only enabled first-slice locales.
- [x] Lexend for supported Latin locales, Noto Sans JP/SC/TC for Japanese and
  Chinese locales, and lazy script-specific Noto Sans families for other
  locales, with the Unity-derived dark-plum visual direction and reference
  tokens above. Approved 2026-07-29.
- [x] WCAG 2.2 AA, responsive and proportionate testing standards above.
- [x] Enforce the temporary 301 KiB initial-JavaScript no-regression ceiling,
  warn at the 250 KiB first milestone, and retain 200 KiB as the eventual target.
  Representative-device evidence can tighten the ceiling after Web release
  profiling.
- [x] Error containment, the measured 2 MiB/1 MiB/8 MiB import ceilings,
  CSP/native-shell isolation, diagnostic redaction and no production analytics,
  remote crash reporting or real-user monitoring in this foundation.
- [x] All player commands, active time and platform phases route through
  `CanonicalLifecycleCoordinator`; no gameplay-rule duplication in UI.
