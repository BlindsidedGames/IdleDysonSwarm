/**
 * Purpose:
 * - Defines the transport-only legacy asset fields still required by the
 *   browser runtime.
 *
 * Runs:
 * - Imported by runtime-catalog contract tests and future data projections.
 * - It is not imported by presentation or canonical gameplay modules.
 *
 * Ownership:
 * - Owns only which frozen compatibility fields cross the generated-data
 *   boundary.
 * - Transport does not make every field in the deprecated handoff
 *   authoritative. Generated values remain active only where a current module
 *   explicitly consumes them. Explicit TypeScript rules and documented
 *   overrides win when they deliberately differ.
 *
 * Change notes:
 * - Adding a canonical consumer field requires adding that field here and
 *   updating `generated/runtime-catalog.json`.
 * - Removing a field or kind requires reference closure, legacy-save
 *   compatibility, and canonical regression evidence.
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
