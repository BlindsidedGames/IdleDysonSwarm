# Platform port inventory

The executable inventory lives in
`src/platform/capabilityInventory.ts`; this document records the release-level
conclusions.

Scope decision (2026-07-30): the current product checkpoint is the Bots/Dyson
design baseline. Migration UI and complete host certification are separate
release work. This sequencing decision does not weaken the storage, fencing,
checkpoint, lifecycle, recovery or bounded-input requirements below.

## Host migration and recovery requirements

- Steam/native desktop: the host integration targets the known existing Idle
  Dyson Swarm application-support directory before creating a new save. This
  deterministic host lookup is separate from browser product UI and is not a
  Bots-baseline requirement.
- iOS and Android: the packaged replacement must retain
  `com.blindsidedgames.idledysonswarm`, the existing signing identity, and access
  to the upgraded application's retained data container.
- Browser/PWA: an optional manually pasted Unity `IDB1` text string may remain
  available as a recovery/support route. The Bots baseline does not require a
  file picker, drag-and-drop target or first-run migration journey. If a later
  release offers broader assisted migration, browser filesystem access remains
  sandboxed and user-mediated; this is not a decoder or schema limitation.
- The first successful migration writes and verifies the new format before
  promotion. Native hosts copy the original Odin file to a recovery location;
  any browser recovery/import route retains the supplied original as a recovery
  blob and offers explicit download/export. The original is never used as a
  temporary write target.

## Required adapters

- Save discovery and transactional filesystem operations.
- Pause, focus, resume and termination lifecycle events.
- Steam initialization, achievements, statistics and rich presence on desktop.
- Safe-area, orientation and touch behavior on mobile.
- Audio and local UI preferences.
- Clipboard recovery import/export and external URL navigation.

No active runtime purchase, notification or cloud-save implementation was found
in the current C# surface. Those remain explicit inventory entries so they cannot
be accidentally assumed during release planning.

These adapters remain the release inventory. An adapter not needed to review the
Bots/Dyson design baseline is deferred, not removed or certified.

## First-slice reference host

The browser/PWA production build is the reference host for the first playable
slice. Before product UI acceptance it requires:

- IndexedDB-backed transactional storage through the portable save repository;
- one authoritative writable context enforced by an atomic IndexedDB owner
  lease, with blocked secondary contexts and explicit/expired takeover;
- a persistent-storage request where supported, plus visible denial, quota and
  commit-failure recovery/export behavior;
- a maximum 30-second dirty checkpoint window so termination events are not the
  only protection against progress loss;
- retained recovery-blob download/export for any supplied manual save string;
- visibility, focus, page-hide and page-show lifecycle events routed through the
  lifecycle coordinator;
- a monotonic active-time clock with no hidden-page accrual;
- any enabled manual-text recovery import routed through the canonical
  preparation pipeline with 2 MiB supplied-text, 1 MiB decoded-payload and
  8 MiB bounded inflated-binary ceilings; and
- safe service-worker updates that wait for a verified checkpoint and explicit
  reload.

In-memory storage remains a test double only. Electron and Capacitor adapters
remain separate native-host release gates and must not be simulated inside
product components.

The Bots/Dyson design-baseline checkpoint does not require immediate
native-refresh/tab-handoff acceleration, the complete current/previous browser
matrix, physical-mobile or named assistive-technology certification, native
save discovery, first-run migration UI or later gameplay destinations. Those
deferrals are not passes. Transactional lease authority, safe blocked contexts,
orderly release, lease-expiry recovery, checkpointing and last-verified-save
protection remain mandatory throughout.
