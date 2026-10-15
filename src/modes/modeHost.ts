import { GameModeController, type ModeSessionFactory } from './modeController'
import { ModeSaveStore } from './modeSaveStore'
import { discoverModeUpgrade, type UpgradeDiscoveryOptions } from './upgradeDiscovery'
import type { ModeCloudCoordinator } from './modeCloud'

/** The host owns one storage lease and supplies read-only historical discovery.
 * No source is selected as absent merely because it failed to decode or read. */
export function createModeHost(options: {
  store: ModeSaveStore
  factories: Readonly<Record<'classic' | 'modern', ModeSessionFactory>>
  discovery: UpgradeDiscoveryOptions
  convertClassic: (text: string) => Promise<string> | string
  cloud?: ModeCloudCoordinator
}) {
  const cloud = options.cloud
  const controller = new GameModeController(options.store, options.factories, options.convertClassic, cloud ? {
    beforeOpen: mode => cloud.resolve(mode),
    checkpointSaved: (mode, text, current) => cloud.publish(mode, text, current),
    finalCheckpointSaved: (mode, text) => cloud.publish(mode, text, () => true),
    afterClose: mode => cloud.drain(mode),
  } : {})
  return {
    controller,
    async start() {
      if (!await options.store.inspect()) {
        const discovery = await discoverModeUpgrade({ ...options.discovery,
          additionalSources: [...(options.discovery.additionalSources ?? []), ...(cloud?.discoverySources() ?? [])] })
        await options.store.initialize(discovery)
      }
      await controller.start()
    },
  }
}
