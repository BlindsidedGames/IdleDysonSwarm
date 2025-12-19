import { createDefaultGameState } from "./defaultState";
import type { GameState } from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeValues(base: unknown, patch: unknown): unknown {
  if (Array.isArray(base)) {
    if (!Array.isArray(patch)) return base;

    if (
      base.length === 2 &&
      typeof base[0] === "number" &&
      typeof base[1] === "number" &&
      patch.length >= 2
    ) {
      const a = typeof patch[0] === "number" ? patch[0] : base[0];
      const b = typeof patch[1] === "number" ? patch[1] : base[1];
      return [a, b];
    }

    if (base.length > 0 && typeof base[0] === "number") {
      return patch.filter((v): v is number => typeof v === "number");
    }

    return patch.slice();
  }

  if (typeof base === "number") return typeof patch === "number" ? patch : base;
  if (typeof base === "boolean") return typeof patch === "boolean" ? patch : base;
  if (typeof base === "string") return typeof patch === "string" ? patch : base;

  if (isRecord(base)) {
    if (!isRecord(patch)) return base;
    const out: UnknownRecord = { ...base };

    for (const [key, patchValue] of Object.entries(patch)) {
      if (!(key in out)) out[key] = patchValue;
    }

    for (const key of Object.keys(out)) {
      if (key in patch) out[key] = mergeValues(out[key], (patch as UnknownRecord)[key]);
    }

    return out;
  }

  return base;
}

export function migrateGameState(input: unknown): GameState {
  const base = createDefaultGameState();
  if (!isRecord(input)) return base;

  const merged = mergeValues(base, input) as GameState;

  merged.runtime.manualBotCreation.running = false;
  merged.runtime.manualBotCreation.time = 0;

  if (!merged.settings.cheater && merged.settings.maxOfflineTime < 86400) merged.settings.maxOfflineTime = 86400;
  if (merged.settings.maxOfflineTime >= 8640000) merged.settings.maxOfflineTime = 86400;
  if (merged.settings.offlineTime < 0) merged.settings.offlineTime = 0;
  if (merged.settings.offlineTime > merged.settings.maxOfflineTime) merged.settings.offlineTime = merged.settings.maxOfflineTime;
  if (
    merged.settings.numberFormatting !== "standard" &&
    merged.settings.numberFormatting !== "engineering" &&
    merged.settings.numberFormatting !== "scientific"
  ) {
    merged.settings.numberFormatting = "standard";
  }

  return merged;
}
