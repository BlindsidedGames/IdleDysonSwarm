import { describe, expect, test } from 'vitest'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_DYSON_SNAPSHOT,
  DETERMINISTIC_DYSON_TUNING,
} from '../../scripts/support/deterministicMatureDysonFixture'
import { resolveReferenceDynamicSkillEffect } from '../../scripts/support/referenceDynamicSkillEffectResolver'
import { materializeReferenceSkillEffects } from '../../scripts/support/referenceSkillEffectMaterializer'
import {
  ALL_EFFECT_DEFINITION_IDS,
  createSkillEffectCertificationScenarios,
  materializeCandidateCertificationTargets,
  materializeCertificationTargets,
} from '../../scripts/support/skillEffectCertification'
import { withCanonicalBotAllocation } from './canonicalBotAllocation'
import { deriveDysonProduction, deriveBasicDysonState } from './canonicalDysonDerivation'
import {
  prepareDynamicSkillEffectResolver,
  resolveDynamicSkillEffect,
} from './dynamicSkillEffectResolver'
import { materializeSkillEffects } from './skillEffectMaterializer'

const scenarios = createSkillEffectCertificationScenarios()

describe('skill-effect optimization certification', () => {
  test.each(scenarios)('numeric production preserves full presentation rates and prior-pass publication for $name', ({ state }) => {
    const canonical = withCanonicalBotAllocation(state)
    const full = deriveBasicDysonState(canonical, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
    const numeric = deriveDysonProduction(canonical, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
    expect(numeric.ok).toBe(full.ok)
    if (full.ok && numeric.ok) {
      const { facilityFacts: _presentation, ...production } = full.value
      expect(numeric.value).toEqual(production)
    } else expect(numeric).toEqual(full)
  })

  test.each(scenarios)(
    'preserves complete materialization for $name',
    ({ state }) => {
      const reference = materializeCertificationTargets(
        state,
        materializeReferenceSkillEffects,
        resolveReferenceDynamicSkillEffect,
      )
      const candidate = materializeCandidateCertificationTargets(state)

      expect(candidate).toEqual(reference)
    },
  )

  test.each(scenarios)(
    'preserves prepared dynamic resolver decisions for $name',
    ({ state }) => {
      const candidate = prepareDynamicSkillEffectResolver(
        state,
        DETERMINISTIC_DYSON_TUNING,
        DETERMINISTIC_DYSON_SNAPSHOT,
      )
      for (const effectId of ALL_EFFECT_DEFINITION_IDS) {
        expect(candidate.resolve(effectId), effectId).toEqual(
          resolveReferenceDynamicSkillEffect(
            effectId,
            state,
            DETERMINISTIC_DYSON_TUNING,
            DETERMINISTIC_DYSON_SNAPSHOT,
          ),
        )
      }
    },
  )

  test.each(scenarios)(
    'preserves every dynamic resolver decision for $name',
    ({ state }) => {
      for (const effectId of ALL_EFFECT_DEFINITION_IDS) {
        expect(
          resolveDynamicSkillEffect(
            effectId,
            state,
            DETERMINISTIC_DYSON_TUNING,
            DETERMINISTIC_DYSON_SNAPSHOT,
          ),
          effectId,
        ).toEqual(
          resolveReferenceDynamicSkillEffect(
            effectId,
            state,
            DETERMINISTIC_DYSON_TUNING,
            DETERMINISTIC_DYSON_SNAPSHOT,
          ),
        )
      }
    },
  )

  test('exercises both sides of the authored conditional thresholds', () => {
    const below = materializeCertificationTargets(
      createDeterministicMatureDysonFixture({
        ownedSkillIds: ['avocados'],
        conditionsMet: false,
      }),
      materializeSkillEffects,
      resolveDynamicSkillEffect,
    )
    const atThreshold = materializeCertificationTargets(
      createDeterministicMatureDysonFixture({
        ownedSkillIds: ['avocados'],
        conditionsMet: true,
      }),
      materializeSkillEffects,
      resolveDynamicSkillEffect,
    )

    expect(below['Facility.AssemblyLine.Production']).toEqual([])
    expect(
      atThreshold['Facility.AssemblyLine.Production']?.map(
        (effect) => effect.id,
      ),
    ).toContain('effect.avocados.assembly_lines')
  })

  test('preserves typed invalid-dependency failures', () => {
    const state = createDeterministicMatureDysonFixture({
      ownedSkillIds: ['higgsBoson'],
    })
    const invalidSnapshot = {
      ...DETERMINISTIC_DYSON_SNAPSHOT,
      panelsPerSecond: Number.NaN,
    }

    expect(
      resolveDynamicSkillEffect(
        'effect.higgsBoson.money_multiplier',
        state,
        DETERMINISTIC_DYSON_TUNING,
        invalidSnapshot,
      ),
    ).toEqual(
      resolveReferenceDynamicSkillEffect(
        'effect.higgsBoson.money_multiplier',
        state,
        DETERMINISTIC_DYSON_TUNING,
        invalidSnapshot,
      ),
    )
  })

  test('keeps the bounded mature fixture derivable', () => {
    const result = deriveBasicDysonState(
      createDeterministicMatureDysonFixture({ ownedSkillIds: 'all' }),
      DETERMINISTIC_DYSON_TUNING,
      { permanentDoubleIp: true },
      DETERMINISTIC_DYSON_SNAPSHOT,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.values(result.value.rates).every(Number.isFinite)).toBe(
      true,
    )
  })
})
