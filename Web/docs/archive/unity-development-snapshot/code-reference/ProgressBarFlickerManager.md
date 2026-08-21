# ProgressBarFlickerManager

## Purpose
Central place to decide how production progress bars should be visually represented:
- **Solid** (full fill) when completions are frequent enough that a moving bar would just flicker.
- **Progressing** (fractional fill) when completions are infrequent enough that seeing progression is useful.

This is intended to be shared by many UI scripts over time (BotPanelManager is the first adopter).

## Inputs/Outputs
- Input: `completionsPerSecond` (double)
  - Should match the production-rate values used by the simulation (e.g., facility `ProductionRate`).
- Input: `runningCountWithFraction` (double)
  - A monotonically increasing count that carries fractional progress in its `x % 1` portion.
- Output: `fillAmount` (float, clamped to `[0..1]`)

## Configuration (global)
PlayerPrefs:
- Key: `progress_bars.solid_threshold_per_second`
- Meaning: if `completionsPerSecond >= threshold`, bar renders solid (`fillAmount = 1`).
- Default: `4.0`.

API:
- `ProgressBarFlickerManager.SolidFillThresholdPerSecond`
  - Reads/writes PlayerPrefs.

## Current Call Sites
- `/Users/matthewrushworth/Projects/Idle Dyson Swarm/Assets/Scripts/Buildings/BotPanelManager.cs`
  - Uses it for assembly lines, managers, servers, data centers, planets, and mega-structure bars.

## Save/Load Implications
- Renaming `SolidFillThresholdPerSecondPrefKey` will orphan existing player configurations.

## Verification
1. In a scene/prefab where `BotPanelManager` is present, wire the new `*ProgressBarRoot` fields to the bar root GameObjects.
2. Ensure a facility has **0** production: its bar root should disable (no dead bar visible).
3. Ensure a facility has low production (< threshold): bar should show fractional progression.
4. Ensure a facility has high production (>= threshold): bar should stay solid (full).
