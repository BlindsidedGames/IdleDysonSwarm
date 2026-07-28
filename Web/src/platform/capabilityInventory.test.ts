import { describe, expect, test } from 'vitest'
import { platformCapabilityInventory } from './capabilityInventory'

describe('platform capability inventory', () => {
  test('keeps every audited capability uniquely addressable', () => {
    const ids = platformCapabilityInventory.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('legacy-save-discovery')
    expect(ids).toContain('steam-achievements-and-stats')
    expect(ids).toContain('application-lifecycle')
  })

  test('does not silently promote inactive legacy package surfaces', () => {
    const status = Object.fromEntries(
      platformCapabilityInventory.map((entry) => [entry.id, entry.status]),
    )
    expect(status.purchases).toBe('not-currently-active')
    expect(status.notifications).toBe('not-currently-active')
    expect(status['cloud-save']).toBe('not-currently-active')
  })
})
