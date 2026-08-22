# Idle Dyson Swarm website deployment rules

This is the operational source of truth for publishing the Web game at
`https://ids.blindsidedgames.com/play/`. It complements the package and
service-worker details in `pwa-release-foundation.md`.

## Repository boundary

Website releases always cross two repositories:

1. `BlindsidedGames/IdleDysonSwarm` owns the Web source, tests, PWA package,
   promotion manifest, and protected promotion workflow.
2. `BlindsidedGames/BlindsidedGames` owns the deployed `public/play` package,
   Cloudflare Pages Functions, Stripe price bindings, and Pages deployment.

That website repository is also the sole production owner of
`/api/ids/stripe`. Game-client changes that extend its response contract do not
complete browser fulfillment until the matching Pages Function and deployment
are reviewed, tested, and released there.

The Supporter Cat Gallery receipt contract was completed in website PR
`BlindsidedGames/BlindsidedGames#5` (merge
`26e8a169f75ea1938e08c912e9d1524666ec6dc5`). Its three supporter SKUs grant one
device-bound `supporterCatGallery` entitlement without merging the independent
Developer Options or Double Infinity Points grants. The implementation and
focused receipt-contract fixtures were validated without performing a checkout
or purchase; each later website promotion must still verify the deployed
endpoint and its environment bindings.

Pushing the game repository does not publish the website. Pushing a generated
Web build without a matching website commit also does not complete a release.
Keep source publication, website promotion, merge, production deployment, and
live verification as separate checkpoints.

## Durable production state

Ordinary releases must reuse rather than recreate:

- canonical origin `https://ids.blindsidedgames.com`;
- canonical game path `/play/`;
- the Cloudflare Pages project `blindsidedgames`;
- the `ids.blindsidedgames.com` custom-domain attachment, proxied CNAME, and
  managed TLS certificate;
- live Stripe products and the five `IDS_STRIPE_PRICE_*` bindings in the
  website repository;
- production secrets `STRIPE_SECRET_KEY` and `IDS_STRIPE_TOKEN_SECRET`; and
- the current automatic payout schedule, which is business-account state and
  not part of a code deployment.

Never commit a Stripe secret. Rotate the live key only after exposure,
intentional credential replacement, or a Stripe security requirement. Stripe
prices are immutable release references: create a replacement live price and
update only its matching website binding when a price changes.

## Canonical routing

The website repository owns hostname-specific redirects. On
`ids.blindsidedgames.com`, both `/` and `/play` permanently redirect to
`/play/`. Other Blindsided Games hostnames retain their normal website routes.
Do not implement this with a path-only `_redirects` rule because the Pages
project also serves `blindsidedgames.com` and `www.blindsidedgames.com`.

Keep the PWA base path, manifest `start_url`, manifest scope, service-worker
scope, icons, and security headers on `/play/`. Do not move the game to another
origin without an explicit save and entitlement migration plan. Browser saves
and Web entitlements are origin-scoped and device-bound.

## Prepare and validate the game release

Start from a fresh worktree based on current `main`. From the repository root:

```powershell
npm ci
npm run pwa:icons
npm test
npm run lint
npm run i18n:check
npm run build
git diff --check
```

Use a ten-digit UTC release candidate ID in `YYYYMMDDNN` form. Record the full
game commit and the exact website commit onto which the package will be
promoted.

```powershell
npm run website:promotion:prepare -- `
  --release-id <YYYYMMDDNN> `
  --source-sha <40-character-game-commit> `
  --website-ref <40-character-website-commit>
```

Prefer the manual `promote-web-pwa.yml` workflow when its protected
`website-promotion` environment and repository-scoped
`WEBSITE_PROMOTION_TOKEN` are available. It validates the game, checks out the
pinned website revision, applies the checksummed package, and opens a website
pull request. It deliberately does not merge or deploy that pull request.

For a local promotion, apply only the generated package to a clean website
checkout whose `HEAD` still equals the pinned website commit:

```powershell
npm run website:promotion:apply -- `
  --package <promotion-package-directory> `
  --website-checkout <BlindsidedGames-checkout>
```

Review the promoted `public/play` package, managed header block, and promotion
record before committing the website change.

## Preview rules

Use a Cloudflare preview deployment before production and inspect the actual
preview URL. A preview is acceptance evidence, not production authority.

Production and Sandbox Stripe configuration must never be mixed. A test key
requires test price IDs; a live key requires live price IDs. For ordinary UI
changes, checkout may remain disabled in preview. For checkout changes, use a
separate preview project or explicit preview environment containing the full
test-key and test-price set.

Verify on preview:

- `/play/` loads with no console errors;
- the PWA manifest, icons, hashed assets, and service worker resolve under
  `/play/`;
- existing saves remain readable;
- save export and import still work;
- the update prompt creates a verified checkpoint before reload; and
- Store messaging still states that Web entitlements are device/browser-bound
  and are not restored on another device.
- in Stripe test mode, every supporter SKU is accepted only after a paid
  server-verified session, repeated verification is idempotent, and unpaid,
  mismatched, tampered, or replayed session claims fail closed;

## Production deployment

Production deployment requires explicit approval after the website change is
reviewed and committed. From a clean website checkout:

```powershell
npm ci
npm run build
git diff --check
npx wrangler whoami
npm run deploy:pages
```

The website Pages project is GitHub-connected, so a push to its production
branch may also trigger a deployment. Record the deployment selected as the
release authority and verify that exact deployment rather than assuming the
most recent build won.

Do not recreate the custom domain or upload unchanged secrets during an
ordinary release.

## Production verification

Verify all of the following before declaring the release complete:

1. `https://ids.blindsidedgames.com/` returns a permanent redirect to
   `https://ids.blindsidedgames.com/play/`.
2. `https://ids.blindsidedgames.com/play` returns the same canonical redirect.
3. `https://ids.blindsidedgames.com/play/` returns `200` and loads the game.
4. Existing browser saves and entitlements remain available.
5. `/api/ids/stripe/catalog` returns all five configured products as available.
6. When Store or backend code changed, create one unpaid Checkout session and
   verify that Stripe returns `checkout.stripe.com` with a `cs_live_` session.
   Never complete a real payment as a deployment smoke test.
7. Stripe Account status has no payment-blocking active task.

Keep the deployment URL, game commit, website commit, validation results, and
rollback target in the release handoff.

## Rollback

Roll back the website deployment to the last verified website commit or Pages
deployment. Do not roll back Stripe secrets, prices, DNS, or the custom-domain
attachment unless those resources caused the incident. After rollback, repeat
the canonical-route, save-loading, catalog, and unpaid Checkout-session checks.
