// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DYSON_FACILITY_IDS } from '../../../simulation/dysonFacilityCatalog'
import { FacilityRegion, type FacilityRegionProps } from './FacilityRegion'

afterEach(() => cleanup())

const outputById = {
  assembly_lines: 'bots',
  ai_managers: 'assembly_lines',
  servers: 'ai_managers',
  data_centers: 'servers',
  planets: 'data_centers',
  matrioshka_brains: 'planets',
  birch_planets: 'matrioshka_brains',
  galactic_brains: 'birch_planets',
} as const

function props(
  dispatchPlayer: FacilityRegionProps['dispatchPlayer'],
): FacilityRegionProps {
  const facts = Object.fromEntries(
    DYSON_FACILITY_IDS.map((facilityId) => [facilityId, {
      facilityId,
      ownership: { automatic: 1, manual: 1, total: 2 },
      production: {
        outputFacilityId: outputById[facilityId],
        perSecond: 1,
        secondsPerUnit: 1,
      },
      productionProgress: { visible: true, normalized: 0.5 },
      details: {
        baseProductionPerSecond: 1,
        effectiveProducerCount: 2,
        modifier: 1,
        contributions: [],
        modifierContributions: [],
        generationContributions: [],
        upstreamSources: [],
      },
    }]),
  ) as unknown as FacilityRegionProps['facts']
  const enabled = Object.fromEntries(
    DYSON_FACILITY_IDS.map((facilityId) => [facilityId, false]),
  )

  return {
    locale: 'en',
    visibility: {
      showTinker: false,
      visibleFacilityIds: DYSON_FACILITY_IDS,
      showNextFacilityTeaser: false,
    },
    facts,
    purchasePreviews: DYSON_FACILITY_IDS.map((facilityId) => ({
      facilityId,
      eligible: true,
      selectedQuantity: 1n,
      affordableQuantity: 1n,
      cost: 10,
      status: 'success',
    })),
    purchaseRouteAvailable: true,
    automationEnabledFacilities: enabled,
    automationUnlocked: true,
    revision: { session: 1, state: 1 },
    dispatchPlayer,
  }
}

describe('FacilityRegion unified presentation contract', () => {
  test('renders one ordered facility flow with two data-driven headings', () => {
    renderRegion(vi.fn())

    expect(screen.getByRole('heading', { name: 'Facilities' })).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Mega-Structures' }),
    ).not.toBeNull()
    expect(screen.getAllByRole('article')).toHaveLength(8)
  })

  test('dispatches the same command shape for basics and megastructures', () => {
    const dispatchPlayer = vi.fn().mockResolvedValue({
      status: 'accepted',
      kind: 'transition',
      changed: true,
      stateRevision: 2,
      activationRevision: { session: 1, state: 1 },
    })
    renderRegion(dispatchPlayer)
    const articles = screen.getAllByRole('article')

    fireEvent.click(within(articles[0]!).getAllByRole('button')[0]!)
    fireEvent.click(within(articles[7]!).getAllByRole('button')[0]!)

    expect(dispatchPlayer).toHaveBeenNthCalledWith(1, {
      kind: 'dyson.purchase-facility',
      facilityId: 'assembly_lines',
    })
    expect(dispatchPlayer).toHaveBeenNthCalledWith(2, {
      kind: 'dyson.purchase-facility',
      facilityId: 'galactic_brains',
    })
  })

  test('starts the modifier formula from total base output without a rate suffix', () => {
    const regionProps = props(vi.fn())
    const assemblyLines = regionProps.facts.assembly_lines
    const facts = {
      ...regionProps.facts,
      assembly_lines: {
        ...assemblyLines,
        ownership: {
          automatic: 10_000_000,
          manual: 0,
          total: 10_000_000,
        },
        production: {
          ...assemblyLines.production,
          perSecond: 2_000_000,
        },
        details: {
          ...assemblyLines.details,
          baseProductionPerSecond: 0.1,
          effectiveProducerCount: 10_000_000,
          modifier: 2,
          contributions: [
            {
              sourceId: 'base',
              displayRole: 'base',
              operation: 'override',
              value: 0.1,
              delta: 0.1,
              runningTotal: 0.1,
            },
            {
              sourceId: 'assembly_lines.count',
              displayRole: 'producer-count',
              operation: 'multiply',
              value: 10_000_000,
              delta: 999_999.9,
              runningTotal: 1_000_000,
              automaticManualTuple: [10_000_000, 0],
            },
            {
              sourceId: 'assembly_lines.modifier',
              displayRole: 'modifier',
              operation: 'multiply',
              value: 2,
              delta: 1_000_000,
              runningTotal: 2_000_000,
              source: { kind: 'system', id: 'test.production-modifier' },
            },
          ],
          modifierContributions: [],
        },
      },
    } as FacilityRegionProps['facts']

    renderRegionProps({ ...regionProps, facts })
    fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]!)

    const stageResults = document.querySelectorAll(
      '.facility-details-stage__result',
    )
    const modifierResult = stageResults[1]?.textContent ?? ''
    expect(modifierResult).toBe('Base (1.00M) × 2.00 = 2.00M')
    expect(modifierResult).not.toContain('/ game second')
    expect(modifierResult).not.toContain('0.10 × 10.0M')
  })
})

function renderRegion(
  dispatchPlayer: FacilityRegionProps['dispatchPlayer'],
) {
  renderRegionProps(props(dispatchPlayer))
}

function renderRegionProps(regionProps: FacilityRegionProps) {
  render(
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <FacilityRegion {...regionProps} />
    </IntlProvider>,
  )
}
