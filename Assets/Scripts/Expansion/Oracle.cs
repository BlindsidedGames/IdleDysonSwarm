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
using Systems.Facilities;
using Systems.Stats;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using GameData;
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
        private const int CurrentSaveVersion = 3;

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
            if (dvid.skillOwnedById != null && dvid.skillOwnedById.Count > 0)
            {
                foreach (KeyValuePair<string, bool> entry in dvid.skillOwnedById)
                {
                    if (SkillIdMap.TryGetLegacyKey(entry.Key, out int key))
                    {
                        dvid.SkillTreeSaveData[key] = entry.Value;
                    }
                }

                return;
            }

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

            if (saveSettings.saveVersion < 2)
            {
                saveSettings.lastMigratedFromVersion = saveSettings.saveVersion;
                MigrateSkillOwnershipToIds();
                MigrateSkillAutoAssignmentIds();
                saveSettings.saveVersion = 2;
            }

            if (saveSettings.saveVersion < 3)
            {
                saveSettings.lastMigratedFromVersion = saveSettings.saveVersion;
                MigrateResearchLevelsToIds();
                saveSettings.saveVersion = 3;
            }

            EnsureSkillOwnershipData();
            EnsureSkillAutoAssignmentIds();
            EnsureResearchLevelData();
            saveSettings.lastSuccessfulLoadUtc = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        }

        private void EnsureSkillOwnershipData()
        {
            if (dvid == null) return;
            dvid.skillOwnedById ??= new Dictionary<string, bool>();
            if (dvid.skillOwnedById.Count > 0) return;

            if (dvid.SkillTreeSaveData != null && dvid.SkillTreeSaveData.Count > 0)
            {
                foreach (KeyValuePair<int, bool> entry in dvid.SkillTreeSaveData)
                {
                    if (SkillIdMap.TryGetId(entry.Key, out string id))
                    {
                        dvid.skillOwnedById[id] = entry.Value;
                    }
                }

                return;
            }

            if (SkillTree == null || SkillTree.Count == 0) return;
            foreach (KeyValuePair<int, SkillTreeItem> entry in SkillTree)
            {
                if (entry.Value == null) continue;
                if (SkillIdMap.TryGetId(entry.Key, out string id))
                {
                    dvid.skillOwnedById[id] = entry.Value.Owned;
                }
            }
        }

        private void EnsureSkillAutoAssignmentIds()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            data.skillAutoAssignmentIds ??= new List<string>();
            if (data.skillAutoAssignmentIds.Count == 0 && data.skillAutoAssignmentList.Count > 0)
            {
                data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
            }

            data.skillAutoAssignmentIds1 ??= new List<string>();
            if (data.skillAutoAssignmentIds1.Count == 0 && data.skillAutoAssignmentList1.Count > 0)
            {
                data.skillAutoAssignmentIds1 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList1);
            }

            data.skillAutoAssignmentIds2 ??= new List<string>();
            if (data.skillAutoAssignmentIds2.Count == 0 && data.skillAutoAssignmentList2.Count > 0)
            {
                data.skillAutoAssignmentIds2 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList2);
            }

            data.skillAutoAssignmentIds3 ??= new List<string>();
            if (data.skillAutoAssignmentIds3.Count == 0 && data.skillAutoAssignmentList3.Count > 0)
            {
                data.skillAutoAssignmentIds3 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList3);
            }

            data.skillAutoAssignmentIds4 ??= new List<string>();
            if (data.skillAutoAssignmentIds4.Count == 0 && data.skillAutoAssignmentList4.Count > 0)
            {
                data.skillAutoAssignmentIds4 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList4);
            }

            data.skillAutoAssignmentIds5 ??= new List<string>();
            if (data.skillAutoAssignmentIds5.Count == 0 && data.skillAutoAssignmentList5.Count > 0)
            {
                data.skillAutoAssignmentIds5 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList5);
            }
        }

        private void EnsureResearchLevelData()
        {
            if (dvid == null) return;
            dvid.researchLevelsById ??= new Dictionary<string, double>();

            if (dvid.researchLevelsById.Count == 0)
            {
                ResearchIdMap.PopulateLevelsFromLegacy(dvid, dvid.researchLevelsById);
                return;
            }

            ResearchIdMap.ApplyLevelsToLegacy(dvid, dvid.researchLevelsById);
            ResearchIdMap.PopulateLevelsFromLegacy(dvid, dvid.researchLevelsById);
        }

        private void MigrateResearchLevelsToIds()
        {
            if (dvid == null) return;
            dvid.researchLevelsById ??= new Dictionary<string, double>();
            if (dvid.researchLevelsById.Count > 0) return;

            ResearchIdMap.PopulateLevelsFromLegacy(dvid, dvid.researchLevelsById);
        }

        private void SyncResearchLevelsFromLegacy()
        {
            if (dvid == null) return;
            dvid.researchLevelsById ??= new Dictionary<string, double>();
            ResearchIdMap.PopulateLevelsFromLegacy(dvid, dvid.researchLevelsById);
        }

        private void MigrateSkillOwnershipToIds()
        {
            if (dvid == null) return;
            dvid.skillOwnedById ??= new Dictionary<string, bool>();
            if (dvid.skillOwnedById.Count > 0) return;

            if (dvid.SkillTreeSaveData != null && dvid.SkillTreeSaveData.Count > 0)
            {
                foreach (KeyValuePair<int, bool> entry in dvid.SkillTreeSaveData)
                {
                    if (SkillIdMap.TryGetId(entry.Key, out string id))
                    {
                        dvid.skillOwnedById[id] = entry.Value;
                    }
                }

                return;
            }

            if (SkillTree == null || SkillTree.Count == 0) return;
            foreach (KeyValuePair<int, SkillTreeItem> entry in SkillTree)
            {
                if (entry.Value == null) continue;
                if (SkillIdMap.TryGetId(entry.Key, out string id))
                {
                    dvid.skillOwnedById[id] = entry.Value.Owned;
                }
            }
        }

        private void MigrateSkillAutoAssignmentIds()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            if (data.skillAutoAssignmentIds == null || data.skillAutoAssignmentIds.Count == 0)
            {
                data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
            }

            if (data.skillAutoAssignmentIds1 == null || data.skillAutoAssignmentIds1.Count == 0)
            {
                data.skillAutoAssignmentIds1 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList1);
            }

            if (data.skillAutoAssignmentIds2 == null || data.skillAutoAssignmentIds2.Count == 0)
            {
                data.skillAutoAssignmentIds2 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList2);
            }

            if (data.skillAutoAssignmentIds3 == null || data.skillAutoAssignmentIds3.Count == 0)
            {
                data.skillAutoAssignmentIds3 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList3);
            }

            if (data.skillAutoAssignmentIds4 == null || data.skillAutoAssignmentIds4.Count == 0)
            {
                data.skillAutoAssignmentIds4 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList4);
            }

            if (data.skillAutoAssignmentIds5 == null || data.skillAutoAssignmentIds5.Count == 0)
            {
                data.skillAutoAssignmentIds5 = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList5);
            }
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

        private void DebugCompareAssemblyLineProduction()
        {
            DebugCompareAssemblyLineProduction(null);
        }

        private void DebugCompareAssemblyLineProduction(List<ParityResult> results)
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            if (!GameDataRegistry.Instance.TryGetFacility("assembly_lines", out FacilityDefinition definition))
            {
                Debug.LogWarning("Assembly Line FacilityDefinition not found.");
                return;
            }

            FacilityRuntime runtime = FacilityLegacyBridge.BuildAssemblyLineRuntime(definition, dvid, dvst);
            if (runtime == null)
            {
                Debug.LogWarning("Assembly Line runtime could not be built.");
                return;
            }

            double legacyCached = dvid.botProduction;
            double legacyComputed = (dvid.assemblyLines[0] + dvid.assemblyLines[1]) * 0.1f * dvid.assemblyLineModifier;
            if (dvst.stayingPower)
                legacyComputed *= 1 + 0.01f * dvid.panelLifetime;
            if (dvst.rule34 && dvid.assemblyLines[1] >= 69)
                legacyComputed *= 2;
            if (dvst.superchargedPower)
                legacyComputed *= 1.5f;
            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Assembly Lines (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Assembly Lines (legacy cached): {legacyCached}");
            builder.AppendLine($"Assembly Lines (legacy formula): {legacyComputed}");
            builder.AppendLine($"Assembly Lines (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine($"Inputs: count={dvid.assemblyLines[0] + dvid.assemblyLines[1]}, " +
                               $"modifier={dvid.assemblyLineModifier}, lifetime={dvid.panelLifetime}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("assembly_lines", out double dataDrivenModifier))
            {
                dataDrivenExpected = (dvid.assemblyLines[0] + dvid.assemblyLines[1]) * 0.1f * dataDrivenModifier;
                if (dvst.stayingPower)
                    dataDrivenExpected *= 1 + 0.01f * dvid.panelLifetime;
                if (dvst.rule34 && dvid.assemblyLines[1] >= 69)
                    dataDrivenExpected *= 2;
                if (dvst.superchargedPower)
                    dataDrivenExpected *= 1.5f;
            }

            AppendDataDrivenComparison(builder, "Assembly Lines", definition, dataDrivenExpected, results);
            Debug.Log(builder.ToString());
        }

        private void DebugCompareAiManagerProduction()
        {
            DebugCompareAiManagerProduction(null);
        }

        private void DebugCompareAiManagerProduction(List<ParityResult> results)
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            if (!GameDataRegistry.Instance.TryGetFacility("ai_managers", out FacilityDefinition definition))
            {
                Debug.LogWarning("AI Manager FacilityDefinition not found.");
                return;
            }

            FacilityRuntime runtime = FacilityLegacyBridge.BuildAiManagerRuntime(definition, dvid, dvst);
            if (runtime == null)
            {
                Debug.LogWarning("AI Manager runtime could not be built.");
                return;
            }

            double legacyCached = dvid.assemblyLineProduction;
            double legacyComputed = (dvid.managers[0] + dvid.managers[1]) * 0.0166666666666667f * dvid.managerModifier;
            if (dvst.rule34 && dvid.managers[1] >= 69)
                legacyComputed *= 2;
            if (dvst.superchargedPower)
                legacyComputed *= 1.5f;

            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("AI Managers (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"AI Managers (legacy cached): {legacyCached}");
            builder.AppendLine($"AI Managers (legacy formula): {legacyComputed}");
            builder.AppendLine($"AI Managers (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine($"Inputs: count={dvid.managers[0] + dvid.managers[1]}, modifier={dvid.managerModifier}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("ai_managers", out double dataDrivenModifier))
            {
                dataDrivenExpected = (dvid.managers[0] + dvid.managers[1]) * 0.0166666666666667f *
                                     dataDrivenModifier;
                if (dvst.rule34 && dvid.managers[1] >= 69)
                    dataDrivenExpected *= 2;
                if (dvst.superchargedPower)
                    dataDrivenExpected *= 1.5f;
            }

            AppendDataDrivenComparison(builder, "AI Managers", definition, dataDrivenExpected, results);
            Debug.Log(builder.ToString());
        }

        private void DebugCompareServerProduction()
        {
            DebugCompareServerProduction(null);
        }

        private void DebugCompareServerProduction(List<ParityResult> results)
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            if (!GameDataRegistry.Instance.TryGetFacility("servers", out FacilityDefinition definition))
            {
                Debug.LogWarning("Server FacilityDefinition not found.");
                return;
            }

            FacilityRuntime runtime = FacilityLegacyBridge.BuildServerRuntime(definition, dvid, dvst);
            if (runtime == null)
            {
                Debug.LogWarning("Server runtime could not be built.");
                return;
            }

            double legacyCached = dvid.managerProduction;
            double legacyComputed = (dvid.servers[0] + dvid.servers[1]) * 0.0016666666666667f * dvid.serverModifier;
            if (dvst.rule34 && dvid.servers[1] >= 69)
                legacyComputed *= 2;
            if (dvst.superchargedPower)
                legacyComputed *= 1.5f;

            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Servers (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Servers (legacy cached): {legacyCached}");
            builder.AppendLine($"Servers (legacy formula): {legacyComputed}");
            builder.AppendLine($"Servers (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine($"Inputs: count={dvid.servers[0] + dvid.servers[1]}, modifier={dvid.serverModifier}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("servers", out double dataDrivenModifier))
            {
                dataDrivenExpected = (dvid.servers[0] + dvid.servers[1]) * 0.0016666666666667f * dataDrivenModifier;
                if (dvst.rule34 && dvid.servers[1] >= 69)
                    dataDrivenExpected *= 2;
                if (dvst.superchargedPower)
                    dataDrivenExpected *= 1.5f;
            }

            AppendDataDrivenComparison(builder, "Servers", definition, dataDrivenExpected, results);
            Debug.Log(builder.ToString());
        }

        private void DebugCompareDataCenterProduction()
        {
            DebugCompareDataCenterProduction(null);
        }

        private void DebugCompareDataCenterProduction(List<ParityResult> results)
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            if (!GameDataRegistry.Instance.TryGetFacility("data_centers", out FacilityDefinition definition))
            {
                Debug.LogWarning("Data Center FacilityDefinition not found.");
                return;
            }

            FacilityRuntime runtime = FacilityLegacyBridge.BuildDataCenterRuntime(definition, dvid, dvst);
            if (runtime == null)
            {
                Debug.LogWarning("Data Center runtime could not be built.");
                return;
            }

            double legacyCached = dvid.serverProduction;
            double legacyComputed = (dvid.dataCenters[0] + dvid.dataCenters[1]) * 0.0011111111f * dvid.dataCenterModifier;
            if (dvst.rule34 && dvid.dataCenters[1] >= 69)
                legacyComputed *= 2;
            if (dvst.superchargedPower)
                legacyComputed *= 1.5f;
            legacyComputed += dvid.rudimentrySingularityProduction;
            double serversTotal = dvid.servers[0] + dvid.servers[1];
            if (dvst.parallelComputation && serversTotal > 1)
                legacyComputed += 0.1f * Math.Log(serversTotal, 2);

            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Data Centers (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Data Centers (legacy cached): {legacyCached}");
            builder.AppendLine($"Data Centers (legacy formula): {legacyComputed}");
            builder.AppendLine($"Data Centers (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine(
                $"Inputs: count={dvid.dataCenters[0] + dvid.dataCenters[1]}, modifier={dvid.dataCenterModifier}, " +
                $"serversTotal={serversTotal}, rudimentary={dvid.rudimentrySingularityProduction}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("data_centers", out double dataDrivenModifier))
            {
                dataDrivenExpected =
                    (dvid.dataCenters[0] + dvid.dataCenters[1]) * 0.0011111111f * dataDrivenModifier;
                if (dvst.rule34 && dvid.dataCenters[1] >= 69)
                    dataDrivenExpected *= 2;
                if (dvst.superchargedPower)
                    dataDrivenExpected *= 1.5f;
                dataDrivenExpected += dvid.rudimentrySingularityProduction;
                if (dvst.parallelComputation && serversTotal > 1)
                    dataDrivenExpected += 0.1f * Math.Log(serversTotal, 2);
            }

            AppendDataDrivenComparison(builder, "Data Centers", definition, dataDrivenExpected, results);
            Debug.Log(builder.ToString());
        }

        [ContextMenu("Debug/Log Data-Driven Breakdowns")]
        public void DebugLogDataDrivenBreakdowns()
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            var builder = new StringBuilder();
            builder.AppendLine("Data-driven breakdowns:");

            AppendFacilityBreakdown(builder, "Assembly Lines", "assembly_lines");
            AppendFacilityBreakdown(builder, "AI Managers", "ai_managers");
            AppendFacilityBreakdown(builder, "Servers", "servers");
            AppendFacilityBreakdown(builder, "Data Centers", "data_centers");
            AppendFacilityBreakdown(builder, "Planets", "planets");

            var secrets = new SecretBuffState();
            ModifierSystem.SecretBuffs(dvid, dvpd, secrets);

            if (GlobalStatPipeline.TryCalculateMoneyMultiplier(dvid, dvst, dvpd, pp, secrets,
                    out StatResult moneyResult))
            {
                AppendStatBreakdown(builder, "Money Multiplier", moneyResult);
            }
            else
            {
                builder.AppendLine("Money Multiplier: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculateScienceMultiplier(dvid, dvst, dvpd, pp, secrets,
                    out StatResult scienceResult))
            {
                AppendStatBreakdown(builder, "Science Multiplier", scienceResult);
            }
            else
            {
                builder.AppendLine("Science Multiplier: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculatePanelsPerSecond(dvid, dvst, dvpd, pp, out StatResult panelsResult))
            {
                AppendStatBreakdown(builder, "Panels Per Second", panelsResult);
            }
            else
            {
                builder.AppendLine("Panels Per Second: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculatePanelLifetime(dvid, dvst, dvpd, pp, out StatResult panelLifetimeResult))
            {
                AppendStatBreakdown(builder, "Panel Lifetime", panelLifetimeResult);
            }
            else
            {
                builder.AppendLine("Panel Lifetime: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculatePlanetGeneration(dvid, dvst, dvpd, pp,
                    out GlobalStatPipeline.PlanetGenerationResult planetResult))
            {
                builder.AppendLine($"Planet Generation Total: {planetResult.TotalResult.Value}");
                builder.AppendLine($"Scientific Planets: {planetResult.ScientificPlanets}");
                builder.AppendLine($"Planet Assembly: {planetResult.PlanetAssembly}");
                builder.AppendLine($"Shell Worlds: {planetResult.ShellWorlds}");
                builder.AppendLine($"Stellar Sacrifices: {planetResult.StellarSacrifices}");
                builder.AppendLine("Planet Generation Breakdown:");
                AppendContributions(builder, planetResult.TotalResult.Contributions);
            }
            else
            {
                builder.AppendLine("Planet Generation: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculateShouldersAccruals(dvid, dvst, dvpd, pp,
                    out StatResult scienceBoostResult, out StatResult moneyUpgradeResult))
            {
                AppendStatBreakdown(builder, "Science Boost Per Second", scienceBoostResult);
                AppendStatBreakdown(builder, "Money Upgrade Per Second", moneyUpgradeResult);
            }
            else
            {
                builder.AppendLine("Shoulders Accruals: data-driven not ready.");
            }

            Debug.Log(builder.ToString());
        }

        [ContextMenu("Debug/Run Facility Parity Suite")]
        public void DebugRunFacilityParityTests()
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            double[] dataCenters = (double[])dvid.dataCenters.Clone();
            double dataCenterModifier = dvid.dataCenterModifier;
            double[] servers = (double[])dvid.servers.Clone();
            double serverModifier = dvid.serverModifier;
            double rudimentarySingularity = dvid.rudimentrySingularityProduction;
            double scienceBoostOwned = GetResearchLevelInternal(ResearchIdMap.ScienceBoost);

            double[] assemblyLines = (double[])dvid.assemblyLines.Clone();
            double assemblyLineModifier = dvid.assemblyLineModifier;
            double[] managers = (double[])dvid.managers.Clone();
            double managerModifier = dvid.managerModifier;

            double[] planets = (double[])dvid.planets.Clone();
            double planetModifier = dvid.planetModifier;
            double workers = dvid.workers;
            double researchers = dvid.researchers;
            double panelLifetime = dvid.panelLifetime;
            double panelsPerSec = dvid.panelsPerSec;
            double pocketAndroidsTimer = dvpd.pocketAndroidsTimer;
            double bots = dvid.bots;

            bool rule34 = dvst.rule34;
            bool stayingPower = dvst.stayingPower;
            bool superchargedPower = dvst.superchargedPower;
            bool parallelComputation = dvst.parallelComputation;
            bool pocketDimensions = dvst.pocketDimensions;
            bool pocketMultiverse = dvst.pocketMultiverse;
            bool pocketProtectors = dvst.pocketProtectors;
            bool dimensionalCatCables = dvst.dimensionalCatCables;
            bool solarBubbles = dvst.solarBubbles;
            bool pocketAndroids = dvst.pocketAndroids;
            bool quantumComputing = dvst.quantumComputing;
            bool rudimentarySingularitySkill = dvst.rudimentarySingularity;
            bool unsuspiciousAlgorithms = dvst.unsuspiciousAlgorithms;
            bool clusterNetworking = dvst.clusterNetworking;
            bool scientificPlanets = dvst.scientificPlanets;
            bool hubbleTelescope = dvst.hubbleTelescope;
            bool jamesWebbTelescope = dvst.jamesWebbTelescope;
            bool terraformingProtocols = dvst.terraformingProtocols;
            bool planetAssembly = dvst.planetAssembly;
            bool shellWorlds = dvst.shellWorlds;
            bool stellarSacrifices = dvst.stellarSacrifices;
            bool stellarObliteration = dvst.stellarObliteration;
            bool supernova = dvst.supernova;
            bool stellarImprovements = dvst.stellarImprovements;
            bool stellarDominance = dvst.stellarDominance;
            bool shouldersOfTheFallen = dvst.shouldersOfTheFallen;
            bool shoulderSurgery = dvst.shoulderSurgery;
            bool shouldersOfGiants = dvst.shouldersOfGiants;
            bool shouldersOfTheEnlightened = dvst.shouldersOfTheEnlightened;
            bool whatCouldHaveBeen = dvst.whatCouldHaveBeen;
            long fragments = dvst.fragments;
            Dictionary<string, bool> skillOwnedByIdSnapshot =
                dvid.skillOwnedById != null ? new Dictionary<string, bool>(dvid.skillOwnedById) : null;

            var results = new List<ParityResult>();

            try
            {
                dvid.assemblyLines[0] = 1000;
                dvid.assemblyLines[1] = 70;
                dvid.assemblyLineModifier = 25;
                dvid.panelLifetime = 20;
                dvst.stayingPower = true;
                dvst.rule34 = true;
                dvst.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareAssemblyLineProduction(results);

                dvid.managers[0] = 500;
                dvid.managers[1] = 70;
                dvid.managerModifier = 131;
                dvst.stayingPower = false;
                dvst.rule34 = true;
                dvst.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareAiManagerProduction(results);

                dvid.servers[0] = 1000;
                dvid.servers[1] = 70;
                dvid.serverModifier = 114.231998421252;
                dvst.rule34 = true;
                dvst.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareServerProduction(results);

                dvid.dataCenters[0] = 1000;
                dvid.dataCenters[1] = 250;
                dvid.dataCenterModifier = 33.8;
                dvid.servers[0] = 200;
                dvid.servers[1] = 50;
                dvid.rudimentrySingularityProduction = 42.5;
                dvst.rule34 = true;
                dvst.superchargedPower = true;
                dvst.rudimentarySingularity = true;
                dvst.parallelComputation = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareDataCenterProduction(results);

                dvid.planets[0] = 75;
                dvid.planets[1] = 5;
                dvid.planetModifier = 32.6;
                dvid.workers = 1_000_000;
                dvid.researchers = 250_000;
                dvid.panelLifetime = 15;
                dvpd.pocketAndroidsTimer = 1800;

                dvst.pocketDimensions = true;
                dvst.pocketMultiverse = true;
                dvst.pocketProtectors = false;
                dvst.dimensionalCatCables = true;
                dvst.solarBubbles = true;
                dvst.pocketAndroids = true;
                dvst.quantumComputing = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetProduction(results);

                dvst.pocketMultiverse = false;
                dvst.pocketProtectors = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetProduction(results);

                dvid.managers[0] = 100;
                dvid.managers[1] = 25;
                dvid.managerModifier = 50;
                dvst.rudimentarySingularity = true;
                dvst.unsuspiciousAlgorithms = true;
                dvst.clusterNetworking = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareRudimentarySingularityProduction(results);

                dvid.assemblyLines[0] = 80;
                dvid.assemblyLines[1] = 20;
                dvid.planets[0] = 8;
                dvid.planets[1] = 2;
                dvid.researchers = 1_000_000;
                dvid.panelsPerSec = 2e15;
                dvid.panelLifetime = 100;
                dvid.bots = 1e16;
                SetResearchLevelInternal(ResearchIdMap.ScienceBoost, 1e6);
                dvst.fragments = 5;

                dvst.scientificPlanets = true;
                dvst.hubbleTelescope = true;
                dvst.jamesWebbTelescope = true;
                dvst.terraformingProtocols = true;
                dvst.planetAssembly = true;
                dvst.shellWorlds = true;
                dvst.stellarSacrifices = true;
                dvst.stellarObliteration = false;
                dvst.supernova = false;
                dvst.stellarImprovements = false;
                dvst.stellarDominance = false;
                dvst.shouldersOfTheFallen = true;
                dvst.shoulderSurgery = true;
                dvst.shouldersOfGiants = true;
                dvst.shouldersOfTheEnlightened = true;
                dvst.whatCouldHaveBeen = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetGeneration(results);
                DebugCompareStellarSacrificeBotDrain(results);
                DebugCompareShouldersOfTheFallenBonuses(results);
                DebugCompareShouldersAccruals(results);
                DebugCompareMoneyMultiplier(results);
                DebugCompareScienceMultiplier(results);
                DebugComparePanelLifetime(results);
                DebugCompareFacilityModifiers(results);

                dvst.stellarObliteration = true;
                dvst.stellarImprovements = true;
                dvst.stellarDominance = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetGeneration(results);
                DebugCompareStellarSacrificeBotDrain(results);

                dvst.supernova = true;
                dvst.stellarObliteration = false;
                dvst.stellarImprovements = false;
                dvst.stellarDominance = false;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetGeneration(results);
                DebugCompareStellarSacrificeBotDrain(results);
            }
            finally
            {
                dvid.dataCenters[0] = dataCenters[0];
                dvid.dataCenters[1] = dataCenters[1];
                dvid.dataCenterModifier = dataCenterModifier;
                dvid.servers[0] = servers[0];
                dvid.servers[1] = servers[1];
                dvid.serverModifier = serverModifier;
                dvid.rudimentrySingularityProduction = rudimentarySingularity;
                SetResearchLevelInternal(ResearchIdMap.ScienceBoost, scienceBoostOwned);

                dvid.assemblyLines[0] = assemblyLines[0];
                dvid.assemblyLines[1] = assemblyLines[1];
                dvid.assemblyLineModifier = assemblyLineModifier;
                dvid.managers[0] = managers[0];
                dvid.managers[1] = managers[1];
                dvid.managerModifier = managerModifier;

                dvid.planets[0] = planets[0];
                dvid.planets[1] = planets[1];
                dvid.planetModifier = planetModifier;
                dvid.workers = workers;
                dvid.researchers = researchers;
                dvid.panelLifetime = panelLifetime;
                dvid.panelsPerSec = panelsPerSec;
                dvpd.pocketAndroidsTimer = pocketAndroidsTimer;
                dvid.bots = bots;

                dvst.rule34 = rule34;
                dvst.stayingPower = stayingPower;
                dvst.superchargedPower = superchargedPower;
                dvst.parallelComputation = parallelComputation;
                dvst.pocketDimensions = pocketDimensions;
                dvst.pocketMultiverse = pocketMultiverse;
                dvst.pocketProtectors = pocketProtectors;
                dvst.dimensionalCatCables = dimensionalCatCables;
                dvst.solarBubbles = solarBubbles;
                dvst.pocketAndroids = pocketAndroids;
                dvst.quantumComputing = quantumComputing;
                dvst.rudimentarySingularity = rudimentarySingularitySkill;
                dvst.unsuspiciousAlgorithms = unsuspiciousAlgorithms;
                dvst.clusterNetworking = clusterNetworking;
                dvst.scientificPlanets = scientificPlanets;
                dvst.hubbleTelescope = hubbleTelescope;
                dvst.jamesWebbTelescope = jamesWebbTelescope;
                dvst.terraformingProtocols = terraformingProtocols;
                dvst.planetAssembly = planetAssembly;
                dvst.shellWorlds = shellWorlds;
                dvst.stellarSacrifices = stellarSacrifices;
                dvst.stellarObliteration = stellarObliteration;
                dvst.supernova = supernova;
                dvst.stellarImprovements = stellarImprovements;
                dvst.stellarDominance = stellarDominance;
                dvst.shouldersOfTheFallen = shouldersOfTheFallen;
                dvst.shoulderSurgery = shoulderSurgery;
                dvst.shouldersOfGiants = shouldersOfGiants;
                dvst.shouldersOfTheEnlightened = shouldersOfTheEnlightened;
                dvst.whatCouldHaveBeen = whatCouldHaveBeen;
                dvst.fragments = fragments;
                if (dvid != null)
                {
                    dvid.skillOwnedById ??= new Dictionary<string, bool>();
                    dvid.skillOwnedById.Clear();
                    if (skillOwnedByIdSnapshot != null)
                    {
                        foreach (KeyValuePair<string, bool> entry in skillOwnedByIdSnapshot)
                        {
                            dvid.skillOwnedById[entry.Key] = entry.Value;
                        }
                    }
                }

                LogParitySummary(results);
            }
        }

        private void SyncSkillOwnershipFromSkillTreeData()
        {
            if (dvid == null || dvst == null) return;
            dvid.skillOwnedById ??= new Dictionary<string, bool>();
            dvid.skillOwnedById.Clear();

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
            {
                foreach (SkillDefinition skill in registry.skillDatabase.skills)
                {
                    if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                    bool owned = SkillFlagAccessor.TryGetFlag(dvst, skill.id, out bool flag) && flag;
                    dvid.skillOwnedById[skill.id] = owned;
                }

                return;
            }

            if (SkillTree == null) return;
            foreach (KeyValuePair<int, SkillTreeItem> entry in SkillTree)
            {
                if (!SkillIdMap.TryGetId(entry.Key, out string id)) continue;
                bool owned = SkillFlagAccessor.TryGetFlag(dvst, id, out bool flag) && flag;
                dvid.skillOwnedById[id] = owned;
            }
        }

        private void AppendFacilityBreakdown(StringBuilder builder, string label, string facilityId)
        {
            if (builder == null || string.IsNullOrEmpty(facilityId)) return;

            if (!GameDataRegistry.Instance.TryGetFacility(facilityId, out FacilityDefinition definition))
            {
                builder.AppendLine($"{label}: FacilityDefinition not found.");
                return;
            }

            FacilityRuntime runtime = TryBuildDataDrivenRuntime(definition);
            if (runtime == null)
            {
                builder.AppendLine($"{label}: data-driven runtime not ready.");
                return;
            }

            builder.AppendLine($"{label}: {runtime.State.ProductionRate}");
            builder.AppendLine($"{label} Breakdown:");
            AppendContributions(builder, runtime.Breakdown.Contributions);
        }

        private void AppendStatBreakdown(StringBuilder builder, string label, StatResult result)
        {
            if (builder == null || result == null) return;

            builder.AppendLine($"{label}: {result.Value}");
            builder.AppendLine($"{label} Breakdown:");
            AppendContributions(builder, result.Contributions);
        }

        private void AppendContributions(StringBuilder builder, List<Contribution> contributions)
        {
            if (builder == null || contributions == null) return;

            foreach (Contribution contribution in contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }
        }

        private void DebugCompareRudimentarySingularityProduction()
        {
            DebugCompareRudimentarySingularityProduction(null);
        }

        private void DebugCompareRudimentarySingularityProduction(List<ParityResult> results)
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            if (!GameDataRegistry.Instance.TryGetFacility("ai_managers", out FacilityDefinition definition))
            {
                Debug.LogWarning("AI Manager FacilityDefinition not found.");
                return;
            }

            FacilityRuntime runtime = FacilityLegacyBridge.BuildAiManagerRuntime(definition, dvid, dvst);
            if (runtime == null)
            {
                Debug.LogWarning("AI Manager runtime could not be built.");
                return;
            }

            double legacyCached = dvid.rudimentrySingularityProduction;
            double assemblyLineProduction = runtime.State.ProductionRate;
            double baseValue = 0;
            if (dvst.rudimentarySingularity && assemblyLineProduction > 1)
            {
                baseValue = Math.Pow(Math.Log(assemblyLineProduction, 2),
                    1 + Math.Log10(assemblyLineProduction) / 10);
            }

            double serversTotal = dvid.servers[0] + dvid.servers[1];
            var effects = new List<StatEffect>();
            if (dvst.unsuspiciousAlgorithms && baseValue > 0)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.unsuspicious_algorithms",
                    SourceName = "Unsuspicious Algorithms",
                    TargetStatId = "Global.RudimentarySingularity",
                    Operation = StatOperation.Multiply,
                    Value = 10,
                    Order = 10
                });
            }

            if (dvst.clusterNetworking && serversTotal > 1)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.cluster_networking",
                    SourceName = "Cluster Networking",
                    TargetStatId = "Global.RudimentarySingularity",
                    Operation = StatOperation.Multiply,
                    Value = 1 + 0.05f * Math.Log10(serversTotal),
                    Order = 20,
                    ConditionId = "servers_total_gt_1"
                });
            }

            double legacyComputed = baseValue;
            if (dvst.unsuspiciousAlgorithms && legacyComputed > 0)
                legacyComputed *= 10;
            if (dvst.clusterNetworking && serversTotal > 1)
                legacyComputed *= 1 + 0.05f * Math.Log10(serversTotal);

            StatResult pipelineResult = StatCalculator.Calculate(baseValue, effects);
            double updated = pipelineResult.Value;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Rudimentary Singularity", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Rudimentary Singularity (legacy cached): {legacyCached}");
            builder.AppendLine($"Rudimentary Singularity (legacy formula): {legacyComputed}");
            builder.AppendLine($"Rudimentary Singularity (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine(
                $"Inputs: assemblyLineProduction={assemblyLineProduction}, serversTotal={serversTotal}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in pipelineResult.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            Debug.Log(builder.ToString());
        }

        private void DebugCompareStellarSacrificeBotDrain()
        {
            DebugCompareStellarSacrificeBotDrain(null);
        }

        private void DebugCompareStellarSacrificeBotDrain(List<ParityResult> results)
        {
            double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, 0);
            double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, false, 0);
            double stellarGalaxies = ProductionMath.StellarGalaxies(dvst, galaxiesEngulfed);
            double botsRequired = ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded);

            double legacyComputed = dvst.stellarSacrifices && dvid.bots >= botsRequired && stellarGalaxies > 0
                ? botsRequired
                : 0;

            var effects = new List<StatEffect>();
            if (dvst.stellarSacrifices && dvid.bots >= botsRequired && stellarGalaxies > 0)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.stellar_sacrifices_drain",
                    SourceName = "Stellar Sacrifices Drain",
                    TargetStatId = "Global.BotsDrainPerSecond",
                    Operation = StatOperation.Add,
                    Value = botsRequired,
                    Order = 0,
                    ConditionId = "bots_required_met"
                });
            }

            StatResult pipelineResult = StatCalculator.Calculate(0, effects);
            double updated = pipelineResult.Value;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Stellar Sacrifice Bot Drain", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Stellar Sacrifice Bot Drain (legacy formula): {legacyComputed}");
            builder.AppendLine($"Stellar Sacrifice Bot Drain (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine(
                $"Inputs: bots={dvid.bots}, starsSurrounded={starsSurrounded}, galaxiesEngulfed={galaxiesEngulfed}, " +
                $"stellarGalaxies={stellarGalaxies}, botsRequired={botsRequired}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in pipelineResult.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            Debug.Log(builder.ToString());
        }

        private void DebugCompareShouldersOfTheFallenBonuses()
        {
            DebugCompareShouldersOfTheFallenBonuses(null);
        }

        private void DebugCompareShouldersOfTheFallenBonuses(List<ParityResult> results)
        {
            double scientificBase = FacilityLegacyBridge.ComputeScientificPlanetsProduction(dvid, dvst);
            double shouldersBonus = dvst.shouldersOfTheFallen && dvid.scienceBoostOwned > 0
                ? Math.Log(dvid.scienceBoostOwned, 2)
                : 0;
            double legacyScientific = scientificBase + shouldersBonus;

            var scientificEffects = new List<StatEffect>();
            if (shouldersBonus > 0)
            {
                scientificEffects.Add(new StatEffect
                {
                    Id = "skill.shoulders_of_the_fallen",
                    SourceName = "Shoulders Of The Fallen",
                    TargetStatId = "Global.ScientificPlanetsPerSecond",
                    Operation = StatOperation.Add,
                    Value = shouldersBonus,
                    Order = 0
                });
            }

            StatResult scientificResult = StatCalculator.Calculate(scientificBase, scientificEffects);
            double scientificDelta = scientificResult.Value - legacyScientific;
            results?.Add(new ParityResult("Shoulders Of The Fallen (Scientific)", scientificDelta));

            double pocketBase = FacilityLegacyBridge.ComputePocketDimensionsProduction(dvid, dvpd, dvst);
            double shoulderSurgeryBonus = dvst.shouldersOfTheFallen && dvst.shoulderSurgery && dvid.scienceBoostOwned > 0
                ? Math.Log(dvid.scienceBoostOwned, 2)
                : 0;
            double legacyPocket = pocketBase + shoulderSurgeryBonus;

            var pocketEffects = new List<StatEffect>();
            if (shoulderSurgeryBonus > 0)
            {
                pocketEffects.Add(new StatEffect
                {
                    Id = "skill.shoulder_surgery",
                    SourceName = "Shoulder Surgery",
                    TargetStatId = "Global.PocketDimensionsPerSecond",
                    Operation = StatOperation.Add,
                    Value = shoulderSurgeryBonus,
                    Order = 0
                });
            }

            StatResult pocketResult = StatCalculator.Calculate(pocketBase, pocketEffects);
            double pocketDelta = pocketResult.Value - legacyPocket;
            results?.Add(new ParityResult("Shoulder Surgery (Pocket Dimensions)", pocketDelta));

            var builder = new StringBuilder();
            builder.AppendLine($"Shoulders Of The Fallen (Scientific Planets) legacy: {legacyScientific}");
            builder.AppendLine($"Shoulders Of The Fallen (Scientific Planets) pipeline: {scientificResult.Value}");
            builder.AppendLine($"Delta: {scientificDelta}");
            builder.AppendLine($"Inputs: researchers={dvid.researchers}, scienceBoostOwned={dvid.scienceBoostOwned}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in scientificResult.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            builder.AppendLine($"Shoulder Surgery (Pocket Dimensions) legacy: {legacyPocket}");
            builder.AppendLine($"Shoulder Surgery (Pocket Dimensions) pipeline: {pocketResult.Value}");
            builder.AppendLine($"Delta: {pocketDelta}");
            builder.AppendLine(
                $"Inputs: workers={dvid.workers}, researchers={dvid.researchers}, panelLifetime={dvid.panelLifetime}, " +
                $"pocketAndroidsTimer={dvpd.pocketAndroidsTimer}, scienceBoostOwned={dvid.scienceBoostOwned}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in pocketResult.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            Debug.Log(builder.ToString());
        }

        private void DebugCompareShouldersAccruals()
        {
            DebugCompareShouldersAccruals(null);
        }

        private void DebugCompareShouldersAccruals(List<ParityResult> results)
        {
            double scientificPlanetsProduction = FacilityLegacyBridge.ComputeScientificPlanetsProduction(dvid, dvst);
            if (dvst.shouldersOfTheFallen && dvid.scienceBoostOwned > 0)
                scientificPlanetsProduction += Math.Log(dvid.scienceBoostOwned, 2);

            double pocketDimensionsProduction = FacilityLegacyBridge.ComputePocketDimensionsProduction(dvid, dvpd, dvst);
            if (dvst.shouldersOfTheFallen && dvst.shoulderSurgery && dvid.scienceBoostOwned > 0)
                pocketDimensionsProduction += Math.Log(dvid.scienceBoostOwned, 2);

            double legacyScienceBoostRate = dvst.shouldersOfGiants && dvst.scientificPlanets
                ? scientificPlanetsProduction + (dvst.whatCouldHaveBeen ? pocketDimensionsProduction : 0)
                : 0;
            double legacyMoneyUpgradeRate = dvst.shouldersOfTheEnlightened && dvst.scientificPlanets
                ? scientificPlanetsProduction
                : 0;

            var scienceBoostEffects = new List<StatEffect>();
            if (dvst.shouldersOfGiants && dvst.scientificPlanets)
            {
                scienceBoostEffects.Add(new StatEffect
                {
                    Id = "skill.shoulders_of_giants",
                    SourceName = "Shoulders Of Giants",
                    TargetStatId = "Global.ScienceBoostPerSecond",
                    Operation = StatOperation.Add,
                    Value = scientificPlanetsProduction,
                    Order = 0
                });
                if (dvst.whatCouldHaveBeen)
                {
                    scienceBoostEffects.Add(new StatEffect
                    {
                        Id = "skill.what_could_have_been",
                        SourceName = "What Could Have Been",
                        TargetStatId = "Global.ScienceBoostPerSecond",
                        Operation = StatOperation.Add,
                        Value = pocketDimensionsProduction,
                        Order = 10
                    });
                }
            }

            var moneyUpgradeEffects = new List<StatEffect>();
            if (dvst.shouldersOfTheEnlightened && dvst.scientificPlanets)
            {
                moneyUpgradeEffects.Add(new StatEffect
                {
                    Id = "skill.shoulders_of_the_enlightened",
                    SourceName = "Shoulders Of The Enlightened",
                    TargetStatId = "Global.MoneyMultiUpgradePerSecond",
                    Operation = StatOperation.Add,
                    Value = scientificPlanetsProduction,
                    Order = 0
                });
            }

            StatResult scienceResult = StatCalculator.Calculate(0, scienceBoostEffects);
            StatResult moneyResult = StatCalculator.Calculate(0, moneyUpgradeEffects);
            double scienceDelta = scienceResult.Value - legacyScienceBoostRate;
            double moneyDelta = moneyResult.Value - legacyMoneyUpgradeRate;
            results?.Add(new ParityResult("Shoulders Accruals (Science Boost)", scienceDelta));
            results?.Add(new ParityResult("Shoulders Accruals (Money Upgrade)", moneyDelta));

            var builder = new StringBuilder();
            builder.AppendLine($"Shoulders Accruals (Science Boost) legacy: {legacyScienceBoostRate}");
            builder.AppendLine($"Shoulders Accruals (Science Boost) pipeline: {scienceResult.Value}");
            builder.AppendLine($"Delta: {scienceDelta}");
            builder.AppendLine(
                $"Inputs: scientificPlanets={scientificPlanetsProduction}, pocketDimensions={pocketDimensionsProduction}, " +
                $"scienceBoostOwned={dvid.scienceBoostOwned}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in scienceResult.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            builder.AppendLine($"Shoulders Accruals (Money Upgrade) legacy: {legacyMoneyUpgradeRate}");
            builder.AppendLine($"Shoulders Accruals (Money Upgrade) pipeline: {moneyResult.Value}");
            builder.AppendLine($"Delta: {moneyDelta}");
            builder.AppendLine($"Inputs: scientificPlanets={scientificPlanetsProduction}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in moneyResult.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            Debug.Log(builder.ToString());
        }

        private void DebugCompareMoneyMultiplier(List<ParityResult> results)
        {
            var secrets = ModifierSystem.BuildSecretBuffState(dvpd);
            double legacy = dvst.shouldersOfPrecursors
                ? ModifierSystem.ScienceMultipliers(dvid, dvst, dvpd, pp, secrets)
                : ModifierSystem.MoneyMultipliers(dvid, dvst, dvpd, pp, secrets);

            if (GlobalStatPipeline.TryCalculateMoneyMultiplier(dvid, dvst, dvpd, pp, secrets,
                    out StatResult result))
            {
                results?.Add(new ParityResult("Money Multiplier", result.Value - legacy));
            }
            else
            {
                results?.Add(new ParityResult("Money Multiplier", double.NaN));
            }
        }

        private void DebugCompareScienceMultiplier(List<ParityResult> results)
        {
            var secrets = ModifierSystem.BuildSecretBuffState(dvpd);
            double legacy = ModifierSystem.ScienceMultipliers(dvid, dvst, dvpd, pp, secrets);

            if (GlobalStatPipeline.TryCalculateScienceMultiplier(dvid, dvst, dvpd, pp, secrets,
                    out StatResult result))
            {
                results?.Add(new ParityResult("Science Multiplier", result.Value - legacy));
            }
            else
            {
                results?.Add(new ParityResult("Science Multiplier", double.NaN));
            }
        }

        private void DebugComparePanelLifetime(List<ParityResult> results)
        {
            double legacyLifetime = ModifierSystem.CalculatePanelLifetimeLegacy(dvid, dvst, dvpd, pp);
            if (GlobalStatPipeline.TryCalculatePanelLifetime(dvid, dvst, dvpd, pp, out StatResult result))
            {
                results?.Add(new ParityResult("Panel Lifetime", result.Value - legacyLifetime));
            }
            else
            {
                results?.Add(new ParityResult("Panel Lifetime", double.NaN));
            }
        }

        private void DebugComparePlanetGeneration()
        {
            DebugComparePlanetGeneration(null);
        }

        private void DebugComparePlanetGeneration(List<ParityResult> results)
        {
            double legacyCached = dvid.totalPlanetProduction;
            double scientificPlanetsProduction = FacilityLegacyBridge.ComputeScientificPlanetsProduction(dvid, dvst);
            double planetAssemblyProduction = FacilityLegacyBridge.ComputePlanetAssemblyProduction(dvid, dvst);
            double shellWorldsProduction = FacilityLegacyBridge.ComputeShellWorldsProduction(dvid, dvst);
            double stellarSacrificesProduction = FacilityLegacyBridge.ComputeStellarSacrificesProduction(dvid, dvst);

            double legacyComputed = 0;
            if (dvst.scientificPlanets) legacyComputed += scientificPlanetsProduction;
            if (dvst.planetAssembly) legacyComputed += planetAssemblyProduction;
            if (dvst.shellWorlds) legacyComputed += shellWorldsProduction;
            if (dvst.stellarSacrifices) legacyComputed += stellarSacrificesProduction;

            StatResult pipelineResult = FacilityLegacyBridge.CalculatePlanetGeneration(dvid, dvst);
            double updated = pipelineResult.Value;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Planet Generation", delta));

            double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, 0);
            double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, false, 0);
            double stellarGalaxies = ProductionMath.StellarGalaxies(dvst, galaxiesEngulfed);
            double botsRequired = ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded);

            var builder = new StringBuilder();
            builder.AppendLine($"Planet Generation (legacy cached): {legacyCached}");
            builder.AppendLine($"Planet Generation (legacy formula): {legacyComputed}");
            builder.AppendLine($"Planet Generation (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine(
                $"Inputs: researchers={dvid.researchers}, assemblyLines={dvid.assemblyLines[0] + dvid.assemblyLines[1]}, " +
                $"planets={dvid.planets[0] + dvid.planets[1]}, bots={dvid.bots}, " +
                $"starsSurrounded={starsSurrounded}, galaxiesEngulfed={galaxiesEngulfed}, stellarGalaxies={stellarGalaxies}, " +
                $"botsRequired={botsRequired}");
            builder.AppendLine($"Scientific Planets: {scientificPlanetsProduction}");
            builder.AppendLine($"Planet Assembly: {planetAssemblyProduction}");
            builder.AppendLine($"Shell Worlds: {shellWorldsProduction}");
            builder.AppendLine($"Stellar Sacrifices: {stellarSacrificesProduction}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in pipelineResult.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            Debug.Log(builder.ToString());
        }

        private void DebugComparePlanetProduction()
        {
            DebugComparePlanetProduction(null);
        }

        private void DebugComparePlanetProduction(List<ParityResult> results)
        {
            if (GameDataRegistry.Instance == null)
            {
                Debug.LogWarning("GameDataRegistry not found in scene.");
                return;
            }

            if (!GameDataRegistry.Instance.TryGetFacility("planets", out FacilityDefinition definition))
            {
                Debug.LogWarning("Planet FacilityDefinition not found.");
                return;
            }

            FacilityRuntime runtime = FacilityLegacyBridge.BuildPlanetRuntime(definition, dvid, dvpd, dvst);
            if (runtime == null)
            {
                Debug.LogWarning("Planet runtime could not be built.");
                return;
            }

            double legacyCached = dvid.dataCenterProduction;
            double legacyComputed = (dvid.planets[0] + dvid.planets[1]) * 0.0002777777777777778f * dvid.planetModifier;
            if (dvst.rule34 && dvid.planets[1] >= 69)
                legacyComputed *= 2;
            if (dvst.superchargedPower)
                legacyComputed *= 1.5f;
            if (dvst.pocketDimensions)
            {
                double pocketDimensionsProduction = FacilityLegacyBridge.ComputePocketDimensionsProduction(dvid, dvpd, dvst);
                if (pocketDimensionsProduction > 0)
                    legacyComputed += pocketDimensionsProduction;
            }

            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Planets (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Planets (legacy cached): {legacyCached}");
            builder.AppendLine($"Planets (legacy formula): {legacyComputed}");
            builder.AppendLine($"Planets (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine(
                $"Inputs: count={dvid.planets[0] + dvid.planets[1]}, modifier={dvid.planetModifier}, " +
                $"workers={dvid.workers}, researchers={dvid.researchers}, pocketAndroidsTimer={dvpd.pocketAndroidsTimer}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("planets", out double dataDrivenModifier))
            {
                dataDrivenExpected =
                    (dvid.planets[0] + dvid.planets[1]) * 0.0002777777777777778f * dataDrivenModifier;
                if (dvst.rule34 && dvid.planets[1] >= 69)
                    dataDrivenExpected *= 2;
                if (dvst.superchargedPower)
                    dataDrivenExpected *= 1.5f;
                if (dvst.pocketDimensions)
                {
                    double pocketDimensionsProduction =
                        FacilityLegacyBridge.ComputePocketDimensionsProduction(dvid, dvpd, dvst);
                    if (pocketDimensionsProduction > 0)
                        dataDrivenExpected += pocketDimensionsProduction;
                }
            }

            AppendDataDrivenComparison(builder, "Planets", definition, dataDrivenExpected, results);
            Debug.Log(builder.ToString());
        }

        private bool TryGetDataDrivenModifier(string facilityId, out double modifier)
        {
            modifier = 1;
            if (string.IsNullOrEmpty(facilityId)) return false;

            var secrets = ModifierSystem.BuildSecretBuffState(dvpd);
            const double parityMaxInfinityBuff = 1e44;

            StatResult result;
            switch (facilityId)
            {
                case "assembly_lines":
                    if (!FacilityModifierPipeline.TryCalculateAssemblyLineModifier(dvid, dvst, dvpd, pp, secrets,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "ai_managers":
                    if (!FacilityModifierPipeline.TryCalculateManagerModifier(dvid, dvst, dvpd, pp, secrets,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "servers":
                    if (!FacilityModifierPipeline.TryCalculateServerModifier(dvid, dvst, dvpd, pp, secrets,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "data_centers":
                    if (!FacilityModifierPipeline.TryCalculateDataCenterModifier(dvid, dvst, dvpd, pp,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "planets":
                    if (!FacilityModifierPipeline.TryCalculatePlanetModifier(dvid, dvst, dvpd, pp, secrets,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                default:
                    return false;
            }

            modifier = result.Value;
            return true;
        }

        private void DebugCompareFacilityModifiers(List<ParityResult> results)
        {
            if (results == null) return;

            var secrets = new SecretBuffState();
            double assemblyLineUpgradePercent = dvid.assemblyLineUpgradePercent;
            double aiManagerUpgradePercent = dvid.aiManagerUpgradePercent;
            double serverUpgradePercent = dvid.serverUpgradePercent;
            double dataCenterUpgradePercent = dvid.dataCenterUpgradePercent;
            double planetUpgradePercent = dvid.planetUpgradePercent;

            try
            {
                ModifierSystem.SecretBuffs(dvid, dvpd, secrets);

                const double parityMaxInfinityBuff = 1e44;

                if (FacilityModifierPipeline.TryCalculateAssemblyLineModifier(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff, out StatResult assemblyResult))
                {
                    double legacy = ModifierSystem.CalculateAssemblyLineModifierLegacy(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("Assembly Lines Modifier", assemblyResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("Assembly Lines Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculateManagerModifier(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff, out StatResult managerResult))
                {
                    double legacy = ModifierSystem.CalculateManagerModifierLegacy(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("AI Managers Modifier", managerResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("AI Managers Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculateServerModifier(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff, out StatResult serverResult))
                {
                    double legacy = ModifierSystem.CalculateServerModifierLegacy(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("Servers Modifier", serverResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("Servers Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculateDataCenterModifier(dvid, dvst, dvpd, pp,
                        parityMaxInfinityBuff, out StatResult dataCenterResult))
                {
                    double legacy = ModifierSystem.CalculateDataCenterModifierLegacy(dvid, dvst, dvpd, pp,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("Data Centers Modifier", dataCenterResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("Data Centers Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculatePlanetModifier(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff, out StatResult planetResult))
                {
                    double legacy = ModifierSystem.CalculatePlanetModifierLegacy(dvid, dvst, dvpd, pp, secrets,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("Planets Modifier", planetResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("Planets Modifier", double.NaN));
                }
            }
            finally
            {
                dvid.assemblyLineUpgradePercent = assemblyLineUpgradePercent;
                dvid.aiManagerUpgradePercent = aiManagerUpgradePercent;
                dvid.serverUpgradePercent = serverUpgradePercent;
                dvid.dataCenterUpgradePercent = dataCenterUpgradePercent;
                dvid.planetUpgradePercent = planetUpgradePercent;
            }
        }

        private void AppendDataDrivenComparison(StringBuilder builder, string label, FacilityDefinition definition,
            double legacyComputed, List<ParityResult> results)
        {
            if (builder == null || definition == null) return;

            FacilityRuntime runtime = TryBuildDataDrivenRuntime(definition);
            if (runtime == null) return;

            double dataDriven = runtime.State.ProductionRate;
            double delta = dataDriven - legacyComputed;
            results?.Add(new ParityResult($"{label} (data-driven)", delta));
            builder.AppendLine($"{label} (data-driven expected): {legacyComputed}");
            builder.AppendLine($"{label} (data-driven): {dataDriven}");
            builder.AppendLine($"Delta (data-driven): {delta}");
            builder.AppendLine("Data-driven Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }
        }

        private const double ParityEpsilon = 1e-09;

        private void LogParitySummary(List<ParityResult> results)
        {
            if (results == null || results.Count == 0)
            {
                Debug.Log("Parity suite: no results collected.");
                return;
            }

            int failed = 0;
            int skipped = 0;
            var builder = new StringBuilder();

            foreach (ParityResult result in results)
            {
                if (double.IsNaN(result.Delta))
                {
                    skipped++;
                    continue;
                }

                if (Math.Abs(result.Delta) > ParityEpsilon)
                {
                    failed++;
                    builder.AppendLine($"{result.Label}: {result.Delta}");
                }
            }

            if (failed == 0)
            {
                Debug.Log($"Parity suite: all deltas within {ParityEpsilon}. Results={results.Count}, Skipped={skipped}");
            }
            else
            {
                Debug.Log($"Parity suite: {failed} mismatches (epsilon {ParityEpsilon}). Results={results.Count}, Skipped={skipped}\n{builder}");
            }
        }

        private readonly struct ParityResult
        {
            public ParityResult(string label, double delta)
            {
                Label = label;
                Delta = delta;
            }

            public string Label { get; }
            public double Delta { get; }
        }

        private FacilityRuntime TryBuildDataDrivenRuntime(FacilityDefinition definition)
        {
            if (definition == null) return null;
            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null || registry.skillDatabase.skills == null ||
                registry.skillDatabase.skills.Count == 0)
            {
                return null;
            }

            FacilityState state = BuildFacilityState(definition.id);
            if (state == null) return null;

            var context = new EffectContext(dvid, dvpd, dvst, pp);
            return FacilityEffectPipeline.BuildRuntimeFromDefinitions(definition, state, context);
        }

        private FacilityState BuildFacilityState(string facilityId)
        {
            if (string.IsNullOrEmpty(facilityId)) return null;

            switch (facilityId)
            {
                case "assembly_lines":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.assemblyLines[1],
                        AutoOwned = dvid.assemblyLines[0],
                        EffectiveCount = dvid.assemblyLines[0] + dvid.assemblyLines[1]
                    };
                case "ai_managers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.managers[1],
                        AutoOwned = dvid.managers[0],
                        EffectiveCount = dvid.managers[0] + dvid.managers[1]
                    };
                case "servers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.servers[1],
                        AutoOwned = dvid.servers[0],
                        EffectiveCount = dvid.servers[0] + dvid.servers[1]
                    };
                case "data_centers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.dataCenters[1],
                        AutoOwned = dvid.dataCenters[0],
                        EffectiveCount = dvid.dataCenters[0] + dvid.dataCenters[1]
                    };
                case "planets":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.planets[1],
                        AutoOwned = dvid.planets[0],
                        EffectiveCount = dvid.planets[0] + dvid.planets[1]
                    };
                default:
                    return null;
            }
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

        public bool IsSkillOwned(string skillId)
        {
            if (string.IsNullOrEmpty(skillId)) return false;
            if (dvid != null && dvid.skillOwnedById != null &&
                dvid.skillOwnedById.TryGetValue(skillId, out bool owned))
            {
                return owned;
            }

            return SkillFlagAccessor.TryGetFlag(dvst, skillId, out bool legacyOwned) && legacyOwned;
        }

        public void SetSkillOwned(string skillId, bool owned)
        {
            if (string.IsNullOrEmpty(skillId)) return;
            if (dvid == null) return;

            dvid.skillOwnedById ??= new Dictionary<string, bool>();
            dvid.skillOwnedById[skillId] = owned;

            if (SkillIdMap.TryGetLegacyKey(skillId, out int key))
            {
                dvid.SkillTreeSaveData ??= new Dictionary<int, bool>();
                dvid.SkillTreeSaveData[key] = owned;
                if (SkillTree != null && SkillTree.TryGetValue(key, out SkillTreeItem item))
                {
                    item.Owned = owned;
                }
            }

            SkillFlagAccessor.TrySetFlag(dvst, skillId, owned);
        }

        public static double GetResearchLevel(string researchId)
        {
            return oracle != null ? oracle.GetResearchLevelInternal(researchId) : 0;
        }

        public static void SetResearchLevel(string researchId, double level)
        {
            if (oracle == null) return;
            oracle.SetResearchLevelInternal(researchId, level);
        }

        public static void AddResearchLevel(string researchId, double delta)
        {
            if (oracle == null || string.IsNullOrEmpty(researchId)) return;
            double level = oracle.GetResearchLevelInternal(researchId);
            oracle.SetResearchLevelInternal(researchId, level + delta);
        }

        private double GetResearchLevelInternal(string researchId)
        {
            if (dvid == null || string.IsNullOrEmpty(researchId)) return 0;

            dvid.researchLevelsById ??= new Dictionary<string, double>();
            if (dvid.researchLevelsById.TryGetValue(researchId, out double level))
            {
                return level;
            }

            if (ResearchIdMap.TryGetLegacyLevel(dvid, researchId, out double legacyLevel))
            {
                dvid.researchLevelsById[researchId] = legacyLevel;
                return legacyLevel;
            }

            return 0;
        }

        private void SetResearchLevelInternal(string researchId, double level)
        {
            if (dvid == null || string.IsNullOrEmpty(researchId)) return;

            dvid.researchLevelsById ??= new Dictionary<string, double>();
            if (ResearchIdMap.TrySetLegacyLevel(dvid, researchId, level) &&
                ResearchIdMap.TryGetLegacyLevel(dvid, researchId, out double normalized))
            {
                dvid.researchLevelsById[researchId] = normalized;
                return;
            }

            dvid.researchLevelsById[researchId] = level;
        }

        public List<string> GetAutoAssignmentSkillIds()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return new List<string>();
            data.skillAutoAssignmentIds ??= new List<string>();
            if (data.skillAutoAssignmentIds.Count == 0 && data.skillAutoAssignmentList.Count > 0)
            {
                data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
            }

            return data.skillAutoAssignmentIds;
        }

        public void SetAutoAssignmentSkillIds(List<string> ids)
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;
            data.skillAutoAssignmentIds = ids ?? new List<string>();
            data.skillAutoAssignmentList = SkillIdMap.ConvertIdsToKeys(data.skillAutoAssignmentIds);
        }

        private void ResetSkillOwnership()
        {
            if (dvid != null)
            {
                dvid.skillOwnedById?.Clear();
                dvid.SkillTreeSaveData?.Clear();
            }

            if (SkillTree != null)
            {
                foreach (KeyValuePair<int, SkillTreeItem> entry in SkillTree)
                {
                    if (entry.Value != null) entry.Value.Owned = false;
                }
            }

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
            {
                foreach (SkillDefinition skill in registry.skillDatabase.skills)
                {
                    if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                    SkillFlagAccessor.TrySetFlag(dvst, skill.id, false);
                }

                return;
            }

            if (SkillTree == null) return;
            foreach (KeyValuePair<int, SkillTreeItem> entry in SkillTree)
            {
                if (!SkillIdMap.TryGetId(entry.Key, out string id)) continue;
                SkillFlagAccessor.TrySetFlag(dvst, id, false);
            }
        }

        #region DysonVerseInfinity

        [ContextMenu("DysonInfinity")]
        public void DysonInfinity()
        {
            saveSettings.firstInfinityDone = true;
            dvpd.androidsSkillTimer = 0;
            dvpd.pocketAndroidsTimer = 0;
            int bankedSkills = 0;
            if (IsSkillOwned("banking")) bankedSkills++;
            if (IsSkillOwned("investmentPortfolio")) bankedSkills++;
            ResetSkillOwnership();

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
            if (IsSkillOwned("banking")) bankedSkills++;
            if (IsSkillOwned("investmentPortfolio")) bankedSkills++;
            ResetSkillOwnership();

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
                    ResetSkillOwnership();
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
            public List<string> skillAutoAssignmentIds = new List<string>();
            public List<string> skillAutoAssignmentIds1 = new List<string>();
            public List<string> skillAutoAssignmentIds2 = new List<string>();
            public List<string> skillAutoAssignmentIds3 = new List<string>();
            public List<string> skillAutoAssignmentIds4 = new List<string>();
            public List<string> skillAutoAssignmentIds5 = new List<string>();
        }

        public void SaveList(int listNum)
        {
            DysonVerseSaveData data = saveSettings.dysonVerseSaveData;
            List<string> ids = new List<string>(GetAutoAssignmentSkillIds());
            List<int> legacyList = SkillIdMap.ConvertIdsToKeys(ids);
            switch (listNum)
            {
                case 1:
                    data.skillAutoAssignmentIds1 = ids;
                    data.skillAutoAssignmentList1 = legacyList;
                    data.botDistPreset1 = dvpd.botDistribution;
                    break;
                case 2:
                    data.skillAutoAssignmentIds2 = ids;
                    data.skillAutoAssignmentList2 = legacyList;
                    data.botDistPreset2 = dvpd.botDistribution;
                    break;
                case 3:
                    data.skillAutoAssignmentIds3 = ids;
                    data.skillAutoAssignmentList3 = legacyList;
                    data.botDistPreset3 = dvpd.botDistribution;
                    break;
                case 4:
                    data.skillAutoAssignmentIds4 = ids;
                    data.skillAutoAssignmentList4 = legacyList;
                    data.botDistPreset4 = dvpd.botDistribution;
                    break;
                case 5:
                    data.skillAutoAssignmentIds5 = ids;
                    data.skillAutoAssignmentList5 = legacyList;
                    data.botDistPreset5 = dvpd.botDistribution;
                    break;
            }
        }

        [SerializeField] private BotDistributionSlider slider;

        public void LoadList(int listNum)
        {
            DysonVerseSaveData data = saveSettings.dysonVerseSaveData;
            List<string> ids = new List<string>();
            switch (listNum)
            {
                case 1:
                    if (data.skillAutoAssignmentIds1.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds1);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList1));
                    dvpd.botDistribution = data.botDistPreset1;
                    slider.SetSlider();
                    break;
                case 2:
                    if (data.skillAutoAssignmentIds2.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds2);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList2));
                    dvpd.botDistribution = data.botDistPreset2;
                    slider.SetSlider();
                    break;
                case 3:
                    if (data.skillAutoAssignmentIds3.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds3);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList3));
                    dvpd.botDistribution = data.botDistPreset3;
                    slider.SetSlider();
                    break;
                case 4:
                    if (data.skillAutoAssignmentIds4.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds4);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList4));
                    dvpd.botDistribution = data.botDistPreset4;
                    slider.SetSlider();
                    break;
                case 5:
                    if (data.skillAutoAssignmentIds5.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds5);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList5));
                    dvpd.botDistribution = data.botDistPreset5;
                    slider.SetSlider();
                    break;
            }

            data.skillAutoAssignmentIds = ids;
            data.skillAutoAssignmentList = SkillIdMap.ConvertIdsToKeys(ids);
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
            public Dictionary<string, bool> skillOwnedById = new Dictionary<string, bool>();
            public Dictionary<string, double> researchLevelsById = new Dictionary<string, double>();
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
