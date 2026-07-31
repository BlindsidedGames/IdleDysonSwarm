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
  const count = Math.max(
    1,
    Math.floor((distance + gapLength) / (dashLength + gapLength)),
  )
  const renderedDashLength = Math.min(dashLength, distance)
  const occupied =
    count * renderedDashLength + Math.max(0, count - 1) * gapLength
  const initialOffset = Math.max(0, (distance - occupied) / 2)
  const halfWidth = width / 2
  const commands: string[] = []

  for (let index = 0; index < count; index += 1) {
    const segmentStart =
      initialOffset + index * (renderedDashLength + gapLength)
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
