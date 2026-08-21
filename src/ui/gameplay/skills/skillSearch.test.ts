import { describe, expect, test } from 'vitest'
import {
  rankSkillSearchResults,
  scoreSkillSearchMatch,
  type SkillSearchDocument,
} from './skillSearch'

const scientificPlanets: SkillSearchDocument = {
  skillId: 'scientificPlanets',
  legacySkillKey: 6,
  displayName: 'Scientific Planets',
  description:
    'Teach some of your Scientists to discover planets for you.',
  technicalDescription:
    'Produces Planets based on Log10(Science Bots).',
}

describe('skillSearch', () => {
  test.each(['sci pl', 'scipl', 'sipn'])(
    'matches the Scientific Planets title from %s',
    (query) => {
      expect(
        scoreSkillSearchMatch(scientificPlanets, query, 'en'),
      ).not.toBeNull()
    },
  )

  test('keeps fuzzy matching title-only', () => {
    expect(
      scoreSkillSearchMatch(scientificPlanets, 'tsdp', 'en'),
    ).toBeNull()
    expect(
      scoreSkillSearchMatch(scientificPlanets, 'discover', 'en'),
    ).not.toBeNull()
  })

  test('ranks a title match before a description-only match', () => {
    const descriptionMatch: SkillSearchDocument = {
      skillId: 'scienceBoost',
      legacySkillKey: 9,
      displayName: 'Science Boost',
      description: 'Improves Scientific Planets.',
      technicalDescription: 'Doubles production.',
    }

    expect(
      rankSkillSearchResults(
        [descriptionMatch, scientificPlanets],
        'scientific planets',
        'en',
      ).map((skill) => skill.skillId),
    ).toEqual(['scientificPlanets', 'scienceBoost'])
  })
})
