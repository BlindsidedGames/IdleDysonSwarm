import { describe, expect, test } from 'vitest'
import type {
  FirstLaunchMigrationResult,
  SaveCommitTarget,
  SaveRepository,
} from '../save/repository'
import type { PreparedSave } from '../save/prepare'
import {
  MOBILE_LIFECYCLE_POLICY,
} from '../simulation/lifecycleAwayTime'
import type {
  BrowserRuntimeFoundationOptions,
  BrowserUiRuntimeFoundation,
} from '../ui/runtime'
import {
  createProductionBrowserComposition,
} from './productionBrowserComposition'

describe('production browser composition', () => {
  test('binds authentic first-run data, explicit host authority, and shared browser clocks outside React', async () => {
    const lifecycleClock = new RecordingLifecycleClock(
      '2026-07-29T03:04:05.000Z',
    )
    const monotonicClock = {
      nowMilliseconds: () => 123,
    }
    let captured:
      | Readonly<BrowserRuntimeFoundationOptions>
      | undefined
    const runtime = Object.freeze({
      marker: 'runtime-facade',
    }) as unknown as BrowserUiRuntimeFoundation

    const composition = createProductionBrowserComposition({
      lifecycleClock,
      monotonicClock,
      entitlementDocument: entitlementDocument('false'),
      createRuntime: (options) => {
        captured = options
        return runtime
      },
    })

    expect(composition.runtime).toBe(runtime)
    expect(composition.saveSchemaVersion).toBe(12)
    expect(captured).toBeDefined()
    if (captured === undefined) return
    expect(captured.lifecyclePolicy).toBe(MOBILE_LIFECYCLE_POLICY)
    expect(captured.allowedExternalOrigins).toEqual([])
    expect(captured.lifecycleClock).toBe(lifecycleClock)
    expect(captured.activeTimeClock).toBe(monotonicClock)
    expect(lifecycleClock.samples).toBe(0)

    const repository = new FirstRunRepository()
    const application = captured.createApplication(repository)
    const started = await application.start()
    expect(started).toMatchObject({
      phase: 'ready',
      source: 'first-run',
    })
    if (started.phase !== 'ready') return
    expect(
      started.state.gameState.meta.createdAtLegacyText,
    ).toBe('2026-07-29T03:04:05.000Z')
    expect(started.state.entitlements).toEqual({
      permanentDoubleIp: false,
    })
    expect(repository.commitTargets).toEqual(['development'])
    expect(lifecycleClock.samples).toBe(1)

    expect(composition.sampleUtc()).toBe(
      '2026-07-29T03:04:05.000Z',
    )
    expect(captured.nowUtcMilliseconds?.()).toBe(
      Date.parse('2026-07-29T03:04:05.000Z'),
    )
    expect(lifecycleClock.samples).toBe(3)
  })
})

class RecordingLifecycleClock {
  readonly #serializedUtcText: string
  samples = 0

  constructor(serializedUtcText: string) {
    this.#serializedUtcText = serializedUtcText
  }

  sample() {
    this.samples += 1
    return Object.freeze({
      utcMilliseconds: Date.parse(this.#serializedUtcText),
      serializedUtcText: this.#serializedUtcText,
    })
  }
}

class FirstRunRepository implements SaveRepository {
  readonly commitTargets: SaveCommitTarget[] = []

  async hasCurrent(): Promise<boolean> {
    return false
  }

  async loadCurrent(): Promise<null> {
    return null
  }

  async migrateLegacyOnFirstLaunch():
    Promise<FirstLaunchMigrationResult> {
    return { status: 'no-legacy-save' }
  }

  async commit(
    save: PreparedSave,
    target: SaveCommitTarget = 'development',
  ): Promise<PreparedSave> {
    this.commitTargets.push(target)
    return save
  }
}

function entitlementDocument(content: string) {
  return {
    querySelectorAll: () => [
      {
        getAttribute: (name: string) =>
          name === 'content' ? content : null,
      },
    ],
  }
}
