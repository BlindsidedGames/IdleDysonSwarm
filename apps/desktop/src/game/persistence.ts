import { isTauri } from "@tauri-apps/api/core";
import { applyAwayTime, migrateGameState } from "@ids/core";
import type { GameState } from "@ids/core";

const STORAGE_KEY = "ids.save.v1";
const LEGACY_STORAGE_KEY = "ids.save.v0";
const TAURI_SAVE_FILE = "ids.save.v1.json";

interface PersistedSaveV1 {
  v: 1;
  savedAtMs: number;
  state: GameState;
}

function isPersistedSaveV1(value: unknown): value is PersistedSaveV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as PersistedSaveV1).v === 1 &&
    typeof (value as PersistedSaveV1).savedAtMs === "number" &&
    typeof (value as PersistedSaveV1).state === "object" &&
    (value as PersistedSaveV1).state !== null
  );
}

async function readFromTauriFile(): Promise<string | null> {
  try {
    const { readTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    return await readTextFile(TAURI_SAVE_FILE, { baseDir: BaseDirectory.AppData });
  } catch {
    return null;
  }
}

async function writeToTauriFile(raw: string): Promise<void> {
  const { writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(TAURI_SAVE_FILE, raw, { baseDir: BaseDirectory.AppData });
}

function readFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToLocalStorage(raw: string) {
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // ignore
  }
}

let saveQueue: Promise<void> = Promise.resolve();

export async function saveState(state: GameState): Promise<void> {
  const wrapped: PersistedSaveV1 = { v: 1, savedAtMs: Date.now(), state };
  const raw = JSON.stringify(wrapped);

  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      if (isTauri()) {
        await writeToTauriFile(raw);
        return;
      }
      writeToLocalStorage(raw);
    });

  return saveQueue;
}

export async function loadSavedState(): Promise<GameState | null> {
  try {
    const raw = isTauri() ? (await readFromTauriFile()) ?? readFromLocalStorage() : readFromLocalStorage();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;

    if (isPersistedSaveV1(parsed)) {
      const state = migrateGameState(parsed.state);
      const awaySeconds = (Date.now() - parsed.savedAtMs) / 1000;
      applyAwayTime(state, awaySeconds);
      await saveState(state);
      return state;
    }

    const state = migrateGameState(parsed);
    await saveState(state);
    return state;
  } catch {
    return null;
  }
}

function base64EncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64DecodeUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function exportStateToBase64(state: GameState): string {
  return base64EncodeUtf8(JSON.stringify(state));
}

export function importStateFromBase64(base64: string): GameState {
  const json = base64DecodeUtf8(base64.trim());
  return migrateGameState(JSON.parse(json) as unknown);
}
