import { SteamCloud } from './cloud.mjs'

/** Explicit composition only. No Steam SDK, account selection, IPC registration
 * or activation is performed. Existing published nonrecursive Auto-Cloud rules
 * do not sync these new subdirectories until separately reviewed/activated. */
export function bindSteamModeCloud(options) {
  const classic = new SteamCloud({ ...options, choose: (local, remote) => options.choose('classic', local, remote), namespace: 'idleds-classic-v1' })
  const modern = new SteamCloud({ ...options, choose: (local, remote) => options.choose('modern', local, remote), namespace: 'idleds-modern-v1' })
  const old = new SteamCloud({ ...options, namespace: undefined })
  return {
    clouds: { classic, modern },
    historicalClassic: {
      id: 'public-classic-steam-cloud', mode: 'classic',
      async read() {
        const primary = await old.readHistorical()
        const backups = await old.readHistoricalBackups()
        return [ ...(primary === null ? [] : [{ id: 'old-cloud:primary', role: 'primary', text: primary }]),
          ...backups.map((text, index) => ({ id: `old-cloud:backup-${index + 1}`, role: 'backup', text })) ]
      },
    },
  }
}
