# Agent Notes: Unity -> Web/Tauri Rewrite (Parity First)

This repo is currently a Unity project. The goal is a complete rebuild (no Unity runtime) while keeping gameplay/balance 1:1.

## Non-negotiables

- Do not rebalance. Do not "clean up" formulas unless you can prove output parity.
- Prefer JS `number` (IEEE-754 double) to match C# `double` behavior, including `Infinity`/`NaN`.
- Balance-critical values often live in `Assets/Scenes/Game.unity` (serialized overrides). Never assume code defaults are correct.
- Do not edit or commit anything under `Library/` (generated).

## Source of truth (gameplay)

If you are porting gameplay, these files are the reference:

- `Assets/Scripts/Expansion/Oracle.cs` (save model, Infinity/PrestigePlus resets, clipboard export/import, settings)
- `Assets/Scripts/Systems/GameManager.cs` (tick loop, production, modifiers, prestige triggers)
- `Assets/Scripts/Expansion/ResearchManager.cs` (Strange Matter upgrades + translation/speed costs; also re-applies upgrades after prestige)
- `Assets/Scripts/Expansion/Dream1/*` (Simulation/Dream1 loop)
- `Assets/Scripts/Expansion/InceptionController.cs` (Reality/influence loop)
- `Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs` (maps skill IDs -> `DysonVerseSkillTreeData` flags)
- `Assets/Scenes/Game.unity` (authoritative skill tree metadata + tuned numeric overrides)

Purchase/entitlements:
- `Assets/Resources/IAPProductCatalog.json`
- `Assets/Scripts/DebugPurchaseHandler.cs`

Inventory artifacts (generated during planning):
- `skill_tree_inventory.md` (IDs 1-104, extracted from `Assets/Scenes/Game.unity`)

## Working rules for the migration

- Keep Unity content intact as a reference implementation until parity is verified.
- New code for the web/desktop rewrite should live outside `Assets/` (Unity will try to import anything under `Assets/`).
  - Recommended top-level folders: `apps/`, `packages/`, `tools/`.
- When you discover a value that affects balance (cost, exponent, timer, threshold):
  - Track its source (script vs scene override).
  - Prefer exporting it into a typed JSON config (validated by Zod) rather than hardcoding it again.

## Testing and parity strategy

- Add a golden-master scenario runner early:
  - Generate expected outputs from Unity (instrumented build or editor script).
  - Re-run the same scenarios in TS under Vitest and compare state snapshots.
- Port math helpers first (`BuyXCost`, `MaxAffordable`, formatting) and lock with unit tests.
- Be careful with update cadence:
  - Unity uses per-frame updates plus repeated invocations (e.g., modifiers every 1s). If you change cadence, you can change balance.

## Worker architecture (target)

- The simulation core is UI-agnostic and runs in a Web Worker.
- The worker is the authoritative source of state.
- UI sends actions (purchase, toggle, assign skill, prestige, etc.) and receives snapshots.
- Avoid sending huge snapshots every frame; throttle and/or send diffs where practical, but keep correctness first.

## Style expectations (for the new TS/Rust code)

- TypeScript: strict mode, explicit types for state/actions, no implicit `any`.
- Use Zod schemas for any JSON balance/config.
- Use Prettier/ESLint consistently; do not hand-format.
- Keep modules small and named after gameplay concepts (DysonVerse, Reality, Dream1, etc.).

