using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Classes;
using Sirenix.OdinInspector;
using Sirenix.Serialization;
using Systems;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using static LoadScreenMethods;


namespace Expansion
{
    public class Oracle : SerializedMonoBehaviour
    {
        public Button recoveryButton;
        public TMP_Text recoveryText;


        [SerializeField] private Button prestigeButton;
        [SerializeField] private SidePanelManager SidePanelManager;
        [SerializeField] public SkillTreeConfirmationManager _skillTreeConfirmationManager;
        [SerializeField] public LineManager linePrefab;
        [SerializeField] public Transform lineHolder;
        [SerializeField] private GameManager _gameManager;
        public float infinityExponent = 3.9f;

        public static event Action UpdateSkills;

        private DysonVerseInfinityData dvid => saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
        private DysonVersePrestigeData dvpd => saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
        private DysonVerseSkillTreeData dvst => saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
        private PrestigePlus pp => oracle.saveSettings.prestigePlus;
        private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

        private readonly string fileName = "betaTestTwo";

        public Dictionary<int, SkillTreeItem> SkillTree = new Dictionary<int, SkillTreeItem>();
        public List<SkillTreeManager> allSkillTreeManagers = new List<SkillTreeManager>();
        public GameObject skillsHolder;
        public List<int> listOfSkillsNotToAutoBuy = new List<int>();

        //public List<int> skillAutoAssignmentList = new();
        public bool Loaded;
        private bool _isSaveReady;
        private bool _autoSaveScheduled;
        private const int CurrentSaveVersion = 1;

        #region SaveAndLoadFromClipboard

        [TabGroup("SaveData", "Buttons")] public bool beta;
        [TabGroup("SaveData", "Buttons"), Button]
        public void LoadFromClipboard()
        {
            bool devOptions = saveSettings.debugOptions;
            bool doubleIpUnlocked = saveSettings.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
            saveSettings = new SaveDataSettings();
            string clipboard = GUIUtility.systemCopyBuffer;
            byte[] bytes = beta ? Encoding.ASCII.GetBytes(clipboard) : Convert.FromBase64String(clipboard);
            saveSettings = SerializationUtility.DeserializeValue<SaveDataSettings>(bytes, DataFormat.JSON);

            LoadDictionaries();
            if (!oracle.saveSettings.cheater && saveSettings.maxOfflineTime < 86400)
                oracle.saveSettings.maxOfflineTime = 86400;
            saveSettings.debugOptions = devOptions;
            saveSettings.doubleIp = doubleIpUnlocked;
            FixSkillpoints();
            ApplyMigrations();
            SaveInternal(true);
            SceneManager.LoadScene(0);
        }

        private void FixSkillpoints()
        {
            if (saveSettings.hasFixedIP) return;
            dvst.skillPointsTree = dvpd.permanentSkillPoint + ArtifactSkillPoints() + dvid.goalSetter > 0 ? dvid.goalSetter : 0;
            saveSettings.hasFixedIP = true;
        }

        private void LoadDictionaries()
        {
            foreach (KeyValuePair<int, SkillTreeItem> variable in SkillTree)
            {
                dvid.SkillTreeSaveData ??= new Dictionary<int, bool>();
                dvid.SkillTreeSaveData.TryAdd(variable.Key, variable.Value.Owned);
                variable.Value.Owned = dvid.SkillTreeSaveData[variable.Key];
            }
        }

        [TabGroup("SaveData", "Buttons"), Button]
        public void SaveToClipboard()
        {
            SaveDictionaries();
            byte[] bytes = SerializationUtility.SerializeValue(saveSettings, DataFormat.JSON);
            GUIUtility.systemCopyBuffer = beta ? Encoding.UTF8.GetString(bytes) : Convert.ToBase64String(bytes);
        }

        private void SaveDictionaries()
        {
            dvid.SkillTreeSaveData = new Dictionary<int, bool>();
            foreach (KeyValuePair<int, SkillTreeItem> value in SkillTree)
            {
                if (!dvid.SkillTreeSaveData.ContainsKey(value.Key))
                    dvid.SkillTreeSaveData.Add(value.Key, value.Value.Owned);
                dvid.SkillTreeSaveData[value.Key] = value.Value.Owned;
            }
        }

        #endregion

        private void SetSaveReady(bool ready)
        {
            _isSaveReady = ready;
            if (_isSaveReady) ScheduleAutoSave();
        }

        private void ScheduleAutoSave()
        {
            if (_autoSaveScheduled) return;
            InvokeRepeating(nameof(Save), 60, 60);
            _autoSaveScheduled = true;
        }

        private void ApplyMigrations()
        {
            if (saveSettings == null) return;

            if (saveSettings.saveVersion < 0) saveSettings.saveVersion = 0;

            if (saveSettings.saveVersion < CurrentSaveVersion)
            {
                saveSettings.lastMigratedFromVersion = saveSettings.saveVersion;
                // TODO: add migration steps here.
                saveSettings.saveVersion = CurrentSaveVersion;
            }

            saveSettings.lastSuccessfulLoadUtc = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        }

        private void SaveInternal(bool force)
        {
            if (!_isSaveReady && !force) return;
            saveSettings.dateQuitString = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
            SaveState();
        }


        private void Start()
        {
            SkillTreeManager[] listOfSkillTreeManagersToAdd = skillsHolder.GetComponentsInChildren<SkillTreeManager>();
            foreach (SkillTreeManager item in listOfSkillTreeManagersToAdd) allSkillTreeManagers.Add(item);

            foreach (SkillTreeManager skill in allSkillTreeManagers) skill.MakeLines();
            BsNewsGet();
            Loaded = false;
            SetSaveReady(false);
            Load();
            Loaded = true;
            Application.targetFrameRate =
                saveSettings.frameRate != 0
                    ? saveSettings.frameRate
                    : Mathf.RoundToInt((float)Screen.currentResolution.refreshRateRatio.value);
            bool doubleIpUnlocked = saveSettings.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
            saveSettings.doubleIp = doubleIpUnlocked;
            if (lsm != null) lsm.CloseLoadScreen();

            bool fileExists = File.Exists(Application.persistentDataPath + "/" + fileName + ".idsOdin");

            recoveryText.text = fileExists ? "Attempt Recovery" : "No Save found";
            recoveryButton.interactable = fileExists;
            recoveryButton.onClick.AddListener(AttemptSaveRecovery);
        }


        private void Update()
        {
            prestigeButton.interactable = dvpd.infinityPoints >= 42;
            if (double.IsInfinity(dvid.bots) || double.IsNaN(dvid.bots))
                if (!oracle.saveSettings.infinityInProgress)
                {
                    oracle.saveSettings.infinityInProgress = true;
                    pp.avocatoOverflow++;
                    dvpd.infinityPoints += 1000;
                    _gameManager.Prestige();
                }

            double amount = pp.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, pp.divisionsPurchased) : 4.2e19;
            int ipToGain = StaticMethods.InfinityPointsToGain(amount, dvid.bots);
            ipToGain = saveSettings.doubleIp ? ipToGain * 2 : ipToGain;


            if (pp.breakTheLoop && !saveSettings.infinityInProgress)
                if ((pp.doubleIP ? ipToGain * 2 : ipToGain) >= (saveSettings.infinityPointsToBreakFor >= 1
                        ? saveSettings.infinityPointsToBreakFor
                        : 1))
                {
                    oracle.saveSettings.infinityInProgress = true;
                    _gameManager.Prestige();
                }
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
            string url = "https://blindsidedgames.github.io/BlindsidedGames/newsTicker";

            using UnityWebRequest www = UnityWebRequest.Get(url);

            www.SetRequestHeader("Content-Type", "application/jason");
            UnityWebRequestAsyncOperation operation = www.SendWebRequest();

            while (!operation.isDone) await Task.Yield();

            if (www.result == UnityWebRequest.Result.Success)
            {
                bsGamesData = new BsGamesData();

                string newsjson = www.downloadHandler.text;
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

        #region StaticReferences

        public static string textColourOrange = "<color=#FFA45E>";
        public static string textColourBlue = "<color=#00E1FF>";
        public static string textColourGreen = "<color=#91DD8F>";

        public static BuyMode StaticBuyMode => oracle.saveSettings.buyMode;
        public static BuyMode StaticResearchBuyMode => oracle.saveSettings.researchBuyMode;
        public static NumberTypes StaticNumberFormatting => oracle.saveSettings.numberFormatting;
        public static bool StaticRoundedBulkBuy => oracle.saveSettings.roundedBulkBuy;

        public static double Money { get => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.money; set => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.money = value; }

        public static double Science { get => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.science; set => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.science = value; }

        public static double Bots { get => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots; set => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots = value; }

        public static SaveDataSettings StaticSaveSettings => oracle.saveSettings;
        public static DysonVerseInfinityData StaticInfinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
        public static DysonVersePrestigeData StaticPrestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
        public static DysonVerseSkillTreeData StaticSkillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

        #endregion

        #region Oracle

        public SaveDataSettings saveSettings;

        private string _json;

        #region SaveMethods

        public void WipeAllData()
        {
            saveSettings = new SaveDataSettings();
            saveSettings.saveVersion = CurrentSaveVersion;
            ES3.Save("saveSettings", saveSettings);
            SceneManager.LoadScene(0);
        }

        [ContextMenu("WipeSaveData")]
        public void WipeSaveData()
        {
            bool doubleIpUnlocked = saveSettings.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
            foreach (KeyValuePair<int, SkillTreeItem> var in SkillTree) var.Value.Owned = false;
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
            saveSettings.doubleIp = doubleIpUnlocked;
            saveSettings.saveVersion = CurrentSaveVersion;
        }

        [ContextMenu("WipeDream1Save")]
        public void WipeDream1Save()
        {
            saveSettings.sdSimulation = new SaveDataDream1();
        }


        [ContextMenu("Save")]
        public void Save()
        {
            SaveInternal(false);
        }

        public void AttemptSaveRecovery()
        {
            if (File.Exists(Application.persistentDataPath + "/" + fileName + ".idsOdin"))
            {
                byte[] bytes = File.ReadAllBytes(Application.persistentDataPath + "/" + fileName + ".idsOdin");
                Debug.Log("Copied to clipboard");

                GUIUtility.systemCopyBuffer = beta ? Encoding.UTF8.GetString(bytes) : Convert.ToBase64String(bytes);
                recoveryText.text = "Save Copied";
            }
        }

        public void SaveState()
        {
            SaveDictionaries();
            ES3.Save("saveSettings", saveSettings);
        }

        public void Load()
        {
            Loaded = false;
            SetSaveReady(false);
            WipeSaveData();

            if (ES3.KeyExists("saveSettings"))
            {
                saveSettings = ES3.Load<SaveDataSettings>("saveSettings");
                LoadDictionaries();
                FixSkillpoints();
                if (!oracle.saveSettings.cheater && oracle.saveSettings.maxOfflineTime < 86400)
                    oracle.saveSettings.maxOfflineTime = 86400;
                Loaded = true;
                Debug.Log("Loaded with ES3");
            }
            else if (File.Exists(Application.persistentDataPath + "/" + fileName + ".idsOdin"))
            {
                LoadState(Application.persistentDataPath + "/" + fileName + ".idsOdin");
                //File.Delete(Application.persistentDataPath + "/" + fileName + ".idsOdin");
                Debug.Log("Loaded with Odin");
            }
            else
            {
                saveSettings.dateStarted = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
                Loaded = true;
                Debug.Log("Made new save");
            }

            ApplyMigrations();
            UpdateSkills?.Invoke();
            StartCoroutine(AwayForCoroutine());
            SetSaveReady(true);
        }

        public void LoadState(string filePath)
        {
            if (!File.Exists(filePath)) return;

            byte[] bytes = File.ReadAllBytes(filePath);
            saveSettings = SerializationUtility.DeserializeValue<SaveDataSettings>(bytes, DataFormat.JSON);
            LoadDictionaries();
            FixSkillpoints();
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
            DateTime dateStarted = DateTime.Parse(oracle.saveSettings.dateQuitString, CultureInfo.InvariantCulture);
            DateTime dateNow = DateTime.UtcNow;
            TimeSpan timespan = dateNow - dateStarted;
            float seconds = (float)timespan.TotalSeconds;
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

        [ContextMenu("DysonInfinity")]
        public void DysonInfinity()
        {
            saveSettings.firstInfinityDone = true;
            dvpd.androidsSkillTimer = 0;
            dvpd.pocketAndroidsTimer = 0;
            int bankedSkills = 0;
            if (SkillTree[11].Owned) bankedSkills++;
            if (SkillTree[12].Owned) bankedSkills++;
            foreach (KeyValuePair<int, SkillTreeItem> var in SkillTree) var.Value.Owned = false;

            saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();

            int ipToGain = saveSettings.prestigePlus.doubleIP ? 2 : 1;
            ipToGain *= saveSettings.doubleIp ? 2 : 1;

            oracle.saveSettings.lastInfinityPointsGained = ipToGain;
            dvpd.infinityPoints += ipToGain;
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
            dvst.superRadiantScatteringTimer = 0;
            Rotator.ResetPanelsStatic();
        }

        public void ManualDysonInfinity()
        {
            saveSettings.firstInfinityDone = true;
            dvpd.androidsSkillTimer = 0;
            dvpd.pocketAndroidsTimer = 0;
            int bankedSkills = 0;
            if (SkillTree[11].Owned) bankedSkills++;
            if (SkillTree[12].Owned) bankedSkills++;
            foreach (KeyValuePair<int, SkillTreeItem> var in SkillTree) var.Value.Owned = false;

            double amount = pp.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, pp.divisionsPurchased) : 4.2e19;
            int ipToGain = StaticMethods.InfinityPointsToGain(amount, dvid.bots);
            ipToGain *= saveSettings.doubleIp ? 2 : 1;
            oracle.saveSettings.lastInfinityPointsGained = saveSettings.prestigePlus.doubleIP ? ipToGain * 2 : ipToGain;
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
            dvst.superRadiantScatteringTimer = 0;
            saveSettings.infinityInProgress = false;
            Rotator.ResetPanelsStatic();
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
                    foreach (KeyValuePair<int, SkillTreeItem> var in SkillTree) var.Value.Owned = false;
                    StartCoroutine(PrestigeDoubleWiper());
                    dvst.superRadiantScatteringTimer = 0;
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
            saveSettings.lastInfinityPointsGained = 0;
            saveSettings.timeLastInfinity = 0;
            dvpd.androidsSkillTimer = 0;
            dvpd.pocketAndroidsTimer = 0;
            dvst.fragments = 0;
            dvst.skillPointsTree = 0 + ArtifactSkillPoints();
            _skillTreeConfirmationManager.CloseConfirm();
            _gameManager.AutoAssignSkillsInvoke();
            Rotator.ResetPanelsStatic();
        }

        public void WipeSaveButtonUpdate()
        {
            oracle.saveSettings.tutorial = true;
        }

        public int ArtifactSkillPoints()
        {
            int points = 0;
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

            if (saveSettings.avotation) points += 4;

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


        public enum NumberTypes
        {
            Standard,
            Scientific,
            Engineering
        }

        [Serializable]
        public class SaveDataSettings
        {
            public int saveVersion;
            public int lastMigratedFromVersion;
            public string lastSuccessfulLoadUtc;
            public bool hasFixedIP;
            public BuyMode buyMode = BuyMode.Buy1;
            public BuyMode researchBuyMode = BuyMode.Buy1;
            public bool roundedBulkBuy;
            public bool researchRoundedBulkBuy;
            public bool debugOptions;
            public bool doubleIp;
            public bool unlockAllTabs;
            public bool avotation;
            public int infinityPointsToBreakFor;
            public bool infinityInProgress;

            public string dateStarted;
            public string dateQuitString;
            public string timeThisInfinity;
            public double timeLastInfinity;
            public int lastInfinityPointsGained;

            [Space(10)] public bool tutorial;
            public bool globalMute;
            public bool cheater;
            public bool hidePurchased = true;
            public bool buyMax = true;
            public NumberTypes numberFormatting;
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

            public SaveData saveData = new SaveData();
            public DysonVerseSaveData dysonVerseSaveData = new DysonVerseSaveData();
            public SaveDataPrestige sdPrestige = new SaveDataPrestige();
            public SaveDataDream1 sdSimulation = new SaveDataDream1();
            public PrestigePlus prestigePlus = new PrestigePlus();
        }

        [Serializable]
        public class DysonVerseSaveData
        {
            public DysonVerseInfinityData dysonVerseInfinityData = new DysonVerseInfinityData();
            public DysonVersePrestigeData dysonVersePrestigeData = new DysonVersePrestigeData();
            public DysonVerseSkillTreeData dysonVerseSkillTreeData = new DysonVerseSkillTreeData();
            public string lastCollapseDate;
            public float manualCreationTime = 10;
            public List<int> skillAutoAssignmentList = new List<int>();
            public List<int> skillAutoAssignmentList1 = new List<int>();
            public double botDistPreset1;
            public string preset1Name = "Preset 1";
            public List<int> skillAutoAssignmentList2 = new List<int>();
            public double botDistPreset2;
            public string preset2Name = "Preset 2";
            public List<int> skillAutoAssignmentList3 = new List<int>();
            public double botDistPreset3;
            public string preset3Name = "Preset 3";
            public List<int> skillAutoAssignmentList4 = new List<int>();
            public double botDistPreset4;
            public string preset4Name = "Preset 4";
            public List<int> skillAutoAssignmentList5 = new List<int>();
            public double botDistPreset5;
            public string preset5Name = "Preset 5";
        }

        public void SaveList(int listNum)
        {
            List<int> list = new List<int>(saveSettings.dysonVerseSaveData.skillAutoAssignmentList);
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
            List<int> list = new List<int>();
            switch (listNum)
            {
                case 1:
                    foreach (int skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList1) list.Add(skill);
                    dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset1;
                    slider.SetSlider();
                    break;
                case 2:
                    foreach (int skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList2) list.Add(skill);
                    dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset2;
                    slider.SetSlider();
                    break;
                case 3:
                    foreach (int skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList3) list.Add(skill);
                    dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset3;
                    slider.SetSlider();
                    break;
                case 4:
                    foreach (int skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList4) list.Add(skill);
                    dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset4;
                    slider.SetSlider();
                    break;
                case 5:
                    foreach (int skill in saveSettings.dysonVerseSaveData.skillAutoAssignmentList5) list.Add(skill);
                    dvpd.botDistribution = saveSettings.dysonVerseSaveData.botDistPreset5;
                    slider.SetSlider();
                    break;
            }

            saveSettings.dysonVerseSaveData.skillAutoAssignmentList = list;
        }

        [Serializable]
        public class DysonVersePrestigeData
        {
            [Space(10), Header("Prestige")] public long infinityPoints;

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

            [Space(10), Header("Distribution"), Range(0, 1)]
            public double botDistribution = 0.5f;
        }

        [Serializable]
        public class DysonVerseInfinityData
        {
            public Dictionary<int, bool> SkillTreeSaveData;
            [Header("Money")] public double money;

            public double moneyMulti = 1f;

            [Space(10), Header("Science")] public double science;

            public double scienceMulti = 1f;


            public double bots;
            public double workers;
            public double researchers;

            [Space(10), Header("Panels")] public double panelsPerSec;

            public double panelsPerSecMulti = 1f;
            public double panelLifetime = 10f;

            [Space(10), Header("Producers")] public double[] assemblyLines = { 0, 0 };

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

            [Space(10), Header("Upgrades")] public double scienceBoostOwned;

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


            [Space(10), Header("Statistics")] public double totalPanelsDecayed;

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
            public bool avocatoPurchased;

            public double avocatoIP;
            public double avocatoInfluence;
            public double avocatoStrangeMatter;
            public double avocatoOverflow;

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

    }
}
