import type {
  LegacySaveCandidate,
  SaveStorageAdapter,
} from '../save/repository'
import {
  type BrowserSaveDatabase,
  type BrowserSaveMutation,
  type WriterLeaseFence,
  WriterLeaseLostError,
} from './browserSaveDatabase'
import { createBrowserRandomToken } from './browserOwnerToken'

export type BrowserStorageMutationFailure =
  | 'quota-exceeded'
  | 'lease-lost'
  | 'commit-failed'

export class BrowserStorageMutationError extends Error {
  readonly code: BrowserStorageMutationFailure
  override readonly cause: unknown

  constructor(
    code: BrowserStorageMutationFailure,
    message: string,
    cause: unknown,
  ) {
    super(message)
    this.name = 'BrowserStorageMutationError'
    this.code = code
    this.cause = cause
  }
}

export interface IndexedDbSaveStorageOptions {
  readonly database: BrowserSaveDatabase
  readonly lease: {
    currentFence(): WriterLeaseFence
  }
  readonly nowUtcMilliseconds?: () => number
  readonly legacyIdFactory?: () => string
}

export class IndexedDbSaveStorageAdapter
  implements SaveStorageAdapter
{
  private readonly database: BrowserSaveDatabase
  private readonly lease: {
    currentFence(): WriterLeaseFence
  }
  private readonly nowUtcMilliseconds: () => number
  private readonly legacyIdFactory: () => string

  constructor(options: Readonly<IndexedDbSaveStorageOptions>) {
    this.database = options.database
    this.lease = options.lease
    this.nowUtcMilliseconds =
      options.nowUtcMilliseconds ?? Date.now
    this.legacyIdFactory =
      options.legacyIdFactory ?? defaultLegacyIdFactory
  }

  exists(path: string): Promise<boolean> {
    return this.database.fileExists(path)
  }

  readText(path: string): Promise<string> {
    return this.database.readFile(path)
  }

  writeText(path: string, contents: string): Promise<void> {
    return this.mutate({ kind: 'write', path, contents })
  }

  replaceAtomically(
    temporaryPath: string,
    destinationPath: string,
  ): Promise<void> {
    return this.mutate({
      kind: 'replace',
      temporaryPath,
      destinationPath,
    })
  }

  copy(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    return this.mutate({
      kind: 'copy',
      sourcePath,
      destinationPath,
    })
  }

  async discoverLegacyCandidates(): Promise<
    readonly LegacySaveCandidate[]
  > {
    const candidates = await this.database.listLegacyCandidates()
    return candidates.map((candidate) => Object.freeze({
      ...candidate,
      provenance: Object.freeze({
        kind: 'browser-retained-import' as const,
      }),
    }))
  }

  async retainLegacyCandidate(
    text: string,
    id = this.legacyIdFactory(),
  ): Promise<LegacySaveCandidate> {
    const candidate = {
      id,
      sourcePath: `browser-import/${id}`,
      text,
      provenance: Object.freeze({
        kind: 'browser-retained-import' as const,
      }),
    }
    await this.mutate({
      kind: 'retain-legacy',
      candidate,
    })
    return Object.freeze(candidate)
  }

  private async mutate(
    mutation: BrowserSaveMutation,
  ): Promise<void> {
    let fence: WriterLeaseFence
    try {
      fence = this.lease.currentFence()
    } catch (error) {
      throw classifyMutationError(error)
    }
    try {
      await this.database.mutateFiles(
        mutation,
        fence,
        this.nowUtcMilliseconds(),
      )
    } catch (error) {
      throw classifyMutationError(error)
    }
  }
}

function classifyMutationError(
  error: unknown,
): BrowserStorageMutationError {
  if (error instanceof BrowserStorageMutationError) return error
  if (error instanceof WriterLeaseLostError) {
    return new BrowserStorageMutationError(
      'lease-lost',
      error.message,
      error,
    )
  }
  const DomExceptionConstructor = globalThis.DOMException
  if (
    DomExceptionConstructor !== undefined &&
    error instanceof DomExceptionConstructor &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return new BrowserStorageMutationError(
      'quota-exceeded',
      'Browser storage quota prevented the save commit. The last verified save was preserved.',
      error,
    )
  }
  return new BrowserStorageMutationError(
    'commit-failed',
    error instanceof Error
      ? error.message
      : 'The browser save transaction failed.',
    error,
  )
}

function defaultLegacyIdFactory(): string {
  return createBrowserRandomToken(12)
}
