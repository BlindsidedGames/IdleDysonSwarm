import type { FrontendResearchCardPreview } from '../../../application/frontendSnapshot'

const DURABILITY_IDS = [
  'research.panel_lifetime_1',
  'research.panel_lifetime_2',
  'research.panel_lifetime_3',
  'research.panel_lifetime_4',
] as const

export interface PresentedResearchCard extends FrontendResearchCardPreview {
  readonly stackedDurability?: true
}

export function isDurabilityCard(card: FrontendResearchCardPreview): boolean {
  return DURABILITY_IDS.some((id) => id === card.researchId)
}

/** Keep the rendered card/focus stable while its canonical purchase ID advances. */
export function researchCardPresentationKey(card: PresentedResearchCard): string {
  return card.stackedDurability ? 'durability' : card.researchId
}

/** Combine display contributions only; the next stage still owns the transaction. */
export function stackDurabilityCard(
  cards: readonly FrontendResearchCardPreview[],
): readonly PresentedResearchCard[] {
  const stages = DURABILITY_IDS.flatMap((id) => {
    const card = cards.find((candidate) => candidate.researchId === id)
    return card === undefined ? [] : [card]
  })
  // Incomplete definition coverage must not invent a completed upgrade.
  if (stages.length !== DURABILITY_IDS.length) return cards
  const next = stages.find((card) => !card.maxed) ?? stages[stages.length - 1]!
  const currentEffect = stages.reduce((sum, card) => sum + card.currentEffect, 0)
  return [
    ...cards.filter((card) => !isDurabilityCard(card)),
    {
      ...next,
      stackedDurability: true,
      currentEffect,
      projectedEffect: currentEffect + next.projectedEffect - next.currentEffect,
    },
  ]
}
