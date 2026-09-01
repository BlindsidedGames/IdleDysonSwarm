# Contributor routing

Idle Dyson Swarm's TypeScript/React product and native hosts are canonical.
Use this file as a map to the owning implementation and living contracts, not
as a second product specification.

For Discord bug campaigns, follow
`docs/process/discord-bug-campaign-workflow.md`. It owns the campaign gates,
task handoff, review order, CI use, release-note approval, and cleanup rules.

## Read before changing behavior-adjacent code

- Repository and documentation map: `README.md`, `STRUCTURE.md`, and
  `docs/README.md`.
- Architecture and state ownership: `docs/contracts/architecture.md` and
  `docs/contracts/state-and-persistence-contract.md`.
- Gameplay update and lifecycle ordering:
  `docs/contracts/simulation-contract.md`,
  `docs/contracts/game-processing-and-offline-time-contract.md`, and
  `docs/contracts/lifecycle-infinity-contract.md`.
- Presentation and accessibility: `docs/contracts/product-ui-foundation.md`.
- Existing-player compatibility: `docs/platform/legacy-save-compatibility.md`
  and `docs/platform/save-import-recovery.md`.
- Host, commerce, and release boundaries: the relevant file in
  `docs/platform/`.

## Canonical implementation entry points

- Save preparation and publication: `src/save/prepare.ts`,
  `src/save/repository.ts`, and `src/game-state/mapping.ts`.
- Shared active/Stored Time update: `src/simulation/gameStep.ts` and
  `src/simulation/canonicalEventTimeModel.ts`.
- Facilities: `src/simulation/dysonFacilityCatalog.ts` and its command,
  automation, derivation, and model consumers.
- Application boundary: `src/application/canonicalGameApplication.ts` and
  `src/application/canonicalLifecycleCoordinator.ts`.
- UI read/write boundary: `src/application/frontendSnapshot.ts`,
  `src/application/canonicalPlayerCommands.ts`, and `src/ui/runtime/`.
- Store authority: `src/store/contracts.ts`, `src/store/storefront.ts`, and
  host-specific composition modules.
- Localization: `src/ui/i18n/localeRegistry.ts`, `localePreference.ts`, and
  the package `i18n:*` scripts.
- Native release identity: hand-edit only `hosts/native-release.json`; use
  `scripts/sync-native-release.ts` to materialize host metadata.

## Evidence and change rules

Current explicit product decisions and observable current behavior outrank
comments, tests, audits, backlogs, and historical implementations. Tests and
fixtures protect behavior only after their current intent is confirmed. Treat
`docs/archive/`, dated audits, and the frozen Unity handoff as evidence, not
automatic instructions. The Unity capsule becomes active only where a current
TypeScript module explicitly consumes and validates a retained value.

Preserve gameplay, saves, stable IDs, UI and accessibility behavior, host
lifecycle, entitlements, schemas, and platform compatibility unless a task
explicitly authorizes a product change. Prefer one bounded change with focused
characterization coverage. Do not regenerate fixtures to hide drift.

For every code checkpoint run focused tests plus:

```text
npm test
npm run lint
npm run build
npm run data:check
```

Add save/parity, localization, browser, native, performance, and real-device
evidence when the touched boundary requires it. Keep correctness and
performance claims separate.
