/*
 * Purpose: Characterizes production SaveCodec compatibility against immutable schema-labelled save artifacts.
 * Runs: Unity EditMode test runner only.
 * Primary entry points: NUnit tests for manifest integrity, fixture decoding, sentinels, envelope failures, and IDB1 casing.
 * Owns: Stage 1A compatibility assertions only; it does not migrate, normalize, publish, or write save data.
 * Delegates: Fixture reads and hashes to SaveFixtureLoader; decoding and Odin deserialization to Systems.Save.SaveCodec.
 *
 * Interacts with:
 * - Assets/Editor/Tests/Save/Fixtures/fixture-manifest.json and its three immutable fixture files.
 * - Assets/Editor/Tests/Save/SaveFixtureLoader.cs.
 * - Systems.Save.SaveCodec and Expansion.Oracle.SaveDataSettings.
 *
 * Change notes:
 * - Guaranteed fixtures must never be regenerated or rewritten by tests.
 * - Lowercase idb1 is intentionally characterized as unsupported in Stage 1A; changing that assertion requires the
 *   narrowly scoped Stage 1B production compatibility change and its review.
 * - Sentinel changes require evidence that the source artifact changed intentionally; never refresh hashes silently.
 */

using System;
using System.Globalization;
using System.IO;
using System.Linq;
using Expansion;
using NUnit.Framework;
using Systems.Save;

namespace Tests.Save
{
    /// <summary>
    /// Verifies immutable fixture intake and decoder behavior without changing production save state.
    /// </summary>
    [TestFixture]
    public sealed class SaveCodecFixtureCharacterizationTests
    {
        private const string Schema7RawJsonId = "schema-07-raw-json-20260202-045325";
        private const string Schema8DebugDtoId = "schema-08-debug-dto-20260202-060115";
        private const string Schema8CanonicalIdb1Id = "schema-08-canonical-idb1-main-save";

        private SaveFixtureManifest _manifest;

        /// <summary>
        /// Loads a fresh manifest before the fixture characterization run.
        /// </summary>
        [OneTimeSetUp]
        public void OneTimeSetUp()
        {
            _manifest = SaveFixtureLoader.LoadManifest();
        }

        /// <summary>
        /// Rechecks every fixture and source digest after all characterization tests have completed.
        /// </summary>
        [OneTimeTearDown]
        public void OneTimeTearDown()
        {
            foreach (SaveFixtureDefinition fixture in _manifest.fixtures)
            {
                Assert.AreEqual(
                    fixture.sha256,
                    SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                    $"Fixture '{fixture.id}' changed during the test run.");
                Assert.AreEqual(
                    fixture.sha256,
                    SaveFixtureLoader.ComputeFileSha256(fixture.sourcePath),
                    $"Source artifact '{fixture.sourcePath}' changed during the test run.");
            }
        }

        /// <summary>
        /// Verifies the manifest contains exactly the three guaranteed, fully described artifacts.
        /// </summary>
        [Test]
        public void Manifest_DeclaresExactlyTheThreeGuaranteedArtifacts()
        {
            Assert.AreEqual(3, _manifest.fixtures.Length);
            CollectionAssert.AreEquivalent(
                new[] { Schema7RawJsonId, Schema8DebugDtoId, Schema8CanonicalIdb1Id },
                _manifest.fixtures.Select(fixture => fixture.id).ToArray());
            Assert.AreEqual(3, _manifest.fixtures.Select(fixture => fixture.id).Distinct().Count());

            foreach (SaveFixtureDefinition fixture in _manifest.fixtures)
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.sourcePath), fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.fixturePath), fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.sha256), fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.format), fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.provenanceDate), fixture.id);
                Assert.Greater(fixture.sourceSchema, 0, fixture.id);
                Assert.IsNotNull(fixture.sentinels, fixture.id);
                Assert.IsNotEmpty(fixture.sentinels, fixture.id);
            }
        }

        /// <summary>
        /// Verifies each copied fixture remains byte-identical to its source and decodes with matching durable state.
        /// </summary>
        /// <param name="fixtureId">The manifest identifier for the fixture under test.</param>
        [TestCase(Schema7RawJsonId)]
        [TestCase(Schema8DebugDtoId)]
        [TestCase(Schema8CanonicalIdb1Id)]
        public void Fixture_DecodesThroughSupportedEntryPointWithoutMutation(string fixtureId)
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, fixtureId);
            string directoryFingerprintBefore = SaveFixtureLoader.ComputeFixtureDirectoryFingerprint();
            string fixtureHashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath);
            string sourceHashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.sourcePath);
            DateTime fixtureWriteTimeBefore = File.GetLastWriteTimeUtc(
                SaveFixtureLoader.ResolveProjectPath(fixture.fixturePath));
            byte[] firstRead = SaveFixtureLoader.LoadBytes(fixture);
            byte[] secondRead = SaveFixtureLoader.LoadBytes(fixture);

            Assert.AreNotSame(firstRead, secondRead, "Fixture reads must not share mutable byte storage.");
            CollectionAssert.AreEqual(firstRead, secondRead, "Independent fixture reads must return identical bytes.");
            Assert.AreEqual(fixture.sha256, fixtureHashBefore, fixture.id);
            Assert.AreEqual(fixture.sha256, sourceHashBefore, fixture.sourcePath);
            Assert.IsTrue(SaveFixtureLoader.TryDecode(fixture, out Oracle.SaveDataSettings decoded), fixture.id);
            Assert.IsNotNull(decoded, fixture.id);
            Assert.AreEqual(fixture.sourceSchema, decoded.saveVersion, fixture.id);
            AssertSentinels(fixture, decoded);

            Assert.AreEqual(fixtureHashBefore, SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath), fixture.id);
            Assert.AreEqual(sourceHashBefore, SaveFixtureLoader.ComputeFileSha256(fixture.sourcePath), fixture.sourcePath);
            Assert.AreEqual(
                fixtureWriteTimeBefore,
                File.GetLastWriteTimeUtc(SaveFixtureLoader.ResolveProjectPath(fixture.fixturePath)),
                $"Reading fixture '{fixture.id}' changed its write timestamp.");
            Assert.AreEqual(
                directoryFingerprintBefore,
                SaveFixtureLoader.ComputeFixtureDirectoryFingerprint(),
                $"Decoding fixture '{fixture.id}' changed fixture-directory contents.");
        }

        /// <summary>
        /// Verifies the canonical fixture uses uppercase IDB1 and decodes through binary and Odin public APIs.
        /// </summary>
        [Test]
        public void CanonicalUppercaseIdb1_DecodesThroughBinaryAndOdinEntryPoints()
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, Schema8CanonicalIdb1Id);
            string text = SaveFixtureLoader.LoadText(fixture);

            Assert.IsTrue(text.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));
            Assert.IsTrue(SaveCodec.TryDecodeBinary(text, out byte[] binary));
            Assert.IsNotEmpty(binary);
            Assert.IsTrue(SaveCodec.TryDeserializeSaveSettings(
                binary,
                Sirenix.Serialization.DataFormat.Binary,
                out Oracle.SaveDataSettings decoded));
            Assert.AreEqual(fixture.sourceSchema, decoded.saveVersion);
        }

        /// <summary>
        /// Records the current lowercase idb1 failure as the explicit narrowly scoped Stage 1B compatibility change.
        /// </summary>
        [Test]
        public void CanonicalLowercaseIdb1_CurrentlyFailsAndDefinesStage1BCompatibilityWork()
        {
            SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(_manifest, Schema8CanonicalIdb1Id);
            string uppercase = SaveFixtureLoader.LoadText(fixture);
            string lowercase = "idb1:" + uppercase.Substring(SaveCodec.BinarySavePrefix.Length);
            Oracle publicationBefore = Oracle.oracle;
            string fixtureFingerprintBefore = SaveFixtureLoader.ComputeFixtureDirectoryFingerprint();

            bool decoded = SaveCodec.TryDecodeSaveSettings(lowercase, out Oracle.SaveDataSettings settings);

            Assert.IsFalse(
                decoded,
                "When Stage 1B adds case-insensitive IDB1 input support, update this characterization to require success.");
            Assert.IsNull(settings, "Failed lowercase decoding must not return publishable settings.");
            Assert.AreSame(publicationBefore, Oracle.oracle, "Decoder characterization must not publish runtime state.");
            Assert.AreEqual(
                fixtureFingerprintBefore,
                SaveFixtureLoader.ComputeFixtureDirectoryFingerprint(),
                "Lowercase decoding must not write fixture data.");
        }

        /// <summary>
        /// Verifies malformed and unsupported envelopes fail without runtime publication or fixture writes.
        /// </summary>
        /// <param name="candidate">The malformed or unsupported candidate text.</param>
        [TestCase("IDB1:not-valid-base64")]
        [TestCase("IDB2:SGVsbG8=")]
        [TestCase("IDSZ2:SGVsbG8=")]
        public void MalformedOrUnsupportedEnvelope_FailsWithoutPublicationOrWrites(string candidate)
        {
            Oracle publicationBefore = Oracle.oracle;
            string fixtureFingerprintBefore = SaveFixtureLoader.ComputeFixtureDirectoryFingerprint();

            bool decoded = SaveCodec.TryDecodeSaveSettings(candidate, out Oracle.SaveDataSettings settings);

            Assert.IsFalse(decoded);
            Assert.IsNull(settings);
            Assert.AreSame(publicationBefore, Oracle.oracle, "Failed decoding must not publish runtime state.");
            Assert.AreEqual(
                fixtureFingerprintBefore,
                SaveFixtureLoader.ComputeFixtureDirectoryFingerprint(),
                "Failed decoding must not write fixture data.");
        }

        /// <summary>
        /// Compares every manifest sentinel with its decoded durable field value.
        /// </summary>
        /// <param name="fixture">The fixture definition containing the sentinel contract.</param>
        /// <param name="decoded">The decoded source-schema settings.</param>
        private static void AssertSentinels(SaveFixtureDefinition fixture, Oracle.SaveDataSettings decoded)
        {
            foreach (SaveFixtureSentinel sentinel in fixture.sentinels)
            {
                object actual = SaveFixtureLoader.ReadSentinelValue(decoded, sentinel.path);
                string message = $"{fixture.id} sentinel '{sentinel.path}'";

                switch (sentinel.kind)
                {
                    case "string":
                        Assert.AreEqual(sentinel.value, actual as string, message);
                        break;
                    case "bool":
                        Assert.AreEqual(bool.Parse(sentinel.value), Convert.ToBoolean(actual, CultureInfo.InvariantCulture), message);
                        break;
                    case "double":
                        Assert.AreEqual(
                            SaveFixtureLoader.ParseDouble(sentinel.value),
                            Convert.ToDouble(actual, CultureInfo.InvariantCulture),
                            0d,
                            message);
                        break;
                    case "int64":
                        Assert.AreEqual(
                            long.Parse(sentinel.value, NumberStyles.Integer, CultureInfo.InvariantCulture),
                            Convert.ToInt64(actual, CultureInfo.InvariantCulture),
                            message);
                        break;
                    default:
                        Assert.Fail($"{message} has unsupported kind '{sentinel.kind}'.");
                        break;
                }
            }
        }
    }
}
