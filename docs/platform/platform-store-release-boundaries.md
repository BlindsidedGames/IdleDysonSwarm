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
  `native-host-foundation.md`.
- `src/store/contracts.ts` owns the canonical IAP product catalog, store
  purchase/restore port and entitlement authority. The five identifiers are
  copied exactly from Unity's `Assets/Resources/IAPProductCatalog.json`:
  `ids.tiptier1`, `ids.tiptier2`, `ids.tiptier3`, `ids.devoptions`, and
  `ids.doubleip`.
- Hosted Web production selects Stripe checkout and its device-bound
  entitlement authority. `npm run dev` instead selects an in-memory Store that
  labels deterministic success, cancellation and failure outcomes and never
  owns a network, receipt or storage port. `npm run dev:stripe` is the explicit
  local integration path for the real Stripe endpoint. The production build
  runs a bundle-boundary check that requires Stripe and rejects development
  Store markers.
- Browser verification normalizes `supporterCatGallery` only from the
  `/api/ids/stripe/verify` response. A checkout query or browser-authored local
  flag cannot grant it. The current page retains an already verified supporter
  result during a transient refresh failure; a reload must re-present the
  opaque device tokens to the server. Secure offline-after-reload support
  requires a server-signed, client-verifiable receipt contract and is not
  invented in the game client.
- The provider-free browser foundation remains available for unsupported test
  hosts. Its migration source finds no files, purchase is unavailable, restore
  is empty, ownership is false, and diagnostics export is unavailable.

## Trust rule

Shared or imported saves can report entitlement claims for diagnostics, but
they cannot grant Double Infinity Points, Developer Options, or Supporter Cat
Gallery. Durable store
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

## Browser backend ownership and open gate

The game repository does not own the `/api/ids/stripe` implementation.
`docs/platform/website-deployment-rules.md` identifies
`BlindsidedGames/BlindsidedGames` as the owner of the deployed Cloudflare Pages
Functions, Stripe bindings, token secret, and Pages deployment. No checkout or
verification handler from that repository is present in this worktree.

Read-only inspection of its current `main` located the implementation in
`functions/_utils/ids-stripe.ts` and
`functions/api/ids/stripe/{catalog,checkout,verify}.ts`. It already checks paid
and complete Stripe sessions, expected price and device hash, then verifies
device-bound HMAC tokens. Its token payload currently permits only
`ids.devoptions` and `ids.doubleip`, and its ownership response omits the
supporter field.

Browser fulfillment is therefore not end-to-end complete here. That existing
website implementation must extend its signed receipt contract so any of
`ids.tiptier1` through `ids.tiptier3` idempotently yields the same affirmative
supporter ownership, while preserving its paid/session/price/device checks and
rejecting unpaid, mismatched, tampered, and replayed session claims. Every later
verify call must return `supporterCatGallery` from valid device-bound tokens.
The change needs Cloudflare preview deployment with Stripe test keys/prices,
provider fixtures for each SKU, replay/mismatch tests, and no real charge.
