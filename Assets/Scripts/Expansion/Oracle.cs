using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Classes;
using PlayFab;
using PlayFab.ClientModels;
using UnityEngine;
using UnityEngine.Networking;
using static LoadScreenMethods;
using Sirenix.Serialization;
using Sirenix.OdinInspector;
using Systems;
using UnityEngine.SceneManagement;

public class Oracle : SerializedMonoBehaviour
{
    [SerializeField] private AssemblyLineManager _assemblyLineManager;
    [SerializeField] private ManagerManager _managerManager;
    [SerializeField] private ServerManager _serverManager;
    [SerializeField] private PlanetManager _planetManager;
    [SerializeField] private GameObject prestigeButton;
    [SerializeField] private SidePanelManager SidePanelManager;
    [SerializeField] public SkillTreeConfirmationManager _skillTreeConfirmationManager;
    [SerializeField] public LineManager linePrefab;
    [SerializeField] public Transform lineHolder;
    [SerializeField] private GameManager _gameManager;

    public static event Action UpdateSkills;

    private DysonVerseInfinityData dvid => saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSkillTreeData dvst => saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    private readonly string fileName = "betaTestTwo";

    public Dictionary<int, SkillTreeItem> SkillTree = new();
    public List<SkillTreeManager> allSkillTreeManagers = new();
    public GameObject skillsHolder;
    public List<int> listOfSkillsNotToAutoBuy = new();

    //public List<int> skillAutoAssignmentList = new();
    public bool Loaded;

    private void Start()
    {
        var listOfSkillTreeManagersToAdd = skillsHolder.GetComponentsInChildren<SkillTreeManager>();
        foreach (var item in listOfSkillTreeManagersToAdd) allSkillTreeManagers.Add(item);

        foreach (var skill in allSkillTreeManagers) skill.MakeLines();
        BsNewsGet();
        Loaded = false;
        Load();
        Loaded = true;
        Application.targetFrameRate =
            saveSettings.frameRate != 0 ? saveSettings.frameRate : Screen.currentResolution.refreshRate;
        InvokeRepeating(nameof(Save), 60, 60);
        if (lsm != null) lsm.CloseLoadScreen();
    }


    private void Update()
    {
        prestigeButton.SetActive(dvpd.infinityPoints >= 42);
    }


    private void OnApplicationQuit()
    {
        Save();
    }

#if !UNITY_EDITOR
    void OnApplicationFocus(bool focus)
    {
        if (focus)
        {
#if UNITY_IOS
            Load();
#elif UNITY_ANDROID
            Load();
#endif
        }
        if (!focus)
        {
            Save();
        }
    }
#endif


    #region NewsTicker

    public BsGamesData bsGamesData;
    public bool gotNews;

    [ContextMenu("BsNewsGet")]
    public async void BsNewsGet()
    {
        var url = "https://www.blindsidedgames.com/newsTicker";

        using var www = UnityWebRequest.Get(url);

        www.SetRequestHeader("Content-Type", "application/jason");
        var operation = www.SendWebRequest();

        while (!operation.isDone) await Task.Yield();

        if (www.result == UnityWebRequest.Result.Success)
        {
            bsGamesData = new BsGamesData();

            var newsjson = www.downloadHandler.text;
            //Debug.Log(json);
            bsGamesData = JsonUtility.FromJson<BsGamesData>(newsjson);
            gotNews = true;
        }
        else
        {
            Debug.Log($"error {www.error}");
        }
    }

    [Serializable]
    public class BsGamesData
    {
        public string latestGameName;
        public string latestGameLink;
        public string latestGameAppStore;
        public string newsTicker;
        public string patreons;
        public string idleDysonSwarm;
    }

    #endregion

    #region Oracle

    public SaveDataSettings saveSettings;

    private string _json;

    #region SaveMethods

    public void WipeAllData()
    {
        File.Delete(Application.persistentDataPath + "/" + fileName + ".idsOdin");
#if UNITY_IOS || UNITY_ANDROID
        SceneManager.LoadScene(Screen.width > Screen.height ? 2 : 1);
#else
        SceneManager.LoadScene(2);
#endif
    }

    [ContextMenu("WipeSaveData")]
    public void WipeSaveData()
    {
        foreach (var var in SkillTree) var.Value.Owned = false;
        saveSettings = new SaveDataSettings
        {
            saveData = new SaveData(),
            dysonVerseSaveData = new DysonVerseSaveData
            {
                dysonVerseInfinityData = new DysonVerseInfinityData(),
                dysonVersePrestigeData = new DysonVersePrestigeData(),
                dysonVerseSkillTreeData = new DysonVerseSkillTreeData()
            },
            sdPrestige = new SaveDataPrestige(),
            sdSimulation = new SaveDataDream1(),
            prestigePlus = new PrestigePlus()
        };
        if (Loaded)
            saveSettings.firstReality = true;
    }

    [ContextMenu("WipeDream1Save")]
    public void WipeDream1Save()
    {
        saveSettings.sdSimulation = new SaveDataDream1();
    }


    [ContextMenu("Save")]
    public void Save()
    {
        saveSettings.dateQuitString = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        SaveState(Application.persistentDataPath + "/" + fileName + ".idsOdin");
    }

    public void SaveState(string filePath)
    {
        saveSettings.dysonVerseSaveData.dysonVerseInfinityData.SkillTreeSaveData = SkillTree;
        //saveSettings.dysonVerseSaveData.skillAutoAssignmentListSaved = skillAutoAssignmentList;
        var bytes = SerializationUtility.SerializeValue(saveSettings, DataFormat.JSON);
        File.WriteAllBytes(filePath, bytes);
    }

    public void Load()
    {
        Loaded = false;
        WipeSaveData();

        if (File.Exists(Application.persistentDataPath + "/" + fileName + ".idsOdin"))
        {
            LoadState(Application.persistentDataPath + "/" + fileName + ".idsOdin");
        }

        else
        {
            saveSettings.dateStarted = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
            Loaded = true;
        }

        UpdateSkills?.Invoke();
        StartCoroutine(AwayForCoroutine());
    }

    public void LoadState(string filePath)
    {
        if (!File.Exists(filePath)) return;

        var bytes = File.ReadAllBytes(filePath);
        saveSettings = SerializationUtility.DeserializeValue<SaveDataSettings>(bytes, DataFormat.JSON);

        foreach (var variable in SkillTree)
        {
            if (!saveSettings.dysonVerseSaveData.dysonVerseInfinityData.SkillTreeSaveData.ContainsKey(variable.Key))
                saveSettings.dysonVerseSaveData.dysonVerseInfinityData.SkillTreeSaveData.Add(variable.Key,
                    variable.Value);
            variable.Value.Owned = saveSettings.dysonVerseSaveData.dysonVerseInfinityData
                .SkillTreeSaveData[variable.Key].Owned;
        }

        //skillAutoAssignmentList = saveSettings.dysonVerseSaveData.skillAutoAssignmentListSaved;
        if (!oracle.saveSettings.cheater && oracle.saveSettings.maxOfflineTime < 86400)
            oracle.saveSettings.maxOfflineTime = 86400;
        Loaded = true;
    }

    public static event Action<double> AwayFor;

    private IEnumerator AwayForCoroutine()
    {
        yield return new WaitForSeconds(.1f);
        AwayForSeconds();
    }

    private void AwayForSeconds()
    {
        if (string.IsNullOrEmpty(oracle.saveSettings.dateQuitString)) return;
        var dateStarted = DateTime.Parse(oracle.saveSettings.dateQuitString, CultureInfo.InvariantCulture);
        var dateNow = DateTime.UtcNow;
        var timespan = dateNow - dateStarted;
        var seconds = (float)timespan.TotalSeconds;
        if (seconds < 0) seconds = 0;
        saveSettings.sdPrestige.doubleTime += seconds;
        AwayFor?.Invoke(seconds);
    }

    #endregion

    public void InvokeUpdateSkills()
    {
        UpdateSkills?.Invoke();
    }

    #region DysonVerseInfinity

    public void DysonInfinity()
    {
        saveSettings.firstInfinityDone = true;
        dvpd.androidsSkillTimer = 0;
        dvpd.pocketAndroidsTimer = 0;
        var bankedSkills = 0;
        if (SkillTree[11].Owned) bankedSkills++;
        if (SkillTree[12].Owned) bankedSkills++;
        foreach (var var in SkillTree) var.Value.Owned = false;

        saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();
        dvpd.infinityPoints += saveSettings.prestigePlus.doubleIP ? 2 : 1;
        dvid.bots = dvpd.infinityAssemblyLines ? 10 : 1;
        dvid.assemblyLines[1] = dvpd.infinityAssemblyLines ? 10 : 0;
        dvid.managers[1] = dvpd.infinityAiManagers ? 10 : 0;
        dvid.servers[1] = dvpd.infinityServers ? 10 : 0;
        dvid.dataCenters[1] = dvpd.infinityDataCenter ? 10 : 0;
        dvid.planets[1] = dvpd.infinityPlanets ? 10 : 0;

        dvst.skillPointsTree = dvpd.permanentSkillPoint + bankedSkills + ArtifactSkillPoints();

        if (saveSettings.firstReality)
        {
            SidePanelManager.InfinityToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
            saveSettings.firstReality = false;
        }

        if (dvpd.infinityPoints == 42)
            SidePanelManager.PrestigeToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
        dvst.fragments = 0;
        _gameManager.AutoAssignSkillsInvoke();
        WipeSaveButtonUpdate();
    }

    public void ManualDysonInfinity()
    {
        saveSettings.firstInfinityDone = true;
        dvpd.androidsSkillTimer = 0;
        dvpd.pocketAndroidsTimer = 0;
        var bankedSkills = 0;
        if (SkillTree[11].Owned) bankedSkills++;
        if (SkillTree[12].Owned) bankedSkills++;
        foreach (var var in SkillTree) var.Value.Owned = false;

        var amount = pp.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, pp.divisionsPurchased) : 4.2e19;
        var ipToGain = StaticMethods.InfinityPointsToGain(amount, dvid.bots);
        dvpd.infinityPoints += saveSettings.prestigePlus.doubleIP ? ipToGain * 2 : ipToGain;

        saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();
        dvid.bots = dvpd.infinityAssemblyLines ? 10 : 1;
        dvid.assemblyLines[1] = dvpd.infinityAssemblyLines ? 10 : 0;
        dvid.managers[1] = dvpd.infinityAiManagers ? 10 : 0;
        dvid.servers[1] = dvpd.infinityServers ? 10 : 0;
        dvid.dataCenters[1] = dvpd.infinityDataCenter ? 10 : 0;
        dvid.planets[1] = dvpd.infinityPlanets ? 10 : 0;

        dvst.skillPointsTree = dvpd.permanentSkillPoint + bankedSkills + ArtifactSkillPoints();

        dvst.fragments = 0;
        _gameManager.AutoAssignSkillsInvoke();
        WipeSaveButtonUpdate();
    }

    public void EnactPrestigePlus()
    {
        saveSettings.firstInfinityDone = true;
        switch (pp.quantumEntanglement)
        {
            case true:
            {
                saveSettings.prestigePlus.points +=
                    (long)Math.Floor((dvpd.infinityPoints - dvpd.spentInfinityPoints) / 42f);
                dvpd.infinityPoints -= (long)Math.Floor((dvpd.infinityPoints - dvpd.spentInfinityPoints) / 42f) * 42;
            }
                break;
            case false:
            {
                foreach (var var in SkillTree) var.Value.Owned = false;
                StartCoroutine(PrestigeDoubleWiper());
            }
                break;
        }
    }

    private IEnumerator PrestigeDoubleWiper()
    {
        saveSettings.dysonVerseSaveData.dysonVersePrestigeData = new DysonVersePrestigeData();
        saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();
        _gameManager.CalculateProduction();
        yield return 0;
        _gameManager.CalculateProduction();
        saveSettings.dysonVerseSaveData.dysonVersePrestigeData = new DysonVersePrestigeData();
        saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();
        saveSettings.prestigePlus.points++;
        dvpd.secretsOfTheUniverse =
            saveSettings.prestigePlus.secrets > 1 ? saveSettings.prestigePlus.secrets : 0;
        dvpd.infinityAutoBots = saveSettings.prestigePlus.automation;
        dvpd.infinityAutoResearch = saveSettings.prestigePlus.automation;

        dvpd.androidsSkillTimer = 0;
        dvpd.pocketAndroidsTimer = 0;
        dvst.fragments = 0;
        dvst.skillPointsTree = 0 + ArtifactSkillPoints();
        _skillTreeConfirmationManager.CloseConfirm();
        _gameManager.AutoAssignSkillsInvoke();
    }

    public void WipeSaveButtonUpdate()
    {
        _assemblyLineManager.UpdateCostText();
        _managerManager.UpdateCostText();
        _serverManager.UpdateCostText();
        _planetManager.UpdateCostText();
        oracle.saveSettings.tutorial = true;
    }

    public int ArtifactSkillPoints()
    {
        var points = 0;
        if (sp.translation1) points++;
        if (sp.translation2) points++;
        if (sp.translation3) points++;
        if (sp.translation4) points++;
        if (sp.translation5) points++;
        if (sp.translation6) points++;
        if (sp.translation7) points++;
        if (sp.translation8) points++;

        if (sp.speed1) points++;
        if (sp.speed2) points++;
        if (sp.speed3) points++;
        if (sp.speed4) points++;
        if (sp.speed5) points++;
        if (sp.speed6) points++;
        if (sp.speed7) points++;
        if (sp.speed8) points++;
        return points;
    }

    #endregion

    public enum BuyMode
    {
        Buy1,
        Buy10,
        Buy50,
        Buy100,
        BuyMax
    }

    public enum ResearchBuyMode
    {
        Buy1,
        Buy10,
        Buy50,
        Buy100,
        BuyMax
    }

    [Serializable]
    public class SaveDataSettings
    {
        public BuyMode buyMode = BuyMode.Buy1;
        public ResearchBuyMode researchBuyMode = ResearchBuyMode.Buy1;
        public bool roundedBulkBuy;
        public bool researchRoundedBulkBuy;
        public bool debugOptions;
        public bool unlockAllTabs;

        public string dateStarted;
        public string dateQuitString;
        [Space(10)] public bool tutorial;
        public bool globalMute;
        public bool cheater;
        public bool hidePurchased = true;
        public bool buyMax = true;
        public bool notation;
        public bool skillsBuyOnTap;

        public double offlineTime;
        public double maxOfflineTime = 86400;
        [Space(10)] public int frameRate;
        [Space(10)] public bool botsButtonToggle;
        public bool researchbuttonToggle;
        public bool skillsButtonToggle = true;
        public bool skillsFirstRunDone;
        public bool infinityButtonToggle = true;
        public bool infinityFirstRunDone;
        public bool realityButtonToggle = true;
        public bool realityFirstRun;
        public bool simulationsButtonToggle = true;
        public bool prestigeButtonToggle = true;
        public bool prestigeFirstRun;
        public bool storyButtonToggle;
        public bool wikiButtonToggle;
        public bool statisticsButtonToggle = true;
        public bool settingsButtonToggle;
        [Space(10)] public bool infinityAutoResearchToggleAi = true;
        public bool infinityAutoResearchToggleAssembly = true;
        public bool infinityAutoResearchToggleMoney = true;
        public bool infinityAutoResearchTogglePlanet = true;
        public bool infinityAutoResearchToggleServer = true;
        public bool infinityAutoResearchToggleDataCenter = true;
        public bool infinityAutoResearchToggleScience = true;
        [Space(10)] public bool infinityAutoAssembly = true;
        public bool infinityAutoManagers = true;
        public bool infinityAutoServers = true;
        public bool infinityAutoDataCenters = true;
        public bool infinityAutoPlanets = true;
        public bool firstReality;
        public bool firstInfinityDone;

        public SaveData saveData;
        public DysonVerseSaveData dysonVerseSaveData;
        public SaveDataPrestige sdPrestige;
        public SaveDataDream1 sdSimulation;
        public PrestigePlus prestigePlus;
    }

    [Serializable]
    public class DysonVerseSaveData
    {
        public DysonVerseInfinityData dysonVerseInfinityData;
        public DysonVersePrestigeData dysonVersePrestigeData;
        public DysonVerseSkillTreeData dysonVerseSkillTreeData;
        public string lastCollapseDate;
        public int manualCreationTime = 10;
        public List<int> skillAutoAssignmentList = new();
        public List<int> skillAutoAssignmentList1 = new();
        public double botDistPreset1;
        public List<int> skillAutoAssignmentList2 = new();
        public double botDistPreset2;
        public List<int> skillAutoAssignmentList3 = new();
        public double botDistPreset3;
        public List<int> skillAutoAssignmentList4 = new();
        public double botDistPreset4;
        public List<int> skillAutoAssignmentList5 = new();
        public double botDistPreset5;
    }

    public void SaveList(int listNum)
    {
        List<int> list = new(saveSettings.dysonVerseSaveData.skillAutoAssignmentList);
        switch (listNum)
        {
            case 1:
                saveSettings.dysonVerseSaveData.skillAutoAssignmentList1 = list;
                saveSettings.dysonVerseSaveData.botDistPreset1 = dvpd.botDistribution;
                break;
            case 2:
                saveSettings.dysonVerseSaveData.skillAutoAssignmentList2 = list;
                saveSettings.dysonVerseSaveData.botDistPreset2 = dvpd.botDistribution;
                break;
            case 3:
                saveSettings.dysonVerseSaveData.skillAutoAssignmentList3 = list;
                saveSettings.dysonVerseSaveData.botDistPreset3 = dvpd.botDistribution;
                break;
            case 4:
                saveSettings.dysonVerseSaveData.skillAutoAssignmentList4 = list;
                saveSettings.dysonVerseSaveData.botDistPreset4 = dvpd.botDistribution;
                break;
            case 5:
                saveSettings.dysonVerseSaveData.skillAutoAssignmentList5 = list;
                saveSettings.dysonVerseSaveData.botDistPreset5 = dvpd.botDistribution;
                break;
        }
    }

    [SerializeField] private BotDistributionSlider slider;

    public void LoadList(int listNum)
    {
        List<int> list = new();
        switch (listNum)
        {
            case 1:
                foreach (var skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList1) list.Add(skill);
                dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset1;
                slider.SetSlider();
                break;
            case 2:
                foreach (var skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList2) list.Add(skill);
                dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset2;
                slider.SetSlider();
                break;
            case 3:
                foreach (var skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList3) list.Add(skill);
                dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset3;
                slider.SetSlider();
                break;
            case 4:
                foreach (var skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList4) list.Add(skill);
                dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset4;
                slider.SetSlider();
                break;
            case 5:
                foreach (var skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList5) list.Add(skill);
                dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset5;
                slider.SetSlider();
                break;
        }

        saveSettings.dysonVerseSaveData.skillAutoAssignmentList = list;
    }

    [Serializable]
    public class DysonVersePrestigeData
    {
        [Space(10)] [Header("Prestige")] public long infinityPoints;

        public long spentInfinityPoints;
        public long secretsOfTheUniverse;
        public long permanentSkillPoint;

        public bool infinityAssemblyLines;
        public bool infinityAiManagers;
        public bool infinityServers;
        public bool infinityDataCenter;
        public bool infinityPlanets;

        public bool infinityAutoResearch;

        public bool infinityAutoBots;
        public double androidsSkillTimer;
        public double pocketAndroidsTimer;

        [Space(10)] [Header("Distribution")] [Range(0, 1)]
        public double botDistribution = 0.5f;
    }

    [Serializable]
    public class DysonVerseInfinityData
    {
        public Dictionary<int, SkillTreeItem> SkillTreeSaveData;
        [Header("Money")] public double money;

        public double moneyMulti = 1f;

        [Space(10)] [Header("Science")] public double science;

        public double scienceMulti = 1f;


        public double bots;
        public double workers;
        public double researchers;

        [Space(10)] [Header("Panels")] public double panelsPerSec;

        public double panelsPerSecMulti = 1f;
        public double panelLifetime = 10f;

        [Space(10)] [Header("Producers")] public double[] assemblyLines = { 0, 0 };

        public double assemblyLineModifier = 1;
        public double botProduction;
        public double assemblyLineBotProduction;
        public double[] managers = { 0, 0 };
        public double managerModifier = 1;
        public double assemblyLineProduction;
        public double managerAssemblyLineProduction;
        public double[] servers = { 0, 0 };
        public double serverModifier = 1;
        public double managerProduction;
        public double serverManagerProduction;
        public double[] dataCenters = { 0, 0 };
        public double dataCenterModifier = 1;
        public double serverProduction;
        public double dataCenterServerProduction;
        public double[] planets = { 0, 0 };
        public double planetModifier = 1;
        public double dataCenterProduction;
        public double planetsDataCenterProduction;

        public double pocketDimensionsProduction;
        public double quantumComputingProduction;
        public double pocketDimensionsWithoutAnythingElseProduction;
        public double pocketProtectorsProduction;
        public double pocketMultiverseProduction;

        public double totalPlanetProduction;
        public double scientificPlanetsProduction;
        public double stellarSacrificesProduction;
        public double rudimentrySingularityProduction;
        public double planetAssemblyProduction;
        public double shellWorldsProduction;

        [Space(10)] [Header("Upgrades")] public double scienceBoostOwned;

        public double scienceBoostPercent = 0.05;

        public double moneyMultiUpgradeOwned;
        public double moneyMultiUpgradePercent = 0.05;

        public long assemblyLineUpgradeOwned;
        public double assemblyLineUpgradePercent = 0.03;

        public long aiManagerUpgradeOwned;
        public double aiManagerUpgradePercent = 0.03;

        public long serverUpgradeOwned;
        public double serverUpgradePercent = 0.03;

        public long dataCenterUpgradeOwned;
        public double dataCenterUpgradePercent = 0.03;

        public long planetUpgradeOwned;
        public double planetUpgradePercent = 0.03;

        public bool panelLifetime1;
        public bool panelLifetime2;
        public bool panelLifetime3;
        public bool panelLifetime4;


        [Space(10)] [Header("Statistics")] public double totalPanelsDecayed;

        public long goalSetter;
    }

    [Serializable]
    public class DysonVerseSkillTreeData
    {
        public long skillPointsTree;
        public bool startHereTree;
        public bool doubleScienceTree;
        public bool producedAsScienceTree;
        public bool panelLifetime20Tree;
        public bool workerEfficiencyTree;

        public bool assemblyLineTree;
        public bool aiManagerTree;
        public bool serverTree;
        public bool dataCenterTree;
        public bool planetsTree;

        public bool pocketDimensions;
        public bool scientificPlanets;

        public bool banking;
        public bool investmentPortfolio;

        public bool scientificRevolution;
        public bool economicRevolution;

        public bool renewableEnergy;
        public bool burnOut;

        public bool artificiallyEnhancedPanels;
        public bool stayingPower;

        public bool higgsBoson;
        public bool rule34;

        public bool androids;
        public bool superchargedPower;
        public bool workerBoost;

        public bool stellarSacrifices;
        public bool stellarImprovements;
        public bool stellarObliteration;
        public bool supernova;

        public bool powerUnderwhelming;
        public bool powerOverwhelming;

        public bool tasteOfPower;
        public bool indulgingInPower;
        public bool addictionToPower;

        public long fragments;
        public bool progressiveAssembly;
        public bool regulatedAcademia;
        public bool panelWarranty;
        public bool monetaryPolicy;
        public bool terraformingProtocols;
        public bool productionScaling;
        public bool fragmentAssembly;

        public bool assemblyMegaLines;

        public bool idleElectricSheep;
        public double idleElectricSheepTimer;

        public bool superSwarm;
        public bool megaSwarm;
        public bool ultimateSwarm;

        public bool purityOfMind;
        public bool purityOfBody;
        public bool purityOfSEssence;

        public bool dysonSubsidies;
        public bool oneMinutePlan;
        public bool galacticPradigmShift;

        public bool panelMaintenance;
        public bool worthySacrifice;
        public bool endOfTheLine;

        public bool manualLabour;

        public bool superRadiantScattering;
        public double superRadiantScatteringTimer;

        public bool repeatableResearch;
        public bool shouldersOfGiants;
        public bool shouldersOfPrecursors;
        public bool shouldersOfTheFallen;
        public bool shouldersOfTheEnlightened;
        public bool shouldersOfTheRevolution;

        public bool rocketMania;
        public bool idleSpaceFlight;

        public bool fusionReactors;
        public bool coldFusion;

        public bool scientificDominance;
        public bool economicDominance;

        public bool parallelProcessing;
        public bool rudimentarySingularity;

        public bool hubbleTelescope;
        public bool jamesWebbTelescope;

        public bool dimensionalCatCables;
        public bool pocketProtectors;
        public bool pocketMultiverse;
        public bool whatCouldHaveBeen;
        public bool shoulderSurgery;

        public bool terraFirma;
        public bool terraEculeo;
        public bool terraInfirma;
        public bool terraNullius;
        public bool terraNova;
        public bool terraGloriae;
        public bool terraIrradiant;

        public bool paragon;
        public bool shepherd;
        public bool citadelCouncil;
        public bool renegade;
        public bool saren;
        public bool reapers;
        public bool planetAssembly;
        public bool shellWorlds;
        public bool versatileProductionTactics;

        public bool whatWillComeToPass;
        public bool solarBubbles;
        public bool pocketAndroids;
        public bool hypercubeNetworks;
        public bool parallelComputation;
        public bool quantumComputing;
        public bool unsuspiciousAlgorithms;
        public bool agressiveAlgorithms;
        public bool clusterNetworking;
        public bool stellarDominance;
    }


    [Serializable]
    public class PrestigePlus
    {
        public long points;
        public long spentPoints;

        public bool botMultitasking;
        public bool doubleIP;
        public bool breakTheLoop;
        public bool quantumEntanglement;
        public bool automation;
        public long divisionsPurchased;
        public long secrets;

        public bool purity;
        public bool fragments;
        public bool terra;
        public bool power;
        public bool paragade;
        public bool stellar;

        public long influence;
        public long cash;
        public long science;
    }

//permaData
    [Serializable]
    public class SaveData
    {
        public long universesConsumed;
        public long workersReadyToGo;
        public bool workerAutoConvert;

        public long influence;

        //dream1
        public long huntersPerPurchase = 1;
        public long gatherersPerPurchase = 1;
    }


    //resettableData
    [Serializable]
    public class SaveDataPrestige
    {
        public bool doDoubleTime;
        public bool doubleTimeOwned;
        public double doubleTime;
        public long doubleTimeRate;

        public long simulationCount;
        public long strangeMatter;

        public long disasterStage = 1;

        public bool counterMeteor;
        public bool counterAi;
        public bool counterGw;

        public bool engineering1;
        public bool engineering2;
        public bool engineering3;

        public bool shipping1;
        public bool shipping2;

        public bool worldTrade1;
        public bool worldTrade2;
        public bool worldTrade3;

        public bool worldPeace1;
        public bool worldPeace2;
        public bool worldPeace3;
        public bool worldPeace4;

        public bool mathematics1;
        public bool mathematics2;
        public bool mathematics3;

        public bool advancedPhysics1;
        public bool advancedPhysics2;
        public bool advancedPhysics3;
        public bool advancedPhysics4;

        //foundational  
        public bool hunter1;
        public bool hunter2;
        public bool hunter3;
        public bool hunter4;

        public bool gatherer1;
        public bool gatherer2;
        public bool gatherer3;
        public bool gatherer4;

        public bool workerBoost;
        public bool workerBoostAcivator;

        public bool citiesBoost;
        public bool citiesBoostActivator;

        //information
        public bool factoriesBoost;
        public bool factoriesBoostActivator;

        public bool bots1;
        public bool botsBoost1Activator;
        public bool bots2;
        public bool botsBoost2Activator;

        public bool rockets1;
        public bool rockets2;
        public bool rockets3;

        //spaceAge
        public bool sfacs1;
        public bool sfActivator1;
        public bool sfacs2;
        public bool sfActivator2;
        public bool sfacs3;
        public bool sfActivator3;

        public bool railguns1;
        public bool railgunActivator1;
        public bool railguns2;
        public bool railgunActivator2;


        public bool translation1;
        public bool translation2;
        public bool translation3;
        public bool translation4;
        public bool translation5;
        public bool translation6;
        public bool translation7;
        public bool translation8;

        public bool speed1;
        public bool speed2;
        public bool speed3;
        public bool speed4;
        public bool speed5;
        public bool speed6;
        public bool speed7;
        public bool speed8;
    }

    [Serializable]
    public class SaveDataDream1
    {
        //foundational Era
        [Space(10)] public long hunters;
        public long hunterCost = 100;

        [Space(10)] public long gatherers;
        public long gathererCost = 100;

        [Space(10)] public double community;
        public double communityBoostCost;
        public double communityBoostTime;
        public double communityBoostDuration = 1200;

        [Space(10)] public double housing;

        [Space(10)] public double villages;

        [Space(10)] public double workers;

        [Space(10)] public double cities;

        //education
        //engineering
        [Space(10)] public bool engineering;
        public bool engineeringComplete;
        public double engineeringProgress;
        public double engineeringResearchTime = 600;
        public double engineeringCost = 1000;

        //shipping
        [Space(10)] public bool shipping;
        public bool shippingComplete;
        public double shippingProgress;
        public double shippingResearchTime = 1800;
        public double shippingCost = 5000;

        //worldTrade
        [Space(10)] public bool worldTrade;
        public bool worldTradeComplete;
        public double worldTradeProgress;
        public double worldTradeResearchTime = 3600;
        public double worldTradeCost = 7000;

        //worldPeace
        [Space(10)] public bool worldPeace;
        public bool worldPeaceComplete;
        public double worldPeaceProgress;
        public double worldPeaceResearchTime = 7200;
        public double worldPeaceCost = 8000;

        //mathematics
        [Space(10)] public bool mathematics;
        public bool mathematicsComplete;
        public double mathematicsProgress;
        public double mathematicsResearchTime = 3600;
        public double mathematicsCost = 10000;

        //physics
        [Space(10)] public bool advancedPhysics;
        public bool advancedPhysicsComplete;
        public double advancedPhysicsProgress;
        public double advancedPhysicsResearchTime = 7200;
        public double advancedPhysicsCost = 11000;

        //information Era
        [Space(10)] public double factories;
        public double factoriesBoostCost = 5000;
        public double factoriesBoostTime;
        public double factoriesBoostDuration = 1200;

        [Space(10)] public double bots;

        [Space(10)] public double rockets;
        public long rocketsPerSpaceFactory = 10;


        //space Age
        [Space(10)] public double energy;

        [Space(10)] public double spaceFactories;

        [Space(10)] public long dysonPanels;

        [Space(10)] public double railgunCharge;
        public double railgunMaxCharge = 25000000;

        //energy
        [Space(10)] public double solarPanels;
        public long solarCost = 50;
        public long solarPanelGeneration = 100;

        [Space(10)] public double fusion;
        public long fusionCost = 100000;
        public long fusionGeneration = 1250000;

        [Space(10)] public long swarmPanels;
        public long swarmPanelGeneration = 3212;
    }


    #region Singleton class: Oracle

    public static Oracle oracle;


    private void Awake()
    {
        if (oracle == null)
            oracle = this;
        else
            Destroy(gameObject);
    }

    #endregion

    #endregion

    #region PlayfabDataSaving/loading

    public void SaveExpansion()
    {
        saveSettings.dateQuitString = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        saveSettings.dysonVerseSaveData.dysonVerseInfinityData.SkillTreeSaveData = SkillTree;
        var dataString = Encoding.UTF8.GetString(SerializationUtility.SerializeValue(saveSettings, DataFormat.JSON));
        var request = new UpdateUserDataRequest
        {
            Data = new Dictionary<string, string>
            {
                { "Expansion", dataString }
            }
        };
        PlayFabClientAPI.UpdateUserData(request, OnDataSend, OnError);
    }

    public void LoadExpansion()
    {
        PlayFabClientAPI.GetUserData(new GetUserDataRequest(), OnLoadDysonVerse, OnError);
    }

    private void OnLoadDysonVerse(GetUserDataResult result)
    {
        if (result.Data != null && result.Data.ContainsKey("Expansion"))
        {
            Loaded = false;
            var bytes = Encoding.UTF8.GetBytes(result.Data["Expansion"].Value);
            saveSettings = SerializationUtility.DeserializeValue<SaveDataSettings>(bytes, DataFormat.JSON);
            foreach (var variable in SkillTree)
            {
                if (!saveSettings.dysonVerseSaveData.dysonVerseInfinityData.SkillTreeSaveData.ContainsKey(variable.Key))
                    saveSettings.dysonVerseSaveData.dysonVerseInfinityData.SkillTreeSaveData.Add(variable.Key,
                        variable.Value);
                variable.Value.Owned = saveSettings.dysonVerseSaveData.dysonVerseInfinityData
                    .SkillTreeSaveData[variable.Key].Owned;
            }

/*#if UNITY_IOS || UNITY_ANDROID
            SceneManager.LoadScene(Screen.width > Screen.height ? 2 : 1);
#else
        SceneManager.LoadScene(2);
#endif*/
            Loaded = true;
        }
        else
        {
            Debug.Log("PlayerDataNotComplete");
        }
    }

    public static event Action SuccessfulCloudSave;

    private void OnDataSend(UpdateUserDataResult result)
    {
        SuccessfulCloudSave?.Invoke();
    }

    private void OnError(PlayFabError error)
    {
        Debug.Log(error);
    }

    #endregion
}