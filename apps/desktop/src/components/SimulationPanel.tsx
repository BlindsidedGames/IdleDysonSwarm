import { RealityCosts } from "@ids/balance";
import type { GameAction, GameState } from "@ids/core";
import { formatNumber, formatTime } from "@ids/core";

export interface SimulationPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  section: "dream1" | "upgrades";
  onSectionChange: (next: "dream1" | "upgrades") => void;
}

type Dream1Item = Extract<GameAction, { type: "DREAM1_BUY" }>["item"];
type StrangeMatterItem = Extract<GameAction, { type: "STRANGE_MATTER_BUY" }>["item"];

function nextTier(owned: boolean[]): number | null {
  const idx = owned.findIndex((v) => !v);
  if (idx === -1) return null;
  return idx + 1;
}

export function SimulationPanel(props: SimulationPanelProps) {
  const { state, dispatch, section, onSectionChange } = props;
  const fmt = state.settings.numberFormatting;
  const f = (x: number) => formatNumber(x, fmt);

  const sd = state.saveData;
  const sd1 = state.sdSimulation;
  const sp = state.sdPrestige;

  function dream1BuyRow(entry: {
    id: Dream1Item;
    name: string;
    cost: number;
    canBuy: boolean;
    meta: string;
  }) {
    return (
      <div key={entry.id} className="listRow">
        <div className="listMain">
          <div className="listTitle">{entry.name}</div>
          <div className="listMeta">{entry.meta}</div>
        </div>
        <div className="listActions">
          <div className="cost">{f(entry.cost)} Inf</div>
          <button type="button" disabled={!entry.canBuy} onClick={() => dispatch({ type: "DREAM1_BUY", item: entry.id })}>
            Buy
          </button>
        </div>
      </div>
    );
  }

  function upgradeRow(entry: {
    id: StrangeMatterItem;
    name: string;
    cost: number;
    owned: boolean;
    meetsReq: boolean;
    meta: string;
  }) {
    const disabled = entry.owned || !entry.meetsReq || sp.strangeMatter < entry.cost;
    return (
      <div key={entry.id} className="listRow">
        <div className="listMain">
          <div className="listTitle">
            {entry.name} {entry.owned ? <span style={{ color: "#c8b7d6", fontWeight: 400 }}>(Owned)</span> : null}
          </div>
          <div className="listMeta">{entry.meta}</div>
        </div>
        <div className="listActions">
          <div className="cost">{f(entry.cost)} SM</div>
          <button type="button" disabled={disabled} onClick={() => dispatch({ type: "STRANGE_MATTER_BUY", item: entry.id })}>
            Buy
          </button>
        </div>
      </div>
    );
  }

  const translationOwned = [
    sp.translation1,
    sp.translation2,
    sp.translation3,
    sp.translation4,
    sp.translation5,
    sp.translation6,
    sp.translation7,
    sp.translation8,
  ];
  const speedOwned = [sp.speed1, sp.speed2, sp.speed3, sp.speed4, sp.speed5, sp.speed6, sp.speed7, sp.speed8];
  const nextTranslationTier = nextTier(translationOwned);
  const nextSpeedTier = nextTier(speedOwned);

  const nextTranslationCost = nextTranslationTier ? RealityCosts.translation[nextTranslationTier - 1] ?? Number.POSITIVE_INFINITY : null;
  const nextSpeedCost = nextSpeedTier ? RealityCosts.speed[nextSpeedTier - 1] ?? Number.POSITIVE_INFINITY : null;

  return (
    <div>
      <div className="segRow" role="group" aria-label="Simulation section">
        <button type="button" className={section === "dream1" ? "seg active" : "seg"} onClick={() => onSectionChange("dream1")}>
          Dream1
        </button>
        <button type="button" className={section === "upgrades" ? "seg active" : "seg"} onClick={() => onSectionChange("upgrades")}>
          Strange Matter Shop
        </button>
      </div>

      {section === "dream1" ? (
        <div className="list">
          <div className="placeholder">
            Influence: <strong style={{ color: "#f0e8f7" }}>{f(sd.influence)}</strong> · Strange Matter:{" "}
            <strong style={{ color: "#f0e8f7" }}>{f(sp.strangeMatter)}</strong>
            <br />
            Stage: <strong style={{ color: "#f0e8f7" }}>{sp.disasterStage}</strong> · Cities:{" "}
            <strong style={{ color: "#f0e8f7" }}>{f(sd1.cities)}</strong> · Bots:{" "}
            <strong style={{ color: "#f0e8f7" }}>{f(sd1.bots)}</strong> · Space Factories:{" "}
            <strong style={{ color: "#f0e8f7" }}>{f(sd1.spaceFactories)}</strong>
            <br />
            Swarm Panels: <strong style={{ color: "#f0e8f7" }}>{f(sd1.swarmPanels)}</strong> · Energy:{" "}
            <strong style={{ color: "#f0e8f7" }}>{f(sd1.energy)}</strong>
          </div>

          {dream1BuyRow({
            id: "hunters",
            name: "Hunters",
            cost: sd1.hunterCost,
            canBuy: sd.influence >= sd1.hunterCost,
            meta: `+${f(sd.huntersPerPurchase)} per purchase. Owned: ${f(sd1.hunters)}`,
          })}
          {dream1BuyRow({
            id: "gatherers",
            name: "Gatherers",
            cost: sd1.gathererCost,
            canBuy: sd.influence >= sd1.gathererCost,
            meta: `+${f(sd.gatherersPerPurchase)} per purchase. Owned: ${f(sd1.gatherers)}`,
          })}

          {dream1BuyRow({
            id: "communityBoost",
            name: "Community Boost",
            cost: Math.trunc(sd1.communityBoostCost),
            canBuy: sd.influence >= Math.trunc(sd1.communityBoostCost),
            meta: `Duration: ${formatTime(sd1.communityBoostDuration, { mspace: false })} · Remaining: ${formatTime(sd1.communityBoostTime, { mspace: false })}`,
          })}

          {dream1BuyRow({
            id: "engineering",
            name: "Engineering",
            cost: Math.trunc(sd1.engineeringCost),
            canBuy: !sd1.engineering && !sd1.engineeringComplete && sd.influence >= Math.trunc(sd1.engineeringCost),
            meta: sd1.engineeringComplete
              ? "Complete"
              : sd1.engineering
                ? `In progress: ${f(sd1.engineeringProgress)}/${f(sd1.engineeringResearchTime)}`
                : `Start research (time: ${formatTime(sd1.engineeringResearchTime, { mspace: false })})`,
          })}
          {dream1BuyRow({
            id: "shipping",
            name: "Shipping",
            cost: Math.trunc(sd1.shippingCost),
            canBuy: !sd1.shipping && !sd1.shippingComplete && sd.influence >= Math.trunc(sd1.shippingCost),
            meta: sd1.shippingComplete
              ? "Complete"
              : sd1.shipping
                ? `In progress: ${f(sd1.shippingProgress)}/${f(sd1.shippingResearchTime)}`
                : `Start research (time: ${formatTime(sd1.shippingResearchTime, { mspace: false })})`,
          })}
          {dream1BuyRow({
            id: "worldTrade",
            name: "World Trade",
            cost: Math.trunc(sd1.worldTradeCost),
            canBuy: !sd1.worldTrade && !sd1.worldTradeComplete && sd.influence >= Math.trunc(sd1.worldTradeCost),
            meta: sd1.worldTradeComplete
              ? "Complete"
              : sd1.worldTrade
                ? `In progress: ${f(sd1.worldTradeProgress)}/${f(sd1.worldTradeResearchTime)}`
                : `Start research (time: ${formatTime(sd1.worldTradeResearchTime, { mspace: false })})`,
          })}
          {dream1BuyRow({
            id: "worldPeace",
            name: "World Peace",
            cost: Math.trunc(sd1.worldPeaceCost),
            canBuy: !sd1.worldPeace && !sd1.worldPeaceComplete && sd.influence >= Math.trunc(sd1.worldPeaceCost),
            meta: sd1.worldPeaceComplete
              ? "Complete"
              : sd1.worldPeace
                ? `In progress: ${f(sd1.worldPeaceProgress)}/${f(sd1.worldPeaceResearchTime)}`
                : `Start research (time: ${formatTime(sd1.worldPeaceResearchTime, { mspace: false })})`,
          })}
          {dream1BuyRow({
            id: "mathematics",
            name: "Mathematics",
            cost: Math.trunc(sd1.mathematicsCost),
            canBuy: !sd1.mathematics && !sd1.mathematicsComplete && sd.influence >= Math.trunc(sd1.mathematicsCost),
            meta: sd1.mathematicsComplete
              ? "Complete"
              : sd1.mathematics
                ? `In progress: ${f(sd1.mathematicsProgress)}/${f(sd1.mathematicsResearchTime)}`
                : `Start research (time: ${formatTime(sd1.mathematicsResearchTime, { mspace: false })})`,
          })}
          {dream1BuyRow({
            id: "advancedPhysics",
            name: "Advanced Physics",
            cost: Math.trunc(sd1.advancedPhysicsCost),
            canBuy: !sd1.advancedPhysics && !sd1.advancedPhysicsComplete && sd.influence >= Math.trunc(sd1.advancedPhysicsCost),
            meta: sd1.advancedPhysicsComplete
              ? "Complete"
              : sd1.advancedPhysics
                ? `In progress: ${f(sd1.advancedPhysicsProgress)}/${f(sd1.advancedPhysicsResearchTime)}`
                : `Start research (time: ${formatTime(sd1.advancedPhysicsResearchTime, { mspace: false })})`,
          })}

          {(() => {
            const cost = Math.trunc(sd1.factoriesBoostCost);
            const canBuy = sd.influence > sd1.factoriesBoostCost;
            return dream1BuyRow({
              id: "factoriesBoost",
              name: "Factories Boost",
              cost,
              canBuy,
              meta: `Duration: ${formatTime(sd1.factoriesBoostDuration, { mspace: false })} · Remaining: ${formatTime(sd1.factoriesBoostTime, { mspace: false })}`,
            });
          })()}

          {dream1BuyRow({
            id: "solar",
            name: "Solar Panel",
            cost: sd1.solarCost,
            canBuy: sd.influence >= sd1.solarCost,
            meta: `+1 solar panel (owned: ${f(sd1.solarPanels)})`,
          })}
          {dream1BuyRow({
            id: "fusion",
            name: "Fusion Generator",
            cost: sd1.fusionCost,
            canBuy: sd.influence >= sd1.fusionCost,
            meta: `+1 fusion generator (owned: ${f(sd1.fusion)})`,
          })}
        </div>
      ) : null}

      {section === "upgrades" ? (
        <div className="list">
          <div className="placeholder">
            Strange Matter: <strong style={{ color: "#f0e8f7" }}>{f(sp.strangeMatter)}</strong> · Simulation Count:{" "}
            <strong style={{ color: "#f0e8f7" }}>{f(sp.simulationCount)}</strong>
            <br />
            Disaster stage: <strong style={{ color: "#f0e8f7" }}>{sp.disasterStage}</strong> · Counter: Meteor{" "}
            <strong style={{ color: "#f0e8f7" }}>{sp.counterMeteor ? "✓" : "—"}</strong> AI{" "}
            <strong style={{ color: "#f0e8f7" }}>{sp.counterAi ? "✓" : "—"}</strong> GW{" "}
            <strong style={{ color: "#f0e8f7" }}>{sp.counterGw ? "✓" : "—"}</strong>
          </div>

          {sp.counterGw ? (
            <div className="placeholder" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => dispatch({ type: "SIMULATION_BLACK_HOLE" })}>
                Black Hole (prestige for {f(Math.trunc(sd1.swarmPanels))} SM)
              </button>
            </div>
          ) : null}

          <div className="placeholder" style={{ fontWeight: 700, color: "#f0e8f7" }}>
            Countermeasures
          </div>
          {upgradeRow({
            id: "counterMeteor",
            name: "Counter Meteor",
            cost: 4,
            owned: sp.counterMeteor,
            meetsReq: true,
            meta: "Sets disaster stage to 2.",
          })}
          {upgradeRow({
            id: "counterAi",
            name: "Counter AI",
            cost: 42,
            owned: sp.counterAi,
            meetsReq: sp.counterMeteor,
            meta: "Requires Counter Meteor. Sets disaster stage to 3.",
          })}
          {upgradeRow({
            id: "counterGw",
            name: "Counter Global Warming",
            cost: 128,
            owned: sp.counterGw,
            meetsReq: sp.counterAi,
            meta: "Requires Counter AI. Sets disaster stage to 42 and unlocks Black Hole.",
          })}

          <div className="placeholder" style={{ fontWeight: 700, color: "#f0e8f7" }}>
            Education
          </div>
          {upgradeRow({ id: "engineering1", name: "Engineering I", cost: 2, owned: sp.engineering1, meetsReq: sp.counterMeteor, meta: "Requires Counter Meteor." })}
          {upgradeRow({ id: "engineering2", name: "Engineering II", cost: 10, owned: sp.engineering2, meetsReq: sp.engineering1, meta: "Requires Engineering I." })}
          {upgradeRow({ id: "engineering3", name: "Engineering III", cost: 42, owned: sp.engineering3, meetsReq: sp.engineering2, meta: "Requires Engineering II." })}
          {upgradeRow({ id: "shipping1", name: "Shipping I", cost: 18, owned: sp.shipping1, meetsReq: sp.engineering1, meta: "Requires Engineering I." })}
          {upgradeRow({ id: "shipping2", name: "Shipping II", cost: 27, owned: sp.shipping2, meetsReq: sp.shipping1, meta: "Requires Shipping I." })}
          {upgradeRow({ id: "worldTrade1", name: "World Trade I", cost: 44, owned: sp.worldTrade1, meetsReq: sp.shipping1, meta: "Requires Shipping I." })}
          {upgradeRow({ id: "worldTrade2", name: "World Trade II", cost: 88, owned: sp.worldTrade2, meetsReq: sp.worldTrade1, meta: "Requires World Trade I." })}
          {upgradeRow({ id: "worldTrade3", name: "World Trade III", cost: 124, owned: sp.worldTrade3, meetsReq: sp.worldTrade2, meta: "Requires World Trade II." })}
          {upgradeRow({ id: "worldPeace1", name: "World Peace I", cost: 52, owned: sp.worldPeace1, meetsReq: sp.worldTrade1, meta: "Requires World Trade I." })}
          {upgradeRow({ id: "worldPeace2", name: "World Peace II", cost: 74, owned: sp.worldPeace2, meetsReq: sp.worldPeace1, meta: "Requires World Peace I." })}
          {upgradeRow({ id: "worldPeace3", name: "World Peace III", cost: 188, owned: sp.worldPeace3, meetsReq: sp.worldPeace2, meta: "Requires World Peace II." })}
          {upgradeRow({ id: "worldPeace4", name: "World Peace IV", cost: 324, owned: sp.worldPeace4, meetsReq: sp.worldPeace3, meta: "Requires World Peace III." })}
          {upgradeRow({ id: "mathematics1", name: "Mathematics I", cost: 44, owned: sp.mathematics1, meetsReq: sp.counterAi, meta: "Requires Counter AI." })}
          {upgradeRow({ id: "mathematics2", name: "Mathematics II", cost: 88, owned: sp.mathematics2, meetsReq: sp.mathematics1, meta: "Requires Mathematics I." })}
          {upgradeRow({ id: "mathematics3", name: "Mathematics III", cost: 124, owned: sp.mathematics3, meetsReq: sp.mathematics2, meta: "Requires Mathematics II." })}
          {upgradeRow({ id: "advancedPhysics1", name: "Advanced Physics I", cost: 92, owned: sp.advancedPhysics1, meetsReq: sp.mathematics1, meta: "Requires Mathematics I." })}
          {upgradeRow({ id: "advancedPhysics2", name: "Advanced Physics II", cost: 126, owned: sp.advancedPhysics2, meetsReq: sp.advancedPhysics1, meta: "Requires Advanced Physics I." })}
          {upgradeRow({ id: "advancedPhysics3", name: "Advanced Physics III", cost: 381, owned: sp.advancedPhysics3, meetsReq: sp.advancedPhysics2, meta: "Requires Advanced Physics II." })}
          {upgradeRow({ id: "advancedPhysics4", name: "Advanced Physics IV", cost: 654, owned: sp.advancedPhysics4, meetsReq: sp.advancedPhysics3, meta: "Requires Advanced Physics III." })}

          <div className="placeholder" style={{ fontWeight: 700, color: "#f0e8f7" }}>
            Foundational Era
          </div>
          {upgradeRow({ id: "hunter1", name: "Hunters I", cost: 2, owned: sp.hunter1, meetsReq: true, meta: "Sets hunters to at least 1." })}
          {upgradeRow({ id: "hunter2", name: "Hunters II", cost: 20, owned: sp.hunter2, meetsReq: sp.hunter1, meta: "Requires Hunters I. Sets hunters to at least 10." })}
          {upgradeRow({ id: "hunter3", name: "Hunters III", cost: 40, owned: sp.hunter3, meetsReq: sp.hunter2, meta: "Requires Hunters II. Sets hunters to at least 1000." })}
          {upgradeRow({ id: "hunter4", name: "Hunters IV", cost: 40, owned: sp.hunter4, meetsReq: sp.hunter2, meta: "Requires Hunters II. Sets hunters per purchase to 1000." })}
          {upgradeRow({ id: "gatherer1", name: "Gatherers I", cost: 2, owned: sp.gatherer1, meetsReq: true, meta: "Sets gatherers to at least 1." })}
          {upgradeRow({ id: "gatherer2", name: "Gatherers II", cost: 20, owned: sp.gatherer2, meetsReq: sp.gatherer1, meta: "Requires Gatherers I. Sets gatherers to at least 10." })}
          {upgradeRow({ id: "gatherer3", name: "Gatherers III", cost: 40, owned: sp.gatherer3, meetsReq: sp.gatherer2, meta: "Requires Gatherers II. Sets gatherers to at least 1000." })}
          {upgradeRow({ id: "gatherer4", name: "Gatherers IV", cost: 40, owned: sp.gatherer4, meetsReq: sp.gatherer2, meta: "Requires Gatherers II. Sets gatherers per purchase to 1000." })}
          {upgradeRow({ id: "workerBoost", name: "Worker Boost", cost: 42, owned: sp.workerBoost, meetsReq: true, meta: "Activates worker multiplier scaling." })}
          {upgradeRow({ id: "citiesBoost", name: "Cities Boost", cost: 1337, owned: sp.citiesBoost, meetsReq: sp.counterMeteor, meta: "Requires Counter Meteor." })}

          <div className="placeholder" style={{ fontWeight: 700, color: "#f0e8f7" }}>
            Information Era
          </div>
          {upgradeRow({ id: "factoriesBoost", name: "Factories Boost", cost: 21, owned: sp.factoriesBoost, meetsReq: sp.counterAi, meta: "Requires Counter AI." })}
          {upgradeRow({ id: "bots1", name: "Bots I", cost: 211, owned: sp.bots1, meetsReq: sp.counterAi, meta: "Requires Counter AI." })}
          {upgradeRow({ id: "bots2", name: "Bots II", cost: 1111, owned: sp.bots2, meetsReq: sp.bots1, meta: "Requires Bots I." })}
          {upgradeRow({ id: "rockets1", name: "Rockets I", cost: 1111, owned: sp.rockets1, meetsReq: sp.counterGw, meta: "Requires Counter GW. Sets rockets per space factory to 5." })}
          {upgradeRow({ id: "rockets2", name: "Rockets II", cost: 2222, owned: sp.rockets2, meetsReq: sp.rockets1, meta: "Requires Rockets I. Sets rockets per space factory to 3." })}
          {upgradeRow({ id: "rockets3", name: "Rockets III", cost: 3333, owned: sp.rockets3, meetsReq: sp.rockets2, meta: "Requires Rockets II. Sets rockets per space factory to 1." })}

          <div className="placeholder" style={{ fontWeight: 700, color: "#f0e8f7" }}>
            Space Age
          </div>
          {upgradeRow({ id: "sfacs1", name: "Space Factory Capacity I", cost: 1221, owned: sp.sfacs1, meetsReq: sp.counterGw, meta: "Requires Counter GW." })}
          {upgradeRow({ id: "sfacs2", name: "Space Factory Capacity II", cost: 12221, owned: sp.sfacs2, meetsReq: sp.sfacs1, meta: "Requires Capacity I." })}
          {upgradeRow({ id: "sfacs3", name: "Space Factory Capacity III", cost: 122221, owned: sp.sfacs3, meetsReq: sp.sfacs2, meta: "Requires Capacity II." })}
          {upgradeRow({ id: "railguns1", name: "Railguns I", cost: 1221, owned: sp.railguns1, meetsReq: sp.counterGw, meta: "Requires Counter GW." })}
          {upgradeRow({ id: "railguns2", name: "Railguns II", cost: 12221, owned: sp.railguns2, meetsReq: sp.railguns1, meta: "Requires Railguns I." })}

          <div className="placeholder" style={{ fontWeight: 700, color: "#f0e8f7" }}>
            Reality QoL
          </div>
          {upgradeRow({ id: "doubleTime", name: "Double Time", cost: 5, owned: sp.doubleTimeOwned, meetsReq: true, meta: "Grants a 600s boost bank." })}
          {upgradeRow({
            id: "automateInfluence",
            name: "Automate Influence",
            cost: 10,
            owned: sd.workerAutoConvert,
            meetsReq: true,
            meta: "Auto-converts workers at 128.",
          })}

          <div className="listRow">
            <div className="listMain">
              <div className="listTitle">Translation</div>
              <div className="listMeta">Each purchase grants +1 DysonVerse skill point.</div>
            </div>
            <div className="listActions">
              <div className="cost">{nextTranslationCost == null ? "Max" : `${f(nextTranslationCost)} SM`}</div>
              <button
                type="button"
                disabled={nextTranslationTier == null || sp.strangeMatter < (nextTranslationCost ?? 0)}
                onClick={() => dispatch({ type: "STRANGE_MATTER_BUY", item: (`translation${nextTranslationTier}` as StrangeMatterItem) })}
              >
                Buy
              </button>
            </div>
          </div>

          <div className="listRow">
            <div className="listMain">
              <div className="listTitle">Speed</div>
              <div className="listMeta">Each purchase grants +1 DysonVerse skill point.</div>
            </div>
            <div className="listActions">
              <div className="cost">{nextSpeedCost == null ? "Max" : `${f(nextSpeedCost)} SM`}</div>
              <button
                type="button"
                disabled={nextSpeedTier == null || sp.strangeMatter < (nextSpeedCost ?? 0)}
                onClick={() => dispatch({ type: "STRANGE_MATTER_BUY", item: (`speed${nextSpeedTier}` as StrangeMatterItem) })}
              >
                Buy
              </button>
            </div>
          </div>

          {sp.doubleTimeOwned ? (
            <div className="placeholder">
              Double Time remaining: <strong style={{ color: "#f0e8f7" }}>{formatTime(sp.doubleTime, { mspace: false })}</strong> · Rate:{" "}
              <strong style={{ color: "#f0e8f7" }}>{f(sp.doubleTimeRate)}</strong>x
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
