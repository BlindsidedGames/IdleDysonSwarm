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
 * - Delegates codec/storage behavior to SaveSystem via an in-memory ISaveStorage double.
 *
 * Interacts with:
 * - Systems.Save.CanonicalSaveStore
 * - Systems.Save.SaveSystem / ISaveStorage
 * - Expansion.Oracle.SaveDataSettings
 *
 * Change notes:
 * - If canonical encoding or write semantics change, update both this file and SaveSystem tests together.
 */
namespace Tests.Save
{
    [TestFixture]
    public sealed class CanonicalSaveStoreTests
    {
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

        [Test]
        public void TrySaveThenTryLoad_RoundTripsCanonicalSettings()
        {
            var storage = new InMemoryStorage();
            var store = new CanonicalSaveStore(new SaveSystem(storage));

            var settings = new Oracle.SaveDataSettings();
            settings.saveVersion = 11;
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = 42;
            settings.dysonVerseSaveData.dysonVerseInfinityData.science = 99;

            Assert.IsTrue(store.TrySave(settings, out SaveStringStats stats, out string saveError), saveError);
            Assert.Greater(stats.EncodedChars, 0);

            Assert.IsTrue(store.TryLoad(out Oracle.SaveDataSettings loaded, out string loadError), loadError);
            Assert.AreEqual(11, loaded.saveVersion);
            Assert.AreEqual(42, loaded.dysonVerseSaveData.dysonVerseInfinityData.money);
            Assert.AreEqual(99, loaded.dysonVerseSaveData.dysonVerseInfinityData.science);
        }

        [Test]
        public void TrySaveTwice_TryLoadReturnsLatestSnapshot()
        {
            var storage = new InMemoryStorage();
            var store = new CanonicalSaveStore(new SaveSystem(storage));

            var first = new Oracle.SaveDataSettings();
            first.dysonVerseSaveData.dysonVerseInfinityData.money = 100;
            Assert.IsTrue(store.TrySave(first, out _, out string firstSaveError), firstSaveError);

            var second = new Oracle.SaveDataSettings();
            second.dysonVerseSaveData.dysonVerseInfinityData.money = 250;
            Assert.IsTrue(store.TrySave(second, out _, out string secondSaveError), secondSaveError);

            Assert.IsTrue(store.TryLoad(out Oracle.SaveDataSettings loaded, out string loadError), loadError);
            Assert.AreEqual(250, loaded.dysonVerseSaveData.dysonVerseInfinityData.money);
        }
    }
}
