using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;
using Systems.Skills;
using static Expansion.Oracle;

/// <summary>
/// Skill tree settings UI controller (preset names, clipboard import/export, and preset switching UI bindings).
/// </summary>
/// <remarks>
/// Purpose:
/// - Owns the Skills preset UX: naming, clipboard import/export, side-panel preset toggle switching, and tab-based
///   "preset automation" (Bots/Research can auto-switch presets when opened).
///
/// Where it runs:
/// - Runtime (UI scene object; intended to remain enabled so it can respond to save/load and tab clicks).
///
/// Primary entry points:
/// - <see cref="Start"/>: wires buttons and kicks off initial preset text setup.
/// - <see cref="OnEnable"/> / <see cref="OnDisable"/>: registers/unregisters event and UI bindings.
/// - Toggle callbacks (side panel + automation), clipboard handlers, and tab button listeners.
///
/// Owns:
/// - Wiring of settings preset controls (buttons, toggles, labels, and clipboard path).
/// - Runtime preset selection routing for permanent side panel, temporary side panel, and settings preset toggles.
/// - Text sync for preset labels and user-facing feedback messages.
/// Delegates to:
/// - <c>Oracle</c> for load/save + skill-auto-assignment list persistence.
/// - <c>SkillTreeManager</c> and <c>GameManager</c> for reset + re-assign execution.
///
/// Interacts with:
/// - Calls into: <c>Expansion.Oracle</c> (saveSettings, SaveList/LoadList, preset data), <c>SkillTreeManager</c>
///   (ResetSkills), <c>GameManager</c> (AutoAssignSkillsInvoke), <c>SidePanelReferences</c> (toggle + feedback UI),
///   <c>PresetAutomationReferences</c> (Bots/Research automation UI + optional bottom-bar tab buttons).
/// - Called by: Unity lifecycle + UI events; <c>GameManager.UpdateSkills</c> event.
///
/// Change notes:
/// - Public/serialized fields here are wired in prefabs/scenes; renaming fields requires updating Unity references.
/// - Preset automation preferences persist in <c>Oracle.SaveDataSettings</c> (export/import with save).
/// - Preset switching touches live auto-assign state; keep <c>oracle.SuppressPresetSync()</c> usage intact when
///   changing switch behavior.
/// - <c>autoAssignNonRefundableToggle</c> is optional and persists to
///   <c>SaveDataSettings.autoAssignNonRefundableSkills</c>; keep null-safe wiring for scene variants.
/// - Toggle binding loops must not capture the loop index variable inside closures; always capture a per-iteration
///   index value to avoid incorrect UI state (for example all toggles being forced off).
/// </remarks>
public class SkillTreeSettingsManager : MonoBehaviour
{
    [SerializeField] private GameManager _gameManager;
    [SerializeField] private SkillTreeManager _skillTreeManager;
    [SerializeField] private TMP_Text feedbackMessage;
    [SerializeField]
    private Button preset1Export;
    [SerializeField]
    private Button preset1Import;
    [SerializeField]
    private Button preset2Export;
    [SerializeField]
    private Button preset2Import;
    [SerializeField]
    private Button preset3Export;
    [SerializeField]
    private Button preset3Import;
    [SerializeField]
    private Button preset4Export;
    [SerializeField]
    private Button preset4Import;
    [SerializeField]
    private Button preset5Export;
    [SerializeField]
    private Button preset5Import;
    [SerializeField] private Button preset1Set;
    [SerializeField] private Button preset2Set;
    [SerializeField] private Button preset3Set;
    [SerializeField] private Button preset4Set;
    [SerializeField] private Button preset5Set;
    [SerializeField] private Button resetSkills;

    [SerializeField] private TMP_Text preset1Text;
    [SerializeField] private TMP_Text preset2Text;
    [SerializeField] private TMP_Text preset3Text;
    [SerializeField] private TMP_Text preset4Text;
    [SerializeField] private TMP_Text preset5Text;

    [SerializeField] private TMP_InputField rename1;
    [SerializeField] private TMP_InputField rename2;
    [SerializeField] private TMP_InputField rename3;
    [SerializeField] private TMP_InputField rename4;
    [SerializeField] private TMP_InputField rename5;

    [Header("Side Panel Preset Toggles")]
    [SerializeField] private SidePanelReferences permanentSidePanel;
    [SerializeField] private SidePanelReferences temporarySidePanel;

    [Header("Skill Tree Settings Preset Toggles")]
    [SerializeField] private Toggle settingsPresetToggle1;
    [SerializeField] private Toggle settingsPresetToggle2;
    [SerializeField] private Toggle settingsPresetToggle3;
    [SerializeField] private Toggle settingsPresetToggle4;
    [SerializeField] private Toggle settingsPresetToggle5;
    [SerializeField] private TMP_Text settingsPresetToggleText1;
    [SerializeField] private TMP_Text settingsPresetToggleText2;
    [SerializeField] private TMP_Text settingsPresetToggleText3;
    [SerializeField] private TMP_Text settingsPresetToggleText4;
    [SerializeField] private TMP_Text settingsPresetToggleText5;
    [SerializeField] private TMP_Text settingsPresetFeedbackText;
    [SerializeField] private Toggle autoAssignNonRefundableToggle;

    [Header("Preset Automation (Tab Overrides)")]
    [SerializeField] private PresetAutomationReferences botsPresetAutomation;
    [SerializeField] private PresetAutomationReferences researchPresetAutomation;
    [SerializeField, Tooltip("Optional: bottom bar (or other) button that opens the Bots tab. When clicked, preset automation will apply the Bots tab override, same as SidePanelReferences.botsTabButton.")]
    private Button botsBottomBarTabButton;
    [SerializeField, Tooltip("Optional: bottom bar (or other) button that opens the Research tab. When clicked, preset automation will apply the Research tab override, same as SidePanelReferences.researchTabButton.")]
    private Button researchBottomBarTabButton;

    private PresetToggleBindings _permanentBindings;
    private PresetToggleBindings _temporaryBindings;
    private PresetToggleBindings _settingsPanelBindings;
    private AutomationBindings _botsAutomationBindings;
    private AutomationBindings _researchAutomationBindings;
    private bool _suppressToggleCallbacks;
    private Coroutine _permanentFeedbackRoutine;
    private Coroutine _temporaryFeedbackRoutine;
    private Coroutine _settingsFeedbackRoutine;
    private Coroutine _feedbackRoutine;
    private Coroutine _presetInitRoutine;
    private Coroutine _toggleBindingInitRoutine;
    private string _defaultFeedbackMessage;
    private int _currentPresetIndex = 1;
    private const float FeedbackResetSeconds = 2f;
    private bool _initialAutomationApplied;
    private readonly HashSet<Button> _registeredBotsTabButtons = new HashSet<Button>();
    private readonly HashSet<Button> _registeredResearchTabButtons = new HashSet<Button>();
    private UnityAction _botsTabClickHandler;
    private UnityAction _researchTabClickHandler;
    private UnityAction<bool> _autoAssignNonRefundableToggleHandler;

    private void Start()
    {
        if (feedbackMessage != null)
            _defaultFeedbackMessage = feedbackMessage.text;

        StartPresetTextInitialization();

        WirePresetClipboardButtons(preset1Export, preset1Import, 1);
        WirePresetClipboardButtons(preset2Export, preset2Import, 2);
        WirePresetClipboardButtons(preset3Export, preset3Import, 3);
        WirePresetClipboardButtons(preset4Export, preset4Import, 4);
        WirePresetClipboardButtons(preset5Export, preset5Import, 5);

        resetSkills.onClick.AddListener(() => SetFeedbackText("Skill Tree Reset"));

        WirePresetSetButton(preset1Set, 1);
        WirePresetSetButton(preset2Set, 2);
        WirePresetSetButton(preset3Set, 3);
        WirePresetSetButton(preset4Set, 4);
        WirePresetSetButton(preset5Set, 5);
    }

    private void OnEnable()
    {
        UpdateSkills += HandleUpdateSkills;
        StartPresetTextInitialization();
        if (_toggleBindingInitRoutine != null)
        {
            StopCoroutine(_toggleBindingInitRoutine);
            _toggleBindingInitRoutine = null;
        }
        _toggleBindingInitRoutine = StartCoroutine(InitializePresetToggleBindings());
    }

    private void OnDisable()
    {
        UpdateSkills -= HandleUpdateSkills;
        if (_presetInitRoutine != null)
        {
            StopCoroutine(_presetInitRoutine);
            _presetInitRoutine = null;
        }
        UnregisterPresetToggleBindings(ref _permanentBindings);
        UnregisterPresetToggleBindings(ref _temporaryBindings);
        UnregisterPresetToggleBindings(ref _settingsPanelBindings);
        UnregisterAutomationBindings(ref _botsAutomationBindings);
        UnregisterAutomationBindings(ref _researchAutomationBindings);
        UnregisterTabButtonBindings();
        if (_settingsFeedbackRoutine != null)
        {
            StopCoroutine(_settingsFeedbackRoutine);
            _settingsFeedbackRoutine = null;
        }
        if (_toggleBindingInitRoutine != null)
        {
            StopCoroutine(_toggleBindingInitRoutine);
            _toggleBindingInitRoutine = null;
        }
        UnbindAutoAssignNonRefundableToggle();
    }

    private void HandleUpdateSkills()
    {
        if (!TryGetSaveData(out _)) return;
        SetPresetTexts();
    }

    private void StartPresetTextInitialization()
    {
        if (_presetInitRoutine != null)
        {
            StopCoroutine(_presetInitRoutine);
        }

        _presetInitRoutine = StartCoroutine(WaitForSaveThenSetPresetTexts());
    }

    private IEnumerator WaitForSaveThenSetPresetTexts()
    {
        while (!TryGetSaveData(out _))
        {
            yield return null;
        }

        SetPresetTexts();
        _presetInitRoutine = null;
    }
    
    private IEnumerator InitializePresetToggleBindings()
    {
        // Wait until Oracle has loaded/created save settings and save data.
        DysonVerseSaveData saveData;
        while (!TryGetSaveData(out saveData) || !TryGetSettings(out _))
            yield return null;

        _currentPresetIndex = Mathf.Clamp(saveData.selectedPreset, 1, 5);

        RegisterPresetToggleBindings(permanentSidePanel, ref _permanentBindings);
        RegisterPresetToggleBindings(temporarySidePanel, ref _temporaryBindings);
        RegisterPresetToggleBindings(settingsPresetToggle1, settingsPresetToggle2, settingsPresetToggle3,
            settingsPresetToggle4, settingsPresetToggle5,
            settingsPresetToggleText1, settingsPresetToggleText2, settingsPresetToggleText3, settingsPresetToggleText4,
            settingsPresetToggleText5, settingsPresetFeedbackText, ref _settingsPanelBindings);
        BindAutoAssignNonRefundableToggle();
        UpdateSidePanelPresetLabels();

        RegisterAutomationBindings(
            botsPresetAutomation,
            s => s.botsTabPresetOverride,
            (s, v) => s.botsTabPresetOverride = v,
            ref _botsAutomationBindings);
        RegisterAutomationBindings(
            researchPresetAutomation,
            s => s.researchTabPresetOverride,
            (s, v) => s.researchTabPresetOverride = v,
            ref _researchAutomationBindings);
        UpdateAutomationPresetLabels(saveData);
        SyncAutomationUiToSavedOverrides();
        RegisterTabButtonBindings();

        // Apply any initial-screen automation after bindings exist and Oracle has finished loading.
        yield return null;
        TryApplyInitialTabAutomation();
        _toggleBindingInitRoutine = null;
    }

    public void SetPresetTexts()
    {
        preset1Text.text = string.IsNullOrEmpty(oracle.saveSettings.dysonVerseSaveData.preset1Name)
            ? "Preset 1"
            : oracle.saveSettings.dysonVerseSaveData.preset1Name;
        preset2Text.text = string.IsNullOrEmpty(oracle.saveSettings.dysonVerseSaveData.preset2Name)
            ? "Preset 2"
            : oracle.saveSettings.dysonVerseSaveData.preset2Name;
        preset3Text.text = string.IsNullOrEmpty(oracle.saveSettings.dysonVerseSaveData.preset3Name)
            ? "Preset 3"
            : oracle.saveSettings.dysonVerseSaveData.preset3Name;
        preset4Text.text = string.IsNullOrEmpty(oracle.saveSettings.dysonVerseSaveData.preset4Name)
            ? "Preset 4"
            : oracle.saveSettings.dysonVerseSaveData.preset4Name;
        preset5Text.text = string.IsNullOrEmpty(oracle.saveSettings.dysonVerseSaveData.preset5Name)
            ? "Preset 5"
            : oracle.saveSettings.dysonVerseSaveData.preset5Name;

        UpdateSidePanelPresetLabels();
        if (TryGetSaveData(out DysonVerseSaveData saveData))
            UpdateAutomationPresetLabels(saveData);
        SyncAutomationUiToSavedOverrides();
        SyncAutoAssignNonRefundableToggleFromSettings();
    }

    public void RenamePreset(int preset)
    {
        switch (preset)
        {
            case 1:
                oracle.saveSettings.dysonVerseSaveData.preset1Name = rename1.text;
                SetPresetTexts();
                break;
            case 2:
                oracle.saveSettings.dysonVerseSaveData.preset2Name = rename2.text;
                SetPresetTexts();
                break;
            case 3:
                oracle.saveSettings.dysonVerseSaveData.preset3Name = rename3.text;
                SetPresetTexts();
                break;
            case 4:
                oracle.saveSettings.dysonVerseSaveData.preset4Name = rename4.text;
                SetPresetTexts();
                break;
            case 5:
                oracle.saveSettings.dysonVerseSaveData.preset5Name = rename5.text;
                SetPresetTexts();
                break;
        }
    }

    private void SavePreset(int presetSlot)
    {
        oracle.SaveList(presetSlot);
        oracle.InvokeUpdateSkills();
        if (TryGetSaveData(out DysonVerseSaveData saveData))
        {
            _currentPresetIndex = presetSlot;
            saveData.selectedPreset = presetSlot;
        }
        SyncSidePanelsToPreset(presetSlot);
        UpdateSidePanelPresetLabels();
    }

    private void LoadPreset(int presetSlot)
    {
        if (!TryGetSaveData(out DysonVerseSaveData saveData)) return;

        if (presetSlot != _currentPresetIndex && _currentPresetIndex > 0)
        {
            oracle.SaveList(_currentPresetIndex);
        }

        _currentPresetIndex = presetSlot;
        saveData.selectedPreset = presetSlot;

        // Switching presets temporarily clears the live auto-assign list; suppress preset syncing
        // during that reset/load to avoid accidentally overwriting a slot with an empty list.
        using (oracle.SuppressPresetSync())
        {
            _skillTreeManager.ResetSkills();
            oracle.LoadList(presetSlot);
            oracle.InvokeUpdateSkills();
        }

        _gameManager.AutoAssignSkillsInvoke();
        SyncSidePanelsToPreset(presetSlot);
        UpdateSidePanelPresetLabels();
    }

    private void SetFeedbackText(string text)
    {
        feedbackMessage.text = text;
        feedbackMessage.gameObject.SetActive(true);
    }

    private void WirePresetSetButton(Button button, int presetIndex)
    {
        if (button == null) return;
        button.onClick.AddListener(() => RenamePreset(presetIndex));
    }

    private void WirePresetClipboardButtons(Button exportButton, Button importButton, int presetIndex)
    {
        if (exportButton != null)
            exportButton.onClick.AddListener(() => ExportPresetToClipboard(presetIndex));
        if (importButton != null)
            importButton.onClick.AddListener(() => ImportPresetFromClipboard(presetIndex));
    }

    private void ExportPresetToClipboard(int presetIndex)
    {
        if (!TryGetSaveData(out DysonVerseSaveData saveData)) return;

        // If exporting the active preset, prefer the live list (what the player just edited)
        // even if they haven't swapped presets yet.
        string[] exportedSkillIds = presetIndex == _currentPresetIndex
            ? oracle.GetAutoAssignmentSkillIds().ToArray()
            : oracle.GetPresetAutoAssignmentSkillIds(presetIndex).ToArray();

        SkillPresetClipboard payload = new SkillPresetClipboard
        {
            version = 1,
            presetName = GetPresetName(saveData, presetIndex),
            botDistribution = GetPresetBotDistribution(saveData, presetIndex),
            skillIds = exportedSkillIds
        };

        GUIUtility.systemCopyBuffer = JsonUtility.ToJson(payload);
        string presetName = GetPresetDisplayName(saveData, presetIndex);
        ShowTimedFeedback($"{presetName} Exported");
    }

    private void ImportPresetFromClipboard(int presetIndex)
    {
        if (!TryGetSaveData(out DysonVerseSaveData saveData)) return;

        string clipboard = GUIUtility.systemCopyBuffer;
        if (string.IsNullOrWhiteSpace(clipboard))
        {
            SetFeedbackText("Clipboard Empty");
            return;
        }

        SkillPresetClipboard payload;
        try
        {
            payload = JsonUtility.FromJson<SkillPresetClipboard>(clipboard);
        }
        catch (Exception)
        {
            SetFeedbackText("Invalid Preset Data");
            return;
        }

        if (payload == null || payload.skillIds == null)
        {
            SetFeedbackText("Invalid Preset Data");
            return;
        }

        if (payload.version > 1)
        {
            SetFeedbackText("Unsupported Preset Version");
            return;
        }

        SetPresetName(saveData, presetIndex, payload.presetName);
        SetPresetBotDistribution(saveData, presetIndex, payload.botDistribution);

        var dedupedIds = new List<string>(payload.skillIds.Length);
        var seen = new HashSet<string>();
        foreach (string id in payload.skillIds)
        {
            if (string.IsNullOrEmpty(id)) continue;
            if (!seen.Add(id)) continue;
            dedupedIds.Add(id);
        }
        List<string> normalizedIds = SkillAutoAssignOrderUtility.BuildDependencySafeOrder(dedupedIds);
        oracle.SetPresetAutoAssignmentSkillIds(presetIndex, normalizedIds);

        SetPresetTexts();
        UpdateSidePanelPresetLabels();

        if (presetIndex == _currentPresetIndex)
        {
            LoadPreset(presetIndex);
        }

        string presetName = GetPresetDisplayName(saveData, presetIndex);
        ShowTimedFeedback($"{presetName} Imported");
    }

    private void RegisterPresetToggleBindings(SidePanelReferences panel, ref PresetToggleBindings bindings)
    {
        if (panel == null) return;

        Toggle[] toggles = GetPresetToggles(panel);
        TMP_Text[] texts = GetPresetTexts(panel);
        RegisterPresetToggleBindings(toggles, texts, panel, null, ref bindings);
    }

    private void RegisterPresetToggleBindings(
        Toggle toggle1,
        Toggle toggle2,
        Toggle toggle3,
        Toggle toggle4,
        Toggle toggle5,
        TMP_Text text1,
        TMP_Text text2,
        TMP_Text text3,
        TMP_Text text4,
        TMP_Text text5,
        TMP_Text feedbackText,
        ref PresetToggleBindings bindings)
    {
        Toggle[] toggles = new[] { toggle1, toggle2, toggle3, toggle4, toggle5 };
        TMP_Text[] texts = new[] { text1, text2, text3, text4, text5 };
        RegisterPresetToggleBindings(toggles, texts, null, feedbackText, ref bindings);
    }

    private void RegisterPresetToggleBindings(
        Toggle[] toggles,
        TMP_Text[] texts,
        SidePanelReferences feedbackPanel,
        TMP_Text feedbackTextOverride,
        ref PresetToggleBindings bindings)
    {
        if (toggles == null || texts == null) return;
        UnityAction<bool>[] handlers = new UnityAction<bool>[toggles.Length];

        for (int i = 0; i < toggles.Length; i++)
        {
            Toggle toggle = toggles[i];
            if (toggle == null) continue;
            int presetIndex = i + 1;
            UnityAction<bool> handler = isOn =>
            {
                if (_suppressToggleCallbacks) return;
                if (isOn)
                {
                    ApplyPresetSelection(toggles, texts, presetIndex, true, feedbackPanel, feedbackTextOverride);
                    return;
                }

                if (presetIndex != _currentPresetIndex) return;
                if (AnyToggleOn(toggles)) return;
                ReloadPresetSelection(toggles, texts, presetIndex, feedbackPanel, feedbackTextOverride);
            };
            toggle.onValueChanged.AddListener(handler);
            handlers[i] = handler;
        }

        bindings = new PresetToggleBindings(toggles, texts, handlers);
        SyncInitialPresetSelection(toggles, texts);
    }

    private void UnregisterPresetToggleBindings(ref PresetToggleBindings bindings)
    {
        if (bindings == null) return;

        for (int i = 0; i < bindings.Toggles.Length; i++)
        {
            Toggle toggle = bindings.Toggles[i];
            UnityAction<bool> handler = bindings.Handlers[i];
            if (toggle == null || handler == null) continue;
            toggle.onValueChanged.RemoveListener(handler);
        }

        bindings = null;
    }

    private void SyncInitialPresetSelection(Toggle[] toggles, TMP_Text[] texts)
    {
        int selectedIndex = -1;
        for (int i = 0; i < toggles.Length; i++)
        {
            if (toggles[i] != null && toggles[i].isOn)
            {
                selectedIndex = i + 1;
                break;
            }
        }

        if (selectedIndex <= 0)
        {
            selectedIndex = _currentPresetIndex;
        }

        if (selectedIndex > 0)
        {
            ApplyPresetSelection(toggles, texts, selectedIndex, loadPreset: false);
        }
        else
        {
            UpdatePresetTextVisibility(texts, selectedIndex: -1);
        }
    }

    private void ApplyPresetSelection(
        Toggle[] toggles,
        TMP_Text[] texts,
        int presetIndex,
        bool loadPreset,
        SidePanelReferences feedbackPanel = null,
        TMP_Text feedbackTextOverride = null)
    {
        if (toggles == null || texts == null) return;
        int count = Mathf.Min(toggles.Length, texts.Length);
        if (loadPreset && presetIndex != _currentPresetIndex && _currentPresetIndex > 0)
        {
            oracle.SaveList(_currentPresetIndex);
        }

        _suppressToggleCallbacks = true;
        for (int i = 0; i < count; i++)
        {
            if (toggles[i] == null) continue;
            toggles[i].isOn = i + 1 == presetIndex;
        }
        _suppressToggleCallbacks = false;

        UpdatePresetTextVisibility(texts, presetIndex);

        if (loadPreset)
        {
            LoadPreset(presetIndex);
            ShowPresetSelectionFeedback(feedbackPanel, feedbackTextOverride, BuildPresetFeedback(presetIndex, loaded: true));
        }
        else
        {
            _currentPresetIndex = presetIndex;
            if (TryGetSaveData(out DysonVerseSaveData saveData))
                saveData.selectedPreset = presetIndex;
        }
    }

    private void ReloadPresetSelection(
        Toggle[] toggles,
        TMP_Text[] texts,
        int presetIndex,
        SidePanelReferences feedbackPanel = null,
        TMP_Text feedbackTextOverride = null)
    {
        if (toggles == null || texts == null) return;
        int count = Mathf.Min(toggles.Length, texts.Length);

        _suppressToggleCallbacks = true;
        for (int i = 0; i < count; i++)
        {
            if (toggles[i] == null) continue;
            toggles[i].isOn = i + 1 == presetIndex;
        }
        _suppressToggleCallbacks = false;

        UpdatePresetTextVisibility(texts, presetIndex);
        LoadPreset(presetIndex);
        ShowPresetSelectionFeedback(feedbackPanel, feedbackTextOverride, BuildPresetFeedback(presetIndex, loaded: false));
    }

    private static bool AnyToggleOn(Toggle[] toggles)
    {
        if (toggles == null) return false;
        for (int i = 0; i < toggles.Length; i++)
        {
            if (toggles[i] != null && toggles[i].isOn) return true;
        }

        return false;
    }

    private static void UpdatePresetTextVisibility(TMP_Text[] texts, int selectedIndex)
    {
        for (int i = 0; i < texts.Length; i++)
        {
            TMP_Text textObject = texts[i];
            if (textObject == null) continue;
            textObject.gameObject.SetActive(i + 1 != selectedIndex);
        }
    }

    private static Toggle[] GetPresetToggles(SidePanelReferences panel)
    {
        return new[]
        {
            panel.skillsPresetToggle1,
            panel.skillsPresetToggle2,
            panel.skillsPresetToggle3,
            panel.skillsPresetToggle4,
            panel.skillsPresetToggle5
        };
    }

    private static TMP_Text[] GetPresetTexts(SidePanelReferences panel)
    {
        return new[]
        {
            panel.skillsPresetToggleText1,
            panel.skillsPresetToggleText2,
            panel.skillsPresetToggleText3,
            panel.skillsPresetToggleText4,
            panel.skillsPresetToggleText5
        };
    }

    private Toggle[] GetSettingsPresetToggles()
    {
        return new[]
        {
            settingsPresetToggle1,
            settingsPresetToggle2,
            settingsPresetToggle3,
            settingsPresetToggle4,
            settingsPresetToggle5
        };
    }

    private TMP_Text[] GetSettingsPresetTexts()
    {
        return new[]
        {
            settingsPresetToggleText1,
            settingsPresetToggleText2,
            settingsPresetToggleText3,
            settingsPresetToggleText4,
            settingsPresetToggleText5
        };
    }

    private void UpdateSidePanelPresetLabels()
    {
        if (!TryGetSaveData(out DysonVerseSaveData saveData)) return;

        UpdateSidePanelPresetLabels(permanentSidePanel, saveData);
        UpdateSidePanelPresetLabels(temporarySidePanel, saveData);
        UpdateSidePanelPresetLabels(GetSettingsPresetToggles(), GetSettingsPresetTexts(), saveData);
    }

    private void UpdateAutomationPresetLabels(DysonVerseSaveData saveData)
    {
        UpdateAutomationPresetLabels(botsPresetAutomation, saveData);
        UpdateAutomationPresetLabels(researchPresetAutomation, saveData);
    }

    private void SyncAutomationUiToSavedOverrides()
    {
        if (!TryGetSettings(out SaveDataSettings settings)) return;

        if (botsPresetAutomation != null)
            SyncAutomationSelection(GetAutomationToggles(botsPresetAutomation), GetAutomationLabels(botsPresetAutomation),
                Mathf.Clamp(settings.botsTabPresetOverride, 0, 5));
        if (researchPresetAutomation != null)
            SyncAutomationSelection(GetAutomationToggles(researchPresetAutomation), GetAutomationLabels(researchPresetAutomation),
                Mathf.Clamp(settings.researchTabPresetOverride, 0, 5));
    }

    private static void UpdateAutomationPresetLabels(PresetAutomationReferences refs, DysonVerseSaveData saveData)
    {
        if (refs == null || saveData == null) return;
        if (refs.presetLabel1 != null) refs.presetLabel1.text = GetPresetShortLabel(saveData, 1);
        if (refs.presetLabel2 != null) refs.presetLabel2.text = GetPresetShortLabel(saveData, 2);
        if (refs.presetLabel3 != null) refs.presetLabel3.text = GetPresetShortLabel(saveData, 3);
        if (refs.presetLabel4 != null) refs.presetLabel4.text = GetPresetShortLabel(saveData, 4);
        if (refs.presetLabel5 != null) refs.presetLabel5.text = GetPresetShortLabel(saveData, 5);
        // Off label text is authored in the prefab; code only hides/shows it.
    }

    private static void UpdateSidePanelPresetLabels(SidePanelReferences panel, DysonVerseSaveData saveData)
    {
        if (panel == null) return;

        TMP_Text[] textObjects = GetPresetTexts(panel);
        for (int i = 0; i < textObjects.Length; i++)
        {
            TMP_Text text = textObjects[i];
            if (text == null) continue;
            text.text = GetPresetShortLabel(saveData, i + 1);
        }
    }

    private static void UpdateSidePanelPresetLabels(Toggle[] toggles, TMP_Text[] texts, DysonVerseSaveData saveData)
    {
        if (texts == null || saveData == null) return;

        int textCount = Mathf.Min(toggles != null ? toggles.Length : 0, texts.Length);
        for (int i = 0; i < textCount; i++)
        {
            TMP_Text text = texts[i];
            if (text == null) continue;
            text.text = GetPresetShortLabel(saveData, i + 1);
        }
    }

    private static string GetPresetShortLabel(DysonVerseSaveData saveData, int presetIndex)
    {
        string presetName = presetIndex switch
        {
            1 => saveData.preset1Name,
            2 => saveData.preset2Name,
            3 => saveData.preset3Name,
            4 => saveData.preset4Name,
            5 => saveData.preset5Name,
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(presetName))
        {
            return presetIndex.ToString();
        }

        string trimmed = presetName.Trim();
        if (string.Equals(trimmed, $"Preset {presetIndex}", System.StringComparison.OrdinalIgnoreCase))
        {
            return presetIndex.ToString();
        }
        int length = Mathf.Min(2, trimmed.Length);
        return trimmed.Substring(0, length);
    }

    private static string GetPresetName(DysonVerseSaveData saveData, int presetIndex)
    {
        return presetIndex switch
        {
            1 => saveData.preset1Name,
            2 => saveData.preset2Name,
            3 => saveData.preset3Name,
            4 => saveData.preset4Name,
            5 => saveData.preset5Name,
            _ => string.Empty
        };
    }

    private static string GetPresetDisplayName(DysonVerseSaveData saveData, int presetIndex)
    {
        string name = GetPresetName(saveData, presetIndex);
        return string.IsNullOrWhiteSpace(name) ? $"Preset {presetIndex}" : name.Trim();
    }

    private static void SetPresetName(DysonVerseSaveData saveData, int presetIndex, string name)
    {
        switch (presetIndex)
        {
            case 1:
                saveData.preset1Name = name;
                break;
            case 2:
                saveData.preset2Name = name;
                break;
            case 3:
                saveData.preset3Name = name;
                break;
            case 4:
                saveData.preset4Name = name;
                break;
            case 5:
                saveData.preset5Name = name;
                break;
        }
    }

    private static double GetPresetBotDistribution(DysonVerseSaveData saveData, int presetIndex)
    {
        return presetIndex switch
        {
            1 => saveData.botDistPreset1,
            2 => saveData.botDistPreset2,
            3 => saveData.botDistPreset3,
            4 => saveData.botDistPreset4,
            5 => saveData.botDistPreset5,
            _ => 0d
        };
    }

    private static void SetPresetBotDistribution(DysonVerseSaveData saveData, int presetIndex, double value)
    {
        if (double.IsNaN(value) || double.IsInfinity(value)) value = 0d;
        value = Math.Max(0d, Math.Min(1d, value));
        switch (presetIndex)
        {
            case 1:
                saveData.botDistPreset1 = value;
                break;
            case 2:
                saveData.botDistPreset2 = value;
                break;
            case 3:
                saveData.botDistPreset3 = value;
                break;
            case 4:
                saveData.botDistPreset4 = value;
                break;
            case 5:
                saveData.botDistPreset5 = value;
                break;
        }
    }

    private void SyncSidePanelsToPreset(int presetIndex)
    {
        SyncSidePanelToPreset(permanentSidePanel, presetIndex);
        SyncSidePanelToPreset(temporarySidePanel, presetIndex);
        SyncSidePanelToPreset(GetSettingsPresetToggles(), GetSettingsPresetTexts(), presetIndex);
    }

    private void SyncSidePanelToPreset(SidePanelReferences panel, int presetIndex)
    {
        if (panel == null) return;
        SyncSidePanelToPreset(GetPresetToggles(panel), GetPresetTexts(panel), presetIndex);
    }

    private void SyncSidePanelToPreset(Toggle[] toggles, TMP_Text[] texts, int presetIndex)
    {
        if (toggles == null || texts == null) return;
        int count = Mathf.Min(toggles.Length, texts.Length);

        _suppressToggleCallbacks = true;
        for (int i = 0; i < count; i++)
        {
            if (toggles[i] == null) continue;
            toggles[i].isOn = i + 1 == presetIndex;
        }
        _suppressToggleCallbacks = false;

        UpdatePresetTextVisibility(texts, presetIndex);
    }

    [Serializable]
    private sealed class SkillPresetClipboard
    {
        public int version;
        public string presetName;
        public double botDistribution;
        public string[] skillIds;
    }

    private sealed class PresetToggleBindings
    {
        public PresetToggleBindings(
            Toggle[] toggles,
            TMP_Text[] texts,
            UnityAction<bool>[] handlers)
        {
            Toggles = toggles;
            Texts = texts;
            Handlers = handlers;
        }

        public Toggle[] Toggles { get; }
        public TMP_Text[] Texts { get; }
        public UnityAction<bool>[] Handlers { get; }
    }

    private static bool TryGetSaveData(out DysonVerseSaveData saveData)
    {
        saveData = oracle?.saveSettings?.dysonVerseSaveData;
        return saveData != null;
    }

    private static bool TryGetSettings(out SaveDataSettings settings)
    {
        settings = oracle?.saveSettings;
        return settings != null;
    }

    /// <summary>
    /// Wires the optional toggle that controls whether auto-assign can spend non-refundable skills.
    /// </summary>
    private void BindAutoAssignNonRefundableToggle()
    {
        if (autoAssignNonRefundableToggle == null) return;
        UnbindAutoAssignNonRefundableToggle();
        SyncAutoAssignNonRefundableToggleFromSettings();

        _autoAssignNonRefundableToggleHandler = isOn =>
        {
            if (_suppressToggleCallbacks) return;
            if (!TryGetSettings(out SaveDataSettings settings)) return;
            settings.autoAssignNonRefundableSkills = isOn;
            ShowTimedFeedback(isOn
                ? "Auto-Assign Non-Refundables Enabled"
                : "Auto-Assign Non-Refundables Disabled");
        };

        autoAssignNonRefundableToggle.onValueChanged.AddListener(_autoAssignNonRefundableToggleHandler);
    }

    /// <summary>
    /// Removes runtime listener for the optional non-refundable auto-assign toggle.
    /// </summary>
    private void UnbindAutoAssignNonRefundableToggle()
    {
        if (autoAssignNonRefundableToggle == null || _autoAssignNonRefundableToggleHandler == null) return;
        autoAssignNonRefundableToggle.onValueChanged.RemoveListener(_autoAssignNonRefundableToggleHandler);
        _autoAssignNonRefundableToggleHandler = null;
    }

    /// <summary>
    /// Applies current save value to the optional non-refundable auto-assign toggle.
    /// </summary>
    private void SyncAutoAssignNonRefundableToggleFromSettings()
    {
        if (autoAssignNonRefundableToggle == null) return;
        if (!TryGetSettings(out SaveDataSettings settings)) return;

        _suppressToggleCallbacks = true;
        autoAssignNonRefundableToggle.isOn = settings.autoAssignNonRefundableSkills;
        _suppressToggleCallbacks = false;
    }

    private string BuildPresetFeedback(int presetIndex, bool loaded)
    {
        if (TryGetSaveData(out DysonVerseSaveData saveData))
        {
            string name = GetPresetDisplayName(saveData, presetIndex);
            return loaded ? $"{name} Loaded" : $"{name} Reloaded";
        }

        return loaded ? $"Preset {presetIndex} Loaded" : $"Preset {presetIndex} Reloaded";
    }

    private void RegisterAutomationBindings(
        PresetAutomationReferences refs,
        Func<SaveDataSettings, int> getOverrideValue,
        Action<SaveDataSettings, int> setOverrideValue,
        ref AutomationBindings bindings)
    {
        if (refs == null) return;

        Toggle[] toggles = GetAutomationToggles(refs);
        TMP_Text[] labels = GetAutomationLabels(refs);
        UnityAction<bool>[] handlers = new UnityAction<bool>[toggles.Length];

        for (int i = 0; i < toggles.Length; i++)
        {
            int toggleIndex = i; // capture per-iteration index for the closure
            Toggle toggle = toggles[toggleIndex];
            if (toggle == null) continue;

            int overrideValue = toggleIndex < 5 ? toggleIndex + 1 : 0; // last toggle is Off
            UnityAction<bool> handler = isOn =>
            {
                if (_suppressToggleCallbacks) return;
                if (!TryGetSettings(out SaveDataSettings settings)) return;
                if (!isOn)
                {
                    // Enforce one selected at all times (Off exists to disable).
                    if (!AnyToggleOn(toggles))
                    {
                        _suppressToggleCallbacks = true;
                        toggle.isOn = true;
                        _suppressToggleCallbacks = false;
                    }
                    return;
                }

                _suppressToggleCallbacks = true;
                for (int j = 0; j < toggles.Length; j++)
                {
                    if (toggles[j] == null) continue;
                    toggles[j].isOn = j == toggleIndex;
                }
                _suppressToggleCallbacks = false;

                setOverrideValue(settings, Mathf.Clamp(overrideValue, 0, 5));
                UpdateAutomationTextVisibility(labels, selectedOverrideValue: overrideValue);
            };

            toggle.onValueChanged.AddListener(handler);
            handlers[i] = handler;
        }
        bindings = new AutomationBindings(toggles, labels, handlers);

        // Sync initial selection from saved preference (preferred) or current UI state.
        int initialOverride = 0;
        if (TryGetSettings(out SaveDataSettings settings))
            initialOverride = Mathf.Clamp(getOverrideValue(settings), 0, 5);
        SyncAutomationSelection(toggles, labels, initialOverride);
    }

    private void UnregisterAutomationBindings(ref AutomationBindings bindings)
    {
        if (bindings == null) return;

        for (int i = 0; i < bindings.Toggles.Length; i++)
        {
            Toggle toggle = bindings.Toggles[i];
            UnityAction<bool> handler = bindings.Handlers[i];
            if (toggle == null || handler == null) continue;
            toggle.onValueChanged.RemoveListener(handler);
        }

        bindings = null;
    }

    private void HandleBotsTabOpened()
    {
        HandleAutomationTabOpened(s => s.botsTabPresetOverride);
    }

    private void HandleResearchTabOpened()
    {
        HandleAutomationTabOpened(s => s.researchTabPresetOverride);
    }

    private void HandleAutomationTabOpened(Func<SaveDataSettings, int> getOverrideValue)
    {
        if (!TryGetSaveData(out DysonVerseSaveData saveData)) return;
        if (!TryGetSettings(out SaveDataSettings settings)) return;
        int targetPreset = Mathf.Clamp(getOverrideValue(settings), 0, 5);
        if (targetPreset <= 0) return;
        if (targetPreset == _currentPresetIndex) return;

        LoadPreset(targetPreset);

        string name = GetPresetDisplayName(saveData, targetPreset);
        ShowPresetSelectionFeedback(permanentSidePanel, null, $"{name} Loaded");
        ShowPresetSelectionFeedback(temporarySidePanel, null, $"{name} Loaded");
        ShowPresetSelectionFeedback(null, settingsPresetFeedbackText, $"{name} Loaded");
    }

    private void RegisterTabButtonBindings()
    {
        UnregisterTabButtonBindings();

        _botsTabClickHandler = HandleBotsTabOpened;
        _researchTabClickHandler = HandleResearchTabOpened;

        TryRegisterTabButton(permanentSidePanel != null ? permanentSidePanel.botsTabButton : null, _registeredBotsTabButtons, _botsTabClickHandler);
        TryRegisterTabButton(temporarySidePanel != null ? temporarySidePanel.botsTabButton : null, _registeredBotsTabButtons, _botsTabClickHandler);

        TryRegisterTabButton(permanentSidePanel != null ? permanentSidePanel.researchTabButton : null, _registeredResearchTabButtons, _researchTabClickHandler);
        TryRegisterTabButton(temporarySidePanel != null ? temporarySidePanel.researchTabButton : null, _registeredResearchTabButtons, _researchTabClickHandler);

        // Optional bottom-bar (or other navigation) tab buttons. These mirror the side-panel tab buttons.
        TryRegisterTabButton(botsBottomBarTabButton, _registeredBotsTabButtons, _botsTabClickHandler);
        TryRegisterTabButton(researchBottomBarTabButton, _registeredResearchTabButtons, _researchTabClickHandler);
    }

    private void UnregisterTabButtonBindings()
    {
        foreach (Button button in _registeredBotsTabButtons)
        {
            if (button == null) continue;
            if (_botsTabClickHandler != null) button.onClick.RemoveListener(_botsTabClickHandler);
        }
        _registeredBotsTabButtons.Clear();

        foreach (Button button in _registeredResearchTabButtons)
        {
            if (button == null) continue;
            if (_researchTabClickHandler != null) button.onClick.RemoveListener(_researchTabClickHandler);
        }
        _registeredResearchTabButtons.Clear();
    }

    private static void TryRegisterTabButton(Button button, HashSet<Button> registered, UnityAction handler)
    {
        if (button == null || handler == null) return;
        if (!registered.Add(button)) return; // dedupe (overlay/permanent may point to the same button)
        button.onClick.AddListener(handler);
    }

    private void TryApplyInitialTabAutomation()
    {
        if (_initialAutomationApplied) return;
        if (!TryGetSettings(out SaveDataSettings settings)) return;

        int initialScreen = PlayerPrefs.GetInt("initialScreen", 8);
        int targetPreset = 0;
        if (IsBotsInitialScreen(initialScreen))
            targetPreset = Mathf.Clamp(settings.botsTabPresetOverride, 0, 5);
        else if (IsResearchInitialScreen(initialScreen))
            targetPreset = Mathf.Clamp(settings.researchTabPresetOverride, 0, 5);

        if (targetPreset <= 0) { _initialAutomationApplied = true; return; }

        HandleAutomationTabOpened(_ => targetPreset);
        _initialAutomationApplied = true;
    }

    private static bool IsBotsInitialScreen(int initialScreen) => initialScreen == 1 || initialScreen == 9;
    private static bool IsResearchInitialScreen(int initialScreen) => initialScreen == 2;

    private static Toggle[] GetAutomationToggles(PresetAutomationReferences refs)
    {
        return new[]
        {
            refs.presetToggle1,
            refs.presetToggle2,
            refs.presetToggle3,
            refs.presetToggle4,
            refs.presetToggle5,
            refs.offToggle
        };
    }

    private static TMP_Text[] GetAutomationLabels(PresetAutomationReferences refs)
    {
        return new[]
        {
            refs.presetLabel1,
            refs.presetLabel2,
            refs.presetLabel3,
            refs.presetLabel4,
            refs.presetLabel5,
            refs.offLabel
        };
    }

    private void SyncAutomationSelection(Toggle[] toggles, TMP_Text[] labels, int overrideValue)
    {
        _suppressToggleCallbacks = true;
        for (int i = 0; i < toggles.Length; i++)
        {
            if (toggles[i] == null) continue;
            toggles[i].isOn = (overrideValue == 0 && i == 5) || (overrideValue > 0 && i == overrideValue - 1);
        }
        _suppressToggleCallbacks = false;

        UpdateAutomationTextVisibility(labels, overrideValue);
    }

    private static void UpdateAutomationTextVisibility(TMP_Text[] labels, int selectedOverrideValue)
    {
        // selectedOverrideValue: 1-5 for preset, 0 for off
        for (int i = 0; i < labels.Length; i++)
        {
            TMP_Text label = labels[i];
            if (label == null) continue;
            bool isSelected = (selectedOverrideValue == 0 && i == 5) || (selectedOverrideValue > 0 && i == selectedOverrideValue - 1);
            label.gameObject.SetActive(!isSelected);
        }
    }

    private void ShowPresetSelectionFeedback(SidePanelReferences panel, TMP_Text feedbackTextOverride, string baseText)
    {
        if (feedbackTextOverride != null)
        {
            if (_settingsFeedbackRoutine != null)
            {
                StopCoroutine(_settingsFeedbackRoutine);
            }

            _settingsFeedbackRoutine = StartCoroutine(PlaySidePanelFeedback(feedbackTextOverride, baseText));
            return;
        }

        ShowSidePanelFeedback(panel, baseText);
    }

    private void ShowSidePanelFeedback(SidePanelReferences panel, string baseText)
    {
        if (panel == null || panel.skillsPresetFeedbackText == null) return;

        Coroutine routine;
        if (panel == permanentSidePanel)
            routine = _permanentFeedbackRoutine;
        else if (panel == temporarySidePanel)
            routine = _temporaryFeedbackRoutine;
        else
            routine = null;

        if (routine != null)
        {
            StopCoroutine(routine);
        }

        routine = StartCoroutine(PlaySidePanelFeedback(panel.skillsPresetFeedbackText, baseText));
        if (panel == permanentSidePanel)
            _permanentFeedbackRoutine = routine;
        else if (panel == temporarySidePanel)
            _temporaryFeedbackRoutine = routine;
    }

    private IEnumerator PlaySidePanelFeedback(TMP_Text text, string baseText)
    {
        if (text == null) yield break;

        text.gameObject.SetActive(true);
        text.text = baseText;

        yield return new WaitForSeconds(0.5f);
        text.text = baseText + ".";

        yield return new WaitForSeconds(0.5f);
        text.text = baseText + "..";

        yield return new WaitForSeconds(0.5f);
        text.text = baseText + "...";

        yield return new WaitForSeconds(0.5f);
        text.gameObject.SetActive(false);
    }

    private void ShowTimedFeedback(string text)
    {
        if (feedbackMessage == null) return;

        if (_feedbackRoutine != null)
        {
            StopCoroutine(_feedbackRoutine);
        }

        _feedbackRoutine = StartCoroutine(PlayTimedFeedback(text));
    }

    private IEnumerator PlayTimedFeedback(string text)
    {
        SetFeedbackText(text);

        yield return new WaitForSeconds(FeedbackResetSeconds);

        SetFeedbackText(_defaultFeedbackMessage);
        _feedbackRoutine = null;
    }

    private sealed class AutomationBindings
    {
        public AutomationBindings(
            Toggle[] toggles,
            TMP_Text[] labels,
            UnityAction<bool>[] handlers)
        {
            Toggles = toggles;
            Labels = labels;
            Handlers = handlers;
        }

        public Toggle[] Toggles { get; }
        public TMP_Text[] Labels { get; }
        public UnityAction<bool>[] Handlers { get; }
    }
}
