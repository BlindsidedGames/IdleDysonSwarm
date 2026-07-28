Original prompt: Create a separate `Idle Dyson Swarm Web` project beside the Unity project, set up the TypeScript web stack, and determine whether existing Odin saves can be decoded directly without user intervention.

## Current goal

- Preserve automatic compatibility with existing `IDB1:` saves.
- Complete the gameplay port behind framework-independent boundaries.
- Define and approve product, design, interaction and performance contracts
  before creating another product frontend.
- Treat the existing simulation and performance work as complete for the
  current stage. Revisit discretionary tuning after the full port is complete.

## Progress

- Created the React + TypeScript + Vite scaffold.
- Located canonical schema 8 and support schema 0/10/11 `IDB1:` fixtures.
- Downloaded the Apache-2.0 Odin Serializer source for binary protocol reference.
- Implemented direct base64, gzip, and Odin binary decoding in TypeScript.
- Implemented object, array, list, dictionary, primitive-array, type-table, and
  internal-reference materialisation.
- Added a standalone read-only `npm run decode-save` command.
- Unit tests pass for schema 0, 8, 10, and 11 fixtures, including exact schema 8
  money/date/Infinity Point sentinels.
- Decoded the current local schema 12 save in place with complete stream
  consumption. The live save was not copied into this project.
- Added and visually inspected the browser compatibility laboratory. Playwright
  confirmed schema 10 and 11 fixture selection with matching text state and no
  decoder error.
- `npm test`, `npm run lint`, and `npm run build` pass.
- Defined a React-independent `SimulationEngine` boundary without implementing
  moving tick semantics.
- Added a deterministic Unity YAML exporter. It currently emits 559 assets
  across 34 concrete types, resolves internal GUID references to stable IDs,
  includes source hashes, and reports no duplicate kind/ID pairs.
- Exported compact legacy skill/research ID maps and skill dependency/exclusive
  data used by migration.
- Ported current root/Dyson shape normalization, packed settings flags,
  stable-ID skill ownership/state/bitsets, preset dependency ordering, stable
  research levels, legacy skill timers, Avocado data, mega-structure data,
  sparse facility arrays, Avotation state, and Mathematics parity.
- Ported the numeric repair contract, derived production invalidation,
  authored bounds, stored-time caps, bot-cap handling, and finite graph
  validation.
- Added precision-preserving `IDSWEB1` serialization for 64-bit integers and
  byte arrays.
- Added a platform-neutral transactional save repository that verifies temporary
  writes, atomically promotes the new save, and retains the original Odin file
  as recovery material.
- Added executable save migration parity cases and a schema/tooling contract for
  post-overhaul Unity simulation golden masters.
- Added platform contracts and an evidence-backed inventory for save discovery,
  lifecycle, Steam, mobile display/touch, audio, clipboard, links, preferences,
  and currently inactive purchase/notification/cloud surfaces.
- All schema 0/8/10/11 fixtures decode, migrate to schema 12, repair, and
  validate.
- The current local schema-12 save passes the full preparation pipeline with
  zero numeric repairs. It was read in place and not copied.
- Current validation: `npm test` 23/23, `npm run lint`, `npm run build`, and
  `npm run data:check` pass.
- Created baseline commit `fc6f9ba` on `simulation-engine-port`.
- Added the active cross-platform simulation contract.
- Ported the exact event-time scheduler skeleton, including phase-preserving
  automation, queued input boundaries, deterministic Dream/bot-cap/Infinity
  ordering, cancellation/yield status, and post-boundary validation.
- Added initial scheduler characterization tests matching the Unity contract.
- Captured the first Unity golden master from reference commit `717e4bf`:
  no-skill Dyson production over two 0.1-second ticks.
- Ported the basic Dyson production chain using exported facility definitions.
  The port preserves Unity's intentional legacy `float` narrowing of authored
  base-production values with `Math.fround`.
- Added finite saturating arithmetic for continuous production arrivals.
- Added golden-master coverage for initial rates, one tick, two ticks and
  caller-state isolation.
- Ported Unity's ordered stat operations and an explicit first set of static
  skill effects from the exported catalog.
- Captured static-skill parity for Assembly Line Tree, Worker Efficiency and
  Supercharged Power. Uncharacterized dynamic/conditional skills fail closed
  instead of silently producing incorrect rates.
- Ported finite facility cost, Buy Max, configured Buy 1/10/50/100 modes,
  rounded bulk selection and atomic continuous debits.
- Captured Unity assembly-line transaction golden masters for Buy 1, Buy 10,
  rounded Buy 10 and stored-time forced Buy Max. The saved active mode remains
  unchanged by forced stored-time purchases.
- Ported the pure durable Infinity reset transition: saturating IP reward,
  ordinary/Break statistics, run wipe, retained starts, skill-point banking,
  offline-time rollover and bot-cap checkpoint clearing.
- Added parity cases matching the Unity transition tests for ordinary retained
  starts, Break reset, saturated IP and bot-cap completion.
- Captured Unity/Mono Infinity trigger values at reference commit `717e4bf`.
  The target-100 Break boundary with both x2 rewards requires a base reward of
  25 and was `8.658974649122703e33` bots in Unity.
- Integrated ordinary and Break Infinity into the exact TypeScript event model:
  division thresholds, slider-to-bot reachability, actual reward evaluation,
  both x2 flags, the 1/60-second minimum cycle, between-clock threshold events,
  queued slider changes, run-state wipe, durable reward/stat updates and
  derived-rate rebuild.
- Kept the port modular by separating stable Dyson facility identity from the
  Infinity-cycle policy/reward/reset adapter; `dysonModel.ts` remains the
  production/scheduler integration layer rather than accumulating every reset
  rule.
- Ported the exact finite bot-cap special transition as an atomic web candidate:
  +1 finite legacy Overflow multiplier, +1,000 IP with saturation, then the
  ordinary or Break Infinity reward/reset. This remains separate from future
  gameplay Overflow design.
- Covered fresh finite-max arrival, persisted pending, persisted reward,
  saturated rewards, stale checkpoint rejection and both ordinary/Break
  variations. Unity confirmed the Break cap reward as base 489 / doubled 1,956.
- Imported Unity checkpoint flags resume without duplicating the special reward.
  The pure model produces one complete isolated candidate; connecting that
  candidate to the transactional save/publication boundary remains integration
  work.
- Normalized sub-epsilon floating endpoint remainders so completed segmented
  work is reported as complete.
- Unity's narrow Infinity golden probe passed and was removed afterward; the
  Unity working tree returned to only its pre-existing unrelated local files.
- Current validation: `npm test` 63/63, `npm run lint`, `npm run build`, and
  `npm run data:check` pass. Browser smoke tests decoded the historical support
  fixtures with matching text state, expected visuals and no console-error
  artifact.
- Replaced the decoder-only landing page with the first playable responsive
  game slice: the Bot tab.
- Added a pure Bot-tab adapter over the exact event-time Dyson scheduler. It
  preserves Unity's whole-bot worker/researcher rounding, 1% distribution
  slider steps, initial timed tinker action and shrinking early-game cooldown.
- Added live Money, Science, Bots, panels, allocation and production-rate
  presentation plus the five-facility chain.
- Wired Buy 1/10/50/100/Max and rounded bulk controls to the existing atomic
  facility transaction path. Facility cards show the rate of the resource each
  facility actually produces.
- Kept the Odin Save Compatibility Lab available as a separate developer
  navigation screen.
- Added deterministic `render_game_to_text` and `advanceTime(milliseconds)`
  browser hooks covering the playable state.
- Browser verification exercised tinker completion, a 75% researcher split,
  1,100 seconds of deterministic active simulation, an affordable Assembly
  Line purchase, canonical schema-8 decoding and a 390x844 mobile layout.
  The run produced no console or page errors.
- Current validation: `npm test` 75/75, `npm run lint`, `npm run build`, and
  `npm run data:check` pass. The production build retains a non-blocking Vite
  chunk-size warning; code splitting belongs in the broader port plan.
- Rebuilt the initial Bot-tab presentation from the actual Unity scene,
  `BottomButton` overrides, `Building.prefab`, authored icons and Lexend font
  rather than inferring a new dashboard. It now uses the original Bot palette
  (`#201721`, `#3F2F43`, `#CE6DD9`, `#D1B6D7`), permanent desktop menu,
  50-unit resource strip, two-column 125-unit facility grid, fixed Tinker
  panel, Bot Distribution/Solar Info row, assigned-worker row and icon-only
  bottom navigation.
- Preserved the original progressive facility reveals and moved Buy
  1/10/50/100/Max plus rounded buying under Tab Settings. The responsive web
  adaptation collapses facilities to one column and exposes the original menu
  as a working mobile drawer without changing the game information hierarchy.
- Final browser verification covered ten Tinker completions, distribution
  changes, deterministic advancement, a real Assembly Line purchase, the
  mobile Tab Settings popover and mobile menu drawer. It produced no console or
  page errors. Current validation remains `npm test` 75/75, `npm run lint`,
  `npm run build`, and `npm run data:check`; the Vite chunk-size warning remains
  non-blocking.
- Recoloured the remaining grey shell and disabled controls with the authored
  Bot purple family, and applied a consistent 7/10/14-pixel corner system to
  navigation, cards, controls, panels, popovers and feedback.
- Added a presentation-only smoothing layer for continuous counters. One shared
  `requestAnimationFrame` loop updates only registered text nodes, extrapolates
  no more than 125 ms from the latest canonical value/rate, and never mutates
  game state or causes per-frame full React renders. Progress bars use the same
  0.1-second linear visual bridge in CSS.
- The isolated browser measurement advanced exactly 1.0 simulated second
  through 11 observed canonical samples while the displayed Science counter
  changed 52 times. It rendered 121 headless frames with an average 8.33 ms gap,
  a maximum 9.3 ms gap and no console/page errors.
- Current validation: `npm test` 79/79, `npm run lint`, `npm run build`, and the
  earlier unchanged `npm run data:check` all pass. The existing non-blocking
  Vite chunk-size warning remains.
- Removed the playable Bot-tab experiment, its presentation adapter, smoothing
  layer and copied presentation assets. The slice proved integration viability
  but was not suitable as a product baseline because design, interaction,
  accessibility and performance contracts had not been established.
- Restored the browser entrypoint to a developer-only save compatibility
  diagnostic. It is not a product frontend.
- Added `docs/frontend-readiness-gate.md` to prevent another prototype from
  silently defining the product architecture or visual standard.
- Accepted the existing event-time simulation and performance work as complete
  for the current port stage. Further discretionary tuning is deferred until
  the full gameplay port is complete unless correctness or measured regression
  evidence requires earlier work.
- Normalized Unity asset source hashes and generated-output comparisons across
  LF and CRLF line endings so deterministic data validation produces the same
  result on every supported checkout.
- Added the versioned `TransactionalGameApplication` boundary with one-shot
  startup, separate state/durable revisions, serialized checkpoints and
  commit-first staged publication.
- Added truthful startup classification for healthy primary, recovered legacy,
  first run, unsupported future schema, invalid candidates and recovery-write
  failure. Required migration or repair writes are verified before readiness.
- Added application import/reload for Unity `IDB1` and canonical `IDSWEB1`
  saves. Import requires explicit overwrite approval, consumes the remote quit
  timestamp, commits before publication and installs a new clean session.
- Added the mapper session seam needed to serialize arbitrary engine snapshots
  and staged candidates while retaining every source-preserved field.
- Routed the Basic Dyson no-command golden fixture through the public
  transactional engine without claiming that slice is the canonical whole-game
  engine.
- Current headless validation: 127 tests, TypeScript checks, lint, production
  build and deterministic verification of 559 Unity assets across 34 types.
- Classified the remaining canonical Dyson integration inputs in
  `docs/canonical-dyson-parity-plan.md`: durable causes remain canonical,
  production/stat caches are reconstructed, legacy mirrors remain
  compatibility-only and platform entitlements stay outside player state.
- Added executable ownership coverage and round-trip proof for all ten durable
  research-automation selections.
- Extracted legacy-serialized Dyson tuning into a frozen compatibility input
  without adding balance coefficients to canonical player state.
- Added the first fail-closed canonical Dyson derivation. It matches Unity's
  neutral and characterized static-skill rate vectors, derives ownership only
  from stable skill state and reports typed issues for unported dependencies.
- Materialized all 14 Dyson research effects from canonical levels, preserved
  imported coefficients and exact secret overrides, with strict exported-asset
  contract validation.
- Ported the full 27-level secret buff table plus ordered Quantum, Infinity and
  Avocado effects. Canonical derivation now produces modifiers for all eight
  facilities while mega production remains explicitly gated.
- Current headless validation: 191 tests, TypeScript checks, lint, production
  build and deterministic verification of 559 Unity assets across 34 types.
- Added a strict Unity-database-ordered skill-effect materializer with exact
  ownership, facility-filter, condition, dynamic-replacement, per-level and
  identity-skip semantics.
- Ported the remaining dynamic skill formula families into pure resolvers:
  money/science, panels and panel lifetime, facility production/modifiers,
  planet generation, shoulders accrual and tinker yield.
- Characterized the prior-derived snapshot dependency cycles that must be
  preserved when these resolvers replace the temporary Basic Dyson skill
  helper; recalculation will read one immutable old snapshot and atomically
  publish the new derived snapshot.
- Current headless validation: 271 tests, TypeScript checks, lint, production
  build and deterministic verification of 559 Unity assets across 34 types.
- Isolated the Unity dynamic-skill recalculation caches into a frozen
  compatibility snapshot. They seed one recalculation but do not become
  durable canonical state.
- Ported all three mega-structure rates from exact exported definitions,
  including Unity float precision, Quantum gates and canonical modifiers.
- Added atomic full-chain production arrivals with no same-tick cascade,
  immutable unlock-aware mega purchases and canonical command adapters.
- Added the rotating eight-facility automation pass with sequential shared
  spending, per-target audit results and persistent start-index advancement.
- Current headless validation: 320 tests, TypeScript checks, lint, production
  build and deterministic verification of 559 Unity assets across 34 types.
- Replaced canonical derivation's temporary three-skill helper with the strict
  exported-database materializer and central dynamic resolver.
- Added pre-materialized effect maps to the Basic rate model, including planet
  generation and Money/Science per-second power effects.
- Rebuild and atomically publish Rudimentary Singularity, Pocket Dimensions,
  panel, lifetime, science, scientific-planet and manager-production snapshot
  values after each canonical recalculation.
- Added canonical research automation with ordinal rotation, shared science,
  all buy modes, prerequisites and repeatable-research discounts.
- Current committed-slice validation: 343 tests plus TypeScript checks, lint,
  production build and deterministic verification of 559 Unity assets across
  34 types.

## TODO

- Map the remaining Unity gameplay systems and build a clean,
  dependency-ordered headless port plan.
- Complete the remaining early-game tinker behavior in the headless model.
- Expand Unity golden masters into research behavior.
- Route canonical research and eight-facility automation commands through the
  transactional application scheduler.
- Port Infinity skill auto-assignment and the remaining dynamic derived-state
  rebuilding.
- Port Dream and Reality models after Dyson exact parity is established.
- Defer optional projection and performance work until the full gameplay port
  is complete.
- Compare normalized migration output field-by-field against a Unity-generated
  schema-12 snapshot before enabling writes in a release build.
- Implement and device-test Electron and Capacitor filesystem/lifecycle adapters,
  including automatic legacy file discovery under the retained app identity.
- Implement Steam main-process adapters and physical iOS/Android migration
  certification.
- Satisfy `docs/frontend-readiness-gate.md` before implementing a replacement
  product frontend.
- Remove bundled support fixtures from production packaging after diagnostics.
