import {
  memo,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type {
  FrontendDysonSwarmVisualizationFacts,
} from '../../../application/frontendSnapshot'
import './dysonSwarmVisual.css'

const EXACT_COLLECTOR_LIMIT = 64
const DENSE_COLLECTOR_LAYER_COUNT = 11
const COLLECTORS_PER_DENSE_LAYER = 32
const GALAXY_LIGHT_COUNT = 420
const GALAXY_CORE_LIGHT_COUNT = 36
const ORIGIN_STAR_INDEX = 173
const GALAXY_FIELD_MEMBER_COUNT = 84
const GALAXY_FIELD_DUST_COUNT = 144
const GALAXY_FIELD_ANCHOR_X = -8
const GALAXY_FIELD_ANCHOR_Y = -44
const ORBIT_COUNT = 4

const ORBIT_SPECS = [
  { radius: 62, projectedRadius: 18, rotation: 12 },
  { radius: 76, projectedRadius: 30, rotation: -18 },
  { radius: 90, projectedRadius: 42, rotation: 34 },
  { radius: 104, projectedRadius: 54, rotation: -37 },
] as const

interface DysonSwarmVisualProps {
  readonly facts: FrontendDysonSwarmVisualizationFacts
}

type VisualStyle = CSSProperties & {
  readonly '--swarm-completion'?: number
  readonly '--galaxy-completion'?: number
}

type GalaxyFieldStyle = CSSProperties & {
  readonly '--galaxy-scale': number
  readonly '--galaxy-harvest': number
  readonly '--galaxy-depth-opacity': number
  readonly '--galaxy-entry-delay': string
  readonly '--galaxy-spin-duration': string
}

interface GalaxyLight {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly tone: number
  readonly dimOrder: number
}

interface GalaxyCoreLight {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly tone: number
}

interface GalaxyFieldMember {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly rotation: number
  readonly scale: number
  readonly depth: number
  readonly variant: number
  readonly spinDirection: 'normal' | 'reverse'
  readonly spinDurationSeconds: number
  readonly dimOrder: number
}

interface GalaxyFieldDust {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly opacity: number
  readonly tone: number
}

/**
 * Renders a bounded visual interpretation of the canonical Dyson scale facts.
 * It owns no gameplay state, thresholds, time advancement or player commands.
 */
export function DysonSwarmVisual({
  facts,
}: DysonSwarmVisualProps) {
  return (
    <div
      className="dyson-swarm-visual"
      data-phase={facts.phase}
      aria-hidden="true"
    >
      {facts.phase === 'stellar-swarm' && (
        <StellarSwarmScene
          activePanels={facts.activePanels}
          completion={facts.completion}
        />
      )}
      {facts.phase === 'galaxy' && (
        <GalaxyScene completion={facts.completion} />
      )}
      {facts.phase === 'galaxy-group' && (
        <GalaxyGroupScene
          completion={facts.completion}
        />
      )}
    </div>
  )
}

interface StellarSwarmSceneProps {
  readonly activePanels: number
  readonly completion: number
}

function StellarSwarmScene({
  activePanels,
  completion,
}: StellarSwarmSceneProps) {
  const exactCollectorCount = Math.min(
    EXACT_COLLECTOR_LIMIT,
    Math.ceil(activePanels),
  )
  const denseCollectorLayers =
    activePanels <= EXACT_COLLECTOR_LIMIT
      ? 0
      : Math.min(
          DENSE_COLLECTOR_LAYER_COUNT,
          Math.max(
            1,
            Math.ceil(
              Math.pow(completion, 0.55) *
                DENSE_COLLECTOR_LAYER_COUNT,
            ),
          ),
        )
  const style: VisualStyle = {
    '--swarm-completion': completion,
  }

  return (
    <div
      className="dyson-swarm-visual__scene dyson-swarm-visual__scene--stellar"
      style={style}
    >
      <StarCollectorField
        exactCollectorCount={exactCollectorCount}
        denseCollectorLayers={denseCollectorLayers}
      />
      <div className="dyson-swarm-visual__thermal-glow" />
      <div className="dyson-swarm-visual__sun" />
    </div>
  )
}

interface StarCollectorFieldProps {
  readonly exactCollectorCount: number
  readonly denseCollectorLayers: number
}

const StarCollectorField = memo(function StarCollectorField({
  exactCollectorCount,
  denseCollectorLayers,
}: StarCollectorFieldProps) {
  return (
    <svg
      className="dyson-swarm-visual__collector-field"
      viewBox="-120 -80 240 160"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {ORBIT_SPECS.map((orbit, index) => (
          <linearGradient
            id={`dyson-orbit-depth-${index}`}
            x1="0"
            y1={-orbit.projectedRadius}
            x2="0"
            y2={orbit.projectedRadius}
            gradientUnits="userSpaceOnUse"
            key={`depth-${index}`}
          >
            <stop
              offset="0"
              stopColor="#1c1420"
              stopOpacity="0.5"
            />
            <stop
              offset="0.46"
              stopColor="#1c1420"
              stopOpacity="0.1"
            />
            <stop
              offset="0.56"
              stopColor="#1c1420"
              stopOpacity="0"
            />
          </linearGradient>
        ))}
      </defs>
      {ORBIT_SPECS.map((orbit, orbitIndex) => (
        <g
          className={`dyson-swarm-visual__orbit-plane dyson-swarm-visual__orbit-plane--${orbitIndex}`}
          transform={`rotate(${orbit.rotation})`}
          key={`orbit-${orbitIndex}`}
        >
          <g
            transform={`scale(1 ${orbit.projectedRadius / orbit.radius})`}
          >
            <g
              className={`dyson-swarm-visual__collector-track dyson-swarm-visual__collector-track--${orbitIndex}`}
            >
              <g className="dyson-swarm-visual__collector-plane dyson-swarm-visual__collector-plane--exact">
                {EXACT_COLLECTORS_BY_ORBIT[orbitIndex].map(
                  ({ collector, index }) =>
                    renderCollector(
                      collector,
                      index < exactCollectorCount,
                      `exact-${index}`,
                    ),
                )}
              </g>
              {DENSE_COLLECTOR_LAYERS_BY_ORBIT[
                orbitIndex
              ].map((collectors, layer) => (
                <g
                  className="dyson-swarm-visual__collector-plane"
                  data-visible={
                    layer < denseCollectorLayers || undefined
                  }
                  key={`dense-${orbitIndex}-${layer}`}
                >
                  {collectors}
                </g>
              ))}
            </g>
          </g>
          <ellipse
            className="dyson-swarm-visual__orbit-depth"
            rx={orbit.radius}
            ry={orbit.projectedRadius}
            fill={`url(#dyson-orbit-depth-${orbitIndex})`}
          />
          <ellipse
            className="dyson-swarm-visual__orbit-guide"
            rx={orbit.radius}
            ry={orbit.projectedRadius}
          />
        </g>
      ))}
    </svg>
  )
})

interface GalaxySceneProps {
  readonly completion: number
}

function GalaxyScene({ completion }: GalaxySceneProps) {
  const visualCompletion = Math.pow(completion, 0.88)
  const extinction = visualCompletion * GALAXY_LIGHT_COUNT
  const style: VisualStyle = {
    '--galaxy-completion': completion,
  }

  return (
    <div
      className="dyson-swarm-visual__scene dyson-swarm-visual__scene--galaxy"
      style={style}
    >
      <svg
        className="dyson-swarm-visual__galaxy"
        viewBox="-120 -80 240 160"
        preserveAspectRatio="xMidYMid meet"
      >
        <g
          className="dyson-swarm-visual__galaxy-position"
          transform="translate(-6 -8)"
        >
          <g
            className="dyson-swarm-visual__galaxy-plane"
            transform="rotate(10) scale(1 0.38)"
          >
            <g
              className="dyson-swarm-visual__galaxy-composition"
              transform="translate(-8 -94)"
            >
              <g
                className="dyson-swarm-visual__galaxy-bulge"
                style={{
                  opacity: 1 - completion * 0.9,
                }}
              >
                {GALAXY_CORE_LIGHTS.map((light) => (
                  <circle
                    className="dyson-swarm-visual__galaxy-core-light"
                    cx={light.x}
                    cy={light.y}
                    r={light.radius}
                    data-tone={light.tone}
                    key={`core-light-${light.index}`}
                  />
                ))}
              </g>
              {GALAXY_LIGHTS.map((light) => (
                <circle
                  className={
                    light.index === ORIGIN_STAR_INDEX
                      ? 'dyson-swarm-visual__galaxy-light dyson-swarm-visual__galaxy-light--origin'
                      : 'dyson-swarm-visual__galaxy-light'
                  }
                  cx={light.x}
                  cy={light.y}
                  r={light.radius}
                  data-origin={
                    light.index === ORIGIN_STAR_INDEX || undefined
                  }
                  data-tone={light.tone}
                  style={{
                    opacity: galaxyLightOpacity(
                      light.dimOrder,
                      extinction,
                    ),
                  }}
                  key={`light-${light.index}`}
                />
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

interface GalaxyGroupSceneProps {
  readonly completion: number
}

function GalaxyGroupScene({
  completion,
}: GalaxyGroupSceneProps) {
  const fieldStyle: VisualStyle = {
    '--galaxy-completion': completion,
  }

  return (
    <div
      className="dyson-swarm-visual__scene dyson-swarm-visual__scene--galaxy-group"
      style={fieldStyle}
    >
      <svg
        className="dyson-swarm-visual__galaxy-field"
        viewBox="-120 -80 240 160"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="dyson-field-haze">
            <stop
              offset="0"
              stopColor="#9d6bac"
              stopOpacity="0.12"
            />
            <stop
              offset="0.48"
              stopColor="#70456f"
              stopOpacity="0.06"
            />
            <stop
              offset="1"
              stopColor="#241727"
              stopOpacity="0"
            />
          </radialGradient>
          <g id="dyson-field-galaxy-spiral">
            <ellipse
              className="dyson-swarm-visual__field-galaxy-halo"
              rx="5.4"
              ry="2.9"
            />
            <path
              className="dyson-swarm-visual__field-galaxy-arm"
              d="M-5.2 0.25 C-2.9-2.2 1.5-2.15 4.9-0.45 C2.55 1.6-0.4 2.05-3.2 1.1"
            />
            <path
              className="dyson-swarm-visual__field-galaxy-arm dyson-swarm-visual__field-galaxy-arm--faint"
              d="M4.8 0.2 C2.5 2.25-1.55 2.05-4.75 0.45 C-2.15-1.45 0.8-1.9 3.5-0.9"
            />
            <circle
              className="dyson-swarm-visual__field-galaxy-core"
              r="0.72"
            />
          </g>
          <g id="dyson-field-galaxy-tilted">
            <ellipse
              className="dyson-swarm-visual__field-galaxy-halo"
              rx="5.9"
              ry="1.7"
            />
            <path
              className="dyson-swarm-visual__field-galaxy-arm"
              d="M-5.7 0 C-2.6-1.2 2.35-1.15 5.65 0 C2.15 1.25-2.1 1.2-4.7 0.2"
            />
            <circle
              className="dyson-swarm-visual__field-galaxy-core"
              r="0.62"
            />
          </g>
          <g id="dyson-field-galaxy-elliptical">
            <ellipse
              className="dyson-swarm-visual__field-galaxy-halo"
              rx="4.4"
              ry="3"
            />
            <ellipse
              className="dyson-swarm-visual__field-galaxy-arm"
              rx="2.6"
              ry="1.5"
            />
            <circle
              className="dyson-swarm-visual__field-galaxy-core"
              r="0.68"
            />
          </g>
        </defs>
        <g className="dyson-swarm-visual__field-depth">
          <ellipse
            className="dyson-swarm-visual__field-haze"
            cx="-38"
            cy="-19"
            rx="118"
            ry="61"
            fill="url(#dyson-field-haze)"
            transform="rotate(-11)"
          />
          {GALAXY_FIELD_DUST.map((dust) => (
            <circle
              className="dyson-swarm-visual__field-dust"
              cx={dust.x}
              cy={dust.y}
              r={dust.radius}
              data-tone={dust.tone}
              style={{
                opacity:
                  dust.opacity * (1 - completion * 0.62),
              }}
              key={`field-dust-${dust.index}`}
            />
          ))}
        </g>
        <g className="dyson-swarm-visual__field-members">
          {GALAXY_FIELD_MEMBERS.map((member) => {
            const harvest = galaxyMemberHarvest(
              member.dimOrder,
              completion,
            )
            const style: GalaxyFieldStyle = {
              '--galaxy-scale': member.scale,
              '--galaxy-harvest': harvest,
              '--galaxy-depth-opacity':
                0.58 + member.depth * 0.42,
              '--galaxy-entry-delay':
                `${Math.round(member.depth * 220)}ms`,
              '--galaxy-spin-duration':
                `${member.spinDurationSeconds}s`,
            }
            return (
              <g
                className={
                  member.index === 0
                    ? 'dyson-swarm-visual__field-member dyson-swarm-visual__field-member--origin'
                    : 'dyson-swarm-visual__field-member'
                }
                data-dim-order={member.dimOrder}
                data-edge={
                  Math.abs(member.x) > 108 ||
                  Math.abs(member.y) > 70 ||
                  undefined
                }
                data-engulfed={harvest >= 1 || undefined}
                data-origin={member.index === 0 || undefined}
                data-variant={member.variant}
                style={style}
                transform={
                  `translate(${member.x} ${member.y}) ` +
                  `rotate(${member.rotation}) ` +
                  `scale(${member.scale})`
                }
                key={`field-galaxy-${member.index}`}
              >
                <g className="dyson-swarm-visual__field-member-entry">
                  <g
                    className="dyson-swarm-visual__field-member-spin"
                    data-spin={member.spinDirection}
                  >
                    <use
                      href={
                        member.variant === 0
                          ? '#dyson-field-galaxy-spiral'
                          : member.variant === 1
                            ? '#dyson-field-galaxy-tilted'
                            : '#dyson-field-galaxy-elliptical'
                      }
                    />
                  </g>
                </g>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

interface Collector {
  readonly orbit: number
  readonly x: number
  readonly y: number
  readonly radius: number
}

function renderCollector(
  collector: Collector,
  visible: boolean,
  key: string,
): ReactNode {
  return (
    <circle
      className="dyson-swarm-visual__collector"
      cx={collector.x}
      cy={collector.y}
      r={collector.radius}
      data-visible={visible || undefined}
      key={key}
    />
  )
}

function createCollector(index: number): Collector {
  const orbit = index % ORBIT_COUNT
  const orbitalIndex = Math.floor(index / ORBIT_COUNT)
  const phase =
    orbitalIndex * 2.399963229728653 +
    orbit * 0.83
  const orbitRadius = ORBIT_SPECS[orbit].radius

  return {
    orbit,
    x: Math.cos(phase) * orbitRadius,
    y: Math.sin(phase) * orbitRadius,
    radius: 0.72 + deterministicUnit(index + 19) * 0.55,
  }
}

function createGalaxyLight(
  index: number,
  dimOrder: number,
): GalaxyLight {
  const normalizedRadius = Math.sqrt(
    (index + 0.5) / GALAXY_LIGHT_COUNT,
  )
  const radius = 5 + normalizedRadius * 101
  const arm = index % 4
  const jitter = deterministicUnit(index + 701) - 0.5
  const angle =
    arm * Math.PI / 2 +
    radius * 0.065 +
    jitter * 0.62
  const spread =
    (deterministicUnit(index + 1701) - 0.5) *
    (4 + normalizedRadius * 13)

  return {
    index,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius + spread / 0.38,
    radius: 0.38 + deterministicUnit(index + 2701) * 0.8,
    tone: index % 3,
    dimOrder,
  }
}

function createGalaxyCoreLight(index: number): GalaxyCoreLight {
  const pairIndex = Math.floor(index / 2)
  const pairDirection = index % 2 === 0 ? 1 : -1
  const normalizedRadius = Math.sqrt(
    (pairIndex + 0.5) / (GALAXY_CORE_LIGHT_COUNT / 2),
  )
  const radius = 1.5 + normalizedRadius * 13
  const angle =
    pairIndex * 2.399963229728653 +
    deterministicUnit(pairIndex + 4701) * 0.3

  return {
    index,
    x: Math.cos(angle) * radius * pairDirection,
    y: Math.sin(angle) * radius * pairDirection,
    radius: 0.45 + deterministicUnit(pairIndex + 5701) * 0.75,
    tone: pairIndex % 3,
  }
}

function createGalaxyFieldMember(
  index: number,
  dimOrder: number,
): GalaxyFieldMember {
  if (index === 0) {
    return {
      index,
      x: GALAXY_FIELD_ANCHOR_X,
      y: GALAXY_FIELD_ANCHOR_Y,
      rotation: -12,
      scale: 1.12,
      depth: 1,
      variant: 0,
      spinDirection: 'normal',
      spinDurationSeconds: 214,
      dimOrder,
    }
  }

  const fieldIndex = index - 1
  const filament = fieldIndex % 4
  const filamentIndex = Math.floor(fieldIndex / 4)
  const filamentLength = Math.ceil(
    (GALAXY_FIELD_MEMBER_COUNT - 1) / 4,
  )
  const progress =
    filamentLength <= 1
      ? 0.5
      : filamentIndex / (filamentLength - 1)
  const horizontal = progress * 2 - 1
  const depth = deterministicUnit(index + 8101)
  const x =
    horizontal * 130 +
    (deterministicUnit(index + 8201) - 0.5) * 15
  const filamentOffsets = [-48, -18, 15, 45] as const
  const wave =
    Math.sin(horizontal * Math.PI * 1.35 + filament * 1.7) *
    (8 + depth * 7)
  const diagonal = horizontal * (filament % 2 === 0 ? 16 : -13)
  const y = Math.min(
    84,
    Math.max(
      -84,
      filamentOffsets[filament] +
        wave +
        diagonal +
        (deterministicUnit(index + 8301) - 0.5) * 12,
    ),
  )

  return {
    index,
    x,
    y,
    rotation:
      -32 + deterministicUnit(index + 8401) * 64,
    scale: 0.38 + depth * 0.54,
    depth,
    variant: index % 3,
    spinDirection: index % 2 === 0 ? 'normal' : 'reverse',
    spinDurationSeconds:
      170 + Math.round(deterministicUnit(index + 8501) * 170),
    dimOrder,
  }
}

function createGalaxyFieldDust(index: number): GalaxyFieldDust {
  return {
    index,
    x: -126 + deterministicUnit(index + 9101) * 252,
    y: -86 + deterministicUnit(index + 9201) * 172,
    radius: 0.12 + deterministicUnit(index + 9301) * 0.34,
    opacity: 0.2 + deterministicUnit(index + 9401) * 0.42,
    tone: index % 3,
  }
}

function galaxyLightOpacity(
  dimOrder: number,
  extinction: number,
): number {
  const remaining = dimOrder + 1 - extinction
  if (remaining >= 1) return 1
  if (remaining <= 0) return 0.08
  return 0.08 + remaining * 0.92
}

function galaxyMemberHarvest(
  dimOrder: number,
  completion: number,
): number {
  const representedGalaxies =
    1 +
    clampUnitInterval(completion) *
      (GALAXY_FIELD_MEMBER_COUNT - 1)
  return clampUnitInterval(representedGalaxies - dimOrder)
}

function clampUnitInterval(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function deterministicUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

const EXACT_COLLECTORS = Array.from(
  { length: EXACT_COLLECTOR_LIMIT },
  (_, index) => createCollector(index),
)

const EXACT_COLLECTORS_BY_ORBIT = Array.from(
  { length: ORBIT_COUNT },
  (_, orbit) =>
    EXACT_COLLECTORS.flatMap((collector, index) =>
      collector.orbit === orbit
        ? [{ collector, index }]
        : [],
    ),
)

const DENSE_COLLECTOR_LAYERS = Array.from(
  { length: DENSE_COLLECTOR_LAYER_COUNT },
  (_, layer) =>
    Array.from(
      { length: COLLECTORS_PER_DENSE_LAYER },
      (_, offset) => {
        const index =
          EXACT_COLLECTOR_LIMIT +
          layer * COLLECTORS_PER_DENSE_LAYER +
          offset
        return renderCollector(
          createCollector(index),
          false,
          `collector-${index}`,
        )
      },
    ),
)

const DENSE_COLLECTOR_LAYERS_BY_ORBIT = Array.from(
  { length: ORBIT_COUNT },
  (_, orbit) =>
    DENSE_COLLECTOR_LAYERS.map((collectors) =>
      collectors.filter(
        (_, index) =>
          (EXACT_COLLECTOR_LIMIT + index) %
            ORBIT_COUNT === orbit,
      ),
    ),
)

const GALAXY_DIM_ORDER = Array.from(
  { length: GALAXY_LIGHT_COUNT },
  (_, index) => index,
).sort(
  (left, right) =>
    deterministicUnit(left + 3701) -
    deterministicUnit(right + 3701),
)

const GALAXY_DIM_RANK = new Map(
  GALAXY_DIM_ORDER.map((index, rank) => [index, rank]),
)

const GALAXY_LIGHTS = Array.from(
  { length: GALAXY_LIGHT_COUNT },
  (_, index) =>
    createGalaxyLight(
      index,
      GALAXY_DIM_RANK.get(index) ?? index,
    ),
)

const GALAXY_CORE_LIGHTS = Array.from(
  { length: GALAXY_CORE_LIGHT_COUNT },
  (_, index) => createGalaxyCoreLight(index),
)

const GALAXY_FIELD_DIM_SEQUENCE = [
  0,
  ...Array.from(
    { length: GALAXY_FIELD_MEMBER_COUNT - 1 },
    (_, index) => index + 1,
  ).sort(
    (left, right) =>
      deterministicUnit(left + 10101) -
      deterministicUnit(right + 10101),
  ),
]

const GALAXY_FIELD_DIM_RANK = new Map(
  GALAXY_FIELD_DIM_SEQUENCE.map((index, rank) => [
    index,
    rank,
  ]),
)

const GALAXY_FIELD_MEMBERS: ReadonlyArray<GalaxyFieldMember> =
  Array.from(
    { length: GALAXY_FIELD_MEMBER_COUNT },
    (_, index) =>
      createGalaxyFieldMember(
        index,
        GALAXY_FIELD_DIM_RANK.get(index) ?? index,
      ),
  )

const GALAXY_FIELD_DUST: ReadonlyArray<GalaxyFieldDust> =
  Array.from(
    { length: GALAXY_FIELD_DUST_COUNT },
    (_, index) => createGalaxyFieldDust(index),
  )
