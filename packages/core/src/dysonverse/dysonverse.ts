import { DysonverseProgression } from "@ids/balance";

import type { GameState } from "../state/types";
import { clamp, log2, logBase } from "./math";

function applySecretBuffs(state: GameState) {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const runtime = state.runtime;

  // Note: in Unity this is called AFTER the multipliers are calculated, so the new
  // secret multipliers take effect on the next `CalculateModifiers()` call.
  runtime.secretPlanetMulti = 1;
  runtime.secretServerMulti = 1;
  runtime.secretAIMulti = 1;
  runtime.secretAssemblyMulti = 1;
  runtime.secretCashMulti = 1;
  runtime.secretScienceMulti = 1;

  const secrets = dvpd.secretsOfTheUniverse;
  if (secrets >= 27) runtime.secretAIMulti = 42;
  if (secrets >= 26) runtime.secretAIMulti = 3;
  if (secrets >= 25) runtime.secretCashMulti = 8;
  if (secrets >= 24) runtime.secretAIMulti = 2.5;
  if (secrets >= 23) runtime.secretAssemblyMulti = 7;
  if (secrets >= 22) runtime.secretScienceMulti = 10;
  if (secrets >= 21) runtime.secretServerMulti = 3;
  if (secrets >= 20) runtime.secretServerMulti = 2;
  if (secrets >= 19) runtime.secretCashMulti = 6;
  if (secrets >= 18) runtime.secretPlanetMulti = 5;
  if (secrets >= 17) runtime.secretPlanetMulti = 2;
  if (secrets >= 16) runtime.secretAssemblyMulti = 2;
  if (secrets >= 15) runtime.secretScienceMulti = 8;
  if (secrets >= 14) dvid.planetUpgradePercent = 0.09;
  if (secrets >= 13) dvid.aiManagerUpgradePercent = 0.09;
  if (secrets >= 12) dvid.assemblyLineUpgradePercent = 0.12;
  if (secrets >= 11) runtime.secretScienceMulti = 6;
  if (secrets >= 10) runtime.secretScienceMulti = 4;
  if (secrets >= 9) dvid.serverUpgradePercent = 0.09;
  if (secrets >= 8) runtime.secretCashMulti = 4;
  if (secrets >= 7) dvid.planetUpgradePercent = 0.06;
  if (secrets >= 6) runtime.secretScienceMulti = 2;
  if (secrets >= 5) dvid.aiManagerUpgradePercent = 0.06;
  if (secrets >= 4) dvid.assemblyLineUpgradePercent = 0.09;
  if (secrets >= 3) dvid.serverUpgradePercent = 0.06;
  if (secrets >= 2) runtime.secretCashMulti = 2;
  if (secrets >= 1) dvid.assemblyLineUpgradePercent = 0.06;
}

function galaxiesEngulfed(state: GameState, floored = true): number {
  const dvid = state.dysonVerseInfinityData;
  const value = dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000;
  return floored ? Math.floor(value) : value;
}

function starsSurrounded(state: GameState, floored = true): number {
  const dvid = state.dysonVerseInfinityData;
  const value = dvid.panelsPerSec * dvid.panelLifetime / 20000;
  return floored ? Math.floor(value) : value;
}

function stellarSacrificesRequiredBots(state: GameState): number {
  const dvst = state.dysonVerseSkillTreeData;

  let botsNeeded = dvst.supernova
    ? starsSurrounded(state, false) * 1000000
    : dvst.stellarObliteration
      ? starsSurrounded(state, false) * 1000
      : starsSurrounded(state, false);

  if (botsNeeded < 1) botsNeeded = 1;
  if (dvst.stellarDominance) botsNeeded *= 100;
  if (dvst.stellarImprovements) botsNeeded /= 1000;
  return botsNeeded;
}

function stellarGalaxies(state: GameState): number {
  const dvst = state.dysonVerseSkillTreeData;
  let stellarSacrificesGalaxies = galaxiesEngulfed(state, false);
  if (dvst.stellarObliteration) stellarSacrificesGalaxies *= 1000;
  if (dvst.supernova) stellarSacrificesGalaxies *= 1000;

  if (stellarSacrificesGalaxies > 10) return Math.pow(Math.log10(stellarSacrificesGalaxies), 2);
  if (stellarSacrificesGalaxies > 1) return Math.log10(stellarSacrificesGalaxies);
  return 0;
}

function globalBuff(state: GameState): number {
  const dvst = state.dysonVerseSkillTreeData;
  const pp = state.prestigePlus;

  let multi = 1;
  if (dvst.purityOfSEssence && dvst.skillPointsTree > 0) multi *= 1.42 * dvst.skillPointsTree;
  if (dvst.superRadiantScattering) multi *= 1 + 0.01 * dvst.superRadiantScatteringTimer;

  if (pp.avocatoPurchased) {
    if (pp.avocatoIP >= 10) multi *= Math.log10(pp.avocatoIP);
    if (pp.avocatoInfluence >= 10) multi *= Math.log10(pp.avocatoInfluence);
    if (pp.avocatoStrangeMatter >= 10) multi *= Math.log10(pp.avocatoStrangeMatter);
    if (pp.avocatoOverflow >= 1) multi *= 1 + pp.avocatoOverflow;
  }

  return multi;
}

function amountForBuildingBoostAfterX(state: GameState): number {
  const dvst = state.dysonVerseSkillTreeData;
  return dvst.productionScaling ? 90 : 100;
}

function divisionForBoostAfterX(state: GameState): number {
  const dvst = state.dysonVerseSkillTreeData;
  if (!dvst.superSwarm) return 100;
  if (!dvst.megaSwarm) return 50;
  return dvst.ultimateSwarm ? 20 : Math.trunc(100 / 3);
}

function tasteOfPowerPenalty(dvst: GameState["dysonVerseSkillTreeData"]): number {
  if (!dvst.tasteOfPower) return 1;
  if (!dvst.indulgingInPower) return 0.75;
  return dvst.addictionToPower ? 0.5 : 0.6;
}

function moneyMultipliers(state: GameState): number {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;
  const pp = state.prestigePlus;
  const runtime = state.runtime;

  let moneyBoost = dvid.moneyMultiUpgradeOwned * dvid.moneyMultiUpgradePercent;
  if (dvst.regulatedAcademia) moneyBoost *= 1.02 + 1.01 * (dvst.fragments - 1);

  let totalBoost = 1 + moneyBoost;
  totalBoost *= globalBuff(state);

  if (dvst.startHereTree) totalBoost *= 1.2;
  totalBoost *= 1 + (pp.cash * 5) / 100;
  totalBoost *= runtime.secretCashMulti;

  if (
    (dvst.economicRevolution && dvpd.botDistribution <= 0.5) ||
    (dvst.economicRevolution && pp.botMultitasking)
  ) {
    totalBoost *= 5;
  }

  if (dvst.superchargedPower) totalBoost *= 1.5;

  if (dvst.higgsBoson && galaxiesEngulfed(state) >= 1) totalBoost *= 1 + 0.1 * galaxiesEngulfed(state);

  if (dvst.workerBoost) {
    totalBoost *= pp.botMultitasking ? 100 : (1 - dvpd.botDistribution) * 100;
  }

  if (dvst.economicDominance) totalBoost *= 20;
  if (dvst.renegade) totalBoost *= 50;

  if (dvst.shouldersOfTheRevolution) totalBoost *= 1 + 0.01 * dvid.scienceBoostOwned;
  if (dvst.dysonSubsidies && starsSurrounded(state) < 1) totalBoost *= 3;

  if (dvst.purityOfMind && dvst.skillPointsTree > 0) totalBoost *= 1.5 * dvst.skillPointsTree;
  if (dvst.monetaryPolicy) totalBoost *= 1 + 0.75 * dvst.fragments;

  totalBoost *= tasteOfPowerPenalty(dvst);

  if (dvst.stellarObliteration && galaxiesEngulfed(state) >= 1) totalBoost /= galaxiesEngulfed(state, false);

  if (dvst.fusionReactors) totalBoost *= 0.75;
  if (dvst.coldFusion) totalBoost *= 0.5;

  if (dvst.scientificDominance) totalBoost /= 4;

  if (dvst.stellarDominance && dvid.bots > stellarSacrificesRequiredBots(state)) totalBoost /= 100;

  return totalBoost;
}

function scienceMultipliers(state: GameState): number {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;
  const pp = state.prestigePlus;
  const runtime = state.runtime;

  let scienceBoost = dvid.scienceBoostOwned * dvid.scienceBoostPercent;
  if (dvst.regulatedAcademia) scienceBoost *= 1.02 + 1.01 * (dvst.fragments - 1);

  let totalBoost = 1 + scienceBoost;
  totalBoost *= globalBuff(state);

  if (dvst.doubleScienceTree) totalBoost *= 2;
  if (dvst.startHereTree) totalBoost *= 1.2;

  if (dvst.producedAsScienceTree) {
    totalBoost *= pp.botMultitasking ? 100 : dvpd.botDistribution * 100;
  }

  if (dvst.idleSpaceFlight) {
    totalBoost += 0.01 * (dvid.panelsPerSec * dvid.panelLifetime) / 100000000;
  }

  if (
    (dvst.scientificRevolution && dvpd.botDistribution >= 0.5) ||
    (dvst.scientificRevolution && pp.botMultitasking)
  ) {
    totalBoost *= 5;
  }

  if (dvst.superchargedPower) totalBoost *= 1.5;
  if (dvst.purityOfMind && dvst.skillPointsTree > 0) totalBoost *= 1.5 * dvst.skillPointsTree;

  totalBoost *= 1 + (pp.science * 5) / 100;
  totalBoost *= runtime.secretScienceMulti;

  if (dvst.coldFusion) totalBoost *= 10;
  if (dvst.scientificDominance) totalBoost *= 20;
  if (dvst.paragon) totalBoost *= 50;

  totalBoost *= tasteOfPowerPenalty(dvst);

  if (dvst.stellarObliteration && galaxiesEngulfed(state) >= 1) totalBoost /= galaxiesEngulfed(state, false);
  if (dvst.economicDominance) totalBoost /= 4;

  return totalBoost;
}

export function calculateDysonVerseModifiers(state: GameState) {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;
  const runtime = state.runtime;
  const maxInfinityBuff = DysonverseProgression.maxInfinityBuff;

  dvid.scienceMulti = scienceMultipliers(state);
  dvid.moneyMulti = dvst.shouldersOfPrecursors ? scienceMultipliers(state) : moneyMultipliers(state);

  // Assembly Lines
  {
    const terraAmount = dvst.terraNullius
      ? dvid.assemblyLines[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
      : dvid.assemblyLines[1];

    const boost1 = dvid.assemblyLineUpgradeOwned * dvid.assemblyLineUpgradePercent;
    let totalBoost = 1 + boost1;
    totalBoost *= globalBuff(state);
    if (dvst.assemblyLineTree) totalBoost *= 2;
    if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
    if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
    if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;
    if (dvst.worthySacrifice) totalBoost *= 2.5;
    if (dvst.endOfTheLine) totalBoost *= 5;

    if (dvst.versatileProductionTactics) {
      totalBoost *=
        dvid.planets[0] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 100 ? 2 : 1.5;
    }

    if (terraAmount > amountForBuildingBoostAfterX(state) && !dvst.supernova) {
      let perExtraBoost = (terraAmount - amountForBuildingBoostAfterX(state)) / divisionForBoostAfterX(state);
      perExtraBoost += 1;
      totalBoost *= perExtraBoost;
    }

    if (dvst.oneMinutePlan) totalBoost *= dvid.panelLifetime > 60 ? 5 : 1.5;
    if (dvst.progressiveAssembly) totalBoost *= 1 + 0.5 * dvst.fragments;

    if (dvst.tasteOfPower) totalBoost *= 1.5;
    if (dvst.indulgingInPower) totalBoost *= 2;
    if (dvst.addictionToPower) totalBoost *= 3;
    if (dvst.agressiveAlgorithms) totalBoost *= 3;
    if (dvst.dysonSubsidies && starsSurrounded(state) > 1) totalBoost *= 2;

    if (dvst.purityOfBody && dvst.skillPointsTree > 0) totalBoost *= 1.25 * dvst.skillPointsTree;

    totalBoost *= 1 + clamp(dvpd.infinityPoints, 0, maxInfinityBuff);
    totalBoost *= runtime.secretAssemblyMulti;

    dvid.assemblyLineModifier = totalBoost;
  }

  // AI Managers
  {
    const terraAmount = dvst.terraInfirma
      ? dvid.managers[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
      : dvid.managers[1];

    const boost1 = dvid.aiManagerUpgradeOwned * dvid.aiManagerUpgradePercent;
    let totalBoost = 1 + boost1;
    totalBoost *= globalBuff(state);
    if (dvst.aiManagerTree) totalBoost *= 2;
    if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
    if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
    if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

    if (terraAmount > amountForBuildingBoostAfterX(state) && !dvst.supernova) {
      let perExtraBoost = (terraAmount - amountForBuildingBoostAfterX(state)) / divisionForBoostAfterX(state);
      perExtraBoost += 1;
      totalBoost *= perExtraBoost;
    }

    if (dvst.tasteOfPower) totalBoost *= 1.5;
    if (dvst.indulgingInPower) totalBoost *= 2;
    if (dvst.addictionToPower) totalBoost *= 3;
    if (dvst.agressiveAlgorithms) totalBoost *= 3;

    if (dvpd.infinityPoints >= 2) totalBoost *= 1 + clamp(dvpd.infinityPoints, 0, maxInfinityBuff);
    totalBoost *= runtime.secretAIMulti;

    dvid.managerModifier = totalBoost;
  }

  // Servers
  {
    const terraAmount = dvst.terraEculeo
      ? dvid.servers[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
      : dvid.servers[1];

    const boost1 = dvid.serverUpgradeOwned * dvid.serverUpgradePercent;
    let totalBoost = 1 + boost1;
    totalBoost *= globalBuff(state);
    if (dvst.serverTree) totalBoost *= 2;
    if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
    if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
    if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

    if (terraAmount > amountForBuildingBoostAfterX(state) && !dvst.supernova) {
      let perExtraBoost = (terraAmount - amountForBuildingBoostAfterX(state)) / divisionForBoostAfterX(state);
      perExtraBoost += 1;
      totalBoost *= perExtraBoost;
    }

    if (dvst.tasteOfPower) totalBoost *= 1.5;
    if (dvst.indulgingInPower) totalBoost *= 2;
    if (dvst.addictionToPower) totalBoost *= 3;
    if (dvst.agressiveAlgorithms) totalBoost *= 3;

    if (dvst.clusterNetworking) {
      const totalServers = dvid.servers[0] + dvid.servers[1];
      totalBoost *= 1 + (totalServers > 1 ? 0.05 * Math.log10(totalServers) : 0);
    }

    if (dvpd.infinityPoints >= 3) totalBoost *= 1 + clamp(dvpd.infinityPoints, 0, maxInfinityBuff);
    totalBoost *= runtime.secretServerMulti;

    if (dvst.parallelProcessing) {
      const totalServers = dvid.servers[0] + dvid.servers[1];
      if (totalServers > 1) totalBoost *= 1 + 0.05 * log2(totalServers);
    }

    dvid.serverModifier = totalBoost;
  }

  // Data Centers
  {
    const terraAmount = dvst.terraFirma
      ? dvid.dataCenters[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
      : dvid.dataCenters[1];

    const boost1 = dvid.dataCenterUpgradeOwned * dvid.dataCenterUpgradePercent;
    let totalBoost = 1 + boost1;
    totalBoost *= globalBuff(state);
    if (dvst.dataCenterTree) totalBoost *= 2;
    if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
    if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
    if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

    if (terraAmount > amountForBuildingBoostAfterX(state) && !dvst.supernova) {
      let perExtraBoost = (terraAmount - amountForBuildingBoostAfterX(state)) / divisionForBoostAfterX(state);
      perExtraBoost += 1;
      totalBoost *= perExtraBoost;
    }

    if (dvst.tasteOfPower) totalBoost *= 1.5;
    if (dvst.indulgingInPower) totalBoost *= 2;
    if (dvst.addictionToPower) totalBoost *= 3;

    if (dvst.whatWillComeToPass) totalBoost *= 1 + 0.01 * dvid.dataCenters[1];
    if (dvst.hypercubeNetworks) {
      const totalServers = dvid.servers[0] + dvid.servers[1];
      if (totalServers > 1) totalBoost *= 1 + 0.1 * Math.log10(totalServers);
    }

    if (dvpd.infinityPoints >= 4) totalBoost *= 1 + clamp(dvpd.infinityPoints, 0, maxInfinityBuff);
    if (dvst.agressiveAlgorithms) totalBoost /= 3;

    dvid.dataCenterModifier = totalBoost;
  }

  // Planets
  {
    const boost1 = dvid.planetUpgradeOwned * dvid.planetUpgradePercent;
    let totalBoost = 1 + boost1;
    totalBoost *= globalBuff(state);
    if (dvst.planetsTree) totalBoost *= 2;

    const planetAmount = dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1];
    if (planetAmount >= 50 && !dvst.supernova) totalBoost *= 2;
    if (planetAmount >= 100 && !dvst.supernova) totalBoost *= 2;
    if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

    if (planetAmount > amountForBuildingBoostAfterX(state) && !dvst.supernova) {
      let perExtraBoost = (planetAmount - amountForBuildingBoostAfterX(state)) / divisionForBoostAfterX(state);
      perExtraBoost += 1;
      totalBoost *= perExtraBoost;
    }

    if (dvst.galacticPradigmShift) totalBoost *= galaxiesEngulfed(state) > 1 ? 3 : 1.5;

    if (dvst.tasteOfPower) totalBoost *= 1.5;
    if (dvst.indulgingInPower) totalBoost *= 2;
    if (dvst.addictionToPower) totalBoost *= 3;

    if (dvst.dimensionalCatCables) totalBoost *= 0.75;

    if (dvpd.infinityPoints >= 5) totalBoost *= 1 + clamp(dvpd.infinityPoints, 0, maxInfinityBuff);
    totalBoost *= runtime.secretPlanetMulti;

    if (dvst.endOfTheLine) totalBoost /= 2;
    if (dvst.agressiveAlgorithms) totalBoost /= 3;

    dvid.planetModifier = totalBoost;
  }

  // Apply secret buffs at the end (matches Unity ordering).
  applySecretBuffs(state);

  // Panel lifetime after secrets (matches Unity ordering).
  updatePanelLifetime(state);
}

export function updatePanelLifetime(state: GameState) {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;

  let lifetime = 10;
  if (dvid.panelLifetime1) lifetime += 1;
  if (dvid.panelLifetime2) lifetime += 2;
  if (dvid.panelLifetime3) lifetime += 3;
  if (dvid.panelLifetime4) lifetime += 4;

  if (dvst.panelMaintenance) {
    lifetime += state.prestigePlus.botMultitasking ? 100 : (1 - dvpd.botDistribution) * 100;
  }

  if (dvst.shepherd) lifetime += 600;

  if (dvst.citadelCouncil && dvid.totalPanelsDecayed > 1) lifetime += logBase(dvid.totalPanelsDecayed, 1.2);

  if (dvst.panelWarranty) {
    lifetime += 5 * (dvst.fragments > 1 ? Math.pow(2, dvst.fragments - 1) : 1);
  }

  if (dvst.panelLifetime20Tree) lifetime += 20;
  if (dvst.burnOut) lifetime -= 5;

  const totalManagers = dvid.managers[0] + dvid.managers[1];
  if (dvst.artificiallyEnhancedPanels && totalManagers >= 1) lifetime += 5 * Math.log10(totalManagers);

  if (dvst.androids) lifetime += Math.floor(dvpd.androidsSkillTimer > 600 ? 200 : dvpd.androidsSkillTimer / 3);

  if (dvst.renewableEnergy && dvid.workers >= 1e7) lifetime *= 1 + 0.1 * Math.log10(dvid.workers / 1e6);
  if (dvst.stellarDominance && dvid.bots > stellarSacrificesRequiredBots(state)) lifetime *= 10;

  if (dvst.worthySacrifice) lifetime /= 2;

  dvid.panelLifetime = lifetime;
}

export function setBotDistribution(state: GameState) {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const pp = state.prestigePlus;

  if (!pp.botMultitasking) {
    const flooredBots = Math.floor(dvid.bots);
    dvid.workers = Math.ceil((flooredBots / 100) * ((1 - dvpd.botDistribution) * 100));
    dvid.researchers = Math.floor((flooredBots / 100) * (dvpd.botDistribution * 100));
  } else {
    dvid.workers = dvid.bots;
    dvid.researchers = dvid.bots;
  }
}

function calculateShouldersSkills(state: GameState, time: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  if (dvst.shouldersOfGiants && dvst.scientificPlanets) {
    dvid.scienceBoostOwned += dvid.scientificPlanetsProduction * time;
    if (dvst.whatCouldHaveBeen) dvid.scienceBoostOwned += dvid.pocketDimensionsProduction * time;
  }

  if (dvst.shouldersOfTheEnlightened && dvst.scientificPlanets) {
    dvid.moneyMultiUpgradeOwned += dvid.scientificPlanetsProduction * time;
  }
}

function calculatePlanetsPerSecond(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  dvid.totalPlanetProduction = 0;

  dvid.scientificPlanetsProduction =
    dvid.researchers > 1 && dvst.scientificPlanets ? Math.log10(dvid.researchers) : 0;

  if (dvst.hubbleTelescope) dvid.scientificPlanetsProduction *= 2;
  if (dvst.jamesWebbTelescope) dvid.scientificPlanetsProduction *= 4;
  dvid.scientificPlanetsProduction += dvst.terraformingProtocols ? dvst.fragments : 0;

  if (dvst.scientificPlanets) dvid.totalPlanetProduction += dvid.scientificPlanetsProduction;

  const totalAssemblyLines = dvid.assemblyLines[0] + dvid.assemblyLines[1];
  dvid.planetAssemblyProduction = dvst.planetAssembly && totalAssemblyLines >= 10 ? Math.log10(totalAssemblyLines) : 0;
  if (dvst.planetAssembly) dvid.totalPlanetProduction += dvid.planetAssemblyProduction;

  const totalPlanets = dvid.planets[0] + dvid.planets[1];
  dvid.shellWorldsProduction = dvst.planetAssembly && totalPlanets >= 2 ? log2(totalPlanets) : 0;
  if (dvst.shellWorlds) dvid.totalPlanetProduction += dvid.shellWorldsProduction;

  dvid.stellarSacrificesProduction =
    dvst.stellarSacrifices && dvid.bots >= stellarSacrificesRequiredBots(state) && stellarGalaxies(state) > 0
      ? stellarGalaxies(state)
      : 0;
  if (dvst.stellarSacrifices) dvid.totalPlanetProduction += dvid.stellarSacrificesProduction;

  dvid.planets[0] += dvid.totalPlanetProduction * dt;

  if (dvst.shouldersOfTheFallen && dvid.scienceBoostOwned > 0) {
    dvid.scientificPlanetsProduction += log2(dvid.scienceBoostOwned);
    if (dvst.shoulderSurgery) dvid.pocketDimensionsProduction += log2(dvid.scienceBoostOwned);
  }
}

function calculatePlanetProduction(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;

  dvid.dataCenterProduction =
    (dvid.planets[0] + dvid.planets[1]) * 0.0002777777777777778 * dvid.planetModifier;
  if (dvst.rule34 && dvid.planets[1] >= 69) dvid.dataCenterProduction *= 2;
  if (dvst.superchargedPower) dvid.dataCenterProduction *= 1.5;

  dvid.planetsDataCenterProduction = dvid.dataCenterProduction;

  let dataCenterProductionTemp = dvst.pocketDimensions && dvid.workers > 1 ? Math.log10(dvid.workers) : 0;
  dvid.pocketDimensionsWithoutAnythingElseProduction = dataCenterProductionTemp;

  if (dvst.pocketMultiverse) {
    let multiplyBy = 1;
    multiplyBy *= dvst.pocketDimensions && dvid.researchers > 1 ? Math.log10(dvid.researchers) : 0;

    dvid.pocketMultiverseProduction =
      dvid.researchers > 0
        ? dataCenterProductionTemp * multiplyBy - dvid.pocketDimensionsWithoutAnythingElseProduction
        : 0;

    if (multiplyBy > 0) dataCenterProductionTemp *= multiplyBy;
  } else {
    let add = 0;
    if (dvst.pocketProtectors) add += dvst.pocketDimensions && dvid.researchers > 1 ? Math.log10(dvid.researchers) : 0;
    dvid.pocketProtectorsProduction =
      dataCenterProductionTemp + add - dvid.pocketDimensionsWithoutAnythingElseProduction;
    dataCenterProductionTemp += add;
  }

  if (dvst.dimensionalCatCables) dataCenterProductionTemp *= 5;
  if (dvst.solarBubbles) dataCenterProductionTemp *= 1 + 0.01 * dvid.panelLifetime;

  if (dvst.pocketAndroids) {
    dataCenterProductionTemp *= dvpd.pocketAndroidsTimer > 3564 ? 100 : 1 + dvpd.pocketAndroidsTimer / 36;
  }

  if (dvst.quantumComputing) {
    const quantumMulti = 1 + (dvid.rudimentrySingularityProduction >= 1 ? log2(dvid.rudimentrySingularityProduction) : 0);
    dvid.quantumComputingProduction = quantumMulti;
    dataCenterProductionTemp *= quantumMulti;
  }

  dvid.pocketDimensionsProduction = dataCenterProductionTemp;
  if (dvst.pocketDimensions) dvid.dataCenterProduction += dvid.pocketDimensionsProduction;

  dvid.dataCenters[0] += dvid.dataCenterProduction * dt;
}

function calculateDataCenterProduction(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  dvid.serverProduction = (dvid.dataCenters[0] + dvid.dataCenters[1]) * 0.0011111111 * dvid.dataCenterModifier;
  if (dvst.rule34 && dvid.dataCenters[1] >= 69) dvid.serverProduction *= 2;
  if (dvst.superchargedPower) dvid.serverProduction *= 1.5;
  dvid.dataCenterServerProduction = dvid.serverProduction;

  dvid.serverProduction += dvid.rudimentrySingularityProduction;

  const totalServers = dvid.servers[0] + dvid.servers[1];
  dvid.servers[0] +=
    dvst.parallelComputation && totalServers > 1
      ? dvid.serverProduction * dt + 0.1 * log2(totalServers)
      : dvid.serverProduction * dt;
}

function calculateServerProduction(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  dvid.managerProduction = (dvid.servers[0] + dvid.servers[1]) * 0.0016666666666667 * dvid.serverModifier;
  if (dvst.rule34 && dvid.servers[1] >= 69) dvid.managerProduction *= 2;
  if (dvst.superchargedPower) dvid.managerProduction *= 1.5;

  dvid.serverManagerProduction = dvid.managerProduction;
  dvid.managers[0] += dvid.managerProduction * dt;
}

function calculateManagerProduction(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  dvid.assemblyLineProduction = (dvid.managers[0] + dvid.managers[1]) * 0.0166666666666667 * dvid.managerModifier;
  if (dvst.rule34 && dvid.managers[1] >= 69) dvid.assemblyLineProduction *= 2;
  if (dvst.superchargedPower) dvid.assemblyLineProduction *= 1.5;

  let rudimentaryProduction = 0;
  if (dvst.rudimentarySingularity && dvid.assemblyLineProduction > 1) {
    rudimentaryProduction = dvst.unsuspiciousAlgorithms
      ? 10 *
        Math.pow(log2(dvid.assemblyLineProduction), 1 + Math.log10(dvid.assemblyLineProduction) / 10)
      : Math.pow(log2(dvid.assemblyLineProduction), 1 + Math.log10(dvid.assemblyLineProduction) / 10);
  }

  if (dvst.clusterNetworking) {
    const totalServers = dvid.servers[0] + dvid.servers[1];
    rudimentaryProduction *= 1 + (totalServers > 1 ? 0.05 * Math.log10(totalServers) : 0);
  }

  dvid.rudimentrySingularityProduction = rudimentaryProduction;
  dvid.managerAssemblyLineProduction = dvid.assemblyLineProduction;
  dvid.assemblyLines[0] += dvid.assemblyLineProduction * dt;
}

function calculateAssemblyLineProduction(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  dvid.botProduction = (dvid.assemblyLines[0] + dvid.assemblyLines[1]) * 0.1 * dvid.assemblyLineModifier;

  if (dvst.stayingPower) dvid.botProduction *= 1 + 0.01 * dvid.panelLifetime;
  if (dvst.rule34 && dvid.assemblyLines[1] >= 69) dvid.botProduction *= 2;
  if (dvst.superchargedPower) dvid.botProduction *= 1.5;

  dvid.assemblyLineBotProduction = dvid.botProduction;
  dvid.bots += dvid.botProduction * dt;

  if (dvst.stellarSacrifices && dvid.bots >= stellarSacrificesRequiredBots(state) && stellarGalaxies(state) > 0) {
    dvid.bots -= stellarSacrificesRequiredBots(state) * dt;
  }
}

function calculatePanelsPerSec(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  let panels = 1;
  let mult = dvid.panelsPerSecMulti;
  if (dvst.burnOut) mult *= 3;

  panels = dvst.workerEfficiencyTree ? (dvid.workers / 50) * mult : (dvid.workers / 100) * mult;

  if (dvst.reapers && dvid.totalPanelsDecayed > 2) panels *= 1 + log2(dvid.totalPanelsDecayed) / 10;

  if (dvst.rocketMania && dvid.panelsPerSec > 20) panels *= logBase(dvid.panelsPerSec, 20);
  if (dvst.saren) panels *= 40;
  if (dvst.fusionReactors) panels *= 5;

  dvid.panelsPerSec = panels;
  dvid.totalPanelsDecayed += dvid.panelsPerSec * dt;
}

function scienceToAdd(state: GameState): number {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;
  return dvst.powerUnderwhelming ? Math.pow(dvid.researchers * dvid.scienceMulti, 1.05) : dvid.researchers * dvid.scienceMulti;
}

function moneyToAdd(state: GameState): number {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;
  const x = dvid.panelsPerSec * dvid.panelLifetime * dvid.moneyMulti;
  return dvst.powerOverwhelming ? Math.pow(x, 1.03) : x;
}

function calculateMoneyAndScience(state: GameState, dt: number) {
  const dvid = state.dysonVerseInfinityData;
  dvid.money += moneyToAdd(state) * dt;
  dvid.science += scienceToAdd(state) * dt;
}

export function calculateDysonVerseProduction(state: GameState, dt: number) {
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;

  calculateMoneyAndScience(state, dt);
  calculatePanelsPerSec(state, dt);
  calculateAssemblyLineProduction(state, dt);
  calculateManagerProduction(state, dt);
  calculateServerProduction(state, dt);
  calculateDataCenterProduction(state, dt);
  calculatePlanetProduction(state, dt);
  calculatePlanetsPerSecond(state, dt);
  calculateShouldersSkills(state, dt);

  if (dvst.androids) dvpd.androidsSkillTimer += dt;
  if (dvst.pocketAndroids) dvpd.pocketAndroidsTimer += dt;
  if (dvst.superRadiantScattering) dvst.superRadiantScatteringTimer += dt;
  if (dvst.idleElectricSheep) dvst.idleElectricSheepTimer += dt;
}

export function runDysonVerseAwayTime(state: GameState, awayTimeSeconds: number) {
  if (!Number.isFinite(awayTimeSeconds) || awayTimeSeconds <= 0) return;
  if (state.settings.cheater) return;

  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;

  const lastGained = state.meta.lastInfinityPointsGained;
  const lastTime = state.meta.timeLastInfinitySeconds;
  if (lastGained >= 1 && lastTime > 0 && Number.isFinite(lastTime)) {
    const gained = Math.floor((awayTimeSeconds * lastGained) / lastTime / 10);
    if (gained >= 1 && Number.isFinite(gained)) dvpd.infinityPoints += gained;
  }

  let time = awayTimeSeconds;
  if (dvst.idleElectricSheep) time *= 2;

  setBotDistribution(state);
  calculateDysonVerseModifiers(state);
  calculateDysonVerseProduction(state, 0);

  const remainder = time % 60;
  const minutes = Math.trunc((time - remainder) / 60);

  for (let i = 0; i < minutes; i++) {
    runDysonVerseAwaySegment(state, 60);
  }
  runDysonVerseAwaySegment(state, remainder);
}

function runDysonVerseAwaySegment(state: GameState, segmentSeconds: number) {
  if (!Number.isFinite(segmentSeconds) || segmentSeconds <= 0) return;

  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;
  const dvid = state.dysonVerseInfinityData;

  if (dvst.androids) dvpd.androidsSkillTimer += segmentSeconds;
  if (dvst.pocketAndroids) dvpd.pocketAndroidsTimer += segmentSeconds;

  const planets = dvid.totalPlanetProduction * segmentSeconds;
  dvid.planets[0] += planets;
  calculateShouldersSkills(state, segmentSeconds);
  calculateDysonVerseProduction(state, 0);

  const dataCenters = dvid.dataCenterProduction * segmentSeconds;
  dvid.dataCenters[0] += dataCenters;
  calculateDysonVerseProduction(state, 0);

  const servers = dvid.serverProduction * segmentSeconds;
  dvid.servers[0] += servers;
  calculateDysonVerseProduction(state, 0);

  const managers = dvid.managerProduction * segmentSeconds;
  dvid.managers[0] += managers;
  calculateDysonVerseProduction(state, 0);

  const lines = dvid.assemblyLineProduction * segmentSeconds;
  dvid.assemblyLines[0] += lines;
  calculateDysonVerseProduction(state, 0);

  const bots = dvid.botProduction * segmentSeconds;
  dvid.bots += bots;
  calculateDysonVerseProduction(state, 0);

  setBotDistribution(state);

  dvid.money += moneyToAdd(state) * segmentSeconds;
  dvid.science += scienceToAdd(state) * segmentSeconds;
  dvid.totalPanelsDecayed += dvid.panelsPerSec * segmentSeconds;

  calculateDysonVerseProduction(state, 0);
}

export function checkIfValuesNegative(state: GameState) {
  const dvid = state.dysonVerseInfinityData;
  if (dvid.bots < 0 || dvid.money < 0) {
    dvid.bots = 10;
    dvid.assemblyLines[0] = 0;
    dvid.assemblyLines[1] = 0;
    dvid.managers[0] = 0;
    dvid.managers[1] = 0;
    dvid.servers[0] = 0;
    dvid.servers[1] = 0;
    dvid.planets[0] = 0;
    dvid.planets[1] = 0;
    dvid.science = 10;
    dvid.money = 10;
    dvid.totalPanelsDecayed = 0;
  }
}
