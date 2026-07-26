using Expansion;
using NUnit.Framework;
using Systems;
using Systems.Numeric;

/*
 * OfflineProgressSystemTests
 * Purpose (editor tests): Validates offline-time grant behavior in OfflineProgressSystem.ApplyReturnValues.
 * Runs: Unity EditMode test runner (headless-friendly).
 * Primary entry points: NUnit [Test] cases in this file.
 * Owns vs delegates:
 * - Owns assertions around cap handling, cheater path, and additive behavior across reopen grants.
 * - Delegates production logic to Systems.OfflineProgressSystem with lightweight context doubles.
 *
 * Interacts with:
 * - Systems.OfflineProgressSystem
 * - Systems.OfflineProgressContext
 * - Expansion.Oracle save data types
 *
 * Change notes:
 * - If ApplyReturnValues semantics/caps change, update expected assertions and related regression docs together.
 */
namespace Tests.Systems
{
    [TestFixture]
    public sealed class OfflineProgressSystemTests
    {
        [Test]
        public void ApplyReturnValues_PositiveAwayTime_AddsToOfflinePool()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 30, maxOfflineTime: 600);

            OfflineProgressSystem.ApplyReturnValues(awayTime: 120, context, ui: null);

            Assert.AreEqual(150, context.saveSettings.offlineTime, 0.001);
            Assert.IsFalse(context.saveSettings.cheater);
        }

        [Test]
        public void ApplyReturnValues_ZeroAwayTime_DoesNotChangeOfflinePool()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 45, maxOfflineTime: 600);

            OfflineProgressSystem.ApplyReturnValues(awayTime: 0, context, ui: null);

            Assert.AreEqual(45, context.saveSettings.offlineTime, 0.001);
        }

        [Test]
        public void ApplyReturnValues_AwayTimeOverCap_ClampsToMaxOfflineTime()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 500, maxOfflineTime: 600);

            OfflineProgressSystem.ApplyReturnValues(awayTime: 300, context, ui: null);

            Assert.AreEqual(600, context.saveSettings.offlineTime, 0.001);
        }

        [Test]
        public void ApplyReturnValues_NegativeAwayTime_MarksCheaterWithoutDestroyingStoredTime()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 200, maxOfflineTime: 600);

            OfflineProgressSystem.ApplyReturnValues(awayTime: -5, context, ui: null);

            Assert.IsTrue(context.saveSettings.cheater);
            Assert.AreEqual(200, context.saveSettings.offlineTime, 0.001);
            Assert.AreEqual(600, context.saveSettings.maxOfflineTime, 0.001);
        }

        [Test]
        public void ApplyReturnValues_TwoValidReopens_AccumulatesAcrossRuns()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 0, maxOfflineTime: 1000);

            OfflineProgressSystem.ApplyReturnValues(awayTime: 120, context, ui: null);
            OfflineProgressSystem.ApplyReturnValues(awayTime: 300, context, ui: null);

            Assert.AreEqual(420, context.saveSettings.offlineTime, 0.001);
        }

        [TestCase(double.NaN)]
        [TestCase(double.PositiveInfinity)]
        [TestCase(double.NegativeInfinity)]
        public void ApplyReturnValues_NonFiniteDurationGrantsNothingAndPreservesValidBank(double awayTime)
        {
            OfflineProgressContext context = CreateContext(offlineTime: 200d, maxOfflineTime: 600d);

            OfflineProgressSystem.ApplyReturnValues(awayTime, context, ui: null);

            Assert.AreEqual(200d, context.saveSettings.offlineTime, 0d);
            Assert.IsFalse(context.saveSettings.cheater);
        }

        [Test]
        public void ApplyReturnValues_InvalidStoredBankRepairsBeforeGrant()
        {
            OfflineProgressContext context = CreateContext(
                offlineTime: double.NaN,
                maxOfflineTime: 600d);

            OfflineProgressSystem.ApplyReturnValues(120d, context, ui: null);

            Assert.AreEqual(120d, context.saveSettings.offlineTime, 0d);
        }

        [Test]
        public void ApplyReturnValues_InvalidCapacityRepairsToAuthoredDefault()
        {
            OfflineProgressContext context = CreateContext(
                offlineTime: 200d,
                maxOfflineTime: double.PositiveInfinity);

            OfflineProgressSystem.ApplyReturnValues(120d, context, ui: null);

            Assert.AreEqual(86400d, context.saveSettings.maxOfflineTime, 0d);
            Assert.AreEqual(320d, context.saveSettings.offlineTime, 0d);
        }

        [Test]
        public void ApplyReturnValues_PositiveInfiniteStoredBankClampsAndMarksCheater()
        {
            OfflineProgressContext context = CreateContext(
                offlineTime: double.PositiveInfinity,
                maxOfflineTime: NumericSafety.StoredTimeMaximumSeconds);

            OfflineProgressSystem.ApplyReturnValues(0d, context, ui: null);

            Assert.AreEqual(
                NumericSafety.StoredTimeMaximumSeconds,
                context.saveSettings.offlineTime,
                0d);
            Assert.IsTrue(context.saveSettings.cheater);
        }

        [Test]
        public void OfflineProduction_PassiveInfinityGainSaturatesInsteadOfWrapping()
        {
            OfflineProgressContext context = CreateProductionContext();
            context.saveSettings.lastInfinityPointsGained = int.MaxValue;
            context.saveSettings.timeLastInfinity = double.Epsilon;

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.1d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(long.MaxValue, context.prestigeData.infinityPoints);
        }

        [Test]
        public void OfflineProduction_OneSecondMatchesTenCanonicalOnlineTicks()
        {
            OfflineProgressContext offline = CreateProductionContext();
            OfflineProgressContext online = CreateProductionContext();

            ProductionSystem.CalculateProduction(
                offline.infinityData,
                offline.skillTreeData,
                offline.prestigeData,
                offline.prestigePlus,
                0d);
            ProductionSystem.CalculateProduction(
                online.infinityData,
                online.skillTreeData,
                online.prestigeData,
                online.prestigePlus,
                0d);

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(1d, offline, ui: null);
            while (replay.MoveNext())
            {
            }

            for (int i = 0; i < 10; i++)
            {
                ProductionSystem.CalculateProduction(
                    online.infinityData,
                    online.skillTreeData,
                    online.prestigeData,
                    online.prestigePlus,
                    0.1d);
            }

            Assert.AreEqual(online.infinityData.money, offline.infinityData.money, 1e-9d);
            Assert.AreEqual(online.infinityData.science, offline.infinityData.science, 1e-9d);
            Assert.AreEqual(online.infinityData.bots, offline.infinityData.bots, 1e-9d);
            Assert.AreEqual(
                online.infinityData.assemblyLines[0],
                offline.infinityData.assemblyLines[0],
                1e-9d);
            Assert.AreEqual(
                online.infinityData.managers[0],
                offline.infinityData.managers[0],
                1e-9d);
            Assert.AreEqual(
                online.infinityData.servers[0],
                offline.infinityData.servers[0],
                1e-9d);
            Assert.AreEqual(
                online.infinityData.dataCenters[0],
                offline.infinityData.dataCenters[0],
                1e-9d);
            Assert.AreEqual(
                online.infinityData.planets[0],
                offline.infinityData.planets[0],
                1e-9d);
        }

        [Test]
        public void OfflineProduction_OneSecondRunsOneAutomationPhasePerCanonicalTick()
        {
            OfflineProgressContext context = CreateProductionContext();
            int automationTicks = 0;
            context.RunAutomationTick = () => automationTicks++;

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(1d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(10, automationTicks);
        }

        [Test]
        public void OfflineProduction_FractionalRemainderDoesNotCreateExtraAutomationPhase()
        {
            OfflineProgressContext context = CreateProductionContext();
            int automationTicks = 0;
            context.RunAutomationTick = () => automationTicks++;

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.15d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(1, automationTicks);
        }

        [Test]
        public void OfflineProduction_AppliesProductionBeforeAutomation()
        {
            OfflineProgressContext context = CreateContext(0d, 600d);
            context.prestigePlus = context.saveSettings.prestigePlus;
            context.infinityData.bots = 100d;
            context.infinityData.botProduction = 10d;

            double botsObservedByAutomation = 0d;
            context.RunAutomationTick = () =>
            {
                botsObservedByAutomation = context.infinityData.bots;
                context.infinityData.assemblyLines[0] += 1d;
            };

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.1d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(101d, botsObservedByAutomation, 1e-12d);
            Assert.AreEqual(1d, context.infinityData.assemblyLines[0], 1e-12d);
        }

        [TestCase(double.NaN)]
        [TestCase(double.PositiveInfinity)]
        [TestCase(double.NegativeInfinity)]
        [TestCase(-1d)]
        [TestCase(0d)]
        public void OfflineProduction_InvalidOrNonPositiveDurationDoesNotMutateState(double awayTime)
        {
            OfflineProgressContext context = CreateProductionContext();
            double money = context.infinityData.money;
            double science = context.infinityData.science;
            double bots = context.infinityData.bots;
            long infinityPoints = context.prestigeData.infinityPoints;
            int automationTicks = 0;
            context.RunAutomationTick = () => automationTicks++;

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(awayTime, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(money, context.infinityData.money);
            Assert.AreEqual(science, context.infinityData.science);
            Assert.AreEqual(bots, context.infinityData.bots);
            Assert.AreEqual(infinityPoints, context.prestigeData.infinityPoints);
            Assert.AreEqual(0, automationTicks);
        }

        private static OfflineProgressContext CreateProductionContext()
        {
            OfflineProgressContext context = CreateContext(0d, 600d);
            context.prestigePlus = context.saveSettings.prestigePlus;
            context.infinityData.bots = 100d;
            context.infinityData.assemblyLines[0] = 10d;
            context.infinityData.managers[0] = 5d;
            context.infinityData.servers[0] = 3d;
            context.infinityData.dataCenters[0] = 2d;
            context.infinityData.planets[0] = 1d;
            return context;
        }

        private static OfflineProgressContext CreateContext(double offlineTime, double maxOfflineTime)
        {
            var settings = new Oracle.SaveDataSettings
            {
                offlineTime = offlineTime,
                maxOfflineTime = maxOfflineTime
            };

            return new OfflineProgressContext
            {
                infinityData = new Oracle.DysonVerseInfinityData(),
                prestigeData = new Oracle.DysonVersePrestigeData(),
                skillTreeData = new Oracle.DysonVerseSkillTreeData(),
                saveSettings = settings,
                SetBotDistribution = () => { },
                CalculateShouldersSkills = _ => { },
                CalculateProduction = () => { },
                MoneyToAdd = () => 0,
                ScienceToAdd = () => 0
            };
        }
    }
}
