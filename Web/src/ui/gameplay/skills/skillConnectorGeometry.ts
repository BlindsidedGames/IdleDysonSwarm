export interface SkillConnectorPoint {
  readonly x: number
  readonly y: number
}

export interface SkillConnectorDashOptions {
  readonly dashLength?: number
  readonly gapLength?: number
  readonly width?: number
  readonly taperLength?: number
}

export interface SkillConnectorLayoutOptions {
  readonly nodeSize?: number
  readonly nodeClearance?: number
  readonly startClearance?: number
  readonly endClearance?: number
  readonly arrowDepth?: number
  readonly arrowHalfWidth?: number
  readonly arrowGap?: number
}

export interface SkillConnectorLayout {
  readonly start: SkillConnectorPoint
  readonly bodyEnd: SkillConnectorPoint
  readonly arrowTip: SkillConnectorPoint
  readonly arrowPath: string
}

/**
 * Clips a connector against expanded, axis-aligned node bounds and reserves a
 * gap for one destination arrow. Square-aware clipping keeps diagonal links
 * from disappearing behind node corners.
 */
export function layoutSkillConnector(
  startCenter: SkillConnectorPoint,
  endCenter: SkillConnectorPoint,
  options: SkillConnectorLayoutOptions = {},
): SkillConnectorLayout | null {
  const nodeSize = Math.max(1, options.nodeSize ?? 76)
  const nodeClearance = Math.max(0, options.nodeClearance ?? 10)
  const startClearance = Math.max(
    0,
    options.startClearance ?? nodeClearance,
  )
  const endClearance = Math.max(
    0,
    options.endClearance ?? nodeClearance,
  )
  const arrowDepth = Math.max(4, options.arrowDepth ?? 13.2)
  const arrowHalfWidth = Math.max(2, options.arrowHalfWidth ?? 7.7)
  const arrowGap = Math.max(1, options.arrowGap ?? 4)
  const deltaX = endCenter.x - startCenter.x
  const deltaY = endCenter.y - startCenter.y
  const distance = Math.hypot(deltaX, deltaY)
  if (distance <= 0.001) return null

  const directionX = deltaX / distance
  const directionY = deltaY / distance
  const normalX = -directionY
  const normalY = directionX
  const maximumDirection = Math.max(
    Math.abs(directionX),
    Math.abs(directionY),
  )
  const startOffset =
    (nodeSize / 2 + startClearance) / maximumDirection
  const endOffset =
    (nodeSize / 2 + endClearance) / maximumDirection
  const availableDistance = Math.max(
    0,
    distance - startOffset - endOffset,
  )
  const start = pointAlong(
    startCenter,
    directionX,
    directionY,
    startOffset,
  )
  const arrowTip = pointAlong(
    endCenter,
    -directionX,
    -directionY,
    endOffset,
  )
  const arrowBase = pointAlong(
    arrowTip,
    -directionX,
    -directionY,
    Math.min(arrowDepth, availableDistance),
  )
  const bodyEnd = pointAlong(
    start,
    directionX,
    directionY,
    Math.max(0, availableDistance - arrowDepth - arrowGap),
  )
  const firstWing = offsetNormal(
    arrowBase,
    normalX,
    normalY,
    arrowHalfWidth,
  )
  const secondWing = offsetNormal(
    arrowBase,
    normalX,
    normalY,
    -arrowHalfWidth,
  )
  const sweptBack = pointAlong(
    arrowTip,
    -directionX,
    -directionY,
    Math.min(arrowDepth * 0.64, availableDistance),
  )

  return {
    start,
    bodyEnd,
    arrowTip,
    arrowPath:
      `M${formatPoint(firstWing)}` +
      `L${formatPoint(arrowTip)}` +
      `L${formatPoint(secondWing)}` +
      `L${formatPoint(sweptBack)}Z`,
  }
}

/**
 * Builds a single filled connector whose triangular destination cap is part of
 * the line body rather than a separate marker.
 */
export function buildSolidSkillConnectorPath(
  start: SkillConnectorPoint,
  arrowTip: SkillConnectorPoint,
  options: Pick<
    SkillConnectorLayoutOptions,
    'arrowDepth' | 'arrowHalfWidth'
  > & { readonly width?: number } = {},
): string {
  const width = Math.max(1, options.width ?? 6)
  const arrowDepth = Math.max(4, options.arrowDepth ?? 12)
  const arrowHalfWidth = Math.max(2, options.arrowHalfWidth ?? 7)
  const deltaX = arrowTip.x - start.x
  const deltaY = arrowTip.y - start.y
  const distance = Math.hypot(deltaX, deltaY)
  if (distance <= 0.001) return ''

  const directionX = deltaX / distance
  const directionY = deltaY / distance
  const normalX = -directionY
  const normalY = directionX
  const renderedArrowDepth = Math.min(arrowDepth, distance)
  const arrowBase = pointAlong(
    arrowTip,
    -directionX,
    -directionY,
    renderedArrowDepth,
  )
  const halfWidth = width / 2
  const startTop = offsetNormal(
    start,
    normalX,
    normalY,
    halfWidth,
  )
  const bodyTop = offsetNormal(
    arrowBase,
    normalX,
    normalY,
    halfWidth,
  )
  const firstWing = offsetNormal(
    arrowBase,
    normalX,
    normalY,
    arrowHalfWidth,
  )
  const secondWing = offsetNormal(
    arrowBase,
    normalX,
    normalY,
    -arrowHalfWidth,
  )
  const bodyBottom = offsetNormal(
    arrowBase,
    normalX,
    normalY,
    -halfWidth,
  )
  const startBottom = offsetNormal(
    start,
    normalX,
    normalY,
    -halfWidth,
  )
  const backControl = pointAlong(
    start,
    -directionX,
    -directionY,
    halfWidth * 2,
  )

  return (
    `M${formatPoint(startTop)}` +
    `L${formatPoint(bodyTop)}` +
    `L${formatPoint(firstWing)}` +
    `L${formatPoint(arrowTip)}` +
    `L${formatPoint(secondWing)}` +
    `L${formatPoint(bodyBottom)}` +
    `L${formatPoint(startBottom)}` +
    `Q${formatPoint(backControl)} ${formatPoint(startTop)}Z`
  )
}

/**
 * Builds one SVG path containing equal-length, destination-tapered dash
 * polygons. Keeping the complete connector in one path avoids multiplying DOM
 * nodes across the skill tree.
 */
export function buildTaperedSkillConnectorPath(
  start: SkillConnectorPoint,
  end: SkillConnectorPoint,
  options: SkillConnectorDashOptions = {},
): string {
  const dashLength = Math.max(2, options.dashLength ?? 12)
  const gapLength = Math.max(1, options.gapLength ?? 8)
  const width = Math.max(1, options.width ?? 6)
  const taperLength = Math.min(
    dashLength * 0.45,
    Math.max(1, options.taperLength ?? 3),
  )
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const distance = Math.hypot(deltaX, deltaY)
  if (distance <= 0.001) return ''

  const directionX = deltaX / distance
  const directionY = deltaY / distance
  const normalX = -directionY
  const normalY = directionX
  let count = Math.max(
    1,
    Math.round((distance + gapLength) / (dashLength + gapLength)),
  )
  while (
    count > 1 &&
    count * dashLength + Math.max(0, count - 1) > distance
  ) {
    count -= 1
  }
  const renderedDashLength = Math.min(dashLength, distance)
  const distributedGap =
    count > 1
      ? (distance - count * renderedDashLength) / (count - 1)
      : gapLength
  const initialOffset =
    count === 1
      ? Math.max(0, (distance - renderedDashLength) / 2)
      : 0
  const halfWidth = width / 2
  const commands: string[] = []

  for (let index = 0; index < count; index += 1) {
    const segmentStart =
      initialOffset + index * (renderedDashLength + distributedGap)
    const segmentEnd = Math.min(
      distance,
      segmentStart + renderedDashLength,
    )
    const bodyEnd = Math.max(
      segmentStart,
      segmentEnd - Math.min(taperLength, renderedDashLength * 0.45),
    )
    const startPoint = pointAlong(start, directionX, directionY, segmentStart)
    const bodyPoint = pointAlong(start, directionX, directionY, bodyEnd)
    const tipPoint = pointAlong(start, directionX, directionY, segmentEnd)
    const startTop = offsetNormal(startPoint, normalX, normalY, halfWidth)
    const bodyTop = offsetNormal(bodyPoint, normalX, normalY, halfWidth)
    const bodyBottom = offsetNormal(bodyPoint, normalX, normalY, -halfWidth)
    const startBottom = offsetNormal(startPoint, normalX, normalY, -halfWidth)
    commands.push(
      `M${formatPoint(startTop)}L${formatPoint(bodyTop)}L${formatPoint(tipPoint)}L${formatPoint(bodyBottom)}L${formatPoint(startBottom)}Z`,
    )
  }

  return commands.join('')
}

function pointAlong(
  origin: SkillConnectorPoint,
  directionX: number,
  directionY: number,
  distance: number,
): SkillConnectorPoint {
  return {
    x: origin.x + directionX * distance,
    y: origin.y + directionY * distance,
  }
}

function offsetNormal(
  point: SkillConnectorPoint,
  normalX: number,
  normalY: number,
  distance: number,
): SkillConnectorPoint {
  return {
    x: point.x + normalX * distance,
    y: point.y + normalY * distance,
  }
}

function formatPoint(point: SkillConnectorPoint): string {
  return `${roundCoordinate(point.x)} ${roundCoordinate(point.y)}`
}

function roundCoordinate(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}
