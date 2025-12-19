import { DysonverseBuildings, DysonversePanelLifetime, DysonverseResearch } from "@ids/balance";
import type { BuyMode, GameAction, GameState } from "@ids/core";
import { buyXCost, formatNumber, maxAffordable } from "@ids/core";

export interface DysonVersePanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  section: "buildings" | "research" | "panelLifetime";
  onSectionChange: (next: "buildings" | "research" | "panelLifetime") => void;
}

function numberToBuy(mode: BuyMode, roundedBulkBuy: boolean, owned: number, affordable: number): number {
  const ownedInt = Math.trunc(owned);
  if (mode === "Buy1") return 1;
  if (mode === "Buy10") return roundedBulkBuy ? 10 - (ownedInt % 10) : 10;
  if (mode === "Buy50") return roundedBulkBuy ? 50 - (ownedInt % 50) : 50;
  if (mode === "Buy100") return roundedBulkBuy ? 100 - (ownedInt % 100) : 100;
  return affordable > 0 ? affordable : 1;
}

type BuildingId = "assemblyLines" | "managers" | "servers" | "dataCenters" | "planets";
type ResearchId = "science" | "cash" | "assemblyLine" | "aiManager" | "server" | "dataCenter" | "planet";

const BUILDING_DESCRIPTIONS: Record<BuildingId, string> = {
  assemblyLines: "Build assembly lines that create bots for you, that way you don't have to work so hard!",
  managers: "Purchase AI Managers which automatically handle Assembly Line Creation!",
  servers: "Acquire more server space so you can run more Managers. Totally worth it!",
  dataCenters: "Expand your infrastructure with data centers to handle more servers.",
  planets: "Discover and settle on new Planets and cover them with Data Centers!",
};

const BUILDING_PURCHASE_TEXT: Record<BuildingId, string> = {
  assemblyLines: "Purchase an Assembly Line",
  managers: "Purchase an AI Manager",
  servers: "Purchase a Server",
  dataCenters: "Purchase a Data Center",
  planets: "Purchase a Planet",
};

function buildingProductionValue(state: GameState, buildingId: BuildingId): number {
  const dvid = state.dysonVerseInfinityData;
  if (buildingId === "assemblyLines") return dvid.assemblyLineBotProduction;
  if (buildingId === "managers") return dvid.managerAssemblyLineProduction;
  if (buildingId === "servers") return dvid.serverManagerProduction;
  if (buildingId === "dataCenters") return dvid.dataCenterServerProduction;
  return dvid.planetsDataCenterProduction;
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

function buildingTerraBonus(state: GameState, buildingId: BuildingId): { enabled: boolean; bonus: number } {
  const dvst = state.dysonVerseSkillTreeData;
  const dvid = state.dysonVerseInfinityData;
  const baseBonus = dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1];

  if (buildingId === "assemblyLines" && dvst.terraNullius) return { enabled: true, bonus: baseBonus };
  if (buildingId === "managers" && dvst.terraInfirma) return { enabled: true, bonus: baseBonus };
  if (buildingId === "servers" && dvst.terraEculeo) return { enabled: true, bonus: baseBonus };
  if (buildingId === "dataCenters" && dvst.terraFirma) return { enabled: true, bonus: baseBonus };
  return { enabled: false, bonus: 0 };
}

function buildingOwnedDisplay(
  state: GameState,
  buildingId: BuildingId,
): { total: number; manual: number; terraEnabled: boolean; terraBonus: number } {
  const dvid = state.dysonVerseInfinityData;
  const dvst = state.dysonVerseSkillTreeData;

  const autoOwned = dvid[buildingId][0];
  const manualOwned = dvid[buildingId][1];

  if (buildingId === "planets") {
    const manualScaled = dvst.terraIrradiant ? manualOwned * 12 : manualOwned;
    return { total: autoOwned + manualScaled, manual: manualScaled, terraEnabled: false, terraBonus: 0 };
  }

  const terra = buildingTerraBonus(state, buildingId);
  return { total: autoOwned + manualOwned, manual: manualOwned, terraEnabled: terra.enabled, terraBonus: terra.bonus };
}

function renderProductionText(
  format: (value: number) => string,
  production: number,
  wordUsed: string,
  productionWordUsed: string,
  purchaseText: string,
) {
  if (!Number.isFinite(production) || production <= 0) {
    return <span className="botsCardProductionMuted">{purchaseText}</span>;
  }

  if (production >= 1) {
    return (
      <>
        <span className="botsCardProductionVerb">{wordUsed}</span>{" "}
        <span className="botsCardProductionValue">{format(production)}</span>{" "}
        <span className="botsCardProductionUnit">{productionWordUsed}s /s</span>
      </>
    );
  }

  const seconds = 1 / production;
  const inSeconds = seconds < 60;
  const display = inSeconds ? seconds : seconds / 60;
  const unit = inSeconds ? "s" : " Min";

  return (
    <>
      <span className="botsCardProductionVerb">{wordUsed}</span>{" "}
      <span className="botsCardProductionValue">1</span>{" "}
      <span className="botsCardProductionUnit">{productionWordUsed} / </span>
      <span className="botsCardProductionValue">{format(display)}</span>
      <span className="botsCardProductionUnit">{unit}</span>
    </>
  );
}

function buildingCurrentLevel(state: GameState, buildingId: BuildingId): number {
  const dvpd = state.dysonVersePrestigeData;
  const manualOwned = Math.trunc(state.dysonVerseInfinityData[buildingId][1]);

  if (buildingId === "assemblyLines" && dvpd.infinityAssemblyLines) return manualOwned - 10;
  if (buildingId === "managers" && dvpd.infinityAiManagers) return manualOwned - 10;
  if (buildingId === "servers" && dvpd.infinityServers) return manualOwned - 10;
  if (buildingId === "dataCenters" && dvpd.infinityDataCenter) return manualOwned - 10;
  if (buildingId === "planets" && dvpd.infinityPlanets) return manualOwned - 10;
  return manualOwned;
}

function buildingModifiedBaseCost(state: GameState, buildingId: BuildingId, baseCost: number): number {
  if (buildingId !== "assemblyLines") return baseCost;
  if (!state.dysonVerseSkillTreeData.assemblyMegaLines) return baseCost;

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

export function DysonVersePanel(props: DysonVersePanelProps) {
  const { state, dispatch, section, onSectionChange } = props;
  const fmt = state.settings.numberFormatting;
  const f = (x: number) => formatNumber(x, fmt);

  const money = state.dysonVerseInfinityData.money;
  const science = state.dysonVerseInfinityData.science;
  const manual = state.runtime.manualBotCreation;
  const manualCreationTime = state.dysonVerseSaveData.manualCreationTime;

  return (
    <div>
      <div className="segRow" role="group" aria-label="DysonVerse section">
        <button type="button" className={section === "buildings" ? "seg active" : "seg"} onClick={() => onSectionChange("buildings")}>
          Buildings
        </button>
        <button type="button" className={section === "research" ? "seg active" : "seg"} onClick={() => onSectionChange("research")}>
          Research
        </button>
        <button type="button" className={section === "panelLifetime" ? "seg active" : "seg"} onClick={() => onSectionChange("panelLifetime")}>
          Panel Lifetime
        </button>
      </div>

      {section === "buildings" ? (
        <div className="botsPanel">
          <div className="tinkerCard">
            <div className="tinkerTitle">Tinker in your garage</div>
            <div className="tinkerDescription">
              {state.dysonVerseSkillTreeData.manualLabour ? (
                (() => {
                  const dvid = state.dysonVerseInfinityData;
                  const dvst = state.dysonVerseSkillTreeData;
                  const manualLabourAmount = (dvid.assemblyLines[0] + dvid.assemblyLines[1]) / 50;
                  const managerProduction = dvid.managerAssemblyLineProduction * 20;
                  let assemblyProduction = Math.min(manualLabourAmount, managerProduction);
                  if (dvst.versatileProductionTactics) assemblyProduction *= 1.5;

                  return (
                    <>
                      Having nothing better to do you decide to set up some more assembly lines. Masterfully made you will produce{" "}
                      <span className="tinkerHighlight">{f(assemblyProduction)}</span>
                    </>
                  );
                })()
              ) : (
                <>
                  Manually put together a new bot from parts in your shed.
                  <br />
                  There has to be a better way of going about this...
                </>
              )}
            </div>

            <button
              type="button"
              className="tinkerBar"
              disabled={manual.running}
              onClick={() => dispatch({ type: "MANUAL_BOT_CREATION_START" })}
            >
              <div className="tinkerBarFill" style={{ width: `${manualCreationTime > 0 ? Math.min(1, manual.time / manualCreationTime) * 100 : 100}%` }} />
              <div className="tinkerBarLabel">{manual.running ? "" : "Tap Here!"}</div>
              <div className="tinkerBarCounter">
                {manual.running
                  ? `${Math.max(0, manualCreationTime - manual.time).toFixed(1)}s`
                  : manualCreationTime >= 1
                    ? `${Math.trunc(manualCreationTime)}s`
                    : `${manualCreationTime.toFixed(1)}s`}
              </div>
            </button>
          </div>

          <div className="botsGrid">
            {DysonverseBuildings.map((b) => {
              const pair = state.dysonVerseInfinityData[b.id];
              const manualOwned = pair[1];

              const currentLevel = buildingCurrentLevel(state, b.id as BuildingId);
              const baseCost = buildingModifiedBaseCost(state, b.id as BuildingId, b.baseCost);

              const affordable = maxAffordable(money, baseCost, b.exponent, currentLevel);
              const n = numberToBuy(state.settings.buyMode, state.settings.roundedBulkBuy, manualOwned, affordable);
              const cost = buyXCost(n, baseCost, b.exponent, currentLevel);

              const autoBuy = buildingAutoBuyEnabled(state, b.id as BuildingId);
              const canBuy = !autoBuy && cost <= money && n > 0;

              const ownedDisplay = buildingOwnedDisplay(state, b.id as BuildingId);
              const production = buildingProductionValue(state, b.id as BuildingId);
              const description = BUILDING_DESCRIPTIONS[b.id as BuildingId];
              const purchaseText = BUILDING_PURCHASE_TEXT[b.id as BuildingId];

              return (
                <div key={b.id} className="botsCard">
                  <div className="botsCardHeader">
                    <div className="botsCardTitleRow">
                      <span className="botsCardTitleText">{b.name}</span>
                      <span className="botsCardOwned">
                        {f(ownedDisplay.total)}
                        <span className="botsCardOwnedManual">
                          ({f(ownedDisplay.manual)}
                          {ownedDisplay.terraEnabled ? (
                            <span className="botsCardOwnedBonus">+{f(ownedDisplay.terraBonus)}</span>
                          ) : null}
                          )
                        </span>
                      </span>
                    </div>
                    <div className="botsCardProductionRow">
                      {renderProductionText(f, production, b.wordUsed, b.productionWordUsed, purchaseText)}
                    </div>
                  </div>

                  <div className="botsCardFooter">
                    <div className="botsCardDescription">{description}</div>
                    <button
                      type="button"
                      className="botsCardButton"
                      disabled={!canBuy}
                      onClick={() => dispatch({ type: "BUY_BUILDING", buildingId: b.id })}
                    >
                      <div className="botsCardButtonAmount">{autoBuy ? "Auto" : `+${n}`}</div>
                      <div className="botsCardButtonCost">${f(cost)}</div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {section === "research" ? (
        <div className="list">
          {DysonverseResearch.map((u) => {
            const currentLevel = researchCurrentLevel(state, u.id as ResearchId);
            const affordable = maxAffordable(science, u.baseCost, u.exponent, currentLevel);
            const n = numberToBuy(state.settings.researchBuyMode, state.settings.researchRoundedBulkBuy, currentLevel, affordable);
            const cost = buyXCost(n, u.baseCost, u.exponent, currentLevel);

            const dvst = state.dysonVerseSkillTreeData;
            const blocked =
              (u.id === "science" && dvst.shouldersOfGiants) ||
              (u.id === "cash" && (dvst.shouldersOfTheEnlightened || dvst.shouldersOfPrecursors));

            const canBuy = !blocked && cost <= science && n > 0;

            return (
              <div key={u.id} className="listRow">
                <div className="listMain">
                  <div className="listTitle">
                    {u.name}{" "}
                    <span style={{ color: "#c8b7d6", fontWeight: 400 }}>
                      Lv {f(currentLevel)} → {f(currentLevel + n)}
                    </span>
                  </div>
                  <div className="listMeta">{blocked ? "Locked by Shoulders skills" : `Buy x${n}`}</div>
                </div>
                <div className="listActions">
                  <div className="cost">{f(cost)} Sci</div>
                  <button type="button" disabled={!canBuy} onClick={() => dispatch({ type: "BUY_RESEARCH", researchId: u.id as ResearchId })}>
                    Buy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {section === "panelLifetime" ? (
        <div className="list">
          {DysonversePanelLifetime.map((u) => {
            const dvid = state.dysonVerseInfinityData;
            const owned =
              (u.id === 1 && dvid.panelLifetime1) ||
              (u.id === 2 && dvid.panelLifetime2) ||
              (u.id === 3 && dvid.panelLifetime3) ||
              (u.id === 4 && dvid.panelLifetime4);

            const canBuy = !owned && science >= u.cost;

            return (
              <div key={u.id} className="listRow">
                <div className="listMain">
                  <div className="listTitle">
                    Panel Lifetime +{u.baseLifetimeSecondsDelta}s{" "}
                    {owned ? <span style={{ color: "#c8b7d6", fontWeight: 400 }}>(Owned)</span> : null}
                  </div>
                  <div className="listMeta">Adds +{u.baseLifetimeSecondsDelta}s to each panel's lifetime.</div>
                </div>
                <div className="listActions">
                  <div className="cost">{f(u.cost)} Sci</div>
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => dispatch({ type: "BUY_PANEL_LIFETIME", upgradeId: u.id as 1 | 2 | 3 | 4 })}
                  >
                    Buy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
