import { describe, expect, test } from 'vitest'
import {
  BrowserDepartureMarker,
  type SynchronousKeyValueStorage,
} from './browserDepartureMarker'

class MemoryStorage implements SynchronousKeyValueStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

describe('BrowserDepartureMarker', () => {
  test('records departures and clears only the episode that committed', () => {
    const storage = new MemoryStorage()
    const marker = new BrowserDepartureMarker('database/profile', storage)

    marker.record('2026-08-18T01:00:00.000Z')
    marker.record('2026-08-18T01:00:05.000Z')

    expect(marker.read()).toBe('2026-08-18T01:00:05.000Z')
    marker.clearIfMatches(Date.parse('2026-08-18T01:00:00.000Z'))
    expect(marker.read()).toBe('2026-08-18T01:00:05.000Z')
    marker.clearIfMatches(Date.parse('2026-08-18T01:00:05.000Z'))
    expect(marker.read()).toBeNull()
  })

  test('isolates save identities and removes malformed marker values', () => {
    const storage = new MemoryStorage()
    const first = new BrowserDepartureMarker('database/first', storage)
    const second = new BrowserDepartureMarker('database/second', storage)
    first.record('2026-08-18T01:00:00.000Z')
    second.record('2026-08-18T02:00:00.000Z')

    expect(first.read()).toBe('2026-08-18T01:00:00.000Z')
    expect(second.read()).toBe('2026-08-18T02:00:00.000Z')

    const [firstKey] = [...storage.values.keys()]
    storage.setItem(firstKey!, 'not-a-timestamp')
    expect(first.read()).toBeNull()
    expect(storage.getItem(firstKey!)).toBeNull()
  })
})
