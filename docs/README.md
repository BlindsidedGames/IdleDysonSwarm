# Documentation index
This directory separates living documentation from dated evidence. Keep this
index and [`BACKLOG.md`](BACKLOG.md) current whenever work changes the status of
an audit finding, release gate, or platform contract.

## Active work

- [`BACKLOG.md`](BACKLOG.md) is the root-level list of accepted, deferred, and
  decision-pending work.
- [`audits/`](audits/) contains active evidence-led reviews. Findings remain in
  their audit until they are resolved and verified.
- [`release/`](release/) contains documents that are still needed for the
  current release. Move dated release material to the archive after the release
  is complete.

## Living references

- [`contracts/`](contracts/) contains current architecture, gameplay,
  persistence, presentation, and parity contracts.
- [`platform/`](platform/) contains host, Store, PWA, migration, deployment, and
  release-operation guidance.
- [`product/`](product/) contains current product direction that is not an
  implementation contract.

## Historical material

- [`archive/`](archive/) preserves completed plans, superseded inventories,
  diagnostic baselines, and dated evidence. Archived material is evidence of a
  past state, not the current implementation contract.
- [`archive/unity-development-snapshot/`](archive/unity-development-snapshot/)
  is frozen reference material for the unreleased Unity handoff; its old paths
  resolve against the public archive branch/tag, not `main`.

## Maintenance rules

1. Put actionable work in `BACKLOG.md` and link to its detailed evidence.
2. Update or close the backlog item in the same change that resolves it.
3. Keep stable behavior in `contracts/`; do not create a new dated plan for an
   ordinary contract correction.
4. Keep platform procedures in `platform/` and current release acceptance in
   `release/`.
5. Move superseded or completed dated reports to a year-month archive folder;
   never delete useful evidence merely to reduce clutter.
6. Update this index and every inbound link whenever a document moves.
