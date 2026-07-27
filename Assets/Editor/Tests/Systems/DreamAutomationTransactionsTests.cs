using Expansion;
using NUnit.Framework;
using Systems.Simulation;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class DreamAutomationTransactionsTests
    {
        [Test]
        public void FoundationalConversions_PreserveCanonicalOrder()
        {
            var dream = new Oracle.SaveDataDream1
            {
                housing = 10d,
                villages = 24d
            };

            DreamAutomationTransactions
                .ApplyFoundationalConversions(dream);

            Assert.AreEqual(0d, dream.housing, 0d);
            Assert.AreEqual(0d, dream.villages, 0d);
            Assert.AreEqual(1d, dream.cities, 0d);
        }

        [Test]
        public void RocketConversion_AppliesMaximumAtomicExchange()
        {
            var dream = new Oracle.SaveDataDream1
            {
                rockets = 37d,
                factories = 5d,
                spaceFactories = 2d,
                rocketsPerSpaceFactory = 10L
            };

            DreamAutomationTransactions
                .ApplyRocketConversions(dream);

            Assert.AreEqual(7d, dream.rockets, 0d);
            Assert.AreEqual(2d, dream.factories, 0d);
            Assert.AreEqual(5d, dream.spaceFactories, 0d);
        }

        [Test]
        public void RailgunState_PersistsAcrossPartitionedTicks()
        {
            var continuous = CreateReadyRailgun();
            var partitioned = CreateReadyRailgun();
            var prestige = new Oracle.SaveDataPrestige();

            for (int i = 0; i < 3; i++)
            {
                ApplyRailgun(continuous, prestige);
            }

            ApplyRailgun(partitioned, prestige);
            ApplyRailgun(partitioned, prestige);
            var reloaded = new Oracle.SaveDataDream1
            {
                energy = partitioned.energy,
                dysonPanels = partitioned.dysonPanels,
                swarmPanels = partitioned.swarmPanels,
                railgunCharge = partitioned.railgunCharge,
                railgunMaxCharge =
                    partitioned.railgunMaxCharge,
                railgunFiring = partitioned.railgunFiring,
                railgunFireProgress =
                    partitioned.railgunFireProgress,
                railgunShotsRemaining =
                    partitioned.railgunShotsRemaining
            };
            ApplyRailgun(reloaded, prestige);

            Assert.AreEqual(
                continuous.railgunCharge,
                reloaded.railgunCharge,
                0d);
            Assert.AreEqual(
                continuous.dysonPanels,
                reloaded.dysonPanels);
            Assert.AreEqual(
                continuous.swarmPanels,
                reloaded.swarmPanels);
            Assert.AreEqual(
                continuous.railgunFiring,
                reloaded.railgunFiring);
            Assert.AreEqual(
                continuous.railgunFireProgress,
                reloaded.railgunFireProgress,
                0d);
            Assert.AreEqual(
                continuous.railgunShotsRemaining,
                reloaded.railgunShotsRemaining);
        }

        [Test]
        public void RailgunSaturatedOutput_DebitsNothingAndStops()
        {
            var dream = CreateReadyRailgun();
            dream.railgunFiring = true;
            dream.railgunShotsRemaining = 10;
            dream.railgunFireProgress = 0.4d;
            dream.swarmPanels = long.MaxValue;
            long panelsBefore = dream.dysonPanels;
            double chargeBefore = dream.railgunCharge;

            ApplyRailgun(
                dream,
                new Oracle.SaveDataPrestige());

            Assert.AreEqual(chargeBefore, dream.railgunCharge, 0d);
            Assert.AreEqual(panelsBefore, dream.dysonPanels);
            Assert.AreEqual(long.MaxValue, dream.swarmPanels);
            Assert.IsFalse(dream.railgunFiring);
            Assert.AreEqual(0, dream.railgunShotsRemaining);
        }

        [Test]
        public void RailgunDoubleTime_UsesSelectedDiscretePanelRate()
        {
            var dream = CreateReadyRailgun();
            var prestige = new Oracle.SaveDataPrestige
            {
                doDoubleTime = true,
                doubleTimeOwned = true,
                doubleTime = 10d,
                doubleTimeRate = 10
            };
            for (int i = 0; i < 3; i++)
            {
                ApplyRailgun(dream, prestige);
            }

            Assert.AreEqual(90L, dream.dysonPanels);
            Assert.AreEqual(10L, dream.swarmPanels);
        }

        private static Oracle.SaveDataDream1 CreateReadyRailgun()
        {
            return new Oracle.SaveDataDream1
            {
                energy = 0d,
                dysonPanels = 100L,
                swarmPanels = 0L,
                railgunCharge = 100d,
                railgunMaxCharge = 100d
            };
        }

        private static void ApplyRailgun(
            Oracle.SaveDataDream1 dream,
            Oracle.SaveDataPrestige prestige)
        {
            DreamAutomationTransactions.ApplyRailgun(
                dream,
                prestige,
                tickSeconds: 0.1d,
                totalFireTime: 5d,
                shotsPerVolley: 10,
                basePanelsRequiredToStart: 10);
        }
    }
}
