import { DysonverseBuildings, DysonversePanelLifetime, DysonverseResearch } from "@ids/balance";

import { calculateDysonVerseModifiers, calculateDysonVerseProduction, checkIfValuesNegative, setBotDistribution, updatePanelLifetime } from "../dysonverse/dysonverse";
import { infinityBotsRequired, prestigeDysonVerse, rawInfinityPointsToGain } from "../dysonverse/prestige";
import { tickDream1 } from "../dream1/dream1";
import { buyXCost, maxAffordable } from "../math/buy";
import { tickReality } from "../reality/reality";
import type { GameState } from "../state/types";

type BuildingId = "assemblyLines" | "managers" | "servers" | "dataCenters" | "planets";
type ResearchId = "science" | "cash" | "assemblyLine" | "aiManager" | "server" | "dataCenter" | "planet";

function tickManualBotCreation(state: GameState, dt: number) {
  const runtime = state.runtime.manualBotCreation;
  if (!runtime.running) return;

  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;
  const dvsd = state.dysonVerseSaveData;

  const target = dvsd.manualCreationTime;
  if (!Number.isFinite(target)) return;

  if (runtime.time < target) {
    runtime.time += dt;
    if (runtime.time < target) return;
  }

  const manualLabourAmount = (dvid.assemblyLines[0] + dvid.assemblyLines[1]) / 50;
  const managerProduction = dvid.managerAssemblyLineProduction * 20;
  let assemblyProduction = Math.min(manualLabourAmount, managerProduction);
  if (dvst.versatileProductionTactics) assemblyProduction *= 1.5;

  runtime.running = false;
  runtime.time = 0;

  dvid.bots += 1;
  if (dvst.manualLabour) dvid.assemblyLines[0] += assemblyProduction;

  if (dvsd.manualCreationTime >= 1 && !dvst.manualLabour) dvsd.manualCreationTime -= 1;
  else dvsd.manualCreationTime = 0.2;
}

function buildingCurrentLevel(state: GameState, buildingId: BuildingId): number {
  const dvpd = state.dysonVersePrestigeData;
  const manuallyOwned = state.dysonVerseInfinityData[buildingId][1];

  if (buildingId === "assemblyLines" && dvpd.infinityAssemblyLines) return Math.trunc(manuallyOwned) - 10;
  if (buildingId === "managers" && dvpd.infinityAiManagers) return Math.trunc(manuallyOwned) - 10;
  if (buildingId === "servers" && dvpd.infinityServers) return Math.trunc(manuallyOwned) - 10;
  if (buildingId === "dataCenters" && dvpd.infinityDataCenter) return Math.trunc(manuallyOwned) - 10;
  if (buildingId === "planets" && dvpd.infinityPlanets) return Math.trunc(manuallyOwned) - 10;
  return Math.trunc(manuallyOwned);
}

function buildingModifiedBaseCost(state: GameState, buildingId: BuildingId, baseCost: number): number {
  if (buildingId !== "assemblyLines") return baseCost;

  const dvst = state.dysonVerseSkillTreeData;
  if (!dvst.assemblyMegaLines) return baseCost;

  const totalPlanets = state.dysonVerseInfinityData.planets[0] + state.dysonVerseInfinityData.planets[1];
  return totalPlanets > 0 ? baseCost / totalPlanets : baseCost;
}

function buildingAutoBuyEnabled(state: GameState, buildingId: BuildingId): boolean {
  const s = state.settings;
  const dvpd = state.dysonVersePrestigeData;
  if (!dvpd.infinityAutoBots) return false;

  if (buildingId === "assemblyLines") return s.infinityAutoAssembly;
  if (buildingId === "managers") return s.infinityAutoManagers;
  if (buildingId === "servers") return s.infinityAutoServers;
  if (buildingId === "dataCenters") return s.infinityAutoDataCenters;
  return s.infinityAutoPlanets;
}

function buildingAffordable(state: GameState, buildingId: BuildingId): number {
  const building = DysonverseBuildings.find((b) => b.id === buildingId);
  if (!building) return 0;

  const dvid = state.dysonVerseInfinityData;
  const currentLevel = buildingCurrentLevel(state, buildingId);
  const modifiedBaseCost = buildingModifiedBaseCost(state, buildingId, building.baseCost);
  return maxAffordable(dvid.money, modifiedBaseCost, building.exponent, currentLevel);
}

function autoPurchaseBuildingMax(state: GameState, buildingId: BuildingId) {
  const building = DysonverseBuildings.find((b) => b.id === buildingId);
  if (!building) return;

  const dvid = state.dysonVerseInfinityData;
  const currentLevel = buildingCurrentLevel(state, buildingId);
  const modifiedBaseCost = buildingModifiedBaseCost(state, buildingId, building.baseCost);
  const affordable = maxAffordable(dvid.money, modifiedBaseCost, building.exponent, currentLevel);
  if (affordable <= 0) return;

  const buyMaxCost = buyXCost(affordable, modifiedBaseCost, building.exponent, currentLevel);
  if (buyMaxCost > dvid.money) return;

  dvid.money -= buyMaxCost;
  dvid[buildingId][1] += affordable;
}

function shouldAutoBuyBuilding(state: GameState, buildingId: BuildingId): boolean {
  return buildingAutoBuyEnabled(state, buildingId) && buildingAffordable(state, buildingId) > 0;
}

function autoBuyBots(state: GameState) {
  if (
    !shouldAutoBuyBuilding(state, "assemblyLines") &&
    !shouldAutoBuyBuilding(state, "managers") &&
    !shouldAutoBuyBuilding(state, "servers") &&
    !shouldAutoBuyBuilding(state, "dataCenters") &&
    !shouldAutoBuyBuilding(state, "planets")
  ) {
    return;
  }

  while (
    shouldAutoBuyBuilding(state, "assemblyLines") ||
    shouldAutoBuyBuilding(state, "managers") ||
    shouldAutoBuyBuilding(state, "servers") ||
    shouldAutoBuyBuilding(state, "dataCenters") ||
    shouldAutoBuyBuilding(state, "planets")
  ) {
    const priority = state.runtime.autoBotsPriority;
    if (priority === 0) {
      if (shouldAutoBuyBuilding(state, "planets")) autoPurchaseBuildingMax(state, "planets");
      if (shouldAutoBuyBuilding(state, "servers")) autoPurchaseBuildingMax(state, "servers");
      if (shouldAutoBuyBuilding(state, "managers")) autoPurchaseBuildingMax(state, "managers");
      if (shouldAutoBuyBuilding(state, "dataCenters")) autoPurchaseBuildingMax(state, "dataCenters");
      if (shouldAutoBuyBuilding(state, "assemblyLines")) autoPurchaseBuildingMax(state, "assemblyLines");
      state.runtime.autoBotsPriority = 1;
      continue;
    }
    if (priority === 1) {
      if (shouldAutoBuyBuilding(state, "servers")) autoPurchaseBuildingMax(state, "servers");
      if (shouldAutoBuyBuilding(state, "managers")) autoPurchaseBuildingMax(state, "managers");
      if (shouldAutoBuyBuilding(state, "dataCenters")) autoPurchaseBuildingMax(state, "dataCenters");
      if (shouldAutoBuyBuilding(state, "assemblyLines")) autoPurchaseBuildingMax(state, "assemblyLines");
      if (shouldAutoBuyBuilding(state, "planets")) autoPurchaseBuildingMax(state, "planets");
      state.runtime.autoBotsPriority = 2;
      continue;
    }
    if (priority === 2) {
      if (shouldAutoBuyBuilding(state, "managers")) autoPurchaseBuildingMax(state, "managers");
      if (shouldAutoBuyBuilding(state, "dataCenters")) autoPurchaseBuildingMax(state, "dataCenters");
      if (shouldAutoBuyBuilding(state, "assemblyLines")) autoPurchaseBuildingMax(state, "assemblyLines");
      if (shouldAutoBuyBuilding(state, "planets")) autoPurchaseBuildingMax(state, "planets");
      if (shouldAutoBuyBuilding(state, "servers")) autoPurchaseBuildingMax(state, "servers");
      state.runtime.autoBotsPriority = 3;
      continue;
    }
    if (priority === 3) {
      if (shouldAutoBuyBuilding(state, "dataCenters")) autoPurchaseBuildingMax(state, "dataCenters");
      if (shouldAutoBuyBuilding(state, "assemblyLines")) autoPurchaseBuildingMax(state, "assemblyLines");
      if (shouldAutoBuyBuilding(state, "planets")) autoPurchaseBuildingMax(state, "planets");
      if (shouldAutoBuyBuilding(state, "servers")) autoPurchaseBuildingMax(state, "servers");
      if (shouldAutoBuyBuilding(state, "managers")) autoPurchaseBuildingMax(state, "managers");
      state.runtime.autoBotsPriority = 4;
      continue;
    }

    if (shouldAutoBuyBuilding(state, "assemblyLines")) autoPurchaseBuildingMax(state, "assemblyLines");
    if (shouldAutoBuyBuilding(state, "planets")) autoPurchaseBuildingMax(state, "planets");
    if (shouldAutoBuyBuilding(state, "servers")) autoPurchaseBuildingMax(state, "servers");
    if (shouldAutoBuyBuilding(state, "managers")) autoPurchaseBuildingMax(state, "managers");
    if (shouldAutoBuyBuilding(state, "dataCenters")) autoPurchaseBuildingMax(state, "dataCenters");
    state.runtime.autoBotsPriority = 0;
  }
}

function researchCurrentLevel(state: GameState, researchId: ResearchId): number {
  const dvid = state.dysonVerseInfinityData;
  if (researchId === "science") return dvid.scienceBoostOwned;
  if (researchId === "cash") return dvid.moneyMultiUpgradeOwned;
  if (researchId === "assemblyLine") return dvid.assemblyLineUpgradeOwned;
  if (researchId === "aiManager") return dvid.aiManagerUpgradeOwned;
  if (researchId === "server") return dvid.serverUpgradeOwned;
  if (researchId === "dataCenter") return dvid.dataCenterUpgradeOwned;
  return dvid.planetUpgradeOwned;
}

function setResearchCurrentLevel(state: GameState, researchId: ResearchId, nextLevel: number) {
  const dvid = state.dysonVerseInfinityData;
  if (researchId === "science") dvid.scienceBoostOwned = nextLevel;
  else if (researchId === "cash") dvid.moneyMultiUpgradeOwned = nextLevel;
  else if (researchId === "assemblyLine") dvid.assemblyLineUpgradeOwned = nextLevel;
  else if (researchId === "aiManager") dvid.aiManagerUpgradeOwned = nextLevel;
  else if (researchId === "server") dvid.serverUpgradeOwned = nextLevel;
  else if (researchId === "dataCenter") dvid.dataCenterUpgradeOwned = nextLevel;
  else dvid.planetUpgradeOwned = nextLevel;
}

function researchAutoBuyEnabled(state: GameState, researchId: ResearchId): boolean {
  const s = state.settings;
  const dvpd = state.dysonVersePrestigeData;
  if (!dvpd.infinityAutoResearch) return false;

  if (researchId === "aiManager") return s.infinityAutoResearchToggleAi;
  if (researchId === "assemblyLine") return s.infinityAutoResearchToggleAssembly;
  if (researchId === "cash") return s.infinityAutoResearchToggleMoney;
  if (researchId === "planet") return s.infinityAutoResearchTogglePlanet;
  if (researchId === "server") return s.infinityAutoResearchToggleServer;
  if (researchId === "dataCenter") return s.infinityAutoResearchToggleDataCenter;
  return s.infinityAutoResearchToggleScience;
}

function researchAffordable(state: GameState, researchId: ResearchId): number {
  const upgrade = DysonverseResearch.find((u) => u.id === researchId);
  if (!upgrade) return 0;
  const dvid = state.dysonVerseInfinityData;
  const currentLevel = researchCurrentLevel(state, researchId);
  return maxAffordable(dvid.science, upgrade.baseCost, upgrade.exponent, currentLevel);
}

function shouldAutoBuyResearch(state: GameState, researchId: ResearchId): boolean {
  return researchAutoBuyEnabled(state, researchId) && researchAffordable(state, researchId) > 0;
}

function autoPurchaseResearchMax(state: GameState, researchId: ResearchId) {
  const upgrade = DysonverseResearch.find((u) => u.id === researchId);
  if (!upgrade) return;

  const dvid = state.dysonVerseInfinityData;
  const currentLevel = researchCurrentLevel(state, researchId);
  const affordable = maxAffordable(dvid.science, upgrade.baseCost, upgrade.exponent, currentLevel);
  if (affordable <= 0) return;

  const buyMaxCost = buyXCost(affordable, upgrade.baseCost, upgrade.exponent, currentLevel);
  if (buyMaxCost > dvid.science) return;

  dvid.science -= buyMaxCost;
  setResearchCurrentLevel(state, researchId, currentLevel + affordable);
}

function autoBuyResearch(state: GameState) {
  if (
    !shouldAutoBuyResearch(state, "aiManager") &&
    !shouldAutoBuyResearch(state, "assemblyLine") &&
    !shouldAutoBuyResearch(state, "server") &&
    !shouldAutoBuyResearch(state, "dataCenter") &&
    !shouldAutoBuyResearch(state, "planet") &&
    !shouldAutoBuyResearch(state, "cash") &&
    !shouldAutoBuyResearch(state, "science")
  ) {
    return;
  }

  while (
    shouldAutoBuyResearch(state, "aiManager") ||
    shouldAutoBuyResearch(state, "assemblyLine") ||
    shouldAutoBuyResearch(state, "server") ||
    shouldAutoBuyResearch(state, "dataCenter") ||
    shouldAutoBuyResearch(state, "planet") ||
    shouldAutoBuyResearch(state, "cash") ||
    shouldAutoBuyResearch(state, "science")
  ) {
    let didAny = false;

    if (shouldAutoBuyResearch(state, "aiManager")) {
      autoPurchaseResearchMax(state, "aiManager");
      didAny = true;
    }
    if (shouldAutoBuyResearch(state, "assemblyLine")) {
      autoPurchaseResearchMax(state, "assemblyLine");
      didAny = true;
    }
    if (shouldAutoBuyResearch(state, "server")) {
      autoPurchaseResearchMax(state, "server");
      didAny = true;
    }
    if (shouldAutoBuyResearch(state, "dataCenter")) {
      autoPurchaseResearchMax(state, "dataCenter");
      didAny = true;
    }
    if (shouldAutoBuyResearch(state, "planet")) {
      autoPurchaseResearchMax(state, "planet");
      didAny = true;
    }
    if (shouldAutoBuyResearch(state, "cash")) {
      autoPurchaseResearchMax(state, "cash");
      didAny = true;
    }
    if (shouldAutoBuyResearch(state, "science")) {
      autoPurchaseResearchMax(state, "science");
      didAny = true;
    }

    if (!didAny) break;
  }
}

function autoBuyPanelLifetime(state: GameState) {
  const dvpd = state.dysonVersePrestigeData;
  if (!dvpd.infinityAutoResearch) return;

  const dvid = state.dysonVerseInfinityData;

  for (const upgrade of DysonversePanelLifetime) {
    if (upgrade.id === 1 && dvid.panelLifetime1) continue;
    if (upgrade.id === 2 && dvid.panelLifetime2) continue;
    if (upgrade.id === 3 && dvid.panelLifetime3) continue;
    if (upgrade.id === 4 && dvid.panelLifetime4) continue;

    if (dvid.science < upgrade.cost) continue;

    dvid.science -= upgrade.cost;
    if (upgrade.id === 1) dvid.panelLifetime1 = true;
    if (upgrade.id === 2) dvid.panelLifetime2 = true;
    if (upgrade.id === 3) dvid.panelLifetime3 = true;
    if (upgrade.id === 4) dvid.panelLifetime4 = true;

    updatePanelLifetime(state);
  }
}

function checkInfinityTriggers(state: GameState): boolean {
  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const pp = state.prestigePlus;

  if ((Number.isNaN(dvid.bots) || !Number.isFinite(dvid.bots)) && !state.meta.infinityInProgress) {
    state.meta.infinityInProgress = true;
    pp.avocatoOverflow += 1;
    dvpd.infinityPoints += 1000;
    prestigeDysonVerse(state);
    return true;
  }

  const amount = infinityBotsRequired(state);
  if (!pp.breakTheLoop) {
    if (dvid.bots >= amount) {
      prestigeDysonVerse(state);
      return true;
    }
    return false;
  }

  if (state.meta.infinityInProgress) return false;

  let ipToGain = rawInfinityPointsToGain(state);
  ipToGain *= state.debug.doubleIp ? 2 : 1;
  const potential = pp.doubleIP ? ipToGain * 2 : ipToGain;
  const threshold = state.meta.infinityPointsToBreakFor >= 1 ? state.meta.infinityPointsToBreakFor : 1;

  if (potential >= threshold) {
    state.meta.infinityInProgress = true;
    prestigeDysonVerse(state);
    return true;
  }

  return false;
}

export function tick(state: GameState, dt: number): GameState {
  if (!Number.isFinite(dt) || dt <= 0) return state;

  state.timeSeconds += dt;

  state.runtime.modifiersTimer += dt;
  state.runtime.negativeGuardTimer += dt;

  setBotDistribution(state);
  calculateDysonVerseProduction(state, dt);
  tickManualBotCreation(state, dt);
  autoBuyBots(state);
  autoBuyResearch(state);
  tickReality(state, dt);
  tickDream1(state, dt);

  if (checkInfinityTriggers(state)) return state;

  while (state.runtime.modifiersTimer >= 1) {
    state.runtime.modifiersTimer -= 1;
    calculateDysonVerseModifiers(state);
    autoBuyPanelLifetime(state);
  }

  while (state.runtime.negativeGuardTimer >= 10) {
    state.runtime.negativeGuardTimer -= 10;
    checkIfValuesNegative(state);
  }

  return state;
}
