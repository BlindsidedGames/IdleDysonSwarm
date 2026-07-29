# Web UI delivery waves

Status: implementation in progress. The user opened implementation on
2026-07-29, and Waves 1 and 2 passed their acceptance gates on the same date.
Wave 3 is the current delivery boundary. Later-wave acceptance remains governed
by the gates and recovery checkpoints below.

This plan controls how the product foundation in
[`product-ui-foundation.md`](product-ui-foundation.md) is delivered. The product
foundation remains authoritative for behavior, interaction, visual,
responsive, accessibility, performance and testing standards. This file adds
work ownership, review order and recovery checkpoints; it does not relax any
product requirement.

## Completion target

Deliver the earliest playable browser/PWA Tinker and basic-facility slice
described by the product foundation. All active time, platform phases and player
commands flow through `CanonicalLifecycleCoordinator`. UI and platform adapters
consume canonical snapshots, previews and command results and never reproduce
gameplay rules.

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
| Wave 4 | Accepted integrated hardening and complete slice acceptance | `web-ui-wave-4` |

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
- Checkpoint/reload continuity preserves the accepted canonical state.
- Compact, medium, wide and compact-landscape layouts pass the approved
  references without text selection or gesture interference.
- Keyboard, screen-reader, rapid-touch and independent multi-touch paths pass.
- Focused tests and the full applicable suites pass.

After acceptance, create and record the Wave 3 checkpoint.

## Wave 4: integration hardening

- Exercise multi-tab ownership, crashed-owner recovery and lifecycle stress.
- Complete reload, checkpoint, quota, import/export and failure containment.
- Run pseudo-localization, LTR/RTL, zoom, keyboard and assistive-technology
  acceptance.
- Run supported-browser, physical mobile, bundle-size, responsiveness, memory
  soak and deterministic Web Vitals acceptance.
- Verify production packaging excludes developer fixtures and respects CSP.

Gate:

- Every product-foundation acceptance criterion for the first slice has
  traceable evidence or an explicitly approved exception.
- No unresolved critical or high-severity correctness, save-safety,
  accessibility, security or performance issue remains.
- The integration branch is clean and all applicable suites pass.

After acceptance, create and record the Wave 4 checkpoint. Report the completed
slice for user review; do not push, deploy or begin later gameplay destinations.
