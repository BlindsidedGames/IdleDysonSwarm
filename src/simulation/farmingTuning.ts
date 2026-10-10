/** Reviewed 9 October candidate. Work is worker-seconds, never a fixed timer. */
export const FARMING_TUNING = Object.freeze({
  tickSeconds: 1,
  initialFoodCapacity: 80,
  granaryCapacity: 160,
  exportFoodUnits: 100,
  exportMaterialUnits: 300,
  maximumExportPerMinute: 2.7,
  founders: 3,
  residentsPerHome: 2,
  homeBills: [
    [16,16,2,126], [100,90,6,420], [180,150,8,588],
    [280,220,10,756], [400,300,12,924], [550,400,14,1092],
  ] as const,
  buildings: {
    pasture: { inputs: { food:120,materials:120,tools:8 }, work:672 },
    kiln: { inputs: { materials:140,tools:10 }, work:840 },
    waterworks: { inputs: { materials:260,tools:18,goods:40 }, work:1344 },
    hall: { inputs: { materials:400,tools:24,goods:90 }, work:2016 },
  },
  weights: {
    balanced: { food:1,materials:1,tools:.8,goods:.8,build:1.6,ship:1.3 },
    provisioning: { food:1.5,materials:1.5,tools:1.2,goods:1.2,build:1,ship:.8 },
    settlement: { food:.9,materials:.9,tools:.9,goods:.6,build:3,ship:.8 },
    expeditions: { food:.8,materials:.8,tools:.7,goods:.7,build:1,ship:3 },
  },
  weatherPerMinute: { balanced:-1,provisioning:2,settlement:-4,expeditions:4 },
  upkeep: { balanced:.15,provisioning:.04,settlement:.2,expeditions:.02 },
})
