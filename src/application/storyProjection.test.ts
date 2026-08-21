import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { projectFrontendStoryDerivedFacts } from './frontendSnapshot'

const firstRunFixtureUrl = new URL(
  './firstRun/generated/first-run-schema-12.idb1.txt',
  import.meta.url,
)

describe('Unity StoryManager projection', () => {
  test('starts with only the first chapter introduction', () => {
    expect(project(firstRunState())).toEqual({
      visibleChapterIds: ['chapter-1'],
      visiblePassageIds: ['chapter-1-intro'],
      avocatoEntryVisible: false,
    })
  })

  test('reveals early chapters from goal, manually owned facilities and Dyson scale', () => {
    const source = firstRunState()
    const progressed: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        goalStage: 1n,
        facilities: {
          ...source.dyson.facilities,
          ai_managers: [0, 1],
          servers: [0, 1],
        },
      },
    }

    const story = project(
      progressed,
      20_000 * 100_000_000_000,
    )
    expect(story.visibleChapterIds).toEqual([
      'chapter-1',
      'chapter-2',
      'chapter-3',
    ])
    expect(story.visiblePassageIds).toEqual([
      'chapter-1-intro',
      'chapter-1-part-2',
      'chapter-1-part-3',
      'chapter-2-intro',
      'chapter-2-part-2',
      'chapter-2-part-3',
      'chapter-3-intro',
    ])
  })

  test('reveals Infinity memories one reset at a time and Avocato at two points', () => {
    const source = firstRunState()
    const fiveInfinityPoints: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        points: 5n,
      },
    }

    const story = project(fiveInfinityPoints)
    expect(story.visibleChapterIds).toEqual([
      'chapter-1',
      'chapter-2',
      'chapter-3',
      'chapter-4',
    ])
    expect(story.visiblePassageIds).toContain('chapter-4-part-6')
    expect(story.visiblePassageIds).not.toContain('chapter-4-part-7')
    expect(story.avocatoEntryVisible).toBe(true)
  })

  test('a Quantum Leap reveals all prior reset memories and Reality story', () => {
    const source = firstRunState()
    const postLeap: CanonicalGameStateV1 = {
      ...source,
      quantum: {
        ...source.quantum,
        pointsEarned: 1n,
      },
    }

    const story = project(postLeap)
    expect(story.visibleChapterIds).toEqual([
      'chapter-1',
      'chapter-2',
      'chapter-3',
      'chapter-4',
      'chapter-5',
    ])
    expect(story.visiblePassageIds).toContain('chapter-4-part-10')
    expect(story.visiblePassageIds).toContain('chapter-5-part-5')
    expect(story.avocatoEntryVisible).toBe(true)
  })

  test('reveals Reality at 42 Secrets without inventing Infinity memories', () => {
    const source = firstRunState()
    const allSecrets: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        secretsOfTheUniverse: 42n,
      },
    }

    const story = project(allSecrets)
    expect(story.visibleChapterIds).toEqual([
      'chapter-1',
      'chapter-5',
    ])
    expect(story.visiblePassageIds).toContain('chapter-5-part-1')
    expect(story.visiblePassageIds).not.toContain('chapter-4-intro')
  })

  test('preserves independent Translation VIII and Speed VIII reveals', () => {
    const source = firstRunState()
    const speedOnly = withRealityUpgrades(source, false, true)
    const complete = withRealityUpgrades(source, true, true)

    expect(project(speedOnly)).toMatchObject({
      visibleChapterIds: ['chapter-1'],
      visiblePassageIds: [
        'chapter-1-intro',
        'chapter-6-speed',
      ],
    })
    expect(project(complete)).toMatchObject({
      visibleChapterIds: ['chapter-1', 'chapter-6'],
      visiblePassageIds: [
        'chapter-1-intro',
        'chapter-6-translation',
        'chapter-6-speed',
        'chapter-6-complete',
      ],
    })
  })
})

function project(
  state: CanonicalGameStateV1,
  activePanels = 0,
) {
  return projectFrontendStoryDerivedFacts(state, activePanels)
}

function firstRunState(): CanonicalGameStateV1 {
  const prepared = prepareIdb1Save(
    readFileSync(firstRunFixtureUrl, 'utf8'),
  ).prepared
  return hydrateGameState(prepared).state
}

function withRealityUpgrades(
  source: CanonicalGameStateV1,
  translation8: boolean,
  speed8: boolean,
): CanonicalGameStateV1 {
  return {
    ...source,
    dream: {
      ...source.dream,
      upgrades: {
        ...source.dream.upgrades,
        translation8,
        speed8,
      },
    },
  }
}
