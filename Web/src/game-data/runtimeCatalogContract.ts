/**
 * Purpose:
 * - Defines the transport-only authored asset fields required by the browser
 *   canonical runtime.
 *
 * Runs:
 * - Imported by runtime-catalog contract tests and future data projections.
 * - It is not imported by presentation or canonical gameplay modules.
 *
 * Ownership:
 * - Owns only which authored fields cross the generated runtime-data boundary.
 * - Delegates every value, formula, prerequisite, condition, ordering rule and
 *   state transition to the Web-owned authored data and canonical runtime.
 *
 * Change notes:
 * - Adding a canonical consumer field requires adding that field here and
 *   updating `generated/runtime-catalog.json`.
 * - Removing a field or kind requires retained-field equality, reference
 *   closure, semantic parity and full canonical regression evidence.
 */
export const RUNTIME_CATALOG_FIELDS_BY_KIND = Object.freeze({
  'GameData.EffectDefinition': Object.freeze([
    'id',
    'targetStatId',
    'operation',
    'order',
    'value',
    'perLevel',
    'conditionId',
    '_condition',
    'targetFacilityIds',
    'targetFacilityTags',
  ]),
  'GameData.FacilityDefinition': Object.freeze([
    '_id',
    'baseCost',
    'costExponent',
    'baseProduction',
    'productionStatId',
  ]),
  'GameData.ResearchDefinition': Object.freeze([
    'autoBuyGroup',
    'baseCost',
    'exponent',
    'maxLevel',
    'prerequisiteResearchIds',
    'prerequisiteFacilityId',
    'prerequisiteFacilityOwned',
    'effects',
  ]),
  'GameData.SkillDatabase': Object.freeze(['skills']),
  'GameData.SkillDefinition': Object.freeze([
    'cost',
    'refundable',
    'isFragment',
    'requiredSkillIds',
    'shadowRequirementIds',
    'exclusiveWithIds',
    'unrefundableWithIds',
    'firstRunBlocked',
    'purityLine',
    'terraLine',
    'powerLine',
    'paragadeLine',
    'stellarLine',
    'effects',
  ]),
  'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile':
    Object.freeze(['entries']),
  'IdleDysonSwarm.Data.Balance.RealitySystemTuning':
    Object.freeze([
      'avocadoLogThreshold',
      'workerBatchSize',
      'baseWorkerGenerationSpeed',
    ]),
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition':
    Object.freeze([
      'layer',
      'key',
      'cost',
      'prerequisites',
      'purchaseEffects',
    ]),
  'IdleDysonSwarm.Data.Conditions.FacilityCountCondition':
    Object.freeze([
      '_facilityId',
      '_countType',
      '_operator',
      '_threshold',
    ]),
  'IdleDysonSwarm.Data.Conditions.FacilityStateCondition':
    Object.freeze(['_property', '_operator', '_threshold']),
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition': Object.freeze([
    'id',
    'baseCost',
    'costScaling',
    'isRepeatable',
    'maxPurchases',
  ]),
} as const)

export type RuntimeCatalogAssetKind =
  keyof typeof RUNTIME_CATALOG_FIELDS_BY_KIND
