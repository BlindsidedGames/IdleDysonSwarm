/** Frozen V4 baseline. Work, recipes, pacing and allocation live together so
 * later whole-arc timing discussions do not silently alter this first age. */
export const CIVILIZATION_TUNING = Object.freeze({
  workMultiplier: 1, speedPerFracture: .05, equipmentLabor: .5,
  initialHousing: 3n, shelterHousing: 2n, campHousing: 9n,
  shelterSlope: .25, campSlope: .5, pricePower: 1.1,
  equipmentInterval: 60, equipmentPopulationDivisor: 4n,
  stockResumeNumerator: 3n, stockResumeDenominator: 5n, campMinimumCrew: 2n,
})
export const CIVILIZATION_STARTER_KIT = Object.freeze({ food: 6n, materials: 18n, hides: 2n, tools: 1n })

/** Approved Forager focus trial. Farming and historical paid cycles keep V4 rates. */
export const CIVILIZATION_FOCUS_TUNING = Object.freeze({
  workMultiplier: 6, selectedRate: 12, supportRate: 6,
})
