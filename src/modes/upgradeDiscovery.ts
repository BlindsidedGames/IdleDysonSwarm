import type { SaveRepositoryPaths, SaveStorageAdapter, LegacySaveCandidate } from '../save/repository'
import type { ModeCodecs, GameMode, VerifiedModeInventory } from './modeSaveStore'
import { prepareIdb1Save } from '../../classic/src/save/prepare'
import { serializeWebSave as serializeClassic } from '../../classic/src/save/serialization'

export interface UpgradeCandidate {
  readonly id: string
  readonly text: string
  readonly role: 'primary' | 'backup' | 'legacy'
}
export interface ReadOnlyUpgradeSource {
  readonly id: string
  readonly mode: GameMode
  prepare?(text: string): string | Promise<string>
  read(): Promise<readonly UpgradeCandidate[]>
}
/** Reads current/backups/retained historical slots only. It cannot publish,
 * rotate, delete, mark migrated or promote purchase evidence. */
export function rootedUpgradeSource(id: string, mode: GameMode,
  storage: Pick<SaveStorageAdapter, 'exists' | 'readText'>, paths: SaveRepositoryPaths): ReadOnlyUpgradeSource {
  return {
    id, mode,
    async read() {
      const candidates: UpgradeCandidate[] = []
      const slots = [paths.current, ...(paths.backups ?? []), ...(paths.retainedRecoverySources ?? []), ...(paths.transitionalRecoverySources ?? []), paths.legacyRecovery]
      for (const [index, path] of [...new Set(slots)].entries()) {
        if (await storage.exists(path)) candidates.push({ id: `${id}:${path}`, text: await storage.readText(path), role: index === 0 ? 'primary' : path === paths.legacyRecovery ? 'legacy' : 'backup' })
      }
      return candidates
    },
  }
}
export function unityUpgradeSource(discover: () => Promise<readonly LegacySaveCandidate[]>): ReadOnlyUpgradeSource {
  return { id: 'unity-classic', mode: 'classic', read: async () => (await discover()).map(candidate => ({ id: candidate.id, text: candidate.text, role: 'legacy' })) }
}
export interface UpgradeDiscoveryOptions {
  /** All three sources are mandatory, even on hosts that explicitly attest
   * an absent source. A thrown read or invalid authoritative future input blocks
   * first run; no exception is ever interpreted as an empty installation. */
  readonly publicClassic: ReadOnlyUpgradeSource
  readonly legacyUnity: ReadOnlyUpgradeSource
  readonly modernBeta: ReadOnlyUpgradeSource
  readonly codecs: ModeCodecs
  /** Additional historical public roots, e.g. a read-only old Cloud download. */
  readonly additionalSources?: readonly ReadOnlyUpgradeSource[]
  readonly choose?: (mode: GameMode, candidates: readonly { id: string; text: string }[]) => Promise<string>
}
export interface DiscoveredModeInventory extends VerifiedModeInventory {
  readonly provenance: Readonly<Partial<Record<GameMode, string>>>
  /** Exact original bytes are returned for host recovery retention. Originals
   * remain untouched in their read-only locations regardless of adoption. */
  readonly originals: readonly UpgradeCandidate[]
}

export async function discoverModeUpgrade(options: UpgradeDiscoveryOptions): Promise<DiscoveredModeInventory> {
  if (options.publicClassic.mode !== 'classic' || options.legacyUnity.mode !== 'classic' || options.modernBeta.mode !== 'modern') throw new Error('Upgrade sources are assigned to the wrong modes.')
  const sources = [options.publicClassic, options.legacyUnity, options.modernBeta, ...(options.additionalSources ?? [])]
  if (new Set(sources.map(source => source.id)).size !== sources.length) throw new Error('Upgrade source identities must be unique.')
  const selected: Record<GameMode, { id: string; text: string; sourceId: string }[]> = { classic: [], modern: [] }
  const originals: UpgradeCandidate[] = []
  const observations: { source: ReadOnlyUpgradeSource; text: string; prepared?: { input: string; output: string } }[] = []
  const identities = new Set<string>()
  for (const source of sources) {
    const candidates = await source.read()
    observations.push({ source, text: JSON.stringify(candidates) })
    if (new Set(candidates.map(candidate => candidate.id)).size !== candidates.length) throw new Error('Duplicate upgrade candidate identity.')
    for (const candidate of candidates) {
      if (identities.has(candidate.id)) throw new Error('Upgrade candidate identities must be globally unique.')
      identities.add(candidate.id)
    }
    originals.push(...candidates)
    let valid: { id: string; text: string; sourceId: string } | undefined
    let invalid = false
    const ordered = [...candidates].sort((a, b) => ({ primary: 0, backup: 1, legacy: 2 }[a.role] - { primary: 0, backup: 1, legacy: 2 }[b.role]))
    for (const candidate of ordered) {
      try {
        let text = source.prepare ? await source.prepare(candidate.text) : candidate.text
        if (source.mode === 'classic' && text.trim().startsWith('IDB1')) {
          // The released Classic decoder preserves old systems and timestamps.
          text = serializeClassic(prepareIdb1Save(text).prepared.copyValidatedState())
        }
        await options.codecs[source.mode].validate(text)
        valid = { id: candidate.id, text, sourceId: source.id }; break
      } catch (error) {
        if (error instanceof Error && error.name === 'UnsupportedFutureSaveSchemaError') throw error
        invalid = true
      }
    }
    if (!valid && invalid) throw new Error(`Existing ${source.id} saves could not be validated. Originals are preserved.`)
    if (valid) {
      selected[source.mode].push(valid)
      if (source.prepare) observations[observations.length - 1].prepared = { input: candidates.find(candidate => candidate.id === valid!.id)!.text, output: valid.text }
    }
  }
  const saves: Partial<Record<GameMode, string>> = {}, provenance: Partial<Record<GameMode, string>> = {}
  for (const mode of ['classic', 'modern'] as const) {
    let candidates = selected[mode]
    // A public canonical save is the successor to same-device Unity data. Keep
    // Unity as recovery evidence without letting it override public progress.
    if (mode === 'classic' && candidates.some(candidate => candidate.sourceId === options.publicClassic.id)) {
      candidates = candidates.filter(candidate => candidate.sourceId !== options.legacyUnity.id)
    }
    const distinct = [...new Map(candidates.map(candidate => [candidate.text, candidate])).values()]
    if (!distinct.length) continue
    let chosen = distinct[0]
    if (distinct.length > 1) {
      if (!options.choose) throw new Error(`Multiple ${mode} saves need an explicit upgrade choice.`)
      const id = await options.choose(mode, distinct)
      const candidate = distinct.find(candidate => candidate.id === id)
      if (!candidate) throw new Error('Upgrade choice no longer identifies a discovered save.')
      chosen = candidate
    }
    saves[mode] = chosen.text; provenance[mode] = chosen.id
  }
  return { discovery: 'complete', saves, provenance, originals, beforePublication: async () => {
    for (const observation of observations) {
      if ((observation.prepared && await observation.source.prepare!(observation.prepared.input) !== observation.prepared.output) || JSON.stringify(await observation.source.read()) !== observation.text) throw new Error('Upgrade source changed during adoption. Restart discovery.')
    }
  } }
}
