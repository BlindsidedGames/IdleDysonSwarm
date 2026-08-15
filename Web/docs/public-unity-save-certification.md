# Public Unity save certification

The Web mapping baseline is the save graph shipped by Unity application
version `3.0.328`: save schema `11` from source revision
`9b840fb2547ad507d4e529a610a031cc13782847`, built with Unity `6000.3.9f1`.

This is deliberately not inferred from the current checkout. The development
branch advanced `Oracle.CurrentSaveVersion` from 11 to 12 after that revision
without changing `ProjectSettings.bundleVersion` from 3.0.328. Treating the
working tree as the public contract would therefore certify fields that no
released player save can contain.

Revision `83c46853d35c8c0246277114e7b681c1ee2ee5c7` is the later, last
pre-schema-12 source revision. It has the same 519-field serializable schema-11
graph, but it is not the release certification commit and is therefore not the
pin used here.

The same identity is pinned in both environments:

- Unity editor tooling: `Assets/Editor/Web/PublicUnitySaveCertification.cs`.
- Web mapping: `src/game-state/mappingCoverageSchema11.ts`.

The schema-11 source catalog contains 519 leaf-field patterns. Its sorted-path
SHA-256 is
`0b0559fc79cda740529fafd6cb075edd3725255147cd8fbd06a568b4e46970b4`.
Wildcards appear only at collection-element or dictionary-key positions; no
wildcard stands in for a Unity field name.

## Classification gate

`mappingCoverageManifest` emits one entry for every certified source leaf.
Each entry is one of:

- canonically owned;
- derived and recomputed;
- a legacy duplicate omitted from canonical ownership;
- a presentation preference;
- a platform entitlement; or
- still unowned.

The catalog defaults only its explicitly listed fields to `still-unowned`.
An unknown field is not preserved under an assumed owner: the classifier
returns no match and certification fails. This keeps source preservation as a
temporary compatibility behavior rather than an ownership claim.

The initial scaffold leaves 53 fields explicitly unresolved: lifecycle
markers, selected-preset state, legacy skill timers, Dyson compatibility
tuning, and cached production totals. Those fields need individual ownership
or recomputation evidence; their names are available directly from
`mappingCoverageManifest.entries` and are intentionally not collapsed behind
an object wildcard.

The authentic schema-11 support fixture is decoded without migration in the
coverage test. Every concrete fixture leaf must resolve to exactly one catalog
entry, including dictionary keys that contain dots. The fixture cannot prove
fields whose collections are empty or whose values were omitted by its
serializer; the pinned source catalog and hash cover that structural gap.

This catalog certifies one-way import coverage only. Complete classification
does not enable a Unity-readable exporter. The supported Web runtime writes
schema-13 `IDSWEB1`; exporting a Unity `IDB1` graph and two-way Unity
synchronization are intentionally unsupported.

## Recertifying a later public release

1. Identify the exact public application version, full source revision, Unity
   editor version, and `Oracle.CurrentSaveVersion` used for the release.
2. Check out that revision and derive leaf fields from
   `Oracle.SaveDataSettings` and each reachable serializable value type.
3. Update the catalog with explicit field names. Do not broaden an existing
   object to `*` to make a test pass.
4. Reclassify every added or removed leaf and update the catalog hash in both
   Unity and Web pins.
5. Add an authentic save produced by that public build and run the direct
   decode coverage test plus canonical round-trip parity tests.
6. Review unresolved entries separately before considering a change to the
   release write gate.
