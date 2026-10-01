// @vitest-environment jsdom

import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import { prepareIdb1Save } from '../../../save/prepare'
import { deriveBasicDysonState } from '../../../simulation/canonicalDysonDerivation'
import { FacilityDetailsContent } from './FacilityPresentation'

const baseline = hydrateGameState(prepareIdb1Save(fixture).prepared).state

afterEach(cleanup)

function facilityFact(count: number, assigned: readonly string[] = [], fragments = 0) {
  const result = deriveBasicDysonState({
    ...baseline,
    dyson: { ...baseline.dyson, facilities: { ...baseline.dyson.facilities, assembly_lines: [0, count] } },
    skills: {
      ...baseline.skills,
      fragments: BigInt(fragments),
      byId: Object.fromEntries(Object.entries(baseline.skills.byId).map(([id, value]) => [id, { ...value, owned: assigned.includes(id) }])),
    },
  }, {
    panelsPerSecMulti: 1, scienceBoostPercent: 0, moneyMultiUpgradePercent: 0,
    assemblyLineUpgradePercent: 0, aiManagerUpgradePercent: 0, serverUpgradePercent: 0,
    dataCenterUpgradePercent: 0, planetUpgradePercent: 0, matrioshkaUpgradePercent: 0,
    birchUpgradePercent: 0, galacticUpgradePercent: 0,
  }, { permanentDoubleIp: false }, {
    panelsPerSecond: 1, panelLifetimeSeconds: 10, scienceMultiplier: 1,
    rudimentarySingularityProduction: 0, pocketDimensionsProduction: 0,
    scientificPlanetsProduction: 0, managerAssemblyLineProduction: 0,
  })
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value.facilityFacts.assembly_lines
}

function showDetails(count: number, assigned: readonly string[] = [], fragments = 0) {
  const fact = facilityFact(count, assigned, fragments)
  render(<IntlProvider locale="en" messages={{ 'skills.node.productionScaling.name': 'Production Scaling' }}>
    <FacilityDetailsContent locale="en" facilityId="assembly_lines" fact={fact} gameSpeed={1} />
  </IntlProvider>)
  return fact
}

describe('purchased-building scaling attribution in facility details', () => {
  test.each([
    [[], 1], [['superSwarm'], 2], [['megaSwarm'], 3], [['ultimateSwarm'], 5],
  ] as const)('shows the base bonus without an unassigned skill for %j', (skills, rate) => {
    const fact = showDetails(110, skills)
    const row = screen.getByText('Purchased Building Scaling').closest('.facility-effect-row')!
    expect(row.textContent).toContain(`+${rate}% production per purchased building beyond 100.`)
    expect(screen.queryByText('Production Scaling')).toBeNull()
    expect(fact.details.contributions?.find((entry) => entry.sourceId.startsWith('manual-purchase.scaling-'))?.source).toEqual({ kind: 'system', id: 'purchased-building-scaling' })
    const labels = Array.from(row.parentElement!.querySelectorAll('strong')).map((entry) => entry.textContent)
    expect(labels.indexOf('Purchased Building Scaling')).toBeGreaterThan(labels.indexOf('100 purchased milestone'))
  })

  test.each([
    [1, [], 90, 1], [3, ['superSwarm'], 80, 2], [3, ['megaSwarm'], 80, 3], [3, ['ultimateSwarm'], 80, 5],
  ] as const)('shows assigned skill with %i fragments and %j', (fragments, swarm, threshold, rate) => {
    const fact = showDetails(110, ['productionScaling', ...swarm], fragments)
    const row = screen.getByText('Production Scaling').closest('.facility-effect-row')!
    expect(row.textContent).toContain(`+${rate}% production per purchased building beyond ${threshold}.`)
    expect(row.querySelector('img')?.getAttribute('src')).toContain('productionScaling')
    expect(screen.queryByText('Purchased Building Scaling')).toBeNull()
    expect(fact.details.contributions?.find((entry) => entry.sourceId.startsWith('manual-purchase.scaling-'))?.source).toEqual({ kind: 'skill', id: 'productionScaling' })
  })

  test.each([
    [100, [], 0], [90, ['productionScaling'], 1], [80, ['productionScaling'], 3],
    [110, ['productionScaling', 'ultimateSwarm', 'supernova'], 3],
  ] as const)('hides non-contributing scaling at %i with %j', (count, skills, fragments) => {
    const fact = showDetails(count, skills, fragments)
    expect(screen.queryByText('Production Scaling')).toBeNull()
    expect(screen.queryByText('Purchased Building Scaling')).toBeNull()
    expect(fact.details.contributions?.some((entry) => entry.sourceId.startsWith('manual-purchase.scaling-'))).toBe(false)
  })
})

test.each([
  ['en', 1 / 7200, '0.000139'],
  ['fr', 1 / 7200, '0,000139'],
  ['en', 1e-10, '1E-10'],
] as const)('slow output remains nonzero and readable in %s (%s/s)', (locale, rate, displayed) => {
  const fact = facilityFact(1)
  render(<IntlProvider locale={locale}>
    <FacilityDetailsContent locale={locale} facilityId="assembly_lines"
      fact={{ ...fact, production: { ...fact.production, perSecond: rate } }} gameSpeed={1} />
  </IntlProvider>)
  expect(screen.getByText(`${displayed} / second`)).toBeTruthy()
  expect(screen.queryByText('0.00 / second')).toBeNull()
})

test.each([false, true])('Economy of Scale facility details match the active phase (Discovery: %s)', discovery => {
  const id = 'subskill.swarm.economyOfScale'
  const result = deriveBasicDysonState({
    ...baseline,
    discovery: { unlocked: discovery, completions: 0n, progress: 0, startingPower: 0n, speedUpgrades: 0n },
    challenges: { ...baseline.challenges!, galvanizedSkillIds: ['megaSwarm'] },
    skills: { ...baseline.skills, byId: {
      ...Object.fromEntries(Object.entries(baseline.skills.byId).map(([key, value]) => [key, { ...value, owned: key === 'megaSwarm' }])),
      [id]: { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 },
    } },
  }, hydrateGameState(prepareIdb1Save(fixture).prepared).compatibilityTuning,
  { permanentDoubleIp: false }, hydrateGameState(prepareIdb1Save(fixture).prepared).skillEffectEvaluationSnapshot)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  render(<IntlProvider locale="en"><FacilityDetailsContent locale="en" facilityId="assembly_lines" fact={result.value.facilityFacts.assembly_lines} gameSpeed={1} /></IntlProvider>)
  const row = screen.getByText('Economy of Scale').closest('.facility-effect-row')!
  expect(row.textContent).toContain(discovery ? 'Discovery speed' : 'Science')
  if (discovery) expect(row.textContent).not.toContain('Science')
})
