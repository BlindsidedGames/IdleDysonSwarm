# SkillTreeSettingsManager

## Purpose
- Owns the Skills preset UX in the Skill Tree Settings UI:
  - Preset naming
  - Clipboard import/export
  - Side panel preset toggles (5 slots) switching
  - Tab "preset automation" overrides for Bots/Research (5 slots + Off), which auto-switch presets when those tabs are opened

## Runtime Context
- Runtime MonoBehaviour.
- Intended to remain enabled so it can:
  - react to save data becoming available
  - keep preset labels in sync with renamed presets
  - listen for tab button clicks and apply preset automation

## Key Data
- Current preset slot: `DysonVerseSaveData.selectedPreset` (1-5).
- Preset names: `DysonVerseSaveData.preset1Name..preset5Name`.
- Tab preset automation preferences (persist/export/import with save):
  - `Oracle.SaveDataSettings.botsTabPresetOverride` (0=Off, 1-5)
  - `Oracle.SaveDataSettings.researchTabPresetOverride` (0=Off, 1-5)

## Data Flow / Switching Behavior
- Side panel preset toggles:
  - Selecting a slot triggers a full preset switch:
    - Save old slot (if needed)
    - Reset/refund skill state
    - Load new slot data into live auto-assign list
    - Auto-assign
  - Feedback is shown through `SidePanelReferences.skillsPresetFeedbackText` using the preset display name.
- Tab preset automation toggles:
  - Selecting a slot only updates the override preference (no immediate preset switching).
  - The selected toggle hides its label text to reveal the icon (including Off).
- Tab open detection:
  - Uses `SidePanelReferences.botsTabButton` / `SidePanelReferences.researchTabButton` (wired on both overlay and permanent refs).
  - Also supports optional bottom-bar (or other) navigation buttons wired directly on `SkillTreeSettingsManager`:
    - `botsBottomBarTabButton`
    - `researchBottomBarTabButton`
  - When clicked, if the override is enabled (1-5), it switches presets and shows feedback.
- Initial screen behavior:
  - After save/settings exist, `PlayerPrefs initialScreen` is checked:
    - Bots: 1 or 9
    - Research: 2
  - If the tab has an override enabled, it applies it once on startup.

## Performance / Pitfalls
- Avoid duplicating `onClick` listeners:
  - Overlay/permanent can point to the same `Button`; code dedupes registrations.
- Preset switching mutates live auto-assign state:
  - Keep `oracle.SuppressPresetSync()` usage intact to avoid overwriting slots during the temporary clear/load phase.

## Verification Checklist (Manual)
1. With both overlay + permanent SidePanelReferences wired:
  - Clicking Bots tab auto-switches to the configured preset override (unless Off).
  - Clicking Research tab auto-switches similarly.
2. Switching between overlay/permanent layouts still works:
  - Tab auto-switch triggers regardless of which layout is currently active.
3. Toggle UX:
  - Selecting any automation toggle hides its label, showing the icon.
  - Preset 1-5 labels show short labels derived from preset names.
4. Save persistence:
  - Export/import save retains `botsTabPresetOverride` and `researchTabPresetOverride`.
