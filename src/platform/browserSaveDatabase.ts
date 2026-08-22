import type { LegacySaveCandidate } from '../save/repository'
import { requireBrowserCapability } from './browserEnvironment'
import { WriterAuthorityLostError } from './writerAuthority'

const FILES_STORE = 'files'
const LEGACY_CANDIDATES_STORE = 'legacy-candidates'
const METADATA_STORE = 'metadata'
const WRITER_LEASE_KEY = 'writer-lease'
const DATABASE_VERSION = 1

interface StoredFile {
  readonly path: string
  readonly contents: string
}

interface StoredLegacyCandidate {
  readonly id: string
  readonly sourcePath: string
}

interface StoredWriterLease {
  readonly key: typeof WRITER_LEASE_KEY
  readonly ownerToken: string | null
  readonly generation: number
  readonly expiresAtUtcMilliseconds: number | null
}

export interface WriterLeaseFence {
  readonly ownerToken: string
  readonly generation: number
  readonly expiresAtUtcMilliseconds: number
}

export type WriterLeaseAcquisition =
  | {
      readonly acquired: true
      readonly fence: WriterLeaseFence
    }
  | {
      readonly acquired: false
      readonly generation: number
      readonly expiresAtUtcMilliseconds: number
    }

export type BrowserSaveMutation =
  | {
      readonly kind: 'write'
      readonly path: string
      readonly contents: string
    }
  | {
      readonly kind: 'replace'
      readonly temporaryPath: string
      readonly destinationPath: string
    }
  | {
      readonly kind: 'copy'
      readonly sourcePath: string
      readonly destinationPath: string
    }
  | {
      readonly kind: 'retain-legacy'
      readonly candidate: LegacySaveCandidate
    }

export interface BrowserSaveDatabase {
  acquireWriterLease(
    ownerToken: string,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
    allowUnexpiredSameOwnerTakeover?: boolean,
    allowUnexpiredAnyOwnerTakeover?: boolean,
  ): Promise<WriterLeaseAcquisition>
  renewWriterLease(
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
  ): Promise<WriterLeaseFence>
  releaseWriterLease(
    fence: WriterLeaseFence,
  ): Promise<boolean>
  inspectWriterLease(): Promise<WriterLeaseFence | null>
  fileExists(path: string): Promise<boolean>
  readFile(path: string): Promise<string>
  listLegacyCandidates(): Promise<readonly LegacySaveCandidate[]>
  mutateFiles(
    mutation: BrowserSaveMutation,
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
  ): Promise<void>
}

export class WriterLeaseLostError extends WriterAuthorityLostError {
  constructor(message = 'The writable browser session no longer owns its lease.') {
    super(message)
    this.name = 'WriterLeaseLostError'
  }
}

export class WriterLeaseMetadataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WriterLeaseMetadataError'
  }
}

export class IndexedDbBrowserSaveDatabase
  implements BrowserSaveDatabase
{
  private readonly factory: IDBFactory
  private readonly databaseName: string
  private databasePromise: Promise<IDBDatabase> | undefined
  private currentDatabase: IDBDatabase | undefined

  constructor(
    databaseName: string,
    factory?: IDBFactory,
  ) {
    this.databaseName = databaseName
    this.factory =
      factory ??
      requireBrowserCapability('IndexedDB', globalThis.indexedDB)
  }

  acquireWriterLease(
    ownerToken: string,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
    allowUnexpiredSameOwnerTakeover = false,
    allowUnexpiredAnyOwnerTakeover = false,
  ): Promise<WriterLeaseAcquisition> {
    return this.inTransaction(
      [METADATA_STORE],
      'readwrite',
      async (transaction) => {
        const store = transaction.objectStore(METADATA_STORE)
        const current = await requestResult<StoredWriterLease | undefined>(
          store.get(WRITER_LEASE_KEY),
        )
        const currentGeneration =
          storedWriterGeneration(current)
        if (
          current?.ownerToken !== null &&
          current?.ownerToken !== undefined &&
          current.expiresAtUtcMilliseconds !== null &&
          current.expiresAtUtcMilliseconds > nowUtcMilliseconds &&
          !allowUnexpiredAnyOwnerTakeover &&
          !(
            allowUnexpiredSameOwnerTakeover &&
            current.ownerToken === ownerToken
          )
        ) {
          return {
            acquired: false,
            generation: currentGeneration,
            expiresAtUtcMilliseconds:
              current.expiresAtUtcMilliseconds,
          }
        }

        const generation = nextWriterGeneration(
          currentGeneration,
        )
        const fence = {
          ownerToken,
          generation,
          expiresAtUtcMilliseconds:
            nowUtcMilliseconds + leaseDurationMilliseconds,
        }
        await requestResult(
          store.put({
            key: WRITER_LEASE_KEY,
            ...fence,
          } satisfies StoredWriterLease),
        )
        return { acquired: true, fence }
      },
    )
  }

  renewWriterLease(
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
  ): Promise<WriterLeaseFence> {
    return this.inTransaction(
      [METADATA_STORE],
      'readwrite',
      async (transaction) => {
        const store = transaction.objectStore(METADATA_STORE)
        const current = await requestResult<StoredWriterLease | undefined>(
          store.get(WRITER_LEASE_KEY),
        )
        assertLeaseRecord(current, fence, nowUtcMilliseconds)
        const renewed = {
          ...fence,
          expiresAtUtcMilliseconds:
            nowUtcMilliseconds + leaseDurationMilliseconds,
        }
        await requestResult(
          store.put({
            key: WRITER_LEASE_KEY,
            ...renewed,
          } satisfies StoredWriterLease),
        )
        return renewed
      },
    )
  }

  releaseWriterLease(
    fence: WriterLeaseFence,
  ): Promise<boolean> {
    return this.inTransaction(
      [METADATA_STORE],
      'readwrite',
      async (transaction) => {
        const store = transaction.objectStore(METADATA_STORE)
        const current = await requestResult<StoredWriterLease | undefined>(
          store.get(WRITER_LEASE_KEY),
        )
        storedWriterGeneration(current)
        if (
          current?.ownerToken !== fence.ownerToken ||
          current.generation !== fence.generation
        ) {
          return false
        }
        await requestResult(
          store.put({
            key: WRITER_LEASE_KEY,
            ownerToken: null,
            generation: current.generation,
            expiresAtUtcMilliseconds: null,
          } satisfies StoredWriterLease),
        )
        return true
      },
    )
  }

  async inspectWriterLease(): Promise<WriterLeaseFence | null> {
    const transaction = await this.startTransaction(
      METADATA_STORE,
      'readonly',
    )
    const current = await requestResult<StoredWriterLease | undefined>(
      transaction.objectStore(METADATA_STORE).get(WRITER_LEASE_KEY),
    )
    await transactionComplete(transaction)
    storedWriterGeneration(current)
    return current?.ownerToken !== null &&
      current?.ownerToken !== undefined &&
      current.expiresAtUtcMilliseconds !== null
      ? {
          ownerToken: current.ownerToken,
          generation: current.generation,
          expiresAtUtcMilliseconds:
            current.expiresAtUtcMilliseconds,
        }
      : null
  }

  async fileExists(path: string): Promise<boolean> {
    const transaction = await this.startTransaction(
      FILES_STORE,
      'readonly',
    )
    const key = await requestResult<IDBValidKey | undefined>(
      transaction.objectStore(FILES_STORE).getKey(path),
    )
    await transactionComplete(transaction)
    return key !== undefined
  }

  async readFile(path: string): Promise<string> {
    const transaction = await this.startTransaction(
      FILES_STORE,
      'readonly',
    )
    const stored = await requestResult<StoredFile | undefined>(
      transaction.objectStore(FILES_STORE).get(path),
    )
    await transactionComplete(transaction)
    if (stored === undefined) {
      throw new Error(`Browser save file ${path} does not exist.`)
    }
    return stored.contents
  }

  listLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> {
    return this.inTransaction(
      [FILES_STORE, LEGACY_CANDIDATES_STORE],
      'readonly',
      async (transaction) => {
        const candidates = await requestResult<StoredLegacyCandidate[]>(
          transaction
            .objectStore(LEGACY_CANDIDATES_STORE)
            .getAll(),
        )
        const files = transaction.objectStore(FILES_STORE)
        const resolved: LegacySaveCandidate[] = []
        for (const candidate of candidates) {
          const stored = await requestResult<StoredFile | undefined>(
            files.get(candidate.sourcePath),
          )
          if (stored !== undefined) {
            resolved.push({
              ...candidate,
              text: stored.contents,
            })
          }
        }
        return Object.freeze(resolved)
      },
    )
  }

  mutateFiles(
    mutation: BrowserSaveMutation,
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
  ): Promise<void> {
    return this.inTransaction(
      [METADATA_STORE, FILES_STORE, LEGACY_CANDIDATES_STORE],
      'readwrite',
      async (transaction) => {
        const current = await requestResult<
          StoredWriterLease | undefined
        >(
          transaction
            .objectStore(METADATA_STORE)
            .get(WRITER_LEASE_KEY),
        )
        assertLeaseRecord(current, fence, nowUtcMilliseconds)
        const files = transaction.objectStore(FILES_STORE)
        switch (mutation.kind) {
          case 'write':
            await requestResult(
              files.put({
                path: mutation.path,
                contents: mutation.contents,
              } satisfies StoredFile),
            )
            return
          case 'replace': {
            const temporary = await requestResult<
              StoredFile | undefined
            >(files.get(mutation.temporaryPath))
            if (temporary === undefined) {
              throw new Error(
                `Browser temporary save ${mutation.temporaryPath} does not exist.`,
              )
            }
            await requestResult(
              files.put({
                path: mutation.destinationPath,
                contents: temporary.contents,
              } satisfies StoredFile),
            )
            await requestResult(files.delete(mutation.temporaryPath))
            return
          }
          case 'copy': {
            const source = await requestResult<StoredFile | undefined>(
              files.get(mutation.sourcePath),
            )
            if (source === undefined) {
              throw new Error(
                `Browser source save ${mutation.sourcePath} does not exist.`,
              )
            }
            await requestResult(
              files.put({
                path: mutation.destinationPath,
                contents: source.contents,
              } satisfies StoredFile),
            )
            return
          }
          case 'retain-legacy':
            await requestResult(
              files.put({
                path: mutation.candidate.sourcePath,
                contents: mutation.candidate.text,
              } satisfies StoredFile),
            )
            await requestResult(
              transaction
                .objectStore(LEGACY_CANDIDATES_STORE)
                .put({
                  id: mutation.candidate.id,
                  sourcePath: mutation.candidate.sourcePath,
                } satisfies StoredLegacyCandidate),
            )
            return
        }
      },
    )
  }

  private async open(): Promise<IDBDatabase> {
    if (this.databasePromise !== undefined) {
      return this.databasePromise
    }
    let settled = false
    const pending = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(
        this.databaseName,
        DATABASE_VERSION,
      )
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(FILES_STORE)) {
          database.createObjectStore(FILES_STORE, {
            keyPath: 'path',
          })
        }
        if (
          !database.objectStoreNames.contains(
            LEGACY_CANDIDATES_STORE,
          )
        ) {
          database.createObjectStore(LEGACY_CANDIDATES_STORE, {
            keyPath: 'id',
          })
        }
        if (!database.objectStoreNames.contains(METADATA_STORE)) {
          database.createObjectStore(METADATA_STORE, {
            keyPath: 'key',
          })
        }
      }
      request.onblocked = () => {
        if (settled) return
        settled = true
        reject(
          new Error(
            'The browser save database upgrade is blocked by another context.',
          ),
        )
      }
      request.onerror = () => {
        if (settled) return
        settled = true
        reject(request.error ?? new Error('IndexedDB open failed.'))
      }
      request.onsuccess = () => {
        const database = request.result
        if (settled) {
          database.close()
          return
        }
        settled = true
        this.currentDatabase = database
        database.onversionchange = () => {
          this.invalidateConnection(database, true)
        }
        database.onclose = () => {
          this.invalidateConnection(database, false)
        }
        resolve(database)
      }
    })
    this.databasePromise = pending
    try {
      return await pending
    } catch (error) {
      if (this.databasePromise === pending) {
        this.databasePromise = undefined
      }
      throw error
    }
  }

  private async inTransaction<T>(
    stores: readonly string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    const transaction = await this.startTransaction(stores, mode)
    const completion = transactionComplete(transaction)
    try {
      const result = await operation(transaction)
      await completion
      return result
    } catch (error) {
      try {
        transaction.abort()
      } catch {
        // The request may already have aborted the transaction.
      }
      await completion.catch(() => undefined)
      throw error
    }
  }

  private async startTransaction(
    stores: string | readonly string[],
    mode: IDBTransactionMode,
  ): Promise<IDBTransaction> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const database = await this.open()
      try {
        return database.transaction(stores, mode)
      } catch (error) {
        if (attempt > 0) throw error
        this.invalidateConnection(database, true)
      }
    }
    throw new Error('IndexedDB transaction could not be opened.')
  }

  private invalidateConnection(
    database: IDBDatabase,
    close: boolean,
  ): void {
    if (this.currentDatabase !== database) return
    this.currentDatabase = undefined
    this.databasePromise = undefined
    if (close) {
      try {
        database.close()
      } catch {
        // The browser may already have closed an invalidated connection.
      }
    }
  }
}

function assertLeaseRecord(
  current: StoredWriterLease | undefined,
  fence: WriterLeaseFence,
  nowUtcMilliseconds: number,
): asserts current is StoredWriterLease {
  storedWriterGeneration(current)
  if (
    current?.ownerToken !== fence.ownerToken ||
    current.generation !== fence.generation ||
    current.expiresAtUtcMilliseconds === null ||
    current.expiresAtUtcMilliseconds <= nowUtcMilliseconds
  ) {
    throw new WriterLeaseLostError()
  }
}

function storedWriterGeneration(
  current: StoredWriterLease | undefined,
): number {
  if (current === undefined) return 0
  if (
    !Number.isSafeInteger(current.generation) ||
    current.generation < 0
  ) {
    throw new WriterLeaseMetadataError(
      'Stored browser writer generation must be a nonnegative safe integer.',
    )
  }
  return current.generation
}

function nextWriterGeneration(current: number): number {
  if (current >= Number.MAX_SAFE_INTEGER) {
    throw new WriterLeaseMetadataError(
      'Stored browser writer generation cannot be incremented safely.',
    )
  }
  return current + 1
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'))
    }
  })
}

function transactionComplete(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => {
      reject(
        transaction.error ??
          new Error('IndexedDB transaction failed.'),
      )
    }
    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error('IndexedDB transaction was aborted.'),
      )
    }
  })
}
