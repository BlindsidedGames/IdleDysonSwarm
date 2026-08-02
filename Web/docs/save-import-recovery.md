# Save import and recovery contract

The Web runtime distinguishes three import contexts:

- automatic same-device Unity migration;
- manual or shared import;
- transitional Web-save upgrade.

Manual/shared imports keep the receiving installation's schema-classified
presentation preferences, including display/accessibility settings, tap-to-buy,
buy mode, and local UI expansion/first-run toggles. Language and audio-volume
preferences remain owned by their platform adapters and never enter the portable
save graph. Shared saves cannot grant Double IP or Developer Options, but a
Developer Options unlock earned locally through in-game progression survives a
manual replacement. Store ownership remains host-owned and outside the save.

Manual/shared imports preserve the imported save's stored offline-time bank but
consume its exported quit timestamp, so they do not grant elapsed time since the
export. Before applying a valid manual import, the runtime publishes a verified
checkpoint of displaced dirty Web progress. Automatic same-device Unity
migration keeps the Unity quit timestamp for the existing capped, one-time
offline-credit startup path and retains eligible same-device Unity entitlement
evidence. Transitional Web upgrades likewise preserve local lifecycle and claim
state while changing only the codec/schema representation.

If the current Web save is invalid, its exact original text is copied to the
recovery location before a backup is attempted. The runtime restores the newest
valid verified backup and tells the player when that recovery was required. If
startup remains blocked, the recovery surface provides Retry, Copy Original,
and Start Fresh. Starting fresh records the choice locally; neither that action
nor any migration path overwrites or deletes a Unity source save.
