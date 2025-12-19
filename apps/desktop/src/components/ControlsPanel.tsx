import type { BuyMode, GameAction, GameState } from "@ids/core";
import { formatNumber, formatTime } from "@ids/core";

export interface ControlsPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

function buyModeButton(current: BuyMode, label: string, mode: BuyMode, onClick: () => void) {
  return (
    <button type="button" className={current === mode ? "seg active" : "seg"} onClick={onClick}>
      {label}
    </button>
  );
}

export function ControlsPanel(props: ControlsPanelProps) {
  const { state, dispatch } = props;
  const fmt = state.settings.numberFormatting;
  const f = (x: number) => formatNumber(x, fmt);

  const buyMode = state.settings.buyMode;
  const rounded = state.settings.roundedBulkBuy;
  const researchBuyMode = state.settings.researchBuyMode;
  const researchRounded = state.settings.researchRoundedBulkBuy;

  const botDistribution = state.dysonVersePrestigeData.botDistribution;

  const offlineTime = state.settings.offlineTime;
  const maxOfflineTime = state.settings.maxOfflineTime;

  return (
    <div>
      <div className="segRow" role="group" aria-label="Buy mode">
        {buyModeButton(buyMode, "x1", "Buy1", () => dispatch({ type: "SET_BUY_MODE", buyMode: "Buy1" }))}
        {buyModeButton(buyMode, "x10", "Buy10", () => dispatch({ type: "SET_BUY_MODE", buyMode: "Buy10" }))}
        {buyModeButton(buyMode, "x50", "Buy50", () => dispatch({ type: "SET_BUY_MODE", buyMode: "Buy50" }))}
        {buyModeButton(buyMode, "x100", "Buy100", () => dispatch({ type: "SET_BUY_MODE", buyMode: "Buy100" }))}
        {buyModeButton(buyMode, "Max", "BuyMax", () => dispatch({ type: "SET_BUY_MODE", buyMode: "BuyMax" }))}
      </div>

      <label className="checkboxRow">
        <input type="checkbox" checked={rounded} onChange={() => dispatch({ type: "TOGGLE_ROUNDED_BULK_BUY" })} />
        Rounded bulk buy (buildings)
      </label>

      <div className="segRow" role="group" aria-label="Research buy mode">
        {buyModeButton(researchBuyMode, "Research x1", "Buy1", () => dispatch({ type: "SET_RESEARCH_BUY_MODE", buyMode: "Buy1" }))}
        {buyModeButton(researchBuyMode, "x10", "Buy10", () => dispatch({ type: "SET_RESEARCH_BUY_MODE", buyMode: "Buy10" }))}
        {buyModeButton(researchBuyMode, "x50", "Buy50", () => dispatch({ type: "SET_RESEARCH_BUY_MODE", buyMode: "Buy50" }))}
        {buyModeButton(researchBuyMode, "x100", "Buy100", () => dispatch({ type: "SET_RESEARCH_BUY_MODE", buyMode: "Buy100" }))}
        {buyModeButton(researchBuyMode, "Max", "BuyMax", () => dispatch({ type: "SET_RESEARCH_BUY_MODE", buyMode: "BuyMax" }))}
      </div>

      <label className="checkboxRow">
        <input type="checkbox" checked={researchRounded} onChange={() => dispatch({ type: "TOGGLE_RESEARCH_ROUNDED_BULK_BUY" })} />
        Rounded bulk buy (research)
      </label>

      <div className="checkboxRow" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>Bot distribution</div>
          <div style={{ color: "#c8b7d6" }}>
            {state.prestigePlus.botMultitasking ? "Locked (multitasking)" : `${Math.round(botDistribution * 100)}% research`}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          disabled={state.prestigePlus.botMultitasking}
          value={botDistribution}
          onChange={(e) => dispatch({ type: "SET_BOT_DISTRIBUTION", botDistribution: Number(e.currentTarget.value) })}
        />
        <div style={{ display: "flex", justifyContent: "space-between", color: "#c8b7d6" }}>
          <div>Workers: {f(state.dysonVerseInfinityData.workers)}</div>
          <div>Researchers: {f(state.dysonVerseInfinityData.researchers)}</div>
        </div>
      </div>

      <div className="checkboxRow" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>Offline time</div>
          <div style={{ color: "#c8b7d6" }}>
            {formatTime(offlineTime, { mspace: false })} / {formatTime(maxOfflineTime, { mspace: false })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" disabled={offlineTime < 600} onClick={() => dispatch({ type: "OFFLINE_SPEND", seconds: 600 })}>
            Spend 10m
          </button>
          <button type="button" disabled={offlineTime < 3600} onClick={() => dispatch({ type: "OFFLINE_SPEND", seconds: 3600 })}>
            Spend 1h
          </button>
          <button type="button" disabled={offlineTime <= 0} onClick={() => dispatch({ type: "OFFLINE_SPEND", seconds: offlineTime })}>
            Spend all
          </button>
          <button type="button" disabled={offlineTime < maxOfflineTime} onClick={() => dispatch({ type: "OFFLINE_DOUBLE_MAX" })}>
            Double max
          </button>
        </div>
      </div>

      <div className="checkboxRow" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, color: "#f0e8f7" }}>Number formatting</div>
        <select
          value={state.settings.numberFormatting}
          onChange={(e) => dispatch({ type: "SET_NUMBER_FORMATTING", value: e.currentTarget.value as typeof state.settings.numberFormatting })}
          style={{
            borderRadius: 10,
            border: "1px solid #4a3b58",
            background: "rgba(26, 19, 34, 0.9)",
            color: "#f0e8f7",
            padding: "8px 10px",
          }}
        >
          <option value="standard">Standard</option>
          <option value="scientific">Scientific</option>
          <option value="engineering">Engineering</option>
        </select>
      </div>

      <div className="checkboxRow" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, color: "#f0e8f7" }}>Break threshold</div>
        <div style={{ color: "#c8b7d6", fontSize: 12 }}>Used when Break The Loop is purchased.</div>
        <input
          type="number"
          value={state.meta.infinityPointsToBreakFor}
          onChange={(e) => dispatch({ type: "SET_INFINITY_BREAK_THRESHOLD", value: Number(e.currentTarget.value) })}
          style={{
            borderRadius: 10,
            border: "1px solid #4a3b58",
            background: "rgba(26, 19, 34, 0.9)",
            color: "#f0e8f7",
            padding: "8px 10px",
          }}
        />
      </div>

      <div className="checkboxRow" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, color: "#f0e8f7" }}>Debug / Entitlements</div>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={state.debug.debugOptions}
            onChange={(e) => dispatch({ type: "SET_DEBUG_FLAG", flag: "debugOptions", value: e.currentTarget.checked })}
          />
          Debug options (local toggle)
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={state.debug.doubleIp}
            onChange={(e) => dispatch({ type: "SET_DEBUG_FLAG", flag: "doubleIp", value: e.currentTarget.checked })}
          />
          Double IP entitlement (local toggle)
        </label>

        {state.debug.debugOptions ? (
          <div className="debugRow" style={{ padding: 0 }}>
            <button type="button" onClick={() => dispatch({ type: "DEBUG_ADD_MONEY", amount: 1000 })}>
              +$1K
            </button>
            <button type="button" onClick={() => dispatch({ type: "DEBUG_ADD_MONEY", amount: 1_000_000 })}>
              +$1M
            </button>
            <button type="button" onClick={() => dispatch({ type: "DEBUG_ADD_SCIENCE", amount: 1000 })}>
              +1K Sci
            </button>
          </div>
        ) : null}
      </div>

      <div className="checkboxRow" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ fontWeight: 700, color: "#f0e8f7" }}>Automation</div>
        <div style={{ color: "#c8b7d6", fontSize: 12 }}>Requires Infinity shop unlocks (Auto Research / Auto Bots).</div>

        <div style={{ marginTop: 8, fontWeight: 700, color: "#c8b7d6" }}>Auto Research</div>
        {(
          [
            ["aiManager", "AI Managers"] as const,
            ["assemblyLine", "Assembly Lines"] as const,
            ["server", "Servers"] as const,
            ["dataCenter", "Data Centers"] as const,
            ["planet", "Planets"] as const,
            ["money", "Cash"] as const,
            ["science", "Science"] as const,
          ] as const
        ).map(([researchId, label]) => (
          <label key={researchId} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              disabled={!state.dysonVersePrestigeData.infinityAutoResearch}
              checked={
                researchId === "aiManager"
                  ? state.settings.infinityAutoResearchToggleAi
                  : researchId === "assemblyLine"
                    ? state.settings.infinityAutoResearchToggleAssembly
                    : researchId === "server"
                      ? state.settings.infinityAutoResearchToggleServer
                      : researchId === "dataCenter"
                        ? state.settings.infinityAutoResearchToggleDataCenter
                        : researchId === "planet"
                          ? state.settings.infinityAutoResearchTogglePlanet
                          : researchId === "money"
                            ? state.settings.infinityAutoResearchToggleMoney
                            : state.settings.infinityAutoResearchToggleScience
              }
              onChange={(e) => dispatch({ type: "SET_AUTO_RESEARCH_TOGGLE", researchId, value: e.currentTarget.checked })}
            />
            {label}
          </label>
        ))}

        <div style={{ marginTop: 8, fontWeight: 700, color: "#c8b7d6" }}>Auto Bots (buildings)</div>
        {(
          [
            ["assemblyLines", "Assembly Lines"] as const,
            ["managers", "AI Managers"] as const,
            ["servers", "Servers"] as const,
            ["dataCenters", "Data Centers"] as const,
            ["planets", "Planets"] as const,
          ] as const
        ).map(([buildingId, label]) => (
          <label key={buildingId} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              disabled={!state.dysonVersePrestigeData.infinityAutoBots}
              checked={
                buildingId === "assemblyLines"
                  ? state.settings.infinityAutoAssembly
                  : buildingId === "managers"
                    ? state.settings.infinityAutoManagers
                    : buildingId === "servers"
                      ? state.settings.infinityAutoServers
                      : buildingId === "dataCenters"
                        ? state.settings.infinityAutoDataCenters
                        : state.settings.infinityAutoPlanets
              }
              onChange={(e) => dispatch({ type: "SET_AUTO_BUILDING_TOGGLE", buildingId, value: e.currentTarget.checked })}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
