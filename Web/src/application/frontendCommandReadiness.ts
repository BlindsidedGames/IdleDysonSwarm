import type { DeepReadonly } from '../core/contracts'
import {
  CANONICAL_PLAYER_COMMAND_KINDS,
  CANONICAL_PLAYER_COMMAND_SUPPORT,
  type CanonicalPlayerCommandKind,
} from './canonicalPlayerCommands'
import type {
  FrontendCommandAvailability,
  FrontendCommandAvailabilityIndex,
  FrontendCommandFamily,
  FrontendCommandFamilyAvailability,
  FrontendCommandRequirement,
  FrontendCommandRequirementReadiness,
  FrontendDefinitionCoverage,
  FrontendGameplaySnapshot,
} from './frontendSnapshot'

export const FRONTEND_COMMAND_FAMILIES = Object.freeze([
  'dyson',
  'research',
  'skill',
  'dream',
  'reality',
  'quantum',
  'infinity',
  'avocado',
  'time',
  'settings',
  'tinker',
] as const)

const EMPTY_GAPS = Object.freeze([] as string[])

/**
 * V2 catalogs are typed exhaustively against their persisted flag records.
 * Their catalog parity suites are the authority for this state-independent
 * readiness fact; the V1 runtime gap inspectors remain on the legacy path.
 */
export const V2_FRONTEND_DEFINITION_COVERAGE: DeepReadonly<FrontendDefinitionCoverage> = Object.freeze({
  complete: true,
  domains: Object.freeze({
    'dream-upgrades': Object.freeze({ complete: true, gaps: EMPTY_GAPS }),
    'quantum-upgrades': Object.freeze({ complete: true, gaps: EMPTY_GAPS }),
    'reality-upgrades': Object.freeze({ complete: true, gaps: EMPTY_GAPS }),
  }),
})

/**
 * Canonical writes remain blocked until the preserved Unity schema surface is
 * fully owned. V2 startup only needs this conservative release policy; the
 * detailed schema-11 coverage catalog remains in the migration tooling path.
 */
export const V2_FRONTEND_PERSISTENCE_READINESS = Object.freeze({
  mappingCoverageComplete: false,
  canonicalWriteAllowed: false,
  unmatchedWritePolicy: 'preserve-source' as const,
})

export function selectFrontendCommandAvailability(
  requirements: FrontendCommandRequirementReadiness,
  definitionCoverage: Readonly<FrontendDefinitionCoverage>,
): FrontendCommandAvailabilityIndex {
  const byKindEntries = CANONICAL_PLAYER_COMMAND_KINDS.map((kind) => {
    const support = CANONICAL_PLAYER_COMMAND_SUPPORT[kind]
    const required = 'requires' in support
      ? [...support.requires] as FrontendCommandRequirement[]
      : []
    const missingRequirements = required.filter(
      (requirement) => requirements[requirement] !== true,
    )
    const definitionGaps = definitionGapsForCommand(kind, definitionCoverage)
    const routeAvailable =
      support.supported &&
      missingRequirements.length === 0 &&
      definitionGaps.length === 0
    const status = !support.supported
      ? 'unsupported' as const
      : definitionGaps.length > 0
        ? 'definition-gap' as const
        : missingRequirements.length > 0
          ? 'missing-runtime-requirement' as const
          : 'available' as const

    const availability: FrontendCommandAvailability = {
      kind,
      family: commandFamily(kind),
      supported: support.supported,
      routeAvailable,
      status,
      authority: support.authority,
      blocker: 'blocker' in support && typeof support.blocker === 'string'
        ? support.blocker
        : null,
      requirements: required,
      missingRequirements,
      definitionGaps,
    }
    return [kind, availability] as const
  })
  const byKind = Object.fromEntries(byKindEntries) as Record<
    CanonicalPlayerCommandKind,
    FrontendCommandAvailability
  >

  const byFamily = Object.fromEntries(
    FRONTEND_COMMAND_FAMILIES.map((family) => {
      const commands = CANONICAL_PLAYER_COMMAND_KINDS.filter(
        (kind) => commandFamily(kind) === family,
      )
      return [family, {
        family,
        commandKinds: commands,
        supportedCount: commands.filter((kind) => byKind[kind].supported).length,
        routeAvailableCount: commands.filter((kind) => byKind[kind].routeAvailable).length,
      }] as const
    }),
  ) as unknown as Record<
    FrontendCommandFamily,
    FrontendCommandFamilyAvailability
  >

  return { byKind, byFamily }
}

export function selectV2FrontendReadinessConstants(
  runtimeRequirements: FrontendCommandRequirementReadiness = {},
): DeepReadonly<Pick<FrontendGameplaySnapshot, 'commands' | 'definitionCoverage' | 'persistence'>> {
  return deepFreeze({
    commands: selectFrontendCommandAvailability({
      ...runtimeRequirements,
      'compatibility-tuning': true,
      'quantum-leap-port': true,
      'stored-time-cheater-carrier': true,
    }, V2_FRONTEND_DEFINITION_COVERAGE),
    definitionCoverage: V2_FRONTEND_DEFINITION_COVERAGE,
    persistence: V2_FRONTEND_PERSISTENCE_READINESS,
  })
}

function definitionGapsForCommand(
  kind: CanonicalPlayerCommandKind,
  coverage: Readonly<FrontendDefinitionCoverage>,
): readonly string[] {
  switch (kind) {
    case 'dream.purchase-upgrade':
    case 'dream.request-reset':
    case 'dream.request-black-hole-reset':
      return coverage.domains['dream-upgrades'].gaps
    case 'reality.purchase-upgrade':
      return coverage.domains['reality-upgrades'].gaps
    case 'quantum.purchase-upgrade':
      return coverage.domains['quantum-upgrades'].gaps
    default:
      return EMPTY_GAPS
  }
}

function commandFamily(kind: CanonicalPlayerCommandKind): FrontendCommandFamily {
  const family = kind.slice(0, kind.indexOf('.'))
  if (FRONTEND_COMMAND_FAMILIES.some((candidate) => candidate === family)) {
    return family as FrontendCommandFamily
  }
  throw new Error(`Unknown canonical command family '${family}'.`)
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value as DeepReadonly<T>
  }
  for (const nested of Object.values(value)) deepFreeze(nested)
  return Object.freeze(value) as DeepReadonly<T>
}
