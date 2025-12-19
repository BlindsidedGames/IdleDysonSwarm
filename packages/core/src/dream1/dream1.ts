import { RealityCosts } from "@ids/balance";

import { createDefaultSaveDataDream1 } from "../state/defaultState";
import type { GameState, SaveDataDream1, SaveDataPrestige } from "../state/types";

function doubleTimeMultiplier(sp: SaveDataPrestige): number {
  return sp.doDoubleTime ? sp.doubleTimeRate + 1 : 1;
}

export function manageDoubleTime(state: GameState, dt: number) {
  const sp = state.sdPrestige;
  if (!sp.doubleTimeOwned) return;

  if (sp.doubleTime > 0) {
    sp.doubleTime -= sp.doubleTimeRate * dt;
    sp.doDoubleTime = true;
    return;
  }

  sp.doubleTime = 0;
  sp.doDoubleTime = false;
}

export function applyResearch(state: GameState) {
  const sd1 = state.sdSimulation;
  const sp = state.sdPrestige;
  const sd = state.saveData;

  if (!sp.counterMeteor) sp.disasterStage = 1;
  else if (sp.counterMeteor && !sp.counterAi) sp.disasterStage = 2;
  else if (sp.counterAi && !sp.counterGw) sp.disasterStage = 3;
  else if (sp.counterGw) sp.disasterStage = 42;

  if (sp.engineering1) sd1.engineeringResearchTime = 300;
  if (sp.engineering2) sd1.engineeringResearchTime = 60;
  if (sp.engineering3) sd1.engineeringComplete = true;

  if (sp.shipping1) sd1.shippingResearchTime = 600;
  if (sp.shipping2) sd1.shippingComplete = true;

  if (sp.worldTrade1) sd1.worldTradeResearchTime = 1800;
  if (sp.worldTrade2) sd1.worldTradeResearchTime = 600;
  if (sp.worldTrade3) sd1.worldTradeComplete = true;

  if (sp.worldPeace1) sd1.worldPeaceResearchTime = 3600;
  if (sp.worldPeace2) sd1.worldPeaceResearchTime = 1800;
  if (sp.worldPeace3) sd1.worldPeaceResearchTime = 600;
  if (sp.worldPeace4) sd1.worldPeaceComplete = true;

  if (sp.mathematics1) sd1.mathematicsResearchTime = 1800;
  if (sp.mathematics2) sd1.mathematicsResearchTime = 600;
  if (sp.mathematics3) sd1.mathematicsComplete = true;

  if (sp.advancedPhysics1) sd1.advancedPhysicsResearchTime = 3600;
  if (sp.advancedPhysics2) sd1.advancedPhysicsResearchTime = 1800;
  if (sp.advancedPhysics3) sd1.advancedPhysicsResearchTime = 600;
  if (sp.advancedPhysics4) sd1.advancedPhysicsComplete = true;

  if (sp.hunter1) sd1.hunters = 1;
  if (sp.hunter2) sd1.hunters = 10;
  if (sp.hunter3) sd1.hunters = 1000;
  if (sp.hunter4) sd.huntersPerPurchase = 1000;

  if (sp.gatherer1) sd1.gatherers = 1;
  if (sp.gatherer2) sd1.gatherers = 10;
  if (sp.gatherer3) sd1.gatherers = 1000;
  if (sp.gatherer4) sd.gatherersPerPurchase = 1000;

  if (sp.workerBoost) sp.workerBoostAcivator = true;
  if (sp.citiesBoost) sp.citiesBoostActivator = true;

  if (sp.factoriesBoost) sp.factoriesBoostActivator = true;

  if (sp.bots1) sp.botsBoost1Activator = true;
  if (sp.bots2) sp.botsBoost2Activator = true;

  if (sp.rockets1) sd1.rocketsPerSpaceFactory = 5;
  if (sp.rockets2) sd1.rocketsPerSpaceFactory = 3;
  if (sp.rockets3) sd1.rocketsPerSpaceFactory = 1;

  if (sp.sfacs1) sp.sfActivator1 = true;
  if (sp.sfacs2) sp.sfActivator2 = true;
  if (sp.sfacs3) sp.sfActivator3 = true;

  if (sp.railguns1) sp.railgunActivator1 = true;
  if (sp.railguns2) sp.railgunActivator2 = true;
}

export function simulationPrestige(state: GameState, strangeMatterGained: number) {
  const sp = state.sdPrestige;
  sp.simulationCount += 1;
  sp.strangeMatter += strangeMatterGained;

  state.sdSimulation = createDefaultSaveDataDream1();
  state.sdSimulation = createDefaultSaveDataDream1();
  applyResearch(state);
}

export function tickDream1(state: GameState, dt: number) {
  manageDoubleTime(state, dt);

  tickFoundationalEra(state, dt);
  tickInformationEra(state, dt);
  tickSpaceAge(state, dt);

  checkSimulationPrestigeTriggers(state);
}

function tickFoundationalEra(state: GameState, dt: number) {
  const sd1 = state.sdSimulation;
  const sp = state.sdPrestige;
  const runtime = state.runtime.dream1;

  if (sd1.housing >= 10) {
    sd1.housing -= 10;
    sd1.villages += 1;
  }
  if (sd1.villages >= 25) {
    sd1.villages -= 25;
    sd1.cities += 1;
  }

  // Hunters
  {
    let multi = 1 + (sd1.hunters > 0 ? Math.log10(sd1.hunters) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    if (sd1.hunters >= 1) runtime.hunterTime += dt * multi;
    while (runtime.hunterTime >= 3) {
      runtime.hunterTime -= 3;
      sd1.community += 1;
    }
  }

  // Gatherers
  {
    let multi = 1 + (sd1.gatherers > 0 ? Math.log10(sd1.gatherers) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    if (sd1.gatherers >= 1) runtime.gatherTime += dt * multi;
    while (runtime.gatherTime >= 3) {
      runtime.gatherTime -= 3;
      sd1.community += 1;
    }
  }

  // Community boost
  if (sd1.communityBoostTime > 0) sd1.communityBoostTime -= dt;
  else sd1.communityBoostTime = 0;

  // Community
  {
    let multi = 1 + (sd1.community > 0 ? Math.log10(sd1.community) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    if (sd1.communityBoostTime > 0) multi *= 2;
    if (sd1.community >= 1) runtime.communityTime += dt * multi;

    while (runtime.communityTime >= 3) {
      runtime.communityTime -= 3;
      sd1.housing += 1;
    }
  }

  // Housing
  if (sd1.housing >= 1) {
    let multi = 1 + (sd1.housing > 0 ? Math.log10(sd1.housing) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    runtime.housingTime += dt * multi;

    while (runtime.housingTime >= 20) {
      runtime.housingTime -= 20;
      sd1.workers += 1;
    }
  }

  // Villages
  if (sd1.villages >= 1) {
    let multi = 1 + Math.log10(sd1.villages);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    runtime.villagesTime += dt * multi;

    while (runtime.villagesTime >= 12) {
      runtime.villagesTime -= 12;
      sd1.workers += 2;
    }
  }

  // Workers
  if (sd1.workers >= 1) {
    let multi = 1 + (sd1.workers > 0 ? Math.log10(sd1.workers) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    if (sp.workerBoostAcivator) multi *= 1 + Math.log10(sd1.workers);
    runtime.workersTime += dt * multi;

    while (runtime.workersTime >= 4) {
      runtime.workersTime -= 4;
      sd1.housing += 1;
    }
  }

  // Cities
  if (sd1.cities >= 1) {
    let multi = 1 + (sd1.cities > 0 ? Math.log10(sd1.cities) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    runtime.citiesTime += dt * multi;

    while (runtime.citiesTime >= 3) {
      runtime.citiesTime -= 3;
      sd1.workers += 5;
      if (sd1.engineeringComplete) sd1.factories += sp.citiesBoostActivator ? 10 : 1;
    }
  }
}

function tickInformationEra(state: GameState, dt: number) {
  const sd1 = state.sdSimulation;
  const sp = state.sdPrestige;
  const runtime = state.runtime.dream1;

  tickEducation(sd1, sp, dt);

  // Factories boost
  if (sd1.factoriesBoostTime > 0) sd1.factoriesBoostTime -= dt;
  else sd1.factoriesBoostTime = 0;

  // Factories
  if (sd1.factories >= 1) {
    let multi = 1 + (sd1.factories > 0 ? Math.log10(sd1.factories) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    if (sd1.factoriesBoostTime > 0) multi *= 2;
    if (sd1.shippingComplete) multi *= 2;
    if (sd1.worldTradeComplete) multi *= 2;

    runtime.factoriesTime += dt * multi;
    while (runtime.factoriesTime >= 30) {
      runtime.factoriesTime -= 30;
      sd1.bots += sp.factoriesBoostActivator ? sd1.factories * 9 : sd1.factories;
    }
  }

  // Bots
  if (sd1.bots >= 1) {
    let multi = 1 + (sd1.bots > 0 ? Math.log10(sd1.bots) : 0);
    if (sd1.bots < 100) multi *= sd1.bots / 100;
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    if (sd1.worldPeaceComplete) multi *= 2;
    if (sp.botsBoost1Activator) multi *= 2;

    runtime.botsTime += dt * multi;
    while (runtime.botsTime >= 20) {
      runtime.botsTime -= 20;
      sd1.rockets += sp.botsBoost2Activator ? 2 : 1;
    }
  }

  // Rockets -> Space factories
  while (sd1.rockets >= sd1.rocketsPerSpaceFactory && sd1.factories >= 1) {
    sd1.rockets -= sd1.rocketsPerSpaceFactory;
    sd1.factories -= 1;
    sd1.spaceFactories += 1;
  }
}

function tickEducation(sd1: SaveDataDream1, sp: SaveDataPrestige, dt: number) {
  const multi = sp.doDoubleTime ? sp.doubleTimeRate + 1 : 1;

  if (sd1.engineering && !sd1.engineeringComplete) {
    sd1.engineeringProgress += dt * multi;
    if (sd1.engineeringProgress >= sd1.engineeringResearchTime) sd1.engineeringComplete = true;
  }

  if (sd1.shipping && !sd1.shippingComplete) {
    sd1.shippingProgress += dt * multi;
    if (sd1.shippingProgress >= sd1.shippingResearchTime) sd1.shippingComplete = true;
  }

  if (sd1.worldTrade && !sd1.worldTradeComplete) {
    sd1.worldTradeProgress += dt * multi;
    if (sd1.worldTradeProgress >= sd1.worldTradeResearchTime) sd1.worldTradeComplete = true;
  }

  if (sd1.worldPeace && !sd1.worldPeaceComplete) {
    sd1.worldPeaceProgress += dt * multi;
    if (sd1.worldPeaceProgress >= sd1.worldPeaceResearchTime) sd1.worldPeaceComplete = true;
  }

  if (sd1.mathematics && !sd1.mathematicsComplete) {
    sd1.mathematicsProgress += dt * multi;
    if (sd1.mathematicsProgress >= sd1.mathematicsResearchTime) {
      sd1.solarPanelGeneration *= 2;
      sd1.mathematicsComplete = true;
    }
  }

  if (sd1.advancedPhysics && !sd1.advancedPhysicsComplete) {
    sd1.advancedPhysicsProgress += dt * multi;
    if (sd1.advancedPhysicsProgress >= sd1.advancedPhysicsResearchTime) sd1.advancedPhysicsComplete = true;
  }
}

function tickSpaceAge(state: GameState, dt: number) {
  const sd1 = state.sdSimulation;
  const sp = state.sdPrestige;
  const runtime = state.runtime.dream1;

  // Energy generation.
  {
    let solarPanelEnergy = sd1.solarPanels * sd1.solarPanelGeneration;
    if (sd1.mathematicsComplete) solarPanelEnergy *= 2;
    const fusionEnergy = sd1.fusion * sd1.fusionGeneration;
    const dysonPanelEnergy = sd1.swarmPanels * sd1.swarmPanelGeneration;
    sd1.energy += (solarPanelEnergy + fusionEnergy + dysonPanelEnergy) * doubleTimeMultiplier(sp) * dt;
  }

  // Space factories -> Dyson panels.
  if (sd1.spaceFactories >= 1 && sd1.dysonPanels < 1000) {
    let multi = 1 + (sd1.spaceFactories > 0 ? Math.log10(sd1.spaceFactories) : 0);
    if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
    if (sp.sfActivator1) multi *= 2;
    if (sp.sfActivator2) multi *= 2;
    if (sp.sfActivator3) multi *= 2;

    runtime.spaceFactoriesTime += dt * multi;
    while (runtime.spaceFactoriesTime >= 2) {
      runtime.spaceFactoriesTime -= 2;
      sd1.dysonPanels += 1;
    }
  }

  // Railgun charge.
  if (sd1.energy > 0 && sd1.railgunCharge < sd1.railgunMaxCharge) {
    if (sp.railgunActivator1) runtime.railgunTotalFireTime = 2.5;
    if (sp.railgunActivator2) runtime.railgunTotalFireTime = 1;

    const energyTillFill = sd1.railgunMaxCharge - sd1.railgunCharge;
    if (energyTillFill < sd1.energy) {
      sd1.energy -= energyTillFill;
      sd1.railgunCharge += energyTillFill;
    } else {
      sd1.railgunCharge += sd1.energy;
      sd1.energy -= sd1.energy;
    }
  }

  const requiredDysonPanels =
    sp.doubleTimeRate >= 1 && sp.doDoubleTime ? 10 * sp.doubleTimeRate : 10;

  if (sd1.railgunCharge >= sd1.railgunMaxCharge && sd1.dysonPanels >= requiredDysonPanels && !runtime.railgunFiring) {
    runtime.railgunFiring = true;
    runtime.railgunFireTime = 0;
    runtime.railgunFireTimesRemaining = 10;
  }

  // Railgun firing.
  if (!runtime.railgunFiring) return;

  const timesToFire = 10;
  const deltaCalc = timesToFire / runtime.railgunTotalFireTime;
  const timeToFill = runtime.railgunTotalFireTime / timesToFire;
  runtime.railgunFireTime += deltaCalc * dt;

  if (runtime.railgunFireTime >= timeToFill) {
    runtime.railgunFireTime = 0;
    sd1.railgunCharge -= sd1.railgunMaxCharge / 10;

    const panelsDelta = sp.doubleTimeRate >= 1 && sp.doDoubleTime ? 1 * sp.doubleTimeRate : 1;
    sd1.dysonPanels -= panelsDelta;
    sd1.swarmPanels += panelsDelta;
    runtime.railgunFireTimesRemaining -= 1;
  }

  if (sd1.railgunCharge < sd1.railgunMaxCharge / 10 || runtime.railgunFireTimesRemaining <= 0) {
    runtime.railgunFiring = false;
  }
}

function checkSimulationPrestigeTriggers(state: GameState) {
  const sd1 = state.sdSimulation;
  const sp = state.sdPrestige;

  if (sp.disasterStage === 0 || sp.disasterStage === 1) {
    if (sd1.cities >= 1) {
      sp.disasterStage = 0;
      simulationPrestige(state, 1);
    }
    return;
  }

  if (sp.disasterStage === 2) {
    if (sd1.bots >= 100) {
      sp.disasterStage = 0;
      simulationPrestige(state, 10);
    }
    return;
  }

  if (sp.disasterStage === 3) {
    if (sd1.spaceFactories >= 5) {
      sp.disasterStage = 0;
      simulationPrestige(state, 20);
    }
  }
}

export function canBuyTranslation(sp: SaveDataPrestige, tier: number): boolean {
  if (tier === 1) return !sp.translation1;
  if (tier === 2) return sp.translation1 && !sp.translation2;
  if (tier === 3) return sp.translation2 && !sp.translation3;
  if (tier === 4) return sp.translation3 && !sp.translation4;
  if (tier === 5) return sp.translation4 && !sp.translation5;
  if (tier === 6) return sp.translation5 && !sp.translation6;
  if (tier === 7) return sp.translation6 && !sp.translation7;
  return sp.translation7 && !sp.translation8;
}

export function canBuySpeed(sp: SaveDataPrestige, tier: number): boolean {
  if (tier === 1) return !sp.speed1;
  if (tier === 2) return sp.speed1 && !sp.speed2;
  if (tier === 3) return sp.speed2 && !sp.speed3;
  if (tier === 4) return sp.speed3 && !sp.speed4;
  if (tier === 5) return sp.speed4 && !sp.speed5;
  if (tier === 6) return sp.speed5 && !sp.speed6;
  if (tier === 7) return sp.speed6 && !sp.speed7;
  return sp.speed7 && !sp.speed8;
}

export function translationCost(tier: number): number {
  return RealityCosts.translation[tier - 1] ?? Number.POSITIVE_INFINITY;
}

export function speedCost(tier: number): number {
  return RealityCosts.speed[tier - 1] ?? Number.POSITIVE_INFINITY;
}

