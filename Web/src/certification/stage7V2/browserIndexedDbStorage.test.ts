import { describe, expect, test } from 'vitest'
import { Stage7V2BrowserIndexedDbStorage } from './browserIndexedDbStorage'

describe('Stage 7 browser certification storage', () => {
  test('does not open IndexedDB at construction and rejects escaped paths before opening', async () => {
    let opens = 0
    const factory = {
      open: () => {
        opens += 1
        throw new Error('unexpected open')
      },
    } as unknown as IDBFactory
    const storage = new Stage7V2BrowserIndexedDbStorage('build-1', factory, new FakeLocks())
    expect(opens).toBe(0)
    await expect(storage.readText('/live-save')).rejects.toThrow('escaped')
    await expect(storage.readText(
      'stage7-v2-certification/build-1/../live-save',
    )).rejects.toThrow('escaped')
    expect(opens).toBe(0)
  })

  test('round-trips write, copy, atomic replace, and exact cleanup through IndexedDB transactions', async () => {
    const factory = new FakeIndexedDbFactory()
    const storage = new Stage7V2BrowserIndexedDbStorage(
      'build-2',
      factory as unknown as IDBFactory,
      new FakeLocks(),
    )
    const root = 'stage7-v2-certification/build-2'
    const temporary = `${root}/checkpoint/current.json.tmp`
    const current = `${root}/checkpoint/current.json`
    const backup = `${root}/checkpoint/backups/current.1.json`
    await storage.writeText(temporary, 'candidate')
    await storage.replaceAtomically(temporary, current)
    expect(await storage.exists(temporary)).toBe(false)
    expect(await storage.readText(current)).toBe('candidate')
    await storage.copy(current, backup)
    expect(await storage.readText(backup)).toBe('candidate')
    factory.files.set('unrelated/current.idsw', {
      path: 'unrelated/current.idsw',
      text: 'production',
    })
    await storage.removeExactly([current, backup])
    expect(await storage.exists(current)).toBe(false)
    expect(await storage.exists(backup)).toBe(false)
    expect(factory.files.get('unrelated/current.idsw')?.text).toBe('production')
    expect(factory.opens).toBe(1)
  })

  test('rejects hostile IndexedDB records without invoking accessors', async () => {
    const factory = new FakeIndexedDbFactory()
    const storage = new Stage7V2BrowserIndexedDbStorage(
      'build-3', factory as unknown as IDBFactory, new FakeLocks(),
    )
    const path = 'stage7-v2-certification/build-3/checkpoint/current.json'
    let getters = 0
    factory.files.set(path, Object.defineProperty({ path }, 'text', {
      get: () => { getters += 1; return 'forged' }, enumerable: true,
    }) as never)
    await expect(storage.readText(path)).rejects.toThrow('record is invalid')
    expect(getters).toBe(0)
    factory.files.set(path, Object.assign(Object.create(null), { path, text: 'x' }))
    await expect(storage.readText(path)).rejects.toThrow('record is invalid')
    factory.files.set(path, { path: `${path}.other`, text: 'x' })
    await expect(storage.readText(path)).rejects.toThrow('record is invalid')
    factory.files.set(path, { path, text: 42 as never })
    await expect(storage.readText(path)).rejects.toThrow('record is invalid')
    factory.files.set(path, { path, text: 'x', extra: true } as never)
    await expect(storage.readText(path)).rejects.toThrow('record is invalid')
  })
})

class FakeLocks {
  #tail: Promise<void> = Promise.resolve()
  request<T>(_name: string, callback: () => Promise<T>): Promise<T> {
    const run = this.#tail.then(callback)
    this.#tail = run.then(() => undefined, () => undefined)
    return run
  }
}

interface FakeRequest<T> {
  result: T
  error: DOMException | null
  onsuccess: (() => void) | null
  onerror: (() => void) | null
}

class FakeIndexedDbFactory {
  readonly files = new Map<string, { path: string; text: string }>()
  opens = 0
  readonly #database = new FakeDatabase(this.files)

  open(): IDBOpenDBRequest {
    this.opens += 1
    const request = {
      result: this.#database as unknown as IDBDatabase,
      error: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
      onupgradeneeded: null,
    } as unknown as IDBOpenDBRequest
    queueMicrotask(() => {
      request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent)
      request.onsuccess?.(new Event('success'))
    })
    return request
  }
}

class FakeDatabase {
  readonly objectStoreNames = {
    contains: () => this.#created,
  } as DOMStringList
  #created = false
  readonly #files: Map<string, { path: string; text: string }>

  constructor(files: Map<string, { path: string; text: string }>) {
    this.#files = files
  }

  createObjectStore(): IDBObjectStore {
    this.#created = true
    return {} as IDBObjectStore
  }

  transaction(): IDBTransaction {
    return new FakeTransaction(this.#files) as unknown as IDBTransaction
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  error: DOMException | null = null
  #completion: ReturnType<typeof setTimeout> | null = null
  readonly #files: Map<string, { path: string; text: string }>

  constructor(files: Map<string, { path: string; text: string }>) {
    this.#files = files
  }

  objectStore(): IDBObjectStore {
    const issue = <T>(operation: () => T): IDBRequest<T> => {
      if (this.#completion !== null) clearTimeout(this.#completion)
      const request: FakeRequest<T> = {
        result: undefined as T,
        error: null,
        onsuccess: null,
        onerror: null,
      }
      queueMicrotask(() => {
        try {
          request.result = operation()
          request.onsuccess?.()
        } catch {
          request.onerror?.()
        }
        this.#completion = setTimeout(() => this.oncomplete?.(), 0)
      })
      return request as unknown as IDBRequest<T>
    }
    return {
      getKey: (path: string) => issue(() => this.#files.has(path) ? path : undefined),
      get: (path: string) => issue(() => this.#files.get(path)),
      put: (value: { path: string; text: string }) => issue(() => {
        this.#files.set(value.path, { ...value })
        return value.path
      }),
      delete: (path: string) => issue(() => {
        this.#files.delete(path)
      }),
    } as unknown as IDBObjectStore
  }

  abort(): void {
    this.onabort?.()
  }
}
