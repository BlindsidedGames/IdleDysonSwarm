using System;
using System.Collections;
using System.Reflection;
using Buildings;
using Expansion;
using IdleDysonSwarm.Services;
using NUnit.Framework;
using Research;
using Sirenix.Serialization;
using Systems;
using Systems.Numeric;
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

        [Test]
        public void ActiveDream_EighteenHoursCompletesWithinOneSecondOfCpuWork()
        {
            _oracle.saveSettings = CreateRepresentativeSettings();
            SubscribeAndResetRuntime();
            OfflineProgressContext context = CreateContext();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                18d * 60d * 60d,
                context,
                ui: null));

            stopwatch.Stop();
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                1000d,
                "Representative active Dream offline replay should remain near-instant.");
            Assert.IsTrue(NumericSafety.IsFinite(_oracle.saveSettings.sdSimulation.workers));
            Assert.IsTrue(NumericSafety.IsFinite(_oracle.saveSettings.sdSimulation.cities));
        }

        [Test]
        public void DreamAdaptive_LongRepresentativeReportsStructuralConvergence()
        {
            Oracle.SaveDataSettings settings =
                CreateRepresentativeSettings();
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
            Assert.LessOrEqual(error, 0.001d);
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

        [Test]
        public void ActiveDysonAutomationAndDream_EighteenHoursCompletesPromptly()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeDysonAutomation(seed);

            double[] elapsedMilliseconds = new double[3];
            for (int iteration = 0; iteration < elapsedMilliseconds.Length; iteration++)
            {
                double editorStart = UnityEditor.EditorApplication.timeSinceStartup;
                var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                _oracle.saveSettings =
                    (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
                PrepareDysonDerivedState();
                SubscribeAndResetRuntime();
                Run(OfflineProgressSystem.CalculateAwayValues(
                    18d * 60d * 60d,
                    CreateContext(),
                    ui: null));
                stopwatch.Stop();
                elapsedMilliseconds[iteration] =
                    stopwatch.Elapsed.TotalMilliseconds;
                double editorElapsed =
                    (UnityEditor.EditorApplication.timeSinceStartup -
                     editorStart) * 1000d;
                TestContext.WriteLine(
                    $"18h automation iteration {iteration}: " +
                    $"Stopwatch={elapsedMilliseconds[iteration]:F3}ms, " +
                    $"EditorClock={editorElapsed:F3}ms");
                Assert.AreEqual(
                    elapsedMilliseconds[iteration],
                    editorElapsed,
                    100d,
                    "Independent clocks should agree on complete-runner timing.");

                Assert.IsTrue(NumericSafety.IsFinite(
                    _oracle.saveSettings.dysonVerseSaveData
                        .dysonVerseInfinityData.money));
                Assert.IsTrue(NumericSafety.IsFinite(
                    _oracle.saveSettings.sdSimulation.workers));
            }

            Assert.Less(
                elapsedMilliseconds[0],
                1500d,
                "Cold representative active automation replay should be prompt.");
            Assert.Less(
                Math.Max(elapsedMilliseconds[1], elapsedMilliseconds[2]),
                1500d,
                "Warm representative active automation replay should be near-instant.");
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

        [Test]
        public void ActiveDysonAutomationAndDream_ActualSceneCoroutineIncludesUiPath()
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
                new object[] { 18d * 60d * 60d }));
            stopwatch.Stop();
            TestContext.WriteLine(
                $"18h actual scene coroutine/UI path: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms");
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                1500d);
        }

        [Test]
        public void BreakInfinity_RepeatedOnePointTwoSecondScaleCyclesAreBatchedPromptly()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeBreakInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                18d * 60d * 60d,
                CreateContext(),
                ui: null));

            stopwatch.Stop();
            SimulationWorkMetrics work =
                OfflineProgressSystem.LastSimulationWorkMetrics;
            TestContext.WriteLine(
                $"18h adaptive Break Infinity: " +
                $"{stopwatch.Elapsed.TotalMilliseconds:F3}ms, " +
                $"IP={_oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints}, " +
                $"accepted={work.AccelerationBlocksAccepted}, " +
                $"breakBlocks={work.BreakInfinityBlocks}, " +
                $"productionBlocks={work.ProductionOnlyBlocks}, " +
                $"rejected={work.AccelerationBlocksRejected}, " +
                $"exactEvents={work.MaterialEvents}");
            Assert.Less(
                stopwatch.Elapsed.TotalMilliseconds,
                2500d);
            Assert.Greater(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                seed.dysonVerseSaveData.dysonVersePrestigeData.infinityPoints);
            Assert.IsTrue(NumericSafety.IsFinite(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots));
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

            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            OfflineProgressContext canonical = CreateContext();
            canonical.RunAnalyticalTicks = _ => 0L;
            Run(OfflineProgressSystem.CalculateAwayValues(
                600d,
                canonical,
                ui: null));

            long expectedIp = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            long actualIp = optimized.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            double relativeIpError =
                Math.Abs((double)actualIp - expectedIp) /
                Math.Max(1d, expectedIp);
            TestContext.WriteLine(
                $"600s Break Infinity canonical/optimized IP: " +
                $"{expectedIp}/{actualIp} ({relativeIpError:P3})");
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
            Assert.LessOrEqual(relativeIpError, 0.001d);
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

        [Test]
        public void NormalInfinity_HighFrequencyCyclesUseTheSameAdaptiveBatcher()
        {
            Oracle.SaveDataSettings seed = CreateRepresentativeSettings();
            EnableRepresentativeNormalInfinity(seed);
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(seed);
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            Run(OfflineProgressSystem.CalculateAwayValues(
                18d * 60d * 60d,
                CreateContext(),
                ui: null));

            stopwatch.Stop();
            // Retention leaves this fixture above the ordinary threshold after
            // every reset. Automation remains an independent 0.1-second event
            // stream, while Infinity completes at its authored 1/60-second
            // minimum for the entire requested interval.
            const double duration = 18d * 60d * 60d;
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

        private static Oracle.SaveDataSettings CreateRepresentativeSettings()
        {
            var settings = new Oracle.SaveDataSettings();
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

        private static void AssertRelative(double expected, double actual)
        {
            double tolerance = Math.Max(1e-9d, Math.Abs(expected) * 1e-9d);
            Assert.AreEqual(expected, actual, tolerance);
        }
    }
}
