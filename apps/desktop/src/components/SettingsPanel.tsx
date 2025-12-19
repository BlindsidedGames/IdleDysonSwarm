import { createDefaultGameState } from "@ids/core";
import type { GameState } from "@ids/core";
import { exportStateToBase64, importStateFromBase64 } from "../game/persistence";
import { useState } from "react";

export interface SettingsPanelProps {
  state: GameState;
  onLoadState: (next: GameState) => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { state, onLoadState } = props;
  const [importText, setImportText] = useState("");

  const exportText = exportStateToBase64(state);

  return (
    <div className="placeholder">
      <div style={{ marginBottom: 12, fontWeight: 700, color: "#f0e8f7" }}>Save / Import / Export</div>
      <div style={{ display: "grid", gap: 10 }}>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(exportText);
          }}
        >
          Copy export (Base64 JSON)
        </button>

        <textarea
          readOnly
          value={exportText}
          rows={5}
          style={{
            width: "100%",
            resize: "vertical",
            borderRadius: 12,
            border: "1px solid #4a3b58",
            background: "rgba(26, 19, 34, 0.9)",
            color: "#f0e8f7",
            padding: 10,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        />

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.currentTarget.value)}
          placeholder="Paste export string here..."
          rows={5}
          style={{
            width: "100%",
            resize: "vertical",
            borderRadius: 12,
            border: "1px solid #4a3b58",
            background: "rgba(26, 19, 34, 0.9)",
            color: "#f0e8f7",
            padding: 10,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              const next = importStateFromBase64(importText);
              onLoadState(next);
              setImportText("");
            }}
            disabled={!importText.trim()}
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => {
              onLoadState(createDefaultGameState());
              setImportText("");
            }}
          >
            Reset (new save)
          </button>
        </div>
      </div>
    </div>
  );
}
