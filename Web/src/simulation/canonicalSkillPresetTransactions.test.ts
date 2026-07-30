import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SkillPresetState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  parseCanonicalSkillPreset,
  previewAddSkillToPreset,
  previewRemoveSkillFromPreset,
  serializeCanonicalSkillPreset,
} from './canonicalSkillPresetTransactions'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function stateWithQueue(skillIds: readonly string[]): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
  const presets = [...source.skills.presets]
  presets[0] = { ...presets[0]!, skillIds: [...skillIds] }
  return {
    ...source,
    skills: {
      ...source.skills,
      activeAutoAssignment: [...skillIds],
      presets:
        presets as unknown as CanonicalGameStateV1['skills']['presets'],
    },
  }
}

describe('canonical skill preset transactions', () => {
  test('previews a complete dependency closure in safe queue order', () => {
    const preview = previewAddSkillToPreset(
      stateWithQueue([]),
      1,
      'androids',
    )

    expect(preview).toEqual({
      accepted: true,
      changed: true,
      code: 'added',
      affectedSkillIds: [
        'startHereTree',
        'workerEfficiencyTree',
        'panelLifetime20Tree',
        'androids',
      ],
      nextSkillIds: [
        'startHereTree',
        'workerEfficiencyTree',
        'panelLifetime20Tree',
        'androids',
      ],
    })
  })

  test('previews cascading removal of every queued dependent', () => {
    const preview = previewRemoveSkillFromPreset(
      stateWithQueue([
        'startHereTree',
        'workerEfficiencyTree',
        'panelLifetime20Tree',
        'androids',
        'banking',
      ]),
      1,
      'workerEfficiencyTree',
    )

    expect(preview).toMatchObject({
      accepted: true,
      changed: true,
      affectedSkillIds: ['workerEfficiencyTree', 'androids'],
      nextSkillIds: [
        'startHereTree',
        'panelLifetime20Tree',
        'banking',
      ],
    })
  })

  test('rejects an add whose dependency closure conflicts with the queue', () => {
    const preview = previewAddSkillToPreset(
      stateWithQueue(['scientificDominance']),
      1,
      'economicDominance',
    )

    expect(preview).toMatchObject({
      accepted: false,
      changed: false,
      code: 'exclusive-conflict',
      nextSkillIds: ['scientificDominance'],
    })
  })

  test('round-trips the Unity version-one exchange payload', () => {
    const preset: SkillPresetState = {
      name: 'Science',
      botDistribution: 0.8,
      skillIds: ['startHereTree', 'doubleScienceTree'],
    }
    const serialized = serializeCanonicalSkillPreset(preset)

    expect(JSON.parse(serialized)).toEqual({
      version: 1,
      presetName: 'Science',
      botDistribution: 0.8,
      skillIds: ['startHereTree', 'doubleScienceTree'],
    })
    expect(parseCanonicalSkillPreset(serialized)).toEqual({
      accepted: true,
      payload: {
        version: 1,
        presetName: 'Science',
        botDistribution: 0.8,
        skillIds: ['startHereTree', 'doubleScienceTree'],
      },
    })
  })

  test('normalizes imported order and rejects unsafe payloads atomically', () => {
    expect(
      parseCanonicalSkillPreset(
        JSON.stringify({
          version: 1,
          presetName: 'Workers',
          botDistribution: 4,
          skillIds: [
            'workerEfficiencyTree',
            'startHereTree',
            'workerEfficiencyTree',
          ],
        }),
      ),
    ).toEqual({
      accepted: true,
      payload: {
        version: 1,
        presetName: 'Workers',
        botDistribution: 1,
        skillIds: ['startHereTree', 'workerEfficiencyTree'],
      },
    })
    expect(
      parseCanonicalSkillPreset(
        '{"version":2,"presetName":"Future","botDistribution":0.5,"skillIds":[]}',
      ),
    ).toMatchObject({
      accepted: false,
      code: 'unsupported-version',
    })
    expect(
      parseCanonicalSkillPreset(
        '{"version":1,"presetName":"Broken","botDistribution":0.5,"skillIds":["not-a-skill"]}',
      ),
    ).toMatchObject({
      accepted: false,
      code: 'unknown-skill',
    })
  })
})
