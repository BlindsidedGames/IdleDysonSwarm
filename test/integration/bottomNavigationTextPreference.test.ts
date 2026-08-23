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
import { BottomNavigationTextPreferenceService } from '../../src/ui/bottom-navigation-text'

const fixture = new URL(
  '../fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

describe('device-local bottom navigation text import boundary', () => {
  test('keeps the device choice and removes a legacy portable size', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
    }
    const preference = new BottomNavigationTextPreferenceService({ storage })
    preference.setIncludeText(true)

    const source = prepareIdb1Save(readFileSync(fixture, 'utf8'))
      .prepared.copyValidatedState()
    source.bottomNavigationPreferences = {
      version: 1,
      size: 'compact',
      visibility: { settings: false },
    }
    const imported = hydrateGameState(PreparedSave.fromDecoded(
      deserializeWebSave(serializeWebSave(source)),
    ))

    expect('bottomNavigationSize' in imported.state.meta).toBe(false)
    expect(new BottomNavigationTextPreferenceService({ storage }).getSnapshot())
      .toBe(true)

    const exported = dehydrateGameState(imported, imported.state)
      .copyValidatedState()
    expect(exported.bottomNavigationPreferences).not.toHaveProperty('size')
    expect(exported.bottomNavigationPreferences).toHaveProperty(
      'visibility.settings',
      false,
    )
  })
})
