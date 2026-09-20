# Website-managed promotions

The website repository owns `public/promotions/v1/catalog.json` and immutable
`public/promotions/images/*.webp`. IDS ships a verified snapshot in
`src/promotions/bundled.json` and `src/promotions/assets/`.

## Contract and behavior

- Schema 1: revision string, games with stable IDs, enabled flags, locale-keyed
  plain-text title/description, ios/android/web/desktop links, and a banner path.
- Exact locale → base language → English. Existing translated game descriptions
  are preserved; new games can initially use English fallback.
- Mobile browsers use their matching store; desktop uses computer-playable
  destinations. IDS excludes `idle-dyson-swarm`. Whitecell and Blindsided Labs are excluded.
- Open cards retain their selected copy/link/artwork until closed. Refreshes
  update subsequent selections and the More games list.
- Startup and opening More games revalidate the catalog; visible resume and
  reconnect use the six-hour freshness window. All attempts are throttled to
  at most once a minute. Requests time out after ten seconds.
  HTTP caching supplies conditional revalidation. No gameplay polling.
- A valid remote catalog replaces the prior catalog, including an empty one.
  Invalid/unsupported responses keep the last valid content. Missing artwork
  falls back to that game's bundled image or a neutral reserved image area.
- `blindsided-promotions-v1` IndexedDB contains only marketing cache, never saves
  or entitlements. Images are limited to 250 KiB each and 20 MiB total, downloaded
  two at a time for the current platform. Bundled images are reused directly.
  Obsolete images are removed on refresh. Unavailable storage uses session state.
- Blob URLs belong to mounted image components and are revoked on replacement or
  unmount, so pruning the persistent cache cannot break an open card.
- HTTPS destinations use an explicit origin allowlist. Images come only from
  the website's promotions/images directory. Copy cannot execute HTML. The
  feature sends no analytics, cookies, accounts, or reward settings.

## Updating content

1. In the website checkout, verify each current store listing. Keep stable IDs;
   omit delisted platform links, or set enabled=false to disable a whole game.
2. Edit copy/links in the catalog. For new artwork, add original official captures
   and their provenance to `source-assets/promotions/sources.json`, then run
   `npm run promotions:build`. The script exports 960×540 WebP with content-hashed
   names. Portrait gameplay uses three uncropped panels; landscape uses a cover
   crop. Titles and promotional copy stay outside the images.
3. Change the revision, run `npm run promotions:check` and `npm run build`, then
   deploy the website. Verify JSON, CORS, ETag, and at least one banner publicly.
   Retain older hashed images on the website for older cached catalogs.
4. A website-only update reaches existing installations on their next eligible
   check. No IDS release is required. Roll back by publishing the prior catalog
   with a fresh revision and its original image references.
5. When releasing IDS, run `npm run promotions:sync -- /path/to/website/public/promotions`
   and `npm run promotions:check`. Commit the JSON and images together. Vite
   imports ensure artwork is packaged in native assets and the PWA precache.

Future apps provide their own bundled catalog, app ID, and platform to the small
client in `src/promotions`. Keep UI/rewards inside each app. Extract a package
only when there is a second consumer; no shared package is required today.

## QA

`src/promotions/client.test.ts` covers locale/platform selection, validation,
refresh deduplication, offline restoration, authoritative removals, storage/image
failure, and asset reuse. Existing Bot boost tests cover rotation and rewards.
Browser acceptance must additionally exercise real IndexedDB, a new catalog and
image across reload, offline PWA launch, and both dialogs at 360px/130% text.
Native-relative compilation alone does not establish iOS/Android interaction QA.

## Verification recorded 20 September 2026

- Website endpoint and all 13 image hashes, CORS and immutable headers verified
  after production deployment `73caf5d8.blindsidedgames.pages.dev`. Main website
  and IDS canonical redirects remained healthy; the existing IDS web build was
  not replaced by this deployment.
- Full suite: 1,734 tests passed. Final focused recheck: 16 tests passed. Web and
  native-relative builds, lint, localization and catalog validation passed.
- Isolated Chromium: a simulated website-only new entry and image persisted in
  real IndexedDB, survived a fully offline PWA reload, displayed in both views
  at 360px/130% text without overflow, and allowed claiming the boost offline.
  Reproduce with `npm run verify:promotions:browser` after `npm run build`; set
  `IDS_CHROMIUM_PATH` if Chrome is not installed in a harness default location.
- Real Electron host: the same new-entry/blob scenario survived file-origin
  renderer reload offline. QA used an isolated temporary profile.
- iOS/Android WebView persistence and device link-opening remain unverified.
  No Android device or AVD was available. Native-relative build success is not
  mobile device acceptance; verify these hosts before a mobile release.
