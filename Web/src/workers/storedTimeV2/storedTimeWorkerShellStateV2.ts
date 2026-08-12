import {
  createStoredTimeWorkerTransportBudgetTerminalV2,
  type StoredTimeWorkerAccountingDtoV2,
  type StoredTimeWorkerMainMessageV2,
  type StoredTimeWorkerMessageV2,
} from './workerProtocolV2'

export class StoredTimeWorkerShellStateV2 {
  #activeMessage: Readonly<StoredTimeWorkerMainMessageV2> | null = null
  #durableAccounting: Readonly<StoredTimeWorkerAccountingDtoV2> | null = null
  #transportTerminating = false

  get active(): boolean { return this.#activeMessage !== null }
  get transportTerminating(): boolean { return this.#transportTerminating }

  beforeAccept(message: Readonly<StoredTimeWorkerMainMessageV2>): void {
    if (message.type === 'start') {
      this.#activeMessage = message
      this.#durableAccounting = message.restart?.cumulativeAccounting ?? null
    } else if (message.type === 'checkpoint-committed') {
      this.#activeMessage = message
      this.#durableAccounting = message.accounting
    }
  }

  afterAccept(message: Readonly<StoredTimeWorkerMainMessageV2>): void {
    if (message.type === 'checkpoint-committed' &&
      message.sealedRemainingDurationSeconds === 0 &&
      this.#activeMessage === message) {
      this.clearTerminal()
    }
  }

  observeWorkerMessage(message: Readonly<StoredTimeWorkerMessageV2>): void {
    if (message.type === 'cancelled' || message.type === 'paused' ||
      message.type === 'failed') this.clearTerminal()
  }

  beginTransportBudgetTerminal(): ReturnType<
    typeof createStoredTimeWorkerTransportBudgetTerminalV2
  > | null {
    if (this.#activeMessage === null || this.#transportTerminating) return null
    this.#transportTerminating = true
    return createStoredTimeWorkerTransportBudgetTerminalV2(
      this.#activeMessage,
      this.#durableAccounting ?? undefined,
    )
  }

  finishTransportBudgetTerminal(): void {
    this.#activeMessage = null
    this.#durableAccounting = null
    this.#transportTerminating = false
  }

  clearTerminal(): void {
    this.#activeMessage = null
    this.#durableAccounting = null
    this.#transportTerminating = false
  }
}
