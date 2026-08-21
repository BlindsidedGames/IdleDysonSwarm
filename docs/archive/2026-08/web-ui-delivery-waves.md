# Web UI delivery waves

Status: Bots/Dyson design baseline accepted. The user opened implementation on
2026-07-29; Waves 1 through 3 passed their gates during the initial delivery,
and Wave 4 passed its narrowed Bots-baseline gate on 2026-07-30. Later gameplay,
host and release work remains governed by the explicit deferrals below.

Scope decision (2026-07-30): Wave 4 now checkpoints a high-quality Bots/Dyson
design baseline. It does not attempt to complete Unity migration UI, every
native/browser host gate or later gameplay destinations. The explicit
deferrals below are sequencing decisions, not waivers or certification claims.

This plan controls how the product foundation in
[`product-ui-foundation.md`](../../contracts/product-ui-foundation.md) is delivered. The product
foundation remains authoritative for behavior, interaction, visual,
responsive, accessibility, performance and testing standards. This file adds
work ownership, review order and recovery checkpoints; it does not relax any
product requirement.

## Completion target

Deliver the earliest playable browser/PWA Bots slice described by the product
foundation: Tinker, early facilities, Info, one production line, building buy
settings and Bot Distribution in the familiar Unity shell. All active time,
platform phases and player commands flow through
`CanonicalLifecycleCoordinator`. UI and platform adapters consume canonical
snapshots, previews and command results and never reproduce gameplay rules.

The baseline starts fresh from the authenticated first-run artifact. Optional
manual text-string import may remain as a recovery/support route. No file
picker, drag-and-drop target or first-run Unity migration UI is required for
this checkpoint. Steam/native discovery of the known existing save directory is
separate host integration.

Production analytics, remote crash reporting and real-user monitoring remain
outside this goal.

The current canonical mapping manifest deliberately keeps release writes
disabled. These waves therefore use an explicitly isolated browser-development
save profile and retain imported originals for recovery/export. Wave completion
does not certify canonical Unity-save overwrite, release migration, or native
host release readiness; those remain separate backend/host gates.

## Coordination rules

- The coordinator owns task boundaries, shared contracts, integration and final
  acceptance. A subagent completion report means ready for review, not accepted.
- At most three bounded subagent tasks run concurrently. Parallel tasks must
  have independent dependencies and disjoint file ownership.
- Each implementation stream uses an isolated branch and worktree based on the
  last accepted wave checkpoint. Agents do not merge, rebase, push, publish or
  deploy.
- Central composition, lifecycle coordinator, shared runtime-port contracts,
  package configuration and these governing plans have one writer at a time.
- Every candidate reports changed files, contract decisions, validation
  evidence and unresolved risks.
- The coordinator inspects the complete diff, traces central callers, verifies
  canonical-boundary compliance and reruns proportionate tests before
  integration.
- Focused checks are the default for bounded UI work. Full-suite counts are
  historical evidence, not a target and not something to rerun after every
  visual correction.
- High-risk lifecycle, persistence, save-safety, ownership and command-routing
  changes receive an additional adversarial review when their failure modes
  cannot be exhausted by deterministic tests alone.
- Work that fails review returns for correction or is discarded. No later wave
  begins on an unaccepted dependency.

## Reasoning allocation

- Use frontier/xhigh reasoning for persistence, single-writer ownership,
  lifecycle and clock behavior, active time, recovery and command routing.
- Use frontier/high reasoning for security boundaries, localization,
  bidirectionality, accessibility architecture and cross-platform contracts.
- Use balanced/high reasoning for reusable components, responsive layout and
  interaction implementation.
- Use balanced/medium or high reasoning for bounded fixtures, mechanical tests,
  documentation and repeated component expansion after the pattern is accepted.
- Raise the reasoning level when review exposes ambiguous ownership, concurrency
  or state-transition behavior; do not compensate for ambiguity with more
  parallelism.

## Checkpoint and recovery protocol

The integration branch receives one detailed checkpoint commit only after each
wave passes its gate. A local recovery tag points to that accepted commit so the
checkpoint remains stable without writing its own hash into the document.

| Checkpoint | Required state | Local recovery tag |
| --- | --- | --- |
| Pre-wave | Approved foundation and delivery-wave plans; no product UI | `web-ui-pre-wave` |
| Wave 1 | Accepted contracts, platform foundation and verification harness | `web-ui-wave-1` |
| Wave 2 | Accepted application seam and lifecycle-driven shell states | `web-ui-wave-2` |
| Wave 3 | Accepted playable Tinker/basic-facility slice | `web-ui-wave-3` |
| Wave 4 | Accepted Bots/Dyson design baseline with explicit host/release deferrals | `web-ui-wave-4` |

If a later wave has a catastrophic architectural or correctness failure:

1. Preserve the failing branch and evidence for diagnosis.
2. Return to the last accepted checkpoint in a new recovery branch/worktree.
3. Amend the affected task brief or contract with the diagnosed failure mode.
4. Repeat only the failed wave and its downstream validation.
5. Never rewrite or destructively reset an accepted checkpoint.

Checkpoint commits are local recovery anchors. Push, pull request, deployment
and release remain separately authorized operations.

## Wave 1: contracts and infrastructure

Run independent work in parallel where file ownership permits:

- Platform foundation: IndexedDB repository, single-writer ownership lease,
  persistent-storage/quota behavior, periodic checkpointing, browser
  lifecycle/clock, import/export, clipboard and external-link ports.
- Verification foundation: freeze the canonical first-slice fixture and create
  contract, lifecycle, multi-owner, import-ceiling and integration harnesses.
- Presentation foundation: localization runtime and typed locale registry,
  English/source and pseudo catalogs, locale-aware formatters, script-aware font
  routing, semantic tokens and accessible shared-component contracts.

Gate:

- All candidates pass coordinator diff and architecture review.
- Platform actions are composed behind a unified runtime-foundation port and
  lifecycle coordinator. Wave 2 extends that private foundation with the
  product snapshot, command and active-time surfaces.
- Persistence, ownership, quota, recovery and localization contracts have
  deterministic tests.
- No product gameplay screen or duplicate gameplay calculation is introduced.

Accepted on 2026-07-29:

- Coordinator review and a separate adversarial review accepted the bounded
  import, persistence, lease, lifecycle and runtime-composition paths.
- Two rejected runtime candidates were corrected before acceptance: imported
  historical timestamps now remain suppressed until a successful locally
  stamped lifecycle save establishes a new replay baseline.
- The combined integration passed 692 tests across 87 files, strict lint,
  localization generation, the 559-asset/34-type data drift check, the
  canonical first-slice fixture check, production build and diff validation.
- The accepted commit is identified by the local `web-ui-wave-1` recovery tag.

## Wave 2: application seam

Keep the central path serialized:

- Generate an authentic Unity schema-12 first-run save artifact and provenance
  manifest through the production preparation/codec path; add normalized
  Unity-to-Web parity and reconstruction tests.
- Add the backend-owned first-run save and production application factories,
  sourcing event context and per-save/host entitlements from existing
  authorities rather than UI constants.
- Implement the active-time driver.
- Implement the frozen-snapshot external store.
- Implement the command-envelope/dispatch adapter and standard result handling.
- Add startup, blocked, ready, recovery and top-level error-boundary states.
- Add production CSP and locally redacted diagnostics.

Gate:

- Adversarial review covers duplicate active time, stale revision rendering,
  command overlap, failure-path mutation and multi-owner transitions.
- A new empty browser profile starts from the authenticated Unity artifact,
  checkpoints through the fenced development repository and reconstructs
  identically without requiring a player import.
- Every player command and active-time advance is demonstrably routed through
  `CanonicalLifecycleCoordinator`.
- Render failures cannot mutate, replace, retry or reset canonical state.
- Focused tests and the full applicable backend/frontend suites pass.

After acceptance, create and record the Wave 2 checkpoint.

Accepted on 2026-07-29:

- The authenticated first-run input is a Unity-generated schema-12 `IDB1`
  artifact with checked provenance, decoded-binary and catalog hashes. An empty
  development profile reconstructs the same canonical gameplay snapshot and
  stored save without requiring player import.
- Production composition reads host entitlements explicitly, uses the mobile
  lifecycle policy for browser background and focus loss, derives diagnostic
  schema metadata from Unity provenance and constructs/starts one runtime
  outside React lifecycle effects.
- Coordinator and adversarial review rejected unsafe intermediate candidates.
  Corrections cover delayed lifecycle receipts, redundant departure stamps,
  failed replay baselines, blocked-start recovery, overlapping imports, newer
  background/focus intents, ownership loss, pending action guards, redacted
  localized failures and accurate recovery/export copy.
- The accepted integration passed 798 tests across 103 files, strict lint,
  TypeScript, localization extraction and pseudo-catalog compilation, the
  559-asset/34-type data drift check, production CSP packaging, developer
  decoder entry exclusion, production build and diff validation.
- The accepted commit is identified by the local `web-ui-wave-2` recovery tag.

Performance carry-forward, not Wave 2 acceptance:

- The accepted production shell loads 273,419 gzip bytes (267.01 KiB) of
  JavaScript including the selected English catalog, exceeding the 200 KiB
  first-slice budget by 67.01 KiB or 33.5 percent. CSS is 2.37 KiB gzip and the
  English catalog is 1.30 KiB gzip, both within their individual budgets.
- This does not waive or pass first-slice performance. The current excess is
  mainly the eager full canonical runtime, generated Unity catalog and
  later-destination command/preview breadth, not the authentic first-run
  artifact or startup presentation.
- Wave 3 must add a repeatable initial-request bundle report and reduce the
  authoritative runtime dependency breadth before presentation expansion.
  Moving the same eagerly required modules into manual chunks is not a fix.
  Runtime-data projection or loading-boundary work must retain arbitrary save
  import, lifecycle replay, parity and coordinator authority.

Wave 3 packaging correction:

- Post-checkpoint inspection found that Vite still copied the retired decoder's
  four public save-fixture duplicates even though no production entry requested
  them. Wave 3 removes those public copies and adds a regression guard; the
  authoritative equivalents remain under `Web/test/fixtures` for tests.

Wave 3 performance-foundation evidence:

- The enforced manifest-based report now measures every static initial request
  plus the awaited English catalog using actual gzip bytes. There is no
  report-only budget bypass.
- The canonical runtime consumes a deterministic 371-asset transport projection
  while the complete 559-asset provenance catalog and migration artifacts
  remain byte-stable and continue to pass Unity-data drift validation.
- The combined production entry and awaited English catalog measure 199,769
  gzip bytes (195.09 KiB), 5,031 bytes below the 200 KiB gate. CSS measures
  2.37 KiB and the English catalog 1.30 KiB.
- Independent adversarial review audited every current production catalog
  consumer and reference target. Before a later gameplay destination introduces
  new catalog fields, strengthen the allowlist-completeness guard with an
  independently typed per-kind consumer contract rather than relying only on
  exporter-derived field equality.

## Wave 3: earliest playable slice

Run presentation work in parallel only after the application seam is accepted:

- First close the recorded JavaScript-budget architecture gap with an
  authoritative generated runtime-data projection and/or narrow first-slice
  snapshot and command-loading boundary. Preserve Unity-data drift checks,
  arbitrary supported save import and all coordinator routes.
- Responsive LTR/RTL shell, parity navigation skeleton and resource header.
- Pointer, rapid-touch, multi-touch and keyboard Tinker interaction.
- Basic facility list using canonical previews and purchase commands.
- Slice-level end-to-end, component, accessibility, responsive visual and
  performance coverage.

Gate:

- Tinker and facility actions use canonical runtime facts and commands only.
- Checkpoint/reconstruction continuity preserves the accepted canonical state.
- Compact, medium, wide and compact-landscape layouts pass the approved
  references without text selection or gesture interference.
- Keyboard, screen-reader, rapid-touch and independent multi-touch paths pass.
- Focused affected tests pass. Broader integration suites run when shared
  runtime, persistence or lifecycle contracts change and at final integration.

After acceptance, create and record the Wave 3 checkpoint.

Accepted on 2026-07-29:

- The ready route renders only backend-authored visibility, Tinker presentation,
  resource/rate, production-summary and facility-preview facts. Hidden
  facilities are absent, and the single teaser still follows its independent
  canonical fact. The complete Bot Distribution region, including its
  read-only facts, remains deferred until its canonical controls and player
  commands are in scope.
- Tap, rapid tap, independent pointer, Space hold, Enter activation, blur,
  cancellation and unmount paths route serialized player commands through the
  runtime dispatcher. The 500 ms hold threshold is interaction-only; the UI
  neither advances time nor awards progress.
- Named-facility presentation loads only after the canonical visibility list
  authorizes a named facility. Fresh remains immediately playable while the
  enforced initial JavaScript request is 199.22 KiB against the unchanged
  200 KiB cap; CSS is 3.98 KiB and the awaited English catalog is 2.49 KiB.
- Coordinator review plus independent parity, quality and visual reviews
  rejected intermediate gameplay-rule duplication, a repeat-release revision
  race, stale facility feedback, no-op navigation, inaccurate Info/sun
  references, compressed wide cards and an unconditional Fresh teaser.
- The accepted integration passed 866 tests across 110 files, strict lint,
  TypeScript/production build, localization extraction and pseudo-catalog
  compilation, the 559-asset/34-type data drift check, canonical fixture
  reproducibility, the enforced bundle report, diff validation and real-browser
  wide/compact/minimum-width review.
- The accepted commit is identified by the local `web-ui-wave-3` recovery tag.

Performance history and current posture:

- The Wave 2 and Wave 3 byte counts above remain useful historical evidence.
  The 2026-07-30 scope decision makes the former 200 KiB JavaScript threshold a
  provisional optimization target while the recognizable Bots baseline is
  established.
- The current checkpoint still records production bundle size and must not add
  component timers, full-tree per-frame rendering, leaking subscriptions or
  gameplay work in the UI. Longer Web Vitals, heap-soak and physical-device
  certification remain performance-review/release work, not a reason to block
  the current visual correction or rerun hundreds of unrelated tests.

## Wave 4: Bots/Dyson design-baseline checkpoint

- Review the integrated Bots route against the approved Unity-relative product,
  interaction and visual baseline, correcting unapproved content, visibility or
  interaction changes without adding later destinations.
- Prove production-IndexedDB checkpoint and reconstruction, safe simultaneous
  writer blocking, bounded periodic checkpointing and lifecycle-coordinator
  routing. A temporarily blocked refresh is acceptable at this checkpoint only
  when the prior writer cannot continue writing and the last verified save
  remains protected.
- Keep any manual-text recovery route optional, bounded and non-destructive.
  Do not add file-picker, drag/drop or first-run migration UI to satisfy this
  wave.
- Run expanded LTR/RTL design checks, required responsive geometries,
  keyboard/focus and reduced-motion acceptance in the locally available current
  browser projects, naming exactly what was exercised.
- Record the initial-request bundle and perform a focused interaction/runtime
  sanity check. The former 200 KiB JavaScript threshold is provisional while
  the Bots baseline is being established; freeze the reviewed warning and hard
  ceiling only after representative-device profiling.
- Verify production packaging excludes developer fixtures and respects CSP.

Gate:

- The Bots/Dyson route has traceable evidence for canonical behavior, approved
  content/visibility, responsive layout, keyboard/focus, reduced motion,
  production persistence and measured performance. The provisional JavaScript
  target is reported, not relabeled as passing.
- No unresolved critical or high-severity Bots-baseline correctness, data-loss,
  gameplay-authority, security, design, accessibility-foundation or performance
  issue remains.
- Deferred host/release gates are listed explicitly and are not skipped tests,
  exceptions or implied passes.
- The integration branch is clean and every suite applicable to this narrowed
  baseline passes. A deferred real-host matrix is not relabeled as applicable.

Accepted checkpoint evidence (2026-07-30):

- Canonical Tinker, distribution, buy-mode and facility purchase commands, plus
  active-time progression, remain routed through the runtime/lifecycle
  coordinator. The UI consumes published snapshots, previews and results.
- Production-composition persistence evidence fires and coalesces the real
  periodic checkpoint scheduler, blocks a second writer, releases ownership
  and reconstructs the accepted gameplay state through a fresh IndexedDB
  wrapper and application composition.
- Recovery uses a labeled bounded manual save-text field with explicit
  overwrite confirmation. File-picker and drag/drop UI are absent.
- The coordinator integration set passed 116 focused tests across 11 files
  after correcting stale full-slice fixtures found during integration review.
  TypeScript, lint, localization, CSP, production packaging and diff checks
  passed.
- Chromium in-app-browser review covered 320x568, 390x844, 844x390, 768x1024,
  1023x768, 1024x768 and 1440x900 CSS viewports with zero document-level
  horizontal overflow. The compact drawer focus/inert/Escape restoration and
  the 1024-pixel persistent-rail boundary were exercised.
- The production report measured 208.41 KiB gzip boot JavaScript as a
  provisional warning, 213.35 KiB after the fresh Bots facility chunk,
  7.45 KiB gzip CSS, 3.86 KiB gzip English catalog and 230.21 KiB transferred
  source-locale fonts. Enforced CSS, locale, font, fixture-exclusion and
  commit-probe checks passed.
- Detailed accessibility/responsive results and remaining certification limits
  are recorded in
  [`wave-4-accessibility-responsive-evidence.md`](wave-4-accessibility-responsive-evidence.md).
- The accepted commit is identified by the local `web-ui-wave-4` recovery tag.

Explicit deferrals after the Wave 4 checkpoint:

- File-picker, drag-and-drop and first-run Unity migration UI. Optional manual
  text-string recovery may remain.
- Steam/native discovery of the known existing save directory, retained mobile
  containers, signing, packaging and native lifecycle certification.
- Immediate native-refresh and explicit tab-handoff acceleration. Atomic lease
  fencing, safe blocked contexts, orderly release, lease-expiry recovery and
  no-double-writer protection are not deferred.
- Complete current/previous-major supported-browser and embedded-engine
  certification, physical iOS/Android certification and named
  assistive-technology testing, including exact zoom/text-resize certification.
  Evidence must name only environments actually exercised.
- Full production-host quota, update, crashed-owner and recovery matrices.
  Deterministic safety tests and last-verified-save protection remain required.
- Research, Skills, Infinity and every later gameplay or support destination.

After acceptance, create and record the Wave 4 checkpoint. Report the completed
Bots/Dyson design baseline and its deferrals for user review; do not push,
deploy, claim release certification or begin later gameplay destinations.

Current visual checkpoint (2026-07-30):

- The familiar side/bottom navigation shell, Unity-relative resource header,
  extracted inline Science symbol, reduced swarm, bottom-anchored Tinker panel,
  exact fresh-save copy/tip, cohesive Info and buy settings, one worker
  production line and complete Bot Distribution control are checkpointed.
- Buy mode, rounded bulk buying, distribution and Tinker remain canonical
  commands; active time remains lifecycle-coordinator owned.
- The production build measures approximately 208.8 KiB gzip JavaScript and
  7.0 KiB gzip CSS. This is evidence for the pending performance-budget review,
  not a failure of the visual checkpoint and not a release-performance pass.

Parity corrections queued after the checkpoint:

- Keep the canonical `????` next-tier teaser visible from a fresh save and
  after each named early facility until the snapshot explicitly hides it.
- Keep facilities/teaser above Tinker while Tinker remains anchored near the
  lower controls; Manual Labour visibility remains snapshot-owned.
- Use the Unity three-digit truncated number presentation throughout the Bots
  surface and interpolate Tinker progress visually between authoritative
  snapshots without advancing gameplay.
- A future Settings control may hide the decorative swarm and reclaim its
  layout space. Dynamic orbit density remains deferred until it can consume a
  published canonical fact.
