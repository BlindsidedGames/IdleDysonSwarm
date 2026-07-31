import { describe, expect, test } from 'vitest'
import { buildTaperedSkillConnectorPath } from './skillConnectorGeometry'

describe('skill connector geometry', () => {
  test('builds equal destination-tapered horizontal dashes', () => {
    expect(
      buildTaperedSkillConnectorPath(
        { x: 0, y: 0 },
        { x: 52, y: 0 },
        { dashLength: 12, gapLength: 8, width: 6, taperLength: 3 },
      ),
    ).toBe(
      'M0 3L9 3L12 0L9 -3L0 -3Z' +
        'M20 3L29 3L32 0L29 -3L20 -3Z' +
        'M40 3L49 3L52 0L49 -3L40 -3Z',
    )
  })

  test('orients every taper along a vertical or diagonal target', () => {
    const vertical = buildTaperedSkillConnectorPath(
      { x: 10, y: 10 },
      { x: 10, y: 42 },
    )
    const diagonal = buildTaperedSkillConnectorPath(
      { x: 0, y: 0 },
      { x: 24, y: 24 },
    )

    expect(vertical).toContain('L10 42')
    expect(diagonal).toMatch(/L\d+(?:\.\d+)? \d+(?:\.\d+)?/)
    expect(diagonal).not.toContain('NaN')
  })

  test('uses one centred tapered segment for a short connector', () => {
    expect(
      buildTaperedSkillConnectorPath(
        { x: 0, y: 0 },
        { x: 7, y: 0 },
      ),
    ).toBe('M0 3L4 3L7 0L4 -3L0 -3Z')
  })

  test('returns no geometry for coincident points', () => {
    expect(
      buildTaperedSkillConnectorPath(
        { x: 4, y: 4 },
        { x: 4, y: 4 },
      ),
    ).toBe('')
  })
})
