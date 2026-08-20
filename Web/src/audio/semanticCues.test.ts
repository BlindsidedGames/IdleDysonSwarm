// @vitest-environment jsdom
import { fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { GameAudioService } from './contracts'
import { installSemanticAudioCues } from './semanticCues'

function service(): GameAudioService {
  return {
    target: 'browser',
    initialize: vi.fn(() => Promise.resolve()),
    settings: () => ({ musicVolume: 0.7, effectsVolume: 0.5, muted: false }),
    subscribe: () => () => undefined,
    update: vi.fn(() => Promise.resolve()),
    semanticAction: vi.fn(() => Promise.resolve()),
    setMusicIntended: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(() => Promise.resolve()),
  }
}

describe('semantic audio cue policy', () => {
  test('cues enabled semantic actions but not disabled controls, sliders, or opted-out actions', () => {
    document.body.innerHTML = `
      <button id="enabled"><span>Act</span></button>
      <button id="disabled" disabled>Disabled</button>
      <input id="slider" type="range">
      <button id="quiet" data-audio-cue="off">Quiet</button>
    `
    const audio = service()
    const uninstall = installSemanticAudioCues(document, audio)
    fireEvent.click(document.querySelector('#enabled span')!)
    fireEvent.click(document.querySelector('#disabled')!)
    fireEvent.click(document.querySelector('#slider')!)
    fireEvent.click(document.querySelector('#quiet')!)
    expect(audio.semanticAction).toHaveBeenCalledTimes(1)
    uninstall()
  })
})
