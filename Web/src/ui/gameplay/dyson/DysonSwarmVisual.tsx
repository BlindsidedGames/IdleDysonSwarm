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
const ORIGIN_STAR_INDEX = 173
const GALAXY_GROUP_LIMIT = 12
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

type GalaxyMemberStyle = CSSProperties & {
  readonly '--member-angle': string
  readonly '--member-counter-angle': string
  readonly '--member-orbit-radius': string
  readonly '--member-orbit-duration': string
  readonly '--galaxy-scale': number
  readonly '--galaxy-harvest': number
  readonly '--galaxy-depth-delay': string
}

interface GalaxyLight {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly tone: number
  readonly dimOrder: number
}

interface GalaxyGroupMember {
  readonly orbit: number
  readonly angle: number
  readonly scale: number
  readonly radiusScale: number
  readonly durationScale: number
  readonly dimOrder: number
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
      <div className="dyson-swarm-visual__galaxy-haze" />
      <svg
        className="dyson-swarm-visual__galaxy"
        viewBox="-120 -80 240 160"
        preserveAspectRatio="xMidYMid meet"
      >
        <g
          className="dyson-swarm-visual__galaxy-plane"
          transform="rotate(10) scale(1 0.38)"
        >
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
        <circle
          className="dyson-swarm-visual__galaxy-core"
          r="4.5"
        />
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
  return (
    <div className="dyson-swarm-visual__scene dyson-swarm-visual__scene--galaxy-group">
      <div className="dyson-swarm-visual__group-haze" />
      <div className="dyson-swarm-visual__galaxy-group">
        {GALAXY_GROUP_ORBIT_SPECS.map((orbit, orbitIndex) => (
          <div
            className={`dyson-swarm-visual__group-orbit-plane dyson-swarm-visual__group-orbit-plane--${orbitIndex}`}
            key={`group-orbit-${orbitIndex}`}
          >
            {GALAXY_GROUP_MEMBERS_BY_ORBIT[orbitIndex].map(
              (member, index) => {
                const durationSeconds =
                  orbit.durationSeconds *
                  member.durationScale
                const orbitRadius =
                  orbit.radiusRem * member.radiusScale
                const harvest = galaxyMemberHarvest(
                  member.dimOrder,
                  completion,
                )
                const style: GalaxyMemberStyle = {
                  '--member-angle': `${member.angle}deg`,
                  '--member-counter-angle': `${-member.angle}deg`,
                  '--member-orbit-radius': `${orbitRadius}rem`,
                  '--member-orbit-duration':
                    `${durationSeconds}s`,
                  '--galaxy-scale': member.scale,
                  '--galaxy-harvest': harvest,
                  '--galaxy-depth-delay':
                    `${-(member.angle / 360) * durationSeconds}s`,
                }
                return (
                  <div
                    className="dyson-swarm-visual__group-orbit-track"
                    style={style}
                    key={`galaxy-track-${orbitIndex}-${index}`}
                  >
                    <div
                      className="dyson-swarm-visual__mini-galaxy-anchor"
                      data-dim-order={member.dimOrder}
                    >
                      <div className="dyson-swarm-visual__mini-galaxy-counter">
                        <i
                          className="dyson-swarm-visual__mini-galaxy"
                          data-engulfed={
                            harvest >= 1 || undefined
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        ))}
      </div>
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
    1 + clampUnitInterval(completion) * (GALAXY_GROUP_LIMIT - 1)
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

const GALAXY_GROUP_DIM_ORDER = [
  2, 7, 0, 10, 4, 9, 1, 6, 11, 3, 8, 5,
] as const

const GALAXY_GROUP_ORBIT_SPECS = [
  { durationSeconds: 116, radiusRem: 5.4 },
  { durationSeconds: 157, radiusRem: 6.8 },
  { durationSeconds: 97, radiusRem: 4.2 },
] as const

const GALAXY_GROUP_MEMBERS: ReadonlyArray<GalaxyGroupMember> =
  Array.from({ length: GALAXY_GROUP_LIMIT }, (_, index) => {
    const orbit = index % GALAXY_GROUP_ORBIT_SPECS.length
    const slot = Math.floor(
      index / GALAXY_GROUP_ORBIT_SPECS.length,
    )
    return {
      orbit,
      angle:
        slot * 90 +
        orbit * 23 +
        deterministicUnit(index + 4101) * 18,
      scale: 0.58 + deterministicUnit(index + 5101) * 0.34,
      radiusScale:
        0.76 + deterministicUnit(index + 6101) * 0.24,
      durationScale:
        0.82 + deterministicUnit(index + 7101) * 0.36,
      dimOrder: GALAXY_GROUP_DIM_ORDER[index],
    }
  })

const GALAXY_GROUP_MEMBERS_BY_ORBIT = Array.from(
  { length: GALAXY_GROUP_ORBIT_SPECS.length },
  (_, orbit) =>
    GALAXY_GROUP_MEMBERS.filter(
      (member) => member.orbit === orbit,
    ),
)
