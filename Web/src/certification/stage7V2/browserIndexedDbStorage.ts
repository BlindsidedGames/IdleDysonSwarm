import { requireBrowserCapability } from '../../platform/browserEnvironment'
import {
  createStage7V2CertificationPaths,
  type Stage7V2CertificationStorage,
} from './contracts'

export const STAGE7_V2_CERTIFICATION_BROWSER_DATABASE =
  'idle-dyson-swarm-stage7-v2-certification' as const

const STORE = 'files'
const DATABASE_VERSION = 1

interface StoredText {
  readonly path: string
  readonly text: string
}

export interface Stage7V2CertificationLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>
}

/** Lazy browser adapter: IndexedDB is not opened until an explicit operation. */
export class Stage7V2BrowserIndexedDbStorage
  implements Stage7V2CertificationStorage {
  readonly #factory: IDBFactory
  readonly #root: string
  readonly #locks: Readonly<Stage7V2CertificationLockManager>
  #database: Promise<IDBDatabase> | null = null

  constructor(
    buildScope: string,
    factory?: IDBFactory,
    locks?: Stage7V2CertificationLockManager,
  ) {
    this.#root = createStage7V2CertificationPaths(buildScope).root
    this.#factory = factory ?? requireBrowserCapability(
      'IndexedDB',
      globalThis.indexedDB,
    )
    this.#locks = captureLockManager(locks ?? globalThis.navigator?.locks)
  }

  async exists(path: string): Promise<boolean> {
    const safePath = this.#path(path)
    return this.#readonly(async (store) =>
      (await request(store.getKey(safePath))) !== undefined)
  }

  async readText(path: string): Promise<string> {
    const safePath = this.#path(path)
    return this.#readonly(async (store) => {
      const value = await request<StoredText | undefined>(store.get(safePath))
      if (value === undefined) {
        throw new Error(`Stage 7 certification file ${safePath} does not exist.`)
      }
      return admitStoredText(value, safePath).text
    })
  }

  writeText(path: string, text: string): Promise<void> {
    const safePath = this.#path(path)
    return this.#readwrite(async (store) => {
      if (typeof text !== 'string') throw new TypeError('Stored text must be a string.')
      await request(store.put({ path: safePath, text } satisfies StoredText))
    })
  }

  replaceAtomically(
    temporaryPath: string,
    destinationPath: string,
  ): Promise<void> {
    const temporary = this.#path(temporaryPath)
    const destination = this.#path(destinationPath)
    return this.#readwrite(async (store) => {
      const staged = await request<StoredText | undefined>(store.get(temporary))
      if (staged === undefined) {
        throw new Error('Stage 7 certification temporary file does not exist.')
      }
      const admitted = admitStoredText(staged, temporary)
      await request(store.put({ path: destination, text: admitted.text } satisfies StoredText))
      await request(store.delete(temporary))
    })
  }

  copy(sourcePath: string, destinationPath: string): Promise<void> {
    const source = this.#path(sourcePath)
    const destination = this.#path(destinationPath)
    return this.#readwrite(async (store) => {
      const value = await request<StoredText | undefined>(store.get(source))
      if (value === undefined) {
        throw new Error('Stage 7 certification copy source does not exist.')
      }
      const admitted = admitStoredText(value, source)
      await request(store.put({ path: destination, text: admitted.text } satisfies StoredText))
    })
  }

  removeExactly(paths: readonly string[]): Promise<void> {
    const exact = Object.freeze([...new Set(paths.map((path) => this.#path(path)))])
    return this.#readwrite(async (store) => {
      for (const path of exact) await request(store.delete(path))
    })
  }

  withExclusiveMutation<T>(operation: () => Promise<T>): Promise<T> {
    if (typeof operation !== 'function') {
      return Promise.reject(new TypeError('Certification mutation must be callable.'))
    }
    return this.#locks.request(`${this.#root}/writer`, operation)
  }

  #path(path: string): string {
    const normalized = path.replaceAll('\\', '/')
    if (normalized !== path || normalized.startsWith('/') ||
      /^[a-zA-Z]:/u.test(normalized) || normalized.includes('\0') ||
      normalized.split('/').some((part) => part === '' || part === '.' || part === '..') ||
      !normalized.startsWith(`${this.#root}/`)) {
      throw new TypeError('Stage 7 certification path escaped its build namespace.')
    }
    return normalized
  }

  async #open(): Promise<IDBDatabase> {
    this.#database ??= new Promise((resolve, reject) => {
      const opening = this.#factory.open(
        STAGE7_V2_CERTIFICATION_BROWSER_DATABASE,
        DATABASE_VERSION,
      )
      opening.onupgradeneeded = () => {
        if (!opening.result.objectStoreNames.contains(STORE)) {
          opening.result.createObjectStore(STORE, { keyPath: 'path' })
        }
      }
      opening.onsuccess = () => resolve(opening.result)
      opening.onerror = () => reject(opening.error ??
        new Error('Stage 7 certification IndexedDB open failed.'))
      opening.onblocked = () => reject(
        new Error('Stage 7 certification IndexedDB open was blocked.'),
      )
    })
    return this.#database
  }

  async #readonly<T>(operation: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    const transaction = (await this.#open()).transaction(STORE, 'readonly')
    const completion = transactionComplete(transaction)
    try {
      const result = await operation(transaction.objectStore(STORE))
      await completion
      return result
    } catch (error) {
      try { transaction.abort() } catch { /* already settled */ }
      await completion.catch(() => undefined)
      throw error
    }
  }

  async #readwrite(operation: (store: IDBObjectStore) => Promise<void>): Promise<void> {
    const transaction = (await this.#open()).transaction(STORE, 'readwrite')
    const completion = transactionComplete(transaction)
    try {
      await operation(transaction.objectStore(STORE))
      await completion
    } catch (error) {
      try { transaction.abort() } catch { /* already settled */ }
      await completion.catch(() => undefined)
      throw error
    }
  }
}

function admitStoredText(value: unknown, expectedPath: string): Readonly<StoredText> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('Stage 7 certification IndexedDB record is invalid.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.length !== 2 || !keys.includes('path') || !keys.includes('text')) {
    throw new TypeError('Stage 7 certification IndexedDB record is invalid.')
  }
  const path = descriptors.path
  const text = descriptors.text
  if (path === undefined || text === undefined || !path.enumerable || !text.enumerable ||
    !('value' in path) || !('value' in text) || path.value !== expectedPath ||
    typeof text.value !== 'string') {
    throw new TypeError('Stage 7 certification IndexedDB record is invalid.')
  }
  return Object.freeze({ path: expectedPath, text: text.value })
}

function captureLockManager(value: unknown): Readonly<Stage7V2CertificationLockManager> {
  if (value === null || typeof value !== 'object') {
    throw new TypeError('Stage 7 certification lock manager is invalid.')
  }
  let owner: object | null = value
  try {
    while (owner !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, 'request')
      if (descriptor !== undefined) {
        if ('value' in descriptor && typeof descriptor.value === 'function') {
          return Object.freeze({ request: descriptor.value.bind(value) })
        }
        break
      }
      owner = Object.getPrototypeOf(owner) as object | null
    }
  } catch { /* hostile proxy */ }
  throw new TypeError('Stage 7 certification lock manager is invalid.')
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result)
    value.onerror = () => reject(value.error ??
      new Error('Stage 7 certification IndexedDB request failed.'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ??
      new Error('Stage 7 certification IndexedDB transaction failed.'))
    transaction.onabort = () => reject(transaction.error ??
      new Error('Stage 7 certification IndexedDB transaction aborted.'))
  })
}
