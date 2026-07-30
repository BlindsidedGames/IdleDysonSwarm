import { describe, expect, test } from 'vitest'
import {
  createBrowserReloadWriterIdentity,
} from './browserReloadWriterIdentity'

describe('browser reload writer identity', () => {
  test('reuses the tab token only for a reload', () => {
    const storage = new MemorySessionStorage()
    const first = createBrowserReloadWriterIdentity({
      storage,
      navigationType: 'navigate',
      ownerTokenFactory: () => 'first-tab',
    })
    const reloaded = createBrowserReloadWriterIdentity({
      storage,
      navigationType: 'reload',
      ownerTokenFactory: () => 'unused',
    })

    expect(first).toEqual({
      ownerToken: 'first-tab',
      allowUnexpiredSameOwnerTakeover: false,
    })
    expect(reloaded).toEqual({
      ownerToken: 'first-tab',
      allowUnexpiredSameOwnerTakeover: true,
    })
  })

  test('replaces an inherited token on every non-reload navigation', () => {
    const storage = new MemorySessionStorage()
    storage.setItem(
      'idle-dyson-swarm:writer-tab-token',
      'inherited-token',
    )

    const duplicatedTab = createBrowserReloadWriterIdentity({
      storage,
      navigationType: 'navigate',
      ownerTokenFactory: () => 'duplicate-tab',
    })
    const duplicatedTabReload =
      createBrowserReloadWriterIdentity({
        storage,
        navigationType: 'reload',
        ownerTokenFactory: () => 'unused',
      })

    expect(duplicatedTab).toEqual({
      ownerToken: 'duplicate-tab',
      allowUnexpiredSameOwnerTakeover: false,
    })
    expect(duplicatedTabReload).toEqual({
      ownerToken: 'duplicate-tab',
      allowUnexpiredSameOwnerTakeover: true,
    })
  })
})

class MemorySessionStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
