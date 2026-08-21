// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from 'vitest'
import { installTextSelectionPolicy } from './textSelectionPolicy'

let uninstall: (() => void) | undefined

afterEach(() => {
  uninstall?.()
  uninstall = undefined
  document.body.replaceChildren()
})

describe('text selection policy', () => {
  test.each(['selectstart', 'contextmenu', 'dragstart', 'dblclick'])(
    'prevents %s outside an editable text control',
    (eventName) => {
      uninstall = installTextSelectionPolicy()
      const surface = document.createElement('div')
      document.body.append(surface)

      expect(surface.dispatchEvent(cancelable(eventName))).toBe(false)
    },
  )

  test.each([
    '<input type="search">',
    '<input type="text">',
    '<textarea></textarea>',
    '<div contenteditable="true"></div>',
    '<pre data-allow-text-selection="true"></pre>',
  ])('allows native text actions inside %s', (markup) => {
    uninstall = installTextSelectionPolicy()
    document.body.innerHTML = markup
    const editor = document.body.firstElementChild

    expect(editor?.dispatchEvent(cancelable('selectstart'))).toBe(true)
    expect(editor?.dispatchEvent(cancelable('contextmenu'))).toBe(true)
  })

  test('does not treat sliders, buttons, or ordinary code as editable text', () => {
    uninstall = installTextSelectionPolicy()
    document.body.innerHTML = [
      '<input type="range">',
      '<button>Buy</button>',
      '<code>game text</code>',
    ].join('')

    for (const element of document.body.children) {
      expect(element.dispatchEvent(cancelable('selectstart'))).toBe(false)
    }
  })

  test('does not clear Safari-style document selection while a text editor is active', () => {
    uninstall = installTextSelectionPolicy()
    document.body.innerHTML = '<input type="text"><p>Page selection</p>'
    const editor = document.querySelector('input')
    const pageText = document.querySelector('p')
    const selection = document.getSelection()
    if (editor === null || pageText === null || selection === null) {
      throw new Error('Expected text selection test fixtures.')
    }
    editor.focus()
    selection.selectAllChildren(pageText)
    const removeAllRanges = vi.spyOn(selection, 'removeAllRanges')

    document.dispatchEvent(new Event('selectionchange'))

    expect(document.activeElement).toBe(editor)
    expect(removeAllRanges).not.toHaveBeenCalled()
  })

  test('cancels a nearby second touch before iOS can begin native selection', () => {
    uninstall = installTextSelectionPolicy()
    const surface = document.createElement('div')
    document.body.append(surface)

    expect(surface.dispatchEvent(touchEvent('touchstart', 100, 20, 30))).toBe(true)
    expect(surface.dispatchEvent(touchEvent('touchstart', 300, 22, 31))).toBe(false)
  })

  test('does not cancel distant touches, ordinary scrolling, or editor touches', () => {
    uninstall = installTextSelectionPolicy()
    document.body.innerHTML = '<div></div><input type="search">'
    const surface = document.body.children[0]
    const editor = document.body.children[1]

    expect(surface.dispatchEvent(touchEvent('touchstart', 100, 10, 10))).toBe(true)
    expect(surface.dispatchEvent(touchEvent('touchstart', 200, 100, 100))).toBe(true)
    expect(editor.dispatchEvent(touchEvent('touchstart', 250, 100, 100))).toBe(true)
  })

  test('replays a suppressed rapid tap on a real control', () => {
    uninstall = installTextSelectionPolicy()
    const button = document.createElement('button')
    const onClick = vi.fn()
    button.addEventListener('click', onClick)
    document.body.append(button)

    button.dispatchEvent(touchEvent('touchstart', 100, 20, 30, 7))
    button.dispatchEvent(touchEvent('touchstart', 250, 20, 30, 8))
    button.dispatchEvent(touchEvent('touchend', 700, 20, 30, 8))

    expect(onClick).toHaveBeenCalledOnce()
  })

  test('leaves controls with their own native touch controller alone', () => {
    uninstall = installTextSelectionPolicy()
    const button = document.createElement('button')
    button.dataset.managesNativeTouch = 'true'
    document.body.append(button)

    expect(button.dispatchEvent(touchEvent('touchstart', 100, 20, 30))).toBe(true)
    expect(button.dispatchEvent(touchEvent('touchstart', 250, 20, 30))).toBe(true)
  })

  test('never suppresses a rapid second native range drag', () => {
    uninstall = installTextSelectionPolicy()
    const slider = document.createElement('input')
    slider.type = 'range'
    document.body.append(slider)

    const events = [
      touchEvent('touchstart', 100, 20, 30, 7),
      touchEvent('touchend', 150, 20, 30, 7),
      touchEvent('touchstart', 300, 21, 30, 8),
      touchEvent('touchmove', 340, 80, 30, 8),
      touchEvent('touchend', 380, 80, 30, 8),
    ]

    for (const event of events) {
      expect(slider.dispatchEvent(event)).toBe(true)
      expect(event.defaultPrevented).toBe(false)
    }
  })
})

function cancelable(type: string): Event {
  return new Event(type, { bubbles: true, cancelable: true })
}

function touchEvent(
  type: string,
  timeStamp: number,
  clientX: number,
  clientY: number,
  identifier = 1,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const touch = { identifier, clientX, clientY }
  Object.defineProperties(event, {
    timeStamp: { value: timeStamp },
    touches: { value: type === 'touchend' ? [] : [touch] },
    changedTouches: { value: [touch] },
  })
  return event
}
