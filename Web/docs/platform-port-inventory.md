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
- Browser/PWA: the complete Unity save can be migrated after the player supplies
  it through a file picker, drag-and-drop or paste. Automatic discovery of an
  arbitrary Unity save path is unavailable because browser filesystem access is
  sandboxed and user-mediated. Treat this as a one-time assisted migration, not
  a compatibility limitation in the save decoder or schema pipeline.
- The first successful migration writes and verifies the new format before
  promotion. Native hosts copy the original Odin file to a recovery location;
  browser hosts retain the supplied original as a recovery blob and offer an
  explicit download/export. The original is never used as a temporary write
  target.

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
