import { describe, expect, test } from 'vitest'
import {
  CachedVerifiedEntitlementAuthority,
  NoopStoreAdapter,
  type EntitlementOwnershipCache,
  type HostEntitlementOwnership,
  type VerifiedEntitlementRecord,
  type VerifiedEntitlementSource,
} from './contracts'
import {
  DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY,
  DoubleInfinityPointsEffectPreferenceService,
  type DoubleInfinityPointsEffectStorage,
} from './doubleInfinityPointsEffect'
import { RuntimeEntitlementBridge } from './runtimeEntitlements'
import { StorefrontController } from './storefront'

const OWNED = ownership(true, false, false)
const UNOWNED = ownership(false, false, false)

describe('durable offline Double Infinity Points', () => {
  test('keeps verified ownership usable and the effect togglable offline across reload', async () => {
    const cache = new MemoryEntitlementCache()
    const source = new MutableVerifiedSource(OWNED)
    const effectStorage = new MemoryEffectStorage()
    const firstAuthority = authority(source, cache)
    const firstEffect = new DoubleInfinityPointsEffectPreferenceService({
      storage: effectStorage,
    })
    const firstRuntime = new RuntimeEntitlementBridge(
      firstAuthority,
      firstEffect,
    )

    await expect(firstRuntime.initialize()).resolves.toEqual(OWNED)
    expect(firstRuntime.currentDysonEntitlements().permanentDoubleIp)
      .toBe(true)
    source.result = new Error('offline')
    const firstStorefront = storefront(
      firstAuthority,
      firstEffect,
      firstRuntime,
    )
    await firstStorefront.initialize()
    await firstStorefront.toggleDoubleInfinityPoints()

    expect(firstStorefront.getSnapshot()).toMatchObject({
      hostOwnership: OWNED,
      doubleInfinityPointsEnabled: false,
      feedback: {
        kind: 'double-infinity-points-effect-updated',
        enabled: false,
      },
    })
    expect(firstRuntime.currentDysonEntitlements().permanentDoubleIp)
      .toBe(false)
    expect(effectStorage.readEnabled()).toBe(false)

    const reloadedEffect = new DoubleInfinityPointsEffectPreferenceService({
      storage: effectStorage,
    })
    const reloadedAuthority = authority(source, cache)
    const reloadedRuntime = new RuntimeEntitlementBridge(
      reloadedAuthority,
      reloadedEffect,
    )
    await expect(reloadedRuntime.initialize()).resolves.toEqual(OWNED)
    expect(reloadedRuntime.currentDysonEntitlements().permanentDoubleIp)
      .toBe(false)

    const reloadedStorefront = storefront(
      reloadedAuthority,
      reloadedEffect,
      reloadedRuntime,
    )
    await reloadedStorefront.initialize()
    await reloadedStorefront.toggleDoubleInfinityPoints()
    expect(reloadedStorefront.getSnapshot()).toMatchObject({
      hostOwnership: OWNED,
      doubleInfinityPointsEnabled: true,
    })
    expect(reloadedRuntime.currentDysonEntitlements().permanentDoubleIp)
      .toBe(true)
    expect(effectStorage.readEnabled()).toBe(true)
  })

  test('never grants Double IP to an unverified offline installation', async () => {
    const source = new MutableVerifiedSource(new Error('offline'))
    const cache = new MemoryEntitlementCache()
    const effectStorage = new MemoryEffectStorage()
    const effect = new DoubleInfinityPointsEffectPreferenceService({
      storage: effectStorage,
    })
    const runtime = new RuntimeEntitlementBridge(
      authority(source, cache),
      effect,
    )

    await expect(runtime.initialize()).rejects.toThrow('offline')
    expect(runtime.currentOwnership()).toEqual(UNOWNED)
    expect(runtime.currentDysonEntitlements().permanentDoubleIp).toBe(false)

    const controller = storefront(authority(source, cache), effect, runtime)
    await controller.initialize()
    await controller.toggleDoubleInfinityPoints()
    expect(controller.getSnapshot().hostOwnership).toEqual(UNOWNED)
    expect(controller.getSnapshot().doubleInfinityPointsEnabled).toBe(true)
    expect(effectStorage.writes).toBe(0)
  })

  test('retains verified ownership when a later provider refresh fails', async () => {
    const source = new MutableVerifiedSource(OWNED)
    const cache = new MemoryEntitlementCache()
    const verified = authority(source, cache)

    await expect(verified.refreshOwnership()).resolves.toEqual(OWNED)
    source.result = new Error('network unavailable')
    await expect(verified.refreshOwnership()).resolves.toEqual(OWNED)
    expect(cache.record?.ownership).toEqual(OWNED)
  })

  test('persists authoritative revocation and account changes without treating them as offline failure', async () => {
    const source = new MutableVerifiedSource(OWNED)
    const cache = new MemoryEntitlementCache()
    const verified = authority(source, cache)
    await verified.refreshOwnership()

    const changedAccount = ownership(false, true, false)
    source.result = changedAccount
    await expect(verified.refreshOwnership()).resolves.toEqual(changedAccount)
    expect(cache.record?.ownership).toEqual(changedAccount)

    source.result = UNOWNED
    await expect(verified.refreshOwnership()).resolves.toEqual(UNOWNED)
    expect(cache.record?.ownership).toEqual(UNOWNED)

    source.result = new Error('signed out and offline')
    await expect(verified.refreshOwnership()).resolves.toEqual(UNOWNED)
    const reloaded = authority(source, cache)
    await expect(reloaded.readOwnership()).resolves.toEqual(UNOWNED)
  })

  test('does not resurrect stale cached ownership after a verified revocation cannot be persisted', async () => {
    const cache = new MemoryEntitlementCache({
      ownership: OWNED,
      verifiedAtUtc: '2026-08-30T00:00:00.000Z',
    })
    const source = new MutableVerifiedSource(UNOWNED)
    const verified = authority(source, cache)
    cache.rejectWrites = true

    await expect(verified.refreshOwnership()).resolves.toEqual(UNOWNED)
    source.result = new Error('offline after revocation')
    await expect(verified.refreshOwnership()).resolves.toEqual(UNOWNED)
    expect(cache.record?.ownership).toEqual(OWNED)
  })
})

function storefront(
  entitlements: CachedVerifiedEntitlementAuthority,
  effect: DoubleInfinityPointsEffectPreferenceService,
  runtime: RuntimeEntitlementBridge,
): StorefrontController {
  return new StorefrontController({
    store: new NoopStoreAdapter(),
    entitlements,
    doubleInfinityPointsEffect: effect,
    onVerifiedOwnershipChanged: async () => {
      await runtime.synchronize()
      return true
    },
  })
}

function authority(
  source: VerifiedEntitlementSource,
  cache: EntitlementOwnershipCache,
): CachedVerifiedEntitlementAuthority {
  return new CachedVerifiedEntitlementAuthority(
    source,
    cache,
    () => '2026-08-30T00:00:00.000Z',
  )
}

function ownership(
  doubleInfinityPoints: boolean,
  developerOptions: boolean,
  supporterCatGallery: boolean,
): Readonly<HostEntitlementOwnership> {
  return Object.freeze({
    doubleInfinityPoints,
    developerOptions,
    supporterCatGallery,
  })
}

class MutableVerifiedSource implements VerifiedEntitlementSource {
  result: Readonly<HostEntitlementOwnership> | Error

  constructor(result: Readonly<HostEntitlementOwnership> | Error) {
    this.result = result
  }

  async readVerifiedOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    if (this.result instanceof Error) throw this.result
    return this.result
  }
}

class MemoryEntitlementCache implements EntitlementOwnershipCache {
  record: Readonly<VerifiedEntitlementRecord> | null
  rejectWrites = false

  constructor(record: Readonly<VerifiedEntitlementRecord> | null = null) {
    this.record = record
  }

  async read(): Promise<Readonly<VerifiedEntitlementRecord> | null> {
    return this.record
  }

  async write(record: Readonly<VerifiedEntitlementRecord>): Promise<void> {
    if (this.rejectWrites) throw new Error('cache unavailable')
    this.record = record
  }
}

class MemoryEffectStorage implements DoubleInfinityPointsEffectStorage {
  private value: string | null = null
  writes = 0

  getItem(key: string): string | null {
    return key === DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY
      ? this.value
      : null
  }

  setItem(key: string, value: string): void {
    if (key !== DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY) return
    this.value = value
    this.writes += 1
  }

  readEnabled(): boolean | undefined {
    if (this.value === null) return undefined
    return (JSON.parse(this.value) as { enabled?: boolean }).enabled
  }
}
