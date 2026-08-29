import { describe, expect, test } from 'vitest'
import {
  reconcileStoredRouteHighlights,
  type HighlightableRoute,
  type StoredRouteHighlights,
} from './routeHighlights'

const lockedRoutes: Readonly<Record<HighlightableRoute, boolean>> = {
  research: false,
  skills: false,
  infinity: false,
  reality: false,
  simulations: false,
  quantum: false,
}

describe('new route highlight save identity', () => {
  test('marks a route newly unvisited after it unlocks in a fresh save', () => {
    const freshSave: StoredRouteHighlights = {
      knownRoutes: [],
      unvisitedRoutes: [],
    }

    const afterResearchReveal = reconcileStoredRouteHighlights(
      freshSave,
      { ...lockedRoutes, research: true },
      'bots',
    )

    expect(afterResearchReveal).toEqual({
      knownRoutes: ['research'],
      unvisitedRoutes: ['research'],
    })
  })

  test('does not retrigger routes seeded as known during legacy migration', () => {
    const migratedSave: StoredRouteHighlights = {
      knownRoutes: ['research', 'skills', 'infinity'],
      unvisitedRoutes: [],
    }

    expect(reconcileStoredRouteHighlights(
      migratedSave,
      {
        ...lockedRoutes,
        research: true,
        skills: true,
        infinity: true,
      },
      'bots',
    )).toEqual({
      knownRoutes: ['research', 'skills', 'infinity'],
      unvisitedRoutes: [],
    })
  })

  test('does not mark Reality new until its progress preview becomes actionable', () => {
    const freshSave: StoredRouteHighlights = {
      knownRoutes: [],
      unvisitedRoutes: [],
    }

    const duringProgressPreview = reconcileStoredRouteHighlights(
      freshSave,
      { ...lockedRoutes, reality: false },
      'bots',
    )
    expect(duringProgressPreview).toEqual(freshSave)

    expect(reconcileStoredRouteHighlights(
      duringProgressPreview,
      { ...lockedRoutes, reality: true },
      'bots',
    )).toEqual({
      knownRoutes: ['reality'],
      unvisitedRoutes: ['reality'],
    })
  })

  test('does not highlight the locked Simulations preview before its Influence unlock', () => {
    const afterRealityVisit: StoredRouteHighlights = {
      knownRoutes: ['reality'],
      unvisitedRoutes: [],
    }

    expect(reconcileStoredRouteHighlights(
      afterRealityVisit,
      { ...lockedRoutes, reality: true, simulations: false },
      'reality',
    )).toEqual(afterRealityVisit)

    expect(reconcileStoredRouteHighlights(
      afterRealityVisit,
      { ...lockedRoutes, reality: true, simulations: true },
      'reality',
    )).toEqual({
      knownRoutes: ['reality', 'simulations'],
      unvisitedRoutes: ['simulations'],
    })
  })
})
