import { describe, expect, test } from 'vitest'
import runtimeCatalog from '../game-data/generated/runtime-catalog.json'
import skillTreePresentation from '../game-data/generated/skill-tree-presentation.json'
import type {
  FrontendCanonicalResources,
  FrontendRealityDerivedFacts,
} from '../application/frontendSnapshot'
import type { GameDecimal } from '../math/gameDecimal'
import type {
  V2AtomicAccount,
  V2AtomicExchangeCommitResult,
  V2AtomicExchangeQuote,
  V2AtomicLeg,
  V2BulkCorrectionResult,
  V2GeometricAffordabilityResult,
  V2PurchaseCommitResult,
  V2PurchaseQuote,
} from '../simulation/transactionsV2'
import type {
  DysonV2FacilityPurchaseQuote,
  DysonV2FacilityPurchaseResult,
} from '../simulation/dysonV2Commands'
import type {
  ResearchV2PhaseAccounting,
  ResearchV2PurchaseQuote,
  ResearchV2PurchaseResult,
} from '../simulation/researchV2'
import type {
  InfinityShopCommitResultV2,
  InfinityShopQuoteV2,
} from '../simulation/infinityShopV2'
import type {
  RealityGatherResultV2,
  RealityStrangeMatterAccountV2,
  RealityUpgradeCommitResultV2,
  RealityUpgradeQuoteV2,
  RealityWorkerAdvanceResultV2,
} from '../simulation/realityV2'
import type {
  QuantumPurchaseQuoteV2,
  QuantumPurchaseResultV2,
} from '../simulation/quantumV2'
import type { DreamCommandQuoteV2 } from '../application/dreamStrangeMatterAuthorityV2'
import type {
  AvocadoCommandQuoteV2,
  AvocadoStrangeMatterAccountV2,
} from '../simulation/avocadoV2'
import type { DeveloperOptionsQuoteV2 } from '../application/developerOptionsTransactionV2'
import type { CanonicalDreamResetQuoteV2 } from '../simulation/canonicalDreamResetV2'
import {
  canonicalNumericFieldClassifications,
  canonicalFragmentSkillKeySet,
  canonicalDreamTimerKeySet,
  canonicalResearchKeySet,
  canonicalResearchLevelPolicies,
  canonicalSkillStateKeySet,
  canonicalV1NumericPathInventory,
  deferredNumericCoverage,
  durableRuntimeNumericClassifications,
  durableRuntimeNumericPathInventory,
  frontendResourceNumericClassifications,
  frontendResourceNumericPathInventory,
  generatedDataNumericClassifications,
  generatedDataNumericPathInventory,
  numericFieldManifest,
  plannedV2OnlyNumericClassifications,
  skillTreePresentationNumericClassifications,
  skillTreePresentationNumericPathInventory,
  currentUnboundedRuntimeNumericCarrierClassifications,
  validateNumericFieldClassifications,
  v2TransactionDtoNumericClassifications,
  type NumericFieldClassification,
} from './numericFieldManifest'

type NumericLeafPaths<T, TPrefix extends string> = T extends unknown
  ? NonNullable<T> extends GameDecimal
    ? TPrefix
    : NonNullable<T> extends number | bigint
    ? TPrefix
    : NonNullable<T> extends readonly (infer TValue)[]
      ? NumericLeafPaths<TValue, `${TPrefix}.*`>
      : NonNullable<T> extends object
        ? string extends keyof NonNullable<T>
          ? NonNullable<T> extends Readonly<Record<string, infer TValue>>
            ? NumericLeafPaths<TValue, `${TPrefix}.*`>
            : never
          : {
              [TKey in keyof NonNullable<T> & string]: NumericLeafPaths<
                NonNullable<T>[TKey],
                `${TPrefix}.${TKey}`
              >
            }[keyof NonNullable<T> & string]
        : never
  : never

type NumericCarrierPaths<
  T,
  TCarrier extends 'decimal' | 'bigint' | 'number',
  TPrefix extends string,
> = T extends unknown
  ? NonNullable<T> extends GameDecimal
    ? TCarrier extends 'decimal' ? TPrefix : never
    : NonNullable<T> extends bigint
      ? TCarrier extends 'bigint' ? TPrefix : never
      : NonNullable<T> extends number
        ? TCarrier extends 'number' ? TPrefix : never
        : NonNullable<T> extends readonly (infer TValue)[]
          ? NumericCarrierPaths<TValue, TCarrier, `${TPrefix}.*`>
          : NonNullable<T> extends object
            ? string extends keyof NonNullable<T>
              ? NonNullable<T> extends Readonly<Record<string, infer TValue>>
                ? NumericCarrierPaths<TValue, TCarrier, `${TPrefix}.*`>
                : never
              : {
                  [TKey in keyof NonNullable<T> & string]: NumericCarrierPaths<
                    NonNullable<T>[TKey],
                    TCarrier,
                    `${TPrefix}.${TKey}`
                  >
                }[keyof NonNullable<T> & string]
            : never
  : never

type V2TransactionDtoSurface = {
  readonly V2PurchaseQuote: V2PurchaseQuote
  readonly V2PurchaseCommitResult: V2PurchaseCommitResult
  readonly V2BulkCorrectionResult: V2BulkCorrectionResult
  readonly V2GeometricAffordabilityResult: V2GeometricAffordabilityResult
  readonly V2AtomicAccount: V2AtomicAccount
  readonly V2AtomicLeg: V2AtomicLeg
  readonly V2AtomicExchangeQuote: V2AtomicExchangeQuote
  readonly V2AtomicExchangeCommitResult: V2AtomicExchangeCommitResult
  readonly DysonV2FacilityPurchaseQuote: Omit<
    DysonV2FacilityPurchaseQuote,
    'transactionQuote'
  >
  readonly DysonV2FacilityPurchaseResult: Omit<
    DysonV2FacilityPurchaseResult,
    'state'
  >
  readonly ResearchV2PurchaseQuote: Omit<
    ResearchV2PurchaseQuote,
    'transactionQuote'
  >
  readonly ResearchV2PurchaseResult: Omit<ResearchV2PurchaseResult, 'state'>
  readonly ResearchV2PhaseAccounting: ResearchV2PhaseAccounting
  readonly InfinityShopQuoteV2: InfinityShopQuoteV2
  readonly InfinityShopCommitResultV2: Omit<InfinityShopCommitResultV2, 'state'>
  readonly RealityWorkerAdvanceResultV2: Omit<RealityWorkerAdvanceResultV2, 'state'>
  readonly RealityGatherResultV2: Omit<RealityGatherResultV2, 'state'>
  readonly RealityStrangeMatterAccountV2: RealityStrangeMatterAccountV2
  readonly RealityUpgradeQuoteV2: RealityUpgradeQuoteV2
  readonly RealityUpgradeCommitResultV2: Omit<
    RealityUpgradeCommitResultV2,
    'state' | 'account'
  >
  readonly QuantumPurchaseQuoteV2: Omit<QuantumPurchaseQuoteV2, 'transactionQuote'>
  readonly QuantumPurchaseResultV2: Omit<QuantumPurchaseResultV2, 'state'>
  readonly DreamCommandQuoteV2: Omit<DreamCommandQuoteV2, 'expectedPublication'>
  readonly AvocadoCommandQuoteV2: Omit<AvocadoCommandQuoteV2, 'expectedPublication'>
  readonly AvocadoStrangeMatterAccountV2: AvocadoStrangeMatterAccountV2
  readonly DeveloperOptionsQuoteV2: Omit<DeveloperOptionsQuoteV2, 'expectedCandidate'>
  readonly CanonicalDreamResetQuoteV2: Omit<CanonicalDreamResetQuoteV2, 'expectedPublication'>
}

type V2TransactionDtoPath = NumericLeafPaths<V2TransactionDtoSurface, ''>
type ClassifiedV2TransactionDtoPath =
  (typeof v2TransactionDtoNumericClassifications)[number]['path']
type MissingV2TransactionDtoPath = Exclude<
  V2TransactionDtoPath extends `.${infer TPath}` ? TPath : never,
  ClassifiedV2TransactionDtoPath
>
type UnexpectedV2TransactionDtoPath = Exclude<
  ClassifiedV2TransactionDtoPath,
  V2TransactionDtoPath extends `.${infer TPath}` ? TPath : never
>
const V2_TRANSACTION_DTO_PATHS_ARE_EXHAUSTIVE: [
  MissingV2TransactionDtoPath,
  UnexpectedV2TransactionDtoPath,
] extends [never, never]
  ? true
  : never = true
void V2_TRANSACTION_DTO_PATHS_ARE_EXHAUSTIVE

type StripLeadingDot<TPath> = TPath extends `.${infer TStripped}`
  ? TStripped
  : never
type V2TransactionDecimalPath = StripLeadingDot<
  NumericCarrierPaths<V2TransactionDtoSurface, 'decimal', ''>
>
type V2TransactionBigIntPath = StripLeadingDot<
  NumericCarrierPaths<V2TransactionDtoSurface, 'bigint', ''>
>
type V2TransactionNumberPath = StripLeadingDot<
  NumericCarrierPaths<V2TransactionDtoSurface, 'number', ''>
>
type ClassifiedV2TransactionDecimalPath = Extract<
  (typeof v2TransactionDtoNumericClassifications)[number],
  { readonly semanticClass: 'ordinary-decimal' | 'integer-decimal' }
>['path']
type ClassifiedV2TransactionBigIntPath = Extract<
  (typeof v2TransactionDtoNumericClassifications)[number],
  { readonly semanticClass: 'exact-bigint' }
>['path']
type ClassifiedV2TransactionNumberPath = Extract<
  (typeof v2TransactionDtoNumericClassifications)[number],
  { readonly semanticClass: 'bounded-number' }
>['path']
type SamePaths<TLeft, TRight> = [
  Exclude<TLeft, TRight>,
  Exclude<TRight, TLeft>,
] extends [never, never] ? true : never
const V2_TRANSACTION_DECIMAL_CARRIERS_ARE_EXACT:
  SamePaths<V2TransactionDecimalPath, ClassifiedV2TransactionDecimalPath> = true
const V2_TRANSACTION_BIGINT_CARRIERS_ARE_EXACT:
  SamePaths<V2TransactionBigIntPath, ClassifiedV2TransactionBigIntPath> = true
const V2_TRANSACTION_NUMBER_CARRIERS_ARE_BOUNDED:
  SamePaths<V2TransactionNumberPath, ClassifiedV2TransactionNumberPath> = true
void V2_TRANSACTION_DECIMAL_CARRIERS_ARE_EXACT
void V2_TRANSACTION_BIGINT_CARRIERS_ARE_EXACT
void V2_TRANSACTION_NUMBER_CARRIERS_ARE_BOUNDED

type FrontendRealityDerivedFactsV2 = Omit<
  FrontendRealityDerivedFacts,
  'generationPerSecond' | 'nextUniverseDesignation'
> & {
  readonly generationPerSecond: GameDecimal
  readonly nextUniverseDesignation: GameDecimal
}
type RealityCarrierPath<TCarrier extends 'decimal' | 'bigint' | 'number'> =
  StripLeadingDot<NumericCarrierPaths<
    { readonly FrontendRealityDerivedFacts: FrontendRealityDerivedFactsV2 },
    TCarrier,
    ''
  >>
type ClassifiedRealityEntry = Extract<
  (typeof currentUnboundedRuntimeNumericCarrierClassifications)[number],
  { readonly path: `FrontendRealityDerivedFacts.${string}` }
>
type ClassifiedRealityDecimalPath = Extract<
  ClassifiedRealityEntry,
  { readonly semanticClass: 'ordinary-decimal' | 'integer-decimal' }
>['path']
type ClassifiedRealityBigIntPath = Extract<
  ClassifiedRealityEntry,
  { readonly semanticClass: 'exact-bigint' }
>['path']
type ClassifiedRealityNumberPath = Extract<
  ClassifiedRealityEntry,
  { readonly semanticClass: 'bounded-number' }
>['path']
const V2_REALITY_DECIMAL_CARRIERS_ARE_EXACT: SamePaths<
  RealityCarrierPath<'decimal'>,
  ClassifiedRealityDecimalPath
> = true
const V2_REALITY_BIGINT_CARRIERS_ARE_EXACT: SamePaths<
  RealityCarrierPath<'bigint'>,
  ClassifiedRealityBigIntPath
> = true
const V2_REALITY_NUMBER_CARRIERS_ARE_BOUNDED: SamePaths<
  RealityCarrierPath<'number'>,
  ClassifiedRealityNumberPath
> = true
void V2_REALITY_DECIMAL_CARRIERS_ARE_EXACT
void V2_REALITY_BIGINT_CARRIERS_ARE_EXACT
void V2_REALITY_NUMBER_CARRIERS_ARE_BOUNDED

type FrontendInventoryPath =
  (typeof frontendResourceNumericPathInventory)[number]
type MissingFrontendResourcePath = Exclude<
  NumericLeafPaths<
    FrontendCanonicalResources,
    'FrontendCanonicalResources'
  >,
  FrontendInventoryPath
>
type UnexpectedFrontendResourcePath = Exclude<
  FrontendInventoryPath,
  NumericLeafPaths<
    FrontendCanonicalResources,
    'FrontendCanonicalResources'
  >
>
const FRONTEND_RESOURCE_PATHS_ARE_EXHAUSTIVE: [
  MissingFrontendResourcePath,
  UnexpectedFrontendResourcePath,
] extends [never, never]
  ? true
  : never = true
void FRONTEND_RESOURCE_PATHS_ARE_EXHAUSTIVE

describe('numeric field manifest', () => {
  test('classifies every current canonical numeric leaf exactly once', () => {
    expect(canonicalNumericFieldClassifications.map((entry) => entry.path))
      .toEqual(canonicalV1NumericPathInventory)
    expect(new Set(canonicalV1NumericPathInventory).size).toBe(
      canonicalV1NumericPathInventory.length,
    )
    expect(
      canonicalNumericFieldClassifications.every(
        (entry) => entry.stage0Coverage === 'mechanical',
      ),
    ).toBe(true)
  })

  test('keeps mixed Dyson ownership tuple semantics distinct', () => {
    for (const facilityId of [
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
      'matrioshka_brains',
      'birch_planets',
      'galactic_brains',
    ]) {
      const automatic = canonicalNumericFieldClassifications.find(
        (entry) =>
          entry.path === `$.dyson.facilities.${facilityId}.0`,
      )
      const manual = canonicalNumericFieldClassifications.find(
        (entry) =>
          entry.path === `$.dyson.facilities.${facilityId}.1`,
      )
      expect(automatic?.semanticClass).toBe('ordinary-decimal')
      expect(manual?.semanticClass).toBe('integer-decimal')
    }
  })

  test('closes dynamic canonical key families and research level policy', () => {
    expect(canonicalSkillStateKeySet).toHaveLength(104)
    expect(new Set(canonicalSkillStateKeySet).size).toBe(104)
    expect(canonicalFragmentSkillKeySet).toEqual([
      'fragmentAssembly',
      'monetaryPolicy',
      'panelWarranty',
      'productionScaling',
      'progressiveAssembly',
      'regulatedAcademia',
      'terraformingProtocols',
    ])
    expect(
      canonicalFragmentSkillKeySet.every((id) =>
        canonicalSkillStateKeySet.includes(id),
      ),
    ).toBe(true)
    expect(canonicalResearchKeySet).toHaveLength(14)
    expect(canonicalDreamTimerKeySet).toEqual([
      'hunterTimerProgress',
      'gathererTimerProgress',
      'communityTimerProgress',
      'housingTimerProgress',
      'villagesTimerProgress',
      'workersTimerProgress',
      'citiesTimerProgress',
      'factoriesTimerProgress',
      'botsTimerProgress',
      'spaceFactoriesTimerProgress',
    ])

    const skillFamily = canonicalNumericFieldClassifications.find(
      (entry) => entry.path === '$.skills.byId.*.level',
    )
    const researchFamily = canonicalNumericFieldClassifications.find(
      (entry) => entry.path === '$.research.levelsById.*',
    )
    const researchProgressFamily = canonicalNumericFieldClassifications.find(
      (entry) => entry.path === '$.research.progressById.*',
    )
    const timerFamily = canonicalNumericFieldClassifications.find(
      (entry) => entry.path === '$.dream.timers.*',
    )
    expect(skillFamily?.closedKeySet?.keys).toEqual(canonicalSkillStateKeySet)
    expect(skillFamily?.invariants).toContain(
      'exact non-negative legacy ownership/rank marker; the generated 104-skill catalog declares no maximum level',
    )
    expect(researchFamily?.closedKeySet?.keys).toEqual(canonicalResearchKeySet)
    expect(researchProgressFamily?.closedKeySet?.keys).toEqual(
      canonicalResearchKeySet,
    )
    expect(researchProgressFamily?.invariants).toContain(
      'non-negative migrated legacy progress value for a closed Research ID; no V2 passive producer or completion consumer is defined',
    )
    expect(researchProgressFamily).toMatchObject({
      lifecycle:
        'preserved unchanged by Research purchases and automation, then reset to zero with Research state on Infinity',
      owner: 'Research migration and Infinity reset',
    })
    expect(timerFamily?.closedKeySet?.keys).toEqual(canonicalDreamTimerKeySet)
    expect(researchFamily?.memberPolicies).toEqual(
      canonicalResearchLevelPolicies,
    )
    expect(
      canonicalResearchLevelPolicies.filter(
        (entry) => entry.semanticClass === 'exact-bigint',
      ),
    ).toHaveLength(4)
    expect(
      canonicalResearchLevelPolicies.filter(
        (entry) => entry.semanticClass === 'integer-decimal',
      ),
    ).toHaveLength(10)
  })

  test('records explicit metadata rules and direct V2 available Shards', () => {
    expect(
      canonicalNumericFieldClassifications.every(
        (entry) => entry.metadataRuleId !== undefined,
      ),
    ).toBe(true)
    expect(
      canonicalNumericFieldClassifications.find(
        (entry) => entry.path === '$.quantum.pointsEarned',
      )?.role,
    ).toBe('statistic')
    expect(
      canonicalNumericFieldClassifications.find(
        (entry) => entry.path === '$.dream.resources.community',
      )?.semanticClass,
    ).toBe('integer-decimal')
    expect(
      canonicalNumericFieldClassifications.find(
        (entry) =>
          entry.path === '$.dream.parameters.solarPanelGeneration',
      )?.semanticClass,
    ).toBe('ordinary-decimal')
    expect(plannedV2OnlyNumericClassifications).toMatchObject([
      {
        path: '$.skills.selectedPreset',
        semanticClass: 'bounded-number',
        role: 'control',
      },
      {
        path: '$.quantum.availableShards',
        semanticClass: 'integer-decimal',
        role: 'balance',
      },
      {
        path: '$.dream.railgun.pendingBaseSeconds',
        semanticClass: 'bounded-number',
        role: 'timer',
      },
      {
        path: '$.dream.railgun.pendingDreamSeconds',
        semanticClass: 'bounded-number',
        role: 'timer',
      },
    ])

    const invariantFor = (path: string) =>
      canonicalNumericFieldClassifications.find(
        (entry) => entry.path === path,
      )?.invariants
    expect(invariantFor('$.infinity.secretsOfTheUniverse')).toContain(
      'exact permanent rank from 0 through 27',
    )
    expect(invariantFor('$.infinity.permanentSkillPoints')).toContain(
      'exact permanent Skill rank from 0 through 10',
    )
    expect(invariantFor('$.quantum.divisionsPurchased')).toContain(
      'exact Quantum Divisions rank from 0 through 19',
    )
    expect(invariantFor('$.quantum.permanentSecrets')).toContain(
      'exact permanent Quantum Secrets rank from 0 through 27',
    )
    expect(invariantFor('$.dyson.goalStage')).toContain(
      'exact authored progression stage from 0 through 10',
    )
    expect(invariantFor('$.skills.fragments')).toContain(
      'must equal the count of owned skills in the closed seven-ID fragment Skill catalog',
    )
    expect(invariantFor('$.reality.workersReady')).toContain(
      'exact ready-worker inventory from 0 through the authored worker batch size (128)',
    )
    expect(invariantFor('$.dream.disasterStage')).toContain(
      'exact closed stage set 0, 1, 2, 3, or 42',
    )
    expect(invariantFor('$.timeline.storedTimeCapacitySeconds')).toContain(
      'strictly positive capacity no greater than the authoritative 42000000-second stored-time maximum',
    )
    expect(invariantFor('$.timeline.storedTimeAvailableSeconds')).toContain(
      'finite non-negative seconds no greater than storedTimeCapacitySeconds',
    )
    expect(invariantFor('$.timeline.doubleTime.bankSeconds')).toContain(
      'finite non-negative seconds no greater than the independent authoritative 42000000-second maximum',
    )
  })

  test('covers the complete current frontend resource projection', () => {
    expect(frontendResourceNumericClassifications.map((entry) => entry.path))
      .toEqual(frontendResourceNumericPathInventory)
  })

  test('inventories every numeric generated runtime-catalog family', () => {
    expect(generatedDataNumericClassifications.map((entry) => entry.path))
      .toEqual(generatedDataNumericPathInventory)
    expect(
      generatedDataNumericClassifications.find(
        (entry) =>
          entry.path === 'GameData.FacilityDefinition.data.baseCost',
      )?.semanticClass,
    ).toBe('ordinary-decimal')
    expect(
      generatedDataNumericClassifications.find(
        (entry) => entry.path === 'GameData.SkillDefinition.data.cost',
      )?.semanticClass,
    ).toBe('exact-bigint')
    expect(
      generatedDataNumericClassifications.find(
        (entry) => entry.path.endsWith('.maxPurchases'),
      )?.invariants,
    ).toContain(
      '0 means no maximum; positive values are checked bigint caps',
    )

    const observed = new Set<string>()
    const walk = (value: unknown, path: string): void => {
      if (typeof value === 'number') {
        observed.add(path)
        return
      }
      if (Array.isArray(value)) {
        for (const entry of value) walk(entry, `${path}.*`)
        return
      }
      if (value === null || typeof value !== 'object') return
      for (const [key, entry] of Object.entries(value)) {
        walk(entry, `${path}.${key}`)
      }
    }
    for (const asset of runtimeCatalog.assets) {
      walk(asset.data, `${asset.kind}.data`)
    }
    expect([...observed].sort()).toEqual(
      [...generatedDataNumericPathInventory].sort(),
    )
  })

  test('inventories every skill-tree presentation numeric ingress', () => {
    const observed = new Set<string>()
    const walk = (value: unknown, path: string): void => {
      if (typeof value === 'number') {
        observed.add(path)
        return
      }
      if (Array.isArray(value)) {
        for (const entry of value) walk(entry, `${path}.*`)
        return
      }
      if (value === null || typeof value !== 'object') return
      for (const [key, entry] of Object.entries(value)) {
        walk(entry, `${path}.${key}`)
      }
    }
    walk(skillTreePresentation, 'skill-tree-presentation')
    expect([...observed].sort()).toEqual(
      [...skillTreePresentationNumericPathInventory].sort(),
    )
    expect(
      skillTreePresentationNumericClassifications.find(
        (entry) => entry.path.endsWith('.cost'),
      )?.semanticClass,
    ).toBe('exact-bigint')
  })

  test('inventories current unbounded non-persisted runtime carriers', () => {
    expect(currentUnboundedRuntimeNumericCarrierClassifications.length)
      .toBeGreaterThan(50)
    expect(
      currentUnboundedRuntimeNumericCarrierClassifications.map(
        (entry) => entry.path,
      ),
    ).not.toContain('DysonSkillEffectEvaluationSnapshot.panelsPerSecond')
    expect(
      currentUnboundedRuntimeNumericCarrierClassifications.map(
        (entry) => entry.path,
      ),
    ).toContain('SimulationWorkMetrics.schedulerPasses')
  })

  test('classifies the closed Dyson evaluation snapshot as durable portable recurrence state', () => {
    expect(durableRuntimeNumericPathInventory).toHaveLength(7)
    expect(durableRuntimeNumericClassifications.map((entry) => entry.path))
      .toEqual(durableRuntimeNumericPathInventory)
    expect(durableRuntimeNumericClassifications.every((entry) =>
      entry.persistenceEncoding === 'canonical-decimal-string' &&
      entry.stage0Coverage === 'mechanical' &&
      entry.lifecycle.includes('portable gameplay recurrence state'),
    )).toBe(true)
  })

  test('rejects duplicate and incompatible classifications', () => {
    const original = numericFieldManifest.entries[0]!
    expect(
      validateNumericFieldClassifications([original, original]),
    ).toEqual([
      `Duplicate numeric classification for ${original.boundary}:${original.path}.`,
    ])

    const incompatible: NumericFieldClassification = {
      ...original,
      semanticClass:
        original.semanticClass === 'exact-bigint'
          ? 'bounded-number'
          : 'exact-bigint',
    }
    expect(
      validateNumericFieldClassifications([original, incompatible]),
    ).toEqual([
      `Incompatible numeric classifications for ${original.boundary}:${original.path}.`,
    ])
  })

  test('closes the former V2 DTO and frontend projection deferrals', () => {
    expect(deferredNumericCoverage).toEqual([])
    expect(v2TransactionDtoNumericClassifications.length).toBeGreaterThan(100)
    expect(v2TransactionDtoNumericClassifications.every(
      (entry) => entry.stage0Coverage === 'mechanical',
    )).toBe(true)
    expect(numericFieldManifest.validationErrors).toEqual([])
  })
})
