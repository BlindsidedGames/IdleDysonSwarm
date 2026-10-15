import {
  DISCOVERABLE_NAVIGATION_DESTINATION_IDS,
  isDiscoverableNavigationDestinationId,
  type DiscoverableNavigationDestinationId,
  type NavigationRouteDiscovery,
} from '../../../game-state/navigationPreferences'

export type HighlightableRoute = DiscoverableNavigationDestinationId
export type StoredRouteHighlights = NavigationRouteDiscovery

export const HIGHLIGHTABLE_ROUTES =
  DISCOVERABLE_NAVIGATION_DESTINATION_IDS

export function reconcileStoredRouteHighlights(
  baseline: StoredRouteHighlights,
  unlockedByRoute: Readonly<Record<HighlightableRoute, boolean>>,
  currentRoute: string,
): StoredRouteHighlights {
  const knownRoutes = new Set(baseline.knownRoutes)
  const unvisitedRoutes = new Set(baseline.unvisitedRoutes)

  for (const routeId of HIGHLIGHTABLE_ROUTES) {
    if (!unlockedByRoute[routeId] || knownRoutes.has(routeId)) continue
    knownRoutes.add(routeId)
    if (routeId !== currentRoute) unvisitedRoutes.add(routeId)
  }
  if (isHighlightableRoute(currentRoute)) {
    unvisitedRoutes.delete(currentRoute)
  }

  return {
    knownRoutes: HIGHLIGHTABLE_ROUTES.filter((routeId) =>
      knownRoutes.has(routeId),
    ),
    unvisitedRoutes: HIGHLIGHTABLE_ROUTES.filter((routeId) =>
      unvisitedRoutes.has(routeId),
    ),
  }
}

export function isHighlightableRoute(
  routeId: string,
): routeId is HighlightableRoute {
  return isDiscoverableNavigationDestinationId(routeId)
}
