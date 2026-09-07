// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { SkillDetailsDialog } from './SkillDetailsDialog'

afterEach(cleanup)

test('keeps the background inert until an outside tap completes and consumes its click', () => {
  const backgroundClick = vi.fn()
  function Harness() {
    const [open, setOpen] = useState(true)
    return <div onClick={backgroundClick}>
      <button>Background control</button>
      {open && <SkillDetailsDialog title="Test skill" closeLabel="Close" palette="normal" onClose={() => setOpen(false)}>
        <p>Skill details</p>
      </SkillDetailsDialog>}
    </div>
  }
  const { container } = render(<Harness />)
  const backdrop = screen.getByRole('dialog').parentElement!
  fireEvent.pointerDown(backdrop, { pointerType: 'touch' })
  fireEvent.pointerUp(backdrop, { pointerType: 'touch' })
  expect(screen.queryByRole('dialog')).not.toBeNull()
  expect(container.hasAttribute('inert')).toBe(true)
  fireEvent.click(backdrop)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(container.hasAttribute('inert')).toBe(false)
  expect(backgroundClick).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Background control' }))
  expect(backgroundClick).toHaveBeenCalledOnce()
})

test('a click inside the dialog does not dismiss it', () => {
  const onClose = vi.fn()
  render(<SkillDetailsDialog title="Test skill" closeLabel="Close" palette="normal" onClose={onClose}>
    <button>Inside control</button>
  </SkillDetailsDialog>)
  fireEvent.click(screen.getByRole('button', { name: 'Inside control' }))
  expect(onClose).not.toHaveBeenCalled()
})
