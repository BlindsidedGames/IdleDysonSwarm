using System;
using System.Collections;
using System.Globalization;
using Buildings;
using Expansion;
using Research;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.Serialization;
using Systems;
using Systems.Numeric;
using Systems.Simulation;
using Systems.Stats;
using Blindsided.ProceduralUIImage;
using Blindsided.Utilities;
using static Expansion.Oracle;

/// <summary>
/// Purpose: Runtime coordinator for DysonVerse simulation ticks, HUD text refresh, skill UI state, and offline/return flows.
/// Where it runs: Runtime MonoBehaviour in gameplay scenes (not editor-only).
/// Primary entry points: Start(), Update(), OnEnable(), OnDisable(), SetSkillsReferences(...), UpdateSkillsInvoke(),
/// and serialized UI button/event hookups that call public methods on this component.
/// Owns vs delegates: Owns scene UI references/state wiring and high-level update order; delegates formulas/stat math to
/// systems like ProductionSystem/ModifierSystem/OfflineProgressSystem and reads/writes save state through Oracle.
///
/// Interacts with:
/// - Calls: Expansion.Oracle save data accessors, Systems.ProductionSystem, Systems.ModifierSystem, Systems.OfflineProgressSystem,
///   Systems.Stats pipelines, TMPro UI widgets, and Unity scene/loading APIs.
/// - Called by: Unity lifecycle callbacks, inspector-bound UI events, and SidePanelController.SetSkillsReferences
///   (Assets/Scripts/User Interface/SidePanelController.cs).
///
/// Change notes:
/// - Serialized fields are scene/prefab contracts; renaming/removing them can break bindings in Game.unity and UI prefabs.
/// - Public events (UpdateSkills/AssignSkills) are cross-script contracts; changing signatures/names requires subscriber updates.
/// - Public methods used by UI/events (for example SetSkillsReferences) must keep behavior compatible with callers.
/// - Save-facing keys/data paths are owned by Oracle/save models; changing accessed fields requires coordinated migration updates.
/// - Side-panel run-info lines include offline spend counters sourced from
///   <see cref="Expansion.Oracle.SaveDataSettings.offlineTimeUsedThisInfinity"/> and
///   <see cref="Expansion.Oracle.SaveDataSettings.offlineTimeUsedPreviousInfinity"/> rendered on a separate line
///   in short time form.
/// - Timer value strings should pass <c>colourOverride</c> into <see cref="CalcUtils.FormatTime"/> rather than wrapping
///   the full output in a color tag, so unit suffixes remain uncolored.
/// - Infinity section <c>Run Time</c> rows (`Current`/`Previous`) intentionally pass <c>showDecimal: true</c>
///   to preserve sub-second precision in the side-panel stats block.
/// - Stats ordering/section headers in <c>skillTimersDisplayText</c> are a UX contract:
///   bold General metrics, then bold Infinity section, then bold Skills section.
/// - General metrics, s/IP, and Run/Offline Current/Previous rows use the same small text scale as skill detail lines.
/// - Skill rows render at small text scale with bold skill names.
/// - Update() must defer production and ordinary threshold prestige while Oracle is holding the prepared finite
///   bot-cap signal, so Oracle's legacy cap reward/reset path consumes it first regardless
///   of Unity script execution order.
/// </summary>
public class GameManager : MonoBehaviour
{
    private const double SimulationTickSeconds = 0.1d;
    private const int MaximumTicksPerFrame = 10;
    private double _simulationAccumulator;
    [SerializeField] private BotsAutoBuy botsAutoBuy;
    [SerializeField] private ResearchAutoBuy researchAutoBuy;
    [SerializeField] private FoundationalEraManager foundationalEraManager;
    [SerializeField] private InformationEraManager informationEraManager;
    [SerializeField] private SpaceAgeManager spaceAgeManager;
    [SerializeField] private DoubleTimeManager doubleTimeManager;
    [SerializeField] private SimulationPrestigeManager simulationPrestigeManager;
    #region SerializedFields

    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVerseSaveData dysonVerseSaveData => oracle.saveSettings.dysonVerseSaveData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;

    [SerializeField] private GameObject store;

    [SerializeField, FormerlySerializedAs("skb")] private SkillTreeManager skillTreeManager;
    [SerializeField] private TMP_Text saveAge;

    [SerializeField, FormerlySerializedAs("skillTimers")] private TMP_Text skillTimersText;

    [SerializeField] private TMP_Text runAge;
    [SerializeField] private TMP_Text runAgePrestigeScreen;
    private string sciencePerSecondText = "";
    [SerializeField] private TMP_Text skillTreePoints;
    [SerializeField] private GameObject prestigeScreen;

    [SerializeField] private GameObject[] infinityButton;



    [Header("ReturnScreen"), SerializeField]
    private TMP_Text awayForHeader;

    [SerializeField] private TMP_Text awayFor;

    [SerializeField] private GameObject offlineTimeInstructions;
    [SerializeField] private LayoutElement offlineProgressLayoutElement;
    [SerializeField] private GameObject returnScreen;
    [SerializeField] private SlicedFilledImage returnScreenSlider;
    [SerializeField] private GameObject returnScreenSliderParentGameObject;
    [SerializeField] private Button returnScreenConfirmButton;

    [SerializeField] private TMP_Text amounts;

    [Header("Resource Amounts"), SerializeField]
    private TMP_Text cash;

    [SerializeField] private TMP_Text totalBots;

    [SerializeField] private TMP_Text cashPerSec;
    [SerializeField] private TMP_Text researchPoints;
    [SerializeField] private TMP_Text researchPerSec;
    [SerializeField] private TMP_Text workerStats;
    [SerializeField] private TMP_Text scienceStats;

    [Header("WorkerStatPanel"), SerializeField]
    private TMP_Text lifetimePanels;

    [SerializeField] private TMP_Text activePanels;
    [SerializeField] private TMP_Text panelLifetime;
    [SerializeField] private TMP_Text goal;

    [Header("SkillsMenuItems"), SerializeField, FormerlySerializedAs("SkillsFill")]
    private SlicedFilledImage skillsFill;
    private ProceduralUIImage _skillsFillProcedural;

    [SerializeField] private GameObject skillsIcon;
    [SerializeField] private Image skillsIconImage;
    private Color _skillsIconBaseColor = Color.white;
    private bool _skillsIconBaseColorSet;
    [SerializeField] private GameObject skillsToggle;
    [SerializeField] private GameObject[] skillsButton;
    [SerializeField, FormerlySerializedAs("skillsfillbar")] private GameObject skillsFillBar;
    [SerializeField] private GameObject skillsPresetSwitchingSection;
    [SerializeField] private TMP_Text skillsText;
    [SerializeField, FormerlySerializedAs("skillsMenubutton")] private Button skillsMenuButton;
    [SerializeField] private double maxInfinityBuff = 1e44;

    [SerializeField, FormerlySerializedAs("_skillTreeConfirmationManager")]
    private SkillTreeConfirmationManager skillTreeConfirmationManager;
    private readonly SecretBuffState _secretBuffState = new SecretBuffState();
    private bool _isPermanentPanel;

    #endregion

    public static event Action UpdateSkills;
    public static event Action AssignSkills;

    /// <summary>
    /// Sets Skills UI references from a SidePanelReferences component.
    /// Called by SidePanelController when switching between panel variants.
    /// </summary>
    public void SetSkillsReferences(SidePanelReferences refs)
    {
        if (refs == null) return;

        _isPermanentPanel = refs.isPermanentPanel;

        // Update fill bar references
        if (refs.skillsFillObject != null)
        {
            // Prefer ProceduralUIImage (new), fall back to legacy SlicedFilledImage.
            _skillsFillProcedural = refs.skillsFillObject.GetComponent<ProceduralUIImage>();
            skillsFill = _skillsFillProcedural == null
                ? refs.skillsFillObject.GetComponent<SlicedFilledImage>()
                : null;
        }
        if (refs.skillsFillBar != null)
            skillsFillBar = refs.skillsFillBar;
        if (refs.skillsPresetSwitchingSection != null)
            skillsPresetSwitchingSection = refs.skillsPresetSwitchingSection;
        else if (refs.skillsPresetTogglesRoot != null)
            skillsPresetSwitchingSection = refs.skillsPresetTogglesRoot;

        // Update other Skills UI references
        if (refs.skillsIcon != null)
            skillsIcon = refs.skillsIcon;
        if (refs.skillsIconImage != null)
        {
            skillsIconImage = refs.skillsIconImage;
            if (!_skillsIconBaseColorSet)
            {
                _skillsIconBaseColor = skillsIconImage.color;
                _skillsIconBaseColorSet = true;
            }
        }
        if (refs.skillsToggle != null)
            skillsToggle = refs.skillsToggle;
        if (refs.skillsTextObject != null)
            skillsText = refs.skillsTextObject.GetComponent<TMP_Text>();
        if (refs.skillTimersText != null)
            skillTimersText = refs.skillTimersText;
        if (refs.skillsMenuButtonObject != null)
            skillsMenuButton = refs.skillsMenuButtonObject.GetComponent<Button>();
    }

    private void SetSkillsFill(float fill)
    {
        if (_skillsFillProcedural != null) _skillsFillProcedural.fillAmount = fill;
        else if (skillsFill != null) skillsFill.fillAmount = fill;
    }

    #region Main

    #region Initialization

    public void UpdateSkillsInvoke()
    {
        UpdateSkills?.Invoke();
    }

    public void AutoAssignSkillsInvoke()
    {
        AssignSkills?.Invoke();
        CalculateModifiers();
    }

    private void Start()
    {
        botsAutoBuy ??= FindAnyObjectByType<BotsAutoBuy>(FindObjectsInactive.Include);
        researchAutoBuy ??= FindAnyObjectByType<ResearchAutoBuy>(FindObjectsInactive.Include);
        foundationalEraManager ??= FindAnyObjectByType<FoundationalEraManager>(FindObjectsInactive.Include);
        informationEraManager ??= FindAnyObjectByType<InformationEraManager>(FindObjectsInactive.Include);
        spaceAgeManager ??= FindAnyObjectByType<SpaceAgeManager>(FindObjectsInactive.Include);
        doubleTimeManager ??= FindAnyObjectByType<DoubleTimeManager>(FindObjectsInactive.Include);
        simulationPrestigeManager ??= FindAnyObjectByType<SimulationPrestigeManager>(FindObjectsInactive.Include);
        CalculateModifiers();
        CalculateProduction();
        InvokeRepeating(nameof(UpdateTextFields), 0, 0.1f);
        InvokeRepeating(nameof(CalculateModifiers), 0, 1f);
        // InvokeRepeating(nameof(SubmitHighScores), 10, 10f);
        InvokeRepeating(nameof(CheckIfValuesNegative), 0, 10);
        if (Application.platform == RuntimePlatform.WindowsPlayer)
        {
            store.SetActive(false);
        }
    }

    private void CheckIfValuesNegative()
    {
        bool repaired = false;
        if (!NumericSafety.IsFinite(infinityData.bots) || infinityData.bots < 0d)
        {
            infinityData.bots = 0d;
            repaired = true;
        }

        repaired |= RepairRuntimeContinuous(ref infinityData.money);
        repaired |= RepairRuntimeContinuous(ref infinityData.science);
        repaired |= RepairRuntimeContinuous(ref infinityData.totalPanelsDecayed);
        repaired |= RepairRuntimeArray(infinityData.assemblyLines);
        repaired |= RepairRuntimeArray(infinityData.managers);
        repaired |= RepairRuntimeArray(infinityData.servers);
        repaired |= RepairRuntimeArray(infinityData.dataCenters);
        repaired |= RepairRuntimeArray(infinityData.planets);
        repaired |= RepairRuntimeArray(infinityData.matrioshkaBrains);
        repaired |= RepairRuntimeArray(infinityData.birchPlanets);
        repaired |= RepairRuntimeArray(infinityData.galacticBrains);
        if (repaired)
            Systems.Debugging.NumericDiagnostics.Report("NS-RUNTIME-CORE-REPAIR");
    }

    private static bool RepairRuntimeContinuous(ref double value)
    {
        double repaired = NumericSafety.ClampContinuous(value);
        if (value.Equals(repaired)) return false;
        value = repaired;
        return true;
    }

    private static bool RepairRuntimeArray(double[] values)
    {
        if (values == null) return false;
        bool repaired = false;
        for (int i = 0; i < values.Length; i++)
        {
            double value = values[i];
            repaired |= RepairRuntimeContinuous(ref value);
            values[i] = value;
        }
        return repaired;
    }

    private void Update()
    {
        DeterministicSimulation.Advance(
            ref _simulationAccumulator,
            Time.deltaTime,
            SimulationTickSeconds,
            MaximumTicksPerFrame,
            RunSimulationTick);
    }

    private void RunSimulationTick()
    {
        RunSimulationTick(forceOfflineBuyMax: false);
    }

    private void RunSimulationTick(bool forceOfflineBuyMax)
    {
        RunSimulationStep(
            SimulationTickSeconds,
            runAutomation: true,
            forceOfflineBuyMax: forceOfflineBuyMax);
    }

    private void RunSimulationRemainder(double deltaSeconds)
    {
        if (!NumericSafety.IsFinite(deltaSeconds) ||
            deltaSeconds <= 0d ||
            deltaSeconds >= SimulationTickSeconds)
        {
            return;
        }

        RunSimulationStep(
            deltaSeconds,
            runAutomation: false,
            forceOfflineBuyMax: true);
    }

    private void RunSimulationStep(
        double deltaSeconds,
        bool runAutomation,
        bool forceOfflineBuyMax)
    {
        bool dreamEngineeringCompleteAtStart =
            oracle.saveSettings.sdSimulation.engineeringComplete;
        DreamDoubleTimeTick dreamDoubleTimeTick = doubleTimeManager != null
            ? doubleTimeManager.PrepareSimulationTick(deltaSeconds)
            : DreamDoubleTimeMath.Prepare(
                oracle.saveSettings.sdPrestige.doubleTimeOwned,
                oracle.saveSettings.sdPrestige.doubleTime,
                oracle.saveSettings.sdPrestige.doubleTimeRate,
                deltaSeconds);
        if (doubleTimeManager == null)
            oracle.saveSettings.sdPrestige.doDoubleTime = dreamDoubleTimeTick.Active;

        DeterministicSimulation.RunWholeGameTick(
            dysonProduction: () =>
            {
                SetBotDistribution();
                ProductionSystem.CalculateProduction(
                    infinityData,
                    skillTreeData,
                    prestigeData,
                    prestigePlus,
                    deltaSeconds,
                    recomputeDerivedState: false);
            },
            dreamProduction: () =>
            {
                // Run downstream eras first. Combined with each manager's
                // local input snapshot, this prevents newly produced
                // facilities from working until the next logical tick.
                spaceAgeManager?.RunProductionTick(
                    dreamDoubleTimeTick.EffectiveMultiplier,
                    deltaSeconds);
                informationEraManager?.RunProductionTick(
                    dreamDoubleTimeTick.EffectiveMultiplier,
                    deltaSeconds);
                foundationalEraManager?.RunProductionTick(
                    dreamEngineeringCompleteAtStart,
                    dreamDoubleTimeTick.EffectiveMultiplier,
                    deltaSeconds);
            },
            dysonAutomation: () =>
            {
                if (!runAutomation) return;
                botsAutoBuy?.RunAutomationTick(forceOfflineBuyMax);
                researchAutoBuy?.RunAutomationTick(forceOfflineBuyMax);
            },
            dreamAutomation: () =>
            {
                if (!runAutomation) return;
                foundationalEraManager?.RunAutomationTick();
                informationEraManager?.RunAutomationTick();
                spaceAgeManager?.RunAutomationTick();
            },
            recomputeDysonDerivedState: () =>
                ProductionSystem.RecalculateDerivedState(
                    infinityData,
                    skillTreeData,
                    prestigeData,
                    prestigePlus),
            synchronizeDreamDurableState: () =>
            {
                foundationalEraManager?.CompleteSimulationTick();
                informationEraManager?.CompleteSimulationTick();
                spaceAgeManager?.CompleteSimulationTick();
            },
            consumeDreamDoubleTime: () =>
            {
                if (doubleTimeManager != null)
                {
                    doubleTimeManager.CompleteSimulationTick(dreamDoubleTimeTick);
                    return;
                }

                Oracle.SaveDataPrestige dreamPrestige =
                    oracle.saveSettings.sdPrestige;
                if (!NumericSafety.IsFinite(dreamPrestige.doubleTime))
                    dreamPrestige.doubleTime = 0d;
                dreamPrestige.doubleTime = Math.Max(
                    0d,
                    dreamPrestige.doubleTime - dreamDoubleTimeTick.BankConsumed);
                dreamPrestige.doDoubleTime =
                    dreamPrestige.doubleTimeOwned && dreamPrestige.doubleTime > 0d;
            },
            evaluateDreamReset: () =>
                simulationPrestigeManager?.EvaluateSimulationTransitions(),
            evaluateDysonReset: EvaluateSimulationTransitions);
    }

    private void EvaluateSimulationTransitions()
    {
        if (oracle.ProcessBotCapTransition()) return;

        ManageGoal();
        double amount = prestigePlus.divisionsPurchased > 0
            ? 4.2e19 / Math.Pow(10, prestigePlus.divisionsPurchased)
            : 4.2e19;
        if (prestigePlus.breakTheLoop)
        {
            if (oracle.saveSettings.infinityInProgress) return;

            long projectedGain = StaticMethods.InfinityPointsToGain(amount, infinityData.bots);
            if (oracle.saveSettings.doubleIp)
                projectedGain = NumericSafety.Add(projectedGain, projectedGain).Value;
            if (prestigePlus.doubleIP)
                projectedGain = NumericSafety.Add(projectedGain, projectedGain).Value;
            long threshold = oracle.saveSettings.infinityPointsToBreakFor >= 1
                ? oracle.saveSettings.infinityPointsToBreakFor
                : 1;
            if (projectedGain < threshold) return;

            oracle.saveSettings.infinityInProgress = true;
            Prestige();
            return;
        }

        if (infinityData.bots < amount) return;
        oracle.saveSettings.infinityInProgress = true;
        Prestige();
    }

    private static bool TryParseUtc(string value, out DateTime result)
    {
        return DateTime.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out result);
    }

    private DateTime GetSaveStartedUtc()
    {
        if (!TryParseUtc(oracle.saveSettings.dateStarted, out DateTime dateStarted))
        {
            dateStarted = DateTime.UtcNow;
            oracle.saveSettings.dateStarted = dateStarted.ToString(CultureInfo.InvariantCulture);
        }

        return dateStarted;
    }

    private DateTime GetRunStartUtc()
    {
        if (TryParseUtc(dysonVerseSaveData.lastCollapseDate, out DateTime runStarted))
            return runStarted;

        return GetSaveStartedUtc();
    }

    public void CalculateProduction()
    {
        // Public/legacy delegate is now a side-effect-free derived-rate refresh.
        ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, 0d);
    }

    private void CalculateProduction(double deltaTime)
    {
        ProductionSystem.CalculateProduction(infinityData, skillTreeData, prestigeData, prestigePlus, deltaTime);
    }

    private double CurrentRunTime()
    {
        DateTime dateStarted = GetRunStartUtc();
        DateTime dateNow = DateTime.UtcNow;
        TimeSpan timespan = dateNow - dateStarted;
        return timespan.TotalSeconds;
    }

    public void Prestige()
    {
        skillTreeConfirmationManager.CloseConfirm();
        double seconds = CurrentRunTime();
        if (seconds <= 0) seconds = 10000;
        string lastCollapseInfo = "";

        lastCollapseInfo = seconds > 10
            ? $"You broke reality in: {CalcUtils.FormatTimeLarge(seconds)}"
            : $"You broke reality in: {seconds:F2} Seconds";
        lastCollapseInfo += $"\nYou have broken reality {prestigeData.infinityPoints + 1} ";
        lastCollapseInfo += prestigeData.infinityPoints > 1 ? "times" : "time";

        runAgePrestigeScreen.text = lastCollapseInfo;

        oracle.saveSettings.timeLastInfinity = seconds;

        dysonVerseSaveData.lastCollapseDate = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        if (!oracle.saveSettings.infinityFirstRunDone)
            foreach (GameObject VARIABLE in infinityButton)
                VARIABLE.SetActive(true);

        switch (prestigePlus.breakTheLoop)
        {
            case true:
                oracle.ManualDysonInfinity();
                break;
            default:
                oracle.DysonInfinity();
                break;
        }

        UpdateSkillsInvoke();

        if (prestigeData.infinityPoints <= 42 && oracle.saveSettings.prestigePlus.points == 0) prestigeScreen.SetActive(true);
    }

    private void OnEnable()
    {
        AwayFor += ApplyReturnValues;
    }

    private void OnDisable()
    {
        AwayFor -= ApplyReturnValues;
    }

    // private void SubmitHighScores()
    // {
    //     if (infinityData.goalSetter < 1) return;
    //     Achievements.tenbots.Unlock();
    //     if (infinityData.goalSetter < 2) return;
    //     Achievements.fiveassemblylines.Unlock();
    //     if (infinityData.goalSetter < 3) return;
    //     Achievements.twentykactivective.Unlock();
    //     if (infinityData.goalSetter < 4) return;
    //     Achievements.twentyplanets.Unlock();
    //     if (infinityData.goalSetter < 7) return;
    //     Achievements.surroundstarstenb.Unlock();
    //     if (infinityData.goalSetter < 8) return;
    //     Achievements.engulfgalaxy.Unlock();
    //     if (infinityData.goalSetter < 10) return;
    //     Achievements.galaxyonehundred.Unlock();
    // }

    #endregion

    #region AwayTime

    private OfflineProgressContext CreateOfflineProgressContext()
    {
        return new OfflineProgressContext
        {
            infinityData = infinityData,
            prestigeData = prestigeData,
            skillTreeData = skillTreeData,
            prestigePlus = prestigePlus,
            saveSettings = oracle.saveSettings,
            SetBotDistribution = SetBotDistribution,
            CalculateShouldersSkills = CalculateShouldersSkills,
            CalculateProduction = CalculateProduction,
            MoneyToAdd = MoneyToAdd,
            ScienceToAdd = ScienceToAdd,
            RunAutomationTick = () =>
            {
                botsAutoBuy?.RunAutomationTick(forceBuyMax: true);
                researchAutoBuy?.RunAutomationTick(forceBuyMax: true);
            },
            RunCanonicalWholeGameTick = () =>
                RunSimulationTick(forceOfflineBuyMax: true),
            RunCanonicalWholeGameRemainder = RunSimulationRemainder,
            RunAnalyticalTicks = TryRunAnalyticalOfflineTicks
        };
    }

    private long TryRunAnalyticalOfflineTicks(long requestedTicks)
    {
        if (requestedTicks < 2L ||
            prestigePlus.breakTheLoop ||
            AnalyticalOfflineSimulation.HasPersistentSideEffects(skillTreeData))
        {
            return 0L;
        }

        if ((prestigeData.infinityAutoBots && botsAutoBuy == null) ||
            (prestigeData.infinityAutoResearch && researchAutoBuy == null))
        {
            return 0L;
        }

        bool dreamIdle = DreamAnalyticalOfflineSimulation.IsClockIdle(
            oracle.saveSettings.sdSimulation,
            spaceAgeManager != null && spaceAgeManager.IsRailgunFiring);
        DreamOfflineTiming dreamTiming = default;
        long dreamHorizon = requestedTicks;
        if (!dreamIdle)
        {
            if (!TryGetDreamOfflineTiming(out dreamTiming))
                return 0L;
            dreamHorizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                oracle.saveSettings.sdSimulation,
                oracle.saveSettings.sdPrestige,
                dreamTiming,
                requestedTicks);
            if (dreamHorizon < 2L) return 0L;
        }

        double resetThreshold = prestigePlus.divisionsPurchased > 0
            ? 4.2e19 / Math.Pow(10d, prestigePlus.divisionsPurchased)
            : 4.2e19;
        resetThreshold = Math.Min(resetThreshold, double.MaxValue);
        long processed = AnalyticalOfflineSimulation.TryAdvanceDyson(
            infinityData,
            skillTreeData,
            prestigeData,
            prestigePlus,
            dreamHorizon,
            resetThreshold,
            HasOfflineAutomationEvent);
        if (processed <= 0L) return 0L;

        Oracle.SaveDataPrestige dreamPrestige = oracle.saveSettings.sdPrestige;
        if (!dreamIdle)
        {
            DreamAnalyticalOfflineSimulation.AdvanceValidatedQuietTicks(
                oracle.saveSettings.sdSimulation,
                dreamPrestige,
                dreamTiming,
                processed);
            SimulationPrestigeManager.InvokeResetSimulationRuntime();
        }
        else if (dreamPrestige != null)
        {
            dreamPrestige.doubleTime = DreamDoubleTimeMath.RemainingBankAfterTicks(
                dreamPrestige.doubleTimeOwned,
                dreamPrestige.doubleTime,
                dreamPrestige.doubleTimeRate,
                processed,
                SimulationTickSeconds);
            dreamPrestige.doDoubleTime =
                dreamPrestige.doubleTimeOwned && dreamPrestige.doubleTime > 0d;
        }

        botsAutoBuy?.SkipAutomationTicks(processed);
        researchAutoBuy?.SkipAutomationTicks(processed);
        return processed;
    }

    private bool HasOfflineAutomationEvent(DysonAnalyticalState state)
    {
        return (botsAutoBuy != null &&
                botsAutoBuy.WouldOfflinePurchase(state)) ||
               (researchAutoBuy != null &&
                researchAutoBuy.WouldOfflinePurchase(state));
    }

    private bool TryGetDreamOfflineTiming(out DreamOfflineTiming timing)
    {
        timing = default;
        if (foundationalEraManager == null ||
            informationEraManager == null ||
            spaceAgeManager == null ||
            !foundationalEraManager.SupportsAnalyticalOffline ||
            !informationEraManager.SupportsAnalyticalOffline ||
            !spaceAgeManager.SupportsAnalyticalOffline)
        {
            return false;
        }

        timing = new DreamOfflineTiming(
            foundationalEraManager.HunterDurationSeconds,
            foundationalEraManager.GathererDurationSeconds,
            foundationalEraManager.CommunityDurationSeconds,
            foundationalEraManager.HousingDurationSeconds,
            foundationalEraManager.VillagesDurationSeconds,
            foundationalEraManager.WorkersDurationSeconds,
            foundationalEraManager.CitiesDurationSeconds,
            informationEraManager.FactoriesDurationSeconds,
            informationEraManager.BotsDurationSeconds,
            spaceAgeManager.SpaceFactoriesDurationSeconds,
            spaceAgeManager.IsRailgunFiring);
        return true;
    }

    private OfflineProgressUI CreateOfflineProgressUi()
    {
        return new OfflineProgressUI
        {
            AwayForHeader = awayForHeader,
            AwayFor = awayFor,
            OfflineTimeInstructions = offlineTimeInstructions,
            OfflineProgressLayoutElement = offlineProgressLayoutElement,
            ReturnScreen = returnScreen,
            ReturnScreenSlider = returnScreenSlider,
            ReturnScreenSliderParentGameObject = returnScreenSliderParentGameObject,
            Amounts = amounts
        };
    }

    public void ApplyReturnValues(double awayTime)
    {
        OfflineProgressSystem.ApplyReturnValues(awayTime, CreateOfflineProgressContext(), CreateOfflineProgressUi());
    }

    public void RunAwayTime(double awayTime)
    {
        StartCoroutine(CalculateAwayValues(awayTime));
    }

    private IEnumerator CalculateAwayValues(double awayTime)
    {
        return OfflineProgressSystem.CalculateAwayValues(awayTime, CreateOfflineProgressContext(), CreateOfflineProgressUi());
    }

    #endregion


    private void SetBotDistribution()
    {
        ProductionSystem.SetBotDistribution(infinityData, prestigeData, prestigePlus);
    }

    #region GoalManagment

    private void ManageGoal()
    {
        //var colorSkillTree = "<color=#FFA45E>";
        string skillPointColor = "<color=#91DD8F>";
        skillTreePoints.text =
            $"Skill points: {skillPointColor}{skillTreeData.skillPointsTree}</color>";
        string color = "<color=#91DD8F>";
        bool wasSkillsFirstRunDone = oracle.saveSettings.skillsFirstRunDone;
        bool skillsUnlocked =
            oracle.saveSettings.skillsFirstRunDone ||
            skillTreeData.skillPointsTree > 0 ||
            prestigeData.permanentSkillPoint > 0 ||
            prestigeData.infinityPoints > 0 ||
            prestigeData.spentInfinityPoints > 0;

        if (skillsText != null)
        {
            long availableSkillPoints = skillTreeData.skillPointsTree;
            skillsText.text = oracle.saveSettings.skillsFirstRunDone
                ? availableSkillPoints > 0
                    ? $"Skills (<color=#54FF00>{availableSkillPoints}</color>)"
                    : "Skills"
                : "<align=\"center\"><sprite=4 color=#C8B3FF>";
        }

        if (skillsUnlocked)
        {
            if (skillsIcon != null) skillsIcon.SetActive(true);
            if (skillsIconImage != null)
                skillsIconImage.color = oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.skillPointsTree > 0
                    ? new Color(0.32884598f, 1f, 0f, 1f)
                    : _skillsIconBaseColor;
            // Hide toggle in permanent mode since the panel is always visible
            if (skillsToggle != null)
                skillsToggle.SetActive(!_isPermanentPanel && SceneManager.GetActiveScene().buildIndex == 1);
            if (skillsButton != null && skillsButton.Length > 0 && skillsButton[0] != null)
                skillsButton[0].SetActive(!oracle.saveSettings.skillsButtonToggle);
            if (skillsButton != null && skillsButton.Length > 1 && skillsButton[1] != null && !oracle.saveSettings.skillsFirstRunDone)
                skillsButton[1].SetActive(true);
            if (skillsPresetSwitchingSection != null)
                skillsPresetSwitchingSection.SetActive(true);
            if (!wasSkillsFirstRunDone && skillsToggle != null)
            {
                Toggle toggle = skillsToggle.GetComponent<Toggle>();
                if (toggle != null)
                    toggle.isOn = false;
            }
            oracle.saveSettings.skillsFirstRunDone = true;
            if (skillsMenuButton != null) skillsMenuButton.interactable = true;
        }
        else
        {
            // Locked state mirrors Infinity-style behavior.
            if (skillsIcon != null) skillsIcon.SetActive(false);
            if (skillsToggle != null)
                skillsToggle.SetActive(false);
            if (skillsIconImage != null) skillsIconImage.color = _skillsIconBaseColor;
            if (skillsButton != null && skillsButton.Length > 0 && skillsButton[0] != null)
                skillsButton[0].SetActive(false);
            if (skillsButton != null && skillsButton.Length > 1 && skillsButton[1] != null)
                skillsButton[1].SetActive(false);
            if (skillsPresetSwitchingSection != null)
                skillsPresetSwitchingSection.SetActive(false);
	            if (skillsMenuButton != null) skillsMenuButton.interactable = false;
	            if (skillsFillBar != null) skillsFillBar.SetActive(true);
	        }

	        switch (infinityData.goalSetter)
	        {
            case 0:
            {
                goal.text = $"{color}Goal: Create {CalcUtils.FormatNumber(10)} Bots";
                SetSkillsFill((float)Math.Min(1d, infinityData.bots / 10d));
                if (infinityData.bots >= 10)
                {
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                    infinityData.goalSetter = 1;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    if (skillsMenuButton != null && skillsMenuButton.interactable == false)
                    {
                        oracle.saveSettings.skillsButtonToggle = false;
                        skillsButton[0].SetActive(true);
                    }

                    UpdateSkills?.Invoke();
                }

                break;
            }
            case 1:
            {
                goal.text = $"{color}Goal: Build {CalcUtils.FormatNumber(5)} Assembly Lines";
                SetSkillsFill((float)(infinityData.assemblyLines[1] / 5));
                if (infinityData.assemblyLines[1] >= 5)
                {
                    infinityData.goalSetter = 2;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 2:
            {
                goal.text = $"{color}Goal: Have {CalcUtils.FormatNumber(20000)} active Panels";
                SetSkillsFill((float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000));
                if (infinityData.panelsPerSec * infinityData.panelLifetime >= 20000)
                {
                    infinityData.goalSetter = 3;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 3:
            {
                goal.text = $"{color}Goal: Own {CalcUtils.FormatNumber(20)} Planets";
                SetSkillsFill((float)(infinityData.planets[0] +
                                      (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) / 20));
                if (infinityData.planets[0] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) >= 20)
                {
                    infinityData.goalSetter = 4;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 4:
            {
                goal.text = $"{color}Goal: {CalcUtils.FormatNumber(1000000000000)} total panels decayed";

                SetSkillsFill((float)Math.Min(
                    1d,
                    infinityData.totalPanelsDecayed / 1000000000000d));
                if (infinityData.totalPanelsDecayed >= 1000000000000)
                {
                    infinityData.goalSetter = 5;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 5:
            {
                goal.text = $"{color}Goal: Surround {CalcUtils.FormatNumber(1000000000)} Stars";
                SetSkillsFill((float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 1000000000));
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 >= 1000000000)
                {
                    infinityData.goalSetter = 6;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 6:
            {
                goal.text = $"{color}Goal: Surround {CalcUtils.FormatNumber(10000000000)} Stars";
                SetSkillsFill((float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 10000000000));
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 >= 10000000000)
                {
                    infinityData.goalSetter = 7;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 7:
            {
                goal.text = $"{color}Goal: Engulf a Galaxy";
                SetSkillsFill((float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 / 1));
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 > 1)
                {
                    infinityData.goalSetter = 8;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 8:
            {
                goal.text = $"{color}Goal: Engulf {CalcUtils.FormatNumber(10)} Galaxies";
                SetSkillsFill((float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 / 10));
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 > 10)
                {
                    infinityData.goalSetter = 9;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(true);
                }

                break;
            }
            case 9:
            {
                goal.text = $"{color}Goal: Engulf {CalcUtils.FormatNumber(100)} Galaxies";
                SetSkillsFill((float)(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 / 100));
                if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000 > 100)
                {
                    infinityData.goalSetter = 10;
                    skillTreeData.skillPointsTree =
                        NumericSafety.Add(skillTreeData.skillPointsTree, 1L).Value;
                    AssignSkills?.Invoke();
                    UpdateSkills?.Invoke();
                    if (skillsFillBar != null) skillsFillBar.SetActive(false);
                }

                break;
            }
            default:
                goal.text = $"{color}Reach {CalcUtils.FormatNumber(42000000000000000000D)} Bots.";
                break;
        }
    }

    #endregion

    #region ApplyProduction

    private void CalculatePlanetsPerSecond()
    {
        ProductionSystem.CalculatePlanetsPerSecond(infinityData, skillTreeData, Time.deltaTime);
    }

    private void CalculateShouldersSkills(double time)
    {
        ProductionSystem.CalculateShouldersSkills(infinityData, skillTreeData, prestigeData, time);
    }

    private void CalculatePlanetProduction()
    {
        ProductionSystem.CalculatePlanetProduction(infinityData, skillTreeData, prestigeData, Time.deltaTime);
    }

    private void CalculateDataCenterProduction()
    {
        ProductionSystem.CalculateDataCenterProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculateServerProduction()
    {
        ProductionSystem.CalculateServerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculateManagerProduction()
    {
        ProductionSystem.CalculateManagerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculateAssemblyLineProduction()
    {
        ProductionSystem.CalculateAssemblyLineProduction(infinityData, skillTreeData, prestigeData, prestigePlus, Time.deltaTime);
    }

    private void CalculatePanelsPerSec()
    {
        ProductionSystem.CalculatePanelsPerSec(infinityData, skillTreeData, Time.deltaTime);
    }

    private void CalculateScience()
    {
        ProductionSystem.CalculateScience(infinityData, skillTreeData, Time.deltaTime);
    }

    public double ScienceToAdd() =>
        ProductionSystem.ScienceToAdd(infinityData, skillTreeData);

    private void CalculateMoney()
    {
        ProductionSystem.CalculateMoney(infinityData, skillTreeData, Time.deltaTime);
    }

    public double MoneyToAdd() =>
        ProductionSystem.MoneyToAdd(infinityData, skillTreeData);

    #endregion

    #region UpdateTextFields

    private void UpdateTextFields()
    {
        string color = "<color=#FFA45E>";
        string scienceColor = "<color=#00E1FF>";

        totalBots.text = $"Total Bots: {CalcUtils.FormatNumber(infinityData.bots, useMspace: true)}";

        //research FF5A6E
        researchPoints.text = $"<sprite=0>{CalcUtils.FormatNumber(infinityData.science, useMspace: true)}";
        sciencePerSecondText = CalcUtils.FormatNumber(ScienceToAdd(), useMspace: true);

        researchPerSec.text = $"<sprite=0>{sciencePerSecondText} /s";
        //cash
        cash.text = $"${CalcUtils.FormatNumber(infinityData.money, useMspace: true)}";
        cashPerSec.text =
            $"${CalcUtils.FormatNumber(MoneyToAdd(), useMspace: true)} /s";
        //workerPanels
        //solarStats
        if (infinityData.panelsPerSec * infinityData.panelLifetime < 20000)
            activePanels.text =
                $"Active panels: {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime)}";
        else if (infinityData.panelsPerSec * infinityData.panelLifetime / 20000 < 100000000000)
            activePanels.text =
                $"Stars Surrounded: {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime / 20000)}";
        else
            activePanels.text =
                $"Galaxies Engulfed: {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000)}";
        panelLifetime.text = $"Panel lifetime: {color}{CalcUtils.FormatNumber(infinityData.panelLifetime)}</color> seconds";
        lifetimePanels.text =
            $"Total panels decayed: {color}{CalcUtils.FormatNumber(infinityData.totalPanelsDecayed)}";
        //Lower panel
        string workers = CalcUtils.FormatNumber(infinityData.workers);

        string bots = CalcUtils.FormatNumber(Math.Floor(infinityData.bots));
        workerStats.text =
            $"{color}{workers}</color> Worker Bots producing {color}{CalcUtils.FormatNumber(infinityData.panelsPerSec)}</color> Panels /s ";
        //researcherPanels
        string scientists = CalcUtils.FormatNumber(infinityData.researchers);
        scienceStats.text =
            $"{scienceColor}{scientists}</color> Science Bots producing {scienceColor}{sciencePerSecondText}</color><sprite=0>/s ";
        DateTime saveStarted = GetSaveStartedUtc();
        DateTime saveNow = DateTime.UtcNow;
        TimeSpan saveTimespan = saveNow - saveStarted;
        double saveSeconds = saveTimespan.TotalSeconds;
        if (saveSeconds < 0) saveSeconds = 0;
        saveAge.text = $"Save age: {CalcUtils.FormatTimeLarge(saveSeconds)}";

        runAge.text = "";
        if (prestigeData.infinityPoints >= 1)
        {
            DateTime runStarted = GetRunStartUtc();
            DateTime runNow = DateTime.UtcNow;
            TimeSpan runTimespan = runNow - runStarted;
            double runSeconds = runTimespan.TotalSeconds;
            if (runSeconds < 0) runSeconds = 0;
            runAge.text = $"Run time: {CalcUtils.FormatTimeLarge(runSeconds)}";
        }


        string planetProductionDetailText = "";
        bool addPlanetLineBreak = false;
        if (skillTreeData.scientificPlanets)
        {
            planetProductionDetailText +=
                infinityData.researchers > 1
                    ? $"Scientific Planets <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.scientificPlanetsProduction)} </color>"
                    : "Scientific Planets <color=#FFA45E>+0 </color>";
            addPlanetLineBreak = true;
        }

        if (skillTreeData.stellarSacrifices)
        {
            if (addPlanetLineBreak) planetProductionDetailText += "<br>";
            addPlanetLineBreak = true;

            string stellarSacrificeText = infinityData.bots > StellarSacrificesRequiredBots() && StellarGalaxies() > 0
                ? $"<color=#FFA45E>{CalcUtils.FormatNumber(StellarGalaxies())}</color> Stellar Galaxies sacrificing <color=#FFA45E>{CalcUtils.FormatNumber(StellarSacrificesRequiredBots())}</color> Bots/s</color>"
                : infinityData.bots < StellarSacrificesRequiredBots()
                    ? $"You need <color=#FFA45E>{CalcUtils.FormatNumber(StellarSacrificesRequiredBots())}</color> Bots"
                    : "You have <color=#FFA45E>0</color> Stellar Galaxies.";
            planetProductionDetailText +=
                $"Stellar Sacrifices: {stellarSacrificeText}";
        }

        if (skillTreeData.planetAssembly)
        {
            if (addPlanetLineBreak) planetProductionDetailText += "<br>";
            addPlanetLineBreak = true;
            planetProductionDetailText +=
                $"Planet Assembly <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.planetAssemblyProduction)} </color>";
        }

        if (skillTreeData.shellWorlds)
        {
            if (addPlanetLineBreak) planetProductionDetailText += "<br>";
            addPlanetLineBreak = true;
            planetProductionDetailText +=
                $"Shell Worlds <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.shellWorldsProduction)} </color>";
        }

        /*planetProductionText.text = planetProductionDetailText;*/


        string dataCenterProductionDetailText = "";
        bool addDataCenterLineBreak = false;
        if (skillTreeData.pocketDimensions)
        {
            dataCenterProductionDetailText +=
                infinityData.workers > 1
                    ? $"Pocket Dimensions <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.pocketDimensionsWithoutAnythingElseProduction)} </color>"
                    : "Pocket Dimensions <color=#FFA45E>+0 </color>";
            addDataCenterLineBreak = true;
        }

        if (skillTreeData.pocketProtectors)
        {
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText += skillTreeData.pocketMultiverse
                ? $"Pocket Multiverse <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.pocketMultiverseProduction)} </color>"
                : $"Pocket Protectors <color=#FFA45E>+{CalcUtils.FormatNumber(infinityData.pocketProtectorsProduction)} </color>";
        }

        double multiplier = infinityData.pocketDimensionsWithoutAnythingElseProduction + (skillTreeData.pocketMultiverse
            ? infinityData.pocketMultiverseProduction
            : infinityData.pocketProtectorsProduction);
        if (skillTreeData.dimensionalCatCables)
        {
            multiplier *= 5;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Dimensional CAT Cables <color=#FFA45E>* 5 <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)}</color></color>";
        }

        if (skillTreeData.solarBubbles)
        {
            double solarBubblesMultiplier = 1 + 0.01 * infinityData.panelLifetime;
            multiplier *= solarBubblesMultiplier;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Solar Bubbles <color=#FFA45E>* {CalcUtils.FormatNumber(solarBubblesMultiplier)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }

        if (skillTreeData.pocketAndroids)
        {
            double pocketAndroidsTimer = GetSkillTimerSeconds(infinityData, "pocketAndroids");
            double pocketAndroidsMultiplier = pocketAndroidsTimer > 3564 ? 100 : 1 + pocketAndroidsTimer / 36;
            multiplier *= pocketAndroidsMultiplier;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Pocket Androids <color=#FFA45E>* {CalcUtils.FormatNumber(pocketAndroidsMultiplier)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }

        if (skillTreeData.quantumComputing)
        {
            double quantumComputingMultiplier = infinityData.quantumComputingProduction;
            multiplier *= quantumComputingMultiplier;
            if (addDataCenterLineBreak) dataCenterProductionDetailText += "<br>";
            addDataCenterLineBreak = true;
            dataCenterProductionDetailText +=
                $"Quantum Computing <color=#FFA45E>* {CalcUtils.FormatNumber(quantumComputingMultiplier)} <color=#91DD8F>= {CalcUtils.FormatNumber(multiplier)} </color></color>";
        }


        /*pocketDimensionsText.text = dataCenterProductionDetailText;*/

        string skillTimersDisplayText = "";
        const string halfHeightBreak = "<br><size=50%> </size><br>";
        const string smallTextStart = "<size=80%>";
        const string smallTextEnd = "</size>";

        skillTimersDisplayText += "<b>General</b>";
        skillTimersDisplayText +=
            $"{smallTextStart}<br>Cash Multiplier: {scienceColor}{CalcUtils.FormatNumber(MoneyMultipliers())}</color>";
        skillTimersDisplayText +=
            $"<br>Research Multiplier: {scienceColor}{CalcUtils.FormatNumber(ScienceMultipliers())}</color>";
        skillTimersDisplayText +=
            $"<br>Panel Lifetime: {CalcUtils.FormatTime(infinityData.panelLifetime, shortForm: true, mspace: false, colourOverride: scienceColor)}";

        skillTimersDisplayText +=
            $"{halfHeightBreak}Active Panels: {scienceColor}{CalcUtils.FormatNumber(infinityData.panelsPerSec * infinityData.panelLifetime)}</color>";
        skillTimersDisplayText +=
            $"<br>Stars Surrounded: {scienceColor}{CalcUtils.FormatNumber(StarsSurrounded(false, false))}</color>";
        skillTimersDisplayText +=
            $"<br>Galaxies Engulfed: {scienceColor}{CalcUtils.FormatNumber(GalaxiesEngulfed(false, false))}</color>{smallTextEnd}";

        double secondsPerIp = oracle.saveSettings.lastInfinityPointsGained > 0
            ? oracle.saveSettings.timeLastInfinity / oracle.saveSettings.lastInfinityPointsGained
            : 0;

        skillTimersDisplayText += "<br><br><b>Infinity</b>";
        skillTimersDisplayText +=
            $"<br>{smallTextStart}s/IP: {CalcUtils.FormatTime(secondsPerIp, showDecimal: true, shortForm: true, mspace: false, colourOverride: scienceColor)}{smallTextEnd}";
        skillTimersDisplayText += $"{halfHeightBreak}{smallTextStart}<b>Run Time</b>";
        skillTimersDisplayText +=
            $"<br>Current: {CalcUtils.FormatTime(CurrentRunTime(), showDecimal: true, shortForm: true, mspace: false, colourOverride: scienceColor)}";
        skillTimersDisplayText +=
            $"<br>Previous: {CalcUtils.FormatTime(oracle.saveSettings.timeLastInfinity, showDecimal: true, shortForm: true, mspace: false, colourOverride: scienceColor)}{smallTextEnd}";

        skillTimersDisplayText += $"{halfHeightBreak}{smallTextStart}<b>Offline Time Used</b>";
        skillTimersDisplayText +=
            $"<br>Current: {CalcUtils.FormatTime(oracle.saveSettings.offlineTimeUsedThisInfinity, shortForm: true, mspace: false, colourOverride: scienceColor)}";
        skillTimersDisplayText +=
            $"<br>Previous: {CalcUtils.FormatTime(oracle.saveSettings.offlineTimeUsedPreviousInfinity, shortForm: true, mspace: false, colourOverride: scienceColor)}{smallTextEnd}<br>";

        skillTimersDisplayText += "<br><b>Skills</b>";

        if (skillTreeData.androids)
        {
            double androidsTimer = GetSkillTimerSeconds(infinityData, "androids");
            skillTimersDisplayText +=
                $"<br>{smallTextStart}<b>Androids</b>: {CalcUtils.FormatTime(androidsTimer >= 600 ? 600 : androidsTimer, shortForm: true, mspace: false, colourOverride: scienceColor)}<br>Granting: {scienceColor}{CalcUtils.FormatNumber(Math.Floor(androidsTimer > 600 ? 200 : androidsTimer / 3))}</color>s Lifetime.{smallTextEnd}";
        }

        if (skillTreeData.pocketAndroids)
        {
            double pocketAndroidsTimer = GetSkillTimerSeconds(infinityData, "pocketAndroids");
            skillTimersDisplayText +=
                $"<br>{smallTextStart}<b>Pocket Androids</b>: {CalcUtils.FormatTime(pocketAndroidsTimer >= 3600 ? 3600 : pocketAndroidsTimer, shortForm: true, mspace: false, colourOverride: scienceColor)}<br>Multiplying Data Center Production by: {scienceColor}{CalcUtils.FormatNumber(pocketAndroidsTimer > 3564 ? 100 : 1 + pocketAndroidsTimer / 36)}</color>.{smallTextEnd}";
        }

        if (skillTreeData.superRadiantScattering)
        {
            double scatteringTimer = GetSkillTimerSeconds(infinityData, "superRadiantScattering");
            skillTimersDisplayText +=
                $"<br>{smallTextStart}<b>Scattering</b>: {CalcUtils.FormatTime(scatteringTimer, shortForm: true, mspace: false, colourOverride: scienceColor)}<br>Multiplying All Production by: {scienceColor}{CalcUtils.FormatNumber(1 + 0.01f * scatteringTimer)}</color>.{smallTextEnd}";
        }


        if (skillTimersText != null)
            skillTimersText.text = skillTimersDisplayText;
    }

    #endregion

    #endregion

    #region Modifier Calcs

    public void CalculateModifiers()
    {
        UpdateSciencePerSec();
        UpdateMoneyPerSecMulti();
        UpdateAssemblyLineMulti();
        UpdateManagerMulti();
        UpdateServerMulti();
        UpdateDataCenterMulti();
        UpdatePlanetMulti();
        SecretBuffs();
        UpdatePanelLifetime();
    }

    private void SecretBuffs()
    {
        ModifierSystem.SecretBuffs(infinityData, prestigeData, _secretBuffState);
    }


    public void UpdatePanelLifetime()
    {
        ModifierSystem.UpdatePanelLifetime(infinityData, skillTreeData, prestigeData, prestigePlus);
    }

    private void UpdatePlanetMulti()
    {
        ModifierSystem.UpdatePlanetMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateDataCenterMulti()
    {
        ModifierSystem.UpdateDataCenterMulti(infinityData, skillTreeData, prestigeData, prestigePlus, maxInfinityBuff);
    }

    private void UpdateServerMulti()
    {
        ModifierSystem.UpdateServerMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateManagerMulti()
    {
        ModifierSystem.UpdateManagerMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateAssemblyLineMulti()
    {
        ModifierSystem.UpdateAssemblyLineMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState, maxInfinityBuff);
    }

    private void UpdateSciencePerSec()
    {
        ModifierSystem.UpdateSciencePerSec(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    private void UpdateMoneyPerSecMulti()
    {
        ModifierSystem.UpdateMoneyPerSecMulti(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    #endregion

    #region CalculationFunctions

    private double StellarGalaxies()
    {
        double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, Time.deltaTime);
        return ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
    }

    private double StellarSacrificesRequiredBots()
    {
        double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, Time.deltaTime);
        return ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);
    }

    public double GalaxiesEngulfed(bool multipliedByDeltaTime = false, bool floored = true)
    {
        return ProductionMath.GalaxiesEngulfed(infinityData, multipliedByDeltaTime, floored, Time.deltaTime);
    }

    public double StarsSurrounded(bool multipliedByDeltaTime = false, bool floored = true)
    {
        return ProductionMath.StarsSurrounded(infinityData, multipliedByDeltaTime, floored, Time.deltaTime);
    }

    private double GlobalBuff()
    {
        return ModifierSystem.GlobalBuff(infinityData, skillTreeData, prestigePlus);
    }

    private double AmountForBuildingBoostAfterX()
    {
        return ProductionMath.AmountForBuildingBoostAfterX(skillTreeData);
    }

    private double DivisionForBoostAfterX()
    {
        return ProductionMath.DivisionForBoostAfterX(skillTreeData);
    }

    private double MoneyMultipliers()
    {
        if (GlobalStatPipeline.TryCalculateMoneyMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState,
                out StatResult result))
        {
            return result.Value;
        }

        return ModifierSystem.MoneyMultipliers(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    private double ScienceMultipliers()
    {
        if (GlobalStatPipeline.TryCalculateScienceMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState,
                out StatResult result))
        {
            return result.Value;
        }

        return ModifierSystem.ScienceMultipliers(infinityData, skillTreeData, prestigeData, prestigePlus, _secretBuffState);
    }

    #endregion
}
