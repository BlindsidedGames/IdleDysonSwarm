import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { PreparedSave } from './prepare'
import { retainReceivingDevicePreferences } from './importContext'

describe('manual import receiving-device preferences', () => {
  test('retains modern receiver visibility and imported per-save discovery without portable size', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const imported = base.copyValidatedState()
    imported.storyButtonToggle = false
    imported.wikiButtonToggle = false
    imported.statisticsButtonToggle = false
    imported.bottomNavigationPreferences = {
      version: 1,
      size: 'large',
      visibility: {
        story: false,
        wiki: false,
        statistics: false,
        settings: false,
      },
      routeDiscovery: {
        knownRoutes: ['research'],
        unvisitedRoutes: ['research'],
      },
    }
    const receiving = base.copyValidatedState()
    receiving.storyButtonToggle = true
    receiving.wikiButtonToggle = true
    receiving.statisticsButtonToggle = true
    receiving.bottomNavigationPreferences = {
      version: 1,
      size: 'small',
      visibility: {
        story: true,
        wiki: true,
        statistics: true,
        settings: true,
      },
      routeDiscovery: {
        knownRoutes: ['skills'],
        unvisitedRoutes: [],
      },
    }

    const retained = retainReceivingDevicePreferences(imported, receiving)
    expect(retained.bottomNavigationPreferences).toEqual({
      version: 1,
      visibility: {
        story: true,
        wiki: true,
        statistics: true,
        settings: true,
      },
      routeDiscovery: {
        knownRoutes: ['research'],
        unvisitedRoutes: ['research'],
      },
    })
    expect(hydrateGameState(PreparedSave.fromDecoded(retained)).state.meta)
      .toMatchObject({
        navigationVisibility: {
          story: true,
          wiki: true,
          statistics: true,
          settings: true,
        },
        navigationRouteDiscovery: {
          knownRoutes: ['research'],
          unvisitedRoutes: ['research'],
        },
      })
  })

  test('derives nested receiver visibility from legacy toggles instead of the sender', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const imported = base.copyValidatedState()
    imported.bottomNavigationPreferences = {
      version: 1,
      visibility: {
        story: false,
        wiki: true,
        statistics: false,
        settings: false,
      },
    }
    const receiving = base.copyValidatedState()
    delete receiving.bottomNavigationPreferences
    receiving.storyButtonToggle = true
    receiving.wikiButtonToggle = false
    receiving.statisticsButtonToggle = true

    const retained = retainReceivingDevicePreferences(imported, receiving)
    expect(hydrateGameState(PreparedSave.fromDecoded(retained)).state.meta
      .navigationVisibility).toMatchObject({
        story: true,
        wiki: false,
        statistics: true,
        settings: true,
      })
  })
})
