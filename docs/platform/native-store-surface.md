# Native Store surface foundation

The Store route is a native-host capability, not game progression. It appears
only when the composition root injects `ReleasePlatformServices` whose
`hostKind` is `desktop-native` or `mobile-native`. Browser and PWA composition
do not inject a native Store and cannot reveal it through a save, setting, URL,
or unlock.

## Product and pricing rules

The catalog uses the five existing Unity product IDs:

- `ids.tiptier1`, `ids.tiptier2`, and `ids.tiptier3` are repeatable supporter
  consumables. Each verified delivery grants the same device-local
  `supporterCatGallery` entitlement and no gameplay effect.
- `ids.doubleip` and `ids.devoptions` are permanent entitlements.

The UI owns localized product names and explanations. It does not format,
calculate, convert, or provide a fallback currency price. Each purchasable
button receives an opaque `localizedPrice` string from the native
`StoreAdapter`; a missing native listing is shown as unavailable.

`NoopStoreAdapter` remains intentionally inert for browser and unsupported
native hosts. Capacitor release builds bind this contract to StoreKit 2 and
Google Play Billing. Steam remains a separate desktop release gate.

## Entitlement trust

An accepted purchase callback does not itself grant a permanent benefit.
`StorefrontController` refreshes `EntitlementAuthority` and grants access only
when that authority verifies ownership. The production runtime reads that
authority before opening the canonical session and reprojects it after a
verified purchase or restore. Store UI never supplies an entitlement value to
gameplay. Developer Options additionally accepts the existing local in-game
unlock supplied by gameplay; native release builds expose that path without
depending on Vite's development-build flag.

Once `ids.doubleip` ownership is verified, its existing purchase control
becomes an Enabled/Disabled toggle. The device-local enabled preference is
independent of provider ownership, defaults to enabled for existing owners,
and is not included in portable saves. Purchase and restore retain ownership;
restore and manual import do not overwrite an explicit disabled choice. The
runtime projects `owned && enabled` through the existing canonical Double IP
entitlement input, so active, offline, preview, ordinary Infinity and Break
Infinity calculations all use the same effective value.

`supporterCatGallery` is a third, distinct host-owned boolean. It is never
serialized into `IDSWEB1`, inferred from checkout navigation, or coupled to
Developer Options. Effective gallery access is
`supporterCatGallery || developerOptions`, preserving Cat Gallery access for
existing Developer Options owners without converting them into supporter
purchasers. The Store is the only gallery entry point and all UI uses the one
URL exported by `src/store/supporterCatGallery.ts`.

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
native-computed SHA-256 content hash, and promotion UTC timestamp. It never
records the raw Unity save or an absolute filesystem path. Renderer-provided
ownership, provenance, schema and hash claims are not authority. If the provider
later becomes unavailable,
the most recent verified record is used and an offline failure cannot revoke
it. With no verified cache or same-device evidence it fails closed. The cache
belongs to the native host, outside the shared save, so game resets do not erase
store ownership. Existing gameplay reset semantics continue to control the
local in-game Developer Options path.

A resolved provider refresh is authoritative for the current Store account,
including explicit negative ownership after revocation, account change,
restore, or sign-out. A rejected or unavailable refresh supplies no ownership
evidence and therefore retains the latest verified in-session value, then the
durable cache on a later launch. If persisting a resolved refresh fails, its
ownership still becomes authoritative for the active native process and the
host retries the pending cache write; older disk state cannot re-grant a
revoked product during that process. Provider refreshes are sequenced when they
start, so an older asynchronous completion cannot overwrite newer ownership;
each host also serializes the session and durable-cache read-modify-write path,
including pending retries and sticky supporter grants. New provider transactions remain
unfinished until verification has also been cached. The device-local Double IP enabled preference
remains writable offline only when that verified ownership exists; it persists
independently and is re-applied when the application is opened again.

An unverified durable StoreKit transaction makes the whole ownership snapshot
unavailable. It is never interpreted as negative ownership, written over the
last verified cache, or finished as a delivered transaction. Unverified
consumable-tip history does not affect the durable-product snapshot.

Consumable-derived supporter ownership is affirmative and sticky: a later
provider refresh that omits consumed transaction history must not erase it.
Android commits the supporter flag before calling Play consumption, including
detached and startup-drained purchases. iOS commits it to the non-synchronizing
Keychain record before `Transaction.finish()`, including transaction updates.
A persistence failure leaves the provider transaction unfinished and reports
no success. The development adapter models the same verify-before-UI sequence
without a provider or charge.

## Restore behavior

Restore Purchases is presented only alongside permanent upgrades. Returned
supporter IDs are ignored because repeatable consumables are not generally
restorable without an account-backed ledger. A restored product is counted and exposed only when the host
authority independently verifies the matching durable entitlement.
Restoring `ids.doubleip` never changes its device-local enabled preference.

Mobile release certification must exercise purchases, cancellation, pending
transactions, restoration, repeatable tips, offline cached ownership and
save-transfer isolation on private App Store and Play tracks. The StoreKit
implementation must additionally pass Xcode StoreKit configuration tests on a
Mac before real-device sandbox testing. Steam ownership remains a later desktop
provider gate.
