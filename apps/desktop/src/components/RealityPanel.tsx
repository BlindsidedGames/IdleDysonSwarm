import { RealityCosts } from "@ids/balance";
import type { GameAction, GameState } from "@ids/core";
import { formatNumber, formatTime } from "@ids/core";

export interface RealityPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

type StrangeMatterItem = Extract<GameAction, { type: "STRANGE_MATTER_BUY" }>["item"];

function nextTier(owned: boolean[]): number | null {
  const idx = owned.findIndex((v) => !v);
  if (idx === -1) return null;
  return idx + 1;
}

export function RealityPanel(props: RealityPanelProps) {
  const { state, dispatch } = props;
  const fmt = state.settings.numberFormatting;
  const f = (x: number) => formatNumber(x, fmt);

  const sd = state.saveData;
  const sp = state.sdPrestige;
  const pp = state.prestigePlus;

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

  const translationTier = translationOwned.filter(Boolean).length;
  const speedTier = speedOwned.filter(Boolean).length;

  const nextTranslationTier = nextTier(translationOwned);
  const nextSpeedTier = nextTier(speedOwned);

  const nextTranslationCost = nextTranslationTier ? RealityCosts.translation[nextTranslationTier - 1] ?? Number.POSITIVE_INFINITY : null;
  const nextSpeedCost = nextSpeedTier ? RealityCosts.speed[nextSpeedTier - 1] ?? Number.POSITIVE_INFINITY : null;

  const workerGenerationSpeed = 4 + pp.influence;

  return (
    <div>
      <div className="placeholder">
        Influence: <strong style={{ color: "#f0e8f7" }}>{f(sd.influence)}</strong> · Strange Matter:{" "}
        <strong style={{ color: "#f0e8f7" }}>{f(sp.strangeMatter)}</strong>
        <br />
        Universe Designation: <strong style={{ color: "#f0e8f7" }}>{f(sd.universesConsumed + 1)}</strong> · Workers ready:{" "}
        <strong style={{ color: "#f0e8f7" }}>{f(sd.workersReadyToGo)}</strong>/128 · Generation:{" "}
        <strong style={{ color: "#f0e8f7" }}>{f(workerGenerationSpeed)}</strong>/s
      </div>

      <div className="list">
        <div className="listRow">
          <div className="listMain">
            <div className="listTitle">Gather Influence</div>
            <div className="listMeta">Requires 128 workers ready to go. Adds +128 Influence and resets workers to 0.</div>
          </div>
          <div className="listActions">
            <div className="cost">
              {f(sd.workersReadyToGo)}/128
            </div>
            <button type="button" disabled={sd.workersReadyToGo < 128} onClick={() => dispatch({ type: "REALITY_SEND_WORKERS" })}>
              Send
            </button>
          </div>
        </div>

        <div className="listRow">
          <div className="listMain">
            <div className="listTitle">Automate Influence</div>
            <div className="listMeta">Cost: 10 Strange Matter. Auto-converts workers at 128.</div>
          </div>
          <div className="listActions">
            <div className="cost">{f(10)} SM</div>
            <button
              type="button"
              disabled={sd.workerAutoConvert || sp.strangeMatter < 10}
              onClick={() => dispatch({ type: "STRANGE_MATTER_BUY", item: "automateInfluence" })}
            >
              {sd.workerAutoConvert ? "Owned" : "Buy"}
            </button>
          </div>
        </div>

        <div className="listRow">
          <div className="listMain">
            <div className="listTitle">
              Translation <span style={{ color: "#c8b7d6", fontWeight: 400 }}>({translationTier}/8)</span>
            </div>
            <div className="listMeta">Each purchase grants +1 DysonVerse skill point.</div>
          </div>
          <div className="listActions">
            <div className="cost">{nextTranslationCost == null ? "Max" : `${f(nextTranslationCost)} SM`}</div>
            <button
              type="button"
              disabled={nextTranslationTier == null || sp.strangeMatter < (nextTranslationCost ?? 0)}
              onClick={() => dispatch({ type: "STRANGE_MATTER_BUY", item: `translation${nextTranslationTier}` as StrangeMatterItem })}
            >
              Buy
            </button>
          </div>
        </div>

        <div className="listRow">
          <div className="listMain">
            <div className="listTitle">
              Speed <span style={{ color: "#c8b7d6", fontWeight: 400 }}>({speedTier}/8)</span>
            </div>
            <div className="listMeta">Each purchase grants +1 DysonVerse skill point.</div>
          </div>
          <div className="listActions">
            <div className="cost">{nextSpeedCost == null ? "Max" : `${f(nextSpeedCost)} SM`}</div>
            <button
              type="button"
              disabled={nextSpeedTier == null || sp.strangeMatter < (nextSpeedCost ?? 0)}
              onClick={() => dispatch({ type: "STRANGE_MATTER_BUY", item: `speed${nextSpeedTier}` as StrangeMatterItem })}
            >
              Buy
            </button>
          </div>
        </div>

        <div className="listRow">
          <div className="listMain">
            <div className="listTitle">Double Time</div>
            <div className="listMeta">
              {sp.doubleTimeOwned
                ? `Remaining: ${formatTime(sp.doubleTime, { mspace: false })} · Rate: ${f(sp.doubleTimeRate)}x`
                : "Cost: 5 Strange Matter. Grants a 600s boost bank."}
            </div>
          </div>
          <div className="listActions">
            {sp.doubleTimeOwned ? (
              <input
                type="number"
                min={0}
                step={1}
                value={sp.doubleTimeRate}
                onChange={(e) => dispatch({ type: "SET_DOUBLE_TIME_RATE", rate: Number(e.currentTarget.value) })}
                style={{
                  width: 90,
                  borderRadius: 10,
                  border: "1px solid #4a3b58",
                  background: "rgba(26, 19, 34, 0.9)",
                  color: "#f0e8f7",
                  padding: "8px 10px",
                }}
              />
            ) : (
              <div className="cost">{f(5)} SM</div>
            )}
            <button
              type="button"
              disabled={sp.doubleTimeOwned || sp.strangeMatter < 5}
              onClick={() => dispatch({ type: "STRANGE_MATTER_BUY", item: "doubleTime" })}
            >
              {sp.doubleTimeOwned ? "Owned" : "Buy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
