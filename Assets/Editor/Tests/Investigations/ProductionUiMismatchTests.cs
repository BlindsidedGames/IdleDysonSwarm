using NUnit.Framework;
using Systems;
using static Expansion.Oracle;

/*
 * ProductionUiMismatchTests
 * Purpose (editor tests): Diagnoses whether displayed production rate fields match actual applied per-second gains.
 * Runs: Unity EditMode test runner (no PlayMode dependencies).
 * Primary entry points: NUnit [Test] cases in this file.
 * Owns vs delegates:
 * - Owns parity assertions between UI-facing production fields and resource deltas after one production step.
 * - Delegates production math and facility runtime effects to Systems.ProductionSystem and the GameData pipelines.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/ProductionSystem.cs
 * - Assets/Scripts/Buildings/FacilityBuildingPresenter.cs (consumes displayed fields under test)
 * - Assets/Scripts/Buildings/BotPanelManager.cs (uses aggregate rates shown in progress bars)
 * - Assets/Editor/Tests/Investigations/TestGameDataRegistryScope.cs
 *
 * Change notes:
 * - If ProductionSystem field semantics change (e.g., displayed base vs total naming), update parity assertions.
 * - If facility/skill/effect IDs or formulas are refactored, these tests must be updated to keep mismatch diagnosis valid.
 * - These tests intentionally fail when a mismatch exists; converting to characterization tests would hide regressions.
 */
namespace Tests.Investigations
{
    [TestFixture]
    public sealed class ProductionUiMismatchTests
    {
        private const double DeltaTimeSeconds = 1.0;
        private const double Tolerance = 1e-9;

        [Test]
        public void DataCenters_DisplayedRate_Equals_AppliedServerGainRate()
        {
            using var registryScope = new TestGameDataRegistryScope();
            DysonVerseInfinityData infinityData = CreateInfinityData();
            DysonVerseSkillTreeData skillTreeData = new DysonVerseSkillTreeData
            {
                rudimentarySingularity = true
            };
            DysonVersePrestigeData prestigeData = new DysonVersePrestigeData();
            PrestigePlus prestigePlus = new PrestigePlus();

            infinityData.dataCenters[0] = 100;
            infinityData.rudimentrySingularityProduction = 5;

            double serversBefore = infinityData.servers[0];
            ProductionSystem.CalculateDataCenterProduction(infinityData, skillTreeData, prestigeData, prestigePlus, DeltaTimeSeconds);
            double appliedServerGain = infinityData.servers[0] - serversBefore;

            Assert.That(appliedServerGain, Is.GreaterThan(0), "Expected data center production to add servers.");
            Assert.That(infinityData.dataCenterServerProduction, Is.EqualTo(appliedServerGain).Within(Tolerance),
                "Displayed data center server rate should match actual server gain per second.");
        }

        [Test]
        public void Planets_DisplayedRate_Equals_AppliedDataCenterGainRate()
        {
            using var registryScope = new TestGameDataRegistryScope();
            DysonVerseInfinityData infinityData = CreateInfinityData();
            DysonVerseSkillTreeData skillTreeData = new DysonVerseSkillTreeData
            {
                pocketDimensions = true
            };
            DysonVersePrestigeData prestigeData = new DysonVersePrestigeData();

            infinityData.planets[0] = 100;
            infinityData.workers = 100;

            double dataCentersBefore = infinityData.dataCenters[0];
            ProductionSystem.CalculatePlanetProduction(infinityData, skillTreeData, prestigeData, DeltaTimeSeconds);
            double appliedDataCenterGain = infinityData.dataCenters[0] - dataCentersBefore;

            Assert.That(appliedDataCenterGain, Is.GreaterThan(0), "Expected planet production to add data centers.");
            Assert.That(infinityData.planetsDataCenterProduction, Is.EqualTo(appliedDataCenterGain).Within(Tolerance),
                "Displayed planet data center rate should match actual data center gain per second.");
        }

        [Test]
        public void DataCenters_Control_NoRudimentary_ParityHolds()
        {
            using var registryScope = new TestGameDataRegistryScope();
            DysonVerseInfinityData infinityData = CreateInfinityData();
            DysonVerseSkillTreeData skillTreeData = new DysonVerseSkillTreeData
            {
                rudimentarySingularity = false
            };
            DysonVersePrestigeData prestigeData = new DysonVersePrestigeData();
            PrestigePlus prestigePlus = new PrestigePlus();

            infinityData.dataCenters[0] = 100;

            double serversBefore = infinityData.servers[0];
            ProductionSystem.CalculateDataCenterProduction(infinityData, skillTreeData, prestigeData, prestigePlus, DeltaTimeSeconds);
            double appliedServerGain = infinityData.servers[0] - serversBefore;

            Assert.That(appliedServerGain, Is.GreaterThan(0), "Expected control scenario to produce servers.");
            Assert.That(infinityData.dataCenterServerProduction, Is.EqualTo(appliedServerGain).Within(Tolerance),
                "Control scenario without rudimentary singularity should have matching displayed and applied rates.");
        }

        [Test]
        public void Planets_Control_NoPocketDimensions_ParityHolds()
        {
            using var registryScope = new TestGameDataRegistryScope();
            DysonVerseInfinityData infinityData = CreateInfinityData();
            DysonVerseSkillTreeData skillTreeData = new DysonVerseSkillTreeData
            {
                pocketDimensions = false
            };
            DysonVersePrestigeData prestigeData = new DysonVersePrestigeData();

            infinityData.planets[0] = 100;
            infinityData.workers = 100;

            double dataCentersBefore = infinityData.dataCenters[0];
            ProductionSystem.CalculatePlanetProduction(infinityData, skillTreeData, prestigeData, DeltaTimeSeconds);
            double appliedDataCenterGain = infinityData.dataCenters[0] - dataCentersBefore;

            Assert.That(appliedDataCenterGain, Is.GreaterThan(0), "Expected control scenario to produce data centers.");
            Assert.That(infinityData.planetsDataCenterProduction, Is.EqualTo(appliedDataCenterGain).Within(Tolerance),
                "Control scenario without pocket dimensions should have matching displayed and applied rates.");
        }

        private static DysonVerseInfinityData CreateInfinityData()
        {
            var infinityData = new DysonVerseInfinityData
            {
                dataCenterModifier = 1,
                planetModifier = 1,
                panelLifetime = 10
            };
            return infinityData;
        }
    }
}
