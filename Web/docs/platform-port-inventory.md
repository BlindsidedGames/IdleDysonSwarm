# Platform port inventory

The executable inventory lives in
`src/platform/capabilityInventory.ts`; this document records the release-level
conclusions.

## Seamless migration requirements

- Desktop: Electron must search the existing Idle Dyson Swarm application-support
  directory before creating a new save.
- iOS and Android: the packaged replacement must retain
  `com.blindsidedgames.idledysonswarm`, the existing signing identity, and access
  to the upgraded application's retained data container.
- Browser-only: automatic discovery of an arbitrary Unity file is unavailable.
  Browser deployment can support manual recovery import but cannot satisfy the
  seamless-upgrade requirement by itself.
- The first successful migration writes and verifies the new format, atomically
  promotes it, and then copies the original Odin file to a recovery location.
  The original is never used as a temporary write target.

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
