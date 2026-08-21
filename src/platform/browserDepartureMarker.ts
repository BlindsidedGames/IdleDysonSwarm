export interface SynchronousKeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface DepartureMarker {
  read(): string | null
  record(serializedUtcText: string): void
  clearIfMatches(utcMilliseconds: number): void
  clear(): void
}

/**
 * Keeps only the first receipt-time departure timestamp for an away episode.
 * The full save remains owned by the durable repository; this marker exists
 * solely because asynchronous IndexedDB writes may be abandoned during page
 * teardown before the lifecycle save reaches disk.
 */
export class BrowserDepartureMarker implements DepartureMarker {
  private readonly key: string
  private readonly suppliedStorage: SynchronousKeyValueStorage | undefined

  constructor(
    identity: string,
    storage?: SynchronousKeyValueStorage,
  ) {
    this.key = `idle-dyson-swarm.departure.${encodeURIComponent(identity)}`
    this.suppliedStorage = storage
  }

  read(): string | null {
    try {
      const storage = this.storage()
      const value = storage?.getItem(this.key) ?? null
      if (value === null) return null
      const utcMilliseconds = Date.parse(value)
      if (!Number.isFinite(utcMilliseconds)) {
        storage?.removeItem(this.key)
        return null
      }
      return value
    } catch {
      return null
    }
  }

  record(serializedUtcText: string): void {
    try {
      const storage = this.storage()
      if (storage === undefined) return
      const utcMilliseconds = Date.parse(serializedUtcText)
      if (!Number.isFinite(utcMilliseconds)) return
      storage.setItem(this.key, serializedUtcText)
    } catch {
      // Storage denial must not suppress the authoritative lifecycle save.
    }
  }

  clearIfMatches(utcMilliseconds: number): void {
    try {
      const storage = this.storage()
      const current = storage?.getItem(this.key)
      if (
        current !== null &&
        current !== undefined &&
        Date.parse(current) === utcMilliseconds
      ) {
        storage?.removeItem(this.key)
      }
    } catch {
      // A newer departure remains authoritative if storage cannot be read.
    }
  }

  clear(): void {
    try {
      this.storage()?.removeItem(this.key)
    } catch {
      // The durable replay has already committed; storage cleanup is best-effort.
    }
  }

  private storage(): SynchronousKeyValueStorage | undefined {
    if (this.suppliedStorage !== undefined) return this.suppliedStorage
    try {
      return globalThis.localStorage
    } catch {
      return undefined
    }
  }
}
