import type { FrontendCanonicalResources } from '../../../application/frontendSnapshot'
import {
  comparePresentationNumeric,
  type PresentationNumeric,
} from '../../presentationNumeric'

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
  readonly infinityPoints: PresentationNumeric
  readonly quantumPoints: PresentationNumeric
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
    comparePresentationNumeric(progression.infinityPoints, 42n) >= 0 ||
    comparePresentationNumeric(progression.quantumPoints, 1n) >= 0
  ) {
    ids.push('reality')
  }
  if (comparePresentationNumeric(progression.quantumPoints, 1n) >= 0) ids.push('quantum')
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
