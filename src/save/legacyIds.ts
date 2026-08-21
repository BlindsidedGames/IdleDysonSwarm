import legacyMaps from '../game-data/generated/legacy-id-maps.json'
import skillMigrationData from '../game-data/generated/skill-migration-data.json'

export const skillLegacyKeyToId: Readonly<Record<string, string>> =
  legacyMaps.skillLegacyKeyToId

export const skillIdToLegacyKey: Readonly<Record<string, number>> =
  Object.fromEntries(
    Object.entries(skillLegacyKeyToId).map(([key, id]) => [id, Number(key)]),
  )

export const researchIds = legacyMaps.researchIds

export const researchLegacyFields: Readonly<
  Record<string, { field: string; boolean?: true }>
> = {
  'research.money_multiplier': { field: 'moneyMultiUpgradeOwned' },
  'research.science_boost': { field: 'scienceBoostOwned' },
  'research.assembly_line_upgrade': { field: 'assemblyLineUpgradeOwned' },
  'research.ai_manager_upgrade': { field: 'aiManagerUpgradeOwned' },
  'research.server_upgrade': { field: 'serverUpgradeOwned' },
  'research.data_center_upgrade': { field: 'dataCenterUpgradeOwned' },
  'research.planet_upgrade': { field: 'planetUpgradeOwned' },
  'research.matrioshka_brains_upgrade': { field: 'matrioshkaUpgradeOwned' },
  'research.birch_planets_upgrade': { field: 'birchUpgradeOwned' },
  'research.galactic_brains_upgrade': { field: 'galacticUpgradeOwned' },
  'research.panel_lifetime_1': { field: 'panelLifetime1', boolean: true },
  'research.panel_lifetime_2': { field: 'panelLifetime2', boolean: true },
  'research.panel_lifetime_3': { field: 'panelLifetime3', boolean: true },
  'research.panel_lifetime_4': { field: 'panelLifetime4', boolean: true },
}

export function legacyKeysToSkillIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((key) =>
      typeof key === 'number' || typeof key === 'bigint'
        ? skillLegacyKeyToId[String(key)]
        : undefined,
    )
    .filter((id): id is string => typeof id === 'string')
}

export function skillIdsToLegacyKeys(value: readonly string[]): number[] {
  return value
    .map((id) => skillIdToLegacyKey[id])
    .filter((key): key is number => typeof key === 'number')
}

export function bitsetToSkillIds(value: unknown): string[] {
  const bytes =
    value instanceof Uint8Array
      ? value
      : Array.isArray(value)
        ? Uint8Array.from(value.map(Number))
        : new Uint8Array()
  const ids: string[] = []
  for (const [keyText, id] of Object.entries(skillLegacyKeyToId)) {
    const bit = Number(keyText) - 1
    if ((bytes[Math.floor(bit / 8)] & (1 << (bit % 8))) !== 0) ids.push(id)
  }
  return ids
}

export function skillIdsToBitset(ids: readonly string[]): Uint8Array {
  const byteLength = Math.ceil(Object.keys(skillLegacyKeyToId).length / 8)
  const result = new Uint8Array(byteLength)
  for (const id of ids) {
    const key = skillIdToLegacyKey[id]
    if (!key) continue
    const bit = key - 1
    result[Math.floor(bit / 8)] |= 1 << (bit % 8)
  }
  return result
}

export function dependencySafeSkillOrder(ids: readonly string[]): string[] {
  const orderedInput = [...new Set(ids.filter((id) => id.length > 0))]
  const selected = new Set(orderedInput)
  const indegree = new Map(orderedInput.map((id) => [id, 0]))
  const adjacency = new Map(orderedInput.map((id) => [id, [] as string[]]))

  for (const id of orderedInput) {
    const definition =
      skillMigrationData[id as keyof typeof skillMigrationData]
    if (!definition) continue
    for (const dependency of [
      ...definition.requiredSkillIds,
      ...definition.shadowRequirementIds,
    ]) {
      if (!selected.has(dependency)) continue
      adjacency.get(dependency)?.push(id)
      indegree.set(id, (indegree.get(id) ?? 0) + 1)
    }
  }

  const remaining = new Set(orderedInput)
  const topological: string[] = []
  while (remaining.size > 0) {
    let progressed = false
    for (const id of orderedInput) {
      if (!remaining.has(id) || (indegree.get(id) ?? 0) !== 0) continue
      remaining.delete(id)
      topological.push(id)
      for (const neighbor of adjacency.get(id) ?? []) {
        indegree.set(neighbor, (indegree.get(neighbor) ?? 0) - 1)
      }
      progressed = true
    }
    if (progressed) continue
    for (const id of orderedInput) {
      if (remaining.has(id)) topological.push(id)
    }
    break
  }

  const accepted: string[] = []
  const acceptedSet = new Set<string>()
  for (const id of topological) {
    const definition =
      skillMigrationData[id as keyof typeof skillMigrationData]
    if (
      definition?.exclusiveWithIds.some((exclusive) =>
        acceptedSet.has(exclusive),
      )
    ) {
      continue
    }
    accepted.push(id)
    acceptedSet.add(id)
  }
  return accepted
}
