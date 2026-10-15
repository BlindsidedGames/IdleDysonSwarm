/** Current facility tuning; the frozen Unity handoff remains migration evidence. */
export const FACILITY_BALANCE: Readonly<Record<string, Readonly<{
  costExponent: number
  baseCost?: number
  baseProduction?: number
}>>> = Object.freeze({
  assembly_lines: { costExponent: 1.21 },
  ai_managers: { costExponent: 1.22 },
  servers: { costExponent: 1.23 },
  data_centers: { costExponent: 1.24 },
  planets: { costExponent: 1.25 },
  matrioshka_brains: { costExponent: 1.25, baseCost: 1e10, baseProduction: 1 / 7200 },
  birch_planets: { costExponent: 1.25, baseCost: 1e11, baseProduction: 1 / 14400 },
  galactic_brains: { costExponent: 1.25, baseCost: 1e12, baseProduction: 1 / 28800 },
})
