using System;
using Expansion;
using NUnit.Framework;
using Systems.Save;

/*
 * OfflineAwayTimeCalculatorTests
 * Purpose (editor tests): Verifies deterministic away-time source resolution and UTC delta/clamp behavior.
 * Runs: Unity EditMode test runner (headless-friendly).
 * Primary entry points: NUnit [Test] cases in this file.
 * Owns vs delegates:
 * - Owns expected behavior assertions for OfflineAwayTimeCalculator.
 * - Delegates production logic to Systems.Save.OfflineAwayTimeCalculator with a fake IClock.
 *
 * Interacts with:
 * - Systems.Save.OfflineAwayTimeCalculator
 * - Systems.Save.IClock (FakeClock test double)
 * - Expansion.Oracle.SaveDataSettings timestamps
 *
 * Change notes:
 * - Changing timestamp source priority or UTC parsing in runtime code requires synchronized updates here.
 */
namespace Tests.Systems
{
    [TestFixture]
    public sealed class OfflineAwayTimeCalculatorTests
    {
        private sealed class FakeClock : IClock
        {
            public DateTime UtcNow { get; set; }
        }

        [Test]
        public void Compute_MissingQuitString_ReturnsMissingSourceAndZero()
        {
            var settings = new Oracle.SaveDataSettings
            {
                dateStarted = "2026-02-15T16:00:00Z"
            };

            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 16, 10, 0, DateTimeKind.Utc) };
            var calculator = new OfflineAwayTimeCalculator(clock);

            OfflineAwayTimeCalculator.AwayTimeComputation result = calculator.Compute(settings);

            Assert.AreEqual(OfflineAwayTimeCalculator.AwayTimeSource.MissingQuitString, result.Source);
            Assert.IsFalse(result.HasQuitTimestampInput);
            Assert.AreEqual(0f, result.RawSeconds);
            Assert.AreEqual(0f, result.ClampedSeconds);
        }

        [Test]
        public void Compute_ValidQuitString_UsesQuitTimestamp()
        {
            var settings = new Oracle.SaveDataSettings
            {
                dateQuitString = "2026-02-15T16:00:00Z"
            };

            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 16, 15, 0, DateTimeKind.Utc) };
            var calculator = new OfflineAwayTimeCalculator(clock);

            OfflineAwayTimeCalculator.AwayTimeComputation result = calculator.Compute(settings);

            Assert.AreEqual(OfflineAwayTimeCalculator.AwayTimeSource.QuitString, result.Source);
            Assert.AreEqual(900f, result.ClampedSeconds, 0.001f);
        }

        [Test]
        public void Compute_InvalidQuitString_FallsBackToDateStarted()
        {
            var settings = new Oracle.SaveDataSettings
            {
                dateQuitString = "not-a-date",
                dateStarted = "2026-02-15T15:00:00Z"
            };

            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 15, 30, 0, DateTimeKind.Utc) };
            var calculator = new OfflineAwayTimeCalculator(clock);

            OfflineAwayTimeCalculator.AwayTimeComputation result = calculator.Compute(settings);

            Assert.AreEqual(OfflineAwayTimeCalculator.AwayTimeSource.DateStartedFallback, result.Source);
            Assert.AreEqual(1800f, result.ClampedSeconds, 0.001f);
        }

        [Test]
        public void Compute_InvalidQuitAndStarted_UsesRuntimeFallback()
        {
            var settings = new Oracle.SaveDataSettings
            {
                dateQuitString = "invalid-quit",
                dateStarted = "invalid-start"
            };

            var now = new DateTime(2026, 2, 15, 17, 0, 0, DateTimeKind.Utc);
            var clock = new FakeClock { UtcNow = now };
            var calculator = new OfflineAwayTimeCalculator(clock);

            OfflineAwayTimeCalculator.AwayTimeComputation result = calculator.Compute(settings);

            Assert.AreEqual(OfflineAwayTimeCalculator.AwayTimeSource.RuntimeUtcFallback, result.Source);
            Assert.AreEqual(0f, result.ClampedSeconds);
            Assert.AreEqual(now, result.ResolvedStartUtc);
            Assert.AreEqual(now, result.NowUtc);
        }

        [Test]
        public void Compute_OffsetTimestamp_ParsesAsUtc()
        {
            var settings = new Oracle.SaveDataSettings
            {
                dateQuitString = "2026-02-15T08:00:00-08:00"
            };

            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 16, 10, 0, DateTimeKind.Utc) };
            var calculator = new OfflineAwayTimeCalculator(clock);

            OfflineAwayTimeCalculator.AwayTimeComputation result = calculator.Compute(settings);

            Assert.AreEqual(OfflineAwayTimeCalculator.AwayTimeSource.QuitString, result.Source);
            Assert.AreEqual(600f, result.ClampedSeconds, 0.001f);
        }

        [Test]
        public void Compute_FutureQuitTimestamp_ClampsNegativeAwayTimeToZero()
        {
            var settings = new Oracle.SaveDataSettings
            {
                dateQuitString = "2026-02-15T17:00:00Z"
            };

            var clock = new FakeClock { UtcNow = new DateTime(2026, 2, 15, 16, 0, 0, DateTimeKind.Utc) };
            var calculator = new OfflineAwayTimeCalculator(clock);

            OfflineAwayTimeCalculator.AwayTimeComputation result = calculator.Compute(settings);

            Assert.Less(result.RawSeconds, 0f);
            Assert.AreEqual(0f, result.ClampedSeconds);
        }
    }
}
