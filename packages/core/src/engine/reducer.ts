import { DysonverseBuildings, DysonversePanelLifetime, DysonverseResearch, DysonverseSkillTree, DysonverseSkillTreeAutoBuy } from "@ids/balance";

import { buyXCost, maxAffordable } from "../math/buy";
import type { GameAction } from "./actions";
import type { BuyMode, GameState } from "../state/types";
import { calculateDysonVerseModifiers, runDysonVerseAwayTime, setBotDistribution, updatePanelLifetime } from "../dysonverse/dysonverse";
import { autoAssignSkills, enactPrestigePlus, prestigeDysonVerse } from "../dysonverse/prestige";
import { canBuySpeed, canBuyTranslation, simulationPrestige, speedCost, translationCost } from "../dream1/dream1";
import { sendWorkers } from "../reality/reality";
import { tick } from "./tick";

function numberToBuy(buyMode: BuyMode, roundedBulkBuy: boolean, manuallyOwned: number, affordable: number): number {
  const ownedInt = Math.trunc(manuallyOwned);
  if (buyMode === "Buy1") return 1;
  if (buyMode === "Buy10") return roundedBulkBuy ? 10 - (ownedInt % 10) : 10;
  if (buyMode === "Buy50") return roundedBulkBuy ? 50 - (ownedInt % 50) : 50;
  if (buyMode === "Buy100") return roundedBulkBuy ? 100 - (ownedInt % 100) : 100;
  return affordable > 0 ? affordable : 1;
}

type BuildingId = "assemblyLines" | "managers" | "servers" | "dataCenters" | "planets";
type ResearchId = "science" | "cash" | "assemblyLine" | "aiManager" | "server" | "dataCenter" | "planet";

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

function setResearchCurrentLevel(state: GameState, researchId: ResearchId, nextLevel: number): GameState {
  const dvid = state.dysonVerseInfinityData;

  if (researchId === "science") return { ...state, dysonVerseInfinityData: { ...dvid, scienceBoostOwned: nextLevel } };
  if (researchId === "cash") return { ...state, dysonVerseInfinityData: { ...dvid, moneyMultiUpgradeOwned: nextLevel } };
  if (researchId === "assemblyLine") return { ...state, dysonVerseInfinityData: { ...dvid, assemblyLineUpgradeOwned: nextLevel } };
  if (researchId === "aiManager") return { ...state, dysonVerseInfinityData: { ...dvid, aiManagerUpgradeOwned: nextLevel } };
  if (researchId === "server") return { ...state, dysonVerseInfinityData: { ...dvid, serverUpgradeOwned: nextLevel } };
  if (researchId === "dataCenter") return { ...state, dysonVerseInfinityData: { ...dvid, dataCenterUpgradeOwned: nextLevel } };
  return { ...state, dysonVerseInfinityData: { ...dvid, planetUpgradeOwned: nextLevel } };
}

export function reduceGameAction(state: GameState, action: GameAction): GameState {
  if (action.type === "TICK") {
    return tick(state, action.dt);
  }
  if (action.type === "SET_BUY_MODE") {
    return { ...state, settings: { ...state.settings, buyMode: action.buyMode } };
  }
  if (action.type === "SET_RESEARCH_BUY_MODE") {
    return { ...state, settings: { ...state.settings, researchBuyMode: action.buyMode } };
  }
  if (action.type === "TOGGLE_ROUNDED_BULK_BUY") {
    return { ...state, settings: { ...state.settings, roundedBulkBuy: !state.settings.roundedBulkBuy } };
  }
  if (action.type === "TOGGLE_RESEARCH_ROUNDED_BULK_BUY") {
    return { ...state, settings: { ...state.settings, researchRoundedBulkBuy: !state.settings.researchRoundedBulkBuy } };
  }
  if (action.type === "SET_AUTO_RESEARCH_TOGGLE") {
    const s = state.settings;
    if (action.researchId === "aiManager") return { ...state, settings: { ...s, infinityAutoResearchToggleAi: action.value } };
    if (action.researchId === "assemblyLine") return { ...state, settings: { ...s, infinityAutoResearchToggleAssembly: action.value } };
    if (action.researchId === "money") return { ...state, settings: { ...s, infinityAutoResearchToggleMoney: action.value } };
    if (action.researchId === "planet") return { ...state, settings: { ...s, infinityAutoResearchTogglePlanet: action.value } };
    if (action.researchId === "server") return { ...state, settings: { ...s, infinityAutoResearchToggleServer: action.value } };
    if (action.researchId === "dataCenter") return { ...state, settings: { ...s, infinityAutoResearchToggleDataCenter: action.value } };
    return { ...state, settings: { ...s, infinityAutoResearchToggleScience: action.value } };
  }
  if (action.type === "SET_AUTO_BUILDING_TOGGLE") {
    const s = state.settings;
    if (action.buildingId === "assemblyLines") return { ...state, settings: { ...s, infinityAutoAssembly: action.value } };
    if (action.buildingId === "managers") return { ...state, settings: { ...s, infinityAutoManagers: action.value } };
    if (action.buildingId === "servers") return { ...state, settings: { ...s, infinityAutoServers: action.value } };
    if (action.buildingId === "dataCenters") return { ...state, settings: { ...s, infinityAutoDataCenters: action.value } };
    return { ...state, settings: { ...s, infinityAutoPlanets: action.value } };
  }
  if (action.type === "SET_INFINITY_BREAK_THRESHOLD") {
    if (!Number.isFinite(action.value)) return state;
    return { ...state, meta: { ...state.meta, infinityPointsToBreakFor: Math.max(0, Math.trunc(action.value)) } };
  }
  if (action.type === "SET_NUMBER_FORMATTING") {
    return { ...state, settings: { ...state.settings, numberFormatting: action.value } };
  }
  if (action.type === "SET_BOT_DISTRIBUTION") {
    const botDistribution = Math.min(1, Math.max(0, action.botDistribution));
    const nextState = { ...state, dysonVersePrestigeData: { ...state.dysonVersePrestigeData, botDistribution } };
    setBotDistribution(nextState);
    return nextState;
  }

  if (action.type === "DEBUG_ADD_MONEY") {
    if (!state.debug.debugOptions) return state;
    return {
      ...state,
      dysonVerseInfinityData: { ...state.dysonVerseInfinityData, money: state.dysonVerseInfinityData.money + action.amount },
    };
  }
  if (action.type === "DEBUG_ADD_SCIENCE") {
    if (!state.debug.debugOptions) return state;
    return {
      ...state,
      dysonVerseInfinityData: { ...state.dysonVerseInfinityData, science: state.dysonVerseInfinityData.science + action.amount },
    };
  }

  if (action.type === "SET_DEBUG_FLAG") {
    if (action.flag === "debugOptions") return { ...state, debug: { ...state.debug, debugOptions: action.value } };
    return { ...state, debug: { ...state.debug, doubleIp: action.value } };
  }

  if (action.type === "OFFLINE_SPEND") {
    const seconds = Math.max(0, action.seconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return state;

    const canSpend = state.settings.offlineTime;
    const spend = seconds > canSpend ? canSpend : seconds;
    if (spend <= 0) return state;

    runDysonVerseAwayTime(state, spend);
    state.settings.offlineTime -= spend;
    return state;
  }

  if (action.type === "OFFLINE_DOUBLE_MAX") {
    if (state.settings.offlineTime < state.settings.maxOfflineTime) return state;
    state.settings.maxOfflineTime *= 2;
    state.settings.offlineTime = 0;
    return state;
  }

  if (action.type === "MANUAL_BOT_CREATION_START") {
    const manual = state.runtime.manualBotCreation;
    if (manual.running) return state;
    manual.running = true;
    manual.time = 0.1;
    return state;
  }

  if (action.type === "BUY_BUILDING") {
    const building = DysonverseBuildings.find((b) => b.id === action.buildingId);
    if (!building) return state;

    const money = state.dysonVerseInfinityData.money;
    const manuallyOwned = state.dysonVerseInfinityData[action.buildingId][1];
    const currentLevel = buildingCurrentLevel(state, action.buildingId);
    const modifiedBaseCost = buildingModifiedBaseCost(state, action.buildingId, building.baseCost);

    const affordable = maxAffordable(money, modifiedBaseCost, building.exponent, currentLevel);
    const n = numberToBuy(state.settings.buyMode, state.settings.roundedBulkBuy, manuallyOwned, affordable);
    const cost = buyXCost(n, modifiedBaseCost, building.exponent, currentLevel);

    if (cost > money || n <= 0) return state;

    const nextPair: [number, number] = [state.dysonVerseInfinityData[action.buildingId][0], manuallyOwned + n];
    return {
      ...state,
      dysonVerseInfinityData: {
        ...state.dysonVerseInfinityData,
        money: money - cost,
        [action.buildingId]: nextPair,
      },
    };
  }

  if (action.type === "BUY_RESEARCH") {
    const upgrade = DysonverseResearch.find((u) => u.id === action.researchId);
    if (!upgrade) return state;

    const dvid = state.dysonVerseInfinityData;
    const dvst = state.dysonVerseSkillTreeData;

    if (action.researchId === "science" && dvst.shouldersOfGiants) return state;
    if (action.researchId === "cash" && (dvst.shouldersOfTheEnlightened || dvst.shouldersOfPrecursors)) return state;

    const science = dvid.science;
    const currentLevel = researchCurrentLevel(state, action.researchId);
    const affordable = maxAffordable(science, upgrade.baseCost, upgrade.exponent, currentLevel);
    const n = numberToBuy(state.settings.researchBuyMode, state.settings.researchRoundedBulkBuy, currentLevel, affordable);
    const cost = buyXCost(n, upgrade.baseCost, upgrade.exponent, currentLevel);

    if (cost > science || n <= 0) return state;

    const next = setResearchCurrentLevel(
      { ...state, dysonVerseInfinityData: { ...dvid, science: science - cost } },
      action.researchId,
      currentLevel + n,
    );
    return next;
  }

  if (action.type === "BUY_PANEL_LIFETIME") {
    const upgrade = DysonversePanelLifetime.find((u) => u.id === action.upgradeId);
    if (!upgrade) return state;

    const dvid = state.dysonVerseInfinityData;
    const cost = upgrade.cost;
    const science = dvid.science;
    if (science < cost) return state;

    const alreadyOwned =
      (action.upgradeId === 1 && dvid.panelLifetime1) ||
      (action.upgradeId === 2 && dvid.panelLifetime2) ||
      (action.upgradeId === 3 && dvid.panelLifetime3) ||
      (action.upgradeId === 4 && dvid.panelLifetime4);
    if (alreadyOwned) return state;

    const nextDvid =
      action.upgradeId === 1
        ? { ...dvid, science: science - cost, panelLifetime1: true }
        : action.upgradeId === 2
          ? { ...dvid, science: science - cost, panelLifetime2: true }
          : action.upgradeId === 3
            ? { ...dvid, science: science - cost, panelLifetime3: true }
            : { ...dvid, science: science - cost, panelLifetime4: true };

    const nextState = { ...state, dysonVerseInfinityData: nextDvid };
    updatePanelLifetime(nextState);
    return nextState;
  }

  if (action.type === "SKILL_TREE_TOGGLE") {
    const skill = DysonverseSkillTree.find((s) => s.id === action.skillId);
    if (!skill) return state;

    const dvst = state.dysonVerseSkillTreeData;
    const pp = state.prestigePlus;
    const save = state.dysonVerseSaveData;

    const key = skill.key as keyof typeof dvst;
    const currentlyOwned = Boolean(dvst[key]);

    if (currentlyOwned) {
      if (!skill.refundable) return state;

      for (const other of DysonverseSkillTree) {
        if (other.id === skill.id) continue;
        const otherKey = other.key as keyof typeof dvst;
        if (!dvst[otherKey]) continue;
        if (other.requirements?.includes(skill.id)) return state;
      }

      const nextDvst = {
        ...dvst,
        [key]: false,
        skillPointsTree: dvst.skillPointsTree + skill.cost,
        fragments: skill.isFragment && dvst.fragments >= 1 ? dvst.fragments - 1 : dvst.fragments,
      } as typeof dvst;

      const nextList = save.skillAutoAssignmentList.filter((id) => id !== skill.id);
      return {
        ...state,
        dysonVerseSkillTreeData: nextDvst,
        dysonVerseSaveData: { ...save, skillAutoAssignmentList: nextList },
      };
    }

    if (skill.purityLine && !pp.purity) return state;
    if (skill.isFragment && !pp.fragments) return state;
    if (skill.terraLine && !pp.terra) return state;
    if (skill.powerLine && !pp.power) return state;
    if (skill.paragadeLine && !pp.paragade) return state;
    if (skill.stellarLine && !pp.stellar) return state;
    if (skill.firstRunBlocked && !state.meta.firstInfinityDone) return state;

    if (dvst.skillPointsTree < skill.cost) return state;

    for (const req of skill.requirements ?? []) {
      const reqSkill = DysonverseSkillTree.find((s) => s.id === req);
      if (!reqSkill) return state;
      const reqKey = reqSkill.key as keyof typeof dvst;
      if (!dvst[reqKey]) return state;
    }
    for (const req of skill.shadowRequirements ?? []) {
      const reqSkill = DysonverseSkillTree.find((s) => s.id === req);
      if (!reqSkill) return state;
      const reqKey = reqSkill.key as keyof typeof dvst;
      if (!dvst[reqKey]) return state;
    }
    for (const exclusive of skill.exclusiveWith ?? []) {
      const other = DysonverseSkillTree.find((s) => s.id === exclusive);
      if (!other) continue;
      const otherKey = other.key as keyof typeof dvst;
      if (dvst[otherKey]) return state;
    }

    const nextDvst = {
      ...dvst,
      [key]: true,
      skillPointsTree: dvst.skillPointsTree - skill.cost,
      fragments: skill.isFragment ? dvst.fragments + 1 : dvst.fragments,
    } as typeof dvst;

    const disallowAutoBuy = DysonverseSkillTreeAutoBuy.doNotAutoBuy.includes(skill.id);
    const nextList =
      disallowAutoBuy || save.skillAutoAssignmentList.includes(skill.id)
        ? save.skillAutoAssignmentList
        : [...save.skillAutoAssignmentList, skill.id];

    return {
      ...state,
      dysonVerseSkillTreeData: nextDvst,
      dysonVerseSaveData: { ...save, skillAutoAssignmentList: nextList },
    };
  }

  if (action.type === "SKILL_TREE_AUTO_ASSIGN_TOGGLE") {
    const save = state.dysonVerseSaveData;
    const list = save.skillAutoAssignmentList;
    const nextList = list.includes(action.skillId) ? list.filter((id) => id !== action.skillId) : [...list, action.skillId];
    return { ...state, dysonVerseSaveData: { ...save, skillAutoAssignmentList: nextList } };
  }

  if (action.type === "SKILL_TREE_RESET") {
    const dvst = state.dysonVerseSkillTreeData;
    const save = state.dysonVerseSaveData;

    const ownedSkillIds = new Set<number>();
    for (const skill of DysonverseSkillTree) {
      const key = skill.key as keyof typeof dvst;
      if (dvst[key]) ownedSkillIds.add(skill.id);
    }

    let nextSkillPoints = dvst.skillPointsTree;
    let nextFragments = dvst.fragments;
    const nextDvst = { ...dvst } as GameState["dysonVerseSkillTreeData"];

    for (const skill of DysonverseSkillTree) {
      const key = skill.key as keyof typeof dvst;
      if (!dvst[key]) continue;

      let refundable = skill.refundable;
      for (const blocker of skill.unrefundableWith ?? []) {
        if (ownedSkillIds.has(blocker)) refundable = false;
      }

      if (!refundable) continue;

      (nextDvst as unknown as Record<string, unknown>)[skill.key] = false;
      nextSkillPoints += skill.cost;
      if (skill.isFragment && nextFragments >= 1) nextFragments -= 1;
      ownedSkillIds.delete(skill.id);
    }

    nextDvst.skillPointsTree = nextSkillPoints;
    nextDvst.fragments = nextFragments;

    return {
      ...state,
      dysonVerseSkillTreeData: nextDvst,
      dysonVerseSaveData: { ...save, skillAutoAssignmentList: [] },
    };
  }

  if (action.type === "SKILL_TREE_SAVE_PRESET") {
    const list = [...state.dysonVerseSaveData.skillAutoAssignmentList];
    const botDistribution = state.dysonVersePrestigeData.botDistribution;

    if (action.preset === 1) {
      return { ...state, dysonVerseSaveData: { ...state.dysonVerseSaveData, skillAutoAssignmentList1: list, botDistPreset1: botDistribution } };
    }
    if (action.preset === 2) {
      return { ...state, dysonVerseSaveData: { ...state.dysonVerseSaveData, skillAutoAssignmentList2: list, botDistPreset2: botDistribution } };
    }
    if (action.preset === 3) {
      return { ...state, dysonVerseSaveData: { ...state.dysonVerseSaveData, skillAutoAssignmentList3: list, botDistPreset3: botDistribution } };
    }
    if (action.preset === 4) {
      return { ...state, dysonVerseSaveData: { ...state.dysonVerseSaveData, skillAutoAssignmentList4: list, botDistPreset4: botDistribution } };
    }
    return { ...state, dysonVerseSaveData: { ...state.dysonVerseSaveData, skillAutoAssignmentList5: list, botDistPreset5: botDistribution } };
  }

  if (action.type === "SKILL_TREE_LOAD_PRESET") {
    const save = state.dysonVerseSaveData;

    const list =
      action.preset === 1
        ? [...save.skillAutoAssignmentList1]
        : action.preset === 2
          ? [...save.skillAutoAssignmentList2]
          : action.preset === 3
            ? [...save.skillAutoAssignmentList3]
            : action.preset === 4
              ? [...save.skillAutoAssignmentList4]
              : [...save.skillAutoAssignmentList5];

    const botDistribution =
      action.preset === 1
        ? save.botDistPreset1
        : action.preset === 2
          ? save.botDistPreset2
          : action.preset === 3
            ? save.botDistPreset3
            : action.preset === 4
              ? save.botDistPreset4
              : save.botDistPreset5;

    const nextState = {
      ...state,
      dysonVerseSaveData: { ...save, skillAutoAssignmentList: list },
      dysonVersePrestigeData: { ...state.dysonVersePrestigeData, botDistribution },
    };
    setBotDistribution(nextState);
    return nextState;
  }

  if (action.type === "DYSON_PRESTIGE") {
    prestigeDysonVerse(state);
    return state;
  }

  if (action.type === "INFINITY_BUY") {
    const dvid = state.dysonVerseInfinityData;
    const dvpd = state.dysonVersePrestigeData;
    const dvst = state.dysonVerseSkillTreeData;

    const available = dvpd.infinityPoints - dvpd.spentInfinityPoints;

    if (action.item === "secret") {
      if (dvpd.secretsOfTheUniverse >= 27) return state;
      if (available < 1) return state;
      dvpd.spentInfinityPoints += 1;
      dvpd.secretsOfTheUniverse += 1;
      return state;
    }

    if (action.item === "skillPoint") {
      if (dvpd.permanentSkillPoint >= 10) return state;
      if (available < 1) return state;
      dvpd.spentInfinityPoints += 1;
      dvpd.permanentSkillPoint += 1;
      dvst.skillPointsTree += 1;
      autoAssignSkills(state);
      setBotDistribution(state);
      calculateDysonVerseModifiers(state);
      return state;
    }

    if (action.item === "starterAssemblyLines") {
      if (dvpd.infinityAssemblyLines) return state;
      if (available < 1) return state;
      dvpd.spentInfinityPoints += 1;
      dvpd.infinityAssemblyLines = true;
      dvid.assemblyLines[1] += 10;
      return state;
    }

    if (action.item === "starterAiManagers") {
      if (dvpd.infinityAiManagers) return state;
      if (!dvpd.infinityAssemblyLines) return state;
      if (available < 1) return state;
      dvpd.spentInfinityPoints += 1;
      dvpd.infinityAiManagers = true;
      dvid.managers[1] += 10;
      return state;
    }

    if (action.item === "starterServers") {
      if (dvpd.infinityServers) return state;
      if (!dvpd.infinityAiManagers) return state;
      if (available < 1) return state;
      dvpd.spentInfinityPoints += 1;
      dvpd.infinityServers = true;
      dvid.servers[1] += 10;
      return state;
    }

    if (action.item === "starterDataCenters") {
      if (dvpd.infinityDataCenter) return state;
      if (!dvpd.infinityServers) return state;
      if (available < 1) return state;
      dvpd.spentInfinityPoints += 1;
      dvpd.infinityDataCenter = true;
      dvid.dataCenters[1] += 10;
      return state;
    }

    if (action.item === "starterPlanets") {
      if (dvpd.infinityPlanets) return state;
      if (!dvpd.infinityDataCenter) return state;
      if (available < 1) return state;
      dvpd.spentInfinityPoints += 1;
      dvpd.infinityPlanets = true;
      dvid.planets[1] += 10;
      return state;
    }

    if (action.item === "autoResearch") {
      if (dvpd.infinityAutoResearch) return state;
      if (available < 3) return state;
      dvpd.spentInfinityPoints += 3;
      dvpd.infinityAutoResearch = true;
      return state;
    }

    if (action.item === "autoBots") {
      if (dvpd.infinityAutoBots) return state;
      if (available < 3) return state;
      dvpd.spentInfinityPoints += 3;
      dvpd.infinityAutoBots = true;
      return state;
    }

    return state;
  }

  if (action.type === "PRESTIGE_PLUS_BUY") {
    const pp = state.prestigePlus;
    const dvpd = state.dysonVersePrestigeData;

    const remaining = pp.points - pp.spentPoints;

    const divisionCost = pp.divisionsPurchased >= 1 ? Math.pow(2, pp.divisionsPurchased) * 2 : 2;

    if (action.item === "botMultitasking") {
      if (pp.botMultitasking || remaining < 1) return state;
      pp.botMultitasking = true;
      pp.spentPoints += 1;
      setBotDistribution(state);
      return state;
    }

    if (action.item === "doubleIP") {
      if (pp.doubleIP || remaining < 1) return state;
      pp.doubleIP = true;
      pp.spentPoints += 1;
      return state;
    }

    if (action.item === "automation") {
      if (pp.automation || remaining < 1) return state;
      pp.automation = true;
      dvpd.infinityAutoBots = true;
      dvpd.infinityAutoResearch = true;
      pp.spentPoints += 1;
      return state;
    }

    if (action.item === "secrets") {
      if (pp.secrets >= 27 || remaining < 1) return state;
      pp.secrets += pp.secrets >= 27 ? 0 : 3;
      dvpd.secretsOfTheUniverse += dvpd.secretsOfTheUniverse >= 27 ? 0 : 3;
      if (pp.secrets > 27) pp.secrets = 27;
      if (dvpd.secretsOfTheUniverse > 27) dvpd.secretsOfTheUniverse = 27;
      pp.spentPoints += 1;
      return state;
    }

    if (action.item === "division") {
      if (pp.divisionsPurchased >= 19) return state;
      if (remaining < divisionCost) return state;
      pp.spentPoints += divisionCost;
      pp.divisionsPurchased += 1;
      return state;
    }

    if (action.item === "breakTheLoop") {
      if (pp.breakTheLoop || remaining < 6) return state;
      pp.breakTheLoop = true;
      pp.spentPoints += 6;
      return state;
    }

    if (action.item === "quantumEntanglement") {
      if (pp.quantumEntanglement || remaining < 12) return state;
      pp.quantumEntanglement = true;
      pp.spentPoints += 12;
      return state;
    }

    if (action.item === "avocato") {
      if (pp.avocatoPurchased || remaining < 42) return state;
      pp.avocatoPurchased = true;
      pp.spentPoints += 42;
      return state;
    }

    if (action.item === "fragments") {
      if (pp.fragments || remaining < 2) return state;
      pp.fragments = true;
      pp.spentPoints += 2;
      return state;
    }

    if (action.item === "purity") {
      if (pp.purity || remaining < 3) return state;
      pp.purity = true;
      pp.spentPoints += 3;
      return state;
    }

    if (action.item === "terra") {
      if (pp.terra || remaining < 2) return state;
      pp.terra = true;
      pp.spentPoints += 2;
      return state;
    }

    if (action.item === "power") {
      if (pp.power || remaining < 2) return state;
      pp.power = true;
      pp.spentPoints += 2;
      return state;
    }

    if (action.item === "paragade") {
      if (pp.paragade || remaining < 1) return state;
      pp.paragade = true;
      pp.spentPoints += 1;
      return state;
    }

    if (action.item === "stellar") {
      if (pp.stellar || remaining < 4) return state;
      pp.stellar = true;
      pp.spentPoints += 4;
      return state;
    }

    if (action.item === "influence") {
      if (remaining < 1) return state;
      pp.influence += 4;
      pp.spentPoints += 1;
      return state;
    }

    if (action.item === "cash") {
      if (remaining < 1) return state;
      pp.cash += 1;
      pp.spentPoints += 1;
      return state;
    }

    if (action.item === "science") {
      if (remaining < 1) return state;
      pp.science += 1;
      pp.spentPoints += 1;
      return state;
    }

    return state;
  }

  if (action.type === "PRESTIGE_PLUS_ENACT") {
    enactPrestigePlus(state);
    return state;
  }

  if (action.type === "AVOCATO_FEED_IP") {
    if (!state.prestigePlus.avocatoPurchased) return state;

    const dvpd = state.dysonVersePrestigeData;
    const pp = state.prestigePlus;

    const available = dvpd.infinityPoints - dvpd.spentInfinityPoints;
    if (available <= 0) return state;

    pp.avocatoIP += available;
    dvpd.infinityPoints -= available;
    return state;
  }

  if (action.type === "AVOCATO_FEED_INFLUENCE") {
    if (!state.prestigePlus.avocatoPurchased) return state;

    const sd = state.saveData;
    const pp = state.prestigePlus;
    if (sd.influence <= 0) return state;

    pp.avocatoInfluence += sd.influence;
    sd.influence = 0;
    return state;
  }

  if (action.type === "AVOCATO_FEED_STRANGE_MATTER") {
    if (!state.prestigePlus.avocatoPurchased) return state;

    const sp = state.sdPrestige;
    const pp = state.prestigePlus;
    if (sp.strangeMatter <= 0) return state;

    pp.avocatoStrangeMatter += sp.strangeMatter;
    sp.strangeMatter = 0;
    return state;
  }

  if (action.type === "AVOCATO_MEDITATE") {
    if (!state.prestigePlus.avocatoPurchased) return state;
    if (state.settings.avotation) return state;

    state.dysonVerseSkillTreeData.skillPointsTree += 4;
    state.settings.avotation = true;
    return state;
  }

  if (action.type === "REALITY_SEND_WORKERS") {
    if (state.saveData.workersReadyToGo < 128) return state;
    sendWorkers(state);
    return state;
  }

  if (action.type === "DREAM1_BUY") {
    const sd = state.saveData;
    const sd1 = state.sdSimulation;

    if (action.item === "hunters") {
      if (sd.influence < sd1.hunterCost) return state;
      sd.influence -= sd1.hunterCost;
      sd1.hunters += sd.huntersPerPurchase;
      return state;
    }

    if (action.item === "gatherers") {
      if (sd.influence < sd1.gathererCost) return state;
      sd.influence -= sd1.gathererCost;
      sd1.gatherers += sd.gatherersPerPurchase;
      return state;
    }

    if (action.item === "communityBoost") {
      const cost = Math.trunc(sd1.communityBoostCost);
      if (sd.influence < cost) return state;
      sd.influence -= cost;
      sd1.communityBoostTime = sd1.communityBoostDuration;
      return state;
    }

    if (action.item === "engineering") {
      if (sd1.engineering || sd1.engineeringComplete) return state;
      const cost = Math.trunc(sd1.engineeringCost);
      if (sd.influence < cost) return state;
      sd.influence -= cost;
      sd1.engineering = true;
      return state;
    }

    if (action.item === "shipping") {
      if (sd1.shipping || sd1.shippingComplete) return state;
      const cost = Math.trunc(sd1.shippingCost);
      if (sd.influence < cost) return state;
      sd.influence -= cost;
      sd1.shipping = true;
      return state;
    }

    if (action.item === "worldTrade") {
      if (sd1.worldTrade || sd1.worldTradeComplete) return state;
      const cost = Math.trunc(sd1.worldTradeCost);
      if (sd.influence < cost) return state;
      sd.influence -= cost;
      sd1.worldTrade = true;
      return state;
    }

    if (action.item === "worldPeace") {
      if (sd1.worldPeace || sd1.worldPeaceComplete) return state;
      const cost = Math.trunc(sd1.worldPeaceCost);
      if (sd.influence < cost) return state;
      sd.influence -= cost;
      sd1.worldPeace = true;
      return state;
    }

    if (action.item === "mathematics") {
      if (sd1.mathematics || sd1.mathematicsComplete) return state;
      const cost = Math.trunc(sd1.mathematicsCost);
      if (sd.influence < cost) return state;
      sd.influence -= cost;
      sd1.mathematics = true;
      return state;
    }

    if (action.item === "advancedPhysics") {
      if (sd1.advancedPhysics || sd1.advancedPhysicsComplete) return state;
      const cost = Math.trunc(sd1.advancedPhysicsCost);
      if (sd.influence < cost) return state;
      sd.influence -= cost;
      sd1.advancedPhysics = true;
      return state;
    }

    if (action.item === "factoriesBoost") {
      const cost = sd1.factoriesBoostCost;
      // Unity bug: blocks exact-cost purchase (`<=` instead of `<`).
      if (sd.influence <= cost) return state;
      sd.influence -= Math.trunc(cost);
      sd1.factoriesBoostTime = sd1.factoriesBoostDuration;
      return state;
    }

    if (action.item === "solar") {
      if (sd.influence < sd1.solarCost) return state;
      sd1.solarPanels += 1;
      sd.influence -= sd1.solarCost;
      return state;
    }

    if (action.item === "fusion") {
      if (sd.influence < sd1.fusionCost) return state;
      sd1.fusion += 1;
      sd.influence -= sd1.fusionCost;
      return state;
    }

    return state;
  }

  if (action.type === "STRANGE_MATTER_BUY") {
    const sd = state.saveData;
    const sd1 = state.sdSimulation;
    const sp = state.sdPrestige;
    const dvst = state.dysonVerseSkillTreeData;

    function buy(cost: number): boolean {
      if (sp.strangeMatter < cost) return false;
      sp.strangeMatter -= cost;
      return true;
    }

    if (action.item === "counterMeteor") {
      if (sp.counterMeteor) return state;
      if (!buy(4)) return state;
      sp.counterMeteor = true;
      sp.disasterStage = 2;
      return state;
    }

    if (action.item === "counterAi") {
      if (!sp.counterMeteor || sp.counterAi) return state;
      if (!buy(42)) return state;
      sp.counterAi = true;
      sp.disasterStage = 3;
      return state;
    }

    if (action.item === "counterGw") {
      if (!sp.counterAi || sp.counterGw) return state;
      if (!buy(128)) return state;
      sp.counterGw = true;
      sp.disasterStage = 42;
      return state;
    }

    if (action.item === "engineering1") {
      if (!sp.counterMeteor || sp.engineering1) return state;
      if (!buy(2)) return state;
      sp.engineering1 = true;
      sd1.engineeringResearchTime = 300;
      return state;
    }

    if (action.item === "engineering2") {
      if (!sp.engineering1 || sp.engineering2) return state;
      if (!buy(10)) return state;
      sp.engineering2 = true;
      sd1.engineeringResearchTime = 60;
      return state;
    }

    if (action.item === "engineering3") {
      if (!sp.engineering2 || sp.engineering3) return state;
      if (!buy(42)) return state;
      sp.engineering3 = true;
      sd1.engineeringComplete = true;
      return state;
    }

    if (action.item === "shipping1") {
      if (!sp.engineering1 || sp.shipping1) return state;
      if (!buy(18)) return state;
      sp.shipping1 = true;
      sd1.shippingResearchTime = 600;
      return state;
    }

    if (action.item === "shipping2") {
      if (!sp.shipping1 || sp.shipping2) return state;
      if (!buy(27)) return state;
      sp.shipping2 = true;
      sd1.shippingComplete = true;
      return state;
    }

    if (action.item === "worldTrade1") {
      if (!sp.shipping1 || sp.worldTrade1) return state;
      if (!buy(44)) return state;
      sp.worldTrade1 = true;
      sd1.worldTradeResearchTime = 1800;
      return state;
    }

    if (action.item === "worldTrade2") {
      if (!sp.worldTrade1 || sp.worldTrade2) return state;
      if (!buy(88)) return state;
      sp.worldTrade2 = true;
      sd1.worldTradeResearchTime = 600;
      return state;
    }

    if (action.item === "worldTrade3") {
      if (!sp.worldTrade2 || sp.worldTrade3) return state;
      if (!buy(124)) return state;
      sp.worldTrade3 = true;
      sd1.worldTradeComplete = true;
      return state;
    }

    if (action.item === "worldPeace1") {
      if (!sp.worldTrade1 || sp.worldPeace1) return state;
      if (!buy(52)) return state;
      sp.worldPeace1 = true;
      sd1.worldPeaceResearchTime = 3600;
      return state;
    }

    if (action.item === "worldPeace2") {
      if (!sp.worldPeace1 || sp.worldPeace2) return state;
      if (!buy(74)) return state;
      sp.worldPeace2 = true;
      sd1.worldPeaceResearchTime = 1800;
      return state;
    }

    if (action.item === "worldPeace3") {
      if (!sp.worldPeace2 || sp.worldPeace3) return state;
      if (!buy(188)) return state;
      sp.worldPeace3 = true;
      sd1.worldPeaceResearchTime = 600;
      return state;
    }

    if (action.item === "worldPeace4") {
      if (!sp.worldPeace3 || sp.worldPeace4) return state;
      if (!buy(324)) return state;
      sp.worldPeace4 = true;
      sd1.worldPeaceComplete = true;
      return state;
    }

    if (action.item === "mathematics1") {
      if (!sp.counterAi || sp.mathematics1) return state;
      if (!buy(44)) return state;
      sp.mathematics1 = true;
      sd1.mathematicsResearchTime = 1800;
      return state;
    }

    if (action.item === "mathematics2") {
      if (!sp.mathematics1 || sp.mathematics2) return state;
      if (!buy(88)) return state;
      sp.mathematics2 = true;
      sd1.mathematicsResearchTime = 600;
      return state;
    }

    if (action.item === "mathematics3") {
      if (!sp.mathematics2 || sp.mathematics3) return state;
      if (!buy(124)) return state;
      sp.mathematics3 = true;
      sd1.mathematicsComplete = true;
      return state;
    }

    if (action.item === "advancedPhysics1") {
      if (!sp.mathematics1 || sp.advancedPhysics1) return state;
      if (!buy(92)) return state;
      sp.advancedPhysics1 = true;
      sd1.advancedPhysicsResearchTime = 3600;
      return state;
    }

    if (action.item === "advancedPhysics2") {
      if (!sp.advancedPhysics1 || sp.advancedPhysics2) return state;
      if (!buy(126)) return state;
      sp.advancedPhysics2 = true;
      sd1.advancedPhysicsResearchTime = 1800;
      return state;
    }

    if (action.item === "advancedPhysics3") {
      if (!sp.advancedPhysics2 || sp.advancedPhysics3) return state;
      if (!buy(381)) return state;
      sp.advancedPhysics3 = true;
      sd1.advancedPhysicsResearchTime = 600;
      return state;
    }

    if (action.item === "advancedPhysics4") {
      if (!sp.advancedPhysics3 || sp.advancedPhysics4) return state;
      if (!buy(654)) return state;
      sp.advancedPhysics4 = true;
      sd1.advancedPhysicsComplete = true;
      return state;
    }

    if (action.item === "hunter1") {
      if (sp.hunter1) return state;
      if (!buy(2)) return state;
      sp.hunter1 = true;
      if (sd1.hunters < 1) sd1.hunters = 1;
      return state;
    }

    if (action.item === "hunter2") {
      if (!sp.hunter1 || sp.hunter2) return state;
      if (!buy(20)) return state;
      sp.hunter2 = true;
      if (sd1.hunters < 10) sd1.hunters = 10;
      return state;
    }

    if (action.item === "hunter3") {
      if (!sp.hunter2 || sp.hunter3) return state;
      if (!buy(40)) return state;
      sp.hunter3 = true;
      if (sd1.hunters < 1000) sd1.hunters = 1000;
      return state;
    }

    if (action.item === "hunter4") {
      if (!sp.hunter2 || sp.hunter4) return state;
      if (!buy(40)) return state;
      sp.hunter4 = true;
      sd.huntersPerPurchase = 1000;
      return state;
    }

    if (action.item === "gatherer1") {
      if (sp.gatherer1) return state;
      if (!buy(2)) return state;
      sp.gatherer1 = true;
      if (sd1.gatherers < 1) sd1.gatherers = 1;
      return state;
    }

    if (action.item === "gatherer2") {
      if (!sp.gatherer1 || sp.gatherer2) return state;
      if (!buy(20)) return state;
      sp.gatherer2 = true;
      if (sd1.gatherers < 10) sd1.gatherers = 10;
      return state;
    }

    if (action.item === "gatherer3") {
      if (!sp.gatherer2 || sp.gatherer3) return state;
      if (!buy(40)) return state;
      sp.gatherer3 = true;
      if (sd1.gatherers < 1000) sd1.gatherers = 1000;
      return state;
    }

    if (action.item === "gatherer4") {
      if (!sp.gatherer2 || sp.gatherer4) return state;
      if (!buy(40)) return state;
      sp.gatherer4 = true;
      sd.gatherersPerPurchase = 1000;
      return state;
    }

    if (action.item === "workerBoost") {
      if (sp.workerBoost) return state;
      if (!buy(42)) return state;
      sp.workerBoost = true;
      sp.workerBoostAcivator = true;
      return state;
    }

    if (action.item === "citiesBoost") {
      if (!sp.counterMeteor || sp.citiesBoost) return state;
      if (!buy(1337)) return state;
      sp.citiesBoost = true;
      sp.citiesBoostActivator = true;
      return state;
    }

    if (action.item === "factoriesBoost") {
      if (!sp.counterAi || sp.factoriesBoost) return state;
      if (!buy(21)) return state;
      sp.factoriesBoost = true;
      sp.factoriesBoostActivator = true;
      return state;
    }

    if (action.item === "bots1") {
      if (!sp.counterAi || sp.bots1) return state;
      if (!buy(211)) return state;
      sp.bots1 = true;
      sp.botsBoost1Activator = true;
      return state;
    }

    if (action.item === "bots2") {
      if (!sp.bots1 || sp.bots2) return state;
      if (!buy(1111)) return state;
      sp.bots2 = true;
      sp.botsBoost2Activator = true;
      return state;
    }

    if (action.item === "rockets1") {
      if (!sp.counterGw || sp.rockets1) return state;
      if (!buy(1111)) return state;
      sp.rockets1 = true;
      sd1.rocketsPerSpaceFactory = 5;
      return state;
    }

    if (action.item === "rockets2") {
      if (!sp.rockets1 || sp.rockets2) return state;
      if (!buy(2222)) return state;
      sp.rockets2 = true;
      sd1.rocketsPerSpaceFactory = 3;
      return state;
    }

    if (action.item === "rockets3") {
      if (!sp.rockets2 || sp.rockets3) return state;
      if (!buy(3333)) return state;
      sp.rockets3 = true;
      sd1.rocketsPerSpaceFactory = 1;
      return state;
    }

    if (action.item === "sfacs1") {
      if (!sp.counterGw || sp.sfacs1) return state;
      if (!buy(1221)) return state;
      sp.sfacs1 = true;
      sp.sfActivator1 = true;
      return state;
    }

    if (action.item === "sfacs2") {
      if (!sp.sfacs1 || sp.sfacs2) return state;
      if (!buy(12221)) return state;
      sp.sfacs2 = true;
      sp.sfActivator2 = true;
      return state;
    }

    if (action.item === "sfacs3") {
      if (!sp.sfacs2 || sp.sfacs3) return state;
      if (!buy(122221)) return state;
      sp.sfacs3 = true;
      sp.sfActivator3 = true;
      return state;
    }

    if (action.item === "railguns1") {
      if (!sp.counterGw || sp.railguns1) return state;
      if (!buy(1221)) return state;
      sp.railguns1 = true;
      sp.railgunActivator1 = true;
      return state;
    }

    if (action.item === "railguns2") {
      if (!sp.railguns1 || sp.railguns2) return state;
      if (!buy(12221)) return state;
      sp.railguns2 = true;
      sp.railgunActivator2 = true;
      return state;
    }

    if (action.item === "translation1") {
      const cost = translationCost(1);
      if (!canBuyTranslation(sp, 1) || !buy(cost)) return state;
      sp.translation1 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "translation2") {
      const cost = translationCost(2);
      if (!canBuyTranslation(sp, 2) || !buy(cost)) return state;
      sp.translation2 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "translation3") {
      const cost = translationCost(3);
      if (!canBuyTranslation(sp, 3) || !buy(cost)) return state;
      sp.translation3 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "translation4") {
      const cost = translationCost(4);
      if (!canBuyTranslation(sp, 4) || !buy(cost)) return state;
      sp.translation4 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "translation5") {
      const cost = translationCost(5);
      if (!canBuyTranslation(sp, 5) || !buy(cost)) return state;
      sp.translation5 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "translation6") {
      const cost = translationCost(6);
      if (!canBuyTranslation(sp, 6) || !buy(cost)) return state;
      sp.translation6 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "translation7") {
      const cost = translationCost(7);
      if (!canBuyTranslation(sp, 7) || !buy(cost)) return state;
      sp.translation7 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "translation8") {
      const cost = translationCost(8);
      if (!canBuyTranslation(sp, 8) || !buy(cost)) return state;
      sp.translation8 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed1") {
      const cost = speedCost(1);
      if (!canBuySpeed(sp, 1) || !buy(cost)) return state;
      sp.speed1 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed2") {
      const cost = speedCost(2);
      if (!canBuySpeed(sp, 2) || !buy(cost)) return state;
      sp.speed2 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed3") {
      const cost = speedCost(3);
      if (!canBuySpeed(sp, 3) || !buy(cost)) return state;
      sp.speed3 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed4") {
      const cost = speedCost(4);
      if (!canBuySpeed(sp, 4) || !buy(cost)) return state;
      sp.speed4 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed5") {
      const cost = speedCost(5);
      if (!canBuySpeed(sp, 5) || !buy(cost)) return state;
      sp.speed5 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed6") {
      const cost = speedCost(6);
      if (!canBuySpeed(sp, 6) || !buy(cost)) return state;
      sp.speed6 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed7") {
      const cost = speedCost(7);
      if (!canBuySpeed(sp, 7) || !buy(cost)) return state;
      sp.speed7 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "speed8") {
      const cost = speedCost(8);
      if (!canBuySpeed(sp, 8) || !buy(cost)) return state;
      sp.speed8 = true;
      dvst.skillPointsTree += 1;
      return state;
    }

    if (action.item === "doubleTime") {
      if (sp.doubleTimeOwned) return state;
      if (!buy(5)) return state;
      sp.doubleTimeOwned = true;
      sp.doubleTime = 600;
      return state;
    }

    if (action.item === "automateInfluence") {
      if (sd.workerAutoConvert) return state;
      if (!buy(10)) return state;
      sd.workerAutoConvert = true;
      return state;
    }

    return state;
  }

  if (action.type === "SIMULATION_BLACK_HOLE") {
    const sd1 = state.sdSimulation;
    const sp = state.sdPrestige;

    if (!sp.counterGw) return state;

    sp.disasterStage = 0;
    simulationPrestige(state, Math.trunc(sd1.swarmPanels));
    return state;
  }

  if (action.type === "SET_DOUBLE_TIME_RATE") {
    if (!Number.isFinite(action.rate)) return state;
    state.sdPrestige.doubleTimeRate = Math.max(0, Math.trunc(action.rate));
    return state;
  }

  return state;
}
