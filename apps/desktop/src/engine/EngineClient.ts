import type { GameAction, GameState } from "@ids/core";
import type { ClientToWorkerMessage, WorkerToClientMessage } from "@ids/worker-protocol";

export type EngineStateListener = (state: GameState) => void;
export type EngineErrorListener = (error: string) => void;

export interface EngineClientOptions {
  initialState?: GameState;
  autoStart?: boolean;
  handshakeTimeoutMs?: number;
}

export class EngineClient {
  private readonly worker: Worker;
  private state: GameState | null = null;
  private error: string | null = null;
  private readonly listeners = new Set<EngineStateListener>();
  private readonly errorListeners = new Set<EngineErrorListener>();
  private handshakeTimeoutId: number | null = null;

  constructor(options?: EngineClientOptions) {
    this.worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
    this.worker.addEventListener("error", (event) => {
      const message = event instanceof ErrorEvent ? event.message : "Unknown worker error";
      this.setError(message);
    });
    this.worker.addEventListener("messageerror", () => {
      this.setError("Engine worker message error");
    });
    this.worker.onmessage = (event: MessageEvent<WorkerToClientMessage>) => {
      const msg = event.data;
      if (msg.type === "ERROR") {
        this.setError(msg.error);
        return;
      }
      if (msg.type === "READY" || msg.type === "STATE") {
        this.clearError();
        this.state = msg.state;
        for (const listener of this.listeners) listener(msg.state);
      }
    };

    this.post({ type: "INIT", state: options?.initialState });
    if (options?.autoStart !== false) this.post({ type: "START" });

    const handshakeTimeoutMs = options?.handshakeTimeoutMs ?? 5000;
    this.handshakeTimeoutId = window.setTimeout(() => {
      if (this.state) return;
      if (this.error) return;
      this.setError(`Engine worker did not respond within ${handshakeTimeoutMs}ms`);
    }, handshakeTimeoutMs);
  }

  private post(message: ClientToWorkerMessage) {
    this.worker.postMessage(message);
  }

  private setError(error: string) {
    this.error = error;
    if (this.handshakeTimeoutId != null) {
      clearTimeout(this.handshakeTimeoutId);
      this.handshakeTimeoutId = null;
    }
    for (const listener of this.errorListeners) listener(error);
  }

  private clearError() {
    this.error = null;
    if (this.handshakeTimeoutId != null) {
      clearTimeout(this.handshakeTimeoutId);
      this.handshakeTimeoutId = null;
    }
  }

  getState(): GameState | null {
    return this.state;
  }

  getError(): string | null {
    return this.error;
  }

  subscribe(listener: EngineStateListener): () => void {
    this.listeners.add(listener);
    if (this.state) listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeError(listener: EngineErrorListener): () => void {
    this.errorListeners.add(listener);
    if (this.error) listener(this.error);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  dispatch(action: GameAction) {
    this.post({ type: "DISPATCH", action });
  }

  loadState(nextState: GameState) {
    this.post({ type: "INIT", state: nextState });
  }

  destroy() {
    this.post({ type: "STOP" });
    this.worker.terminate();
    this.listeners.clear();
    this.errorListeners.clear();
    if (this.handshakeTimeoutId != null) {
      clearTimeout(this.handshakeTimeoutId);
      this.handshakeTimeoutId = null;
    }
  }
}
