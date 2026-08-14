import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { mappingCoverageManifest } from '../game-state/mappingCoverage'
import {
  inspectFrontendDefinitionCoverage,
  selectFrontendReadinessConstants,
} from './frontendSnapshot'
import {
  V2_FRONTEND_DEFINITION_COVERAGE,
  V2_FRONTEND_PERSISTENCE_READINESS,
  selectV2FrontendReadinessConstants,
} from './frontendCommandReadiness'

const READY_REQUIREMENTS = Object.freeze({
  'compatibility-tuning': true,
  'quantum-leap-port': true,
  'runtime-evaluation-port': true,
  'selected-skill-preset-carrier': true,
  'stored-time-commit-first-runner': true,
  'stored-time-cheater-carrier': true,
})

describe('lightweight V2 frontend readiness', () => {
  test('matches the certified catalogs, command support, and persistence policy', () => {
    const v1 = selectFrontendReadinessConstants(READY_REQUIREMENTS)
    const v2 = selectV2FrontendReadinessConstants(READY_REQUIREMENTS)

    expect(V2_FRONTEND_DEFINITION_COVERAGE).toEqual(
      inspectFrontendDefinitionCoverage(),
    )
    expect(v2.commands).toEqual(v1.commands)
    expect(V2_FRONTEND_PERSISTENCE_READINESS).toEqual({
      mappingCoverageComplete: mappingCoverageManifest.coverageComplete,
      canonicalWriteAllowed: mappingCoverageManifest.releaseCanonicalWriteAllowed,
      unmatchedWritePolicy: mappingCoverageManifest.unmatchedWritePolicy,
    })
    expect(v2.definitionCoverage.complete).toBe(true)
  })

  test('does not pull legacy selectors, routers, or schema catalogs into V2 startup', () => {
    const readinessSource = readFileSync(
      new URL('./frontendCommandReadiness.ts', import.meta.url),
      'utf8',
    )
    const playerSupportSource = readFileSync(
      new URL('./canonicalPlayerCommands.ts', import.meta.url),
      'utf8',
    )

    expect(readinessSource).not.toContain("from '../game-state/mappingCoverage'")
    expect(readinessSource).not.toMatch(
      /import\s*\{[^}]*\}\s*from '\.\/frontendSnapshot'/s,
    )
    expect(playerSupportSource).toContain(
      "from './canonicalGameCommandSupport'",
    )
    expect(playerSupportSource).not.toMatch(
      /import\s*\{[^}]*CANONICAL_GAME_COMMAND_SUPPORT[^}]*\}\s*from '\.\/canonicalGameCommands'/s,
    )
  })
})
