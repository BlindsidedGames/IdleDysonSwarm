import type {
  FrontendCanonicalResources,
  FrontendGameplayVisibility,
} from '../../../application/frontendSnapshot'

export type WikiCategoryId =
  | 'bots'
  | 'research'
  | 'skills'
  | 'infinity'
  | 'offline-time'
  | 'other'
  | 'patch-notes'
  | 'lore'
  | 'reality'
  | 'quantum'
  | 'secrets'

export interface WikiProgression {
  readonly infinityPoints: bigint
  readonly quantumPoints: bigint
  readonly secretsOfTheUniverse: bigint
  readonly infinityAchieved: boolean
  readonly realityUnlocked: boolean
}

export type WikiLoreSectionId =
  | 'existence'
  | 'infinity-achieved'
  | 'reality'

export function visibleWikiCategoryIds(
  progression: WikiProgression,
): readonly WikiCategoryId[] {
  const ids: WikiCategoryId[] = [
    'bots',
    'research',
    'skills',
    'infinity',
    'lore',
  ]
  if (
    progression.infinityPoints >= 42n ||
    progression.quantumPoints >= 1n
  ) {
    ids.push('reality')
  }
  if (progression.quantumPoints >= 1n) ids.push('quantum')
  if (progression.secretsOfTheUniverse > 0n) ids.push('secrets')
  ids.push('offline-time', 'other')
  ids.push('patch-notes')
  return ids
}

export function visibleWikiLoreSectionIds(
  progression: WikiProgression,
): readonly WikiLoreSectionId[] {
  const ids: WikiLoreSectionId[] = ['existence']
  if (progression.infinityAchieved) ids.push('infinity-achieved')
  if (progression.realityUnlocked) ids.push('reality')
  return ids
}

export function wikiProgressionFromResources(
  resources: Pick<FrontendCanonicalResources, 'infinity' | 'quantum'>,
  visibility: Pick<FrontendGameplayVisibility, 'infinity' | 'reality'>,
): WikiProgression {
  return {
    infinityPoints: resources.infinity.points,
    quantumPoints: resources.quantum.pointsEarned,
    secretsOfTheUniverse:
      resources.infinity.secretsOfTheUniverse >
      resources.quantum.permanentSecrets
        ? resources.infinity.secretsOfTheUniverse
        : resources.quantum.permanentSecrets,
    infinityAchieved: visibility.infinity.routeUnlocked,
    realityUnlocked: visibility.reality.routeUnlocked,
  }
}
