import { isFinitePositiveNumber } from '../core/finiteNonNegativeNumber'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  DREAM_HOUSING_TO_VILLAGE_COST,
  DREAM_VILLAGE_TO_CITY_COST,
  deriveDreamFoundationalInformationProductionFacts,
  runDreamFoundationalInformationConversions,
  type DreamFoundationalInformationProductionFacts,
} from './dreamFoundationalInformation'
import {
  deriveDreamRailgunReadinessFacts,
  deriveDreamSpaceAgeProductionFacts,
  type DreamRailgunReadinessFacts,
  type DreamSpaceAgeProductionFacts,
} from './dreamSpaceAge'

export interface CanonicalDreamDerivedFactsInput {
  /**
   * Multiplier prepared for the exact production interval by Double Time.
   * This selector does not infer a scheduler interval from persisted state.
   */
  readonly effectiveDoubleTimeMultiplier: number
  /** Prepared Double Time activity for the railgun automation boundary. */
  readonly doubleTimeActive: boolean
  /** Persisted selected rate; the railgun authority clamps it to 0..10. */
  readonly doubleTimeRate: number
}

export interface CanonicalDreamSingleConversionFact {
  readonly eligible: boolean
  readonly conversions: number
  readonly inputCostPerConversion: number
  readonly inputSpent: number
  readonly outputCreated: number
}

export interface CanonicalDreamSpaceFactoryConversionFact {
  readonly eligible: boolean
  readonly conversions: number
  readonly rocketsPerSpaceFactory: bigint
  readonly rocketsSpent: number
  readonly factoriesSpent: number
  readonly spaceFactoriesCreated: number
}

export interface CanonicalDreamConversionFacts {
  /** This conversion is evaluated before the village-to-city conversion. */
  readonly housingToVillages: CanonicalDreamSingleConversionFact
  /**
   * Eligibility includes a village created by housing conversion in the same
   * conversion boundary, matching the canonical sequential transition.
   */
  readonly villagesToCities: CanonicalDreamSingleConversionFact
  readonly rocketsToSpaceFactories: CanonicalDreamSpaceFactoryConversionFact
}

export interface CanonicalDreamDerivedFacts {
  readonly foundationalInformation: {
    readonly production: DreamFoundationalInformationProductionFacts
    readonly conversions: CanonicalDreamConversionFacts
  }
  readonly spaceAge: {
    readonly production: DreamSpaceAgeProductionFacts
    readonly railgun: DreamRailgunReadinessFacts
  }
}

export type CanonicalDreamDerivedFactsIssueCode =
  | 'DREAM_DOUBLE_TIME_MULTIPLIER_INVALID'
  | 'DREAM_DOUBLE_TIME_ACTIVITY_INVALID'
  | 'DREAM_DOUBLE_TIME_RATE_INVALID'
  | 'DREAM_RAILGUN_MAX_CHARGE_INVALID'
  | 'DREAM_DERIVATION_INVALID'

export interface CanonicalDreamDerivedFactsIssue {
  readonly code: CanonicalDreamDerivedFactsIssueCode
  readonly path: string
  readonly detail: string
}

export type CanonicalDreamDerivedFactsResult =
  | {
      readonly ok: true
      readonly value: CanonicalDreamDerivedFacts
    }
  | {
      readonly ok: false
      readonly issues: readonly CanonicalDreamDerivedFactsIssue[]
    }

/**
 * Selects presentation-neutral Dream production, conversion, and railgun
 * facts without mutating state, advancing time, or probing a positive
 * interval. Callers must supply Double Time values prepared for the same
 * scheduler boundaries that will execute the corresponding transitions.
 */
export function deriveCanonicalDreamDerivedFacts(
  state: Readonly<CanonicalGameStateV1>,
  input: Readonly<CanonicalDreamDerivedFactsInput>,
): CanonicalDreamDerivedFactsResult {
  const issues = validateInput(state, input)
  if (issues.length > 0) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze(issues),
    })
  }

  const foundational =
    deriveDreamFoundationalInformationProductionFacts(
      state,
      input.effectiveDoubleTimeMultiplier,
    )
  const spaceAge = deriveDreamSpaceAgeProductionFacts(
    state,
    input.effectiveDoubleTimeMultiplier,
  )
  const railgun = deriveDreamRailgunReadinessFacts(state, input)
  if (
    foundational.status === 'invalid-input' ||
    spaceAge.status === 'invalid-input' ||
    railgun.status === 'invalid-input'
  ) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([
        Object.freeze({
          code: 'DREAM_DERIVATION_INVALID' as const,
          path: 'dream',
          detail:
            'Dream facts could not be derived from the supplied canonical state.',
        }),
      ]),
    })
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      foundationalInformation: Object.freeze({
        production: foundational.facts,
        conversions: deriveConversionFacts(state),
      }),
      spaceAge: Object.freeze({
        production: spaceAge.facts,
        railgun: railgun.facts,
      }),
    }),
  })
}

function validateInput(
  state: Readonly<CanonicalGameStateV1>,
  input: Readonly<CanonicalDreamDerivedFactsInput>,
): CanonicalDreamDerivedFactsIssue[] {
  const issues: CanonicalDreamDerivedFactsIssue[] = []
  if (
    !Number.isFinite(input.effectiveDoubleTimeMultiplier) ||
    input.effectiveDoubleTimeMultiplier < 0
  ) {
    issues.push(
      issue(
        'DREAM_DOUBLE_TIME_MULTIPLIER_INVALID',
        'input.effectiveDoubleTimeMultiplier',
        'Effective Double Time multiplier must be finite and non-negative.',
      ),
    )
  }
  if (typeof input.doubleTimeActive !== 'boolean') {
    issues.push(
      issue(
        'DREAM_DOUBLE_TIME_ACTIVITY_INVALID',
        'input.doubleTimeActive',
        'Double Time activity must be a boolean.',
      ),
    )
  }
  if (!Number.isFinite(input.doubleTimeRate)) {
    issues.push(
      issue(
        'DREAM_DOUBLE_TIME_RATE_INVALID',
        'input.doubleTimeRate',
        'Double Time rate must be finite.',
      ),
    )
  }
  const maximumCharge = state.dream.parameters.railgunMaxCharge
  if (!isFinitePositiveNumber(maximumCharge)) {
    issues.push(
      issue(
        'DREAM_RAILGUN_MAX_CHARGE_INVALID',
        'state.dream.parameters.railgunMaxCharge',
        'Railgun maximum charge must be finite and positive.',
      ),
    )
  }
  return issues
}

function deriveConversionFacts(
  state: Readonly<CanonicalGameStateV1>,
): CanonicalDreamConversionFacts {
  const conversion =
    runDreamFoundationalInformationConversions(state)
  const resources = state.dream.resources
  const nextResources = conversion.state.dream.resources

  return Object.freeze({
    housingToVillages: Object.freeze({
      eligible: conversion.housingToVillages > 0,
      conversions: conversion.housingToVillages,
      inputCostPerConversion: DREAM_HOUSING_TO_VILLAGE_COST,
      inputSpent:
        conversion.housingToVillages *
        DREAM_HOUSING_TO_VILLAGE_COST,
      outputCreated: conversion.housingToVillages,
    }),
    villagesToCities: Object.freeze({
      eligible: conversion.villagesToCities > 0,
      conversions: conversion.villagesToCities,
      inputCostPerConversion: DREAM_VILLAGE_TO_CITY_COST,
      inputSpent:
        conversion.villagesToCities * DREAM_VILLAGE_TO_CITY_COST,
      outputCreated: conversion.villagesToCities,
    }),
    rocketsToSpaceFactories: Object.freeze({
      eligible: conversion.rocketsToSpaceFactories > 0,
      conversions: conversion.rocketsToSpaceFactories,
      rocketsPerSpaceFactory:
        state.dream.parameters.rocketsPerSpaceFactory,
      rocketsSpent:
        conversion.rocketsToSpaceFactories > 0
          ? resources.rockets - nextResources.rockets
          : 0,
      factoriesSpent:
        conversion.rocketsToSpaceFactories > 0
          ? resources.factories - nextResources.factories
          : 0,
      spaceFactoriesCreated:
        conversion.rocketsToSpaceFactories,
    }),
  })
}

function issue(
  code: CanonicalDreamDerivedFactsIssueCode,
  path: string,
  detail: string,
): CanonicalDreamDerivedFactsIssue {
  return Object.freeze({ code, path, detail })
}
