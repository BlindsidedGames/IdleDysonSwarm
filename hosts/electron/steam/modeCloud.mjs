import { SteamCloud } from './cloud.mjs'

/** Classic resumes the released Cloud filenames and local marker. Modern uses
 * modern-current.idsw / modern-backup-N.idsw in the same account Cloud folder,
 * with an independent local receipt. Neither can publish the other's format. */
export function bindSteamModeCloud(options) {
  return { clouds: {
    classic: new SteamCloud({ ...options, choose: (local, remote) => options.choose('classic', local, remote) }),
    modern: new SteamCloud({ ...options, choose: (local, remote) => options.choose('modern', local, remote), namespace: 'idleds-modern-v1' }),
  } }
}
