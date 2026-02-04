using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;
using static Expansion.Oracle;

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

    private PresetToggleBindings _permanentBindings;
    private PresetToggleBindings _temporaryBindings;
    private bool _suppressToggleCallbacks;
    private Coroutine _permanentFeedbackRoutine;
    private Coroutine _temporaryFeedbackRoutine;
    private Coroutine _feedbackRoutine;
    private Coroutine _presetInitRoutine;
    private string _defaultFeedbackMessage;
    private int _currentPresetIndex = 1;
    private const float FeedbackResetSeconds = 2f;

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
        StartCoroutine(InitializePresetToggleBindings());
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
        yield return null;
        if (TryGetSaveData(out DysonVerseSaveData saveData))
            _currentPresetIndex = Mathf.Clamp(saveData.selectedPreset, 1, 5);
        else
            _currentPresetIndex = 1;

        RegisterPresetToggleBindings(permanentSidePanel, ref _permanentBindings);
        RegisterPresetToggleBindings(temporarySidePanel, ref _temporaryBindings);
        UpdateSidePanelPresetLabels();
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

        _skillTreeManager.ResetSkills();
        oracle.LoadList(presetSlot);
        oracle.InvokeUpdateSkills();
        _gameManager.AutoAssignSkillsInvoke();

        _currentPresetIndex = presetSlot;
        saveData.selectedPreset = presetSlot;
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

        SkillPresetClipboard payload = new SkillPresetClipboard
        {
            version = 1,
            presetName = GetPresetName(saveData, presetIndex),
            botDistribution = GetPresetBotDistribution(saveData, presetIndex),
            skillIds = oracle.GetPresetAutoAssignmentSkillIds(presetIndex).ToArray()
        };

        GUIUtility.systemCopyBuffer = JsonUtility.ToJson(payload);
        string presetName = GetPresetDisplayName(saveData, presetIndex);
        ShowTimedFeedback($"Preset {presetName} Exported");
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
        oracle.SetPresetAutoAssignmentSkillIds(presetIndex, dedupedIds);

        SetPresetTexts();
        UpdateSidePanelPresetLabels();

        if (presetIndex == _currentPresetIndex)
        {
            LoadPreset(presetIndex);
        }

        string presetName = GetPresetDisplayName(saveData, presetIndex);
        ShowTimedFeedback($"Preset {presetName} Imported");
    }

    private void RegisterPresetToggleBindings(SidePanelReferences panel, ref PresetToggleBindings bindings)
    {
        if (panel == null) return;

        Toggle[] toggles = GetPresetToggles(panel);
        TMP_Text[] texts = GetPresetTexts(panel);
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
                    ApplyPresetSelection(panel, presetIndex, loadPreset: true);
                    return;
                }

                if (presetIndex != _currentPresetIndex) return;
                if (AnyToggleOn(toggles)) return;
                ReloadPresetSelection(panel, presetIndex);
            };
            toggle.onValueChanged.AddListener(handler);
            handlers[i] = handler;
        }

        bindings = new PresetToggleBindings(panel, toggles, texts, handlers);
        SyncInitialPresetSelection(panel, toggles, texts);
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

    private void SyncInitialPresetSelection(SidePanelReferences panel, Toggle[] toggles, TMP_Text[] texts)
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
            ApplyPresetSelection(panel, selectedIndex, loadPreset: false);
        }
        else
        {
            UpdatePresetTextVisibility(texts, selectedIndex: -1);
        }
    }

    private void ApplyPresetSelection(SidePanelReferences panel, int presetIndex, bool loadPreset)
    {
        Toggle[] toggles = GetPresetToggles(panel);
        TMP_Text[] texts = GetPresetTexts(panel);

        if (loadPreset && presetIndex != _currentPresetIndex && _currentPresetIndex > 0)
        {
            oracle.SaveList(_currentPresetIndex);
        }

        _suppressToggleCallbacks = true;
        for (int i = 0; i < toggles.Length; i++)
        {
            if (toggles[i] == null) continue;
            toggles[i].isOn = i + 1 == presetIndex;
        }
        _suppressToggleCallbacks = false;

        UpdatePresetTextVisibility(texts, presetIndex);

        if (loadPreset)
        {
            LoadPreset(presetIndex);
            ShowSidePanelFeedback(panel, $"Preset {presetIndex} Loaded");
        }
        else
        {
            _currentPresetIndex = presetIndex;
            if (TryGetSaveData(out DysonVerseSaveData saveData))
                saveData.selectedPreset = presetIndex;
        }
    }

    private void ReloadPresetSelection(SidePanelReferences panel, int presetIndex)
    {
        Toggle[] toggles = GetPresetToggles(panel);
        TMP_Text[] texts = GetPresetTexts(panel);

        _suppressToggleCallbacks = true;
        for (int i = 0; i < toggles.Length; i++)
        {
            if (toggles[i] == null) continue;
            toggles[i].isOn = i + 1 == presetIndex;
        }
        _suppressToggleCallbacks = false;

        UpdatePresetTextVisibility(texts, presetIndex);
        LoadPreset(presetIndex);
        ShowSidePanelFeedback(panel, $"Preset {presetIndex} Reloaded");
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

    private void UpdateSidePanelPresetLabels()
    {
        if (!TryGetSaveData(out DysonVerseSaveData saveData)) return;

        UpdateSidePanelPresetLabels(permanentSidePanel, saveData);
        UpdateSidePanelPresetLabels(temporarySidePanel, saveData);
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

    private static float GetPresetBotDistribution(DysonVerseSaveData saveData, int presetIndex)
    {
        return presetIndex switch
        {
            1 => (float)saveData.botDistPreset1,
            2 => (float)saveData.botDistPreset2,
            3 => (float)saveData.botDistPreset3,
            4 => (float)saveData.botDistPreset4,
            5 => (float)saveData.botDistPreset5,
            _ => 0f
        };
    }

    private static void SetPresetBotDistribution(DysonVerseSaveData saveData, int presetIndex, float value)
    {
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
    }

    private void SyncSidePanelToPreset(SidePanelReferences panel, int presetIndex)
    {
        if (panel == null) return;

        Toggle[] toggles = GetPresetToggles(panel);
        TMP_Text[] texts = GetPresetTexts(panel);

        _suppressToggleCallbacks = true;
        for (int i = 0; i < toggles.Length; i++)
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
        public float botDistribution;
        public string[] skillIds;
    }

    private sealed class PresetToggleBindings
    {
        public PresetToggleBindings(
            SidePanelReferences panel,
            Toggle[] toggles,
            TMP_Text[] texts,
            UnityAction<bool>[] handlers)
        {
            Panel = panel;
            Toggles = toggles;
            Texts = texts;
            Handlers = handlers;
        }

        public SidePanelReferences Panel { get; }
        public Toggle[] Toggles { get; }
        public TMP_Text[] Texts { get; }
        public UnityAction<bool>[] Handlers { get; }
    }

    private static bool TryGetSaveData(out DysonVerseSaveData saveData)
    {
        saveData = oracle?.saveSettings?.dysonVerseSaveData;
        return saveData != null;
    }

    private void ShowSidePanelFeedback(SidePanelReferences panel, string baseText)
    {
        if (panel == null || panel.skillsPresetFeedbackText == null) return;

        Coroutine routine = panel == permanentSidePanel ? _permanentFeedbackRoutine : _temporaryFeedbackRoutine;
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
}
