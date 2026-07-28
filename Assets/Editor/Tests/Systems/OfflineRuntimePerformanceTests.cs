using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using Buildings;
using Expansion;
using IdleDysonSwarm.Services;
using NUnit.Framework;
using Research;
using Sirenix.Serialization;
using Systems;
using Systems.Numeric;
using Systems.Skills;
using Systems.Simulation;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class OfflineRuntimePerformanceTests
    {
        private Oracle _oracle;
        private GameManager _gameManager;
        private FoundationalEraManager _foundational;
        private InformationEraManager _information;
        private SpaceAgeManager _space;
        private BotsAutoBuy _botsAutoBuy;
        private ResearchAutoBuy _researchAutoBuy;
        private Oracle _previousOracle;

        [SetUp]
        public void SetUp()
        {
            EditorSceneManager.OpenScene("Assets/Scenes/Game.unity", OpenSceneMode.Single);
            _oracle = UnityEngine.Object.FindFirstObjectByType<Oracle>(
                FindObjectsInactive.Include);
            _gameManager = UnityEngine.Object.FindFirstObjectByType<GameManager>(
                FindObjectsInactive.Include);
            _foundational =
                UnityEngine.Object.FindFirstObjectByType<FoundationalEraManager>(
                    FindObjectsInactive.Include);
            _information =
                UnityEngine.Object.FindFirstObjectByType<InformationEraManager>(
                    FindObjectsInactive.Include);
            _space = UnityEngine.Object.FindFirstObjectByType<SpaceAgeManager>(
                FindObjectsInactive.Include);
            _botsAutoBuy =
                UnityEngine.Object.FindFirstObjectByType<BotsAutoBuy>(
                    FindObjectsInactive.Include);
            _researchAutoBuy =
                UnityEngine.Object.FindFirstObjectByType<ResearchAutoBuy>(
                    FindObjectsInactive.Include);

            Assert.NotNull(_oracle);
            Assert.NotNull(_gameManager);
            Assert.NotNull(_foundational);
            Assert.NotNull(_information);
            Assert.NotNull(_space);

            _previousOracle = Oracle.oracle;
            Oracle.oracle = _oracle;
            BindManager("foundationalEraManager", _foundational);
            BindManager("informationEraManager", _information);
            BindManager("spaceAgeManager", _space);
            BindManager(
                "doubleTimeManager",
                UnityEngine.Object.FindFirstObjectByType<DoubleTimeManager>(
                    FindObjectsInactive.Include));
            BindManager(
                "simulationPrestigeManager",
                UnityEngine.Object.FindFirstObjectByType<SimulationPrestigeManager>(
                    FindObjectsInactive.Include));
            BindManager("botsAutoBuy", _botsAutoBuy);
            BindManager("researchAutoBuy", _researchAutoBuy);
            InvokePrivate(
                UnityEngine.Object.FindFirstObjectByType<Rotator>(
                    FindObjectsInactive.Include),
                "Awake");
            InitializeFacilityAutomation();
            BotsAutoBuy.ResetAutomationDiagnostics();
            SubscribeAndResetRuntime();
        }

        [TearDown]
        public void TearDown()
        {
            InvokePrivate(_foundational, "OnDisable");
            InvokePrivate(_information, "OnDisable");
            InvokePrivate(_space, "OnDisable");
            Oracle.oracle = _previousOracle;
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        }

        [TestCase(60d)]
        [TestCase(60d * 60d)]
        [TestCase(100d * 24d * 60d * 60d)]
        public void ActiveDream_WorkScalesByAnalyticalBlocks(
            double durationSeconds)
        {
            _oracle.saveSettings = CreateRepresentativeSettings();
            SubscribeAndResetRuntime();
            OfflineProgressContext context = CreateContext();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                durationSeconds,
                context,
                ui: null));

            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                2_000d,
                "Dream replay should scale with analytical blocks rather " +
                "than the number of 0.1-second ticks.");
            Assert.Greater(
                work.AcceleratedSeconds,
                durationSeconds * 0.9d);
            Assert.IsTrue(NumericSafety.IsFinite(_oracle.saveSettings.sdSimulation.workers));
            Assert.IsTrue(NumericSafety.IsFinite(_oracle.saveSettings.sdSimulation.cities));
        }

        [Test]
        public void DreamAdaptive_LongRepresentativeReportsStructuralConvergence()
        {
            Oracle.SaveDataSettings settings =
                CreateRepresentativeSettings();
            Oracle.SaveDataSettings resumableSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(settings);
            var timing = new DreamOfflineTiming(
                _foundational.HunterDurationSeconds,
                _foundational.GathererDurationSeconds,
                _foundational.CommunityDurationSeconds,
                _foundational.HousingDurationSeconds,
                _foundational.VillagesDurationSeconds,
                _foundational.WorkersDurationSeconds,
                _foundational.CitiesDurationSeconds,
                _information.FactoriesDurationSeconds,
                _information.BotsDurationSeconds,
                _space.SpaceFactoriesDurationSeconds,
                railgunFiring: false);

            bool accepted =
                DreamAdaptiveLongIntervalSimulation.TryAdvance(
                    settings.sdSimulation,
                    settings.sdPrestige,
                    timing,
                    18d * 60d * 60d,
                    out double error);

            DreamAdaptiveLongIntervalSimulation.ProjectionWork work =
                DreamAdaptiveLongIntervalSimulation
                    .CreateProjectionWork(
                        resumableSettings.sdSimulation,
                        resumableSettings.sdPrestige,
                        timing,
                        18d * 60d * 60d);
            int workSteps = 0;
            double maximumStepMilliseconds = 0d;
            while (!work.IsCompleted && workSteps < 10000)
            {
                var stepTimer =
                    System.Diagnostics.Stopwatch.StartNew();
                DreamAdaptiveLongIntervalSimulation
                    .StepProjectionWork(work);
                stepTimer.Stop();
                maximumStepMilliseconds = Math.Max(
                    maximumStepMilliseconds,
                    stepTimer.Elapsed.TotalMilliseconds);
                workSteps++;
            }

            TestContext.WriteLine(
                $"Dream long projection accepted={accepted}, " +
                $"error={error:R}, field=" +
                $"{DreamAdaptiveLongIntervalSimulation.LastErrorField}, " +
                $"coarse=" +
                $"{DreamAdaptiveLongIntervalSimulation.LastErrorCoarseValue:R}, " +
                $"fine=" +
                $"{DreamAdaptiveLongIntervalSimulation.LastErrorFineValue:R}, " +
                $"segments=" +
                $"{DreamAdaptiveLongIntervalSimulation.LastSegments}");
            Assert.IsTrue(
                accepted,
                "Representative long Dream state should converge without canonical per-tick fallback.");
            Assert.IsTrue(work.Accepted);
            Assert.Greater(
                workSteps,
                1,
                "Dream convergence must be resumable across bounded " +
                "projection steps.");
            Assert.Less(
                maximumStepMilliseconds,
                8d,
                "No Dream refinement step may monopolize the frame.");
            Assert.AreEqual(error, work.ValidationError);
            AssertDreamEqual(
                settings.sdSimulation,
                resumableSettings.sdSimulation);
            Assert.AreEqual(
                settings.sdPrestige.doubleTime,
                resumableSettings.sdPrestige.doubleTime);
            Assert.AreEqual(
                settings.sdPrestige.doDoubleTime,
                resumableSettings.sdPrestige.doDoubleTime);
            Assert.LessOrEqual(
                error,
                SimulationAccuracyContract.MaximumAggregateRelativeError);
        }

        [Test]
        public void DreamAdaptive_ProjectsResearchBoostsAndDoubleTimeBeforeBoundary()
        {
            Oracle.SaveDataSettings settings =
                CreateRepresentativeSettings();
            settings.sdSimulation.engineering = true;
            settings.sdSimulation.engineeringComplete = false;
            settings.sdSimulation.engineeringProgress = 5d;
            settings.sdSimulation.engineeringResearchTime = 1000d;
            settings.sdSimulation.communityBoostTime = 1000d;
            settings.sdSimulation.factoriesBoostTime = 1000d;
            settings.sdPrestige.doubleTimeOwned = true;
            settings.sdPrestige.doubleTime = 1000d;
            settings.sdPrestige.doubleTimeRate = 2;
            settings.sdPrestige.doDoubleTime = true;
            var timing = new DreamOfflineTiming(
                _foundational.HunterDurationSeconds,
                _foundational.GathererDurationSeconds,
                _foundational.CommunityDurationSeconds,
                _foundational.HousingDurationSeconds,
                _foundational.VillagesDurationSeconds,
                _foundational.WorkersDurationSeconds,
                _foundational.CitiesDurationSeconds,
                _information.FactoriesDurationSeconds,
                _information.BotsDurationSeconds,
                _space.SpaceFactoriesDurationSeconds,
                railgunFiring: false);

            double horizon =
                DreamAdaptiveLongIntervalSimulation
                    .GetProjectionHorizonSeconds(
                        settings.sdSimulation,
                        settings.sdPrestige,
                        timing,
                        10d);
            Assert.AreEqual(10d, horizon, 1e-12d);
            Assert.IsTrue(
                DreamAdaptiveLongIntervalSimulation.TryAdvance(
                    settings.sdSimulation,
                    settings.sdPrestige,
                    timing,
                    10d,
                    out double error));

            Assert.AreEqual(
                35d,
                settings.sdSimulation.engineeringProgress,
                1e-9d);
            Assert.AreEqual(
                990d,
                settings.sdSimulation.communityBoostTime,
                1e-9d);
            Assert.AreEqual(
                990d,
                settings.sdSimulation.factoriesBoostTime,
                1e-9d);
            Assert.AreEqual(
                980d,
                settings.sdPrestige.doubleTime,
                1e-9d);
            Assert.LessOrEqual(
                error,
                SimulationAccuracyContract.MaximumAggregateRelativeError);
        }

        [Test]
        public void DreamAdaptive_RailgunVolleyMatchesCanonicalAutomationEvents()
        {
            Oracle.SaveDataSettings settings =
                CreateRepresentativeSettings();
            settings.sdSimulation = new Oracle.SaveDataDream1
            {
                rocketsPerSpaceFactory = 1L,
                railgunMaxCharge = 25_000_000d,
                railgunCharge = 25_000_000d,
                railgunFiring = true,
                railgunShotsRemaining = 10,
                dysonPanels = 20L,
                swarmPanelGeneration = 0L
            };
            settings.sdPrestige.disasterStage = 42L;
            Oracle.SaveDataDream1 expected =
                (Oracle.SaveDataDream1)
                SerializationUtility.CreateCopy(
                    settings.sdSimulation);
            var timing = new DreamOfflineTiming(
                1d,
                1d,
                1d,
                1d,
                1d,
                1d,
                1d,
                1d,
                1d,
                1d,
                railgunFiring: true);

            for (int tick = 0; tick < 50; tick++)
            {
                DreamAutomationTransactions.ApplyRailgun(
                    expected,
                    settings.sdPrestige,
                    0.1d,
                    totalFireTime: 5d,
                    shotsPerVolley: 10,
                    basePanelsRequiredToStart:
                        IdleDysonSwarm.Systems.Constants
                            .Dream1Constants
                            .RailgunBasePanelsRequired);
            }
            Assert.IsTrue(
                DreamAdaptiveLongIntervalSimulation.TryAdvance(
                    settings.sdSimulation,
                    settings.sdPrestige,
                    timing,
                    5d,
                    out double error));

            Assert.AreEqual(
                expected.railgunFiring,
                settings.sdSimulation.railgunFiring);
            Assert.AreEqual(
                expected.railgunShotsRemaining,
                settings.sdSimulation.railgunShotsRemaining);
            Assert.AreEqual(
                expected.railgunFireProgress,
                settings.sdSimulation.railgunFireProgress,
                1e-12d);
            Assert.AreEqual(
                expected.railgunCharge,
                settings.sdSimulation.railgunCharge,
                1e-9d);
            Assert.AreEqual(
                expected.dysonPanels,
                settings.sdSimulation.dysonPanels);
            Assert.AreEqual(
                expected.swarmPanels,
                settings.sdSimulation.swarmPanels);
            Assert.LessOrEqual(
                error,
                SimulationAccuracyContract.MaximumAggregateRelativeError);
        }

        [Test]
        public void DreamAdaptive_DisasterProjectionStopsStrictlyBeforeResetThreshold()
        {
            Oracle.SaveDataSettings settings =
                CreateRepresentativeSettings();
            settings.sdPrestige.disasterStage = 2L;
            settings.sdSimulation.bots = 99d;
            settings.sdSimulation.factories = 1_000_000d;
            settings.sdSimulation.railgunCharge = 0d;
            var timing = new DreamOfflineTiming(
                _foundational.HunterDurationSeconds,
                _foundational.GathererDurationSeconds,
                _foundational.CommunityDurationSeconds,
                _foundational.HousingDurationSeconds,
                _foundational.VillagesDurationSeconds,
                _foundational.WorkersDurationSeconds,
                _foundational.CitiesDurationSeconds,
                _information.FactoriesDurationSeconds,
                _information.BotsDurationSeconds,
                _space.SpaceFactoriesDurationSeconds,
                railgunFiring: false);

            double horizon =
                DreamAdaptiveLongIntervalSimulation
                    .GetProjectionHorizonSeconds(
                        settings.sdSimulation,
                        settings.sdPrestige,
                        timing,
                        10d);

            Assert.Greater(horizon, 0d);
            Assert.Less(
                horizon,
                10d,
                "The analytical block must end before the AI disaster reset.");
            Assert.IsTrue(
                DreamAdaptiveLongIntervalSimulation.TryAdvance(
                    settings.sdSimulation,
                    settings.sdPrestige,
                    timing,
                    horizon,
                    out _));
            Assert.Less(
                settings.sdSimulation.bots,
                100d,
                "Dream reset eligibility is a discrete boundary and may not " +
                "be crossed inside an aggregated Break block.");
        }

        [Test]
        public void StableWholeGame_StoredTimeCapCompletesUnderTwoSeconds()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            seed.dysonVerseSaveData.dysonVerseInfinityData =
                new Oracle.DysonVerseInfinityData();
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .infinityAutoBots = false;
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .infinityAutoResearch = false;
            seed.sdSimulation = new Oracle.SaveDataDream1();
            seed.sdPrestige.disasterStage = 42L;
            seed.sdPrestige.doubleTimeOwned = false;
            seed.sdPrestige.doubleTime = 0d;
            _oracle.saveSettings = seed;
            SubscribeAndResetRuntime();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                NumericSafety.StoredTimeMaximumSeconds,
                CreateContext(),
                ui: null));

            stopwatch.Stop();
            TestContext.WriteLine(
                $"42,000,000s stable whole-game replay: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms");
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                2000d);
            Assert.IsTrue(NumericSafety.IsFinite(
                _oracle.saveSettings.sdSimulation.energy));
            Assert.IsTrue(NumericSafety.IsFinite(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.money));
        }

        [Test]
        public void ActiveDream_TenSecondsMatchesExactCanonicalReplay()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                10d,
                CreateContext(),
                ui: null));
            Oracle.SaveDataDream1 optimized =
                (Oracle.SaveDataDream1)SerializationUtility.CreateCopy(
                    _oracle.saveSettings.sdSimulation);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            SubscribeAndResetRuntime();
            OfflineProgressContext canonical = CreateContext();
            canonical.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                10d,
                canonical,
                ui: null));
            Oracle.SaveDataDream1 expected = _oracle.saveSettings.sdSimulation;

            AssertDreamEqual(expected, optimized);
        }

        [TestCase(60d)]
        [TestCase(60d * 60d)]
        [TestCase(18d * 60d * 60d)]
        public void ActiveDysonAutomationAndDream_WorkScalesWithMaterialEvents(
            double durationSeconds)
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeDysonAutomation(seed);

            double editorStart =
                UnityEditor.EditorApplication.timeSinceStartup;
            var stopwatch =
                System.Diagnostics.Stopwatch.StartNew();
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                durationSeconds,
                CreateContext(),
                ui: null));
            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            double editorElapsed =
                (UnityEditor.EditorApplication.timeSinceStartup -
                 editorStart) * 1000d;
            TestContext.WriteLine(
                $"active automation workload {durationSeconds:R}s: " +
                $"Stopwatch={stopwatch.Elapsed.TotalMilliseconds:F3}ms, " +
                $"EditorClock={editorElapsed:F3}ms, " +
                $"events={work.MaterialEvents}, " +
                $"accepted={work.AccelerationBlocksAccepted}, " +
                $"rejected={work.AccelerationBlocksRejected}, " +
                $"accelerated={work.AcceleratedSeconds:F3}s");
            Assert.AreEqual(
                stopwatch.Elapsed.TotalMilliseconds,
                editorElapsed,
                100d,
                "Independent clocks should agree on complete-runner timing.");
            Assert.IsTrue(NumericSafety.IsFinite(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.money));
            Assert.IsTrue(NumericSafety.IsFinite(
                _oracle.saveSettings.sdSimulation.workers));
            Assert.Less(
                work.MaterialEvents,
                4096L,
                "Work should be bounded by material state changes, not 0.1-second ticks.");
            Assert.Greater(
                work.AcceleratedSeconds,
                durationSeconds * 0.9d);
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                10_000d,
                "The secondary wall-clock guard should catch catastrophic regressions.");
        }

        [Test]
        public void ActiveDysonAutomationAndDream_SixtySecondsMatchesCanonical()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeDysonAutomation(seed);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                60d,
                CreateContext(),
                ui: null));
            Oracle.SaveDataSettings optimized =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            OfflineProgressContext canonical = CreateContext();
            canonical.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                60d,
                canonical,
                ui: null));

            TestContext.WriteLine(
                "canonical/optimized " +
                $"money={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.money:R}/" +
                $"{optimized.dysonVerseSaveData.dysonVerseInfinityData.money:R} " +
                $"science={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.science:R}/" +
                $"{optimized.dysonVerseSaveData.dysonVerseInfinityData.science:R} " +
                $"bots={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots:R}/" +
                $"{optimized.dysonVerseSaveData.dysonVerseInfinityData.bots:R} " +
                $"lines={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines[0]:R}/" +
                $"{optimized.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines[0]:R} " +
                $"manualLines={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines[1]:R}/" +
                $"{optimized.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines[1]:R} " +
                $"manualManagers={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.managers[1]:R}/" +
                $"{optimized.dysonVerseSaveData.dysonVerseInfinityData.managers[1]:R}");
            AssertDysonEqual(
                _oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData,
                optimized.dysonVerseSaveData.dysonVerseInfinityData);
            AssertDreamEqual(
                _oracle.saveSettings.sdSimulation,
                optimized.sdSimulation);
        }

        [TestCase(60d)]
        [TestCase(60d * 60d)]
        [TestCase(100d * 24d * 60d * 60d)]
        public void ActiveDysonAutomationAndDream_ActualSceneCoroutineWorkIsDurationIndependent(
            double durationSeconds)
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeDysonAutomation(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            MethodInfo calculate = typeof(GameManager).GetMethod(
                "CalculateAwayValues",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(calculate);
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            Run((IEnumerator)calculate.Invoke(
                _gameManager,
                new object[] { durationSeconds }));
            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            TestContext.WriteLine(
                $"actual scene coroutine/UI path {durationSeconds:R}s: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms, " +
                $"events={work.MaterialEvents}, " +
                $"accepted={work.AccelerationBlocksAccepted}, " +
                $"rejected={work.AccelerationBlocksRejected}, " +
                $"accelerated={work.AcceleratedSeconds:F3}s");
            Assert.Less(
                work.MaterialEvents,
                4096L);
            Assert.Greater(
                work.AcceleratedSeconds,
                durationSeconds * 0.9d);
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                10_000d);
        }

        [TestCase(60d)]
        [TestCase(60d * 60d)]
        [TestCase(100d * 24d * 60d * 60d)]
        public void BreakInfinity_VariableCycleWorkScalesByValidatedBlocks(
            double durationSeconds)
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                durationSeconds,
                CreateContext(),
                ui: null));

            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            TestContext.WriteLine(
                $"adaptive Break Infinity {durationSeconds:R}s: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms, " +
                $"IP={_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}, " +
                $"accepted={work.AccelerationBlocksAccepted}, " +
                $"breakBlocks={work.BreakInfinityBlocks}, " +
                $"productionBlocks={work.ProductionOnlyBlocks}, " +
                $"rejected={work.AccelerationBlocksRejected}, " +
                $"exactEvents={work.MaterialEvents}");
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                2_000d);
            Assert.Less(
                work.MaterialEvents,
                1_000L,
                "Variable reset work must scale with validated blocks and " +
                "signature boundaries, not elapsed reset count.");
            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints);
            Assert.IsTrue(NumericSafety.IsFinite(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots));
        }

        [Test]
        public void BreakInfinity_ShortDiagnosticReachesValidatedCycleProjection()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                CreateContext(),
                ui: null));

            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            TestContext.WriteLine(
                $"stableCreate=" +
                $"{StableBreakInfinityCycleEvaluator.LastCreateDiagnostic};" +
                $"stableProjection=" +
                $"{AdaptiveInfinityCycleSimulation.LastStableProjectionDiagnostic};" +
                $"accepted={work.AccelerationBlocksAccepted};" +
                $"events={work.MaterialEvents};" +
                $"ip={_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}");
            Assert.GreaterOrEqual(
                work.BreakInfinityBlocks,
                1L,
                AdaptiveInfinityCycleSimulation
                    .LastStableProjectionDiagnostic);
        }

        [TestCase(60d)]
        [TestCase(60d * 60d)]
        [TestCase(100d * 24d * 60d * 60d)]
        [TestCase(NumericSafety.StoredTimeMaximumSeconds)]
        public void BreakInfinity_StableCycleWorkScalesWithBoundaries(
            double durationSeconds)
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                durationSeconds,
                CreateContext(),
                ui: null));

            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            TestContext.WriteLine(
                $"stable Break workload {durationSeconds:R}s: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms, " +
                $"events={work.MaterialEvents}, " +
                $"breakBlocks={work.BreakInfinityBlocks}, " +
                $"accelerated={work.AcceleratedSeconds:F3}s");
            Assert.Less(
                work.MaterialEvents,
                256L,
                "Work should be bounded by signature changes, not elapsed seconds.");
            Assert.GreaterOrEqual(
                work.AccelerationBlocksAccepted,
                1L);
            Assert.Greater(
                work.AcceleratedSeconds,
                durationSeconds * 0.9d);
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                1000d);
        }

        [TestCase(60d)]
        [TestCase(60d * 60d)]
        [TestCase(100d * 24d * 60d * 60d)]
        [TestCase(NumericSafety.StoredTimeMaximumSeconds)]
        public void BreakInfinity_EventHeavyAutomationWorkScalesByBatch(
            double durationSeconds)
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            AutomatedBreakInfinityCycleSimulation
                .ResetWorkDiagnostics();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            double maximumSliceMilliseconds = RunMeasured(
                OfflineProgressSystem.CalculateAwayValues(
                    durationSeconds,
                    CreateContext(),
                    ui: null),
                out string maximumSliceDiagnostic);

            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            TestContext.WriteLine(
                $"Automated Break workload {durationSeconds:R}s: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms, " +
                $"maxSlice={maximumSliceMilliseconds:F3}ms, " +
                $"engineSlice=" +
                $"{OfflineProgressSystem.LastMaximumSimulationSliceMilliseconds:F3}ms, " +
                $"maxSliceDiagnostic={maximumSliceDiagnostic}, " +
                $"events={work.MaterialEvents}, " +
                $"breakBlocks={work.BreakInfinityBlocks}, " +
                $"accelerated={work.AcceleratedSeconds:F3}s, " +
                $"rejected={work.AccelerationBlocksRejected}, " +
                $"IP={_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}, " +
                $"block={GameManager.LastAutomatedBreakBlockDiagnostic}, " +
                $"automated={AutomatedBreakInfinityCycleSimulation.LastDiagnostic}, " +
                $"adaptive={AutomatedBreakInfinityCycleSimulation.LastAdaptiveDiagnostic}, " +
                $"accepted={AutomatedBreakInfinityCycleSimulation.LastAcceptedAdaptiveDiagnostic}, " +
                $"cycleEvals={AutomatedBreakInfinityCycleSimulation.DiagnosticCycleEvaluations}, " +
                $"cycleBoundaries={AutomatedBreakInfinityCycleSimulation.DiagnosticCycleBoundaries}, " +
                $"automationEvents={AutomatedBreakInfinityCycleSimulation.DiagnosticAutomationEvents}, " +
                $"productionMs=" +
                $"{TicksToMilliseconds(AutomatedBreakInfinityCycleSimulation.DiagnosticProductionTicks):F3}, " +
                $"automationMs=" +
                $"{TicksToMilliseconds(AutomatedBreakInfinityCycleSimulation.DiagnosticAutomationTicks):F3}, " +
                $"derivedMs=" +
                $"{TicksToMilliseconds(AutomatedBreakInfinityCycleSimulation.DiagnosticDerivedTicks):F3}, " +
                $"resetMs=" +
                $"{TicksToMilliseconds(AutomatedBreakInfinityCycleSimulation.DiagnosticResetTicks):F3}, " +
                $"trace={AutomatedBreakInfinityCycleSimulation.DiagnosticBlockTrace}");
            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                seed.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.Greater(
                work.AcceleratedSeconds,
                durationSeconds * 0.9d);
            Assert.Less(
                work.MaterialEvents,
                1000L,
                "A saturated IP balance must not force one reset event at a time.");
            Assert.Less(
                AutomatedBreakInfinityCycleSimulation
                    .DiagnosticCycleEvaluations,
                768L,
                "Adaptive work must stay bounded by validated blocks rather than reset count.");
            Assert.Less(
                AutomatedBreakInfinityCycleSimulation
                    .DiagnosticCycleBoundaries,
                20_000L,
                "Automation work must stay bounded well below raw 10 Hz replay.");
            if (durationSeconds >= 60d * 60d)
            {
                Assert.Greater(
                    AutomatedBreakInfinityCycleSimulation
                        .MaximumAcceptedAdaptiveCycleCount,
                    256L,
                    "Long variable-cycle runs must accept hierarchical " +
                    "blocks instead of replaying every reset inside fixed " +
                    "256-cycle chunks.");
            }
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                2_000d,
                "Representative event-heavy batches must complete promptly " +
                "regardless of whether they cover one minute or 100 days.");
            Assert.Less(
                maximumSliceMilliseconds,
                8d,
                "Starting, polling, or publishing a stored-time projection " +
                "must remain within the cooperative frame-slice ceiling.");
            Assert.LessOrEqual(
                OfflineProgressSystem.LastMaximumSimulationSliceMilliseconds,
                8d,
                "Measured event-engine work must remain close to the 4 ms " +
                "cooperative budget; the 8 ms ceiling allows one indivisible " +
                "material event to finish safely.");
        }

        [Test]
        public void BreakInfinity_ConcurrentDreamModifiersDoNotCauseProjectionRetryStorm()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.sdSimulation.engineering = true;
            seed.sdSimulation.engineeringComplete = false;
            seed.sdSimulation.engineeringProgress = 0d;
            seed.sdSimulation.engineeringResearchTime = 100_000d;
            seed.sdSimulation.communityBoostTime = 100_000d;
            seed.sdSimulation.factoriesBoostTime = 100_000d;
            seed.sdPrestige.doubleTimeOwned = true;
            seed.sdPrestige.doubleTime = 100_000d;
            seed.sdPrestige.doubleTimeRate = 2;
            seed.sdPrestige.doDoubleTime = true;
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            AutomatedBreakInfinityCycleSimulation.ResetWorkDiagnostics();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                60d * 60d,
                CreateContext(),
                ui: null));

            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            Assert.Greater(
                work.AcceleratedSeconds,
                60d * 60d * 0.9d);
            Assert.Less(
                AutomatedBreakInfinityCycleSimulation
                    .DiagnosticCycleEvaluations,
                768L,
                "Dream research, boosts, and Double Time must be projected " +
                "with the accepted Break candidate instead of rebuilding it " +
                "on every 0.1-second event.");
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                2_000d);
        }

        [Test]
        public void BreakInfinity_EnabledAutomationResumesAcrossValidatedBlocks()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            OfflineProgressContext context = CreateContext();

            const double duration = 18d * 60d * 60d;
            double consumedBeforeBlock = 0d;
            SimulationAdvanceResult first = null;
            var projectionWait =
                System.Diagnostics.Stopwatch.StartNew();
            while (projectionWait.Elapsed.TotalSeconds < 5d)
            {
                first = context.RunUnifiedSimulation(
                    duration - consumedBeforeBlock);
                consumedBeforeBlock += first.ConsumedSeconds;
                if (first.Work.BreakInfinityBlocks > 0L)
                {
                    break;
                }
                System.Threading.Thread.Yield();
            }
            Assert.NotNull(first);
            Oracle.SaveDataSettings afterFirstBlock =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(
                    _oracle.saveSettings);
            double firstRemaining =
                duration - consumedBeforeBlock;
            SimulationAdvanceResult second = null;
            var secondProjectionWait =
                System.Diagnostics.Stopwatch.StartNew();
            while (secondProjectionWait.Elapsed.TotalSeconds < 5d)
            {
                second =
                    context.RunUnifiedSimulation(firstRemaining);
                if (second.ConsumedSeconds > 0d)
                    break;
                System.Threading.Thread.Yield();
            }

            TestContext.WriteLine(
                $"prefix={consumedBeforeBlock - first.ConsumedSeconds:R}s; " +
                $"first={first.ConsumedSeconds:R}s/" +
                $"{first.ValidationStatus}/" +
                $"{first.Work.BreakInfinityBlocks} blocks/" +
                $"{first.Work.MaterialEvents} events; " +
                $"second={second.ConsumedSeconds:R}s/" +
                $"{second.ValidationStatus}/" +
                $"{second.Work.BreakInfinityBlocks} blocks/" +
                $"{second.Work.MaterialEvents} events; " +
                $"ip={_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}; " +
                $"projection={AdaptiveInfinityCycleSimulation.LastStableProjectionDiagnostic}; " +
                $"automated={AutomatedBreakInfinityCycleSimulation.LastDiagnostic}; " +
                $"adaptive={AutomatedBreakInfinityCycleSimulation.LastAdaptiveDiagnostic}; " +
                $"block={GameManager.LastAutomatedBreakBlockDiagnostic}; " +
                $"rules={BotsAutoBuy.LastRuleCaptureDiagnostic}; " +
                $"stable={StableBreakInfinityCycleEvaluator.LastCreateDiagnostic}");
            Assert.Greater(
                first.ConsumedSeconds,
                10d,
                "The first validated block should skip many variable cycles.");
            Assert.Greater(
                second.ConsumedSeconds,
                Math.Min(1d, firstRemaining * 0.9d),
                AdaptiveInfinityCycleSimulation
                    .LastStableProjectionDiagnostic);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            OfflineProgressContext canonical = CreateContext();
            canonical.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                consumedBeforeBlock,
                canonical,
                ui: null));
            _gameManager.SetUnifiedAccelerationForTests(true);
            TestContext.WriteLine(
                $"first-block canonical/accelerated IP=" +
                $"{_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}/" +
                $"{afterFirstBlock.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}; " +
                $"bots={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots:R}/" +
                $"{afterFirstBlock.dysonVerseSaveData.dysonVerseInfinityData.bots:R}; " +
                $"cycle={_oracle.saveSettings.simulationInfinityCycleSeconds:R}/" +
                $"{afterFirstBlock.simulationInfinityCycleSeconds:R}; " +
                $"automation={_oracle.saveSettings.dysonAutomationTargetIndex}/" +
                $"{afterFirstBlock.dysonAutomationTargetIndex}");
            AssertAggregateRelative(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                afterFirstBlock.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                _oracle.saveSettings.dysonAutomationTargetIndex,
                afterFirstBlock.dysonAutomationTargetIndex);
        }

        [Test]
        public void BreakInfinity_MinimumCyclesWithAutomationMatchCanonicalReference()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                100_000L;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                10d,
                CreateContext(),
                ui: null));
            Oracle.SaveDataSettings accelerated =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            OfflineProgressContext canonical = CreateContext();
            canonical.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                10d,
                canonical,
                ui: null));
            _gameManager.SetUnifiedAccelerationForTests(true);

            Assert.AreEqual(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                accelerated.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                _oracle.saveSettings.simulationStatistics.lifetime
                    .breakInfinityCount,
                accelerated.simulationStatistics.lifetime
                    .breakInfinityCount);
            Assert.AreEqual(
                _oracle.saveSettings.dysonAutomationTargetIndex,
                accelerated.dysonAutomationTargetIndex);
            Assert.AreEqual(
                _oracle.saveSettings.researchAutomationTargetIndex,
                accelerated.researchAutomationTargetIndex);
            AssertRelative(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots,
                accelerated.dysonVerseSaveData
                    .dysonVerseInfinityData.bots);
        }

        [Test]
        public void BreakInfinity_VariableAutomatedBatchMatchesCanonicalContract()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                CreateContext(),
                ui: null));
            string acceleratedDiagnostic =
                AutomatedBreakInfinityCycleSimulation
                    .LastAcceptedAdaptiveDiagnostic;
            SimulationWorkMetrics acceleratedWork =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            Oracle.SaveDataSettings accelerated =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            OfflineProgressContext exactContext = CreateContext();
            exactContext.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                exactContext,
                ui: null));
            _gameManager.SetUnifiedAccelerationForTests(true);
            Oracle.SaveDataSettings expected =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(
                    _oracle.saveSettings);
            long expectedResetCount =
                expected.simulationStatistics.lifetime
                    .breakInfinityCount;
            TestContext.WriteLine(
                $"variable automation exact/batched cycles=" +
                $"{expectedResetCount}/" +
                $"{accelerated.simulationStatistics.lifetime.breakInfinityCount}; " +
                $"IP={expected.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}/" +
                $"{accelerated.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}; " +
                $"bots={expected.dysonVerseSaveData.dysonVerseInfinityData.bots:R}/" +
                $"{accelerated.dysonVerseSaveData.dysonVerseInfinityData.bots:R}; " +
                $"money={expected.dysonVerseSaveData.dysonVerseInfinityData.money:R}/" +
                $"{accelerated.dysonVerseSaveData.dysonVerseInfinityData.money:R}; " +
                $"science={expected.dysonVerseSaveData.dysonVerseInfinityData.science:R}/" +
                $"{accelerated.dysonVerseSaveData.dysonVerseInfinityData.science:R}; " +
                $"cycleSeconds={expected.simulationInfinityCycleSeconds:R}/" +
                $"{accelerated.simulationInfinityCycleSeconds:R}; " +
                $"blocks={acceleratedWork.BreakInfinityBlocks}; " +
                $"accelerated={acceleratedWork.AcceleratedSeconds:R}; " +
                $"exact={acceleratedWork.ExactSeconds:R}; " +
                $"diagnostic={acceleratedDiagnostic}; " +
                $"trace={AutomatedBreakInfinityCycleSimulation.DiagnosticBlockTrace}");
            long actualResetCount =
                accelerated.simulationStatistics.lifetime
                    .breakInfinityCount;
            long resetCountTolerance = Math.Max(
                1L,
                (long)Math.Ceiling(
                    expectedResetCount *
                    SimulationAccuracyContract
                        .MaximumAggregateRelativeError));
            Assert.LessOrEqual(
                Math.Abs(expectedResetCount - actualResetCount),
                resetCountTolerance,
                "The integer aggregate reset count may differ only by the " +
                "rounded-up approved percentage.");
            long expectedAutomationEvents =
                (long)Math.Floor(600d / 0.1d + 1e-9d);
            Assert.AreEqual(
                AutomationRotation.Advance(
                    seed.dysonAutomationTargetIndex,
                    8,
                    expectedAutomationEvents),
                accelerated.dysonAutomationTargetIndex,
                "The event-time automation cursor is derived from the " +
                "independent 10 Hz clock, not legacy floating-step drift.");
            Assert.AreEqual(
                seed.researchAutomationTargetIndex,
                accelerated.researchAutomationTargetIndex);
            Assert.AreEqual(
                expected.simulationAutomationTimeUntilNextEvent,
                accelerated.simulationAutomationTimeUntilNextEvent,
                1e-12d,
                "Forced stored-time Buy Max does not make the independent " +
                "automation phase approximate; its cursor and phase remain " +
                "exact durable state.");
            Assert.AreEqual(
                expected.firstInfinityDone,
                accelerated.firstInfinityDone);
            Assert.AreEqual(
                expected.infinityInProgress,
                accelerated.infinityInProgress);
            Assert.AreEqual(
                expected.botCapTransitionPending,
                accelerated.botCapTransitionPending);
            Assert.AreEqual(
                expected.botCapRewardsGranted,
                accelerated.botCapRewardsGranted);
            AssertAggregateRelative(
                expected.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints,
                accelerated.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints);
            Assert.LessOrEqual(
                Math.Abs(
                    expected.simulationInfinityCycleSeconds -
                    accelerated.simulationInfinityCycleSeconds),
                0.1d + 1e-9d);
            AssertDysonAggregateEqual(
                expected.dysonVerseSaveData
                    .dysonVerseInfinityData,
                accelerated.dysonVerseSaveData
                    .dysonVerseInfinityData);
            Oracle.DysonVerseInfinityData acceleratedData =
                accelerated.dysonVerseSaveData.dysonVerseInfinityData;
            Assert.IsTrue(NumericSafety.IsFinite(acceleratedData.bots));
            Assert.IsTrue(NumericSafety.IsFinite(acceleratedData.money));
            Assert.IsTrue(NumericSafety.IsFinite(acceleratedData.science));
            Assert.GreaterOrEqual(acceleratedData.bots, 0d);
            Assert.GreaterOrEqual(acceleratedData.money, 0d);
            Assert.GreaterOrEqual(acceleratedData.science, 0d);
            double incompleteCycleThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    5d,
                    4.2d,
                    _oracle.infinityExponent,
                    0d);
            Assert.Less(acceleratedData.bots, incompleteCycleThreshold);
        }

        [Test]
        public void BreakInfinity_AutomatedOneCycleModelMatchesCanonicalScheduler()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                _botsAutoBuy.TryCaptureAutomationRules(
                    out DysonFacilityAutomationRule[] facilityRules));
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));
            const long rewardTarget = 5L;
            double ordinaryThreshold = 4.2d;
            double resetBotThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    rewardTarget,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            Assert.IsTrue(
                AutomatedBreakInfinityCycleSimulation.TryAdvance(
                    _oracle.saveSettings,
                    facilityRules,
                    Array.Empty<ResearchAutomationRule>(),
                    resetPolicy,
                    bots => StaticMethods.InfinityPointsToGain(
                        ordinaryThreshold,
                        bots),
                    rewardTarget,
                    resetBotThreshold,
                    1d / 60d,
                    0.1d,
                    0.1d,
                    availableSeconds: 10d,
                    maximumCycles: 1L,
                    SimulationAutomationPolicy.ForceBuyMax,
                    out AutomatedBreakInfinityProjection modeled),
                AutomatedBreakInfinityCycleSimulation.LastDiagnostic);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            Run(OfflineProgressSystem.CalculateAwayValues(
                modeled.ConsumedSeconds,
                CreateContext(),
                ui: null));
            _gameManager.SetUnifiedAccelerationForTests(true);

            Oracle.SaveDataSettings canonical = _oracle.saveSettings;
            TestContext.WriteLine(
                $"exact cycles=1; " +
                $"duration={modeled.ConsumedSeconds:R}; " +
                $"IP={canonical.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}/" +
                $"{modeled.Candidate.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}; " +
                $"bots={canonical.dysonVerseSaveData.dysonVerseInfinityData.bots:R}/" +
                $"{modeled.Candidate.dysonVerseSaveData.dysonVerseInfinityData.bots:R}; " +
                $"money={canonical.dysonVerseSaveData.dysonVerseInfinityData.money:R}/" +
                $"{modeled.Candidate.dysonVerseSaveData.dysonVerseInfinityData.money:R}; " +
                $"botProduction={canonical.dysonVerseSaveData.dysonVerseInfinityData.botProduction:R}/" +
                $"{modeled.Candidate.dysonVerseSaveData.dysonVerseInfinityData.botProduction:R}; " +
                $"automationRemaining={canonical.simulationAutomationTimeUntilNextEvent:R}/" +
                $"{modeled.AutomationTimeUntilNextEvent:R}; " +
                $"automation={canonical.dysonAutomationTargetIndex}/" +
                $"{modeled.Candidate.dysonAutomationTargetIndex}; " +
                $"lastDuration={canonical.timeLastInfinity:R}/" +
                $"{modeled.LastDurationSeconds:R}; " +
                $"lastReward={canonical.lastInfinityPointsGained}/" +
                $"{modeled.LastReward}");
            Assert.AreEqual(
                1L,
                canonical.simulationStatistics.lifetime
                    .breakInfinityCount);
            Assert.AreEqual(
                canonical.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints,
                modeled.Candidate.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                canonical.lastInfinityPointsGained,
                modeled.LastReward);
            Assert.AreEqual(
                canonical.dysonAutomationTargetIndex,
                modeled.Candidate.dysonAutomationTargetIndex);
            AssertDysonEqual(
                canonical.dysonVerseSaveData.dysonVerseInfinityData,
                modeled.Candidate.dysonVerseSaveData
                    .dysonVerseInfinityData);
        }

        [Test]
        public void BreakInfinity_AutomatedTwoCycleModelMatchesCanonicalScheduler()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                _botsAutoBuy.TryCaptureAutomationRules(
                    out DysonFacilityAutomationRule[] facilityRules));
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));
            const long rewardTarget = 5L;
            const double ordinaryThreshold = 4.2d;
            double resetBotThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    rewardTarget,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            Oracle.SaveDataSettings candidate = _oracle.saveSettings;
            double automationRemaining = 0.1d;
            double totalDuration = 0d;
            for (int cycle = 0; cycle < 2; cycle++)
            {
                Assert.IsTrue(
                    AutomatedBreakInfinityCycleSimulation.TryAdvance(
                        candidate,
                        facilityRules,
                        Array.Empty<ResearchAutomationRule>(),
                        resetPolicy,
                        bots => StaticMethods.InfinityPointsToGain(
                            ordinaryThreshold,
                            bots),
                        rewardTarget,
                        resetBotThreshold,
                        1d / 60d,
                        0.1d,
                        automationRemaining,
                        availableSeconds: 100d,
                        maximumCycles: 1L,
                        SimulationAutomationPolicy.ForceBuyMax,
                        out AutomatedBreakInfinityProjection projection),
                    AutomatedBreakInfinityCycleSimulation.LastDiagnostic);
                candidate = projection.Candidate;
                automationRemaining =
                    projection.AutomationTimeUntilNextEvent;
                totalDuration += projection.ConsumedSeconds;
            }

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            Run(OfflineProgressSystem.CalculateAwayValues(
                totalDuration,
                CreateContext(),
                ui: null));
            _gameManager.SetUnifiedAccelerationForTests(true);

            Oracle.SaveDataSettings canonical = _oracle.saveSettings;
            TestContext.WriteLine(
                $"two-cycle duration={totalDuration:R}; " +
                $"IP={canonical.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}/" +
                $"{candidate.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}; " +
                $"bots={canonical.dysonVerseSaveData.dysonVerseInfinityData.bots:R}/" +
                $"{candidate.dysonVerseSaveData.dysonVerseInfinityData.bots:R}; " +
                $"money={canonical.dysonVerseSaveData.dysonVerseInfinityData.money:R}/" +
                $"{candidate.dysonVerseSaveData.dysonVerseInfinityData.money:R}; " +
                $"science={canonical.dysonVerseSaveData.dysonVerseInfinityData.science:R}/" +
                $"{candidate.dysonVerseSaveData.dysonVerseInfinityData.science:R}; " +
                $"threshold={resetBotThreshold:R}; " +
                $"canonicalReward=" +
                $"{StaticMethods.InfinityPointsToGain(ordinaryThreshold, canonical.dysonVerseSaveData.dysonVerseInfinityData.bots)}; " +
                $"botProduction={canonical.dysonVerseSaveData.dysonVerseInfinityData.botProduction:R}/" +
                $"{candidate.dysonVerseSaveData.dysonVerseInfinityData.botProduction:R}; " +
                $"automationRemaining={canonical.simulationAutomationTimeUntilNextEvent:R}/" +
                $"{automationRemaining:R}; " +
                $"automation={canonical.dysonAutomationTargetIndex}/" +
                $"{candidate.dysonAutomationTargetIndex}; " +
                $"lastDuration={canonical.timeLastInfinity:R}/" +
                $"{candidate.timeLastInfinity:R}");
            Assert.AreEqual(
                canonical.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints,
                candidate.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints);
            Assert.AreEqual(
                canonical.dysonAutomationTargetIndex,
                candidate.dysonAutomationTargetIndex);
            Assert.LessOrEqual(
                Math.Abs(
                    canonical.timeLastInfinity -
                    candidate.timeLastInfinity),
                0.1d + 1e-9d,
                "Continuous event-time reset timing may differ from the " +
                "legacy 1/60-boundary reference by at most one automation tick.");
            Assert.IsTrue(NumericSafety.IsFinite(
                candidate.dysonVerseSaveData
                    .dysonVerseInfinityData.bots));
            Assert.Less(
                candidate.dysonVerseSaveData
                    .dysonVerseInfinityData.bots,
                resetBotThreshold);
        }

        [Test]
        public void BreakInfinity_StableTenSecondCyclesUseValidatedBatch()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));
            Oracle.DysonVerseInfinityData data =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            double resetBotThreshold = NumericSafety.Add(
                data.bots,
                NumericSafety.Multiply(
                    data.botProduction,
                    10d).Value).Value;

            Assert.IsTrue(
                AutomatedBreakInfinityCycleSimulation.TryAdvance(
                    _oracle.saveSettings,
                    Array.Empty<DysonFacilityAutomationRule>(),
                    Array.Empty<ResearchAutomationRule>(),
                    resetPolicy,
                    bots => bots >= resetBotThreshold ? 5L : 0L,
                    rewardTarget: 5L,
                    resetBotThreshold: resetBotThreshold,
                    minimumCycleSeconds: 1d / 60d,
                    automationIntervalSeconds: 0.1d,
                    automationTimeUntilNextEvent: 0.1d,
                    availableSeconds: 100d,
                    maximumCycles: 8L,
                    automationPolicy:
                        SimulationAutomationPolicy.ForceBuyMax,
                    projection:
                        out AutomatedBreakInfinityProjection projection),
                AutomatedBreakInfinityCycleSimulation.LastDiagnostic);

            Assert.AreEqual(8L, projection.CycleCount);
            Assert.Greater(
                projection.ConsumedSeconds,
                40d,
                "A stable cycle above the former five-second probe horizon " +
                "must be aggregated instead of replayed at 10 Hz.");
            Assert.LessOrEqual(
                projection.ValidationError,
                SimulationAccuracyContract.MaximumAggregateRelativeError);
        }

        [Test]
        public void BreakInfinity_LongCycleWithMaterialAutomationBoundaryUsesValidatedBatch()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));
            Oracle.DysonVerseInfinityData data =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            Oracle.DysonVerseSkillTreeData skills =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseSkillTreeData;
            double resetBotThreshold = NumericSafety.Add(
                data.bots,
                NumericSafety.Multiply(
                    data.botProduction,
                    10d).Value).Value;
            double purchaseCost = NumericSafety.Add(
                data.money,
                NumericSafety.Multiply(
                    ProductionSystem.MoneyToAdd(data, skills),
                    6d).Value).Value;
            var facilityRule = new DysonFacilityAutomationRule(
                "assembly_lines",
                purchaseCost,
                1d,
                enabled: true,
                unlocked: true,
                subtractRetainedTen: false,
                useAssemblyMegaDiscount: false,
                maximumQuantity: 1L);

            Assert.IsTrue(
                AutomatedBreakInfinityCycleSimulation.TryAdvance(
                    _oracle.saveSettings,
                    new[] { facilityRule },
                    Array.Empty<ResearchAutomationRule>(),
                    resetPolicy,
                    bots => bots >= resetBotThreshold ? 5L : 0L,
                    rewardTarget: 5L,
                    resetBotThreshold: resetBotThreshold,
                    minimumCycleSeconds: 1d / 60d,
                    automationIntervalSeconds: 0.1d,
                    automationTimeUntilNextEvent: 0.1d,
                    availableSeconds: 100d,
                    maximumCycles: 8L,
                    automationPolicy:
                        SimulationAutomationPolicy.ForceBuyMax,
                    projection:
                        out AutomatedBreakInfinityProjection projection),
                AutomatedBreakInfinityCycleSimulation.LastDiagnostic);

            AutomatedBreakInfinityCycleSimulation.ProjectionWork
                resumable =
                    AutomatedBreakInfinityCycleSimulation
                        .CreateProjectionWork(
                            _oracle.saveSettings,
                            new[] { facilityRule },
                            Array.Empty<ResearchAutomationRule>(),
                            resetPolicy,
                            bots => bots >= resetBotThreshold ? 5L : 0L,
                            rewardTarget: 5L,
                            resetBotThreshold: resetBotThreshold,
                            minimumCycleSeconds: 1d / 60d,
                            automationIntervalSeconds: 0.1d,
                            automationTimeUntilNextEvent: 0.1d,
                            availableSeconds: 100d,
                            maximumCycles: 8L,
                            automationPolicy:
                                SimulationAutomationPolicy.ForceBuyMax);
            int resumableSteps = 0;
            while (!resumable.IsCompleted &&
                   resumableSteps < 1000)
            {
                AutomatedBreakInfinityCycleSimulation
                    .StepProjectionWork(resumable);
                resumableSteps++;
            }

            Assert.AreEqual(8L, projection.CycleCount);
            Assert.IsTrue(
                resumable.Accepted,
                resumable.Diagnostic);
            Assert.Greater(
                resumableSteps,
                8,
                "The accepted material cycle must cross multiple resumable " +
                "projection steps in this fixture.");
            Assert.AreEqual(
                projection.CycleCount,
                resumable.Projection.CycleCount);
            Assert.AreEqual(
                projection.ConsumedSeconds,
                resumable.Projection.ConsumedSeconds);
            Assert.AreEqual(
                projection.TotalReward,
                resumable.Projection.TotalReward);
            Assert.Greater(
                projection.ConsumedSeconds,
                40d,
                "A material purchase after five seconds must split the " +
                "one-cycle evaluator at that event, then continue aggregation.");
            Assert.Greater(
                projection.AutomationEvents,
                8L,
                "The projection must retain automation phase across the " +
                "material boundary rather than skipping it.");
            Assert.LessOrEqual(
                projection.ValidationError,
                SimulationAccuracyContract.MaximumAggregateRelativeError);
        }

        [Test]
        public void BreakInfinity_EveryTickMaterialPurchasesYieldWithinProjectionBudget()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            seed.buyMode = Oracle.BuyMode.Buy1;
            seed.dysonVerseSaveData.dysonVerseInfinityData.money =
                1e100d;
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));
            var facilityRule = new DysonFacilityAutomationRule(
                "assembly_lines",
                1d,
                1d,
                enabled: true,
                unlocked: true,
                subtractRetainedTen: false,
                useAssemblyMegaDiscount: false);
            AutomatedBreakInfinityCycleSimulation.ProjectionWork work =
                AutomatedBreakInfinityCycleSimulation
                    .CreateProjectionWork(
                        _oracle.saveSettings,
                        new[] { facilityRule },
                        Array.Empty<ResearchAutomationRule>(),
                        resetPolicy,
                        bots => bots >= 1e300d ? 5L : 0L,
                        rewardTarget: 5L,
                        resetBotThreshold: 1e300d,
                        minimumCycleSeconds: 1d / 60d,
                        automationIntervalSeconds: 0.1d,
                        automationTimeUntilNextEvent: 0.1d,
                        availableSeconds: 1000d,
                        maximumCycles: 8L,
                        automationPolicy:
                            SimulationAutomationPolicy
                                .PreserveConfiguredMode);

            double maximumStepMilliseconds = 0d;
            int slices = 0;
            while (!work.IsCompleted && slices < 700)
            {
                var stopwatch =
                    System.Diagnostics.Stopwatch.StartNew();
                AutomatedBreakInfinityCycleSimulation
                    .StepProjectionWork(work);
                stopwatch.Stop();
                maximumStepMilliseconds = Math.Max(
                    maximumStepMilliseconds,
                    stopwatch.Elapsed.TotalMilliseconds);
                slices++;
            }

            Assert.IsTrue(
                work.IsCompleted,
                "A cycle that cannot reset within the requested 1,000 seconds " +
                "must stop at that endpoint instead of probing toward the " +
                "one-million-boundary safety ceiling.");
            Assert.IsFalse(work.Accepted);
            Assert.AreEqual(
                "cycle_exceeds_available_time",
                work.Diagnostic);
            Assert.LessOrEqual(
                slices,
                630,
                "Sixteen material boundaries per slice should prove the " +
                "10,000-boundary endpoint in a bounded number of calls.");
            Assert.Less(
                maximumStepMilliseconds,
                8d,
                "A cycle with an affordable purchase every 0.1 seconds must " +
                "yield between bounded groups of material boundaries.");
            Assert.GreaterOrEqual(
                AutomatedBreakInfinityCycleSimulation
                    .DiagnosticCycleBoundaries,
                64L);
            Assert.LessOrEqual(
                AutomatedBreakInfinityCycleSimulation
                    .DiagnosticCycleBoundaries,
                10001L);
        }

        [Test]
        public void BreakInfinity_AbandonedProjectionWorkNeverMutatesPublishedState()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                _botsAutoBuy.TryCaptureAutomationRules(
                    out DysonFacilityAutomationRule[] facilityRules));
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));
            const long rewardTarget = 5L;
            const double ordinaryThreshold = 4.2d;
            double resetBotThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    rewardTarget,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            long startingIp = _oracle.saveSettings
                .dysonVerseSaveData.dysonVersePrestigeData
                .infinityPoints;
            double startingBots = _oracle.saveSettings
                .dysonVerseSaveData.dysonVerseInfinityData.bots;
            double startingMoney = _oracle.saveSettings
                .dysonVerseSaveData.dysonVerseInfinityData.money;
            int startingRotation =
                _oracle.saveSettings.dysonAutomationTargetIndex;

            AutomatedBreakInfinityCycleSimulation.ProjectionWork work =
                AutomatedBreakInfinityCycleSimulation
                    .CreateProjectionWork(
                        _oracle.saveSettings,
                        facilityRules,
                        Array.Empty<ResearchAutomationRule>(),
                        resetPolicy,
                        bots => StaticMethods.InfinityPointsToGain(
                            ordinaryThreshold,
                            bots),
                        rewardTarget,
                        resetBotThreshold,
                        1d / 60d,
                        0.1d,
                        0.1d,
                        availableSeconds: 60d * 60d,
                        maximumCycles: 512L,
                        SimulationAutomationPolicy.ForceBuyMax);
            for (int step = 0; step < 5; step++)
            {
                AutomatedBreakInfinityCycleSimulation
                    .StepProjectionWork(work);
            }

            Assert.AreEqual(
                startingIp,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                startingBots,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots);
            Assert.AreEqual(
                startingMoney,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.money);
            Assert.AreEqual(
                startingRotation,
                _oracle.saveSettings.dysonAutomationTargetIndex);

            // Dropping the only work reference is cancellation: there is no
            // worker thread to join and no live state has been published.
            work = null;
            Assert.IsNull(work);
        }

        [Test]
        public void BreakInfinity_AtIpCapStillMatchesCanonicalResetCount()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                long.MaxValue;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                1d,
                CreateContext(),
                ui: null));
            Oracle.SaveDataSettings accelerated =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            OfflineProgressContext canonical = CreateContext();
            canonical.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                1d,
                canonical,
                ui: null));
            _gameManager.SetUnifiedAccelerationForTests(true);

            Assert.AreEqual(
                long.MaxValue,
                accelerated.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints);
            Assert.AreEqual(
                _oracle.saveSettings.simulationStatistics.lifetime
                    .breakInfinityCount,
                accelerated.simulationStatistics.lifetime
                    .breakInfinityCount);
            Assert.AreEqual(
                _oracle.saveSettings.dysonAutomationTargetIndex,
                accelerated.dysonAutomationTargetIndex);
            Assert.AreEqual(
                _oracle.saveSettings.researchAutomationTargetIndex,
                accelerated.researchAutomationTargetIndex);
            AssertRelative(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots,
                accelerated.dysonVerseSaveData
                    .dysonVerseInfinityData.bots);
        }

        [Test]
        public void BreakInfinity_ActiveSchedulerMatchesCanonicalReference()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                100_000L;
            seed.offlineTimeUsedThisInfinity = 123d;
            seed.offlineTimeUsedPreviousInfinity = 45d;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            SimulationAdvanceResult acceleratedResult =
                _gameManager.AdvanceActiveSimulationForTests(10d);
            Oracle.SaveDataSettings accelerated =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            _gameManager.SetUnifiedAccelerationForTests(false);
            SimulationAdvanceResult canonicalResult =
                _gameManager.AdvanceActiveSimulationForTests(10d);
            _gameManager.SetUnifiedAccelerationForTests(true);

            Assert.NotNull(acceleratedResult);
            Assert.NotNull(canonicalResult);
            Assert.AreEqual(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                accelerated.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                _oracle.saveSettings.simulationStatistics.lifetime
                    .breakInfinityCount,
                accelerated.simulationStatistics.lifetime
                    .breakInfinityCount);
            Assert.AreEqual(
                _oracle.saveSettings.dysonAutomationTargetIndex,
                accelerated.dysonAutomationTargetIndex);
            Assert.AreEqual(
                _oracle.saveSettings.researchAutomationTargetIndex,
                accelerated.researchAutomationTargetIndex);
            Assert.AreEqual(
                canonicalResult.AutomationTimeUntilNextEvent,
                acceleratedResult.AutomationTimeUntilNextEvent,
                1e-9d);
            Assert.AreEqual(
                _oracle.saveSettings.offlineTimeUsedThisInfinity,
                accelerated.offlineTimeUsedThisInfinity);
            Assert.AreEqual(
                _oracle.saveSettings.offlineTimeUsedPreviousInfinity,
                accelerated.offlineTimeUsedPreviousInfinity);
            AssertRelative(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots,
                accelerated.dysonVerseSaveData
                    .dysonVerseInfinityData.bots);
            AssertDreamEqual(
                _oracle.saveSettings.sdSimulation,
                accelerated.sdSimulation);
            TestContext.WriteLine(
                $"active Break work: attempts=" +
                $"{acceleratedResult.Work.AccelerationAttempts}, " +
                $"accepted=" +
                $"{acceleratedResult.Work.AccelerationBlocksAccepted}, " +
                $"rejected=" +
                $"{acceleratedResult.Work.AccelerationBlocksRejected}, " +
                $"events={acceleratedResult.Work.MaterialEvents}, " +
                $"breakBlocks=" +
                $"{acceleratedResult.Work.BreakInfinityBlocks}, " +
                $"acceleratedSeconds=" +
                $"{acceleratedResult.Work.AcceleratedSeconds:R}");
            Assert.GreaterOrEqual(
                acceleratedResult.Work.BreakInfinityBlocks,
                1L);
        }

        [Test]
        public void BreakInfinity_ActiveMinimumCyclesExecuteCoincidentAutomation()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .infinityPoints = 100_000L;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            BotsAutoBuy.ResetAutomationDiagnostics();

            SimulationAdvanceResult result =
                _gameManager.AdvanceActiveSimulationForTests(0.1d);

            Assert.NotNull(result);
            Assert.AreEqual(
                1L,
                BotsAutoBuy.DiagnosticAutomationTicks,
                "The 0.1-second automation event must execute between " +
                "production and the coincident sixth minimum-duration " +
                "Infinity reset; an aggregate may not merely skip its cursor.");
            Assert.AreEqual(
                AutomationRotation.Advance(
                    seed.dysonAutomationTargetIndex,
                    8,
                    1L),
                _oracle.saveSettings.dysonAutomationTargetIndex);
        }

        [Test]
        public void BreakInfinity_ThresholdDoesNotPromoteBelowTargetState()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            const double ordinaryThreshold = 4.2d;
            double resetThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    seed.infinityPointsToBreakFor,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            Oracle.DysonVerseInfinityData belowData =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            belowData.bots =
                NumericSafety.BitDecrement(resetThreshold);
            belowData.botProduction = 0d;
            long startingIp = _oracle.saveSettings
                .dysonVerseSaveData.dysonVersePrestigeData
                .infinityPoints;

            _gameManager.AdvanceActiveSimulationForTests(0.1d);

            Assert.AreEqual(
                startingIp,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                "A finite balance below the selected threshold must not " +
                "be promoted into a reset by a broad tolerance.");

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            Oracle.DysonVerseInfinityData atData =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            atData.bots = resetThreshold;
            atData.botProduction = 0d;
            startingIp = _oracle.saveSettings
                .dysonVerseSaveData.dysonVersePrestigeData
                .infinityPoints;

            _gameManager.AdvanceActiveSimulationForTests(0.1d);

            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                startingIp,
                "The exactly reached target must still reset.");
        }

        [Test]
        public void BreakInfinity_ProjectionDoesNotPromoteSmallBelowTargetState()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            Oracle.DysonVerseInfinityData data =
                seed.dysonVerseSaveData.dysonVerseInfinityData;
            data.bots = NumericSafety.BitDecrement(1d);
            data.assemblyLines = new double[2];
            data.managers = new double[2];
            data.servers = new double[2];
            data.dataCenters = new double[2];
            data.planets = new double[2];
            data.matrioshkaBrains = new double[2];
            data.birchPlanets = new double[2];
            data.galacticBrains = new double[2];
            data.botProduction = 0d;
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .infinityAssemblyLines = false;
            InfinityResetModel.RebuildDerivedState(seed);

            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    seed,
                    0,
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));

            Assert.IsFalse(
                AutomatedBreakInfinityCycleSimulation.TryAdvance(
                    seed,
                    Array.Empty<DysonFacilityAutomationRule>(),
                    Array.Empty<ResearchAutomationRule>(),
                    resetPolicy,
                    bots => bots >= 1d ? 1L : 0L,
                    rewardTarget: 1L,
                    resetBotThreshold: 1d,
                    minimumCycleSeconds: 1d / 60d,
                    automationIntervalSeconds: 0.1d,
                    automationTimeUntilNextEvent: 0.1d,
                    availableSeconds: 1d,
                    maximumCycles: 1L,
                    automationPolicy:
                        SimulationAutomationPolicy.ForceBuyMax,
                    out _));
            Assert.AreEqual(
                NumericSafety.BitDecrement(1d),
                seed.dysonVerseSaveData.dysonVerseInfinityData.bots,
                "A finite zero-production balance below a small target must " +
                "remain below it; the threshold comparison is exact.");
        }

        [Test]
        public void BreakInfinity_ActiveAutomatedVariableCyclesYieldWithinBudget()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                100_000L;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            SimulationAdvanceResult result =
                _gameManager.AdvanceActiveSimulationForTests(
                    600d,
                    processingBudgetMilliseconds: 2d);

            stopwatch.Stop();
            Assert.NotNull(result);
            Assert.AreEqual(
                SimulationValidationStatus.Yielded,
                result.ValidationStatus);
            Assert.Greater(result.ConsumedSeconds, 0d);
            Assert.Greater(result.RemainingSeconds, 0d);
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                8d,
                "Active play must yield instead of running the stored-time " +
                "multi-cycle projector synchronously on a rendered frame.");
        }

        [Test]
        public void BreakInfinity_ActiveSliderChangeClearsPendingDreamProjection()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .infinityPoints = 100_000L;
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();

            FieldInfo pendingBreak = typeof(GameManager).GetField(
                "_activeAutomatedBreakProjectionWork",
                BindingFlags.Instance | BindingFlags.NonPublic);
            FieldInfo pendingDream = typeof(GameManager).GetField(
                "_activeAutomatedBreakDreamProjectionWork",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(pendingBreak);
            Assert.NotNull(pendingDream);
            DreamAdaptiveLongIntervalSimulation.ResetWorkDiagnostics();
            int moves = 0;
            do
            {
                _gameManager.AdvanceActiveSimulationForTests(
                    moves == 0 ? 600d : 0d,
                    processingBudgetMilliseconds: 0.5d);
                moves++;
            } while (
                moves < 10_000 &&
                (pendingBreak.GetValue(_gameManager) == null ||
                 pendingDream.GetValue(_gameManager) == null ||
                 DreamAdaptiveLongIntervalSimulation
                     .DiagnosticProjectionSegmentsProcessed == 0L));
            Assert.NotNull(
                pendingBreak.GetValue(_gameManager),
                "The fixture must retain the real isolated Break candidate.");
            Assert.NotNull(
                pendingDream.GetValue(_gameManager),
                "The fixture must reach the real yielded Dream projection.");
            Assert.Greater(
                DreamAdaptiveLongIntervalSimulation
                    .DiagnosticProjectionSegmentsProcessed,
                0L,
                "Dream refinement must process a real projection segment " +
                "before the slider changes.");
            long ipBeforeQueuedChange = _oracle.saveSettings
                .dysonVerseSaveData.dysonVersePrestigeData.infinityPoints;

            GameManager.RequestBreakTargetChange(777L);
            moves = 0;
            while (_oracle.saveSettings.infinityPointsToBreakFor != 777 &&
                   moves < 10_000)
            {
                _gameManager.AdvanceActiveSimulationForTests(
                    0d,
                    processingBudgetMilliseconds: 0.5d);
                moves++;
            }

            Assert.IsNull(
                pendingBreak.GetValue(_gameManager),
                "The completed old-target candidate must not survive the " +
                "queued input boundary.");
            Assert.IsNull(
                pendingDream.GetValue(_gameManager),
                "Applying a queued slider target at its safe boundary must " +
                "discard the incomplete Dream candidate tied to the old " +
                "target.");
            Assert.AreEqual(
                777,
                _oracle.saveSettings.infinityPointsToBreakFor);
            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                ipBeforeQueuedChange,
                "The already elapsed old-target segment should complete " +
                "before the new slider target applies.");
        }

        [Test]
        public void StoredTime_CancelDuringDreamRefinementPublishesNothing()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.offlineTime =
                NumericSafety.StoredTimeMaximumSeconds;
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Oracle.SaveDataSettings published = _oracle.saveSettings;
            long startingIp = published.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            double startingDreamBots = published.sdSimulation.bots;
            bool completed = true;
            double committedSeconds = -1d;
            MethodInfo createTransaction = typeof(GameManager).GetMethod(
                "RunStoredTimeTransactionCoroutine",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(createTransaction);
            var transaction = (IEnumerator)createTransaction.Invoke(
                _gameManager,
                new object[]
                {
                    NumericSafety.StoredTimeMaximumSeconds,
                    new Action<bool, double>((success, seconds) =>
                    {
                        completed = success;
                        committedSeconds = seconds;
                    })
                });

            DreamAdaptiveLongIntervalSimulation.ResetWorkDiagnostics();
            int moves = 0;
            while (DreamAdaptiveLongIntervalSimulation
                       .DiagnosticProjectionSegmentsProcessed == 0L &&
                   moves < 10_000 &&
                   transaction.MoveNext())
            {
                moves++;
            }
            Assert.Greater(
                DreamAdaptiveLongIntervalSimulation
                    .DiagnosticProjectionSegmentsProcessed,
                0L,
                "The fixture must process a real Dream projection segment " +
                "before cancellation, not merely initialize the work item.");

            _gameManager.CancelStoredTimeProcessing();
            while (transaction.MoveNext())
            {
            }

            Assert.IsFalse(completed);
            Assert.AreEqual(0d, committedSeconds);
            Assert.AreSame(
                published,
                _oracle.saveSettings,
                "Cancellation must restore the exact published save object.");
            Assert.AreEqual(
                NumericSafety.StoredTimeMaximumSeconds,
                published.offlineTime);
            Assert.AreEqual(
                startingIp,
                published.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints);
            Assert.AreEqual(
                startingDreamBots,
                published.sdSimulation.bots);
            FieldInfo running = typeof(GameManager).GetField(
                "_storedTimeJobRunning",
                BindingFlags.Instance | BindingFlags.NonPublic);
            FieldInfo cancellationRequested = typeof(GameManager).GetField(
                "_storedTimeCancellationRequested",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(running);
            Assert.NotNull(cancellationRequested);
            Assert.IsFalse((bool)running.GetValue(_gameManager));
            Assert.IsFalse(
                (bool)cancellationRequested.GetValue(_gameManager));
        }

        [Test]
        public void ActiveScheduler_PausesWhileStoredCandidateOwnsSimulation()
        {
            FieldInfo running = typeof(GameManager).GetField(
                "_storedTimeJobRunning",
                BindingFlags.Instance | BindingFlags.NonPublic);
            FieldInfo pending = typeof(GameManager).GetField(
                "_activeUnprocessedSeconds",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(running);
            Assert.NotNull(pending);
            running.SetValue(_gameManager, true);
            pending.SetValue(_gameManager, 0.05d);

            InvokePrivate(_gameManager, "Update");

            Assert.AreEqual(
                0.05d,
                (double)pending.GetValue(_gameManager),
                0d);
            running.SetValue(_gameManager, false);
        }

        [Test]
        public void BreakInfinity_ActiveAccelerationIsFrameChunkIndependent()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                100_000L;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            _gameManager.AdvanceActiveSimulationForTests(10d);
            Oracle.SaveDataSettings whole =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            for (int frame = 0; frame < 100; frame++)
                _gameManager.AdvanceActiveSimulationForTests(0.1d);

            Assert.AreEqual(
                whole.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                whole.simulationStatistics.lifetime.breakInfinityCount,
                _oracle.saveSettings.simulationStatistics.lifetime
                    .breakInfinityCount);
            AssertRelative(
                whole.dysonVerseSaveData.dysonVerseInfinityData.bots,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots);
            AssertDreamEqual(
                whole.sdSimulation,
                _oracle.saveSettings.sdSimulation);
        }

        [Test]
        public void BreakInfinityReset_RecomputesRestoredFacilityRates()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            _oracle.AutomaticBreakInfinityReset(
                updatePresentation: false);

            Oracle.DysonVerseInfinityData data =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            Assert.AreEqual(10d, data.assemblyLines[1]);
            Assert.Greater(
                data.botProduction,
                0d,
                "Restored facilities must work during the first interval after reset.");
        }

        [Test]
        public void BreakInfinityReset_ModelOnlyPathMatchesPresentedDurableState()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            seed.firstReality = false;
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .infinityPoints = 1_000L;
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .permanentSkillPoint = 1L;
            seed.dysonVerseSaveData.skillAutoAssignmentIds =
                new List<string> { "startHereTree" };

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _oracle.AutomaticBreakInfinityReset(
                updatePresentation: false);
            Oracle.SaveDataSettings modelOnly =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            SkillsAutoAssignment autoAssignment =
                UnityEngine.Object.FindFirstObjectByType<SkillsAutoAssignment>(
                    FindObjectsInactive.Include);
            Assert.NotNull(autoAssignment);
            InvokePrivate(autoAssignment, "OnDisable");
            InvokePrivate(autoAssignment, "OnEnable");
            _oracle.AutomaticBreakInfinityReset(
                updatePresentation: true);
            Oracle.SaveDataSettings presented = _oracle.saveSettings;

            Assert.AreEqual(
                modelOnly.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints,
                presented.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints);
            Assert.AreEqual(
                modelOnly.lastInfinityPointsGained,
                presented.lastInfinityPointsGained);
            Assert.AreEqual(
                modelOnly.dysonVerseSaveData.dysonVerseSkillTreeData
                    .skillPointsTree,
                presented.dysonVerseSaveData.dysonVerseSkillTreeData
                    .skillPointsTree);
            Assert.AreEqual(
                modelOnly.dysonVerseSaveData.dysonVerseSkillTreeData
                    .startHereTree,
                presented.dysonVerseSaveData.dysonVerseSkillTreeData
                    .startHereTree);
            Assert.AreEqual(
                modelOnly.dysonVerseSaveData.dysonVerseInfinityData
                    .skillOwnedById["startHereTree"],
                presented.dysonVerseSaveData.dysonVerseInfinityData
                    .skillOwnedById["startHereTree"]);
            AssertDysonEqual(
                modelOnly.dysonVerseSaveData.dysonVerseInfinityData,
                presented.dysonVerseSaveData.dysonVerseInfinityData);
        }

        [Test]
        public void BreakInfinityReset_SharedModelPreservesBankedArtifactAssignedAndRetainedState()
        {
            Oracle.SaveDataSettings seed =
                CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            seed.tutorial = false;
            seed.avotation = true;
            seed.timeLastInfinity = 12.5d;
            Oracle.DysonVersePrestigeData prestige =
                seed.dysonVerseSaveData
                    .dysonVersePrestigeData;
            prestige.permanentSkillPoint = 3L;
            prestige.infinityAssemblyLines = true;
            prestige.infinityAiManagers = true;
            prestige.infinityServers = true;
            prestige.infinityDataCenter = true;
            prestige.infinityPlanets = true;
            Oracle.DysonVerseInfinityData infinity =
                seed.dysonVerseSaveData
                    .dysonVerseInfinityData;
            Oracle.DysonVerseSkillTreeData skills =
                seed.dysonVerseSaveData
                    .dysonVerseSkillTreeData;
            skills.skillPointsTree = 999L;
            SkillOwnershipState.SetOwned(
                infinity,
                skills,
                "banking",
                true);
            SkillOwnershipState.SetOwned(
                infinity,
                skills,
                "investmentPortfolio",
                true);
            seed.dysonVerseSaveData.skillAutoAssignmentIds =
                new List<string> { "startHereTree" };

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            int artifactPoints =
                _oracle.ArtifactSkillPoints();
            Assert.AreEqual(
                4,
                artifactPoints,
                "Avotation contributes four artifact skill points.");
            GameData.GameDataRegistry registry =
                GameData.GameDataRegistry.Instance;
            Assert.NotNull(registry?.skillDatabase);
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    artifactPoints,
                    registry.skillDatabase,
                    out InfinityResetPolicy policy));
            Oracle.SaveDataSettings direct =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(
                    _oracle.saveSettings);
            long startingPoints = prestige.infinityPoints;

            _oracle.AutomaticBreakInfinityReset(
                updatePresentation: false);
            Oracle.SaveDataSettings canonical =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(
                    _oracle.saveSettings);
            long reward = canonical.dysonVerseSaveData
                              .dysonVersePrestigeData
                              .infinityPoints -
                          startingPoints;

            Assert.IsTrue(
                InfinityResetModel.TryApply(
                    direct,
                    breakInfinity: true,
                    reward,
                    botCapTransition: false,
                    policy,
                    out _));

            Assert.AreEqual(
                canonical.tutorial,
                direct.tutorial);
            Assert.IsTrue(direct.tutorial);
            Assert.AreEqual(
                canonical.firstInfinityDone,
                direct.firstInfinityDone);
            Assert.AreEqual(
                canonical.lastInfinityPointsGained,
                direct.lastInfinityPointsGained);
            Assert.AreEqual(
                canonical.offlineTimeUsedThisInfinity,
                direct.offlineTimeUsedThisInfinity);
            Assert.AreEqual(
                canonical.offlineTimeUsedPreviousInfinity,
                direct.offlineTimeUsedPreviousInfinity);
            Assert.AreEqual(
                canonical.dysonVerseSaveData
                    .dysonVerseSkillTreeData
                    .skillPointsTree,
                direct.dysonVerseSaveData
                    .dysonVerseSkillTreeData
                    .skillPointsTree);
            Assert.AreEqual(
                3L + 2L + 4L - 1L,
                direct.dysonVerseSaveData
                    .dysonVerseSkillTreeData
                    .skillPointsTree,
                "Unspent points are wiped; permanent, two banked, and four artifact points are rebuilt before the one-cost assignment.");
            Assert.IsTrue(
                SkillOwnershipState.IsOwned(
                    direct.dysonVerseSaveData
                        .dysonVerseInfinityData,
                    direct.dysonVerseSaveData
                        .dysonVerseSkillTreeData,
                    "startHereTree"));
            Assert.AreEqual(
                10d,
                direct.dysonVerseSaveData
                    .dysonVerseInfinityData
                    .assemblyLines[1]);
            Assert.AreEqual(
                10d,
                direct.dysonVerseSaveData
                    .dysonVerseInfinityData
                    .managers[1]);
            Assert.AreEqual(
                10d,
                direct.dysonVerseSaveData
                    .dysonVerseInfinityData
                    .servers[1]);
            Assert.AreEqual(
                10d,
                direct.dysonVerseSaveData
                    .dysonVerseInfinityData
                    .dataCenters[1]);
            Assert.AreEqual(
                10d,
                direct.dysonVerseSaveData
                    .dysonVerseInfinityData
                    .planets[1]);
            AssertDysonEqual(
                canonical.dysonVerseSaveData
                    .dysonVerseInfinityData,
                direct.dysonVerseSaveData
                    .dysonVerseInfinityData);
        }

        [Test]
        public void BreakInfinity_AggregatedCandidatePublishesTutorialAndArtifactAutoAssignment()
        {
            Oracle.SaveDataSettings seed =
                CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableRepresentativeDysonAutomation(seed);
            seed.tutorial = false;
            seed.avotation = true;
            seed.dysonVerseSaveData
                .dysonVersePrestigeData
                .permanentSkillPoint = 1L;
            seed.dysonVerseSaveData
                .skillAutoAssignmentIds =
                new List<string> { "startHereTree" };
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            int startingArtifactPoints =
                _oracle.ArtifactSkillPoints();

            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                CreateContext(),
                ui: null));

            Assert.IsTrue(
                _oracle.saveSettings.tutorial,
                "The isolated aggregate candidate must publish reset-owned root flags.");
            Assert.IsTrue(
                SkillOwnershipState.IsOwned(
                    _oracle.saveSettings
                        .dysonVerseSaveData
                        .dysonVerseInfinityData,
                    _oracle.saveSettings
                        .dysonVerseSaveData
                        .dysonVerseSkillTreeData,
                    "startHereTree"));
            long expectedRemainingPoints =
                _oracle.saveSettings
                    .dysonVerseSaveData
                    .dysonVersePrestigeData
                    .permanentSkillPoint +
                _oracle.ArtifactSkillPoints() -
                1L +
                _oracle.saveSettings
                    .dysonVerseSaveData
                    .dysonVerseInfinityData
                    .goalSetter;
            TestContext.WriteLine(
                $"aggregate assigned points actual/expected=" +
                $"{_oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.skillPointsTree}/" +
                $"{expectedRemainingPoints}; permanent=" +
                $"{_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.permanentSkillPoint}; " +
                $"artifact={_oracle.ArtifactSkillPoints()}; banking=" +
                $"{SkillOwnershipState.IsOwned(_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData, _oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData, "banking")}; " +
                $"investment=" +
                $"{SkillOwnershipState.IsOwned(_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData, _oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData, "investmentPortfolio")}; " +
                $"startingArtifact={startingArtifactPoints}; " +
                $"goalSetter={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.goalSetter}; " +
                $"cycles={_oracle.saveSettings.simulationStatistics.lifetime.breakInfinityCount}; " +
                $"block={GameManager.LastAutomatedBreakBlockDiagnostic}; " +
                $"trace={AutomatedBreakInfinityCycleSimulation.DiagnosticBlockTrace}");
            Assert.AreEqual(
                expectedRemainingPoints,
                _oracle.saveSettings
                    .dysonVerseSaveData
                    .dysonVerseSkillTreeData
                    .skillPointsTree,
                "The last projected reset must rebuild permanent and artifact points, spend the assigned root-skill point, and preserve skill points earned by goals in the final partial run.");
        }

        [Test]
        public void BreakInfinityReset_ModelOnlyThroughputScalesWithResetCount()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            seed.firstReality = false;
            seed.dysonVerseSaveData.dysonVersePrestigeData
                .infinityPoints = 1_000L;
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            const int resetCount = 1_000;
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            for (int index = 0; index < resetCount; index++)
            {
                _oracle.AutomaticBreakInfinityReset(
                    updatePresentation: false);
            }
            stopwatch.Stop();

            TestContext.WriteLine(
                $"{resetCount} model-only Break resets: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms");
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                1_000d,
                "Reset work should scale with reset count without scene/UI traversal.");
        }

        [Test]
        public void ResearchAutomation_PresenterOrderIsStableByResearchId()
        {
            InvokePrivate(_researchAutoBuy, "RefreshPresenters");
            FieldInfo field = typeof(ResearchAutoBuy).GetField(
                "presenters",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(field);
            var presenters =
                (ResearchPresenter[])field.GetValue(_researchAutoBuy);
            Assert.NotNull(presenters);
            for (int index = 1; index < presenters.Length; index++)
            {
                string previous = presenters[index - 1] != null
                    ? presenters[index - 1].ResearchIdValue
                    : string.Empty;
                string current = presenters[index] != null
                    ? presenters[index].ResearchIdValue
                    : string.Empty;
                Assert.LessOrEqual(
                    string.CompareOrdinal(previous, current),
                    0,
                    $"Research automation order diverged at {index}: " +
                    $"{previous} then {current}.");
            }
        }

        [Test]
        public void BreakInfinity_ShortReplayRemainsCloseToCanonicalReference()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                CreateContext(),
                ui: null));
            SimulationWorkMetrics optimizedWork =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            Oracle.SaveDataSettings optimized =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            Oracle.SaveDataSettings exactInfinityReference =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            // Infinity and Dream are independent event streams. An idle Dream
            // produces an exact threshold-time Infinity reference without the
            // legacy mixed scheduler's up-to-one-boundary Dream delay.
            exactInfinityReference.sdSimulation =
                new Oracle.SaveDataDream1();
            _oracle.saveSettings = exactInfinityReference;
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            OfflineProgressContext canonical = CreateContext();
            canonical.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                canonical,
                ui: null));
            _gameManager.SetUnifiedAccelerationForTests(true);

            long expectedIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long actualIp = optimized.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long legacyCount = _oracle.saveSettings
                .simulationStatistics.lifetime.breakInfinityCount;
            long acceleratedCount = optimized
                .simulationStatistics.lifetime.breakInfinityCount;
            long cycleCountDifference =
                acceleratedCount - legacyCount;
            long ipDifference = actualIp - expectedIp;
            TestContext.WriteLine(
                $"600s Break Infinity legacy-boundary/continuous IP: " +
                $"{expectedIp}/{actualIp}; cycles=" +
                $"{legacyCount}/{acceleratedCount}");
            TestContext.WriteLine(
                $"600s Break work: attempts=" +
                $"{optimizedWork.AccelerationAttempts}, accepted=" +
                $"{optimizedWork.AccelerationBlocksAccepted}, rejected=" +
                $"{optimizedWork.AccelerationBlocksRejected}, exactEvents=" +
                $"{optimizedWork.MaterialEvents}, acceleratedSeconds=" +
                $"{optimizedWork.AcceleratedSeconds:F3}, exactSeconds=" +
                $"{optimizedWork.ExactSeconds:F3}, breakBlocks=" +
                $"{optimizedWork.BreakInfinityBlocks}, dreamBlocks=" +
                $"{optimizedWork.DreamResetBlocks}, productionBlocks=" +
                $"{optimizedWork.ProductionOnlyBlocks}, breakSeconds=" +
                $"{optimizedWork.BreakInfinityBlockSeconds:F3}, " +
                $"productionSeconds=" +
                $"{optimizedWork.ProductionOnlyBlockSeconds:F3}");
            Assert.GreaterOrEqual(
                cycleCountDifference,
                0L,
                "Continuous threshold timing must not complete fewer cycles " +
                "than the legacy boundary-polled reference.");
            Assert.LessOrEqual(
                cycleCountDifference,
                1L,
                "The 600-second characterization may cross at most one " +
                "additional continuous threshold beyond legacy polling.");
            Assert.GreaterOrEqual(ipDifference, 0L);
            Assert.LessOrEqual(
                ipDifference,
                Math.Max(
                    _oracle.saveSettings.lastInfinityPointsGained,
                    optimized.lastInfinityPointsGained),
                "Any difference from legacy polling must be fully explained " +
                "by the one possible final threshold crossing.");
            Assert.AreEqual(
                _oracle.saveSettings.lastInfinityPointsGained,
                optimized.lastInfinityPointsGained,
                "The final completed cycle reward must match the canonical event-time result.");
            Assert.AreEqual(
                _oracle.saveSettings.timeLastInfinity,
                optimized.timeLastInfinity,
                1d / 60d,
                "The final cycle timer may differ by at most one authored Infinity boundary.");
            Oracle.DysonVerseInfinityData expectedData =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            Oracle.DysonVerseInfinityData actualData =
                optimized.dysonVerseSaveData
                    .dysonVerseInfinityData;
            double incompleteCycleThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    5d,
                    4.2d,
                    _oracle.infinityExponent,
                    0d);
            Assert.Less(expectedData.bots, incompleteCycleThreshold);
            Assert.Less(actualData.bots, incompleteCycleThreshold);
            Assert.IsTrue(NumericSafety.IsFinite(actualData.bots));
        }

        [Test]
        public void BreakInfinity_AccelerationIsStableAcrossStoredTimePartitions()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                CreateContext(),
                ui: null));
            SimulationWorkMetrics wholeWork =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            Oracle.SaveDataSettings whole =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                300d,
                CreateContext(),
                ui: null));
            SimulationWorkMetrics firstHalfWork =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            Run(OfflineProgressSystem.CalculateAwayValues(
                300d,
                CreateContext(),
                ui: null));
            SimulationWorkMetrics secondHalfWork =
                OfflineProgressSystem.LastSimulationWorkMetrics;

            TestContext.WriteLine(
                $"partition whole/split IP=" +
                $"{whole.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}/" +
                $"{_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}; " +
                $"cycles={whole.simulationStatistics.lifetime.breakInfinityCount}/" +
                $"{_oracle.saveSettings.simulationStatistics.lifetime.breakInfinityCount}; " +
                $"bots={whole.dysonVerseSaveData.dysonVerseInfinityData.bots:R}/" +
                $"{_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots:R}; " +
                $"cycleSeconds={whole.simulationInfinityCycleSeconds:R}/" +
                $"{_oracle.saveSettings.simulationInfinityCycleSeconds:R}; " +
                $"postReset={whole.simulationInfinityHasPostResetStart}/" +
                $"{_oracle.saveSettings.simulationInfinityHasPostResetStart}; " +
                $"boundary={whole.simulationInfinityBoundaryRemaining:R}/" +
                $"{_oracle.saveSettings.simulationInfinityBoundaryRemaining:R}; " +
                $"breakSeconds={wholeWork.BreakInfinityBlockSeconds:R}/" +
                $"{firstHalfWork.BreakInfinityBlockSeconds + secondHalfWork.BreakInfinityBlockSeconds:R}; " +
                $"exactSeconds={wholeWork.ExactSeconds:R}/" +
                $"{firstHalfWork.ExactSeconds + secondHalfWork.ExactSeconds:R}; " +
                $"blocks={wholeWork.BreakInfinityBlocks}/" +
                $"{firstHalfWork.BreakInfinityBlocks + secondHalfWork.BreakInfinityBlocks}");
            Assert.AreEqual(
                whole.dysonVerseSaveData.dysonVersePrestigeData
                    .infinityPoints,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                whole.simulationStatistics.lifetime.breakInfinityCount,
                _oracle.saveSettings.simulationStatistics.lifetime
                    .breakInfinityCount);
            AssertRelative(
                whole.dysonVerseSaveData.dysonVerseInfinityData.bots,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots);
        }

        [Test]
        public void BreakInfinity_OfflineSessionUsesCapturedSliderTarget()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            OfflineProgressContext capturedContext = CreateContext();
            long startingIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;

            _oracle.saveSettings.infinityPointsToBreakFor = 1000;
            Run(OfflineProgressSystem.CalculateAwayValues(
                120d,
                capturedContext,
                ui: null));

            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                startingIp,
                "Changing the live slider after the session starts must not change its captured threshold.");
        }

        [Test]
        public void BreakInfinity_UnreachableCapturedTargetKeepsPartialProgress()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            seed.infinityPointsToBreakFor = 1000;
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            long startingIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            double startingBots = _oracle.saveSettings.dysonVerseSaveData
                .dysonVerseInfinityData.bots;

            Run(OfflineProgressSystem.CalculateAwayValues(
                10d,
                CreateContext(),
                ui: null));

            Assert.AreEqual(
                startingIp,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots,
                startingBots);
        }

        [TestCase(60d)]
        [TestCase(60d * 60d)]
        [TestCase(100d * 24d * 60d * 60d)]
        public void NormalInfinity_HighFrequencyWorkScalesByAggregateBlocks(
            double duration)
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeNormalInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                duration,
                CreateContext(),
                ui: null));

            stopwatch.Stop();
            // Retention leaves this fixture above the ordinary threshold after
            // every reset. Automation remains an independent 0.1-second event
            // stream, while Infinity completes at its authored 1/60-second
            // minimum for the entire requested interval.
            long acceleratedCycles = (long)Math.Floor(
                duration * 60d + 1e-7d);
            long expectedIp =
                seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints +
                acceleratedCycles;
            Assert.AreEqual(
                expectedIp,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                1d / 60d,
                _oracle.saveSettings.timeLastInfinity,
                1e-12d);
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                2500d);
        }

        [Test]
        public void NormalInfinity_AcceleratedBlockMatchesExactEventTimeline()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeNormalInfinity(seed);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(true);
            Run(OfflineProgressSystem.CalculateAwayValues(
                1d,
                CreateContext(),
                ui: null));
            long accelerated = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            Run(OfflineProgressSystem.CalculateAwayValues(
                1d,
                CreateContext(),
                ui: null));
            long exact = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            _gameManager.SetUnifiedAccelerationForTests(true);

            TestContext.WriteLine(
                $"1s ordinary Infinity exact/accelerated: " +
                $"{exact}/{accelerated}");
            Assert.AreEqual(exact, accelerated);
        }

        private OfflineProgressContext CreateContext()
        {
            MethodInfo method = typeof(GameManager).GetMethod(
                "CreateOfflineProgressContext",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(method);
            return (OfflineProgressContext)method.Invoke(_gameManager, null);
        }

        private void BindManager(string fieldName, object value)
        {
            FieldInfo field = typeof(GameManager).GetField(
                fieldName,
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(field, fieldName);
            field.SetValue(_gameManager, value);
        }

        private void InitializeFacilityAutomation()
        {
            ServiceLocator.Clear();
            GameData.GameDataRegistry registry =
                UnityEngine.Object.FindFirstObjectByType<GameData.GameDataRegistry>(
                    FindObjectsInactive.Include);
            InvokePrivate(registry, "Awake");
            ServiceProvider provider =
                UnityEngine.Object.FindFirstObjectByType<ServiceProvider>(
                    FindObjectsInactive.Include);
            InvokePrivate(provider, "RegisterServices");
            foreach (FacilityBuildingPresenter presenter in
                     UnityEngine.Object.FindObjectsByType<FacilityBuildingPresenter>(
                         FindObjectsInactive.Include,
                         FindObjectsSortMode.None))
            {
                InvokePrivate(presenter, "Awake");
            }
            InvokePrivate(_botsAutoBuy, "Awake");
        }

        private void PrepareDysonDerivedState()
        {
            Oracle.DysonVerseSaveData dyson =
                _oracle.saveSettings.dysonVerseSaveData;
            ProductionSystem.SetBotDistribution(
                dyson.dysonVerseInfinityData,
                dyson.dysonVersePrestigeData,
                _oracle.saveSettings.prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                dyson.dysonVerseInfinityData,
                dyson.dysonVerseSkillTreeData,
                dyson.dysonVersePrestigeData,
                _oracle.saveSettings.prestigePlus);
        }

        private void SubscribeAndResetRuntime()
        {
            typeof(BotsAutoBuy).GetField(
                    "autoBuyOrderIndex",
                    BindingFlags.Instance | BindingFlags.NonPublic)
                ?.SetValue(_botsAutoBuy, 0);
            foreach (object manager in new object[]
                     {
                         _foundational,
                         _information,
                         _space
                     })
            {
                InvokePrivate(manager, "OnDisable");
                InvokePrivate(manager, "OnEnable");
                InvokePrivate(manager, "ResetSimulationRuntime");
            }
        }

        private static void InvokePrivate(object target, string methodName)
        {
            target?.GetType().GetMethod(
                    methodName,
                    BindingFlags.Instance | BindingFlags.NonPublic)
                ?.Invoke(target, null);
        }

        private static void Run(IEnumerator replay)
        {
            while (replay.MoveNext())
            {
            }
        }

        private static double RunMeasured(
            IEnumerator replay,
            out string maximumDiagnostic)
        {
            double maximumMilliseconds = 0d;
            maximumDiagnostic = null;
            long moveIndex = 0L;
            while (true)
            {
                var stopwatch =
                    System.Diagnostics.Stopwatch.StartNew();
                bool hasNext = replay.MoveNext();
                stopwatch.Stop();
                if (stopwatch.Elapsed.TotalMilliseconds >
                    maximumMilliseconds)
                {
                    maximumMilliseconds =
                        stopwatch.Elapsed.TotalMilliseconds;
                    maximumDiagnostic =
                        $"move={moveIndex};next={hasNext};" +
                        $"block={GameManager.LastAutomatedBreakBlockDiagnostic};" +
                        $"automated={AutomatedBreakInfinityCycleSimulation.LastDiagnostic};" +
                        $"adaptive={AutomatedBreakInfinityCycleSimulation.LastAdaptiveDiagnostic};" +
                        $"accepted={AutomatedBreakInfinityCycleSimulation.LastAcceptedAdaptiveDiagnostic}";
                }
                moveIndex++;
                if (!hasNext)
                    return maximumMilliseconds;
            }
        }

        private static double TicksToMilliseconds(long ticks)
        {
            return ticks * 1000d /
                   System.Diagnostics.Stopwatch.Frequency;
        }

        private static Oracle.SaveDataSettings CreateRepresentativeSettings()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.dysonVerseSaveData.dysonVerseInfinityData
                .skillOwnedBits =
                SkillBitsetUtility.CreateEmptyBitset();
            settings.sdPrestige.disasterStage = 42;
            settings.sdSimulation.hunters = 10L;
            settings.sdSimulation.gatherers = 10L;
            settings.sdSimulation.community = 5d;
            settings.sdSimulation.housing = 1d;
            settings.sdSimulation.villages = 1d;
            settings.sdSimulation.workers = 1d;
            settings.sdSimulation.cities = 1d;
            settings.sdSimulation.factories = 1d;
            settings.sdSimulation.bots = 10d;
            settings.sdSimulation.spaceFactories = 1d;
            return settings;
        }

        private static void EnableRepresentativeDysonAutomation(
            Oracle.SaveDataSettings settings)
        {
            settings.dysonVerseSaveData.dysonVersePrestigeData
                .infinityAutoBots = true;
            settings.infinityAutoAssembly = true;
            settings.infinityAutoManagers = true;
            settings.infinityAutoServers = true;
            settings.infinityAutoDataCenters = true;
            settings.infinityAutoPlanets = true;
            settings.infinityAutoMatrioshkaBrains = false;
            settings.infinityAutoBirchPlanets = false;
            settings.infinityAutoGalacticBrains = false;

            Oracle.DysonVerseInfinityData data =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            data.money = 1e6d;
            data.bots = 1000d;
            data.assemblyLines[0] = 10d;
            data.managers[0] = 3d;
            data.servers[0] = 1d;
        }

        private static void EnableRepresentativeBreakInfinity(
            Oracle.SaveDataSettings settings)
        {
            settings.prestigePlus.breakTheLoop = true;
            settings.prestigePlus.divisionsPurchased = 19L;
            settings.infinityPointsToBreakFor = 5;
            Oracle.DysonVersePrestigeData prestige =
                settings.dysonVerseSaveData.dysonVersePrestigeData;
            prestige.infinityPoints = 100L;
            prestige.infinityAssemblyLines = true;
            Oracle.DysonVerseInfinityData data =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            data.bots = 10d;
            data.assemblyLines[1] = 10d;
        }

        private static void EnableRepresentativeNormalInfinity(
            Oracle.SaveDataSettings settings)
        {
            settings.prestigePlus.breakTheLoop = false;
            settings.prestigePlus.divisionsPurchased = 19L;
            Oracle.DysonVersePrestigeData prestige =
                settings.dysonVerseSaveData.dysonVersePrestigeData;
            prestige.infinityPoints = 100L;
            prestige.infinityAssemblyLines = true;
            Oracle.DysonVerseInfinityData data =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            data.bots = 10d;
            data.assemblyLines[1] = 10d;
        }

        private static void AssertDreamEqual(
            Oracle.SaveDataDream1 expected,
            Oracle.SaveDataDream1 actual)
        {
            Assert.AreEqual(expected.community, actual.community, 1e-9d);
            Assert.AreEqual(expected.housing, actual.housing, 1e-9d);
            Assert.AreEqual(expected.villages, actual.villages, 1e-9d);
            Assert.AreEqual(expected.workers, actual.workers, 1e-9d);
            Assert.AreEqual(expected.cities, actual.cities, 1e-9d);
            Assert.AreEqual(expected.factories, actual.factories, 1e-9d);
            Assert.AreEqual(expected.bots, actual.bots, 1e-9d);
            Assert.AreEqual(expected.rockets, actual.rockets, 1e-9d);
            Assert.AreEqual(expected.spaceFactories, actual.spaceFactories, 1e-9d);
            Assert.AreEqual(expected.dysonPanels, actual.dysonPanels);
            Assert.AreEqual(
                expected.hunterTimerProgress,
                actual.hunterTimerProgress,
                1e-9d);
            Assert.AreEqual(
                expected.gathererTimerProgress,
                actual.gathererTimerProgress,
                1e-9d);
            Assert.AreEqual(
                expected.communityTimerProgress,
                actual.communityTimerProgress,
                1e-9d);
            Assert.AreEqual(
                expected.workersTimerProgress,
                actual.workersTimerProgress,
                1e-9d);
        }

        private static void AssertDysonEqual(
            Oracle.DysonVerseInfinityData expected,
            Oracle.DysonVerseInfinityData actual)
        {
            AssertRelative(expected.money, actual.money);
            AssertRelative(expected.science, actual.science);
            AssertRelative(expected.totalPanelsDecayed, actual.totalPanelsDecayed);
            AssertRelative(expected.bots, actual.bots);
            AssertRelative(expected.assemblyLines[0], actual.assemblyLines[0]);
            AssertRelative(expected.assemblyLines[1], actual.assemblyLines[1]);
            AssertRelative(expected.managers[0], actual.managers[0]);
            AssertRelative(expected.managers[1], actual.managers[1]);
            AssertRelative(expected.servers[0], actual.servers[0]);
            AssertRelative(expected.servers[1], actual.servers[1]);
            AssertRelative(expected.dataCenters[0], actual.dataCenters[0]);
            AssertRelative(expected.dataCenters[1], actual.dataCenters[1]);
            AssertRelative(expected.planets[0], actual.planets[0]);
            AssertRelative(expected.planets[1], actual.planets[1]);
            AssertRelative(expected.matrioshkaBrains[0], actual.matrioshkaBrains[0]);
            AssertRelative(expected.birchPlanets[0], actual.birchPlanets[0]);
            AssertRelative(expected.galacticBrains[0], actual.galacticBrains[0]);
        }

        private Oracle.SaveDataSettings
            BuildExactContinuousBreakReference(
                Oracle.SaveDataSettings seed,
                double durationSeconds,
                out long resetCount)
        {
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            Assert.IsTrue(
                _botsAutoBuy.TryCaptureAutomationRules(
                    out DysonFacilityAutomationRule[] facilityRules));
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));

            Oracle.SaveDataSettings candidate =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            double ordinaryThreshold = 4.2d;
            long rewardTarget =
                Math.Max(1L, candidate.infinityPointsToBreakFor);
            double resetBotThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    rewardTarget,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            double remaining = durationSeconds;
            double automationRemaining = 0.1d;
            double cycleAge = 0d;
            resetCount = 0L;
            while (remaining > 1e-12d &&
                   AutomatedBreakInfinityCycleSimulation.TryAdvance(
                       candidate,
                       facilityRules,
                       Array.Empty<ResearchAutomationRule>(),
                       resetPolicy,
                       bots => StaticMethods.InfinityPointsToGain(
                           ordinaryThreshold,
                           bots),
                       rewardTarget,
                       resetBotThreshold,
                       1d / 60d,
                       0.1d,
                       automationRemaining,
                       remaining,
                       maximumCycles: 1L,
                       SimulationAutomationPolicy.ForceBuyMax,
                       out AutomatedBreakInfinityProjection cycle))
            {
                candidate = cycle.Candidate;
                remaining = Math.Max(
                    0d,
                    remaining - cycle.ConsumedSeconds);
                automationRemaining =
                    cycle.AutomationTimeUntilNextEvent;
                resetCount++;
            }

            Oracle.DysonVerseSaveData dyson =
                candidate.dysonVerseSaveData;
            while (remaining > 1e-12d)
            {
                double step = Math.Min(
                    remaining,
                    automationRemaining);
                ProductionSystem.SetBotDistribution(
                    dyson.dysonVerseInfinityData,
                    dyson.dysonVersePrestigeData,
                    candidate.prestigePlus);
                ProductionSystem.CalculateProduction(
                    dyson.dysonVerseInfinityData,
                    dyson.dysonVerseSkillTreeData,
                    dyson.dysonVersePrestigeData,
                    candidate.prestigePlus,
                    step,
                    recomputeDerivedState: false);
                ProductionSystem.RecalculateDerivedState(
                    dyson.dysonVerseInfinityData,
                    dyson.dysonVerseSkillTreeData,
                    dyson.dysonVersePrestigeData,
                    candidate.prestigePlus);
                remaining = Math.Max(0d, remaining - step);
                cycleAge += step;
                automationRemaining = Math.Max(
                    0d,
                    automationRemaining - step);
                if (automationRemaining > 1e-12d)
                    continue;

                int first = AutomationRotation.Normalize(
                    candidate.dysonAutomationTargetIndex,
                    facilityRules.Length);
                for (int offset = 0;
                     offset < facilityRules.Length;
                     offset++)
                {
                    DysonAutomationTransactions.TryPurchaseFacility(
                        candidate,
                        facilityRules[
                            (first + offset) %
                            facilityRules.Length],
                        SimulationAutomationPolicy.ForceBuyMax,
                        out _);
                }
                candidate.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        first,
                        facilityRules.Length,
                        1L);
                ProductionSystem.RecalculateDerivedState(
                    dyson.dysonVerseInfinityData,
                    dyson.dysonVerseSkillTreeData,
                    dyson.dysonVersePrestigeData,
                    candidate.prestigePlus);
                automationRemaining = 0.1d;
            }
            candidate.simulationAutomationTimeUntilNextEvent =
                automationRemaining;
            candidate.simulationInfinityCycleSeconds =
                cycleAge;
            return candidate;
        }

        private static void AssertDysonAggregateEqual(
            Oracle.DysonVerseInfinityData expected,
            Oracle.DysonVerseInfinityData actual)
        {
            AssertAggregateRelative("money", expected.money, actual.money);
            AssertAggregateRelative(
                "science",
                expected.science,
                actual.science);
            AssertAggregateRelative("bots", expected.bots, actual.bots);
            AssertAggregateRelative(
                "assemblyLines[0]",
                expected.assemblyLines[0],
                actual.assemblyLines[0]);
            AssertAggregateRelative(
                "assemblyLines[1]",
                expected.assemblyLines[1],
                actual.assemblyLines[1]);
            AssertAggregateRelative(
                "managers[0]",
                expected.managers[0],
                actual.managers[0]);
            AssertAggregateRelative(
                "managers[1]",
                expected.managers[1],
                actual.managers[1]);
            AssertAggregateRelative(
                "servers[0]",
                expected.servers[0],
                actual.servers[0]);
            AssertAggregateRelative(
                "servers[1]",
                expected.servers[1],
                actual.servers[1]);
            AssertAggregateRelative(
                "dataCenters[0]",
                expected.dataCenters[0],
                actual.dataCenters[0]);
            AssertAggregateRelative(
                "dataCenters[1]",
                expected.dataCenters[1],
                actual.dataCenters[1]);
            AssertAggregateRelative(
                "planets[0]",
                expected.planets[0],
                actual.planets[0]);
            AssertAggregateRelative(
                "planets[1]",
                expected.planets[1],
                actual.planets[1]);
        }

        private static void AssertRelative(double expected, double actual)
        {
            double tolerance = Math.Max(1e-9d, Math.Abs(expected) * 1e-9d);
            Assert.AreEqual(expected, actual, tolerance);
        }

        private static void AssertAggregateRelative(
            double expected,
            double actual)
        {
            AssertAggregateRelative(null, expected, actual);
        }

        private static void AssertAggregateRelative(
            string label,
            double expected,
            double actual)
        {
            double scale = Math.Max(
                1d,
                Math.Max(Math.Abs(expected), Math.Abs(actual)));
            double error = Math.Abs(expected - actual) / scale;
            Assert.LessOrEqual(
                error,
                SimulationAccuracyContract.MaximumAggregateRelativeError,
                $"{label ?? "value"} relative error");
        }
    }
}
