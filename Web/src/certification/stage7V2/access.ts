import type { Stage7V2WorkerLauncher } from '../stage7V2Harness'

export type Stage7V2WorkerLauncherAccessResult =
  | Readonly<{
      readonly status: 'launcher-ready'
      readonly launcher: Stage7V2WorkerLauncher
    }>
  | Readonly<{
      readonly status: 'resumable-failure'
      readonly reason: 'identity-load-failed' | 'launcher-load-failed'
      readonly reloadRequired: true
      readonly storedTimeUntouched: true
    }>

/** Startup-inert production seam; import and construction occur only on call. */
export async function createStage7V2WorkerLauncherOnDemand(
): Promise<Stage7V2WorkerLauncherAccessResult> {
  let identity: Readonly<{
    readonly buildId: string
    readonly catalogHash: string
    readonly tuningHash: string
  }>
  try {
    const { getTrustedStoredTimeWorkerIdentityV2 } = await import(
      '../../workers/storedTimeV2/workerIdentityV2'
    )
    const trusted = await getTrustedStoredTimeWorkerIdentityV2(
      import.meta.env.VITE_BUILD_ID,
    )
    identity = Object.freeze({
      buildId: trusted.buildId,
      catalogHash: trusted.catalogHash,
      tuningHash: trusted.tuningHash,
    })
  } catch {
    return accessFailure('identity-load-failed')
  }
  try {
    const { Stage7V2WorkerLauncher: Launcher } = await import('../stage7V2Harness')
    return Object.freeze({
      status: 'launcher-ready',
      launcher: new Launcher({ expectedIdentity: identity }),
    })
  } catch {
    return accessFailure('launcher-load-failed')
  }
}

function accessFailure(
  reason: 'identity-load-failed' | 'launcher-load-failed',
): Stage7V2WorkerLauncherAccessResult {
  return Object.freeze({
    status: 'resumable-failure',
    reason,
    reloadRequired: true,
    storedTimeUntouched: true,
  })
}
