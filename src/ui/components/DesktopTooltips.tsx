import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../accessibility/useMediaQuery'
import { isDesktopPresentation } from '../desktopPresentation'
import './desktopTooltips.css'
import skillPointIcon from '../assets/nav-skills.png'
import augmentIcon from '../assets/currency-galvanizer.png'
import { InlineImageSymbol } from './InlineImageSymbol'
import './skillDialogPalette.css'

/** One delegated hover host keeps mobile skill nodes free of hover work. */
export function DesktopTooltips() {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const enabled = finePointer && isDesktopPresentation()
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const name = target?.dataset.skillTooltipName ?? ''
  const body = target?.dataset.skillTooltipBody ?? ''
  const formula = target?.dataset.skillTooltipFormula ?? ''
  useEffect(() => {
    if (!enabled) { setTarget(null); return }
    const candidate = (node: EventTarget | null) => node instanceof Element
      ? node.closest<HTMLElement>('.skill-tree-node[data-skill-tooltip-name]') : null
    const over = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') { setTarget(null); return }
      setPointer({ x: event.clientX, y: event.clientY })
      const next = candidate(event.target)
      setTarget(next?.closest('.skill-tree-viewport__canvas') && !next.closest('[inert]') && next.getAttribute('aria-hidden') !== 'true' ? next : null)
    }
    const out = (event: PointerEvent) => {
      const from = candidate(event.target)
      if (!from?.contains(event.relatedTarget as Node | null)) setTarget(null)
    }
    const clear = () => setTarget(null)
    document.addEventListener('pointerover', over)
    document.addEventListener('pointermove', over)
    document.addEventListener('pointerout', out)
    document.addEventListener('pointerdown', clear)
    document.addEventListener('keydown', clear)
    document.addEventListener('scroll', clear, true)
    window.addEventListener('resize', clear)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointermove', over)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('pointerdown', clear)
      document.removeEventListener('keydown', clear)
      document.removeEventListener('scroll', clear, true)
      window.removeEventListener('resize', clear)
    }
  }, [enabled])
  useLayoutEffect(() => {
    if (!target || !tooltip.current) return
    const box = tooltip.current.getBoundingClientRect()
    const gap = 12, inset = 8
    const rightHalf = pointer.x >= innerWidth / 2
    const bottomHalf = pointer.y >= innerHeight / 2
    setPosition({
      left: Math.max(inset, Math.min(innerWidth - box.width - inset,
        rightHalf ? pointer.x - box.width - gap : pointer.x + gap)),
      top: Math.max(inset, Math.min(innerHeight - box.height - inset,
        bottomHalf ? pointer.y - box.height - gap : pointer.y + gap)),
    })
  }, [target, name, body, formula, pointer])
  if (!enabled || !target?.isConnected || !name) return null
  return createPortal(<div ref={tooltip} role="tooltip" className="desktop-tooltip" data-palette={target.dataset.desktopTooltipPalette} style={{ ...position, maxInlineSize: `min(25rem, ${Math.max(0, (pointer.x >= innerWidth / 2 ? pointer.x : innerWidth - pointer.x) - 20)}px)` }}>
    <div className="desktop-tooltip__header">
      <strong>{name}</strong>
      <span className="desktop-tooltip__counts">
        {Number(target.dataset.skillTooltipAugments) > 0 && <span className="desktop-tooltip__augments" aria-label={target.dataset.skillTooltipAugmentLabel}>
          <InlineImageSymbol src={augmentIcon} tint maskMode="luminance" className="desktop-tooltip__augment-icon" />
          <span>{target.dataset.skillTooltipAugments}</span>
        </span>}
        <span className="desktop-tooltip__cost" aria-label={target.dataset.skillTooltipCostLabel}>
          <img src={skillPointIcon} alt="" /><span>{target.dataset.skillTooltipCost}</span>
        </span>
      </span>
    </div>
    <p className="desktop-tooltip__body">{body}</p>
    {formula && <p className="desktop-tooltip__formula">{formula}</p>}
  </div>, document.body)
}
