import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import {
  dehydrateGameState,
  hydrateGameState,
} from '../../src/game-state/mapping'
import { PreparedSave, prepareIdb1Save } from '../../src/save/prepare'
import {
  deserializeWebSave,
  serializeWebSave,
} from '../../src/save/serialization'
import { BottomNavigationSizePreferenceService } from '../../src/ui/bottom-navigation-size'

const fixture = new URL(
  '../fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

describe('device-local bottom navigation size import boundary', () => {
  test('keeps the device choice and removes a legacy portable size', () => {
    let stored: string | null = null
    const storage = {
      getItem: vi.fn(() => stored),
      setItem: vi.fn((_key: string, value: string) => { stored = value }),
    }
    const preference = new BottomNavigationSizePreferenceService({ storage })
    preference.setSize('large')

    const source = prepareIdb1Save(readFileSync(fixture, 'utf8'))
      .prepared.copyValidatedState()
    source.bottomNavigationPreferences = {
      version: 1,
      size: 'standard',
      visibility: { settings: false },
    }
    const imported = hydrateGameState(PreparedSave.fromDecoded(
      deserializeWebSave(serializeWebSave(source)),
    ))

    expect('bottomNavigationSize' in imported.state.meta).toBe(false)
    expect(new BottomNavigationSizePreferenceService({ storage }).getSnapshot())
      .toBe('large')

    const exported = dehydrateGameState(imported, imported.state)
      .copyValidatedState()
    expect(exported.bottomNavigationPreferences).not.toHaveProperty('size')
    expect(exported.bottomNavigationPreferences).toHaveProperty(
      'visibility.settings',
      false,
    )
  })
})
