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
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;
using Systems;
using Systems.Debugging;
using Systems.Facilities;
using Systems.Migrations;
using Systems.Numeric;
using Systems.Skills;
using Systems.Stats;
using Systems.Save;
using Systems.Simulation;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Balance;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using GameData;
using static LoadScreenMethods;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;
#if UNITY_EDITOR
using UnityEditor;
#endif

/*
 * Oracle (Core Partial)
 * Purpose: Main game-state root that coordinates save state, Infinity/Quantum resets, debug tooling, and parity helpers.
 * Runs: Runtime (MonoBehaviour in Game scene), with editor-only utilities enabled via context menus.
 * Primary entry points in this file: Start(), Update(), Awake(), lifecycle callbacks (OnApplicationQuit/Pause/Focus),
 * DysonInfinity(), ManualDysonInfinity(), EnactPrestigePlus(), PrestigeDoubleWiper(), plus debug parity/log helpers.
 * Owns vs delegates: Owns orchestration and persisted state containers; delegates production/stat formulas to
 * ProductionSystem, FacilityRuntimeBuilder, and legacy bridge/stat calculators. Delegates lifecycle routing and
 * seam-backed time/save abstractions to Oracle.RuntimeSeams + Systems.Save helpers.
 *
 * Interacts with:
 * - Called by Assets/Scripts/Systems/GameManager.cs (Prestige flow), plus Unity context menus/inspector wiring.
 * - Assets/Scripts/Systems/ProductionSystem.cs (authoritative runtime production behavior)
 * - Assets/Scripts/Systems/Facilities/FacilityLegacyBridge.cs (legacy characterization runtime for parity checks)
 * - Assets/Scripts/Systems/Stats/*.cs pipelines (data-driven stat computation and contribution breakdowns)
 * - Assets/Scripts/Expansion/Oracle.RuntimeSeams.cs (IClock/ISaveStore/ILifecycleEvents wiring + lifecycle policy)
 *
 * Change notes:
 * - SaveDataSettings field names are persistence/export keys; renaming `offlineTimeUsedThisInfinity` or
 *   `offlineTimeUsedPreviousInfinity` requires compatibility/migration coordination.
 * - Infinity reset boundary ordering must keep offline usage rollover before Infinity data is reinitialized.
 * - Parity formulas in debug helpers must track runtime formula ordering exactly, or false-positive parity deltas appear.
 * - Debug contribution ids/order are used for diagnosis; keep labels stable when adjusting formulas.
 * - Startup frame cap fallback defaults to 60 FPS when saveSettings.frameRate is unset (0); keep this aligned
 *   with player-facing FPS controls and defaults if changed.
 * - Static accessor properties now return preload-safe defaults until saveSettings is available; systems that
 *   require persisted state should gate on IsRuntimeStateReady.
 * - Changes here do not migrate saves directly but can change interpretation of existing save-state numbers.
 * - Lifecycle callbacks are routed through RuntimeSeams; callback policy changes must stay aligned with
 *   OfflineLifecycleCoordinator tests.
 * - The finite bot cap is a durable exactly-once transition. Non-finite bots are corruption and never grant rewards.
 */

namespace Expansion
{
    /// <summary>
    /// Game-wide state/root "source of truth" MonoBehaviour.
    /// </summary>
    /// <remarks>
    /// Save system components have been extracted out of this file to reduce coupling and make failures easier to
    /// reason about.
    /// <para>Canonical save string codec: <see cref="Systems.Save.SaveCodec"/> (prefix <c>IDB1:</c>).</para>
    /// <para>Snapshot compaction (bits/filtering/facility normalization): <see cref="Systems.Save.SaveSnapshotBuilder"/>.</para>
    /// <para>On-disk canonical string: <see cref="Systems.Save.SaveSystem"/> + <see cref="Systems.Save.OdinStringFileStorage"/>.</para>
    /// <para>Legacy ES3 import/recovery: <see cref="Systems.Save.LegacyEs3Save"/>.</para>
    /// <para>Legacy-load candidate selection: <see cref="Systems.Save.SaveLoadCandidateSelector"/>.</para>
    /// <para>Disk persistence + legacy load selection: <c>Assets/Scripts/Expansion/Oracle.Persistence.cs</c>.</para>
    /// <para>Clipboard UI entrypoints: <c>Assets/Scripts/Expansion/Oracle.Clipboard.cs</c>.</para>
    /// <para>Migrations + ensure steps: <c>Assets/Scripts/Expansion/Oracle.Migrations.cs</c>.</para>
    /// <para>Change notes: <see cref="SaveDataSettings"/> includes tab preset override preferences (Bots/Research) that
    /// export/import with the save. Infinity reset boundaries in this class also roll
    /// <see cref="SaveDataSettings.offlineTimeUsedThisInfinity"/> into
    /// <see cref="SaveDataSettings.offlineTimeUsedPreviousInfinity"/>. Skill point reconciliation is a manual fix
    /// tool (see <c>Assets/Scripts/Expansion/Oracle.SkillPoints.cs</c>).</para>
    /// </remarks>
    public partial class Oracle : SerializedMonoBehaviour
    {
        public Button recoveryButton;
        public TMP_Text recoveryText;


        [SerializeField] private Button prestigeButton;
        [SerializeField] private SidePanelManager SidePanelManager;
        [SerializeField] public SkillTreeConfirmationManager _skillTreeConfirmationManager;
        [SerializeField] public LineManager linePrefab;
        [SerializeField] public Transform lineHolder;
        [SerializeField] private GameManager _gameManager;
        public double infinityExponent = 3.9d;

        [Header("Offline Progress Debug")]
        [SerializeField] private double offlineParityAwaySeconds = 3600;
        [SerializeField] private double offlineParityOfflineStepSeconds = 1;
        [SerializeField] private double offlineParityOnlineStepSeconds = 1;
        [SerializeField] private double offlineParityRecalcDeltaSeconds = 0;
        [SerializeField] private double offlineParityAbsoluteTolerance = 0.01;
        [SerializeField] private double offlineParityRelativeTolerance = 0.001;

        public static event Action UpdateSkills;
        public static event Action DebugOptionsChanged;

        public static void NotifyDebugOptionsChanged()
        {
            DebugOptionsChanged?.Invoke();
        }

        private DysonVerseInfinityData infinityData => saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
        private DysonVersePrestigeData prestigeData => saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
        private DysonVerseSkillTreeData skillTreeData => saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
        private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
        private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

        private readonly string fileName = "betaTestTwo";

        public Dictionary<int, SkillTreeItem> SkillTree = new Dictionary<int, SkillTreeItem>();
        public List<SkillTreeManager> allSkillTreeManagers = new List<SkillTreeManager>();
        public GameObject skillsHolder;

	        //public List<int> skillAutoAssignmentList = new();
	        public bool Loaded;
		        // IMPORTANT: When adding a migration step in BuildMigrationRegistry(),
		        // you MUST also update this constant to match the new LatestVersion.
		        // IMPORTANT: Save v7 introduces skill bitsets (see SkillIdMap/SkillBitsetUtility).
		        private const int CurrentSaveVersion = 12;

private void PackSettingsFlags()
        {
            if (saveSettings == null) return;
            saveSettings.packedSettingsFlags = BuildSettingsFlags(saveSettings);
            saveSettings.hasPackedSettingsFlags = true;
        }

        private void EnsurePackedSettingsFlags()
        {
            if (saveSettings == null) return;
            if (!saveSettings.hasPackedSettingsFlags) return;

            // Preserve deserialized defaults for fields added after the packed flags
            // were last written — their bits will be 0 in old saves even though the
            // field initializer defaulted them to true.
            bool savedScreensaverEnabled = saveSettings.screensaverEnabled;
            bool savedAutoMatrioshka = saveSettings.infinityAutoMatrioshkaBrains;
            bool savedAutoBirch = saveSettings.infinityAutoBirchPlanets;
            bool savedAutoGalactic = saveSettings.infinityAutoGalacticBrains;
            bool savedAutoResearchMatrioshka = saveSettings.infinityAutoResearchToggleMatrioshkaBrains;
            bool savedAutoResearchBirch = saveSettings.infinityAutoResearchToggleBirchPlanets;
            bool savedAutoResearchGalactic = saveSettings.infinityAutoResearchToggleGalacticBrains;
            bool savedAutoAssignNonRefundable = saveSettings.autoAssignNonRefundableSkills;

            ApplySettingsFlags(saveSettings, saveSettings.packedSettingsFlags);

            // Bit 42 (screensaverEnabled) was added after initial flag packing.
            // If the old packed value had bit 42 unset, restore the deserialized default
            // so existing players keep the screensaver enabled.
            if ((saveSettings.packedSettingsFlags & (1UL << 42)) == 0)
            {
                saveSettings.screensaverEnabled = savedScreensaverEnabled;
            }

            if ((saveSettings.packedSettingsFlags & (1UL << 43)) == 0)
            {
                saveSettings.infinityAutoMatrioshkaBrains = savedAutoMatrioshka;
            }

            if ((saveSettings.packedSettingsFlags & (1UL << 44)) == 0)
            {
                saveSettings.infinityAutoBirchPlanets = savedAutoBirch;
            }

            if ((saveSettings.packedSettingsFlags & (1UL << 45)) == 0)
            {
                saveSettings.infinityAutoGalacticBrains = savedAutoGalactic;
            }

            if ((saveSettings.packedSettingsFlags & (1UL << 46)) == 0)
            {
                saveSettings.infinityAutoResearchToggleMatrioshkaBrains = savedAutoResearchMatrioshka;
            }

            if ((saveSettings.packedSettingsFlags & (1UL << 47)) == 0)
            {
                saveSettings.infinityAutoResearchToggleBirchPlanets = savedAutoResearchBirch;
            }

            if ((saveSettings.packedSettingsFlags & (1UL << 48)) == 0)
            {
                saveSettings.infinityAutoResearchToggleGalacticBrains = savedAutoResearchGalactic;
            }

            if ((saveSettings.packedSettingsFlags & (1UL << 49)) == 0)
            {
                saveSettings.autoAssignNonRefundableSkills = savedAutoAssignNonRefundable;
            }
        }

        private static ulong BuildSettingsFlags(SaveDataSettings settings)
        {
            if (settings == null) return 0;
            ulong flags = 0;
            SetFlag(ref flags, 0, settings.roundedBulkBuy);
            SetFlag(ref flags, 1, settings.researchRoundedBulkBuy);
            SetFlag(ref flags, 2, settings.debugOptions);
            SetFlag(ref flags, 3, settings.doubleIp);
            SetFlag(ref flags, 4, settings.unlockAllTabs);
            SetFlag(ref flags, 5, settings.avotation);
            SetFlag(ref flags, 6, settings.infinityInProgress);
            SetFlag(ref flags, 7, settings.tutorial);
            SetFlag(ref flags, 8, settings.globalMute);
            SetFlag(ref flags, 9, settings.cheater);
            SetFlag(ref flags, 10, settings.hidePurchased);
            SetFlag(ref flags, 11, settings.buyMax);
            SetFlag(ref flags, 12, settings.skillsBuyOnTap);
            SetFlag(ref flags, 13, settings.botsButtonToggle);
            SetFlag(ref flags, 14, settings.researchbuttonToggle);
            SetFlag(ref flags, 15, settings.skillsButtonToggle);
            SetFlag(ref flags, 16, settings.skillsFirstRunDone);
            SetFlag(ref flags, 17, settings.infinityButtonToggle);
            SetFlag(ref flags, 18, settings.infinityFirstRunDone);
            SetFlag(ref flags, 19, settings.realityButtonToggle);
            SetFlag(ref flags, 20, settings.realityFirstRun);
            SetFlag(ref flags, 21, settings.simulationsButtonToggle);
            SetFlag(ref flags, 22, settings.prestigeButtonToggle);
            SetFlag(ref flags, 23, settings.prestigeFirstRun);
            SetFlag(ref flags, 24, settings.storyButtonToggle);
            SetFlag(ref flags, 25, settings.wikiButtonToggle);
            SetFlag(ref flags, 26, settings.statisticsButtonToggle);
            SetFlag(ref flags, 27, settings.settingsButtonToggle);
            SetFlag(ref flags, 28, settings.infinityAutoResearchToggleAi);
            SetFlag(ref flags, 29, settings.infinityAutoResearchToggleAssembly);
            SetFlag(ref flags, 30, settings.infinityAutoResearchToggleMoney);
            SetFlag(ref flags, 31, settings.infinityAutoResearchTogglePlanet);
            SetFlag(ref flags, 32, settings.infinityAutoResearchToggleServer);
            SetFlag(ref flags, 33, settings.infinityAutoResearchToggleDataCenter);
            SetFlag(ref flags, 34, settings.infinityAutoResearchToggleScience);
            SetFlag(ref flags, 35, settings.infinityAutoAssembly);
            SetFlag(ref flags, 36, settings.infinityAutoManagers);
            SetFlag(ref flags, 37, settings.infinityAutoServers);
            SetFlag(ref flags, 38, settings.infinityAutoDataCenters);
            SetFlag(ref flags, 39, settings.infinityAutoPlanets);
            SetFlag(ref flags, 40, settings.firstReality);
            SetFlag(ref flags, 41, settings.firstInfinityDone);
            SetFlag(ref flags, 42, settings.screensaverEnabled);
            SetFlag(ref flags, 43, settings.infinityAutoMatrioshkaBrains);
            SetFlag(ref flags, 44, settings.infinityAutoBirchPlanets);
            SetFlag(ref flags, 45, settings.infinityAutoGalacticBrains);
            SetFlag(ref flags, 46, settings.infinityAutoResearchToggleMatrioshkaBrains);
            SetFlag(ref flags, 47, settings.infinityAutoResearchToggleBirchPlanets);
            SetFlag(ref flags, 48, settings.infinityAutoResearchToggleGalacticBrains);
            SetFlag(ref flags, 49, settings.autoAssignNonRefundableSkills);
            return flags;
        }

        private static void ApplySettingsFlags(SaveDataSettings settings, ulong flags)
        {
            if (settings == null) return;
            settings.roundedBulkBuy = GetFlag(flags, 0);
            settings.researchRoundedBulkBuy = GetFlag(flags, 1);
            settings.debugOptions = GetFlag(flags, 2);
            settings.doubleIp = GetFlag(flags, 3);
            settings.unlockAllTabs = GetFlag(flags, 4);
            settings.avotation = GetFlag(flags, 5);
            settings.infinityInProgress = GetFlag(flags, 6);
            settings.tutorial = GetFlag(flags, 7);
            settings.globalMute = GetFlag(flags, 8);
            settings.cheater = GetFlag(flags, 9);
            settings.hidePurchased = GetFlag(flags, 10);
            settings.buyMax = GetFlag(flags, 11);
            settings.skillsBuyOnTap = GetFlag(flags, 12);
            settings.botsButtonToggle = GetFlag(flags, 13);
            settings.researchbuttonToggle = GetFlag(flags, 14);
            settings.skillsButtonToggle = GetFlag(flags, 15);
            settings.skillsFirstRunDone = GetFlag(flags, 16);
            settings.infinityButtonToggle = GetFlag(flags, 17);
            settings.infinityFirstRunDone = GetFlag(flags, 18);
            settings.realityButtonToggle = GetFlag(flags, 19);
            settings.realityFirstRun = GetFlag(flags, 20);
            settings.simulationsButtonToggle = GetFlag(flags, 21);
            settings.prestigeButtonToggle = GetFlag(flags, 22);
            settings.prestigeFirstRun = GetFlag(flags, 23);
            settings.storyButtonToggle = GetFlag(flags, 24);
            settings.wikiButtonToggle = GetFlag(flags, 25);
            settings.statisticsButtonToggle = GetFlag(flags, 26);
            settings.settingsButtonToggle = GetFlag(flags, 27);
            settings.infinityAutoResearchToggleAi = GetFlag(flags, 28);
            settings.infinityAutoResearchToggleAssembly = GetFlag(flags, 29);
            settings.infinityAutoResearchToggleMoney = GetFlag(flags, 30);
            settings.infinityAutoResearchTogglePlanet = GetFlag(flags, 31);
            settings.infinityAutoResearchToggleServer = GetFlag(flags, 32);
            settings.infinityAutoResearchToggleDataCenter = GetFlag(flags, 33);
            settings.infinityAutoResearchToggleScience = GetFlag(flags, 34);
            settings.infinityAutoAssembly = GetFlag(flags, 35);
            settings.infinityAutoManagers = GetFlag(flags, 36);
            settings.infinityAutoServers = GetFlag(flags, 37);
            settings.infinityAutoDataCenters = GetFlag(flags, 38);
            settings.infinityAutoPlanets = GetFlag(flags, 39);
            settings.firstReality = GetFlag(flags, 40);
            settings.firstInfinityDone = GetFlag(flags, 41);
            settings.screensaverEnabled = GetFlag(flags, 42);
            settings.infinityAutoMatrioshkaBrains = GetFlag(flags, 43);
            settings.infinityAutoBirchPlanets = GetFlag(flags, 44);
            settings.infinityAutoGalacticBrains = GetFlag(flags, 45);
            settings.infinityAutoResearchToggleMatrioshkaBrains = GetFlag(flags, 46);
            settings.infinityAutoResearchToggleBirchPlanets = GetFlag(flags, 47);
            settings.infinityAutoResearchToggleGalacticBrains = GetFlag(flags, 48);
            settings.autoAssignNonRefundableSkills = GetFlag(flags, 49);
        }

        private static void SetFlag(ref ulong flags, int bit, bool value)
        {
            if (value) flags |= 1UL << bit;
        }

        private static bool GetFlag(ulong flags, int bit)
        {
            return (flags & (1UL << bit)) != 0;
        }

        /// <summary>
        /// Initializes gameplay only after prepared startup recovery either succeeds or confirms a true first run.
        /// </summary>
        private void Start()
        {
            SkillTreeManager[] listOfSkillTreeManagersToAdd = skillsHolder.GetComponentsInChildren<SkillTreeManager>();
            foreach (SkillTreeManager item in listOfSkillTreeManagersToAdd) allSkillTreeManagers.Add(item);

            foreach (SkillTreeManager skill in allSkillTreeManagers) skill.MakeLines();
            BsNewsGet();
            Loaded = false;
            SetSaveReady(false);
            Load();
            if (_startupRecoveryBlocked)
            {
                ShowBlockingStartupRecovery();
                return;
            }

            Loaded = true;
            Application.targetFrameRate =
                saveSettings.frameRate > 0
                    ? saveSettings.frameRate
                    : 60;
            bool doubleIpUnlocked = saveSettings.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
            saveSettings.doubleIp = doubleIpUnlocked;
            if (saveSettings.doubleIp) PlayerPrefs.SetInt("doubleip", 1);

            // Debug entitlement is now stored separately from PlayerPrefs.
            // If a save loads with debug enabled, treat that as proof of entitlement and "ever enabled".
            if (saveSettings.debugOptions)
            {
                saveSettings.debugEverEnabled = true;
                if (!PlayerEntitlementsStore.DebugEntitlementPurchased)
                    PlayerEntitlementsStore.DebugEntitlementPurchased = true;
            }

            // Ensure any UI listening for debug state refreshes after load.
            NotifyDebugOptionsChanged();
            if (lsm != null) lsm.CloseLoadScreen();

	            string canonicalPath = SavePaths.GetCanonicalSavePath();
	            string legacyOdinPath = Path.Combine(Application.persistentDataPath, fileName + ".idsOdin");
	            bool fileExists = File.Exists(canonicalPath) || File.Exists(legacyOdinPath);

            recoveryText.text = fileExists ? "Attempt Recovery" : "No Save found";
            recoveryButton.interactable = fileExists;
            recoveryButton.onClick.AddListener(AttemptSaveRecovery);
        }


        private void Update()
        {
            prestigeButton.interactable = prestigeData.infinityPoints >= 42;
        }

        internal bool ProcessBotCapTransition()
        {
            return ProcessBotCapTransitionWithOutcome(
                out _);
        }

        internal bool ProcessBotCapTransitionWithOutcome(
            out bool specialRewardGranted)
        {
            specialRewardGranted = false;
            BotCapTransitionAction action = BotCapTransitionContract.Classify(
                infinityData.bots,
                saveSettings.botCapTransitionPending,
                saveSettings.botCapRewardsGranted);

            if (action == BotCapTransitionAction.RepairInvalidBots)
            {
                double invalidBots = infinityData.bots;
                infinityData.bots = 0d;
                saveSettings.botCapTransitionPending = false;
                saveSettings.botCapRewardsGranted = false;
                saveSettings.infinityInProgress = false;
                if (saveSettings.hasPackedSettingsFlags)
                    saveSettings.packedSettingsFlags &= ~(1UL << 6);
                NumericDiagnostics.Report(
                    "NS-BOT-NONFINITE",
                    $"kind={(double.IsNaN(invalidBots) ? "nan" : invalidBots > 0d ? "positive_infinity" : "negative_infinity")}");
                if (!TrySaveState(out string repairError))
                {
                    NumericDiagnostics.Report("NS-BOT-NONFINITE-COMMIT", "committed=false");
                    Debug.LogError(
                        $"[NumericSafety:NS-BOT-NONFINITE-COMMIT] Runtime bot repair did not persist: {repairError}");
                }
                return true;
            }

            if (action == BotCapTransitionAction.PersistPendingCheckpoint)
            {
                saveSettings.botCapTransitionPending = true;
                if (!TrySaveState(out string pendingError))
                {
                    Debug.LogError(
                        $"[NumericSafety:NS-BOT-PENDING-SAVE] Could not persist bot-cap transition: {pendingError}");
                    return true;
                }
            }

            action = BotCapTransitionContract.Classify(
                infinityData.bots,
                saveSettings.botCapTransitionPending,
                saveSettings.botCapRewardsGranted);
            if (action == BotCapTransitionAction.None)
            {
                return false;
            }

            if (action == BotCapTransitionAction.GrantRewardsAndPersistCheckpoint)
            {
                // A pending checkpoint has not committed rewards yet. A stale
                // in-progress bit must never prevent retrying this state.
                saveSettings.infinityInProgress = true;
                double previousOverflow = saveSettings.avocadoData.overflowMultiplier;
                double previousLegacyOverflow = prestigePlus.avocatoOverflow;
                long previousInfinityPoints = prestigeData.infinityPoints;

                NumericResult<double> overflowReward =
                    NumericSafety.AddUnit(previousOverflow);
                NumericResult<double> legacyOverflowReward =
                    NumericSafety.AddUnit(previousLegacyOverflow);
                saveSettings.avocadoData.overflowMultiplier =
                    overflowReward.Value;
                prestigePlus.avocatoOverflow =
                    legacyOverflowReward.Value;
                prestigeData.infinityPoints =
                    NumericSafety.Add(previousInfinityPoints, 1000L).Value;
                saveSettings.botCapTransitionPending = false;
                saveSettings.botCapRewardsGranted = true;

                if (!TrySaveState(out string rewardError))
                {
                    saveSettings.avocadoData.overflowMultiplier = previousOverflow;
                    prestigePlus.avocatoOverflow = previousLegacyOverflow;
                    prestigeData.infinityPoints = previousInfinityPoints;
                    saveSettings.botCapTransitionPending = true;
                    saveSettings.botCapRewardsGranted = false;
                    saveSettings.infinityInProgress = false;
                    Debug.LogError(
                        $"[NumericSafety:NS-BOT-REWARD-SAVE] Bot-cap rewards were not committed; transition paused: {rewardError}");
                    return true;
                }
                specialRewardGranted = true;
                if (overflowReward.IsSaturated ||
                    legacyOverflowReward.IsSaturated)
                {
                    NumericDiagnostics.Report(
                        "NS-BOT-OVERFLOW-REWARD-QUANTIZED",
                        "logical_units=1");
                }
            }
            else
            {
                // Rewards were already committed. This is the crash/reload recovery
                // checkpoint: resume the reset without granting them again.
                saveSettings.infinityInProgress = true;
            }

            _gameManager.Prestige();
            return true;
        }


        private void OnApplicationQuit()
        {
            EnsureRuntimeSeamsInitialized();
            _lifecycleEvents?.RaiseQuitRequested();
        }

        #if !UNITY_EDITOR
        #if UNITY_IOS || UNITY_ANDROID
        void OnApplicationPause(bool pauseStatus)
        {
            EnsureRuntimeSeamsInitialized();
            _lifecycleEvents?.RaisePauseChanged(pauseStatus);
        }
        #endif

        void OnApplicationFocus(bool focus)
        {
            EnsureRuntimeSeamsInitialized();
            _lifecycleEvents?.RaiseFocusChanged(focus);
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

        /// <summary>
        /// Whether Oracle singleton and loaded save containers are currently available.
        /// </summary>
        public static bool IsRuntimeStateReady =>
            oracle != null &&
            oracle.saveSettings != null &&
            oracle.saveSettings.dysonVerseSaveData != null;

        public static BuyMode StaticBuyMode => StaticSaveSettings != null ? StaticSaveSettings.buyMode : BuyMode.Buy1;
        public static BuyMode StaticResearchBuyMode => StaticSaveSettings != null ? StaticSaveSettings.researchBuyMode : BuyMode.Buy1;
        public static NumberTypes StaticNumberFormatting => StaticSaveSettings != null ? StaticSaveSettings.numberFormatting : NumberTypes.Standard;
        public static bool StaticRoundedBulkBuy => StaticSaveSettings != null && StaticSaveSettings.roundedBulkBuy;

        public static double Money
        {
            get => StaticInfinityData != null ? StaticInfinityData.money : 0d;
            set
            {
                if (StaticInfinityData != null)
                {
                    StaticInfinityData.money = value;
                }
            }
        }

        public static double Science
        {
            get => StaticInfinityData != null ? StaticInfinityData.science : 0d;
            set
            {
                if (StaticInfinityData != null)
                {
                    StaticInfinityData.science = value;
                }
            }
        }

        public static double Bots
        {
            get => StaticInfinityData != null ? StaticInfinityData.bots : 0d;
            set
            {
                if (StaticInfinityData != null)
                {
                    StaticInfinityData.bots = value;
                }
            }
        }

        public static SaveDataSettings StaticSaveSettings => oracle != null ? oracle.saveSettings : null;
        public static DysonVerseInfinityData StaticInfinityData => IsRuntimeStateReady ? oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData : null;
        public static DysonVersePrestigeData StaticPrestigeData => IsRuntimeStateReady ? oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData : null;
        public static DysonVerseSkillTreeData StaticSkillTreeData => IsRuntimeStateReady ? oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData : null;

        #endregion

        #region Oracle

        public SaveDataSettings saveSettings;

        private string _json;

	        #region SaveMethods

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
            if (skillTreeData.avocados && infinityData.assemblyLines[1] >= 69)
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
                if (skillTreeData.avocados && infinityData.assemblyLines[1] >= 69)
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
            if (skillTreeData.avocados && infinityData.managers[1] >= 69)
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
                if (skillTreeData.avocados && infinityData.managers[1] >= 69)
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
            if (skillTreeData.avocados && infinityData.servers[1] >= 69)
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
                if (skillTreeData.avocados && infinityData.servers[1] >= 69)
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
            if (skillTreeData.avocados && infinityData.dataCenters[1] >= 69)
                legacyComputed *= 2;
            if (skillTreeData.superchargedPower)
                legacyComputed *= 1.5f;
            legacyComputed += infinityData.rudimentrySingularityProduction;
            double serversTotal = infinityData.servers[0] + infinityData.servers[1];
            double parallelMultiplier = skillTreeData.parallelComputation && serversTotal > 1
                ? 1 + 0.1f * Math.Log(serversTotal, 2)
                : 1;
            legacyComputed *= parallelMultiplier;

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
                if (skillTreeData.avocados && infinityData.dataCenters[1] >= 69)
                    dataDrivenExpected *= 2;
                if (skillTreeData.superchargedPower)
                    dataDrivenExpected *= 1.5f;
                dataDrivenExpected += infinityData.rudimentrySingularityProduction;
                dataDrivenExpected *= parallelMultiplier;
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

            bool avocados = skillTreeData.avocados;
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
                skillTreeData.avocados = true;
                skillTreeData.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareAssemblyLineProduction(results);

                infinityData.managers[0] = 500;
                infinityData.managers[1] = 70;
                infinityData.managerModifier = 131;
                skillTreeData.stayingPower = false;
                skillTreeData.avocados = true;
                skillTreeData.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareAiManagerProduction(results);

                infinityData.servers[0] = 1000;
                infinityData.servers[1] = 70;
                infinityData.serverModifier = 114.231998421252;
                skillTreeData.avocados = true;
                skillTreeData.superchargedPower = true;

                SyncSkillOwnershipFromSkillTreeData();
                DebugCompareServerProduction(results);

                infinityData.dataCenters[0] = 1000;
                infinityData.dataCenters[1] = 250;
                infinityData.dataCenterModifier = 33.8;
                infinityData.servers[0] = 200;
                infinityData.servers[1] = 50;
                infinityData.rudimentrySingularityProduction = 42.5;
                skillTreeData.avocados = true;
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

                skillTreeData.avocados = avocados;
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
            SaveDataSettings offlineSettings = (SaveDataSettings)SirenixSerializationUtility.CreateCopy(saveSettings);
            SaveDataSettings onlineSettings = (SaveDataSettings)SirenixSerializationUtility.CreateCopy(saveSettings);

            OfflineParitySnapshot offlineSnapshot;
            OfflineParitySnapshot onlineSnapshot;

            try
            {
                saveSettings = offlineSettings;
                offlineSnapshot = SimulateOfflineProgress(offlineSettings, effectiveAwaySeconds, offlineStepSeconds,
                    recalcDeltaSeconds);

                saveSettings = onlineSettings;
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
            infinityData.bots = NumericSafety.Add(infinityData.bots, bots).Value;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);

            ProductionSystem.SetBotDistribution(infinityData, prestigeData, prestigePlus);

            double money = ProductionSystem.MoneyToAdd(infinityData, skillTreeData) * stepSeconds;
            infinityData.money = NumericSafety.Add(infinityData.money, money).Value;

            double science = ProductionSystem.ScienceToAdd(infinityData, skillTreeData) * stepSeconds;
            infinityData.science = NumericSafety.Add(infinityData.science, science).Value;

            double decayed = infinityData.panelsPerSec * stepSeconds;
            infinityData.totalPanelsDecayed =
                NumericSafety.Add(infinityData.totalPanelsDecayed, decayed).Value;
            ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, recalcDeltaSeconds);
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
            builder.AppendLine("Passive offline IP bonus: removed; resets are simulated");

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
            if (skillTreeData.avocados && infinityData.planets[1] >= 69)
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
                if (skillTreeData.avocados && infinityData.planets[1] >= 69)
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

        #endregion

        public void InvokeUpdateSkills()
        {
            UpdateSkills?.Invoke();
        }

        public bool IsSkillOwned(string skillId)
        {
            if (string.IsNullOrEmpty(skillId)) return false;
            if (TryGetOwnedFromBitset(skillId, out bool ownedFromBits)) return ownedFromBits;
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

        private bool TryGetOwnedFromBitset(string skillId, out bool owned)
        {
            owned = false;
            if (string.IsNullOrEmpty(skillId)) return false;
            if (infinityData == null || infinityData.skillOwnedBits == null || infinityData.skillOwnedBits.Length == 0)
                return false;
            if (!SkillBitsetUtility.TryGetIndex(skillId, out int index)) return false;
            owned = SkillBitsetUtility.GetBit(infinityData.skillOwnedBits, index);
            return true;
        }

        private bool TryGetOwnedFromBitset(string skillId)
        {
            return TryGetOwnedFromBitset(skillId, out bool owned) && owned;
        }

        public void SetSkillOwned(string skillId, bool owned)
        {
            SetSkillOwned(
                skillId,
                owned,
                updatePresentation: true);
        }

        internal void SetSkillOwned(
            string skillId,
            bool owned,
            bool updatePresentation)
        {
            if (string.IsNullOrEmpty(skillId)) return;
            if (infinityData == null) return;

            SetSkillStateOwned(skillId, owned);
            infinityData.skillOwnedById ??=
                new Dictionary<string, bool>();
            infinityData.skillOwnedById[skillId] = owned;

            if (SkillIdMap.TryGetLegacyKey(skillId, out int key))
            {
                infinityData.SkillTreeSaveData ??= new Dictionary<int, bool>();
                infinityData.SkillTreeSaveData[key] = owned;
                if (updatePresentation &&
                    SkillTree != null &&
                    SkillTree.TryGetValue(
                        key,
                        out SkillTreeItem item))
                {
                    item.Owned = owned;
                }
            }

            if (infinityData.skillOwnedBits == null || infinityData.skillOwnedBits.Length == 0)
            {
                infinityData.skillOwnedBits = SkillBitsetUtility.CreateEmptyBitset();
            }
            if (SkillBitsetUtility.TryGetIndex(skillId, out int index))
            {
                SkillBitsetUtility.SetBit(infinityData.skillOwnedBits, index, owned);
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

            if (infinityData.skillOwnedBits == null || infinityData.skillOwnedBits.Length == 0)
            {
                infinityData.skillOwnedBits = SkillBitsetUtility.CreateEmptyBitset();
            }
            else
            {
                infinityData.skillOwnedBits = SkillBitsetUtility.EnsureSize(infinityData.skillOwnedBits);
            }

            foreach (KeyValuePair<string, SkillState> entry in infinityData.skillStateById)
            {
                if (entry.Value == null || !entry.Value.owned) continue;
                if (SkillBitsetUtility.TryGetIndex(entry.Key, out int index))
                {
                    SkillBitsetUtility.SetBit(infinityData.skillOwnedBits, index, true);
                }
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
            oracle.AddResearchProgressInternal(researchId, delta);
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
            infinityData.researchProgressById ??= new Dictionary<string, double>();
            if (!NumericSafety.IsFinite(level) || level < 0d) return;
            double discreteLevel = Math.Floor(level);
            infinityData.researchProgressById[researchId] = 0d;
            if (ResearchIdMap.TrySetLegacyLevel(infinityData, researchId, discreteLevel) &&
                ResearchIdMap.TryGetLegacyLevel(infinityData, researchId, out double normalized))
            {
                infinityData.researchLevelsById[researchId] = normalized;
                return;
            }

            infinityData.researchLevelsById[researchId] = discreteLevel;
        }

        private void AddResearchProgressInternal(string researchId, double delta)
        {
            if (infinityData == null || string.IsNullOrEmpty(researchId) ||
                !NumericSafety.IsFinite(delta) || delta <= 0d)
            {
                return;
            }

            infinityData.researchProgressById ??= new Dictionary<string, double>();
            infinityData.researchProgressById.TryGetValue(researchId, out double remainder);
            if (!NumericSafety.IsFinite(remainder) || remainder < 0d)
                remainder = 0d;
            NumericResult<double> total = NumericSafety.Add(remainder, delta);
            if (!total.IsSuccess) return;

            double whole = Math.Floor(total.Value);
            if (whole <= 0d)
            {
                infinityData.researchProgressById[researchId] = total.Value;
                return;
            }

            double current = GetResearchLevelInternal(researchId);
            NumericResult<double> next = NumericSafety.Add(current, whole);
            if (!next.IsSuccess || next.Value <= current)
            {
                // Above the exact-integer boundary, a whole level can be smaller
                // than the current double's ULP. Retain all unrepresented accrual
                // until it is large enough to advance the stored whole level.
                infinityData.researchProgressById[researchId] = total.Value;
                return;
            }

            double represented = next.Value - current;
            double nextRemainder = Math.Max(0d, total.Value - represented);
            SetResearchLevelInternal(researchId, next.Value);
            infinityData.researchProgressById[researchId] = nextRemainder;
        }

        public List<string> GetAutoAssignmentSkillIds()
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return new List<string>();
            data.skillAutoAssignmentIds ??= new List<string>();
            if (data.skillAutoAssignmentBits != null && data.skillAutoAssignmentBits.Length > 0)
            {
                if (data.skillAutoAssignmentIds.Count == 0)
                    data.skillAutoAssignmentIds = SkillBitsetUtility.ConvertBitsetToIds(data.skillAutoAssignmentBits);
            }
            else if (data.skillAutoAssignmentIds.Count == 0 && data.skillAutoAssignmentList.Count > 0)
            {
                data.skillAutoAssignmentIds = SkillIdMap.ConvertKeysToIds(data.skillAutoAssignmentList);
            }

            data.skillAutoAssignmentBits = SkillBitsetUtility.BuildBitsetFromIds(data.skillAutoAssignmentIds);
            return data.skillAutoAssignmentIds;
        }

        /// <summary>
        /// Sets the live auto-assignment queue using dependency-safe ordering.
        /// </summary>
        /// <param name="ids">Queued skill ids.</param>
        public void SetAutoAssignmentSkillIds(List<string> ids)
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;
            List<string> orderedIds = SkillAutoAssignOrderUtility.BuildDependencySafeOrder(ids ?? new List<string>());
            data.skillAutoAssignmentIds = orderedIds;
            data.skillAutoAssignmentList = SkillIdMap.ConvertIdsToKeys(data.skillAutoAssignmentIds);
            data.skillAutoAssignmentBits = SkillBitsetUtility.BuildBitsetFromIds(data.skillAutoAssignmentIds);

            // Keep the active preset slot as the single source of truth for export/import.
            if (!IsPresetSyncSuppressed())
            {
                SyncSelectedPresetAutoAssignFromCurrent();
                ScheduleQuickSave();
            }
        }

        public List<string> GetPresetAutoAssignmentSkillIds(int presetIndex)
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return new List<string>();

            switch (presetIndex)
            {
                case 1:
                    return ResolvePresetIds(ref data.skillAutoAssignmentIds1, data.skillAutoAssignmentList1);
                case 2:
                    return ResolvePresetIds(ref data.skillAutoAssignmentIds2, data.skillAutoAssignmentList2);
                case 3:
                    return ResolvePresetIds(ref data.skillAutoAssignmentIds3, data.skillAutoAssignmentList3);
                case 4:
                    return ResolvePresetIds(ref data.skillAutoAssignmentIds4, data.skillAutoAssignmentList4);
                case 5:
                    return ResolvePresetIds(ref data.skillAutoAssignmentIds5, data.skillAutoAssignmentList5);
                default:
                    return new List<string>();
            }
        }

        /// <summary>
        /// Sets a preset slot auto-assignment queue using dependency-safe ordering.
        /// </summary>
        /// <param name="presetIndex">Preset index (1-5).</param>
        /// <param name="ids">Queued skill ids.</param>
        public void SetPresetAutoAssignmentSkillIds(int presetIndex, List<string> ids)
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;
            List<string> safeIds = SkillAutoAssignOrderUtility.BuildDependencySafeOrder(ids ?? new List<string>());
            List<int> legacyList = SkillIdMap.ConvertIdsToKeys(safeIds);

            switch (presetIndex)
            {
                case 1:
                    data.skillAutoAssignmentIds1 = safeIds;
                    data.skillAutoAssignmentList1 = legacyList;
                    break;
                case 2:
                    data.skillAutoAssignmentIds2 = safeIds;
                    data.skillAutoAssignmentList2 = legacyList;
                    break;
                case 3:
                    data.skillAutoAssignmentIds3 = safeIds;
                    data.skillAutoAssignmentList3 = legacyList;
                    break;
                case 4:
                    data.skillAutoAssignmentIds4 = safeIds;
                    data.skillAutoAssignmentList4 = legacyList;
                    break;
                case 5:
                    data.skillAutoAssignmentIds5 = safeIds;
                    data.skillAutoAssignmentList5 = legacyList;
                    break;
            }
        }

        public bool IsAutoAssignmentQueued(int legacyKey, string skillId = null)
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return false;

            if (!string.IsNullOrEmpty(skillId))
            {
                if (data.skillAutoAssignmentBits != null && data.skillAutoAssignmentBits.Length > 0 &&
                    SkillBitsetUtility.TryGetIndex(skillId, out int index))
                {
                    return SkillBitsetUtility.GetBit(data.skillAutoAssignmentBits, index);
                }

                if (data.skillAutoAssignmentIds != null && data.skillAutoAssignmentIds.Contains(skillId)) return true;
            }

            if (legacyKey > 0 && data.skillAutoAssignmentList != null && data.skillAutoAssignmentList.Contains(legacyKey))
                return true;

            return false;
        }

        private List<string> ResolvePresetIds(ref List<string> ids, List<int> legacyList)
        {
            ids ??= new List<string>();
            if (ids.Count == 0)
            {
                if (legacyList != null && legacyList.Count > 0)
                    ids = SkillIdMap.ConvertKeysToIds(legacyList);
            }

            return ids;
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

        private void ResetInfinityRunState(
            bool updatePresentation)
        {
            if (updatePresentation && SkillTree != null)
            {
                foreach (KeyValuePair<int, SkillTreeItem> entry in
                         SkillTree)
                {
                    if (entry.Value != null)
                        entry.Value.Owned = false;
                }
            }

            saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData =
                new DysonVerseInfinityData();
            saveSettings.dysonVerseSaveData
                    .dysonVerseSkillTreeData =
                new DysonVerseSkillTreeData();
        }

        internal void AutoAssignSkillsWithoutPresentation()
        {
            List<string> autoAssignIds =
                GetAutoAssignmentSkillIds();
            if (autoAssignIds.Count < 1) return;
            GameDataRegistry registry =
                GameDataRegistry.Instance;
            if (registry == null ||
                registry.skillDatabase == null)
            {
                return;
            }

            bool assignedAny;
            int passesRemaining = autoAssignIds.Count;
            do
            {
                assignedAny = false;
                foreach (string skillId in autoAssignIds)
                {
                    if (string.IsNullOrEmpty(skillId) ||
                        IsSkillOwned(skillId) ||
                        !registry.skillDatabase.TryGet(
                            skillId,
                            out SkillDefinition definition) ||
                        definition == null)
                    {
                        continue;
                    }

                    if (skillTreeData.skillPointsTree <
                            definition.cost ||
                        !RequirementsMet(
                            definition.requiredSkillIds) ||
                        !RequirementsMet(
                            definition.shadowRequirementIds) ||
                        AnyExclusiveOwned(
                            definition.exclusiveWithIds) ||
                        (!saveSettings
                              .autoAssignNonRefundableSkills &&
                         !definition.refundable))
                    {
                        continue;
                    }

                    DiscreteDebitResult debit =
                        EconomyTransaction.TryDebit(
                            skillTreeData.skillPointsTree,
                            definition.cost);
                    if (!debit.Succeeded) continue;
                    skillTreeData.skillPointsTree =
                        debit.Balance;
                    SetSkillOwned(
                        skillId,
                        true,
                        updatePresentation: false);
                    if (definition.isFragment)
                    {
                        skillTreeData.fragments =
                            NumericSafety.Add(
                                skillTreeData.fragments,
                                1L).Value;
                    }
                    assignedAny = true;
                    if (skillTreeData.skillPointsTree <= 0L)
                        break;
                }
                passesRemaining--;
            } while (assignedAny &&
                     skillTreeData.skillPointsTree > 0L &&
                     passesRemaining > 0);
        }

        private bool RequirementsMet(string[] ids)
        {
            if (ids == null || ids.Length == 0)
                return true;
            for (int index = 0;
                 index < ids.Length;
                 index++)
            {
                if (!IsSkillOwned(ids[index]))
                    return false;
            }
            return true;
        }

        private bool AnyExclusiveOwned(string[] ids)
        {
            if (ids == null || ids.Length == 0)
                return false;
            for (int index = 0;
                 index < ids.Length;
                 index++)
            {
                if (IsSkillOwned(ids[index]))
                    return true;
            }
            return false;
        }

        #region DysonVerseInfinity

        [ContextMenu("DysonInfinity")]
        public void DysonInfinity(bool updatePresentation = true)
        {
            bool completingBotCapTransition = saveSettings.botCapRewardsGranted;
            saveSettings.offlineTimeUsedPreviousInfinity = saveSettings.offlineTimeUsedThisInfinity;
            saveSettings.offlineTimeUsedThisInfinity = 0;
            saveSettings.firstInfinityDone = true;
            int bankedSkills = 0;
            if (IsSkillOwned("banking")) bankedSkills++;
            if (IsSkillOwned("investmentPortfolio")) bankedSkills++;
            ResetInfinityRunState(updatePresentation);

            int ipToGain = saveSettings.prestigePlus.doubleIP ? 2 : 1;
            ipToGain *= saveSettings.doubleIp ? 2 : 1;

            oracle.saveSettings.lastInfinityPointsGained = ipToGain;
            prestigeData.infinityPoints =
                NumericSafety.Add(prestigeData.infinityPoints, ipToGain).Value;
            saveSettings.simulationStatistics?.RecordInfinityCycle(
                breakInfinity: false,
                saveSettings.timeLastInfinity,
                ipToGain,
                completingBotCapTransition);
            infinityData.bots = prestigeData.infinityAssemblyLines ? 10 : 1;
            infinityData.assemblyLines[1] = prestigeData.infinityAssemblyLines ? 10 : 0;
            infinityData.managers[1] = prestigeData.infinityAiManagers ? 10 : 0;
            infinityData.servers[1] = prestigeData.infinityServers ? 10 : 0;
            infinityData.dataCenters[1] = prestigeData.infinityDataCenter ? 10 : 0;
            infinityData.planets[1] = prestigeData.infinityPlanets ? 10 : 0;

            skillTreeData.skillPointsTree = prestigeData.permanentSkillPoint + bankedSkills + ArtifactSkillPoints();

            if (updatePresentation && saveSettings.firstReality)
            {
                SidePanelManager.InfinityToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
                saveSettings.firstReality = false;
            }

            if (updatePresentation && prestigeData.infinityPoints == 42)
                SidePanelManager.PrestigeToggle.GetComponentInChildren<MenuToggleController>().Toggle(false);
            skillTreeData.fragments = 0;
            _gameManager.AutoAssignSkillsInvoke(
                updatePresentation);
            WipeSaveButtonUpdate();
            SetSkillTimerSeconds(infinityData, "superRadiantScattering", 0);
            ProductionSystem.SetBotDistribution(
                infinityData,
                prestigeData,
                prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                infinityData,
                skillTreeData,
                prestigeData,
                prestigePlus);
            saveSettings.infinityInProgress = false;
            saveSettings.botCapTransitionPending = false;
            saveSettings.botCapRewardsGranted = false;
            if (updatePresentation)
                Rotator.ResetPanelsStatic();
            if (completingBotCapTransition && !TrySaveState(out string transitionError))
            {
                Debug.LogError(
                    $"[NumericSafety:NS-BOT-RESET-SAVE] Bot-cap reset completed in memory but did not persist: {transitionError}");
            }
        }

        public void AutomaticBreakInfinityReset(
            bool updatePresentation = true)
        {
            bool completingBotCapTransition = saveSettings.botCapRewardsGranted;
            saveSettings.offlineTimeUsedPreviousInfinity = saveSettings.offlineTimeUsedThisInfinity;
            saveSettings.offlineTimeUsedThisInfinity = 0;
            saveSettings.firstInfinityDone = true;
            int bankedSkills = 0;
            if (IsSkillOwned("banking")) bankedSkills++;
            if (IsSkillOwned("investmentPortfolio")) bankedSkills++;

            double amount = prestigePlus.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, prestigePlus.divisionsPurchased) : 4.2e19;
            long ipToGain = StaticMethods.InfinityPointsToGain(amount, infinityData.bots);
            ipToGain = saveSettings.doubleIp ? NumericSafety.Add(ipToGain, ipToGain).Value : ipToGain;
            long finalGain = saveSettings.prestigePlus.doubleIP
                ? NumericSafety.Add(ipToGain, ipToGain).Value
                : ipToGain;
            oracle.saveSettings.lastInfinityPointsGained =
                finalGain > int.MaxValue ? int.MaxValue : (int)finalGain;
            prestigeData.infinityPoints = NumericSafety.Add(prestigeData.infinityPoints, finalGain).Value;
            saveSettings.simulationStatistics?.RecordInfinityCycle(
                breakInfinity: true,
                saveSettings.timeLastInfinity,
                finalGain,
                completingBotCapTransition);

            ResetInfinityRunState(updatePresentation);
            infinityData.bots = prestigeData.infinityAssemblyLines ? 10 : 1;
            infinityData.assemblyLines[1] = prestigeData.infinityAssemblyLines ? 10 : 0;
            infinityData.managers[1] = prestigeData.infinityAiManagers ? 10 : 0;
            infinityData.servers[1] = prestigeData.infinityServers ? 10 : 0;
            infinityData.dataCenters[1] = prestigeData.infinityDataCenter ? 10 : 0;
            infinityData.planets[1] = prestigeData.infinityPlanets ? 10 : 0;

            skillTreeData.skillPointsTree = prestigeData.permanentSkillPoint + bankedSkills + ArtifactSkillPoints();

            skillTreeData.fragments = 0;
            _gameManager.AutoAssignSkillsInvoke(
                updatePresentation);
            WipeSaveButtonUpdate();
            SetSkillTimerSeconds(infinityData, "superRadiantScattering", 0);
            ProductionSystem.SetBotDistribution(
                infinityData,
                prestigeData,
                prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                infinityData,
                skillTreeData,
                prestigeData,
                prestigePlus);
            saveSettings.infinityInProgress = false;
            saveSettings.botCapTransitionPending = false;
            saveSettings.botCapRewardsGranted = false;
            if (updatePresentation)
                Rotator.ResetPanelsStatic();
            if (completingBotCapTransition && !TrySaveState(out string transitionError))
            {
                Debug.LogError(
                    $"[NumericSafety:NS-BOT-RESET-SAVE] Bot-cap reset completed in memory but did not persist: {transitionError}");
            }
        }

        [Obsolete(
            "Break Infinity is automatic; use AutomaticBreakInfinityReset.")]
        public void ManualDysonInfinity()
        {
            AutomaticBreakInfinityReset(
                updatePresentation: true);
        }

        public void EnactPrestigePlus()
        {
            if (GameManager.RequestQueuedPlayerAction(
                    SimulationInputKind.QuantumAction,
                    EnactPrestigePlusAtSimulationBoundary,
                    "quantum_action"))
            {
                return;
            }

            EnactPrestigePlusAtSimulationBoundary();
        }

        private void EnactPrestigePlusAtSimulationBoundary()
        {
            saveSettings.firstInfinityDone = true;
            switch (prestigePlus.quantumEntanglement)
            {
                case true:
                {
                    long available = prestigeData.infinityPoints >= prestigeData.spentInfinityPoints
                        ? prestigeData.infinityPoints - prestigeData.spentInfinityPoints
                        : 0L;
                    long converted = available / IPToQuantumConversion;
                    long cost = converted * IPToQuantumConversion;
                    if (converted > 0L)
                    {
                        EconomyTransaction.TryPurchase(
                            ref prestigeData.infinityPoints,
                            cost,
                            ref saveSettings.prestigePlus.points,
                            converted);
                    }
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
            bool unlockedMatrioshkaBrains = prestigeData.unlockedMatrioshkaBrains;
            bool unlockedBirchPlanets = prestigeData.unlockedBirchPlanets;
            bool unlockedGalacticBrains = prestigeData.unlockedGalacticBrains;

            saveSettings.dysonVerseSaveData.dysonVersePrestigeData = new DysonVersePrestigeData();
            saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();
            _gameManager.CalculateProduction();
            yield return 0;
            _gameManager.CalculateProduction();
            saveSettings.dysonVerseSaveData.dysonVersePrestigeData = new DysonVersePrestigeData();
            saveSettings.dysonVerseSaveData.dysonVerseInfinityData = new DysonVerseInfinityData();
            saveSettings.prestigePlus.points =
                NumericSafety.Add(saveSettings.prestigePlus.points, 1L).Value;
            prestigeData.secretsOfTheUniverse =
                saveSettings.prestigePlus.secrets > 1 ? saveSettings.prestigePlus.secrets : 0;
            prestigeData.infinityAutoBots = saveSettings.prestigePlus.automation;
            prestigeData.infinityAutoResearch = saveSettings.prestigePlus.automation;
            prestigeData.unlockedMatrioshkaBrains = unlockedMatrioshkaBrains;
            prestigeData.unlockedBirchPlanets = unlockedBirchPlanets;
            prestigeData.unlockedGalacticBrains = unlockedGalacticBrains;
            saveSettings.lastInfinityPointsGained = 0;
            saveSettings.timeLastInfinity = 0;
            saveSettings.offlineTimeUsedThisInfinity = 0;
            saveSettings.offlineTimeUsedPreviousInfinity = 0;
            SetSkillTimerSeconds(infinityData, "androids", 0);
            SetSkillTimerSeconds(infinityData, "pocketAndroids", 0);
            skillTreeData.fragments = 0;
            skillTreeData.skillPointsTree = 0 + ArtifactSkillPoints();
            _skillTreeConfirmationManager.CloseConfirm();
            _gameManager.AutoAssignSkillsInvoke();
            Rotator.ResetPanelsStatic();
            saveSettings.simulationStatistics?.StartNewQuantumRun();
        }

        public void WipeSaveButtonUpdate()
        {
            oracle.saveSettings.tutorial = true;
        }

        public int ArtifactSkillPoints()
        {
            int points = 0;

            IReadOnlyList<SimulationUpgradeSpec> specs = SimulationUpgradeDefaultsCatalog.All;
            for (int i = 0; i < specs.Count; i++)
            {
                SimulationUpgradeSpec spec = specs[i];
                if (spec == null || spec.Layer != SimulationUpgradeLayer.Reality)
                {
                    continue;
                }

                if (!SimulationUpgradeStateAccessor.TryGetOwned(spec.Key, sp, saveSettings.saveData, out bool owned) || !owned)
                {
                    continue;
                }

                IReadOnlyList<SimulationUpgradeEffect> effects = spec.Effects;
                for (int j = 0; j < effects.Count; j++)
                {
                    SimulationUpgradeEffect effect = effects[j];
                    if (effect != null && effect.effectType == SimulationUpgradeEffectType.AddSkillPoints)
                    {
                        points += (int)Math.Round(effect.numericValue);
                    }
                }
            }

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
            public bool hasPackedSettingsFlags;
            public ulong packedSettingsFlags;
            public BuyMode buyMode = BuyMode.Buy1;
            public BuyMode researchBuyMode = BuyMode.Buy1;
            public bool roundedBulkBuy;
            public bool researchRoundedBulkBuy;
            public bool debugOptions;
            // True once debug options have ever been enabled on this save. Used for "tainted" UI indicators.
            // Note: disabling debug does not clear this.
            public bool debugEverEnabled;
            public bool doubleIp;
            public bool unlockAllTabs;
            public bool avotation;
            public int avotationProgressStep;
            public int infinityPointsToBreakFor;
            public bool infinityInProgress;
            public bool botCapTransitionPending;
            public bool botCapRewardsGranted;
            public bool numericRepairNoticePending;
            public string lastNumericRepairUtc;
            public List<string> lastNumericRepairLog = new List<string>();

            public string dateStarted;
            public string dateQuitString;
            public string timeThisInfinity;
            public double timeLastInfinity;
            public int lastInfinityPointsGained;

            [Space(10)] public bool tutorial;
            public bool globalMute;
            public bool screensaverEnabled = true;
            public bool cheater;
            public bool hidePurchased = true;
            public bool buyMax = true;
            public NumberTypes numberFormatting;
            public bool skillsBuyOnTap;

            public double offlineTime;
            public double offlineTimeUsedThisInfinity;
            public double offlineTimeUsedPreviousInfinity;
            public double maxOfflineTime = 86400;
            // Durable event-time clock state. These fields make stored-time
            // processing independent of how the same duration is partitioned
            // across jobs or save/reload boundaries.
            public bool eventTimeClockInitialized;
            public double simulationAutomationTimeUntilNextEvent = 0.1d;
            public double simulationInfinityBoundaryRemaining = 1d / 60d;
            public double simulationInfinityCycleSeconds;
            public long simulationInfinityCycleStartingPoints;
            public bool simulationInfinityHasPostResetStart;
            // Persist the deterministic rotation phases so automation order is
            // unchanged by frame partitioning, stored-time yielding, or reload.
            public int dysonAutomationTargetIndex;
            public int researchAutomationTargetIndex;
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
            public bool infinityAutoResearchToggleMatrioshkaBrains = true;
            public bool infinityAutoResearchToggleBirchPlanets = true;
            public bool infinityAutoResearchToggleGalacticBrains = true;
            [Space(10)] public bool infinityAutoAssembly = true;
            public bool infinityAutoManagers = true;
            public bool infinityAutoServers = true;
            public bool infinityAutoDataCenters = true;
            public bool infinityAutoPlanets = true;
            public bool infinityAutoMatrioshkaBrains = true;
            public bool infinityAutoBirchPlanets = true;
            public bool infinityAutoGalacticBrains = true;
            /// <summary>
            /// When true, auto-assignment can spend intrinsic non-refundable skills.
            /// </summary>
            public bool autoAssignNonRefundableSkills = true;

            [Space(10)]
            [Tooltip("Skill preset override when opening the Bots tab. 0=Off, 1-5=preset slot.")]
            public int botsTabPresetOverride;

            [Tooltip("Skill preset override when opening the Research tab. 0=Off, 1-5=preset slot.")]
            public int researchTabPresetOverride;
            public bool firstReality;
            public bool firstInfinityDone;

            public SaveData saveData = new SaveData();
            public SimulationStatistics simulationStatistics =
                new SimulationStatistics();
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
            public double manualCreationTime = 10d;
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
            public int selectedPreset = 1;
            public List<string> skillAutoAssignmentIds = new List<string>();
            public List<string> skillAutoAssignmentIds1 = new List<string>();
            public List<string> skillAutoAssignmentIds2 = new List<string>();
            public List<string> skillAutoAssignmentIds3 = new List<string>();
            public List<string> skillAutoAssignmentIds4 = new List<string>();
            public List<string> skillAutoAssignmentIds5 = new List<string>();
            [ES3NonSerializable] public byte[] skillAutoAssignmentBits;
            [ES3NonSerializable] public byte[] skillAutoAssignmentBits1;
            [ES3NonSerializable] public byte[] skillAutoAssignmentBits2;
            [ES3NonSerializable] public byte[] skillAutoAssignmentBits3;
            [ES3NonSerializable] public byte[] skillAutoAssignmentBits4;
            [ES3NonSerializable] public byte[] skillAutoAssignmentBits5;
            public string skillAutoAssignmentBitsBase64;
            public string skillAutoAssignmentBitsBase64_1;
            public string skillAutoAssignmentBitsBase64_2;
            public string skillAutoAssignmentBitsBase64_3;
            public string skillAutoAssignmentBitsBase64_4;
            public string skillAutoAssignmentBitsBase64_5;
        }

        public void SaveList(int listNum)
        {
            DysonVerseSaveData data = saveSettings.dysonVerseSaveData;
            List<string> ids = new List<string>(GetAutoAssignmentSkillIds());
            switch (listNum)
            {
                case 1:
                    SetPresetAutoAssignmentSkillIds(1, ids);
                    data.botDistPreset1 = prestigeData.botDistribution;
                    break;
                case 2:
                    SetPresetAutoAssignmentSkillIds(2, ids);
                    data.botDistPreset2 = prestigeData.botDistribution;
                    break;
                case 3:
                    SetPresetAutoAssignmentSkillIds(3, ids);
                    data.botDistPreset3 = prestigeData.botDistribution;
                    break;
                case 4:
                    SetPresetAutoAssignmentSkillIds(4, ids);
                    data.botDistPreset4 = prestigeData.botDistribution;
                    break;
                case 5:
                    SetPresetAutoAssignmentSkillIds(5, ids);
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
                    ids.AddRange(GetPresetAutoAssignmentSkillIds(1));
                    prestigeData.botDistribution = data.botDistPreset1;
                    slider.SetSlider();
                    break;
                case 2:
                    ids.AddRange(GetPresetAutoAssignmentSkillIds(2));
                    prestigeData.botDistribution = data.botDistPreset2;
                    slider.SetSlider();
                    break;
                case 3:
                    ids.AddRange(GetPresetAutoAssignmentSkillIds(3));
                    prestigeData.botDistribution = data.botDistPreset3;
                    slider.SetSlider();
                    break;
                case 4:
                    ids.AddRange(GetPresetAutoAssignmentSkillIds(4));
                    prestigeData.botDistribution = data.botDistPreset4;
                    slider.SetSlider();
                    break;
                case 5:
                    ids.AddRange(GetPresetAutoAssignmentSkillIds(5));
                    prestigeData.botDistribution = data.botDistPreset5;
                    slider.SetSlider();
                    break;
            }

            data.skillAutoAssignmentIds = ids;
            data.skillAutoAssignmentList = SkillIdMap.ConvertIdsToKeys(ids);
            data.skillAutoAssignmentBits = SkillBitsetUtility.BuildBitsetFromIds(ids);
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

            [Space(10), Header("Mega-Structure Unlocks")]
            public bool unlockedMatrioshkaBrains;
            public bool unlockedBirchPlanets;
            public bool unlockedGalacticBrains;
        }

        [Serializable]
        public class DysonVerseInfinityData
        {
            public Dictionary<int, bool> SkillTreeSaveData;
            public Dictionary<string, SkillState> skillStateById = new Dictionary<string, SkillState>();
            public Dictionary<string, bool> skillOwnedById = new Dictionary<string, bool>();
            [ES3NonSerializable] public byte[] skillOwnedBits;
            public string skillOwnedBitsBase64;
            public Dictionary<string, double> researchLevelsById = new Dictionary<string, double>();
            public Dictionary<string, double> researchProgressById = new Dictionary<string, double>();
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
            public List<int> assemblyLinesSparseIndices = new List<int>();
            public List<double> assemblyLinesSparseValues = new List<double>();

            public double assemblyLineModifier = 1;
            public double botProduction;
            public double assemblyLineBotProduction;
            public double[] managers = { 0, 0 };
            public List<int> managersSparseIndices = new List<int>();
            public List<double> managersSparseValues = new List<double>();
            public double managerModifier = 1;
            public double assemblyLineProduction;
            public double managerAssemblyLineProduction;
            public double[] servers = { 0, 0 };
            public List<int> serversSparseIndices = new List<int>();
            public List<double> serversSparseValues = new List<double>();
            public double serverModifier = 1;
            public double managerProduction;
            public double serverManagerProduction;
            public double[] dataCenters = { 0, 0 };
            public List<int> dataCentersSparseIndices = new List<int>();
            public List<double> dataCentersSparseValues = new List<double>();
            public double dataCenterModifier = 1;
            public double serverProduction;
            public double dataCenterServerProduction;
            public double[] planets = { 0, 0 };
            public List<int> planetsSparseIndices = new List<int>();
            public List<double> planetsSparseValues = new List<double>();
            public double planetModifier = 1;
            public double dataCenterProduction;
            public double planetsDataCenterProduction;

            [Space(10), Header("Mega-Structures")]
            public double[] matrioshkaBrains = { 0, 0 };
            public List<int> matrioshkaBrainsSparseIndices = new List<int>();
            public List<double> matrioshkaBrainsSparseValues = new List<double>();
            public double matrioshkaBrainModifier = 1;
            public double matrioshkaBrainPlanetProduction;

            public double[] birchPlanets = { 0, 0 };
            public List<int> birchPlanetsSparseIndices = new List<int>();
            public List<double> birchPlanetsSparseValues = new List<double>();
            public double birchPlanetModifier = 1;
            public double birchPlanetMatrioshkaProduction;

            public double[] galacticBrains = { 0, 0 };
            public List<int> galacticBrainsSparseIndices = new List<int>();
            public List<double> galacticBrainsSparseValues = new List<double>();
            public double galacticBrainModifier = 1;
            public double galacticBrainBirchProduction;

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

            public long matrioshkaUpgradeOwned;
            public double matrioshkaUpgradePercent = 0.03;

            public long birchUpgradeOwned;
            public double birchUpgradePercent = 0.03;

            public long galacticUpgradeOwned;
            public double galacticUpgradePercent = 0.03;

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
            public bool avocados;

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
            public double workerGenerationProgress;

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
            public int doubleTimeRate;

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
            public bool communityBoostIsFree = true;
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

            // Timer progress state (persists across save/load)
            // These track partial progress towards the next production tick
            [Space(10), Header("Timer Progress")]
            public double hunterTimerProgress;
            public double gathererTimerProgress;
            public double communityTimerProgress;
            public double housingTimerProgress;
            public double villagesTimerProgress;
            public double workersTimerProgress;
            public double citiesTimerProgress;
            public double factoriesTimerProgress;
            public double botsTimerProgress;
            public double spaceFactoriesTimerProgress;
            public double railgunFireProgress;
            public bool railgunFiring;
            public int railgunShotsRemaining;
        }


        #region Singleton class: Oracle

        public static Oracle oracle;


        private void Awake()
        {
            if (oracle == null)
                oracle = this;
            else
                Destroy(gameObject);

            // Load entitlements early so debug gating doesn't depend on PlayerPrefs.
            PlayerEntitlementsStore.EnsureLoaded();
            EnsureRuntimeSeamsInitialized();
        }

        #endregion

        #endregion

    }
}
