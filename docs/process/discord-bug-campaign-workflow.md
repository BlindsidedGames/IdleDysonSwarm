# Discord bug campaign workflow

Status: active

Workflow version: 1.0

Owner: project maintainer

This is the canonical procedure for turning a frozen Idle Dyson Swarm Discord
feedback snapshot into reviewed fixes and, when separately approved, internal
Android and iOS releases. It does not grant permission to change gameplay or
deploy a build. A campaign must stop at both human approval gates.

Use [`templates/discord-bug-campaign.md`](templates/discord-bug-campaign.md)
for campaign evidence and
[`templates/discord-bug-task-handoff.md`](templates/discord-bug-task-handoff.md)
for every report task.

## Non-negotiable boundaries

- Refresh Discord once at campaign intake. Record the feed manifest, channel
  health, freshness/checksum result, selected message IDs, and frozen
  `origin/main` SHA. Do not refresh Discord again during that campaign. Later
  reports belong to the next campaign.
- Do not infer a gameplay decision. A task that needs one stops and records the
  exact decision required.
- Give each independent report its own named task, branch, and worktree based
  on the frozen SHA. Do not mix unrelated fixes.
- A task is not complete merely because focused tests pass or an external
  reviewer has commented. Its own local review loop must end with a complete
  pass that finds nothing.
- Use GitHub pull-request CI for shared, credential-free checks. Run the
  Android/iOS native candidate workflow only once, after the campaign is fully
  merged, against the exact combined `main` SHA.
- Patch notes and translations are prepared before release, but Android or iOS
  deployment occurs only after the maintainer approves the final notes and
  release plan.

## Campaign state machine

### 1. Intake and freeze

1. Refresh the approved Discord feeds and fail closed if any requested channel
   is unhealthy or the freshness/checksum validation is missing.
2. Reconcile candidate reports against current code and previous fixes. Do not
   treat acknowledgements, reactions, tests, or old patch notes as proof that a
   report is fixed.
3. Fill in the campaign template with a concise evidence sheet. For each
   selected report, include its message ID, symptom, current implementation
   evidence, likely ownership boundary, dependencies/overlap, and proposed task
   title.
4. Fetch `origin/main`, verify the canonical checkout is clean, and record its
   exact 40-character SHA as the campaign base.
5. Present the evidence sheet, task split, overlap order, validation approach,
   and expected CI/release work.

**Human approval gate A:** stop. No task creation, worktree creation, code
change, push, or pull request is allowed until the maintainer approves the
campaign plan. Record the approval in the campaign document.

### 2. Isolated investigation and repair

After gate A approval, create one clearly named task and worktree per report.
Give every task the frozen report evidence, exact base SHA, relevant contracts,
standard handoff template, and these completion rules:

1. Reproduce or otherwise establish the current behavior from implementation
   and appropriate runtime evidence.
2. Classify the result as exactly one of:
   - confirmed and fixed;
   - not reproducible, durable coverage added;
   - needs gameplay decision; or
   - invalid or obsolete.
3. Preserve gameplay, save compatibility, stable IDs, accessibility,
   localization, host behavior, and release identity unless the task explicitly
   authorizes a change.
4. Run focused validation while working and the repository-required checks at
   the completed checkpoint. Add browser, save, performance, native, emulator,
   simulator, or real-device evidence when the touched boundary requires it.
5. Review the complete local diff against its base for correctness, regressions,
   contracts, test quality, and scope. Fix every actionable finding and repeat
   the review. Completion requires a final full local review with no findings.

### 3. Test-retention decision

Before a task is handed back, classify every new or materially expanded test:

- **Retain** when it protects a durable contract or likely regression with
  stable, maintainable, proportionate coverage.
- **Remove before commit** when it was a one-off diagnostic, duplicates stronger
  coverage, asserts incidental implementation, is brittle, or imposes ongoing
  cost disproportionate to the risk.

Tests may be used temporarily to verify a fix. The handoff must list retained
and removed tests and explain why. Never regenerate fixtures or weaken
assertions merely to make a change pass.

### 4. Orchestrator audit before rebase

The campaign orchestrator independently checks every task's diff, evidence,
test-retention decision, validation results, and final no-findings review. It
must not rely on a task's completion label or on Codex Connector. Return an
incomplete task to its local review loop. Escalate gameplay decisions to the
maintainer and do not merge around them.

### 5. Sequential integration and pull-request review

Choose an overlap-aware order. For each accepted task in that order:

1. Rebase it onto the actual, currently merged `main`, not merely the original
   campaign base or a sibling branch.
2. Resolve conflicts semantically. Rerun focused checks and review the rebase
   delta; repeat the local review loop if the rebase changes behavior.
3. Push the final rebased branch once and open or update one pull request. Avoid
   redundant push runs.
4. Wait for the lightweight pull-request checks on that exact head SHA.
5. Only after local review, rebase, and CI are clean, request the final Codex
   Connector review. Confirm the reviewed SHA equals the pull-request head and
   that no actionable or unresolved comment remains.
6. If Connector finds anything, return the task to the local fix/review loop,
   then repeat the relevant checks and final-head review. Connector is the last
   backstop, not the primary reviewer.
7. Merge, verify the resulting `main`, and use that merged state as the base for
   the next overlapping task.

### 6. Patch notes and source finalization

After every accepted task is merged:

1. Create one final documentation task from the verified merged changes. It
   must consolidate existing notes rather than append repetitive fragments,
   keep the current marketing version unless a version change was authorized,
   update every supported translation, and tie the release plan to the intended
   release ID.
2. Review and merge the rendered/player-facing wording and translation changes.
   Patch notes are bundled application source, so they must be present before
   the release candidate SHA is frozen.

### 7. Combined candidate validation and release approval

1. Fetch and verify a clean `main`; record the exact combined candidate SHA,
   including the merged patch notes and translations.
2. Run the repository's final combined local validation, including all required
   shared checks, translation checks, and any cross-feature scenarios created
   by the campaign.
3. Dispatch the manual native candidate workflow exactly once with that full
   SHA. It may compile Android and iOS in parallel within one workflow run. Do
   not rerun it for documentation-only changes or each intermediate pull
   request. A failed native job must be investigated; any corrective code change
   creates a new combined SHA and therefore a new candidate run.

**Human approval gate B:** stop after presenting the final patch notes,
translations, candidate SHA, native workflow result, release ID, and per-platform
deployment plan. Do not build for upload, upload, publish, or deploy until the
maintainer explicitly approves this release candidate.

### 8. Internal deployment and closeout

After gate B approval, follow the local release workflow in
[`../platform/release-candidate-workflow.md`](../platform/release-candidate-workflow.md).
Report Android and iOS independently as built, uploaded, processing, available
to testers, or blocked. Deployment permission does not imply production release
permission.

Record the campaign base SHA, merged candidate SHA, release ID, Android identity,
iOS identity, store states, validation evidence, pull requests, and approval
records in the durable release ledger. Remove completed campaign worktrees and
archive their tasks only after their work is merged or explicitly abandoned.

## Change control

This workflow is versioned because silent process drift defeats its purpose.
Changes to approval gates, review order, test retention, CI placement, release
authority, or evidence requirements require explicit maintainer approval and a
version/changelog update in the same pull request.

### Changelog

- **1.0 — 2026-09-01:** Established one-refresh campaign freezing, human gates
  before implementation and deployment, isolated task handoffs, deliberate test
  retention, repeated local review, orchestrator audit, sequential rebasing,
  final-head Connector review, one final native candidate matrix, translated
  patch notes, provenance recording, and cleanup.
