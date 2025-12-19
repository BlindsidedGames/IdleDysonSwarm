/// <reference lib="webworker" />

import { calculateDysonVerseModifiers, createDefaultGameState, migrateGameState, reduceGameAction, setBotDistribution } from "@ids/core";
import type { ClientToWorkerMessage, WorkerToClientMessage } from "@ids/worker-protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let state = createDefaultGameState();
let intervalId: number | null = null;
let lastNow = 0;
let lastSnapshotAt = 0;

const SNAPSHOT_INTERVAL_MS = 250;

function postMessage(message: WorkerToClientMessage) {
  ctx.postMessage(message);
}

function stopLoop() {
  if (intervalId == null) return;
  clearInterval(intervalId);
  intervalId = null;
}

function startLoop() {
  if (intervalId != null) return;
  lastNow = performance.now();
  lastSnapshotAt = 0;
  intervalId = setInterval(() => {
    const now = performance.now();
    const dt = (now - lastNow) / 1000;
    lastNow = now;
    state = reduceGameAction(state, { type: "TICK", dt });
    if (now - lastSnapshotAt >= SNAPSHOT_INTERVAL_MS) {
      lastSnapshotAt = now;
      postMessage({ type: "STATE", state });
    }
  }, 1000 / 30) as unknown as number;
}

ctx.onmessage = (event: MessageEvent<ClientToWorkerMessage>) => {
  try {
    const msg = event.data;
    if (msg.type === "INIT") {
      state = migrateGameState(msg.state ?? createDefaultGameState());
      setBotDistribution(state);
      calculateDysonVerseModifiers(state);
      postMessage({ type: "READY", state });
      return;
    }
    if (msg.type === "DISPATCH") {
      state = reduceGameAction(state, msg.action);
      postMessage({ type: "STATE", state });
      return;
    }
    if (msg.type === "GET_STATE") {
      postMessage({ type: "STATE", state });
      return;
    }
    if (msg.type === "START") {
      startLoop();
      return;
    }
    if (msg.type === "STOP") {
      stopLoop();
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postMessage({ type: "ERROR", error: message });
  }
};
