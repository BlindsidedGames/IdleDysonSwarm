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
using Systems.Debugging;
using Systems.Facilities;
using Systems.Migrations;
using Systems.Skills;
using Systems.Stats;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using GameData;
using static LoadScreenMethods;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;


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

        [Header("Offline Progress Debug")]
        [SerializeField] private double offlineParityAwaySeconds = 3600;
        [SerializeField] private double offlineParityOfflineStepSeconds = 1;
        [SerializeField] private double offlineParityOnlineStepSeconds = 1;
        [SerializeField] private double offlineParityRecalcDeltaSeconds = 0;
        [SerializeField] private double offlineParityAbsoluteTolerance = 0.01;
        [SerializeField] private double offlineParityRelativeTolerance = 0.001;
        [SerializeField] private bool offlineParityApplyInfinityPointsBonus = true;

        public static event Action UpdateSkills;

        private DysonVerseInfinityData infinityData => saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
        private DysonVersePrestigeData prestigeData => saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
        private DysonVerseSkillTreeData skillTreeData => saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
        private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
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
        private const int CurrentSaveVersion = 5;

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
            skillTreeData.skillPointsTree = prestigeData.permanentSkillPoint + ArtifactSkillPoints() + infinityData.goalSetter > 0 ? infinityData.goalSetter : 0;
            saveSettings.hasFixedIP = true;
        }

        private void LoadDictionaries()
        {
            foreach (KeyValuePair<int, SkillTreeItem> variable in SkillTree)
            {
                infinityData.SkillTreeSaveData ??= new Dictionary<int, bool>();
                infinityData.SkillTreeSaveData.TryAdd(variable.Key, variable.Value.Owned);
                variable.Value.Owned = infinityData.SkillTreeSaveData[variable.Key];
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
            infinityData.SkillTreeSaveData = new Dictionary<int, bool>();
            if (infinityData.skillStateById != null && infinityData.skillStateById.Count > 0)
            {
                foreach (KeyValuePair<string, SkillState> entry in infinityData.skillStateById)
                {
                    if (SkillIdMap.TryGetLegacyKey(entry.Key, out int key))
                    {
                        infinityData.SkillTreeSaveData[key] = entry.Value.owned;
                    }
                }

                return;
            }

            if (infinityData.skillOwnedById != null && infinityData.skillOwnedById.Count > 0)
            {
                foreach (KeyValuePair<string, bool> entry in infinityData.skillOwnedById)
                {
                    if (SkillIdMap.TryGetLegacyKey(entry.Key, out int key))
                    {
                        infinityData.SkillTreeSaveData[key] = entry.Value;
                    }
                }

                return;
            }

            foreach (KeyValuePair<int, SkillTreeItem> value in SkillTree)
            {
                if (!infinityData.SkillTreeSaveData.ContainsKey(value.Key))
                    infinityData.SkillTreeSaveData.Add(value.Key, value.Value.Owned);
                infinityData.SkillTreeSaveData[value.Key] = value.Value.Owned;
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

            MigrationRegistry registry = BuildMigrationRegistry();
            if (registry.LatestVersion != CurrentSaveVersion)
            {
                Debug.LogWarning(
                    $"Migration registry latest version {registry.LatestVersion} does not match CurrentSaveVersion {CurrentSaveVersion}.");
            }

            MigrationRunOptions options = BuildMigrationOptions(false);
            MigrationRunner.Run(this, registry, options);
        }

        public MigrationRunResult RunMigrationDryRun()
        {
            if (saveSettings == null) return null;

            MigrationRegistry registry = BuildMigrationRegistry();
            MigrationRunOptions options = BuildMigrationOptions(true);
            options.ThrowOnError = false;
            return MigrationRunner.Run(this, registry, options);
        }

        public MigrationRunResult RunMigrationDryRun(SaveDataSettings saveData)
        {
            if (saveData == null) return null;

            SaveDataSettings original = saveSettings;
            try
            {
                saveSettings = saveData;
                return RunMigrationDryRun();
            }
            finally
            {
                saveSettings = original;
            }
        }

        private MigrationRunOptions BuildMigrationOptions(bool dryRun)
        {
            return new MigrationRunOptions
            {
                DryRun = dryRun,
                CaptureSnapshots = dryRun,
                IncludeEnsureStep = true,
                ThrowOnError = !dryRun,
                UpdateLastSuccessfulLoadUtc = !dryRun,
                EnsureAction = _ =>
                {
                    EnsureSkillOwnershipData();
                    EnsureSkillAutoAssignmentIds();
                    EnsureResearchLevelData();
                }
            };
        }

        private MigrationRegistry BuildMigrationRegistry()
        {
            var registry = new MigrationRegistry();
            registry.AddStep(new MigrationStep(
                targetVersion: 2,
                name: "Skill ownership + auto-assign ids",
                summary: "Populate skill ownership and auto-assign id lists from legacy data.",
                apply: _ =>
                {
                    MigrateSkillOwnershipToIds();
                    MigrateSkillAutoAssignmentIds();
                }));

            registry.AddStep(new MigrationStep(
                targetVersion: 3,
                name: "Research levels to ids",
                summary: "Populate research level ids from legacy fields.",
                apply: _ => { MigrateResearchLevelsToIds(); }));

            registry.AddStep(new MigrationStep(
                targetVersion: 4,
                name: "Skill state to ids",
                summary: "Populate skill state dictionary from legacy skill ownership and timers.",
                apply: _ => { MigrateSkillStateToIds(); }));

            registry.AddStep(new MigrationStep(
                targetVersion: 5,
                name: "Extract AvocadoData",
                summary: "Migrate avocato fields from PrestigePlus to new AvocadoData structure.",
                apply: _ => { MigrateAvocadoData(); }));

            return registry;
        }

        private void EnsureSkillOwnershipData()
        {
            if (infinityData == null) return;
            EnsureSkillStateData();
            SyncSkillOwnedByIdFromState();
        }

        private void EnsureSkillStateData()
        {
            if (infinityData == null) return;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            if (infinityData.skillStateById.Count == 0)
            {
                if (infinityData.skillOwnedById != null && infinityData.skillOwnedById.Count > 0)
                {
                    foreach (KeyValuePair<string, bool> entry in infinityData.skillOwnedById)
                    {
                        EnsureSkillStateEntry(entry.Key, entry.Value);
                    }
                }
                else if (infinityData.SkillTreeSaveData != null && infinityData.SkillTreeSaveData.Count > 0)
                {
                    foreach (KeyValuePair<int, bool> entry in infinityData.SkillTreeSaveData)
                    {
                        if (SkillIdMap.TryGetId(entry.Key, out string id))
                        {
                            EnsureSkillStateEntry(id, entry.Value);
                        }
                    }
                }
                else
                {
                    GameDataRegistry registry = GameDataRegistry.Instance;
                    if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
                    {
                        foreach (SkillDefinition skill in registry.skillDatabase.skills)
                        {
                            if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                            bool owned = SkillFlagAccessor.TryGetFlag(skillTreeData, skill.id, out bool flag) && flag;
                            EnsureSkillStateEntry(skill.id, owned);
                        }
                    }
                }
            }

        }

        private void MigrateLegacySkillTimersToState()
        {
            if (infinityData == null) return;

            if (prestigeData != null)
            {
                if (prestigeData.androidsSkillTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "androids", prestigeData.androidsSkillTimer);
                }

                if (prestigeData.pocketAndroidsTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "pocketAndroids", prestigeData.pocketAndroidsTimer);
                }

                prestigeData.androidsSkillTimer = 0;
                prestigeData.pocketAndroidsTimer = 0;
            }

            if (skillTreeData != null)
            {
                if (skillTreeData.superRadiantScatteringTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "superRadiantScattering", skillTreeData.superRadiantScatteringTimer);
                }

                if (skillTreeData.idleElectricSheepTimer > 0)
                {
                    SetSkillTimerSeconds(infinityData, "idleElectricSheep", skillTreeData.idleElectricSheepTimer);
                }

                skillTreeData.superRadiantScatteringTimer = 0;
                skillTreeData.idleElectricSheepTimer = 0;
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
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();

            if (infinityData.researchLevelsById.Count == 0)
            {
                ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
                return;
            }

            ResearchIdMap.ApplyLevelsToLegacy(infinityData, infinityData.researchLevelsById);
            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void MigrateResearchLevelsToIds()
        {
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            if (infinityData.researchLevelsById.Count > 0) return;

            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void SyncResearchLevelsFromLegacy()
        {
            if (infinityData == null) return;
            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            ResearchIdMap.PopulateLevelsFromLegacy(infinityData, infinityData.researchLevelsById);
        }

        private void MigrateSkillOwnershipToIds()
        {
            if (infinityData == null) return;
            infinityData.skillOwnedById ??= new Dictionary<string, bool>();
            if (infinityData.skillOwnedById.Count > 0) return;

            if (infinityData.SkillTreeSaveData != null && infinityData.SkillTreeSaveData.Count > 0)
            {
                foreach (KeyValuePair<int, bool> entry in infinityData.SkillTreeSaveData)
                {
                    if (SkillIdMap.TryGetId(entry.Key, out string id))
                    {
                        infinityData.skillOwnedById[id] = entry.Value;
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
                    infinityData.skillOwnedById[id] = entry.Value.Owned;
                }
            }
        }

        private void MigrateSkillStateToIds()
        {
            if (infinityData == null) return;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            if (infinityData.skillStateById.Count == 0)
            {
                EnsureSkillStateData();
            }

            MigrateLegacySkillTimersToState();
            SyncSkillOwnedByIdFromState();
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

        /// <summary>
        /// Migrates avocato fields from PrestigePlus to new AvocadoData structure.
        /// This preserves all accumulated progress while moving to cleaner data organization.
        /// </summary>
        private void MigrateAvocadoData()
        {
            if (saveSettings == null) return;

            var pp = saveSettings.prestigePlus;
            var avocado = saveSettings.avocadoData;

            // Only migrate if AvocadoData hasn't been populated yet
            // (check if unlocked is false AND legacy field is true, or any accumulated values exist)
            bool needsMigration = !avocado.unlocked && pp.avocatoPurchased;
            bool hasLegacyData = pp.avocatoIP > 0 || pp.avocatoInfluence > 0 ||
                                 pp.avocatoStrangeMatter > 0 || pp.avocatoOverflow > 0;

            if (needsMigration || hasLegacyData)
            {
                // Migrate unlock state
                avocado.unlocked = pp.avocatoPurchased;

                // Migrate accumulated values (add to any existing values in case of partial migration)
                avocado.infinityPoints += pp.avocatoIP;
                avocado.influence += pp.avocatoInfluence;
                avocado.strangeMatter += pp.avocatoStrangeMatter;
                avocado.overflowMultiplier += pp.avocatoOverflow;

                // Clear legacy fields to prevent double-counting on future loads
                pp.avocatoIP = 0;
                pp.avocatoInfluence = 0;
                pp.avocatoStrangeMatter = 0;
                pp.avocatoOverflow = 0;
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
            prestigeButton.interactable = prestigeData.infinityPoints >= 42;
            if (double.IsInfinity(infinityData.bots) || double.IsNaN(infinityData.bots))
                if (!oracle.saveSettings.infinityInProgress)
                {
                    oracle.saveSettings.infinityInProgress = true;
                    oracle.saveSettings.avocadoData.overflowMultiplier++;
                    prestigePlus.avocatoOverflow++; // Keep legacy field in sync
                    prestigeData.infinityPoints += 1000;
                    _gameManager.Prestige();
                }

            double amount = prestigePlus.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, prestigePlus.divisionsPurchased) : 4.2e19;
            int ipToGain = StaticMethods.InfinityPointsToGain(amount, infinityData.bots);
            ipToGain = saveSettings.doubleIp ? ipToGain * 2 : ipToGain;


            if (prestigePlus.breakTheLoop && !saveSettings.infinityInProgress)
                if ((prestigePlus.doubleIP ? ipToGain * 2 : ipToGain) >= (saveSettings.infinityPointsToBreakFor >= 1
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

            FacilityRuntime runtime = FacilityLegacyBridge.BuildAssemblyLineRuntime(definition, infinityData, skillTreeData);
            if (runtime == null)
            {
                Debug.LogWarning("Assembly Line runtime could not be built.");
                return;
            }

            double legacyCached = infinityData.botProduction;
            double legacyComputed = (infinityData.assemblyLines[0] + infinityData.assemblyLines[1]) * 0.1f * infinityData.assemblyLineModifier;
            if (skillTreeData.stayingPower)
                legacyComputed *= 1 + 0.01f * infinityData.panelLifetime;
            if (skillTreeData.rule34 && infinityData.assemblyLines[1] >= 69)
                legacyComputed *= 2;
            if (skillTreeData.superchargedPower)
                legacyComputed *= 1.5f;
            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Assembly Lines (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Assembly Lines (legacy cached): {legacyCached}");
            builder.AppendLine($"Assembly Lines (legacy formula): {legacyComputed}");
            builder.AppendLine($"Assembly Lines (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine($"Inputs: count={infinityData.assemblyLines[0] + infinityData.assemblyLines[1]}, " +
                               $"modifier={infinityData.assemblyLineModifier}, lifetime={infinityData.panelLifetime}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("assembly_lines", out double dataDrivenModifier))
            {
                dataDrivenExpected = (infinityData.assemblyLines[0] + infinityData.assemblyLines[1]) * 0.1f * dataDrivenModifier;
                if (skillTreeData.stayingPower)
                    dataDrivenExpected *= 1 + 0.01f * infinityData.panelLifetime;
                if (skillTreeData.rule34 && infinityData.assemblyLines[1] >= 69)
                    dataDrivenExpected *= 2;
                if (skillTreeData.superchargedPower)
                    dataDrivenExpected *= 1.5f;
            }

            AppendDataDrivenComparison(builder, "Assembly Lines", definition, dataDrivenExpected, results);
            string report = builder.ToString();
            DebugReportRecorder.Record("Data-Driven Breakdowns", report);
            Debug.Log(report);
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

            FacilityRuntime runtime = FacilityLegacyBridge.BuildAiManagerRuntime(definition, infinityData, skillTreeData);
            if (runtime == null)
            {
                Debug.LogWarning("AI Manager runtime could not be built.");
                return;
            }

            double legacyCached = infinityData.assemblyLineProduction;
            double legacyComputed = (infinityData.managers[0] + infinityData.managers[1]) * 0.0166666666666667f * infinityData.managerModifier;
            if (skillTreeData.rule34 && infinityData.managers[1] >= 69)
                legacyComputed *= 2;
            if (skillTreeData.superchargedPower)
                legacyComputed *= 1.5f;

            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("AI Managers (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"AI Managers (legacy cached): {legacyCached}");
            builder.AppendLine($"AI Managers (legacy formula): {legacyComputed}");
            builder.AppendLine($"AI Managers (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine($"Inputs: count={infinityData.managers[0] + infinityData.managers[1]}, modifier={infinityData.managerModifier}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("ai_managers", out double dataDrivenModifier))
            {
                dataDrivenExpected = (infinityData.managers[0] + infinityData.managers[1]) * 0.0166666666666667f *
                                     dataDrivenModifier;
                if (skillTreeData.rule34 && infinityData.managers[1] >= 69)
                    dataDrivenExpected *= 2;
                if (skillTreeData.superchargedPower)
                    dataDrivenExpected *= 1.5f;
            }

            AppendDataDrivenComparison(builder, "AI Managers", definition, dataDrivenExpected, results);
            string report = builder.ToString();
            DebugReportRecorder.Record("Offline Progress Parity", report);
            Debug.Log(report);
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

            FacilityRuntime runtime = FacilityLegacyBridge.BuildServerRuntime(definition, infinityData, skillTreeData);
            if (runtime == null)
            {
                Debug.LogWarning("Server runtime could not be built.");
                return;
            }

            double legacyCached = infinityData.managerProduction;
            double legacyComputed = (infinityData.servers[0] + infinityData.servers[1]) * 0.0016666666666667f * infinityData.serverModifier;
            if (skillTreeData.rule34 && infinityData.servers[1] >= 69)
                legacyComputed *= 2;
            if (skillTreeData.superchargedPower)
                legacyComputed *= 1.5f;

            double updated = runtime.State.ProductionRate;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Servers (pipeline)", delta));
            var builder = new StringBuilder();
            builder.AppendLine($"Servers (legacy cached): {legacyCached}");
            builder.AppendLine($"Servers (legacy formula): {legacyComputed}");
            builder.AppendLine($"Servers (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine($"Inputs: count={infinityData.servers[0] + infinityData.servers[1]}, modifier={infinityData.serverModifier}");
            builder.AppendLine("Breakdown:");
            foreach (Contribution contribution in runtime.Breakdown.Contributions)
            {
                builder.AppendLine(
                    $"{contribution.SourceName} [{contribution.Operation}] {contribution.Value} (delta {contribution.Delta})");
            }

            double dataDrivenExpected = legacyComputed;
            if (TryGetDataDrivenModifier("servers", out double dataDrivenModifier))
            {
                dataDrivenExpected = (infinityData.servers[0] + infinityData.servers[1]) * 0.0016666666666667f * dataDrivenModifier;
                if (skillTreeData.rule34 && infinityData.servers[1] >= 69)
                    dataDrivenExpected *= 2;
                if (skillTreeData.superchargedPower)
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

            FacilityRuntime runtime = FacilityLegacyBridge.BuildDataCenterRuntime(definition, infinityData, skillTreeData);
            if (runtime == null)
            {
                Debug.LogWarning("Data Center runtime could not be built.");
                return;
            }

            double legacyCached = infinityData.serverProduction;
            double legacyComputed = (infinityData.dataCenters[0] + infinityData.dataCenters[1]) * 0.0011111111f * infinityData.dataCenterModifier;
            if (skillTreeData.rule34 && infinityData.dataCenters[1] >= 69)
                legacyComputed *= 2;
            if (skillTreeData.superchargedPower)
                legacyComputed *= 1.5f;
            legacyComputed += infinityData.rudimentrySingularityProduction;
            double serversTotal = infinityData.servers[0] + infinityData.servers[1];
            if (skillTreeData.parallelComputation && serversTotal > 1)
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
                $"Inputs: count={infinityData.dataCenters[0] + infinityData.dataCenters[1]}, modifier={infinityData.dataCenterModifier}, " +
                $"serversTotal={serversTotal}, rudimentary={infinityData.rudimentrySingularityProduction}");
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
                    (infinityData.dataCenters[0] + infinityData.dataCenters[1]) * 0.0011111111f * dataDrivenModifier;
                if (skillTreeData.rule34 && infinityData.dataCenters[1] >= 69)
                    dataDrivenExpected *= 2;
                if (skillTreeData.superchargedPower)
                    dataDrivenExpected *= 1.5f;
                dataDrivenExpected += infinityData.rudimentrySingularityProduction;
                if (skillTreeData.parallelComputation && serversTotal > 1)
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
            ModifierSystem.SecretBuffs(infinityData, prestigeData, secrets);

            if (GlobalStatPipeline.TryCalculateMoneyMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                    out StatResult moneyResult))
            {
                AppendStatBreakdown(builder, "Money Multiplier", moneyResult);
            }
            else
            {
                builder.AppendLine("Money Multiplier: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculateScienceMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                    out StatResult scienceResult))
            {
                AppendStatBreakdown(builder, "Science Multiplier", scienceResult);
            }
            else
            {
                builder.AppendLine("Science Multiplier: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculatePanelsPerSecond(infinityData, skillTreeData, prestigeData, prestigePlus, out StatResult panelsResult))
            {
                AppendStatBreakdown(builder, "Panels Per Second", panelsResult);
            }
            else
            {
                builder.AppendLine("Panels Per Second: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculatePanelLifetime(infinityData, skillTreeData, prestigeData, prestigePlus, out StatResult panelLifetimeResult))
            {
                AppendStatBreakdown(builder, "Panel Lifetime", panelLifetimeResult);
            }
            else
            {
                builder.AppendLine("Panel Lifetime: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculateTinkerStats(infinityData, skillTreeData, prestigeData, prestigePlus,
                    saveSettings.dysonVerseSaveData.manualCreationTime, out GlobalStatPipeline.TinkerResult tinker))
            {
                AppendStatBreakdown(builder, "Tinker Bot Yield", tinker.BotYield);
                AppendStatBreakdown(builder, "Tinker Assembly Yield", tinker.AssemblyYield);
                AppendStatBreakdown(builder, "Tinker Cooldown", tinker.Cooldown);
            }
            else
            {
                builder.AppendLine("Tinker: data-driven not ready.");
            }

            if (GlobalStatPipeline.TryCalculatePlanetGeneration(infinityData, skillTreeData, prestigeData, prestigePlus,
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

            if (GlobalStatPipeline.TryCalculateShouldersAccruals(infinityData, skillTreeData, prestigeData, prestigePlus,
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

            double[] dataCenters = (double[])infinityData.dataCenters.Clone();
            double dataCenterModifier = infinityData.dataCenterModifier;
            double[] servers = (double[])infinityData.servers.Clone();
            double serverModifier = infinityData.serverModifier;
            double rudimentarySingularity = infinityData.rudimentrySingularityProduction;
            double scienceBoostOwned = GetResearchLevelInternal(ResearchIdMap.ScienceBoost);

            double[] assemblyLines = (double[])infinityData.assemblyLines.Clone();
            double assemblyLineModifier = infinityData.assemblyLineModifier;
            double[] managers = (double[])infinityData.managers.Clone();
            double managerModifier = infinityData.managerModifier;

            double[] planets = (double[])infinityData.planets.Clone();
            double planetModifier = infinityData.planetModifier;
            double workers = infinityData.workers;
            double researchers = infinityData.researchers;
            double panelLifetime = infinityData.panelLifetime;
            double panelsPerSec = infinityData.panelsPerSec;
            double pocketAndroidsTimer = GetSkillTimerSeconds(infinityData, "pocketAndroids");
            double bots = infinityData.bots;

            bool rule34 = skillTreeData.rule34;
            bool stayingPower = skillTreeData.stayingPower;
            bool superchargedPower = skillTreeData.superchargedPower;
            bool parallelComputation = skillTreeData.parallelComputation;
            bool pocketDimensions = skillTreeData.pocketDimensions;
            bool pocketMultiverse = skillTreeData.pocketMultiverse;
            bool pocketProtectors = skillTreeData.pocketProtectors;
            bool dimensionalCatCables = skillTreeData.dimensionalCatCables;
            bool solarBubbles = skillTreeData.solarBubbles;
            bool pocketAndroids = skillTreeData.pocketAndroids;
            bool quantumComputing = skillTreeData.quantumComputing;
            bool rudimentarySingularitySkill = skillTreeData.rudimentarySingularity;
            bool unsuspiciousAlgorithms = skillTreeData.unsuspiciousAlgorithms;
            bool clusterNetworking = skillTreeData.clusterNetworking;
            bool scientificPlanets = skillTreeData.scientificPlanets;
            bool hubbleTelescope = skillTreeData.hubbleTelescope;
            bool jamesWebbTelescope = skillTreeData.jamesWebbTelescope;
            bool terraformingProtocols = skillTreeData.terraformingProtocols;
            bool planetAssembly = skillTreeData.planetAssembly;
            bool shellWorlds = skillTreeData.shellWorlds;
            bool stellarSacrifices = skillTreeData.stellarSacrifices;
            bool stellarObliteration = skillTreeData.stellarObliteration;
            bool supernova = skillTreeData.supernova;
            bool stellarImprovements = skillTreeData.stellarImprovements;
            bool stellarDominance = skillTreeData.stellarDominance;
            bool shouldersOfTheFallen = skillTreeData.shouldersOfTheFallen;
            bool shoulderSurgery = skillTreeData.shoulderSurgery;
            bool shouldersOfGiants = skillTreeData.shouldersOfGiants;
            bool shouldersOfTheEnlightened = skillTreeData.shouldersOfTheEnlightened;
            bool whatCouldHaveBeen = skillTreeData.whatCouldHaveBeen;
            long fragments = skillTreeData.fragments;
            Dictionary<string, bool> skillOwnedByIdSnapshot =
                infinityData.skillOwnedById != null ? new Dictionary<string, bool>(infinityData.skillOwnedById) : null;

            var results = new List<ParityResult>();

            try
            {
                infinityData.assemblyLines[0] = 1000;
                infinityData.assemblyLines[1] = 70;
                infinityData.assemblyLineModifier = 25;
                infinityData.panelLifetime = 20;
                skillTreeData.stayingPower = true;
                skillTreeData.rule34 = true;
                skillTreeData.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareAssemblyLineProduction(results);

                infinityData.managers[0] = 500;
                infinityData.managers[1] = 70;
                infinityData.managerModifier = 131;
                skillTreeData.stayingPower = false;
                skillTreeData.rule34 = true;
                skillTreeData.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareAiManagerProduction(results);

                infinityData.servers[0] = 1000;
                infinityData.servers[1] = 70;
                infinityData.serverModifier = 114.231998421252;
                skillTreeData.rule34 = true;
                skillTreeData.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareServerProduction(results);

                infinityData.dataCenters[0] = 1000;
                infinityData.dataCenters[1] = 250;
                infinityData.dataCenterModifier = 33.8;
                infinityData.servers[0] = 200;
                infinityData.servers[1] = 50;
                infinityData.rudimentrySingularityProduction = 42.5;
                skillTreeData.rule34 = true;
                skillTreeData.superchargedPower = true;
                skillTreeData.rudimentarySingularity = true;
                skillTreeData.parallelComputation = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareDataCenterProduction(results);

                infinityData.planets[0] = 75;
                infinityData.planets[1] = 5;
                infinityData.planetModifier = 32.6;
                infinityData.workers = 1_000_000;
                infinityData.researchers = 250_000;
                infinityData.panelLifetime = 15;
                SetSkillTimerSeconds(infinityData, "pocketAndroids", 1800);

                skillTreeData.pocketDimensions = true;
                skillTreeData.pocketMultiverse = true;
                skillTreeData.pocketProtectors = false;
                skillTreeData.dimensionalCatCables = true;
                skillTreeData.solarBubbles = true;
                skillTreeData.pocketAndroids = true;
                skillTreeData.quantumComputing = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetProduction(results);

                skillTreeData.pocketMultiverse = false;
                skillTreeData.pocketProtectors = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetProduction(results);

                infinityData.managers[0] = 100;
                infinityData.managers[1] = 25;
                infinityData.managerModifier = 50;
                skillTreeData.rudimentarySingularity = true;
                skillTreeData.unsuspiciousAlgorithms = true;
                skillTreeData.clusterNetworking = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareRudimentarySingularityProduction(results);

                infinityData.assemblyLines[0] = 80;
                infinityData.assemblyLines[1] = 20;
                infinityData.planets[0] = 8;
                infinityData.planets[1] = 2;
                infinityData.researchers = 1_000_000;
                infinityData.panelsPerSec = 2e15;
                infinityData.panelLifetime = 100;
                infinityData.bots = 1e16;
                SetResearchLevelInternal(ResearchIdMap.ScienceBoost, 1e6);
                skillTreeData.fragments = 5;

                skillTreeData.scientificPlanets = true;
                skillTreeData.hubbleTelescope = true;
                skillTreeData.jamesWebbTelescope = true;
                skillTreeData.terraformingProtocols = true;
                skillTreeData.planetAssembly = true;
                skillTreeData.shellWorlds = true;
                skillTreeData.stellarSacrifices = true;
                skillTreeData.stellarObliteration = false;
                skillTreeData.supernova = false;
                skillTreeData.stellarImprovements = false;
                skillTreeData.stellarDominance = false;
                skillTreeData.shouldersOfTheFallen = true;
                skillTreeData.shoulderSurgery = true;
                skillTreeData.shouldersOfGiants = true;
                skillTreeData.shouldersOfTheEnlightened = true;
                skillTreeData.whatCouldHaveBeen = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetGeneration(results);
                DebugCompareStellarSacrificeBotDrain(results);
                DebugCompareShouldersOfTheFallenBonuses(results);
                DebugCompareShouldersAccruals(results);
                DebugCompareMoneyMultiplier(results);
                DebugCompareScienceMultiplier(results);
                DebugComparePanelLifetime(results);
                DebugCompareFacilityModifiers(results);

                skillTreeData.stellarObliteration = true;
                skillTreeData.stellarImprovements = true;
                skillTreeData.stellarDominance = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetGeneration(results);
                DebugCompareStellarSacrificeBotDrain(results);

                skillTreeData.supernova = true;
                skillTreeData.stellarObliteration = false;
                skillTreeData.stellarImprovements = false;
                skillTreeData.stellarDominance = false;

                SyncSkillOwnershipFromSkillTreeData();
                DebugComparePlanetGeneration(results);
                DebugCompareStellarSacrificeBotDrain(results);
            }
            finally
            {
                infinityData.dataCenters[0] = dataCenters[0];
                infinityData.dataCenters[1] = dataCenters[1];
                infinityData.dataCenterModifier = dataCenterModifier;
                infinityData.servers[0] = servers[0];
                infinityData.servers[1] = servers[1];
                infinityData.serverModifier = serverModifier;
                infinityData.rudimentrySingularityProduction = rudimentarySingularity;
                SetResearchLevelInternal(ResearchIdMap.ScienceBoost, scienceBoostOwned);

                infinityData.assemblyLines[0] = assemblyLines[0];
                infinityData.assemblyLines[1] = assemblyLines[1];
                infinityData.assemblyLineModifier = assemblyLineModifier;
                infinityData.managers[0] = managers[0];
                infinityData.managers[1] = managers[1];
                infinityData.managerModifier = managerModifier;

                infinityData.planets[0] = planets[0];
                infinityData.planets[1] = planets[1];
                infinityData.planetModifier = planetModifier;
                infinityData.workers = workers;
                infinityData.researchers = researchers;
                infinityData.panelLifetime = panelLifetime;
                infinityData.panelsPerSec = panelsPerSec;
                SetSkillTimerSeconds(infinityData, "pocketAndroids", pocketAndroidsTimer);
                infinityData.bots = bots;

                skillTreeData.rule34 = rule34;
                skillTreeData.stayingPower = stayingPower;
                skillTreeData.superchargedPower = superchargedPower;
                skillTreeData.parallelComputation = parallelComputation;
                skillTreeData.pocketDimensions = pocketDimensions;
                skillTreeData.pocketMultiverse = pocketMultiverse;
                skillTreeData.pocketProtectors = pocketProtectors;
                skillTreeData.dimensionalCatCables = dimensionalCatCables;
                skillTreeData.solarBubbles = solarBubbles;
                skillTreeData.pocketAndroids = pocketAndroids;
                skillTreeData.quantumComputing = quantumComputing;
                skillTreeData.rudimentarySingularity = rudimentarySingularitySkill;
                skillTreeData.unsuspiciousAlgorithms = unsuspiciousAlgorithms;
                skillTreeData.clusterNetworking = clusterNetworking;
                skillTreeData.scientificPlanets = scientificPlanets;
                skillTreeData.hubbleTelescope = hubbleTelescope;
                skillTreeData.jamesWebbTelescope = jamesWebbTelescope;
                skillTreeData.terraformingProtocols = terraformingProtocols;
                skillTreeData.planetAssembly = planetAssembly;
                skillTreeData.shellWorlds = shellWorlds;
                skillTreeData.stellarSacrifices = stellarSacrifices;
                skillTreeData.stellarObliteration = stellarObliteration;
                skillTreeData.supernova = supernova;
                skillTreeData.stellarImprovements = stellarImprovements;
                skillTreeData.stellarDominance = stellarDominance;
                skillTreeData.shouldersOfTheFallen = shouldersOfTheFallen;
                skillTreeData.shoulderSurgery = shoulderSurgery;
                skillTreeData.shouldersOfGiants = shouldersOfGiants;
                skillTreeData.shouldersOfTheEnlightened = shouldersOfTheEnlightened;
                skillTreeData.whatCouldHaveBeen = whatCouldHaveBeen;
                skillTreeData.fragments = fragments;
                if (infinityData != null)
                {
                    infinityData.skillOwnedById ??= new Dictionary<string, bool>();
                    infinityData.skillOwnedById.Clear();
                    if (skillOwnedByIdSnapshot != null)
                    {
                        foreach (KeyValuePair<string, bool> entry in skillOwnedByIdSnapshot)
                        {
                            infinityData.skillOwnedById[entry.Key] = entry.Value;
                        }
                    }
                }

                LogParitySummary(results);
            }
        }

        [ContextMenu("Debug/Run Offline Progress Parity")]
        public void DebugRunOfflineProgressParity()
        {
            if (saveSettings == null || saveSettings.dysonVerseSaveData == null)
            {
                Debug.LogWarning("Save settings not ready.");
                return;
            }

            double awaySeconds = offlineParityAwaySeconds;
            if (awaySeconds <= 0)
            {
                Debug.LogWarning("Offline parity away seconds must be greater than 0.");
                return;
            }

            double offlineStepSeconds = Math.Max(0.1, offlineParityOfflineStepSeconds);
            double onlineStepSeconds = Math.Max(0.1, offlineParityOnlineStepSeconds);
            double recalcDeltaSeconds = Math.Max(0, offlineParityRecalcDeltaSeconds);
            double absTolerance = Math.Max(0, offlineParityAbsoluteTolerance);
            double relTolerance = Math.Max(0, offlineParityRelativeTolerance);

            double effectiveAwaySeconds = awaySeconds;
            DysonVerseSkillTreeData baseSkillTree = saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
            if (baseSkillTree != null && baseSkillTree.idleElectricSheep)
            {
                effectiveAwaySeconds *= 2;
            }

            SaveDataSettings originalSettings = saveSettings;
            SaveDataSettings offlineSettings = (SaveDataSettings)SerializationUtility.CreateCopy(saveSettings);
            SaveDataSettings onlineSettings = (SaveDataSettings)SerializationUtility.CreateCopy(saveSettings);

            OfflineParitySnapshot offlineSnapshot;
            OfflineParitySnapshot onlineSnapshot;

            try
            {
                saveSettings = offlineSettings;
                ApplyOfflineInfinityPointsBonus(offlineSettings, awaySeconds);
                offlineSnapshot = SimulateOfflineProgress(offlineSettings, effectiveAwaySeconds, offlineStepSeconds,
                    recalcDeltaSeconds);

                saveSettings = onlineSettings;
                if (offlineParityApplyInfinityPointsBonus)
                {
                    ApplyOfflineInfinityPointsBonus(onlineSettings, awaySeconds);
                }

                onlineSnapshot = SimulateOnlineProgress(onlineSettings, effectiveAwaySeconds, onlineStepSeconds);
            }
            finally
            {
                saveSettings = originalSettings;
            }

            LogOfflineParityResults(offlineSnapshot, onlineSnapshot, awaySeconds, effectiveAwaySeconds,
                offlineStepSeconds, onlineStepSeconds, absTolerance, relTolerance);
        }

        private static OfflineParitySnapshot SimulateOfflineProgress(SaveDataSettings settings,
            double awaySeconds, double stepSeconds, double recalcDeltaSeconds)
        {
            DysonVerseInfinityData infinityData = settings.dysonVerseSaveData.dysonVerseInfinityData;
            DysonVersePrestigeData prestigeData = settings.dysonVerseSaveData.dysonVersePrestigeData;
            DysonVerseSkillTreeData skillTreeData = settings.dysonVerseSaveData.dysonVerseSkillTreeData;
            PrestigePlus prestigePlus = settings.prestigePlus;

            if (infinityData == null || prestigeData == null || skillTreeData == null)
            {
                return default;
            }

            ProductionSystem.SetBotDistribution(infinityData, prestigeData, prestigePlus);
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            if (awaySeconds <= 0 || stepSeconds <= 0)
            {
                return CaptureOfflineParitySnapshot(infinityData);
            }

            double remainder = awaySeconds % stepSeconds;
            long steps = (long)((awaySeconds - remainder) / stepSeconds);
            for (long i = 0; i < steps; i++)
            {
                ApplyOfflineStep(infinityData, prestigeData, skillTreeData, prestigePlus, stepSeconds, recalcDeltaSeconds);
            }

            if (remainder > 0)
            {
                ApplyOfflineStep(infinityData, prestigeData, skillTreeData, prestigePlus, remainder, recalcDeltaSeconds);
            }

            return CaptureOfflineParitySnapshot(infinityData);
        }

        private static OfflineParitySnapshot SimulateOnlineProgress(SaveDataSettings settings,
            double awaySeconds, double stepSeconds)
        {
            DysonVerseInfinityData infinityData = settings.dysonVerseSaveData.dysonVerseInfinityData;
            DysonVersePrestigeData prestigeData = settings.dysonVerseSaveData.dysonVersePrestigeData;
            DysonVerseSkillTreeData skillTreeData = settings.dysonVerseSaveData.dysonVerseSkillTreeData;
            PrestigePlus prestigePlus = settings.prestigePlus;

            if (infinityData == null || prestigeData == null || skillTreeData == null)
            {
                return default;
            }

            var secrets = new SecretBuffState();
            const double maxInfinityBuff = 1e44;
            ModifierSystem.CalculateModifiers(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff);

            if (awaySeconds <= 0 || stepSeconds <= 0)
            {
                return CaptureOfflineParitySnapshot(infinityData);
            }

            double remaining = awaySeconds;
            double modifierTimer = 0;
            while (remaining > 0)
            {
                double delta = Math.Min(stepSeconds, remaining);
                ProductionSystem.SetBotDistribution(infinityData, prestigeData, prestigePlus);
                ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, delta);

                modifierTimer += delta;
                while (modifierTimer >= 1)
                {
                    ModifierSystem.CalculateModifiers(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff);
                    modifierTimer -= 1;
                }

                remaining -= delta;
            }

            return CaptureOfflineParitySnapshot(infinityData);
        }

        private static void ApplyOfflineStep(DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData,
            DysonVerseSkillTreeData skillTreeData, PrestigePlus prestigePlus, double stepSeconds, double recalcDeltaSeconds)
        {
            if (skillTreeData.androids) AddSkillTimerSeconds(infinityData, "androids", stepSeconds);
            if (skillTreeData.pocketAndroids) AddSkillTimerSeconds(infinityData, "pocketAndroids", stepSeconds);

            double planets = infinityData.totalPlanetProduction * stepSeconds;
            infinityData.planets[0] += planets;
            ProductionSystem.CalculateShouldersSkills(infinityData, skillTreeData, prestigeData, stepSeconds);
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            double dataCenters = infinityData.dataCenterProduction * stepSeconds;
            infinityData.dataCenters[0] += dataCenters;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            double servers = infinityData.serverProduction * stepSeconds;
            infinityData.servers[0] += servers;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            double managers = infinityData.managerProduction * stepSeconds;
            infinityData.managers[0] += managers;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            double lines = infinityData.assemblyLineProduction * stepSeconds;
            infinityData.assemblyLines[0] += lines;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            double bots = infinityData.botProduction * stepSeconds;
            infinityData.bots += bots;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            ProductionSystem.SetBotDistribution(infinityData, prestigeData, prestigePlus);

            double money = ProductionSystem.MoneyToAdd(infinityData, skillTreeData) * stepSeconds;
            infinityData.money += money;

            double science = ProductionSystem.ScienceToAdd(infinityData, skillTreeData) * stepSeconds;
            infinityData.science += science;

            double decayed = infinityData.panelsPerSec * stepSeconds;
            infinityData.totalPanelsDecayed += decayed;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);
        }

        private static void ApplyOfflineInfinityPointsBonus(SaveDataSettings settings, double awaySeconds)
        {
            if (settings == null) return;

            DysonVersePrestigeData prestigeData = settings.dysonVerseSaveData?.dysonVersePrestigeData;
            if (prestigeData == null) return;

            if (settings.lastInfinityPointsGained < 1) return;
            if (settings.timeLastInfinity <= 0) return;

            prestigeData.infinityPoints += (long)Math.Floor(awaySeconds * settings.lastInfinityPointsGained /
                                                    settings.timeLastInfinity / 10);
        }

        private static OfflineParitySnapshot CaptureOfflineParitySnapshot(DysonVerseInfinityData infinityData)
        {
            return new OfflineParitySnapshot
            {
                Money = infinityData.money,
                Science = infinityData.science,
                Bots = infinityData.bots,
                TotalPanelsDecayed = infinityData.totalPanelsDecayed,
                PlanetsAuto = infinityData.planets[0],
                PlanetsManual = infinityData.planets[1],
                DataCentersAuto = infinityData.dataCenters[0],
                DataCentersManual = infinityData.dataCenters[1],
                ServersAuto = infinityData.servers[0],
                ServersManual = infinityData.servers[1],
                ManagersAuto = infinityData.managers[0],
                ManagersManual = infinityData.managers[1],
                AssemblyLinesAuto = infinityData.assemblyLines[0],
                AssemblyLinesManual = infinityData.assemblyLines[1],
                AndroidsSkillTimer = GetSkillTimerSeconds(infinityData, "androids"),
                PocketAndroidsTimer = GetSkillTimerSeconds(infinityData, "pocketAndroids"),
                ScienceBoostOwned = infinityData.scienceBoostOwned,
                MoneyMultiUpgradeOwned = infinityData.moneyMultiUpgradeOwned
            };
        }

        private void LogOfflineParityResults(OfflineParitySnapshot offlineSnapshot, OfflineParitySnapshot onlineSnapshot,
            double awaySeconds, double effectiveAwaySeconds, double offlineStepSeconds, double onlineStepSeconds,
            double absTolerance, double relTolerance)
        {
            var builder = new StringBuilder();
            builder.AppendLine("Offline progress parity");
            builder.AppendLine(
                $"Away: {awaySeconds.ToString(CultureInfo.InvariantCulture)}s (effective {effectiveAwaySeconds.ToString(CultureInfo.InvariantCulture)}s)");
            builder.AppendLine(
                $"Steps: offline {offlineStepSeconds.ToString(CultureInfo.InvariantCulture)}s, online {onlineStepSeconds.ToString(CultureInfo.InvariantCulture)}s");
            builder.AppendLine(
                $"Tolerance: abs {absTolerance.ToString(CultureInfo.InvariantCulture)}, rel {relTolerance.ToString(CultureInfo.InvariantCulture)}");
            builder.AppendLine($"Online applies IP bonus: {offlineParityApplyInfinityPointsBonus}");

            AppendOfflineParityLine(builder, "Bots", offlineSnapshot.Bots, onlineSnapshot.Bots, absTolerance,
                relTolerance);
            AppendOfflineParityLine(builder, "Money", offlineSnapshot.Money, onlineSnapshot.Money, absTolerance,
                relTolerance);
            AppendOfflineParityLine(builder, "Science", offlineSnapshot.Science, onlineSnapshot.Science, absTolerance,
                relTolerance);
            AppendOfflineParityLine(builder, "Panels Decayed", offlineSnapshot.TotalPanelsDecayed,
                onlineSnapshot.TotalPanelsDecayed, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Planets Auto", offlineSnapshot.PlanetsAuto, onlineSnapshot.PlanetsAuto,
                absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Planets Manual", offlineSnapshot.PlanetsManual,
                onlineSnapshot.PlanetsManual, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Data Centers Auto", offlineSnapshot.DataCentersAuto,
                onlineSnapshot.DataCentersAuto, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Data Centers Manual", offlineSnapshot.DataCentersManual,
                onlineSnapshot.DataCentersManual, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Servers Auto", offlineSnapshot.ServersAuto, onlineSnapshot.ServersAuto,
                absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Servers Manual", offlineSnapshot.ServersManual,
                onlineSnapshot.ServersManual, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Managers Auto", offlineSnapshot.ManagersAuto, onlineSnapshot.ManagersAuto,
                absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Managers Manual", offlineSnapshot.ManagersManual,
                onlineSnapshot.ManagersManual, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Assembly Lines Auto", offlineSnapshot.AssemblyLinesAuto,
                onlineSnapshot.AssemblyLinesAuto, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Assembly Lines Manual", offlineSnapshot.AssemblyLinesManual,
                onlineSnapshot.AssemblyLinesManual, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Androids Timer", offlineSnapshot.AndroidsSkillTimer,
                onlineSnapshot.AndroidsSkillTimer, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Pocket Androids Timer", offlineSnapshot.PocketAndroidsTimer,
                onlineSnapshot.PocketAndroidsTimer, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Science Boost", offlineSnapshot.ScienceBoostOwned,
                onlineSnapshot.ScienceBoostOwned, absTolerance, relTolerance);
            AppendOfflineParityLine(builder, "Money Upgrade", offlineSnapshot.MoneyMultiUpgradeOwned,
                onlineSnapshot.MoneyMultiUpgradeOwned, absTolerance, relTolerance);

            Debug.Log(builder.ToString());
        }

        private static void AppendOfflineParityLine(StringBuilder builder, string label, double offlineValue,
            double onlineValue, double absTolerance, double relTolerance)
        {
            double delta = offlineValue - onlineValue;
            double absDelta = Math.Abs(delta);
            double relDelta = absDelta / Math.Max(1, Math.Abs(onlineValue));
            bool withinTolerance = absDelta <= absTolerance || relDelta <= relTolerance;
            string status = withinTolerance ? "OK" : "WARN";

            builder.AppendLine(
                $"{label}: offline={FormatOfflineParityValue(offlineValue)} online={FormatOfflineParityValue(onlineValue)} delta={FormatOfflineParityValue(delta)} rel={relDelta.ToString("P4", CultureInfo.InvariantCulture)} {status}");
        }

        private static string FormatOfflineParityValue(double value)
        {
            return value.ToString("G6", CultureInfo.InvariantCulture);
        }

        private struct OfflineParitySnapshot
        {
            public double Money;
            public double Science;
            public double Bots;
            public double TotalPanelsDecayed;
            public double PlanetsAuto;
            public double PlanetsManual;
            public double DataCentersAuto;
            public double DataCentersManual;
            public double ServersAuto;
            public double ServersManual;
            public double ManagersAuto;
            public double ManagersManual;
            public double AssemblyLinesAuto;
            public double AssemblyLinesManual;
            public double AndroidsSkillTimer;
            public double PocketAndroidsTimer;
            public double ScienceBoostOwned;
            public double MoneyMultiUpgradeOwned;
        }

        private void SyncSkillOwnershipFromSkillTreeData()
        {
            if (infinityData == null || skillTreeData == null) return;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            infinityData.skillOwnedById ??= new Dictionary<string, bool>();
            infinityData.skillOwnedById.Clear();

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
            {
                foreach (SkillDefinition skill in registry.skillDatabase.skills)
                {
                    if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                    bool owned = SkillFlagAccessor.TryGetFlag(skillTreeData, skill.id, out bool flag) && flag;
                    EnsureSkillStateEntry(skill.id, owned);
                }

                SyncSkillOwnedByIdFromState();
                return;
            }

            Debug.LogWarning("Skill sync skipped: SkillDatabase not available.");
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

            FacilityRuntime runtime = FacilityLegacyBridge.BuildAiManagerRuntime(definition, infinityData, skillTreeData);
            if (runtime == null)
            {
                Debug.LogWarning("AI Manager runtime could not be built.");
                return;
            }

            double legacyCached = infinityData.rudimentrySingularityProduction;
            double assemblyLineProduction = runtime.State.ProductionRate;
            double baseValue = 0;
            if (skillTreeData.rudimentarySingularity && assemblyLineProduction > 1)
            {
                baseValue = Math.Pow(Math.Log(assemblyLineProduction, 2),
                    1 + Math.Log10(assemblyLineProduction) / 10);
            }

            double serversTotal = infinityData.servers[0] + infinityData.servers[1];
            var effects = new List<StatEffect>();
            if (skillTreeData.unsuspiciousAlgorithms && baseValue > 0)
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

            if (skillTreeData.clusterNetworking && serversTotal > 1)
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
            if (skillTreeData.unsuspiciousAlgorithms && legacyComputed > 0)
                legacyComputed *= 10;
            if (skillTreeData.clusterNetworking && serversTotal > 1)
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
            double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
            double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
            double stellarGalaxies = ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
            double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);

            double legacyComputed = skillTreeData.stellarSacrifices && infinityData.bots >= botsRequired && stellarGalaxies > 0
                ? botsRequired
                : 0;

            var effects = new List<StatEffect>();
            if (skillTreeData.stellarSacrifices && infinityData.bots >= botsRequired && stellarGalaxies > 0)
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
                $"Inputs: bots={infinityData.bots}, starsSurrounded={starsSurrounded}, galaxiesEngulfed={galaxiesEngulfed}, " +
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
            double scientificBase = FacilityLegacyBridge.ComputeScientificPlanetsProduction(infinityData, skillTreeData);
            double shouldersBonus = skillTreeData.shouldersOfTheFallen && infinityData.scienceBoostOwned > 0
                ? Math.Log(infinityData.scienceBoostOwned, 2)
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

            double pocketBase = FacilityLegacyBridge.ComputePocketDimensionsProduction(infinityData, skillTreeData);
            double shoulderSurgeryBonus = skillTreeData.shouldersOfTheFallen && skillTreeData.shoulderSurgery && infinityData.scienceBoostOwned > 0
                ? Math.Log(infinityData.scienceBoostOwned, 2)
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
            builder.AppendLine($"Inputs: researchers={infinityData.researchers}, scienceBoostOwned={infinityData.scienceBoostOwned}");
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
                $"Inputs: workers={infinityData.workers}, researchers={infinityData.researchers}, panelLifetime={infinityData.panelLifetime}, " +
                $"pocketAndroidsTimer={GetSkillTimerSeconds(infinityData, "pocketAndroids")}, scienceBoostOwned={infinityData.scienceBoostOwned}");
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
            double scientificPlanetsProduction = FacilityLegacyBridge.ComputeScientificPlanetsProduction(infinityData, skillTreeData);
            if (skillTreeData.shouldersOfTheFallen && infinityData.scienceBoostOwned > 0)
                scientificPlanetsProduction += Math.Log(infinityData.scienceBoostOwned, 2);

            double pocketDimensionsProduction = FacilityLegacyBridge.ComputePocketDimensionsProduction(infinityData, skillTreeData);
            if (skillTreeData.shouldersOfTheFallen && skillTreeData.shoulderSurgery && infinityData.scienceBoostOwned > 0)
                pocketDimensionsProduction += Math.Log(infinityData.scienceBoostOwned, 2);

            double legacyScienceBoostRate = skillTreeData.shouldersOfGiants && skillTreeData.scientificPlanets
                ? scientificPlanetsProduction + (skillTreeData.whatCouldHaveBeen ? pocketDimensionsProduction : 0)
                : 0;
            double legacyMoneyUpgradeRate = skillTreeData.shouldersOfTheEnlightened && skillTreeData.scientificPlanets
                ? scientificPlanetsProduction
                : 0;

            var scienceBoostEffects = new List<StatEffect>();
            if (skillTreeData.shouldersOfGiants && skillTreeData.scientificPlanets)
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
                if (skillTreeData.whatCouldHaveBeen)
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
            if (skillTreeData.shouldersOfTheEnlightened && skillTreeData.scientificPlanets)
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
                $"scienceBoostOwned={infinityData.scienceBoostOwned}");
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
            var secrets = ModifierSystem.BuildSecretBuffState(prestigeData);
            double legacy = skillTreeData.shouldersOfPrecursors
                ? ModifierSystem.ScienceMultipliers(infinityData, skillTreeData, prestigeData, prestigePlus, secrets)
                : ModifierSystem.MoneyMultipliers(infinityData, skillTreeData, prestigeData, prestigePlus, secrets);

            if (GlobalStatPipeline.TryCalculateMoneyMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
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
            var secrets = ModifierSystem.BuildSecretBuffState(prestigeData);
            double legacy = ModifierSystem.ScienceMultipliers(infinityData, skillTreeData, prestigeData, prestigePlus, secrets);

            if (GlobalStatPipeline.TryCalculateScienceMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
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
            double legacyLifetime = ModifierSystem.CalculatePanelLifetimeLegacy(infinityData, skillTreeData, prestigeData, prestigePlus);
            if (GlobalStatPipeline.TryCalculatePanelLifetime(infinityData, skillTreeData, prestigeData, prestigePlus, out StatResult result))
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
            double legacyCached = infinityData.totalPlanetProduction;
            double scientificPlanetsProduction = FacilityLegacyBridge.ComputeScientificPlanetsProduction(infinityData, skillTreeData);
            double planetAssemblyProduction = FacilityLegacyBridge.ComputePlanetAssemblyProduction(infinityData, skillTreeData);
            double shellWorldsProduction = FacilityLegacyBridge.ComputeShellWorldsProduction(infinityData, skillTreeData);
            double stellarSacrificesProduction = FacilityLegacyBridge.ComputeStellarSacrificesProduction(infinityData, skillTreeData);

            double legacyComputed = 0;
            if (skillTreeData.scientificPlanets) legacyComputed += scientificPlanetsProduction;
            if (skillTreeData.planetAssembly) legacyComputed += planetAssemblyProduction;
            if (skillTreeData.shellWorlds) legacyComputed += shellWorldsProduction;
            if (skillTreeData.stellarSacrifices) legacyComputed += stellarSacrificesProduction;

            StatResult pipelineResult = FacilityLegacyBridge.CalculatePlanetGeneration(infinityData, skillTreeData);
            double updated = pipelineResult.Value;
            double delta = updated - legacyComputed;
            results?.Add(new ParityResult("Planet Generation", delta));

            double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
            double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
            double stellarGalaxies = ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
            double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);

            var builder = new StringBuilder();
            builder.AppendLine($"Planet Generation (legacy cached): {legacyCached}");
            builder.AppendLine($"Planet Generation (legacy formula): {legacyComputed}");
            builder.AppendLine($"Planet Generation (pipeline): {updated}");
            builder.AppendLine($"Delta: {delta}");
            builder.AppendLine(
                $"Inputs: researchers={infinityData.researchers}, assemblyLines={infinityData.assemblyLines[0] + infinityData.assemblyLines[1]}, " +
                $"planets={infinityData.planets[0] + infinityData.planets[1]}, bots={infinityData.bots}, " +
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

            FacilityRuntime runtime = FacilityLegacyBridge.BuildPlanetRuntime(definition, infinityData, prestigeData, skillTreeData);
            if (runtime == null)
            {
                Debug.LogWarning("Planet runtime could not be built.");
                return;
            }

            double legacyCached = infinityData.dataCenterProduction;
            double legacyComputed = (infinityData.planets[0] + infinityData.planets[1]) * 0.0002777777777777778f * infinityData.planetModifier;
            if (skillTreeData.rule34 && infinityData.planets[1] >= 69)
                legacyComputed *= 2;
            if (skillTreeData.superchargedPower)
                legacyComputed *= 1.5f;
            if (skillTreeData.pocketDimensions)
            {
                double pocketDimensionsProduction = FacilityLegacyBridge.ComputePocketDimensionsProduction(infinityData, skillTreeData);
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
                $"Inputs: count={infinityData.planets[0] + infinityData.planets[1]}, modifier={infinityData.planetModifier}, " +
                $"workers={infinityData.workers}, researchers={infinityData.researchers}, pocketAndroidsTimer={GetSkillTimerSeconds(infinityData, "pocketAndroids")}");
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
                    (infinityData.planets[0] + infinityData.planets[1]) * 0.0002777777777777778f * dataDrivenModifier;
                if (skillTreeData.rule34 && infinityData.planets[1] >= 69)
                    dataDrivenExpected *= 2;
                if (skillTreeData.superchargedPower)
                    dataDrivenExpected *= 1.5f;
                if (skillTreeData.pocketDimensions)
                {
                    double pocketDimensionsProduction =
                        FacilityLegacyBridge.ComputePocketDimensionsProduction(infinityData, skillTreeData);
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

            var secrets = ModifierSystem.BuildSecretBuffState(prestigeData);
            const double parityMaxInfinityBuff = 1e44;

            StatResult result;
            switch (facilityId)
            {
                case "assembly_lines":
                    if (!FacilityModifierPipeline.TryCalculateAssemblyLineModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "ai_managers":
                    if (!FacilityModifierPipeline.TryCalculateManagerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "servers":
                    if (!FacilityModifierPipeline.TryCalculateServerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "data_centers":
                    if (!FacilityModifierPipeline.TryCalculateDataCenterModifier(infinityData, skillTreeData, prestigeData, prestigePlus,
                            parityMaxInfinityBuff, out result))
                        return false;
                    break;
                case "planets":
                    if (!FacilityModifierPipeline.TryCalculatePlanetModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
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
            double assemblyLineUpgradePercent = infinityData.assemblyLineUpgradePercent;
            double aiManagerUpgradePercent = infinityData.aiManagerUpgradePercent;
            double serverUpgradePercent = infinityData.serverUpgradePercent;
            double dataCenterUpgradePercent = infinityData.dataCenterUpgradePercent;
            double planetUpgradePercent = infinityData.planetUpgradePercent;

            try
            {
                ModifierSystem.SecretBuffs(infinityData, prestigeData, secrets);

                const double parityMaxInfinityBuff = 1e44;

                if (FacilityModifierPipeline.TryCalculateAssemblyLineModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        parityMaxInfinityBuff, out StatResult assemblyResult))
                {
                    double legacy = ModifierSystem.CalculateAssemblyLineModifierLegacy(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("Assembly Lines Modifier", assemblyResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("Assembly Lines Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculateManagerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        parityMaxInfinityBuff, out StatResult managerResult))
                {
                    double legacy = ModifierSystem.CalculateManagerModifierLegacy(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("AI Managers Modifier", managerResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("AI Managers Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculateServerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        parityMaxInfinityBuff, out StatResult serverResult))
                {
                    double legacy = ModifierSystem.CalculateServerModifierLegacy(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("Servers Modifier", serverResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("Servers Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculateDataCenterModifier(infinityData, skillTreeData, prestigeData, prestigePlus,
                        parityMaxInfinityBuff, out StatResult dataCenterResult))
                {
                    double legacy = ModifierSystem.CalculateDataCenterModifierLegacy(infinityData, skillTreeData, prestigeData, prestigePlus,
                        parityMaxInfinityBuff);
                    results.Add(new ParityResult("Data Centers Modifier", dataCenterResult.Value - legacy));
                }
                else
                {
                    results.Add(new ParityResult("Data Centers Modifier", double.NaN));
                }

                if (FacilityModifierPipeline.TryCalculatePlanetModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        parityMaxInfinityBuff, out StatResult planetResult))
                {
                    double legacy = ModifierSystem.CalculatePlanetModifierLegacy(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
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
                infinityData.assemblyLineUpgradePercent = assemblyLineUpgradePercent;
                infinityData.aiManagerUpgradePercent = aiManagerUpgradePercent;
                infinityData.serverUpgradePercent = serverUpgradePercent;
                infinityData.dataCenterUpgradePercent = dataCenterUpgradePercent;
                infinityData.planetUpgradePercent = planetUpgradePercent;
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
                string report =
                    $"Parity suite: all deltas within {ParityEpsilon}. Results={results.Count}, Skipped={skipped}";
                DebugReportRecorder.Record("Facility Parity Suite", report);
                Debug.Log(report);
            }
            else
            {
                string report =
                    $"Parity suite: {failed} mismatches (epsilon {ParityEpsilon}). Results={results.Count}, Skipped={skipped}\n{builder}";
                DebugReportRecorder.Record("Facility Parity Suite", report);
                Debug.Log(report);
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
            return FacilityRuntimeBuilder.TryBuildRuntime(definition.id, infinityData, prestigeData, skillTreeData, prestigePlus,
                out FacilityRuntime runtime)
                ? runtime
                : null;
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
            if (infinityData != null && infinityData.skillStateById != null &&
                infinityData.skillStateById.TryGetValue(skillId, out SkillState state))
            {
                return state != null && state.owned;
            }

            if (infinityData != null && infinityData.skillOwnedById != null &&
                infinityData.skillOwnedById.TryGetValue(skillId, out bool owned))
            {
                EnsureSkillStateEntry(skillId, owned);
                return owned;
            }

            if (SkillFlagAccessor.TryGetFlag(skillTreeData, skillId, out bool legacyOwned) && legacyOwned)
            {
                EnsureSkillStateEntry(skillId, legacyOwned);
                return true;
            }

            return false;
        }

        public void SetSkillOwned(string skillId, bool owned)
        {
            if (string.IsNullOrEmpty(skillId)) return;
            if (infinityData == null) return;

            SetSkillStateOwned(skillId, owned);
            SyncSkillOwnedByIdFromState();

            if (SkillIdMap.TryGetLegacyKey(skillId, out int key))
            {
                infinityData.SkillTreeSaveData ??= new Dictionary<int, bool>();
                infinityData.SkillTreeSaveData[key] = owned;
                if (SkillTree != null && SkillTree.TryGetValue(key, out SkillTreeItem item))
                {
                    item.Owned = owned;
                }
            }

            SkillFlagAccessor.TrySetFlag(skillTreeData, skillId, owned);
        }

        private void SetSkillStateOwned(string skillId, bool owned)
        {
            if (string.IsNullOrEmpty(skillId) || infinityData == null) return;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            if (!infinityData.skillStateById.TryGetValue(skillId, out SkillState state) || state == null)
            {
                state = new SkillState();
                infinityData.skillStateById[skillId] = state;
            }

            state.owned = owned;
            state.level = owned ? Math.Max(state.level, 1) : 0;
        }

        private void EnsureSkillStateEntry(string skillId, bool owned)
        {
            if (string.IsNullOrEmpty(skillId) || infinityData == null) return;
            SkillState state = GetOrCreateSkillState(skillId);
            if (state == null) return;

            state.owned = owned;
            if (owned && state.level < 1) state.level = 1;
        }

        private void SyncSkillOwnedByIdFromState()
        {
            if (infinityData == null) return;
            infinityData.skillOwnedById ??= new Dictionary<string, bool>();
            infinityData.skillOwnedById.Clear();
            if (infinityData.skillStateById == null) return;

            foreach (KeyValuePair<string, SkillState> entry in infinityData.skillStateById)
            {
                if (entry.Value == null) continue;
                infinityData.skillOwnedById[entry.Key] = entry.Value.owned;
            }
        }

        private SkillState GetOrCreateSkillState(string skillId)
        {
            if (string.IsNullOrEmpty(skillId) || infinityData == null) return null;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            if (!infinityData.skillStateById.TryGetValue(skillId, out SkillState state) || state == null)
            {
                state = new SkillState();
                infinityData.skillStateById[skillId] = state;
            }

            return state;
        }

        private static SkillState GetOrCreateSkillStateEntry(DysonVerseInfinityData infinityData, string skillId)
        {
            if (infinityData == null || string.IsNullOrEmpty(skillId)) return null;
            infinityData.skillStateById ??= new Dictionary<string, SkillState>();
            if (!infinityData.skillStateById.TryGetValue(skillId, out SkillState state) || state == null)
            {
                state = new SkillState();
                infinityData.skillStateById[skillId] = state;
            }

            return state;
        }

        public static double GetSkillTimerSeconds(DysonVerseInfinityData infinityData, string skillId)
        {
            if (infinityData?.skillStateById == null || string.IsNullOrEmpty(skillId)) return 0;
            return infinityData.skillStateById.TryGetValue(skillId, out SkillState state) && state != null
                ? state.timerSeconds
                : 0;
        }

        public static void SetSkillTimerSeconds(DysonVerseInfinityData infinityData, string skillId, double timerSeconds)
        {
            SkillState state = GetOrCreateSkillStateEntry(infinityData, skillId);
            if (state == null) return;
            state.timerSeconds = timerSeconds;
        }

        public static void AddSkillTimerSeconds(DysonVerseInfinityData infinityData, string skillId, double deltaSeconds)
        {
            if (deltaSeconds == 0) return;
            SkillState state = GetOrCreateSkillStateEntry(infinityData, skillId);
            if (state == null) return;
            state.timerSeconds += deltaSeconds;
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
            if (infinityData == null || string.IsNullOrEmpty(researchId)) return 0;

            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            if (infinityData.researchLevelsById.TryGetValue(researchId, out double level))
            {
                return level;
            }

            if (ResearchIdMap.TryGetLegacyLevel(infinityData, researchId, out double legacyLevel))
            {
                infinityData.researchLevelsById[researchId] = legacyLevel;
                return legacyLevel;
            }

            return 0;
        }

        private void SetResearchLevelInternal(string researchId, double level)
        {
            if (infinityData == null || string.IsNullOrEmpty(researchId)) return;

            infinityData.researchLevelsById ??= new Dictionary<string, double>();
            if (ResearchIdMap.TrySetLegacyLevel(infinityData, researchId, level) &&
                ResearchIdMap.TryGetLegacyLevel(infinityData, researchId, out double normalized))
            {
                infinityData.researchLevelsById[researchId] = normalized;
                return;
            }

            infinityData.researchLevelsById[researchId] = level;
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
            if (infinityData != null)
            {
                infinityData.skillStateById?.Clear();
                infinityData.skillOwnedById?.Clear();
                infinityData.SkillTreeSaveData?.Clear();
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
                    SkillFlagAccessor.TrySetFlag(skillTreeData, skill.id, false);
                }

                return;
            }

            if (SkillTree == null) return;
            foreach (KeyValuePair<int, SkillTreeItem> entry in SkillTree)
            {
                if (!SkillIdMap.TryGetId(entry.Key, out string id)) continue;
                SkillFlagAccessor.TrySetFlag(skillTreeData, id, false);
            }
        }

        #region DysonVerseInfinity

        [ContextMenu("DysonInfinity")]
        public void DysonInfinity()
        {
            saveSettings.firstInfinityDone = true;
            int bankedSkills = 0;
            if (IsSkillOwned("banking")) bankedSkills++;
            if (IsSkillOwned("investmentPortfolio")) bankedSkills++;
            ResetSkillOwnership();

            saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();

            int ipToGain = saveSettings.prestigePlus.doubleIP ? 2 : 1;
            ipToGain *= saveSettings.doubleIp ? 2 : 1;

            oracle.saveSettings.lastInfinityPointsGained = ipToGain;
            prestigeData.infinityPoints += ipToGain;
            infinityData.bots = prestigeData.infinityAssemblyLines ? 10 : 1;
            infinityData.assemblyLines[1] = prestigeData.infinityAssemblyLines ? 10 : 0;
            infinityData.managers[1] = prestigeData.infinityAiManagers ? 10 : 0;
            infinityData.servers[1] = prestigeData.infinityServers ? 10 : 0;
            infinityData.dataCenters[1] = prestigeData.infinityDataCenter ? 10 : 0;
            infinityData.planets[1] = prestigeData.infinityPlanets ? 10 : 0;

            skillTreeData.skillPointsTree = prestigeData.permanentSkillPoint + bankedSkills + ArtifactSkillPoints();

            if (saveSettings.firstReality)
            {
                SidePanelManager.InfinityToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
                saveSettings.firstReality = false;
            }

            if (prestigeData.infinityPoints == 42)
                SidePanelManager.PrestigeToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
            skillTreeData.fragments = 0;
            _gameManager.AutoAssignSkillsInvoke();
            WipeSaveButtonUpdate();
            SetSkillTimerSeconds(infinityData, "superRadiantScattering", 0);
            Rotator.ResetPanelsStatic();
        }

        public void ManualDysonInfinity()
        {
            saveSettings.firstInfinityDone = true;
            int bankedSkills = 0;
            if (IsSkillOwned("banking")) bankedSkills++;
            if (IsSkillOwned("investmentPortfolio")) bankedSkills++;
            ResetSkillOwnership();

            double amount = prestigePlus.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, prestigePlus.divisionsPurchased) : 4.2e19;
            int ipToGain = StaticMethods.InfinityPointsToGain(amount, infinityData.bots);
            ipToGain *= saveSettings.doubleIp ? 2 : 1;
            oracle.saveSettings.lastInfinityPointsGained = saveSettings.prestigePlus.doubleIP ? ipToGain * 2 : ipToGain;
            prestigeData.infinityPoints += saveSettings.prestigePlus.doubleIP ? ipToGain * 2 : ipToGain;

            saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();
            infinityData.bots = prestigeData.infinityAssemblyLines ? 10 : 1;
            infinityData.assemblyLines[1] = prestigeData.infinityAssemblyLines ? 10 : 0;
            infinityData.managers[1] = prestigeData.infinityAiManagers ? 10 : 0;
            infinityData.servers[1] = prestigeData.infinityServers ? 10 : 0;
            infinityData.dataCenters[1] = prestigeData.infinityDataCenter ? 10 : 0;
            infinityData.planets[1] = prestigeData.infinityPlanets ? 10 : 0;

            skillTreeData.skillPointsTree = prestigeData.permanentSkillPoint + bankedSkills + ArtifactSkillPoints();

            skillTreeData.fragments = 0;
            _gameManager.AutoAssignSkillsInvoke();
            WipeSaveButtonUpdate();
            SetSkillTimerSeconds(infinityData, "superRadiantScattering", 0);
            saveSettings.infinityInProgress = false;
            Rotator.ResetPanelsStatic();
        }

        public void EnactPrestigePlus()
        {
            saveSettings.firstInfinityDone = true;
            switch (prestigePlus.quantumEntanglement)
            {
                case true:
                {
                    saveSettings.prestigePlus.points +=
                        (long)Math.Floor((prestigeData.infinityPoints - prestigeData.spentInfinityPoints) / (float)IPToQuantumConversion);
                    prestigeData.infinityPoints -= (long)Math.Floor((prestigeData.infinityPoints - prestigeData.spentInfinityPoints) / (float)IPToQuantumConversion) * IPToQuantumConversion;
                }
                    break;
                case false:
                {
                    ResetSkillOwnership();
                    StartCoroutine(PrestigeDoubleWiper());
                    SetSkillTimerSeconds(infinityData, "superRadiantScattering", 0);
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
            prestigeData.secretsOfTheUniverse =
                saveSettings.prestigePlus.secrets > 1 ? saveSettings.prestigePlus.secrets : 0;
            prestigeData.infinityAutoBots = saveSettings.prestigePlus.automation;
            prestigeData.infinityAutoResearch = saveSettings.prestigePlus.automation;
            saveSettings.lastInfinityPointsGained = 0;
            saveSettings.timeLastInfinity = 0;
            SetSkillTimerSeconds(infinityData, "androids", 0);
            SetSkillTimerSeconds(infinityData, "pocketAndroids", 0);
            skillTreeData.fragments = 0;
            skillTreeData.skillPointsTree = 0 + ArtifactSkillPoints();
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
            public AvocadoData avocadoData = new AvocadoData();
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
                    data.botDistPreset1 = prestigeData.botDistribution;
                    break;
                case 2:
                    data.skillAutoAssignmentIds2 = ids;
                    data.skillAutoAssignmentList2 = legacyList;
                    data.botDistPreset2 = prestigeData.botDistribution;
                    break;
                case 3:
                    data.skillAutoAssignmentIds3 = ids;
                    data.skillAutoAssignmentList3 = legacyList;
                    data.botDistPreset3 = prestigeData.botDistribution;
                    break;
                case 4:
                    data.skillAutoAssignmentIds4 = ids;
                    data.skillAutoAssignmentList4 = legacyList;
                    data.botDistPreset4 = prestigeData.botDistribution;
                    break;
                case 5:
                    data.skillAutoAssignmentIds5 = ids;
                    data.skillAutoAssignmentList5 = legacyList;
                    data.botDistPreset5 = prestigeData.botDistribution;
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
                    prestigeData.botDistribution = data.botDistPreset1;
                    slider.SetSlider();
                    break;
                case 2:
                    if (data.skillAutoAssignmentIds2.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds2);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList2));
                    prestigeData.botDistribution = data.botDistPreset2;
                    slider.SetSlider();
                    break;
                case 3:
                    if (data.skillAutoAssignmentIds3.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds3);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList3));
                    prestigeData.botDistribution = data.botDistPreset3;
                    slider.SetSlider();
                    break;
                case 4:
                    if (data.skillAutoAssignmentIds4.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds4);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList4));
                    prestigeData.botDistribution = data.botDistPreset4;
                    slider.SetSlider();
                    break;
                case 5:
                    if (data.skillAutoAssignmentIds5.Count > 0)
                        ids.AddRange(data.skillAutoAssignmentIds5);
                    else
                        ids.AddRange(SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList5));
                    prestigeData.botDistribution = data.botDistPreset5;
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
            public Dictionary<string, SkillState> skillStateById = new Dictionary<string, SkillState>();
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

        /// <summary>
        /// Cross-system aggregator that consumes resources from Infinity, Reality, and Dream1
        /// to produce a global multiplier applied to all facilities.
        /// Extracted from PrestigePlus in save version 5.
        /// </summary>
        [Serializable]
        public class AvocadoData
        {
            /// <summary>Whether the Avocado system has been unlocked (costs 42 Quantum Points).</summary>
            public bool unlocked;

            /// <summary>Accumulated Infinity Points fed to Avocado.</summary>
            public double infinityPoints;

            /// <summary>Accumulated Influence currency fed to Avocado.</summary>
            public double influence;

            /// <summary>Accumulated Strange Matter fed to Avocado.</summary>
            public double strangeMatter;

            /// <summary>Overflow multiplier bonus.</summary>
            public double overflowMultiplier;
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

