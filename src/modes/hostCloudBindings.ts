import type { SaveStorageAdapter } from '../save/repository'
import { sha256Utf8 } from '../save/automaticPurchaseEvidence'
import { MODE_CLOUD_NAMESPACES, type ModeCloudCoordinator, type ModeCloudPort } from './modeCloud'
import type { GameMode } from './modeSaveStore'

/** Transport is account-owned by the host. compareAndPublish must refuse a
 * changed remote version; this API cannot silently fall back to an old public
 * Cloud filename. Mobile hosts without a Cloud provider omit this composition. */
export interface ModeCloudProvider {
  read(key: string): Promise<string | null>
  readBackups(key: string): Promise<readonly string[]>
  compareAndPublish(key: string, expected: string | null, text: string): Promise<void>
}
export function bindModeCloudTransport(options: {
  provider: ModeCloudProvider
  account: string
  identity(): string
  local: Pick<SaveStorageAdapter, 'exists' | 'readText' | 'writeText'>
  assertWriter(): void | Promise<void>
  choose(mode: GameMode, local: string, remote: string): Promise<'local' | 'cloud'>
}): ConstructorParameters<typeof ModeCloudCoordinator>[1] {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(options.account)) throw Error('Invalid mode Cloud account identity.')
  const identity = () => { if (options.identity() !== options.account) throw Error('Cloud account changed; reopen this installation.') }
  const open = (mode: GameMode): ModeCloudPort => {
    const key = `${options.account}/${MODE_CLOUD_NAMESPACES[mode]}`
    const marker = `cloud-local/${options.account}/${MODE_CLOUD_NAMESPACES[mode]}.sha256`
    let readSucceeded = false
    const accepted = async () => await options.local.exists(marker) ? options.local.readText(marker) : null
    return {
      async readForUpgrade() { identity(); const text = await options.provider.read(key); identity(); return text },
      async read() {
        readSucceeded = false; identity()
        const text = await options.provider.read(key)
        const hash = text === null ? null : await sha256Utf8(text)
        const known = await accepted(); identity(); readSucceeded = true
        return text === null || hash === known ? null : text
      },
      async readBackups() { identity(); const texts = await options.provider.readBackups(key); identity(); return texts },
      choose: (local, remote) => { identity(); return options.choose(mode, local, remote) },
      async acknowledge(text) {
        identity(); if (await options.provider.read(key) !== text) throw Error('Cloud changed before acknowledgement.')
        const hash = await sha256Utf8(text)
        await options.assertWriter(); identity()
        await options.local.writeText(marker, hash)
        if (await options.local.readText(marker) !== hash) throw Error('Cloud receipt could not be verified.')
      },
      async publish(text) {
        identity(); if (!readSucceeded) throw Error('Cloud startup read is unresolved.')
        const previous = await options.provider.read(key)
        if (previous !== null && await sha256Utf8(previous) !== await accepted()) throw Error('Unresolved Cloud download.')
        await options.assertWriter(); identity()
        await options.provider.compareAndPublish(key, previous, text)
        identity()
        const hash = await sha256Utf8(text)
        await options.local.writeText(marker, hash)
      },
    }
  }
  return { classic: open('classic'), modern: open('modern') }
}
