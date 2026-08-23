export interface BottomNavigationLayout {
  readonly maxItems: number
  readonly iconSize: number
  readonly slotWidth: number
  readonly barHeight: number
}

export function deriveBottomNavigationLayout(
  availableWidth: number,
  selectedItemCount: number,
  includeText: boolean,
): BottomNavigationLayout {
  const width = Number.isFinite(availableWidth)
    ? Math.max(0, availableWidth)
    : 0
  const selected = Number.isFinite(selectedItemCount)
    ? Math.max(0, Math.floor(selectedItemCount))
    : 0
  const totalTouchSlots = Math.max(1, Math.floor(width / 44))
  const maxItems = Math.max(0, totalTouchSlots - 1)
  const displayedItems = Math.min(selected, maxItems)
  const slotWidth = Math.min(76, width / (displayedItems + 1))
  const iconSize = Math.min(36, Math.max(20, slotWidth - 16))
  const barHeight = includeText
    ? Math.min(76, Math.max(64, iconSize + 40))
    : Math.min(76, Math.max(56, iconSize + 20))
  return { maxItems, iconSize, slotWidth, barHeight }
}
