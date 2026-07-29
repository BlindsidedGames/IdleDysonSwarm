# Web UI delivery waves

Status: coordination plan approved; implementation awaits the user's explicit
go-ahead.

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
- Platform actions are composed behind the unified runtime port and lifecycle
  coordinator.
- Persistence, ownership, quota, recovery and localization contracts have
  deterministic tests.
- No product gameplay screen or duplicate gameplay calculation is introduced.

After acceptance, create and record the Wave 1 checkpoint.

## Wave 2: application seam

Keep the central path serialized:

- Implement the active-time driver.
- Implement the frozen-snapshot external store.
- Implement the command-envelope/dispatch adapter and standard result handling.
- Add startup, blocked, ready, recovery and top-level error-boundary states.
- Add production CSP and locally redacted diagnostics.

Gate:

- Adversarial review covers duplicate active time, stale revision rendering,
  command overlap, failure-path mutation and multi-owner transitions.
- Every player command and active-time advance is demonstrably routed through
  `CanonicalLifecycleCoordinator`.
- Render failures cannot mutate, replace, retry or reset canonical state.
- Focused tests and the full applicable backend/frontend suites pass.

After acceptance, create and record the Wave 2 checkpoint.

## Wave 3: earliest playable slice

Run presentation work in parallel only after the application seam is accepted:

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
