import {
  captureCheckpointRecordV2,
  type StoredTimeCheckpointRecordV2,
  type StoredTimeCheckpointRepositoryV2,
  type StoredTimeCheckpointWriteReceiptV2,
  type StoredTimeCheckpointWriteStatusV2,
  type StoredTimeWriterFenceV2,
} from './storedTimeJobAuthorityV2'

/** Isolated deterministic persistence harness; it is never a production save adapter. */
export class InMemoryStoredTimeCheckpointRepositoryV2
implements StoredTimeCheckpointRepositoryV2 {
  #record: Readonly<StoredTimeCheckpointRecordV2> | null
  #nextWrite: Readonly<{
    status: StoredTimeCheckpointWriteStatusV2
    apply: boolean
  }> | null = null
  #nextRead: unknown = undefined
  #writeCount = 0

  constructor(initial: Readonly<StoredTimeCheckpointRecordV2> | null = null) {
    this.#record = initial === null
      ? null
      : captureCheckpointRecordV2(initial)
  }

  get writeCount(): number {
    return this.#writeCount
  }

  durableRecord(): Readonly<StoredTimeCheckpointRecordV2> | null {
    return this.#record
  }

  setNextWrite(
    status: StoredTimeCheckpointWriteStatusV2,
    apply: boolean,
  ): void {
    this.#nextWrite = Object.freeze({ status, apply })
  }

  setNextRead(value: unknown): void {
    this.#nextRead = value
  }

  replaceDurable(value: Readonly<StoredTimeCheckpointRecordV2> | null): void {
    this.#record = value === null
      ? null
      : captureCheckpointRecordV2(structuredClone(value))
  }

  read(_fence: Readonly<StoredTimeWriterFenceV2>): unknown {
    if (this.#nextRead !== undefined) {
      const value = this.#nextRead
      this.#nextRead = undefined
      return value
    }
    return this.#record
  }

  persist(
    record: Readonly<StoredTimeCheckpointRecordV2>,
    _fence: Readonly<StoredTimeWriterFenceV2>,
  ): Readonly<StoredTimeCheckpointWriteReceiptV2> {
    this.#writeCount += 1
    const behavior = this.#nextWrite ?? Object.freeze({
      status: 'committed' as const,
      apply: true,
    })
    this.#nextWrite = null
    if (behavior.apply) {
      this.#record = captureCheckpointRecordV2(record)
    }
    return Object.freeze({ status: behavior.status })
  }
}
