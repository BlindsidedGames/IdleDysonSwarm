using IdleDysonSwarm.UI;
using Sirenix.OdinInspector;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

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

    private readonly int counterMeteorCost = 4;
    private readonly int counterAiCost = 42;
    private readonly int counterGwCost = 128;

    private readonly int engineering1Cost = 2;
    private readonly int engineering2Cost = 10;
    private readonly int engineering3Cost = 42;

    private readonly int shipping1Cost = 18;
    private readonly int shipping2Cost = 27;

    private readonly int worldTrade1Cost = 44;
    private readonly int worldTrade2Cost = 88;
    private readonly int worldTrade3Cost = 124;

    private readonly int worldPeace1Cost = 52;
    private readonly int worldPeace2Cost = 74;
    private readonly int worldPeace3Cost = 188;
    private readonly int worldPeace4Cost = 324;

    private readonly int mathematics1Cost = 44;
    private readonly int mathematics2Cost = 88;
    private readonly int mathematics3Cost = 124;

    private readonly int advancedPhysics1Cost = 92;
    private readonly int advancedPhysics2Cost = 126;
    private readonly int advancedPhysics3Cost = 381;
    private readonly int advancedPhysics4Cost = 654;

    private readonly int hunter1Cost = 2;
    private readonly int hunter2Cost = 20;
    private readonly int hunter3Cost = 40;
    private readonly int hunter4Cost = 40;

    private readonly int gatherer1Cost = 2;
    private readonly int gatherer2Cost = 20;
    private readonly int gatherer3Cost = 40;
    private readonly int gatherer4Cost = 40;

    private readonly int workerBoostCost = 42;
    private readonly int citiesBoostCost = 1337;

    private readonly int factoriesBoostCost = 21;

    private readonly int bots1Cost = 211;
    private readonly int bots2Cost = 1111;

    private readonly int rockets1Cost = 1111;
    private readonly int rockets2Cost = 2222;
    private readonly int rockets3Cost = 3333;

    private readonly int sfacs1Cost = 1221;
    private readonly int sfacs2Cost = 12221;
    private readonly int sfacs3Cost = 122221;

    private readonly int railguns1Cost = 1221;
    private readonly int railguns2Cost = 12221;

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

    [TabGroup("Reality", "Costs")]
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation1Cost = 8;
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation2Cost = 16;
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation3Cost = 32;
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation4Cost = 64;
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation5Cost = 128;
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation6Cost = 256;
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation7Cost = 512;
    [FoldoutGroup("Reality/Costs/Translation Costs")]
    [OnValueChanged("UpdateTranslationCostTexts")] public int translation8Cost = 1024;

    [TabGroup("Reality", "Costs")]
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed1Cost = 2048;
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed2Cost = 4096;
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed3Cost = 8192;
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed4Cost = 16384;
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed5Cost = 32768;
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed6Cost = 65536;
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed7Cost = 131072;
    [FoldoutGroup("Reality/Costs/Speed Costs")]
    [OnValueChanged("UpdateSpeedCostTexts")] public int speed8Cost = 262144;

    [TabGroup("Reality", "Costs")]
    [FoldoutGroup("Reality/Costs/QOL Costs")]
    private readonly int doubleTimeCost = 5;
    [FoldoutGroup("Reality/Costs/QOL Costs")]
    private readonly int automateGatherInfluenceCost = 10;

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

    #endregion

    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

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

    private void PurchaseSpaceAge(int i)
    {
        switch (i)
        {
            case 1:
                sp.sfacs1 = true;
                sp.strangeMatter -= sfacs1Cost;
                sp.sfActivator1 = true;
                break;
            case 2:
                sp.sfacs2 = true;
                sp.strangeMatter -= sfacs2Cost;
                sp.sfActivator2 = true;
                break;
            case 3:
                sp.sfacs3 = true;
                sp.strangeMatter -= sfacs3Cost;
                sp.sfActivator3 = true;
                break;
            case 4:
                sp.railguns1 = true;
                sp.strangeMatter -= railguns1Cost;
                sp.railgunActivator1 = true;
                break;
            case 5:
                sp.railguns2 = true;
                sp.strangeMatter -= railguns2Cost;
                sp.railgunActivator2 = true;
                break;
        }
    }

    private void PurchaseInformation(int i)
    {
        switch (i)
        {
            case 1:
                sp.factoriesBoost = true;
                sp.strangeMatter -= factoriesBoostCost;
                sp.factoriesBoostActivator = true;
                break;
            case 2:
                sp.bots1 = true;
                sp.strangeMatter -= bots1Cost;
                sp.botsBoost1Activator = true;
                break;
            case 3:
                sp.bots2 = true;
                sp.strangeMatter -= bots2Cost;
                sp.botsBoost2Activator = true;
                break;
            case 4:
                sp.rockets1 = true;
                sp.strangeMatter -= rockets1Cost;
                sd1.rocketsPerSpaceFactory = 5;
                break;
            case 5:
                sp.rockets2 = true;
                sp.strangeMatter -= rockets2Cost;
                sd1.rocketsPerSpaceFactory = 3;
                break;
            case 6:
                sp.rockets3 = true;
                sp.strangeMatter -= rockets3Cost;
                sd1.rocketsPerSpaceFactory = 1;
                break;
        }
    }

    private void PurchaseFoundation(int i)
    {
        switch (i)
        {
            case 1:
                sp.hunter1 = true;
                sp.strangeMatter -= hunter1Cost;
                if (sd1.hunters < 1) sd1.hunters = 1;
                break;
            case 2:
                sp.hunter2 = true;
                sp.strangeMatter -= hunter2Cost;
                if (sd1.hunters < 10) sd1.hunters = 10;
                break;
            case 3:
                sp.hunter3 = true;
                sp.strangeMatter -= hunter3Cost;
                if (sd1.hunters < 1000) sd1.hunters = 1000;
                break;
            case 4:
                sp.hunter4 = true;
                sp.strangeMatter -= hunter4Cost;
                oracle.saveSettings.saveData.huntersPerPurchase = 1000;
                break;
            case 5:
                sp.gatherer1 = true;
                sp.strangeMatter -= gatherer1Cost;
                if (sd1.gatherers < 1) sd1.gatherers = 1;
                break;
            case 6:
                sp.gatherer2 = true;
                sp.strangeMatter -= gatherer2Cost;
                if (sd1.gatherers < 10) sd1.gatherers = 10;
                break;
            case 7:
                sp.gatherer3 = true;
                sp.strangeMatter -= gatherer3Cost;
                if (sd1.gatherers < 1000) sd1.gatherers = 1000;
                break;
            case 8:
                sp.gatherer4 = true;
                sp.strangeMatter -= gatherer4Cost;
                oracle.saveSettings.saveData.gatherersPerPurchase = 1000;
                break;
            case 9:
                sp.workerBoost = true;
                sp.strangeMatter -= workerBoostCost;
                sp.workerBoostAcivator = true;
                break;
            case 10:
                sp.citiesBoost = true;
                sp.strangeMatter -= citiesBoostCost;
                sp.citiesBoostActivator = true;
                break;
        }
    }

    private void PurchaseEducation(int i)
    {
        switch (i)
        {
            case 1:
                sp.engineering1 = true;
                sp.strangeMatter -= engineering1Cost;
                sd1.engineeringResearchTime = 300;
                break;
            case 2:
                sp.engineering2 = true;
                sp.strangeMatter -= engineering2Cost;
                sd1.engineeringResearchTime = 60;
                break;
            case 3:
                sp.engineering3 = true;
                sp.strangeMatter -= engineering3Cost;
                sd1.engineeringComplete = true;
                break;
            case 4:
                sp.shipping1 = true;
                sp.strangeMatter -= shipping1Cost;
                sd1.shippingResearchTime = 600;
                break;
            case 5:
                sp.shipping2 = true;
                sp.strangeMatter -= shipping2Cost;
                sd1.shippingComplete = true;
                break;
            case 6:
                sp.worldTrade1 = true;
                sp.strangeMatter -= worldTrade1Cost;
                sd1.worldTradeResearchTime = 1800;
                break;
            case 7:
                sp.worldTrade2 = true;
                sp.strangeMatter -= worldTrade2Cost;
                sd1.worldTradeResearchTime = 600;
                break;
            case 8:
                sp.worldTrade3 = true;
                sp.strangeMatter -= worldTrade3Cost;
                sd1.worldTradeComplete = true;
                break;
            case 9:
                sp.worldPeace1 = true;
                sp.strangeMatter -= worldPeace1Cost;
                sd1.worldPeaceResearchTime = 3600;
                break;
            case 10:
                sp.worldPeace2 = true;
                sp.strangeMatter -= worldPeace2Cost;
                sd1.worldPeaceResearchTime = 1800;
                break;
            case 11:
                sp.worldPeace3 = true;
                sp.strangeMatter -= worldPeace3Cost;
                sd1.worldPeaceResearchTime = 600;
                break;
            case 12:
                sp.worldPeace4 = true;
                sp.strangeMatter -= worldPeace4Cost;
                sd1.worldPeaceComplete = true;
                break;
            case 13:
                sp.mathematics1 = true;
                sp.strangeMatter -= mathematics1Cost;
                sd1.mathematicsResearchTime = 1800;
                break;
            case 14:
                sp.mathematics2 = true;
                sp.strangeMatter -= mathematics2Cost;
                sd1.mathematicsResearchTime = 600;
                break;
            case 15:
                sp.mathematics3 = true;
                sp.strangeMatter -= mathematics3Cost;
                sd1.mathematicsComplete = true;
                break;
            case 16:
                sp.advancedPhysics1 = true;
                sp.strangeMatter -= advancedPhysics1Cost;
                sd1.advancedPhysicsResearchTime = 3600;
                break;
            case 17:
                sp.advancedPhysics2 = true;
                sp.strangeMatter -= advancedPhysics2Cost;
                sd1.advancedPhysicsResearchTime = 1800;
                break;
            case 18:
                sp.advancedPhysics3 = true;
                sp.strangeMatter -= advancedPhysics3Cost;
                sd1.advancedPhysicsResearchTime = 600;
                break;
            case 19:
                sp.advancedPhysics4 = true;
                sp.strangeMatter -= advancedPhysics4Cost;
                sd1.advancedPhysicsComplete = true;
                break;
        }
    }

    private void PurchaseCounterGw()
    {
        sp.counterGw = true;
        sp.strangeMatter -= counterGwCost;
        sp.disasterStage = 42;
    }

    private void PurchaseCounterAi()
    {
        sp.counterAi = true;
        sp.strangeMatter -= counterAiCost;
        sp.disasterStage = 3;
    }

    private void PurchaseCounterMeteor()
    {
        sp.counterMeteor = true;
        sp.strangeMatter -= counterMeteorCost;
        sp.disasterStage = 2;
    }

    #endregion

    #region RealityMethods

    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

    private void PurchaseTranslation(int i)
    {
        switch (i)
        {
            case 1:
                sp.translation1 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation1Cost;
                break;
            case 2:
                sp.translation2 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation2Cost;
                break;
            case 3:
                sp.translation3 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation3Cost;
                break;
            case 4:
                sp.translation4 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation4Cost;
                break;
            case 5:
                sp.translation5 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation5Cost;
                break;
            case 6:
                sp.translation6 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation6Cost;
                break;
            case 7:
                sp.translation7 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation7Cost;
                break;
            case 8:
                sp.translation8 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= translation8Cost;
                break;
        }
    }

    private void PurchaseSpeed(int i)
    {
        switch (i)
        {
            case 1:
                sp.speed1 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed1Cost;
                break;
            case 2:
                sp.speed2 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed2Cost;
                break;
            case 3:
                sp.speed3 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed3Cost;
                break;
            case 4:
                sp.speed4 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed4Cost;
                break;
            case 5:
                sp.speed5 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed5Cost;
                break;
            case 6:
                sp.speed6 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed6Cost;
                break;
            case 7:
                sp.speed7 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed7Cost;
                break;
            case 8:
                sp.speed8 = true;
                skillTreeData.skillPointsTree++;
                sp.strangeMatter -= speed8Cost;
                break;
        }
    }

    private void PurchaseDoubleTime()
    {
        sp.doubleTimeOwned = true;
        sp.strangeMatter -= doubleTimeCost;
        sp.doubleTime = 600;
    }

    private void PurchaseAutomateInfluence()
    {
        oracle.saveSettings.saveData.workerAutoConvert = true;
        sp.strangeMatter -= automateGatherInfluenceCost;
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

        #region SimulationEnablers

        simulationCategory.SetActive(!sp.counterGw || sp.counterMeteor && !sp.engineering3 ||
                                     sp.counterGw && !sp.shipping2 ||
                                     sp.counterGw && !sp.worldTrade3 || sp.counterGw && !sp.worldPeace4 ||
                                     sp.counterGw && !sp.mathematics3 || sp.counterGw && !sp.advancedPhysics4 ||
                                     !sp.hunter4 || !sp.gatherer4 || !sp.workerBoost || !sp.citiesBoost ||
                                     sp.counterMeteor && !sp.factoriesBoost || sp.counterMeteor && !sp.bots2 ||
                                     sp.counterMeteor && !sp.rockets3 || sp.counterGw && !sp.railguns2 ||
                                     sp.counterGw && !sp.sfacs3);

        counterMeasuresCategory.SetActive(!sp.counterGw);
        UpdatePanel(_counterMeteorPanel, sp.strangeMatter >= counterMeteorCost, !sp.counterMeteor);
        UpdatePanel(_counterAiPanel, sp.strangeMatter >= counterAiCost, sp.counterMeteor && !sp.counterAi);
        UpdatePanel(_counterGwPanel, sp.strangeMatter >= counterGwCost, sp.counterAi && !sp.counterGw);

        educationCategory.SetActive(sp.counterMeteor && !sp.engineering3 || sp.engineering3 && !sp.shipping2 ||
                                    sp.counterGw && !sp.shipping2 ||
                                    sp.counterGw && !sp.worldTrade3 || sp.counterGw && !sp.worldPeace4 ||
                                    sp.counterGw && !sp.mathematics3 || sp.counterGw && !sp.advancedPhysics4 ||
                                    sp.worldTrade1 && !sp.worldTrade2 || sp.worldTrade2 && !sp.worldTrade3 ||
                                    sp.worldTrade1 && !sp.worldPeace1 || sp.worldPeace1 && !sp.worldPeace2 ||
                                    sp.worldPeace2 && !sp.worldPeace3 || sp.worldPeace3 && !sp.worldPeace4 ||
                                    sp.counterAi && !sp.mathematics1 || sp.mathematics1 && !sp.mathematics2 ||
                                    sp.mathematics2 && !sp.mathematics3 ||
                                    sp.mathematics1 && !sp.advancedPhysics1 ||
                                    sp.advancedPhysics1 && !sp.advancedPhysics2 ||
                                    sp.advancedPhysics2 && !sp.advancedPhysics3 ||
                                    sp.advancedPhysics3 && !sp.advancedPhysics4);

        UpdatePanel(_engineering1Panel, sp.strangeMatter >= engineering1Cost, sp.counterMeteor && !sp.engineering1);
        UpdatePanel(_engineering2Panel, sp.strangeMatter >= engineering2Cost, sp.engineering1 && !sp.engineering2);
        UpdatePanel(_engineering3Panel, sp.strangeMatter >= engineering3Cost, sp.engineering2 && !sp.engineering3);
        UpdatePanel(_shipping1Panel, sp.strangeMatter >= shipping1Cost, sp.engineering1 && !sp.shipping1);
        UpdatePanel(_shipping2Panel, sp.strangeMatter >= shipping2Cost, sp.shipping1 && !sp.shipping2);
        UpdatePanel(_worldTrade1Panel, sp.strangeMatter >= worldTrade1Cost, sp.shipping1 && !sp.worldTrade1);
        UpdatePanel(_worldTrade2Panel, sp.strangeMatter >= worldTrade2Cost, sp.worldTrade1 && !sp.worldTrade2);
        UpdatePanel(_worldTrade3Panel, sp.strangeMatter >= worldTrade3Cost, sp.worldTrade2 && !sp.worldTrade3);
        UpdatePanel(_worldPeace1Panel, sp.strangeMatter >= worldPeace1Cost, sp.worldTrade1 && !sp.worldPeace1);
        UpdatePanel(_worldPeace2Panel, sp.strangeMatter >= worldPeace2Cost, sp.worldPeace1 && !sp.worldPeace2);
        UpdatePanel(_worldPeace3Panel, sp.strangeMatter >= worldPeace3Cost, sp.worldPeace2 && !sp.worldPeace3);
        UpdatePanel(_worldPeace4Panel, sp.strangeMatter >= worldPeace4Cost, sp.worldPeace3 && !sp.worldPeace4);
        UpdatePanel(_mathematics1Panel, sp.strangeMatter >= mathematics1Cost, sp.counterAi && !sp.mathematics1);
        UpdatePanel(_mathematics2Panel, sp.strangeMatter >= mathematics2Cost, sp.mathematics1 && !sp.mathematics2);
        UpdatePanel(_mathematics3Panel, sp.strangeMatter >= mathematics3Cost, sp.mathematics2 && !sp.mathematics3);
        UpdatePanel(_advancedPhysics1Panel, sp.strangeMatter >= advancedPhysics1Cost, sp.mathematics1 && !sp.advancedPhysics1);
        UpdatePanel(_advancedPhysics2Panel, sp.strangeMatter >= advancedPhysics2Cost, sp.advancedPhysics1 && !sp.advancedPhysics2);
        UpdatePanel(_advancedPhysics3Panel, sp.strangeMatter >= advancedPhysics3Cost, sp.advancedPhysics2 && !sp.advancedPhysics3);
        UpdatePanel(_advancedPhysics4Panel, sp.strangeMatter >= advancedPhysics4Cost, sp.advancedPhysics3 && !sp.advancedPhysics4);

        foundationalEraCategory.SetActive(!sp.hunter4 || !sp.gatherer4 || !sp.workerBoost || !sp.citiesBoost);
        UpdatePanel(_hunter1Panel, sp.strangeMatter >= hunter1Cost, !sp.hunter1);
        UpdatePanel(_hunter2Panel, sp.strangeMatter >= hunter2Cost, sp.hunter1 && !sp.hunter2);
        UpdatePanel(_hunter3Panel, sp.strangeMatter >= hunter3Cost, sp.hunter2 && !sp.hunter3);
        UpdatePanel(_hunter4Panel, sp.strangeMatter >= hunter4Cost, sp.hunter2 && !sp.hunter4);
        UpdatePanel(_gathering1Panel, sp.strangeMatter >= gatherer1Cost, !sp.gatherer1);
        UpdatePanel(_gathering2Panel, sp.strangeMatter >= gatherer2Cost, sp.gatherer1 && !sp.gatherer2);
        UpdatePanel(_gathering3Panel, sp.strangeMatter >= gatherer3Cost, sp.gatherer2 && !sp.gatherer3);
        UpdatePanel(_gathering4Panel, sp.strangeMatter >= gatherer4Cost, sp.gatherer2 && !sp.gatherer4);
        UpdatePanel(_workerBoostPanel, sp.strangeMatter >= workerBoostCost, !sp.workerBoost);
        UpdatePanel(_citiesBoostPanel, sp.strangeMatter >= citiesBoostCost, sp.counterMeteor && !sp.citiesBoost);

        informationEraCategory.SetActive(sp.counterAi && !sp.factoriesBoost || sp.counterAi && !sp.bots2 ||
                                         sp.counterAi && !sp.rockets3);
        UpdatePanel(_factoriesBoostPanel, sp.strangeMatter >= factoriesBoostCost, sp.counterAi && !sp.factoriesBoost);
        UpdatePanel(_bots1Panel, sp.strangeMatter >= bots1Cost, sp.counterAi && !sp.bots1);
        UpdatePanel(_bots2Panel, sp.strangeMatter >= bots2Cost, sp.bots1 && !sp.bots2);
        UpdatePanel(_rockets1Panel, sp.strangeMatter >= rockets1Cost, sp.counterGw && !sp.rockets1);
        UpdatePanel(_rockets2Panel, sp.strangeMatter >= rockets2Cost, sp.rockets1 && !sp.rockets2);
        UpdatePanel(_rockets3Panel, sp.strangeMatter >= rockets3Cost, sp.rockets2 && !sp.rockets3);

        spaceAgeCategory.SetActive(sp.counterGw && !sp.railguns2 || sp.counterGw && !sp.sfacs3);
        UpdatePanel(_sfacs1Panel, sp.strangeMatter >= sfacs1Cost, sp.counterGw && !sp.sfacs1);
        UpdatePanel(_sfacs2Panel, sp.strangeMatter >= sfacs2Cost, sp.sfacs1 && !sp.sfacs2);
        UpdatePanel(_sfacs3Panel, sp.strangeMatter >= sfacs3Cost, sp.sfacs2 && !sp.sfacs3);
        UpdatePanel(_railgun1Panel, sp.strangeMatter >= railguns1Cost, sp.counterGw && !sp.railguns1);
        UpdatePanel(_railgun2Panel, sp.strangeMatter >= railguns2Cost, sp.railguns1 && !sp.railguns2);

        #endregion

        #region RealityEnablers

        UpdateRealityPanels();

        realityCategory.SetActive(!sp.speed8 || !sp.translation8 || !sp.doubleTimeOwned ||
                                  !oracle.saveSettings.saveData.workerAutoConvert);
        anomalyCategory.SetActive(!sp.translation8 || !sp.speed8);
        translationCategory.SetActive(!sp.translation8);
        speedCategory.SetActive(!sp.speed8);
        qolComplete.SetActive(!sp.doubleTimeOwned || !oracle.saveSettings.saveData.workerAutoConvert);

        #endregion
    }

    private void UpdateRealityPanels()
    {
        // Translation panels
        UpdatePanel(_translation1Panel, sp.strangeMatter >= translation1Cost, !sp.translation1);
        UpdatePanel(_translation2Panel, sp.strangeMatter >= translation2Cost, sp.translation1 && !sp.translation2);
        UpdatePanel(_translation3Panel, sp.strangeMatter >= translation3Cost, sp.translation2 && !sp.translation3);
        UpdatePanel(_translation4Panel, sp.strangeMatter >= translation4Cost, sp.translation3 && !sp.translation4);
        UpdatePanel(_translation5Panel, sp.strangeMatter >= translation5Cost, sp.translation4 && !sp.translation5);
        UpdatePanel(_translation6Panel, sp.strangeMatter >= translation6Cost, sp.translation5 && !sp.translation6);
        UpdatePanel(_translation7Panel, sp.strangeMatter >= translation7Cost, sp.translation6 && !sp.translation7);
        UpdatePanel(_translation8Panel, sp.strangeMatter >= translation8Cost, sp.translation7 && !sp.translation8);

        // Speed panels
        UpdatePanel(_speed1Panel, sp.strangeMatter >= speed1Cost, !sp.speed1);
        UpdatePanel(_speed2Panel, sp.strangeMatter >= speed2Cost, sp.speed1 && !sp.speed2);
        UpdatePanel(_speed3Panel, sp.strangeMatter >= speed3Cost, sp.speed2 && !sp.speed3);
        UpdatePanel(_speed4Panel, sp.strangeMatter >= speed4Cost, sp.speed3 && !sp.speed4);
        UpdatePanel(_speed5Panel, sp.strangeMatter >= speed5Cost, sp.speed4 && !sp.speed5);
        UpdatePanel(_speed6Panel, sp.strangeMatter >= speed6Cost, sp.speed5 && !sp.speed6);
        UpdatePanel(_speed7Panel, sp.strangeMatter >= speed7Cost, sp.speed6 && !sp.speed7);
        UpdatePanel(_speed8Panel, sp.strangeMatter >= speed8Cost, sp.speed7 && !sp.speed8);

        // QOL panels
        UpdatePanel(_doubleTimePanel, sp.strangeMatter >= doubleTimeCost, !sp.doubleTimeOwned);
        UpdatePanel(_autoGatherInfluencePanel, sp.strangeMatter >= automateGatherInfluenceCost, !oracle.saveSettings.saveData.workerAutoConvert);
    }

    private void UpdatePanel(UpgradePanelReferences panel, bool canAfford, bool shouldShow)
    {
        if (panel == null) return;
        panel.SetInteractable(canAfford);
        panel.SetVisible(shouldShow);
    }

    private void ApplyResearch()
    {
        #region SimulationApplication

        // Countermeasures
        if (!sp.counterMeteor)
            sp.disasterStage = 1;
        else if (sp.counterMeteor && !sp.counterAi)
            sp.disasterStage = 2;
        else if (sp.counterAi && !sp.counterGw)
            sp.disasterStage = 3;
        else if (sp.counterGw) sp.disasterStage = 42;

        // Education Upgrades
        if (sp.engineering1) sd1.engineeringResearchTime = 300;
        if (sp.engineering2) sd1.engineeringResearchTime = 60;
        if (sp.engineering3) sd1.engineeringComplete = true;

        if (sp.shipping1) sd1.shippingResearchTime = 600;
        if (sp.shipping2) sd1.shippingComplete = true;

        if (sp.worldTrade1) sd1.worldTradeResearchTime = 1800;
        if (sp.worldTrade2) sd1.worldTradeResearchTime = 600;
        if (sp.worldTrade3) sd1.worldTradeComplete = true;

        if (sp.worldPeace1) sd1.worldPeaceResearchTime = 3600;
        if (sp.worldPeace2) sd1.worldPeaceResearchTime = 1800;
        if (sp.worldPeace3) sd1.worldPeaceResearchTime = 600;
        if (sp.worldPeace4) sd1.worldPeaceComplete = true;

        if (sp.mathematics1) sd1.mathematicsResearchTime = 1800;
        if (sp.mathematics2) sd1.mathematicsResearchTime = 600;
        if (sp.mathematics3) sd1.mathematicsComplete = true;

        if (sp.advancedPhysics1) sd1.advancedPhysicsResearchTime = 3600;
        if (sp.advancedPhysics2) sd1.advancedPhysicsResearchTime = 1800;
        if (sp.advancedPhysics3) sd1.advancedPhysicsResearchTime = 600;
        if (sp.advancedPhysics4) sd1.advancedPhysicsComplete = true;

        // Foundational Era
        if (sp.hunter1) sd1.hunters = 1;
        if (sp.hunter2) sd1.hunters = 10;
        if (sp.hunter3) sd1.hunters = 1000;
        if (sp.hunter4) oracle.saveSettings.saveData.huntersPerPurchase = 1000;

        if (sp.gatherer1) sd1.gatherers = 1;
        if (sp.gatherer2) sd1.gatherers = 10;
        if (sp.gatherer3) sd1.gatherers = 1000;
        if (sp.gatherer4) oracle.saveSettings.saveData.gatherersPerPurchase = 1000;

        if (sp.workerBoost) sp.workerBoostAcivator = true;
        if (sp.citiesBoost) sp.citiesBoostActivator = true;

        // Information Era
        if (sp.factoriesBoost) sp.factoriesBoostActivator = true;

        if (sp.bots1) sp.botsBoost1Activator = true;
        if (sp.bots2) sp.botsBoost2Activator = true;

        if (sp.rockets1) sd1.rocketsPerSpaceFactory = 5;
        if (sp.rockets2) sd1.rocketsPerSpaceFactory = 3;
        if (sp.rockets3) sd1.rocketsPerSpaceFactory = 1;

        // Space Age
        if (sp.sfacs1) sp.sfActivator1 = true;
        if (sp.sfacs2) sp.sfActivator2 = true;
        if (sp.sfacs3) sp.sfActivator3 = true;

        if (sp.railguns1) sp.railgunActivator1 = true;
        if (sp.railguns2) sp.railgunActivator2 = true;

        #endregion
    }
}
