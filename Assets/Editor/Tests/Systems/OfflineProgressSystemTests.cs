using System;
using Expansion;
using NUnit.Framework;
using Systems;
using Systems.Numeric;
using Systems.Simulation;

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

        [Test]
        public void ApplyReturnValues_AccumulatesDreamDoubleTimeBeforeUnlock()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 0d, maxOfflineTime: 1000d);
            context.saveSettings.sdPrestige.doubleTimeOwned = false;
            context.saveSettings.sdPrestige.doubleTime = 40d;

            OfflineProgressSystem.ApplyReturnValues(120d, context, ui: null);

            Assert.AreEqual(160d, context.saveSettings.sdPrestige.doubleTime, 0d);
            Assert.IsFalse(context.saveSettings.sdPrestige.doubleTimeOwned);
        }

        [Test]
        public void ApplyReturnValues_DreamDoubleTimeSaturatesAtGlobalStoredTimeCap()
        {
            OfflineProgressContext context = CreateContext(
                offlineTime: 0d,
                maxOfflineTime: NumericSafety.StoredTimeMaximumSeconds);
            context.saveSettings.sdPrestige.doubleTime =
                NumericSafety.StoredTimeMaximumSeconds - 1d;

            OfflineProgressSystem.ApplyReturnValues(120d, context, ui: null);

            Assert.AreEqual(
                NumericSafety.StoredTimeMaximumSeconds,
                context.saveSettings.sdPrestige.doubleTime,
                0d);
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
            int remainderSteps = 0;
            double remainderSeconds = 0d;
            context.RunAutomationTick = () => automationTicks++;
            context.RunCanonicalWholeGameRemainder = seconds =>
            {
                remainderSteps++;
                remainderSeconds += seconds;
            };

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.15d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(1, automationTicks);
            Assert.AreEqual(1, remainderSteps);
            Assert.AreEqual(0.05d, remainderSeconds, 1e-12d);
        }

        [Test]
        public void OfflineProduction_LessThanOneTickAdvancesWholeGameRemainderOnly()
        {
            OfflineProgressContext context = CreateProductionContext();
            int automationTicks = 0;
            int fullTicks = 0;
            double dreamResearchProgress = 0d;
            double dreamBoostRemaining = 0.1d;
            double dreamDoubleTimeBank = 1d;
            context.RunAutomationTick = () => automationTicks++;
            context.RunCanonicalWholeGameTick = () => fullTicks++;
            context.RunCanonicalWholeGameRemainder = seconds =>
            {
                dreamResearchProgress += seconds;
                dreamBoostRemaining = Math.Max(
                    0d,
                    dreamBoostRemaining - seconds);
                dreamDoubleTimeBank -= seconds;
            };

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.05d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(0, automationTicks);
            Assert.AreEqual(0, fullTicks);
            Assert.AreEqual(0.05d, dreamResearchProgress, 1e-12d);
            Assert.AreEqual(0.05d, dreamBoostRemaining, 1e-12d);
            Assert.AreEqual(0.95d, dreamDoubleTimeBank, 1e-12d);
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

        [Test]
        public void OfflineProduction_UsesAnalyticalBatchBeforeCanonicalFallback()
        {
            OfflineProgressContext context = CreateProductionContext();
            int analyticalCalls = 0;
            int canonicalCalls = 0;
            context.RunAnalyticalTicks = ticks =>
            {
                analyticalCalls++;
                context.infinityData.money += ticks;
                return ticks;
            };
            context.RunCanonicalWholeGameTick = () => canonicalCalls++;

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(100d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(1, analyticalCalls);
            Assert.AreEqual(0, canonicalCalls);
            Assert.AreEqual(1000d, context.infinityData.money, 0d);
        }

        [Test]
        public void OfflineProduction_CanonicalFallbackAdvancesWholeGameOncePerFullTick()
        {
            OfflineProgressContext context = CreateProductionContext();
            int wholeGameTicks = 0;
            context.RunAnalyticalTicks = _ => 0L;
            context.RunCanonicalWholeGameTick = () => wholeGameTicks++;

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.25d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(2, wholeGameTicks);
        }

        [Test]
        public void OfflineProduction_CanonicalFallbackContinuesAfterSynchronousReset()
        {
            OfflineProgressContext context = CreateProductionContext();
            int wholeGameTicks = 0;
            int resets = 0;
            context.RunAnalyticalTicks = _ => 0L;
            context.RunCanonicalWholeGameTick = () =>
            {
                wholeGameTicks++;
                if (wholeGameTicks == 2)
                {
                    resets++;
                    context.infinityData.bots = 0d;
                }
            };

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.5d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(5, wholeGameTicks);
            Assert.AreEqual(1, resets);
        }

        [Test]
        public void OfflineProduction_AnalyticalBatchesContinueAcrossRepeatedResetTicks()
        {
            OfflineProgressContext context = CreateProductionContext();
            int canonicalTicks = 0;
            int resets = 0;
            bool eventDue = false;
            context.RunAnalyticalTicks = ticks =>
            {
                if (eventDue || ticks < 2L) return 0L;
                eventDue = true;
                context.infinityData.money += 2d;
                return 2L;
            };
            context.RunCanonicalWholeGameTick = () =>
            {
                canonicalTicks++;
                if (!eventDue) return;
                eventDue = false;
                resets++;
                context.infinityData.bots = 0d;
            };

            System.Collections.IEnumerator replay =
                OfflineProgressSystem.CalculateAwayValues(0.9d, context, ui: null);
            while (replay.MoveNext())
            {
            }

            Assert.AreEqual(3, canonicalTicks);
            Assert.AreEqual(3, resets);
            Assert.AreEqual(6d, context.infinityData.money, 0d);
        }

        [TestCase(0L)]
        [TestCase(1L)]
        [TestCase(2L)]
        [TestCase(10L)]
        [TestCase(1000000L)]
        public void AnalyticalAffinePower_MatchesStartOfTickTriangularChain(long ticks)
        {
            // x is a constant producer, y receives x, and z receives the y
            // captured at tick start.
            double[,] transition =
            {
                { 1d, 0d, 0d, 0d },
                { 1d, 1d, 0d, 0d },
                { 0d, 1d, 1d, 0d },
                { 0d, 0d, 0d, 1d }
            };

            double[] result = AnalyticalOfflineSimulation.ApplyAffinePowerForTests(
                transition,
                new[] { 1d, 0d, 0d },
                ticks);

            Assert.AreEqual(1d, result[0], 0d);
            Assert.AreEqual((double)ticks, result[1], Math.Max(1d, ticks) * 1e-12d);
            double expectedDownstream = ticks * (ticks - 1d) / 2d;
            Assert.AreEqual(
                expectedDownstream,
                result[2],
                Math.Max(1d, expectedDownstream) * 1e-12d);
        }

        [Test]
        public void AnalyticalAffinePower_SaturatesAtFiniteDoubleMaximum()
        {
            double[,] transition =
            {
                { 2d, 0d },
                { 0d, 1d }
            };

            double[] result = AnalyticalOfflineSimulation.ApplyAffinePowerForTests(
                transition,
                new[] { double.MaxValue / 2d },
                10L);

            Assert.AreEqual(double.MaxValue, result[0], 0d);
            Assert.IsTrue(NumericSafety.IsFinite(result[0]));
        }

        [Test]
        public void AnalyticalEventHorizon_StopsBeforeFirstAffordableAutomationTick()
        {
            double[,] transition =
            {
                { 1d, 1d },
                { 0d, 1d }
            };

            long safeTicks =
                AnalyticalOfflineSimulation.TicksBeforeMaterialEventForTests(
                    transition,
                    new[] { 0d },
                    100L,
                    state => state[0] >= 5d);

            Assert.AreEqual(4L, safeTicks);
            Assert.AreEqual(
                4d,
                AnalyticalOfflineSimulation.ApplyAffinePowerForTests(
                    transition,
                    new[] { 0d },
                    safeTicks)[0],
                0d);
        }

        [Test]
        public void AnalyticalEventHorizon_NoAffordableEventConsumesRequestedTicks()
        {
            double[,] transition =
            {
                { 1d, 1d },
                { 0d, 1d }
            };

            long safeTicks =
                AnalyticalOfflineSimulation.TicksBeforeMaterialEventForTests(
                    transition,
                    new[] { 0d },
                    100L,
                    state => state[0] >= 1000d);

            Assert.AreEqual(100L, safeTicks);
        }

        [Test]
        public void AnalyticalDyson_IdleStateConsumesFullStoredTimeCapInOneBatch()
        {
            var data = new Oracle.DysonVerseInfinityData();
            var skills = new Oracle.DysonVerseSkillTreeData();
            var prestige = new Oracle.DysonVersePrestigeData();
            var prestigePlus = new Oracle.PrestigePlus();
            const long ticksAtStoredTimeCap = 420000000L;

            long processed = AnalyticalOfflineSimulation.TryAdvanceDyson(
                data,
                skills,
                prestige,
                prestigePlus,
                ticksAtStoredTimeCap,
                double.MaxValue);

            Assert.AreEqual(ticksAtStoredTimeCap, processed);
            Assert.AreEqual(0d, data.bots, 0d);
            Assert.AreEqual(0d, data.money, 0d);
            Assert.AreEqual(0d, data.science, 0d);
        }

        [Test]
        public void AnalyticalDyson_ConstantProductionConsumesStoredTimeCapQuickly()
        {
            Oracle.DysonVerseInfinityData data = CreateAnalyticalDysonFixture();
            data.assemblyLines[0] = 0d;
            data.managers[0] = 0d;
            data.servers[0] = 0d;
            data.dataCenters[0] = 0d;
            var skills = new Oracle.DysonVerseSkillTreeData();
            var prestige = new Oracle.DysonVersePrestigeData();
            var prestigePlus = new Oracle.PrestigePlus { botMultitasking = true };
            const long ticksAtStoredTimeCap = 420000000L;
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            long processed = AnalyticalOfflineSimulation.TryAdvanceDyson(
                data,
                skills,
                prestige,
                prestigePlus,
                ticksAtStoredTimeCap,
                double.MaxValue);

            stopwatch.Stop();
            Assert.AreEqual(ticksAtStoredTimeCap, processed);
            Assert.IsTrue(NumericSafety.IsFinite(data.money));
            Assert.IsTrue(NumericSafety.IsFinite(data.science));
            Assert.IsTrue(NumericSafety.IsFinite(data.totalPanelsDecayed));
            Assert.Less(stopwatch.Elapsed.TotalMilliseconds, 8d);
        }

        [Test]
        public void AnalyticalDyson_ResearchAccrualSkillUsesCanonicalFallback()
        {
            var skills = new Oracle.DysonVerseSkillTreeData
            {
                shouldersOfGiants = true,
                scientificPlanets = true
            };

            Assert.IsTrue(
                AnalyticalOfflineSimulation.HasPersistentSideEffects(skills));
            Assert.AreEqual(
                0L,
                AnalyticalOfflineSimulation.TryAdvanceDyson(
                    CreateAnalyticalDysonFixture(),
                    skills,
                    new Oracle.DysonVersePrestigeData(),
                    new Oracle.PrestigePlus { botMultitasking = true },
                    1000L,
                    double.MaxValue));
        }

        [TestCase(2L)]
        [TestCase(10L)]
        [TestCase(1000L)]
        public void AnalyticalDyson_MatchesSequentialCanonicalTicks(long ticks)
        {
            Oracle.DysonVerseInfinityData analytical = CreateAnalyticalDysonFixture();
            Oracle.DysonVerseInfinityData sequential = CreateAnalyticalDysonFixture();
            var skills = new Oracle.DysonVerseSkillTreeData();
            var prestige = new Oracle.DysonVersePrestigeData();
            var prestigePlus = new Oracle.PrestigePlus { botMultitasking = true };

            ProductionSystem.SetBotDistribution(
                analytical, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                analytical, skills, prestige, prestigePlus);
            ProductionSystem.SetBotDistribution(
                sequential, prestige, prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                sequential, skills, prestige, prestigePlus);

            long processed = AnalyticalOfflineSimulation.TryAdvanceDyson(
                analytical,
                skills,
                prestige,
                prestigePlus,
                ticks,
                double.MaxValue);
            for (long tick = 0L; tick < ticks; tick++)
            {
                ProductionSystem.SetBotDistribution(
                    sequential, prestige, prestigePlus);
                ProductionSystem.CalculateProduction(
                    sequential,
                    skills,
                    prestige,
                    prestigePlus,
                    0.1d,
                    recomputeDerivedState: false);
                ProductionSystem.RecalculateDerivedState(
                    sequential, skills, prestige, prestigePlus);
            }

            Assert.AreEqual(ticks, processed);
            AssertRelative(sequential.money, analytical.money);
            AssertRelative(sequential.science, analytical.science);
            AssertRelative(sequential.totalPanelsDecayed, analytical.totalPanelsDecayed);
            AssertRelative(sequential.bots, analytical.bots);
            AssertRelative(sequential.assemblyLines[0], analytical.assemblyLines[0]);
            AssertRelative(sequential.managers[0], analytical.managers[0]);
            AssertRelative(sequential.servers[0], analytical.servers[0]);
            AssertRelative(sequential.dataCenters[0], analytical.dataCenters[0]);
            AssertRelative(sequential.planets[0], analytical.planets[0]);
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

        private static Oracle.DysonVerseInfinityData CreateAnalyticalDysonFixture()
        {
            return new Oracle.DysonVerseInfinityData
            {
                money = 17d,
                science = 23d,
                bots = 100d,
                assemblyLines = new[] { 10d, 0d },
                managers = new[] { 3d, 0d },
                servers = new[] { 2d, 0d },
                dataCenters = new[] { 1d, 0d },
                planets = new[] { 0d, 0d },
                matrioshkaBrains = new[] { 0d, 0d },
                birchPlanets = new[] { 0d, 0d },
                galacticBrains = new[] { 0d, 0d },
                panelLifetime = 10d,
                panelsPerSecMulti = 1d,
                moneyMulti = 1d,
                scienceMulti = 1d,
                assemblyLineModifier = 1d,
                managerModifier = 1d,
                serverModifier = 1d,
                dataCenterModifier = 1d,
                planetModifier = 1d
            };
        }

        private static void AssertRelative(double expected, double actual)
        {
            double tolerance =
                Math.Max(1e-9d, Math.Max(Math.Abs(expected), Math.Abs(actual)) * 1e-9d);
            Assert.AreEqual(expected, actual, tolerance);
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
