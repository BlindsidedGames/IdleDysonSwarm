using Expansion;
using NUnit.Framework;
using Systems.Simulation;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class InfinityResetTransitionsTests
    {
        [Test]
        public void OrdinaryReset_AppliesRetainedStartsAndRunBookkeeping()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            Oracle.DysonVersePrestigeData prestige =
                settings.dysonVerseSaveData
                    .dysonVersePrestigeData;
            prestige.infinityPoints = 41L;
            prestige.infinityAssemblyLines = true;
            prestige.infinityAiManagers = true;
            prestige.infinityServers = true;
            prestige.infinityDataCenter = true;
            prestige.infinityPlanets = true;
            prestige.permanentSkillPoint = 2L;
            settings.offlineTimeUsedThisInfinity = 12.5d;
            settings.timeLastInfinity = 1.2d;
            settings.infinityInProgress = true;
            Oracle.DysonVerseSaveData dyson =
                settings.dysonVerseSaveData;

            bool reset = InfinityResetTransitions.TryApply(
                settings,
                new InfinityResetRequest(
                    breakInfinity: false,
                    requestedReward: 2L,
                    bankedSkillPoints: 2,
                    artifactSkillPoints: 3,
                    botCapTransition: false),
                out InfinityResetOutcome outcome);

            Assert.IsTrue(reset);
            Assert.AreSame(dyson, settings.dysonVerseSaveData);
            Assert.AreEqual(2L, outcome.RewardGranted);
            Assert.AreEqual(43L, prestige.infinityPoints);
            Assert.AreEqual(12.5d, settings.offlineTimeUsedPreviousInfinity, 0d);
            Assert.AreEqual(0d, settings.offlineTimeUsedThisInfinity, 0d);
            Assert.AreEqual(10d, dyson.dysonVerseInfinityData.bots, 0d);
            Assert.AreEqual(10d, dyson.dysonVerseInfinityData.assemblyLines[1], 0d);
            Assert.AreEqual(10d, dyson.dysonVerseInfinityData.managers[1], 0d);
            Assert.AreEqual(10d, dyson.dysonVerseInfinityData.servers[1], 0d);
            Assert.AreEqual(10d, dyson.dysonVerseInfinityData.dataCenters[1], 0d);
            Assert.AreEqual(10d, dyson.dysonVerseInfinityData.planets[1], 0d);
            Assert.AreEqual(7L, dyson.dysonVerseSkillTreeData.skillPointsTree);
            Assert.IsFalse(settings.infinityInProgress);
            Assert.IsTrue(settings.firstInfinityDone);
            Assert.IsTrue(settings.tutorial);
            Assert.AreEqual(1L, settings.simulationStatistics.lifetime.ordinaryInfinityCount);
            Assert.AreEqual(2L, settings.simulationStatistics.lifetime.ordinaryInfinityPoints);
        }

        [Test]
        public void BreakReset_PreservesFractionalTypeContractAndRecordsBreakReward()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints = 100L;
            settings.dysonVerseSaveData
                .dysonVerseInfinityData.bots = 123.5d;
            settings.timeLastInfinity = 0.25d;

            bool reset = InfinityResetTransitions.TryApply(
                settings,
                new InfinityResetRequest(
                    breakInfinity: true,
                    requestedReward: 37L,
                    bankedSkillPoints: 0,
                    artifactSkillPoints: 0,
                    botCapTransition: false),
                out InfinityResetOutcome outcome);

            Assert.IsTrue(reset);
            Assert.AreEqual(37L, outcome.RewardGranted);
            Assert.AreEqual(
                137L,
                settings.dysonVerseSaveData
                    .dysonVersePrestigeData.infinityPoints);
            Assert.AreEqual(
                1d,
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData.bots,
                0d);
            Assert.AreEqual(
                1L,
                settings.simulationStatistics
                    .lifetime.breakInfinityCount);
            Assert.AreEqual(
                37L,
                settings.simulationStatistics
                    .lifetime.breakInfinityPoints);
        }

        [Test]
        public void BotCapReset_ClearsDurableCheckpointFlags()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.botCapTransitionPending = true;
            settings.botCapRewardsGranted = true;
            settings.infinityInProgress = true;

            Assert.IsTrue(InfinityResetTransitions.TryApply(
                settings,
                new InfinityResetRequest(
                    breakInfinity: false,
                    requestedReward: 1L,
                    bankedSkillPoints: 0,
                    artifactSkillPoints: 0,
                    botCapTransition: true),
                out _));

            Assert.IsFalse(settings.botCapTransitionPending);
            Assert.IsFalse(settings.botCapRewardsGranted);
            Assert.IsFalse(settings.infinityInProgress);
            Assert.AreEqual(
                1L,
                settings.simulationStatistics
                    .lifetime.botCapOverflowRewards);
        }

        [Test]
        public void SaturatedIp_RecordsOnlyActuallyGrantedReward()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityPoints =
                long.MaxValue;

            Assert.IsTrue(InfinityResetTransitions.TryApply(
                settings,
                new InfinityResetRequest(
                    breakInfinity: true,
                    requestedReward: 42L,
                    bankedSkillPoints: 0,
                    artifactSkillPoints: 0,
                    botCapTransition: false),
                out InfinityResetOutcome outcome));

            Assert.AreEqual(0L, outcome.RewardGranted);
            Assert.AreEqual(0, settings.lastInfinityPointsGained);
            Assert.AreEqual(
                0L,
                settings.simulationStatistics
                    .lifetime.breakInfinityPoints);
        }

        private static Oracle.SaveDataSettings CreateSettings()
        {
            return new Oracle.SaveDataSettings
            {
                simulationStatistics = new SimulationStatistics()
            };
        }
    }
}
