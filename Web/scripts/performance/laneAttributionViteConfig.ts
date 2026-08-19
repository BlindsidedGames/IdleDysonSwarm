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
      if (id.endsWith('/src/application/canonicalGameApplication.ts')) {
        const replacement = `const eventStartedAt = performance.now()\n  const eventResult = advanceEventTime({\n    startingState: transferEventTimeModelOwnership(\n      CanonicalEventTimeModel.fromOwnedState(\n        eventCarrier(candidate),\n        context,\n      ),\n    ),\n    cloneStartingState: false,\n    durationSeconds: seconds,\n    automationIntervalSeconds: context.automationIntervalSeconds,\n    automationTimeUntilNextEvent:\n      candidate.gameState.timeline.automationTimeUntilNextEvent,\n    automationPolicy,\n    infinityMinimumCycleSeconds: minimumCycleSeconds,\n    processingBudgetMilliseconds: 0,\n    cancelRequested,\n  })\n  globalThis.__idleDysonLaneProbeV1?.record('canonical-event-model', performance.now() - eventStartedAt)\n  return eventResult`
        const pattern = /return\s+advanceEventTime\(\{\s*startingState:\s*transferEventTimeModelOwnership\(\s*CanonicalEventTimeModel\.fromOwnedState\(\s*eventCarrier\(candidate\),\s*context,?\s*\),\s*\),\s*cloneStartingState:\s*false,\s*durationSeconds:\s*seconds,\s*automationIntervalSeconds:\s*context\.automationIntervalSeconds,\s*automationTimeUntilNextEvent:\s*candidate\.gameState\.timeline\.automationTimeUntilNextEvent,\s*automationPolicy,\s*infinityMinimumCycleSeconds:\s*minimumCycleSeconds,\s*processingBudgetMilliseconds:\s*0,\s*cancelRequested,?\s*\}\)/
        if (!pattern.test(code)) throw new Error('Event-model probe anchor missing.')
        return code.replace(pattern, replacement)
      }
      if (id.endsWith('/src/application/frontendSnapshot.ts')) {
        const derivedPattern = /const\s+derived\s*=\s*selectDerivedFacts\(\s*state,\s*context,\s*previous\?\.derived,\s*context\.previewDemand\s*\?\?\s*'all',?\s*\)/
        const derivedReplacement = `const derivedStartedAt = performance.now()\n  const derived = selectDerivedFacts(\n    state,\n    context,\n    previous?.derived,\n    context.previewDemand ?? 'all',\n  )\n  globalThis.__idleDysonLaneProbeV1?.record('projection-derived', performance.now() - derivedStartedAt)`
        const previewsPattern = /const\s+previews\s*=\s*selectGameplayPreviews\(\s*state,\s*context,\s*context\.previousPreviews,\s*context\.previewDemand\s*\?\?\s*'all',?\s*\)/
        const previewsReplacement = `const previewsStartedAt = performance.now()\n  const previews = selectGameplayPreviews(\n    state,\n    context,\n    context.previousPreviews,\n    context.previewDemand ?? 'all',\n  )\n  globalThis.__idleDysonLaneProbeV1?.record('projection-preview', performance.now() - previewsStartedAt)`
        if (!derivedPattern.test(code) || !previewsPattern.test(code)) {
          throw new Error('Projection sublane probe anchor missing.')
        }
        return code
          .replace(derivedPattern, derivedReplacement)
          .replace(previewsPattern, previewsReplacement)
      }
      if (!id.endsWith('/src/ui/runtime/browserRuntimeFoundation.ts')) return null
      const activeReplacement = `deliver: async (milliseconds) => {\n        const startedAt = performance.now()\n        try {\n          return await router.run(() => coordinator.advanceActive(milliseconds))\n        } finally {\n          globalThis.__idleDysonLaneProbeV1?.record('canonical-active', performance.now() - startedAt)\n        }\n      },`
      const publishReplacement = `const projectionStartedAt = performance.now()\n    const projected = graph.application.frontendSnapshot(this.gameplayPreviewDemand)\n    globalThis.__idleDysonLaneProbeV1?.record('frontend-projection', performance.now() - projectionStartedAt)\n    const publicationStartedAt = performance.now()\n    this.frontendSnapshots.publish(projected, force, delivery)\n    globalThis.__idleDysonLaneProbeV1?.record('snapshot-publication', performance.now() - publicationStartedAt)`
      const activePattern = /deliver:\s*\(milliseconds\)\s*=>\s*router\.run\(\(\)\s*=>\s*coordinator\.advanceActive\(milliseconds\)\),/
      const publishPattern = /this\.frontendSnapshots\.publish\(\s*graph\.application\.frontendSnapshot\(this\.gameplayPreviewDemand\),\s*force,\s*delivery,?\s*\)/
      if (!activePattern.test(code) || !publishPattern.test(code)) {
        throw new Error('Temporary lane probe could not find its instrumentation anchors.')
      }
      return code
        .replace(activePattern, activeReplacement)
        .replace(publishPattern, publishReplacement)
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
