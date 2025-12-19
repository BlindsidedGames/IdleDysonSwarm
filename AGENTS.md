# Agent Notes: UnityIDS -> Windows/Tauri Rewrite (Parity First)

This repo contains:
- `UnityIDS/`: Unity reference implementation (kept for verification).
- Repo root: the ground-up rewrite workspace (no Unity runtime).

## Non-negotiables

- Do not rebalance. Do not "clean up" formulas unless you can prove output parity.
- Prefer JS `number` (IEEE-754 double) to match C# `double` behavior, including `Infinity`/`NaN`.
- Balance-critical values often live in serialized overrides like `UnityIDS/Assets/Scenes/Game.unity`. Never assume code defaults are correct.
- Do not edit or commit anything under `UnityIDS/Library/` (generated).

## Scope

- Target: Windows desktop only (Tauri).
- No mobile frameworks and no store/IAP integration.
  - Preserve gameplay-affecting entitlement flags (e.g., `debug`, `doubleip`) as local save/settings toggles for parity testing; default to "off".

## Source of truth (gameplay)

If you are porting gameplay, these files are the reference:

- `UnityIDS/Assets/Scripts/Expansion/Oracle.cs` (save model, Infinity/PrestigePlus resets, settings)
- `UnityIDS/Assets/Scripts/Systems/GameManager.cs` (tick loop, production, modifiers, prestige triggers)
- `UnityIDS/Assets/Scripts/Expansion/ResearchManager.cs` (Strange Matter upgrades + translation/speed costs; also re-applies upgrades after prestige)
- `UnityIDS/Assets/Scripts/Expansion/Dream1/*` (Simulation/Dream1 loop)
- `UnityIDS/Assets/Scripts/Expansion/InceptionController.cs` (Reality/influence loop)
- `UnityIDS/Assets/Scripts/SkillTresStuff/SetSkillsOnOracle.cs` (maps skill IDs -> `DysonVerseSkillTreeData` flags)
- `UnityIDS/Assets/Scenes/Game.unity` (authoritative skill tree metadata + tuned numeric overrides)

Purchase/entitlements (reference only; do not implement stores):
- `UnityIDS/Assets/Resources/IAPProductCatalog.json`
- `UnityIDS/Assets/Scripts/DebugPurchaseHandler.cs`

Inventory artifacts (generated during planning):
- `skill_tree_inventory.md` (IDs 1-104, extracted from `UnityIDS/Assets/Scenes/Game.unity`)

## Working rules for the migration

- Treat `UnityIDS/` as read-only reference content unless explicitly asked otherwise.
- New rewrite code should live outside `UnityIDS/` (recommended: `apps/`, `packages/`, `tools/`).
- Save persistence is already implemented; do not add Odin serializer parity unless explicitly requested.
- When you discover a value that affects balance (cost, exponent, timer, threshold):
  - Track its source (script vs scene override).
  - Prefer extracting it into a typed JSON config (validated by Zod) rather than hardcoding it again.

## Testing and parity strategy

- Add a golden-master scenario runner early:
  - Prefer collecting expected snapshots without modifying the Unity project (e.g., via existing save/export flows).
  - If automation becomes necessary, add the smallest-possible tooling and keep it clearly separated from the rewrite code.
- Port math helpers first (`BuyXCost`, `MaxAffordable`, formatting) and lock with unit tests.
- Be careful with update cadence:
  - Unity uses per-frame updates plus repeated invocations (e.g., modifiers every 1s). If you change cadence, you can change balance.

## Worker architecture (target)

- The simulation core is UI-agnostic and runs in a Web Worker (inside Tauri).
- The worker is the authoritative source of state.
- UI sends actions (purchase, toggle, assign skill, prestige, etc.) and receives snapshots.
- Avoid sending huge snapshots every frame; throttle and/or send diffs where practical, but keep correctness first.

## Style expectations (for the new TS/Rust code)

- TypeScript: strict mode, explicit types for state/actions, no implicit `any`.
- Use Zod schemas for any JSON balance/config.
- Use Prettier/ESLint consistently; do not hand-format.
- Keep modules small and named after gameplay concepts (DysonVerse, Reality, Dream1, etc.).
