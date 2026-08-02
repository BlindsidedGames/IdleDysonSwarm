import { facilityArrayNames } from './facilityArrays'
import { isRecord, type SaveRecord } from './graph'

export interface SaveValidationResult {
  readonly valid: boolean
  readonly error: string | null
}

export function validatePreparedSave(
  value: unknown,
  expectedSchema: number,
): SaveValidationResult {
  if (!isRecord(value)) return invalid('Prepared settings are null or not an object.')
  if (value.saveVersion !== expectedSchema) {
    return invalid(
      `Prepared schema ${String(value.saveVersion)} does not match supported schema ${expectedSchema}.`,
    )
  }

  const requiredRootContainers = [
    'saveData',
    'sdPrestige',
    'sdSimulation',
    'prestigePlus',
    'avocadoData',
    'dysonVerseSaveData',
  ]
  for (const key of requiredRootContainers) {
    if (!isRecord(value[key])) return invalid(`Required root container ${key} is null.`)
  }

  const dyson = value.dysonVerseSaveData as SaveRecord
  for (const key of [
    'dysonVerseInfinityData',
    'dysonVersePrestigeData',
    'dysonVerseSkillTreeData',
  ]) {
    if (!isRecord(dyson[key])) return invalid(`Required Dyson container ${key} is null.`)
  }

  for (let preset = 0; preset <= 5; preset += 1) {
    const suffix = preset || ''
    for (const prefix of ['skillAutoAssignmentList', 'skillAutoAssignmentIds']) {
      const key = `${prefix}${suffix}`
      if (!Array.isArray(dyson[key])) {
        return invalid(`Required skill auto-assignment collection ${key} is null.`)
      }
      if (
        prefix.endsWith('Ids') &&
        (dyson[key] as unknown[]).some(
          (id) => typeof id !== 'string' || id.trim().length === 0,
        )
      ) {
        return invalid(`${key} contains an empty durable identifier.`)
      }
    }
  }

  const infinity = dyson.dysonVerseInfinityData as SaveRecord
  for (const key of [
    'skillStateById',
    'skillOwnedById',
    'researchLevelsById',
    'researchProgressById',
  ]) {
    if (!isRecord(infinity[key])) return invalid(`Required durable-ID dictionary ${key} is null.`)
    for (const entryKey of Object.keys(infinity[key] as SaveRecord)) {
      if (entryKey.trim().length === 0) {
        return invalid(`${key} contains an empty durable identifier.`)
      }
    }
  }

  const states = infinity.skillStateById as SaveRecord
  for (const [id, state] of Object.entries(states)) {
    if (!isRecord(state)) {
      return invalid(`skillStateById contains a null value for durable identifier '${id}'.`)
    }
  }

  for (const key of facilityArrayNames) {
    if (!Array.isArray(infinity[key]) || infinity[key].length !== 2) {
      return invalid(`${key} must contain exactly two dense facility slots.`)
    }
  }

  const finiteError = validateFiniteGraph(value, 'saveSettings', new Set())
  return finiteError ? invalid(finiteError) : { valid: true, error: null }
}

function validateFiniteGraph(
  value: unknown,
  path: string,
  seen: Set<object>,
): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? null : `${path} contains a non-finite number.`
  }
  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Uint8Array
  ) {
    return null
  }
  if (seen.has(value)) return null
  seen.add(value)
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const error = validateFiniteGraph(value[index], `${path}[${index}]`, seen)
      if (error) return error
    }
    return null
  }
  for (const [key, entry] of Object.entries(value)) {
    const error = validateFiniteGraph(entry, `${path}.${key}`, seen)
    if (error) return error
  }
  return null
}

function invalid(error: string): SaveValidationResult {
  return { valid: false, error }
}
