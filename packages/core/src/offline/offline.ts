import type { GameState } from "../state/types";

export function roundBankers(value: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = Math.sign(value);
  const abs = Math.abs(value);
  const floor = Math.floor(abs);
  const frac = abs - floor;

  if (frac < 0.5) return sign * floor;
  if (frac > 0.5) return sign * (floor + 1);
  return sign * (floor % 2 === 0 ? floor : floor + 1);
}

export function applyAwayTime(state: GameState, awaySeconds: number) {
  if (!Number.isFinite(awaySeconds) || awaySeconds <= 0) return;

  const seconds = awaySeconds < 0 ? 0 : awaySeconds;

  // Oracle.AwayForSeconds always adds raw away seconds to DoubleTime.
  state.sdPrestige.doubleTime += seconds;

  const settings = state.settings;

  // GameManager.ApplyReturnValues: offline time bank (capped).
  const remaining = settings.maxOfflineTime - settings.offlineTime;
  if (seconds >= remaining) {
    settings.offlineTime = settings.maxOfflineTime;
  } else {
    settings.offlineTime += seconds;
  }

  // InceptionController.ApplyReturnValues: influence/workers while away.
  const sd = state.saveData;
  const workerGenerationSpeed = 4 + state.prestigePlus.influence;
  const amountWhileAway = roundBankers(seconds * workerGenerationSpeed);

  if (sd.workerAutoConvert) {
    sd.influence += amountWhileAway;
    sd.universesConsumed += amountWhileAway;
    return;
  }

  const total = sd.workersReadyToGo + amountWhileAway;
  if (total >= 128) {
    sd.workersReadyToGo = 128;
    // Unity bug: adds 0 after clamping.
    sd.universesConsumed += 128 - sd.workersReadyToGo;
    return;
  }

  sd.workersReadyToGo += amountWhileAway;
  sd.universesConsumed += amountWhileAway;
}

