import type { GameState } from "../state/types";

export function sendWorkers(state: GameState) {
  state.saveData.influence += 128;
  state.saveData.workersReadyToGo = 0;
}

export function tickReality(state: GameState, dt: number) {
  const sd = state.saveData;
  const pp = state.prestigePlus;
  const runtime = state.runtime.reality;

  const workerGenerationSpeed = 4 + pp.influence;

  if (sd.workersReadyToGo >= 128 && !sd.workerAutoConvert) return;
  if (sd.workersReadyToGo >= 128) sendWorkers(state);

  runtime.workerGenerationTime += workerGenerationSpeed * dt;

  while (runtime.workerGenerationTime > 1) {
    sd.workersReadyToGo += 1;
    sd.universesConsumed += 1;
    runtime.workerGenerationTime -= 1;
  }

  if (sd.workersReadyToGo < 0) sd.workersReadyToGo = 0;
}

