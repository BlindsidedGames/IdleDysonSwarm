using Expansion;
using GameData;
using NUnit.Framework;
using Systems.Simulation;

namespace Tests.Systems
{
    [TestFixture]
    public sealed class DysonAutomationTransactionsTests
    {
        [Test]
        public void FacilityConfiguredBuy10_IsAtomic()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.buyMode = Oracle.BuyMode.Buy10;
            settings.dysonVerseSaveData.dysonVerseInfinityData.money =
                100d;
            var rule = new DysonFacilityAutomationRule(
                "assembly_lines",
                10d,
                1d,
                enabled: true,
                unlocked: true,
                subtractRetainedTen: false,
                useAssemblyMegaDiscount: false);

            bool purchased =
                DysonAutomationTransactions.TryPurchaseFacility(
                    settings,
                    rule,
                    SimulationAutomationPolicy
                        .PreserveConfiguredMode,
                    out long quantity);

            Assert.IsTrue(purchased);
            Assert.AreEqual(10L, quantity);
            Assert.AreEqual(
                10d,
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData.assemblyLines[1],
                0d);
            Assert.AreEqual(
                0d,
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData.money,
                0d);
        }

        [Test]
        public void FacilityStoredBuyMax_DoesNotChangeSavedMode()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.buyMode = Oracle.BuyMode.Buy100;
            settings.dysonVerseSaveData.dysonVerseInfinityData.money =
                55d;
            var rule = new DysonFacilityAutomationRule(
                "assembly_lines",
                10d,
                1d,
                enabled: true,
                unlocked: true,
                subtractRetainedTen: false,
                useAssemblyMegaDiscount: false);

            bool purchased =
                DysonAutomationTransactions.TryPurchaseFacility(
                    settings,
                    rule,
                    SimulationAutomationPolicy.ForceBuyMax,
                    out long quantity);

            Assert.IsTrue(purchased);
            Assert.AreEqual(5L, quantity);
            Assert.AreEqual(
                Oracle.BuyMode.Buy100,
                settings.buyMode);
            Assert.AreEqual(
                5d,
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData.assemblyLines[1],
                0d);
            Assert.AreEqual(
                5d,
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData.money,
                0d);
        }

        [Test]
        public void ResearchStoredBuyMax_UsesPrerequisitesAndPreservesMode()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.researchBuyMode = Oracle.BuyMode.Buy1;
            settings.dysonVerseSaveData.dysonVersePrestigeData
                .infinityAutoResearch = true;
            Oracle.DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            infinity.science = 55d;
            infinity.assemblyLines[1] = 1d;
            var rule = new ResearchAutomationRule(
                "test_research",
                10d,
                1d,
                maxLevel: -1,
                ResearchAutoBuyGroup.None,
                prerequisiteResearchIds: null,
                prerequisiteFacilityId: "assembly_lines",
                prerequisiteFacilityOwned: 1d,
                percentPerLevel: 0d);

            bool purchased =
                DysonAutomationTransactions.TryPurchaseResearch(
                    settings,
                    rule,
                    SimulationAutomationPolicy.ForceBuyMax,
                    out long quantity);

            Assert.IsTrue(purchased);
            Assert.AreEqual(5L, quantity);
            Assert.AreEqual(
                Oracle.BuyMode.Buy1,
                settings.researchBuyMode);
            Assert.AreEqual(
                5d,
                infinity.researchLevelsById["test_research"],
                0d);
            Assert.AreEqual(5d, infinity.science, 0d);
        }

        [Test]
        public void ResearchMissingPrerequisite_DebitsNothing()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.dysonVerseSaveData.dysonVersePrestigeData
                .infinityAutoResearch = true;
            Oracle.DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            infinity.science = 100d;
            var rule = new ResearchAutomationRule(
                "test_research",
                10d,
                1d,
                maxLevel: -1,
                ResearchAutoBuyGroup.None,
                prerequisiteResearchIds:
                    new[] { "required_research" },
                prerequisiteFacilityId: null,
                prerequisiteFacilityOwned: 0d,
                percentPerLevel: 0d);

            bool purchased =
                DysonAutomationTransactions.TryPurchaseResearch(
                    settings,
                    rule,
                    SimulationAutomationPolicy.ForceBuyMax,
                    out long quantity);

            Assert.IsFalse(purchased);
            Assert.AreEqual(0L, quantity);
            Assert.AreEqual(100d, infinity.science, 0d);
            Assert.IsFalse(
                infinity.researchLevelsById.ContainsKey(
                    "test_research"));
        }

        [Test]
        public void ResearchAtContinuousMaximum_IsMaxedWithoutCharge()
        {
            Oracle.SaveDataSettings settings = CreateSettings();
            settings.dysonVerseSaveData.dysonVersePrestigeData
                .infinityAutoResearch = true;
            Oracle.DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData.dysonVerseInfinityData;
            infinity.science = 100d;
            infinity.researchLevelsById["test_research"] =
                double.MaxValue;
            var rule = new ResearchAutomationRule(
                "test_research",
                1d,
                1d,
                maxLevel: -1,
                ResearchAutoBuyGroup.None,
                prerequisiteResearchIds: null,
                prerequisiteFacilityId: null,
                prerequisiteFacilityOwned: 0d,
                percentPerLevel: 0d);

            bool purchased =
                DysonAutomationTransactions.TryPurchaseResearch(
                    settings,
                    rule,
                    SimulationAutomationPolicy.ForceBuyMax,
                    out long quantity);

            Assert.IsFalse(purchased);
            Assert.AreEqual(0L, quantity);
            Assert.AreEqual(100d, infinity.science, 0d);
            Assert.AreEqual(
                double.MaxValue,
                infinity.researchLevelsById["test_research"],
                0d);
        }

        private static Oracle.SaveDataSettings CreateSettings()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.dysonVerseSaveData
                .dysonVersePrestigeData.infinityAutoBots = true;
            return settings;
        }
    }
}
