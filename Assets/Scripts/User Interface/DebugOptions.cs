using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Systems.Debugging;
using Systems.Stats;
using static Expansion.Oracle;

public class DebugOptions : MonoBehaviour
{
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;

    [SerializeField] private Button debugCurrencyButton;

    [SerializeField] private DebugPurchaseHandler debugPurchaseHandler;
    [SerializeField] private TMP_InputField inputField;
    [SerializeField] private Button addBots;
    [SerializeField] private Button addSkills;
    [SerializeField] private Button addInfinityPoints;
    [SerializeField] private Button addQuantum;
    [SerializeField] private Button setSM;
    [SerializeField] private Button offlineTime;

    [SerializeField] private Button unlockTabs;
    [SerializeField] private Button setTinker;
    [SerializeField] private Button setTinker0;

    [Header("Debug Telemetry")]
    [SerializeField] private Button logBreakdowns;
    [SerializeField] private Button runFacilityParity;
    [SerializeField] private Button runOfflineParity;
    [SerializeField] private Button exportLastReport;
    [SerializeField] private Button toggleStatTiming;
    [SerializeField] private TMP_Text statTimingStatusText;

    [SerializeField] private GameManager _gameManager;
    [SerializeField] private SidePanelManager SidePanelManager;


    private void Start()
    {
        addBots.onClick.AddListener(AddBots);
        addSkills.onClick.AddListener(SetSkillPoints);
        unlockTabs.onClick.AddListener(UnlockAllTabs);
        setSM.onClick.AddListener(AddSM);
        addQuantum.onClick.AddListener(AddQuantumShards);
        offlineTime.onClick.AddListener(OfflineSimulator);

        setTinker.onClick.AddListener(SetTinker);
        setTinker0.onClick.AddListener(SetTinkerO);
        addInfinityPoints.onClick.AddListener(AddInfinityPoints);
        debugPurchaseHandler.SetDebugState();
        WireDebugTelemetryButtons();

    }

    private void Update()
    {
        debugCurrencyButton.interactable = oracle.saveSettings.prestigePlus.points >= 100000 &&
                                           oracle.saveSettings.sdPrestige.strangeMatter >= 500000 &&
                                           PlayerPrefs.GetInt("debug", 0) == 0;
    }

    public void AddBots()
    {
        double number;
        if (double.TryParse(inputField.text, out number)) infinityData.bots += number;
    }

    private void SetSkillPoints()
    {
        long number;
        if (long.TryParse(inputField.text, out number)) skillTreeData.skillPointsTree += number;
        _gameManager.AutoAssignSkillsInvoke();
    }

    private void AddInfinityPoints()
    {
        long number;
        if (long.TryParse(inputField.text, out number))
            oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints += number;
    }

    private void AddQuantumShards()
    {
        long number;
        if (long.TryParse(inputField.text, out number)) prestigePlus.points += number;
    }

    private void AddSM()
    {
        long number;
        if (long.TryParse(inputField.text, out number)) sdp.strangeMatter += number;
    }


    private void SetTinker()
    {
        oracle.saveSettings.dysonVerseSaveData.manualCreationTime = 1;
    }

    private void SetTinkerO()
    {
        oracle.saveSettings.dysonVerseSaveData.manualCreationTime = 0;
    }

    public void OfflineSimulator()
    {
        try
        {
            _gameManager.ApplyReturnValues((float)Convert.ToDecimal(inputField.text));
            oracle.saveSettings.sdPrestige.doubleTime += (float)Convert.ToDecimal(inputField.text);
        }
        catch (Exception e)
        {
            Debug.Log(e);
        }
    }

    public void AssignSkills()
    {
        AutoAssign?.Invoke();
        UpdateSkills?.Invoke();
    }

    public void DebugCats()
    {
        Application.OpenURL("https://www.icloud.com/sharedalbum/#B0vG6XBub6hSR6");
    }

    public void UnlockAllTabs()
    {
        oracle.saveSettings.unlockAllTabs = true;
        SidePanelManager.InfinityToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
        SidePanelManager.PrestigeToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
        SidePanelManager.realityToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
        SidePanelManager.simulationsToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
    }

    private void WireDebugTelemetryButtons()
    {
        if (logBreakdowns != null)
            logBreakdowns.onClick.AddListener(() => oracle.DebugLogDataDrivenBreakdowns());
        if (runFacilityParity != null)
            runFacilityParity.onClick.AddListener(() => oracle.DebugRunFacilityParityTests());
        if (runOfflineParity != null)
            runOfflineParity.onClick.AddListener(() => oracle.DebugRunOfflineProgressParity());
        if (exportLastReport != null)
            exportLastReport.onClick.AddListener(ExportDebugReport);
        if (toggleStatTiming != null)
            toggleStatTiming.onClick.AddListener(ToggleStatTimingCapture);

        UpdateStatTimingLabel();
    }

    private void ToggleStatTimingCapture()
    {
        StatTimingTracker.Enabled = !StatTimingTracker.Enabled;
        UpdateStatTimingLabel();
    }

    private void UpdateStatTimingLabel()
    {
        if (statTimingStatusText != null)
        {
            statTimingStatusText.text = $"Stat Timing: {(StatTimingTracker.Enabled ? "On" : "Off")}";
        }
    }

    private void ExportDebugReport()
    {
        string path = DebugReportRecorder.ExportLastReport();
        if (string.IsNullOrEmpty(path))
        {
            Debug.LogWarning("Export failed: no debug report has been recorded yet.");
            return;
        }

        Debug.Log($"Exported debug report to {path}");
    }

    public static event Action AutoAssign;
    public static event Action UpdateSkills;
}
