import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_DYSON_SNAPSHOT,
  DETERMINISTIC_DYSON_TUNING,
} from '../../scripts/support/deterministicMatureDysonFixture'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { PreparedSave, prepareIdb1Save } from '../save/prepare'
import {
  deserializeWebSave,
  serializeWebSave,
} from '../save/serialization'
import { withCanonicalBotAllocation } from './canonicalBotAllocation'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import {
  resolveStellarSacrificePlanetsPerSecond,
  resolveStellarSacrificesRequiredBots,
} from './stellarArithmetic'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const STELLAR_OVERFLOW_SKILLS = Object.freeze([
  'burnOut',
  'stellarSacrifices',
  'stellarDominance',
])

function overflowState(ownedSkillIds = STELLAR_OVERFLOW_SKILLS) {
  const state = createDeterministicMatureDysonFixture({
    ownedSkillIds,
  })
  return withCanonicalBotAllocation({
    ...state,
    dyson: {
      ...state.dyson,
      bots: Number.MAX_VALUE,
    },
  })
}

function deriveOverflow(
  state: ReturnType<typeof overflowState>,
  snapshot = DETERMINISTIC_DYSON_SNAPSHOT,
) {
  return deriveBasicDysonState(
    state,
    DETERMINISTIC_DYSON_TUNING,
    { permanentDoubleIp: false },
    snapshot,
  )
}

function expectEveryNumberFinite(value: unknown, path = 'derived'): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), path).toBe(true)
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [key, nested] of Object.entries(value)) {
    expectEveryNumberFinite(nested, `${path}.${key}`)
  }
}

describe('Stellar overflow recovery', () => {
  test('keeps the assignment snapshot and every following recalculation finite', () => {
    const state = overflowState()
    const assignmentPass = deriveOverflow(state)

    expect(assignmentPass.ok).toBe(true)
    if (!assignmentPass.ok) return
    const assignedSnapshot = assignmentPass.value.nextEvaluationSnapshot
    expect(Object.values(assignedSnapshot).every(Number.isFinite)).toBe(true)
    expect(
      assignedSnapshot.panelsPerSecond *
      assignedSnapshot.panelLifetimeSeconds,
    ).toBe(Number.POSITIVE_INFINITY)

    const recalculation = deriveOverflow(state, assignedSnapshot)
    expect(recalculation.ok).toBe(true)
    if (!recalculation.ok) return
    expectEveryNumberFinite(recalculation.value)
    expect(
      Object.values(recalculation.value.rates).every(Number.isFinite),
    ).toBe(true)
    expect(
      recalculation.value.auxiliary.stellarSacrifice.planetsPerSecond,
    ).toBeGreaterThan(0)
    expect(
      recalculation.value.auxiliary.stellarSacrifice.botsPerSecond,
    ).toBeGreaterThan(0)
    expect(
      Object.values(
        recalculation.value.nextEvaluationSnapshot,
      ).every(Number.isFinite),
    ).toBe(true)

    const following = deriveOverflow(
      state,
      recalculation.value.nextEvaluationSnapshot,
    )
    expect(following.ok).toBe(true)
  })

  test('keeps stellar-linked facility calculations finite', () => {
    const state = overflowState([
      ...STELLAR_OVERFLOW_SKILLS,
      'dysonSubsidies',
      'galacticPradigmShift',
    ])
    const assignmentPass = deriveOverflow(state)
    expect(assignmentPass.ok).toBe(true)
    if (!assignmentPass.ok) return

    const recalculation = deriveOverflow(
      state,
      assignmentPass.value.nextEvaluationSnapshot,
    )
    expect(recalculation.ok).toBe(true)
    if (!recalculation.ok) return
    expectEveryNumberFinite(recalculation.value)
  })

  test('reopens an affected canonical save without migration or repair', () => {
    const source = prepareIdb1Save(fixtureText).prepared
    const session = new CanonicalRuntimeSession(source, {
      entitlements: { permanentDoubleIp: false },
    })
    const state = overflowState()
    const assignmentPass = deriveOverflow(state)
    expect(assignmentPass.ok).toBe(true)
    if (!assignmentPass.ok) return

    const affected = session.prepare({
      ...session.initialState,
      gameState: state,
      compatibilityTuning: DETERMINISTIC_DYSON_TUNING,
      evaluationSnapshot:
        assignmentPass.value.nextEvaluationSnapshot,
    })
    const encoded = serializeWebSave(affected.copyValidatedState())
    const reopenedPrepared = PreparedSave.fromDecoded(
      deserializeWebSave(encoded),
    )
    const reopened = new CanonicalRuntimeSession(reopenedPrepared, {
      entitlements: { permanentDoubleIp: false },
    })

    expect(reopenedPrepared.numericRepair.repairCount).toBe(0)
    expect(
      Object.values(
        reopened.initialState.evaluationSnapshot,
      ).every(Number.isFinite),
    ).toBe(true)
    const recovered = deriveBasicDysonState(
      reopened.initialState.gameState,
      reopened.initialState.compatibilityTuning,
      reopened.initialState.entitlements,
      reopened.initialState.evaluationSnapshot,
    )
    expect(recovered.ok).toBe(true)
    if (!recovered.ok) return
    expectEveryNumberFinite(recovered.value)
  })

  test.each([
    ['base', ['stellarSacrifices']],
    ['dominance', ['stellarSacrifices', 'stellarDominance']],
    ['improvements', ['stellarSacrifices', 'stellarImprovements']],
    [
      'dominance and improvements',
      ['stellarSacrifices', 'stellarDominance', 'stellarImprovements'],
    ],
    ['obliteration', ['stellarSacrifices', 'stellarObliteration']],
    ['supernova', ['stellarSacrifices', 'supernova']],
  ] as const)(
    'preserves ordinary-range %s results exactly',
    (_label, skillIds) => {
      const ownedSkills = new Set<string>(skillIds)
      const panelsPerSecond = 4.2e8
      const panelLifetimeSeconds = 4_200

      expect(resolveStellarSacrificesRequiredBots(
        ownedSkills,
        panelsPerSecond,
        panelLifetimeSeconds,
      )).toBe(legacyRequiredBots(
        ownedSkills,
        panelsPerSecond,
        panelLifetimeSeconds,
      ))
      expect(resolveStellarSacrificePlanetsPerSecond(
        ownedSkills,
        panelsPerSecond,
        panelLifetimeSeconds,
      )).toBe(legacyPlanetsPerSecond(
        ownedSkills,
        panelsPerSecond,
        panelLifetimeSeconds,
      ))
    },
  )
})

function legacyRequiredBots(
  ownedSkills: ReadonlySet<string>,
  panelsPerSecond: number,
  panelLifetimeSeconds: number,
): number {
  const stars = panelsPerSecond * panelLifetimeSeconds / 20_000
  let required = ownedSkills.has('supernova')
    ? stars * 1_000_000
    : ownedSkills.has('stellarObliteration')
      ? stars * 1_000
      : stars
  if (required < 1) required = 1
  if (ownedSkills.has('stellarDominance')) required *= 100
  if (ownedSkills.has('stellarImprovements')) required /= 1_000
  return required
}

function legacyPlanetsPerSecond(
  ownedSkills: ReadonlySet<string>,
  panelsPerSecond: number,
  panelLifetimeSeconds: number,
): number {
  if (!ownedSkills.has('stellarSacrifices')) return 0
  let galaxies = panelsPerSecond * panelLifetimeSeconds /
    20_000 /
    100_000_000_000
  if (ownedSkills.has('stellarObliteration')) galaxies *= 1_000
  if (ownedSkills.has('supernova')) galaxies *= 1_000
  return Math.pow(Math.max(0, Math.log10(galaxies)), 2)
}
