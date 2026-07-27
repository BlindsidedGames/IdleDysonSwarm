using System;
using System.Collections;
using System.Text.RegularExpressions;
using Buildings;
using NUnit.Framework;
using Blindsided.Utilities;
using Expansion;
using GameData;
using IdleDysonSwarm.Services;
using IdleDysonSwarm.Systems.Dream1;
using Research;
using Systems;
using Systems.Debugging;
using Systems.Numeric;
using Systems.Save;
using Systems.Simulation;
using UnityEngine;
using UnityEngine.TestTools;

namespace Tests.Systems
{
    public sealed class NumericSafetyTests
    {
        [Test]
        public void NumericDiagnostics_EditModeReport_UsesStableSanitizedPayload()
        {
            LogAssert.Expect(
                LogType.Log,
                "[NumericSafety:NS-DIAGNOSTIC-TEST] source=fixture no-player-data");

            NumericDiagnostics.Report(
                "NS-DIAGNOSTIC-TEST",
                "source=fixture\nno-player-data");
        }

        [Test]
        public void NumericDiagnostics_RateLimitsRepeatedFaultCode()
        {
            const string expected = "[NumericSafety:NS-DIAGNOSTIC-RATE] source=fixture";
            for (int index = 0; index < 5; index++)
                LogAssert.Expect(LogType.Log, expected);

            for (int index = 0; index < 6; index++)
                NumericDiagnostics.Report("NS-DIAGNOSTIC-RATE", "source=fixture");
        }

        [UnityTest]
        public IEnumerator NumericDiagnostics_PlayModeReportUsesHandledException()
        {
            yield return new EnterPlayMode();
            LogAssert.Expect(
                LogType.Exception,
                new Regex(
                    @"NumericSafetyFaultException: " +
                    @"\[NumericSafety:NS-DIAGNOSTIC-PLAYMODE\] " +
                    @"source=fixture"));

            NumericDiagnostics.Report(
                "NS-DIAGNOSTIC-PLAYMODE",
                "source=fixture");

            yield return null;
            yield return new ExitPlayMode();
        }

        [Test]
        public void AddDouble_Overflow_Saturates()
        {
            NumericResult<double> result = NumericSafety.Add(double.MaxValue, double.MaxValue);

            Assert.AreEqual(NumericStatus.Saturated, result.Status);
            Assert.AreEqual(double.MaxValue, result.Value);
        }

        [Test]
        public void AddUnit_AboveExactIntegerRangeAdvancesRepresentableValue()
        {
            const double value = 9007199254740992d;

            NumericResult<double> result =
                NumericSafety.AddUnit(value);

            Assert.AreEqual(NumericStatus.Saturated, result.Status);
            Assert.AreEqual(
                NumericSafety.BitIncrement(value),
                result.Value);
            Assert.Greater(result.Value, value);
        }

        [Test]
        public void AddUnit_AtContinuousMaximumRemainsSafelySaturated()
        {
            NumericResult<double> result =
                NumericSafety.AddUnit(double.MaxValue);

            Assert.AreEqual(NumericStatus.Saturated, result.Status);
            Assert.AreEqual(double.MaxValue, result.Value);
        }

        [Test]
        public void AddLong_Overflow_Saturates()
        {
            NumericResult<long> result = NumericSafety.Add(long.MaxValue, 1);

            Assert.AreEqual(NumericStatus.Saturated, result.Status);
            Assert.AreEqual(long.MaxValue, result.Value);
        }

        [Test]
        public void SubtractBelowZero_SaturatesAtZero()
        {
            Assert.AreEqual(NumericStatus.Saturated, NumericSafety.Subtract(1d, 2d).Status);
            Assert.AreEqual(0d, NumericSafety.Subtract(1d, 2d).Value);
            Assert.AreEqual(NumericStatus.Saturated, NumericSafety.Subtract(1L, 2L).Status);
            Assert.AreEqual(0L, NumericSafety.Subtract(1L, 2L).Value);
        }

        [Test]
        public void UnsignedDoubleHelpers_RejectNegativeOperandsConsistently()
        {
            Assert.AreEqual(
                NumericStatus.InvalidInput,
                NumericSafety.Add(2d, -1d).Status);
            Assert.AreEqual(
                NumericStatus.InvalidInput,
                NumericSafety.Subtract(2d, -1d).Status);
            Assert.AreEqual(
                NumericStatus.InvalidInput,
                NumericSafety.Multiply(2d, -1d).Status);
            Assert.AreEqual(
                NumericStatus.InvalidInput,
                NumericSafety.Divide(2d, -1d).Status);
            Assert.AreEqual(
                NumericStatus.Success,
                NumericSafety.Add(2d, -1d, allowNegative: true).Status);
        }

        [Test]
        public void MultiplyLong_Overflow_Saturates()
        {
            NumericResult<long> result = NumericSafety.Multiply(long.MaxValue, 2L);

            Assert.AreEqual(NumericStatus.Saturated, result.Status);
            Assert.AreEqual(long.MaxValue, result.Value);
        }

        [TestCase(double.NaN)]
        [TestCase(double.PositiveInfinity)]
        [TestCase(double.NegativeInfinity)]
        [TestCase(-1d)]
        public void ToLongFloor_InvalidProgress_IsRejected(double value)
        {
            Assert.AreEqual(NumericStatus.InvalidInput, NumericSafety.ToLongFloor(value).Status);
        }

        [Test]
        public void ToLongFloor_FractionalLegacyValue_Floors()
        {
            NumericResult<long> result = NumericSafety.ToLongFloor(42.9d);

            Assert.AreEqual(NumericStatus.Success, result.Status);
            Assert.AreEqual(42L, result.Value);
        }

        [TestCase(9007199254740991d, 9007199254740991L)]
        [TestCase(9007199254740992d, 9007199254740992L)]
        public void ToLong_RepresentableIntegerBoundary_IsExact(double value, long expected)
        {
            NumericResult<long> result = NumericSafety.ToLong(value);

            Assert.AreEqual(NumericStatus.Success, result.Status);
            Assert.AreEqual(expected, result.Value);
        }

        [Test]
        public void ToLong_FractionalValue_IsUnrepresentable()
        {
            Assert.AreEqual(NumericStatus.Unrepresentable, NumericSafety.ToLong(42.5d).Status);
        }

        [Test]
        public void ToLong_RoundedLongMaximum_IsUnrepresentable()
        {
            double roundedPastMaximum = (double)long.MaxValue;

            Assert.AreEqual(
                NumericStatus.Unrepresentable,
                NumericSafety.ToLong(roundedPastMaximum).Status);
        }

        [Test]
        public void ToLong_LargestRepresentableDoubleBelowLimit_IsExact()
        {
            double representable = NumericSafety.BitDecrement((double)long.MaxValue);
            NumericResult<long> result = NumericSafety.ToLong(representable);

            Assert.AreEqual(NumericStatus.Success, result.Status);
            Assert.AreEqual((long)representable, result.Value);
        }

        [Test]
        public void HighScaleGeneratedResearchLevel_RemainsDoubleBacked()
        {
            var data = new Oracle.DysonVerseInfinityData();
            double aboveLongRange = 1e30;

            Assert.IsTrue(ResearchIdMap.TrySetLegacyLevel(
                data,
                ResearchIdMap.ScienceBoost,
                aboveLongRange));
            Assert.AreEqual(aboveLongRange, data.scienceBoostOwned);
        }

        [Test]
        public void LongBackedResearchMirror_SaturatesUnrepresentableLevel()
        {
            var data = new Oracle.DysonVerseInfinityData
            {
                assemblyLineUpgradeOwned = 42L
            };

            Assert.IsTrue(ResearchIdMap.TrySetLegacyLevel(
                data,
                ResearchIdMap.AssemblyLineUpgrade,
                1e30));
            Assert.AreEqual(long.MaxValue, data.assemblyLineUpgradeOwned);
        }

        [Test]
        public void ToFloat_LargeFiniteAdapterValue_Saturates()
        {
            NumericResult<float> result = NumericSafety.ToFloat(double.MaxValue);

            Assert.AreEqual(NumericStatus.Saturated, result.Status);
            Assert.AreEqual(float.MaxValue, result.Value);
        }

        [TestCase(double.NaN)]
        [TestCase(double.PositiveInfinity)]
        [TestCase(double.NegativeInfinity)]
        public void UiUnitAdapter_NonFiniteValue_IsSafeZero(double value)
        {
            Assert.AreEqual(0f, NumericUiAdapter.ToUnitInterval(value, "test"));
        }

        [TestCase(-1d, 0f)]
        [TestCase(0d, 0f)]
        [TestCase(0.5d, 0.5f)]
        [TestCase(1d, 1f)]
        [TestCase(2d, 1f)]
        public void UiUnitAdapter_ClampsToUnityRange(double value, float expected)
        {
            Assert.AreEqual(expected, NumericUiAdapter.ToUnitInterval(value, "test"));
        }

        [Test]
        public void TimerUiAdapters_RejectInvalidDivisorsAndClampFill()
        {
            Assert.AreEqual(0d, StaticMethods.FillBar(1d, 1d, 0d, 1d));
            Assert.AreEqual("ERR", StaticMethods.TimerText(1d, 1d, 0d, 1d));
            Assert.AreEqual(1d, StaticMethods.FillBar(1d, 1d, 1d, 2d));
        }

        [Test]
        public void TimerUiAdapters_ZeroBuildingsAndMultiplierIsAnIdleState()
        {
            Assert.AreEqual(0d, StaticMethods.FillBar(0d, 3d, 0d, 0d));
            Assert.AreEqual("", StaticMethods.TimerText(0d, 3d, 0d, 0d));
        }

        [Test]
        public void Divide_ZeroDenominator_IsExplicit()
        {
            Assert.AreEqual(NumericStatus.DivisionByZero, NumericSafety.Divide(1d, 0d).Status);
        }

        [Test]
        public void Power_PositiveOverflow_Saturates()
        {
            NumericResult<double> result = NumericSafety.Power(double.MaxValue, 2d);

            Assert.AreEqual(NumericStatus.Saturated, result.Status);
            Assert.AreEqual(double.MaxValue, result.Value);
        }

        [Test]
        public void Debit_SubUlpCost_ChargesOneRepresentableStep()
        {
            double balance = double.MaxValue;
            DebitResult result = EconomyTransaction.TryDebit(balance, 1d);

            Assert.IsTrue(result.Succeeded);
            Assert.Less(result.Balance, balance);
            Assert.AreEqual(NumericSafety.BitDecrement(balance), result.Balance);
            Assert.Greater(result.Charged, 0d);
        }

        [Test]
        public void Debit_ZeroCost_RequiresAuthoredFreeFlag()
        {
            Assert.AreEqual(
                TransactionStatus.InvalidCost,
                EconomyTransaction.TryDebit(100d, 0d).Status);
            Assert.AreEqual(
                TransactionStatus.Success,
                EconomyTransaction.TryDebit(100d, 0d, authoredFree: true).Status);
        }

        [Test]
        public void Debit_DoesNotMutateOnInsufficientFunds()
        {
            DebitResult result = EconomyTransaction.TryDebit(9d, 10d);

            Assert.AreEqual(TransactionStatus.InsufficientFunds, result.Status);
            Assert.AreEqual(9d, result.Balance);
            Assert.AreEqual(0d, result.Charged);
        }

        [Test]
        public void Debit_SaturatedRepeatableCost_IsMaxedWithoutCharge()
        {
            DebitResult result = EconomyTransaction.TryDebit(double.MaxValue, double.MaxValue);

            Assert.AreEqual(TransactionStatus.Maxed, result.Status);
            Assert.AreEqual(double.MaxValue, result.Balance);
            Assert.AreEqual(0d, result.Charged);
        }

        [Test]
        public void DiscreteDebit_ExactBalance_Succeeds()
        {
            DiscreteDebitResult result = EconomyTransaction.TryDebit(10L, 10L);

            Assert.IsTrue(result.Succeeded);
            Assert.AreEqual(0L, result.Balance);
            Assert.AreEqual(10L, result.Charged);
        }

        [Test]
        public void DiscreteDebit_ZeroCost_RequiresAuthoredFreeFlag()
        {
            Assert.AreEqual(
                TransactionStatus.InvalidCost,
                EconomyTransaction.TryDebit(100L, 0L).Status);
            Assert.AreEqual(
                TransactionStatus.Success,
                EconomyTransaction.TryDebit(100L, 0L, authoredFree: true).Status);
        }

        [Test]
        public void AtomicDiscretePurchase_MaxedOutputDoesNotDebit()
        {
            long balance = 100L;
            long owned = long.MaxValue;

            TransactionStatus status = EconomyTransaction.TryPurchase(
                ref balance,
                10L,
                ref owned,
                1L);

            Assert.AreEqual(TransactionStatus.OutputMaxed, status);
            Assert.AreEqual(100L, balance);
            Assert.AreEqual(long.MaxValue, owned);
        }

        [Test]
        public void AtomicDiscretePurchase_SaturatingOutputDoesNotDebit()
        {
            long balance = 100L;
            long owned = long.MaxValue - 5L;

            TransactionStatus status = EconomyTransaction.TryPurchase(
                ref balance,
                10L,
                ref owned,
                10L);

            Assert.AreEqual(TransactionStatus.OutputMaxed, status);
            Assert.AreEqual(100L, balance);
            Assert.AreEqual(long.MaxValue - 5L, owned);
        }

        [Test]
        public void AtomicContinuousPurchase_MaxedOutputDoesNotDebit()
        {
            long balance = 100L;
            double owned = double.MaxValue;

            TransactionStatus status = EconomyTransaction.TryPurchase(
                ref balance,
                10L,
                ref owned,
                1d);

            Assert.AreEqual(TransactionStatus.OutputMaxed, status);
            Assert.AreEqual(100L, balance);
            Assert.AreEqual(double.MaxValue, owned);
        }

        [Test]
        public void AtomicDoublePurchase_MaxedOutputDoesNotDebit()
        {
            double balance = 100d;
            double owned = double.MaxValue;

            TransactionStatus status = EconomyTransaction.TryPurchase(
                ref balance,
                10d,
                ref owned,
                1d);

            Assert.AreEqual(TransactionStatus.OutputMaxed, status);
            Assert.AreEqual(100d, balance);
            Assert.AreEqual(double.MaxValue, owned);
        }

        [Test]
        public void AtomicDiscretePairDebit_SecondFailureDoesNotDebitFirst()
        {
            long shards = 100_000L;
            long strangeMatter = 499_999L;

            TransactionStatus status = EconomyTransaction.TryDebitPair(
                ref shards,
                100_000L,
                ref strangeMatter,
                500_000L);

            Assert.AreEqual(TransactionStatus.InsufficientFunds, status);
            Assert.AreEqual(100_000L, shards);
            Assert.AreEqual(499_999L, strangeMatter);
        }

        [Test]
        public void AtomicContinuousExchange_MaxedOutputDoesNotDebitEitherInput()
        {
            double rockets = 100d;
            double factories = 10d;
            double spaceFactories = double.MaxValue;

            TransactionStatus status = EconomyTransaction.TryExchange(
                ref rockets,
                10d,
                ref factories,
                1d,
                ref spaceFactories,
                1d);

            Assert.AreEqual(TransactionStatus.OutputMaxed, status);
            Assert.AreEqual(100d, rockets);
            Assert.AreEqual(10d, factories);
            Assert.AreEqual(double.MaxValue, spaceFactories);
        }

        [Test]
        public void AtomicContinuousExchange_SaturatingOutputDoesNotDebitEitherInput()
        {
            double rockets = 100d;
            double factories = 10d;
            double spaceFactories =
                NumericSafety.BitDecrement(double.MaxValue);

            TransactionStatus status = EconomyTransaction.TryExchange(
                ref rockets,
                10d,
                ref factories,
                1d,
                ref spaceFactories,
                double.MaxValue);

            Assert.AreEqual(TransactionStatus.OutputMaxed, status);
            Assert.AreEqual(100d, rockets);
            Assert.AreEqual(10d, factories);
            Assert.AreEqual(
                NumericSafety.BitDecrement(double.MaxValue),
                spaceFactories);
        }

        [Test]
        public void AtomicMixedExchange_MaxedOutputDoesNotDebitRailgunInputs()
        {
            double charge = 25d;
            long panels = 10L;
            long swarmPanels = long.MaxValue;

            TransactionStatus status = EconomyTransaction.TryExchange(
                ref charge,
                2.5d,
                ref panels,
                1L,
                ref swarmPanels,
                1L);

            Assert.AreEqual(TransactionStatus.OutputMaxed, status);
            Assert.AreEqual(25d, charge);
            Assert.AreEqual(10L, panels);
            Assert.AreEqual(long.MaxValue, swarmPanels);
        }

        [TestCase(false, false, BotCapTransitionAction.PersistPendingCheckpoint)]
        [TestCase(true, false, BotCapTransitionAction.GrantRewardsAndPersistCheckpoint)]
        [TestCase(false, true, BotCapTransitionAction.ResumeResetFromRewardCheckpoint)]
        [TestCase(true, true, BotCapTransitionAction.ResumeResetFromRewardCheckpoint)]
        public void BotCapTransition_CheckpointsAreResumableRegardlessOfStaleGuard(
            bool pending,
            bool rewardsGranted,
            BotCapTransitionAction expected)
        {
            Assert.AreEqual(
                expected,
                BotCapTransitionContract.Classify(double.MaxValue, pending, rewardsGranted));
        }

        [Test]
        public void SaveRepair_NonFiniteBots_AreZeroedWithoutReward()
        {
            var settings = new Oracle.SaveDataSettings
            {
                infinityInProgress = true,
                hasPackedSettingsFlags = true,
                packedSettingsFlags = 1UL << 6
            };
            settings.dysonVerseSaveData.dysonVerseInfinityData.bots = double.PositiveInfinity;

            NumericSaveRepairResult result = NumericSaveRepair.Repair(settings);

            Assert.Greater(result.RepairCount, 0);
            Assert.AreEqual(0d, settings.dysonVerseSaveData.dysonVerseInfinityData.bots);
            Assert.IsFalse(settings.botCapTransitionPending);
            Assert.IsFalse(settings.botCapRewardsGranted);
            Assert.IsFalse(settings.infinityInProgress);
            Assert.AreEqual(0UL, settings.packedSettingsFlags & (1UL << 6));
        }

        [Test]
        public void SaveRepair_ExactFiniteBotCap_SetsDurableTransition()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.dysonVerseSaveData.dysonVerseInfinityData.bots = double.MaxValue;

            NumericSaveRepair.Repair(settings);

            Assert.IsTrue(settings.botCapTransitionPending);
            Assert.IsFalse(settings.botCapRewardsGranted);
        }

        [Test]
        public void SaveRepair_PendingBotCapCheckpointClearsStaleInProgressGuard()
        {
            var settings = new Oracle.SaveDataSettings
            {
                botCapTransitionPending = true,
                infinityInProgress = true,
                hasPackedSettingsFlags = true,
                packedSettingsFlags = 1UL << 6
            };
            settings.dysonVerseSaveData.dysonVerseInfinityData.bots = double.MaxValue;

            NumericSaveRepair.Repair(settings);

            Assert.IsTrue(settings.botCapTransitionPending);
            Assert.IsFalse(settings.botCapRewardsGranted);
            Assert.IsFalse(settings.infinityInProgress);
            Assert.AreEqual(0UL, settings.packedSettingsFlags & (1UL << 6));
        }

        [Test]
        public void SaveRepair_RewardCheckpointPreservesResumableResetState()
        {
            var settings = new Oracle.SaveDataSettings
            {
                botCapRewardsGranted = true,
                infinityInProgress = true,
                hasPackedSettingsFlags = true,
                packedSettingsFlags = 1UL << 6
            };
            settings.dysonVerseSaveData.dysonVerseInfinityData.bots = double.MaxValue;

            NumericSaveRepair.Repair(settings);

            Assert.IsFalse(settings.botCapTransitionPending);
            Assert.IsTrue(settings.botCapRewardsGranted);
            Assert.IsTrue(settings.infinityInProgress);
            Assert.AreNotEqual(0UL, settings.packedSettingsFlags & (1UL << 6));
        }

        [Test]
        public void SaveRepair_PositiveInfinityNonBot_Saturates()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = double.PositiveInfinity;

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(
                double.MaxValue,
                settings.dysonVerseSaveData.dysonVerseInfinityData.money);
        }

        [Test]
        public void SaveRepair_TimeBanksClampAndMarkComparisonFlag()
        {
            var settings = new Oracle.SaveDataSettings
            {
                offlineTime = NumericSafety.StoredTimeMaximumSeconds + 1d
            };
            settings.sdPrestige.doubleTime = NumericSafety.StoredTimeMaximumSeconds + 1d;

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(NumericSafety.StoredTimeMaximumSeconds, settings.offlineTime);
            Assert.AreEqual(NumericSafety.StoredTimeMaximumSeconds, settings.sdPrestige.doubleTime);
            Assert.IsTrue(settings.cheater);
        }

        [Test]
        public void SaveRepair_InfiniteTimeBanksClampAndMarkComparisonFlag()
        {
            var settings = new Oracle.SaveDataSettings
            {
                offlineTime = double.PositiveInfinity,
                maxOfflineTime = double.PositiveInfinity
            };
            settings.sdPrestige.doubleTime = double.PositiveInfinity;

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(NumericSafety.StoredTimeMaximumSeconds, settings.offlineTime);
            Assert.AreEqual(86400d, settings.maxOfflineTime);
            Assert.AreEqual(NumericSafety.StoredTimeMaximumSeconds, settings.sdPrestige.doubleTime);
            Assert.IsTrue(settings.cheater);
        }

        [TestCase(double.NaN)]
        [TestCase(double.NegativeInfinity)]
        [TestCase(0d)]
        [TestCase(-1d)]
        public void SaveRepair_InvalidOfflineCapacityUsesAuthoredDefault(double invalidCapacity)
        {
            var settings = new Oracle.SaveDataSettings
            {
                maxOfflineTime = invalidCapacity
            };

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(86400d, settings.maxOfflineTime);
        }

        [Test]
        public void SaveRepair_LowOfflineCapacityIsRaisedBeforePublication()
        {
            var settings = new Oracle.SaveDataSettings
            {
                maxOfflineTime = 60d
            };

            NumericSaveRepairResult result =
                NumericSaveRepair.Repair(settings);

            Assert.AreEqual(86400d, settings.maxOfflineTime);
            Assert.That(
                result.Entries,
                Has.Some.Contains(
                    "saveSettings.maxOfflineTime|60|86400|" +
                    "minimum_authored_offline_capacity"));
        }

        [Test]
        public void SaveRepair_CheaterLowOfflineCapacityIsPreserved()
        {
            var settings = new Oracle.SaveDataSettings
            {
                cheater = true,
                maxOfflineTime = 60d
            };

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(60d, settings.maxOfflineTime);
        }

        [Test]
        public void DerivedProductionRates_SaturateInsteadOfRemainingNonFinite()
        {
            var data = new Oracle.DysonVerseInfinityData
            {
                pocketDimensionsProduction =
                    double.PositiveInfinity,
                quantumComputingProduction =
                    double.PositiveInfinity,
                pocketDimensionsWithoutAnythingElseProduction =
                    double.PositiveInfinity,
                pocketProtectorsProduction =
                    double.PositiveInfinity,
                pocketMultiverseProduction =
                    double.PositiveInfinity,
                scientificPlanetsProduction =
                    double.PositiveInfinity,
                stellarSacrificesProduction =
                    double.PositiveInfinity,
                rudimentrySingularityProduction =
                    double.PositiveInfinity,
                planetAssemblyProduction =
                    double.PositiveInfinity,
                shellWorldsProduction =
                    double.PositiveInfinity
            };

            ProductionSystem.RecalculateDerivedState(
                data,
                new Oracle.DysonVerseSkillTreeData(),
                new Oracle.DysonVersePrestigeData(),
                new Oracle.PrestigePlus());

            Assert.IsTrue(NumericSafety.IsFinite(
                data.pocketDimensionsProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.quantumComputingProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.pocketDimensionsWithoutAnythingElseProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.pocketProtectorsProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.pocketMultiverseProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.scientificPlanetsProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.stellarSacrificesProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.rudimentrySingularityProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.planetAssemblyProduction));
            Assert.IsTrue(NumericSafety.IsFinite(
                data.shellWorldsProduction));
        }

        [Test]
        public void SaveRepair_FractionalResearchLevelFloorsButProgressRemainsFractional()
        {
            var settings = new Oracle.SaveDataSettings();
            Oracle.DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            infinity.researchLevelsById[ResearchIdMap.ScienceBoost] = 42.75d;
            infinity.researchProgressById[ResearchIdMap.ScienceBoost] = 0.75d;

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(42d, infinity.researchLevelsById[ResearchIdMap.ScienceBoost]);
            Assert.AreEqual(0.75d, infinity.researchProgressById[ResearchIdMap.ScienceBoost]);
        }

        [Test]
        public void SaveRepair_InvalidStructuralDurationUsesAuthoredDefault()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.sdSimulation.communityBoostDuration = double.NaN;

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(1200d, settings.sdSimulation.communityBoostDuration);
        }

        [Test]
        public void SaveRepair_DerivedProductionCachesAreDiscardedWithoutRepairNotice()
        {
            var settings = new Oracle.SaveDataSettings();
            Oracle.DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            infinity.botProduction = 42d;
            infinity.totalPlanetProduction = double.MaxValue;

            NumericSaveRepairResult result = NumericSaveRepair.Repair(settings);

            Assert.AreEqual(0d, infinity.botProduction);
            Assert.AreEqual(0d, infinity.totalPlanetProduction);
            Assert.AreEqual(0, result.RepairCount);
            Assert.IsFalse(settings.numericRepairNoticePending);
        }

        [Test]
        public void SaveRepair_AuthoredDiscreteLimitsAreRestored()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.prestigePlus.divisionsPurchased = long.MaxValue;
            settings.prestigePlus.secrets = long.MaxValue;
            settings.dysonVerseSaveData.dysonVersePrestigeData.permanentSkillPoint = long.MaxValue;
            settings.dysonVerseSaveData.dysonVersePrestigeData.botDistribution = 42d;

            NumericSaveRepair.Repair(settings);

            Assert.AreEqual(19L, settings.prestigePlus.divisionsPurchased);
            Assert.AreEqual(27L, settings.prestigePlus.secrets);
            Assert.AreEqual(
                10L,
                settings.dysonVerseSaveData.dysonVersePrestigeData.permanentSkillPoint);
            Assert.AreEqual(
                1d,
                settings.dysonVerseSaveData.dysonVersePrestigeData.botDistribution);
        }

        [Test]
        public void ProductionTimer_SplitTicksMatchSingleDuration()
        {
            var split = new ProductionTimer(3d);
            var batched = new ProductionTimer(3d);

            double splitProduced = 0d;
            for (int i = 0; i < 10; i++)
                splitProduced += split.Update(10d, 2d, 0.1d);
            double batchedProduced = batched.Update(10d, 2d, 1d);

            Assert.AreEqual(batchedProduced, splitProduced);
            Assert.AreEqual(batched.currentTime, split.currentTime, 1e-12d);
        }

        [Test]
        public void FixedStepScheduler_FrameChunkingProducesIdenticalTickCountAndRemainder()
        {
            double singleAccumulator = 0d;
            double splitAccumulator = 0d;
            int singleTicks = 0;
            int splitTicks = 0;

            DeterministicSimulation.Advance(
                ref singleAccumulator, 0.6d, 0.1d, 10, () => singleTicks++);
            DeterministicSimulation.Advance(
                ref splitAccumulator, 0.17d, 0.1d, 10, () => splitTicks++);
            DeterministicSimulation.Advance(
                ref splitAccumulator, 0.13d, 0.1d, 10, () => splitTicks++);
            DeterministicSimulation.Advance(
                ref splitAccumulator, 0.3d, 0.1d, 10, () => splitTicks++);

            Assert.AreEqual(singleTicks, splitTicks);
            Assert.AreEqual(singleAccumulator, splitAccumulator, 1e-12d);
        }

        [Test]
        public void FixedStepScheduler_HitchBacklogRunsAutomationForEveryLogicalTick()
        {
            double accumulator = 0d;
            int ticks = 0;

            Assert.AreEqual(
                10,
                DeterministicSimulation.Advance(
                    ref accumulator, 1.25d, 0.1d, 10, () => ticks++));
            Assert.AreEqual(10, ticks);
            Assert.AreEqual(0.25d, accumulator, 1e-12d);

            Assert.AreEqual(
                2,
                DeterministicSimulation.Advance(
                    ref accumulator, 0d, 0.1d, 10, () => ticks++));
            Assert.AreEqual(12, ticks);
            Assert.AreEqual(0.05d, accumulator, 1e-12d);
        }

        [Test]
        public void OrderedTick_UsesProductionAutomationRecomputeResetOrder()
        {
            string order = string.Empty;

            DeterministicSimulation.RunOrderedTick(
                () => order += "P",
                () => order += "A",
                () => order += "D",
                () => order += "R");

            Assert.AreEqual("PADR", order);
        }

        [Test]
        public void WholeGameTick_UsesSharedDreamAndDysonPhaseOrder()
        {
            string order = string.Empty;

            DeterministicSimulation.RunWholeGameTick(
                () => order += "P",
                () => order += "p",
                () => order += "A",
                () => order += "a",
                () => order += "D",
                () => order += "S",
                () => order += "T",
                () => order += "R",
                () => order += "I");

            Assert.AreEqual("PpAaDSTRI", order);
        }

        [Test]
        public void WholeGameTick_FrameChunkingKeepsDreamPhasesInLockstep()
        {
            double accumulator = 0d;
            int dreamProductionTicks = 0;
            int doubleTimeTicks = 0;
            int resetChecks = 0;

            void Tick()
            {
                DeterministicSimulation.RunWholeGameTick(
                    null,
                    () => dreamProductionTicks++,
                    null,
                    null,
                    null,
                    null,
                    () => doubleTimeTicks++,
                    () => resetChecks++,
                    null);
            }

            DeterministicSimulation.Advance(ref accumulator, 0.06d, 0.1d, 10, Tick);
            DeterministicSimulation.Advance(ref accumulator, 0.24d, 0.1d, 10, Tick);

            Assert.AreEqual(3, dreamProductionTicks);
            Assert.AreEqual(dreamProductionTicks, doubleTimeTicks);
            Assert.AreEqual(dreamProductionTicks, resetChecks);
            Assert.AreEqual(0d, accumulator, 1e-12d);
        }

        [Test]
        public void WholeGameTick_DreamResetReappliesResearchBeforeAnyFollowingFixedTick()
        {
            static (int Production, int Resets) Run(params double[] frameChunks)
            {
                double accumulator = 0d;
                bool researchApplied = true;
                bool resetPending = true;
                int production = 0;
                int resets = 0;

                void Tick()
                {
                    DeterministicSimulation.RunWholeGameTick(
                        null,
                        () => production += researchApplied ? 10 : 1,
                        null,
                        null,
                        null,
                        null,
                        null,
                        () =>
                        {
                            if (!resetPending) return;
                            resetPending = false;
                            resets++;
                            DeterministicSimulation.CompleteReset(
                                () => researchApplied = false,
                                null,
                                () => researchApplied = true);
                        },
                        null);
                }

                foreach (double frameChunk in frameChunks)
                {
                    DeterministicSimulation.Advance(
                        ref accumulator,
                        frameChunk,
                        0.1d,
                        10,
                        Tick);
                }

                Assert.IsTrue(researchApplied);
                return (production, resets);
            }

            (int singleProduction, int singleResets) = Run(0.2d);
            (int splitProduction, int splitResets) = Run(0.1d, 0.1d);

            Assert.AreEqual(20, singleProduction);
            Assert.AreEqual(singleProduction, splitProduction);
            Assert.AreEqual(1, singleResets);
            Assert.AreEqual(singleResets, splitResets);
        }

        [TestCase(0, 1d, 0d)]
        [TestCase(1, 2d, 0.1d)]
        [TestCase(10, 11d, 1d)]
        public void DreamDoubleTime_FullTickUsesSelectedRate(
            int rate,
            double expectedMultiplier,
            double expectedConsumed)
        {
            DreamDoubleTimeTick tick =
                DreamDoubleTimeMath.Prepare(true, 100d, rate, 0.1d);

            Assert.IsTrue(tick.Active);
            Assert.AreEqual(expectedMultiplier, tick.EffectiveMultiplier, 1e-12d);
            Assert.AreEqual(expectedConsumed, tick.BankConsumed, 1e-12d);
        }

        [Test]
        public void DreamDoubleTime_PositiveBankActivatesWithoutPersistedActiveFlag()
        {
            // doDoubleTime is deliberately not an input. A positive owned bank
            // is authoritative when the logical tick is prepared.
            DreamDoubleTimeTick tick =
                DreamDoubleTimeMath.Prepare(true, 1d, 1, 0.1d);

            Assert.IsTrue(tick.Active);
            Assert.AreEqual(2d, tick.EffectiveMultiplier);
        }

        [Test]
        public void DreamDoubleTime_PartialFinalTickUsesProportionalMultiplier()
        {
            DreamDoubleTimeTick tick =
                DreamDoubleTimeMath.Prepare(true, 0.25d, 10, 0.1d);

            Assert.IsTrue(tick.Active);
            Assert.AreEqual(3.5d, tick.EffectiveMultiplier, 1e-12d);
            Assert.AreEqual(0.25d, tick.BankConsumed, 1e-12d);
            Assert.AreEqual(
                0.1d + tick.BankConsumed,
                0.1d * tick.EffectiveMultiplier,
                1e-12d);
        }

        [Test]
        public void DreamDoubleTime_UnownedBankDoesNotActivateOrConsume()
        {
            DreamDoubleTimeTick tick =
                DreamDoubleTimeMath.Prepare(false, 100d, 10, 0.1d);

            Assert.IsFalse(tick.Active);
            Assert.AreEqual(1d, tick.EffectiveMultiplier);
            Assert.AreEqual(0d, tick.BankConsumed);
        }

        [Test]
        public void DreamDoubleTime_AnalyticalBatchMatchesSequentialTicksThroughDepletion()
        {
            const double startingBank = 2.35d;
            const int rate = 10;
            const long ticks = 100L;
            double sequentialBank = startingBank;
            for (long i = 0L; i < ticks; i++)
            {
                DreamDoubleTimeTick tick =
                    DreamDoubleTimeMath.Prepare(true, sequentialBank, rate, 0.1d);
                sequentialBank = Math.Max(0d, sequentialBank - tick.BankConsumed);
            }

            double analyticalBank = DreamDoubleTimeMath.RemainingBankAfterTicks(
                true,
                startingBank,
                rate,
                ticks,
                0.1d);

            Assert.AreEqual(sequentialBank, analyticalBank, 1e-12d);
            Assert.AreEqual(0d, analyticalBank, 0d);
        }

        [Test]
        public void DreamAnalytical_ResearchStopsBeforeCompletionTick()
        {
            var dream = new Oracle.SaveDataDream1
            {
                engineering = true,
                engineeringProgress = 0d,
                engineeringResearchTime = 10d
            };
            var prestige = new Oracle.SaveDataPrestige();

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                CreateDreamTiming(),
                1000L);

            Assert.AreEqual(99L, horizon);
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                dream,
                prestige,
                CreateDreamTiming(),
                horizon));
            Assert.AreEqual(9.9d, dream.engineeringProgress, 1e-12d);
            Assert.IsFalse(dream.engineeringComplete);
        }

        [Test]
        public void DreamAnalytical_ProductionTimerStopsBeforeOutputTick()
        {
            var dream = new Oracle.SaveDataDream1 { hunters = 1L };
            var prestige = new Oracle.SaveDataPrestige();

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                CreateDreamTiming(),
                1000L);

            Assert.AreEqual(29L, horizon);
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                dream,
                prestige,
                CreateDreamTiming(),
                horizon));
            Assert.AreEqual(2.9d, dream.hunterTimerProgress, 1e-12d);
            Assert.AreEqual(0d, dream.community, 0d);
        }

        [Test]
        public void DreamAnalytical_DoubleTimeStopsBeforePartialMultiplierTick()
        {
            var dream = new Oracle.SaveDataDream1();
            var prestige = new Oracle.SaveDataPrestige
            {
                doubleTimeOwned = true,
                doubleTime = 2.35d,
                doubleTimeRate = 10
            };

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                CreateDreamTiming(),
                1000L);

            Assert.AreEqual(2L, horizon);
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                dream,
                prestige,
                CreateDreamTiming(),
                horizon));
            Assert.AreEqual(0.35d, prestige.doubleTime, 1e-12d);
            Assert.AreEqual(
                0L,
                DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                    dream,
                    prestige,
                    CreateDreamTiming(),
                    1000L));
        }

        [Test]
        public void DreamAnalytical_ConversionDueUsesCanonicalBoundaryTick()
        {
            var dream = new Oracle.SaveDataDream1 { housing = 10d };

            Assert.AreEqual(
                0L,
                DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                    dream,
                    new Oracle.SaveDataPrestige(),
                    CreateDreamTiming(),
                    1000L));
        }

        [Test]
        public void DreamAnalytical_RailgunChargeStopsAtStartFiringBoundary()
        {
            var dream = new Oracle.SaveDataDream1
            {
                solarPanels = 1d,
                solarPanelGeneration = 100L,
                railgunMaxCharge = 25d,
                dysonPanels = 1L
            };
            var prestige = new Oracle.SaveDataPrestige();

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                CreateDreamTiming(),
                1000L);

            Assert.AreEqual(2L, horizon);
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                dream,
                prestige,
                CreateDreamTiming(),
                horizon));
            Assert.AreEqual(20d, dream.railgunCharge, 1e-12d);
            Assert.AreEqual(0d, dream.energy, 1e-12d);
        }

        [Test]
        public void DreamAnalytical_StoredEnergyBatchesUntilRailgunStartBoundary()
        {
            var dream = new Oracle.SaveDataDream1
            {
                energy = 1d,
                solarPanels = 1d,
                solarPanelGeneration = 100L,
                railgunMaxCharge = 25d,
                dysonPanels = 1L
            };
            var prestige = new Oracle.SaveDataPrestige();

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                CreateDreamTiming(),
                1000L);

            Assert.AreEqual(2L, horizon);
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                dream,
                prestige,
                CreateDreamTiming(),
                horizon));
            Assert.AreEqual(21d, dream.railgunCharge, 1e-12d);
            Assert.AreEqual(0d, dream.energy, 1e-12d);
        }

        [Test]
        public void DreamAnalytical_FullRailgunWithoutPanelsBatchesEnergyAtStoredTimeCap()
        {
            var dream = new Oracle.SaveDataDream1
            {
                solarPanels = 1d,
                solarPanelGeneration = 1L,
                railgunCharge = 25d,
                railgunMaxCharge = 25d,
                dysonPanels = 0L
            };
            var prestige = new Oracle.SaveDataPrestige();
            const long ticksAtStoredTimeCap = 420000000L;
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                CreateDreamTiming(),
                ticksAtStoredTimeCap);
            Assert.AreEqual(ticksAtStoredTimeCap, horizon);
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                dream,
                prestige,
                CreateDreamTiming(),
                horizon));

            stopwatch.Stop();
            Assert.AreEqual(42000000d, dream.energy, 1e-7d);
            Assert.Less(stopwatch.Elapsed.TotalMilliseconds, 8d);
        }

        [Test]
        public void DreamAnalytical_QuietBatchMatchesSequentialTimerResearchBoostAndEnergy()
        {
            const long ticks = 100L;
            var analytical = new Oracle.SaveDataDream1
            {
                hunters = 10L,
                hunterTimerProgress = 1d,
                engineering = true,
                engineeringResearchTime = 1000d,
                communityBoostTime = 20d,
                factoriesBoostTime = 20d,
                solarPanels = 3d,
                solarPanelGeneration = 2L,
                railgunMaxCharge = 1000d
            };
            var prestige = new Oracle.SaveDataPrestige
            {
                doubleTimeOwned = true,
                doubleTime = 1000d,
                doubleTimeRate = 1
            };
            var timing = new DreamOfflineTiming(
                hunter: 1000d,
                gatherer: 1000d,
                community: 1000d,
                housing: 1000d,
                villages: 1000d,
                workers: 1000d,
                cities: 1000d,
                factories: 1000d,
                bots: 1000d,
                spaceFactories: 1000d,
                railgunFiring: false);

            double expectedHunterProgress = analytical.hunterTimerProgress;
            double expectedResearch = analytical.engineeringProgress;
            double expectedCharge = analytical.railgunCharge;
            double expectedBank = prestige.doubleTime;
            for (long i = 0; i < ticks; i++)
            {
                DreamDoubleTimeTick tick = DreamDoubleTimeMath.Prepare(
                    true,
                    expectedBank,
                    prestige.doubleTimeRate,
                    0.1d);
                expectedHunterProgress +=
                    (1d + Math.Log10(analytical.hunters)) *
                    tick.EffectiveMultiplier *
                    0.1d;
                expectedResearch += tick.EffectiveMultiplier * 0.1d;
                expectedCharge +=
                    analytical.solarPanels *
                    analytical.solarPanelGeneration *
                    tick.EffectiveMultiplier *
                    0.1d;
                expectedBank -= tick.BankConsumed;
            }

            Assert.AreEqual(
                ticks,
                DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                    analytical,
                    prestige,
                    timing,
                    ticks));
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                analytical,
                prestige,
                timing,
                ticks));

            Assert.AreEqual(expectedHunterProgress, analytical.hunterTimerProgress, 1e-10d);
            Assert.AreEqual(expectedResearch, analytical.engineeringProgress, 1e-10d);
            Assert.AreEqual(expectedCharge, analytical.railgunCharge, 1e-10d);
            Assert.AreEqual(expectedBank, prestige.doubleTime, 1e-10d);
            Assert.AreEqual(10d, analytical.communityBoostTime, 1e-12d);
            Assert.AreEqual(10d, analytical.factoriesBoostTime, 1e-12d);
        }

        [Test]
        public void DreamAnalytical_EventSplitMatchesSequentialProductionAcrossManyCycles()
        {
            const long ticks = 1000L;
            DreamOfflineTiming timing = new DreamOfflineTiming(
                hunter: 3d,
                gatherer: double.MaxValue,
                community: double.MaxValue,
                housing: double.MaxValue,
                villages: double.MaxValue,
                workers: double.MaxValue,
                cities: double.MaxValue,
                factories: double.MaxValue,
                bots: double.MaxValue,
                spaceFactories: double.MaxValue,
                railgunFiring: false);
            var analytical = new Oracle.SaveDataDream1 { hunters = 10L };
            var sequential = new Oracle.SaveDataDream1 { hunters = 10L };
            var analyticalPrestige = new Oracle.SaveDataPrestige();
            var sequentialTimer = new ProductionTimer(timing.Hunter);

            long remaining = ticks;
            int canonicalBoundaryTicks = 0;
            while (remaining > 0L)
            {
                long horizon =
                    DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                        analytical,
                        analyticalPrestige,
                        timing,
                        remaining);
                if (horizon >= 2L)
                {
                    Assert.IsTrue(
                        DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                            analytical,
                            analyticalPrestige,
                            timing,
                            horizon));
                    remaining -= horizon;
                    continue;
                }

                var boundaryTimer = new ProductionTimer(
                    timing.Hunter,
                    analytical.hunterTimerProgress);
                double produced =
                    boundaryTimer.Update(analytical.hunters, 1d, 0.1d);
                analytical.hunterTimerProgress = boundaryTimer.currentTime;
                analytical.community += produced;
                remaining--;
                canonicalBoundaryTicks++;
            }

            for (long tick = 0L; tick < ticks; tick++)
            {
                sequential.community +=
                    sequentialTimer.Update(sequential.hunters, 1d, 0.1d);
            }
            sequential.hunterTimerProgress = sequentialTimer.currentTime;

            Assert.Greater(canonicalBoundaryTicks, 1);
            Assert.AreEqual(sequential.community, analytical.community, 0d);
            Assert.AreEqual(
                sequential.hunterTimerProgress,
                analytical.hunterTimerProgress,
                1e-9d);
        }

        [Test]
        public void DreamAnalytical_BoostExpiryIncludesLastBoostedTick()
        {
            var dream = new Oracle.SaveDataDream1
            {
                community = 1d,
                communityBoostTime = 0.15d
            };
            var prestige = new Oracle.SaveDataPrestige();

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                CreateDreamTiming(),
                100L);

            Assert.AreEqual(2L, horizon);
            Assert.IsTrue(DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                dream,
                prestige,
                CreateDreamTiming(),
                horizon));
            Assert.AreEqual(0d, dream.communityBoostTime, 0d);
            Assert.AreEqual(0.4d, dream.communityTimerProgress, 1e-12d);
        }

        [Test]
        public void DreamProductionSnapshot_NewFacilityStartsWorkingNextTick()
        {
            var factoryTimer = new ProductionTimer(0.1d);
            var botTimer = new ProductionTimer(0.1d);
            double factories = 1d;
            double bots = 0d;
            double rockets = 0d;

            double factoriesAtStart = factories;
            double botsAtStart = bots;
            bots += factoryTimer.Update(factoriesAtStart, 1d, 0.1d);
            rockets += botTimer.Update(botsAtStart, 1d, 0.1d);

            Assert.AreEqual(1d, bots);
            Assert.AreEqual(0d, rockets);

            factoriesAtStart = factories;
            botsAtStart = bots;
            bots += factoryTimer.Update(factoriesAtStart, 1d, 0.1d);
            rockets += botTimer.Update(botsAtStart, 1d, 0.1d);

            Assert.AreEqual(1d, rockets);
        }

        private static DreamOfflineTiming CreateDreamTiming(bool railgunFiring = false)
        {
            return new DreamOfflineTiming(
                hunter: 3d,
                gatherer: 3d,
                community: 3d,
                housing: 20d,
                villages: 12d,
                workers: 4d,
                cities: 3d,
                factories: 30d,
                bots: 20d,
                spaceFactories: 2d,
                railgunFiring);
        }

        [TestCase(Oracle.BuyMode.Buy1, 1L)]
        [TestCase(Oracle.BuyMode.Buy10, 10L)]
        [TestCase(Oracle.BuyMode.Buy50, 50L)]
        [TestCase(Oracle.BuyMode.Buy100, 100L)]
        public void FacilityOnlineAutomation_UsesConfiguredBuyMode(
            Oracle.BuyMode mode,
            long expectedQuantity)
        {
            WithRuntimeOracle(
                runtimeOracle =>
                {
                    runtimeOracle.saveSettings.buyMode = mode;
                    runtimeOracle.saveSettings.roundedBulkBuy = false;
                    runtimeOracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.money = 1000d;
                    var buildingObject = new GameObject("automation-test-building");
                    try
                    {
                        var building = buildingObject.AddComponent<AutomationTestBuilding>();
                        building.Configure(1d, 1d);

                        building.AutoPurchase();

                        Assert.AreEqual(expectedQuantity, building.ManualOwned);
                        Assert.AreEqual(1000d - expectedQuantity, Oracle.Money, 1e-9d);
                    }
                    finally
                    {
                        UnityEngine.Object.DestroyImmediate(buildingObject);
                    }
                });
        }

        [Test]
        public void FacilityOnlineAutomation_BuyMaxUsesAffordableQuantity()
        {
            WithRuntimeOracle(
                runtimeOracle =>
                {
                    runtimeOracle.saveSettings.buyMode = Oracle.BuyMode.BuyMax;
                    runtimeOracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.money = 1000d;
                    var buildingObject = new GameObject("automation-test-building-max");
                    try
                    {
                        var building = buildingObject.AddComponent<AutomationTestBuilding>();
                        building.Configure(1d, 1d);
                        long expected = building.Affordable();

                        building.AutoPurchase();

                        Assert.Greater(expected, 100L);
                        Assert.AreEqual(expected, building.ManualOwned);
                    }
                    finally
                    {
                        UnityEngine.Object.DestroyImmediate(buildingObject);
                    }
                });
        }

        [TestCase(Oracle.BuyMode.Buy1, 1d)]
        [TestCase(Oracle.BuyMode.Buy10, 10d)]
        [TestCase(Oracle.BuyMode.Buy50, 50d)]
        [TestCase(Oracle.BuyMode.Buy100, 100d)]
        public void ResearchOnlineAutomation_UsesConfiguredBuyMode(
            Oracle.BuyMode mode,
            double expectedLevel)
        {
            WithRuntimeOracle(
                runtimeOracle =>
                {
                    runtimeOracle.saveSettings.researchBuyMode = mode;
                    runtimeOracle.saveSettings.roundedBulkBuy = false;
                    runtimeOracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.science = 1e9;
                    runtimeOracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityAutoResearch = true;
                    var gameState = new GameStateService();
                    ServiceLocator.Register<IGameStateService>(gameState);
                    var presenterObject = new GameObject("automation-test-research");
                    try
                    {
                        ResearchPresenter presenter = presenterObject.AddComponent<ResearchPresenter>();
                        ConfigureResearchPresenter(presenter);
                        SetPrivateField<IGameStateService>(presenter, "_gameState", gameState);

                        Assert.IsTrue(presenter.TryAutoPurchase());
                        Assert.AreEqual(
                            expectedLevel,
                            Oracle.GetResearchLevel(ResearchIdMap.ScienceBoost));
                    }
                    finally
                    {
                        UnityEngine.Object.DestroyImmediate(presenterObject);
                    }
                });
        }

        [Test]
        public void ResearchOfflineAutomation_ForcesBuyMaxAndRestoresOnlineMode()
        {
            WithRuntimeOracle(
                runtimeOracle =>
                {
                    runtimeOracle.saveSettings.researchBuyMode = Oracle.BuyMode.Buy1;
                    runtimeOracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData.science = 1e9;
                    runtimeOracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData.infinityAutoResearch = true;
                    var gameState = new GameStateService();
                    ServiceLocator.Register<IGameStateService>(gameState);
                    var presenterObject = new GameObject("offline-automation-test-research");
                    var autoBuyObject = new GameObject("offline-automation-test-runner");
                    try
                    {
                        ResearchPresenter presenter = presenterObject.AddComponent<ResearchPresenter>();
                        ConfigureResearchPresenter(presenter);
                        SetPrivateField<IGameStateService>(presenter, "_gameState", gameState);
                        long affordable = presenter.Affordable();
                        ResearchAutoBuy autoBuy = autoBuyObject.AddComponent<ResearchAutoBuy>();

                        autoBuy.RunAutomationTick(forceBuyMax: true);

                        Assert.Greater(affordable, 100L);
                        Assert.AreEqual(
                            affordable,
                            Oracle.GetResearchLevel(ResearchIdMap.ScienceBoost));
                        Assert.AreEqual(
                            Oracle.BuyMode.Buy1,
                            runtimeOracle.saveSettings.researchBuyMode);
                    }
                    finally
                    {
                        UnityEngine.Object.DestroyImmediate(autoBuyObject);
                        UnityEngine.Object.DestroyImmediate(presenterObject);
                    }
                });
        }

        [Test]
        public void ResearchOfflineEventDetection_UsesPredictedFacilityPrerequisite()
        {
            WithRuntimeOracle(
                runtimeOracle =>
                {
                    Oracle.DysonVerseInfinityData infinity =
                        runtimeOracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
                    infinity.science = 100d;
                    infinity.galacticBrains = new[] { 0d, 0d };
                    runtimeOracle.saveSettings.dysonVerseSaveData
                        .dysonVersePrestigeData.infinityAutoResearch = true;
                    var gameState = new GameStateService();
                    ServiceLocator.Register<IGameStateService>(gameState);
                    var definition = ScriptableObject.CreateInstance<ResearchDefinition>();
                    definition.baseCost = 1d;
                    definition.exponent = 1d;
                    definition.prerequisiteFacilityId = "galactic_brains";
                    definition.prerequisiteFacilityOwned = 1d;
                    var presenterObject =
                        new GameObject("predicted-prerequisite-research");
                    try
                    {
                        ResearchPresenter presenter =
                            presenterObject.AddComponent<ResearchPresenter>();
                        SetPrivateField(
                            presenter,
                            "autoBuyGroupOverride",
                            ResearchAutoBuyGroup.None);
                        SetPrivateField(presenter, "definition", definition);
                        SetPrivateField(presenter, "_resolvedDefinition", definition);
                        SetPrivateField<IGameStateService>(
                            presenter,
                            "_gameState",
                            gameState);

                        Assert.IsFalse(
                            presenter.WouldOfflineAutoPurchase(
                                AnalyticalOfflineSimulation.CreateStateForTests(
                                    science: 100d,
                                    galacticBrains: 0d)));
                        Assert.IsTrue(
                            presenter.WouldOfflineAutoPurchase(
                                AnalyticalOfflineSimulation.CreateStateForTests(
                                    science: 100d,
                                    galacticBrains: 1d)));
                    }
                    finally
                    {
                        UnityEngine.Object.DestroyImmediate(presenterObject);
                        UnityEngine.Object.DestroyImmediate(definition);
                    }
                });
        }

        [Test]
        public void DreamAnalytical_RailgunFireProgressForcesCanonicalBoundary()
        {
            var dream = new Oracle.SaveDataDream1
            {
                railgunFireProgress = 0.01d
            };

            Assert.AreEqual(
                0L,
                DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                    dream,
                    new Oracle.SaveDataPrestige(),
                    CreateDreamTiming(),
                    1000L));
        }

        [Test]
        public void SaveRepair_LegacyMidVolleyRailgunStateResumes()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.sdSimulation.railgunCharge = 25d;
            settings.sdSimulation.dysonPanels = 10L;
            settings.sdSimulation.railgunFireProgress = 0.2d;

            NumericSaveRepair.Repair(settings);

            Assert.IsTrue(settings.sdSimulation.railgunFiring);
            Assert.AreEqual(
                10,
                settings.sdSimulation.railgunShotsRemaining);
            Assert.AreEqual(
                0.2d,
                settings.sdSimulation.railgunFireProgress,
                0d);
        }

        [Test]
        public void SaveRepair_OrphanedRailgunProgressIsCleared()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.sdSimulation.railgunFireProgress = 0.2d;

            NumericSaveRepair.Repair(settings);

            Assert.IsFalse(settings.sdSimulation.railgunFiring);
            Assert.AreEqual(
                0,
                settings.sdSimulation.railgunShotsRemaining);
            Assert.AreEqual(
                0d,
                settings.sdSimulation.railgunFireProgress,
                0d);
        }

        [TestCase(true, 0d, 0d, 0d)]
        [TestCase(false, 1d, 0d, 0d)]
        [TestCase(false, 0d, 1d, 0d)]
        [TestCase(false, 0d, 0d, 0.01d)]
        public void DreamAnalytical_ActiveClockStateIsNeverClassifiedIdle(
            bool railgunFiring,
            double communityBoost,
            double factoryBoost,
            double railgunProgress)
        {
            var dream = new Oracle.SaveDataDream1
            {
                communityBoostTime = communityBoost,
                factoriesBoostTime = factoryBoost,
                railgunFireProgress = railgunProgress
            };

            Assert.IsFalse(
                DreamAnalyticalOfflineSimulation.IsClockIdle(
                    dream,
                    railgunFiring));
        }

        [Test]
        public void DreamAnalytical_ZeroProductionActiveBoostStillExpires()
        {
            var dream = new Oracle.SaveDataDream1
            {
                communityBoostTime = 0.5d,
                factoriesBoostTime = 0.5d
            };
            var prestige = new Oracle.SaveDataPrestige();
            DreamOfflineTiming timing = CreateDreamTiming();

            long horizon = DreamAnalyticalOfflineSimulation.GetQuietTickHorizon(
                dream,
                prestige,
                timing,
                100L);

            Assert.AreEqual(5L, horizon);
            Assert.IsTrue(
                DreamAnalyticalOfflineSimulation.AdvanceQuietTicks(
                    dream,
                    prestige,
                    timing,
                    horizon));
            Assert.AreEqual(0d, dream.communityBoostTime, 0d);
            Assert.AreEqual(0d, dream.factoriesBoostTime, 0d);
        }

        [Test]
        public void HighScaleResearchAccrual_RetainsSubUlpWholeLevelsUntilRepresentable()
        {
            WithRuntimeOracle(
                runtimeOracle =>
                {
                    Oracle.DysonVerseInfinityData infinity =
                        runtimeOracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
                    const double boundary = 9007199254740992d;
                    infinity.researchLevelsById[ResearchIdMap.ScienceBoost] = boundary;
                    infinity.scienceBoostOwned = boundary;

                    Oracle.AddResearchLevel(ResearchIdMap.ScienceBoost, 1d);

                    Assert.AreEqual(boundary, Oracle.GetResearchLevel(ResearchIdMap.ScienceBoost));
                    Assert.AreEqual(
                        1d,
                        infinity.researchProgressById[ResearchIdMap.ScienceBoost]);

                    Oracle.AddResearchLevel(ResearchIdMap.ScienceBoost, 1d);

                    Assert.AreEqual(
                        boundary + 2d,
                        Oracle.GetResearchLevel(ResearchIdMap.ScienceBoost));
                    Assert.AreEqual(
                        0d,
                        infinity.researchProgressById[ResearchIdMap.ScienceBoost]);
                });
        }

        [Test]
        public void DreamEnergyContribution_ExtremeSolarAndFusionSaturateFiniteInsteadOfCollapsing()
        {
            var simulation = new Oracle.SaveDataDream1
            {
                solarPanels = double.MaxValue,
                solarPanelGeneration = long.MaxValue,
                mathematicsComplete = true,
                fusion = double.MaxValue,
                fusionGeneration = long.MaxValue,
                swarmPanels = long.MaxValue,
                swarmPanelGeneration = long.MaxValue
            };

            double delta = SpaceAgeManager.CalculateEnergyDelta(
                simulation,
                double.MaxValue);

            Assert.IsTrue(NumericSafety.IsFinite(delta));
            Assert.Greater(delta, 0d);
            Assert.AreEqual(
                double.MaxValue,
                NumericSafety.Add(NumericSafety.BitDecrement(double.MaxValue), delta).Value);
        }

        [Test]
        public void ProductionTimer_ExtremeFiniteInputIsBoundedWithoutLooping()
        {
            var timer = new ProductionTimer(0.1d);

            double produced = timer.Update(
                double.MaxValue,
                double.MaxValue,
                0.1d);

            Assert.AreEqual(double.MaxValue, produced);
            Assert.GreaterOrEqual(timer.currentTime, 0d);
            Assert.Less(timer.currentTime, timer.duration);
        }

        [Test]
        public void ProductionTimer_WholeCyclesBeyondIntMaxAreNotDiscarded()
        {
            const double duration = 0.125d;
            double expectedCycles = (double)int.MaxValue + 1d;
            var timer = new ProductionTimer(
                duration,
                expectedCycles * duration + 0.0625d);

            double produced = timer.UpdateWithCustomMultiplier(
                0d,
                1d,
                0d);

            Assert.AreEqual(expectedCycles, produced);
            Assert.AreEqual(0.0625d, timer.currentTime, 1e-12d);
        }

        [Test]
        public void NumericFormatting_DistinguishesCapFromTechnicalFailure()
        {
            StringAssert.Contains("MAX", CalcUtils.FormatNumber(double.MaxValue));
            StringAssert.Contains("MAX", CalcUtils.FormatEnergy(double.MaxValue, true));
            Assert.AreEqual("ERR", CalcUtils.FormatTimeLarge(double.NaN));
            StringAssert.Contains("ERR", CalcUtils.FormatNumber(double.PositiveInfinity));
        }

        private static void ConfigureResearchPresenter(ResearchPresenter presenter)
        {
            SetPrivateField(presenter, "researchIdOverride", ResearchIdMap.ScienceBoost);
            SetPrivateField<string>(presenter, "_resolvedId", null);
            SetPrivateField(
                presenter,
                "autoBuyGroupOverride",
                ResearchAutoBuyGroup.None);
        }

        private static void SetPrivateField<T>(object target, string name, T value)
        {
            System.Reflection.FieldInfo field = target.GetType().GetField(
                name,
                System.Reflection.BindingFlags.Instance |
                System.Reflection.BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"Missing field {target.GetType().Name}.{name}.");
            field.SetValue(target, value);
        }

        private static void WithRuntimeOracle(Action<Oracle> assertion)
        {
            Oracle previous = Oracle.oracle;
            Oracle.oracle = null;
            ServiceLocator.Clear();
            var oracleObject = new GameObject("numeric-safety-test-oracle");
            try
            {
                Oracle runtimeOracle = oracleObject.AddComponent<Oracle>();
                runtimeOracle.saveSettings = new Oracle.SaveDataSettings();
                Oracle.oracle = runtimeOracle;
                assertion(runtimeOracle);
            }
            finally
            {
                ServiceLocator.Clear();
                Oracle.oracle = null;
                UnityEngine.Object.DestroyImmediate(oracleObject);
                Oracle.oracle = previous;
            }
        }
    }

    public sealed class AutomationTestBuilding : Building
    {
        public double ManualOwned { get; private set; }

        public void Configure(double configuredBaseCost, double configuredExponent)
        {
            baseCost = configuredBaseCost;
            exponent = configuredExponent;
        }

        public override double ManuallyPurchasedBuildings
        {
            get => ManualOwned;
            set => ManualOwned = value;
        }

        public override double AutoPurchasedBuildings { get; set; }
        public override double Production => 0d;
        public override double CurrentLevel => ManualOwned;
        public override string OwnedText => string.Empty;
        public override string ProductioinText => string.Empty;
        public override bool AutoBuy => true;
    }
}
