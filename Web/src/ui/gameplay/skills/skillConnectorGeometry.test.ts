import { describe, expect, test } from 'vitest'
import {
  buildSolidSkillConnectorPath,
  buildTaperedSkillConnectorPath,
  layoutSkillConnector,
} from './skillConnectorGeometry'

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

  test('anchors long dash trains to both ends with even internal gaps', () => {
    const path = buildTaperedSkillConnectorPath(
      { x: 0, y: 0 },
      { x: 90, y: 0 },
    )

    expect(path.startsWith('M0 3')).toBe(true)
    expect(path).toContain('L90 0')
  })

  test('returns no geometry for coincident points', () => {
    expect(
      buildTaperedSkillConnectorPath(
        { x: 4, y: 4 },
        { x: 4, y: 4 },
      ),
    ).toBe('')
  })

  test('clips horizontal links to equal square-aware clearances', () => {
    expect(
      layoutSkillConnector(
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ),
    ).toEqual({
      start: { x: 48, y: 0 },
      bodyEnd: { x: 134.8, y: 0 },
      arrowTip: { x: 152, y: 0 },
      arrowPath:
        'M138.8 7.7L152 0L138.8 -7.7L143.552 0Z',
    })
  })

  test('clips diagonal links against square corners rather than a circle', () => {
    const layout = layoutSkillConnector(
      { x: 0, y: 0 },
      { x: 200, y: 200 },
    )

    expect(layout?.start.x).toBeCloseTo(48)
    expect(layout?.start.y).toBeCloseTo(48)
    expect(layout?.arrowTip.x).toBeCloseTo(152)
    expect(layout?.arrowTip.y).toBeCloseTo(152)
    expect(layout?.arrowPath).not.toContain('NaN')
  })

  test('supports a tighter dashed-source clearance independently', () => {
    const layout = layoutSkillConnector(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { startClearance: 7 },
    )

    expect(layout?.start).toEqual({ x: 45, y: 0 })
    expect(layout?.arrowTip).toEqual({ x: 152, y: 0 })
  })

  test('returns no layout for coincident node centres', () => {
    expect(
      layoutSkillConnector(
        { x: 12, y: 12 },
        { x: 12, y: 12 },
      ),
    ).toBeNull()
  })

  test('builds a solid line and triangular cap as one filled path', () => {
    expect(
      buildSolidSkillConnectorPath(
        { x: 48, y: 0 },
        { x: 152, y: 0 },
      ),
    ).toBe(
      'M48 3L140 3L140 7L152 0L140 -7L140 -3L48 -3Q42 0 48 3Z',
    )
  })
})
