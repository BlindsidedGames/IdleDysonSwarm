import type { FrontendResearchCardPreview } from '../../../application/frontendSnapshot'

type ResearchOrderCard = Pick<
  FrontendResearchCardPreview,
  'effectKind' | 'researchId'
>

export function orderResearchCardsForPresentation<
  Card extends ResearchOrderCard,
>(cards: readonly Card[]): readonly Card[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((left, right) =>
      researchCardRank(left.card) - researchCardRank(right.card) ||
      left.index - right.index,
    )
    .map(({ card }) => card)
}

function researchCardRank(card: ResearchOrderCard): number {
  if (card.researchId === 'research.money_multiplier') return 0
  if (card.researchId === 'research.science_boost') return 1
  if (card.effectKind === 'panel-lifetime-seconds') return 3
  return 2
}
