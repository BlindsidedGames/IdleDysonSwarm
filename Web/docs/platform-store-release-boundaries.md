# Platform, store and entitlement boundaries

This is a release-host seam, not a commerce implementation. It deliberately
adds no provider SDK, payment UI, filesystem probe, save migration, or product
surface.

## Contracts

- `src/platform/releaseFoundation.ts` defines the selected host kind, platform
  metadata, candidate-only native save discovery and diagnostics export.
- `src/platform/platformSaveStorage.ts`, `nativeMigration.ts`, and
  `nativeSystemPorts.ts` define the dependency-free native host foundation.
  The concrete path and bridge rules are recorded in
  `docs/native-host-foundation.md`.
- `src/store/contracts.ts` owns the canonical IAP product catalog, store
  purchase/restore port and entitlement authority. The five identifiers are
  copied exactly from Unity's `Assets/Resources/IAPProductCatalog.json`:
  `ids.tiptier1`, `ids.tiptier2`, `ids.tiptier3`, `ids.devoptions`, and
  `ids.doubleip`.
- Browser/local adapters intentionally return metadata and catalog data only.
  Their migration source finds no files, purchase is unavailable, restore is
  empty, ownership is false, and diagnostics export is unavailable.

## Trust rule

Shared or imported saves can report entitlement claims for diagnostics, but
they cannot grant Double Infinity Points or Developer Options. Durable store
ownership comes only from an authenticated future `EntitlementAuthority`.

The existing in-game Developer Options purchase remains an explicit *local
progression* input to entitlement resolution. A host can persist that path
locally, but it must not map an imported/shared save claim into it.

## Integration hooks

1. A desktop/mobile host implements `PlatformMetadataSource`,
   `NativeMigrationSource`, `DiagnosticsExporter`, `StoreAdapter`
   and `EntitlementAuthority` with its approved provider SDKs.
2. The startup composition requests host ownership from
   `EntitlementAuthority` and projects only the resolved effective access into
   the existing application entitlement input.
3. A native migration adapter passes discovered candidates to the existing
   save preparation pipeline; it never decodes or commits them itself.
4. Product UI calls `StoreAdapter` and refreshes host ownership after a
   completed purchase or restore. UI must not grant features from its own
   result or from a save claim.
