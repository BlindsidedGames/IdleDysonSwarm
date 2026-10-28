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
`ids-web-production-v2-checkpoint-v1` and its schema-13 portable payload are
explicit browser and native compatibility sources. Startup prefers the exact
original import, then the retained pre-migration canonical source, as the
preserved Unity graph beneath the latest V2-owned gameplay. A player whose
first durable slot was V2 can use the deterministic first-run graph only as the
missing compatibility base; the V2 values still replace every field that V2
owned. A retained schema-13 import can itself become that base before a V2
checkpoint is overlaid. Native recovery retains the deployed newest-first
rotation at `backups/idle_dyson_swarm_web_save.1.idsw` through `.3.idsw`, which
was shared by the V2 and current repositories. Browser-only V2 backup inputs
remain read-only and separate from current browser backup rotation.

Integer currencies remain exact through the current discrete-authority ceiling
and saturate there when V2's unbounded decimal model exceeded it. Discrete
Skill and Research levels must fit the current safe-integer authority and
otherwise fail closed with the original V2 bytes retained. Continuous V2
decimals narrow through the current number authority and saturate only at
JavaScript's largest finite number; Dream panel inventories likewise saturate
at the current simulation-resource maximum so the published value survives
hydration and reload unchanged. Oversized Infinity and Quantum ledgers
prioritize the available balance when their total is narrowed, and the
Infinity Break target uses its stricter current authored ceiling. Recovery also
restores the durable
Dyson evaluation snapshot, local preferences and platform flags, and Stored
Time policy; settles a pending railgun interval; and consolidates the retired
Double Time bank into Stored Time up to its existing capacity. Recovered V2
number-formatting and Research-visibility values authoritatively refresh their
device-local services after the replacement save is published, including when
an older local preference value already exists.

The Reality universe designation is an ordinal identity label rather than a
currency or gameplay counter. Canonical exports and imports preserve every
non-negative designation exactly beyond the signed 64-bit discrete ceiling.
Transitional V2's exponent-bearing Decimal representation narrows only at the
larger simulation-resource maximum so hostile exponents remain bounded without
reintroducing the former reachable ceiling.

Schema 13 allowed a Quantum available balance to exceed its recorded lifetime
total. Compatibility therefore preserves the available balance and raises only
the narrowed lifetime total enough to keep current spent progress non-negative.
The three Dream generation parameters that schema 13 encoded as ordinary
Decimals but the current model stores as bigint are rounded to the nearest
integer (halves upward) and saturate at the current discrete ceiling; all
historically integer-Decimal fields remain exact.

The retired V2 Stored-Time job sidecar is also recovery evidence. V2 persisted
a job candidate before publishing and verifying the matching outer checkpoint,
so a crash could leave the sidecar newer than the outer save. Recovery ignores
only a cleared marker or a bounded, closed active record whose proposed
revision is older than the validated outer checkpoint, or whose equal revision
contains the exact same state/runtime. An older valid record is demonstrably
superseded by the outer authority revision. Validation recomputes both released
sorted-key worker SHA-256 hashes and enforces the producer's origin/checkpoint
revision clocks before making that ordering decision. Before canonical
publication, the repository records the SHA-256 of the exact accepted active
sidecar as a local
retirement proof beside that revision. The proof stays in canonical backup
rotation and permits later backup recovery only while the sidecar bytes still
match exactly, the complete record remains valid, and its revision is no newer.
It is stripped from shared exports and sender claims, while a valid receiving
installation proof survives local manual replacement. If startup is blocked
before a receiving snapshot can be opened, the commit lane may bootstrap the
hash only from the repository's own canonical current or rotating backups. A
pending temporary slot is eligible only when it already carries the complete
matching proof from a failed fixed-build replacement. All paths repeat the
same exact-hash and full-record checks; arbitrary legacy/import candidates
never authorize it. A malformed, unreadable,
equal-revision mismatch, newer, or hash-mismatched job fails closed and keeps
both source files untouched rather than duplicating or discarding durable
progress. The deployed inputs remain read-only at
`/development-only/development-only-default-profile/stored-time/job.json` in
browser storage and `save/stored-time/job.json` under the native Web root.

The checkpoint revision is recorded in the upgraded save so an older retained
backup cannot replay over newer V2 progress. A valid current-format save is
always authoritative because it has no clock that can be safely compared with
a separate retired V2 namespace. Within the shared native newest-first
rotation, a recognized V2 checkpoint in an earlier numbered slot is known to
be newer than a later current-format backup and can use that backup as its
base. Browser-only historical V2 backups cannot overrule a valid current-format
backup. Recovery verifies the historical schema-13 gzip CRC32 and size trailer
before accepting its contents, and retains the exact rejected current bytes
before publishing recovered progress.

Manual paste, file, and drop import also accept the raw schema-13 `IDSWEB1`
portable text exported by V2. Conversion uses the deterministic first-run graph
as its compatibility base, never gameplay from the save being replaced. The
ordinary manual-import policy then consumes the exported quit timestamp,
preserves the imported Stored Time bank, rejects sender-owned entitlement and
Developer Options claims, and restores receiver-owned presentation, local
Developer Options, and Stored Time processing preferences. After explicit
overwrite approval, the same path remains available from a blocked startup
even when its rejected current slot cannot be decoded; the retained original
bytes stay available for recovery.

Exact accepted legacy baselines and fixture requirements are defined in
[`legacy-save-compatibility.md`](legacy-save-compatibility.md).
