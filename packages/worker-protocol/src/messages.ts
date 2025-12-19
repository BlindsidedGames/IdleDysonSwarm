import type { GameAction, GameState } from "@ids/core";

export type ClientToWorkerMessage =
  | { type: "INIT"; state?: GameState }
  | { type: "DISPATCH"; action: GameAction }
  | { type: "START" }
  | { type: "STOP" }
  | { type: "GET_STATE" };

export type WorkerToClientMessage =
  | { type: "READY"; state: GameState }
  | { type: "STATE"; state: GameState }
  | { type: "ERROR"; error: string };

