import { describe, expect, test } from 'vitest'
import { createStage7V2WorkerLauncherOnDemand } from './access'

describe('Stage 7 production on-demand access seam', () => {
  test('keeps access, launcher construction, and worker start distinct', async () => {
    const loaded = await createStage7V2WorkerLauncherOnDemand()
    expect(loaded.status).toBe('launcher-ready')
    if (loaded.status !== 'launcher-ready') return
    await expect(loaded.launcher.start()).resolves.toEqual({
      status: 'resumable-failure',
      reason: 'load-failed',
      storedTimeUntouched: true,
    })
  })
})
