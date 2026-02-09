using System;
using System.Linq;
using System.Reflection;
using Expansion;
using NUnit.Framework;
using Sirenix.Serialization;

namespace Tests.Save
{
    [TestFixture]
    public sealed class OracleSaveCodecCharacterizationTests
    {
        private static MethodInfo GetPrivateStatic(string name, params Type[] parameterTypes)
        {
            var method = typeof(Oracle).GetMethod(
                name,
                BindingFlags.NonPublic | BindingFlags.Static,
                binder: null,
                types: parameterTypes,
                modifiers: null);
            if (method == null)
            {
                Assert.Fail($"Missing private static Oracle.{name}({string.Join(",", parameterTypes.Select(t => t.Name))}).");
            }
            return method;
        }

        [Test]
        public void EncodeBinaryClipboardBytes_CompressTrue_RoundTripsBinaryPayload()
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

            MethodInfo encode = GetPrivateStatic("EncodeBinaryClipboardBytes", typeof(byte[]), typeof(bool));
            MethodInfo decode = GetPrivateStatic("DecodeBinaryClipboardBytes", typeof(string));

            // Act
            string encoded = (string)encode.Invoke(null, new object[] { binary, true });
            byte[] decoded = (byte[])decode.Invoke(null, new object[] { encoded });

            // Assert
            Assert.IsNotNull(encoded);
            Assert.IsTrue(encoded.StartsWith("IDB1:", StringComparison.Ordinal), "Expected IDB1 prefix.");
            Assert.IsNotNull(decoded);
            Assert.IsTrue(binary.SequenceEqual(decoded), "Decoded bytes should match original binary payload.");
        }

        [Test]
        public void EncodeBinaryClipboardBytes_CompressTrue_UsesGzipHeader()
        {
            // Arrange
            byte[] payload = new byte[] { 1, 2, 3, 4, 5 };
            MethodInfo encode = GetPrivateStatic("EncodeBinaryClipboardBytes", typeof(byte[]), typeof(bool));

            // Act
            string encoded = (string)encode.Invoke(null, new object[] { payload, true });

            // Assert
            Assert.IsTrue(encoded.StartsWith("IDB1:", StringComparison.Ordinal));
            string b64 = encoded.Substring("IDB1:".Length);
            byte[] compressed = Convert.FromBase64String(b64);
            Assert.GreaterOrEqual(compressed.Length, 2);
            Assert.AreEqual(0x1F, compressed[0], "Gzip header byte 0 should be 0x1F.");
            Assert.AreEqual(0x8B, compressed[1], "Gzip header byte 1 should be 0x8B.");
        }
    }
}

