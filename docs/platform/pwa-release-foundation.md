# PWA release foundation

Operational release sequencing, Stripe and Cloudflare invariants, preview
rules, production checks, and rollback requirements live in
`website-deployment-rules.md`.

The Web release is packaged exclusively for `/play/`. Vite's base path, the
manifest `start_url` and `scope`, icon URLs, generated service worker, and
Cloudflare header fragment all use that same route. The canonical public URL
is `https://ids.blindsidedgames.com/play/`.

## Offline and update behavior

The build plugin generates `service-worker.js` from the final hashed Vite
bundle. Installation precaches the application shell, hashed JavaScript, CSS,
fonts, images, manifest, and PWA icons. Navigations remain network-first and
fall back to the cached `/play/` shell when offline. Static precached assets
fall back to their cache entries.

The service worker never writes arbitrary requests to CacheStorage. It caches
only the generated package allowlist and never reads or writes IndexedDB,
`localStorage`, save exports, or canonical save envelopes. Browser save data
therefore remains exclusively under the existing persistence repository.

A newly installed worker remains waiting. The current session shows a small
update prompt only after a controlling worker already exists. Selecting
**Save and update** first invokes the production safe-reload boundary. That
boundary must verify a checkpoint and finish orderly runtime shutdown before
the client sends `ACTIVATE_UPDATE` to the waiting worker. The page reloads only
after `controllerchange`. If the browser never confirms activation, a bounded
15-second fallback reloads the already-verified checkpoint instead of leaving
a shut-down runtime on screen. A failed checkpoint leaves the worker waiting
and the current game open so the player can retry.

The controller asks for an update at startup and hourly during a long-running
session. Registration failure is non-fatal and never blocks the game.

## Local verification

```powershell
npm run pwa:icons
npm test -- src/browser/productionPackaging.test.ts
npm run lint
npm run build
```

Serve `dist` through an HTTPS-capable static host with `/play/` mapped to the
dist root when testing installation, offline navigation, or worker updates.
Vite preview is suitable for package inspection but a real preview deployment
remains the acceptance authority.

## Website promotion

`release/website-promotion.json` pins the source and destination repositories,
the website paths managed by the promotion, and the markers used to merge the
`/play/*` security-header block without replacing unrelated website rules.

The preparation command requires both complete Git commit SHAs:

```powershell
npm run website:promotion:prepare -- `
  --release-id 2026080201 `
  --source-sha <40-character-game-commit> `
  --website-ref <40-character-website-commit>
```

It verifies the PWA package, copies it into ignored
`output/website-promotion/`, records SHA-256 and byte length for every promoted
file, and emits a route-specific header fragment. The apply command refuses a
website checkout whose `HEAD` differs from the recorded pinned commit and
revalidates every checksum before changing the exact configured website paths.

Promotion is prepared and applied locally. The promoted files and managed
header fragment remain checksum-protected, and manifest identity must match the
pinned release configuration. After review, the website checkout is committed
and pushed normally; its own Cloudflare integration performs deployment.
GitHub Actions in the game repository has no website token and does not create,
merge, or deploy a website pull request.
