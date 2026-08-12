import runtimeCatalogJson from '../../game-data/generated/runtime-catalog.json'
import { RUNTIME_CATALOG_FIELDS_BY_KIND } from '../../game-data/runtimeCatalogContract'
import type { RuntimeGameDataCatalog } from '../../game-data/types'
import {
  DYSON_TUNING_PROFILES_V2,
  type DysonTuningProfileId,
} from '../../game-state/dysonTuningV2'
import {
  STORED_TIME_POLICY_SUPPORT_V2,
  STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
  type StoredTimeWorkerReadyV2,
} from './workerProtocolV2'
import { captureStoredTimeWorkerDataV2 } from './workerWireV2'

export interface TrustedStoredTimeWorkerIdentityV2 {
  readonly buildId: string
  readonly catalogHash: string
  readonly tuningHash: string
  readonly catalog: Readonly<RuntimeGameDataCatalog>
  readonly tuning: Readonly<Record<DysonTuningProfileId, Readonly<Record<string, number>>>>
}

const cachedIdentities = new Map<
  string,
  Promise<Readonly<TrustedStoredTimeWorkerIdentityV2>>
>()

export function getTrustedStoredTimeWorkerIdentityV2(
  releaseBuildId: string,
): Promise<
  Readonly<TrustedStoredTimeWorkerIdentityV2>
> {
  requireIdentifier(releaseBuildId, 'Worker release build ID')
  const cached = cachedIdentities.get(releaseBuildId)
  if (cached !== undefined) return cached
  const created = createIdentity(releaseBuildId)
  cachedIdentities.set(releaseBuildId, created)
  return created
}

export async function createStoredTimeWorkerReadyV2(
  workerInstanceNonce: string,
  releaseBuildId: string,
): Promise<Readonly<StoredTimeWorkerReadyV2>> {
  requireIdentifier(workerInstanceNonce, 'Worker instance nonce')
  const identity = await getTrustedStoredTimeWorkerIdentityV2(releaseBuildId)
  return Object.freeze({
    type: 'ready',
    protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
    workerInstanceNonce,
    buildId: identity.buildId,
    catalogHash: identity.catalogHash,
    tuningHash: identity.tuningHash,
    supportedPolicies: STORED_TIME_POLICY_SUPPORT_V2,
    capabilities: Object.freeze({
      moduleWorker: true,
      transferableArrayBuffer: true,
      sharedArrayBuffer: false,
    }),
  })
}

export function createStoredTimeWorkerInstanceNonceV2(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function requireMatchingStoredTimeWorkerIdentityV2(
  received: Readonly<{
    buildId: string
    catalogHash: string
    tuningHash: string
  }>,
  trusted: Readonly<TrustedStoredTimeWorkerIdentityV2>,
): void {
  if (
    received.buildId !== trusted.buildId ||
    received.catalogHash !== trusted.catalogHash ||
    received.tuningHash !== trusted.tuningHash
  ) {
    throw new TypeError('Stored Time worker identity does not match this release.')
  }
}

async function createIdentity(
  releaseBuildId: string,
): Promise<Readonly<TrustedStoredTimeWorkerIdentityV2>> {
  const catalog = validateAndFreezeStoredTimeWorkerCatalogV2(runtimeCatalogJson)
  const tuning = validateAndFreezeTuning(DYSON_TUNING_PROFILES_V2)
  const [catalogHash, tuningHash] = await Promise.all([
    sha256Hex(stableCanonicalJson(catalog)),
    sha256Hex(stableCanonicalJson(tuning)),
  ])
  return Object.freeze({
    buildId: releaseBuildId,
    catalogHash,
    tuningHash,
    catalog,
    tuning,
  })
}

export function validateAndFreezeStoredTimeWorkerCatalogV2(
  value: unknown,
): Readonly<RuntimeGameDataCatalog> {
  const captured = captureStoredTimeWorkerDataV2(value)
  const root = requireRecord(captured, 'Runtime catalog')
  requireKeys(root, ['assets', 'countsByKind', 'formatVersion'], 'Runtime catalog')
  if (root.formatVersion !== 1 || !Array.isArray(root.assets)) {
    throw new TypeError('Runtime catalog has an unsupported format.')
  }
  const counts = requireRecord(root.countsByKind, 'Runtime catalog counts')
  const expectedKinds = Object.keys(RUNTIME_CATALOG_FIELDS_BY_KIND).sort()
  if (Object.keys(counts).sort().join('\0') !== expectedKinds.join('\0')) {
    throw new TypeError('Runtime catalog kinds are not closed.')
  }
  const actualCounts = new Map<string, number>()
  const keys = new Set<string>()
  for (const [index, entry] of root.assets.entries()) {
    const asset = requireRecord(entry, `Runtime catalog asset ${index}`)
    requireKeys(asset, ['data', 'id', 'kind'], `Runtime catalog asset ${index}`)
    if (typeof asset.id !== 'string' || asset.id.length === 0 ||
      typeof asset.kind !== 'string' || !expectedKinds.includes(asset.kind)) {
      throw new TypeError(`Runtime catalog asset ${index} has invalid identity.`)
    }
    const data = requireRecord(asset.data, `Runtime catalog asset ${index} data`)
    const allowedDataKeys = RUNTIME_CATALOG_FIELDS_BY_KIND[
      asset.kind as keyof typeof RUNTIME_CATALOG_FIELDS_BY_KIND
    ]
    if (Object.keys(data).some((key) =>
      !(allowedDataKeys as readonly string[]).includes(key)
    )) {
      throw new TypeError(
        `Runtime catalog asset ${index} contains an unexpected retained-data key.`,
      )
    }
    const key = `${asset.kind}\0${asset.id}`
    if (keys.has(key)) throw new TypeError('Runtime catalog contains a duplicate asset identity.')
    keys.add(key)
    actualCounts.set(asset.kind, (actualCounts.get(asset.kind) ?? 0) + 1)
  }
  for (const kind of expectedKinds) {
    const count = counts[kind]
    if (!Number.isSafeInteger(count) || (count as number) < 0 ||
      count !== (actualCounts.get(kind) ?? 0)) {
      throw new TypeError(`Runtime catalog count for '${kind}' does not match its assets.`)
    }
  }
  return root as unknown as Readonly<RuntimeGameDataCatalog>
}

function validateAndFreezeTuning(
  value: unknown,
): Readonly<Record<DysonTuningProfileId, Readonly<Record<string, number>>>> {
  const captured = captureStoredTimeWorkerDataV2(value)
  const root = requireRecord(captured, 'Dyson tuning profiles')
  requireKeys(root, ['web-authored-v1'], 'Dyson tuning profiles')
  const profile = requireRecord(root['web-authored-v1'], 'Dyson tuning profile')
  const expected = [
    'panelsPerSecMulti', 'scienceBoostPercent', 'moneyMultiUpgradePercent',
    'assemblyLineUpgradePercent', 'aiManagerUpgradePercent',
    'serverUpgradePercent', 'dataCenterUpgradePercent', 'planetUpgradePercent',
    'matrioshkaUpgradePercent', 'birchUpgradePercent',
    'galacticUpgradePercent',
  ]
  requireKeys(profile, expected, 'Dyson tuning profile')
  for (const [key, coefficient] of Object.entries(profile)) {
    if (typeof coefficient !== 'number' || !Number.isFinite(coefficient) ||
      coefficient < 0 || Object.is(coefficient, -0)) {
      throw new TypeError(`Dyson tuning coefficient '${key}' is invalid.`)
    }
  }
  return root as unknown as Readonly<
    Record<DysonTuningProfileId, Readonly<Record<string, number>>>
  >
}

function stableCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableCanonicalJson(entry)).join(',')}]`
  }
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${stableCanonicalJson((value as Record<string, unknown>)[key])}`
  ).join(',')}}`
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

function requireRecord(value: unknown, path: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} must be a plain object.`)
  }
  return value as Readonly<Record<string, unknown>>
}

function requireKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
  path: string,
): void {
  const keys = Object.keys(value)
  if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
    throw new TypeError(`${path} must contain exactly its declared fields.`)
  }
}

function requireIdentifier(value: string, path: string): void {
  if (value.length < 1 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/u.test(value)) {
    throw new TypeError(`${path} is invalid.`)
  }
}
