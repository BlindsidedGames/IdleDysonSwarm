import baseConfig from '../../vite.config'
import type { ConfigEnv, Plugin, UserConfig } from 'vite'

const configEnv: ConfigEnv = {
  command: 'build',
  mode: 'performance',
  isSsrBuild: false,
  isPreview: false,
}

const resolved = typeof baseConfig === 'function'
  ? await baseConfig(configEnv)
  : baseConfig

function laneProbePlugin(): Plugin {
  return {
    name: 'idle-dyson-temporary-lane-probe',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/src/simulation/gameStep.ts')) {
        const signature = /export function advanceGame\([\s\S]*?\n\): GameStepResult \{\n/
        const match = signature.exec(code)
        if (match === null) throw new Error('Shared game-step probe start anchor missing.')
        const bodyStart = match.index + match[0].length
        const bodyEnd = code.indexOf('\n}\n\nfunction finish(', bodyStart)
        if (bodyEnd < 0) throw new Error('Shared game-step probe end anchor missing.')
        return `${code.slice(0, bodyStart)}  const gameStepStartedAt = performance.now()\n  try {\n${code.slice(bodyStart, bodyEnd)}\n  } finally {\n    globalThis.__idleDysonLaneProbeV1?.record(\n      'canonical-game-step',\n      performance.now() - gameStepStartedAt,\n    )\n  }${code.slice(bodyEnd)}`
      }
      if (id.endsWith('/src/application/frontendSnapshot.ts')) {
        const derivedPattern = /const\s+derived\s*=\s*selectDerivedFacts\(\s*state,\s*context,\s*previous\?\.derived,\s*context\.previewDemand\s*\?\?\s*'all',?\s*\)/
        const derivedReplacement = `const derivedStartedAt = performance.now()\n  const derived = selectDerivedFacts(\n    state,\n    context,\n    previous?.derived,\n    context.previewDemand ?? 'all',\n  )\n  globalThis.__idleDysonLaneProbeV1?.record('projection-derived', performance.now() - derivedStartedAt)`
        const previewsPattern = /const\s+previews\s*=\s*selectGameplayPreviews\(\s*state,\s*context,\s*context\.previousPreviews,\s*context\.previewDemand\s*\?\?\s*'all',?\s*derived,?\s*\)/
        const previewsReplacement = `const previewsStartedAt = performance.now()\n  const previews = selectGameplayPreviews(\n    state,\n    context,\n    context.previousPreviews,\n    context.previewDemand ?? 'all',\n    derived,\n  )\n  globalThis.__idleDysonLaneProbeV1?.record('projection-preview', performance.now() - previewsStartedAt)`
        if (!derivedPattern.test(code) || !previewsPattern.test(code)) {
          throw new Error('Projection sublane probe anchor missing.')
        }
        return code
          .replace(derivedPattern, derivedReplacement)
          .replace(previewsPattern, previewsReplacement)
      }
      if (id.endsWith('/src/application/gameApplication.ts')) {
        const preparePattern = /const prepared = this\.requireSession\(\)\.prepare\(target\.state\)\s*committed = await this\.options\.repository\.commit\(prepared\)/
        const prepareReplacement = `const checkpointPrepareStartedAt = performance.now()
        const prepared = this.requireSession().prepare(target.state)
        globalThis.__idleDysonLaneProbeV1?.record('checkpoint-prepare', performance.now() - checkpointPrepareStartedAt)
        const checkpointCommitStartedAt = performance.now()
        committed = await this.options.repository.commit(prepared)
        globalThis.__idleDysonLaneProbeV1?.record('checkpoint-commit', performance.now() - checkpointCommitStartedAt)`
        if (!preparePattern.test(code)) {
          throw new Error('Checkpoint application probe anchor missing.')
        }
        return code.replace(preparePattern, prepareReplacement)
      }
      if (id.endsWith('/src/save/repository.ts')) {
        const encodePattern = /const normalized = PreparedSave\.fromDecoded\(\s*save\.copyValidatedState\(\),\s*\)\s*const encoded = serializeWebSave\(normalized\.copyValidatedState\(\)\)/
        const encodeReplacement = `const checkpointEncodeStartedAt = performance.now()
    const normalized = PreparedSave.fromDecoded(
      save.copyValidatedState(),
    )
    const encoded = serializeWebSave(normalized.copyValidatedState())
    globalThis.__idleDysonLaneProbeV1?.record('checkpoint-normalize-and-encode', performance.now() - checkpointEncodeStartedAt)`
        if (!encodePattern.test(code)) {
          throw new Error('Checkpoint repository probe anchor missing.')
        }
        return code.replace(encodePattern, encodeReplacement)
      }
      if (!id.endsWith('/src/ui/runtime/browserRuntimeFoundation.ts')) return null
      const activeReplacement = `deliver: async (milliseconds) => {\n        const startedAt = performance.now()\n        try {\n          return await router.runLocallyFenced(() =>\n            coordinator.advanceActive(milliseconds),\n          )\n        } finally {\n          globalThis.__idleDysonLaneProbeV1?.record('canonical-active', performance.now() - startedAt)\n        }\n      },`
      const publishReplacement = `const projectionStartedAt = performance.now()\n    const projected = graph.application.frontendSnapshot(this.gameplayPreviewDemand)\n    globalThis.__idleDysonLaneProbeV1?.record('frontend-projection', performance.now() - projectionStartedAt)\n    const publicationStartedAt = performance.now()\n    this.frontendSnapshots.publish(projected, force, delivery)\n    globalThis.__idleDysonLaneProbeV1?.record('snapshot-publication', performance.now() - publicationStartedAt)`
      const checkpointReplacement = `checkpoint: async () => {
          const checkpointStartedAt = performance.now()
          try {
            return await router.run(() => application.checkpoint())
          } finally {
            globalThis.__idleDysonLaneProbeV1?.record('periodic-checkpoint', performance.now() - checkpointStartedAt)
          }
        },`
      const activePattern = /deliver:\s*\(milliseconds\)\s*=>\s*router\.runLocallyFenced\(\(\)\s*=>\s*coordinator\.advanceActive\(milliseconds\),?\s*\),/
      const publishPattern = /this\.frontendSnapshots\.publish\(\s*graph\.application\.frontendSnapshot\(this\.gameplayPreviewDemand\),\s*force,\s*delivery,?\s*\)/
      const checkpointPattern = /checkpoint:\s*\(\)\s*=>\s*router\.run\(\(\)\s*=>\s*application\.checkpoint\(\)\),/
      if (!activePattern.test(code) || !publishPattern.test(code) || !checkpointPattern.test(code)) {
        throw new Error('Temporary lane probe could not find its instrumentation anchors.')
      }
      return code
        .replace(activePattern, activeReplacement)
        .replace(publishPattern, publishReplacement)
        .replace(checkpointPattern, checkpointReplacement)
    },
  }
}

export default {
  ...(resolved as UserConfig),
  plugins: [...(resolved.plugins ?? []), laneProbePlugin()],
  build: {
    ...(resolved.build ?? {}),
    outDir: 'output/performance/lane-dist',
    emptyOutDir: true,
  },
}
