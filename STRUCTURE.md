# Repository structure

`main` contains the canonical Web game and its native hosts. The removed Unity
development tree is preserved publicly on
`archive/unity-development-handoff-2026-08-21` and tag
`unity-dev-handoff-2026-08-21`.

## Root

- `Web/` — canonical game, tests, documentation, build tooling, and hosts.
- `.github/workflows/` — Web, website-promotion, and native release automation.
- `.agents/workflows/` — repository-specific assistant workflows.

## Web

- `src/` — TypeScript/React application, gameplay simulation, save migration,
  Store contracts, UI, workers, and platform boundaries.
- `src/game-data/authored/` — versioned Web-owned gameplay-data inputs.
- `src/game-data/generated/` — deterministic runtime projections consumed by
  the game; validate with `npm run data:check`.
- `src/ui/assets/` and `public/` — shipped UI and browser assets.
- `source-assets/` — non-shipped masters and platform reference assets.
- `test/fixtures/` — immutable compatibility and progression fixtures.
- `hosts/capacitor/` — Android and iOS native hosts.
- `hosts/electron/` — desktop/Steam host.
- `scripts/` — release, validation, data, and performance tooling.
- `docs/` — current contracts, platform guidance, product direction, audits,
  release evidence, and explicitly frozen history.
