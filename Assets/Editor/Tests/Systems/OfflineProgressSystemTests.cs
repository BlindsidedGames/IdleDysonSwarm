using Expansion;
using NUnit.Framework;
using Systems;

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
        public void ApplyReturnValues_NegativeAwayTime_MarksCheaterAndClearsOfflineTime()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 200, maxOfflineTime: 600);

            OfflineProgressSystem.ApplyReturnValues(awayTime: -5, context, ui: null);

            Assert.IsTrue(context.saveSettings.cheater);
            Assert.AreEqual(0, context.saveSettings.offlineTime, 0.001);
            Assert.AreEqual(0, context.saveSettings.maxOfflineTime, 0.001);
        }

        [Test]
        public void ApplyReturnValues_TwoValidReopens_AccumulatesAcrossRuns()
        {
            OfflineProgressContext context = CreateContext(offlineTime: 0, maxOfflineTime: 1000);

            OfflineProgressSystem.ApplyReturnValues(awayTime: 120, context, ui: null);
            OfflineProgressSystem.ApplyReturnValues(awayTime: 300, context, ui: null);

            Assert.AreEqual(420, context.saveSettings.offlineTime, 0.001);
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
