using System;
using System.Collections;
using System.Collections.Generic;
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
using IdleDysonSwarm.Services;
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
    private const int MaximumCanonicalOfflineBurstTicks = 4096;
    private const int MaximumExactDreamBurstTicks = 65536;
    private const double CanonicalOfflineBurstBudgetMilliseconds = 3d;
    private double _simulationAccumulator;
    private double _activeAutomationTimeUntilNextEvent =
        SimulationTickSeconds;
    private double _activeUnprocessedSeconds;
    private double _activeInfinityCycleSeconds;
    private double _activeSimulationBoundaryRemaining = 1d / 60d;
    private bool _activeAtPostResetStart;
    private OfflineInfinityCycleState _activeInfinityCycleState;
    private DreamDoubleTimeTick _pendingDreamDoubleTimeTick;
    private RealityAdvanceResult _pendingRealityAdvance;
    private double _pendingIntervalSeconds;
    private bool _pendingDreamEngineeringCompleteAtStart;
    private bool _botCapHandledAtBoundary;
    private bool _botCapSpecialRewardGrantedAtBoundary;
    private bool _offlineBreakTargetOverrideActive;
    private long _offlineBreakTargetOverride;
    private bool _storedTimeCancellationRequested;
    private bool _storedTimeJobRunning;
    private bool _unifiedAccelerationEnabled = true;
    private bool _sampledInfinityProjectionEnabled = true;
    private string _returnScreenConfirmDefaultText;
    private readonly List<SimulationQueuedInput> _queuedSimulationInputs =
        new();
    private readonly Dictionary<string, Action> _queuedPlayerActions =
        new();
    private static GameManager _activeSimulationInstance;
    public static event Action<long> BreakTargetChangeRequested;
#if UNITY_EDITOR
    public static string CanonicalSampledBlockTrace {
        get;
        private set;
    }
    public static long CanonicalSampledBlockCount {
        get;
        private set;
    }
#endif
    [SerializeField] private BotsAutoBuy botsAutoBuy;
    [SerializeField] private ResearchAutoBuy researchAutoBuy;
    [SerializeField] private FoundationalEraManager foundationalEraManager;
    [SerializeField] private InformationEraManager informationEraManager;
    [SerializeField] private SpaceAgeManager spaceAgeManager;
    [SerializeField] private DoubleTimeManager doubleTimeManager;
    [SerializeField] private SimulationPrestigeManager simulationPrestigeManager;
    private IWorkerService _workerService;

    private sealed class OfflineInfinityCycleState
    {
        private const int FastCanonicalSampleWindowSize = 12;
        private const int FastCanonicalSampleGroupSize = 4;
        private const int SlowCanonicalSampleWindowSize = 24;
        private const int SlowCanonicalSampleGroupSize = 8;
        private const int SlowCanonicalRefreshGroupSize = 4;
        private readonly List<InfinityCycleSample> _samples =
            new(SlowCanonicalSampleWindowSize);
        private InfinityCycleSample _latestCanonicalSample;
        private bool _hasLatestCanonicalSample;
        private bool _hasProjectionCheckpoint;
        private double _expectedCheckpointDurationSeconds;
        private long _expectedCheckpointReward;
        private double _checkpointTolerance;
        private bool _useShortSlowRefreshWindow;
        private readonly AdaptiveProjectionCheckpointFeedback
            _checkpointFeedback = new();

        public OfflineInfinityCycleState(
            bool breakTheLoop,
            long capturedBreakTarget,
            long startingInfinityPoints,
            bool hasPostResetStart = false,
            long cycleStartingInfinityPoints = 0L,
            double secondsInCurrentCycle = 0d)
        {
            BreakTheLoop = breakTheLoop;
            CapturedBreakTarget = Math.Max(1L, capturedBreakTarget);
            HasPostResetStart = hasPostResetStart;
            CycleStartingInfinityPoints = hasPostResetStart
                ? Math.Max(0L, cycleStartingInfinityPoints)
                : Math.Max(0L, startingInfinityPoints);
            SecondsInCurrentCycle =
                NumericSafety.IsFinite(secondsInCurrentCycle) &&
                secondsInCurrentCycle >= 0d
                    ? secondsInCurrentCycle
                    : 0d;
        }

        public bool BreakTheLoop { get; }
        public long CapturedBreakTarget { get; private set; }
        public bool HasPostResetStart { get; private set; }
        public long CycleStartingInfinityPoints { get; private set; }
        public double SecondsInCurrentCycle { get; private set; }
        public bool IsAtPostResetStart =>
            HasPostResetStart && SecondsInCurrentCycle <= 1e-12d;
        public double ProjectionGrowthAdjustment =>
            _checkpointFeedback.GrowthAdjustment;
        public double LastCheckpointError =>
            _checkpointFeedback.LastError;

        public void SetCapturedBreakTarget(long target)
        {
            long normalized = Math.Max(1L, target);
            if (CapturedBreakTarget == normalized)
                return;
            CapturedBreakTarget = normalized;
            InvalidateProjectionEvidence();
        }

        public void InvalidateProjectionEvidence()
        {
            _samples.Clear();
            _latestCanonicalSample = default;
            _hasLatestCanonicalSample = false;
            _hasProjectionCheckpoint = false;
            _expectedCheckpointDurationSeconds = 0d;
            _expectedCheckpointReward = 0L;
            _checkpointTolerance = 0d;
            _useShortSlowRefreshWindow = false;
            _checkpointFeedback.Reset();
        }

        public void SynchronizeBeforeFirstTick(
            long currentInfinityPoints)
        {
            if (HasPostResetStart || SecondsInCurrentCycle > 1e-12d)
                return;
            CycleStartingInfinityPoints =
                Math.Max(0L, currentInfinityPoints);
        }

        public void AddElapsed(double seconds)
        {
            if (!NumericSafety.IsFinite(seconds) || seconds <= 0d)
                return;
            SecondsInCurrentCycle = NumericSafety.Add(
                SecondsInCurrentCycle,
                seconds).Value;
        }

        public bool ObservePotentialReset(
            long currentInfinityPoints,
            out double completedDurationSeconds,
            out long completedReward)
        {
            return ObserveReset(
                currentInfinityPoints,
                currentInfinityPoints > CycleStartingInfinityPoints,
                out completedDurationSeconds,
                out completedReward);
        }

        public bool ObserveReset(
            long currentInfinityPoints,
            bool resetCompleted,
            out double completedDurationSeconds,
            out long completedReward)
        {
            completedDurationSeconds = 0d;
            completedReward = 0L;
            currentInfinityPoints = Math.Max(0L, currentInfinityPoints);
            if (!resetCompleted)
                return false;

            bool completedFullCycle =
                HasPostResetStart && SecondsInCurrentCycle > 0d;
            if (completedFullCycle)
            {
                long reward = Math.Max(
                    0L,
                    currentInfinityPoints - CycleStartingInfinityPoints);
                completedDurationSeconds = SecondsInCurrentCycle;
                completedReward = reward;
                // Saturated IP still completes reset cycles, but a zero-grant
                // sample cannot establish the pre-cap varying-IP recurrence.
                if (reward > 0L)
                {
                    long completedDurationTicks = Math.Max(
                        1L,
                        NumericSafety.ToLongFloor(
                            Math.Ceiling(
                                SecondsInCurrentCycle /
                                SimulationTickSeconds)).Value);
                    _samples.Add(new InfinityCycleSample(
                        CycleStartingInfinityPoints,
                        reward,
                        completedDurationTicks,
                        SecondsInCurrentCycle));
                    _latestCanonicalSample = _samples[_samples.Count - 1];
                    _hasLatestCanonicalSample = true;
                    if (_samples.Count >
                        SlowCanonicalSampleWindowSize)
                        _samples.RemoveAt(0);
                }
            }

            HasPostResetStart = true;
            CycleStartingInfinityPoints = currentInfinityPoints;
            SecondsInCurrentCycle = 0d;
            return completedFullCycle;
        }

        public bool TryGetSamples(
            out InfinityCycleSample first,
            out InfinityCycleSample second,
            out InfinityCycleSample third)
        {
            if (_samples.Count < 3)
            {
                first = default;
                second = default;
                third = default;
                return false;
            }

            int start = _samples.Count - 3;
            first = _samples[start];
            second = _samples[start + 1];
            third = _samples[start + 2];
            return true;
        }

        public bool TryGetSmoothedSamples(
            out InfinityCycleSample first,
            out InfinityCycleSample second,
            out InfinityCycleSample third)
        {
            bool crossesAutomationEvents =
                _samples.Count > 0 &&
                _samples[_samples.Count - 1].DurationSeconds >=
                    SimulationTickSeconds - 1e-12d;
            int windowSize = crossesAutomationEvents
                ? _useShortSlowRefreshWindow
                    ? SlowCanonicalSampleGroupSize * 2 +
                      SlowCanonicalRefreshGroupSize
                    : SlowCanonicalSampleWindowSize
                : FastCanonicalSampleWindowSize;
            int anchorGroupSize = crossesAutomationEvents
                ? SlowCanonicalSampleGroupSize
                : FastCanonicalSampleGroupSize;
            if (_samples.Count < windowSize)
            {
                first = default;
                second = default;
                third = default;
                return false;
            }

            int start = _samples.Count - windowSize;
            int endpointGroupSize =
                crossesAutomationEvents &&
                _useShortSlowRefreshWindow
                    ? SlowCanonicalRefreshGroupSize
                    : anchorGroupSize;
            first = AverageSampleGroup(start, anchorGroupSize);
            second = AverageSampleGroup(
                start + anchorGroupSize,
                anchorGroupSize);
            third = AverageSampleGroup(
                start + anchorGroupSize * 2,
                endpointGroupSize);
            EvaluateProjectionCheckpoint(third);
            return true;
        }

        private void EvaluateProjectionCheckpoint(
            InfinityCycleSample observed)
        {
            if (!_hasProjectionCheckpoint)
                return;

            _checkpointFeedback.Observe(
                _expectedCheckpointDurationSeconds,
                _expectedCheckpointReward,
                observed.DurationSeconds,
                observed.Reward,
                _checkpointTolerance);

            _hasProjectionCheckpoint = false;
        }

        private InfinityCycleSample AverageSampleGroup(
            int startIndex,
            int groupSize)
        {
            long rewardTotal = 0L;
            double durationTotal = 0d;
            for (int offset = 0;
                 offset < groupSize;
                 offset++)
            {
                InfinityCycleSample sample =
                    _samples[startIndex + offset];
                rewardTotal = NumericSafety.Add(
                    rewardTotal,
                    sample.Reward).Value;
                durationTotal = NumericSafety.Add(
                    durationTotal,
                    sample.DurationSeconds).Value;
            }

            int representativeIndex =
                startIndex + groupSize / 2;
            long averageReward = Math.Max(
                1L,
                NumericSafety.ToLongFloor(
                    Math.Round(
                        (double)rewardTotal /
                        groupSize)).Value);
            double averageDuration =
                durationTotal / groupSize;
            return new InfinityCycleSample(
                _samples[representativeIndex]
                    .StartingInfinityPoints,
                averageReward,
                Math.Max(
                    1L,
                    NumericSafety.ToLongFloor(
                        Math.Ceiling(
                            averageDuration /
                            SimulationTickSeconds)).Value),
                averageDuration);
        }

        public bool TryGetLatestCanonicalSample(
            out InfinityCycleSample sample)
        {
            sample = _latestCanonicalSample;
            return _hasLatestCanonicalSample;
        }

        public void AcceptProjection(long finalInfinityPoints)
        {
            HasPostResetStart = true;
            CycleStartingInfinityPoints =
                Math.Max(0L, finalInfinityPoints);
            SecondsInCurrentCycle = 0d;
            _samples.Clear();
        }

        public void AcceptProjection(
            InfinityCycleProjection projection)
        {
            HasPostResetStart = true;
            CycleStartingInfinityPoints = Math.Max(
                0L,
                projection.FinalInfinityPoints);
            SecondsInCurrentCycle = 0d;

            long syntheticStart = Math.Max(
                0L,
                projection.FinalInfinityPoints -
                projection.LastReward);
            long durationTicks = Math.Max(
                1L,
                NumericSafety.ToLongFloor(
                    Math.Ceiling(
                        projection.LastDurationSeconds /
                        SimulationTickSeconds)).Value);
            _samples.Add(new InfinityCycleSample(
                syntheticStart,
                projection.LastReward,
                durationTicks,
                projection.LastDurationSeconds));
            while (_samples.Count > SlowCanonicalSampleWindowSize)
                _samples.RemoveAt(0);
        }

        public void RequireCanonicalResampling(
            InfinityCycleProjection projection,
            double checkpointTolerance)
        {
            // ApplyAdaptiveInfinityProjection records one synthetic endpoint
            // sample. Discard it: only genuine shared-engine cycles may
            // validate the next block. Retain the last two canonical groups
            // and collect one fresh group at the new IP level. This makes a
            // successful run sample -> project -> resample without paying the
            // full phase warm-up after every accepted block.
            if (_samples.Count > 0)
                _samples.RemoveAt(_samples.Count - 1);
            bool crossesAutomationEvents =
                projection.LastDurationSeconds >=
                    SimulationTickSeconds - 1e-12d;
            int retainedSamples = crossesAutomationEvents
                ? SlowCanonicalSampleGroupSize * 2
                : FastCanonicalSampleGroupSize * 2;
            while (_samples.Count > retainedSamples)
                _samples.RemoveAt(0);
            _hasLatestCanonicalSample = false;
            _latestCanonicalSample = default;
            _expectedCheckpointDurationSeconds =
                projection.LastDurationSeconds;
            _expectedCheckpointReward =
                Math.Max(1L, projection.LastReward);
            _checkpointTolerance =
                NumericSafety.IsFinite(checkpointTolerance) &&
                checkpointTolerance > 0d
                    ? checkpointTolerance
                    : 0.01d;
            _hasProjectionCheckpoint = true;
            _useShortSlowRefreshWindow =
                crossesAutomationEvents;
        }

        public void RejectSampledProjection()
        {
            // The sampled recurrence did not validate. Do not fall through
            // to a different approximate model using the same noisy state.
            // Drop the oldest group, retain the two newest genuine groups,
            // and gather one fresh group before retrying. Authored signature
            // changes invalidate the state separately.
            bool crossesAutomationEvents =
                _samples.Count > 0 &&
                _samples[_samples.Count - 1].DurationSeconds >=
                    SimulationTickSeconds - 1e-12d;
            int retainedSamples = crossesAutomationEvents
                ? SlowCanonicalSampleGroupSize * 2
                : FastCanonicalSampleGroupSize * 2;
            while (_samples.Count > retainedSamples)
                _samples.RemoveAt(0);
            _hasLatestCanonicalSample = false;
            _latestCanonicalSample = default;
            if (crossesAutomationEvents)
                _useShortSlowRefreshWindow = true;
        }
    }
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

    private void SetSkillsFill(double fill)
    {
        float adapterValue = NumericSafety.ToFloat(
            Math.Min(
                1d,
                NumericSafety.ClampContinuous(fill))).Value;
        if (_skillsFillProcedural != null)
            _skillsFillProcedural.fillAmount = adapterValue;
        else if (skillsFill != null)
            skillsFill.fillAmount = adapterValue;
    }

    private double ActivePanelCount()
    {
        return NumericSafety.Multiply(
            infinityData.panelsPerSec,
            infinityData.panelLifetime).Value;
    }

    #region Main

    #region Initialization

    public void UpdateSkillsInvoke()
    {
        UpdateSkills?.Invoke();
    }

    public void AutoAssignSkillsInvoke(
        bool updatePresentation = true)
    {
        if (updatePresentation)
        {
            AssignSkills?.Invoke();
        }
        else
        {
            oracle.AutoAssignSkillsWithoutPresentation();
        }
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
        ServiceLocator.TryGet(out _workerService);
        if (returnScreenConfirmButton != null)
        {
            returnScreenConfirmButton.onClick.AddListener(
                CancelStoredTimeProcessing);
            TMP_Text label =
                returnScreenConfirmButton.GetComponentInChildren<TMP_Text>();
            _returnScreenConfirmDefaultText = label != null
                ? label.text
                : null;
        }
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
        // Stored-time simulation owns an isolated candidate save while this
        // flag is set. Advancing the published save in parallel would either
        // be lost when the candidate is committed or overwrite the candidate
        // when the next coroutine slice swaps state. The return screen is a
        // deliberate simulation pause until that transaction commits,
        // cancels, or fails.
        if (_storedTimeJobRunning)
            return;

        double elapsed = NumericSafety.IsFinite(Time.deltaTime)
            ? Math.Max(0d, Time.deltaTime)
            : 0d;
        AdvanceActiveSimulation(
            elapsed,
            processingBudgetMilliseconds: 2d,
            refreshPresentation: true);
    }

    private SimulationAdvanceResult AdvanceActiveSimulation(
        double elapsed,
        double processingBudgetMilliseconds,
        bool refreshPresentation)
    {
        _activeUnprocessedSeconds = NumericSafety.Add(
            _activeUnprocessedSeconds,
            elapsed).Value;
        if (_activeUnprocessedSeconds <= 0d) return null;

        var model = new RuntimeEventTimeModel(
            this,
            GetActiveInfinityCycleState());
        SimulationAdvanceResult result =
            UnifiedEventTimeSimulation.Advance(
                new SimulationAdvanceRequest
                {
                    StartingState = model,
                    DurationSeconds = _activeUnprocessedSeconds,
                    Mode = SimulationAdvanceMode.Active,
                    AutomationPolicy =
                        SimulationAutomationPolicy.PreserveConfiguredMode,
                    AutomationIntervalSeconds = SimulationTickSeconds,
                    AutomationTimeUntilNextEvent =
                        _activeAutomationTimeUntilNextEvent,
                    InfinityMinimumCycleSeconds = 1d / 60d,
                    ProcessingBudgetMilliseconds =
                        processingBudgetMilliseconds,
                    AllowAcceleration = true,
                    CloneStartingState = false,
                    ProcessPartialEndpoint = false,
                    QueuedInputs = _queuedSimulationInputs
                });
        AdvanceQueuedInputTimes(result.ConsumedSeconds);
        _activeUnprocessedSeconds = result.RemainingSeconds;
        _activeAutomationTimeUntilNextEvent =
            result.AutomationTimeUntilNextEvent;
        if (refreshPresentation)
            RefreshSimulationPresentation();
        return result;
    }

#if UNITY_EDITOR
    public SimulationAdvanceResult AdvanceActiveSimulationForTests(
        double elapsed)
    {
        return AdvanceActiveSimulation(
            elapsed,
            processingBudgetMilliseconds: 0d,
            refreshPresentation: false);
    }

    public SimulationAdvanceResult AdvanceActiveSimulationForTests(
        double elapsed,
        double processingBudgetMilliseconds)
    {
        return AdvanceActiveSimulation(
            elapsed,
            processingBudgetMilliseconds,
            refreshPresentation: false);
    }

    public void ResetActiveSimulationForTests()
    {
        _activeAutomationTimeUntilNextEvent =
            SimulationTickSeconds;
        _activeUnprocessedSeconds = 0d;
        _activeInfinityCycleSeconds = 0d;
        _activeSimulationBoundaryRemaining = 1d / 60d;
        _activeAtPostResetStart = false;
        _activeInfinityCycleState = null;
        _queuedSimulationInputs.Clear();
        _queuedPlayerActions.Clear();
    }
#endif

    private void OnEnable()
    {
        _activeSimulationInstance = this;
        AwayFor += ApplyReturnValues;
        BreakTargetChangeRequested += QueueBreakTargetChange;
    }

    private void OnDisable()
    {
        if (_activeSimulationInstance == this)
            _activeSimulationInstance = null;
        _queuedPlayerActions.Clear();
        _queuedSimulationInputs.Clear();
        AwayFor -= ApplyReturnValues;
        BreakTargetChangeRequested -= QueueBreakTargetChange;
    }

    public static void RequestBreakTargetChange(long target)
    {
        BreakTargetChangeRequested?.Invoke(Math.Max(1L, target));
    }

    public static bool RequestQueuedPlayerAction(
        SimulationInputKind kind,
        Action action,
        string stableId)
    {
        if (_activeSimulationInstance == null || action == null)
            return false;
        _activeSimulationInstance.QueuePlayerAction(
            kind,
            action,
            stableId);
        return true;
    }

    private void QueueBreakTargetChange(long target)
    {
        _queuedSimulationInputs.Add(
            new SimulationQueuedInput(
                0d,
                SimulationInputKind.BreakTarget,
                discreteValue: Math.Max(1L, target),
                id: "break_target"));
        _queuedSimulationInputs.Sort(
            (left, right) => left.Time.CompareTo(right.Time));
    }

    private OfflineInfinityCycleState GetActiveInfinityCycleState()
    {
        bool breakTheLoop = prestigePlus.breakTheLoop;
        long target = CurrentBreakInfinityTarget();
        if (_activeInfinityCycleState == null ||
            _activeInfinityCycleState.BreakTheLoop !=
            breakTheLoop)
        {
            _activeInfinityCycleState =
                new OfflineInfinityCycleState(
                    breakTheLoop,
                    target,
                    prestigeData.infinityPoints,
                    _activeAtPostResetStart,
                    prestigeData.infinityPoints,
                    _activeInfinityCycleSeconds);
        }
        else
        {
            _activeInfinityCycleState.SetCapturedBreakTarget(
                target);
        }
        return _activeInfinityCycleState;
    }

    private void QueuePlayerAction(
        SimulationInputKind kind,
        Action action,
        string stableId)
    {
        string id =
            $"{stableId ?? kind.ToString()}:{Guid.NewGuid():N}";
        _queuedPlayerActions[id] = action;
        _queuedSimulationInputs.Add(
            new SimulationQueuedInput(
                0d,
                kind,
                id: id));
        _queuedSimulationInputs.Sort(
            (left, right) => left.Time.CompareTo(right.Time));
    }

    private void ApplyQueuedPlayerAction(SimulationQueuedInput input)
    {
        if (string.IsNullOrEmpty(input.Id) ||
            !_queuedPlayerActions.TryGetValue(
                input.Id,
                out Action action))
        {
            return;
        }

        _queuedPlayerActions.Remove(input.Id);
        action();
    }

    private void AdvanceQueuedInputTimes(double consumedSeconds)
    {
        if (consumedSeconds <= 0d ||
            _queuedSimulationInputs.Count == 0)
            return;
        for (int index = _queuedSimulationInputs.Count - 1;
             index >= 0;
             index--)
        {
            SimulationQueuedInput input =
                _queuedSimulationInputs[index];
            if (input.Time <= consumedSeconds + 1e-12d)
            {
                _queuedSimulationInputs.RemoveAt(index);
                continue;
            }
            _queuedSimulationInputs[index] =
                new SimulationQueuedInput(
                    input.Time - consumedSeconds,
                    input.Kind,
                    input.DiscreteValue,
                    input.ContinuousValue,
                    input.Id);
        }
        _queuedSimulationInputs.Sort(
            (left, right) => left.Time.CompareTo(right.Time));
    }

    private bool RunSimulationTick()
    {
        return RunSimulationTick(forceOfflineBuyMax: false);
    }

    private bool RunSimulationTick(bool forceOfflineBuyMax)
    {
        return RunSimulationStep(
            SimulationTickSeconds,
            runAutomation: true,
            forceOfflineBuyMax: forceOfflineBuyMax,
            updatePresentation: !forceOfflineBuyMax);
    }

    private bool RunSimulationRemainder(double deltaSeconds)
    {
        if (!NumericSafety.IsFinite(deltaSeconds) ||
            deltaSeconds <= 0d ||
            deltaSeconds >= SimulationTickSeconds)
        {
            return false;
        }

        return RunSimulationStep(
            deltaSeconds,
            runAutomation: false,
            forceOfflineBuyMax: true,
            updatePresentation: false);
    }

    private bool RunSimulationStep(
        double deltaSeconds,
        bool runAutomation,
        bool forceOfflineBuyMax,
        bool updatePresentation)
    {
        BeginSimulationInterval(deltaSeconds);
        if (runAutomation)
        {
            RunSimulationAutomation(
                forceOfflineBuyMax
                    ? SimulationAutomationPolicy.ForceBuyMax
                    : SimulationAutomationPolicy.PreserveConfiguredMode);
        }
        CompleteSimulationInterval(updatePresentation);
        EvaluateDreamTransition(updatePresentation);
        EvaluateBotCapTransition();
        return EvaluateInfinityTransition();
    }

    private void BeginSimulationInterval(double deltaSeconds)
    {
        _pendingIntervalSeconds = deltaSeconds;
        _pendingDreamEngineeringCompleteAtStart =
            oracle.saveSettings.sdSimulation.engineeringComplete;
        _pendingDreamDoubleTimeTick = doubleTimeManager != null
            ? doubleTimeManager.PrepareSimulationTick(deltaSeconds)
            : DreamDoubleTimeMath.Prepare(
                oracle.saveSettings.sdPrestige.doubleTimeOwned,
                oracle.saveSettings.sdPrestige.doubleTime,
                oracle.saveSettings.sdPrestige.doubleTimeRate,
                deltaSeconds);
        if (doubleTimeManager == null)
            oracle.saveSettings.sdPrestige.doDoubleTime =
                _pendingDreamDoubleTimeTick.Active;

        SetBotDistribution();
        ProductionSystem.CalculateProduction(
            infinityData,
            skillTreeData,
            prestigeData,
            prestigePlus,
            deltaSeconds,
            recomputeDerivedState: false);

        // Run downstream eras first. Combined with each manager's local input
        // snapshot, this prevents newly produced facilities from working until
        // the next logical tick.
        spaceAgeManager?.RunProductionTick(
            _pendingDreamDoubleTimeTick.EffectiveMultiplier,
            deltaSeconds,
            updatePresentation: false);
        informationEraManager?.RunProductionTick(
            _pendingDreamDoubleTimeTick.EffectiveMultiplier,
            deltaSeconds,
            updatePresentation: false);
        foundationalEraManager?.RunProductionTick(
            _pendingDreamEngineeringCompleteAtStart,
            _pendingDreamDoubleTimeTick.EffectiveMultiplier,
            deltaSeconds,
            updatePresentation: false);

        if (_workerService == null)
            ServiceLocator.TryGet(out _workerService);
        _pendingRealityAdvance = _workerService != null
            ? _workerService.AdvanceSimulation(deltaSeconds)
            : default;
    }

    private void RunSimulationAutomation(
        SimulationAutomationPolicy policy)
    {
        _activeAtPostResetStart = false;
        bool forceBuyMax =
            policy == SimulationAutomationPolicy.ForceBuyMax;
        botsAutoBuy?.RunAutomationTick(forceBuyMax);
        researchAutoBuy?.RunAutomationTick(forceBuyMax);
        foundationalEraManager?.RunAutomationTick();
        informationEraManager?.RunAutomationTick();
        spaceAgeManager?.RunAutomationTick();
    }

    private void CompleteSimulationInterval(bool updatePresentation)
    {
        ProductionSystem.RecalculateDerivedState(
            infinityData,
            skillTreeData,
            prestigeData,
            prestigePlus);
        foundationalEraManager?.CompleteSimulationTick(updatePresentation);
        informationEraManager?.CompleteSimulationTick(updatePresentation);
        spaceAgeManager?.CompleteSimulationTick(updatePresentation);

        if (doubleTimeManager != null)
        {
            doubleTimeManager.CompleteSimulationTick(
                _pendingDreamDoubleTimeTick);
        }
        else
        {
            Oracle.SaveDataPrestige dreamPrestige =
                oracle.saveSettings.sdPrestige;
            if (!NumericSafety.IsFinite(dreamPrestige.doubleTime))
                dreamPrestige.doubleTime = 0d;
            dreamPrestige.doubleTime = Math.Max(
                0d,
                dreamPrestige.doubleTime -
                _pendingDreamDoubleTimeTick.BankConsumed);
            dreamPrestige.doDoubleTime =
                dreamPrestige.doubleTimeOwned && dreamPrestige.doubleTime > 0d;
        }

        SimulationStatistics statistics =
            oracle.saveSettings.simulationStatistics;
        if (statistics != null)
        {
            statistics.RecordSegment(
                _pendingIntervalSeconds,
                new SimulationPresentationSummary
                {
                    RealityWorkers =
                        _pendingRealityAdvance.WorkersGenerated,
                    AutomaticInfluence =
                        _pendingRealityAdvance.AutomaticInfluence,
                    RealityCapacityStallSeconds =
                        _pendingRealityAdvance.StalledSeconds
                });
        }
    }

    private bool EvaluateDreamTransition(bool updatePresentation)
    {
        return simulationPrestigeManager != null &&
               simulationPrestigeManager.EvaluateSimulationTransitions(
                   updatePresentation);
    }

    private double TimeToNextDreamMaterialEvent(
        double maximumSeconds)
    {
        if (!TryGetDreamOfflineTiming(out DreamOfflineTiming timing))
            return maximumSeconds;
        return DreamAnalyticalOfflineSimulation
            .GetNextMaterialEventSeconds(
                oracle.saveSettings.sdSimulation,
                oracle.saveSettings.sdPrestige,
                timing,
                maximumSeconds);
    }

    private void EvaluateBotCapTransition()
    {
        _botCapHandledAtBoundary =
            oracle.ProcessBotCapTransitionWithOutcome(
                out _botCapSpecialRewardGrantedAtBoundary);
    }

    private bool EvaluateInfinityTransition(
        double simulatedCycleSeconds = -1d,
        bool updatePresentation = false)
    {
        if (_botCapHandledAtBoundary) return false;
        ManageGoal();
        double amount = prestigePlus.divisionsPurchased > 0
            ? 4.2e19 / Math.Pow(10, prestigePlus.divisionsPurchased)
            : 4.2e19;
        if (prestigePlus.breakTheLoop)
        {
            if (oracle.saveSettings.infinityInProgress) return false;

            long projectedGain = StaticMethods.InfinityPointsToGain(amount, infinityData.bots);
            if (oracle.saveSettings.doubleIp)
                projectedGain = NumericSafety.Add(projectedGain, projectedGain).Value;
            if (prestigePlus.doubleIP)
                projectedGain = NumericSafety.Add(projectedGain, projectedGain).Value;
            long threshold = CurrentBreakInfinityTarget();
            if (projectedGain < threshold) return false;

            oracle.saveSettings.infinityInProgress = true;
            Prestige(
                simulatedCycleSeconds,
                updatePresentation);
            return true;
        }

        if (infinityData.bots < amount) return false;
        oracle.saveSettings.infinityInProgress = true;
        Prestige(
            simulatedCycleSeconds,
            updatePresentation);
        return true;
    }

    // Compatibility seam for save-recovery characterization and older scene
    // tooling. Authoritative runtime ordering is owned by the event scheduler.
    private void EvaluateSimulationTransitions()
    {
        EvaluateDreamTransition(updatePresentation: false);
        EvaluateBotCapTransition();
        EvaluateInfinityTransition(
            simulatedCycleSeconds: _activeInfinityCycleSeconds,
            updatePresentation: false);
    }

    private void RefreshSimulationPresentation()
    {
        bool engineeringComplete =
            oracle.saveSettings.sdSimulation.engineeringComplete;
        spaceAgeManager?.RunProductionTick(
            1d, 0d, updatePresentation: true);
        informationEraManager?.RunProductionTick(
            1d, 0d, updatePresentation: true);
        foundationalEraManager?.RunProductionTick(
            engineeringComplete,
            1d,
            0d,
            updatePresentation: true);
        foundationalEraManager?.CompleteSimulationTick(
            updatePresentation: true);
        informationEraManager?.CompleteSimulationTick(
            updatePresentation: true);
        spaceAgeManager?.CompleteSimulationTick(
            updatePresentation: true);
    }

    private sealed class RuntimeEventTimeModel :
        IEventTimeSimulationModel
    {
        private readonly GameManager _owner;
        private readonly OfflineInfinityCycleState _infinityState;
        private bool _invalidZeroTimeDreamLoop;
        public RuntimeEventTimeModel(
            GameManager owner,
            OfflineInfinityCycleState infinityState)
        {
            _owner = owner;
            _infinityState = infinityState;
        }

        public IEventTimeSimulationModel Clone() =>
            new RuntimeEventTimeModel(
                _owner,
                _infinityState);

        public bool IsFiniteAndValid(out string diagnosticCode)
        {
            if (_invalidZeroTimeDreamLoop)
            {
                diagnosticCode = "SIM-DREAM-ZERO-TIME-LOOP";
                return false;
            }
            diagnosticCode = null;
            DysonVerseInfinityData data = _owner.infinityData;
            if (data == null ||
                !NumericSafety.IsFinite(data.bots) ||
                !NumericSafety.IsFinite(data.money) ||
                !NumericSafety.IsFinite(data.science))
            {
                diagnosticCode = "SIM-ACTIVE-INVALID-DYSON";
                return false;
            }
            return true;
        }

        public double TimeToNextMaterialEvent(
            double maximumSeconds,
            double infinityMinimumCycleSeconds)
        {
            double untilInfinityBoundary =
                _owner.TimeToNextInfinityMaterialEvent(
                    maximumSeconds,
                    infinityMinimumCycleSeconds,
                    _owner._activeInfinityCycleSeconds,
                    _owner._activeSimulationBoundaryRemaining,
                    _infinityState);
            double dreamBoundary =
                _owner.TimeToNextDreamMaterialEvent(
                    maximumSeconds);
            return Math.Min(
                untilInfinityBoundary,
                dreamBoundary);
        }

        public void AdvanceContinuous(double seconds)
        {
            if (_infinityState.BreakTheLoop)
            {
                _infinityState.SynchronizeBeforeFirstTick(
                    _owner.prestigeData.infinityPoints);
                _infinityState.AddElapsed(seconds);
            }
            _owner.BeginSimulationInterval(seconds);
            _owner._activeInfinityCycleSeconds = NumericSafety.Add(
                _owner._activeInfinityCycleSeconds,
                seconds).Value;
            _owner._activeSimulationBoundaryRemaining = Math.Max(
                0d,
                _owner._activeSimulationBoundaryRemaining - seconds);
        }

        public void ApplyProductionArrivals(
            SimulationPresentationSummary summary)
        {
        }

        public void ApplyAutomation(
            SimulationAutomationPolicy policy,
            SimulationPresentationSummary summary)
        {
            _owner.RunSimulationAutomation(policy);
        }

        public void ApplyDerivedTimersAndDoubleTime(
            double seconds,
            SimulationPresentationSummary summary)
        {
            _owner.CompleteSimulationInterval(
                updatePresentation: false);
            summary.RealityWorkers = NumericSafety.Add(
                summary.RealityWorkers,
                _owner._pendingRealityAdvance.WorkersGenerated).Value;
            summary.AutomaticInfluence = NumericSafety.Add(
                summary.AutomaticInfluence,
                _owner._pendingRealityAdvance.AutomaticInfluence).Value;
            summary.RealityCapacityStallSeconds =
                NumericSafety.Add(
                    summary.RealityCapacityStallSeconds,
                    _owner._pendingRealityAdvance.StalledSeconds).Value;
            if (_owner._activeSimulationBoundaryRemaining <= 1e-12d)
                _owner._activeSimulationBoundaryRemaining =
                    1d / 60d;
        }

        public void ApplyDreamReset(
            SimulationPresentationSummary summary)
        {
            SaveDataPrestige prestige =
                Oracle.oracle.saveSettings.sdPrestige;
            long countBefore = prestige.simulationCount;
            long rewardBefore = prestige.strangeMatter;
            DreamResetCause cause =
                StoredRuntimeEventTimeModel.DreamCauseForStage(
                    prestige.disasterStage);
            bool reset = _owner.EvaluateDreamTransition(
                updatePresentation: false);
            if (reset)
            {
                StoredRuntimeEventTimeModel.AddDreamSummary(
                    summary,
                    cause,
                    prestige.simulationCount - countBefore,
                    prestige.strangeMatter - rewardBefore);
            }
            _invalidZeroTimeDreamLoop =
                reset &&
                _owner.simulationPrestigeManager != null &&
                _owner.simulationPrestigeManager
                    .IsAutomaticResetReady();
        }

        public void ApplyBotCapTransition(
            SimulationPresentationSummary summary)
        {
            long beforeIp = _owner.prestigeData.infinityPoints;
            _owner.EvaluateBotCapTransition();
            long ipDelta = Math.Max(
                0L,
                _owner.prestigeData.infinityPoints -
                beforeIp);
            bool specialGranted =
                _owner._botCapSpecialRewardGrantedAtBoundary;
            summary.BotCapInfinityPoints = NumericSafety.Add(
                summary.BotCapInfinityPoints,
                specialGranted
                    ? Math.Min(1000L, ipDelta)
                    : 0L).Value;
            long ordinaryReward = Math.Max(
                0L,
                ipDelta -
                (specialGranted
                    ? Math.Min(1000L, ipDelta)
                    : 0L));
            if (_owner._botCapHandledAtBoundary &&
                ordinaryReward > 0L)
            {
                summary.OrdinaryInfinityCount = NumericSafety.Add(
                    summary.OrdinaryInfinityCount,
                    1L).Value;
                summary.OrdinaryInfinityPoints = NumericSafety.Add(
                    summary.OrdinaryInfinityPoints,
                    ordinaryReward).Value;
            }
            summary.BotCapOverflowRewards = NumericSafety.Add(
                summary.BotCapOverflowRewards,
                specialGranted ? 1L : 0L).Value;
        }

        public void ApplyInfinityReset(
            double minimumCycleSeconds,
            SimulationPresentationSummary summary)
        {
            double elapsed = _infinityState.BreakTheLoop
                ? _infinityState.SecondsInCurrentCycle
                : _owner._activeInfinityCycleSeconds;
            if (elapsed < minimumCycleSeconds)
            {
                return;
            }

            long before = _owner.prestigeData.infinityPoints;
            bool reset = _owner.EvaluateInfinityTransition(
                elapsed,
                updatePresentation: false);
            if (reset)
            {
                long reward = Math.Max(
                    0L,
                    _owner.prestigeData.infinityPoints - before);
                if (_owner.prestigePlus.breakTheLoop)
                {
                    summary.BreakInfinityCount = NumericSafety.Add(
                        summary.BreakInfinityCount,
                        1L).Value;
                    summary.BreakInfinityPoints = NumericSafety.Add(
                        summary.BreakInfinityPoints,
                        reward).Value;
                }
                else
                {
                    summary.OrdinaryInfinityCount = NumericSafety.Add(
                        summary.OrdinaryInfinityCount,
                        1L).Value;
                    summary.OrdinaryInfinityPoints = NumericSafety.Add(
                        summary.OrdinaryInfinityPoints,
                        reward).Value;
                }
                if (_infinityState.BreakTheLoop)
                {
                    _infinityState.ObserveReset(
                        _owner.prestigeData.infinityPoints,
                        resetCompleted: true,
                        out _,
                        out _);
                    _owner._activeInfinityCycleSeconds =
                        _infinityState.SecondsInCurrentCycle;
                    _owner._activeAtPostResetStart =
                        _infinityState.IsAtPostResetStart;
                }
                else
                {
                    _owner._activeInfinityCycleSeconds = 0d;
                    _owner._activeAtPostResetStart = true;
                }
            }
        }

        public void ApplyQueuedInput(
            SimulationQueuedInput input,
            SimulationPresentationSummary summary)
        {
            if (input.Kind == SimulationInputKind.BreakTarget)
            {
                Oracle.oracle.saveSettings.infinityPointsToBreakFor =
                    input.DiscreteValue >= int.MaxValue
                        ? int.MaxValue
                        : (int)Math.Max(1L, input.DiscreteValue);
                _infinityState.SetCapturedBreakTarget(
                    input.DiscreteValue);
                return;
            }

            _owner.ApplyQueuedPlayerAction(input);
            _infinityState.InvalidateProjectionEvidence();
        }

        public bool TryAccelerate(
            double maximumSeconds,
            SimulationAdvanceRequest request,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            if (_owner.prestigePlus.breakTheLoop)
            {
                return TryAccelerateBreakInfinity(
                    maximumSeconds,
                    request,
                    out acceleration);
            }

            if (!_owner._activeAtPostResetStart ||
                _owner._activeInfinityCycleSeconds > 1e-12d ||
                AnalyticalOfflineSimulation.HasPersistentSideEffects(
                    _owner.skillTreeData) ||
                !DreamAnalyticalOfflineSimulation.IsClockIdle(
                    Oracle.oracle.saveSettings.sdSimulation,
                    _owner.spaceAgeManager != null &&
                    _owner.spaceAgeManager.IsRailgunFiring))
            {
                return false;
            }

            double threshold =
                _owner.prestigePlus.divisionsPurchased > 0
                    ? 4.2e19 / Math.Pow(
                        10d,
                        _owner.prestigePlus.divisionsPurchased)
                    : 4.2e19;
            if (_owner.infinityData.bots < threshold)
                return false;

            const double minimumCycle = 1d / 60d;
            if (request.AutomationTimeUntilNextEvent <= 1e-12d)
                return false;
            double automationHorizon =
                request.AutomationTimeUntilNextEvent;
            double available = Math.Min(
                maximumSeconds,
                automationHorizon);
            long cycles = NumericSafety.ToLongFloor(
                Math.Floor(
                    (available + 1e-12d) /
                    minimumCycle)).Value;
            if (cycles < 1L) return false;
            double consumed = cycles * minimumCycle;

            long rewardPerCycle = 1L;
            if (Oracle.oracle.saveSettings.doubleIp)
                rewardPerCycle = NumericSafety.Add(
                    rewardPerCycle,
                    rewardPerCycle).Value;
            if (_owner.prestigePlus.doubleIP)
                rewardPerCycle = NumericSafety.Add(
                    rewardPerCycle,
                    rewardPerCycle).Value;
            long totalReward =
                SaturatingMultiply(cycles, rewardPerCycle);
            _owner.prestigeData.infinityPoints = NumericSafety.Add(
                _owner.prestigeData.infinityPoints,
                totalReward).Value;
            Oracle.oracle.saveSettings.lastInfinityPointsGained =
                rewardPerCycle >= int.MaxValue
                    ? int.MaxValue
                    : (int)rewardPerCycle;
            Oracle.oracle.saveSettings.timeLastInfinity =
                minimumCycle;
            Oracle.oracle.saveSettings.firstInfinityDone = true;
            Oracle.oracle.saveSettings.simulationStatistics
                ?.RecordInfinityAggregate(
                    breakInfinity: false,
                    cycles,
                    totalReward,
                    minimumCycle,
                    rewardPerCycle,
                    consumed);

            SaveDataPrestige dreamPrestige =
                Oracle.oracle.saveSettings.sdPrestige;
            int rate = Math.Max(
                0,
                Math.Min(10, dreamPrestige.doubleTimeRate));
            dreamPrestige.doubleTime = Math.Max(
                0d,
                dreamPrestige.doubleTime -
                Math.Min(
                    dreamPrestige.doubleTime,
                    NumericSafety.Multiply(
                        consumed,
                        rate).Value));
            dreamPrestige.doDoubleTime =
                dreamPrestige.doubleTimeOwned &&
                dreamPrestige.doubleTime > 0d;

            if (_owner._workerService == null)
                ServiceLocator.TryGet(out _owner._workerService);
            RealityAdvanceResult reality =
                _owner._workerService != null
                    ? _owner._workerService.AdvanceSimulation(consumed)
                    : default;
            _owner.RecordRealitySegment(consumed, reality);
            _owner._activeInfinityCycleSeconds = 0d;
            _owner._activeSimulationBoundaryRemaining =
                minimumCycle;

            acceleration = new SimulationAccelerationResult(
                true,
                consumed,
                new SimulationPresentationSummary
                {
                    OrdinaryInfinityCount = cycles,
                    OrdinaryInfinityPoints = totalReward,
                    RealityWorkers = reality.WorkersGenerated,
                    AutomaticInfluence = reality.AutomaticInfluence,
                    RealityCapacityStallSeconds =
                        reality.StalledSeconds
                },
                0d);
            return true;
        }

        private bool TryAccelerateBreakInfinity(
            double maximumSeconds,
            SimulationAdvanceRequest request,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            if (!_infinityState.IsAtPostResetStart ||
                _owner._activeInfinityCycleSeconds > 1e-12d)
            {
                return false;
            }
            if (_owner._sampledInfinityProjectionEnabled &&
                _infinityState.TryGetSmoothedSamples(
                    out InfinityCycleSample first,
                    out InfinityCycleSample second,
                    out InfinityCycleSample third))
            {
                if (TryAccelerateSampledBreakInfinity(
                        maximumSeconds,
                        request,
                        first,
                        second,
                        third,
                        out acceleration))
                {
                    return true;
                }

                _infinityState.RejectSampledProjection();
                return false;
            }

            if (AnalyticalOfflineSimulation.HasPersistentSideEffects(
                    _owner.skillTreeData) ||
                !_infinityState.TryGetSamples(
                    out first,
                    out second,
                    out third))
            {
                return false;
            }

            bool dysonAutomationEnabled =
                _owner.prestigeData.infinityAutoBots ||
                _owner.prestigeData.infinityAutoResearch;
            if (dysonAutomationEnabled)
            {
                // Automated Break cycles use the canonical-sampled path.
                // Until a full smoothed window exists, remain exact rather
                // than substituting the legacy full-state approximation.
                return false;
            }
            bool dreamIdle =
                DreamAnalyticalOfflineSimulation.IsClockIdle(
                    Oracle.oracle.saveSettings.sdSimulation,
                    _owner.spaceAgeManager != null &&
                    _owner.spaceAgeManager.IsRailgunFiring);
            if (!dreamIdle &&
                (!_owner.TryGetDreamOfflineTiming(
                     out DreamOfflineTiming dreamTiming) ||
                 !DreamAdaptiveLongIntervalSimulation.CanProject(
                     Oracle.oracle.saveSettings.sdSimulation,
                     Oracle.oracle.saveSettings.sdPrestige,
                     dreamTiming)))
            {
                return false;
            }

            double automationHorizon =
                request.AutomationTimeUntilNextEvent > 1e-12d
                    ? request.AutomationTimeUntilNextEvent
                    : SimulationTickSeconds;
            double projectionHorizon = Math.Min(
                maximumSeconds,
                NumericSafety.BitDecrement(
                    automationHorizon));
            if (!_owner.TryCreateStableBreakCycleEvaluator(
                    request.InfinityMinimumCycleSeconds,
                    _infinityState,
                    out StableBreakInfinityCycleEvaluator evaluator) ||
                !AdaptiveInfinityCycleSimulation
                    .TryProjectStableCycles(
                        first,
                        second,
                        third,
                        _owner.prestigeData.infinityPoints,
                        projectionHorizon,
                        request.InfinityMinimumCycleSeconds,
                        evaluator.Evaluate,
                        minimumProjectedCycles: 1L,
                        out InfinityCycleProjection projection))
            {
                return false;
            }

            AdvanceHandledAutomationClock(
                request.AutomationTimeUntilNextEvent,
                projection.ConsumedSeconds,
                out long handledAutomationEvents,
                out double nextAutomationRemaining);
            if (handledAutomationEvents != 0L)
            {
                // A projected active Break block must end strictly before
                // an enabled automation boundary. The shared scheduler owns
                // the coincident production -> automation -> reset event.
                return false;
            }

            _owner.AdvanceDreamForActiveBreakBlock(
                projection.ConsumedSeconds,
                request.InfinityMinimumCycleSeconds);

            long startingIp =
                _owner.prestigeData.infinityPoints;
            _owner.ApplyAdaptiveInfinityProjection(
                projection,
                _infinityState);
            long aggregateReward = Math.Max(
                0L,
                _owner.prestigeData.infinityPoints -
                startingIp);
            if (_owner._workerService == null)
                ServiceLocator.TryGet(out _owner._workerService);
            RealityAdvanceResult reality =
                _owner._workerService != null
                    ? _owner._workerService.AdvanceSimulation(
                        projection.ConsumedSeconds)
                    : default;
            _owner.RecordRealitySegment(
                projection.ConsumedSeconds,
                reality);
            _owner._activeInfinityCycleSeconds = 0d;
            _owner._activeAtPostResetStart = true;
            _owner._activeSimulationBoundaryRemaining =
                request.InfinityMinimumCycleSeconds;

            acceleration = new SimulationAccelerationResult(
                true,
                projection.ConsumedSeconds,
                new SimulationPresentationSummary
                {
                    BreakInfinityCount =
                        projection.CycleCount,
                    BreakInfinityPoints =
                        aggregateReward,
                    RealityWorkers =
                        reality.WorkersGenerated,
                    AutomaticInfluence =
                        reality.AutomaticInfluence,
                    RealityCapacityStallSeconds =
                        reality.StalledSeconds
                },
                0d,
                allAutomationEventsHandled: false,
                automationTimeUntilNextEvent:
                    nextAutomationRemaining);
            return true;
        }

        private bool TryAccelerateSampledBreakInfinity(
            double maximumSeconds,
            SimulationAdvanceRequest request,
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            if (!_owner.TryCreateCanonicalSampledBreakProjection(
                    _infinityState,
                    first,
                    second,
                    third,
                    maximumSeconds,
                    request.InfinityMinimumCycleSeconds,
                    out InfinityCycleProjection projection))
            {
                return false;
            }

            AdvanceHandledAutomationClock(
                request.AutomationTimeUntilNextEvent,
                projection.ConsumedSeconds,
                out long handledAutomationEvents,
                out double nextAutomationRemaining);
            if (handledAutomationEvents > 0L)
            {
                _owner.botsAutoBuy?.SkipAutomationTicks(
                    handledAutomationEvents);
                _owner.researchAutoBuy?.SkipAutomationTicks(
                    handledAutomationEvents);
            }

            long aggregateReward =
                _owner.ApplyCanonicalSampledBreakProjection(
                    projection,
                    _infinityState);
            if (_owner._workerService == null)
                ServiceLocator.TryGet(out _owner._workerService);
            RealityAdvanceResult reality =
                _owner._workerService != null
                    ? _owner._workerService.AdvanceSimulation(
                        projection.ConsumedSeconds)
                    : default;
            _owner.RecordRealitySegment(
                projection.ConsumedSeconds,
                reality);
            _owner._activeInfinityCycleSeconds = 0d;
            _owner._activeAtPostResetStart = true;
            _owner._activeSimulationBoundaryRemaining =
                request.InfinityMinimumCycleSeconds;

            acceleration = new SimulationAccelerationResult(
                true,
                projection.ConsumedSeconds,
                new SimulationPresentationSummary
                {
                    BreakInfinityCount = projection.CycleCount,
                    BreakInfinityPoints = aggregateReward,
                    RealityWorkers = reality.WorkersGenerated,
                    AutomaticInfluence = reality.AutomaticInfluence,
                    RealityCapacityStallSeconds = reality.StalledSeconds
                },
                projection.ValidationError,
                allAutomationEventsHandled: true,
                automationTimeUntilNextEvent:
                    nextAutomationRemaining);
            return true;
        }

        private static bool IsAutomaticDreamResetReady(
            SaveDataDream1 dream,
            SaveDataPrestige prestige)
        {
            if (dream == null || prestige == null)
                return false;
            return prestige.disasterStage switch
            {
                0 or 1 => dream.cities >= 1d,
                2 => dream.bots >= 100d,
                3 => dream.spaceFactories >= 5d,
                _ => false
            };
        }

        private static void AdvanceHandledAutomationClock(
            double startingRemaining,
            double consumedSeconds,
            out long events,
            out double remaining)
        {
            double normalized =
                NumericSafety.IsFinite(startingRemaining) &&
                startingRemaining > 1e-12d &&
                startingRemaining <=
                    SimulationTickSeconds + 1e-12d
                    ? startingRemaining
                    : SimulationTickSeconds;
            if (consumedSeconds + 1e-12d < normalized)
            {
                events = 0L;
                remaining = normalized - consumedSeconds;
                return;
            }
            events = NumericSafety.Add(
                1L,
                NumericSafety.ToLongFloor(
                    Math.Floor(
                        (consumedSeconds - normalized + 1e-12d) /
                        SimulationTickSeconds)).Value).Value;
            remaining = normalized - consumedSeconds +
                        events * SimulationTickSeconds;
            if (remaining <= 1e-12d)
                remaining = SimulationTickSeconds;
        }

        private static long SaturatingMultiply(long left, long right)
        {
            if (left <= 0L || right <= 0L) return 0L;
            return left > long.MaxValue / right
                ? long.MaxValue
                : left * right;
        }
    }

    private sealed class StoredRuntimeEventTimeModel :
        IEventTimeSimulationModel
    {
        private readonly GameManager _owner;
        private readonly OfflineInfinityCycleState _infinityState;
        private readonly DreamCycleTracker _dreamCycleState = new();
        private double _automationPhaseSeconds;
        private double _infinityBoundaryRemaining = 1d / 60d;
        private bool _invalidZeroTimeDreamLoop;

        public StoredRuntimeEventTimeModel(
            GameManager owner,
            OfflineInfinityCycleState infinityState,
            double automationTimeUntilNextEvent,
            double infinityBoundaryRemaining)
        {
            _owner = owner;
            _infinityState = infinityState;
            double safeAutomationRemaining =
                NumericSafety.IsFinite(automationTimeUntilNextEvent) &&
                automationTimeUntilNextEvent > 1e-12d &&
                automationTimeUntilNextEvent <=
                    SimulationTickSeconds + 1e-12d
                    ? automationTimeUntilNextEvent
                    : SimulationTickSeconds;
            _automationPhaseSeconds = Math.Max(
                0d,
                SimulationTickSeconds - safeAutomationRemaining);
            _infinityBoundaryRemaining =
                NumericSafety.IsFinite(infinityBoundaryRemaining) &&
                infinityBoundaryRemaining > 1e-12d &&
                infinityBoundaryRemaining <= 1d / 60d + 1e-12d
                    ? infinityBoundaryRemaining
                    : 1d / 60d;
        }

        public double InfinityBoundaryRemaining =>
            _infinityBoundaryRemaining;

        public IEventTimeSimulationModel Clone() => this;

        public bool IsFiniteAndValid(out string diagnosticCode)
        {
            if (_invalidZeroTimeDreamLoop)
            {
                diagnosticCode = "SIM-DREAM-ZERO-TIME-LOOP";
                return false;
            }
            diagnosticCode = null;
            DysonVerseInfinityData data = _owner.infinityData;
            if (data == null ||
                !NumericSafety.IsFinite(data.bots) ||
                !NumericSafety.IsFinite(data.money) ||
                !NumericSafety.IsFinite(data.science))
            {
                diagnosticCode = "SIM-STORED-INVALID-DYSON";
                return false;
            }
            return true;
        }

        public double TimeToNextMaterialEvent(
            double maximumSeconds,
            double infinityMinimumCycleSeconds)
        {
            double infinityHorizon =
                _owner.TimeToNextInfinityMaterialEvent(
                    maximumSeconds,
                    infinityMinimumCycleSeconds,
                    _infinityState.SecondsInCurrentCycle,
                    _infinityBoundaryRemaining,
                    _infinityState);
            return Math.Min(
                Math.Min(
                    maximumSeconds,
                    infinityHorizon),
                _owner.TimeToNextDreamMaterialEvent(
                    maximumSeconds));
        }

        public void AdvanceContinuous(double seconds)
        {
            _infinityState.SynchronizeBeforeFirstTick(
                _owner.prestigeData.infinityPoints);
            _infinityState.AddElapsed(seconds);
            _dreamCycleState.AddElapsed(seconds);
            _automationPhaseSeconds = NumericSafety.Add(
                _automationPhaseSeconds,
                seconds).Value;
            _owner.RecordStoredTimeWithoutInfinityReset(
                seconds);
            _infinityBoundaryRemaining = Math.Max(
                0d,
                _infinityBoundaryRemaining - seconds);
            _owner.BeginSimulationInterval(seconds);
        }

        public void ApplyProductionArrivals(
            SimulationPresentationSummary summary)
        {
        }

        public void ApplyAutomation(
            SimulationAutomationPolicy policy,
            SimulationPresentationSummary summary)
        {
            _owner.RunSimulationAutomation(
                SimulationAutomationPolicy.ForceBuyMax);
            _automationPhaseSeconds = 0d;
        }

        public void ApplyDerivedTimersAndDoubleTime(
            double seconds,
            SimulationPresentationSummary summary)
        {
            _owner.CompleteSimulationInterval(
                updatePresentation: false);
            summary.RealityWorkers = NumericSafety.Add(
                summary.RealityWorkers,
                _owner._pendingRealityAdvance.WorkersGenerated).Value;
            summary.AutomaticInfluence = NumericSafety.Add(
                summary.AutomaticInfluence,
                _owner._pendingRealityAdvance.AutomaticInfluence).Value;
            summary.RealityCapacityStallSeconds =
                NumericSafety.Add(
                    summary.RealityCapacityStallSeconds,
                    _owner._pendingRealityAdvance.StalledSeconds).Value;
            if (_infinityBoundaryRemaining <= 1e-12d)
                _infinityBoundaryRemaining = 1d / 60d;
        }

        public void ApplyDreamReset(
            SimulationPresentationSummary summary)
        {
            SaveDataPrestige prestige =
                Oracle.oracle.saveSettings.sdPrestige;
            long countBefore = prestige.simulationCount;
            long strangeMatterBefore = prestige.strangeMatter;
            DreamResetCause cause = DreamCauseForStage(
                prestige.disasterStage);
            bool reset = _owner.EvaluateDreamTransition(
                updatePresentation: false);
            if (reset)
            {
                _dreamCycleState.ObserveReset(
                    countBefore,
                    strangeMatterBefore,
                    cause,
                    Oracle.oracle.saveSettings.sdSimulation,
                    prestige);
                AddDreamSummary(
                    summary,
                    cause,
                    prestige.simulationCount - countBefore,
                    prestige.strangeMatter - strangeMatterBefore);
            }
            _invalidZeroTimeDreamLoop =
                reset &&
                _owner.simulationPrestigeManager != null &&
                _owner.simulationPrestigeManager
                    .IsAutomaticResetReady();
        }

        public void ApplyBotCapTransition(
            SimulationPresentationSummary summary)
        {
            long beforeIp = _owner.prestigeData.infinityPoints;
            _owner.EvaluateBotCapTransition();
            long ipDelta = Math.Max(
                0L,
                _owner.prestigeData.infinityPoints -
                beforeIp);
            bool specialGranted =
                _owner._botCapSpecialRewardGrantedAtBoundary;
            summary.BotCapInfinityPoints = NumericSafety.Add(
                summary.BotCapInfinityPoints,
                specialGranted
                    ? Math.Min(1000L, ipDelta)
                    : 0L).Value;
            long ordinaryReward = Math.Max(
                0L,
                ipDelta -
                (specialGranted
                    ? Math.Min(1000L, ipDelta)
                    : 0L));
            if (_owner._botCapHandledAtBoundary &&
                ordinaryReward > 0L)
            {
                summary.OrdinaryInfinityCount = NumericSafety.Add(
                    summary.OrdinaryInfinityCount,
                    1L).Value;
                summary.OrdinaryInfinityPoints = NumericSafety.Add(
                    summary.OrdinaryInfinityPoints,
                    ordinaryReward).Value;
            }
            summary.BotCapOverflowRewards = NumericSafety.Add(
                summary.BotCapOverflowRewards,
                specialGranted ? 1L : 0L).Value;
        }

        public void ApplyInfinityReset(
            double minimumCycleSeconds,
            SimulationPresentationSummary summary)
        {
            if (_infinityState.SecondsInCurrentCycle <
                minimumCycleSeconds)
            {
                return;
            }
            long beforeIp = _owner.prestigeData.infinityPoints;
            bool previousOverrideActive =
                _owner._offlineBreakTargetOverrideActive;
            long previousOverride =
                _owner._offlineBreakTargetOverride;
            _owner._offlineBreakTargetOverrideActive =
                _infinityState.BreakTheLoop;
            _owner._offlineBreakTargetOverride =
                _infinityState.CapturedBreakTarget;
            bool reset;
            try
            {
                reset = _owner.EvaluateInfinityTransition(
                    _infinityState.SecondsInCurrentCycle,
                    updatePresentation: false);
            }
            finally
            {
                _owner._offlineBreakTargetOverrideActive =
                    previousOverrideActive;
                _owner._offlineBreakTargetOverride =
                    previousOverride;
            }

            if (_infinityState.ObserveReset(
                    _owner.prestigeData.infinityPoints,
                    reset,
                    out double durationSeconds,
                    out _))
            {
                Oracle.oracle.saveSettings.timeLastInfinity =
                    Math.Max(
                        durationSeconds,
                        minimumCycleSeconds);
                long reward = Math.Max(
                    0L,
                    _owner.prestigeData.infinityPoints - beforeIp);
                if (_infinityState.BreakTheLoop)
                {
                    summary.BreakInfinityCount = NumericSafety.Add(
                        summary.BreakInfinityCount,
                        1L).Value;
                    summary.BreakInfinityPoints = NumericSafety.Add(
                        summary.BreakInfinityPoints,
                        reward).Value;
                }
                else
                {
                    summary.OrdinaryInfinityCount = NumericSafety.Add(
                        summary.OrdinaryInfinityCount,
                        1L).Value;
                    summary.OrdinaryInfinityPoints = NumericSafety.Add(
                        summary.OrdinaryInfinityPoints,
                        reward).Value;
                }
            }
        }

        public void ApplyQueuedInput(
            SimulationQueuedInput input,
            SimulationPresentationSummary summary)
        {
            if (input.Kind != SimulationInputKind.BreakTarget)
                return;
            _infinityState.SetCapturedBreakTarget(
                input.DiscreteValue);
            _owner._offlineBreakTargetOverrideActive = true;
            _owner._offlineBreakTargetOverride =
                Math.Max(1L, input.DiscreteValue);
        }

        public bool TryAccelerate(
            double maximumSeconds,
            SimulationAdvanceRequest request,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            if (maximumSeconds <= 1e-12d)
            {
                return false;
            }

            if (TryAggregateBreakInfinityCycles(
                    maximumSeconds,
                    request,
                    out acceleration))
            {
                return true;
            }
            if (_automationPhaseSeconds > 1e-9d ||
                maximumSeconds < SimulationTickSeconds * 2d)
            {
                return false;
            }

            if (TryAggregateStableDreamCycles(
                    maximumSeconds,
                    out acceleration))
            {
                return true;
            }

            if (TryAggregateImmediateOrdinaryInfinity(
                    maximumSeconds,
                    out acceleration))
            {
                return true;
            }

            long requestedTicks = NumericSafety.ToLongFloor(
                Math.Floor(
                    maximumSeconds /
                    SimulationTickSeconds)).Value;
            if (requestedTicks < 2L) return false;

            SimulationStatisticsTotals before =
                CaptureTotals(Oracle.oracle.saveSettings
                    .simulationStatistics?.lifetime);
            long processed = _owner.TryRunAnalyticalOfflineTicks(
                requestedTicks,
                _infinityState,
                allowCanonicalFallback: false);
            if (processed <= 0L) return false;

            double consumed = processed * SimulationTickSeconds;
            SimulationStatisticsTotals after =
                CaptureTotals(Oracle.oracle.saveSettings
                    .simulationStatistics?.lifetime);
            SimulationPresentationSummary difference =
                Difference(before, after);
            acceleration = new SimulationAccelerationResult(
                accepted: true,
                consumedSeconds: consumed,
                summary: difference,
                validationError: 0d,
                allAutomationEventsHandled: true);
            return true;
        }

        private bool TryAggregateBreakInfinityCycles(
            double maximumSeconds,
            SimulationAdvanceRequest request,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            if (!_infinityState.BreakTheLoop ||
                !_infinityState.IsAtPostResetStart ||
                _owner.prestigeData.infinityPoints < 42L)
            {
                return false;
            }
            if (_owner._sampledInfinityProjectionEnabled &&
                _infinityState.TryGetSmoothedSamples(
                    out InfinityCycleSample first,
                    out InfinityCycleSample second,
                    out InfinityCycleSample third))
            {
                if (TryAggregateSampledBreakCycles(
                        maximumSeconds,
                        request,
                        first,
                        second,
                        third,
                        out acceleration))
                {
                    return true;
                }

                _infinityState.RejectSampledProjection();
                return false;
            }

            if (AnalyticalOfflineSimulation.HasPersistentSideEffects(
                    _owner.skillTreeData))
            {
                return false;
            }
            if (!_owner.TryCreateStableBreakCycleEvaluator(
                    request.InfinityMinimumCycleSeconds,
                    _infinityState,
                    out StableBreakInfinityCycleEvaluator evaluator))
            {
                return false;
            }
            if (!_owner.TryLimitBreakProjectionToDreamHorizon(
                    ref maximumSeconds))
            {
                return false;
            }

            bool dysonAutomationEnabled =
                _owner.prestigeData.infinityAutoBots ||
                _owner.prestigeData.infinityAutoResearch;
            if (dysonAutomationEnabled)
            {
                // Automated Break cycles use the canonical-sampled path.
                // Until a full smoothed window exists, remain exact rather
                // than substituting the legacy full-state approximation.
                return false;
            }

            InfinityCycleEvaluation currentEvaluation =
                evaluator.Evaluate(
                    _owner.prestigeData.infinityPoints);
            if (currentEvaluation.Reward <= 0L ||
                !NumericSafety.IsFinite(
                    currentEvaluation.DurationSeconds) ||
                (dysonAutomationEnabled &&
                 !IsMinimumInfinityCycle(
                     currentEvaluation.DurationSeconds,
                     request.InfinityMinimumCycleSeconds)))
            {
                return false;
            }
            if (dysonAutomationEnabled &&
                Math.Abs(
                    request.AutomationTimeUntilNextEvent -
                    SimulationTickSeconds) > 1e-9d)
            {
                // Only cross automation events when the independent 10 Hz
                // clock is aligned with the 1/60-second reset clock. Every
                // sixth reset then coincides with automation: production and
                // purchases occur first, and that same boundary immediately
                // wipes the transient purchase. Non-aligned clocks retain the
                // exact event path.
                return false;
            }

            double candidateSeconds = dysonAutomationEnabled
                ? Math.Floor(
                    (maximumSeconds + 1e-12d) /
                    SimulationTickSeconds) *
                  SimulationTickSeconds
                : maximumSeconds;
            while (candidateSeconds >= 0.1d)
            {
                bool projectedStableCycles =
                    AdaptiveInfinityCycleSimulation
                        .TryProjectValidatedState(
                            _owner.prestigeData.infinityPoints,
                            candidateSeconds,
                            request.InfinityMinimumCycleSeconds,
                            evaluator.Evaluate,
                            out InfinityCycleProjection projection);
                if (!projectedStableCycles)
                {
                    candidateSeconds *= 0.5d;
                    continue;
                }
                if (dysonAutomationEnabled &&
                    Math.Abs(
                        projection.ConsumedSeconds /
                        SimulationTickSeconds -
                        Math.Round(
                            projection.ConsumedSeconds /
                            SimulationTickSeconds)) > 1e-8d)
                {
                    candidateSeconds = Math.Floor(
                        (candidateSeconds * 0.5d + 1e-12d) /
                        SimulationTickSeconds) *
                        SimulationTickSeconds;
                    continue;
                }

                double dreamError = 0d;
                bool dreamIdle =
                    DreamAnalyticalOfflineSimulation.IsClockIdle(
                        Oracle.oracle.saveSettings.sdSimulation,
                        _owner.spaceAgeManager != null &&
                        _owner.spaceAgeManager.IsRailgunFiring);
                if (!dreamIdle)
                {
                    if (!_owner.TryGetDreamOfflineTiming(
                            out DreamOfflineTiming timing) ||
                        !DreamAdaptiveLongIntervalSimulation.TryAdvance(
                            Oracle.oracle.saveSettings.sdSimulation,
                            Oracle.oracle.saveSettings.sdPrestige,
                            timing,
                            projection.ConsumedSeconds,
                            out dreamError))
                    {
                        candidateSeconds *= 0.5d;
                        continue;
                    }
                    SimulationPrestigeManager
                        .InvokeResetSimulationRuntime();
                }
                else
                {
                    ConsumeIdleDreamDoubleTime(
                        projection.ConsumedSeconds);
                }

                long startingIp =
                    _owner.prestigeData.infinityPoints;
                _owner.ApplyAdaptiveInfinityProjection(
                    projection,
                    _infinityState);
                ApplyAggregatedOfflineTimeRollover(
                    projection.CycleCount,
                    projection.ConsumedSeconds,
                    projection.LastDurationSeconds);
                long aggregateReward = Math.Max(
                    0L,
                    _owner.prestigeData.infinityPoints -
                    startingIp);

                _infinityBoundaryRemaining =
                    request.InfinityMinimumCycleSeconds;
                SkipHandledDysonAutomationEvents(
                    request.AutomationTimeUntilNextEvent,
                    projection.ConsumedSeconds);
                RealityAdvanceResult reality =
                    _owner.AdvanceRealityStoredTime(
                        projection.ConsumedSeconds);
                _owner.RecordRealitySegment(
                    projection.ConsumedSeconds,
                    reality);

                acceleration = new SimulationAccelerationResult(
                    true,
                    projection.ConsumedSeconds,
                    new SimulationPresentationSummary
                    {
                        BreakInfinityCount =
                            projection.CycleCount,
                        BreakInfinityPoints =
                            aggregateReward,
                        RealityWorkers =
                            reality.WorkersGenerated,
                        AutomaticInfluence =
                            reality.AutomaticInfluence,
                        RealityCapacityStallSeconds =
                            reality.StalledSeconds
                    },
                    Math.Max(
                        projection.ValidationError,
                        dreamError),
                    allAutomationEventsHandled: true);
                return true;
            }
            return false;
        }

        private bool TryAggregateSampledBreakCycles(
            double maximumSeconds,
            SimulationAdvanceRequest request,
            InfinityCycleSample first,
            InfinityCycleSample second,
            InfinityCycleSample third,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            if (!_owner.TryCreateCanonicalSampledBreakProjection(
                    _infinityState,
                    first,
                    second,
                    third,
                    maximumSeconds,
                    request.InfinityMinimumCycleSeconds,
                    out InfinityCycleProjection projection))
            {
                return false;
            }

            long aggregateReward =
                _owner.ApplyCanonicalSampledBreakProjection(
                    projection,
                    _infinityState);
            ApplyAggregatedOfflineTimeRollover(
                projection.CycleCount,
                projection.ConsumedSeconds,
                projection.LastDurationSeconds);
            _infinityBoundaryRemaining =
                request.InfinityMinimumCycleSeconds;
            SkipHandledDysonAutomationEvents(
                request.AutomationTimeUntilNextEvent,
                projection.ConsumedSeconds);
            RealityAdvanceResult reality =
                _owner.AdvanceRealityStoredTime(
                    projection.ConsumedSeconds);
            _owner.RecordRealitySegment(
                projection.ConsumedSeconds,
                reality);

            acceleration = new SimulationAccelerationResult(
                true,
                projection.ConsumedSeconds,
                new SimulationPresentationSummary
                {
                    BreakInfinityCount = projection.CycleCount,
                    BreakInfinityPoints = aggregateReward,
                    RealityWorkers = reality.WorkersGenerated,
                    AutomaticInfluence = reality.AutomaticInfluence,
                    RealityCapacityStallSeconds = reality.StalledSeconds
                },
                projection.ValidationError,
                allAutomationEventsHandled: true);
#if UNITY_EDITOR
            string sampleTrace =
                $"{first.StartingInfinityPoints}:" +
                $"{first.Reward}:{first.DurationSeconds:R}," +
                $"{second.StartingInfinityPoints}:" +
                $"{second.Reward}:{second.DurationSeconds:R}," +
                $"{third.StartingInfinityPoints}:" +
                $"{third.Reward}:{third.DurationSeconds:R}" +
                $"=>{projection.CycleCount}:" +
                $"{projection.ConsumedSeconds:R}:" +
                $"{projection.FinalInfinityPoints}:" +
                $"{projection.ValidationError:R}:" +
                $"checkpoint={_infinityState.LastCheckpointError:R}:" +
                $"growth={_infinityState.ProjectionGrowthAdjustment:R}";
            CanonicalSampledBlockTrace =
                string.IsNullOrEmpty(CanonicalSampledBlockTrace)
                    ? sampleTrace
                    : CanonicalSampledBlockTrace + "|" + sampleTrace;
            CanonicalSampledBlockCount = NumericSafety.Add(
                CanonicalSampledBlockCount,
                1L).Value;
#endif
            return true;
        }

        private static bool IsAutomaticDreamResetReady(
            SaveDataDream1 dream,
            SaveDataPrestige prestige)
        {
            if (dream == null || prestige == null)
                return false;
            return prestige.disasterStage switch
            {
                0 or 1 => dream.cities >= 1d,
                2 => dream.bots >= 100d,
                3 => dream.spaceFactories >= 5d,
                _ => false
            };
        }

        private void SkipHandledDysonAutomationEvents(
            double timeUntilNextAutomation,
            double consumedSeconds)
        {
            if (!NumericSafety.IsFinite(consumedSeconds) ||
                consumedSeconds <= 0d)
            {
                return;
            }

            double remaining =
                NumericSafety.IsFinite(timeUntilNextAutomation) &&
                timeUntilNextAutomation > 1e-12d &&
                timeUntilNextAutomation <=
                    SimulationTickSeconds + 1e-12d
                    ? timeUntilNextAutomation
                    : SimulationTickSeconds;
            long events = consumedSeconds + 1e-12d < remaining
                ? 0L
                : NumericSafety.Add(
                    1L,
                    NumericSafety.ToLongFloor(
                        Math.Floor(
                            (consumedSeconds - remaining + 1e-12d) /
                            SimulationTickSeconds)).Value).Value;
            if (events > 0L)
            {
                _owner.botsAutoBuy?.SkipAutomationTicks(events);
                _owner.researchAutoBuy?.SkipAutomationTicks(events);
            }

            double phase = remaining - consumedSeconds +
                           events * SimulationTickSeconds;
            double normalizedRemaining =
                phase <= 1e-9d
                    ? SimulationTickSeconds
                    : Math.Min(SimulationTickSeconds, phase);
            _automationPhaseSeconds = Math.Max(
                0d,
                SimulationTickSeconds - normalizedRemaining);
        }

        private static void ConsumeIdleDreamDoubleTime(
            double seconds)
        {
            ConsumeIdleDreamDoubleTime(
                Oracle.oracle.saveSettings.sdPrestige,
                seconds);
        }

        private static void ConsumeIdleDreamDoubleTime(
            SaveDataPrestige dreamPrestige,
            double seconds)
        {
            if (dreamPrestige == null) return;
            int rate = Math.Max(
                0,
                Math.Min(10, dreamPrestige.doubleTimeRate));
            double requestedBank = NumericSafety.Multiply(
                seconds,
                rate).Value;
            dreamPrestige.doubleTime = Math.Max(
                0d,
                dreamPrestige.doubleTime -
                Math.Min(
                    dreamPrestige.doubleTime,
                    requestedBank));
            dreamPrestige.doDoubleTime =
                dreamPrestige.doubleTimeOwned &&
                dreamPrestige.doubleTime > 0d;
        }

        private bool TryAggregateStableDreamCycles(
            double maximumSeconds,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            SaveDataPrestige dreamPrestige =
                Oracle.oracle.saveSettings.sdPrestige;
            if (dreamPrestige == null ||
                (dreamPrestige.doubleTimeOwned &&
                 dreamPrestige.doubleTime > 0d &&
                 dreamPrestige.doubleTimeRate > 0) ||
                !_dreamCycleState.TryGetStableCycle(
                    Oracle.oracle.saveSettings.sdSimulation,
                    dreamPrestige,
                    out double cycleSeconds,
                    out long rewardPerCycle,
                    out DreamResetCause cause))
            {
                return false;
            }

            long maximumCycles = NumericSafety.ToLongFloor(
                Math.Floor(
                    (maximumSeconds + 1e-12d) /
                    cycleSeconds)).Value;
            if (maximumCycles < 2L) return false;

            long cycles = FindAutomationAlignedCycleCount(
                maximumCycles,
                cycleSeconds);
            if (cycles < 2L) return false;
            double consumed = NumericSafety.Multiply(
                cycles,
                cycleSeconds).Value;
            double threshold =
                _owner.GetOfflineResetBotThreshold(_infinityState);
            if (!_owner.TryAdvanceDysonWithoutMaterialEvents(
                    consumed,
                    threshold))
            {
                return false;
            }

            long totalReward = SaturatingMultiply(
                cycles,
                rewardPerCycle);
            dreamPrestige.simulationCount = NumericSafety.Add(
                dreamPrestige.simulationCount,
                cycles).Value;
            dreamPrestige.strangeMatter = NumericSafety.Add(
                dreamPrestige.strangeMatter,
                totalReward).Value;
            Oracle.oracle.saveSettings.simulationStatistics
                ?.RecordDreamAggregate(
                    cause,
                    cycles,
                    totalReward,
                    rewardPerCycle,
                    consumed);
            _dreamCycleState.AcceptAggregate();
            _infinityState.AddElapsed(consumed);
            _infinityBoundaryRemaining = 1d / 60d;
            RealityAdvanceResult reality =
                _owner.AdvanceRealityStoredTime(consumed);
            _owner.RecordRealitySegment(consumed, reality);
            _owner.RecordStoredTimeWithoutInfinityReset(
                consumed);

            var summary = new SimulationPresentationSummary
            {
                StrangeMatter = totalReward,
                RealityWorkers = reality.WorkersGenerated,
                AutomaticInfluence = reality.AutomaticInfluence,
                RealityCapacityStallSeconds =
                    reality.StalledSeconds
            };
            switch (cause)
            {
                case DreamResetCause.Meteor:
                    summary.MeteorDreamResets = cycles;
                    break;
                case DreamResetCause.ArtificialIntelligence:
                    summary.AiDreamResets = cycles;
                    break;
                case DreamResetCause.GlobalWarming:
                    summary.GlobalWarmingDreamResets = cycles;
                    break;
                case DreamResetCause.BlackHole:
                    summary.BlackHoleDreamResets = cycles;
                    break;
            }
            acceleration = new SimulationAccelerationResult(
                true,
                consumed,
                summary,
                0d);
            return true;
        }

        private static long FindAutomationAlignedCycleCount(
            long maximumCycles,
            double cycleSeconds)
        {
            long attempts = Math.Min(10_000L, maximumCycles);
            for (long offset = 0L;
                 offset < attempts;
                 offset++)
            {
                long cycles = maximumCycles - offset;
                double seconds = cycles * cycleSeconds;
                double ticks = Math.Round(
                    seconds / SimulationTickSeconds);
                if (Math.Abs(
                        seconds -
                        ticks * SimulationTickSeconds) <=
                    Math.Max(1e-9d, seconds * 1e-12d))
                {
                    return cycles;
                }
            }
            return 0L;
        }

        public static DreamResetCause DreamCauseForStage(
            long stage)
        {
            return stage switch
            {
                2L => DreamResetCause.ArtificialIntelligence,
                3L => DreamResetCause.GlobalWarming,
                _ => DreamResetCause.Meteor
            };
        }

        public static void AddDreamSummary(
            SimulationPresentationSummary summary,
            DreamResetCause cause,
            long count,
            long reward)
        {
            count = Math.Max(0L, count);
            reward = Math.Max(0L, reward);
            summary.StrangeMatter = NumericSafety.Add(
                summary.StrangeMatter,
                reward).Value;
            switch (cause)
            {
                case DreamResetCause.Meteor:
                    summary.MeteorDreamResets = NumericSafety.Add(
                        summary.MeteorDreamResets,
                        count).Value;
                    break;
                case DreamResetCause.ArtificialIntelligence:
                    summary.AiDreamResets = NumericSafety.Add(
                        summary.AiDreamResets,
                        count).Value;
                    break;
                case DreamResetCause.GlobalWarming:
                    summary.GlobalWarmingDreamResets =
                        NumericSafety.Add(
                            summary.GlobalWarmingDreamResets,
                            count).Value;
                    break;
                case DreamResetCause.BlackHole:
                    summary.BlackHoleDreamResets = NumericSafety.Add(
                        summary.BlackHoleDreamResets,
                        count).Value;
                    break;
            }
        }

        private bool TryAggregateImmediateOrdinaryInfinity(
            double maximumSeconds,
            out SimulationAccelerationResult acceleration)
        {
            acceleration = default;
            if (_infinityState.BreakTheLoop ||
                !_infinityState.IsAtPostResetStart ||
                AnalyticalOfflineSimulation.HasPersistentSideEffects(
                    _owner.skillTreeData))
            {
                return false;
            }

            double threshold =
                _owner.GetOfflineResetBotThreshold(_infinityState);
            if (_owner.infinityData.bots < threshold)
                return false;
            if (!AnalyticalOfflineSimulation.TryCaptureState(
                    _owner.infinityData,
                    out DysonAnalyticalState postResetState) ||
                _owner.HasOfflineAutomationEvent(postResetState))
            {
                // Crossing an automation boundary is safe only when every
                // configured target is a proven no-op for this reset state.
                return false;
            }

            // Keep aggregate blocks aligned to the independent automation
            // clock. Each 0.1-second block contains exactly six authored
            // 1/60-second ordinary Infinity cycles, while Dream may refine the
            // block further if its long projection cannot yet prove parity.
            double consumed = Math.Floor(
                (maximumSeconds + 1e-12d) /
                SimulationTickSeconds) * SimulationTickSeconds;
            if (consumed < SimulationTickSeconds) return false;

            bool dreamIdle = DreamAnalyticalOfflineSimulation.IsClockIdle(
                Oracle.oracle.saveSettings.sdSimulation,
                _owner.spaceAgeManager != null &&
                _owner.spaceAgeManager.IsRailgunFiring);
            DreamOfflineTiming timing = default;
            if (!dreamIdle)
            {
                if (!_owner.TryGetDreamOfflineTiming(out timing) ||
                    !TryAdvanceDreamForOrdinaryInfinityAggregate(
                        timing,
                        ref consumed,
                        out double dreamError))
                {
                    return false;
                }
            }
            else
            {
                ConsumeIdleDreamDoubleTime(consumed);
            }

            const double minimumCycle = 1d / 60d;
            long cycles = NumericSafety.ToLongFloor(
                Math.Floor(
                    (consumed + 1e-12d) /
                    minimumCycle)).Value;
            if (cycles < 2L) return false;

            long rewardPerCycle = 1L;
            if (Oracle.oracle.saveSettings.doubleIp)
                rewardPerCycle = NumericSafety.Add(
                    rewardPerCycle,
                    rewardPerCycle).Value;
            if (_owner.prestigePlus.doubleIP)
                rewardPerCycle = NumericSafety.Add(
                    rewardPerCycle,
                    rewardPerCycle).Value;
            long totalReward = SaturatingMultiply(
                cycles,
                rewardPerCycle);
            _owner.prestigeData.infinityPoints = NumericSafety.Add(
                _owner.prestigeData.infinityPoints,
                totalReward).Value;
            Oracle.oracle.saveSettings.lastInfinityPointsGained =
                rewardPerCycle >= int.MaxValue
                    ? int.MaxValue
                    : (int)rewardPerCycle;
            Oracle.oracle.saveSettings.timeLastInfinity =
                minimumCycle;
            Oracle.oracle.saveSettings.firstInfinityDone = true;
            Oracle.oracle.saveSettings.infinityInProgress = false;
            Oracle.oracle.saveSettings.simulationStatistics
                ?.RecordInfinityAggregate(
                    breakInfinity: false,
                    cycles,
                    totalReward,
                    minimumCycle,
                    rewardPerCycle,
                    consumed);
            _infinityState.AcceptProjection(
                _owner.prestigeData.infinityPoints);
            ApplyAggregatedOfflineTimeRollover(
                cycles,
                consumed,
                minimumCycle);

            RealityAdvanceResult reality =
                _owner.AdvanceRealityStoredTime(consumed);
            _owner.RecordRealitySegment(consumed, reality);
            SimulationPrestigeManager.InvokeResetSimulationRuntime();

            acceleration = new SimulationAccelerationResult(
                true,
                consumed,
                new SimulationPresentationSummary
                {
                    OrdinaryInfinityCount = cycles,
                    OrdinaryInfinityPoints = totalReward,
                    RealityWorkers = reality.WorkersGenerated,
                    AutomaticInfluence = reality.AutomaticInfluence,
                    RealityCapacityStallSeconds =
                        reality.StalledSeconds
                },
                0d);
            return true;
        }

        private static void ApplyAggregatedOfflineTimeRollover(
            long cycles,
            double consumedSeconds,
            double lastCycleSeconds)
        {
            SaveDataSettings settings =
                Oracle.oracle.saveSettings;
            InfinityStoredTimeUsage usage =
                InfinityStoredTimeAccounting.CompleteAggregate(
                    settings.offlineTimeUsedThisInfinity,
                    settings.offlineTimeUsedPreviousInfinity,
                    consumedSeconds,
                    cycles,
                    lastCycleSeconds);
            settings.offlineTimeUsedPreviousInfinity =
                usage.PreviousInfinity;
            settings.offlineTimeUsedThisInfinity =
                usage.CurrentInfinity;
        }

        private bool TryAdvanceDreamForOrdinaryInfinityAggregate(
            DreamOfflineTiming timing,
            ref double consumed,
            out double validationError)
        {
            validationError = double.MaxValue;
            double candidate = consumed;
            while (candidate >= 1d)
            {
                if (DreamAdaptiveLongIntervalSimulation.TryAdvance(
                        Oracle.oracle.saveSettings.sdSimulation,
                        Oracle.oracle.saveSettings.sdPrestige,
                        timing,
                        candidate,
                        out validationError))
                {
                    consumed = candidate;
                    return true;
                }

                candidate = Math.Floor(
                    (candidate * 0.5d + 1e-12d) /
                    SimulationTickSeconds) * SimulationTickSeconds;
            }
            return false;
        }

        private static long SaturatingMultiply(
            long left,
            long right)
        {
            if (left <= 0L || right <= 0L) return 0L;
            return left > long.MaxValue / right
                ? long.MaxValue
                : left * right;
        }

        private static SimulationStatisticsTotals CaptureTotals(
            SimulationStatisticsTotals source)
        {
            if (source == null) return new SimulationStatisticsTotals();
            return new SimulationStatisticsTotals
            {
                ordinaryInfinityCount = source.ordinaryInfinityCount,
                breakInfinityCount = source.breakInfinityCount,
                ordinaryInfinityPoints = source.ordinaryInfinityPoints,
                breakInfinityPoints = source.breakInfinityPoints,
                botCapInfinityPoints = source.botCapInfinityPoints,
                botCapOverflowRewards = source.botCapOverflowRewards,
                meteorDreamResets = source.meteorDreamResets,
                aiDreamResets = source.aiDreamResets,
                globalWarmingDreamResets =
                    source.globalWarmingDreamResets,
                blackHoleDreamResets = source.blackHoleDreamResets,
                strangeMatter = source.strangeMatter,
                realityWorkers = source.realityWorkers,
                automaticInfluence = source.automaticInfluence,
                manualInfluence = source.manualInfluence,
                realityCapacityStallSeconds =
                    source.realityCapacityStallSeconds
            };
        }

        private static SimulationPresentationSummary Difference(
            SimulationStatisticsTotals before,
            SimulationStatisticsTotals after)
        {
            return new SimulationPresentationSummary
            {
                OrdinaryInfinityCount = Math.Max(
                    0L,
                    after.ordinaryInfinityCount -
                    before.ordinaryInfinityCount),
                BreakInfinityCount = Math.Max(
                    0L,
                    after.breakInfinityCount -
                    before.breakInfinityCount),
                OrdinaryInfinityPoints = Math.Max(
                    0L,
                    after.ordinaryInfinityPoints -
                    before.ordinaryInfinityPoints),
                BreakInfinityPoints = Math.Max(
                    0L,
                    after.breakInfinityPoints -
                    before.breakInfinityPoints),
                BotCapInfinityPoints = Math.Max(
                    0L,
                    after.botCapInfinityPoints -
                    before.botCapInfinityPoints),
                BotCapOverflowRewards = Math.Max(
                    0L,
                    after.botCapOverflowRewards -
                    before.botCapOverflowRewards),
                MeteorDreamResets = Math.Max(
                    0L,
                    after.meteorDreamResets -
                    before.meteorDreamResets),
                AiDreamResets = Math.Max(
                    0L,
                    after.aiDreamResets -
                    before.aiDreamResets),
                GlobalWarmingDreamResets = Math.Max(
                    0L,
                    after.globalWarmingDreamResets -
                    before.globalWarmingDreamResets),
                BlackHoleDreamResets = Math.Max(
                    0L,
                    after.blackHoleDreamResets -
                    before.blackHoleDreamResets),
                StrangeMatter = Math.Max(
                    0L,
                    after.strangeMatter - before.strangeMatter),
                RealityWorkers = Math.Max(
                    0L,
                    after.realityWorkers - before.realityWorkers),
                AutomaticInfluence = Math.Max(
                    0L,
                    after.automaticInfluence -
                    before.automaticInfluence),
                ManualInfluence = Math.Max(
                    0L,
                    after.manualInfluence - before.manualInfluence),
                RealityCapacityStallSeconds = Math.Max(
                    0d,
                    after.realityCapacityStallSeconds -
                    before.realityCapacityStallSeconds)
            };
        }
    }

    private long CurrentBreakInfinityTarget()
    {
        if (_offlineBreakTargetOverrideActive)
            return Math.Max(1L, _offlineBreakTargetOverride);
        return oracle.saveSettings.infinityPointsToBreakFor >= 1
            ? oracle.saveSettings.infinityPointsToBreakFor
            : 1L;
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
        Prestige(
            CurrentRunTime(),
            updatePresentation: true);
    }

    private void Prestige(
        double simulatedCycleSeconds,
        bool updatePresentation)
    {
        if (updatePresentation)
            skillTreeConfirmationManager.CloseConfirm();
        double seconds =
            NumericSafety.IsFinite(simulatedCycleSeconds) &&
            simulatedCycleSeconds > 0d
                ? simulatedCycleSeconds
                : CurrentRunTime();
        if (seconds <= 0) seconds = 10000;
        if (updatePresentation)
        {
            string lastCollapseInfo = seconds > 10
                ? $"You broke reality in: {CalcUtils.FormatTimeLarge(seconds)}"
                : $"You broke reality in: {seconds:F2} Seconds";
            lastCollapseInfo +=
                $"\nYou have broken reality {prestigeData.infinityPoints + 1} ";
            lastCollapseInfo +=
                prestigeData.infinityPoints > 1 ? "times" : "time";
            runAgePrestigeScreen.text = lastCollapseInfo;
        }

        oracle.saveSettings.timeLastInfinity = seconds;

        dysonVerseSaveData.lastCollapseDate = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        if (updatePresentation &&
            !oracle.saveSettings.infinityFirstRunDone)
            foreach (GameObject VARIABLE in infinityButton)
                VARIABLE.SetActive(true);

        switch (prestigePlus.breakTheLoop)
        {
            case true:
                oracle.AutomaticBreakInfinityReset(
                    updatePresentation);
                break;
            default:
                oracle.DysonInfinity(
                    updatePresentation);
                break;
        }

        if (updatePresentation)
            UpdateSkillsInvoke();

        if (updatePresentation &&
            prestigeData.infinityPoints <= 42 &&
            oracle.saveSettings.prestigePlus.points == 0)
        {
            prestigeScreen.SetActive(true);
        }
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
#if UNITY_EDITOR
        CanonicalSampledBlockTrace = null;
        CanonicalSampledBlockCount = 0L;
#endif
        if (!oracle.saveSettings.eventTimeClockInitialized)
        {
            oracle.saveSettings.eventTimeClockInitialized = true;
            oracle.saveSettings.simulationAutomationTimeUntilNextEvent =
                SimulationTickSeconds;
            oracle.saveSettings.simulationInfinityBoundaryRemaining =
                1d / 60d;
            oracle.saveSettings.simulationInfinityCycleSeconds = 0d;
            oracle.saveSettings.simulationInfinityCycleStartingPoints =
                prestigeData.infinityPoints;
            oracle.saveSettings.simulationInfinityHasPostResetStart = false;
        }
        double automationRemaining =
            oracle.saveSettings.simulationAutomationTimeUntilNextEvent;
        var infinityCycleState = new OfflineInfinityCycleState(
            prestigePlus.breakTheLoop,
            oracle.saveSettings.infinityPointsToBreakFor,
            prestigeData.infinityPoints,
            oracle.saveSettings.simulationInfinityHasPostResetStart,
            oracle.saveSettings.simulationInfinityCycleStartingPoints,
            oracle.saveSettings.simulationInfinityCycleSeconds);
        var eventTimeModel = new StoredRuntimeEventTimeModel(
            this,
            infinityCycleState,
            automationRemaining,
            oracle.saveSettings.simulationInfinityBoundaryRemaining);
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
                RunOfflineCanonicalTick(infinityCycleState),
            RunCanonicalWholeGameRemainder = seconds =>
                RunOfflineCanonicalRemainder(
                    seconds,
                    infinityCycleState),
            RunAnalyticalTicks = ticks =>
                TryRunAnalyticalOfflineTicks(
                    ticks,
                    infinityCycleState),
            RunUnifiedSimulation = seconds =>
            {
                SimulationAdvanceResult result =
                    UnifiedEventTimeSimulation.Advance(
                        new SimulationAdvanceRequest
                        {
                            StartingState = eventTimeModel,
                            DurationSeconds = seconds,
                            Mode = SimulationAdvanceMode.StoredTime,
                            AutomationPolicy =
                                SimulationAutomationPolicy.ForceBuyMax,
                            AutomationIntervalSeconds =
                                SimulationTickSeconds,
                            AutomationTimeUntilNextEvent =
                                automationRemaining,
                            InfinityMinimumCycleSeconds = 1d / 60d,
                            ProcessingBudgetMilliseconds = 4d,
                            AllowAcceleration =
                                _unifiedAccelerationEnabled,
                            CloneStartingState = false,
                            ProcessPartialEndpoint = true
                        });
                automationRemaining =
                    result.AutomationTimeUntilNextEvent;
                oracle.saveSettings.simulationAutomationTimeUntilNextEvent =
                    automationRemaining;
                oracle.saveSettings.simulationInfinityBoundaryRemaining =
                    eventTimeModel.InfinityBoundaryRemaining;
                oracle.saveSettings.simulationInfinityCycleSeconds =
                    infinityCycleState.SecondsInCurrentCycle;
                oracle.saveSettings.simulationInfinityCycleStartingPoints =
                    infinityCycleState.CycleStartingInfinityPoints;
                oracle.saveSettings.simulationInfinityHasPostResetStart =
                    infinityCycleState.HasPostResetStart;
                return result;
            }
        };
    }

#if UNITY_EDITOR
    public void SetUnifiedAccelerationForTests(bool enabled)
    {
        _unifiedAccelerationEnabled = enabled;
    }

    public void SetSampledInfinityProjectionForTests(bool enabled)
    {
        _sampledInfinityProjectionEnabled = enabled;
    }
#endif

    private long TryRunAnalyticalOfflineTicks(
        long requestedTicks,
        OfflineInfinityCycleState infinityCycleState,
        bool allowCanonicalFallback = true)
    {
        if (requestedTicks < 2L)
            return 0L;
        infinityCycleState.SynchronizeBeforeFirstTick(
            prestigeData.infinityPoints);

        if ((prestigeData.infinityAutoBots && botsAutoBuy == null) ||
            (prestigeData.infinityAutoResearch && researchAutoBuy == null))
        {
            return allowCanonicalFallback
                ? RunCanonicalOfflineBurst(
                    requestedTicks,
                    infinityCycleState)
                : 0L;
        }

        bool dreamIdle = DreamAnalyticalOfflineSimulation.IsClockIdle(
            oracle.saveSettings.sdSimulation,
            spaceAgeManager != null && spaceAgeManager.IsRailgunFiring);
        double resetThreshold = GetOfflineResetBotThreshold(
            infinityCycleState);
        DreamOfflineTiming dreamTiming = default;
        bool dreamAdaptive = false;
        long dreamHorizon = requestedTicks;
        if (!dreamIdle)
        {
            if (!TryGetDreamOfflineTiming(out dreamTiming))
                return allowCanonicalFallback
                    ? RunCanonicalOfflineBurst(
                        requestedTicks,
                        infinityCycleState,
                        maximumTicks: 1)
                    : 0L;
            dreamAdaptive =
                DreamAdaptiveLongIntervalSimulation.CanProject(
                    oracle.saveSettings.sdSimulation,
                    oracle.saveSettings.sdPrestige,
                    dreamTiming);
            if (dreamAdaptive)
            {
                dreamHorizon = requestedTicks;
            }
            else
            {
            dreamHorizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                oracle.saveSettings.sdSimulation,
                oracle.saveSettings.sdPrestige,
                dreamTiming,
                requestedTicks);
            if (dreamHorizon < 2L)
            {
                return allowCanonicalFallback
                    ? RunCoupledDreamEventBurst(
                        requestedTicks,
                        resetThreshold,
                        infinityCycleState)
                    : 0L;
            }
            }
        }

        long processed =
            AnalyticalOfflineSimulation.TryAdvanceDysonWithExactBotDistribution(
                infinityData,
                skillTreeData,
                prestigeData,
                prestigePlus,
                dreamHorizon,
                resetThreshold,
                HasOfflineAutomationEvent);
        if (processed <= 0L &&
            !AnalyticalOfflineSimulation
                .LastExactBotDistributionAttemptSupported)
        {
            processed = AnalyticalOfflineSimulation.TryAdvanceDyson(
                infinityData,
                skillTreeData,
                prestigeData,
                prestigePlus,
                dreamHorizon,
                resetThreshold,
                HasOfflineAutomationEvent);
        }
        if (processed <= 0L)
        {
            return allowCanonicalFallback
                ? RunCanonicalOfflineBurst(
                    requestedTicks,
                    infinityCycleState,
                    maximumTicks: 1)
                : 0L;
        }

        infinityCycleState.AddElapsed(
            processed * SimulationTickSeconds);
        RecordStoredTimeWithoutInfinityReset(
            processed * SimulationTickSeconds);
        AdvanceDreamAndAutomationWithoutDyson(
            processed,
            dreamIdle,
            dreamTiming,
            dreamAdaptive);
        return processed;
    }

    private double GetOfflineResetBotThreshold(
        OfflineInfinityCycleState infinityCycleState)
    {
        double ordinaryThreshold = prestigePlus.divisionsPurchased > 0
            ? 4.2e19 / Math.Pow(10d, prestigePlus.divisionsPurchased)
            : 4.2e19;
        ordinaryThreshold = Math.Min(
            ordinaryThreshold,
            double.MaxValue);
        if (!infinityCycleState.BreakTheLoop)
            return ordinaryThreshold;

        long rewardMultiplier = 1L;
        if (oracle.saveSettings.doubleIp)
            rewardMultiplier *= 2L;
        if (prestigePlus.doubleIP)
            rewardMultiplier *= 2L;
        long capturedTarget = infinityCycleState.CapturedBreakTarget;
        long requiredBaseReward =
            capturedTarget / rewardMultiplier +
            (capturedTarget % rewardMultiplier == 0L ? 0L : 1L);
        requiredBaseReward = Math.Max(1L, requiredBaseReward);
        double threshold = CalcUtils.BuyXCost(
            requiredBaseReward,
            ordinaryThreshold,
            oracle.infinityExponent,
            0d);
        return threshold > 0d && NumericSafety.IsFinite(threshold)
            ? threshold
            : double.MaxValue;
    }

    private double TimeToNextInfinityMaterialEvent(
        double maximumSeconds,
        double minimumCycleSeconds,
        double elapsedCycleSeconds,
        double boundaryRemaining,
        OfflineInfinityCycleState infinityCycleState)
    {
        double minimumProgressSeconds =
            NumericSafety.BitIncrement(1e-12d);
        if (!NumericSafety.IsFinite(maximumSeconds) ||
            maximumSeconds <= 0d ||
            !NumericSafety.IsFinite(minimumCycleSeconds) ||
            minimumCycleSeconds <= 0d)
        {
            return Math.Max(
                minimumProgressSeconds,
                maximumSeconds);
        }

        _ = boundaryRemaining;
        double resetThreshold =
            GetOfflineResetBotThreshold(infinityCycleState);
        if (infinityData.bots >= resetThreshold)
            return Math.Min(
                maximumSeconds,
                Math.Max(
                    minimumProgressSeconds,
                    minimumCycleSeconds -
                    elapsedCycleSeconds));

        double minimumRemaining = Math.Max(
            0d,
            minimumCycleSeconds - elapsedCycleSeconds);
        double production = infinityData.botProduction;
        if (!NumericSafety.IsFinite(production) ||
            production <= 0d)
        {
            return maximumSeconds;
        }

        // Rates remain fixed until the next material event. The shared
        // scheduler already stops at an earlier automation event and
        // recomputes after purchases. Infinity's 1/60-second rule is a
        // minimum duration, not a permanent polling grid.
        double productionRemaining =
            Math.Max(0d, resetThreshold - infinityData.bots) /
            production;
        if (productionRemaining > 0d)
        {
            // Land just beyond the representable threshold crossing so the
            // reward formula cannot observe a one-ULP shortfall and defer the
            // reset to an unrelated later event.
            productionRemaining =
                NumericSafety.BitIncrement(productionRemaining);
        }
        double eventSeconds = Math.Max(
            minimumRemaining,
            productionRemaining);
        return NumericSafety.IsFinite(eventSeconds)
            ? Math.Min(
                maximumSeconds,
                Math.Max(
                    minimumProgressSeconds,
                    eventSeconds))
            : maximumSeconds;
    }

    private static bool IsMinimumInfinityCycle(
        double duration,
        double minimum)
    {
        if (!NumericSafety.IsFinite(duration) ||
            !NumericSafety.IsFinite(minimum) ||
            minimum <= 0d)
        {
            return false;
        }
        return duration <= NumericSafety.BitIncrement(minimum);
    }

    private static double SampledProjectionIpGrowthLimit(
        double simulatedSeconds,
        double adaptiveAdjustment)
    {
        double allowed =
            ProjectionValidationPolicy
                .AllowedModelDisagreement(simulatedSeconds);
        double scale = 0.50d;
        if (NumericSafety.IsFinite(simulatedSeconds) &&
            simulatedSeconds > 60d)
        {
            // Longer stored-time requests deliberately use larger IP-growth
            // blocks. The checkpoint controller can still contract them when
            // genuine cycles show sustained local drift. This avoids treating
            // one day or one month as thousands of one-hour-sized blocks.
            double durationOrders = Math.Clamp(
                Math.Log10(simulatedSeconds / 60d),
                0d,
                6d);
            scale = NumericSafety.Add(
                scale,
                NumericSafety.Multiply(
                    0.395d,
                    NumericSafety.Multiply(
                        durationOrders,
                        durationOrders).Value).Value).Value;
        }
        double durationScaledLimit = Math.Min(
            0.50d,
            NumericSafety.Multiply(
                allowed,
                scale).Value);
        double safeAdjustment =
            NumericSafety.IsFinite(adaptiveAdjustment)
                ? Math.Clamp(adaptiveAdjustment, 0.25d, 1d)
                : 0.25d;
        return NumericSafety.Multiply(
            durationScaledLimit,
            safeAdjustment).Value;
    }

    private static bool HasUsefulSampleProjectionHorizon(
        InfinityCycleSample latest,
        double maximumSeconds)
    {
        if (!NumericSafety.IsFinite(maximumSeconds) ||
            maximumSeconds <= 0d)
        {
            return false;
        }

        if (latest.DurationSeconds <
            SimulationTickSeconds - 1e-12d)
        {
            return true;
        }

        const int slowCalibrationWindowCycles = 24;
        double calibrationWindowSeconds =
            NumericSafety.Multiply(
                latest.DurationSeconds,
                slowCalibrationWindowCycles).Value;
        return maximumSeconds + 1e-12d >=
               calibrationWindowSeconds;
    }

    private bool TryCreateCanonicalSampledBreakProjection(
        OfflineInfinityCycleState infinityCycleState,
        InfinityCycleSample first,
        InfinityCycleSample second,
        InfinityCycleSample third,
        double maximumSeconds,
        double minimumCycleSeconds,
        out InfinityCycleProjection projection)
    {
        projection = default;
        if (!HasUsefulSampleProjectionHorizon(
                third,
                maximumSeconds))
        {
            return false;
        }

        if (AnalyticalOfflineSimulation.HasPersistentSideEffects(
                skillTreeData))
        {
            return false;
        }

        // The current cleanup scope accelerates Dyson/Infinity only. An
        // active Dream clock retains canonical event processing until its
        // independent projection design is revisited; Dream state is never
        // frozen, discarded, or approximated by this path.
        if (!DreamAnalyticalOfflineSimulation.IsClockIdle(
                oracle.saveSettings.sdSimulation,
                spaceAgeManager != null &&
                spaceAgeManager.IsRailgunFiring))
        {
            return false;
        }

        if (!AdaptiveInfinityCycleSimulation
                .TryProjectSampledSeconds(
                first,
                second,
                third,
                prestigeData.infinityPoints,
                maximumSeconds,
                minimumCycleSeconds,
                SampledProjectionIpGrowthLimit(
                    maximumSeconds,
                    infinityCycleState.ProjectionGrowthAdjustment),
                ProjectionValidationPolicy.AllowedModelDisagreement(
                    maximumSeconds),
                out projection))
        {
            return false;
        }

        // Saturation is an exact gameplay boundary. Leave the final approach
        // to the canonical scheduler so aggregate statistics cannot claim
        // rewards that the capped long balance did not actually receive.
        return projection.FinalInfinityPoints < long.MaxValue;
    }

    private long ApplyCanonicalSampledBreakProjection(
        InfinityCycleProjection projection,
        OfflineInfinityCycleState infinityCycleState)
    {
        ConsumeIdleDreamDoubleTimeForProjection(
            projection.ConsumedSeconds);
        long startingIp = prestigeData.infinityPoints;
        ApplyAdaptiveInfinityProjection(
            projection,
            infinityCycleState);
        infinityCycleState.RequireCanonicalResampling(
            projection,
            ProjectionValidationPolicy.AllowedModelDisagreement(
                projection.ConsumedSeconds));
        return Math.Max(
            0L,
            prestigeData.infinityPoints - startingIp);
    }

    private static void ConsumeIdleDreamDoubleTimeForProjection(
        double seconds)
    {
        SaveDataPrestige dreamPrestige =
            Oracle.oracle.saveSettings.sdPrestige;
        if (dreamPrestige == null ||
            !NumericSafety.IsFinite(seconds) ||
            seconds <= 0d)
        {
            return;
        }

        int rate = Math.Max(
            0,
            Math.Min(10, dreamPrestige.doubleTimeRate));
        double requested = NumericSafety.Multiply(
            seconds,
            rate).Value;
        dreamPrestige.doubleTime = Math.Max(
            0d,
            dreamPrestige.doubleTime -
            Math.Min(
                Math.Max(0d, dreamPrestige.doubleTime),
                requested));
        dreamPrestige.doDoubleTime =
            dreamPrestige.doubleTimeOwned &&
            dreamPrestige.doubleTime > 0d;
    }

    private bool CanProjectStableBreakCycles(
        bool allowCoincidentAutomation)
    {
        return prestigePlus.breakTheLoop &&
               (allowCoincidentAutomation ||
                (!prestigeData.infinityAutoBots &&
                 !prestigeData.infinityAutoResearch)) &&
               NumericSafety.IsFinite(infinityData.bots) &&
               NumericSafety.IsFinite(infinityData.botProduction) &&
               infinityData.bots >= 0d &&
               infinityData.botProduction > 0d &&
               infinityData.assemblyLineProduction == 0d &&
               infinityData.managerProduction == 0d &&
               infinityData.serverProduction == 0d &&
               infinityData.dataCenterProduction == 0d &&
               infinityData.totalPlanetProduction == 0d &&
               infinityData.matrioshkaBrainPlanetProduction == 0d &&
               infinityData.birchPlanetMatrioshkaProduction == 0d &&
               infinityData.galacticBrainBirchProduction == 0d;
    }

    private bool TryCreateStableBreakCycleEvaluator(
        double minimumCycleSeconds,
        OfflineInfinityCycleState infinityCycleState,
        out StableBreakInfinityCycleEvaluator evaluator)
    {
        evaluator = null;
        if (!prestigePlus.breakTheLoop ||
            !NumericSafety.IsFinite(minimumCycleSeconds) ||
            minimumCycleSeconds <= 0d)
        {
            return false;
        }

        return StableBreakInfinityCycleEvaluator.TryCreate(
            infinityData,
            skillTreeData,
            prestigeData,
            prestigePlus,
            GetOfflineResetBotThreshold(
                infinityCycleState),
            minimumCycleSeconds,
            infinityCycleState.CapturedBreakTarget,
            CalculateBreakRewardForBots,
            out evaluator);
    }

    private long CalculateBreakRewardForBots(double bots)
    {
        if (!NumericSafety.IsFinite(bots) || bots <= 0d)
            return 0L;
        double ordinaryThreshold =
            prestigePlus.divisionsPurchased > 0L
                ? 4.2e19 / Math.Pow(
                    10d,
                    prestigePlus.divisionsPurchased)
                : 4.2e19;
        long reward = StaticMethods.InfinityPointsToGain(
            ordinaryThreshold,
            bots);
        if (oracle.saveSettings.doubleIp)
            reward = NumericSafety.Add(reward, reward).Value;
        if (prestigePlus.doubleIP)
            reward = NumericSafety.Add(reward, reward).Value;
        return reward;
    }

    private void ApplyAdaptiveInfinityProjection(
        InfinityCycleProjection projection,
        OfflineInfinityCycleState infinityCycleState)
    {
        long startingInfinityPoints = prestigeData.infinityPoints;
        prestigeData.infinityPoints = Math.Max(
            prestigeData.infinityPoints,
            projection.FinalInfinityPoints);
        long aggregateReward = Math.Max(
            0L,
            prestigeData.infinityPoints - startingInfinityPoints);
        oracle.saveSettings.lastInfinityPointsGained =
            projection.LastReward >= int.MaxValue
                ? int.MaxValue
                : (int)Math.Max(1L, projection.LastReward);
        oracle.saveSettings.timeLastInfinity =
            projection.LastDurationSeconds;
        dysonVerseSaveData.lastCollapseDate =
            DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        oracle.saveSettings.firstInfinityDone = true;
        oracle.saveSettings.infinityInProgress = false;
        oracle.saveSettings.botCapTransitionPending = false;
        oracle.saveSettings.botCapRewardsGranted = false;
        ModifierSystem.UpdatePanelLifetime(
            infinityData,
            skillTreeData,
            prestigeData,
            prestigePlus);
        ProductionSystem.SetBotDistribution(
            infinityData,
            prestigeData,
            prestigePlus);
        ProductionSystem.RecalculateDerivedState(
            infinityData,
            skillTreeData,
            prestigeData,
            prestigePlus);
        oracle.saveSettings.simulationStatistics
            ?.RecordInfinityAggregate(
                infinityCycleState.BreakTheLoop,
                projection.CycleCount,
                aggregateReward,
                projection.LastDurationSeconds,
                projection.LastReward,
                projection.ConsumedSeconds);
        infinityCycleState.AcceptProjection(projection);
    }

    private void AdvanceDreamForActiveBreakBlock(
        double seconds,
        double eventIntervalSeconds)
    {
        if (!NumericSafety.IsFinite(seconds) ||
            seconds <= 0d ||
            !NumericSafety.IsFinite(eventIntervalSeconds) ||
            eventIntervalSeconds <= 0d)
        {
            return;
        }

        double remaining = seconds;
        while (remaining > 1e-12d)
        {
            double step = Math.Min(
                remaining,
                eventIntervalSeconds);
            bool engineeringCompleteAtStart =
                oracle.saveSettings.sdSimulation.engineeringComplete;
            DreamDoubleTimeTick doubleTimeTick =
                doubleTimeManager != null
                    ? doubleTimeManager.PrepareSimulationTick(step)
                    : DreamDoubleTimeMath.Prepare(
                        oracle.saveSettings.sdPrestige.doubleTimeOwned,
                        oracle.saveSettings.sdPrestige.doubleTime,
                        oracle.saveSettings.sdPrestige.doubleTimeRate,
                        step);
            if (doubleTimeManager == null)
            {
                oracle.saveSettings.sdPrestige.doDoubleTime =
                    doubleTimeTick.Active;
            }

            // Preserve the canonical downstream-first, start-of-event
            // production snapshots while Infinity cycles are aggregated.
            spaceAgeManager?.RunProductionTick(
                doubleTimeTick.EffectiveMultiplier,
                step,
                updatePresentation: false);
            informationEraManager?.RunProductionTick(
                doubleTimeTick.EffectiveMultiplier,
                step,
                updatePresentation: false);
            foundationalEraManager?.RunProductionTick(
                engineeringCompleteAtStart,
                doubleTimeTick.EffectiveMultiplier,
                step,
                updatePresentation: false);

            foundationalEraManager?.CompleteSimulationTick(
                updatePresentation: false);
            informationEraManager?.CompleteSimulationTick(
                updatePresentation: false);
            spaceAgeManager?.CompleteSimulationTick(
                updatePresentation: false);

            if (doubleTimeManager != null)
            {
                doubleTimeManager.CompleteSimulationTick(
                    doubleTimeTick);
            }
            else
            {
                SaveDataPrestige dreamPrestige =
                    oracle.saveSettings.sdPrestige;
                if (!NumericSafety.IsFinite(
                        dreamPrestige.doubleTime))
                {
                    dreamPrestige.doubleTime = 0d;
                }
                dreamPrestige.doubleTime = Math.Max(
                    0d,
                    dreamPrestige.doubleTime -
                    doubleTimeTick.BankConsumed);
                dreamPrestige.doDoubleTime =
                    dreamPrestige.doubleTimeOwned &&
                    dreamPrestige.doubleTime > 0d;
            }

            // TryAccelerateBreakInfinity admits only a stable Dream signature
            // with no automatic reset stage. Keep the canonical evaluation as
            // a safety net if that contract changes later.
            EvaluateDreamTransition(updatePresentation: false);
            remaining = Math.Max(0d, remaining - step);
        }
    }

    private void AdvanceDreamAndAutomationWithoutDyson(
        long ticks,
        bool dreamIdle,
        DreamOfflineTiming dreamTiming,
        bool dreamAdaptive = false)
    {
        if (ticks <= 0L) return;
        RealityAdvanceResult reality = AdvanceRealityStoredTime(
            ticks * SimulationTickSeconds);
        Oracle.SaveDataPrestige dreamPrestige =
            oracle.saveSettings.sdPrestige;
        if (!dreamIdle)
        {
            bool advanced = dreamAdaptive &&
                DreamAdaptiveLongIntervalSimulation.TryAdvance(
                    oracle.saveSettings.sdSimulation,
                    dreamPrestige,
                    dreamTiming,
                    ticks * SimulationTickSeconds,
                    out _);
            if (dreamAdaptive && !advanced)
            {
                RunDreamOnlyOfflineBurst(ticks);
            }
            else if (!dreamAdaptive)
            {
                DreamAnalyticalOfflineSimulation.AdvanceValidatedQuietTicks(
                    oracle.saveSettings.sdSimulation,
                    dreamPrestige,
                    dreamTiming,
                    ticks);
            }
            SimulationPrestigeManager.InvokeResetSimulationRuntime();
        }
        else if (dreamPrestige != null)
        {
            dreamPrestige.doubleTime =
                DreamDoubleTimeMath.RemainingBankAfterTicks(
                    dreamPrestige.doubleTimeOwned,
                    dreamPrestige.doubleTime,
                    dreamPrestige.doubleTimeRate,
                    ticks,
                    SimulationTickSeconds);
            dreamPrestige.doDoubleTime =
                dreamPrestige.doubleTimeOwned &&
                dreamPrestige.doubleTime > 0d;
        }

        botsAutoBuy?.SkipAutomationTicks(ticks);
        researchAutoBuy?.SkipAutomationTicks(ticks);
        RecordRealitySegment(
            ticks * SimulationTickSeconds,
            reality);
    }

    private RealityAdvanceResult AdvanceRealityStoredTime(
        double seconds)
    {
        if (_workerService == null)
            ServiceLocator.TryGet(out _workerService);
        return _workerService != null
            ? _workerService.AdvanceSimulation(seconds)
            : default;
    }

    private bool TryAdvanceDysonWithoutMaterialEvents(
        double seconds,
        double resetThreshold)
    {
        if (!NumericSafety.IsFinite(seconds) ||
            seconds <= 0d ||
            Math.Abs(
                seconds / SimulationTickSeconds -
                Math.Round(
                    seconds / SimulationTickSeconds)) > 1e-8d ||
            AnalyticalOfflineSimulation.HasPersistentSideEffects(
                skillTreeData))
        {
            return false;
        }

        long ticks = NumericSafety.ToLongFloor(
            Math.Round(
                seconds /
                SimulationTickSeconds)).Value;
        if (ticks < 1L) return false;

        DysonVerseInfinityData candidate;
        try
        {
            candidate =
                (DysonVerseInfinityData)
                Sirenix.Serialization.SerializationUtility.CreateCopy(
                    infinityData);
        }
        catch
        {
            return false;
        }

        long processed;
        if (ticks == 1L)
        {
            if (!AnalyticalOfflineSimulation.TryCaptureState(
                    candidate,
                    out DysonAnalyticalState start) ||
                HasOfflineAutomationEvent(start))
            {
                return false;
            }
            ProductionSystem.SetBotDistribution(
                candidate,
                prestigeData,
                prestigePlus);
            ProductionSystem.CalculateProduction(
                candidate,
                skillTreeData,
                prestigeData,
                prestigePlus,
                SimulationTickSeconds,
                recomputeDerivedState: false);
            ProductionSystem.RecalculateDerivedState(
                candidate,
                skillTreeData,
                prestigeData,
                prestigePlus);
            processed = 1L;
        }
        else
        {
            processed =
                AnalyticalOfflineSimulation
                    .TryAdvanceDysonWithExactBotDistribution(
                        candidate,
                        skillTreeData,
                        prestigeData,
                        prestigePlus,
                        ticks,
                        resetThreshold,
                        HasOfflineAutomationEvent);
            if (processed <= 0L &&
                !AnalyticalOfflineSimulation
                    .LastExactBotDistributionAttemptSupported)
            {
                processed =
                    AnalyticalOfflineSimulation.TryAdvanceDyson(
                        candidate,
                        skillTreeData,
                        prestigeData,
                        prestigePlus,
                        ticks,
                        resetThreshold,
                        HasOfflineAutomationEvent);
            }
        }

        if (processed != ticks ||
            candidate.bots >= resetThreshold ||
            !AnalyticalOfflineSimulation.TryCaptureState(
                candidate,
                out DysonAnalyticalState endpoint) ||
            HasOfflineAutomationEvent(endpoint))
        {
            return false;
        }

        dysonVerseSaveData.dysonVerseInfinityData =
            candidate;
        ProductionSystem.SetBotDistribution(
            infinityData,
            prestigeData,
            prestigePlus);
        ProductionSystem.RecalculateDerivedState(
            infinityData,
            skillTreeData,
            prestigeData,
            prestigePlus);
        return true;
    }

    private void RecordRealitySegment(
        double seconds,
        RealityAdvanceResult reality)
    {
        oracle.saveSettings.simulationStatistics?.RecordSegment(
            seconds,
            new SimulationPresentationSummary
            {
                RealityWorkers = reality.WorkersGenerated,
                AutomaticInfluence = reality.AutomaticInfluence,
                RealityCapacityStallSeconds = reality.StalledSeconds
            });
    }

    private void RecordStoredTimeWithoutInfinityReset(
        double seconds)
    {
        SaveDataSettings settings = oracle.saveSettings;
        InfinityStoredTimeUsage usage =
            InfinityStoredTimeAccounting.AdvanceWithoutReset(
                settings.offlineTimeUsedThisInfinity,
                settings.offlineTimeUsedPreviousInfinity,
                seconds);
        settings.offlineTimeUsedThisInfinity =
            usage.CurrentInfinity;
        settings.offlineTimeUsedPreviousInfinity =
            usage.PreviousInfinity;
    }

    private void RunOfflineCanonicalTick(
        OfflineInfinityCycleState infinityCycleState)
    {
        infinityCycleState.SynchronizeBeforeFirstTick(
            prestigeData.infinityPoints);
        infinityCycleState.AddElapsed(SimulationTickSeconds);
        RecordStoredTimeWithoutInfinityReset(
            SimulationTickSeconds);
        bool previousOverrideActive =
            _offlineBreakTargetOverrideActive;
        long previousOverride = _offlineBreakTargetOverride;
        _offlineBreakTargetOverrideActive =
            infinityCycleState.BreakTheLoop;
        _offlineBreakTargetOverride =
            infinityCycleState.CapturedBreakTarget;
        try
        {
            bool resetCompleted =
                RunSimulationTick(forceOfflineBuyMax: true);
            if (infinityCycleState.ObserveReset(
                    prestigeData.infinityPoints,
                    resetCompleted,
                    out double completedDurationSeconds,
                    out _))
            {
                oracle.saveSettings.timeLastInfinity =
                    completedDurationSeconds;
            }
        }
        finally
        {
            _offlineBreakTargetOverrideActive =
                previousOverrideActive;
            _offlineBreakTargetOverride = previousOverride;
        }

    }

    private void RunOfflineCanonicalRemainder(
        double seconds,
        OfflineInfinityCycleState infinityCycleState)
    {
        infinityCycleState.SynchronizeBeforeFirstTick(
            prestigeData.infinityPoints);
        infinityCycleState.AddElapsed(seconds);
        RecordStoredTimeWithoutInfinityReset(
            seconds);
        bool previousOverrideActive =
            _offlineBreakTargetOverrideActive;
        long previousOverride = _offlineBreakTargetOverride;
        _offlineBreakTargetOverrideActive =
            infinityCycleState.BreakTheLoop;
        _offlineBreakTargetOverride =
            infinityCycleState.CapturedBreakTarget;
        try
        {
            bool resetCompleted =
                RunSimulationRemainder(seconds);
            if (infinityCycleState.ObserveReset(
                    prestigeData.infinityPoints,
                    resetCompleted,
                    out double completedDurationSeconds,
                    out _))
            {
                oracle.saveSettings.timeLastInfinity =
                    completedDurationSeconds;
            }
        }
        finally
        {
            _offlineBreakTargetOverrideActive =
                previousOverrideActive;
            _offlineBreakTargetOverride = previousOverride;
        }

    }

    private long RunCoupledDreamEventBurst(
        long requestedTicks,
        double resetThreshold,
        OfflineInfinityCycleState infinityCycleState)
    {
        long limit = Math.Min(
            requestedTicks,
            MaximumExactDreamBurstTicks);
        long totalProcessed = 0L;
        while (totalProcessed < limit)
        {
            long remaining = limit - totalProcessed;
            long dysonProcessed =
                AnalyticalOfflineSimulation.TryAdvanceDysonWithExactBotDistribution(
                    infinityData,
                    skillTreeData,
                    prestigeData,
                    prestigePlus,
                    remaining,
                    resetThreshold,
                    HasOfflineAutomationEvent);
            if (dysonProcessed <= 0L &&
                !AnalyticalOfflineSimulation
                    .LastExactBotDistributionAttemptSupported)
            {
                dysonProcessed = AnalyticalOfflineSimulation.TryAdvanceDyson(
                    infinityData,
                    skillTreeData,
                    prestigeData,
                    prestigePlus,
                    remaining,
                    resetThreshold,
                    HasOfflineAutomationEvent);
            }

            if (dysonProcessed >= 2L)
            {
                RealityAdvanceResult reality = AdvanceRealityStoredTime(
                    dysonProcessed * SimulationTickSeconds);
                RunDreamOnlyOfflineBurst(dysonProcessed);
                botsAutoBuy?.SkipAutomationTicks(dysonProcessed);
                researchAutoBuy?.SkipAutomationTicks(dysonProcessed);
                infinityCycleState.AddElapsed(
                    dysonProcessed * SimulationTickSeconds);
                RecordStoredTimeWithoutInfinityReset(
                    dysonProcessed * SimulationTickSeconds);
                totalProcessed += dysonProcessed;
                RecordRealitySegment(
                    dysonProcessed * SimulationTickSeconds,
                    reality);
                continue;
            }

            RunOfflineCanonicalTick(infinityCycleState);
            AnalyticalOfflineSimulation.ConsumeExactBotDistributionPlanTicks(
                infinityData,
                1L);
            totalProcessed++;
        }

        return totalProcessed;
    }

    private void RunDreamOnlyOfflineBurst(long ticks)
    {
        for (long tick = 0L; tick < ticks; tick++)
        {
            bool engineeringCompleteAtStart =
                oracle.saveSettings.sdSimulation.engineeringComplete;
            DreamDoubleTimeTick doubleTimeTick = doubleTimeManager != null
                ? doubleTimeManager.PrepareSimulationTick(SimulationTickSeconds)
                : DreamDoubleTimeMath.Prepare(
                    oracle.saveSettings.sdPrestige.doubleTimeOwned,
                    oracle.saveSettings.sdPrestige.doubleTime,
                    oracle.saveSettings.sdPrestige.doubleTimeRate,
                    SimulationTickSeconds);
            if (doubleTimeManager == null)
                oracle.saveSettings.sdPrestige.doDoubleTime =
                    doubleTimeTick.Active;

            spaceAgeManager?.RunProductionTick(
                doubleTimeTick.EffectiveMultiplier,
                SimulationTickSeconds,
                updatePresentation: false);
            informationEraManager?.RunProductionTick(
                doubleTimeTick.EffectiveMultiplier,
                SimulationTickSeconds,
                updatePresentation: false);
            foundationalEraManager?.RunProductionTick(
                engineeringCompleteAtStart,
                doubleTimeTick.EffectiveMultiplier,
                SimulationTickSeconds,
                updatePresentation: false);

            foundationalEraManager?.RunAutomationTick();
            informationEraManager?.RunAutomationTick();
            spaceAgeManager?.RunAutomationTick();

            if (doubleTimeManager != null)
            {
                doubleTimeManager.CompleteSimulationTick(doubleTimeTick);
            }
            else
            {
                Oracle.SaveDataPrestige dreamPrestige =
                    oracle.saveSettings.sdPrestige;
                if (!NumericSafety.IsFinite(dreamPrestige.doubleTime))
                    dreamPrestige.doubleTime = 0d;
                dreamPrestige.doubleTime = Math.Max(
                    0d,
                    dreamPrestige.doubleTime - doubleTimeTick.BankConsumed);
                dreamPrestige.doDoubleTime =
                    dreamPrestige.doubleTimeOwned && dreamPrestige.doubleTime > 0d;
            }

            simulationPrestigeManager?.EvaluateSimulationTransitions(
                updatePresentation: false);
        }

        foundationalEraManager?.CompleteSimulationTick(updatePresentation: false);
        informationEraManager?.CompleteSimulationTick(updatePresentation: false);
        spaceAgeManager?.CompleteSimulationTick(updatePresentation: false);
    }

    private long RunCanonicalOfflineBurst(
        long requestedTicks,
        OfflineInfinityCycleState infinityCycleState,
        int maximumTicks = MaximumCanonicalOfflineBurstTicks)
    {
        long limit = Math.Min(requestedTicks, Math.Max(1, maximumTicks));
        if (limit <= 0L) return 0L;

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        long processed = 0L;
        do
        {
            RunOfflineCanonicalTick(infinityCycleState);
            processed++;
            if ((processed & 63L) == 0L &&
                stopwatch.Elapsed.TotalMilliseconds >=
                CanonicalOfflineBurstBudgetMilliseconds)
            {
                break;
            }
        } while (processed < limit);
        AnalyticalOfflineSimulation.ConsumeExactBotDistributionPlanTicks(
            infinityData,
            processed);
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

    private bool TryLimitBreakProjectionToDreamHorizon(
        ref double maximumSeconds)
    {
        bool dreamIdle =
            DreamAnalyticalOfflineSimulation.IsClockIdle(
                oracle.saveSettings.sdSimulation,
                spaceAgeManager != null &&
                spaceAgeManager.IsRailgunFiring);
        if (dreamIdle)
            return true;
        if (!TryGetDreamOfflineTiming(
                out DreamOfflineTiming timing))
        {
            return false;
        }
        double horizon =
            DreamAdaptiveLongIntervalSimulation
                .GetProjectionHorizonSeconds(
                    oracle.saveSettings.sdSimulation,
                    oracle.saveSettings.sdPrestige,
                    timing,
                    maximumSeconds);
        if (!NumericSafety.IsFinite(horizon) ||
            horizon <= 0d)
        {
            return false;
        }
        maximumSeconds = Math.Min(
            maximumSeconds,
            horizon);
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

    public bool RunStoredTimeTransaction(
        double requestedSeconds,
        Action<bool, double> completed = null)
    {
        if (_storedTimeJobRunning ||
            !NumericSafety.IsFinite(requestedSeconds) ||
            requestedSeconds <= 0d ||
            oracle?.saveSettings == null)
        {
            return false;
        }

        double available = NumericSafety.ClampContinuous(
            oracle.saveSettings.offlineTime);
        double spent = Math.Min(requestedSeconds, available);
        if (spent <= 0d) return false;
        StartCoroutine(RunStoredTimeTransactionCoroutine(
            spent,
            completed));
        return true;
    }

    public void CancelStoredTimeProcessing()
    {
        if (_storedTimeJobRunning)
            _storedTimeCancellationRequested = true;
    }

    private IEnumerator RunStoredTimeTransactionCoroutine(
        double spentSeconds,
        Action<bool, double> completed)
    {
        _storedTimeJobRunning = true;
        _storedTimeCancellationRequested = false;
        SetStoredTimeCancelPresentation(active: true);
        SaveDataSettings published = oracle.saveSettings;
        SaveDataSettings candidate;
        try
        {
            candidate =
                (SaveDataSettings)Sirenix.Serialization.SerializationUtility
                    .CreateCopy(published);
        }
        catch (Exception ex)
        {
            Systems.Debugging.NumericDiagnostics.Report(
                "NS-STORED-CANDIDATE-COPY",
                $"type={ex.GetType().Name}");
            _storedTimeJobRunning = false;
            SetStoredTimeCancelPresentation(active: false);
            completed?.Invoke(false, 0d);
            yield break;
        }

        candidate.offlineTime = NumericSafety.Subtract(
            NumericSafety.ClampContinuous(candidate.offlineTime),
            spentSeconds).Value;

        oracle.saveSettings = candidate;
        SimulationPrestigeManager.InvokeResetSimulationRuntime();
        IEnumerator inner = CalculateAwayValues(spentSeconds);
        oracle.saveSettings = published;
        SimulationPrestigeManager.InvokeResetSimulationRuntime();

        bool succeeded = false;
        bool simulationFailed = false;
        while (!_storedTimeCancellationRequested)
        {
            oracle.saveSettings = candidate;
            SimulationPrestigeManager.InvokeResetSimulationRuntime();
            bool moved;
            try
            {
                moved = inner.MoveNext();
            }
            catch (Exception ex)
            {
                Systems.Debugging.NumericDiagnostics.Report(
                    "NS-STORED-SIMULATION",
                    $"type={ex.GetType().Name}");
                moved = false;
                simulationFailed = true;
            }
            candidate = oracle.saveSettings;
            oracle.saveSettings = published;
            SimulationPrestigeManager.InvokeResetSimulationRuntime();

            if (!moved)
            {
                if (simulationFailed)
                {
                    oracle.saveSettings = published;
                    SimulationPrestigeManager.InvokeResetSimulationRuntime();
                    break;
                }
                oracle.saveSettings = candidate;
                SimulationPrestigeManager.InvokeResetSimulationRuntime();
                succeeded = oracle.TrySaveState(out string saveError);
                if (!succeeded)
                {
                    Systems.Debugging.NumericDiagnostics.Report(
                        "NS-STORED-COMMIT",
                        "committed=false");
                    Debug.LogError(
                        $"[StoredTime] Candidate was not published: {saveError}");
                    oracle.saveSettings = published;
                    SimulationPrestigeManager.InvokeResetSimulationRuntime();
                }
                break;
            }

            yield return inner.Current;
        }

        if (_storedTimeCancellationRequested)
        {
            oracle.saveSettings = published;
            SimulationPrestigeManager.InvokeResetSimulationRuntime();
        }

        _storedTimeCancellationRequested = false;
        _storedTimeJobRunning = false;
        SetStoredTimeCancelPresentation(active: false);
        completed?.Invoke(
            succeeded,
            succeeded ? spentSeconds : 0d);
    }

    private void SetStoredTimeCancelPresentation(bool active)
    {
        if (returnScreenConfirmButton == null) return;
        TMP_Text label =
            returnScreenConfirmButton.GetComponentInChildren<TMP_Text>();
        if (label == null) return;
        if (active)
        {
            label.text = "Cancel";
            return;
        }
        if (!string.IsNullOrEmpty(_returnScreenConfirmDefaultText))
            label.text = _returnScreenConfirmDefaultText;
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
                SetSkillsFill(ActivePanelCount() / 20000d);
                if (ActivePanelCount() >= 20000d)
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
                SetSkillsFill(
                    ActivePanelCount() /
                    20000d /
                    1000000000d);
                if (ActivePanelCount() / 20000d >= 1000000000d)
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
                SetSkillsFill(
                    ActivePanelCount() /
                    20000d /
                    10000000000d);
                if (ActivePanelCount() / 20000d >= 10000000000d)
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
                SetSkillsFill(
                    ActivePanelCount() /
                    20000d /
                    100000000000d);
                if (ActivePanelCount() /
                    20000d /
                    100000000000d > 1d)
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
                SetSkillsFill(
                    ActivePanelCount() /
                    20000d /
                    100000000000d /
                    10d);
                if (ActivePanelCount() /
                    20000d /
                    100000000000d > 10d)
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
                SetSkillsFill(
                    ActivePanelCount() /
                    20000d /
                    100000000000d /
                    100d);
                if (ActivePanelCount() /
                    20000d /
                    100000000000d > 100d)
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
        double activePanelCount = ActivePanelCount();
        if (activePanelCount < 20000d)
            activePanels.text =
                $"Active panels: {color}{CalcUtils.FormatNumber(activePanelCount)}";
        else if (activePanelCount / 20000d < 100000000000d)
            activePanels.text =
                $"Stars Surrounded: {color}{CalcUtils.FormatNumber(activePanelCount / 20000d)}";
        else
            activePanels.text =
                $"Galaxies Engulfed: {color}{CalcUtils.FormatNumber(activePanelCount / 20000d / 100000000000d)}";
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
            $"{halfHeightBreak}Active Panels: {scienceColor}{CalcUtils.FormatNumber(ActivePanelCount())}</color>";
        skillTimersDisplayText +=
            $"<br>Stars Surrounded: {scienceColor}{CalcUtils.FormatNumber(StarsSurrounded(false, false))}</color>";
        skillTimersDisplayText +=
            $"<br>Galaxies Engulfed: {scienceColor}{CalcUtils.FormatNumber(GalaxiesEngulfed(false, false))}</color>{smallTextEnd}";

        double secondsPerIp =
            oracle.saveSettings.lastInfinityPointsGained > 0
                ? NumericSafety.Divide(
                    NumericSafety.ClampContinuous(
                        oracle.saveSettings.timeLastInfinity),
                    oracle.saveSettings.lastInfinityPointsGained).Value
                : 0d;

        skillTimersDisplayText += "<br><br><b>Infinity</b>";
        skillTimersDisplayText +=
            $"<br>{smallTextStart}s/IP: {CalcUtils.FormatTime(secondsPerIp, showDecimal: true, shortForm: true, mspace: false, colourOverride: scienceColor)}{smallTextEnd}";
        SimulationStatistics tracked =
            oracle.saveSettings.simulationStatistics;
        if (tracked != null && tracked.trackedSinceUpdate)
        {
            SimulationStatisticsTotals run =
                tracked.currentQuantumRun;
            SimulationStatisticsTotals recent =
                tracked.recentProcessedSegment;
            long runInfinityCount = NumericSafety.Add(
                run.ordinaryInfinityCount,
                run.breakInfinityCount).Value;
            long runIp = NumericSafety.Add(
                NumericSafety.Add(
                    run.ordinaryInfinityPoints,
                    run.breakInfinityPoints).Value,
                run.botCapInfinityPoints).Value;
            double averageCycle = runInfinityCount > 0L
                ? run.simulatedSeconds / runInfinityCount
                : 0d;
            double trackedSecondsPerIp = runIp > 0L
                ? run.simulatedSeconds / runIp
                : 0d;
            skillTimersDisplayText +=
                $"{halfHeightBreak}{smallTextStart}<b>Tracked Since Update</b>";
            skillTimersDisplayText +=
                $"<br>Current Quantum Run: {CalcUtils.FormatNumber(runInfinityCount)} Infinity / {CalcUtils.FormatNumber(runIp)} IP";
            skillTimersDisplayText +=
                $"<br>Ordinary: {CalcUtils.FormatNumber(run.ordinaryInfinityCount)} / Break: {CalcUtils.FormatNumber(run.breakInfinityCount)}";
            skillTimersDisplayText +=
                $"<br>Average Cycle: {CalcUtils.FormatTime(averageCycle, showDecimal: true, shortForm: true, mspace: false, colourOverride: scienceColor)}";
            skillTimersDisplayText +=
                $"<br>Tracked s/IP: {CalcUtils.FormatTime(trackedSecondsPerIp, showDecimal: true, shortForm: true, mspace: false, colourOverride: scienceColor)}";
            skillTimersDisplayText +=
                $"<br>Recent: {CalcUtils.FormatNumber(NumericSafety.Add(recent.ordinaryInfinityCount, recent.breakInfinityCount).Value)} Infinity, {CalcUtils.FormatNumber(NumericSafety.Add(recent.meteorDreamResets, NumericSafety.Add(recent.aiDreamResets, NumericSafety.Add(recent.globalWarmingDreamResets, recent.blackHoleDreamResets).Value).Value).Value)} Dream resets{smallTextEnd}";
        }
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
