import { isFinitePositiveNumber } from '../../../core/finiteNonNegativeNumber'

export interface BottomNavigationLayout {
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
  // Reserve the drawer target. Extra selected tabs scroll instead of disappearing.
  const visibleSlots = Math.min(selected, Math.max(0, Math.floor(width / 44) - 1))
  const slotWidth = Math.max(44, Math.min(76, width / (visibleSlots + 1)))
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
  return { iconSize, labelSize, slotWidth, barHeight }
}
