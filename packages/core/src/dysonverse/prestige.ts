import { DysonverseProgression, DysonverseSkillTree } from "@ids/balance";

import { maxAffordable } from "../math/buy";
import { createDefaultDysonVerseInfinityData, createDefaultDysonVersePrestigeData } from "../state/defaultState";
import type { GameState } from "../state/types";
import { calculateDysonVerseModifiers, setBotDistribution } from "./dysonverse";

const BASE_BOTS_REQUIRED = 4.2e19;

export function infinityBotsRequired(state: GameState): number {
  const divisions = state.prestigePlus.divisionsPurchased;
  return divisions > 0 ? BASE_BOTS_REQUIRED / Math.pow(10, divisions) : BASE_BOTS_REQUIRED;
}

export function rawInfinityPointsToGain(state: GameState): number {
  return maxAffordable(
    state.dysonVerseInfinityData.bots,
    infinityBotsRequired(state),
    DysonverseProgression.infinityExponent,
    0,
  );
}

function getSkillFlag(dvst: GameState["dysonVerseSkillTreeData"], key: string): boolean {
  return Boolean((dvst as unknown as Record<string, unknown>)[key]);
}

function setSkillFlag(dvst: GameState["dysonVerseSkillTreeData"], key: string, value: boolean) {
  (dvst as unknown as Record<string, unknown>)[key] = value;
}

function clearAllOwnedSkillFlags(state: GameState) {
  const dvst = state.dysonVerseSkillTreeData;
  for (const skill of DysonverseSkillTree) {
    setSkillFlag(dvst, skill.key, false);
  }
}

export function autoAssignSkills(state: GameState) {
  const dvst = state.dysonVerseSkillTreeData;
  const list = state.dysonVerseSaveData.skillAutoAssignmentList;
  if (list.length < 1) return;

  let didBuy = true;
  while (didBuy) {
    didBuy = false;

    for (const skillId of list) {
      const skill = DysonverseSkillTree.find((s) => s.id === skillId);
      if (!skill) continue;

      if (dvst.skillPointsTree < skill.cost) continue;
      if (getSkillFlag(dvst, skill.key)) continue;

      let available = true;
      for (const req of skill.requirements ?? []) {
        const reqSkill = DysonverseSkillTree.find((s) => s.id === req);
        if (!reqSkill || !getSkillFlag(dvst, reqSkill.key)) available = false;
      }
      for (const req of skill.shadowRequirements ?? []) {
        const reqSkill = DysonverseSkillTree.find((s) => s.id === req);
        if (!reqSkill || !getSkillFlag(dvst, reqSkill.key)) available = false;
      }
      for (const exclusive of skill.exclusiveWith ?? []) {
        const exclusiveSkill = DysonverseSkillTree.find((s) => s.id === exclusive);
        if (exclusiveSkill && getSkillFlag(dvst, exclusiveSkill.key)) available = false;
      }

      if (!available) continue;

      dvst.skillPointsTree -= skill.cost;
      setSkillFlag(dvst, skill.key, true);
      if (skill.isFragment) dvst.fragments += 1;
      didBuy = true;
      break;
    }
  }
}

function artifactSkillPoints(state: GameState): number {
  const sp = state.sdPrestige;
  let points = 0;
  if (sp.translation1) points += 1;
  if (sp.translation2) points += 1;
  if (sp.translation3) points += 1;
  if (sp.translation4) points += 1;
  if (sp.translation5) points += 1;
  if (sp.translation6) points += 1;
  if (sp.translation7) points += 1;
  if (sp.translation8) points += 1;

  if (sp.speed1) points += 1;
  if (sp.speed2) points += 1;
  if (sp.speed3) points += 1;
  if (sp.speed4) points += 1;
  if (sp.speed5) points += 1;
  if (sp.speed6) points += 1;
  if (sp.speed7) points += 1;
  if (sp.speed8) points += 1;

  if (state.settings.avotation) points += 4;

  return points;
}

export function dysonInfinity(state: GameState) {
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;

  state.meta.firstInfinityDone = true;
  dvpd.androidsSkillTimer = 0;
  dvpd.pocketAndroidsTimer = 0;

  let bankedSkills = 0;
  if (dvst.banking) bankedSkills += 1;
  if (dvst.investmentPortfolio) bankedSkills += 1;

  clearAllOwnedSkillFlags(state);
  state.dysonVerseInfinityData = createDefaultDysonVerseInfinityData();

  const ipToGain = (state.prestigePlus.doubleIP ? 2 : 1) * (state.debug.doubleIp ? 2 : 1);
  state.meta.lastInfinityPointsGained = ipToGain;
  dvpd.infinityPoints += ipToGain;

  const dvid = state.dysonVerseInfinityData;
  dvid.bots = dvpd.infinityAssemblyLines ? 10 : 1;
  dvid.assemblyLines[1] = dvpd.infinityAssemblyLines ? 10 : 0;
  dvid.managers[1] = dvpd.infinityAiManagers ? 10 : 0;
  dvid.servers[1] = dvpd.infinityServers ? 10 : 0;
  dvid.dataCenters[1] = dvpd.infinityDataCenter ? 10 : 0;
  dvid.planets[1] = dvpd.infinityPlanets ? 10 : 0;

  dvst.skillPointsTree = dvpd.permanentSkillPoint + bankedSkills + artifactSkillPoints(state);
  dvst.fragments = 0;
  dvst.superRadiantScatteringTimer = 0;

  autoAssignSkills(state);
  setBotDistribution(state);
  calculateDysonVerseModifiers(state);

  state.meta.infinityInProgress = false;
}

export function manualDysonInfinity(state: GameState) {
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;

  state.meta.firstInfinityDone = true;
  dvpd.androidsSkillTimer = 0;
  dvpd.pocketAndroidsTimer = 0;

  let bankedSkills = 0;
  if (dvst.banking) bankedSkills += 1;
  if (dvst.investmentPortfolio) bankedSkills += 1;

  clearAllOwnedSkillFlags(state);

  let ipToGain = rawInfinityPointsToGain(state);
  ipToGain *= state.debug.doubleIp ? 2 : 1;
  const gained = state.prestigePlus.doubleIP ? ipToGain * 2 : ipToGain;

  state.meta.lastInfinityPointsGained = gained;
  dvpd.infinityPoints += gained;

  state.dysonVerseInfinityData = createDefaultDysonVerseInfinityData();

  const dvid = state.dysonVerseInfinityData;
  dvid.bots = dvpd.infinityAssemblyLines ? 10 : 1;
  dvid.assemblyLines[1] = dvpd.infinityAssemblyLines ? 10 : 0;
  dvid.managers[1] = dvpd.infinityAiManagers ? 10 : 0;
  dvid.servers[1] = dvpd.infinityServers ? 10 : 0;
  dvid.dataCenters[1] = dvpd.infinityDataCenter ? 10 : 0;
  dvid.planets[1] = dvpd.infinityPlanets ? 10 : 0;

  dvst.skillPointsTree = dvpd.permanentSkillPoint + bankedSkills + artifactSkillPoints(state);
  dvst.fragments = 0;
  dvst.superRadiantScatteringTimer = 0;

  autoAssignSkills(state);
  setBotDistribution(state);
  calculateDysonVerseModifiers(state);

  state.meta.infinityInProgress = false;
}

export function prestigeDysonVerse(state: GameState) {
  const seconds = state.timeSeconds - state.meta.lastPrestigeAtTimeSeconds;
  state.meta.timeLastInfinitySeconds = seconds > 0 ? seconds : 10000;
  state.meta.lastPrestigeAtTimeSeconds = state.timeSeconds;

  if (state.prestigePlus.breakTheLoop) manualDysonInfinity(state);
  else dysonInfinity(state);
}

export function enactPrestigePlus(state: GameState) {
  const dvpd = state.dysonVersePrestigeData;
  const dvst = state.dysonVerseSkillTreeData;
  const pp = state.prestigePlus;

  if (dvpd.infinityPoints < 42) return;
  state.meta.firstInfinityDone = true;

  if (pp.quantumEntanglement) {
    const convertable = Math.floor((dvpd.infinityPoints - dvpd.spentInfinityPoints) / 42);
    if (convertable <= 0) return;
    pp.points += convertable;
    dvpd.infinityPoints -= convertable * 42;
    return;
  }

  clearAllOwnedSkillFlags(state);

  state.dysonVersePrestigeData = createDefaultDysonVersePrestigeData();
  state.dysonVerseInfinityData = createDefaultDysonVerseInfinityData();
  state.dysonVersePrestigeData = createDefaultDysonVersePrestigeData();
  state.dysonVerseInfinityData = createDefaultDysonVerseInfinityData();

  pp.points += 1;

  state.dysonVersePrestigeData.secretsOfTheUniverse = pp.secrets > 1 ? pp.secrets : 0;
  state.dysonVersePrestigeData.infinityAutoBots = pp.automation;
  state.dysonVersePrestigeData.infinityAutoResearch = pp.automation;

  state.meta.lastInfinityPointsGained = 0;
  state.meta.timeLastInfinitySeconds = 0;
  state.meta.lastPrestigeAtTimeSeconds = state.timeSeconds;

  state.dysonVersePrestigeData.androidsSkillTimer = 0;
  state.dysonVersePrestigeData.pocketAndroidsTimer = 0;
  dvst.fragments = 0;
  dvst.skillPointsTree = artifactSkillPoints(state);
  dvst.superRadiantScatteringTimer = 0;

  autoAssignSkills(state);
  setBotDistribution(state);
  calculateDysonVerseModifiers(state);
}
