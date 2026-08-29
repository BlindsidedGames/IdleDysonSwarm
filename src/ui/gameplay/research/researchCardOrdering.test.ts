import { describe, expect, test } from 'vitest'
import { orderResearchCardsForPresentation } from './researchCardOrdering'

describe('Research card presentation order', () => {
  test('pins Cash Boost first, Science Boost second and Durability last', () => {
    const cards = [
      card('research.assembly_line_upgrade'),
      card('research.panel_lifetime_20', 'panel-lifetime-seconds'),
      card('research.science_boost'),
      card('research.server_upgrade'),
      card('research.money_multiplier'),
    ]

    expect(orderResearchCardsForPresentation(cards).map(
      ({ researchId }) => researchId,
    )).toEqual([
      'research.money_multiplier',
      'research.science_boost',
      'research.assembly_line_upgrade',
      'research.server_upgrade',
      'research.panel_lifetime_20',
    ])
  })

  test('preserves canonical order within the middle group', () => {
    const cards = [
      card('research.server_upgrade'),
      card('research.assembly_line_upgrade'),
      card('research.data_center_upgrade'),
    ]

    expect(orderResearchCardsForPresentation(cards)).toEqual(cards)
  })
})

function card(
  researchId: string,
  effectKind: 'percentage' | 'panel-lifetime-seconds' = 'percentage',
) {
  return { effectKind, researchId }
}
