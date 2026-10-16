import type { NativeHostBridgeApi } from '../platform/nativeHostBridge'
import { createNativeHostEnvironment } from '../platform/nativeHostBridge'
import { IndexedDbBrowserSaveDatabase } from '../platform/browserSaveDatabase'
import { IndexedDbSaveStorageAdapter } from '../platform/indexedDbSaveStorage'
import { BrowserExpiringWriterAuthority } from '../platform/browserWriterLease'
import { createBrowserReloadWriterIdentity } from '../platform/browserReloadWriterIdentity'
import { SingleHostSessionWriterAuthority } from '../platform/singleHostSessionWriterAuthority'
import { NATIVE_WEB_SAVE_PATHS } from '../platform/platformSaveStorage'
import type { SaveStorageAdapter } from '../save/repository'
import { PRODUCTION_BROWSER_DATABASE_NAME, PRODUCTION_BROWSER_SAVE_PATHS } from '../browser/productionBrowserStorage'
import { REWORK_BETA_DATABASE_NAME, REWORK_BETA_SAVE_PATHS } from '../browser/reworkBetaStorage'
import { DUAL_MODE_DATABASE_NAME } from './hostStorageBindings'
import { rootedUpgradeSource, unityUpgradeSource } from './upgradeDiscovery'
import { isVerifiedAutomaticSameDeviceUnityCandidate, sha256Utf8 } from '../save/automaticPurchaseEvidence'
import { prepareIdb1Save } from '../../classic/src/save/prepare'

export async function openProductionModeStorage(bridge: NativeHostBridgeApi | null) {
  if (bridge) {
    const metadata = await bridge.metadata()
    if (metadata.saveStorageNamespace !== 'idleds-dual-modes-v1') throw Error('The native save host must support separate Classic and Modern files.')
    const authority = new SingleHostSessionWriterAuthority()
    if (!(await authority.acquire()).acquired) throw Error('Another session owns these saves.')
    const scoped = (bucket: 'classic' | 'modern' | 'beta' | 'beta-offline' | 'host'): SaveStorageAdapter => ({
      exists: path => bridge.exists(`${bucket}/${path}`), readText: path => bridge.readText(`${bucket}/${path}`),
      writeText: (path, text) => authority.runAuthoritativeOperation(async () => { await authority.assertWritable(); await bridge.writeText(`${bucket}/${path}`, text) }),
      copy: (a, b) => authority.runAuthoritativeOperation(async () => { await authority.assertWritable(); await bridge.copy(`${bucket}/${a}`, `${bucket}/${b}`) }),
      replaceAtomically: (a, b) => authority.runAuthoritativeOperation(async () => { await authority.assertWritable(); await bridge.replaceAtomically(`${bucket}/${a}`, `${bucket}/${b}`) }),
      discoverLegacyCandidates: async () => [],
    })
    const storage = scoped('host'), classic = scoped('classic'), modern = scoped('modern'), beta = scoped('beta')
    const environment = createNativeHostEnvironment(bridge)
    const discoverUnity = async () => {
      const candidates = await environment.migration.discoverCandidates()
      for (const candidate of candidates) {
        // Only native-attested, same-device originals may restore ownership.
        // Portable/manual imports never receive this capability.
        if (!bridge.promoteAutomaticUnityPurchaseEvidence || !isVerifiedAutomaticSameDeviceUnityCandidate(candidate)) continue
        const state = prepareIdb1Save(candidate.text).prepared.copyValidatedState()
        if (state.doubleIp === true && typeof state.saveVersion === 'number' && Number.isSafeInteger(state.saveVersion)) {
          await bridge.promoteAutomaticUnityPurchaseEvidence({ ...candidate.provenance,
            permanentDoubleInfinityPoints: true, contentSha256: await sha256Utf8(candidate.text), saveSchemaVersion: state.saveVersion })
        }
      }
      // Native proof tokens are deliberately ephemeral, while discovery must
      // compare stable source identities and exact bytes before committing.
      return candidates.map((candidate, index) => ({ ...candidate, id: `native-unity-${index}` }))
    }
    return { storage, files: { classic: { storage: classic, paths: NATIVE_WEB_SAVE_PATHS }, modern: { storage: modern, paths: NATIVE_WEB_SAVE_PATHS } },
      discovery: { publicClassic: rootedUpgradeSource('released-classic-native', 'classic', classic, NATIVE_WEB_SAVE_PATHS),
        modernBeta: rootedUpgradeSource('modern-native', 'modern', modern, NATIVE_WEB_SAVE_PATHS),
        legacyUnity: unityUpgradeSource(discoverUnity),
        additionalSources: [rootedUpgradeSource('retained-modern-beta-native', 'modern', beta, NATIVE_WEB_SAVE_PATHS),
          ...(bridge.target === 'electron' ? [rootedUpgradeSource('retained-modern-beta-offline', 'modern', scoped('beta-offline'), NATIVE_WEB_SAVE_PATHS)] : [])] },
      assertWriter: async () => { await authority.assertWritable() }, close: async () => { await authority.shutdown() } }
  }
  const writerIdentity = createBrowserReloadWriterIdentity({ storageKey: `${DUAL_MODE_DATABASE_NAME}:writer-tab-token` })
  const opened = [DUAL_MODE_DATABASE_NAME, PRODUCTION_BROWSER_DATABASE_NAME, REWORK_BETA_DATABASE_NAME].map(name => {
    const database = new IndexedDbBrowserSaveDatabase(name)
    const authority = new BrowserExpiringWriterAuthority({ database, ...writerIdentity })
    return { database, authority, storage: new IndexedDbSaveStorageAdapter({ database, lease: authority }) }
  })
  try {
    for (const { authority } of opened) if (!(await authority.acquire()).acquired) throw Error('Another tab owns these saves. Close it before switching game modes.')
  } catch (error) { await Promise.all(opened.map(async x => { await x.authority.shutdown() })); throw error }
  const [metadata, classic, modern] = opened
  return { storage: metadata.storage,
    files: { classic: { storage: classic.storage, paths: PRODUCTION_BROWSER_SAVE_PATHS }, modern: { storage: modern.storage, paths: REWORK_BETA_SAVE_PATHS } },
    discovery: { publicClassic: rootedUpgradeSource('released-classic-browser', 'classic', classic.storage, PRODUCTION_BROWSER_SAVE_PATHS),
      modernBeta: rootedUpgradeSource('modern-browser', 'modern', modern.storage, REWORK_BETA_SAVE_PATHS),
      legacyUnity: unityUpgradeSource(() => classic.database.listLegacyCandidates()), additionalSources: [] },
    assertWriter: async () => { for (const { authority } of opened) await authority.assertWritable() },
    close: async () => { await Promise.all(opened.map(async x => { await x.authority.shutdown() })) } }
}
