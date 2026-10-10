# Beta web checkout callback implementation plan

Read-only source inspection, 10 October 2026. This is a proposed follow-up, not callback implementation or deployment authorization. Sharing new purchase receipts or consumed-tip Gallery unlocks with public remains pending Matthew's answer. Progress saves remain separate regardless of that answer.

## Owners and current contract

- Game/frontend repository: `BlindsidedGames/IdleDysonSwarm`, primary checkout `/Users/matthewrushworth/Projects/Idle Dyson Swarm`. `src/store/browserStripe.ts:82–90` sends only `productId` and `deviceKey` to same-origin `/api/ids/stripe/checkout`. `src/platform/releaseFoundation.ts:160–177` selects the beta receipt cache while retaining the existing device identity. `verifyCurrentDevice` consumes `stripe_session_id` or cancellation query parameters, with device-bound provider verification.
- Website/backend repository: `BlindsidedGames/BlindsidedGames`, checkout `/Users/matthewrushworth/Projects/BlindsidedGames Website`, inspected clean at `927392a7c32abe363e7987f279a6e2df991ab857`. `functions/api/ids/stripe/checkout.ts` validates the incoming product/device and calls `functions/_utils/ids-stripe.ts:createCheckoutSession`. That helper hardcodes success/cancel paths to `/play/` at lines 130–131.
- `requireSameOrigin` accepts only an exact request Origin equal to the endpoint's origin. `checkoutReturnOrigin` accepts the endpoint's origin for `ids.blindsidedgames.com`, `localhost`, `127.0.0.1`, or hosts ending `.blindsidedgames.pages.dev`; otherwise it returns the fixed `https://ids.blindsidedgames.com`. The client cannot supply a return origin. Preserve these rules; do not broaden host permissions.
- `functions/_utils/ids-canonical-route.ts` redirects only `/` and `/play` on the IDS host, retaining query parameters. It does not rewrite `/rework-beta/`. No deployed route/worker behavior was queried.
- Receipt verification requires supplied signed tokens or a completed Stripe session bound to the device and configured price. Device-key-only Restore is not a server ledger. Callback selection must not silently decide receipt sharing.

## Required code changes

1. **Backend path contract:** add a finite `IdsCheckoutReturnPath` of `/play/` and `/rework-beta/`. Let the checkout endpoint accept an optional `returnPath`; absent means `/play/` for deployed public clients. Reject every other present value with 400 before calling Stripe, including absolute URLs, protocol-relative paths, traversal/encoded paths, query/fragment suffixes, missing trailing slash, null and nonstrings. Keep request Origin validation first.
2. **Session construction:** pass the validated path to `createCheckoutSession`; use the server-derived allowed origin plus that exact path for both success and cancellation. Preserve `stripe_session_id={CHECKOUT_SESSION_ID}`, `stripe_checkout=cancelled`, payment mode, price/quantity/tax, device hash and product metadata. Do not accept a full client-provided URL or derive origin from Referer.
3. **Frontend composition:** add an optional finite checkout return path to the real `BrowserStripeCommerce` configuration. Production beta composition explicitly selects `/rework-beta/`; legacy/default callers continue the public default. Send the selected path in checkout JSON. Do not infer it from arbitrary browser URLs. Purchase availability and product bindings stay unchanged.
4. **Verified return handling:** continue obtaining ownership from the existing verify endpoint. On success, persist the verified receipt in the approved destination before clearing the session query. Current code clears the query before `writeRecord`; a storage failure can otherwise lose the only checkout-session retry reference. A rejected/unpaid/wrong-device response must grant nothing and retain a safe retry path. Cancellation must return to beta without granting ownership. Decide the public receipt/Gallery sharing separately before certifying cross-channel purchases.

## Hosting/config follow-up

The beta artifact needs its own `public/rework-beta/` route, headers and manifest/worker scope under the existing IDS origin. Add a separate managed beta header block for `/rework-beta/*`; preserve the public `/play/*` block and public static files byte-for-byte. Confirm actual public worker scope does not control the beta route; startup's foreign-controller guard is supplementary and cannot certify deployed routing.

The game's `release/website-promotion.json` and `scripts/websitePromotion.ts` are deliberately hardwired to `public/play`, `/play/` manifest scope and public header markers. They currently reject the beta artifact. Author a separate beta promotion configuration/entry point or explicitly reviewed channel support; do not change the public default or reuse its destructive replacement directory. Verify a staged package only in an isolated website copy before any deployment request.

Callback routing needs no new Stripe account, price/product, secret, provider allowlist, app identity or Cloudflare permission. Existing endpoint/environment bindings remain. The inspected website catalog currently has five existing products and no `ids.botboost` entry; adding that product is a separate catalog/config task and is not required for callback routing. Existing unconfigured product behavior remains.

## Safest validation

- Extend the owning website checkout endpoint tests with a fake global fetch that captures the Stripe form and returns a synthetic checkout session. Exercise default public and explicit beta success/cancel URLs, same-origin refusal, rejected path cases and zero provider calls for invalid requests. No network/provider requests or real keys are needed. Keep the helper's existing signed-token/device/paid-price tests; baseline is **3/3 passing** under Node 24.
- Extend the existing game Stripe adapter owner tests with explicit beta/default checkout bodies, paid return, cancellation, malformed/denied provider response and quota failure. Verify device identity, receipt destinations, retained retry query on failure and unchanged public progress. Receipt-sharing assertions must follow the approved policy, not invent one.
- Use a disposable mock-Keychain, sandbox-enabled Chromium profile against a loopback staging server. Intercept all Stripe endpoints and block non-loopback requests. Simulate a completed checkout redirect to beta and cancellation; verify selected save namespace, query cleanup ordering, verified ownership, Restore, public save/backup/lease/cache preservation and refresh/reopen. Do not open Stripe Checkout or submit a transaction.
- Run owner tests, TypeScript/site checks and builds, then the combined suite if implementation changes shared runtime/packaging. Verify generated beta HTML/manifest/worker URLs, scoped cache deletion and static staging headers. Use no provider emulators that require new account permissions.
- Packaged/native provider Restore and real deployed worker/routing verification remain separate follow-ups. Local mocks do not certify live purchases or authorize deployment.

## Main integration and release boundary

Approved IDLEDS migration/archive, beta isolation and Restore correctness can land on local main independently of this plan. The previous isolated candidate was left off main while the receipt policy was unresolved; that was unnecessary coupling of already authorized technical work to a pending purchase policy. The authorized changes are now combined on a copy of current main without conflicts; callback/sharing code is absent.

Release remains held for the web callback/receipt decision, newly consumed mobile-tip Gallery handoff, actual packaged/deployed isolation, and the pending Forager seventh-point/finite-reward and Farming banking policy. No remote operation, website edit, provider transaction, native game launch or deployment is part of this integration.
