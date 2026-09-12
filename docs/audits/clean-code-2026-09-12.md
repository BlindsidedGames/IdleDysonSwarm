# Clean-code review — 12 September 2026

## Scope and protected behavior

Reviewed the canonical architecture and state/persistence contracts, production
composition, Cloud startup/recovery, the application facade and command router,
startup resolution, frontend snapshot publication, periodic checkpoints,
active-time scheduling, entitlement projection and save graph helpers. Also
surveyed production module sizes and the Skills surface's dependency/operation
boundaries to select changes with a concrete maintenance benefit.

This is a focused architectural review, not a claim that every production line
was individually inspected. The separate test audit and performance review
cover test disposition and measured runtime costs.

Gameplay, save preparation, command admission, durable publication ordering,
platform entitlement ownership, UI behavior and generated data remain protected.
No gameplay balance or schema changes were made.

## Implemented

### 1. Separate Developer Options from the persistence/application facade

`canonicalGameApplication.ts` contained 415 lines implementing developer resource
adjustments, option purchases and helper operations. These handlers do not own
application lifecycle, durable checkpoints or command admission, yet were mixed
into the same module as those responsibilities.

Moved the action union and unchanged handler bodies into
`src/application/canonicalDevelopmentCommands.ts`. The facade keeps its command
routing and re-exports the existing action type, preserving consumers. Exclusive
imports move with the handlers; the module introduces no new dependencies and
has no runtime import back to the facade.

The facade is reduced from 2,557 to 2,119 lines. This is a responsibility split,
not a performance claim. Developer Options are an existing shipped, purchasable
feature; this extraction does not hide them behind a development build flag.

A mechanical comparison against the baseline verifies every moved handler body
is byte-for-byte identical apart from the three export declarations. Existing
application tests exercise grants, signed floors, invalid amounts, skill
assignment, secret resets and purchasing/re-enabling Developer Options through
the real application boundary.

### 2. Make Cloud recovery stages explicit

`portableCloud.ts` mixed remote reading, portable preparation, backup selection,
local comparison, durable activation and acknowledgment in a compressed method.
Several independent variables represented a candidate's prepared save, original
text and source; their relationship was implicit.

A discriminated `CloudSavePreparation` result now keeps a prepared save together
with its source bytes and recovery source, or carries a blocked result. Named
helpers separate preparation, backup recovery and local-save comparison. The
main method shows the persistence decision and acknowledgment ordering directly.

Preserved details include:

- unreadable/absent Cloud permits local resolution;
- corrupt Cloud may try backups, while unsupported future formats block;
- each candidate retains one preparation timestamp across its portability pass;
- conflict selection compares the same original candidate bytes as before;
- acknowledgment uses the downloaded primary even when a backup supplied recovery;
- selected Cloud data is committed before acknowledgment;
- local recovery and commit failure classifications remain unchanged.

### 3. Keep production composition readable

`productionApplicationFactory.ts` now delegates optional achievement reporting
and clean-checkpoint Cloud publication to named subscription helpers. Factory
construction exposes the startup resolver, runtime/engine options and optional
observers without embedding all observer control flow.

The existing durability checks, per-revision suppression, normalization and
achievement exception isolation are preserved. The subsequent retry-marker
correction is described in item 5.
No subscription cadence or publication ownership changes were made.

### 4. Express the active-time scheduler's optional capability

`ActiveTimeFrameScheduler` now declares the optional `setDelayMilliseconds`
method already used by the driver's interval setter. The driver invokes that
capability without casting an injected scheduler to its private browser
implementation. Fixed schedulers remain supported. Constructor validation and
the stricter runtime interval setter validation remain separate and unchanged.

### 5. Keep the Cloud retry marker owned by its publication

The factory previously cleared its last-published checkpoint marker whenever
any pending Cloud publication failed. A deferred-promise regression through the
real factory reproduced an older failure after a newer success: checkpointing
the unchanged current state then published it again (three calls instead of
two). The failure callback now clears the marker only if it still matches that
request's revision. The same regression verifies that a failure of the latest
revision still allows its next clean checkpoint to retry.

This marker only suppresses repeated requests; it does not order host writes.
The current Steam host serializes publication using its own promise queue and
retains its existing identical-content acknowledgment shortcut. The guard does
not change write order, conflict selection, backup rotation or durable-save
ownership, and does not attempt to impose ordering on future Cloud providers.

## Reviewed and deliberately retained

| Area | Decision |
| --- | --- |
| `RepositoryStartupSaveResolver` | Already separates repository discovery, repair commit and typed startup outcomes; no extra abstraction justified. |
| `FrontendSnapshotStore` | Envelope identity, coalesced frame delivery and immediate flush have distinct semantics. Keep explicit state and listener isolation rather than generic event infrastructure. |
| `PeriodicCheckpointScheduler` | Pending/queued/epoch state enforces shutdown and restart ordering. Keep it; removing flags for visual simplicity would need lifecycle evidence. |
| `RuntimeEntitlementBridge` | Small host-owned projection with a clear authority boundary; no cleanup needed. |
| Save graph clone/walk helpers | Compatibility semantics include byte arrays, cycles and retained Date behavior. Do not replace with JSON or a generic cloning API as cosmetic cleanup. |
| Canonical command router | Large exhaustive discriminated union and domain routing are intentional. Avoid replacing it with an untyped dispatch registry. |
| Skills surface | Large and a reasonable future split candidate, but gestures, selection, pending commands and confirmation state are coupled. A line-count-only extraction is not sufficient evidence. |
| `AuthoritativeLifecycleRouter` | Local fencing and full authority fencing have different completion checks. Keep those paths explicit; thrown `undefined` also requires the existing failure flags. |
| `deepFreezePlainGraph` | Operates on owned acyclic graphs and skips already frozen objects. Changing that shortcut or substituting the save graph walker would alter its contract. |
| Browser runtime hooks | Stable subscriptions and frozen idle snapshots already express the React boundary clearly; no generic wrapper needed. |
| Save inspection and localization contact-sheet scripts | Small direct workflows; shared wrappers or concurrent image decoding would add complexity without measured benefit. |

## Deferred opportunities

- **Browser runtime lifecycle state:** the ~2,770-line foundation composes writer
  ownership, import replacement, active-time residue and foreground transitions.
  Extract one lifecycle responsibility only after identifying its epoch/receipt
  invariants; keep the existing integration coverage and perform browser/native
  suspend-resume verification. No broad state-machine rewrite was attempted.
- **Skills UI responsibilities:** move viewport/gesture state or preset transfer
  dialogs as a separately reviewed unit, with keyboard, touch, focus and mobile
  visual checks. This review does not claim UI acceptance for such a change.
- **Progress animation cadence:** the forward animation interval is a fixed
  default while active-time delivery can be configured. Altering interpolation
  or wrap behavior needs visible acceptance and is outside this cleanup.
- **Shared media-query subscriptions:** per-hook listeners could be consolidated,
  but listener lifetimes and hydration need characterization before adding a
  module-level cache; no measured bottleneck currently justifies it.

## Validation

- Existing Cloud unit/factory tests: 9 passed.
- Cloud retry regression plus factory/portable/Steam recovery suite: 18 passed;
  the new regression failed on the unguarded callback before the correction.
- Real-filesystem Steam Cloud recovery and Steam host tests: 17 passed, including
  future backups, failed durable commits, account changes and conflict retention.
- Canonical application tests: 33 passed.
- Focused lint on all changed clean-code production modules: passed.
- Mechanical handler comparison: passed.
- Consolidated TypeScript/build/full-suite results belong to the campaign report.

No new tests were needed for the purely mechanical extraction. Existing durable
Cloud integration coverage was retained rather than duplicated with equivalent
unit tests.
