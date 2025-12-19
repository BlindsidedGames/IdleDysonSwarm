# Idle Dyson Swarm (UnityIDS → Tauri rewrite)

`UnityIDS/` is the Unity reference project (read-only).

Rewrite workspace:
- `apps/desktop/`: Tauri + Vite + React UI
- `packages/balance/`: Zod-validated balance/config JSON (from `plan.md` + `skill_tree_inventory.md`)
- `packages/core/`: TS simulation core (math + state + actions)
- `packages/worker-protocol/`: typed UI ⇄ worker message protocol
- `tools/unity-extract/`: small offline extract/generator scripts

## Dev

- Install: `pnpm install`
- Run in browser (Vite): `pnpm dev`
- Run as desktop (Tauri): `pnpm tauri dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`

## Save / Import / Export

Current scaffold uses `localStorage` and a Base64 JSON export/import (Settings tab).

