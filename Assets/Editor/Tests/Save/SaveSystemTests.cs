using NUnit.Framework;
using Expansion;
using Systems.Save;

namespace Tests.Save
{
    /// <summary>
    /// Verifies prepared transactional SaveSystem round trips.
    /// </summary>
    [TestFixture]
    public sealed class SaveSystemTests
    {
        /// <summary>
        /// Verifies a current snapshot is prepared, transactionally stored, and prepared again before load publication.
        /// </summary>
        [Test]
        public void SaveThenLoad_RoundTripsSettings()
        {
            var storage = new InMemoryTransactionalSaveStorage();
            var system = new SaveSystem(storage);

            var settings = new Oracle.SaveDataSettings();
            settings.saveVersion = 11;
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = 123.456;
            settings.dysonVerseSaveData.dysonVerseInfinityData.science = 42;

            Assert.IsTrue(system.TrySave(settings, out SaveStringStats stats, out string saveErr), saveErr);
            Assert.IsTrue(storage.Text.StartsWith(SaveCodec.BinarySavePrefix));
            // Disk and clipboard should share the same canonical encoding.
            byte[] raw = SaveCodec.SerializeSaveSettingsBinary(settings);
            Assert.AreEqual(SaveCodec.EncodeBinary(raw, compress: true), storage.Text);
            Assert.Greater(stats.RawBytes, 0);
            Assert.Greater(stats.CompressedBytes, 0);
            Assert.Greater(stats.EncodedChars, 0);

            Assert.IsTrue(system.TryLoad(out Oracle.SaveDataSettings loaded, out string loadErr), loadErr);
            Assert.IsNotNull(loaded);
            Assert.AreEqual(11, loaded.saveVersion);
            Assert.AreEqual(123.456, loaded.dysonVerseSaveData.dysonVerseInfinityData.money);
            Assert.AreEqual(42, loaded.dysonVerseSaveData.dysonVerseInfinityData.science);
        }
    }
}
