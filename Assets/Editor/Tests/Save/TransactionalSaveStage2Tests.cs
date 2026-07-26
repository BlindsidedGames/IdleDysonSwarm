/*
 * Purpose: Verifies Stage 2 canonical transactions, backups, candidate discovery, and rejected-candidate preservation.
 * Runs: Unity EditMode test runner only on temporary filesystem roots.
 * Primary entry points: NUnit verified-write, failure, ordering, enumeration, candidate, and lowercase tests.
 * Owns: End-to-end storage/preparation assertions using disposable temp directories.
 * Delegates: Save policy to SaveSystem/SavePreparationPipeline and filesystem transactions to OdinStringFileStorage.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/SaveSystem.cs and SavePreparationPipeline.cs.
 * - Assets/Scripts/Systems/Save/OdinStringFileStorage.cs and SaveStorageCandidate.cs.
 * - Assets/Editor/Tests/Save/SaveMigrationTestScope.cs.
 *
 * Change notes:
 * - Every rejected candidate test must assert byte-identical preservation of the previous canonical artifact.
 * - Candidate enumeration tests must also preserve timestamps to catch accidental repair/prune behavior.
 * - Lowercase IDB1 may change on disk only after a successful prepared transactional save.
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using Expansion;
using NUnit.Framework;
using Systems.Migrations;
using Systems.Save;

namespace Tests.Save
{
    /// <summary>
    /// Exercises the Stage 2 prepared-save and verified canonical storage boundary.
    /// </summary>
    [TestFixture]
    public sealed class TransactionalSaveStage2Tests
    {
        /// <summary>
        /// Verifies a current snapshot round-trips through temp reread validation and canonical publication.
        /// </summary>
        [Test]
        public void VerifiedSaveAndLoad_RoundTripsPreparedCanonicalSnapshot()
        {
            WithStorage((storage, system, filePath, unusedBackupPath) =>
            {
                Oracle.SaveDataSettings source = CreateSettings(123.456d);

                Assert.IsTrue(system.TrySave(source, out SaveStringStats stats, out string saveError), saveError);
                Assert.Greater(stats.RawBytes, 0);
                Assert.Greater(stats.CompressedBytes, 0);
                Assert.Greater(stats.EncodedChars, 0);
                Assert.IsTrue(File.ReadAllText(filePath).StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));

                Assert.IsTrue(system.TryLoad(out Oracle.SaveDataSettings loaded, out string loadError), loadError);
                Assert.AreNotSame(source, loaded);
                Assert.AreEqual(12, loaded.saveVersion);
                Assert.AreEqual(123.456d, loaded.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.IsTrue(system.LastLoadPreparation.Succeeded);
            });
        }

        /// <summary>
        /// Verifies an injected atomic replace failure preserves the prior canonical file and verified temp artifact.
        /// </summary>
        [Test]
        public void ReplaceFailure_PreservesPreviousCanonicalAndVerifiedTemp()
        {
            WithStorage((storage, system, filePath, backupPath) =>
            {
                Assert.IsTrue(system.TrySave(CreateSettings(10d), out _, out string firstError), firstError);
                string canonicalBefore = File.ReadAllText(filePath);
                var failingStorage = new OdinStringFileStorage(
                    filePath,
                    backupPath,
                    maxBackups: 5,
                    replaceExistingFile: (_, _) => throw new IOException("Injected replace failure."));
                var failingSystem = new SaveSystem(
                    failingStorage,
                    SavePreparationPipeline.CreateCurrentSchemaOnly(12));

                Assert.IsFalse(
                    failingSystem.TrySave(CreateSettings(20d), out _, out string replaceError),
                    "Injected replacement unexpectedly succeeded.");

                StringAssert.Contains("Injected replace failure", replaceError);
                Assert.AreEqual(canonicalBefore, File.ReadAllText(filePath));
                Assert.IsTrue(File.Exists(filePath + ".tmp"), "Verified temp should remain for recovery inspection.");
                Assert.IsTrue(
                    SaveCodec.TryDecodeSaveSettings(
                        File.ReadAllText(filePath + ".tmp"),
                        out Oracle.SaveDataSettings tempSettings));
                Assert.AreEqual(20d, tempSettings.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.IsTrue(
                    Directory.GetFiles(backupPath).Any(path => File.ReadAllText(path) == canonicalBefore),
                    "Prior canonical content was not preserved as a backup.");
            });
        }

        /// <summary>
        /// Verifies semantically invalid temp bytes cannot replace a valid canonical artifact.
        /// </summary>
        [Test]
        public void InvalidTemp_NeverReplacesCanonical()
        {
            WithStorage((storage, system, filePath, unusedBackupPath) =>
            {
                Assert.IsTrue(system.TrySave(CreateSettings(30d), out _, out string seedError), seedError);
                string canonicalBefore = File.ReadAllText(filePath);
                SavePreparationPipeline pipeline = SavePreparationPipeline.CreateCurrentSchemaOnly(12);

                bool saved = storage.TryWriteTextVerified(
                    "IDB1:AAAA",
                    reread =>
                    {
                        PreparedSaveResult result = pipeline.PrepareText(reread);
                        return new SaveTextVerificationResult(result.Succeeded, result.Error);
                    },
                    out string error);

                Assert.IsFalse(saved);
                Assert.IsFalse(string.IsNullOrWhiteSpace(error));
                Assert.AreEqual(canonicalBefore, File.ReadAllText(filePath));
                Assert.AreEqual("IDB1:AAAA", File.ReadAllText(filePath + ".tmp"));
            });
        }

        /// <summary>
        /// Verifies newest-first backup discovery and pruning retain the deterministic configured set.
        /// </summary>
        [Test]
        public void BackupOrderingAndPruning_AreDeterministic()
        {
            WithStorage((unusedStorage, unusedSystem, filePath, backupPath) =>
            {
                var storage = new OdinStringFileStorage(filePath, backupPath, maxBackups: 2);
                Assert.IsTrue(storage.TryWriteTextAtomic("one", out string firstError), firstError);
                Assert.IsTrue(storage.TryWriteTextAtomic("two", out string secondError), secondError);
                string firstBackup = Directory.GetFiles(backupPath).Single();
                File.SetLastWriteTimeUtc(firstBackup, new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));

                Assert.IsTrue(storage.TryWriteTextAtomic("three", out string thirdError), thirdError);
                string secondBackup = Directory.GetFiles(backupPath).Single(path => path != firstBackup);
                File.SetLastWriteTimeUtc(secondBackup, new DateTime(2021, 1, 1, 0, 0, 0, DateTimeKind.Utc));

                Assert.IsTrue(storage.TryWriteTextAtomic("four", out string fourthError), fourthError);

                SaveStorageCandidate[] backups = storage.DiscoverCandidates()
                    .Where(candidate => candidate.Source == SaveStorageCandidateSource.CanonicalBackup)
                    .ToArray();
                Assert.AreEqual(2, backups.Length);
                CollectionAssert.AreEqual(
                    new[] { "three", "two" },
                    backups.Select(candidate => File.ReadAllText(candidate.Path)).ToArray());
                Assert.IsFalse(Directory.GetFiles(backupPath).Any(path => File.ReadAllText(path) == "one"));
            });
        }

        /// <summary>
        /// Verifies discovery ordering while proving no canonical/temp/backup bytes or timestamps change.
        /// </summary>
        [Test]
        public void CandidateEnumeration_IsDeterministicAndReadOnly()
        {
            WithStorage((storage, unusedSystem, filePath, backupPath) =>
            {
                File.WriteAllText(filePath, "primary", Encoding.UTF8);
                File.WriteAllText(filePath + ".tmp", "temporary", Encoding.UTF8);
                string olderBackup = Path.Combine(backupPath, Path.GetFileName(filePath) + ".older.bak");
                string newerBackup = Path.Combine(backupPath, Path.GetFileName(filePath) + ".newer.bak");
                File.WriteAllText(olderBackup, "older", Encoding.UTF8);
                File.WriteAllText(newerBackup, "newer", Encoding.UTF8);
                File.SetLastWriteTimeUtc(olderBackup, new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));
                File.SetLastWriteTimeUtc(newerBackup, new DateTime(2021, 1, 1, 0, 0, 0, DateTimeKind.Utc));
                string[] paths = { filePath, filePath + ".tmp", olderBackup, newerBackup };
                Dictionary<string, ArtifactSnapshot> before = paths.ToDictionary(
                    path => path,
                    ArtifactSnapshot.Capture,
                    StringComparer.Ordinal);
                var legacySettings = CreateSettings(77d);
                var explicitCandidates = new[]
                {
                    new SaveStorageCandidate(
                        SaveStorageCandidateSource.LegacyOdinJson,
                        "legacy-odin",
                        new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                        legacySettings),
                    new SaveStorageCandidate(
                        SaveStorageCandidateSource.LegacyEs3,
                        "legacy-es3",
                        new DateTime(2021, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                        legacySettings)
                };

                IReadOnlyList<SaveStorageCandidate> candidates = storage.DiscoverCandidates(explicitCandidates);

                CollectionAssert.AreEqual(
                    new[]
                    {
                        SaveStorageCandidateSource.CanonicalPrimary,
                        SaveStorageCandidateSource.CanonicalTemporary,
                        SaveStorageCandidateSource.CanonicalBackup,
                        SaveStorageCandidateSource.CanonicalBackup,
                        SaveStorageCandidateSource.LegacyEs3,
                        SaveStorageCandidateSource.LegacyOdinJson
                    },
                    candidates.Select(candidate => candidate.Source).ToArray());
                Assert.AreEqual(newerBackup, candidates[2].Path);
                Assert.AreEqual(olderBackup, candidates[3].Path);
                foreach (string path in paths)
                {
                    Assert.AreEqual(before[path], ArtifactSnapshot.Capture(path), path);
                }
            });
        }

        /// <summary>
        /// Verifies corrupt candidate text returns classified decode failure and cannot replace canonical storage.
        /// </summary>
        [Test]
        public void CorruptCandidate_CannotCommit()
        {
            AssertRejectedTextCandidate(
                "IDB1:AAAA",
                SavePreparationPipeline.CreateCurrentSchemaOnly(12),
                PreparedSaveFailureReason.DecodeFailed);
        }

        /// <summary>
        /// Verifies a future candidate returns unsupported-version failure and cannot replace canonical storage.
        /// </summary>
        [Test]
        public void FutureCandidate_CannotCommit()
        {
            AssertRejectedTextCandidate(
                Encode(CreateSettings(90d, schema: 13)),
                SavePreparationPipeline.CreateCurrentSchemaOnly(12),
                PreparedSaveFailureReason.UnsupportedFutureVersion);
        }

        /// <summary>
        /// Verifies a migration-failing candidate cannot replace canonical storage.
        /// </summary>
        [Test]
        public void MigrationFailingCandidate_CannotCommit()
        {
            var pipeline = new SavePreparationPipeline(
                11,
                working =>
                {
                    working.dysonVerseSaveData.dysonVerseInfinityData.money = 999d;
                    return new MigrationRunResult
                    {
                        Succeeded = false,
                        StartingVersion = working.saveVersion,
                        EndingVersion = working.saveVersion
                    };
                });
            AssertRejectedTextCandidate(
                Encode(CreateSettings(91d, schema: 8)),
                pipeline,
                PreparedSaveFailureReason.MigrationFailed);
        }

        /// <summary>
        /// Verifies lowercase input remains untouched on read/failure and becomes uppercase only after successful save.
        /// </summary>
        [Test]
        public void LowercaseInput_NormalizesOnDiskOnlyAfterSuccessfulPreparedSave()
        {
            WithStorage((unusedStorage, unusedSystem, filePath, backupPath) =>
            {
                string uppercase = Encode(CreateSettings(101d));
                string lowercase = "idb1:" + uppercase.Substring(SaveCodec.BinarySavePrefix.Length);
                File.WriteAllText(filePath, lowercase, Encoding.UTF8);
                var failingStorage = new OdinStringFileStorage(
                    filePath,
                    backupPath,
                    replaceExistingFile: (_, _) => throw new IOException("Injected replace failure."));
                var failingSystem = new SaveSystem(
                    failingStorage,
                    SavePreparationPipeline.CreateCurrentSchemaOnly(12));

                Assert.IsTrue(failingSystem.TryLoad(out Oracle.SaveDataSettings loaded, out string loadError), loadError);
                Assert.IsTrue(File.ReadAllText(filePath).StartsWith("idb1:", StringComparison.Ordinal));
                Assert.IsFalse(failingSystem.TrySave(loaded, out _, out _));
                Assert.IsTrue(File.ReadAllText(filePath).StartsWith("idb1:", StringComparison.Ordinal));

                var successfulSystem = new SaveSystem(
                    new OdinStringFileStorage(filePath, backupPath),
                    SavePreparationPipeline.CreateCurrentSchemaOnly(12));
                Assert.IsTrue(successfulSystem.TrySave(loaded, out _, out string saveError), saveError);
                Assert.IsTrue(
                    File.ReadAllText(filePath).StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));
            });
        }

        /// <summary>
        /// Verifies an explicit decoded legacy candidate is deep-copied, prepared, and transactionally committed.
        /// </summary>
        [Test]
        public void ExplicitLegacyCandidate_PreparesAndCommitsWithoutMutatingAdapterObject()
        {
            WithStorage((unusedStorage, unusedSystem, filePath, backupPath) =>
            {
                SaveFixtureManifest manifest = SaveFixtureLoader.LoadManifest();
                SaveFixtureDefinition fixture = SaveFixtureLoader.GetFixture(
                    manifest,
                    "schema-08-canonical-idb1-main-save");
                Assert.IsTrue(SaveFixtureLoader.TryDecode(fixture, out Oracle.SaveDataSettings legacy));
                string legacyHashBefore = SaveFixtureLoader.ComputeSaveDataSha256(legacy);
                var candidate = new SaveStorageCandidate(
                    SaveStorageCandidateSource.LegacyEs3,
                    "explicit-es3-candidate",
                    DateTime.UtcNow,
                    legacy);

                using var scope = new SaveMigrationTestScope();
                var system = new SaveSystem(
                    new OdinStringFileStorage(filePath, backupPath),
                    scope.CreatePreparationPipeline());
                Assert.IsTrue(
                    system.TryCommitCandidate(candidate, out PreparedSaveResult result, out string error),
                    error);

                Assert.IsTrue(result.Succeeded);
                Assert.AreEqual(12, result.PreparedSchema);
                Assert.IsTrue(File.ReadAllText(filePath).StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal));
                Assert.AreEqual(legacyHashBefore, SaveFixtureLoader.ComputeSaveDataSha256(legacy));
                Assert.AreEqual(8, legacy.saveVersion);
                Assert.AreEqual(0, scope.SaveWriteCount);
            });
        }

        /// <summary>
        /// Verifies existing ES3/Odin adapter outputs become deterministic explicit candidates without artifact writes.
        /// </summary>
        [Test]
        public void ExistingLegacyAdapters_ProduceReadOnlyExplicitCandidates()
        {
            WithStorage((unusedStorage, unusedSystem, filePath, unusedBackupPath) =>
            {
                string odinPath = filePath + ".idsOdin";
                Oracle.SaveDataSettings odinSettings = CreateSettings(201d, schema: 8);
                File.WriteAllBytes(odinPath, SaveCodec.SerializeSaveSettingsJson(odinSettings));
                ArtifactSnapshot odinBefore = ArtifactSnapshot.Capture(odinPath);
                Oracle.SaveDataSettings es3Settings = CreateSettings(202d, schema: 8);
                string es3HashBefore = SaveFixtureLoader.ComputeSaveDataSha256(es3Settings);
                var es3 = new LegacyEs3RecoveryCandidate(
                    "synthetic-es3",
                    es3Settings,
                    new DateTime(2022, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    trust: 4);

                IReadOnlyList<SaveStorageCandidate> candidates =
                    LegacySaveCandidateAdapter.FromExistingAdapterResults(new[] { es3 }, odinPath);

                Assert.AreEqual(2, candidates.Count);
                Assert.AreEqual(SaveStorageCandidateSource.LegacyEs3, candidates[0].Source);
                Assert.AreEqual(SaveStorageCandidateSource.LegacyOdinJson, candidates[1].Source);
                Assert.AreEqual(202d, candidates[0].DecodedSettings.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.AreEqual(201d, candidates[1].DecodedSettings.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.AreEqual(odinBefore, ArtifactSnapshot.Capture(odinPath));
                Assert.AreEqual(es3HashBefore, SaveFixtureLoader.ComputeSaveDataSha256(es3Settings));
            });
        }

        /// <summary>
        /// Verifies an unprepared existing canonical artifact blocks later Oracle autosave publication.
        /// </summary>
        [Test]
        public void UnpreparedCanonicalArtifact_BlocksOrdinaryOracleWrites()
        {
            FieldInfo writeBlockField = typeof(Oracle).GetField(
                "_canonicalWriteBlockedByUnpreparedArtifact",
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(writeBlockField);

            using var scope = new SaveMigrationTestScope();
            scope.Subject.saveSettings = CreateSettings(111d);
            writeBlockField.SetValue(scope.Subject, true);

            Assert.IsFalse(scope.Subject.TrySaveState(out string error));
            StringAssert.Contains("blocked", error);
            Assert.AreEqual(0, scope.SaveWriteCount);
        }

        /// <summary>
        /// Asserts rejected filesystem candidate text leaves the previous canonical artifact byte-identical.
        /// </summary>
        /// <param name="candidateText">The rejected candidate text.</param>
        /// <param name="pipeline">The preparation behavior under test.</param>
        /// <param name="expectedReason">The expected failure category.</param>
        private static void AssertRejectedTextCandidate(
            string candidateText,
            SavePreparationPipeline pipeline,
            PreparedSaveFailureReason expectedReason)
        {
            WithStorage((storage, system, filePath, unusedBackupPath) =>
            {
                Assert.IsTrue(system.TrySave(CreateSettings(55d), out _, out string seedError), seedError);
                string canonicalBefore = File.ReadAllText(filePath);
                string candidatePath = filePath + ".candidate";
                File.WriteAllText(candidatePath, candidateText, Encoding.UTF8);
                var candidate = new SaveStorageCandidate(
                    SaveStorageCandidateSource.CanonicalTemporary,
                    candidatePath,
                    File.GetLastWriteTimeUtc(candidatePath));
                var candidateSystem = new SaveSystem(storage, pipeline);

                Assert.IsFalse(
                    candidateSystem.TryCommitCandidate(
                        candidate,
                        out PreparedSaveResult result,
                        out string error));

                Assert.IsNotNull(result);
                Assert.AreEqual(expectedReason, result.FailureReason);
                Assert.IsFalse(string.IsNullOrWhiteSpace(error));
                Assert.AreEqual(canonicalBefore, File.ReadAllText(filePath));
                Assert.AreEqual(candidateText, File.ReadAllText(candidatePath));
            });
        }

        /// <summary>
        /// Runs an assertion against a disposable production filesystem storage root.
        /// </summary>
        /// <param name="assertion">The storage assertion.</param>
        private static void WithStorage(
            Action<OdinStringFileStorage, SaveSystem, string, string> assertion)
        {
            string root = Path.Combine(Path.GetTempPath(), "ids-stage2-" + Guid.NewGuid().ToString("N"));
            string filePath = Path.Combine(root, "save.txt");
            string backupPath = Path.Combine(root, "backups");
            Directory.CreateDirectory(root);
            Directory.CreateDirectory(backupPath);
            try
            {
                var storage = new OdinStringFileStorage(filePath, backupPath, maxBackups: 5);
                var system = new SaveSystem(
                    storage,
                    SavePreparationPipeline.CreateCurrentSchemaOnly(12));
                assertion(storage, system, filePath, backupPath);
            }
            finally
            {
                try
                {
                    Directory.Delete(root, true);
                }
                catch
                {
                    // Best-effort test cleanup.
                }
            }
        }

        /// <summary>
        /// Creates a current or explicitly versioned minimal valid save.
        /// </summary>
        /// <param name="money">The durable money sentinel.</param>
        /// <param name="schema">The source schema.</param>
        /// <returns>The settings.</returns>
        private static Oracle.SaveDataSettings CreateSettings(double money, int schema = 12)
        {
            var settings = new Oracle.SaveDataSettings { saveVersion = schema };
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = money;
            return settings;
        }

        /// <summary>
        /// Encodes settings into canonical uppercase IDB1 text without preparing them.
        /// </summary>
        /// <param name="settings">The settings to serialize.</param>
        /// <returns>The canonical envelope.</returns>
        private static string Encode(Oracle.SaveDataSettings settings)
        {
            return SaveCodec.EncodeBinary(SaveCodec.SerializeSaveSettingsBinary(settings), true);
        }

        /// <summary>
        /// Captures file bytes and last-write time for read-only discovery assertions.
        /// </summary>
        private readonly struct ArtifactSnapshot : IEquatable<ArtifactSnapshot>
        {
            private readonly string _text;
            private readonly DateTime _lastWriteUtc;

            /// <summary>
            /// Creates an artifact snapshot.
            /// </summary>
            /// <param name="text">The exact text.</param>
            /// <param name="lastWriteUtc">The last-write timestamp.</param>
            private ArtifactSnapshot(string text, DateTime lastWriteUtc)
            {
                _text = text;
                _lastWriteUtc = lastWriteUtc;
            }

            /// <summary>
            /// Captures one file.
            /// </summary>
            /// <param name="path">The exact path.</param>
            /// <returns>The immutable snapshot.</returns>
            internal static ArtifactSnapshot Capture(string path)
            {
                return new ArtifactSnapshot(File.ReadAllText(path), File.GetLastWriteTimeUtc(path));
            }

            /// <summary>
            /// Compares snapshots by exact text and timestamp.
            /// </summary>
            /// <param name="other">The other snapshot.</param>
            /// <returns><see langword="true"/> when both values match.</returns>
            public bool Equals(ArtifactSnapshot other)
            {
                return string.Equals(_text, other._text, StringComparison.Ordinal) &&
                       _lastWriteUtc == other._lastWriteUtc;
            }

            /// <summary>
            /// Compares a boxed snapshot.
            /// </summary>
            /// <param name="obj">The other value.</param>
            /// <returns><see langword="true"/> for an equal snapshot.</returns>
            public override bool Equals(object obj)
            {
                return obj is ArtifactSnapshot other && Equals(other);
            }

            /// <summary>
            /// Returns a combined value hash.
            /// </summary>
            /// <returns>The snapshot hash code.</returns>
            public override int GetHashCode()
            {
                unchecked
                {
                    return ((_text != null ? _text.GetHashCode() : 0) * 397) ^ _lastWriteUtc.GetHashCode();
                }
            }
        }
    }
}
