import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import {
  admitValidatedCanonicalGameStateV2,
  cloneCanonicalGameStateV2,
  registerCanonicalGameStateValidationAuthorityV2,
} from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import {
  commitInfinityShopPurchaseV2,
  INFINITY_SHOP_TUNING_V2,
  quoteInfinityShopPurchaseV2,
} from './infinityShopV2'

const MIGRATED = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
).state

function stateWith(
  options: Readonly<{
    available?: string
    allocated?: string
    secrets?: bigint
    skillPoints?: bigint
    permanentSkillPoints?: bigint
    autoAssignment?: readonly string[]
  }> = {},
): CanonicalGameStateV2 {
  return cloneCanonicalGameStateV2({
    ...MIGRATED,
    infinity: {
      ...MIGRATED.infinity,
      availablePoints: gameDecimalFromCanonicalString(options.available ?? '1e1'),
      allocatedPoints: gameDecimalFromCanonicalString(options.allocated ?? '0'),
      secretsOfTheUniverse: options.secrets ?? 0n,
      permanentSkillPoints: options.permanentSkillPoints ?? 0n,
    },
    skills: {
      ...MIGRATED.skills,
      points: options.skillPoints ?? MIGRATED.skills.points,
      activeAutoAssignment: options.autoAssignment ?? MIGRATED.skills.activeAutoAssignment,
    },
  })
}

describe('Infinity shop V2', () => {
  test('does not trust an authority-forged issued state for validation elision', () => {
    const source = stateWith()
    const forged = Object.freeze({
      ...source,
      dyson: Object.freeze({
        ...source.dyson,
        manualCreationIntervalSeconds: 0,
      }),
    }) as Readonly<CanonicalGameStateV2>
    admitValidatedCanonicalGameStateV2(
      registerCanonicalGameStateValidationAuthorityV2(),
      forged,
    )

    expect(() => quoteInfinityShopPurchaseV2(forged, 1, 'secret')).toThrow(
      'Cannot publish an invalid CanonicalGameStateV2',
    )
  })

  test('atomically debits available, credits lifetime allocation, and grants output', () => {
    const source = stateWith({ available: '5e0', allocated: '7e0' })
    const quote = quoteInfinityShopPurchaseV2(source, 11, 'secret')
    const result = commitInfinityShopPurchaseV2(quote, source, 11)
    expect(result.accepted).toBe(true)
    expect(result.revision).toBe(12)
    expect(gameDecimalToCanonicalString(result.state.infinity.availablePoints)).toBe('4e0')
    expect(gameDecimalToCanonicalString(result.state.infinity.allocatedPoints)).toBe('8e0')
    expect(result.state.infinity.secretsOfTheUniverse).toBe(1n)
    expect(source.infinity.secretsOfTheUniverse).toBe(0n)
  })

  test('allows an exact grant when both Decimal ledger legs are unrepresented', () => {
    const source = stateWith({ available: '1e1000', allocated: '1e1000' })
    const quote = quoteInfinityShopPurchaseV2(source, 3, 'secret')
    expect(gameDecimalToCanonicalString(quote.debitedAmount)).toBe('0')
    expect(gameDecimalToCanonicalString(quote.allocatedAmount)).toBe('0')
    const result = commitInfinityShopPurchaseV2(quote, source, 3)
    expect(result.accepted).toBe(true)
    expect(result.changed).toBe(true)
    expect(result.state.infinity.secretsOfTheUniverse).toBe(1n)
  })

  test('keeps the quoted allocation independent when only the debit is unrepresented', () => {
    const source = stateWith({ available: '1e1000', allocated: '0' })
    const quote = quoteInfinityShopPurchaseV2(source, 3, 'secret')
    expect(gameDecimalToCanonicalString(quote.debitedAmount)).toBe('0')
    expect(gameDecimalToCanonicalString(quote.allocatedAmount)).toBe('1e0')
    const result = commitInfinityShopPurchaseV2(quote, source, 3)
    expect(gameDecimalToCanonicalString(result.state.infinity.allocatedPoints)).toBe('1e0')
  })

  test('preserves retained-facility prerequisites and the authored ten-unit grant', () => {
    const source = stateWith()
    const blocked = quoteInfinityShopPurchaseV2(source, 0, 'retain-ai-managers')
    expect(blocked.status).toBe('prerequisite-not-met')
    const assembly = commitInfinityShopPurchaseV2(
      quoteInfinityShopPurchaseV2(source, 0, 'retain-assembly-lines'),
      source,
      0,
    )
    expect(assembly.accepted).toBe(true)
    expect(assembly.state.infinity.retainedFacilities.assembly_lines).toBe(true)
    expect(gameDecimalToCanonicalString(
      assembly.state.dyson.facilities.assembly_lines[1],
    )).toBe('1e1')
    const managers = commitInfinityShopPurchaseV2(
      quoteInfinityShopPurchaseV2(assembly.state, 1, 'retain-ai-managers'),
      assembly.state,
      1,
    )
    expect(managers.accepted).toBe(true)
  })

  test('purchases both automation unlocks and all five retained links sequentially', () => {
    let state = stateWith({ available: '2e1' })
    let revision = 0
    for (const item of ['unlock-research-automation', 'unlock-bot-automation'] as const) {
      const result = commitInfinityShopPurchaseV2(
        quoteInfinityShopPurchaseV2(state, revision, item),
        state,
        revision,
      )
      expect(result.accepted).toBe(true)
      state = result.state as CanonicalGameStateV2
      revision = result.revision
    }
    expect(state.infinity.automationUnlocked).toEqual({ research: true, bots: true })
    for (const item of [
      'retain-assembly-lines',
      'retain-ai-managers',
      'retain-servers',
      'retain-data-centers',
      'retain-planets',
    ] as const) {
      const result = commitInfinityShopPurchaseV2(
        quoteInfinityShopPurchaseV2(state, revision, item),
        state,
        revision,
      )
      expect(result.accepted).toBe(true)
      state = result.state as CanonicalGameStateV2
      revision = result.revision
    }
    expect(Object.values(state.infinity.retainedFacilities)).toEqual([
      true, true, true, true, true,
    ])
    for (const facility of [
      'assembly_lines', 'ai_managers', 'servers', 'data_centers', 'planets',
    ] as const) {
      expect(gameDecimalToCanonicalString(state.dyson.facilities[facility][1])).toBe('1e1')
    }
  })

  test('reports authored eligibility before affordability and accepts exact cost', () => {
    const capped = stateWith({ available: '0', secrets: 27n })
    expect(quoteInfinityShopPurchaseV2(capped, 0, 'secret').status).toBe('maximum-reached')
    const skillCapped = stateWith({ available: '0', permanentSkillPoints: 10n })
    expect(quoteInfinityShopPurchaseV2(skillCapped, 0, 'permanent-skill-point').status)
      .toBe('maximum-reached')
    const owned = cloneCanonicalGameStateV2({
      ...stateWith({ available: '0' }),
      infinity: {
        ...stateWith({ available: '0' }).infinity,
        automationUnlocked: { research: true, bots: false },
      },
    })
    expect(quoteInfinityShopPurchaseV2(owned, 0, 'unlock-research-automation').status)
      .toBe('already-purchased')
    expect(quoteInfinityShopPurchaseV2(stateWith({ available: '0' }), 0, 'retain-ai-managers').status)
      .toBe('prerequisite-not-met')
    expect(quoteInfinityShopPurchaseV2(stateWith({ available: '0' }), 0, 'secret').status)
      .toBe('insufficient-infinity-points')
    const exact = stateWith({ available: '1e0' })
    const result = commitInfinityShopPurchaseV2(
      quoteInfinityShopPurchaseV2(exact, 0, 'secret'),
      exact,
      0,
    )
    expect(result.accepted).toBe(true)
    expect(gameDecimalToCanonicalString(result.state.infinity.availablePoints)).toBe('0')
  })

  test('publishes one closed authored tuning authority', () => {
    expect(Object.isFrozen(INFINITY_SHOP_TUNING_V2)).toBe(true)
    expect(INFINITY_SHOP_TUNING_V2.maximumSecrets).toBe(27n)
    expect(INFINITY_SHOP_TUNING_V2.maximumPermanentSkillPoints).toBe(10n)
    expect(gameDecimalToCanonicalString(INFINITY_SHOP_TUNING_V2.retainedFacilityQuantity))
      .toBe('1e1')
  })

  test('grants a permanent Skill Point and runs the shared auto-assignment owner', () => {
    const source = stateWith({
      available: '2e0',
      skillPoints: 0n,
      autoAssignment: ['startHereTree'],
    })
    const result = commitInfinityShopPurchaseV2(
      quoteInfinityShopPurchaseV2(source, 4, 'permanent-skill-point'),
      source,
      4,
    )
    expect(result.accepted).toBe(true)
    expect(result.state.infinity.permanentSkillPoints).toBe(1n)
    expect(result.state.skills.byId.startHereTree?.owned).toBe(true)
    expect(result.autoAssignedSkillIds).toEqual(['startHereTree'])
  })

  test('rejects forged, stale, exhausted, and hostile commit inputs without quote reads', () => {
    const source = stateWith()
    const quote = quoteInfinityShopPurchaseV2(source, 6, 'secret')
    expect(commitInfinityShopPurchaseV2(Object.freeze({ ...quote }), source, 6).status)
      .toBe('quote-rejected')
    expect(commitInfinityShopPurchaseV2(quote, source, 7).status).toBe('stale-revision')
    const maxQuote = quoteInfinityShopPurchaseV2(source, Number.MAX_SAFE_INTEGER, 'secret')
    expect(commitInfinityShopPurchaseV2(maxQuote, source, Number.MAX_SAFE_INTEGER).status)
      .toBe('revision-exhausted')

    let calls = 0
    const hostile = Object.freeze(Object.defineProperty({}, 'sourceRevision', {
      enumerable: true,
      get() {
        calls += 1
        return 6
      },
    }))
    expect(commitInfinityShopPurchaseV2(hostile, source, 6).status).toBe('quote-rejected')
    expect(calls).toBe(0)
  })

  test('binds the quote to exact same-revision rank, facility, and Skill state', () => {
    const source = stateWith()
    const quote = quoteInfinityShopPurchaseV2(source, 8, 'secret')
    const changedRank = cloneCanonicalGameStateV2({
      ...source,
      infinity: { ...source.infinity, secretsOfTheUniverse: 5n },
    })
    const changedFacility = cloneCanonicalGameStateV2({
      ...source,
      dyson: {
        ...source.dyson,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: Object.freeze([
            source.dyson.facilities.assembly_lines[0],
            gameDecimalFromCanonicalString('1e0'),
          ]),
        },
      },
    })
    const changedSkills = cloneCanonicalGameStateV2({
      ...source,
      skills: { ...source.skills, points: source.skills.points + 1n },
    })
    for (const changed of [changedRank, changedFacility, changedSkills]) {
      expect(commitInfinityShopPurchaseV2(quote, changed, 8).status).toBe('state-mismatch')
    }
  })

  test('accepts an unchanged mutable ingress but detects same-object mutation after quoting', () => {
    const source = stateWith()
    const unchanged = { ...source } as CanonicalGameStateV2
    const unchangedQuote = quoteInfinityShopPurchaseV2(unchanged, 9, 'secret')
    expect(commitInfinityShopPurchaseV2(unchangedQuote, unchanged, 9).accepted).toBe(true)

    const changed = { ...source } as CanonicalGameStateV2
    const changedQuote = quoteInfinityShopPurchaseV2(changed, 10, 'secret')
    Object.assign(changed, {
      infinity: { ...changed.infinity, secretsOfTheUniverse: 5n },
    })
    expect(commitInfinityShopPurchaseV2(changedQuote, changed, 10).status)
      .toBe('state-mismatch')
  })
})
