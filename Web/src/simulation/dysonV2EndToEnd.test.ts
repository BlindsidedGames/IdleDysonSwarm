import { readdirSync, readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalFacilityId } from '../game-state/types'
import {
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  isGameDecimal,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import {
  DYSON_V2_COMMAND_TARGETS,
  commitV2DysonFacilityPurchase,
  quoteV2DysonFacilityPurchase,
  runV2DysonAutomationTick,
} from './dysonV2Commands'
import {
  deriveDysonV2FromCauses,
  type DysonV2RuntimeEvidence,
} from './dysonV2Derivation'
import {
  advanceActiveDysonV2Production,
  advanceOfflineDysonV2Production,
} from './dysonV2Production'

const encoded = gameDecimalToCanonicalString

describe('dormant Stage 3 Dyson V2 end-to-end harness', () => {
  test('crosses migration, authenticated commands, causes, production, and snapshot rollover', () => {
    const prepared = PreparedSave.fromDecoded(deserializeWebSave(schema12Web))
    const migration = migratePreparedSaveToV2(prepared, {
      kind: 'trusted-same-device',
    })
    const migrated = migration.state
    const migratedMoney = encoded(migrated.dyson.money)
    const migratedAssembly = encoded(
      migrated.dyson.facilities.assembly_lines[1],
    )
    const stayingPower = migrated.skills.byId.stayingPower
    if (stayingPower === undefined) {
      throw new Error('The closed Skill catalog is missing stayingPower.')
    }
    const enabledFacilities = Object.fromEntries(
      DYSON_V2_COMMAND_TARGETS.map((facilityId) => [
        facilityId,
        facilityId === 'assembly_lines',
      ]),
    ) as Record<CanonicalFacilityId, boolean>
    const state = cloneCanonicalGameStateV2({
      ...migrated,
      dyson: {
        ...migrated.dyson,
        money: gameDecimalFromCanonicalString('1e100'),
        bots: gameDecimalFromNumber(100),
        facilities: {
          ...migrated.dyson.facilities,
          assembly_lines: Object.freeze([
            gameDecimalFromNumber(0),
            gameDecimalFromNumber(0),
          ]),
          ai_managers: Object.freeze([
            gameDecimalFromCanonicalString('1e400'),
            gameDecimalFromNumber(0),
          ]),
        },
        automation: {
          ...migrated.dyson.automation,
          buyMode: 'buy-1',
          roundedBulkBuy: false,
          enabledFacilities,
        },
      },
      infinity: {
        ...migrated.infinity,
        automationUnlocked: {
          ...migrated.infinity.automationUnlocked,
          bots: true,
        },
      },
      skills: {
        ...migrated.skills,
        byId: {
          ...migrated.skills.byId,
          stayingPower: {
            ...stayingPower,
            owned: true,
          },
        },
      },
      research: {
        ...migrated.research,
        levelsById: {
          ...migrated.research.levelsById,
          'research.panel_lifetime_1': 1n,
        },
      },
      timeline: {
        ...migrated.timeline,
        dysonAutomationTargetIndex: 0,
      },
    })
    const sourceMoney = encoded(state.dyson.money)
    const sourceManagers = encoded(state.dyson.facilities.ai_managers[0])

    const manualQuote = quoteV2DysonFacilityPurchase(
      state,
      73,
      'assembly_lines',
      'buy-1',
      false,
    )
    const manual = commitV2DysonFacilityPurchase(manualQuote, state, 73)
    const automated = runV2DysonAutomationTick(manual.state, 74)

    expect(manualQuote.eligible).toBe(true)
    expect(Object.isFrozen(manualQuote)).toBe(true)
    expect(Object.isFrozen(manualQuote.transactionQuote)).toBe(true)
    expect(manual).toMatchObject({
      accepted: true,
      purchased: true,
      changed: true,
      revision: 74,
    })
    expect(encoded(manual.state.dyson.facilities.assembly_lines[1]))
      .toBe('1e0')
    expect(automated.attempts[0]?.result).toMatchObject({
      accepted: true,
      purchased: true,
      revision: 75,
    })
    expect(automated.attempts.slice(1).every(
      (attempt) => attempt.result.status === 'facility-disabled',
    )).toBe(true)
    expect(automated).toMatchObject({
      revision: 75,
      startIndex: 0,
      nextTargetIndex: 1,
    })
    expect(Number.isSafeInteger(automated.revision)).toBe(true)
    expect(automated.revision).toBe(manual.revision + 1)
    expect(automated.state.timeline.dysonAutomationTargetIndex).toBe(1)
    expect(manual.state.timeline.dysonAutomationTargetIndex).toBe(0)
    expect(encoded(automated.state.dyson.facilities.assembly_lines[1]))
      .toBe('2e0')

    const legacyEvidenceBefore = Object.freeze(
      Object.fromEntries(Object.entries(
        migration.legacyRuntimeEvidence.skillEffectEvaluationSnapshot,
      )),
    )
    const initial = deriveDysonV2FromCauses(
      automated.state,
      migration.legacyRuntimeEvidence,
    )
    const active = advanceActiveDysonV2Production(
      automated.state,
      initial.parameters,
      10,
    )
    const offline = advanceOfflineDysonV2Production(
      automated.state,
      initial.parameters,
      10,
    )

    expect(active).toEqual(offline)
    expect(active.state).not.toBe(automated.state)
    expect(encoded(automated.state.dyson.money)).toBe(
      encoded(manual.state.dyson.money),
    )
    expect(encoded(automated.state.dyson.facilities.ai_managers[0]))
      .toBe(sourceManagers)
    expect(migration.legacyRuntimeEvidence.skillEffectEvaluationSnapshot)
      .toEqual(legacyEvidenceBefore)

    const runtimeEvidence: DysonV2RuntimeEvidence = Object.freeze({
      compatibilityTuning:
        migration.legacyRuntimeEvidence.compatibilityTuning,
      evaluationSnapshot: initial.nextEvaluationSnapshot,
    })
    const next = deriveDysonV2FromCauses(automated.state, runtimeEvidence)

    expect(initial.production.rates.bots).not.toEqual(
      next.production.rates.bots,
    )
    expect(encoded(initial.nextEvaluationSnapshot.panelLifetimeSeconds))
      .toBe('1.1e1')
    expect(next.nextEvaluationSnapshot.managerAssemblyLineProduction)
      .toEqual(initial.nextEvaluationSnapshot.managerAssemblyLineProduction)
    expect(
      initial.nextEvaluationSnapshot.managerAssemblyLineProduction.exponent,
    ).toBeGreaterThan(308)
    expect(Object.values(initial.nextEvaluationSnapshot).every(
      (value) => isGameDecimal(value) && Object.isFrozen(value),
    )).toBe(true)
    expect(Object.values(next.nextEvaluationSnapshot).every(isGameDecimal))
      .toBe(true)
    expect(Object.isFrozen(runtimeEvidence)).toBe(true)
    expect(Object.isFrozen(initial.nextEvaluationSnapshot)).toBe(true)

    expect(encoded(state.dyson.money)).toBe(sourceMoney)
    expect(encoded(state.dyson.facilities.assembly_lines[1])).toBe('0')
    expect(encoded(state.dyson.facilities.ai_managers[0])).toBe(sourceManagers)
    expect(encoded(migrated.dyson.money)).toBe(migratedMoney)
    expect(encoded(migrated.dyson.facilities.assembly_lines[1]))
      .toBe(migratedAssembly)
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(automated.state)).toBe(true)
  })

  test('keeps every dormant Stage 3 V2 module out of production roots', () => {
    const productionRoots = [
      '../application/',
      '../browser/',
      '../native/',
      '../platform/',
      '../pwa/',
      '../ui/',
    ].map((path) => new URL(path, import.meta.url))
    const files = productionRoots.flatMap(sourceFiles)
    const dormantImport = /(?:from\s*|import\s*\(\s*)['"][^'"]*dysonV2(?:Commands|Derivation|Production)['"]/u
    const violations = files.filter((file) =>
      !file.pathname.endsWith('/application/dreamStrangeMatterAuthorityV2.ts') &&
      !file.pathname.endsWith('/application/developerOptionsTransactionV2.ts') &&
      dormantImport.test(readFileSync(file, 'utf8')),
    )

    expect(violations.map((file) => file.pathname)).toEqual([])
  })
})

function sourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    if (entry.isDirectory()) return sourceFiles(target)
    return /\.(?:ts|tsx|mts|cts)$/u.test(entry.name) &&
      !/\.test\.(?:ts|tsx|mts|cts)$/u.test(entry.name)
      ? [target]
      : []
  })
}
