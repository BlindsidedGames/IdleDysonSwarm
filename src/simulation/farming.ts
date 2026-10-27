import type {
  CanonicalGameStateV1, CivilizationState, FarmingJob, FarmingPurchase,
  FarmingRecipe, FarmingResource, FarmingState, FarmingWorkplace, LegacyFarmingState, AssignedFarmingState, AutomaticFarmingState, ManagedFarmingState, PreferredFarmingState, SeasonalFarmingState, ProtectedFarmingState, PrioritizedFarmingState, CropHarvestFarmingState, FarmingDisaster,
} from '../game-state/types'
import { EMPTY_CIVILIZATION, civilizationOpeningComplete } from './civilization'
import { permanentFractureCount } from './galvanization'
import { eligibleCanonicalFractureIds } from './canonicalSkillTransactions'
import { DISCRETE_MAXIMUM } from './numeric'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { validateLegacyFarming } from './legacyFarming'
import { validateAssignedFarming } from './assignedFarming'
import { FARMING_TUNING as T } from './farmingTuning'

export { FARMING_TUNING } from './farmingTuning'
export const FARMING_RESOURCES = ['food', 'materials', 'tools'] as const
export const FARMING_WORKPLACES = ['crops', 'herding', 'woodland', 'workshop', 'shaman'] as const
export const FARMING_PURCHASES = ['workshop', 'house', 'field', 'pasture', 'loggingCamp', 'granary', 'shrine', 'irrigation', 'shamanTraining'] as const
export const FARMING_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
const FOOD_JOBS = ['crops', 'herding'] as const
const EPSILON = 1e-8
type MutableFarming = { -readonly [K in keyof FarmingState]: FarmingState[K] } & {
  resources: Record<FarmingResource, number>
  assignments: Record<FarmingWorkplace, number>
  jobs: Partial<Record<'woodland' | 'workshop', FarmingJob>>
  awardedCatalystIds: string[]
}
const clone = (f: Readonly<FarmingState>): MutableFarming => ({
  ...f, resources: { ...f.resources }, assignments: { ...f.assignments },
  jobs: Object.fromEntries(Object.entries(f.jobs).map(([id, job]) => [id, { ...job, inputs: { ...job.inputs }, outputs: { ...job.outputs } }])),
  awardedCatalystIds: [...f.awardedCatalystIds],
})
const safeAdd = (a: number, b: number): number => {
  const value = a + b
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) throw Error('Village quantity exceeds safe storage.')
  return value
}
export const farmingSpeed = (state: Readonly<CanonicalGameStateV1>): number => 1 + permanentFractureCount(state) * .05
export const farmingWorkers = (f: Readonly<FarmingState>): number => f.population
export const farmingHousing = (f: Readonly<Pick<FarmingState, 'houses'>>): number => f.houses * T.residentsPerHouse
const legacyFarmingCapacity = (f: Readonly<Pick<FarmingState, 'granaries'>>): number => f.granaries * T.granaryCapacity
export const farmingCapacity = (f: Readonly<Pick<FarmingState, 'granaries' | 'houses'>>): number => farmingHousing(f) * T.foodPerPersonPerMinute * T.seasonSeconds / 60 * T.baseStorageSeasons + legacyFarmingCapacity(f)
export const farmingUsedLand = (f: Readonly<Pick<FarmingState, 'houses' | 'fields' | 'pastures' | 'granaries' | 'shrines' | 'workshop'>>): number => f.houses + f.fields + f.pastures + f.granaries + f.shrines + Number(f.workshop)
export const farmingFreeLand = (f: Readonly<FarmingState>): number => f.clearedLand - farmingUsedLand(f)
export const farmingAssigned = (f: Readonly<Pick<FarmingState, 'assignments'>>): number => FARMING_WORKPLACES.reduce((sum, id) => sum + f.assignments[id], 0)
export const farmingUnassigned = (f: Readonly<FarmingState>): number => f.population - farmingAssigned(f)
export const farmingSeasonIndex = (f: Readonly<FarmingState>): number => Math.floor(f.elapsedSeconds / T.seasonSeconds) % 4
export const farmingSeason = (f: Readonly<FarmingState>) => FARMING_SEASONS[farmingSeasonIndex(f)]
export const farmingClearingMaterials = (f: Readonly<FarmingState>): number => T.clearingMaterials + T.clearingMaterialGrowth * (f.clearedLand - 1)
export const farmingBurials = (f: Readonly<FarmingState>): number => f.starvationDeaths + f.naturalDeaths + f.disasterDeaths
export const farmingComplete = (f: Readonly<FarmingState>): boolean => f.completionReached
export const farmingManualGate = (f: Readonly<FarmingState>): boolean => f.phase !== 'complete' && f.completionReached

export function farmingWorkplaceCapacity(f: Readonly<Pick<FarmingState, 'houses' | 'fields' | 'pastures' | 'workshop' | 'clearedLand' | 'loggingCamps' | 'shrines'>>, id: FarmingWorkplace): number {
  switch (id) {
    case 'crops': return f.fields * T.fieldWorkers
    case 'herding': return f.pastures * T.pastureWorkers
    case 'workshop': return f.workshop ? farmingHousing(f) : 0
    case 'woodland': return f.clearedLand < T.maximumPlots ? f.loggingCamps * T.loggingCampWorkers : 0
    case 'shaman': return f.shrines * T.shrineWorkers
  }
}
/** Average production guides staffing; crop output is held separately until harvest. */
export function farmingFoodRate(f: Readonly<FarmingState>, speed = 1, season = farmingSeasonIndex(f)): number {
  return FOOD_JOBS.reduce((sum, id) => sum + farmingFoodPerWorker(f, id, speed, season) * f.assignments[id], 0)
}
export function farmingFoodPerWorker(f: Readonly<FarmingState>, id: FarmingWorkplace, speed = 1, season = farmingSeasonIndex(f)): number {
  if (!FOOD_JOBS.includes(id as typeof FOOD_JOBS[number])) return 0
  const base = T.food[id as keyof typeof T.food][season]
  const multiplier = id === 'crops' && f.irrigation ? 1.25 : 1
  return base * multiplier * speed
}
export const farmingFoodUse = (f: Readonly<FarmingState>): number => f.population * T.foodPerPersonPerMinute
export const farmingFoodBalance = (f: Readonly<FarmingState>): number => -farmingFoodUse(f)
export const farmingFoodSupport = (f: Readonly<FarmingState>, speed = 1): number => Math.floor((farmingFoodRate(f, speed) + EPSILON) / T.foodPerPersonPerMinute)
export const farmingMilestoneFlags = (f: Readonly<FarmingState>): readonly boolean[] => T.populationMilestones.map(n => f.peakPopulation >= n)
export const farmingNextPopulation = (f: Readonly<FarmingState>): number => T.populationMilestones.find(n => f.peakPopulation < n) ?? T.populationMilestones.at(-1)!
export const farmingProtection = (f: Readonly<FarmingState>): number => f.seasonProtection
export const farmingProtectionLimit = (f: Readonly<FarmingState>): number => T.protectionCaps[f.protectionUpgrades ?? 0]
export const farmingProtectionRate = (f: Readonly<FarmingState>): number => farmingProtectionLimit(f) * Math.min(1, f.assignments.shaman / (f.population * T.shamanPopulationFraction)) / T.seasonSeconds
/** Exact time until the pantry can support one more resident through this harvest. */
function growthWait(f: Readonly<FarmingState>, speed: number): number {
  if (f.phase !== 'farming' || f.completionReached || f.hungerDebt > EPSILON || f.population >= farmingHousing(f) || farmingFoodSupport(f, speed) < f.population + 1) return Infinity
  const remaining = T.seasonSeconds - f.elapsedSeconds % T.seasonSeconds
  const extraResidentUse = (f.population + 1) * T.foodPerPersonPerMinute
  const deficit = extraResidentUse / 60
  const missing = deficit * remaining - f.resources.food
  if (missing <= EPSILON) return 0
  const marginRate = farmingFoodBalance(f) / 60 + deficit
  return marginRate > 0 ? missing / marginRate : Infinity
}
export const farmingGrowthRate = (f: Readonly<FarmingState>, speed = 1): number => growthWait(f, speed) === 0 ? 1 / T.growthSeconds : 0

function random(f: MutableFarming): number {
  let seed = f.disasterSeed | 0
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
  f.disasterSeed = seed >>> 0
  return f.disasterSeed / 0x1_0000_0000
}
/** One persisted random roll at the end of the season that just finished. */
function rollSeasonDisaster(f: MutableFarming, endedSeason: number): void {
  const kind: FarmingDisaster = (['flood', 'fire', 'sickness'] as const)[Math.floor(random(f) * 3)]
  const prevented = random(f) < farmingProtection(f)
  f.seasonProtection = 0
  const loss = prevented ? 0 : Math.min(f.population - 1, Math.ceil(f.population * T.disasterPopulationLoss))
  if (loss > 0) {
    f.population -= loss
    f.disasterDeaths = safeAdd(f.disasterDeaths, loss)
    f.growthProgress = 0
  }
  f.disasters = safeAdd(f.disasters, 1)
  f.lastDisaster = { kind, at: f.elapsedSeconds, season: FARMING_SEASONS[endedSeason], prevented, loss }
}

function initialFarming(): MutableFarming {
  return {
    version: 12, cropHarvest: 0, livestockHarvest: 0, foodPriority: 'crops', workPriority: 'woodland', seasonProtection: 0, phase: 'farming', elapsedSeconds: 0, population: 3, peakPopulation: 3,
    houses: 1, clearedLand: 2, loggingCamps: 1, fields: 1, pastures: 0, granaries: 0, shrines: 0,
    workshop: false, irrigation: false,
    assignments: { crops: 1, herding: 0, woodland: 2, workshop: 0, shaman: 0 },
    growthProgress: 0, hungerDebt: 0, disasterSeed: Math.floor(Math.random() * 0xffff_ffff) + 1,
    disasters: 0, disasterDeaths: 0,
    resources: { food: T.residentsPerHouse * T.foodPerPersonPerMinute * T.seasonSeconds / 60 * T.baseStorageSeasons, materials: 0, tools: 0 }, jobs: {}, jobSequence: 0,
    starvationDeaths: 0, naturalDeaths: 0, generations: 0, awardedCatalystIds: [],
    skillRewardPending: false, completionReached: false, legacyWorkCredit: 0,
  }
}
export function startFarming(state: CanonicalGameStateV1): CanonicalGameStateV1 | null {
  const previous = state.civilization
  if (!previous || previous.farming || !civilizationOpeningComplete(previous) || state.meta.reworkMigrationChoice === undefined) return null
  const f = initialFarming()
  settle(f, farmingSpeed(state))
  return { ...state, civilization: replaceForagerWithFarming(previous, f) }
}
/** Only global rewards cross the era boundary. No Forager production keeps running. */
export function replaceForagerWithFarming(previous: Readonly<CivilizationState>, farming: FarmingState): CivilizationState {
  return { ...structuredClone(EMPTY_CIVILIZATION), version: 5, unlocked: true, awardedCatalystMilestoneIds: [...previous.awardedCatalystMilestoneIds], farming }
}

export function farmingPurchaseCount(f: Readonly<FarmingState>, purchase: FarmingPurchase): number {
  switch (purchase) {
    case 'house': return f.houses
    case 'field': return f.fields
    case 'loggingCamp': return f.loggingCamps
    case 'pasture': return f.pastures
    case 'granary': return f.granaries
    case 'shamanTraining': return f.protectionUpgrades ?? 0
    case 'shrine': return f.shrines
    default: return Number(f[purchase])
  }
}
export function farmingPurchaseUnlocked(f: Readonly<FarmingState>, purchase: FarmingPurchase): boolean {
  switch (purchase) {
    case 'workshop': return f.clearedLand > 2
    case 'house': case 'field': case 'loggingCamp': return f.workshop
    case 'pasture': return f.fields >= 2 && f.houses >= 2
    case 'granary': return f.houses >= 3
    case 'shrine': return f.houses >= 4
    case 'shamanTraining': return (f.protectionUpgrades ?? 0) < 3 && f.peakPopulation >= T.protectionPopulationRequirements[f.protectionUpgrades ?? 0]
    case 'irrigation': return f.fields >= 4
  }
}
export function farmingPurchaseVisible(f: Readonly<FarmingState>, purchase: FarmingPurchase): boolean {
  if (purchase === 'shamanTraining') return f.shrines > 0 && (f.protectionUpgrades ?? 0) < 3
  if (purchase === 'workshop') return !f.workshop
  if (purchase === 'house' || purchase === 'field' || purchase === 'loggingCamp') return f.workshop
  if (purchase === 'pasture') return f.workshop && f.houses >= 2
  if (purchase === 'granary') return f.houses >= 2
  if (purchase === 'shrine') return f.houses >= 3
  return !f.irrigation && f.fields >= 3
}
export const farmingPurchaseLand = (purchase: FarmingPurchase): number => purchase === 'irrigation' || purchase === 'loggingCamp' || purchase === 'shamanTraining' ? 0 : 1
export function farmingPurchaseCost(f: Readonly<FarmingState>, purchase: FarmingPurchase): FarmingRecipe {
  const n = farmingPurchaseCount(f, purchase)
  const cost = (materials: number, tools: number): FarmingRecipe => ({ materials: Math.ceil(materials), ...(tools ? { tools: Math.ceil(tools) } : {}) })
  switch (purchase) {
    case 'workshop': return cost(20, 0)
    case 'house': { const scale = (1 + .18 * (n - 1)) ** 1.25; return cost(36 * scale, 2 * Math.sqrt(scale)) }
    case 'loggingCamp': { const scale = (1 + .2 * (n - 1)) ** 1.2; return cost(24 * scale, 2 * Math.sqrt(scale)) }
    case 'field': { const scale = (1 + .2 * (f.fields)) ** 1.2; return cost(24 * scale, 2 * Math.sqrt(scale)) }
    case 'pasture': { const scale = (1 + .22 * n) ** 1.2; return cost(50 * scale, 6 * Math.sqrt(scale)) }
    case 'granary': return cost(120 * 1.55 ** n, 10 * 1.35 ** n)
    case 'shrine': return cost(90 * (1 + .3 * n) ** 1.2, 8 * (1 + .2 * n))
    case 'shamanTraining': return cost(120 * 2 ** n, 10 * 2 ** n)
    case 'irrigation': return cost(260, 24)
  }
}
export function farmingPurchaseStatus(f: Readonly<FarmingState>, purchase: FarmingPurchase): 'ready' | 'locked' | 'land' | 'inputs' | 'owned' | 'complete' {
  if (f.phase === 'complete' || f.completionReached) return 'complete'
  if (purchase === 'shamanTraining' && (f.protectionUpgrades ?? 0) >= 3) return 'owned'
  if (['workshop', 'irrigation'].includes(purchase) && farmingPurchaseCount(f, purchase)) return 'owned'
  if (purchase === 'house' && f.houses >= T.maximumHouses || farmingPurchaseCount(f, purchase) >= T.maximumPlots) return 'owned'
  if (!farmingPurchaseUnlocked(f, purchase)) return 'locked'
  if (farmingFreeLand(f) < farmingPurchaseLand(purchase)) return 'land'
  const cost = farmingPurchaseCost(f, purchase)
  return Object.entries(cost).every(([id, n]) => f.resources[id as FarmingResource] + EPSILON >= n!) ? 'ready' : 'inputs'
}
export function buyFarmingPurchase(state: CanonicalGameStateV1, purchase: FarmingPurchase, quantity: number | 'max' = 1): CanonicalGameStateV1 | null {
  const source = state.civilization?.farming
  if (!source || !FARMING_PURCHASES.includes(purchase) || quantity !== 'max' && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > T.maximumPlots)) return null
  const f = clone(source)
  let bought = 0
  while (bought < (quantity === 'max' ? T.maximumPlots : quantity) && farmingPurchaseStatus(f, purchase) === 'ready') {
    for (const [id, n] of Object.entries(farmingPurchaseCost(f, purchase))) f.resources[id as FarmingResource] = Math.max(0, f.resources[id as FarmingResource] - n!)
    if (purchase === 'house') f.houses++
    else if (purchase === 'field') f.fields++
    else if (purchase === 'loggingCamp') f.loggingCamps++
    else if (purchase === 'pasture') f.pastures++
    else if (purchase === 'granary') f.granaries++
    else if (purchase === 'shrine') f.shrines++
    else if (purchase === 'shamanTraining') f.protectionUpgrades = (f.protectionUpgrades ?? 0) + 1
    else f[purchase] = true
    bought++
    if (['workshop', 'irrigation'].includes(purchase)) break
  }
  if (!bought) return null
  settle(f, farmingSpeed(state))
  return withFarming(state, f)
}
export const buyFarmingGranary = (state: CanonicalGameStateV1): CanonicalGameStateV1 | null => buyFarmingPurchase(state, 'granary')
export function setFarmingPriority(state: CanonicalGameStateV1, workplace: FarmingWorkplace): CanonicalGameStateV1 | null {
  const source = state.civilization?.farming
  if (!source || source.phase === 'complete' || source.completionReached || !FARMING_WORKPLACES.includes(workplace) || farmingWorkplaceCapacity(source, workplace) === 0) return null
  const food = workplace === 'crops' || workplace === 'herding'
  if ((food ? source.foodPriority : source.workPriority) === workplace) return null
  const f = clone(source)
  if (workplace === 'crops' || workplace === 'herding') f.foodPriority = workplace
  else f.workPriority = workplace
  settle(f, farmingSpeed(state))
  return withFarming(state, f)
}
export function completeFarmingAge(state: CanonicalGameStateV1): CanonicalGameStateV1 | null {
  const source = state.civilization?.farming
  if (!source || source.phase !== 'farming' || !source.completionReached) return null
  const f = clone(source)
  collectSeasonHarvest(f)
  f.phase = 'complete'
  f.jobs = {}
  delete f.continuous
  return withFarming(state, f)
}

function toolTarget(f: Readonly<FarmingState>): number {
  return Math.max(4, ...FARMING_PURCHASES.filter(purchase => farmingPurchaseUnlocked(f, purchase)).map(purchase => farmingPurchaseCost(f, purchase).tools ?? 0))
}
/** Prefer one food job 2:1, spilling into the other when building capacity is full. */
function foodCrew(f: Readonly<FarmingState>, count: number): { crops: number; herding: number } {
  const preferred = f.foodPriority, other = preferred === 'crops' ? 'herding' : 'crops'
  const first = Math.min(farmingWorkplaceCapacity(f, preferred), Math.max(count - farmingWorkplaceCapacity(f, other), Math.floor((2 * count + 1) / 3)))
  return preferred === 'crops' ? { crops: first, herding: count - first } : { crops: count - first, herding: first }
}
/** Allocate only the food crew needed for residents and growth, then share spare labor. */
function staffVillage(f: MutableFarming, speed: number): void {
  const requiredFood = Math.min(farmingHousing(f), f.population + 1) * T.foodPerPersonPerMinute
  let low = 0, high = Math.min(f.population, farmingWorkplaceCapacity(f, 'crops') + farmingWorkplaceCapacity(f, 'herding'))
  while (low < high) {
    const mid = Math.floor((low + high) / 2), crew = foodCrew(f, mid)
    const production = crew.crops * farmingFoodPerWorker(f, 'crops', speed) + crew.herding * farmingFoodPerWorker(f, 'herding', speed)
    if (production + EPSILON >= requiredFood) high = mid
    else low = mid + 1
  }
  const food = foodCrew(f, low)
  const crafting = !!f.jobs.workshop || f.resources.tools < toolTarget(f) && f.resources.materials + EPSILON >= T.toolMaterials
  const capacities = {
    woodland: farmingWorkplaceCapacity(f, 'woodland'),
    workshop: crafting ? farmingWorkplaceCapacity(f, 'workshop') : 0,
    shaman: Math.min(farmingWorkplaceCapacity(f, 'shaman'), Math.ceil(f.population * T.shamanPopulationFraction)),
  }
  const crew = { woodland: 0, workshop: 0, shaman: 0 }
  let remaining = f.population - low
  let available = (['woodland', 'workshop', 'shaman'] as const).filter(id => capacities[id] > 0)
  // Saturated buildings release their unused share before largest-remainder rounding.
  while (remaining > 0 && available.length > 0) {
    const weight = (id: typeof available[number]) => id === f.workPriority ? 2 : 1
    const total = available.reduce((sum, id) => sum + weight(id), 0)
    const saturated = available.filter(id => remaining * weight(id) >= capacities[id] * total)
    if (saturated.length) {
      for (const id of saturated) { crew[id] = capacities[id]; remaining -= capacities[id] }
      available = available.filter(id => !saturated.includes(id))
      continue
    }
    const shares = available.map(id => ({ id, amount: Math.floor(remaining * weight(id) / total), remainder: remaining * weight(id) % total }))
    const spare = remaining - shares.reduce((sum, share) => sum + share.amount, 0)
    shares.sort((a, b) => b.remainder - a.remainder || weight(b.id) - weight(a.id) || FARMING_WORKPLACES.indexOf(a.id) - FARMING_WORKPLACES.indexOf(b.id))
    for (const [index, share] of shares.entries()) crew[share.id] = share.amount + Number(index < spare)
    break
  }
  f.assignments = { ...food, ...crew }
}
function normalizePopulation(f: MutableFarming, speed: number): void {
  if (f.hungerDebt >= T.starvationFoodPerDeath - EPSILON && f.population > 1) {
    f.population--
    f.starvationDeaths = safeAdd(f.starvationDeaths, 1)
    f.hungerDebt = 0
  }
  if (f.growthProgress >= 1 - EPSILON && f.population < farmingHousing(f)) { f.population++; f.growthProgress = 0 }
  staffVillage(f, speed)
  if (f.population >= farmingHousing(f) || f.hungerDebt > EPSILON) f.growthProgress = 0
  if (f.hungerDebt > 0 && f.resources.food > 0) {
    const fed = Math.min(f.resources.food, f.hungerDebt)
    f.resources.food -= fed
    f.hungerDebt -= fed
  }
  if (f.population <= 1 || f.hungerDebt < EPSILON) f.hungerDebt = 0
  f.peakPopulation = Math.max(f.peakPopulation, f.population)
  if (f.peakPopulation >= T.populationMilestones.at(-1)!) f.completionReached = true
}
function newJob(f: MutableFarming, kind: 'woodland' | 'workshop'): FarmingJob {
  const work = kind === 'woodland' ? T.clearingWork * (1 + T.clearingGrowth * (f.clearedLand - 1)) ** T.clearingPower : T.toolWork
  const credit = Math.min(f.legacyWorkCredit, work)
  f.legacyWorkCredit -= credit
  f.jobSequence = safeAdd(f.jobSequence, 1)
  return { kind, cycle: f.jobSequence, work, remainingWork: work - credit,
    inputs: kind === 'woodland' ? {} : { materials: T.toolMaterials },
    outputs: kind === 'woodland' ? { materials: farmingClearingMaterials(f) } : { tools: T.toolOutput }, land: Number(kind === 'woodland') }
}
function settle(f: MutableFarming, speed: number): void {
  normalizePopulation(f, speed)
  if (f.phase === 'complete' || f.completionReached) { delete f.continuous; return }
  let changed: boolean
  do {
    changed = false
    // A completed clearing can fund a Workshop immediately at this same boundary.
    staffVillage(f, speed)
    for (const id of ['woodland', 'workshop'] as const) {
      const job = f.jobs[id]
      if (job && job.remainingWork <= EPSILON) {
        for (const [resource, n] of Object.entries(job.outputs)) f.resources[resource as FarmingResource] = safeAdd(f.resources[resource as FarmingResource], n!)
        f.clearedLand += job.land
        if (f.clearedLand >= T.maximumPlots) f.assignments.woodland = 0
        delete f.jobs[id]
        changed = true
      }
      if (!f.jobs[id] && f.assignments[id] > 0 && farmingWorkplaceCapacity(f, id) > 0 && (id === 'woodland' || f.resources.tools < toolTarget(f) && f.resources.materials + EPSILON >= T.toolMaterials)) {
        if (id === 'workshop') f.resources.materials = Math.max(0, f.resources.materials - T.toolMaterials)
        f.jobs[id] = newJob(f, id)
        if (f.jobs[id]!.remainingWork <= EPSILON) changed = true
      }
    }
  } while (changed)
  staffVillage(f, speed)
}
function segment(f: MutableFarming, speed: number): NonNullable<FarmingState['continuous']> {
  const signature = JSON.stringify([speed, farmingSeasonIndex(f), f.population, f.houses, f.granaries, f.assignments, f.irrigation, f.protectionUpgrades ?? 0, farmingGrowthRate(f, speed), (['woodland', 'workshop'] as const).map(id => [id, f.jobs[id]?.cycle ?? null])])
  if (f.continuous?.signature === signature) return f.continuous
  return f.continuous = { since: f.elapsedSeconds, food: f.resources.food, growthProgress: f.growthProgress, hungerDebt: f.hungerDebt, seasonProtection: f.seasonProtection, cropHarvest: f.cropHarvest, livestockHarvest: f.livestockHarvest, signature,
    jobs: Object.fromEntries(Object.entries(f.jobs).map(([id, job]) => [id, job.remainingWork])) }
}
function withFarming(state: CanonicalGameStateV1, f: MutableFarming): CanonicalGameStateV1 {
  let challenges = state.challenges ?? EMPTY_INFINITY_CHALLENGES
  const pending = farmingMilestoneFlags(f).some((yes, i) => yes && !f.awardedCatalystIds.includes(`farming-catalyst-${i + 1}`))
  const eligible = !pending || eligibleCanonicalFractureIds(state).length > 0
  f.skillRewardPending = pending && (!eligible || challenges.galvanizers === DISCRETE_MAXIMUM)
  if (eligible) for (const [i, yes] of farmingMilestoneFlags(f).entries()) {
    const id = `farming-catalyst-${i + 1}`
    if (yes && !f.awardedCatalystIds.includes(id) && challenges.galvanizers < DISCRETE_MAXIMUM) {
      f.awardedCatalystIds.push(id)
      challenges = { ...challenges, galvanizers: challenges.galvanizers + 1n, hasEarnedGalvanizer: true, unlocked: true }
    }
  }
  return { ...state, civilization: { ...state.civilization!, farming: f }, challenges }
}
/** Integrate only to real changes: jobs, seasons, reserve boundaries and generations. */
export function advanceFarming(state: CanonicalGameStateV1, seconds: number, stopAtDecision = false): CanonicalGameStateV1 {
  const source = state.civilization?.farming
  if (!source || !Number.isFinite(seconds) || seconds <= 0) return state
  const f = clone(source), speed = farmingSpeed(state)
  if (f.phase === 'complete' || f.completionReached) return withFarming(state, f)
  settle(f, speed)
  const end = f.elapsedSeconds + seconds
  if (!Number.isFinite(end) || end <= f.elapsedSeconds) throw Error('Village clock precision exhausted.')
  while (f.elapsedSeconds < end && !f.completionReached) {
    if (stopAtDecision && farmingManualGate(f)) break
    const a = segment(f, speed), net = farmingFoodBalance(f) / 60, cap = farmingCapacity(f)
    const seasonEnd = (Math.floor(f.elapsedSeconds / T.seasonSeconds) + 1) * T.seasonSeconds
    let at = Math.min(end, seasonEnd)
    const growth = farmingGrowthRate(f, speed)
    const growthReadyAt = f.elapsedSeconds + growthWait(f, speed)
    if (growth === 0 && growthReadyAt > f.elapsedSeconds && growthReadyAt < seasonEnd) at = Math.min(at, growthReadyAt)
    const healing = net > 0 && f.hungerDebt > EPSILON ? net : 0
    const reserveNet = net - healing
    const hunger = net < 0 && f.resources.food <= EPSILON && f.population > 1 ? -net : -healing
    if (growth > 0) at = Math.min(at, a.since + (1 - a.growthProgress) / growth)
    if (hunger > 0) at = Math.min(at, a.since + (T.starvationFoodPerDeath - a.hungerDebt) / hunger)
    if (healing > 0) at = Math.min(at, a.since + a.hungerDebt / healing)
    if (reserveNet < 0 && f.resources.food > EPSILON) at = Math.min(at, a.since + a.food / -reserveNet)
    if (reserveNet > 0 && f.resources.food < cap - EPSILON) at = Math.min(at, a.since + (cap - a.food) / reserveNet)
    for (const id of Object.keys(f.jobs)) {
      const rate = f.assignments[id as 'woodland' | 'workshop'] * speed
      if (rate > 0) at = Math.min(at, a.since + a.jobs[id as 'woodland' | 'workshop']! / rate)
    }
    if (at <= f.elapsedSeconds) throw Error('Village boundary did not advance.')
    const dt = at - a.since, previousFood = f.resources.food
    f.cropHarvest = safeAdd(a.cropHarvest, farmingFoodPerWorker(f, 'crops', speed) * f.assignments.crops * dt / 60)
    f.livestockHarvest = safeAdd(a.livestockHarvest, farmingFoodPerWorker(f, 'herding', speed) * f.assignments.herding * dt / 60)
    f.seasonProtection = Math.min(Math.max(farmingProtectionLimit(f), a.seasonProtection), a.seasonProtection + farmingProtectionRate(f) * dt)
    f.resources.food = Math.max(0, Math.min(cap, a.food + reserveNet * dt))
    if (f.resources.food < EPSILON) f.resources.food = 0
    f.growthProgress = Math.min(1, a.growthProgress + growth * dt)
    f.hungerDebt = Math.max(0, Math.min(T.starvationFoodPerDeath, a.hungerDebt + hunger * dt))
    for (const [id, job] of Object.entries(f.jobs)) f.jobs[id as 'woodland' | 'workshop'] = { ...job, remainingWork: Math.max(0, a.jobs[id as 'woodland' | 'workshop']! - f.assignments[id as 'woodland' | 'workshop'] * speed * dt) }
    f.elapsedSeconds = at
    const seasonEnded = at === seasonEnd
    if (seasonEnded) {
      collectSeasonHarvest(f)
      rollSeasonDisaster(f, (Math.floor(seasonEnd / T.seasonSeconds) - 1) % FARMING_SEASONS.length)
    }
    const generation = Math.floor(at / (T.seasonSeconds * T.generationSeasons))
    if (generation > f.generations) {
      f.naturalDeaths = safeAdd(f.naturalDeaths, f.population * (generation - f.generations))
      f.generations = generation
    }
    const boundary = seasonEnded || at === growthReadyAt || at !== end || f.growthProgress >= 1 - EPSILON || f.hungerDebt >= T.starvationFoodPerDeath - EPSILON || healing > 0 && f.hungerDebt < EPSILON || (previousFood > 0 && f.resources.food === 0) || (previousFood < cap && f.resources.food === cap) || Object.values(f.jobs).some(job => job.remainingWork <= EPSILON)
    settle(f, speed)
    if (boundary) delete f.continuous
  }
  return withFarming(state, f)
}
/** Preserve unused Stored Time at the final village decision. */
export function farmingStoredTimeBudget(state: CanonicalGameStateV1, baseSeconds: number): number {
  const f = state.civilization?.farming
  if (!f || f.phase === 'complete' || !Number.isFinite(baseSeconds) || baseSeconds <= 0) return baseSeconds
  if (farmingManualGate(f)) return 0
  const speed = state.timeline.doubleTime.unlocked ? 2 : 1
  const after = advanceFarming(state, baseSeconds * speed, true).civilization!.farming!
  return Math.min(baseSeconds, Math.max(0, after.elapsedSeconds - f.elapsedSeconds) / speed)
}

/** Preserve the old source exactly, refund paid inputs, and carry invested work once. */
export function migrateLegacyFarming(previous: LegacyFarmingState): FarmingState {
  const issue = validateLegacyFarming(previous, previous.version)
  if (issue) throw Error(issue)
  const f = initialFarming()
  f.legacyVillage = structuredClone(previous)
  f.elapsedSeconds = previous.elapsedSeconds + previous.tickRemainder
  f.generations = Math.floor(f.elapsedSeconds / (T.seasonSeconds * T.generationSeasons))
  f.houses = 1 + previous.homesBuilt
  f.fields = Math.max(1, previous.firstHarvest ? Math.ceil(previous.homesBuilt / 2) : 1) + Number(previous.completedBuildings.includes('intensiveCultivation'))
  f.pastures = Number(previous.completedBuildings.includes('pasture'))
  f.granaries = previous.granaries
  f.workshop = previous.firstHarvest
  f.irrigation = previous.completedBuildings.includes('waterworks')
  f.clearedLand = farmingUsedLand(f)
  f.resources = { food: previous.resources.food, materials: previous.resources.materials + previous.resources.goods * 2, tools: previous.resources.tools }
  for (const job of Object.values(previous.jobs)) {
    for (const [id, n] of Object.entries(job.inputs)) {
      if (id === 'goods') f.resources.materials = safeAdd(f.resources.materials, n! * 2)
      else f.resources[id as FarmingResource] = safeAdd(f.resources[id as FarmingResource], n!)
    }
    f.legacyWorkCredit = safeAdd(f.legacyWorkCredit, job.work - job.remainingWork)
  }
  // Preserve refundable Food even when the old prototype had no Granary yet.
  if (f.resources.food > farmingCapacity(f)) {
    f.granaries = Math.ceil(f.resources.food / T.granaryCapacity)
    f.clearedLand = Math.max(f.clearedLand, farmingUsedLand(f))
  }
  f.population = Math.min(farmingHousing(f), 3 + previous.homes.length * 2)
  f.disasterSeed = migrationSeed(f.elapsedSeconds, f.population)
  staffVillage(f, 1)
  f.peakPopulation = Math.max(f.population, ...previous.awardedCatalystIds.map(id => T.populationMilestones[Number(id.split('-').at(-1)) - 1] ?? 0))
  f.awardedCatalystIds = [...previous.awardedCatalystIds]
  f.skillRewardPending = previous.skillRewardPending
  f.completionReached = previous.phase === 'complete' || previous.phase === 'settling-village'
  f.phase = f.completionReached ? 'complete' : 'farming'
  f.resources.food = migrationFood(f)
  return f
}

/** Keep the complete manual village receipt and every paid cycle. */
export function migrateAssignedFarming(previous: AssignedFarmingState): FarmingState {
  const issue = validateAssignedFarming(previous)
  if (issue) throw Error(issue)
  const { version: _version, barleyFields, wheatFields, nets, cattle, assignments: _assignments, continuous: _continuous, ...retained } = previous
  const f: MutableFarming = { ...initialFarming(), ...retained, version: 12, loggingCamps: Math.max(1, Math.ceil(previous.assignments.woodland / T.loggingCampWorkers)), fields: Math.max(1, barleyFields + wheatFields),
    previousVillage: structuredClone(previous), resources: { ...previous.resources },
    assignments: { crops: 0, herding: 0, woodland: 0, workshop: 0, shaman: 0 },
    jobs: structuredClone(previous.jobs), awardedCatalystIds: [...previous.awardedCatalystIds] }
  f.clearedLand = Math.max(f.clearedLand, farmingUsedLand(f))
  // Retired upgrades return their complete purchase costs.
  if (nets) { f.resources.materials += 120; f.resources.tools += 12 }
  if (cattle) { f.resources.materials += 180; f.resources.tools += 18 }
  f.disasterSeed = migrationSeed(previous.elapsedSeconds, previous.population)
  staffVillage(f, 1)
  f.resources.food = migrationFood(f)
  return f
}

/** Existing clearing crews retain enough camps; their paid work and stocks are untouched. */
export function migrateAutomaticFarming(previous: AutomaticFarmingState): FarmingState {
  const issue = validateFarming(previous, 5)
  if (issue) throw Error(issue)
  return migrateManagedFarming({ ...previous, version: 6, loggingCamps: Math.max(1, Math.ceil(previous.assignments.woodland / T.loggingCampWorkers)), previousAutomaticVillage: structuredClone(previous) }, false)
}

const migrationSeed = (elapsed: number, population: number) => ((Math.floor(elapsed) ^ (population * 2654435761)) >>> 0) || 1
function withJobPreferences(previous: ManagedFarmingState): PreferredFarmingState {
  const { continuous: _continuous, ...retained } = previous
  return { ...retained, version: 7, shrines: 0,
    assignments: { ...previous.assignments, shaman: 0 },
    desiredJobs: { ...previous.assignments, woodland: previous.loggingCamps * T.loggingCampWorkers, shaman: 0 },
    growthProgress: 0, hungerDebt: 0, disasterSeed: migrationSeed(previous.elapsedSeconds, previous.population),
    nextDisasterSeconds: previous.elapsedSeconds + T.seasonSeconds * 3, sicknessUntil: 0, disasters: 0 }
}
export function migrateManagedFarming(previous: ManagedFarmingState, archive = true): FarmingState {
  const issue = validateFarming(previous, 6)
  if (issue) throw Error(issue)
  return migratePreferredFarming({ ...withJobPreferences(previous), ...(archive ? { previousManagedVillage: structuredClone(previous) } : {}) }, false)
}

/** Keep the old disaster receipt, RNG position, crews and funded work losslessly. */
export function migratePreferredFarming(previous: PreferredFarmingState, archive = true): FarmingState {
  const issue = validateFarming(previous, 7)
  if (issue) throw Error(issue)
  const { version: _version, nextDisasterSeconds: _nextDisaster, sicknessUntil: _sickness,
    lastDisaster: _lastDisaster, continuous: _continuous, ...retained } = structuredClone(previous)
  return migrateProtectedFarming({ ...retained, version: 9, seasonProtection: 0, disasterDeaths: 0,
    ...(archive ? { previousPreferredVillage: structuredClone(previous) } : {}) }, false)
}

/** Existing V8 villages retain their full source, clocks, population and paid work. */
export function migrateSeasonalFarming(previous: SeasonalFarmingState): FarmingState {
  const issue = validateFarming(previous, 8)
  if (issue) throw Error(issue)
  const { continuous: _continuous, ...retained } = structuredClone(previous)
  return migrateProtectedFarming({ ...retained, version: 9, seasonProtection: 0, previousSeasonalVillage: structuredClone(previous) }, false)
}

/** Archive manual limits, retain invested progress, and begin automatic staffing without earning time. */
export function migrateProtectedFarming(previous: ProtectedFarmingState, archive = true): FarmingState {
  const issue = validateFarming(previous, 9)
  if (issue) throw Error(issue)
  const { desiredJobs: _desiredJobs, continuous: _continuous, ...retained } = structuredClone(previous)
  // Preserve crews until the first simulation boundary has the canonical fracture speed.
  return migratePrioritizedFarming({ ...retained, version: 10, foodPriority: 'crops', workPriority: 'woodland',
    ...(archive ? { previousProtectedVillage: structuredClone(previous) } : {}) }, false)
}

/** Migration adds only missing bridge provisions; past crop work was already paid. */
export function migratePrioritizedFarming(previous: PrioritizedFarmingState, archive = true): FarmingState {
  const issue = validateFarming(previous, 10)
  if (issue) throw Error(issue)
  const { continuous: _continuous, ...retained } = structuredClone(previous)
  return migrateCropHarvestFarming({ ...retained, version: 11, cropHarvest: 0, resources: { ...retained.resources, food: migrationFood(previous) },
    ...(archive ? { previousPrioritizedVillage: structuredClone(previous) } : {}) }, false)
}

function migrationFood(previous: Pick<PrioritizedFarmingState, 'elapsedSeconds' | 'phase' | 'completionReached' | 'population' | 'resources'>): number {
  const remaining = T.seasonSeconds - previous.elapsedSeconds % T.seasonSeconds
  const bridge = previous.phase === 'complete' || previous.completionReached ? 0 : previous.population * T.foodPerPersonPerMinute * remaining / 60
  return Math.max(previous.resources.food, bridge)
}

/** Preserve the short-lived crops-only preview while moving livestock to seasonal payout. */
export function migrateCropHarvestFarming(previous: CropHarvestFarmingState, archive = true): FarmingState {
  const issue = validateFarming(previous, 11)
  if (issue) throw Error(issue)
  const { continuous: _continuous, ...retained } = structuredClone(previous)
  return { ...retained, version: 12, livestockHarvest: 0, resources: { ...retained.resources, food: migrationFood(previous) },
    ...(archive ? { previousCropHarvestVillage: structuredClone(previous) } : {}) }
}

function collectSeasonHarvest(f: MutableFarming): void {
  const harvest = safeAdd(f.cropHarvest, f.livestockHarvest)
  const fed = Math.min(harvest, f.hungerDebt)
  f.hungerDebt -= fed
  f.resources.food = Math.min(farmingCapacity(f), safeAdd(f.resources.food, harvest - fed))
  f.cropHarvest = 0
  f.livestockHarvest = 0
}

export function validateFarming(value: unknown, version = 12): string | null {
  if (version === 12) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid seasonal food village.'
    const f = value as FarmingState
    if (f.protectionUpgrades !== undefined && (!Number.isInteger(f.protectionUpgrades) || f.protectionUpgrades < 0 || f.protectionUpgrades > 3)) return 'Invalid Shaman training level.'
    if (f.version !== 12 || !Number.isFinite(f.livestockHarvest) || f.livestockHarvest < 0 || f.livestockHarvest > Number.MAX_SAFE_INTEGER) return 'Invalid livestock harvest.'
    if (f.continuous && (!Number.isFinite(f.continuous.livestockHarvest) || f.continuous.livestockHarvest < 0 || f.continuous.livestockHarvest > f.livestockHarvest + EPSILON)) return 'Invalid livestock harvest anchor.'
    if (f.previousCropHarvestVillage && validateFarming(f.previousCropHarvestVillage, 11)) return 'Invalid previous crop harvest village.'
    return validateFarming({ ...f, version: 11 }, 11)
  }
  if (version === 11) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid harvest village.'
    const f = value as CropHarvestFarmingState
    if (f.version !== 11 || !Number.isFinite(f.cropHarvest) || f.cropHarvest < 0 || f.cropHarvest > Number.MAX_SAFE_INTEGER) return 'Invalid accumulated harvest.'
    if (f.continuous && (!Number.isFinite(f.continuous.cropHarvest) || f.continuous.cropHarvest < 0 || f.continuous.cropHarvest > f.cropHarvest + EPSILON)) return 'Invalid harvest anchor.'
    if (!f.resources || !Number.isFinite(f.resources.food) || f.resources.food < 0 || f.resources.food > farmingCapacity(f) + EPSILON) return 'Invalid village food storage.'
    if (f.previousPrioritizedVillage && validateFarming(f.previousPrioritizedVillage, 10)) return 'Invalid previous prioritized village.'
    // Earlier versions had no base pantry; validate their shared structure separately.
    const old = { ...f, version: 10, resources: { ...f.resources, food: Math.min(f.resources.food, legacyFarmingCapacity(f)) } }
    return validateFarming(old, 10)
  }
  if (version === 10) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid automatic priority village.'
    const f = value as PrioritizedFarmingState
    if (f.version !== 10 || !['crops', 'herding'].includes(f.foodPriority) || !['woodland', 'workshop', 'shaman'].includes(f.workPriority)) return 'Invalid village priorities.'
    if (f.previousProtectedVillage && validateFarming(f.previousProtectedVillage, 9)) return 'Invalid previous protected village.'
    return validateFarming({ ...f, version: 9, desiredJobs: Object.fromEntries(FARMING_WORKPLACES.map(id => [id, id === 'woodland' ? f.loggingCamps * T.loggingCampWorkers : farmingWorkplaceCapacity(f, id)])) }, 9)
  }
  if (version === 9) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid protected village.'
    const f = value as ProtectedFarmingState
    const protection = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1
    if (f.version !== 9 || !protection(f.seasonProtection) || f.seasonProtection > (f.elapsedSeconds % T.seasonSeconds) / T.seasonSeconds + EPSILON) return 'Invalid earned village protection.'
    if (f.continuous && !protection(f.continuous.seasonProtection)) return 'Invalid village protection anchor.'
    if (f.previousSeasonalVillage && validateFarming(f.previousSeasonalVillage, 8)) return 'Invalid previous seasonal village.'
    return validateFarming({ ...f, version: 8 }, 8)
  }
  if (version >= 1 && version <= 3) return validateLegacyFarming(value, version as 1 | 2 | 3)
  if (version === 4) return validateAssignedFarming(value)
  if (version === 5) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid automatic village.'
    const previous = value as AutomaticFarmingState
    return validateFarming({ ...previous, version: 6, loggingCamps: Math.ceil(T.maximumHouses * T.residentsPerHouse / T.loggingCampWorkers) }, 6)
  }
  if (version === 6) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid managed village.'
    const previous = value as ManagedFarmingState
    if (previous.version !== 6 || !previous.assignments || Object.keys(previous.assignments).length !== 4 || previous.assignments.crops + previous.assignments.herding < 1) return 'Invalid managed village assignments.'
    const issue = validateFarming(withJobPreferences(previous), 7)
    if (issue) return issue
    const a = previous.continuous
    if (a && (!Number.isFinite(a.since) || a.since < 0 || a.since > previous.elapsedSeconds || !Number.isFinite(a.food) || a.food < 0 || typeof a.signature !== 'string' || !a.jobs || Object.values(a.jobs).some(x => !Number.isFinite(x) || x < 0))) return 'Invalid managed village clock anchor.'
    return null
  }
  if (version === 8) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid seasonal village.'
    const current = value as SeasonalFarmingState
    if (current.version !== 8 || !Number.isSafeInteger(current.disasterDeaths) || current.disasterDeaths < 0) return 'Invalid village disaster deaths.'
    const last = current.lastDisaster
    if (last && (!['flood', 'fire', 'sickness'].includes(last.kind) || !Number.isFinite(last.at) || last.at <= 0 || last.at > current.elapsedSeconds || !Number.isInteger(last.at / T.seasonSeconds) || last.season !== FARMING_SEASONS[(last.at / T.seasonSeconds - 1) % FARMING_SEASONS.length] || !Number.isSafeInteger(last.loss) || last.loss < 0 || typeof last.prevented !== 'boolean' || last.prevented && last.loss !== 0 || last.loss > current.disasterDeaths)) return 'Invalid seasonal disaster receipt.'
    if (current.previousPreferredVillage && validateFarming(current.previousPreferredVillage, 7)) return 'Invalid previous preferred village.'
    // Share structural checks while keeping the retired timer and stock-loss
    // receipt validator intact for archived V7 saves.
    return validateFarming({ ...current, version: 7, nextDisasterSeconds: current.elapsedSeconds + T.seasonSeconds, sicknessUntil: 0, lastDisaster: undefined }, 7)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || version !== 7) return 'Invalid Farming state version.'
  const f = value as PreferredFarmingState
  const n = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER
  const integer = (v: unknown): v is number => n(v) && Number.isSafeInteger(v)
  if (f.version !== 7 || !['farming', 'complete'].includes(f.phase) || !n(f.elapsedSeconds)) return 'Invalid Farming clock or phase.'
  for (const key of ['population', 'peakPopulation', 'houses', 'clearedLand', 'loggingCamps', 'fields', 'pastures', 'granaries', 'shrines', 'jobSequence', 'starvationDeaths', 'naturalDeaths', 'generations', 'disasters', 'disasterSeed'] as const) if (!integer(f[key])) return `Invalid village ${key}.`
  if (f.loggingCamps < 1 || f.houses < 1 || f.houses > T.maximumHouses || f.clearedLand > T.maximumPlots || f.population < 1 || f.population > farmingHousing(f) || f.peakPopulation < f.population || f.peakPopulation > T.maximumHouses * T.residentsPerHouse || farmingUsedLand(f) > f.clearedLand) return 'Invalid village population or land.'
  for (const key of ['workshop', 'irrigation', 'skillRewardPending', 'completionReached'] as const) if (typeof f[key] !== 'boolean') return 'Invalid village unlock.'
  if (!f.desiredJobs || Object.keys(f.desiredJobs).length !== FARMING_WORKPLACES.length || !FARMING_WORKPLACES.every(id => integer(f.desiredJobs[id]) && f.desiredJobs[id] <= (id === 'woodland' ? f.loggingCamps * T.loggingCampWorkers : farmingWorkplaceCapacity(f, id)))) return 'Invalid village job limits.'
  if (!f.assignments || Object.keys(f.assignments).length !== FARMING_WORKPLACES.length || !FARMING_WORKPLACES.every(id => integer(f.assignments[id]) && f.assignments[id] <= Math.min(f.desiredJobs[id], farmingWorkplaceCapacity(f, id))) || farmingAssigned(f) > f.population) return 'Invalid village worker assignment.'
  if (!n(f.growthProgress) || f.growthProgress > 1 || !n(f.hungerDebt) || f.hungerDebt > T.starvationFoodPerDeath || !n(f.nextDisasterSeconds) || f.nextDisasterSeconds <= f.elapsedSeconds || !n(f.sicknessUntil) || f.disasterSeed < 1 || f.disasterSeed > 0xffff_ffff) return 'Invalid village population or disaster clock.'
  if (f.lastDisaster && (!['spoilage', 'fire', 'sickness'].includes(f.lastDisaster.kind) || !n(f.lastDisaster.at) || f.lastDisaster.at > f.elapsedSeconds || !n(f.lastDisaster.loss) || typeof f.lastDisaster.prevented !== 'boolean')) return 'Invalid village disaster receipt.'
  if (!f.resources || Object.keys(f.resources).length !== FARMING_RESOURCES.length || !FARMING_RESOURCES.every(id => n(f.resources[id])) || f.resources.food > legacyFarmingCapacity(f) + EPSILON) return 'Invalid village reserve.'
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
  if (f.previousAutomaticVillage && validateFarming(f.previousAutomaticVillage, 5)) return 'Invalid previous automatic village.'
  if (f.previousVillage && validateAssignedFarming(f.previousVillage)) return 'Invalid archived assigned village.'
  if (f.previousManagedVillage && validateFarming(f.previousManagedVillage, 6)) return 'Invalid previous managed village.'
  if (f.continuous && (!n(f.continuous.since) || f.continuous.since > f.elapsedSeconds || !n(f.continuous.food) || !n(f.continuous.growthProgress) || f.continuous.growthProgress > 1 || !n(f.continuous.hungerDebt) || f.continuous.hungerDebt > T.starvationFoodPerDeath || typeof f.continuous.signature !== 'string' || !f.continuous.jobs || Object.values(f.continuous.jobs).some(x => !n(x)))) return 'Invalid village clock anchor.'
  return null
}
