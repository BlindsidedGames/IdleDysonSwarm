# Bot boost release setup

`ids.botboost` grants permanent 2× Dyson Bot gains. The effect is disabled on a fresh save until enabled in Store. It never grants ownership through an imported save. Temporary claims add five wall-clock minutes, up to ten; claims reopen at five minutes remaining.

## Store configuration before sales

- Apple: create `ids.botboost` as a non-consumable, with approved price and localized listing. The StoreKit current-entitlements and restore paths include it.
- Google Play: create `ids.botboost` as a non-consumable one-time product. The billing query, acknowledgement and restore paths include it.
- Steam: ItemDef `1006` is the non-tradable, non-marketable permanent item, with purchase limit 1 and base price AUD2.99. Its definition is tracked in `hosts/electron/steam/itemdefs.json` and mapped in `hosts/electron/steam-inventory.json`. Inventory restoration and the encrypted offline cache include the entitlement.
- Website, if resumed: add `ids.botboost` to the website repository's Stripe product allowlist and price mapping, and return `botBoost` in verified ownership. The IDS client already sends the product ID and reads that field. Follow existing browser-bound receipt behaviour; no account or cross-device restoration is added.

Store setup on 20 September 2026: Apple product `6814040338` and Google product `ids.botboost` use AUD2.99 base pricing and eight localized listings. Apple is submitted with 4.1.9 for review; Google's backwards-compatible `permanent` Buy option is active. Steam ItemDef `1006` is published. Configuration does not establish purchase/restore acceptance; verify those paths separately. The website backend is unchanged. A missing listing remains unavailable; development's `Test $0` uses only the existing in-memory test adapter.

## Behaviour

The boost doubles final positive Dyson Bot gains, including direct creation. Bot costs and Simulation Bots are unchanged. Stored Time receives the boost while it is active in real time; processing an hour in twenty seconds consumes twenty seconds of the timer. Expiry is checked during processing, and elapsed time away also counts down.

Stats records Bot Boost Used as Yes after boosted Bots are gained, preserving that evidence through disabling, expiration, save/reload and prestige. Milestones capture usage at completion. Platform filtering and game rotation are local; no analytics is collected.
