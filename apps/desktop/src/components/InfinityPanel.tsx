import type { GameAction, GameState } from "@ids/core";
import { formatNumber, infinityBotsRequired, rawInfinityPointsToGain } from "@ids/core";

export interface InfinityPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  section: "infinity" | "prestigePlus" | "avocato";
  onSectionChange: (next: "infinity" | "prestigePlus" | "avocato") => void;
}

export function InfinityPanel(props: InfinityPanelProps) {
  const { state, dispatch, section, onSectionChange } = props;
  const fmt = state.settings.numberFormatting;
  const f = (x: number) => formatNumber(x, fmt);

  const dvid = state.dysonVerseInfinityData;
  const dvpd = state.dysonVersePrestigeData;
  const pp = state.prestigePlus;

  return (
    <div>
      <div className="segRow" role="group" aria-label="Infinity section">
        <button type="button" className={section === "infinity" ? "seg active" : "seg"} onClick={() => onSectionChange("infinity")}>
          Infinity Shop
        </button>
        <button type="button" className={section === "prestigePlus" ? "seg active" : "seg"} onClick={() => onSectionChange("prestigePlus")}>
          PrestigePlus (Quantum)
        </button>
        <button type="button" className={section === "avocato" ? "seg active" : "seg"} onClick={() => onSectionChange("avocato")}>
          Avocato
        </button>
      </div>

      {section === "infinity" ? (
        <div className="list">
          {(() => {
            const remaining = dvpd.infinityPoints - dvpd.spentInfinityPoints;
            const requiredBots = infinityBotsRequired(state);
            const potential =
              rawInfinityPointsToGain(state) * (state.debug.doubleIp ? 2 : 1) * (state.prestigePlus.doubleIP ? 2 : 1);

            const items = [
              { id: "secret" as const, name: "Secret of the Universe", cost: 1, disabled: dvpd.secretsOfTheUniverse >= 27 },
              { id: "skillPoint" as const, name: "Permanent Skill Point", cost: 1, disabled: dvpd.permanentSkillPoint >= 10 },
              { id: "starterAssemblyLines" as const, name: "Starter Pack: Assembly Lines (+10)", cost: 1, disabled: dvpd.infinityAssemblyLines },
              { id: "starterAiManagers" as const, name: "Starter Pack: AI Managers (+10)", cost: 1, disabled: dvpd.infinityAiManagers || !dvpd.infinityAssemblyLines },
              { id: "starterServers" as const, name: "Starter Pack: Servers (+10)", cost: 1, disabled: dvpd.infinityServers || !dvpd.infinityAiManagers },
              { id: "starterDataCenters" as const, name: "Starter Pack: Data Centers (+10)", cost: 1, disabled: dvpd.infinityDataCenter || !dvpd.infinityServers },
              { id: "starterPlanets" as const, name: "Starter Pack: Planets (+10)", cost: 1, disabled: dvpd.infinityPlanets || !dvpd.infinityDataCenter },
              { id: "autoResearch" as const, name: "Auto Research", cost: 3, disabled: dvpd.infinityAutoResearch },
              { id: "autoBots" as const, name: "Auto Bots", cost: 3, disabled: dvpd.infinityAutoBots },
            ];

            return (
              <>
                <div className="placeholder">
                  Infinity Points: <strong style={{ color: "#f0e8f7" }}>{f(dvpd.infinityPoints)}</strong> (spent {f(dvpd.spentInfinityPoints)}, remaining {f(remaining)})
                  <br />
                  Bots: {f(dvid.bots)} · Required: {f(requiredBots)} · Potential IP (Break The Loop): {f(potential)}
                </div>

                {items.map((item) => (
                  <div key={item.id} className="listRow">
                    <div className="listMain">
                      <div className="listTitle">{item.name}</div>
                      <div className="listMeta">Cost: {item.cost} IP</div>
                    </div>
                    <div className="listActions">
                      <button type="button" disabled={item.disabled || remaining < item.cost} onClick={() => dispatch({ type: "INFINITY_BUY", item: item.id })}>
                        Buy
                      </button>
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      ) : null}

      {section === "prestigePlus" ? (
        <div className="list">
          {(() => {
            const remaining = pp.points - pp.spentPoints;
            const divisionCost = pp.divisionsPurchased >= 1 ? Math.pow(2, pp.divisionsPurchased) * 2 : 2;

            const items = [
              { id: "botMultitasking" as const, name: "Bot Multitasking", cost: 1, disabled: pp.botMultitasking },
              { id: "doubleIP" as const, name: "Double Infinity Points", cost: 1, disabled: pp.doubleIP },
              { id: "automation" as const, name: "Automation", cost: 1, disabled: pp.automation },
              { id: "secrets" as const, name: "Secrets (+3)", cost: 1, disabled: pp.secrets >= 27 },
              { id: "division" as const, name: `Divisions (cost ${divisionCost})`, cost: divisionCost, disabled: pp.divisionsPurchased >= 19 },
              { id: "breakTheLoop" as const, name: "Break The Loop", cost: 6, disabled: pp.breakTheLoop },
              { id: "quantumEntanglement" as const, name: "Quantum Entanglement", cost: 12, disabled: pp.quantumEntanglement },
              { id: "avocato" as const, name: "Avocato", cost: 42, disabled: pp.avocatoPurchased },
              { id: "fragments" as const, name: "Unlock: Fragments", cost: 2, disabled: pp.fragments },
              { id: "purity" as const, name: "Unlock: Purity", cost: 3, disabled: pp.purity },
              { id: "terra" as const, name: "Unlock: Terra", cost: 2, disabled: pp.terra },
              { id: "power" as const, name: "Unlock: Power", cost: 2, disabled: pp.power },
              { id: "paragade" as const, name: "Unlock: Paragade", cost: 1, disabled: pp.paragade },
              { id: "stellar" as const, name: "Unlock: Stellar", cost: 4, disabled: pp.stellar },
              { id: "influence" as const, name: "Influence +4/s", cost: 1, disabled: false },
              { id: "cash" as const, name: "Cash +5%", cost: 1, disabled: false },
              { id: "science" as const, name: "Science +5%", cost: 1, disabled: false },
            ];

            return (
              <>
                <div className="placeholder">
                  PP Points: <strong style={{ color: "#f0e8f7" }}>{f(pp.points)}</strong> (spent {f(pp.spentPoints)}, remaining {f(remaining)})
                  <br />
                  Enact requires 42 Infinity Points (you have {f(dvpd.infinityPoints)}).
                </div>

                <div className="placeholder" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" disabled={dvpd.infinityPoints < 42} onClick={() => dispatch({ type: "PRESTIGE_PLUS_ENACT" })}>
                    {pp.quantumEntanglement ? "Convert IP → PP" : "Enact PrestigePlus"}
                  </button>
                </div>

                {items.map((item) => (
                  <div key={item.id} className="listRow">
                    <div className="listMain">
                      <div className="listTitle">{item.name}</div>
                      <div className="listMeta">Cost: {f(item.cost)} PP</div>
                    </div>
                    <div className="listActions">
                      <button type="button" disabled={item.disabled || remaining < item.cost} onClick={() => dispatch({ type: "PRESTIGE_PLUS_BUY", item: item.id })}>
                        Buy
                      </button>
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      ) : null}

      {section === "avocato" ? (
        <div className="list">
          {(() => {
            const infinityMulti = pp.avocatoIP >= 10 ? Math.log10(pp.avocatoIP) : 0;
            const influenceMulti = pp.avocatoInfluence >= 10 ? Math.log10(pp.avocatoInfluence) : 0;
            const smMulti = pp.avocatoStrangeMatter >= 10 ? Math.log10(pp.avocatoStrangeMatter) : 0;
            const overflowMulti = 1 + pp.avocatoOverflow;

            const availableIP = dvpd.infinityPoints - dvpd.spentInfinityPoints;

            return (
              <>
                <div className="placeholder">
                  {pp.avocatoPurchased ? (
                    <>
                      Infinity feed: {f(pp.avocatoIP)} (mult x{f(infinityMulti)}) · Influence feed: {f(pp.avocatoInfluence)} (mult x{f(influenceMulti)}) · Strange Matter feed: {f(pp.avocatoStrangeMatter)} (mult x{f(smMulti)})
                      <br />
                      Overflow: x{f(overflowMulti)}
                    </>
                  ) : (
                    "Purchase Avocato in PrestigePlus to unlock feeding."
                  )}
                </div>

                <div className="placeholder" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" disabled={!pp.avocatoPurchased || availableIP <= 0} onClick={() => dispatch({ type: "AVOCATO_FEED_IP" })}>
                    Feed IP ({f(availableIP)})
                  </button>
                  <button type="button" disabled={!pp.avocatoPurchased || state.saveData.influence <= 0} onClick={() => dispatch({ type: "AVOCATO_FEED_INFLUENCE" })}>
                    Feed Influence ({f(state.saveData.influence)})
                  </button>
                  <button type="button" disabled={!pp.avocatoPurchased || state.sdPrestige.strangeMatter <= 0} onClick={() => dispatch({ type: "AVOCATO_FEED_STRANGE_MATTER" })}>
                    Feed Strange Matter ({f(state.sdPrestige.strangeMatter)})
                  </button>
                </div>

                <div className="placeholder" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" disabled={!pp.avocatoPurchased || state.settings.avotation} onClick={() => dispatch({ type: "AVOCATO_MEDITATE" })}>
                    {state.settings.avotation ? "Meditation complete" : "Meditate (+4 skill points)"}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
