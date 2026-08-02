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
using Systems.Skills;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Tests.Systems
{
    /// <summary>
    /// Small end-to-end characterization suite for the live event-time path.
    /// Detailed projection mathematics belong in the pure unit tests; this
    /// fixture proves that the scene adapter uses that path without retaining
    /// every historical benchmark and abandoned projector experiment.
    /// </summary>
    [TestFixture]
    public sealed class OfflineRuntimePerformanceTests
    {
        private Oracle _oracle;
        private Oracle _previousOracle;
        private GameManager _gameManager;
        private FoundationalEraManager _foundational;
        private InformationEraManager _information;
        private SpaceAgeManager _space;
        private BotsAutoBuy _botsAutoBuy;
        private ResearchAutoBuy _researchAutoBuy;

        [SetUp]
        public void SetUp()
        {
            EditorSceneManager.OpenScene(
                "Assets/Scenes/Game.unity",
                OpenSceneMode.Single);
            _oracle = UnityEngine.Object.FindFirstObjectByType<Oracle>(
                FindObjectsInactive.Include);
            _gameManager =
                UnityEngine.Object.FindFirstObjectByType<GameManager>(
                    FindObjectsInactive.Include);
            _foundational =
                UnityEngine.Object
                    .FindFirstObjectByType<FoundationalEraManager>(
                        FindObjectsInactive.Include);
            _information =
                UnityEngine.Object
                    .FindFirstObjectByType<InformationEraManager>(
                        FindObjectsInactive.Include);
            _space =
                UnityEngine.Object.FindFirstObjectByType<SpaceAgeManager>(
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
            Assert.NotNull(_botsAutoBuy);
            Assert.NotNull(_researchAutoBuy);

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
                UnityEngine.Object
                    .FindFirstObjectByType<SimulationPrestigeManager>(
                        FindObjectsInactive.Include));
            BindManager("botsAutoBuy", _botsAutoBuy);
            BindManager("researchAutoBuy", _researchAutoBuy);
            InitializeFacilityAutomation();
        }

        [TearDown]
        public void TearDown()
        {
            InvokePrivate(_foundational, "OnDisable");
            InvokePrivate(_information, "OnDisable");
            InvokePrivate(_space, "OnDisable");
            Oracle.oracle = _previousOracle;
            EditorSceneManager.NewScene(
                NewSceneSetup.EmptyScene,
                NewSceneMode.Single);
        }

        [Test]
        public void OneMinuteSampledPathRemainsFiniteAndCharacterized()
        {
            Oracle.SaveDataSettings seed = CreateBreakFixture();
            ProjectionOutcome projected = RunStoredTime(
                seed,
                60d,
                accelerationEnabled: true);
            ProjectionOutcome canonical = RunStoredTime(
                seed,
                60d,
                accelerationEnabled: false);

            TestContext.WriteLine(
                $"one-minute projected/canonical: " +
                $"cycles={projected.Cycles}/{canonical.Cycles};" +
                $"IP={projected.InfinityPoints}/" +
                $"{canonical.InfinityPoints}");
            Assert.Greater(projected.Cycles, 0L);
            Assert.Greater(canonical.Cycles, 0L);
            Assert.Less(
                SymmetricDifference(
                    projected.InfinityPoints,
                    canonical.InfinityPoints),
                0.25d,
                "This is a catastrophic-drift guard, not an accuracy target.");
            Assert.IsTrue(projected.BotsAreFinite);
        }

        [Test]
        public void OneHourProjectionIsStableAcrossStoredTimePartitions()
        {
            Oracle.SaveDataSettings seed = CreateBreakFixture();
            ProjectionOutcome whole = RunStoredTime(
                seed,
                3600d,
                accelerationEnabled: true);

            LoadFixture(seed, accelerationEnabled: true);
            Run(OfflineProgressSystem.CalculateAwayValues(
                1800d,
                CreateContext(),
                ui: null));
            Run(OfflineProgressSystem.CalculateAwayValues(
                1800d,
                CreateContext(),
                ui: null));
            ProjectionOutcome split = CaptureOutcome();

            Assert.Greater(whole.Cycles, 0L);
            Assert.Greater(split.Cycles, 0L);
            Assert.IsTrue(whole.BotsAreFinite);
            Assert.IsTrue(split.BotsAreFinite);
            Assert.Less(
                SymmetricDifference(
                    whole.InfinityPoints,
                    split.InfinityPoints),
                0.25d,
                "This is a catastrophic-drift guard, not an accuracy target.");
            Assert.Less(
                SymmetricDifference(whole.Cycles, split.Cycles),
                0.25d,
                "This is a catastrophic-drift guard, not an accuracy target.");
        }

        [Test]
        public void ActiveSliderChangeAppliesAtSafeBoundary()
        {
            Oracle.SaveDataSettings seed = CreateBreakFixture();
            LoadFixture(seed, accelerationEnabled: true);
            _gameManager.ResetActiveSimulationForTests();

            SimulationAdvanceResult advance = null;
            for (int attempt = 0;
                 attempt < 10_000 &&
                 _oracle.saveSettings.dysonVerseSaveData
                     .dysonVersePrestigeData.infinityPoints <= 1_000_000L;
                 attempt++)
            {
                advance = _gameManager.AdvanceActiveSimulationForTests(
                    attempt == 0 ? 600d : 0d,
                    processingBudgetMilliseconds: 0.5d);
            }
            Assert.NotNull(advance);
            long beforeInput = _oracle.saveSettings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints;
            Assert.Greater(beforeInput, 1_000_000L);

            MethodInfo queue = typeof(GameManager).GetMethod(
                "QueueBreakTargetChange",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(queue);
            queue.Invoke(_gameManager, new object[] { 777L });
            for (int attempt = 0;
                 attempt < 10_000 &&
                 _oracle.saveSettings.infinityPointsToBreakFor != 777;
                 attempt++)
            {
                _gameManager.AdvanceActiveSimulationForTests(
                    attempt == 0 ? 1d / 600d : 0d,
                    processingBudgetMilliseconds: 0.5d);
            }

            Assert.AreEqual(
                777,
                _oracle.saveSettings.infinityPointsToBreakFor);
            Assert.AreEqual(
                beforeInput,
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                "Applying an input must not manufacture a reset reward.");
        }

        private ProjectionOutcome RunStoredTime(
            Oracle.SaveDataSettings seed,
            double seconds,
            bool accelerationEnabled)
        {
            LoadFixture(seed, accelerationEnabled);
            Run(OfflineProgressSystem.CalculateAwayValues(
                seconds,
                CreateContext(),
                ui: null));
            return CaptureOutcome();
        }

        private void LoadFixture(
            Oracle.SaveDataSettings seed,
            bool accelerationEnabled)
        {
            _oracle.saveSettings =
                (Oracle.SaveDataSettings)
                SerializationUtility.CreateCopy(seed);
            InitializeResearchAutomation();
            PrepareDysonDerivedState();
            SubscribeAndResetRuntime();
            _gameManager.SetUnifiedAccelerationForTests(
                accelerationEnabled);
            _gameManager.SetSampledInfinityProjectionForTests(true);
        }

        private ProjectionOutcome CaptureOutcome()
        {
            return new ProjectionOutcome(
                _oracle.saveSettings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints,
                _oracle.saveSettings.simulationStatistics
                    .lifetime.breakInfinityCount,
                NumericSafety.IsFinite(
                    _oracle.saveSettings.dysonVerseSaveData
                        .dysonVerseInfinityData.bots));
        }

        private OfflineProgressContext CreateContext()
        {
            MethodInfo method = typeof(GameManager).GetMethod(
                "CreateOfflineProgressContext",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.NotNull(method);
            return (OfflineProgressContext)method.Invoke(
                _gameManager,
                null);
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
                UnityEngine.Object
                    .FindFirstObjectByType<GameData.GameDataRegistry>(
                        FindObjectsInactive.Include);
            InvokePrivate(registry, "Awake");
            ServiceProvider provider =
                UnityEngine.Object.FindFirstObjectByType<ServiceProvider>(
                    FindObjectsInactive.Include);
            InvokePrivate(provider, "RegisterServices");
            foreach (FacilityBuildingPresenter presenter in
                     UnityEngine.Object
                         .FindObjectsByType<FacilityBuildingPresenter>(
                             FindObjectsInactive.Include,
                             FindObjectsSortMode.None))
            {
                InvokePrivate(presenter, "Awake");
            }
            foreach (MegaStructurePresenter presenter in
                     UnityEngine.Object
                         .FindObjectsByType<MegaStructurePresenter>(
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

        private static void InvokePrivate(
            object target,
            string methodName)
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

        private static double SymmetricDifference(long left, long right)
        {
            return Math.Abs((double)left - right) /
                   Math.Max(
                       1d,
                       Math.Max(
                           Math.Abs((double)left),
                           Math.Abs((double)right)));
        }

        private static Oracle.SaveDataSettings CreateBreakFixture()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.dysonVerseSaveData.dysonVerseInfinityData
                .skillOwnedBits =
                SkillBitsetUtility.CreateEmptyBitset();
            settings.prestigePlus.botMultitasking = true;
            settings.prestigePlus.doubleIP = true;
            settings.prestigePlus.breakTheLoop = true;
            settings.prestigePlus.quantumEntanglement = true;
            settings.prestigePlus.automation = true;
            settings.prestigePlus.divisionsPurchased = 19L;
            settings.prestigePlus.secrets = 27L;
            settings.prestigePlus.avocatoPurchased = true;
            settings.prestigePlus.fragments = true;
            settings.prestigePlus.purity = true;
            settings.prestigePlus.terra = true;
            settings.prestigePlus.power = true;
            settings.prestigePlus.paragade = true;
            settings.prestigePlus.stellar = true;
            settings.avocadoData.unlocked = true;
            settings.infinityPointsToBreakFor = 100;

            Oracle.DysonVersePrestigeData prestige =
                settings.dysonVerseSaveData.dysonVersePrestigeData;
            prestige.infinityPoints = 1_000_000L;
            prestige.secretsOfTheUniverse = 27L;
            prestige.infinityAssemblyLines = true;
            prestige.infinityAutoBots = true;
            prestige.infinityAutoResearch = true;
            prestige.unlockedMatrioshkaBrains = true;
            prestige.unlockedBirchPlanets = true;
            prestige.unlockedGalacticBrains = true;

            Oracle.DysonVerseInfinityData data =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            data.bots = 10d;
            data.assemblyLines[1] = 10d;

            settings.sdSimulation = new Oracle.SaveDataDream1();
            settings.sdPrestige.disasterStage = 42L;
            settings.sdPrestige.doubleTimeOwned = false;
            settings.sdPrestige.doubleTime = 0d;
            settings.sdPrestige.doDoubleTime = false;
            return settings;
        }

        private readonly struct ProjectionOutcome
        {
            public ProjectionOutcome(
                long infinityPoints,
                long cycles,
                bool botsAreFinite)
            {
                InfinityPoints = infinityPoints;
                Cycles = cycles;
                BotsAreFinite = botsAreFinite;
            }

            public long InfinityPoints { get; }
            public long Cycles { get; }
            public bool BotsAreFinite { get; }
        }
    }
}
