import { isFinitePositiveNumber } from '../../../core/finiteNonNegativeNumber'
import type { DysonNavigationPresentation } from './contracts'

export interface BottomNavigationLayout {
  readonly maxItems: number
  readonly iconSize: number
  readonly labelSize: number
  readonly slotWidth: number
  readonly barHeight: number
}

export function deriveBottomNavigationLayout(
  availableWidth: number,
  selectedItemCount: number,
  includeText: boolean,
  textScale = 1,
): BottomNavigationLayout {
  const width = Number.isFinite(availableWidth)
    ? Math.max(0, availableWidth)
    : 0
  const selected = Number.isFinite(selectedItemCount)
    ? Math.max(0, Math.floor(selectedItemCount))
    : 0
  const maxItems = selected
  const slotWidth = Math.min(76, width / (selected + 1))
  const iconSize = Math.min(36, Math.max(0, slotWidth - 16))
  const safeTextScale = isFinitePositiveNumber(textScale)
    ? textScale
    : 1
  const renderedLabelSize = Math.min(
    11.52,
    Math.max(0, (slotWidth - 4) / 5.5),
  )
  const labelSize = renderedLabelSize / safeTextScale
  const barHeight = includeText
    ? Math.min(
        76,
        Math.max(55, iconSize + renderedLabelSize + 24),
      )
    : Math.min(76, Math.max(55, iconSize + 18))
  return { maxItems, iconSize, labelSize, slotWidth, barHeight }
}

export function fitBottomItems(
  items: readonly DysonNavigationPresentation['items'][number][],
  maxItems: number,
) {
  if (items.length <= maxItems) return items
  if (maxItems <= 0) return []
  const visible = items.slice(0, maxItems)
  const current = items.find((item) => item.current)
  if (current !== undefined && !visible.includes(current)) {
    visible[visible.length - 1] = current
  }
  return visible
}
