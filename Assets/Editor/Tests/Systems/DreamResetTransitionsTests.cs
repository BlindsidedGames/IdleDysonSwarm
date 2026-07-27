using Expansion;
using NUnit.Framework;
using Systems.Simulation;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class DreamResetTransitionsTests
    {
        [TestCase(0L, 1d, 0d, 0d, DreamResetCause.Meteor, 1L)]
        [TestCase(1L, 1d, 0d, 0d, DreamResetCause.Meteor, 1L)]
        [TestCase(2L, 0d, 100d, 0d, DreamResetCause.ArtificialIntelligence, 10L)]
        [TestCase(3L, 0d, 0d, 5d, DreamResetCause.GlobalWarming, 20L)]
        public void AutomaticReset_AppliesStageRewardAndWipesRun(
            long stage,
            double cities,
            double bots,
            double spaceFactories,
            DreamResetCause expectedCause,
            long expectedReward)
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.sdPrestige.disasterStage = stage;
            settings.sdSimulation.cities = cities;
            settings.sdSimulation.bots = bots;
            settings.sdSimulation.spaceFactories = spaceFactories;
            Oracle.SaveDataDream1 previous =
                settings.sdSimulation;

            bool reset =
                DreamResetTransitions.TryApplyAutomatic(
                    settings,
                    out DreamResetOutcome outcome);

            Assert.IsTrue(reset);
            Assert.AreEqual(expectedCause, outcome.Cause);
            Assert.AreEqual(expectedReward, outcome.StrangeMatter);
            Assert.AreEqual(0L, settings.sdPrestige.disasterStage);
            Assert.AreEqual(1L, settings.sdPrestige.simulationCount);
            Assert.AreEqual(expectedReward, settings.sdPrestige.strangeMatter);
            Assert.AreNotSame(previous, settings.sdSimulation);
            Assert.AreEqual(0d, settings.sdSimulation.cities, 0d);
        }

        [Test]
        public void AutomaticReset_NotReadyMutatesNothing()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.sdPrestige.disasterStage = 2L;
            settings.sdSimulation.bots = 99d;
            Oracle.SaveDataDream1 previous =
                settings.sdSimulation;

            bool reset =
                DreamResetTransitions.TryApplyAutomatic(
                    settings,
                    out _);

            Assert.IsFalse(reset);
            Assert.AreSame(previous, settings.sdSimulation);
            Assert.AreEqual(0L, settings.sdPrestige.simulationCount);
            Assert.AreEqual(0L, settings.sdPrestige.strangeMatter);
        }

        [Test]
        public void AutomaticReset_MaxedRewardMutatesNothing()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.sdPrestige.disasterStage = 0L;
            settings.sdPrestige.strangeMatter = long.MaxValue;
            settings.sdSimulation.cities = 1d;
            Oracle.SaveDataDream1 previous =
                settings.sdSimulation;

            bool reset =
                DreamResetTransitions.TryApplyAutomatic(
                    settings,
                    out _);

            Assert.IsFalse(reset);
            Assert.AreSame(previous, settings.sdSimulation);
            Assert.AreEqual(0L, settings.sdPrestige.simulationCount);
            Assert.AreEqual(long.MaxValue, settings.sdPrestige.strangeMatter);
        }

        [Test]
        public void ExplicitBlackHole_UsesSamePureTransition()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.sdSimulation.swarmPanels = 42L;

            bool reset =
                DreamResetTransitions.TryApplyExplicit(
                    settings,
                    DreamResetCause.BlackHole,
                    settings.sdSimulation.swarmPanels,
                    out DreamResetOutcome outcome);

            Assert.IsTrue(reset);
            Assert.AreEqual(DreamResetCause.BlackHole, outcome.Cause);
            Assert.AreEqual(42L, settings.sdPrestige.strangeMatter);
            Assert.AreEqual(1L, settings.sdPrestige.simulationCount);
            Assert.AreEqual(0L, settings.sdSimulation.swarmPanels);
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
