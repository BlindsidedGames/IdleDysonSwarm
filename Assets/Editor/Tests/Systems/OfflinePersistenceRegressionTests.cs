using System;
using System.Globalization;
using Expansion;
using NUnit.Framework;
using Systems;
using Systems.Save;

/*
 * OfflinePersistenceRegressionTests
 * Purpose (editor tests): End-to-end regression harness for mixed symptoms (rollback + missing offline time).
 * Runs: Unity EditMode test runner (headless-friendly).
 * Primary entry points: NUnit [TestCase] matrix over 2m/15m/60m reopen windows.
 * Owns vs delegates:
 * - Owns scenario orchestration (save on lifecycle event -> reopen -> compute/apply away time).
 * - Delegates persistence encoding to CanonicalSaveStore and away/offline logic to runtime systems.
 *
 * Interacts with:
 * - Systems.Save.CanonicalSaveStore / SaveSystem / OfflineAwayTimeCalculator / OfflineLifecycleCoordinator
 * - Systems.OfflineProgressSystem
 * - Expansion.Oracle.SaveDataSettings
 *
 * Change notes:
 * - If save timestamping or away-time application changes, keep this matrix aligned to avoid silent regressions.
 * - This harness uses focus-loss save enabled to model mobile background behavior.
 */
namespace Tests.Systems
{
    [TestFixture]
    public sealed class OfflinePersistenceRegressionTests
    {
        private sealed class FakeClock : IClock
        {
            public DateTime UtcNow { get; set; }
        }

        private sealed class InMemoryStorage : ISaveStorage
        {
            public string DebugName => "in-memory";
            public string Text { get; private set; } = string.Empty;

            public bool Exists()
            {
                return !string.IsNullOrWhiteSpace(Text);
            }

            public bool TryReadText(out string text, out string error)
            {
                text = Text;
                error = Exists() ? null : "File not found.";
                return Exists();
            }

            public bool TryWriteTextAtomic(string text, out string error)
            {
                Text = text;
                error = null;
                return true;
            }
        }

        [TestCase(120d)]
        [TestCase(900d)]
        [TestCase(3600d)]
        public void ReopenCycle_PersistsLatestProgress_AndGrantsOfflineTime(double awaySeconds)
        {
            var storage = new InMemoryStorage();
            var saveStore = new CanonicalSaveStore(new SaveSystem(storage));
            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 18, 0, 0, DateTimeKind.Utc) };
            var awayCalculator = new OfflineAwayTimeCalculator(clock);
            var lifecycleEvents = new ManualLifecycleEvents();

            Oracle.SaveDataSettings current = CreateBaselineSave(clock.UtcNow);
            current.dysonVerseSaveData.dysonVerseInfinityData.money = 150;

            // Close #1: focus lost should stamp quit time and persist latest progress.
            using var coordinator = new OfflineLifecycleCoordinator(lifecycleEvents, phase =>
            {
                current.dateQuitString = clock.UtcNow.ToString(CultureInfo.InvariantCulture);
                Assert.IsTrue(saveStore.TrySave(current, out _, out string saveError), saveError);
            }, () => { }, reloadOnFocusGain: false, saveOnFocusLoss: true);

            lifecycleEvents.RaiseFocusChanged(false);
            clock.UtcNow = clock.UtcNow.AddSeconds(awaySeconds);

            // Reopen #1: load and apply offline return.
            Assert.IsTrue(saveStore.TryLoad(out current, out string firstLoadError), firstLoadError);
            double firstAway = awayCalculator.Compute(current).ClampedSeconds;
            OfflineProgressSystem.ApplyReturnValues(firstAway, CreateContext(current), ui: null);

            Assert.AreEqual(150d, current.dysonVerseSaveData.dysonVerseInfinityData.money, 0.001d, "Latest saved progress rolled back on reopen.");
            Assert.AreEqual(awaySeconds, current.offlineTime, 0.001d, "Offline time was not granted for first reopen.");

            // Close #2 + Reopen #2: verify repeated cycles keep latest state and add offline time exactly once per close/open.
            current.dysonVerseSaveData.dysonVerseInfinityData.money += 25d;
            lifecycleEvents.RaisePauseChanged(true);
            clock.UtcNow = clock.UtcNow.AddSeconds(awaySeconds / 2d);

            Assert.IsTrue(saveStore.TryLoad(out current, out string secondLoadError), secondLoadError);
            double secondAway = awayCalculator.Compute(current).ClampedSeconds;
            OfflineProgressSystem.ApplyReturnValues(secondAway, CreateContext(current), ui: null);

            Assert.AreEqual(175d, current.dysonVerseSaveData.dysonVerseInfinityData.money, 0.001d, "Second close/open lost latest saved progress.");
            Assert.AreEqual(awaySeconds + (awaySeconds / 2d), current.offlineTime, 0.001d, "Offline time accumulation across reopen cycles was incorrect.");
        }

        private static Oracle.SaveDataSettings CreateBaselineSave(DateTime startedUtc)
        {
            return new Oracle.SaveDataSettings
            {
                dateStarted = startedUtc.ToString(CultureInfo.InvariantCulture),
                offlineTime = 0d,
                maxOfflineTime = 100000d
            };
        }

        private static OfflineProgressContext CreateContext(Oracle.SaveDataSettings settings)
        {
            return new OfflineProgressContext
            {
                infinityData = settings.dysonVerseSaveData.dysonVerseInfinityData,
                prestigeData = settings.dysonVerseSaveData.dysonVersePrestigeData,
                skillTreeData = settings.dysonVerseSaveData.dysonVerseSkillTreeData,
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
