using System;
using System.Text;
using Expansion;
using NUnit.Framework;
using Sirenix.Serialization;
using Systems.Save;
using UnityEngine;

namespace Tests.Save
{
    [TestFixture]
    public sealed class SaveCodecTests
    {
        [Test]
        public void EncodeBinary_CompressTrue_TryDecodeBinary_RoundTripsBytes()
        {
            byte[] payload = { 1, 2, 3, 4, 5, 6 };
            string encoded = SaveCodec.EncodeBinary(payload, compress: true);
            Assert.IsTrue(encoded.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));

            Assert.IsTrue(SaveCodec.TryDecodeBinary(encoded, out byte[] decoded));
            CollectionAssert.AreEqual(payload, decoded);
        }

        [Test]
        public void EncodeBinary_CompressFalse_TryDecodeBinary_RoundTripsBytes()
        {
            byte[] payload = { 10, 20, 30, 40, 50 };
            string encoded = SaveCodec.EncodeBinary(payload, compress: false);
            Assert.IsTrue(encoded.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));

            Assert.IsTrue(SaveCodec.TryDecodeBinary(encoded, out byte[] decoded));
            CollectionAssert.AreEqual(payload, decoded);
        }

        [Test]
        public void TryDecodeSaveSettings_Idb1Binary_Works()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.saveVersion = 10;
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = 42;
            settings.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines = new double[] { 1, 2 };

            byte[] binary = SerializationUtility.SerializeValue(settings, DataFormat.Binary);
            string encoded = SaveCodec.EncodeBinary(binary, compress: true);

            Assert.IsTrue(SaveCodec.TryDecodeSaveSettings(encoded, out Oracle.SaveDataSettings decoded));
            Assert.IsNotNull(decoded);
            Assert.AreEqual(10, decoded.saveVersion);
            Assert.AreEqual(42, decoded.dysonVerseSaveData.dysonVerseInfinityData.money);
            Assert.AreEqual(1, decoded.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines[0]);
            Assert.AreEqual(2, decoded.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines[1]);
        }

        [Test]
        public void TryDecodeSaveSettings_RawJson_Works()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.saveVersion = 10;
            settings.dysonVerseSaveData.dysonVerseInfinityData.science = 123;

            byte[] jsonBytes = SerializationUtility.SerializeValue(settings, DataFormat.JSON);
            string json = Encoding.UTF8.GetString(jsonBytes);

            Assert.IsTrue(SaveCodec.TryDecodeSaveSettings(json, out Oracle.SaveDataSettings decoded));
            Assert.IsNotNull(decoded);
            Assert.AreEqual(10, decoded.saveVersion);
            Assert.AreEqual(123, decoded.dysonVerseSaveData.dysonVerseInfinityData.science);
        }

        [Test]
        public void TryDecodeSaveSettings_ExportDtoJson_Works()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.saveVersion = 10;
            settings.dysonVerseSaveData.dysonVerseInfinityData.bots = 999;

            byte[] binary = SerializationUtility.SerializeValue(settings, DataFormat.Binary);
            byte[] compressed = SaveCodec.CompressBytes(binary);

            var dto = new ExportSaveDto
            {
                version = 10,
                format = "binary+gzip+base64",
                rawBytes = binary.Length,
                compressedBytes = compressed.Length,
                data = Convert.ToBase64String(compressed)
            };
            string json = JsonUtility.ToJson(dto);

            Assert.IsTrue(SaveCodec.TryDecodeSaveSettings(json, out Oracle.SaveDataSettings decoded));
            Assert.IsNotNull(decoded);
            Assert.AreEqual(999, decoded.dysonVerseSaveData.dysonVerseInfinityData.bots);
        }

        [Test]
        public void TryDecodeSaveSettings_LegacyBase64OfGzippedBinary_Works()
        {
            var settings = new Oracle.SaveDataSettings();
            settings.saveVersion = 10;
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = 7;

            byte[] binary = SerializationUtility.SerializeValue(settings, DataFormat.Binary);
            byte[] gz = SaveCodec.CompressBytes(binary);
            string legacy = Convert.ToBase64String(gz); // no prefix; legacy decode path detects gzip by magic bytes

            Assert.IsTrue(SaveCodec.TryDecodeSaveSettings(legacy, out Oracle.SaveDataSettings decoded));
            Assert.AreEqual(7, decoded.dysonVerseSaveData.dysonVerseInfinityData.money);
        }
    }
}
