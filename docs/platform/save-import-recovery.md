# Save import and recovery contract

The canonical runtime distinguishes three import contexts:

- automatic same-device legacy migration;
- manual or shared import;
- canonical save-envelope upgrade.

The retired Unity application is supported only as an existing-player import
source. Its records and preferences do not define current gameplay behavior.

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
checkpoint of displaced dirty progress. Automatic same-device legacy migration
keeps the source quit timestamp for the existing capped, one-time offline-credit
startup path and retains eligible same-device entitlement evidence. Canonical
envelope upgrades likewise preserve local lifecycle and claim state while
changing only the codec/schema representation.

If the current Web save is invalid, its exact original text is copied to the
recovery location before a backup is attempted. The runtime restores the newest
valid verified backup and tells the player when that recovery was required. If
startup remains blocked, the recovery surface provides Retry, Copy Original,
and Start Fresh. Starting fresh records the choice locally; neither that action
nor any migration path overwrites or deletes a legacy source save.

The short-lived production V2 checkpoint format
`ids-web-production-v2-checkpoint-v1` is an explicit browser compatibility
source. Startup first uses its retained pre-migration canonical source as the
preserved Unity graph, then restores the latest V2 gameplay values only when
every decimal can be represented exactly by the current field authority. The
checkpoint revision is recorded in the upgraded save so an older retained
backup cannot replay over newer progress. Unrepresentable values fail closed;
they are never clamped, truncated, or replaced with a first-run save.

Exact accepted legacy baselines and fixture requirements are defined in
[`legacy-save-compatibility.md`](legacy-save-compatibility.md).
