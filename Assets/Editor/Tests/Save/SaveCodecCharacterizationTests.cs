using System;
using Expansion;
using NUnit.Framework;
using Sirenix.Serialization;
using Systems.Save;

namespace Tests.Save
{
    [TestFixture]
    public sealed class SaveCodecCharacterizationTests
    {
        [Test]
        public void EncodeBinary_CompressTrue_TryDecodeBinary_RoundTripsBinaryPayload()
        {
            // Arrange: create a non-trivial settings object.
            var settings = new Oracle.SaveDataSettings
            {
                saveVersion = 10,
                dateStarted = "2026-02-09T00:00:00Z",
                debugOptions = true,
                doubleIp = true
            };
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = 123.45;
            settings.dysonVerseSaveData.dysonVerseInfinityData.science = 678.9;
            settings.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines = new double[] { 2, 3 };

            byte[] binary = SerializationUtility.SerializeValue(settings, DataFormat.Binary);

            // Act
            string encoded = SaveCodec.EncodeBinary(binary, compress: true);
            Assert.IsTrue(SaveCodec.TryDecodeBinary(encoded, out byte[] decoded));

            // Assert
            Assert.IsNotNull(encoded);
            Assert.IsTrue(encoded.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal), "Expected IDB1 prefix.");
            Assert.IsNotNull(decoded);
            CollectionAssert.AreEqual(binary, decoded, "Decoded bytes should match original binary payload.");
        }

        [Test]
        public void EncodeBinary_CompressTrue_UsesGzipHeader()
        {
            // Arrange
            byte[] payload = new byte[] { 1, 2, 3, 4, 5 };

            // Act
            string encoded = SaveCodec.EncodeBinary(payload, compress: true);

            // Assert
            Assert.IsTrue(encoded.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));
            string b64 = encoded.Substring(SaveCodec.BinarySavePrefix.Length);
            byte[] compressed = Convert.FromBase64String(b64);
            Assert.GreaterOrEqual(compressed.Length, 2);
            Assert.AreEqual(0x1F, compressed[0], "Gzip header byte 0 should be 0x1F.");
            Assert.AreEqual(0x8B, compressed[1], "Gzip header byte 1 should be 0x8B.");
        }
    }
}
