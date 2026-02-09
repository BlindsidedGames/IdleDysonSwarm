using NUnit.Framework;
using Expansion;
using Systems.Save;

namespace Tests.Save
{
    [TestFixture]
    public sealed class SaveSystemTests
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
                error = null;
                return Exists();
            }

            public bool TryWriteTextAtomic(string text, out string error)
            {
                error = null;
                Text = text;
                return true;
            }
        }

        [Test]
        public void SaveThenLoad_RoundTripsSettings()
        {
            var storage = new InMemoryStorage();
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
