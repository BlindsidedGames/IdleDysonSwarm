import { describe, expect, it } from "vitest";

import { DysonverseBuildings } from "@ids/balance";

import { createDefaultGameState } from "../state/defaultState";
import { buyXCost } from "../math/buy";
import { reduceGameAction } from "./reducer";

describe("reducer: purchases", () => {
  it("BuyMax does not allow free purchases when nothing is affordable", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      settings: { ...initial.settings, buyMode: "BuyMax" as const },
      dysonVerseInfinityData: { ...initial.dysonVerseInfinityData, money: 0 },
    };

    const next = reduceGameAction(state, { type: "BUY_BUILDING", buildingId: "assemblyLines" });
    expect(next.dysonVerseInfinityData.assemblyLines[1]).toBe(0);
    expect(next.dysonVerseInfinityData.money).toBe(0);
  });

  it("Infinity starter pack offsets building costs by 10 levels", () => {
    const initial = createDefaultGameState();
    const building = DysonverseBuildings.find((b) => b.id === "assemblyLines");
    if (!building) throw new Error("missing building config");

    const cost = buyXCost(1, building.baseCost, building.exponent, 0);

    const state = {
      ...initial,
      dysonVersePrestigeData: { ...initial.dysonVersePrestigeData, infinityAssemblyLines: true },
      dysonVerseInfinityData: { ...initial.dysonVerseInfinityData, money: cost, assemblyLines: [0, 10] as [number, number] },
    };

    const next = reduceGameAction(state, { type: "BUY_BUILDING", buildingId: "assemblyLines" });
    expect(next.dysonVerseInfinityData.assemblyLines[1]).toBe(11);
    expect(next.dysonVerseInfinityData.money).toBe(0);
  });

  it("Assembly Mega Lines divides base cost by total planets", () => {
    const initial = createDefaultGameState();
    const building = DysonverseBuildings.find((b) => b.id === "assemblyLines");
    if (!building) throw new Error("missing building config");

    const totalPlanets = 5;
    const modifiedBaseCost = building.baseCost / totalPlanets;
    const cost = buyXCost(1, modifiedBaseCost, building.exponent, 0);

    const state = {
      ...initial,
      dysonVerseSkillTreeData: { ...initial.dysonVerseSkillTreeData, assemblyMegaLines: true },
      dysonVerseInfinityData: { ...initial.dysonVerseInfinityData, money: cost, planets: [0, totalPlanets] as [number, number] },
    };

    const next = reduceGameAction(state, { type: "BUY_BUILDING", buildingId: "assemblyLines" });
    expect(next.dysonVerseInfinityData.assemblyLines[1]).toBe(1);
    expect(next.dysonVerseInfinityData.money).toBe(0);
  });

  it("Skill tree purchases spend skill points and update auto-assign list", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      dysonVerseSkillTreeData: { ...initial.dysonVerseSkillTreeData, skillPointsTree: 2 },
    };

    const afterBuy11 = reduceGameAction(state, { type: "SKILL_TREE_TOGGLE", skillId: 11 });
    expect(afterBuy11.dysonVerseSkillTreeData.banking).toBe(true);
    expect(afterBuy11.dysonVerseSkillTreeData.skillPointsTree).toBe(1);
    expect(afterBuy11.dysonVerseSaveData.skillAutoAssignmentList).toContain(11);

    const afterBuy12 = reduceGameAction(afterBuy11, { type: "SKILL_TREE_TOGGLE", skillId: 12 });
    expect(afterBuy12.dysonVerseSkillTreeData.investmentPortfolio).toBe(true);
    expect(afterBuy12.dysonVerseSkillTreeData.skillPointsTree).toBe(0);
    expect(afterBuy12.dysonVerseSaveData.skillAutoAssignmentList).toContain(11);
    expect(afterBuy12.dysonVerseSaveData.skillAutoAssignmentList).not.toContain(12);
  });

  it("Skill tree cannot refund a required skill", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      dysonVerseSkillTreeData: { ...initial.dysonVerseSkillTreeData, skillPointsTree: 2 },
    };

    const afterBuy1 = reduceGameAction(state, { type: "SKILL_TREE_TOGGLE", skillId: 1 });
    const afterBuy2 = reduceGameAction(afterBuy1, { type: "SKILL_TREE_TOGGLE", skillId: 2 });
    expect(afterBuy2.dysonVerseSkillTreeData.startHereTree).toBe(true);
    expect(afterBuy2.dysonVerseSkillTreeData.assemblyLineTree).toBe(true);

    const afterAttemptRefund1 = reduceGameAction(afterBuy2, { type: "SKILL_TREE_TOGGLE", skillId: 1 });
    expect(afterAttemptRefund1.dysonVerseSkillTreeData.startHereTree).toBe(true);
  });

  it("Skill tree reset honors unrefundable-with blockers", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      dysonVerseSkillTreeData: { ...initial.dysonVerseSkillTreeData, startHereTree: true, shouldersOfGiants: true },
      dysonVerseSaveData: { ...initial.dysonVerseSaveData, skillAutoAssignmentList: [1, 2, 3] },
    };

    const next = reduceGameAction(state, { type: "SKILL_TREE_RESET" });
    expect(next.dysonVerseSkillTreeData.startHereTree).toBe(true);
    expect(next.dysonVerseSaveData.skillAutoAssignmentList).toEqual([]);
  });

  it("Infinity shop purchases spend IP and apply gates", () => {
    const initial = createDefaultGameState();
    const withPoints = {
      ...initial,
      dysonVersePrestigeData: { ...initial.dysonVersePrestigeData, infinityPoints: 5, spentInfinityPoints: 0 },
    };

    const afterSecret = reduceGameAction(withPoints, { type: "INFINITY_BUY", item: "secret" });
    expect(afterSecret.dysonVersePrestigeData.secretsOfTheUniverse).toBe(1);
    expect(afterSecret.dysonVersePrestigeData.spentInfinityPoints).toBe(1);

    const blockedAi = reduceGameAction(withPoints, { type: "INFINITY_BUY", item: "starterAiManagers" });
    expect(blockedAi.dysonVersePrestigeData.infinityAiManagers).toBe(false);

    const afterAssembly = reduceGameAction(withPoints, { type: "INFINITY_BUY", item: "starterAssemblyLines" });
    const afterAi = reduceGameAction(afterAssembly, { type: "INFINITY_BUY", item: "starterAiManagers" });
    expect(afterAi.dysonVersePrestigeData.infinityAiManagers).toBe(true);
  });

  it("PrestigePlus influence purchase adds +4 generation speed per point", () => {
    const initial = createDefaultGameState();
    const withPoints = { ...initial, prestigePlus: { ...initial.prestigePlus, points: 1, spentPoints: 0 } };

    const next = reduceGameAction(withPoints, { type: "PRESTIGE_PLUS_BUY", item: "influence" });
    expect(next.prestigePlus.influence).toBe(4);
    expect(next.prestigePlus.spentPoints).toBe(1);
  });

  it("Dyson prestige resets run state and grants Infinity Points", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      dysonVerseInfinityData: { ...initial.dysonVerseInfinityData, bots: 123, money: 456, science: 789 },
    };

    const next = reduceGameAction(state, { type: "DYSON_PRESTIGE" });
    expect(next.meta.firstInfinityDone).toBe(true);
    expect(next.dysonVersePrestigeData.infinityPoints).toBe(1);
    expect(next.dysonVerseInfinityData.money).toBe(0);
    expect(next.dysonVerseInfinityData.science).toBe(0);
    expect(next.dysonVerseInfinityData.bots).toBe(1);
  });

  it("Reality: SendWorkers converts 128 workers into 128 influence", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      saveData: { ...initial.saveData, workersReadyToGo: 128, influence: 0 },
    };

    const next = reduceGameAction(state, { type: "REALITY_SEND_WORKERS" });
    expect(next.saveData.workersReadyToGo).toBe(0);
    expect(next.saveData.influence).toBe(128);
  });

  it("Dream1: Factories boost blocks exact-cost purchase (Unity bug)", () => {
    const initial = createDefaultGameState();
    const cost = initial.sdSimulation.factoriesBoostCost;
    const duration = initial.sdSimulation.factoriesBoostDuration;

    const exact = {
      ...initial,
      saveData: { ...initial.saveData, influence: cost },
    };

    const blocked = reduceGameAction(exact, { type: "DREAM1_BUY", item: "factoriesBoost" });
    expect(blocked.sdSimulation.factoriesBoostTime).toBe(0);
    expect(blocked.saveData.influence).toBe(cost);

    const above = {
      ...initial,
      saveData: { ...initial.saveData, influence: cost + 1 },
    };

    const purchased = reduceGameAction(above, { type: "DREAM1_BUY", item: "factoriesBoost" });
    expect(purchased.sdSimulation.factoriesBoostTime).toBe(duration);
    expect(purchased.saveData.influence).toBe(1);
  });

  it("Manual bot creation starts, completes, and reduces manualCreationTime", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      dysonVerseSaveData: { ...initial.dysonVerseSaveData, manualCreationTime: 10 },
      dysonVerseInfinityData: { ...initial.dysonVerseInfinityData, bots: 0 },
    };

    const started = reduceGameAction(state, { type: "MANUAL_BOT_CREATION_START" });
    expect(started.runtime.manualBotCreation.running).toBe(true);
    expect(started.runtime.manualBotCreation.time).toBeCloseTo(0.1);

    const almost = reduceGameAction(started, { type: "TICK", dt: 9.8 });
    expect(almost.runtime.manualBotCreation.running).toBe(true);
    expect(almost.dysonVerseInfinityData.bots).toBe(0);

    const done = reduceGameAction(almost, { type: "TICK", dt: 0.2 });
    expect(done.runtime.manualBotCreation.running).toBe(false);
    expect(done.dysonVerseInfinityData.bots).toBe(1);
    expect(done.dysonVerseSaveData.manualCreationTime).toBe(9);
  });

  it("Manual Labour converts manual bot creation into assembly line production", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      dysonVerseSaveData: { ...initial.dysonVerseSaveData, manualCreationTime: 0.1 },
      dysonVerseInfinityData: {
        ...initial.dysonVerseInfinityData,
        bots: 0,
        assemblyLines: [50, 0] as [number, number],
        managers: [0.6, 0] as [number, number],
      },
      dysonVerseSkillTreeData: {
        ...initial.dysonVerseSkillTreeData,
        manualLabour: true,
        versatileProductionTactics: true,
      },
    };

    const started = reduceGameAction(state, { type: "MANUAL_BOT_CREATION_START" });
    const done = reduceGameAction(started, { type: "TICK", dt: 1e-9 });

    expect(done.runtime.manualBotCreation.running).toBe(false);
    expect(done.dysonVerseSaveData.manualCreationTime).toBeCloseTo(0.2);
    expect(done.dysonVerseInfinityData.bots).toBeCloseTo(1, 6);
    expect(done.dysonVerseInfinityData.assemblyLines[0]).toBeCloseTo(50.3, 6);
  });

  it("Strange Matter: Translation purchases are sequential and grant +1 skill point", () => {
    const initial = createDefaultGameState();

    const blocked = reduceGameAction(
      { ...initial, sdPrestige: { ...initial.sdPrestige, strangeMatter: 16 } },
      { type: "STRANGE_MATTER_BUY", item: "translation2" },
    );
    expect(blocked.sdPrestige.translation2).toBe(false);

    const start = {
      ...initial,
      dysonVerseSkillTreeData: { ...initial.dysonVerseSkillTreeData, skillPointsTree: 0 },
      sdPrestige: { ...initial.sdPrestige, strangeMatter: 8 },
    };

    const afterT1 = reduceGameAction(start, { type: "STRANGE_MATTER_BUY", item: "translation1" });
    expect(afterT1.sdPrestige.translation1).toBe(true);
    expect(afterT1.sdPrestige.strangeMatter).toBe(0);
    expect(afterT1.dysonVerseSkillTreeData.skillPointsTree).toBe(1);

    const afterT2 = reduceGameAction(
      { ...afterT1, sdPrestige: { ...afterT1.sdPrestige, strangeMatter: 16 } },
      { type: "STRANGE_MATTER_BUY", item: "translation2" },
    );
    expect(afterT2.sdPrestige.translation2).toBe(true);
    expect(afterT2.sdPrestige.strangeMatter).toBe(0);
    expect(afterT2.dysonVerseSkillTreeData.skillPointsTree).toBe(2);
  });

  it("Simulation: Black hole prestige requires countering global warming", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      sdSimulation: { ...initial.sdSimulation, swarmPanels: 10 },
    };

    const blocked = reduceGameAction(state, { type: "SIMULATION_BLACK_HOLE" });
    expect(blocked.sdPrestige.simulationCount).toBe(0);
    expect(blocked.sdPrestige.strangeMatter).toBe(0);

    const unlocked = reduceGameAction(
      { ...state, sdPrestige: { ...state.sdPrestige, counterMeteor: true, counterAi: true, counterGw: true, disasterStage: 42 } },
      { type: "SIMULATION_BLACK_HOLE" },
    );
    expect(unlocked.sdPrestige.simulationCount).toBe(1);
    expect(unlocked.sdPrestige.strangeMatter).toBe(10);
    expect(unlocked.sdSimulation.swarmPanels).toBe(0);
    expect(unlocked.sdPrestige.disasterStage).toBe(42);
  });

  it("Offline time: Spend reduces bank and advances DysonVerse", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      dysonVerseInfinityData: { ...initial.dysonVerseInfinityData, bots: 1 },
      settings: { ...initial.settings, offlineTime: 60 },
    };

    const next = reduceGameAction(state, { type: "OFFLINE_SPEND", seconds: 60 });
    expect(next.settings.offlineTime).toBe(0);
    expect(next.dysonVerseInfinityData.money).toBeGreaterThan(0);
  });

  it("Offline time: Double max requires full bank", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      settings: { ...initial.settings, offlineTime: 86400, maxOfflineTime: 86400 },
    };

    const next = reduceGameAction(state, { type: "OFFLINE_DOUBLE_MAX" });
    expect(next.settings.offlineTime).toBe(0);
    expect(next.settings.maxOfflineTime).toBe(172800);
  });

  it("Avocato meditation grants +4 skill points once and becomes artifact points", () => {
    const initial = createDefaultGameState();
    const state = {
      ...initial,
      prestigePlus: { ...initial.prestigePlus, avocatoPurchased: true },
      dysonVerseSkillTreeData: { ...initial.dysonVerseSkillTreeData, skillPointsTree: 0 },
      settings: { ...initial.settings, avotation: false },
    };

    const afterMeditate = reduceGameAction(state, { type: "AVOCATO_MEDITATE" });
    expect(afterMeditate.settings.avotation).toBe(true);
    expect(afterMeditate.dysonVerseSkillTreeData.skillPointsTree).toBe(4);

    const afterAgain = reduceGameAction(afterMeditate, { type: "AVOCATO_MEDITATE" });
    expect(afterAgain.dysonVerseSkillTreeData.skillPointsTree).toBe(4);

    const afterPrestige = reduceGameAction(afterMeditate, { type: "DYSON_PRESTIGE" });
    expect(afterPrestige.dysonVerseSkillTreeData.skillPointsTree).toBe(4);
  });
});
