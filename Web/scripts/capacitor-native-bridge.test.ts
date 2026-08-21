import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function read(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
}

const bridgeMethods = [
  'metadata',
  'currentLifecycle',
  'fileExists',
  'readText',
  'writeText',
  'replaceAtomically',
  'copy',
  'discoverUnitySaveCandidates',
  'exportDiagnostics',
  'getStoreProducts',
  'purchaseStoreProduct',
  'restoreStorePurchases',
  'readEntitlementOwnership',
  'refreshEntitlementOwnership',
  'promoteAutomaticUnityPurchaseEvidence',
] as const

describe('Capacitor first-party native bridge', () => {
  const android = read(
    'hosts/capacitor/android/app/src/main/java/com/blindsidedgames/idledysonswarm/IdleDysonNativePlugin.kt',
  )
  const ios = read(
    'hosts/capacitor/ios/App/App/IdleDysonNativePlugin.swift',
  )

  it('registers the same normalized plugin and method surface on both hosts', () => {
    expect(android).toContain('@CapacitorPlugin(name = "IdleDysonNative")')
    expect(ios).toContain('public let jsName = "IdleDysonNative"')
    for (const method of bridgeMethods) {
      expect(android).toContain(`fun ${method}(`)
      expect(ios).toContain(`name: "${method}"`)
      expect(ios).toContain(`func ${method}(`)
    }
    expect(read(
      'hosts/capacitor/android/app/src/main/java/com/blindsidedgames/idledysonswarm/MainActivity.java',
    )).toContain('registerPlugin(IdleDysonNativePlugin.class)')
    expect(read('hosts/capacitor/ios/App/App/SceneDelegate.swift'))
      .toContain('registerPluginInstance(IdleDysonNativePlugin())')
  })

  it('roots Web writes separately and keeps Unity discovery read-only', () => {
    for (const source of [android, ios]) {
      expect(source).toContain('web-runtime-v1')
      expect(source).toContain('idle_dyson_swarm_save.txt')
      expect(source).toContain('unity-readonly:')
      expect(source).toContain('automatic-same-device-unity')
      expect(source).toMatch(/invalidPath|safe relative paths/)
    }
    expect(android).toContain('context.getExternalFilesDir(null)')
    expect(android).toContain('StandardCopyOption.ATOMIC_MOVE')
    expect(ios).toContain('for: .documentDirectory')
    expect(ios).toContain('replaceItemAt(')

    const discoverySlices = [android, ios].map((source) =>
      source.slice(
        source.indexOf('discoverUnitySaveCandidates'),
        source.indexOf('exportDiagnostics'),
      ),
    )
    for (const discovery of discoverySlices) {
      expect(discovery).not.toMatch(/removeItem|delete\(|writeText|write\(to:/)
    }
  })

  it('normalizes mobile lifecycle callbacks without treating recreation as termination', () => {
    expect(android).toContain('handleOnResume() = publishLifecycle("active")')
    expect(android).toContain('handleOnPause() = publishLifecycle("focus-lost")')
    expect(android).toContain('handleOnStop() = publishLifecycle("background")')
    expect(android).toContain('if (activity.isFinishing) publishLifecycle("terminating")')
    expect(android).not.toContain(
      'override fun handleOnDestroy() = publishLifecycle("terminating")',
    )
    expect(ios).toContain('UIApplication.shared.applicationState')
    expect(ios).toContain('UIApplication.didBecomeActiveNotification')
    expect(ios).toContain('UIApplication.willResignActiveNotification')
    expect(ios).toContain('UIApplication.didEnterBackgroundNotification')
    expect(ios).toContain('UIApplication.willTerminateNotification')
    for (const source of [android, ios]) {
      expect(source).toMatch(/lifecyclePhase == phase|lifecyclePhase != phase/)
    }
  })

  it('publishes Android system-bar and cutout insets in CSS pixels', () => {
    expect(android).toContain('WindowInsetsCompat.Type.systemBars()')
    expect(android).toContain('WindowInsetsCompat.Type.displayCutout()')
    expect(android).toContain('systemInsetsChanged')
    expect(android).toContain('/ density')
  })

  it('binds first-party mobile Stores without exposing receipts or purchase tokens', () => {
    const androidStore = read(
      'hosts/capacitor/android/app/src/main/java/com/blindsidedgames/idledysonswarm/GooglePlayStore.kt',
    )
    const androidCache = read(
      'hosts/capacitor/android/app/src/main/java/com/blindsidedgames/idledysonswarm/NativeEntitlementCache.kt',
    )
    const iosStore = read('hosts/capacitor/ios/App/App/IdleDysonStoreKit.swift')
    const androidBuild = read('hosts/capacitor/android/app/build.gradle')
    const iosProject = read(
      'hosts/capacitor/ios/App/App.xcodeproj/project.pbxproj',
    )

    expect(androidBuild).toContain('com.android.billingclient:billing:9.1.0')
    expect(read('hosts/capacitor/android/app/src/main/AndroidManifest.xml'))
      .toContain('android:allowBackup="false"')
    expect(androidStore).toContain('BillingClient.newBuilder')
    expect(androidStore).toContain('enableAutoServiceReconnection()')
    expect(androidStore).toContain('queryProductDetailsAsync')
    expect(androidStore).toContain('acknowledgePurchase')
    expect(androidStore).toContain('consumeAsync')
    expect(androidStore).toContain('Purchase.PurchaseState.PENDING')
    expect(androidStore).toContain('deliverDetachedPurchase(purchase)')
    expect(androidStore).toContain('Provider updates outlive renderer calls')
    expect(iosStore).toContain('import StoreKit')
    expect(iosStore).toContain('Product.products(for:')
    expect(iosStore).toContain('Transaction.currentEntitlements')
    expect(iosStore).toContain('Transaction.updates')
    expect(iosStore).toContain('AppStore.sync()')
    expect(iosStore).toContain('await transaction.finish()')
    expect(iosStore).toContain('kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly')
    expect(iosStore).toContain('kSecAttrSynchronizable as String: false')
    expect(iosProject).toContain('IdleDysonStoreKit.swift in Sources')

    for (const source of [android, ios]) {
      expect(source).toContain('promoteAutomaticUnityPurchaseEvidence')
      expect(source).toContain('providerAvailable')
      expect(source).not.toContain('receiptData')
      expect(source).not.toContain('purchaseToken')
    }
    for (const source of [androidCache, ios]) {
      expect(source).toContain('automatic-same-device-unity')
      expect(source).toContain('unity-persistent-data-save')
      expect(source).toContain('contentSha256')
      expect(source).not.toContain('absolutePath')
    }

    expect(android).toContain('${context.packageName}.v2.playerprefs')
    expect(android).toContain('getInt("doubleip", 0) == 1')
    expect(android).toContain('automaticUnityEvidenceTokens::remove')
    expect(android).toContain('sha256(text)')
    expect(android).toContain('put("id", candidateId)')
    expect(android).toContain('put("sourcePath", "unity-readonly:$candidateId")')
    expect(android).toContain('put("opaqueSourceIdentifier", candidateId)')
    expect(androidCache).toContain('.commit()')
    expect(androidCache).not.toContain('.apply()')
    expect(ios).toContain('UserDefaults.standard.integer(forKey: "doubleip") == 1')
    expect(ios).toContain('automaticUnityEvidenceTokens.removeValue')
    expect(ios).toContain('SHA256.hash(data: data)')
    expect(ios).toContain('"id": candidateId')
    expect(ios).toContain('"sourcePath": "unity-readonly:\\(candidateId)"')
    expect(ios).toContain('"opaqueSourceIdentifier": candidateId')
    expect(ios).not.toContain('call.jsObjectRepresentation')

    const promotionSlices = [
      android.slice(
        android.indexOf('fun promoteAutomaticUnityPurchaseEvidence'),
        android.indexOf('override fun handleOnResume'),
      ),
      ios.slice(
        ios.indexOf('func promoteAutomaticUnityPurchaseEvidence'),
        ios.indexOf('private func resolveOwnership'),
      ),
    ]
    for (const promotion of promotionSlices) {
      expect(promotion).not.toContain('permanentDoubleInfinityPoints')
      expect(promotion).not.toContain('contentSha256')
      expect(promotion).not.toContain('saveSchemaVersion')
    }
  })

  it('limits diagnostics to approved JSON fields', () => {
    for (const source of [android, ios]) {
      expect(source).toContain('ids.devoptions')
      expect(source).toContain('ids.doubleip')
      expect(source).toContain('providerAvailable')
      expect(source).toContain('saveSchemaVersion')
      expect(source).toContain('canonicalRevision')
      expect(source).not.toContain('receiptData')
      expect(source).not.toContain('purchaseToken')
    }
  })
})
