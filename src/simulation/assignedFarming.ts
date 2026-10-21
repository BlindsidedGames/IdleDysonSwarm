import type { AssignedFarmingState } from '../game-state/types'
import { validateLegacyFarming } from './legacyFarming'
const T = { residentsPerHouse:3, granaryCapacity:3000, fishingWorkers:3, netFishingWorkers:6, fieldWorkers:4, pastureWorkers:4, maximumPlots:100000, maximumHouses:1000, seasonSeconds:1800, generationSeasons:8 }
const EPSILON=1e-8
const FARMING_RESOURCES=['food','materials','tools'] as const
const FARMING_WORKPLACES=['fishing','barley','wheat','herding','woodland','workshop'] as const
const FOOD_JOBS=['fishing','herding','barley','wheat'] as const
const farmingHousing = (f: Readonly<AssignedFarmingState>): number => f.houses * T.residentsPerHouse
const farmingCapacity = (f: Readonly<AssignedFarmingState>): number => f.granaries * T.granaryCapacity
const farmingUsedLand = (f: Readonly<AssignedFarmingState>): number => f.houses + f.barleyFields + f.wheatFields + f.pastures + f.granaries + Number(f.workshop)
const farmingAssigned = (f: Readonly<AssignedFarmingState>): number => FARMING_WORKPLACES.reduce((sum, id) => sum + f.assignments[id], 0)
function farmingWorkplaceCapacity(f: Readonly<AssignedFarmingState>, id: keyof AssignedFarmingState['assignments']): number {
  switch (id) {
    case 'fishing': return f.nets ? T.netFishingWorkers : T.fishingWorkers
    case 'barley': return f.barleyFields * T.fieldWorkers
    case 'wheat': return f.wheatFields * T.fieldWorkers
    case 'herding': return f.pastures * T.pastureWorkers
    case 'workshop': return f.workshop ? farmingHousing(f) : 0
    case 'woodland': return f.clearedLand < T.maximumPlots ? farmingHousing(f) : 0
  }
}
export function validateAssignedFarming(value: unknown, version = 4): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || version !== 4) return 'Invalid Farming state version.'
  const f = value as AssignedFarmingState
  const n = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER
  const integer = (v: unknown): v is number => n(v) && Number.isSafeInteger(v)
  if (f.version !== 4 || !['farming', 'complete'].includes(f.phase) || !n(f.elapsedSeconds)) return 'Invalid Farming clock or phase.'
  for (const key of ['population', 'peakPopulation', 'houses', 'clearedLand', 'barleyFields', 'wheatFields', 'pastures', 'granaries', 'jobSequence', 'starvationDeaths', 'naturalDeaths', 'generations'] as const) if (!integer(f[key])) return `Invalid village ${key}.`
  if (f.houses < 1 || f.houses > T.maximumHouses || f.clearedLand > T.maximumPlots || f.population < 1 || f.population > farmingHousing(f) || f.peakPopulation < f.population || f.peakPopulation > T.maximumHouses * T.residentsPerHouse || farmingUsedLand(f) > f.clearedLand) return 'Invalid village population or land.'
  for (const key of ['workshop', 'nets', 'cattle', 'irrigation', 'skillRewardPending', 'completionReached'] as const) if (typeof f[key] !== 'boolean') return 'Invalid village unlock.'
  if (!f.assignments || Object.keys(f.assignments).length !== FARMING_WORKPLACES.length || !FARMING_WORKPLACES.every(id => integer(f.assignments[id]) && f.assignments[id] <= farmingWorkplaceCapacity(f, id)) || farmingAssigned(f) > f.population || FOOD_JOBS.reduce((sum, id) => sum + f.assignments[id], 0) < 1) return 'Invalid village worker assignment.'
  if (!f.resources || Object.keys(f.resources).length !== FARMING_RESOURCES.length || !FARMING_RESOURCES.every(id => n(f.resources[id])) || f.resources.food > farmingCapacity(f) + EPSILON) return 'Invalid village reserve.'
  if (!n(f.legacyWorkCredit) || f.generations !== Math.floor(f.elapsedSeconds / (T.seasonSeconds * T.generationSeasons))) return 'Invalid village generation or work credit.'
  if (!Array.isArray(f.awardedCatalystIds) || new Set(f.awardedCatalystIds).size !== f.awardedCatalystIds.length || f.awardedCatalystIds.some(id => !/^farming-catalyst-[1-6]$/.test(id))) return 'Invalid village reward history.'
  if (!f.jobs || Object.keys(f.jobs).some(id => id !== 'woodland' && id !== 'workshop')) return 'Invalid village work queue.'
  for (const [id, job] of Object.entries(f.jobs)) {
    if (!job || job.kind !== id || !integer(job.cycle) || job.cycle < 1 || job.cycle > f.jobSequence || !n(job.work) || job.work <= 0 || !n(job.remainingWork) || job.remainingWork > job.work || !job.inputs || !job.outputs) return 'Invalid paid village job.'
    const woodland = id === 'woodland'
    // Funded work owns its quoted duration and output, including after tuning changes.
    if (job.land !== Number(woodland) || woodland && (Object.keys(job.inputs).length || Object.keys(job.outputs).length !== 1 || !n(job.outputs.materials) || job.outputs.materials <= 0) || !woodland && (!f.workshop || Object.keys(job.inputs).length !== 1 || !n(job.inputs.materials) || job.inputs.materials <= 0 || Object.keys(job.outputs).length !== 1 || !n(job.outputs.tools) || job.outputs.tools <= 0)) return 'Unknown village job receipt.'
  }
  if (f.phase === 'complete' && (!f.completionReached || Object.keys(f.jobs).length)) return 'Unfinished village cannot be complete.'
  if (f.legacyVillage && validateLegacyFarming(f.legacyVillage, f.legacyVillage.version)) return 'Invalid archived village receipt.'
  if (f.continuous && (!n(f.continuous.since) || f.continuous.since > f.elapsedSeconds || !n(f.continuous.food) || typeof f.continuous.signature !== 'string' || !f.continuous.jobs || Object.values(f.continuous.jobs).some(x => !n(x)))) return 'Invalid village clock anchor.'
  return null
}
