// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, test } from 'vitest'
import { renderStaticBootstrapFailure } from './bootstrapFailure'

afterEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
})

describe('pre-React bootstrap failure', () => {
  test('renders a focused static alert without copying an error or mutating gameplay', () => {
    const root = document.createElement('div')
    document.body.append(root)
    renderStaticBootstrapFailure(root)
    const heading = root.querySelector('h1')
    const alert = root.querySelector('[role="alert"]')
    expect(heading).toHaveFocus()
    expect(alert).toHaveTextContent(
      'without changing your saved progress',
    )
    expect(root.textContent).not.toMatch(
      /stack|token|indexeddb|exception/i,
    )
  })

  test.each([
    ['fr', 'n’a pas pu démarrer'],
    ['de', 'konnte nicht gestartet werden'],
    ['es-419', 'no pudo iniciarse'],
    ['pt-BR', 'não pôde iniciar'],
    ['zh-CN', '无法启动'],
    ['ru', 'Не удалось запустить'],
    ['ja', '起動できませんでした'],
  ])('uses the persisted %s locale without loading React', (locale, title) => {
    localStorage.setItem(
      'idle-dyson-swarm.presentation-locale',
      locale,
    )
    const root = document.createElement('div')
    document.body.append(root)
    renderStaticBootstrapFailure(root)
    expect(root.querySelector('h1')).toHaveTextContent(title)
  })
})
