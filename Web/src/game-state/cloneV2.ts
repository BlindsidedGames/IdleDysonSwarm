import {
  cloneGameDecimal,
  isGameDecimal,
  restoreGameDecimal,
} from '../math/gameDecimal'
import {
  canonicalNumericFieldClassifications,
  canonicalResearchLevelPolicies,
  plannedV2OnlyNumericClassifications,
} from './numericFieldManifest'
import type { CanonicalGameStateV2 } from './typesV2'
import { validateCanonicalGameStateV2 } from './validateV2'

const intendedEntries = [
  ...canonicalNumericFieldClassifications,
  ...plannedV2OnlyNumericClassifications,
].filter((entry) => entry.intendedV2Path !== null)
const researchGameDecimalClasses = new Map(
  canonicalResearchLevelPolicies.map((policy) => [policy.key, policy.semanticClass]),
)
const exactGameDecimalPaths = new Set<string>()
const wildcardGameDecimalPaths: RegExp[] = []
for (const entry of intendedEntries) {
  if (
    entry.semanticClass !== 'ordinary-decimal' &&
    entry.semanticClass !== 'integer-decimal'
  ) continue
  const path = entry.intendedV2Path!
  if (path.includes('*')) wildcardGameDecimalPaths.push(compilePathPattern(path))
  else exactGameDecimalPaths.add(path)
}
const issuedCanonicalGameStates = new WeakSet<object>()
// Authority-based admission is an ownership assertion, not proof of validity.
// Only checks performed inside this module may add to this second cache.
const structurallyValidatedCanonicalGameStates = new WeakSet<object>()
const issuedValidationAuthorities = new WeakSet<object>()

export interface CanonicalGameStateValidationAuthorityV2 {
  readonly policy: 'canonical-game-state-validation-authority-v1'
}

export function registerCanonicalGameStateValidationAuthorityV2():
Readonly<CanonicalGameStateValidationAuthorityV2> {
  const authority = Object.freeze({
    policy: 'canonical-game-state-validation-authority-v1' as const,
  })
  issuedValidationAuthorities.add(authority)
  return authority
}

export function admitValidatedCanonicalGameStateV2(
  authority: Readonly<CanonicalGameStateValidationAuthorityV2>,
  value: Readonly<CanonicalGameStateV2>,
): void {
  if (!issuedValidationAuthorities.has(authority as object)) {
    throw new TypeError('Canonical game-state validation authority is not authentic.')
  }
  issuedCanonicalGameStates.add(value)
}

/** Performs full structural and immutability checks before enabling fast reuse. */
export function validateCanonicalGameStateV2ForTrustedReuse(
  value: Readonly<CanonicalGameStateV2>,
): void {
  const validation = validateCanonicalGameStateV2(value)
  if (!validation.valid || !isDeepFrozenDataTree(value, new Set())) {
    throw new TypeError(
      `CanonicalGameStateV2 must be valid and deeply frozen: ${validation.errors.join(' ')}`,
    )
  }
  issuedCanonicalGameStates.add(value)
  structurallyValidatedCanonicalGameStates.add(value)
}

function compilePathPattern(pattern: string): RegExp {
  const expression = pattern
    .replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    .replaceAll('\\*', '.+')
  return new RegExp(`^${expression}$`, 'u')
}

function isGameDecimalPath(path: string): boolean {
  if (path.startsWith('$.research.levelsById.')) {
    const id = path.slice('$.research.levelsById.'.length)
    const semanticClass = researchGameDecimalClasses.get(id)
    return semanticClass === 'integer-decimal'
  }
  return exactGameDecimalPaths.has(path) ||
    wildcardGameDecimalPaths.some((pattern) => pattern.test(path))
}

function isDecimalParts(value: object): boolean {
  const keys = Object.keys(value).sort()
  return (
    keys.length === 2 &&
    keys[0] === 'exponent' &&
    keys[1] === 'mantissa'
  )
}

function cloneAndFreeze(
  value: unknown,
  seen: Map<object, unknown>,
  path: string,
): unknown {
  if (value === null || typeof value !== 'object') return value
  if (isGameDecimal(value)) {
    if (!isGameDecimalPath(path)) {
      throw new TypeError(`${path} is not a declared GameDecimal field.`)
    }
    return cloneGameDecimal(value)
  }
  if (isDecimalParts(value)) {
    if (!isGameDecimalPath(path)) {
      throw new TypeError(`${path} is not a declared GameDecimal field.`)
    }
    return restoreGameDecimal(value)
  }
  if (seen.has(value)) {
    throw new TypeError(
      'CanonicalGameStateV2 must be an unaliased acyclic tree.',
    )
  }
  if (Array.isArray(value)) {
    const arrayKeys = Reflect.ownKeys(value)
    const descriptors = Object.getOwnPropertyDescriptors(value)
    if (
      arrayKeys.some(
        (key) =>
          typeof key !== 'string' ||
          (key !== 'length' && !/^(?:0|[1-9]\d*)$/u.test(key)) ||
          (key !== 'length' &&
            (descriptors[key] === undefined ||
              !descriptors[key].enumerable ||
              !('value' in descriptors[key]))),
      )
    ) {
      throw new TypeError(`${path} must be a dense data-only array.`)
    }
    const target: unknown[] = []
    seen.set(value, target)
    for (const [index, entry] of value.entries()) {
      target.push(cloneAndFreeze(entry, seen, `${path}.${index}`))
    }
    return Object.freeze(target)
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('CanonicalGameStateV2 must contain plain objects.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (
    Reflect.ownKeys(value).some((key) => {
      if (typeof key !== 'string') return true
      const descriptor = descriptors[key]
      return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
    })
  ) {
    throw new TypeError(`${path} must contain enumerable string data properties only.`)
  }
  const target: Record<string, unknown> = {}
  seen.set(value, target)
  for (const [key, descriptor] of Object.entries(descriptors)) {
    target[key] = cloneAndFreeze(descriptor.value, seen, `${path}.${key}`)
  }
  return Object.freeze(target)
}

export function cloneCanonicalGameStateV2(
  source: Readonly<CanonicalGameStateV2>,
): CanonicalGameStateV2 {
  const clone = cloneAndFreeze(source, new Map(), '$') as CanonicalGameStateV2
  const validation = validateCanonicalGameStateV2(clone)
  if (!validation.valid) {
    throw new TypeError(
      `Cannot publish an invalid CanonicalGameStateV2: ${validation.errors.join(' ')}`,
    )
  }
  issuedCanonicalGameStates.add(clone)
  structurallyValidatedCanonicalGameStates.add(clone)
  return clone
}

/**
 * Reissues an already-owned canonical state after a Dyson-only transaction.
 * Unchanged sections are authenticated immutable nodes from the issued source;
 * the replacement Dyson tree is cloned, frozen and path-checked before the
 * assembled state is validated and issued.
 */
export function cloneCanonicalGameStateV2WithDyson(
  source: Readonly<CanonicalGameStateV2>,
  dyson: Readonly<CanonicalGameStateV2['dyson']>,
): CanonicalGameStateV2 {
  if (!isIssuedCanonicalGameStateV2(source)) {
    return cloneCanonicalGameStateV2({ ...source, dyson })
  }
  const candidate = Object.freeze({
    ...source,
    dyson: cloneAndFreeze(dyson, new Map(), '$.dyson'),
  }) as CanonicalGameStateV2
  const validation = validateCanonicalGameStateV2(candidate)
  if (!validation.valid) {
    throw new TypeError(
      `Cannot publish an invalid CanonicalGameStateV2: ${validation.errors.join(' ')}`,
    )
  }
  issuedCanonicalGameStates.add(candidate)
  structurallyValidatedCanonicalGameStates.add(candidate)
  return candidate
}

/** Identifies states already cloned, validated and deeply frozen here. */
export function isIssuedCanonicalGameStateV2(
  value: unknown,
): boolean {
  return typeof value === 'object' && value !== null &&
    issuedCanonicalGameStates.has(value)
}

/** True only after validation performed inside this module. */
export function isStructurallyValidatedCanonicalGameStateV2(
  value: unknown,
): boolean {
  return typeof value === 'object' && value !== null &&
    structurallyValidatedCanonicalGameStates.has(value)
}

function isDeepFrozenDataTree(value: unknown, seen: Set<object>): boolean {
  if (typeof value !== 'object' || value === null) return true
  if (seen.has(value) || !Object.isFrozen(value)) return false
  seen.add(value)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key as keyof typeof descriptors]
    if (
      descriptor === undefined ||
      !('value' in descriptor) ||
      !isDeepFrozenDataTree(descriptor.value, seen)
    ) return false
  }
  return true
}
