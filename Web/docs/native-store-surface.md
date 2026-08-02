# Native Store surface foundation

The Store route is a native-host capability, not game progression. It appears
only when the composition root injects `ReleasePlatformServices` whose
`hostKind` is `desktop-native` or `mobile-native`. Browser and PWA composition
do not inject a native Store and cannot reveal it through a save, setting, URL,
or unlock.

## Product and pricing rules

The catalog uses the five existing Unity product IDs:

- `ids.tiptier1`, `ids.tiptier2`, and `ids.tiptier3` are repeatable consumable
  tips with no gameplay effect.
- `ids.doubleip` and `ids.devoptions` are permanent entitlements.

The UI owns localized product names and explanations. It does not format,
calculate, convert, or provide a fallback currency price. Each purchasable
button receives an opaque `localizedPrice` string from the native
`StoreAdapter`; a missing native listing is shown as unavailable.

`NoopStoreAdapter` remains intentionally inert. This foundation does not claim
StoreKit, Google Play Billing, or Steam Inventory integration.

## Entitlement trust

An accepted purchase callback does not itself grant a permanent benefit.
`StorefrontController` refreshes `EntitlementAuthority` and grants access only
when that authority verifies ownership. The production runtime reads that
authority before opening the canonical session and reprojects it after a
verified purchase or restore. Store UI never supplies an entitlement value to
gameplay. Developer Options additionally accepts the existing local in-game
unlock supplied by gameplay; native release builds expose that path without
depending on Vite's development-build flag.

Shared-save claims are not inputs to the controller. `resolveEffectiveEntitlementAccess`
continues to ignore them, so imports cannot grant either permanent product.

`CachedVerifiedEntitlementAuthority` records provider-verified ownership plus
one narrowly scoped compatibility fact: affirmative paid Double IP evidence
read from the original Unity file during automatic same-device first-launch
migration. That evidence is promoted once, records its provenance, survives a
later provider response that cannot represent the legacy purchase, and is never
consulted by manual/shared import. Promotion requires a candidate explicitly
classified by a native read-only probe as an automatic same-device Unity
persistent-data save; retained browser imports and candidates without that
provenance fail closed even if they contain `doubleIp: true`.

The host cache keeps only audit-safe metadata for the promotion: platform,
Unity source class, an opaque source identifier, a non-secret path class, a
SHA-256 content hash, migrated schema version, and promotion UTC timestamp. It
never records the raw Unity save or an absolute filesystem path. If the provider
later becomes unavailable,
the most recent verified record is used and an offline failure cannot revoke
it. With no verified cache or same-device evidence it fails closed. The cache
belongs to the native host, outside the shared save, so game resets do not erase
store ownership. Existing gameplay reset semantics continue to control the
local in-game Developer Options path.

## Restore behavior

Restore Purchases is presented only alongside permanent upgrades. Returned tip
IDs are ignored. A restored product is counted and exposed only when the host
authority independently verifies the matching durable entitlement.

The next native-host phase must bind these platform-neutral ports to real
StoreKit 2, Google Play Billing, and Steam Inventory implementations, and then
exercise purchases, restoration, offline ownership, and save-transfer isolation
on private store tracks.
