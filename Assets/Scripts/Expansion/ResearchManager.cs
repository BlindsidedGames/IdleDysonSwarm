using Sirenix.OdinInspector;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class ResearchManager : MonoBehaviour
{
    [SerializeField] private TMP_Text ResearchHeader;
    [SerializeField] private TMP_Text SimulationHeader;

    [SerializeField] private GameObject realityCategory;
    [SerializeField] private GameObject anomalyCategory;
    [SerializeField] private GameObject translationCategory;
    [SerializeField] private GameObject speedCategory;
    [SerializeField] private GameObject qolComplete;

    #region Simulation References

    #region Costs

    // Costs

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

    // Foundational Era  
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

    // Information Era
    private readonly int factoriesBoostCost = 21;

    private readonly int bots1Cost = 211;
    private readonly int bots2Cost = 1111;

    private readonly int rockets1Cost = 1111;
    private readonly int rockets2Cost = 2222;
    private readonly int rockets3Cost = 3333;

    // Space Age
    private readonly int sfacs1Cost = 1221;
    private readonly int sfacs2Cost = 12221;
    private readonly int sfacs3Cost = 122221;

    private readonly int railguns1Cost = 1221;
    private readonly int railguns2Cost = 12221;

    #endregion

    [SerializeField] private GameObject simulationCategory;
    [SerializeField] private GameObject counterMeasuresCategory;
    [SerializeField] private GameObject foundationalEraCategory;
    [SerializeField] private GameObject educationCategory;
    [SerializeField] private GameObject informationEraCategory;
    [SerializeField] private GameObject spaceAgeCategory;

    // Countermeasures
    [SerializeField] private Button _counterMeteor;
    [SerializeField] private GameObject _counterMeteorGo;
    [SerializeField] private Button _counterAi;
    [SerializeField] private GameObject _counterAiGo;
    [SerializeField] private Button _counterGw;
    [SerializeField] private GameObject _counterGwGo;

    // Education
    [SerializeField] private Button _engineering1;
    [SerializeField] private GameObject _engineering1Go;
    [SerializeField] private Button _engineering2;
    [SerializeField] private GameObject _engineering2Go;
    [SerializeField] private Button _engineering3;
    [SerializeField] private GameObject _engineering3Go;

    [SerializeField] private Button _shipping1;
    [SerializeField] private GameObject _shipping1Go;
    [SerializeField] private Button _shipping2;
    [SerializeField] private GameObject _shipping2Go;

    [SerializeField] private Button _worldTrade1;
    [SerializeField] private GameObject _worldTrade1Go;
    [SerializeField] private Button _worldTrade2;
    [SerializeField] private GameObject _worldTrade2Go;
    [SerializeField] private Button _worldTrade3;
    [SerializeField] private GameObject _worldTrade3Go;

    [SerializeField] private Button _worldPeace1;
    [SerializeField] private GameObject _worldPeace1Go;
    [SerializeField] private Button _worldPeace2;
    [SerializeField] private GameObject _worldPeace2Go;
    [SerializeField] private Button _worldPeace3;
    [SerializeField] private GameObject _worldPeace3Go;
    [SerializeField] private Button _worldPeace4;
    [SerializeField] private GameObject _worldPeace4Go;

    [SerializeField] private Button _mathematics1;
    [SerializeField] private GameObject _mathematics1Go;
    [SerializeField] private Button _mathematics2;
    [SerializeField] private GameObject _mathematics2Go;
    [SerializeField] private Button _mathematics3;
    [SerializeField] private GameObject _mathematics3Go;

    [SerializeField] private Button _advancedPhysics1;
    [SerializeField] private GameObject _advancedPhysics1Go;
    [SerializeField] private Button _advancedPhysics2;
    [SerializeField] private GameObject _advancedPhysics2Go;
    [SerializeField] private Button _advancedPhysics3;
    [SerializeField] private GameObject _advancedPhysics3Go;
    [SerializeField] private Button _advancedPhysics4;
    [SerializeField] private GameObject _advancedPhysics4Go;

    // Foundational
    [SerializeField] private Button _hunter1;
    [SerializeField] private GameObject _hunter1Go;
    [SerializeField] private Button _hunter2;
    [SerializeField] private GameObject _hunter2Go;
    [SerializeField] private Button _hunter3;
    [SerializeField] private GameObject _hunter3Go;
    [SerializeField] private Button _hunter4;
    [SerializeField] private GameObject _hunter4Go;

    [SerializeField] private Button _gathering1;
    [SerializeField] private GameObject _gathering1Go;
    [SerializeField] private Button _gathering2;
    [SerializeField] private GameObject _gathering2Go;
    [SerializeField] private Button _gathering3;
    [SerializeField] private GameObject _gathering3Go;
    [SerializeField] private Button _gathering4;
    [SerializeField] private GameObject _gathering4Go;

    [SerializeField] private Button _workerBoost;
    [SerializeField] private GameObject _workerBoostGo;

    [SerializeField] private Button _citiesBoost;
    [SerializeField] private GameObject _citiesBoostGo;

    // Information
    [SerializeField] private Button _factoriesBoost;
    [SerializeField] private GameObject _factoriesBoostGo;

    [SerializeField] private Button _bots1;
    [SerializeField] private GameObject _bots1Go;
    [SerializeField] private Button _bots2;
    [SerializeField] private GameObject _bots2Go;

    [SerializeField] private Button _rockets1;
    [SerializeField] private GameObject _rockets1Go;
    [SerializeField] private Button _rockets2;
    [SerializeField] private GameObject _rockets2Go;
    [SerializeField] private Button _rockets3;
    [SerializeField] private GameObject _rockets3Go;

    // Space Age
    [SerializeField] private Button _sfacs1;
    [SerializeField] private GameObject _sfacs1Go;
    [SerializeField] private Button _sfacs2;
    [SerializeField] private GameObject _sfacs2Go;
    [SerializeField] private Button _sfacs3;
    [SerializeField] private GameObject _sfacs3Go;


    [SerializeField] private Button _railgun1;
    [SerializeField] private GameObject _railgun1Go;
    [SerializeField] private Button _railgun2;
    [SerializeField] private GameObject _railgun2Go;

    #endregion

    #region Reality References

    #region Costs

    // Translation
    [OnValueChanged("SetCostsToAnomaly")] public int translation1Cost = 4;
    [OnValueChanged("SetCostsToAnomaly")] public int translation2Cost = 32;
    [OnValueChanged("SetCostsToAnomaly")] public int translation3Cost = 128;
    [OnValueChanged("SetCostsToAnomaly")] public int translation4Cost = 512;
    [OnValueChanged("SetCostsToAnomaly")] public int translation5Cost = 8192;
    [OnValueChanged("SetCostsToAnomaly")] public int translation6Cost = 65536;
    [OnValueChanged("SetCostsToAnomaly")] public int translation7Cost = 1048576;
    [OnValueChanged("SetCostsToAnomaly")] public int translation8Cost = 16777216;


    // Speed    
    [OnValueChanged("SetCostsToAnomaly")] public int speed1Cost = 16;
    [OnValueChanged("SetCostsToAnomaly")] public int speed2Cost = 256;
    [OnValueChanged("SetCostsToAnomaly")] public int speed3Cost = 4096;
    [OnValueChanged("SetCostsToAnomaly")] public int speed4Cost = 16384;
    [OnValueChanged("SetCostsToAnomaly")] public int speed5Cost = 262144;
    [OnValueChanged("SetCostsToAnomaly")] public int speed6Cost = 4194304;
    [OnValueChanged("SetCostsToAnomaly")] public int speed7Cost = 67108864;
    [OnValueChanged("SetCostsToAnomaly")] public int speed8Cost = 268435456;

    // Translation
    [SerializeField] private TMP_Text translation1Text;
    [SerializeField] private TMP_Text translation2Text;
    [SerializeField] private TMP_Text translation3Text;
    [SerializeField] private TMP_Text translation4Text;
    [SerializeField] private TMP_Text translation5Text;
    [SerializeField] private TMP_Text translation6Text;
    [SerializeField] private TMP_Text translation7Text;
    [SerializeField] private TMP_Text translation8Text;


    // Speed    
    [SerializeField] private TMP_Text speed1Text;
    [SerializeField] private TMP_Text speed2Text;
    [SerializeField] private TMP_Text speed3Text;
    [SerializeField] private TMP_Text speed4Text;
    [SerializeField] private TMP_Text speed5Text;
    [SerializeField] private TMP_Text speed6Text;
    [SerializeField] private TMP_Text speed7Text;
    [SerializeField] private TMP_Text speed8Text;

    [ContextMenu("SetCosts")]
    public void SetCostsToAnomaly()
    {
        translation1Text.text = $"Translation I<size=70%> - {translation1Cost:N0}sm";
        translation2Text.text = $"Translation II<size=70%> - {translation2Cost:N0}sm";
        translation3Text.text = $"Translation III<size=70%> - {translation3Cost:N0}sm";
        translation4Text.text = $"Translation IV<size=70%> - {translation4Cost:N0}sm";
        translation5Text.text = $"Translation V<size=70%> - {translation5Cost:N0}sm";
        translation6Text.text = $"Translation VI<size=70%> - {translation6Cost:N0}sm";
        translation7Text.text = $"Translation VII<size=70%> - {translation7Cost:N0}sm";
        translation8Text.text = $"Translation VIII<size=70%> - {translation8Cost:N0}sm";

        speed1Text.text = $"Speed Reduction I<size=70%> - {speed1Cost:N0}sm";
        speed2Text.text = $"Speed Reduction II<size=70%> - {speed2Cost:N0}sm";
        speed3Text.text = $"Speed Reduction III<size=70%> - {speed3Cost:N0}sm";
        speed4Text.text = $"Speed Reduction IV<size=70%> - {speed4Cost:N0}sm";
        speed5Text.text = $"Speed Reduction V<size=70%> - {speed5Cost:N0}sm";
        speed6Text.text = $"Speed Reduction VI<size=70%> - {speed6Cost:N0}sm";
        speed7Text.text = $"Speed Reduction VII<size=70%> - {speed7Cost:N0}sm";
        speed8Text.text = $"Speed Reduction VIII<size=70%> - {speed8Cost:N0}sm";
    }

    // QOL
    private readonly int doubleTimecost = 5;
    private readonly int automateGatherInfluencecost = 10;

    #endregion

    // Translation
    [SerializeField] private Button _translation1;
    [SerializeField] private GameObject _translation1Go;
    [SerializeField] private Button _translation2;
    [SerializeField] private GameObject _translation2Go;
    [SerializeField] private Button _translation3;
    [SerializeField] private GameObject _translation3Go;
    [SerializeField] private Button _translation4;
    [SerializeField] private GameObject _translation4Go;
    [SerializeField] private Button _translation5;
    [SerializeField] private GameObject _translation5Go;
    [SerializeField] private Button _translation6;
    [SerializeField] private GameObject _translation6Go;
    [SerializeField] private Button _translation7;
    [SerializeField] private GameObject _translation7Go;
    [SerializeField] private Button _translation8;

    [SerializeField] private GameObject _translation8Go;

    // Speed
    [SerializeField] private Button _speed1;
    [SerializeField] private GameObject _speed1Go;
    [SerializeField] private Button _speed2;
    [SerializeField] private GameObject _speed2Go;
    [SerializeField] private Button _speed3;
    [SerializeField] private GameObject _speed3Go;
    [SerializeField] private Button _speed4;
    [SerializeField] private GameObject _speed4Go;
    [SerializeField] private Button _speed5;
    [SerializeField] private GameObject _speed5Go;
    [SerializeField] private Button _speed6;
    [SerializeField] private GameObject _speed6Go;
    [SerializeField] private Button _speed7;
    [SerializeField] private GameObject _speed7Go;
    [SerializeField] private Button _speed8;
    [SerializeField] private GameObject _speed8Go;

    // QOL
    [SerializeField] private Button _doubleTime;
    [SerializeField] private GameObject _doubleTimeGo;
    [SerializeField] private Button _autoGatherInfluence;
    [SerializeField] private GameObject _autoGatherInfluenceGo;

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
        #region SimulationListeners

        InvokeRepeating(nameof(UpdateAndEnableResearches), 0, .1f);
        // Countermeasures
        _counterMeteor.onClick.AddListener(PurchaseCounterMeteor);
        _counterAi.onClick.AddListener(PurchaseCounterAi);
        _counterGw.onClick.AddListener(PurchaseCounterGw);
        // Research
        _engineering1.onClick.AddListener(() => PurchaseEducation(1));
        _engineering2.onClick.AddListener(() => PurchaseEducation(2));
        _engineering3.onClick.AddListener(() => PurchaseEducation(3));

        _shipping1.onClick.AddListener(() => PurchaseEducation(4));
        _shipping2.onClick.AddListener(() => PurchaseEducation(5));

        _worldTrade1.onClick.AddListener(() => PurchaseEducation(6));
        _worldTrade2.onClick.AddListener(() => PurchaseEducation(7));
        _worldTrade3.onClick.AddListener(() => PurchaseEducation(8));

        _worldPeace1.onClick.AddListener(() => PurchaseEducation(9));
        _worldPeace2.onClick.AddListener(() => PurchaseEducation(10));
        _worldPeace3.onClick.AddListener(() => PurchaseEducation(11));
        _worldPeace4.onClick.AddListener(() => PurchaseEducation(12));

        _mathematics1.onClick.AddListener(() => PurchaseEducation(13));
        _mathematics2.onClick.AddListener(() => PurchaseEducation(14));
        _mathematics3.onClick.AddListener(() => PurchaseEducation(15));

        _advancedPhysics1.onClick.AddListener(() => PurchaseEducation(16));
        _advancedPhysics2.onClick.AddListener(() => PurchaseEducation(17));
        _advancedPhysics3.onClick.AddListener(() => PurchaseEducation(18));
        _advancedPhysics4.onClick.AddListener(() => PurchaseEducation(19));
        // Foundational Era
        _hunter1.onClick.AddListener(() => PurchaseFoundation(1));
        _hunter2.onClick.AddListener(() => PurchaseFoundation(2));
        _hunter3.onClick.AddListener(() => PurchaseFoundation(3));
        _hunter4.onClick.AddListener(() => PurchaseFoundation(4));

        _gathering1.onClick.AddListener(() => PurchaseFoundation(5));
        _gathering2.onClick.AddListener(() => PurchaseFoundation(6));
        _gathering3.onClick.AddListener(() => PurchaseFoundation(7));
        _gathering4.onClick.AddListener(() => PurchaseFoundation(8));

        _workerBoost.onClick.AddListener(() => PurchaseFoundation(9));

        _citiesBoost.onClick.AddListener(() => PurchaseFoundation(10));
        // Information Era
        _factoriesBoost.onClick.AddListener(() => PurchaseInformation(1));

        _bots1.onClick.AddListener(() => PurchaseInformation(2));
        _bots2.onClick.AddListener(() => PurchaseInformation(3));

        _rockets1.onClick.AddListener(() => PurchaseInformation(4));
        _rockets2.onClick.AddListener(() => PurchaseInformation(5));
        _rockets3.onClick.AddListener(() => PurchaseInformation(6));
        // Space Age
        _sfacs1.onClick.AddListener(() => PurchaseSpaceAge(1));
        _sfacs2.onClick.AddListener(() => PurchaseSpaceAge(2));
        _sfacs3.onClick.AddListener(() => PurchaseSpaceAge(3));

        _railgun1.onClick.AddListener(() => PurchaseSpaceAge(4));
        _railgun2.onClick.AddListener(() => PurchaseSpaceAge(5));

        #endregion

        #region RealityListeners

        _translation1.onClick.AddListener(() => PurchaseTranslation(1));
        _translation2.onClick.AddListener(() => PurchaseTranslation(2));
        _translation3.onClick.AddListener(() => PurchaseTranslation(3));
        _translation4.onClick.AddListener(() => PurchaseTranslation(4));
        _translation5.onClick.AddListener(() => PurchaseTranslation(5));
        _translation6.onClick.AddListener(() => PurchaseTranslation(6));
        _translation7.onClick.AddListener(() => PurchaseTranslation(7));
        _translation8.onClick.AddListener(() => PurchaseTranslation(8));

        _speed1.onClick.AddListener(() => PurchaseSpeed(1));
        _speed2.onClick.AddListener(() => PurchaseSpeed(2));
        _speed3.onClick.AddListener(() => PurchaseSpeed(3));
        _speed4.onClick.AddListener(() => PurchaseSpeed(4));
        _speed5.onClick.AddListener(() => PurchaseSpeed(5));
        _speed6.onClick.AddListener(() => PurchaseSpeed(6));
        _speed7.onClick.AddListener(() => PurchaseSpeed(7));
        _speed8.onClick.AddListener(() => PurchaseSpeed(8));

        _doubleTime.onClick.AddListener(PurchaseDoubleTime);

        _autoGatherInfluence.onClick.AddListener(PurchaseAutomateInfluence);

        #endregion
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
        sp.strangeMatter -= doubleTimecost;
        sp.doubleTime = 600;
    }

    private void PurchaseAutomateInfluence()
    {
        oracle.saveSettings.saveData.workerAutoConvert = true;
        sp.strangeMatter -= automateGatherInfluencecost;
    }

    #endregion

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

        _counterMeteor.interactable = sp.strangeMatter >= counterMeteorCost;
        _counterMeteorGo.SetActive(!sp.counterMeteor);
        _counterAi.interactable = sp.strangeMatter >= counterAiCost;
        _counterAiGo.SetActive(sp.counterMeteor && !sp.counterAi);
        _counterGw.interactable = sp.strangeMatter >= counterGwCost;
        _counterGwGo.SetActive(sp.counterAi && !sp.counterGw);


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

        _engineering1.interactable = sp.strangeMatter >= engineering1Cost;
        _engineering1Go.SetActive(sp.counterMeteor && !sp.engineering1);
        _engineering2.interactable = sp.strangeMatter >= engineering2Cost;
        _engineering2Go.SetActive(sp.engineering1 && !sp.engineering2);
        _engineering3.interactable = sp.strangeMatter >= engineering3Cost;
        _engineering3Go.SetActive(sp.engineering2 && !sp.engineering3);

        _shipping1.interactable = sp.strangeMatter >= shipping1Cost;
        _shipping1Go.SetActive(sp.engineering1 && !sp.shipping1);
        _shipping2.interactable = sp.strangeMatter >= shipping2Cost;
        _shipping2Go.SetActive(sp.shipping1 && !sp.shipping2);

        _worldTrade1.interactable = sp.strangeMatter >= worldTrade1Cost;
        _worldTrade1Go.SetActive(sp.shipping1 && !sp.worldTrade1);
        _worldTrade2.interactable = sp.strangeMatter >= worldTrade2Cost;
        _worldTrade2Go.SetActive(sp.worldTrade1 && !sp.worldTrade2);
        _worldTrade3.interactable = sp.strangeMatter >= worldTrade3Cost;
        _worldTrade3Go.SetActive(sp.worldTrade2 && !sp.worldTrade3);

        _worldPeace1.interactable = sp.strangeMatter >= worldPeace1Cost;
        _worldPeace1Go.SetActive(sp.worldTrade1 && !sp.worldPeace1);
        _worldPeace2.interactable = sp.strangeMatter >= worldPeace2Cost;
        _worldPeace2Go.SetActive(sp.worldPeace1 && !sp.worldPeace2);
        _worldPeace3.interactable = sp.strangeMatter >= worldPeace3Cost;
        _worldPeace3Go.SetActive(sp.worldPeace2 && !sp.worldPeace3);
        _worldPeace4.interactable = sp.strangeMatter >= worldPeace4Cost;
        _worldPeace4Go.SetActive(sp.worldPeace3 && !sp.worldPeace4);

        _mathematics1.interactable = sp.strangeMatter >= mathematics1Cost;
        _mathematics1Go.SetActive(sp.counterAi && !sp.mathematics1);
        _mathematics2.interactable = sp.strangeMatter >= mathematics2Cost;
        _mathematics2Go.SetActive(sp.mathematics1 && !sp.mathematics2);
        _mathematics3.interactable = sp.strangeMatter >= mathematics3Cost;
        _mathematics3Go.SetActive(sp.mathematics2 && !sp.mathematics3);

        _advancedPhysics1.interactable = sp.strangeMatter >= advancedPhysics1Cost;
        _advancedPhysics1Go.SetActive(sp.mathematics1 && !sp.advancedPhysics1);
        _advancedPhysics2.interactable = sp.strangeMatter >= advancedPhysics2Cost;
        _advancedPhysics2Go.SetActive(sp.advancedPhysics1 && !sp.advancedPhysics2);
        _advancedPhysics3.interactable = sp.strangeMatter >= advancedPhysics3Cost;
        _advancedPhysics3Go.SetActive(sp.advancedPhysics2 && !sp.advancedPhysics3);
        _advancedPhysics4.interactable = sp.strangeMatter >= advancedPhysics4Cost;
        _advancedPhysics4Go.SetActive(sp.advancedPhysics3 && !sp.advancedPhysics4);

        // Foundational Era    
        foundationalEraCategory.SetActive(!sp.hunter4 || !sp.gatherer4 || !sp.workerBoost || !sp.citiesBoost);
        _hunter1.interactable = sp.strangeMatter >= hunter1Cost;
        _hunter1Go.SetActive(!sp.hunter1);
        _hunter2.interactable = sp.strangeMatter >= hunter2Cost;
        _hunter2Go.SetActive(sp.hunter1 && !sp.hunter2);
        _hunter3.interactable = sp.strangeMatter >= hunter3Cost;
        _hunter3Go.SetActive(sp.hunter2 && !sp.hunter3);
        _hunter4.interactable = sp.strangeMatter >= hunter4Cost;
        _hunter4Go.SetActive(sp.hunter2 && !sp.hunter4);

        _gathering1.interactable = sp.strangeMatter >= gatherer1Cost;
        _gathering1Go.SetActive(!sp.gatherer1);
        _gathering2.interactable = sp.strangeMatter >= gatherer2Cost;
        _gathering2Go.SetActive(sp.gatherer1 && !sp.gatherer2);
        _gathering3.interactable = sp.strangeMatter >= gatherer3Cost;
        _gathering3Go.SetActive(sp.gatherer2 && !sp.gatherer3);
        _gathering4.interactable = sp.strangeMatter >= gatherer4Cost;
        _gathering4Go.SetActive(sp.gatherer2 && !sp.gatherer4);

        _workerBoost.interactable = sp.strangeMatter >= workerBoostCost;
        _workerBoostGo.SetActive(!sp.workerBoost);

        _citiesBoost.interactable = sp.strangeMatter >= citiesBoostCost;
        _citiesBoostGo.SetActive(sp.counterMeteor && !sp.citiesBoost);

// Information Era
        informationEraCategory.SetActive(sp.counterAi && !sp.factoriesBoost || sp.counterAi && !sp.bots2 ||
                                         sp.counterAi && !sp.rockets3);
        _factoriesBoost.interactable = sp.strangeMatter >= factoriesBoostCost;
        _factoriesBoostGo.SetActive(sp.counterAi && !sp.factoriesBoost);

        _bots1.interactable = sp.strangeMatter >= bots1Cost;
        _bots1Go.SetActive(sp.counterAi && !sp.bots1);
        _bots2.interactable = sp.strangeMatter >= bots2Cost;
        _bots2Go.SetActive(sp.bots1 && !sp.bots2);

        _rockets1.interactable = sp.strangeMatter >= rockets1Cost;
        _rockets1Go.SetActive(sp.counterGw && !sp.rockets1);
        _rockets2.interactable = sp.strangeMatter >= rockets2Cost;
        _rockets2Go.SetActive(sp.rockets1 && !sp.rockets2);
        _rockets3.interactable = sp.strangeMatter >= rockets3Cost;
        _rockets3Go.SetActive(sp.rockets2 && !sp.rockets3);
// Space Age
        spaceAgeCategory.SetActive(sp.counterGw && !sp.railguns2 || sp.counterGw && !sp.sfacs3);

        _sfacs1.interactable = sp.strangeMatter >= sfacs1Cost;
        _sfacs1Go.SetActive(sp.counterGw && !sp.sfacs1);
        _sfacs2.interactable = sp.strangeMatter >= sfacs2Cost;
        _sfacs2Go.SetActive(sp.sfacs1 && !sp.sfacs2);
        _sfacs3.interactable = sp.strangeMatter >= sfacs3Cost;
        _sfacs3Go.SetActive(sp.sfacs2 && !sp.sfacs3);

        _railgun1.interactable = sp.strangeMatter >= railguns1Cost;
        _railgun1Go.SetActive(sp.counterGw && !sp.railguns1);
        _railgun2.interactable = sp.strangeMatter >= railguns2Cost;
        _railgun2Go.SetActive(sp.railguns1 && !sp.railguns2);

        #endregion

        #region RealityEnablers

        _translation1.interactable = sp.strangeMatter >= translation1Cost;
        _translation1Go.SetActive(!sp.translation1);
        _translation2.interactable = sp.strangeMatter >= translation2Cost;
        _translation2Go.SetActive(sp.translation1 && !sp.translation2);
        _translation3.interactable = sp.strangeMatter >= translation3Cost;
        _translation3Go.SetActive(sp.translation2 && !sp.translation3);
        _translation4.interactable = sp.strangeMatter >= translation4Cost;
        _translation4Go.SetActive(sp.translation3 && !sp.translation4);
        _translation5.interactable = sp.strangeMatter >= translation5Cost;
        _translation5Go.SetActive(sp.translation4 && !sp.translation5);
        _translation6.interactable = sp.strangeMatter >= translation6Cost;
        _translation6Go.SetActive(sp.translation5 && !sp.translation6);
        _translation7.interactable = sp.strangeMatter >= translation7Cost;
        _translation7Go.SetActive(sp.translation6 && !sp.translation7);
        _translation8.interactable = sp.strangeMatter >= translation8Cost;
        _translation8Go.SetActive(sp.translation7 && !sp.translation8);

        _speed1.interactable = sp.strangeMatter >= speed1Cost;
        _speed1Go.SetActive(!sp.speed1);
        _speed2.interactable = sp.strangeMatter >= speed2Cost;
        _speed2Go.SetActive(sp.speed1 && !sp.speed2);
        _speed3.interactable = sp.strangeMatter >= speed3Cost;
        _speed3Go.SetActive(sp.speed2 && !sp.speed3);
        _speed4.interactable = sp.strangeMatter >= speed4Cost;
        _speed4Go.SetActive(sp.speed3 && !sp.speed4);
        _speed5.interactable = sp.strangeMatter >= speed5Cost;
        _speed5Go.SetActive(sp.speed4 && !sp.speed5);
        _speed6.interactable = sp.strangeMatter >= speed6Cost;
        _speed6Go.SetActive(sp.speed5 && !sp.speed6);
        _speed7.interactable = sp.strangeMatter >= speed7Cost;
        _speed7Go.SetActive(sp.speed6 && !sp.speed7);
        _speed8.interactable = sp.strangeMatter >= speed8Cost;
        _speed8Go.SetActive(sp.speed7 && !sp.speed8);

        _doubleTime.interactable = sp.strangeMatter >= doubleTimecost;
        _doubleTimeGo.SetActive(!sp.doubleTimeOwned);

        _autoGatherInfluence.interactable = sp.strangeMatter >= automateGatherInfluencecost;
        _autoGatherInfluenceGo.SetActive(!oracle.saveSettings.saveData.workerAutoConvert);

        realityCategory.SetActive(!sp.speed8 || !sp.translation8 || !sp.doubleTimeOwned ||
                                  !oracle.saveSettings.saveData.workerAutoConvert);
        anomalyCategory.SetActive(!sp.translation8 || !sp.speed8);
        translationCategory.SetActive(!sp.translation8);
        speedCategory.SetActive(!sp.speed8);
        qolComplete.SetActive(!sp.doubleTimeOwned || !oracle.saveSettings.saveData.workerAutoConvert);

        #endregion
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
