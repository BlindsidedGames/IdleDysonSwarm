using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Systems.Debugging;
using Systems.Stats;
using Systems.Save;
using static Expansion.Oracle;

/*
Purpose (runtime): Debug/dev options panel controller. Owns wiring for debug UI buttons and
gates the dev-options category behind an in-game currency purchase (Quantum Shards + Strange Matter).

Primary entry points:
- Unity: OnEnable/OnDisable (subscribe to debug option change), Start (wire button listeners), Update (refresh unlock button state).
- UI: debug currency button click -> AttemptPurchaseDevOptionsWithCurrency().

Interacts with:
- Expansion.Oracle (saveSettings, DebugOptionsChanged event, NotifyDebugOptionsChanged()).
- Systems.Save.PlayerEntitlementsStore (debug entitlement persistence across soft wipes).
- Systems.Stats.StatTimingTracker and Systems.Debugging.DebugReportRecorder for telemetry buttons.

Change notes:
- The "dev unlock" purchase MUST deduct resources before setting saveSettings.debugOptions / entitlement.
- If you change currency fields (prestigePlus.points, sdPrestige.strangeMatter) or costs, update both the afford check and any UI text that references the price.
*/
public class DebugOptions : MonoBehaviour
{
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;

    // Dev options purchase cost (in-game currency).
    private const long DevOptionsQuantumShardCost = 100_000;
    private const long DevOptionsStrangeMatterCost = 500_000;

    [Header("Dev Unlock")]
    [SerializeField] private Button debugCurrencyButton;
    [SerializeField] private TMP_Text debugCurrencyButtonText;
    [SerializeField] private GameObject debugCategory;
    [SerializeField] private GameObject purchaseCategory;
    [Tooltip("Optional: if this component is moved to a different place in the hierarchy, set this to the debug UI root so auto-find still works.")]
    [SerializeField] private Transform debugUiRoot;

    [Header("Dev Tools")]
    [SerializeField] private Button recalculateSkillPointsButton;
    [SerializeField] private Button disableDebugButton;

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

    private void OnEnable()
    {
        DebugOptionsChanged += HandleDebugOptionsChanged;
        EnsureDebugCategoryReferences();
        RefreshDebugUnlockUi();
    }

    private void OnDisable()
    {
        DebugOptionsChanged -= HandleDebugOptionsChanged;
    }

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
        if (debugCurrencyButton != null)
            debugCurrencyButton.onClick.AddListener(AttemptPurchaseDevOptionsWithCurrency);
        if (debugCurrencyButtonText == null && debugCurrencyButton != null)
            debugCurrencyButtonText = debugCurrencyButton.GetComponentInChildren<TMP_Text>(includeInactive: true);
        if (recalculateSkillPointsButton != null)
            recalculateSkillPointsButton.onClick.AddListener(RecalculateSkillPoints);
        if (disableDebugButton != null)
            disableDebugButton.onClick.AddListener(DisableDebugOptions);
        WireDebugTelemetryButtons();
        EnsureDebugCategoryReferences();
        RefreshDebugUnlockUi();

    }

    private void Update()
    {
        RefreshDevUnlockButtonState();
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

    private void AttemptPurchaseDevOptionsWithCurrency()
    {
        if (oracle == null || oracle.saveSettings == null) return;
        if (oracle.saveSettings.debugOptions) return;

        // If the entitlement already exists, this is just an "Enable Debug" action.
        if (PlayerEntitlementsStore.DebugEntitlementPurchased)
        {
            oracle.saveSettings.debugOptions = true;
            oracle.saveSettings.debugEverEnabled = true;
            NotifyDebugOptionsChanged();
            RefreshDebugUnlockUi();
            RefreshDevUnlockButtonState();
            return;
        }

        long quantumShards = oracle.saveSettings.prestigePlus.points;
        long strangeMatter = oracle.saveSettings.sdPrestige.strangeMatter;

        bool canAfford = quantumShards >= DevOptionsQuantumShardCost && strangeMatter >= DevOptionsStrangeMatterCost;
        if (!canAfford)
        {
            // Keep this as a warning rather than a UI popup: this is a debug/dev panel.
            Debug.LogWarning(
                $"Cannot unlock dev options: requires {DevOptionsQuantumShardCost} Quantum Shards and {DevOptionsStrangeMatterCost} Strange Matter. " +
                $"You have {quantumShards} Quantum Shards and {strangeMatter} Strange Matter.");
            RefreshDevUnlockButtonState();
            return;
        }

        oracle.saveSettings.prestigePlus.points -= DevOptionsQuantumShardCost;
        oracle.saveSettings.sdPrestige.strangeMatter -= DevOptionsStrangeMatterCost;

        PlayerEntitlementsStore.DebugEntitlementPurchased = true;
        oracle.saveSettings.debugOptions = true;
        oracle.saveSettings.debugEverEnabled = true;

        NotifyDebugOptionsChanged();
        RefreshDebugUnlockUi();
        RefreshDevUnlockButtonState();
    }

    private void HandleDebugOptionsChanged()
    {
        RefreshDebugUnlockUi();
    }

    private void EnsureDebugCategoryReferences()
    {
        Transform root = debugUiRoot != null ? debugUiRoot : transform;
        if (debugCategory == null)
            debugCategory = root.Find("Buyables/Scroll View/Viewport/Content/Debug")?.gameObject;
        if (purchaseCategory == null)
            purchaseCategory = root.Find("Buyables/Scroll View/Viewport/Content/Purchase")?.gameObject;
    }

    private void RefreshDebugUnlockUi()
    {
        if (oracle == null || oracle.saveSettings == null) return;
        EnsureDebugCategoryReferences();

        bool unlocked = oracle.saveSettings.debugOptions;
        if (debugCategory != null) debugCategory.SetActive(unlocked);
        else Debug.LogWarning("[DebugOptions] debugCategory reference missing; cannot toggle debug UI. Assign it in the inspector or set debugUiRoot.");

        if (purchaseCategory != null) purchaseCategory.SetActive(!unlocked);
        else Debug.LogWarning("[DebugOptions] purchaseCategory reference missing; cannot toggle purchase UI. Assign it in the inspector or set debugUiRoot.");
    }

    private void RefreshDevUnlockButtonState()
    {
        if (debugCurrencyButton == null) return;
        if (oracle == null || oracle.saveSettings == null)
        {
            debugCurrencyButton.interactable = false;
            RefreshDevUnlockButtonText(isUnlocked: false, isEntitled: false);
            return;
        }

        bool unlocked = oracle.saveSettings.debugOptions;
        if (unlocked)
        {
            debugCurrencyButton.interactable = false;
            RefreshDevUnlockButtonText(isUnlocked: true, isEntitled: PlayerEntitlementsStore.DebugEntitlementPurchased);
            return;
        }

        bool entitled = PlayerEntitlementsStore.DebugEntitlementPurchased;
        if (entitled)
        {
            // Entitlement exists; allow re-enabling debug without repurchase.
            debugCurrencyButton.interactable = true;
            RefreshDevUnlockButtonText(isUnlocked: false, isEntitled: true);
            return;
        }

        long quantumShards = oracle.saveSettings.prestigePlus.points;
        long strangeMatter = oracle.saveSettings.sdPrestige.strangeMatter;
        bool canAfford = quantumShards >= DevOptionsQuantumShardCost && strangeMatter >= DevOptionsStrangeMatterCost;
        debugCurrencyButton.interactable = canAfford;
        RefreshDevUnlockButtonText(isUnlocked: false, isEntitled: false);
    }

    private void RefreshDevUnlockButtonText(bool isUnlocked, bool isEntitled)
    {
        if (debugCurrencyButtonText == null) return;

        // Requirement: show "Free" when entitlement exists; show cost otherwise.
        if (!isUnlocked && isEntitled)
        {
            debugCurrencyButtonText.text = "Free";
            return;
        }

        // Keep the existing wording consistent with the button art/text expectation.
        debugCurrencyButtonText.text = "100k Quantum shards and 500k Strange Matter";
    }

    private void RecalculateSkillPoints()
    {
        if (oracle == null) return;
        oracle.ApplySkillPointRecalc();
    }

    private void DisableDebugOptions()
    {
        if (oracle == null || oracle.saveSettings == null) return;
        oracle.saveSettings.debugOptions = false;
        NotifyDebugOptionsChanged();
        RefreshDebugUnlockUi();
        RefreshDevUnlockButtonState();
    }

    public static event Action AutoAssign;
    public static event Action UpdateSkills;
}
