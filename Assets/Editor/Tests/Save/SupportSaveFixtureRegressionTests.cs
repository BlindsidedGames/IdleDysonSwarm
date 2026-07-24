/*
 * Purpose: Exercises privacy-safe player support saves through production decode, preparation, and startup selection.
 * Runs: Unity EditMode test runner only.
 * Primary entry points: NUnit manifest, immutable-byte, decoder, Stage 2 preparation, and Stage 3 decision tests.
 * Owns: Support-fixture privacy shape, hash enforcement, and read-only pipeline assertions.
 * Delegates: Fixture reads to SaveFixtureLoader and save behavior to SaveCodec, SaveSystem, and startup recovery.
 *
 * Interacts with:
 * - Assets/Editor/Tests/Save/Fixtures/support-fixture-manifest.json and its four neutral IDB1 fixtures.
 * - Assets/Editor/Tests/Save/SaveFixtureLoader.cs and SaveMigrationTestScope.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs and StartupSaveRecoveryCoordinator.cs.
 *
 * Change notes:
 * - Fixture bytes and hashes are immutable evidence; never regenerate or normalize them in place.
 * - Do not add sender names, addresses, message text, screenshots, or mailbox identifiers.
 * - Inline fixtures preserve the contiguous envelope token only; the attached case preserves the exact attachment file.
 * - The malformed cross-platform case must remain a classified blocking outcome unless a separately approved decoder fix
 *   defines a safe compatibility rule.
 */

using System;
using System.Linq;
using System.Text;
using Expansion;
using NUnit.Framework;
using Systems.Save;

namespace Tests.Save
{
    /// <summary>
    /// Verifies real support-save compatibility without retaining player identity or mutating source artifacts.
    /// </summary>
    [TestFixture]
    public sealed class SupportSaveFixtureRegressionTests
    {
        private const string Case01 = "support-case-01-attached";
        private const string Case02 = "support-case-02-inline-a";
        private const string Case03 = "support-case-03-inline-b";
        private const string Case04 = "support-case-04-cross-platform-import";

        private SupportSaveFixtureManifest _manifest;
        private string _fixtureDirectoryFingerprint;

        /// <summary>
        /// Loads a fresh support manifest and records the fixture-directory fingerprint.
        /// </summary>
        [OneTimeSetUp]
        public void OneTimeSetUp()
        {
            _manifest = SaveFixtureLoader.LoadSupportManifest();
            _fixtureDirectoryFingerprint = SaveFixtureLoader.ComputeFixtureDirectoryFingerprint();
        }

        /// <summary>
        /// Rechecks every support fixture and the directory fingerprint after all tests.
        /// </summary>
        [OneTimeTearDown]
        public void OneTimeTearDown()
        {
            foreach (SupportSaveFixtureDefinition fixture in _manifest.fixtures)
            {
                Assert.AreEqual(
                    fixture.sha256,
                    SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                    $"{fixture.id} changed during support regression tests.");
            }

            Assert.AreEqual(
                _fixtureDirectoryFingerprint,
                SaveFixtureLoader.ComputeFixtureDirectoryFingerprint(),
                "Support regression tests changed the immutable fixture directory.");
        }

        /// <summary>
        /// Verifies the support manifest has only the four neutral, privacy-safe cases and complete contracts.
        /// </summary>
        [Test]
        public void Manifest_DeclaresOnlyNeutralPrivacySafeCases()
        {
            Assert.AreEqual(4, _manifest.fixtures.Length);
            CollectionAssert.AreEquivalent(
                new[] { Case01, Case02, Case03, Case04 },
                _manifest.fixtures.Select(fixture => fixture.id).ToArray());
            foreach (SupportSaveFixtureDefinition fixture in _manifest.fixtures)
            {
                StringAssert.StartsWith("support-case-", fixture.id);
                StringAssert.StartsWith(
                    "Assets/Editor/Tests/Save/Fixtures/support-case-",
                    fixture.fixturePath);
                Assert.AreEqual(SaveFixtureLoader.CanonicalIdb1Format, fixture.format);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.sha256), fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.provenanceMonth), fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.neutralCase), fixture.id);
                Assert.That(
                    fixture.expectedOutcome,
                    Is.EqualTo("prepared-primary").Or.EqualTo("blocked-invalid-base64"),
                    fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.expectedDecodeFailure), fixture.id);
                Assert.IsFalse(string.IsNullOrWhiteSpace(fixture.limitation), fixture.id);
            }
        }

        /// <summary>
        /// Verifies one support envelope remains byte-exact and decodes through the production public entry point.
        /// </summary>
        /// <param name="fixtureId">The neutral support fixture identifier.</param>
        [TestCase(Case01)]
        [TestCase(Case02)]
        [TestCase(Case03)]
        [TestCase(Case04)]
        public void Fixture_RemainsByteExactAndDecodesWithoutMutation(string fixtureId)
        {
            SupportSaveFixtureDefinition fixture = GetFixture(fixtureId);
            byte[] firstRead = LoadBytes(fixture);
            byte[] secondRead = LoadBytes(fixture);
            string hashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath);
            string text = Encoding.UTF8.GetString(firstRead);

            Assert.AreNotSame(firstRead, secondRead, fixture.id);
            CollectionAssert.AreEqual(firstRead, secondRead, fixture.id);
            Assert.AreEqual(fixture.sha256, hashBefore, fixture.id);
            Assert.IsTrue(text.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal), fixture.id);
            Assert.AreEqual(text.Trim(), text, $"{fixture.id} contains non-envelope whitespace.");
            bool decodedSuccessfully = SaveCodec.TryDecodeSaveSettings(
                text,
                out Oracle.SaveDataSettings decoded,
                out SaveDecodeFailureReason decodeFailure);
            if (fixture.expectedOutcome == "blocked-invalid-base64")
            {
                Assert.IsFalse(decodedSuccessfully, fixture.id);
                Assert.IsNull(decoded, fixture.id);
                Assert.AreEqual(SaveDecodeFailureReason.InvalidBase64, decodeFailure, fixture.id);
                Assert.AreEqual(fixture.expectedDecodeFailure, decodeFailure.ToString(), fixture.id);
                Assert.AreEqual(-1, fixture.sourceSchema, fixture.id);
                Assert.AreEqual(
                    hashBefore,
                    SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                    fixture.id);
                return;
            }

            Assert.IsTrue(decodedSuccessfully, fixture.id);
            Assert.IsNotNull(decoded, fixture.id);
            Assert.AreEqual(SaveDecodeFailureReason.None, decodeFailure, fixture.id);
            Assert.AreEqual(fixture.expectedDecodeFailure, decodeFailure.ToString(), fixture.id);
            Assert.AreEqual(
                fixture.sourceSchema,
                decoded.saveVersion,
                $"{fixture.id} decoded schema was {decoded.saveVersion}.");
            Assert.AreEqual(hashBefore, SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath), fixture.id);
        }

        /// <summary>
        /// Verifies one real support save either prepares successfully or blocks with its expected classified failure.
        /// </summary>
        /// <param name="fixtureId">The neutral support fixture identifier.</param>
        [TestCase(Case01)]
        [TestCase(Case02)]
        [TestCase(Case03)]
        [TestCase(Case04)]
        public void Fixture_PreparesOrBlocksAsReadOnlyPrimary(string fixtureId)
        {
            SupportSaveFixtureDefinition fixture = GetFixture(fixtureId);
            string text = Encoding.UTF8.GetString(LoadBytes(fixture));
            string hashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath);
            using var scope = new SaveMigrationTestScope();
            var storage = new InMemoryTransactionalSaveStorage();
            storage.Seed(text);
            var store = new CanonicalSaveStore(
                new SaveSystem(storage, scope.CreatePreparationPipeline()));

            StartupSaveRecoveryResult result =
                new StartupSaveRecoveryCoordinator(store).Resolve();

            if (fixture.expectedOutcome == "blocked-invalid-base64")
            {
                Assert.AreEqual(
                    StartupSaveRecoveryStatus.AllCandidatesInvalid,
                    result.Status,
                    result.Error);
                Assert.IsTrue(result.IsBlocking, fixture.id);
                Assert.IsFalse(result.HasPublishableSettings, fixture.id);
                Assert.AreEqual(1, result.Attempts.Count, fixture.id);
                Assert.AreEqual(
                    PreparedSaveFailureReason.DecodeFailed,
                    result.Attempts[0].Preparation.FailureReason,
                    fixture.id);
                Assert.AreEqual(
                    SaveDecodeFailureReason.InvalidBase64,
                    result.Attempts[0].Preparation.DecodeFailureReason,
                    fixture.id);
                Assert.AreEqual(text, storage.Text, $"{fixture.id} blocked bytes were rewritten.");
                Assert.IsNull(storage.TempText, fixture.id);
                Assert.IsEmpty(storage.Backups, fixture.id);
                Assert.AreEqual(0, scope.SaveWriteCount, fixture.id);
                Assert.IsFalse(scope.Subject.Loaded, fixture.id);
                Assert.AreEqual(
                    hashBefore,
                    SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                    fixture.id);
                return;
            }

            Assert.AreEqual(StartupSaveRecoveryStatus.PrimaryReady, result.Status, result.Error);
            Assert.IsTrue(result.HasPublishableSettings, fixture.id);
            Assert.IsFalse(result.IsBlocking, fixture.id);
            Assert.AreEqual(11, result.Settings.saveVersion, fixture.id);
            Assert.AreEqual(text, storage.Text, $"{fixture.id} primary bytes were rewritten during startup.");
            Assert.IsNull(storage.TempText, fixture.id);
            Assert.IsEmpty(storage.Backups, fixture.id);
            Assert.AreEqual(0, scope.SaveWriteCount, $"{fixture.id} preparation requested a save write.");
            Assert.IsFalse(scope.Subject.Loaded, $"{fixture.id} preparation entered Oracle lifecycle.");
            Assert.AreEqual(hashBefore, SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath), fixture.id);
        }

        /// <summary>
        /// Finds one support fixture by its neutral manifest identifier.
        /// </summary>
        /// <param name="fixtureId">The fixture identifier.</param>
        /// <returns>The matching fixture definition.</returns>
        private SupportSaveFixtureDefinition GetFixture(string fixtureId)
        {
            return _manifest.fixtures.Single(
                fixture => string.Equals(fixture.id, fixtureId, StringComparison.Ordinal));
        }

        /// <summary>
        /// Reads a new byte array for one support fixture.
        /// </summary>
        /// <param name="fixture">The support fixture definition.</param>
        /// <returns>A newly allocated exact byte array.</returns>
        private static byte[] LoadBytes(SupportSaveFixtureDefinition fixture)
        {
            return System.IO.File.ReadAllBytes(
                SaveFixtureLoader.ResolveProjectPath(fixture.fixturePath));
        }
    }
}
