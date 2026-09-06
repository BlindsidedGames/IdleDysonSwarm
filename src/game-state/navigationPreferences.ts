export const BOTTOM_NAVIGATION_DESTINATION_IDS = [
  'bots',
  'research',
  'skills',
  'infinity',
  'challenges',
  'reality',
  'simulations',
  'quantum',
  'avocato',
  'store',
  'story',
  'wiki',
  'offline-time',
  'statistics',
  'settings',
] as const

export type BottomNavigationDestinationId =
  (typeof BOTTOM_NAVIGATION_DESTINATION_IDS)[number]

export const DISCOVERABLE_NAVIGATION_DESTINATION_IDS = [
  'research',
  'skills',
  'infinity',
  'challenges',
  'reality',
  'simulations',
  'quantum',
] as const

export type DiscoverableNavigationDestinationId =
  (typeof DISCOVERABLE_NAVIGATION_DESTINATION_IDS)[number]

export interface NavigationRouteDiscovery {
  readonly knownRoutes: readonly DiscoverableNavigationDestinationId[]
  readonly unvisitedRoutes: readonly DiscoverableNavigationDestinationId[]
}

/** Product defaults for destinations a player has not explicitly configured. */
export const DEFAULT_BOTTOM_NAVIGATION_VISIBILITY = Object.freeze({
  bots: true,
  research: true,
  skills: true,
  infinity: true,
  challenges: true,
  reality: true,
  simulations: true,
  quantum: true,
  avocato: true,
  store: true,
  story: false,
  wiki: true,
  'offline-time': false,
  statistics: false,
  settings: true,
} satisfies Record<BottomNavigationDestinationId, boolean>)

export function isBottomNavigationDestinationId(
  value: string,
): value is BottomNavigationDestinationId {
  return (BOTTOM_NAVIGATION_DESTINATION_IDS as readonly string[]).includes(value)
}

export function isDiscoverableNavigationDestinationId(
  value: string,
): value is DiscoverableNavigationDestinationId {
  return (DISCOVERABLE_NAVIGATION_DESTINATION_IDS as readonly string[])
    .includes(value)
}

export function hasVisitedNavigationRoute(
  discovery: NavigationRouteDiscovery | undefined,
  route: DiscoverableNavigationDestinationId,
): boolean {
  return discovery !== undefined &&
    discovery.knownRoutes.includes(route) &&
    !discovery.unvisitedRoutes.includes(route)
}

export function normalizeNavigationRouteDiscovery(
  value: unknown,
): NavigationRouteDiscovery | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const candidate = value as Record<string, unknown>
  if (
    !Array.isArray(candidate.knownRoutes) ||
    !Array.isArray(candidate.unvisitedRoutes)
  ) {
    return undefined
  }
  const candidateKnownRoutes = candidate.knownRoutes
  const candidateUnvisitedRoutes = candidate.unvisitedRoutes
  const knownRoutes = DISCOVERABLE_NAVIGATION_DESTINATION_IDS.filter(
    (route) => candidateKnownRoutes.includes(route),
  )
  return {
    knownRoutes,
    unvisitedRoutes: DISCOVERABLE_NAVIGATION_DESTINATION_IDS.filter(
      (route) =>
        knownRoutes.includes(route) &&
        candidateUnvisitedRoutes.includes(route),
    ),
  }
}

export function normalizeBottomNavigationVisibility(
  value: unknown,
  legacy: Readonly<Record<'story' | 'wiki' | 'statistics', boolean>>,
): Readonly<Record<string, boolean>> {
  const normalized: Record<string, boolean> = {
    ...DEFAULT_BOTTOM_NAVIGATION_VISIBILITY,
    ...legacy,
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return normalized
  }
  for (const [id, visible] of Object.entries(value)) {
    if (typeof visible === 'boolean') normalized[id] = visible
  }
  return normalized
}
