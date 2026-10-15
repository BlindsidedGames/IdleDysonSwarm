export interface BrowserStorageManagerPort {
  persisted?: () => Promise<boolean>
  persist?: () => Promise<boolean>
  estimate?: () => Promise<StorageEstimate>
}

export interface BrowserStorageStatus {
  readonly persistenceSupported: boolean
  readonly persistenceRequested: boolean
  readonly persisted: boolean
  readonly usageBytes: number | null
  readonly quotaBytes: number | null
  readonly remainingBytes: number | null
  readonly quotaPressure: boolean
  readonly error?: string
}

export class BrowserStorageStatusAdapter {
  private readonly storage:
    | BrowserStorageManagerPort
    | undefined

  constructor(
    storage?: BrowserStorageManagerPort,
  ) {
    this.storage = storage ?? globalThis.navigator?.storage
  }

  async inspect(
    requestPersistence: boolean,
  ): Promise<BrowserStorageStatus> {
    const persistenceSupported =
      typeof this.storage?.persisted === 'function' &&
      typeof this.storage.persist === 'function'
    let persisted = false
    let persistenceRequested = false
    let usageBytes: number | null = null
    let quotaBytes: number | null = null
    const errors: string[] = []

    try {
      persisted =
        (await this.storage?.persisted?.()) ?? false
      if (
        requestPersistence &&
        persistenceSupported &&
        !persisted
      ) {
        persistenceRequested = true
        persisted = (await this.storage?.persist?.()) ?? false
      }
    } catch (caught) {
      errors.push(
        caught instanceof Error ? caught.message : String(caught),
      )
    }

    try {
      const estimate = await this.storage?.estimate?.()
      usageBytes =
        finiteNonNegativeOrNull(estimate?.usage) ?? null
      quotaBytes =
        finiteNonNegativeOrNull(estimate?.quota) ?? null
    } catch (caught) {
      errors.push(
        caught instanceof Error ? caught.message : String(caught),
      )
    }

    const remainingBytes =
      usageBytes !== null && quotaBytes !== null
        ? Math.max(0, quotaBytes - usageBytes)
        : null
    const quotaPressure =
      usageBytes !== null &&
      quotaBytes !== null &&
      quotaBytes > 0 &&
      usageBytes / quotaBytes >= 0.9
    return Object.freeze({
      persistenceSupported,
      persistenceRequested,
      persisted,
      usageBytes,
      quotaBytes,
      remainingBytes,
      quotaPressure,
      ...(errors.length === 0
        ? {}
        : { error: errors.join(' ') }),
    })
  }
}

function finiteNonNegativeOrNull(
  value: number | undefined,
): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : null
}
