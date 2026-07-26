using Expansion;
using NUnit.Framework;
using Systems.Save;

/*
 * CanonicalSaveStoreTests
 * Purpose (editor tests): Verifies ISaveStore wrapper behavior over SaveSystem canonical encoding.
 * Runs: Unity EditMode test runner (headless-friendly).
 * Primary entry points: NUnit [Test] cases in this file.
 * Owns vs delegates:
 * - Owns assertions for round-trip persistence and latest-write-wins behavior.
 * - Delegates preparation/storage behavior to SaveSystem via an in-memory transactional storage double.
 *
 * Interacts with:
 * - Systems.Save.CanonicalSaveStore
 * - Systems.Save.SaveSystem / ITransactionalSaveStorage
 * - Expansion.Oracle.SaveDataSettings
 *
 * Change notes:
 * - If canonical encoding or write semantics change, update both this file and SaveSystem tests together.
 */
namespace Tests.Save
{
    /// <summary>
    /// Verifies the Oracle-facing canonical store delegates only prepared transactional results.
    /// </summary>
    [TestFixture]
    public sealed class CanonicalSaveStoreTests
    {
        /// <summary>
        /// Verifies a current canonical snapshot round-trips through the prepared store seam.
        /// </summary>
        [Test]
        public void TrySaveThenTryLoad_RoundTripsCanonicalSettings()
        {
            var storage = new InMemoryTransactionalSaveStorage();
            var store = new CanonicalSaveStore(new SaveSystem(storage));

            var settings = new Oracle.SaveDataSettings();
            settings.saveVersion = 12;
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = 42;
            settings.dysonVerseSaveData.dysonVerseInfinityData.science = 99;

            Assert.IsTrue(store.TrySave(settings, out SaveStringStats stats, out string saveError), saveError);
            Assert.Greater(stats.EncodedChars, 0);

            Assert.IsTrue(store.TryLoad(out Oracle.SaveDataSettings loaded, out string loadError), loadError);
            Assert.AreEqual(12, loaded.saveVersion);
            Assert.AreEqual(42, loaded.dysonVerseSaveData.dysonVerseInfinityData.money);
            Assert.AreEqual(99, loaded.dysonVerseSaveData.dysonVerseInfinityData.science);
        }

        /// <summary>
        /// Verifies successive verified transactions publish only the latest snapshot.
        /// </summary>
        [Test]
        public void TrySaveTwice_TryLoadReturnsLatestSnapshot()
        {
            var storage = new InMemoryTransactionalSaveStorage();
            var store = new CanonicalSaveStore(new SaveSystem(storage));

            var first = new Oracle.SaveDataSettings();
            first.saveVersion = 12;
            first.dysonVerseSaveData.dysonVerseInfinityData.money = 100;
            Assert.IsTrue(store.TrySave(first, out _, out string firstSaveError), firstSaveError);

            var second = new Oracle.SaveDataSettings();
            second.saveVersion = 12;
            second.dysonVerseSaveData.dysonVerseInfinityData.money = 250;
            Assert.IsTrue(store.TrySave(second, out _, out string secondSaveError), secondSaveError);

            Assert.IsTrue(store.TryLoad(out Oracle.SaveDataSettings loaded, out string loadError), loadError);
            Assert.AreEqual(250, loaded.dysonVerseSaveData.dysonVerseInfinityData.money);
        }
    }
}
