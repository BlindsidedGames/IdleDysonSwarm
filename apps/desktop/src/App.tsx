import { useEffect, useRef, useState } from "react";

import type { GameAction, GameState } from "@ids/core";
import { formatNumber } from "@ids/core";

import "./App.css";
import { ControlsPanel } from "./components/ControlsPanel";
import { DysonVersePanel } from "./components/DysonVersePanel";
import { InfinityPanel } from "./components/InfinityPanel";
import { RealityPanel } from "./components/RealityPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SimulationPanel } from "./components/SimulationPanel";
import { SkillTreePanel } from "./components/SkillTreePanel";
import { EngineClient } from "./engine/EngineClient";
import { loadSavedState, saveState } from "./game/persistence";

function tabTitle(tab: "dysonverse" | "skillTree" | "infinity" | "reality" | "simulation" | "settings"): string {
  if (tab === "dysonverse") return "DysonVerse";
  if (tab === "skillTree") return "Skill Tree";
  if (tab === "infinity") return "Infinity / PrestigePlus";
  if (tab === "reality") return "Reality";
  if (tab === "simulation") return "Simulation";
  return "Settings";
}

function App() {
  const [engine, setEngine] = useState<EngineClient | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [saveReady, setSaveReady] = useState(false);

  const [tab, setTab] = useState<"dysonverse" | "skillTree" | "infinity" | "reality" | "simulation" | "settings">("dysonverse");
  const [dysonSection, setDysonSection] = useState<"buildings" | "research" | "panelLifetime">("buildings");
  const [infinitySection, setInfinitySection] = useState<"infinity" | "prestigePlus" | "avocato">("infinity");
  const [simulationSection, setSimulationSection] = useState<"dream1" | "upgrades">("dream1");

  const stateRef = useRef<GameState | null>(null);
  const saveReadyRef = useRef(false);

  useEffect(() => {
    const nextEngine = new EngineClient();
    setEngine(nextEngine);
    setState(nextEngine.getState());
    setEngineError(nextEngine.getError());

    const unsubscribe = nextEngine.subscribe(setState);
    const unsubscribeErrors = nextEngine.subscribeError(setEngineError);
    return () => {
      if (saveReadyRef.current && stateRef.current) void saveState(stateRef.current);
      unsubscribe();
      unsubscribeErrors();
      nextEngine.destroy();
    };
  }, []);

  useEffect(() => {
    if (!engine) return;
    let canceled = false;
    void (async () => {
      const loaded = await loadSavedState();
      if (canceled) return;
      if (loaded) engine.loadState(loaded);
      setSaveReady(true);
    })();
    return () => {
      canceled = true;
    };
  }, [engine]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    saveReadyRef.current = saveReady;
  }, [saveReady]);

  useEffect(() => {
    if (!saveReady) return;
    const id = window.setInterval(() => {
      if (stateRef.current) void saveState(stateRef.current);
    }, 2000);
    return () => {
      clearInterval(id);
    };
  }, [saveReady]);

  const dispatch = (action: GameAction) => engine?.dispatch(action);

  const fmt = state?.settings.numberFormatting ?? "standard";
  const f = (x: number) => formatNumber(x, fmt);

  const money = state?.dysonVerseInfinityData.money ?? 0;
  const science = state?.dysonVerseInfinityData.science ?? 0;
  const bots = state?.dysonVerseInfinityData.bots ?? 0;
  const influence = state?.saveData.influence ?? 0;
  const strangeMatter = state?.sdPrestige.strangeMatter ?? 0;

  function handleLoadState(next: GameState) {
    if (!engine) return;
    engine.loadState(next);
    void saveState(next);
    setTab("dysonverse");
  }

  return (
    <main className="container">
      <div className="layout">
        <nav className="tabs tabsSide" aria-label="Primary navigation">
          <button type="button" className={tab === "dysonverse" ? "tab active" : "tab"} onClick={() => setTab("dysonverse")}>
            DysonVerse
          </button>
          <button type="button" className={tab === "skillTree" ? "tab active" : "tab"} onClick={() => setTab("skillTree")}>
            Skill Tree
          </button>
          <button type="button" className={tab === "infinity" ? "tab active" : "tab"} onClick={() => setTab("infinity")}>
            Infinity
          </button>
          <button type="button" className={tab === "reality" ? "tab active" : "tab"} onClick={() => setTab("reality")}>
            Reality
          </button>
          <button type="button" className={tab === "simulation" ? "tab active" : "tab"} onClick={() => setTab("simulation")}>
            Simulation
          </button>
          <button type="button" className={tab === "settings" ? "tab active" : "tab"} onClick={() => setTab("settings")}>
            Settings
          </button>
        </nav>

        <div className="mainContent">
          <section className="hud">
            <div className="hudItem">
              <div className="hudLabel">Cash</div>
              <div className="hudValue">${f(money)}</div>
            </div>
            <div className="hudItem">
              <div className="hudLabel">Science</div>
              <div className="hudValue">{f(science)}</div>
            </div>
            <div className="hudItem">
              <div className="hudLabel">Bots</div>
              <div className="hudValue">{f(bots)}</div>
            </div>
            <div className="hudItem">
              <div className="hudLabel">Influence</div>
              <div className="hudValue">{f(influence)}</div>
            </div>
            <div className="hudItem">
              <div className="hudLabel">Strange Matter</div>
              <div className="hudValue">{f(strangeMatter)}</div>
            </div>
          </section>

          <section className="panelRow">
            <section className="panel">
              <header className="panelHeader">
                <h2>{tabTitle(tab)}</h2>
              </header>

              {state ? (
                tab === "dysonverse" ? (
                  <DysonVersePanel state={state} dispatch={dispatch} section={dysonSection} onSectionChange={setDysonSection} />
                ) : tab === "skillTree" ? (
                  <SkillTreePanel state={state} dispatch={dispatch} />
                ) : tab === "infinity" ? (
                  <InfinityPanel state={state} dispatch={dispatch} section={infinitySection} onSectionChange={setInfinitySection} />
                ) : tab === "reality" ? (
                  <RealityPanel state={state} dispatch={dispatch} />
                ) : tab === "simulation" ? (
                  <SimulationPanel state={state} dispatch={dispatch} section={simulationSection} onSectionChange={setSimulationSection} />
                ) : (
                  <SettingsPanel state={state} onLoadState={handleLoadState} />
                )
              ) : engineError ? (
                <div className="placeholder">
                  <div>Engine failed to start.</div>
                  <div className="placeholderErrorDetails">{engineError}</div>
                </div>
              ) : (
                <div className="placeholder">Loading...</div>
              )}
            </section>

            <section className="panel">
              <header className="panelHeader">
                <h2>Controls</h2>
              </header>
              {state ? (
                <ControlsPanel state={state} dispatch={dispatch} />
              ) : engineError ? (
                <div className="placeholder">
                  <div>Engine failed to start.</div>
                  <div className="placeholderErrorDetails">{engineError}</div>
                </div>
              ) : (
                <div className="placeholder">Loading...</div>
              )}
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;



