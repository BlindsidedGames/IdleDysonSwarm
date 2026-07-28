using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Buildings;
using Expansion;
using IdleDysonSwarm.Services;
using NUnit.Framework;
using Research;
using Sirenix.Serialization;
using Systems;
using Systems.Numeric;
using Systems.Save;
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
        [TestCase(18d * 60d * 60d)]
        [TestCase(24d * 60d * 60d)]
        [TestCase(7d * 24d * 60d * 60d)]
        [TestCase(30d * 24d * 60d * 60d)]
        [TestCase(100d * 24d * 60d * 60d)]
        [TestCase(NumericSafety.StoredTimeMaximumSeconds)]
        public void BreakInfinity_AllFiniteQuantumUpgrades_OneMillionIp_Slider100(
            double durationSeconds)
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableAllFiniteQuantumUpgrades(seed);
            seed.infinityPointsToBreakFor = 100;
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                1_000_000L;

            // This fixture deliberately isolates the requested Dysonverse
            // workload. Dream has no facilities, active timers, boosts,
            // Double Time, or automatic-reset state.
            seed.sdSimulation = new Oracle.SaveDataDream1();
            seed.sdPrestige.disasterStage = 42L;
            seed.sdPrestige.doubleTimeOwned = false;
            seed.sdPrestige.doubleTime = 0d;
            seed.sdPrestige.doDoubleTime = false;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            AutomatedBreakInfinityCycleSimulation.ResetWorkDiagnostics();
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
            Oracle.DysonVersePrestigeData prestige =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData;
            long completedCycles =
                _oracle.saveSettings.simulationStatistics.lifetime
                    .breakInfinityCount;
            TestContext.WriteLine(
                $"1m IP/all finite Quantum/slider 100 " +
                $"{durationSeconds:R}s: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms, " +
                $"maxSlice={maximumSliceMilliseconds:F3}ms, " +
                $"engineSlice=" +
                $"{OfflineProgressSystem.LastMaximumSimulationSliceMilliseconds:F3}ms, " +
                $"cycles={completedCycles}, " +
                $"IP={prestige.infinityPoints}, " +
                $"events={work.MaterialEvents}, " +
                $"accepted={work.AccelerationBlocksAccepted}, " +
                $"rejected={work.AccelerationBlocksRejected}, " +
                $"breakBlocks={work.BreakInfinityBlocks}, " +
                $"accelerated={work.AcceleratedSeconds:F3}s, " +
                $"exact={work.ExactSeconds:F3}s, " +
                $"facilityRules={BotsAutoBuy.LastRuleCaptureDiagnostic}, " +
                $"projection={AutomatedBreakInfinityCycleSimulation.LastDiagnostic}, " +
                $"adaptive={AutomatedBreakInfinityCycleSimulation.LastAdaptiveDiagnostic}, " +
                $"acceptedDiagnostic={AutomatedBreakInfinityCycleSimulation.LastAcceptedAdaptiveDiagnostic}, " +
                $"cycleEvaluations={AutomatedBreakInfinityCycleSimulation.DiagnosticCycleEvaluations}, " +
                $"cycleBoundaries={AutomatedBreakInfinityCycleSimulation.DiagnosticCycleBoundaries}, " +
                $"automationEvents={AutomatedBreakInfinityCycleSimulation.DiagnosticAutomationEvents}, " +
                $"trace={AutomatedBreakInfinityCycleSimulation.DiagnosticBlockTrace}, " +
                $"sampledBlocks={GameManager.CanonicalSampledBlockCount}, " +
                $"maxSliceDiagnostic={maximumSliceDiagnostic}");

            Assert.IsTrue(NumericSafety.IsFinite(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots));
            Assert.GreaterOrEqual(
                prestige.infinityPoints,
                1_000_000L);
            Assert.Greater(
                completedCycles,
                0L);

            long expectedEarnedIp = 0L;
            long expectedCycles = 0L;
            if (Math.Abs(durationSeconds - 60d) <= 1e-12d)
            {
                expectedEarnedIp = 3_700L;
                expectedCycles = 37L;
            }
            else if (Math.Abs(durationSeconds - 3600d) <= 1e-12d)
            {
                expectedEarnedIp = 225_000L;
                expectedCycles = 2_250L;
            }

            if (expectedCycles > 0L)
            {
                double allowed =
                    SimulationAccuracyContract
                        .AllowedAggregateRelativeError(
                            durationSeconds);
                Assert.LessOrEqual(
                    Math.Abs(
                        (prestige.infinityPoints - 1_000_000L) -
                        expectedEarnedIp) /
                    (double)expectedEarnedIp,
                    allowed);
                Assert.LessOrEqual(
                    Math.Abs(completedCycles - expectedCycles) /
                    (double)expectedCycles,
                    allowed);
            }
        }

        [Test]
        public void BreakInfinity_AllFiniteQuantum_OneDayFocused()
        {
            BreakInfinity_AllFiniteQuantumUpgrades_OneMillionIp_Slider100(
                24d * 60d * 60d);
        }

        [Test]
        public void BreakInfinity_AllFiniteQuantum_OneHourFocused()
        {
            BreakInfinity_AllFiniteQuantumUpgrades_OneMillionIp_Slider100(
                60d * 60d);
        }

        [Test]
        public void BreakInfinity_AllFiniteQuantum_OneMonthFocused()
        {
            BreakInfinity_AllFiniteQuantumUpgrades_OneMillionIp_Slider100(
                30d * 24d * 60d * 60d);
        }

        [Test]
        public void BreakInfinity_AllFiniteQuantum_StoredCapFocused()
        {
            BreakInfinity_AllFiniteQuantumUpgrades_OneMillionIp_Slider100(
                NumericSafety.StoredTimeMaximumSeconds);
        }

        [Test]
        public void BreakInfinity_AllFiniteQuantum_ProjectionIsStableAcrossHourPartitions()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableAllFiniteQuantumUpgrades(seed);
            seed.infinityPointsToBreakFor = 100;
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                1_000_000L;
            seed.sdSimulation = new Oracle.SaveDataDream1();
            seed.sdPrestige.disasterStage = 42L;
            seed.sdPrestige.doubleTimeOwned = false;
            seed.sdPrestige.doubleTime = 0d;
            seed.sdPrestige.doDoubleTime = false;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                3600d,
                CreateContext(),
                ui: null));
            long wholeIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long wholeCycles = _oracle.saveSettings.simulationStatistics
                .lifetime.breakInfinityCount;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                1800d,
                CreateContext(),
                ui: null));
            Run(OfflineProgressSystem.CalculateAwayValues(
                1800d,
                CreateContext(),
                ui: null));
            long splitIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long splitCycles = _oracle.saveSettings.simulationStatistics
                .lifetime.breakInfinityCount;

            double ipDifference = Math.Abs(wholeIp - splitIp) /
                                  Math.Max(
                                      1d,
                                      Math.Max(wholeIp, splitIp));
            double cycleDifference =
                Math.Abs(wholeCycles - splitCycles) /
                Math.Max(
                    1d,
                    Math.Max(wholeCycles, splitCycles));
            TestContext.WriteLine(
                $"1h partition characterization: " +
                $"wholeIp={wholeIp};splitIp={splitIp};" +
                $"wholeCycles={wholeCycles};splitCycles={splitCycles};" +
                $"ipDifference={ipDifference:R};" +
                $"cycleDifference={cycleDifference:R}");

            Assert.Less(ipDifference, 0.25d);
            Assert.Less(cycleDifference, 0.25d);
        }

        [Test]
        public void BreakInfinity_AllFiniteQuantumOneMinuteMatchesCurrentExact()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableAllFiniteQuantumUpgrades(seed);
            seed.infinityPointsToBreakFor = 100;
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                1_000_000L;
            seed.sdSimulation = new Oracle.SaveDataDream1();
            seed.sdPrestige.disasterStage = 42L;
            seed.sdPrestige.doubleTimeOwned = false;
            seed.sdPrestige.doubleTime = 0d;
            seed.sdPrestige.doDoubleTime = false;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Run(OfflineProgressSystem.CalculateAwayValues(
                60d,
                CreateContext(),
                ui: null));
            long projectedIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long projectedCycles = _oracle.saveSettings
                .simulationStatistics.lifetime.breakInfinityCount;
            SimulationWorkMetrics projectedWork =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            long projectedSampledBlocks =
                GameManager.CanonicalSampledBlockCount;
            string projectedBlock =
                GameManager.LastAutomatedBreakBlockDiagnostic;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetSampledInfinityProjectionForTests(false);
            Run(OfflineProgressSystem.CalculateAwayValues(
                60d,
                CreateContext(),
                ui: null));
            long exactIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long exactCycles = _oracle.saveSettings
                .simulationStatistics.lifetime.breakInfinityCount;
            _gameManager.SetSampledInfinityProjectionForTests(true);

            long projectedEarned = projectedIp - 1_000_000L;
            long exactEarned = exactIp - 1_000_000L;
            double ipError = Math.Abs(
                projectedEarned - exactEarned) /
                Math.Max(1d, Math.Abs((double)exactEarned));
            double cycleError = Math.Abs(
                projectedCycles - exactCycles) /
                Math.Max(1d, Math.Abs((double)exactCycles));
            TestContext.WriteLine(
                $"1m IP current exact comparison: " +
                $"projectedIp={projectedEarned};" +
                $"exactIp={exactEarned};" +
                $"projectedCycles={projectedCycles};" +
                $"exactCycles={exactCycles};" +
                $"ipError={ipError:R};" +
                $"cycleError={cycleError:R};" +
                $"accepted={projectedWork.AccelerationBlocksAccepted};" +
                $"rejected={projectedWork.AccelerationBlocksRejected};" +
                $"accelerated={projectedWork.AcceleratedSeconds:R};" +
                $"exact={projectedWork.ExactSeconds:R};" +
                $"block={projectedBlock};" +
                $"sampledBlocks={projectedSampledBlocks}");

            double allowed = SimulationAccuracyContract
                .AllowedAggregateRelativeError(60d);
            Assert.LessOrEqual(ipError, allowed);
            Assert.LessOrEqual(cycleError, allowed);
        }

        [Test]
        public void PrivatePhoneProfile_OneMinuteActiveAndStoredTime()
        {
            ComparePrivatePhoneProfile(60d);
        }

        [Test]
        [Timeout(600000)]
        public void PrivatePhoneProfile_OneHourActiveAndStoredTime()
        {
            ComparePrivatePhoneProfile(3600d);
        }

        [TestCase(60d, 238212L, 1191L)]
        [TestCase(3600d, 36859768L, 178986L)]
        public void PrivatePhoneProfile_StoredProjectionAgainstCachedExact(
            double durationSeconds,
            long exactEarnedIp,
            long exactCycles)
        {
            const string fixturePath =
                "/private/tmp/idle-dyson-phone-baseline.idb1";
            if (!File.Exists(fixturePath))
            {
                Assert.Ignore(
                    "Private isolated phone-save fixture is not present.");
            }

            SavePreparationPipeline pipeline =
                (SavePreparationPipeline)InvokePrivateWithResult(
                    _oracle,
                    "CreateSavePreparationPipeline");
            PreparedSaveResult preparation =
                pipeline.PrepareText(File.ReadAllText(fixturePath));
            Assert.IsTrue(preparation.Succeeded, preparation.Error);
            Oracle.SaveDataSettings seed = preparation.Settings;
            long startingIp = seed.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            var timer = System.Diagnostics.Stopwatch.StartNew();
            double maximumSliceMilliseconds = RunMeasured(
                OfflineProgressSystem.CalculateAwayValues(
                    durationSeconds,
                    CreateContext(),
                    ui: null),
                out string diagnostic);
            timer.Stop();

            long projectedIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long projectedEarnedIp = projectedIp - startingIp;
            long projectedCycles = _oracle.saveSettings
                .simulationStatistics.lifetime.breakInfinityCount;
            double ipError =
                Math.Abs(projectedEarnedIp - exactEarnedIp) /
                Math.Max(1d, Math.Abs((double)exactEarnedIp));
            double cycleError =
                Math.Abs(projectedCycles - exactCycles) /
                Math.Max(1d, Math.Abs((double)exactCycles));
            TestContext.WriteLine(
                $"PRIVATE_PHONE_CACHED_BASELINE " +
                $"simulated={durationSeconds:R};" +
                $"exactEarnedIp={exactEarnedIp};" +
                $"projectedEarnedIp={projectedEarnedIp};" +
                $"ipError={ipError:R};" +
                $"exactCycles={exactCycles};" +
                $"projectedCycles={projectedCycles};" +
                $"cycleError={cycleError:R};" +
                $"cpuMs={timer.Elapsed.TotalMilliseconds:F3};" +
                $"maxSliceMs={maximumSliceMilliseconds:F3};" +
                $"work={OfflineProgressSystem.LastSimulationWorkMetrics};" +
                $"sampledBlocks={GameManager.CanonicalSampledBlockCount};" +
                $"diagnostic={diagnostic}");

            // These exact fixtures remain characterization anchors for
            // tuning. End-to-end projection accuracy is deliberately not a
            // release gate yet; the current phase establishes stable,
            // measurable sample/project/resample behavior first.
            Assert.Less(ipError, 0.25d);
            Assert.Less(cycleError, 0.25d);
        }

        private void ComparePrivatePhoneProfile(double durationSeconds)
        {
            const string fixturePath =
                "/private/tmp/idle-dyson-phone-baseline.idb1";
            if (!File.Exists(fixturePath))
            {
                Assert.Ignore(
                    "Private isolated phone-save fixture is not present.");
            }

            SavePreparationPipeline pipeline =
                (SavePreparationPipeline)InvokePrivateWithResult(
                    _oracle,
                    "CreateSavePreparationPipeline");
            PreparedSaveResult preparation =
                pipeline.PrepareText(File.ReadAllText(fixturePath));
            Assert.IsTrue(preparation.Succeeded, preparation.Error);
            Oracle.SaveDataSettings seed = preparation.Settings;
            long startingIp = seed.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();
            var activeTimer = System.Diagnostics.Stopwatch.StartNew();
            SimulationAdvanceResult activeResult =
                _gameManager.AdvanceActiveSimulationForTests(
                    durationSeconds);
            activeTimer.Stop();
            long activeIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long activeCycles = _oracle.saveSettings.simulationStatistics
                .lifetime.breakInfinityCount;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            AutomatedBreakInfinityCycleSimulation.ResetWorkDiagnostics();
            var storedTimer = System.Diagnostics.Stopwatch.StartNew();
            double maximumSliceMilliseconds = RunMeasured(
                OfflineProgressSystem.CalculateAwayValues(
                    durationSeconds,
                    CreateContext(),
                    ui: null),
                out string maximumSliceDiagnostic);
            storedTimer.Stop();
            SimulationWorkMetrics storedWork =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            long storedIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long storedCycles = _oracle.saveSettings.simulationStatistics
                .lifetime.breakInfinityCount;

            TestContext.WriteLine(
                $"PRIVATE_PHONE_CURRENT simulated={durationSeconds:R};" +
                $"startingIp={startingIp};" +
                $"activeEarnedIp={activeIp - startingIp};" +
                $"activeFinalIp={activeIp};" +
                $"activeCycles={activeCycles};" +
                $"activeCpuMs={activeTimer.Elapsed.TotalMilliseconds:F3};" +
                $"activeConsumed={activeResult?.ConsumedSeconds:R};" +
                $"activeRemaining={activeResult?.RemainingSeconds:R};" +
                $"activeStatus={activeResult?.ValidationStatus};" +
                $"activeCode={activeResult?.DiagnosticCode};" +
                $"activeAccepted={activeResult?.Work.AccelerationBlocksAccepted};" +
                $"activeRejected={activeResult?.Work.AccelerationBlocksRejected};" +
                $"activeExactSeconds={activeResult?.Work.ExactSeconds:R};" +
                $"activeAcceleratedSeconds={activeResult?.Work.AcceleratedSeconds:R};" +
                $"activeStop={DescribeActiveInfinityStop()};" +
                $"eligibility={DescribeAccelerationEligibility()};" +
                $"storedEarnedIp={storedIp - startingIp};" +
                $"storedFinalIp={storedIp};" +
                $"storedCycles={storedCycles};" +
                $"storedCpuMs={storedTimer.Elapsed.TotalMilliseconds:F3};" +
                $"storedMaxSliceMs={maximumSliceMilliseconds:F3};" +
                $"storedAccepted={storedWork.AccelerationBlocksAccepted};" +
                $"storedRejected={storedWork.AccelerationBlocksRejected};" +
                $"storedExactSeconds={storedWork.ExactSeconds:R};" +
                $"storedAcceleratedSeconds={storedWork.AcceleratedSeconds:R};" +
                $"lastBlock={GameManager.LastAutomatedBreakBlockDiagnostic};" +
                $"sampledBlocks={GameManager.CanonicalSampledBlockCount};" +
                $"projection={AutomatedBreakInfinityCycleSimulation.LastDiagnostic};" +
                $"adaptive={AutomatedBreakInfinityCycleSimulation.LastAdaptiveDiagnostic};" +
                $"storedToActive=" +
                $"{RelativeRatio(storedIp - startingIp, activeIp - startingIp):R};" +
                $"diagnostic={maximumSliceDiagnostic}");

            Assert.NotNull(activeResult);
            Assert.AreEqual(0d, activeResult.RemainingSeconds, 1e-9d);
            Assert.Greater(activeIp, startingIp);
            Assert.Greater(storedIp, startingIp);
            if (Math.Abs(durationSeconds - 60d) <= 1e-12d)
            {
                const long exactEarnedIp = 238212L;
                Assert.Less(
                    Math.Abs(
                        (activeIp - startingIp) -
                        exactEarnedIp) /
                    (double)exactEarnedIp,
                    0.25d);
                Assert.Less(
                    Math.Abs(
                        (storedIp - startingIp) -
                        exactEarnedIp) /
                    (double)exactEarnedIp,
                    0.25d);
            }
        }

        [TestCase(60d)]
        [TestCase(3600d)]
        public void PrivatePhoneProfile_DysonProjectionBenchmark(
            double durationSeconds)
        {
            const string fixturePath =
                "/private/tmp/idle-dyson-phone-baseline.idb1";
            if (!File.Exists(fixturePath))
            {
                Assert.Ignore(
                    "Private isolated phone-save fixture is not present.");
            }

            SavePreparationPipeline pipeline =
                (SavePreparationPipeline)InvokePrivateWithResult(
                    _oracle,
                    "CreateSavePreparationPipeline");
            PreparedSaveResult preparation =
                pipeline.PrepareText(File.ReadAllText(fixturePath));
            Assert.IsTrue(preparation.Succeeded, preparation.Error);
            Oracle.SaveDataSettings seed = preparation.Settings;
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                _botsAutoBuy.TryCaptureAutomationRules(
                    out DysonFacilityAutomationRule[] facilityRules),
                BotsAutoBuy.LastRuleCaptureDiagnostic);
            Assert.IsTrue(
                _researchAutoBuy.TryCaptureAutomationRules(
                    out ResearchAutomationRule[] researchRules));
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));

            long rewardTarget = Math.Max(
                1L,
                _oracle.saveSettings.infinityPointsToBreakFor);
            long rewardMultiplier = 1L;
            if (_oracle.saveSettings.doubleIp)
                rewardMultiplier *= 2L;
            if (_oracle.saveSettings.prestigePlus.doubleIP)
                rewardMultiplier *= 2L;
            double ordinaryThreshold =
                _oracle.saveSettings.prestigePlus.divisionsPurchased > 0L
                    ? 4.2e19d / Math.Pow(
                        10d,
                        _oracle.saveSettings.prestigePlus
                            .divisionsPurchased)
                    : 4.2e19d;
            long requiredBaseReward =
                rewardTarget / rewardMultiplier +
                (rewardTarget % rewardMultiplier == 0L ? 0L : 1L);
            double resetThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    Math.Max(1L, requiredBaseReward),
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            Func<double, long> calculateReward = bots =>
                NumericSafety.Multiply(
                    StaticMethods.InfinityPointsToGain(
                        ordinaryThreshold,
                        bots),
                    rewardMultiplier).Value;

            long startingIp = seed.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            AutomatedBreakInfinityCycleSimulation.ResetWorkDiagnostics();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            Oracle.SaveDataSettings candidate = seed;
            double remaining = durationSeconds;
            double automationRemaining = 0.1d;
            long cycles = 0L;
            InfinityCycleSample? canonicalAnchor = null;
            for (int warmup = 0;
                 warmup < 8 &&
                 remaining > 1d / 60d;
                 warmup++)
            {
                long cycleStartingIp = candidate.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints;
                if (!AutomatedBreakInfinityCycleSimulation.TryAdvance(
                        candidate,
                        facilityRules,
                        researchRules,
                        resetPolicy,
                        calculateReward,
                        rewardTarget,
                        resetThreshold,
                        1d / 60d,
                        0.1d,
                        automationRemaining,
                        remaining,
                        maximumCycles: 1L,
                        SimulationAutomationPolicy.ForceBuyMax,
                        out AutomatedBreakInfinityProjection exactWarmup) ||
                    exactWarmup.ConsumedSeconds <= 1e-12d)
                {
                    break;
                }
                canonicalAnchor = new InfinityCycleSample(
                    cycleStartingIp,
                    exactWarmup.LastReward,
                    (long)Math.Max(
                        1d,
                        Math.Ceiling(
                            exactWarmup.LastDurationSeconds / 0.1d)),
                    exactWarmup.LastDurationSeconds);
                cycles++;
                remaining = Math.Max(
                    0d,
                    remaining - exactWarmup.ConsumedSeconds);
                automationRemaining =
                    exactWarmup.AutomationTimeUntilNextEvent;
                candidate = exactWarmup.Candidate;
            }
            bool anchored = canonicalAnchor.HasValue;
            long projectionBlocks = 0L;
            long exactRemainderCycles = cycles;
            double maximumValidationError = 0d;
            string lastWorkDiagnostic = null;
            int loopGuard = 0;
            while (anchored &&
                   remaining > 1d / 60d &&
                   loopGuard++ < 10000)
            {
                long maximumCycles = NumericSafety.ToLongFloor(
                    Math.Floor(remaining / (1d / 60d))).Value;
                bool acceptedBlock = false;
                if (maximumCycles >= 8L)
                {
                    AutomatedBreakInfinityCycleSimulation.ProjectionWork
                        work =
                            AutomatedBreakInfinityCycleSimulation
                                .CreateProjectionWork(
                                    candidate,
                                    facilityRules,
                                    researchRules,
                                    resetPolicy,
                                    calculateReward,
                                    rewardTarget,
                                    resetThreshold,
                                    1d / 60d,
                                    0.1d,
                                    automationRemaining,
                                    remaining,
                                    maximumCycles,
                                    SimulationAutomationPolicy.ForceBuyMax,
                                    canonicalAnchor);
                    while (!work.IsCompleted)
                    {
                        AutomatedBreakInfinityCycleSimulation
                            .StepProjectionWork(work);
                    }
                    lastWorkDiagnostic = work.Diagnostic;
                    if (work.Accepted &&
                        work.Projection.ConsumedSeconds > 1e-12d)
                    {
                        acceptedBlock = true;
                        projectionBlocks++;
                        cycles = NumericSafety.Add(
                            cycles,
                            work.Projection.CycleCount).Value;
                        remaining = Math.Max(
                            0d,
                            remaining -
                            work.Projection.ConsumedSeconds);
                        automationRemaining =
                            work.Projection
                                .AutomationTimeUntilNextEvent;
                        maximumValidationError = Math.Max(
                            maximumValidationError,
                            work.Projection.ValidationError);
                        candidate = work.Projection.Candidate;
                    }
                }
                if (acceptedBlock)
                    continue;

                if (!AutomatedBreakInfinityCycleSimulation.TryAdvance(
                        candidate,
                        facilityRules,
                        researchRules,
                        resetPolicy,
                        calculateReward,
                        rewardTarget,
                        resetThreshold,
                        1d / 60d,
                        0.1d,
                        automationRemaining,
                        remaining,
                        maximumCycles: 1L,
                        SimulationAutomationPolicy.ForceBuyMax,
                        out AutomatedBreakInfinityProjection exact) ||
                    exact.ConsumedSeconds <= 1e-12d)
                {
                    break;
                }
                long exactStartingIp = candidate.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints;
                exactRemainderCycles++;
                cycles++;
                remaining = Math.Max(
                    0d,
                    remaining - exact.ConsumedSeconds);
                automationRemaining =
                    exact.AutomationTimeUntilNextEvent;
                candidate = exact.Candidate;
                canonicalAnchor = new InfinityCycleSample(
                    exactStartingIp,
                    exact.LastReward,
                    (long)Math.Max(
                        1d,
                        Math.Ceiling(
                            exact.LastDurationSeconds / 0.1d)),
                    exact.LastDurationSeconds);
            }
            stopwatch.Stop();

            bool projected = anchored && projectionBlocks > 0L;
            long finalIp = candidate.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            double consumed = durationSeconds - remaining;
            TestContext.WriteLine(
                $"PRIVATE_PHONE_PROJECTION simulated={durationSeconds:R};" +
                $"accepted={projected};" +
                $"startingIp={startingIp};" +
                $"earnedIp={finalIp - startingIp};" +
                $"finalIp={finalIp};" +
                $"cycles={cycles};" +
                $"consumed={consumed:R};" +
                $"remaining={Math.Max(0d, durationSeconds - consumed):R};" +
                $"cpuMs={stopwatch.Elapsed.TotalMilliseconds:F3};" +
                $"projectionBlocks={projectionBlocks};" +
                $"exactCycles={exactRemainderCycles};" +
                $"validationError={maximumValidationError:R};" +
                $"firstDiagnostic=" +
                $"{AutomatedBreakInfinityCycleSimulation.LastDiagnostic};" +
                $"workDiagnostic={lastWorkDiagnostic};" +
                $"adaptive=" +
                $"{AutomatedBreakInfinityCycleSimulation.LastAdaptiveDiagnostic};" +
                $"evaluations=" +
                $"{AutomatedBreakInfinityCycleSimulation.DiagnosticCycleEvaluations};" +
                $"boundaries=" +
                $"{AutomatedBreakInfinityCycleSimulation.DiagnosticCycleBoundaries}");

            Assert.IsTrue(anchored,
                "The exact first cycle must establish a post-reset anchor.");
            Assert.IsTrue(projected,
                "At least one projected block must be applied.");
            Assert.Less(loopGuard, 10000);
        }

        [Test]
        public void BreakInfinity_IpDrivenBlockPrototype_OneMillionIp_Slider100()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableAllFiniteQuantumUpgrades(seed);
            seed.infinityPointsToBreakFor = 100;
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                1_000_000L;
            seed.sdSimulation = new Oracle.SaveDataDream1();
            seed.sdPrestige.disasterStage = 42L;
            seed.sdPrestige.doubleTimeOwned = false;
            seed.sdPrestige.doubleTime = 0d;
            seed.sdPrestige.doDoubleTime = false;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();

            Assert.IsTrue(
                _botsAutoBuy.TryCaptureAutomationRules(
                    out DysonFacilityAutomationRule[] facilityRules),
                BotsAutoBuy.LastRuleCaptureDiagnostic);
            Assert.IsTrue(
                _researchAutoBuy.TryCaptureAutomationRules(
                    out ResearchAutomationRule[] researchRules));
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));

            const double ordinaryThreshold = 4.2d;
            const long rewardTarget = 100L;
            const long rewardMultiplier = 2L;
            long requiredBaseReward =
                rewardTarget / rewardMultiplier;
            double resetBotThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    requiredBaseReward,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            Func<double, long> calculateReward = bots =>
                NumericSafety.Multiply(
                    StaticMethods.InfinityPointsToGain(
                        ordinaryThreshold,
                        bots),
                    rewardMultiplier).Value;

            Oracle.SaveDataSettings candidate =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);
            var startPoints = new List<long>();
            var durations = new List<double>();
            var rewards = new List<long>();
            double automationRemaining = 0.1d;
            var exactTimer = System.Diagnostics.Stopwatch.StartNew();
            for (int index = 0; index < 64; index++)
            {
                startPoints.Add(
                    candidate.dysonVerseSaveData.dysonVersePrestigeData
                        .infinityPoints);
                Assert.IsTrue(
                    AutomatedBreakInfinityCycleSimulation.TryAdvance(
                        candidate,
                        facilityRules,
                        researchRules,
                        resetPolicy,
                        calculateReward,
                        rewardTarget,
                        resetBotThreshold,
                        1d / 60d,
                        0.1d,
                        automationRemaining,
                        1_000_000d,
                        maximumCycles: 1L,
                        SimulationAutomationPolicy.ForceBuyMax,
                        out AutomatedBreakInfinityProjection cycle),
                    AutomatedBreakInfinityCycleSimulation.LastDiagnostic);
                Assert.AreEqual(1L, cycle.CycleCount);
                durations.Add(cycle.ConsumedSeconds);
                rewards.Add(cycle.TotalReward);
                candidate = cycle.Candidate;
                automationRemaining =
                    cycle.AutomationTimeUntilNextEvent;
            }
            exactTimer.Stop();

            int exactCycles = CountCyclesWithin(
                durations,
                60d);
            double exactCompletedCycleSeconds = SumFirst(
                durations,
                exactCycles);
            long exactReward = SumFirst(
                rewards,
                exactCycles);
            TestContext.WriteLine(
                $"IP block prototype exact anchors: " +
                $"cycles={exactCycles}, reward={exactReward}, " +
                $"completedCycleSeconds={exactCompletedCycleSeconds:R}, " +
                $"64-cycleSampling={exactTimer.Elapsed.TotalMilliseconds:F3}ms");

            foreach (int blockSize in new[] { 4, 8, 16, 32 })
            {
                double[] predictedDurations =
                    PredictIpDrivenDurations(
                        startPoints,
                        durations,
                        blockSize,
                        out double maximumBlockError);
                int predictedCycles =
                    CountCyclesWithin(
                        predictedDurations,
                        60d);
                double predictedCompletedCycleSeconds =
                    SumFirst(
                        predictedDurations,
                        exactCycles);
                double completedCycleTimeError =
                    RelativeDifference(
                        exactCompletedCycleSeconds,
                        predictedCompletedCycleSeconds);
                TestContext.WriteLine(
                    $"IP block prototype size={blockSize}: " +
                    $"cycles={predictedCycles}/{exactCycles}, " +
                    $"completedTime=" +
                    $"{predictedCompletedCycleSeconds:R}/" +
                    $"{exactCompletedCycleSeconds:R}, " +
                    $"timeError={completedCycleTimeError:P6}, " +
                    $"maxBlockError={maximumBlockError:P6}, " +
                    $"anchorCycles<={2 * Math.Ceiling(64d / blockSize):F0}");
            }

            Assert.Greater(exactCycles, 0);
            Assert.AreEqual(
                NumericSafety.Multiply(
                    exactCycles,
                    rewardTarget).Value,
                exactReward);
        }

        [Test]
        public void BreakInfinity_AllFiniteQuantum_FirstCycleModelMatchesCanonicalTrace()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            EnableAllFiniteQuantumUpgrades(seed);
            seed.infinityPointsToBreakFor = 100;
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                1_000_000L;
            seed.sdSimulation = new Oracle.SaveDataDream1();
            seed.sdPrestige.disasterStage = 42L;
            seed.sdPrestige.doubleTimeOwned = false;
            seed.sdPrestige.doubleTime = 0d;
            seed.sdPrestige.doDoubleTime = false;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            bool canonicalDoubleIp =
                _oracle.saveSettings.doubleIp;
            bool canonicalQuantumDoubleIp =
                _oracle.saveSettings.prestigePlus.doubleIP;
            Assert.IsTrue(
                _researchAutoBuy.TryCaptureAutomationRules(
                    out ResearchAutomationRule[]
                        canonicalResearchRules));
            string canonicalResearchOrder =
                FormatResearchRuleOrder(
                    canonicalResearchRules);
            _gameManager.SetUnifiedAccelerationForTests(false);
            OfflineProgressContext canonical = CreateContext();
            var canonicalDurations = new List<double>();
            var canonicalRecordedDurations = new List<double>();
            var canonicalTickTrace = new List<string>();
            long previousCycles = 0L;
            double canonicalSeconds = 0d;
            double previousResetSeconds = 0d;
            string canonicalFirstResetState = null;
            Oracle.SaveDataSettings canonicalAfterFirstReset = null;
            while (canonicalDurations.Count < 10 &&
                   canonicalSeconds < 60d)
            {
                SimulationAdvanceResult step =
                    canonical.RunUnifiedSimulation(0.1d);
                Assert.Greater(step.ConsumedSeconds, 0d);
                canonicalSeconds += step.ConsumedSeconds;
                if (canonicalTickTrace.Count < 25)
                {
                    Oracle.DysonVerseInfinityData trace =
                        _oracle.saveSettings.dysonVerseSaveData
                            .dysonVerseInfinityData;
                    canonicalTickTrace.Add(
                        $"{canonicalSeconds:R}:" +
                        $"{trace.bots:R}:{trace.money:R}:" +
                        $"{trace.assemblyLines[0]:R}:" +
                        $"{trace.managers[0]:R}:" +
                        $"{trace.botProduction:R}");
                }
                long cycles = _oracle.saveSettings
                    .simulationStatistics.lifetime
                    .breakInfinityCount;
                if (cycles <= previousCycles)
                    continue;
                canonicalDurations.Add(
                    canonicalSeconds - previousResetSeconds);
                canonicalRecordedDurations.Add(
                    _oracle.saveSettings.timeLastInfinity);
                if (canonicalFirstResetState == null)
                {
                    canonicalFirstResetState =
                        FormatInfinityResetState(
                            _oracle.saveSettings,
                            step.AutomationTimeUntilNextEvent);
                    canonicalAfterFirstReset =
                        (Oracle.SaveDataSettings)
                        SerializationUtility.CreateCopy(
                            _oracle.saveSettings);
                }
                previousResetSeconds = canonicalSeconds;
                previousCycles = cycles;
            }
            _gameManager.SetUnifiedAccelerationForTests(true);

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            Assert.IsTrue(
                _botsAutoBuy.TryCaptureAutomationRules(
                    out DysonFacilityAutomationRule[] facilityRules),
                BotsAutoBuy.LastRuleCaptureDiagnostic);
            Assert.IsTrue(
                _researchAutoBuy.TryCaptureAutomationRules(
                    out ResearchAutomationRule[] researchRules));
            Assert.IsTrue(
                InfinityResetPolicy.TryCapture(
                    _oracle.saveSettings,
                    _oracle.ArtifactSkillPoints(),
                    GameData.GameDataRegistry.Instance?.skillDatabase,
                    out InfinityResetPolicy resetPolicy));

            const double ordinaryThreshold = 4.2d;
            const long rewardTarget = 100L;
            double resetBotThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    50L,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            Func<double, long> calculateReward = bots =>
                NumericSafety.Multiply(
                    StaticMethods.InfinityPointsToGain(
                        ordinaryThreshold,
                        bots),
                    2L).Value;
            Oracle.SaveDataSettings candidate =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);
            Oracle.SaveDataSettings manual =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(
                    _oracle.saveSettings);
            var modelTickTrace = new List<string>();
            for (int tick = 0; tick < 25; tick++)
            {
                Oracle.DysonVerseSaveData manualDyson =
                    manual.dysonVerseSaveData;
                ProductionSystem.SetBotDistribution(
                    manualDyson.dysonVerseInfinityData,
                    manualDyson.dysonVersePrestigeData,
                    manual.prestigePlus);
                ProductionSystem.CalculateProduction(
                    manualDyson.dysonVerseInfinityData,
                    manualDyson.dysonVerseSkillTreeData,
                    manualDyson.dysonVersePrestigeData,
                    manual.prestigePlus,
                    0.1d,
                    recomputeDerivedState: false);
                int facilityFirst = AutomationRotation.Normalize(
                    manual.dysonAutomationTargetIndex,
                    facilityRules.Length);
                for (int offset = 0;
                     offset < facilityRules.Length;
                     offset++)
                {
                    DysonAutomationTransactions.TryPurchaseFacility(
                        manual,
                        facilityRules[
                            (facilityFirst + offset) %
                            facilityRules.Length],
                        SimulationAutomationPolicy.ForceBuyMax,
                        out _);
                }
                manual.dysonAutomationTargetIndex =
                    AutomationRotation.Advance(
                        facilityFirst,
                        facilityRules.Length,
                        1L);
                int researchFirst = AutomationRotation.Normalize(
                    manual.researchAutomationTargetIndex,
                    researchRules.Length);
                for (int offset = 0;
                     offset < researchRules.Length;
                     offset++)
                {
                    DysonAutomationTransactions.TryPurchaseResearch(
                            manual,
                            researchRules[
                                (researchFirst + offset) %
                                researchRules.Length],
                            SimulationAutomationPolicy.ForceBuyMax,
                            out _);
                }
                manual.researchAutomationTargetIndex =
                    AutomationRotation.Advance(
                        researchFirst,
                        researchRules.Length,
                        1L);
                ProductionSystem.RecalculateDerivedState(
                    manualDyson.dysonVerseInfinityData,
                    manualDyson.dysonVerseSkillTreeData,
                    manualDyson.dysonVersePrestigeData,
                    manual.prestigePlus);
                Oracle.DysonVerseInfinityData trace =
                    manualDyson.dysonVerseInfinityData;
                modelTickTrace.Add(
                    $"{(tick + 1) * 0.1d:R}:" +
                    $"{trace.bots:R}:{trace.money:R}:" +
                    $"{trace.assemblyLines[0]:R}:" +
                    $"{trace.managers[0]:R}:" +
                    $"{trace.botProduction:R}");
            }
            var modelDurations = new List<double>();
            string modelFirstResetState = null;
            Oracle.SaveDataSettings modelAfterFirstReset = null;
            double automationRemaining = 0.1d;
            for (int index = 0; index < 10; index++)
            {
                Assert.IsTrue(
                    AutomatedBreakInfinityCycleSimulation.TryAdvance(
                        candidate,
                        facilityRules,
                        researchRules,
                        resetPolicy,
                        calculateReward,
                        rewardTarget,
                        resetBotThreshold,
                        1d / 60d,
                        0.1d,
                        automationRemaining,
                        60d,
                        maximumCycles: 1L,
                        SimulationAutomationPolicy.ForceBuyMax,
                        out AutomatedBreakInfinityProjection cycle),
                    AutomatedBreakInfinityCycleSimulation.LastDiagnostic);
                modelDurations.Add(cycle.ConsumedSeconds);
                automationRemaining =
                    cycle.AutomationTimeUntilNextEvent;
                candidate = cycle.Candidate;
                if (modelFirstResetState == null)
                {
                    modelFirstResetState =
                        FormatInfinityResetState(
                            candidate,
                            automationRemaining);
                    modelAfterFirstReset =
                        (Oracle.SaveDataSettings)
                        SerializationUtility.CreateCopy(candidate);
                }
            }

            var modelSecondCycleTicks = new List<string>();
            string resetDifferences =
                DescribeResetDifferences(
                    canonicalAfterFirstReset,
                    modelAfterFirstReset);
            _oracle.saveSettings =
                CloneAutomatedCandidate(modelAfterFirstReset);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(false);
            OfflineProgressContext runtimePulseContext = CreateContext();
            var runtimeSecondCycleTicks = new List<string>();
            SimulationAdvanceResult runtimePulse = null;
            string runtimePulseResearch = null;
            double runtimePulseBotRate = 0d;
            for (int tick = 0; tick < 20; tick++)
            {
                runtimePulse =
                    runtimePulseContext.RunUnifiedSimulation(0.1d);
                Oracle.DysonVerseInfinityData trace =
                    _oracle.saveSettings.dysonVerseSaveData
                        .dysonVerseInfinityData;
                runtimeSecondCycleTicks.Add(
                    $"{(tick + 1) * 0.1d:R}:" +
                    $"{trace.bots:R}:{trace.money:R}:" +
                    $"{trace.assemblyLines[0]:R}:" +
                    $"{trace.managers[0]:R}:" +
                    $"{trace.botProduction:R}");
                if (tick == 1)
                {
                    runtimePulseResearch =
                        FormatResearchState(_oracle.saveSettings);
                    runtimePulseBotRate = trace.botProduction;
                }
            }
            _gameManager.SetUnifiedAccelerationForTests(true);
            Oracle.SaveDataSettings secondCycle =
                CloneAutomatedCandidate(modelAfterFirstReset);
            string modelPulseResearch = null;
            double modelPulseBotRate = 0d;
            double secondAutomation =
                modelFirstResetState != null
                    ? 0.099992417732123431d
                    : 0.1d;
            for (int tick = 0; tick < 20; tick++)
            {
                double step = Math.Min(0.1d, secondAutomation);
                Oracle.DysonVerseSaveData secondDyson =
                    secondCycle.dysonVerseSaveData;
                ProductionSystem.SetBotDistribution(
                    secondDyson.dysonVerseInfinityData,
                    secondDyson.dysonVersePrestigeData,
                    secondCycle.prestigePlus);
                ProductionSystem.CalculateProduction(
                    secondDyson.dysonVerseInfinityData,
                    secondDyson.dysonVerseSkillTreeData,
                    secondDyson.dysonVersePrestigeData,
                    secondCycle.prestigePlus,
                    step,
                    recomputeDerivedState: false);
                secondAutomation -= step;
                if (secondAutomation <= 1e-12d)
                {
                    int first = AutomationRotation.Normalize(
                        secondCycle.dysonAutomationTargetIndex,
                        facilityRules.Length);
                    for (int offset = 0;
                         offset < facilityRules.Length;
                         offset++)
                    {
                        DysonAutomationTransactions.TryPurchaseFacility(
                            secondCycle,
                            facilityRules[
                                (first + offset) %
                                facilityRules.Length],
                            SimulationAutomationPolicy.ForceBuyMax,
                            out _);
                    }
                    secondCycle.dysonAutomationTargetIndex =
                        AutomationRotation.Advance(
                            first,
                            facilityRules.Length,
                            1L);
                    int researchFirst = AutomationRotation.Normalize(
                        secondCycle.researchAutomationTargetIndex,
                        researchRules.Length);
                    for (int offset = 0;
                         offset < researchRules.Length;
                         offset++)
                    {
                        DysonAutomationTransactions.TryPurchaseResearch(
                            secondCycle,
                            researchRules[
                                (researchFirst + offset) %
                                researchRules.Length],
                            SimulationAutomationPolicy.ForceBuyMax,
                            out _);
                    }
                    secondCycle.researchAutomationTargetIndex =
                        AutomationRotation.Advance(
                            researchFirst,
                            researchRules.Length,
                            1L);
                    secondAutomation = 0.1d;
                }
                ProductionSystem.RecalculateDerivedState(
                    secondDyson.dysonVerseInfinityData,
                    secondDyson.dysonVerseSkillTreeData,
                    secondDyson.dysonVersePrestigeData,
                    secondCycle.prestigePlus);
                Oracle.DysonVerseInfinityData trace =
                    secondDyson.dysonVerseInfinityData;
                modelSecondCycleTicks.Add(
                    $"{(tick + 1) * 0.1d:R}:" +
                    $"{trace.bots:R}:{trace.money:R}:" +
                    $"{trace.assemblyLines[0]:R}:" +
                    $"{trace.managers[0]:R}:" +
                    $"{trace.botProduction:R}");
                if (tick == 1)
                {
                    modelPulseResearch =
                        FormatResearchState(secondCycle);
                    modelPulseBotRate =
                        trace.botProduction;
                }
            }

            TestContext.WriteLine(
                "canonical first-cycle durations=" +
                string.Join(",", canonicalDurations) +
                "; canonicalRecorded=" +
                string.Join(",", canonicalRecordedDurations) +
                "; model=" +
                string.Join(",", modelDurations) +
                $"; multipliers={canonicalDoubleIp}/" +
                $"{canonicalQuantumDoubleIp}/" +
                $"{_oracle.saveSettings.doubleIp}/" +
                $"{_oracle.saveSettings.prestigePlus.doubleIP}" +
                $"; ruleOrder={canonicalResearchOrder}/" +
                $"{FormatResearchRuleOrder(researchRules)}" +
                $"; threshold={resetBotThreshold:R}" +
                $"; resetState={canonicalFirstResetState}/" +
                $"{modelFirstResetState}" +
                $"; resetDiff={resetDifferences}" +
                $"; pulse={runtimePulse.ConsumedSeconds:R}:" +
                $"{runtimePulseBotRate:R}:" +
                $"{runtimePulseResearch}/" +
                $"{modelPulseBotRate:R}:" +
                $"{modelPulseResearch}" +
                "; canonicalTicks=" +
                string.Join("|", canonicalTickTrace) +
                "; modelTicks=" +
                string.Join("|", modelTickTrace) +
                "; runtimeSecondTicks=" +
                string.Join("|", runtimeSecondCycleTicks) +
                "; modelSecondTicks=" +
                string.Join("|", modelSecondCycleTicks));
            Assert.AreEqual(10, canonicalDurations.Count);
            Assert.AreEqual(10, modelDurations.Count);
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
        public void BreakInfinity_OneUlpBelowRewardThresholdMakesTimeProgress()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            seed.infinityPointsToBreakFor = 200;
            seed.doubleIp = true;
            seed.prestigePlus.doubleIP = true;
            seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints =
                1_000_000L;

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.ResetActiveSimulationForTests();

            const double ordinaryThreshold = 4.2d;
            double rewardThreshold =
                Blindsided.Utilities.CalcUtils.BuyXCost(
                    50d,
                    ordinaryThreshold,
                    _oracle.infinityExponent,
                    0d);
            Oracle.DysonVerseInfinityData data =
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            data.bots = NumericSafety.BitDecrement(rewardThreshold);
            data.botProduction = 3.9e37d;
            Assert.Less(
                StaticMethods.InfinityPointsToGain(
                    ordinaryThreshold,
                    data.bots) * 4L,
                seed.infinityPointsToBreakFor,
                "The fixture must begin on the one-ULP-below side of " +
                "the discrete reward boundary.");

            typeof(GameManager).GetField(
                    "_activeInfinityCycleSeconds",
                    BindingFlags.Instance | BindingFlags.NonPublic)
                ?.SetValue(_gameManager, 0.02d);
            SimulationAdvanceResult result =
                _gameManager.AdvanceActiveSimulationForTests(1e-6d);

            Assert.NotNull(result);
            Assert.AreNotEqual(
                SimulationValidationStatus.ZeroTimeLoop,
                result.ValidationStatus);
            Assert.Greater(
                result.ConsumedSeconds,
                1e-12d,
                "The event horizon must be representably greater than " +
                "the scheduler's zero-time epsilon.");
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
        public void BreakInfinity_ActiveSliderChangeAppliesAtSafeBoundaryWithoutRollingBackElapsedWork()
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

            int moves = 0;
            SimulationAdvanceResult advance = null;
            do
            {
                advance = _gameManager.AdvanceActiveSimulationForTests(
                    moves == 0 ? 600d : 0d,
                    processingBudgetMilliseconds: 0.5d);
                moves++;
            } while (
                moves < 10_000 &&
                (_oracle.saveSettings.dysonVerseSaveData
                     .dysonVersePrestigeData.infinityPoints <= 100_000L ||
                 advance == null ||
                 advance.ConsumedSeconds <= 0d));
            Assert.NotNull(advance);
            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                100_000L,
                "The old-target segment must make real progress before the " +
                "queued slider change.");
            long ipBeforeQueuedChange = _oracle.saveSettings
                .dysonVerseSaveData.dysonVersePrestigeData.infinityPoints;

            MethodInfo queueBreakTarget = typeof(GameManager).GetMethod(
                "QueueBreakTargetChange",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(queueBreakTarget);
            queueBreakTarget.Invoke(
                _gameManager,
                new object[] { 777L });
            moves = 0;
            while (_oracle.saveSettings.infinityPointsToBreakFor != 777 &&
                   moves < 10_000)
            {
                _gameManager.AdvanceActiveSimulationForTests(
                    moves == 0 ? 1d / 600d : 0d,
                    processingBudgetMilliseconds: 0.5d);
                moves++;
            }

            Assert.AreEqual(
                777,
                _oracle.saveSettings.infinityPointsToBreakFor);
            Assert.AreEqual(
                ipBeforeQueuedChange,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                "The already elapsed old-target segment should complete " +
                "before the new slider target applies, and applying the " +
                "input itself must not manufacture another reward.");
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
            foreach (MegaStructurePresenter presenter in
                     UnityEngine.Object.FindObjectsByType<MegaStructurePresenter>(
                         FindObjectsInactive.Include,
                         FindObjectsSortMode.None))
            {
                InvokePrivate(presenter, "Awake");
            }
            InvokePrivate(_botsAutoBuy, "Awake");
        }

        private void InitializeResearchAutomation()
        {
            foreach (ResearchPresenter presenter in
                     UnityEngine.Object.FindObjectsByType<ResearchPresenter>(
                         FindObjectsInactive.Include,
                         FindObjectsSortMode.None))
            {
                InvokePrivate(presenter, "Awake");
            }
            InvokePrivate(_researchAutoBuy, "Awake");
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

        private static object InvokePrivateWithResult(
            object target,
            string methodName)
        {
            Assert.NotNull(target, methodName);
            MethodInfo method = target.GetType().GetMethod(
                methodName,
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(method, methodName);
            return method.Invoke(target, null);
        }

        private string DescribeActiveInfinityStop()
        {
            Type type = typeof(GameManager);
            object state = type.GetField(
                    "_activeInfinityCycleState",
                    BindingFlags.Instance | BindingFlags.NonPublic)
                ?.GetValue(_gameManager);
            double cycleSeconds = (double)(type.GetField(
                    "_activeInfinityCycleSeconds",
                    BindingFlags.Instance | BindingFlags.NonPublic)
                ?.GetValue(_gameManager) ?? 0d);
            double boundary = (double)(type.GetField(
                    "_activeSimulationBoundaryRemaining",
                    BindingFlags.Instance | BindingFlags.NonPublic)
                ?.GetValue(_gameManager) ?? 0d);
            MethodInfo thresholdMethod = type.GetMethod(
                "GetOfflineResetBotThreshold",
                BindingFlags.Instance | BindingFlags.NonPublic);
            MethodInfo rewardMethod = type.GetMethod(
                "CalculateBreakRewardForBots",
                BindingFlags.Instance | BindingFlags.NonPublic);
            MethodInfo dreamMethod = type.GetMethod(
                "TimeToNextDreamMaterialEvent",
                BindingFlags.Instance | BindingFlags.NonPublic);
            double threshold = state != null && thresholdMethod != null
                ? (double)thresholdMethod.Invoke(
                    _gameManager,
                    new[] { state })
                : double.NaN;
            long reward = rewardMethod != null
                ? (long)rewardMethod.Invoke(
                    _gameManager,
                    new object[]
                    {
                        _oracle.saveSettings.dysonVerseSaveData
                            .dysonVerseInfinityData.bots
                    })
                : -1L;
            double dream = dreamMethod != null
                ? (double)dreamMethod.Invoke(
                    _gameManager,
                    new object[] { 1d })
                : double.NaN;
            return
                $"bots={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots:R}," +
                $"botProduction={_oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.botProduction:R}," +
                $"threshold={threshold:R}," +
                $"reward={reward}," +
                $"target={_oracle.saveSettings.infinityPointsToBreakFor}," +
                $"cycle={cycleSeconds:R}," +
                $"boundary={boundary:R}," +
                $"dreamHorizon={dream:R}";
        }

        private string DescribeAccelerationEligibility()
        {
            Oracle.SaveDataSettings settings = _oracle.saveSettings;
            bool persistentSideEffects =
                AnalyticalOfflineSimulation.HasPersistentSideEffects(
                    settings.dysonVerseSaveData.dysonVerseSkillTreeData);
            bool dreamIdle =
                DreamAnalyticalOfflineSimulation.IsClockIdle(
                    settings.sdSimulation,
                    _space != null && _space.IsRailgunFiring);
            return
                $"persistentSkills={persistentSideEffects}," +
                $"dreamIdle={dreamIdle}," +
                $"autoBots={settings.dysonVerseSaveData.dysonVersePrestigeData.infinityAutoBots}," +
                $"autoResearch={settings.dysonVerseSaveData.dysonVersePrestigeData.infinityAutoResearch}," +
                $"androids={settings.dysonVerseSaveData.dysonVerseSkillTreeData.androids}," +
                $"pocketAndroids={settings.dysonVerseSaveData.dysonVerseSkillTreeData.pocketAndroids}," +
                $"superRadiant={settings.dysonVerseSaveData.dysonVerseSkillTreeData.superRadiantScattering}";
        }

        private static double RelativeRatio(long value, long reference)
        {
            return reference > 0L
                ? value / (double)reference
                : 0d;
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

        private static double[] PredictIpDrivenDurations(
            IReadOnlyList<long> startPoints,
            IReadOnlyList<double> exactDurations,
            int blockSize,
            out double maximumBlockError)
        {
            int count = Math.Min(
                startPoints?.Count ?? 0,
                exactDurations?.Count ?? 0);
            var predicted = new double[count];
            maximumBlockError = 0d;
            for (int blockStart = 0;
                 blockStart < count;
                 blockStart += blockSize)
            {
                int blockEnd = Math.Min(
                    count - 1,
                    blockStart + blockSize - 1);
                double startIp = Math.Max(
                    1d,
                    startPoints[blockStart] + 1d);
                double endIp = Math.Max(
                    startIp,
                    startPoints[blockEnd] + 1d);
                double startDuration =
                    exactDurations[blockStart];
                double endDuration =
                    exactDurations[blockEnd];
                double exponent = 0d;
                if (blockEnd > blockStart &&
                    startDuration > 0d &&
                    endDuration > 0d &&
                    endIp > startIp)
                {
                    exponent = Math.Log(
                                   endDuration / startDuration) /
                               Math.Log(endIp / startIp);
                }

                double exactBlockSeconds = 0d;
                double predictedBlockSeconds = 0d;
                for (int index = blockStart;
                     index <= blockEnd;
                     index++)
                {
                    double ip = Math.Max(
                        startIp,
                        startPoints[index] + 1d);
                    double duration =
                        startDuration *
                        Math.Pow(ip / startIp, exponent);
                    predicted[index] =
                        NumericSafety.IsFinite(duration) &&
                        duration > 0d
                            ? duration
                            : startDuration;
                    exactBlockSeconds +=
                        exactDurations[index];
                    predictedBlockSeconds +=
                        predicted[index];
                }

                maximumBlockError = Math.Max(
                    maximumBlockError,
                    RelativeDifference(
                        exactBlockSeconds,
                        predictedBlockSeconds));
            }
            return predicted;
        }

        private static int CountCyclesWithin(
            IReadOnlyList<double> durations,
            double availableSeconds)
        {
            double elapsed = 0d;
            int cycles = 0;
            for (int index = 0;
                 durations != null && index < durations.Count;
                 index++)
            {
                double next = durations[index];
                if (!NumericSafety.IsFinite(next) ||
                    next <= 0d ||
                    elapsed + next > availableSeconds + 1e-12d)
                {
                    break;
                }
                elapsed += next;
                cycles++;
            }
            return cycles;
        }

        private static double SumFirst(
            IReadOnlyList<double> values,
            int count)
        {
            double sum = 0d;
            for (int index = 0;
                 values != null &&
                 index < values.Count &&
                 index < count;
                 index++)
            {
                sum += values[index];
            }
            return sum;
        }

        private static long SumFirst(
            IReadOnlyList<long> values,
            int count)
        {
            long sum = 0L;
            for (int index = 0;
                 values != null &&
                 index < values.Count &&
                 index < count;
                 index++)
            {
                sum = NumericSafety.Add(
                    sum,
                    values[index]).Value;
            }
            return sum;
        }

        private static double RelativeDifference(
            double expected,
            double actual)
        {
            return Math.Abs(expected - actual) /
                   Math.Max(
                       1e-12d,
                       Math.Max(
                           Math.Abs(expected),
                           Math.Abs(actual)));
        }

        private static string FormatInfinityResetState(
            Oracle.SaveDataSettings settings,
            double automationRemaining)
        {
            Oracle.DysonVerseSaveData dyson =
                settings.dysonVerseSaveData;
            Oracle.DysonVerseInfinityData data =
                dyson.dysonVerseInfinityData;
            Oracle.DysonVerseSkillTreeData skills =
                dyson.dysonVerseSkillTreeData;
            return
                $"ip:{dyson.dysonVersePrestigeData.infinityPoints}," +
                $"bots:{data.bots:R}," +
                $"botRate:{data.botProduction:R}," +
                $"line:{data.assemblyLines[0]:R}/" +
                $"{data.assemblyLines[1]:R}," +
                $"sp:{skills.skillPointsTree}," +
                $"fragments:{skills.fragments}," +
                $"rotation:{settings.dysonAutomationTargetIndex}/" +
                $"{settings.researchAutomationTargetIndex}," +
                $"automation:{automationRemaining:R}";
        }

        private static string FormatResearchState(
            Oracle.SaveDataSettings settings)
        {
            var values = new List<string>();
            Dictionary<string, double> levels =
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData
                    .researchLevelsById;
            if (levels == null)
                return "-";
            foreach (KeyValuePair<string, double> pair in levels)
            {
                if (pair.Value > 0d)
                    values.Add($"{pair.Key}:{pair.Value:R}");
            }
            values.Sort(StringComparer.Ordinal);
            return values.Count == 0
                ? "-"
                : string.Join(",", values);
        }

        private static string FormatResearchRuleOrder(
            IReadOnlyList<ResearchAutomationRule> rules)
        {
            var ids = new List<string>();
            for (int index = 0;
                 rules != null && index < rules.Count;
                 index++)
            {
                ids.Add(rules[index].ResearchId ?? "-");
            }
            return string.Join(",", ids);
        }

        private static string DescribeResetDifferences(
            Oracle.SaveDataSettings left,
            Oracle.SaveDataSettings right)
        {
            var differences = new List<string>();
            AppendFieldDifferences(
                "infinity",
                left.dysonVerseSaveData
                    .dysonVerseInfinityData,
                right.dysonVerseSaveData
                    .dysonVerseInfinityData,
                differences);
            AppendFieldDifferences(
                "skills",
                left.dysonVerseSaveData
                    .dysonVerseSkillTreeData,
                right.dysonVerseSaveData
                    .dysonVerseSkillTreeData,
                differences);
            AppendFieldDifferences(
                "prestige",
                left.dysonVerseSaveData
                    .dysonVersePrestigeData,
                right.dysonVerseSaveData
                    .dysonVersePrestigeData,
                differences);
            return differences.Count == 0
                ? "-"
                : string.Join("|", differences);
        }

        private static Oracle.SaveDataSettings
            CloneAutomatedCandidate(
                Oracle.SaveDataSettings source)
        {
            MethodInfo clone = typeof(
                    AutomatedBreakInfinityCycleSimulation)
                .GetMethod(
                    "CloneSimulationCandidate",
                    BindingFlags.Static |
                    BindingFlags.NonPublic);
            Assert.NotNull(clone);
            return (Oracle.SaveDataSettings)
                clone.Invoke(null, new object[] { source });
        }

        private static void AppendFieldDifferences(
            string prefix,
            object left,
            object right,
            ICollection<string> differences)
        {
            foreach (FieldInfo field in left.GetType().GetFields(
                         BindingFlags.Instance |
                         BindingFlags.Public))
            {
                string leftValue =
                    FormatFieldValue(field.GetValue(left));
                string rightValue =
                    FormatFieldValue(field.GetValue(right));
                if (!string.Equals(
                        leftValue,
                        rightValue,
                        StringComparison.Ordinal))
                {
                    differences.Add(
                        $"{prefix}.{field.Name}:" +
                        $"{leftValue}/{rightValue}");
                }
            }
        }

        private static string FormatFieldValue(object value)
        {
            if (value == null)
                return "null";
            if (value is double number)
                return number.ToString("R");
            if (value is Array array)
            {
                var items = new List<string>();
                foreach (object item in array)
                    items.Add(FormatFieldValue(item));
                return "[" + string.Join(",", items) + "]";
            }
            if (value is IDictionary dictionary)
            {
                var items = new List<string>();
                foreach (DictionaryEntry entry in dictionary)
                {
                    items.Add(
                        $"{entry.Key}=" +
                        $"{FormatFieldValue(entry.Value)}");
                }
                items.Sort(StringComparer.Ordinal);
                return "{" + string.Join(",", items) + "}";
            }
            return value.ToString();
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

        private static void EnableAllFiniteQuantumUpgrades(
            Oracle.SaveDataSettings settings)
        {
            Oracle.PrestigePlus quantum = settings.prestigePlus;
            quantum.botMultitasking = true;
            quantum.doubleIP = true;
            quantum.breakTheLoop = true;
            quantum.quantumEntanglement = true;
            quantum.automation = true;
            quantum.divisionsPurchased = 19L;
            quantum.secrets = 27L;
            quantum.avocatoPurchased = true;
            quantum.fragments = true;
            quantum.purity = true;
            quantum.terra = true;
            quantum.power = true;
            quantum.paragade = true;
            quantum.stellar = true;

            // Influence, cash, and science are unbounded repeatable purchases,
            // so they intentionally remain at zero in this finite-upgrade
            // fixture.
            quantum.influence = 0L;
            quantum.cash = 0L;
            quantum.science = 0L;

            settings.avocadoData.unlocked = true;
            Oracle.DysonVersePrestigeData prestige =
                settings.dysonVerseSaveData.dysonVersePrestigeData;
            prestige.secretsOfTheUniverse = 27L;
            prestige.infinityAutoBots = true;
            prestige.infinityAutoResearch = true;
            prestige.unlockedMatrioshkaBrains = true;
            prestige.unlockedBirchPlanets = true;
            prestige.unlockedGalacticBrains = true;
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
