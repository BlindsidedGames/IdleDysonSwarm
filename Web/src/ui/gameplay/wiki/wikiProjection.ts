import type { FrontendCanonicalResources } from '../../../application/frontendSnapshot'

export type WikiCategoryId =
  | 'bots'
  | 'research'
  | 'skills'
  | 'infinity'
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
}

export function visibleWikiCategoryIds(
  progression: WikiProgression,
): readonly WikiCategoryId[] {
  const ids: WikiCategoryId[] = [
    'bots',
    'research',
    'skills',
    'infinity',
    'other',
    'patch-notes',
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
  return ids
}

export function wikiProgressionFromResources(
  resources: Pick<FrontendCanonicalResources, 'infinity' | 'quantum'>,
): WikiProgression {
  return {
    infinityPoints: resources.infinity.points,
    quantumPoints: resources.quantum.pointsEarned,
    secretsOfTheUniverse:
      resources.infinity.secretsOfTheUniverse >
      resources.quantum.permanentSecrets
        ? resources.infinity.secretsOfTheUniverse
        : resources.quantum.permanentSecrets,
  }
}
