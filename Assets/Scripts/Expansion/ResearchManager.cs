using System;
using System.Collections.Generic;
using IdleDysonSwarm.UI;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Balance;
using Sirenix.OdinInspector;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

/*
Purpose (runtime): Drives the Research and Simulation upgrade shop UI, purchase actions, and permanent
simulation unlock application during prestige resets.

Primary entry points:
- Unity: Start (bind listeners), OnEnable/OnDisable (ApplyResearch event wiring), UpdateAndEnableResearches.
- Runtime callbacks: PurchaseCounterMeteor/PurchaseCounterAi/PurchaseCounterGw/PurchaseEducation/
  PurchaseFoundation/PurchaseInformation/PurchaseSpace.
- Prestige callback: ApplyResearch (reapply permanent simulation unlocks to wiped simulation saves).

Owns vs delegates:
- Owns panel visibility/interactability rules and purchase side effects on save data.
- Delegates visual widget behavior to UpgradePanelReferences and simulation runtime effects to era managers.

Interacts with:
- Calls: SimulationPrestigeManager.ApplyResearch event and Oracle save containers
  (SaveDataPrestige, SaveDataDream1, SaveData).
- Called by: Game scene UI button events bound in Start and prestige flow that invokes ApplyResearch.

Change notes:
- Mathematics permanent unlock parity now also normalizes sdSimulation.solarPanelGeneration to at least 200;
  changing this must be mirrored in InformationEraManager and Oracle.Migrations normalization.
- Purchase case IDs map directly to specific panels/listeners; changing IDs or ordering requires coordinated
  updates in Start listener bindings and panel gating logic.
- Serialized panel references and cost constants are scene-coupled; renaming/removing fields requires scene
  prefab updates in Assets/Scenes/Game.unity.
*/
public class ResearchManager : MonoBehaviour
{
    [TabGroup("Headers")]
    [SerializeField] private TMP_Text ResearchHeader;
    [TabGroup("Headers")]
    [SerializeField] private TMP_Text SimulationHeader;

    #region Simulation References

    [TabGroup("Simulation", "Categories")]
    [SerializeField] private GameObject simulationCategory;
    [TabGroup("Simulation", "Categories")]
    [SerializeField] private GameObject counterMeasuresCategory;
    [TabGroup("Simulation", "Categories")]
    [SerializeField] private GameObject foundationalEraCategory;
    [TabGroup("Simulation", "Categories")]
    [SerializeField] private GameObject educationCategory;
    [TabGroup("Simulation", "Categories")]
    [SerializeField] private GameObject informationEraCategory;
    [TabGroup("Simulation", "Categories")]
    [SerializeField] private GameObject spaceAgeCategory;

    [TabGroup("Simulation", "Panels")]
    [FoldoutGroup("Simulation/Panels/Countermeasures")]
    [SerializeField] private UpgradePanelReferences _counterMeteorPanel;
    [FoldoutGroup("Simulation/Panels/Countermeasures")]
    [SerializeField] private UpgradePanelReferences _counterAiPanel;
    [FoldoutGroup("Simulation/Panels/Countermeasures")]
    [SerializeField] private UpgradePanelReferences _counterGwPanel;

    [TabGroup("Simulation", "Panels")]
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _engineering1Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _engineering2Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _engineering3Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _shipping1Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _shipping2Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _worldTrade1Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _worldTrade2Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _worldTrade3Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _worldPeace1Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _worldPeace2Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _worldPeace3Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _worldPeace4Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _mathematics1Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _mathematics2Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _mathematics3Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _advancedPhysics1Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _advancedPhysics2Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _advancedPhysics3Panel;
    [FoldoutGroup("Simulation/Panels/Education")]
    [SerializeField] private UpgradePanelReferences _advancedPhysics4Panel;

    [TabGroup("Simulation", "Panels")]
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _hunter1Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _hunter2Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _hunter3Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _hunter4Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _gathering1Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _gathering2Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _gathering3Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _gathering4Panel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _workerBoostPanel;
    [FoldoutGroup("Simulation/Panels/Foundational Era")]
    [SerializeField] private UpgradePanelReferences _citiesBoostPanel;

    [TabGroup("Simulation", "Panels")]
    [FoldoutGroup("Simulation/Panels/Information Era")]
    [SerializeField] private UpgradePanelReferences _factoriesBoostPanel;
    [FoldoutGroup("Simulation/Panels/Information Era")]
    [SerializeField] private UpgradePanelReferences _bots1Panel;
    [FoldoutGroup("Simulation/Panels/Information Era")]
    [SerializeField] private UpgradePanelReferences _bots2Panel;
    [FoldoutGroup("Simulation/Panels/Information Era")]
    [SerializeField] private UpgradePanelReferences _rockets1Panel;
    [FoldoutGroup("Simulation/Panels/Information Era")]
    [SerializeField] private UpgradePanelReferences _rockets2Panel;
    [FoldoutGroup("Simulation/Panels/Information Era")]
    [SerializeField] private UpgradePanelReferences _rockets3Panel;

    [TabGroup("Simulation", "Panels")]
    [FoldoutGroup("Simulation/Panels/Space Age")]
    [SerializeField] private UpgradePanelReferences _sfacs1Panel;
    [FoldoutGroup("Simulation/Panels/Space Age")]
    [SerializeField] private UpgradePanelReferences _sfacs2Panel;
    [FoldoutGroup("Simulation/Panels/Space Age")]
    [SerializeField] private UpgradePanelReferences _sfacs3Panel;
    [FoldoutGroup("Simulation/Panels/Space Age")]
    [SerializeField] private UpgradePanelReferences _railgun1Panel;
    [FoldoutGroup("Simulation/Panels/Space Age")]
    [SerializeField] private UpgradePanelReferences _railgun2Panel;

    #region Costs

    private int counterMeteorCost => GetUpgradeCost("counterMeteor");
    private int counterAiCost => GetUpgradeCost("counterAi");
    private int counterGwCost => GetUpgradeCost("counterGw");

    private int engineering1Cost => GetUpgradeCost("engineering1");
    private int engineering2Cost => GetUpgradeCost("engineering2");
    private int engineering3Cost => GetUpgradeCost("engineering3");

    private int shipping1Cost => GetUpgradeCost("shipping1");
    private int shipping2Cost => GetUpgradeCost("shipping2");

    private int worldTrade1Cost => GetUpgradeCost("worldTrade1");
    private int worldTrade2Cost => GetUpgradeCost("worldTrade2");
    private int worldTrade3Cost => GetUpgradeCost("worldTrade3");

    private int worldPeace1Cost => GetUpgradeCost("worldPeace1");
    private int worldPeace2Cost => GetUpgradeCost("worldPeace2");
    private int worldPeace3Cost => GetUpgradeCost("worldPeace3");
    private int worldPeace4Cost => GetUpgradeCost("worldPeace4");

    private int mathematics1Cost => GetUpgradeCost("mathematics1");
    private int mathematics2Cost => GetUpgradeCost("mathematics2");
    private int mathematics3Cost => GetUpgradeCost("mathematics3");

    private int advancedPhysics1Cost => GetUpgradeCost("advancedPhysics1");
    private int advancedPhysics2Cost => GetUpgradeCost("advancedPhysics2");
    private int advancedPhysics3Cost => GetUpgradeCost("advancedPhysics3");
    private int advancedPhysics4Cost => GetUpgradeCost("advancedPhysics4");

    private int hunter1Cost => GetUpgradeCost("hunter1");
    private int hunter2Cost => GetUpgradeCost("hunter2");
    private int hunter3Cost => GetUpgradeCost("hunter3");
    private int hunter4Cost => GetUpgradeCost("hunter4");

    private int gatherer1Cost => GetUpgradeCost("gatherer1");
    private int gatherer2Cost => GetUpgradeCost("gatherer2");
    private int gatherer3Cost => GetUpgradeCost("gatherer3");
    private int gatherer4Cost => GetUpgradeCost("gatherer4");

    private int workerBoostCost => GetUpgradeCost("workerBoost");
    private int citiesBoostCost => GetUpgradeCost("citiesBoost");

    private int factoriesBoostCost => GetUpgradeCost("factoriesBoost");

    private int bots1Cost => GetUpgradeCost("bots1");
    private int bots2Cost => GetUpgradeCost("bots2");

    private int rockets1Cost => GetUpgradeCost("rockets1");
    private int rockets2Cost => GetUpgradeCost("rockets2");
    private int rockets3Cost => GetUpgradeCost("rockets3");

    private int sfacs1Cost => GetUpgradeCost("sfacs1");
    private int sfacs2Cost => GetUpgradeCost("sfacs2");
    private int sfacs3Cost => GetUpgradeCost("sfacs3");

    private int railguns1Cost => GetUpgradeCost("railguns1");
    private int railguns2Cost => GetUpgradeCost("railguns2");

    private int translation1Cost => GetUpgradeCost("translation1");
    private int translation2Cost => GetUpgradeCost("translation2");
    private int translation3Cost => GetUpgradeCost("translation3");
    private int translation4Cost => GetUpgradeCost("translation4");
    private int translation5Cost => GetUpgradeCost("translation5");
    private int translation6Cost => GetUpgradeCost("translation6");
    private int translation7Cost => GetUpgradeCost("translation7");
    private int translation8Cost => GetUpgradeCost("translation8");

    private int speed1Cost => GetUpgradeCost("speed1");
    private int speed2Cost => GetUpgradeCost("speed2");
    private int speed3Cost => GetUpgradeCost("speed3");
    private int speed4Cost => GetUpgradeCost("speed4");
    private int speed5Cost => GetUpgradeCost("speed5");
    private int speed6Cost => GetUpgradeCost("speed6");
    private int speed7Cost => GetUpgradeCost("speed7");
    private int speed8Cost => GetUpgradeCost("speed8");

    private int doubleTimeCost => GetUpgradeCost("doubleTimeOwned");
    private int automateGatherInfluenceCost => GetUpgradeCost("workerAutoConvert");

    #endregion

    #endregion

    #region Reality References

    [TabGroup("Reality", "Categories")]
    [SerializeField] private GameObject realityCategory;
    [TabGroup("Reality", "Categories")]
    [SerializeField] private GameObject anomalyCategory;
    [TabGroup("Reality", "Categories")]
    [SerializeField] private GameObject translationCategory;
    [TabGroup("Reality", "Categories")]
    [SerializeField] private GameObject speedCategory;
    [TabGroup("Reality", "Categories")]
    [SerializeField] private GameObject qolComplete;

    [TabGroup("Reality", "Panels")]
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation1Panel;
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation2Panel;
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation3Panel;
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation4Panel;
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation5Panel;
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation6Panel;
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation7Panel;
    [FoldoutGroup("Reality/Panels/Translation")]
    [SerializeField] private UpgradePanelReferences _translation8Panel;

    [TabGroup("Reality", "Panels")]
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed1Panel;
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed2Panel;
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed3Panel;
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed4Panel;
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed5Panel;
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed6Panel;
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed7Panel;
    [FoldoutGroup("Reality/Panels/Speed")]
    [SerializeField] private UpgradePanelReferences _speed8Panel;

    [TabGroup("Reality", "Panels")]
    [FoldoutGroup("Reality/Panels/QOL")]
    [SerializeField] private UpgradePanelReferences _doubleTimePanel;
    [FoldoutGroup("Reality/Panels/QOL")]
    [SerializeField] private UpgradePanelReferences _autoGatherInfluencePanel;

    [ContextMenu("Update Cost Texts")]
    public void UpdateAllCostTexts()
    {
        UpdateTranslationCostTexts();
        UpdateSpeedCostTexts();
    }

    private void UpdateTranslationCostTexts()
    {
        var highlight = UIThemeProvider.TextColourBlue;
        SetTitleText(_translation1Panel, FormatCost("Translation I", translation1Cost, highlight));
        SetTitleText(_translation2Panel, FormatCost("Translation II", translation2Cost, highlight));
        SetTitleText(_translation3Panel, FormatCost("Translation III", translation3Cost, highlight));
        SetTitleText(_translation4Panel, FormatCost("Translation IV", translation4Cost, highlight));
        SetTitleText(_translation5Panel, FormatCost("Translation V", translation5Cost, highlight));
        SetTitleText(_translation6Panel, FormatCost("Translation VI", translation6Cost, highlight));
        SetTitleText(_translation7Panel, FormatCost("Translation VII", translation7Cost, highlight));
        SetTitleText(_translation8Panel, FormatCost("Translation VIII", translation8Cost, highlight));
    }

    private void UpdateSpeedCostTexts()
    {
        var highlight = UIThemeProvider.TextColourBlue;
        SetTitleText(_speed1Panel, FormatCost("Speed Reduction I", speed1Cost, highlight));
        SetTitleText(_speed2Panel, FormatCost("Speed Reduction II", speed2Cost, highlight));
        SetTitleText(_speed3Panel, FormatCost("Speed Reduction III", speed3Cost, highlight));
        SetTitleText(_speed4Panel, FormatCost("Speed Reduction IV", speed4Cost, highlight));
        SetTitleText(_speed5Panel, FormatCost("Speed Reduction V", speed5Cost, highlight));
        SetTitleText(_speed6Panel, FormatCost("Speed Reduction VI", speed6Cost, highlight));
        SetTitleText(_speed7Panel, FormatCost("Speed Reduction VII", speed7Cost, highlight));
        SetTitleText(_speed8Panel, FormatCost("Speed Reduction VIII", speed8Cost, highlight));
    }

    private void SetTitleText(UpgradePanelReferences panel, string text)
    {
        if (panel != null && panel.titleText != null)
            panel.titleText.text = text;
    }

    private void SetPanelText(UpgradePanelReferences panel, string title, string description)
    {
        if (panel == null) return;
        if (panel.titleText != null)
            panel.titleText.text = title;
        if (panel.descriptionText != null)
            panel.descriptionText.text = description;
    }

    private string FormatCost(string name, int cost, string colorTag)
    {
        return $"{name}<size=70%> - {colorTag}{cost:N0}</color>sm";
    }

    private int GetUpgradeCost(string key)
    {
        return BalanceRuntime.GetUpgradeCost(key, SimulationUpgradeDefaultsCatalog.GetDefaultCost(key));
    }

    #endregion

    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;
    private const long MathematicsLegacySolarGeneration = 200;

    private static void ApplyMathematicsCompletionParity(SaveDataDream1 simulation)
    {
        if (simulation == null) return;

        simulation.mathematicsComplete = true;
        if (simulation.solarPanelGeneration < MathematicsLegacySolarGeneration)
            simulation.solarPanelGeneration = MathematicsLegacySolarGeneration;
    }

    #region Listeners

    private void OnEnable()
    {
        SimulationPrestigeManager.ApplyResearch += ApplyResearch;
    }

    private void OnDisable()
    {
        SimulationPrestigeManager.ApplyResearch -= ApplyResearch;
    }

    #endregion

    private void Start()
    {
        InvokeRepeating(nameof(UpdateAndEnableResearches), 0, .1f);

        #region SimulationListeners

        // Countermeasures
        if (_counterMeteorPanel != null) _counterMeteorPanel.purchaseButton.onClick.AddListener(PurchaseCounterMeteor);
        if (_counterAiPanel != null) _counterAiPanel.purchaseButton.onClick.AddListener(PurchaseCounterAi);
        if (_counterGwPanel != null) _counterGwPanel.purchaseButton.onClick.AddListener(PurchaseCounterGw);

        // Education
        if (_engineering1Panel != null) _engineering1Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(1));
        if (_engineering2Panel != null) _engineering2Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(2));
        if (_engineering3Panel != null) _engineering3Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(3));
        if (_shipping1Panel != null) _shipping1Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(4));
        if (_shipping2Panel != null) _shipping2Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(5));
        if (_worldTrade1Panel != null) _worldTrade1Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(6));
        if (_worldTrade2Panel != null) _worldTrade2Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(7));
        if (_worldTrade3Panel != null) _worldTrade3Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(8));
        if (_worldPeace1Panel != null) _worldPeace1Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(9));
        if (_worldPeace2Panel != null) _worldPeace2Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(10));
        if (_worldPeace3Panel != null) _worldPeace3Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(11));
        if (_worldPeace4Panel != null) _worldPeace4Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(12));
        if (_mathematics1Panel != null) _mathematics1Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(13));
        if (_mathematics2Panel != null) _mathematics2Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(14));
        if (_mathematics3Panel != null) _mathematics3Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(15));
        if (_advancedPhysics1Panel != null) _advancedPhysics1Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(16));
        if (_advancedPhysics2Panel != null) _advancedPhysics2Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(17));
        if (_advancedPhysics3Panel != null) _advancedPhysics3Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(18));
        if (_advancedPhysics4Panel != null) _advancedPhysics4Panel.purchaseButton.onClick.AddListener(() => PurchaseEducation(19));

        // Foundational Era
        if (_hunter1Panel != null) _hunter1Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(1));
        if (_hunter2Panel != null) _hunter2Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(2));
        if (_hunter3Panel != null) _hunter3Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(3));
        if (_hunter4Panel != null) _hunter4Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(4));
        if (_gathering1Panel != null) _gathering1Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(5));
        if (_gathering2Panel != null) _gathering2Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(6));
        if (_gathering3Panel != null) _gathering3Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(7));
        if (_gathering4Panel != null) _gathering4Panel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(8));
        if (_workerBoostPanel != null) _workerBoostPanel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(9));
        if (_citiesBoostPanel != null) _citiesBoostPanel.purchaseButton.onClick.AddListener(() => PurchaseFoundation(10));

        // Information Era
        if (_factoriesBoostPanel != null) _factoriesBoostPanel.purchaseButton.onClick.AddListener(() => PurchaseInformation(1));
        if (_bots1Panel != null) _bots1Panel.purchaseButton.onClick.AddListener(() => PurchaseInformation(2));
        if (_bots2Panel != null) _bots2Panel.purchaseButton.onClick.AddListener(() => PurchaseInformation(3));
        if (_rockets1Panel != null) _rockets1Panel.purchaseButton.onClick.AddListener(() => PurchaseInformation(4));
        if (_rockets2Panel != null) _rockets2Panel.purchaseButton.onClick.AddListener(() => PurchaseInformation(5));
        if (_rockets3Panel != null) _rockets3Panel.purchaseButton.onClick.AddListener(() => PurchaseInformation(6));

        // Space Age
        if (_sfacs1Panel != null) _sfacs1Panel.purchaseButton.onClick.AddListener(() => PurchaseSpaceAge(1));
        if (_sfacs2Panel != null) _sfacs2Panel.purchaseButton.onClick.AddListener(() => PurchaseSpaceAge(2));
        if (_sfacs3Panel != null) _sfacs3Panel.purchaseButton.onClick.AddListener(() => PurchaseSpaceAge(3));
        if (_railgun1Panel != null) _railgun1Panel.purchaseButton.onClick.AddListener(() => PurchaseSpaceAge(4));
        if (_railgun2Panel != null) _railgun2Panel.purchaseButton.onClick.AddListener(() => PurchaseSpaceAge(5));

        #endregion

        #region RealityListeners

        // Translation
        if (_translation1Panel != null) _translation1Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(1));
        if (_translation2Panel != null) _translation2Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(2));
        if (_translation3Panel != null) _translation3Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(3));
        if (_translation4Panel != null) _translation4Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(4));
        if (_translation5Panel != null) _translation5Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(5));
        if (_translation6Panel != null) _translation6Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(6));
        if (_translation7Panel != null) _translation7Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(7));
        if (_translation8Panel != null) _translation8Panel.purchaseButton.onClick.AddListener(() => PurchaseTranslation(8));

        // Speed
        if (_speed1Panel != null) _speed1Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(1));
        if (_speed2Panel != null) _speed2Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(2));
        if (_speed3Panel != null) _speed3Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(3));
        if (_speed4Panel != null) _speed4Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(4));
        if (_speed5Panel != null) _speed5Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(5));
        if (_speed6Panel != null) _speed6Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(6));
        if (_speed7Panel != null) _speed7Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(7));
        if (_speed8Panel != null) _speed8Panel.purchaseButton.onClick.AddListener(() => PurchaseSpeed(8));

        // QOL
        if (_doubleTimePanel != null) _doubleTimePanel.purchaseButton.onClick.AddListener(PurchaseDoubleTime);
        if (_autoGatherInfluencePanel != null) _autoGatherInfluencePanel.purchaseButton.onClick.AddListener(PurchaseAutomateInfluence);

        #endregion

        InitializeUpgradePanels();
    }

    private void Update()
    {
        ResearchHeader.text = $"Upgrades<size=70%> - {sp.strangeMatter:N0} Strange Matter";
    }

    #region SimulationMethods

    private static readonly string[] EducationUpgradeKeys =
    {
        null,
        "engineering1",
        "engineering2",
        "engineering3",
        "shipping1",
        "shipping2",
        "worldTrade1",
        "worldTrade2",
        "worldTrade3",
        "worldPeace1",
        "worldPeace2",
        "worldPeace3",
        "worldPeace4",
        "mathematics1",
        "mathematics2",
        "mathematics3",
        "advancedPhysics1",
        "advancedPhysics2",
        "advancedPhysics3",
        "advancedPhysics4"
    };

    private static readonly string[] FoundationalUpgradeKeys =
    {
        null,
        "hunter1",
        "hunter2",
        "hunter3",
        "hunter4",
        "gatherer1",
        "gatherer2",
        "gatherer3",
        "gatherer4",
        "workerBoost",
        "citiesBoost"
    };

    private static readonly string[] InformationUpgradeKeys =
    {
        null,
        "factoriesBoost",
        "bots1",
        "bots2",
        "rockets1",
        "rockets2",
        "rockets3"
    };

    private static readonly string[] SpaceAgeUpgradeKeys =
    {
        null,
        "sfacs1",
        "sfacs2",
        "sfacs3",
        "railguns1",
        "railguns2"
    };

    private static readonly string[] TranslationUpgradeKeys =
    {
        null,
        "translation1",
        "translation2",
        "translation3",
        "translation4",
        "translation5",
        "translation6",
        "translation7",
        "translation8"
    };

    private static readonly string[] SpeedUpgradeKeys =
    {
        null,
        "speed1",
        "speed2",
        "speed3",
        "speed4",
        "speed5",
        "speed6",
        "speed7",
        "speed8"
    };

    private void PurchaseSpaceAge(int i) => TryPurchaseIndexed(SpaceAgeUpgradeKeys, i);

    private void PurchaseInformation(int i) => TryPurchaseIndexed(InformationUpgradeKeys, i);

    private void PurchaseFoundation(int i) => TryPurchaseIndexed(FoundationalUpgradeKeys, i);

    private void PurchaseEducation(int i) => TryPurchaseIndexed(EducationUpgradeKeys, i);

    private void PurchaseCounterGw() => TryPurchaseUpgrade("counterGw");

    private void PurchaseCounterAi() => TryPurchaseUpgrade("counterAi");

    private void PurchaseCounterMeteor() => TryPurchaseUpgrade("counterMeteor");

    #endregion

    #region RealityMethods

    private void PurchaseTranslation(int i) => TryPurchaseIndexed(TranslationUpgradeKeys, i);

    private void PurchaseSpeed(int i) => TryPurchaseIndexed(SpeedUpgradeKeys, i);

    private void PurchaseDoubleTime() => TryPurchaseUpgrade("doubleTimeOwned");

    private void PurchaseAutomateInfluence() => TryPurchaseUpgrade("workerAutoConvert");

    private bool TryPurchaseIndexed(IReadOnlyList<string> keys, int index)
    {
        if (keys == null || index < 1 || index >= keys.Count)
        {
            return false;
        }

        return TryPurchaseUpgrade(keys[index]);
    }

    private bool TryPurchaseUpgrade(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        if (IsUpgradeOwned(key))
        {
            return false;
        }

        if (!ArePrerequisitesMet(key))
        {
            return false;
        }

        int cost = GetUpgradeCost(key);
        if (sp.strangeMatter < cost)
        {
            return false;
        }

        IReadOnlyList<SimulationUpgradeEffect> effects = ResolveUpgradeEffects(key);
        if (effects == null || effects.Count == 0)
        {
            Debug.LogWarning($"[ResearchManager] No upgrade effects configured for '{key}'.");
            return false;
        }

        SimulationUpgradeEffectApplier.ApplyEffects(effects, oracle.saveSettings);
        sp.strangeMatter -= cost;

        if (string.Equals(key, "mathematics3", StringComparison.Ordinal))
        {
            ApplyMathematicsCompletionParity(sd1);
        }

        return true;
    }

    private bool ArePrerequisitesMet(string key)
    {
        IReadOnlyList<SimulationUpgradePrerequisite> prerequisites = ResolveUpgradePrerequisites(key);
        if (prerequisites == null || prerequisites.Count == 0)
        {
            return true;
        }

        for (int i = 0; i < prerequisites.Count; i++)
        {
            SimulationUpgradePrerequisite prerequisite = prerequisites[i];
            if (prerequisite == null || string.IsNullOrWhiteSpace(prerequisite.key))
            {
                continue;
            }

            bool owned = IsUpgradeOwned(prerequisite.key);
            if (prerequisite.mustBeOwned && !owned)
            {
                return false;
            }

            if (!prerequisite.mustBeOwned && owned)
            {
                return false;
            }
        }

        return true;
    }

    private bool IsUpgradeOwned(string key)
    {
        return SimulationUpgradeStateAccessor.TryGetOwned(
            key,
            sp,
            oracle.saveSettings.saveData,
            out bool owned) && owned;
    }

    private IReadOnlyList<SimulationUpgradePrerequisite> ResolveUpgradePrerequisites(string key)
    {
        SimulationUpgradeDatabase database = BalanceRuntime.UpgradeDatabase;
        if (database != null &&
            database.TryGet(key, out SimulationUpgradeDefinition definition) &&
            definition.prerequisites != null &&
            definition.prerequisites.Count > 0)
        {
            return definition.prerequisites;
        }

        return SimulationUpgradeDefaultsCatalog.TryGetSpec(key, out SimulationUpgradeSpec spec)
            ? spec.Prerequisites
            : Array.Empty<SimulationUpgradePrerequisite>();
    }

    private IReadOnlyList<SimulationUpgradeEffect> ResolveUpgradeEffects(string key)
    {
        SimulationUpgradeDatabase database = BalanceRuntime.UpgradeDatabase;
        if (database != null &&
            database.TryGet(key, out SimulationUpgradeDefinition definition) &&
            definition.purchaseEffects != null &&
            definition.purchaseEffects.Count > 0)
        {
            return definition.purchaseEffects;
        }

        return SimulationUpgradeDefaultsCatalog.TryGetSpec(key, out SimulationUpgradeSpec spec)
            ? spec.Effects
            : Array.Empty<SimulationUpgradeEffect>();
    }

    #endregion

    private void InitializeUpgradePanels()
    {
        var highlight = UIThemeProvider.TextColourBlue;

        #region Countermeasures

        SetPanelText(_counterMeteorPanel,
            FormatCost("Counteract Meteor Storm", counterMeteorCost, highlight),
            "Override the simulation deleting all space rocks.");

        SetPanelText(_counterAiPanel,
            FormatCost("Counteract AI Overlords", counterAiCost, highlight),
            "Squish some bugs, no more Overlords.");

        SetPanelText(_counterGwPanel,
            FormatCost("Counteract Global Warming", counterGwCost, highlight),
            "Switching to friendlier rocket fuel should help.");

        #endregion

        #region Education

        SetPanelText(_engineering1Panel,
            FormatCost("Engineering I", engineering1Cost, highlight),
            $"Better algorithms. {highlight}10</color>m -> {highlight}5</color>m");

        SetPanelText(_engineering2Panel,
            FormatCost("Engineering II", engineering2Cost, highlight),
            $"Even better algorithms. {highlight}5</color>m -> {highlight}1</color>m");

        SetPanelText(_engineering3Panel,
            FormatCost("Engineering III", engineering3Cost, highlight),
            "I'm over this, aren't you?");

        SetPanelText(_shipping1Panel,
            FormatCost("Shipping I", shipping1Cost, highlight),
            $"Ship with ships or.. Trucks. {highlight}30</color>m -> {highlight}10</color>m");

        SetPanelText(_shipping2Panel,
            FormatCost("Shipping II", shipping2Cost, highlight),
            "Just teleport the stuff already.");

        SetPanelText(_worldTrade1Panel,
            FormatCost("World Trade I", worldTrade1Cost, highlight),
            $"Global trading in its raw form. {highlight}1</color>h -> {highlight}30</color>m");

        SetPanelText(_worldTrade2Panel,
            FormatCost("World Trade II", worldTrade2Cost, highlight),
            $"Zip here, zip there, zip everywhere. {highlight}30</color>m -> {highlight}10</color>m");

        SetPanelText(_worldTrade3Panel,
            FormatCost("World Trade III", worldTrade3Cost, highlight),
            "No push button anymore.");

        SetPanelText(_worldPeace1Panel,
            FormatCost("World Peace I", worldPeace1Cost, highlight),
            $"Put those weapons away. {highlight}2</color>h -> {highlight}1</color>h");

        SetPanelText(_worldPeace2Panel,
            FormatCost("World Peace II", worldPeace2Cost, highlight),
            $"Global contracting. {highlight}1</color>h -> {highlight}30</color>m");

        SetPanelText(_worldPeace3Panel,
            FormatCost("World Peace III", worldPeace3Cost, highlight),
            $"No more hackers. {highlight}30</color>m -> {highlight}10</color>m");

        SetPanelText(_worldPeace4Panel,
            FormatCost("World Peace IV", worldPeace4Cost, highlight),
            "Toggle booleans, why waste CPU on war.");

        SetPanelText(_mathematics1Panel,
            FormatCost("Mathematics I", mathematics1Cost, highlight),
            $"{highlight}1</color>+{highlight}1</color>=a, a = window. {highlight}1</color>h -> {highlight}30</color>m");

        SetPanelText(_mathematics2Panel,
            FormatCost("Mathematics II", mathematics2Cost, highlight),
            $"{highlight}3.14159265358979323</color> = Yum. {highlight}30</color>m -> {highlight}10</color>m");

        SetPanelText(_mathematics3Panel,
            FormatCost("Mathematics III", mathematics3Cost, highlight),
            $"Division by {highlight}0</color>, oh its free?");

        SetPanelText(_advancedPhysics1Panel,
            FormatCost("Advanced Physics I", advancedPhysics1Cost, highlight),
            $"Jenga Training. {highlight}2</color>h -> {highlight}1</color>h");

        SetPanelText(_advancedPhysics2Panel,
            FormatCost("Advanced Physics II", advancedPhysics2Cost, highlight),
            $"Parkour. {highlight}1</color>h -> {highlight}30</color>m");

        SetPanelText(_advancedPhysics3Panel,
            FormatCost("Advanced Physics III", advancedPhysics3Cost, highlight),
            $"Thrust Vectors. {highlight}30</color>m -> {highlight}10</color>m");

        SetPanelText(_advancedPhysics4Panel,
            FormatCost("Advanced Physics IV", advancedPhysics4Cost, highlight),
            "Fusion is for fusing, fission no more.");

        #endregion

        #region Foundational Era

        SetPanelText(_hunter1Panel,
            FormatCost("Start with 1 Hunter", hunter1Cost, highlight),
            "Override saveData: You've done this part before.");

        SetPanelText(_hunter2Panel,
            FormatCost("Start with 10 Hunters", hunter2Cost, highlight),
            "Override saveData: A head start never hurt.");

        SetPanelText(_hunter3Panel,
            FormatCost("Start with 1000 Hunters", hunter3Cost, highlight),
            "Override saveData: Skip the early grind.");

        SetPanelText(_hunter4Panel,
            FormatCost("Purchase buys 1000 Hunters", hunter4Cost, highlight),
            "Tweak things.. A little?");

        SetPanelText(_gathering1Panel,
            FormatCost("Start with 1 Gatherer", gatherer1Cost, highlight),
            "Override saveData: Time is precious.");

        SetPanelText(_gathering2Panel,
            FormatCost("Start with 10 Gatherers", gatherer2Cost, highlight),
            "Override saveData: Why start from scratch?");

        SetPanelText(_gathering3Panel,
            FormatCost("Start with 1000 Gatherer", gatherer3Cost, highlight),
            "Override saveData: Been there, done that.");

        SetPanelText(_gathering4Panel,
            FormatCost("Purchase buys 1000 Gatherers", gatherer4Cost, highlight),
            "Twice, why? Just because.");

        SetPanelText(_workerBoostPanel,
            FormatCost("Log10 Workers", workerBoostCost, highlight),
            "Workers make other workers work more.");

        SetPanelText(_citiesBoostPanel,
            FormatCost("City Booster", citiesBoostCost, highlight),
            "Cram more factories into each City.");

        #endregion

        #region Information Era

        SetPanelText(_factoriesBoostPanel,
            FormatCost("Factories", factoriesBoostCost, highlight),
            $"More assembly lines = more bots {highlight}10</color>x more.");

        SetPanelText(_bots1Panel,
            FormatCost("Bots I", bots1Cost, highlight),
            "Double the arms, double the work.");

        SetPanelText(_bots2Panel,
            FormatCost("Bots II", bots2Cost, highlight),
            "Project stacking, produce double the rockets.");

        SetPanelText(_rockets1Panel,
            FormatCost("Rockets I", rockets1Cost, highlight),
            "Bigger rockets carry more materials.");

        SetPanelText(_rockets2Panel,
            FormatCost("Rockets II", rockets2Cost, highlight),
            "Better packing, no more gaps.");

        SetPanelText(_rockets3Panel,
            FormatCost("Rockets III", rockets3Cost, highlight),
            "It's bigger on the inside?");

        #endregion

        #region Space Age

        SetPanelText(_sfacs1Panel,
            FormatCost("Space Factories I", sfacs1Cost, highlight),
            $"{highlight}1</color>*{highlight}2</color> = {highlight}2</color>");

        SetPanelText(_sfacs2Panel,
            FormatCost("Space Factories II", sfacs2Cost, highlight),
            $"{highlight}1</color>*{highlight}2</color>*{highlight}2</color> = {highlight}4</color>");

        SetPanelText(_sfacs3Panel,
            FormatCost("Space Factories III", sfacs3Cost, highlight),
            $"{highlight}1</color>*{highlight}2</color>*{highlight}2</color>*{highlight}2</color> = {highlight}8</color>");

        SetPanelText(_railgun1Panel,
            FormatCost("Railguns I", railguns1Cost, highlight),
            "Better Lubrication allows faster firing.");

        SetPanelText(_railgun2Panel,
            FormatCost("Railguns II", railguns2Cost, highlight),
            "Break physics, we're tired of waiting around.");

        #endregion

        #region Reality - Translation

        SetPanelText(_translation1Panel,
            FormatCost("Translation I", translation1Cost, highlight),
            $"Begin deciphering the anomaly's code.\nGain {highlight}1</color> skill point.");

        SetPanelText(_translation2Panel,
            FormatCost("Translation II", translation2Cost, highlight),
            $"The patterns are starting to make sense.\nGain {highlight}1</color> skill point.");

        SetPanelText(_translation3Panel,
            FormatCost("Translation III", translation3Cost, highlight),
            $"Progress! More symbols decoded.\nGain {highlight}1</color> skill point.");

        SetPanelText(_translation4Panel,
            FormatCost("Translation IV", translation4Cost, highlight),
            $"Halfway through the translation.\nGain {highlight}1</color> skill point.");

        SetPanelText(_translation5Panel,
            FormatCost("Translation V", translation5Cost, highlight),
            $"The anomaly's secrets unfold.\nGain {highlight}1</color> skill point.");

        SetPanelText(_translation6Panel,
            FormatCost("Translation VI", translation6Cost, highlight),
            $"Almost there, keep translating.\nGain {highlight}1</color> skill point.");

        SetPanelText(_translation7Panel,
            FormatCost("Translation VII", translation7Cost, highlight),
            $"The final pieces fall into place.\nGain {highlight}1</color> skill point.");

        SetPanelText(_translation8Panel,
            FormatCost("Translation VIII", translation8Cost, highlight),
            $"Finally finish translating the anomaly!\nGain {highlight}1</color> skill point.");

        #endregion

        #region Reality - Speed

        SetPanelText(_speed1Panel,
            FormatCost("Speed Reduction I", speed1Cost, highlight),
            $"{highlight}100</color>% -> {highlight}95</color>% - Magnetic fields?\nGain {highlight}1</color> skill point.");

        SetPanelText(_speed2Panel,
            FormatCost("Speed Reduction II", speed2Cost, highlight),
            $"{highlight}95</color>% -> {highlight}90</color>% - Throw it at a wall?\nGain {highlight}1</color> skill point.");

        SetPanelText(_speed3Panel,
            FormatCost("Speed Reduction III", speed3Cost, highlight),
            $"{highlight}90</color>% -> {highlight}80</color>% - Smack it with a bat?\nGain {highlight}1</color> skill point.");

        SetPanelText(_speed4Panel,
            FormatCost("Speed Reduction IV", speed4Cost, highlight),
            $"{highlight}80</color>% -> {highlight}70</color>% - Put it under a metal press?\nGain {highlight}1</color> skill point.");

        SetPanelText(_speed5Panel,
            FormatCost("Speed Reduction V", speed5Cost, highlight),
            $"{highlight}70</color>% -> {highlight}50</color>% - Bombard it with radiation?\nGain {highlight}1</color> skill point.");

        SetPanelText(_speed6Panel,
            FormatCost("Speed Reduction VI", speed6Cost, highlight),
            $"{highlight}50</color>% -> {highlight}25</color>% - Design an inception machine.\nGain {highlight}1</color> skill point.");

        SetPanelText(_speed7Panel,
            FormatCost("Speed Reduction VII", speed7Cost, highlight),
            $"{highlight}25</color>% -> {highlight}10</color>% - Go down a few layers.\nGain {highlight}1</color> skill point.");

        SetPanelText(_speed8Panel,
            FormatCost("Speed Reduction VIII", speed8Cost, highlight),
            $"{highlight}10</color>% -> {highlight}0</color>% - Comprehention.\nGain {highlight}1</color> skill point.");

        #endregion

        #region Reality - QOL

        SetPanelText(_autoGatherInfluencePanel,
            FormatCost("Automate Gather Influence", automateGatherInfluenceCost, highlight),
            "No longer feel the need to click gather influence");

        SetPanelText(_doubleTimePanel,
            FormatCost("Enable Time Multiplier", doubleTimeCost, highlight),
            "Gather time while offline, spend it while online.");

        #endregion
    }

    private void UpdateAndEnableResearches()
    {
        SimulationHeader.text = $"Simulation: {sp.simulationCount:N0}";

        bool counterVisible = false;
        counterVisible |= UpdateUpgradePanel(_counterMeteorPanel, "counterMeteor");
        counterVisible |= UpdateUpgradePanel(_counterAiPanel, "counterAi");
        counterVisible |= UpdateUpgradePanel(_counterGwPanel, "counterGw");
        counterMeasuresCategory.SetActive(counterVisible);

        bool educationVisible = false;
        educationVisible |= UpdateUpgradePanel(_engineering1Panel, "engineering1");
        educationVisible |= UpdateUpgradePanel(_engineering2Panel, "engineering2");
        educationVisible |= UpdateUpgradePanel(_engineering3Panel, "engineering3");
        educationVisible |= UpdateUpgradePanel(_shipping1Panel, "shipping1");
        educationVisible |= UpdateUpgradePanel(_shipping2Panel, "shipping2");
        educationVisible |= UpdateUpgradePanel(_worldTrade1Panel, "worldTrade1");
        educationVisible |= UpdateUpgradePanel(_worldTrade2Panel, "worldTrade2");
        educationVisible |= UpdateUpgradePanel(_worldTrade3Panel, "worldTrade3");
        educationVisible |= UpdateUpgradePanel(_worldPeace1Panel, "worldPeace1");
        educationVisible |= UpdateUpgradePanel(_worldPeace2Panel, "worldPeace2");
        educationVisible |= UpdateUpgradePanel(_worldPeace3Panel, "worldPeace3");
        educationVisible |= UpdateUpgradePanel(_worldPeace4Panel, "worldPeace4");
        educationVisible |= UpdateUpgradePanel(_mathematics1Panel, "mathematics1");
        educationVisible |= UpdateUpgradePanel(_mathematics2Panel, "mathematics2");
        educationVisible |= UpdateUpgradePanel(_mathematics3Panel, "mathematics3");
        educationVisible |= UpdateUpgradePanel(_advancedPhysics1Panel, "advancedPhysics1");
        educationVisible |= UpdateUpgradePanel(_advancedPhysics2Panel, "advancedPhysics2");
        educationVisible |= UpdateUpgradePanel(_advancedPhysics3Panel, "advancedPhysics3");
        educationVisible |= UpdateUpgradePanel(_advancedPhysics4Panel, "advancedPhysics4");
        educationCategory.SetActive(educationVisible);

        bool foundationalVisible = false;
        foundationalVisible |= UpdateUpgradePanel(_hunter1Panel, "hunter1");
        foundationalVisible |= UpdateUpgradePanel(_hunter2Panel, "hunter2");
        foundationalVisible |= UpdateUpgradePanel(_hunter3Panel, "hunter3");
        foundationalVisible |= UpdateUpgradePanel(_hunter4Panel, "hunter4");
        foundationalVisible |= UpdateUpgradePanel(_gathering1Panel, "gatherer1");
        foundationalVisible |= UpdateUpgradePanel(_gathering2Panel, "gatherer2");
        foundationalVisible |= UpdateUpgradePanel(_gathering3Panel, "gatherer3");
        foundationalVisible |= UpdateUpgradePanel(_gathering4Panel, "gatherer4");
        foundationalVisible |= UpdateUpgradePanel(_workerBoostPanel, "workerBoost");
        foundationalVisible |= UpdateUpgradePanel(_citiesBoostPanel, "citiesBoost");
        foundationalEraCategory.SetActive(foundationalVisible);

        bool informationVisible = false;
        informationVisible |= UpdateUpgradePanel(_factoriesBoostPanel, "factoriesBoost");
        informationVisible |= UpdateUpgradePanel(_bots1Panel, "bots1");
        informationVisible |= UpdateUpgradePanel(_bots2Panel, "bots2");
        informationVisible |= UpdateUpgradePanel(_rockets1Panel, "rockets1");
        informationVisible |= UpdateUpgradePanel(_rockets2Panel, "rockets2");
        informationVisible |= UpdateUpgradePanel(_rockets3Panel, "rockets3");
        informationEraCategory.SetActive(informationVisible);

        bool spaceVisible = false;
        spaceVisible |= UpdateUpgradePanel(_sfacs1Panel, "sfacs1");
        spaceVisible |= UpdateUpgradePanel(_sfacs2Panel, "sfacs2");
        spaceVisible |= UpdateUpgradePanel(_sfacs3Panel, "sfacs3");
        spaceVisible |= UpdateUpgradePanel(_railgun1Panel, "railguns1");
        spaceVisible |= UpdateUpgradePanel(_railgun2Panel, "railguns2");
        spaceAgeCategory.SetActive(spaceVisible);

        simulationCategory.SetActive(counterVisible || educationVisible || foundationalVisible || informationVisible || spaceVisible);

        UpdateRealityPanels(out bool translationVisible, out bool speedVisible, out bool qolVisible);
        realityCategory.SetActive(translationVisible || speedVisible || qolVisible);
        anomalyCategory.SetActive(translationVisible || speedVisible);
        translationCategory.SetActive(translationVisible);
        speedCategory.SetActive(speedVisible);
        qolComplete.SetActive(qolVisible);
    }

    private void UpdateRealityPanels(out bool translationVisible, out bool speedVisible, out bool qolVisible)
    {
        translationVisible = false;
        translationVisible |= UpdateUpgradePanel(_translation1Panel, "translation1");
        translationVisible |= UpdateUpgradePanel(_translation2Panel, "translation2");
        translationVisible |= UpdateUpgradePanel(_translation3Panel, "translation3");
        translationVisible |= UpdateUpgradePanel(_translation4Panel, "translation4");
        translationVisible |= UpdateUpgradePanel(_translation5Panel, "translation5");
        translationVisible |= UpdateUpgradePanel(_translation6Panel, "translation6");
        translationVisible |= UpdateUpgradePanel(_translation7Panel, "translation7");
        translationVisible |= UpdateUpgradePanel(_translation8Panel, "translation8");

        speedVisible = false;
        speedVisible |= UpdateUpgradePanel(_speed1Panel, "speed1");
        speedVisible |= UpdateUpgradePanel(_speed2Panel, "speed2");
        speedVisible |= UpdateUpgradePanel(_speed3Panel, "speed3");
        speedVisible |= UpdateUpgradePanel(_speed4Panel, "speed4");
        speedVisible |= UpdateUpgradePanel(_speed5Panel, "speed5");
        speedVisible |= UpdateUpgradePanel(_speed6Panel, "speed6");
        speedVisible |= UpdateUpgradePanel(_speed7Panel, "speed7");
        speedVisible |= UpdateUpgradePanel(_speed8Panel, "speed8");

        qolVisible = false;
        qolVisible |= UpdateUpgradePanel(_doubleTimePanel, "doubleTimeOwned");
        qolVisible |= UpdateUpgradePanel(_autoGatherInfluencePanel, "workerAutoConvert");
    }

    private bool UpdateUpgradePanel(UpgradePanelReferences panel, string key)
    {
        bool shouldShow = !IsUpgradeOwned(key) && ArePrerequisitesMet(key);
        bool canAfford = CanAffordUpgrade(key);
        UpdatePanel(panel, canAfford, shouldShow);
        return panel != null && shouldShow;
    }

    private bool CanAffordUpgrade(string key)
    {
        return sp.strangeMatter >= GetUpgradeCost(key);
    }

    private void UpdatePanel(UpgradePanelReferences panel, bool canAfford, bool shouldShow)
    {
        if (panel == null) return;
        panel.SetInteractable(canAfford);
        panel.SetVisible(shouldShow);
    }

    private void ApplyResearch()
    {
        SimulationUpgradeDatabase database = BalanceRuntime.UpgradeDatabase;
        IReadOnlyList<SimulationUpgradeDefinition> definitions = database != null ? database.GetAll() : null;

        if (definitions != null && definitions.Count > 0)
        {
            for (int i = 0; i < definitions.Count; i++)
            {
                SimulationUpgradeDefinition definition = definitions[i];
                if (definition == null ||
                    definition.layer != SimulationUpgradeLayer.Simulation ||
                    string.IsNullOrWhiteSpace(definition.key) ||
                    !IsUpgradeOwned(definition.key))
                {
                    continue;
                }

                SimulationUpgradeEffectApplier.ApplyEffects(ResolveUpgradeEffects(definition.key), oracle.saveSettings);
            }
        }
        else
        {
            IReadOnlyList<SimulationUpgradeSpec> specs = SimulationUpgradeDefaultsCatalog.All;
            for (int i = 0; i < specs.Count; i++)
            {
                SimulationUpgradeSpec spec = specs[i];
                if (spec == null ||
                    spec.Layer != SimulationUpgradeLayer.Simulation ||
                    string.IsNullOrWhiteSpace(spec.Key) ||
                    !IsUpgradeOwned(spec.Key))
                {
                    continue;
                }

                SimulationUpgradeEffectApplier.ApplyEffects(spec.Effects, oracle.saveSettings);
            }
        }

        if (IsUpgradeOwned("mathematics3"))
        {
            ApplyMathematicsCompletionParity(sd1);
        }

        if (!IsUpgradeOwned("counterMeteor"))
        {
            sp.disasterStage = 1;
        }
        else if (!IsUpgradeOwned("counterAi"))
        {
            sp.disasterStage = 2;
        }
        else if (!IsUpgradeOwned("counterGw"))
        {
            sp.disasterStage = 3;
        }
        else
        {
            sp.disasterStage = 42;
        }
    }
}
