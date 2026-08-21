# SkillTreeSettingsManager

## Purpose and scope
- Owns the Skill Tree Settings preset UX.
- Manages:
  - Preset naming
  - Clipboard export/import
  - Settings toggle for whether auto-assign can assign intrinsic non-refundable skills
  - Preset toggle binding in:
    - permanent side panel (`SidePanelReferences`)
    - temporary side panel (`SidePanelReferences`)
    - settings window (`settingsPresetToggle*` / `settingsPresetToggleText*`)
  - Bots/Research preset automation overrides and tab-open preset application

## Runtime context / entry points
- Runtime `MonoBehaviour` tied to the Skill Tree settings UI.
- Lifecycle:
  - `Start()`
  - `OnEnable()/OnDisable()`
  - `HandleUpdateSkills()`
- Preset switching is user-driven through:
  - side-panel toggles
  - settings-window toggles
  - tab-open automation handlers
- Export/import and rename controls are wired from Inspector button/field references.

## Interacts with
- Calls:
  - `Expansion.Oracle`
  - `SkillTreeManager`
  - `GameManager`
  - `SidePanelReferences`
  - `PresetAutomationReferences`
- Called by:
  - UI button/toggle events on settings and side panels
  - `UpdateSkills` event (`Oracle -> UI`) and tab button clicks

## Data flow and behavior
### Preset switching
- Persistent source of truth: `DysonVerseSaveData.selectedPreset` (1-5), default 1.
- `ApplyPresetSelection(..., loadPreset: true)` triggers:
  - optional `oracle.SaveList(current)` when switching away
  - callback suppression and radio-button state sync
  - `LoadPreset` for the target slot
  - UI label visibility sync (`selected text hidden`, others shown)
- `LoadPreset` persists slot changes by:
  - `SaveList(previous)` (before reset/load)
  - `ResetSkills()`
  - `oracle.LoadList(target)`
  - `InvokeUpdateSkills()`
  - `AutoAssignSkillsInvoke()`
- `SuppressPresetSync()` remains around reset/load to avoid writing empty active state back into storage.

### Preset labels
- Side panel + temporary + settings labels all map to short labels generated from preset names.
- Empty/default names collapse to short index labels (`1`..`5`).

### Clipboard share / move
- `ExportPresetToClipboard(slot)` serializes:
  - `version`
  - preset name
  - bot distribution
  - IDs from active list for current slot, explicit slot list for others
- `ImportPresetFromClipboard(slot)` validates JSON/version, de-dupes IDs, updates:
  - preset name
  - bot distribution
  - preset ID list (dependency-safe normalized order)
  - then reloads if importing the active slot

### Auto-assign settings
- `autoAssignNonRefundableToggle` binds to `SaveDataSettings.autoAssignNonRefundableSkills`.
- When enabled, auto-assign may purchase intrinsic non-refundable skills.
- When disabled, those skills are skipped by auto-assign while refundable skills remain eligible.

### Preset automation
- Persistent settings:
  - `SaveDataSettings.botsTabPresetOverride`
  - `SaveDataSettings.researchTabPresetOverride`
- On tab open, handler applies override preset when enabled (1-5), otherwise no-op.
- Feedback now routes:
  - side panels via `SkillsPresetFeedbackText`
  - settings window via `settingsPresetFeedbackText`

## Wiring changes in this patch
- Added serialized settings-window fields:
  - `settingsPresetToggle1..5`
  - `settingsPresetToggleText1..5`
  - `settingsPresetFeedbackText`
- Added shared binding logic that no longer requires `SidePanelReferences` for settings toggles:
  - `RegisterPresetToggleBindings(Toggle[]... , TMP_Text[]..., TMP_Text feedbackTextOverride, ...)`
- Added array-label/sync helpers for settings panel:
  - `UpdateSidePanelPresetLabels(Toggle[]..., TMP_Text[]..., DysonVerseSaveData)`
  - `SyncSidePanelToPreset(Toggle[]..., TMP_Text[]..., int)`

## Save/load path trace points (relevant to this script)
- `Oracle.SaveList(listNum)` stores `skillAutoAssignmentIds*` and `botDistPreset*` for each slot.
- `Oracle.LoadList(listNum)` restores list + distribution into live `dysonVerseSaveData`.
- Preset names are persisted in:
  - `DysonVerseSaveData.preset1Name` through `preset5Name`
- Override settings are persisted as part of `SaveDataSettings`.
- Non-refundable auto-assign preference persists as `SaveDataSettings.autoAssignNonRefundableSkills`.

## Risks and observed caveats
- `Oracle.SetPresetAutoAssignmentSkillIds()` does not schedule quick-save directly.
- `Oracle.SaveList()` also does not schedule quick-save directly.
- Existing behavior depends on the broader save pipeline (`SetAutoAssignmentSkillIds` and auto-save cadence) to persist changes.
  In short: presets remain functional, but rapid forced-quit right after heavy preset edits can still be exposed to existing autosave timing.

## Verification checklist
1. Change names in settings and confirm:
  - side panel labels
  - temporary panel labels
  - settings window labels
  all reflect the new short names.
2. Select presets from each of the three toggle groups:
  - active state and feedback are correct
  - data reload occurs as expected
  - cross-group selection stays synced.
3. Configure and trigger Bots/Research overrides from both side-tab and optional bottom-bar buttons.
4. Export/import valid payload and invalid payload paths:
  - valid payload imports and applies
  - invalid JSON/version/empty buffer shows correct feedback and no mutation.
5. Toggle `autoAssignNonRefundableToggle` and verify:
  - value persists after save/load
  - auto-assign respects the setting during skill assignment.
