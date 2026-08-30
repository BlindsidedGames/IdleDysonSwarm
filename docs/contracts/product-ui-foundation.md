# Product UI foundation

This is the living presentation contract for the canonical TypeScript/React
product. It owns current interaction, responsive, accessibility, information
architecture, numeric-presentation, performance, and UI testing standards.
Historical migration plans, engine screenshots, and archived delivery waves
are not product authority.

## Decision basis

This contract is based on:

- the presentation-neutral boundary in `frontendSnapshot.ts`;
- the exhaustive player-intent union in `canonicalPlayerCommands.ts`; and
- the serialized active-time, command, persistence and platform lifecycle lane
  in `canonicalLifecycleCoordinator.ts`.

## Product standard

### Product intent

- Preserve observable gameplay, progression order, terminology, unlock
  conditions, resource prominence and the broad screen hierarchy.
- Preserve the recognizable visual identity: Lexend typography, dark
  plum/charcoal surfaces, orange numeric emphasis, cyan highlights and
  era-specific colors.
- Preserve information density where it helps comparison, especially facility,
  research, skill and prestige lists.
- Avoid fixed-pixel layouts, mouse-only interactions, low-contrast text,
  clipped content, and modal focus leaks.
- A deliberate gameplay, economy, content or navigation change requires its own
  product decision and backend contract change. It is not a UI cleanup.

Responsive reflow, semantic markup, accessible hit targets, and sufficient
contrast are required product behavior.

### Target surfaces and inputs

The product frontend is one React application hosted by:

- Electron for Windows, Linux and macOS;
- Capacitor for iOS and Android; and
- a browser/PWA build for product use, development and review.

Fresh profiles start from the checked-in canonical first-run artifact. Manual
or automatic legacy-save recovery routes use the bounded decode, migrate,
repair, and validation pipeline described by the save contracts. They retain
the source for recovery and never overwrite it.

Every product path supports pointer, touch and keyboard. Controller navigation
is not a current release requirement unless it is explicitly added to a
release's scope. The DOM and focus model must not prevent a future controller
adapter.

### Browser persistence host

The browser/PWA production build uses the real IndexedDB-backed transactional
save adapter, monotonic clock, lifecycle events, recovery export, clipboard,
and external-link ports. In-memory repositories are test-only. A fresh-save
artifact records its canonical schema and generated-data provenance; any
intentional default override is explicit and covered by an exact artifact-delta
test.

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
- Contract tests cover simultaneous open and safe secondary-context blocking
  without duplicate active or away time. Immediate native-refresh and
  explicit-tab-handoff acceleration remain separate follow-up work. The
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

Electron and Capacitor are product hosts. Each release must name and verify
the applicable filesystem, retained-container, signing, Steam, and native
lifecycle gates independently; browser evidence cannot satisfy those gates.

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

Complete current/previous-major browser coverage, physical-mobile evidence, and
assistive-technology certification are release gates. Evidence names the
engines and devices actually exercised and never converts an untested target
into a pass.

### Information architecture

The current progression hierarchy is introduced by canonical reveal conditions
rather than showing empty destinations:

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
persistent side rail. The compact bar derives its icon and slot size from the
available width and the number of selected destinations. Additional selected
destinations progressively reduce icons and labels so every selection remains
on the bar; a short bar grows only to the former Large-size ceiling. The full
height of each control remains available as its interaction area even when its
visuals and inline slot become small. Bar height follows the scaled content,
and the More glyph scales proportionally with destination icons.

The compact bar is player-configurable. Destination visibility remains in the
portable canonical save. A separate Include text toggle consistently shows or
hides labels for every displayed compact-bar button and is a versioned,
device-local presentation preference that never transfers through export or
import. Released size preferences migrate for continuity: Large enables text;
Compact and Standard disable it. Every currently available player-facing
top-level destination can be included or removed independently;
Developer/Debug is excluded. No minimum selection is enforced. The full drawer
always retains every available destination, including Settings. The
pre-existing destination composition and hidden labels are the defaults. The
menu control retains its established leading position. Selected destinations
remain in one row without scrolling, clipping, overlap, ellipsis, or removal;
the user controls how dense that row becomes. Unknown
stored destination IDs are preserved so later routes can adopt them safely.

A compact release footer remains visible across ready gameplay routes. On
mobile and portrait-tablet layouts it occupies the existing bottom-navigation
safe-area/background and must not add a shell row or reduce the gameplay field.
On layouts with a permanent side rail it sits at the rail's bottom. It shows
the player-facing platform, marketing version, and truthful host build identity;
native installed-package metadata outranks checked-in fallback values. This
release identity is deliberately subtle support/debug metadata for identifying
the exact version in bug-report screenshots, not ordinary player guidance. Its
exact 30% primary-text mix is an intentional low-prominence treatment and must
never carry gameplay status, instructions, or required actions.

Route discovery is also portable canonical save state. A newly revealed,
unvisited destination uses the square highlight in the compact bottom bar and
a dot in the drawer; the More button uses a dot only while such a destination
is hidden from the compact bar. Visiting the destination clears its unvisited
flag. Fresh saves begin with no known destinations, while older saves that
predate discovery persistence seed every currently available destination as
known to avoid presenting established progression as new. A save wipe clears
the discovery record, and export/import carries it between devices.

Locked systems are hidden until their canonical reveal condition unless the
current product contract intentionally previews them. A previewed locked destination explains its
requirement from snapshot data; the UI does not infer unlock rules.

### Shared progress and controls panel

Gameplay surfaces with persistent status and secondary configuration use one
shared bottom-docked panel pattern. Bots, Research, Skills, Infinity,
Simulations, and Quantum share the same structure: current status stays in a
left summary cell and one fixed-size settings control occupies the right cell.
Opening the settings control expands configuration above the summary without
replacing or obscuring the primary gameplay surface.

The summary is intentionally surface-specific. It may contain multiple compact
lines or an inline progress track, but it must preserve the shared spacing,
divider, touch target, focus treatment, and settings-icon placement. Primary
resource balances remain in their established resource headers; for example,
Infinity Points stay at the top of the Infinity surface while reset progress
appears in the shared panel. Expansion state is transient presentation state;
only controls deliberately exposed within the expansion may change gameplay
preferences.

On a new first run, Infinity resets begin in manual mode. Once the reset is
ready, the collapsed panel exposes an explicit Infinity action. The expanded
panel exposes the Auto Infinity preference before Break Infinity is unlocked;
Break Infinity adds its exact target configuration without replacing that
preference. Existing saves retain their stored automation choice, and legacy
saves without the preference continue with automatic resets enabled so an
upgrade cannot silently change established progression behavior.

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
- English is the source locale. Expanded/accented LTR `en-XA` and mirrored RTL
  `ar-XB` test different failure modes and are not selectable production
  translations.
- Production locales and their font assets are enabled only through the typed
  locale registry and must ship complete shared and destination catalogs.
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
  monitoring require a separate provider, consent, privacy, retention, and
  release decision. Performance budgets still run in deterministic local and CI
  acceptance traces plus the representative physical-device checks below.

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
- The shared game-number formatter may opt currency and discrete-count call
  sites into whole-number presentation below 100; at 100 and above they return
  to the normal three-significant-digit notation. Continuous cash, Bots and
  Science displays retain decimal presentation, formula/detail values retain
  significant digits throughout, and the Reality universe designation remains
  the deliberately unabridged integer exception. Editable Auto Infinity Target
  text uses the normal abbreviated currency presentation, but an untouched
  abbreviation retains its exact canonical value rather than being reparsed
  through display rounding. Player-edited numeric text follows the active
  locale's digits and decimal/grouping separators, is parsed exactly, and
  clamps only above the canonical maximum target. Developer numeric inputs use
  the same locale-aware coefficient parsing while retaining game suffixes.
- Pair abbreviated values with an accessible/full-precision representation on
  focus, hover or details.
- Use `/s` for rates and explicit units for durations. Durations under one
  minute may use decimals only when the distinction affects interaction.
- `bigint` values remain `bigint` until string formatting. Never coerce them to
  `number`.
- Number notation is a versioned device-local preference with Mixed, Standard,
  Scientific, and Engineering choices. Mixed is the default: it uses Standard
  through the complete Quintillion range and normalized Scientific notation
  from `1e21` upward. Portable saves exclude it; manual
  imports retain the receiving device's choice. Automatic same-device legacy
  migration may adopt a valid source choice once when no device preference is
  established, but only when the native provenance identity matches both the
  repository candidate identity and its read-only legacy bridge path. See
  [implementation evidence](../number-notation-implementation-evidence.md).
- Completed Research visibility is a versioned device-local preference,
  defaulting to showing completed cards for existing Web installations.
  Canonical Research visibility means unlocked/available and is independent
  of completion. The Research UI may hide only cards whose canonical `maxed`
  fact is true. Portable saves exclude the legacy `hidePurchased` field and
  manual imports never alter the receiving device selection. Only a verified
  automatic same-device legacy migration may adopt a valid source boolean once
  when the device has no established preference. See
  [implementation evidence](../research-visibility-implementation-evidence.md).
- Visible Research cards pin Cash Boost first and Science Boost second, retain
  canonical relative order for the remaining facility upgrades, and place the
  Durability Upgrade last.
- Routine digit changes use the shared tabular-digit presentation without
  fixed-width containers. Decimal separators, signs, units, and suffixes keep
  natural spacing, and genuine magnitude/suffix transitions may change width.
- Progress bars expose a text equivalent and canonical minimum/maximum/current
  values. Indeterminate operations use an indeterminate treatment rather than
  invented percentages.

## Visual standard

### Reference tokens

The product token set uses semantic aliases so contrast and state meaning remain
consistent across surfaces:

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
  UI boundaries. Adjust semantic token foreground/background pairs when a
  historical reference color fails.
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

- Initial-route JavaScript is measured and reported on every production
  checkpoint. The temporary no-regression ceiling is 301 KiB gzip and is
  enforced. The first reduction milestone is 250 KiB gzip and currently warns;
  200 KiB remains the eventual architectural target. Do not trade familiar UI,
  canonical correctness, or honest transfer accounting for an arbitrary
  one-number reduction.
- Initial-route CSS: at most 40 KiB gzip.
- Initial source-locale fonts: at most 250 KiB transferred. Additional
  script-specific fonts and locale catalogs are lazy and separately budgeted.
- Initial shared locale catalog: at most 30 KiB gzip; an initial destination
  catalog is at most 20 KiB gzip.
- No presentation long task over 50 ms during the 30-second initial-route
  interaction trace.
- P95 snapshot selection plus React commit: 8 ms desktop, 16 ms mobile.
- P95 visible command feedback: 100 ms after activation, even when canonical
  completion remains pending.
- Web Vitals acceptance target: INP at most 200 ms, CLS at most 0.1 and LCP at
  most 2.5 seconds at the 75th percentile across the fixed local/CI trial set
  for each representative viewport and device tier. This is a synthetic
  regression gate, not a requirement to collect real-user measurements.
- In a repeatable Chromium test build with explicit garbage collection, retained
  JavaScript heap after the 30-minute foreground soak is no more
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

Run `npm run report:initial-request-bundle` from the repository root. It creates a fresh
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
- Retain unit tests where a pure boundary contains meaningful branching or a
  durable compatibility rule. TypeScript shapes, static catalog contents,
  pass-through wrappers and private formatting details do not require their own
  exhaustive suites.

### Component and integration

- Prefer production-boundary and gameplay-flow tests over exhaustive component
  markup assertions. Add focused semantic interaction coverage when changing a
  player-visible behavior that is not already protected by a canonical command,
  application, persistence or packaging contract.
- Drive any component test through the unified UI runtime port. Assert commands,
  revisions and coordinator results, not reimplemented economy outcomes.
- Browser accessibility acceptance remains responsible for representative
  viewport, keyboard, focus, motion, contrast and overflow evidence. Do not
  duplicate every stable component state in jsdom.
- Verify subscription cleanup, one active-time driver and no overlapping
  `advanceActive()` calls under delayed promises.
- Verify two simultaneous pointer IDs, rapid taps, pointer cancellation, lost
  capture, scroll preservation and absence of accidental text selection or
  duplicate compatibility-click commands.

### End to end

Exercise a production build in a real browser for:

- cold start to the ready Bots route;
- single and hold/repeat/release Tinker behavior, including keyboard-only
  activation;
- basic-facility visibility, preview and purchase through canonical commands;
- production-IndexedDB checkpoint and reconstruction of canonical gameplay
  state;
- simultaneous-open safe writer blocking;
- expanded LTR `en-XA` and mirrored RTL `ar-XB` design checks through the test
  locale registry;
- the approved compact, compact-landscape, medium and wide geometry; and
- reduced-motion and keyboard-focus behavior.

Name every engine, viewport, and device actually exercised. Persistence tests
use the production IndexedDB adapter and reconstruct a new application
instance; an in-memory repository is permitted only in focused unit tests.
Release certification must exercise physical mobile lifecycle, touch,
persistence, store, browser-engine, zoom, and assistive-technology requirements
in their named real hosts.

Capture visual regression baselines at 320×568, 390×844, 768×1024 and 1440×900,
plus one compact landscape viewport. Baselines compare the current approved
product design. Keep gameplay assertions separate from visual baselines.

Each product change runs the focused backend and UI checks affected by its
scope plus production build, localization, and rendered-browser review.
Broader suites run at integration/release boundaries or when a shared contract
changes; raw test count is never an acceptance criterion.
