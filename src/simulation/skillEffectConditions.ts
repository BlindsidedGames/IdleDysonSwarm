import { gameDataCatalog } from '../game-data/catalog'
import type {
  CanonicalFacilityId,
  CanonicalOwnedPair,
} from '../game-state/types'
import { isDysonFacilityId } from './dysonFacilityCatalog'
import type { SkillEffectConditionReference } from './skillEffectMaterializer'

export interface SkillEffectConditionContext {
  readonly facilities: Readonly<
    Record<CanonicalFacilityId, CanonicalOwnedPair>
  >
  readonly currentFacility?: {
    readonly owned: CanonicalOwnedPair
  }
}

/**
 * Evaluates the condition types currently linked to exported skill effects.
 * A linked condition asset takes precedence over its legacy string mirror.
 * Unknown future condition types reject so authored game-data drift cannot
 * silently change simulation balance.
 */
export function evaluateSkillEffectCondition(
  reference: Readonly<SkillEffectConditionReference>,
  context: Readonly<SkillEffectConditionContext>,
): boolean {
  if (reference.assetId !== null) {
    const asset = gameDataCatalog.assets.find(
      (candidate) => candidate.id === reference.assetId,
    )
    if (asset === undefined) {
      throw new Error(
        `Skill effect references missing condition '${reference.assetId}'.`,
      )
    }
    switch (asset.kind) {
      case 'IdleDysonSwarm.Data.Conditions.FacilityCountCondition':
        return evaluateFacilityCount(asset.id, asset.data, context)
      case 'IdleDysonSwarm.Data.Conditions.FacilityStateCondition':
        return evaluateFacilityState(asset.id, asset.data, context)
      default:
        throw new Error(
          `Skill effect condition '${asset.id}' has unsupported kind '${asset.kind}'.`,
        )
    }
  }
  if (reference.legacyId !== null) {
    return evaluateLegacyCondition(reference.legacyId, context)
  }
  return true
}

function evaluateFacilityCount(
  id: string,
  data: Readonly<Record<string, unknown>>,
  context: Readonly<SkillEffectConditionContext>,
): boolean {
  const facilityReference = requireRecord(data._facilityId, `${id}._facilityId`)
  const facilityId = requireFacilityId(
    facilityReference.id,
    `${id}._facilityId.id`,
  )
  const countType = requireInteger(data._countType, `${id}._countType`)
  const operator = requireInteger(data._operator, `${id}._operator`)
  const threshold = requireNumber(data._threshold, `${id}._threshold`)
  const [automatic, manual] = context.facilities[facilityId]
  const count =
    countType === 0
      ? automatic + manual
      : countType === 1
        ? manual
        : countType === 2
          ? automatic
          : unsupportedCountType(id, countType)
  return compareDouble(operator, count, threshold, id)
}

function evaluateFacilityState(
  id: string,
  data: Readonly<Record<string, unknown>>,
  context: Readonly<SkillEffectConditionContext>,
): boolean {
  if (context.currentFacility === undefined) return false
  const property = requireInteger(data._property, `${id}._property`)
  const operator = requireInteger(data._operator, `${id}._operator`)
  const threshold = requireNumber(data._threshold, `${id}._threshold`)
  const [automatic, manual] = context.currentFacility.owned
  const value =
    property === 0
      ? manual
      : property === 1
        ? automatic
        : property === 2
          ? automatic + manual
          : unsupportedProperty(id, property)
  return compareDouble(operator, value, threshold, id)
}

function evaluateLegacyCondition(
  id: string,
  context: Readonly<SkillEffectConditionContext>,
): boolean {
  const manual69: Readonly<Record<string, CanonicalFacilityId>> = {
    assembly_lines_69: 'assembly_lines',
    ai_managers_69: 'ai_managers',
    servers_69: 'servers',
    data_centers_69: 'data_centers',
    planets_69: 'planets',
  }
  const facilityId = manual69[id]
  if (facilityId !== undefined) {
    return context.facilities[facilityId][1] >= 69
  }
  throw new Error(`Unsupported legacy skill-effect condition '${id}'.`)
}

function compareDouble(
  operator: number,
  value: number,
  threshold: number,
  id: string,
): boolean {
  const epsilon = 0.0001
  switch (operator) {
    case 0:
      return Math.abs(value - threshold) < epsilon
    case 1:
      return Math.abs(value - threshold) >= epsilon
    case 2:
      return value > threshold
    case 3:
      return value >= threshold - epsilon
    case 4:
      return value < threshold
    case 5:
      return value <= threshold + epsilon
    default:
      throw new Error(
        `Skill effect condition '${id}' has unsupported operator '${operator}'.`,
      )
  }
}

function requireFacilityId(
  value: unknown,
  path: string,
): CanonicalFacilityId {
  if (isDysonFacilityId(value)) return value
  throw new Error(`Condition data '${path}' has unknown facility '${value}'.`)
}

function requireRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Condition data '${path}' must be a record.`)
  }
  return value as Readonly<Record<string, unknown>>
}

function requireInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Condition data '${path}' must be an integer.`)
  }
  return value
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Condition data '${path}' must be a finite number.`)
  }
  return value
}

function unsupportedCountType(id: string, value: number): never {
  throw new Error(
    `Skill effect condition '${id}' has unsupported count type '${value}'.`,
  )
}

function unsupportedProperty(id: string, value: number): never {
  throw new Error(
    `Skill effect condition '${id}' has unsupported facility property '${value}'.`,
  )
}
