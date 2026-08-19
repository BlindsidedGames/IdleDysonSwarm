# Web release readiness plan

Status: implementation in progress; Phases 0 through 5 complete

Recorded: 2026-08-19 AEST

Scope: restore and prepare the Web build for deployment. Android and iOS
testing, native accessibility certification, native lifecycle testing, native
store certification, thermal testing and battery testing are explicitly out of
scope. They will be planned later, after the Web build is accepted.

The post-icon-conversion performance baseline is recorded in
`docs/web-performance-baseline-2026-08-19.md`.

## Implementation progress

- Phases 0 and 1: checkpoint and test foundation completed in `87363528`.
- Phase 2: Stored Time domain ownership completed in `a4e5b6c7`.
- Phase 3: frontend presentation isolation completed in `a2eca0e8`.
- Phase 4: Skills presentation stabilization completed in `09d5fc98`.
- Phase 5: bundle separation completed and independently reviewed. Boot
  JavaScript fell from 300.03 KiB to 282.61 KiB gzip and boot CSS fell from
  19.16 KiB to 12.46 KiB gzip. The 250 KiB milestone remains future work; the
  report now distinguishes initial page loading from the PWA precache package.
- Phase 6 code and automated coverage are complete and independently reviewed.
  Its real-browser contrast, focus-paint, text scaling, 400 percent zoom,
  320/390 px reflow and touch checks remain deliberately unpassed and are
  retained as Phase 9 acceptance work. No Android or iOS testing has been
  added to scope.
- Phase 7 is complete and independently reviewed. Ordinary development uses a
  provider-free deterministic five-product Store; `dev:stripe` retains the
  explicit real-endpoint integration path; production output is checked for
  Stripe presence and development-adapter absence. Native adapters were not
  changed.
- Phase 8 fixture, harness and Stored Time work is complete and independently
  reviewed. Nine immutable, production-valid progression saves and their
  hashes are checked in. The same mature save certifies 1-hour, 24-hour,
  1-week and maximum persisted-valid 64-day Stored Time spends. The browser
  route matrix is reproducible and records an explicit blocked result because
  local Chromium still closes its DevTools connection; route timing figures
  remain unclaimed and must be collected when that environment issue clears.
- Phase 9 automated Web verification is complete and independently reviewed.
  Production save/backup recovery, PWA install/offline/update survival, Store
  boundaries, dependency audits, the 18-profile/186-route matrix, interaction
  budgets, automated accessibility/reflow gates and the 30-minute explicit-GC
  soak all pass. Manual visible-focus paint, complete visual contrast, 200%
  visual appearance, browser-native 400% zoom and screen-reader behavior remain
  required before deployment. No deployment or push has been performed.

## Preparation already completed

- Rewrote the Version 3 patch notes as individually formatted player-facing
  changes rather than an engineering port history.
- Converted the Avotation meditation image from a 2,583,470-byte PNG to a
  92,238-byte transparent WebP.
- Converted all 104 Web skill icons from 2084 by 2084 Unity PNG sources to
  deterministic 256 by 256 transparent WebPs. The Web payload fell from about
  6.33 MB to 665,170 bytes while the exporter retains Unity source hashes.
- Added reproducible focused and wide runtime-lane benchmark commands.
- Recorded the post-conversion baseline and exact save identity.

## Phase 0: intentional checkpoint

1. Inventory every modified and untracked file.
2. Separate intended product changes from local backups, migration snapshots,
   browser profiles, benchmark output and generated distributions.
3. Run the scoped checks for the existing UI and asset work.
4. Create an intentional checkpoint commit after its exact contents are
   reviewed. Do not push or deploy unless separately authorized.

## Phase 1: repair the test foundation

1. Add the real `resources.time` shape to the shared App test snapshot,
   including Stored Time availability, capacity and Double Time.
2. Assert the Offline Time navigation meter against that fixture.
3. Remove the Node parity script's dependency on Vite-only
   `import.meta.env.PROD` by giving the projection freeze policy an explicit,
   safe environment boundary.
4. Retain all 104 owned skills in the mature performance fixture, but change
   the separate Infinity permanent-skill purchase count from the invalid 200
   to a valid value from 0 through 10.
5. Make every benchmark fixture pass the normal production validator without
   temporary overrides.

Acceptance: complete tests, Node parity, data checks and production build pass.

## Phase 2: correct Stored Time domain ownership

Stored Time continues to process Bots, money, science, Research automation,
goal and Skill rewards, and Infinity production and resets.

Stored Time must no longer process Dream or Simulations production, education,
conversions, automation, railguns or resets. It must not progress Reality
workers. Their separate banks and offline mechanics remain intact.

Implement this as an explicit event-model domain policy. Do not create a second
simulation engine or alter normal active-play behavior.

Acceptance includes invariant Dream and Reality state, advancing intended
domains, preserved bank/cancellation semantics, and representative one-hour and
24-hour runs. Run one-week and maximum-bank stress tests only after the domain
correction.

## Phase 3: isolate frontend presentation work

Keep the authoritative 100 ms gameplay cadence unchanged. Split presentation
subscriptions into a small global header/navigation slice, an active-route
slice and stable destination-specific slices. Retain stable object identity
when a slice's meaningful data did not change.

Derive Dream, Reality, Simulations and other destination data only when needed
by the active destination or a genuine global unlock transition. Coalesce
presentation publications to at most one per animation frame when several
canonical results arrive together. Let progress visuals interpolate between
authoritative anchors without restarting for unrelated state changes.

Acceptance: no gameplay time or precision changes, active-route values remain
current, unlock transitions remain immediate, saves remain authoritative, and
the same lane benchmark shows reduced projection and React work.

## Phase 4: stabilize the Skills presentation

1. Give the graph a slice that changes only for ownership, availability,
   unlocks, relevant points, queue state and presets.
2. Update the points and queue summary independently from the graph.
3. Precompute node positions, dependencies and connector paths once per
   catalog and locale.
4. Memoize unchanged nodes and connectors.
5. Coalesce pan and pinch input to one equivalent transform per animation
   frame.
6. Keep all approximately 104 nodes rendered; do not add viewport culling.
7. Preserve exact paths, styling, zoom behavior, selection, search, keyboard
   navigation and focus behavior.

Acceptance: fixed pan and zoom screenshots and connector geometry match,
ordinary cash and science updates do not rebuild the graph, interaction tests
pass, and Skills projection and React timings improve.

## Phase 5: bundle composition and lazy loading

1. Treat approximately 300 KiB compressed as the temporary startup
   no-regression ceiling.
2. Generate a bundle composition report.
3. Move appropriate destination-only code out of the boot graph without
   introducing visible navigation stalls.
4. Target 250 KiB compressed first and retain 200 KiB as the longer-term goal.
5. Reduce actual startup work; do not use obscure minifier tricks merely to
   satisfy a number.

## Phase 6: pragmatic Web accessibility

Add automated coverage for Skills, Store, Settings, Debug, Offline Time and
recovery dialogs. Manually check keyboard reachability, visible focus, modal
focus containment and restoration, field labels, editable controls, reduced
motion, contrast, 200 percent text, 400 percent zoom, 320 and 390 CSS pixel
layouts, touch targets and rapid-touch protection. Recheck the global text
selection policy.

Physical TalkBack, VoiceOver and native WebView testing are out of scope for
this Web plan.

## Phase 7: safe development Store mode

Add a development-only Store adapter behind the existing shared Store
interface. It may return the real five-product catalog and simulate purchase
success, cancellation, failure and restore, but must never contact Stripe or
create a real charge.

Production Web continues to select Stripe. iOS StoreKit and Android Google Play
adapters remain untouched. Production builds must be unable to select the fake
adapter accidentally. Retain a separate local integration path for testing the
real Stripe endpoint.

## Phase 8: trustworthy progression fixtures and matrix profiling

Create deterministic, production-valid fixtures for fresh play, mid-swarm,
first Infinity, mature Infinity, Reality unlock, mature Simulations, Quantum
unlock, late Quantum and maximum valid Skill ownership/upgrades.

Rerun every reachable destination at desktop and mobile Web viewports. Capture
runtime lanes, main-thread tasks, long tasks, cold-route loading, DOM and
listener counts, console errors, page errors and horizontal overflow. Rerun
Stored Time, save import/export and reconstruction using the appropriate
fixtures.

## Phase 9: Web release verification

Validate repository and current production saves, migrations, verified backup
restoration, export/import, supported Unity import, malformed rejection,
lifecycle recovery and application-update survival.

Validate PWA installation, repeat load, offline reload, update detection,
checkpoint-before-activation, old service-worker replacement and game/Stored
Time worker build identity.

Validate the Web Store catalog, development outcomes, real endpoint
availability, cancelled and failed checkout, entitlement refresh and an unpaid
checkout flow.

Run the production interaction trace and repaired 30-minute explicit-GC soak
last. If either fails, create focused corrective work, rerun the affected gates,
and repeat the final check. The release candidate must finish with a production
build, complete tests, parity, localization, accessibility, performance,
bundle, dependency-security, PWA, save and clean-repository audit. Do not apply
automatic breaking dependency fixes without reviewing their product impact.
Reconcile the changelog to include only work actually delivered and measured,
then commit and push the exact reviewed SHA before deployment.
