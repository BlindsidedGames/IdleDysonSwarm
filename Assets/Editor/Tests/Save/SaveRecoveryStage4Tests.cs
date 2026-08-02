/*
 * Purpose: Verifies Stage 4 clipboard, manual, console, legacy, and support-assisted imports share preparation policy.
 * Runs: Unity EditMode test runner only against immutable fixtures and disposable filesystem roots.
 * Primary entry points: NUnit format-unification, overwrite-policy, offline-baseline, and validation-parity tests.
 * Owns: Import arrangements, commit-before-publication assertions, and source/canonical byte-preservation checks.
 * Delegates: Production behavior to SaveRecoveryImportCoordinator, CanonicalSaveStore, and startup recovery policy.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/SaveRecoveryImportCoordinator.cs.
 * - Assets/Scripts/Systems/Save/StartupSaveRecoveryCoordinator.cs.
 * - Assets/Editor/Tests/Save/Fixtures/fixture-manifest.json.
 * - Assets/Editor/Tests/Save/SaveMigrationTestScope.cs.
 *
 * Change notes:
 * - Tests must never rewrite fixture bytes or use the game's real persistent-data path.
 * - A failed import must leave both the caller's publication slot and canonical artifact unchanged.
 * - Explicit overwrite coverage must retain the previous canonical artifact in transactional backups.
 */

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using Expansion;
using NUnit.Framework;
using Systems.Save;

namespace Tests.Save
{
    /// <summary>
    /// Exercises the shared Stage 4 recovery-import boundary without game lifecycle side effects.
    /// </summary>
    [TestFixture]
    public sealed class SaveRecoveryStage4Tests
    {
        private const string Schema7FixtureId = "schema-07-raw-json-20260202-045325";
        private const string Schema8DtoFixtureId = "schema-08-debug-dto-20260202-060115";
        private const string Schema8Idb1FixtureId = "schema-08-canonical-idb1-main-save";

        /// <summary>
        /// Verifies every supported clipboard family reaches the same schema 12 transactional import boundary.
        /// </summary>
        /// <param name="caseId">The fixture identifier or synthetic current-schema case.</param>
        [TestCase(Schema7FixtureId)]
        [TestCase(Schema8DtoFixtureId)]
        [TestCase(Schema8Idb1FixtureId)]
        [TestCase("current-uppercase-idb1")]
        [TestCase("current-lowercase-idb1")]
        public void ClipboardFormats_UseSamePreparedTransactionalRules(string caseId)
        {
            SaveFixtureDefinition fixture = null;
            string fixtureHashBefore = null;
            string text;
            int expectedSourceSchema;
            if (caseId.StartsWith("schema-", StringComparison.Ordinal))
            {
                fixture = SaveFixtureLoader.GetFixture(SaveFixtureLoader.LoadManifest(), caseId);
                text = SaveFixtureLoader.LoadText(fixture);
                fixtureHashBefore = SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath);
                expectedSourceSchema = fixture.sourceSchema;
            }
            else
            {
                text = Encode(CreateSettings(410d));
                if (caseId == "current-lowercase-idb1")
                {
                    text = "idb1:" + text.Substring(SaveCodec.BinarySavePrefix.Length);
                }

                expectedSourceSchema = 12;
            }

            using var migrationScope = new SaveMigrationTestScope();
            WithStore(
                migrationScope.CreatePreparationPipeline(),
                (store, coordinator, filePath, unusedBackupPath) =>
                {
                    Assert.IsTrue(
                        coordinator.TryImportText(
                            text,
                            allowCanonicalOverwrite: true,
                            beforeCommit: null,
                            out PreparedSaveResult sourcePreparation,
                            out Oracle.SaveDataSettings committed,
                            out string error),
                        error);

                    Assert.AreEqual(expectedSourceSchema, sourcePreparation.SourceSchema);
                    Assert.AreEqual(12, committed.saveVersion);
                    StringAssert.StartsWith(
                        SaveCodec.BinarySavePrefix,
                        File.ReadAllText(filePath));
                    Assert.IsTrue(
                        store.TryLoad(out Oracle.SaveDataSettings reread, out string readError),
                        readError);
                    Assert.AreEqual(12, reread.saveVersion);
                });

            if (fixture != null)
            {
                Assert.AreEqual(
                    fixtureHashBefore,
                    SaveFixtureLoader.ComputeFileSha256(fixture.fixturePath),
                    $"{fixture.id} was modified by Stage 4 import.");
            }
        }

        /// <summary>
        /// Verifies malformed clipboard data cannot replace canonical bytes or produce publishable runtime state.
        /// </summary>
        [Test]
        public void InvalidClipboard_DoesNotReplaceCanonicalOrPublishState()
        {
            WithStore(
                SavePreparationPipeline.CreateCurrentSchemaOnly(12),
                (store, coordinator, filePath, backupPath) =>
                {
                    Assert.IsTrue(store.TrySave(CreateSettings(420d), out _, out string seedError), seedError);
                    string canonicalBefore = File.ReadAllText(filePath);
                    int backupCountBefore = Directory.GetFiles(backupPath).Length;
                    Oracle.SaveDataSettings published = null;

                    bool imported = coordinator.TryImportText(
                        "IDB1:not-valid-base64",
                        allowCanonicalOverwrite: true,
                        beforeCommit: null,
                        out PreparedSaveResult preparation,
                        out Oracle.SaveDataSettings committed,
                        out string error);
                    if (imported)
                    {
                        published = committed;
                    }

                    Assert.IsFalse(imported);
                    Assert.IsNull(published);
                    Assert.IsNull(committed);
                    Assert.AreEqual(PreparedSaveFailureReason.DecodeFailed, preparation.FailureReason);
                    Assert.IsFalse(string.IsNullOrWhiteSpace(error));
                    Assert.AreEqual(canonicalBefore, File.ReadAllText(filePath));
                    Assert.AreEqual(backupCountBefore, Directory.GetFiles(backupPath).Length);
                });
        }

        /// <summary>
        /// Verifies imported historical quit time is removed and replaced by a deterministic fresh local baseline.
        /// </summary>
        [Test]
        public void ClipboardImport_ClearsHistoricalOfflineInputBeforeCommit()
        {
            DateTime now = new DateTime(2026, 7, 25, 3, 4, 5, DateTimeKind.Utc);
            Oracle.SaveDataSettings source = CreateSettings(430d);
            source.dateQuitString =
                new DateTime(2020, 2, 3, 4, 5, 6, DateTimeKind.Utc)
                    .ToString(CultureInfo.InvariantCulture);

            WithStore(
                SavePreparationPipeline.CreateCurrentSchemaOnly(12),
                (store, coordinator, filePath, unusedBackupPath) =>
                {
                    Assert.IsTrue(
                        coordinator.TryImportText(
                            Encode(source),
                            allowCanonicalOverwrite: true,
                            beforeCommit: null,
                            out _,
                            out Oracle.SaveDataSettings committed,
                            out string error),
                        error);

                    Assert.AreEqual(string.Empty, committed.dateQuitString);
                    Assert.AreEqual(
                        now.ToString(CultureInfo.InvariantCulture),
                        committed.lastSuccessfulLoadUtc);
                    Assert.IsTrue(
                        store.TryLoad(out Oracle.SaveDataSettings reread, out string readError),
                        readError);
                    Assert.AreEqual(string.Empty, reread.dateQuitString);
                    Assert.AreEqual(
                        now.ToString(CultureInfo.InvariantCulture),
                        reread.lastSuccessfulLoadUtc);
                    Assert.AreEqual(430d, reread.dysonVerseSaveData.dysonVerseInfinityData.money);
                    StringAssert.StartsWith(SaveCodec.BinarySavePrefix, File.ReadAllText(filePath));
                },
                () => now);
        }

        /// <summary>
        /// Verifies caller-local import adjustments are re-prepared before the returned graph can be published.
        /// </summary>
        [Test]
        public void LocalImportAdjustments_AreNormalizedBeforeCommitAndPublication()
        {
            using var migrationScope = new SaveMigrationTestScope();
            WithStore(
                migrationScope.CreatePreparationPipeline(),
                (unusedStore, coordinator, unusedFilePath, unusedBackupPath) =>
                {
                    Assert.IsTrue(
                        coordinator.TryImportText(
                            Encode(CreateSettings(435d)),
                            allowCanonicalOverwrite: true,
                            imported =>
                                imported.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines = null,
                            out _,
                            out Oracle.SaveDataSettings committed,
                            out string error),
                        error);

                    Assert.IsNotNull(
                        committed.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines);
                });
        }

        /// <summary>
        /// Verifies manual and startup recovery classify the same invalid candidate through the same store pipeline.
        /// </summary>
        [Test]
        public void ManualAndStartupRecovery_ProduceSameValidationClassification()
        {
            WithStore(
                SavePreparationPipeline.CreateCurrentSchemaOnly(12),
                (store, coordinator, filePath, unusedBackupPath) =>
                {
                    const string corrupt = "IDB1:AAAA";
                    File.WriteAllText(filePath, corrupt);
                    SaveStorageCandidate primary = store.DiscoverCandidates().Single();

                    Assert.IsFalse(
                        coordinator.TryPrepareCandidate(
                            primary,
                            out PreparedSaveResult manualPreparation,
                            out string manualError));
                    StartupSaveRecoveryResult startup =
                        new StartupSaveRecoveryCoordinator(store).Resolve();
                    StartupRecoveryCandidateAttempt startupAttempt = startup.Attempts.Single();

                    Assert.AreEqual(
                        manualPreparation.FailureReason,
                        startupAttempt.Preparation.FailureReason);
                    Assert.AreEqual(
                        manualPreparation.DecodeFailureReason,
                        startupAttempt.Preparation.DecodeFailureReason);
                    Assert.AreEqual(manualError, startupAttempt.Error);
                    Assert.AreEqual(corrupt, File.ReadAllText(filePath));
                });
        }

        /// <summary>
        /// Verifies a legacy candidate cannot overwrite canonical data without approval and preserves it after approval.
        /// </summary>
        [Test]
        public void LegacyRecovery_RequiresExplicitOverwriteAndPreservesPreviousCanonical()
        {
            WithStore(
                SavePreparationPipeline.CreateCurrentSchemaOnly(12),
                (store, coordinator, filePath, backupPath) =>
                {
                    Assert.IsTrue(store.TrySave(CreateSettings(440d), out _, out string seedError), seedError);
                    string canonicalBefore = File.ReadAllText(filePath);
                    var candidate = new SaveStorageCandidate(
                        SaveStorageCandidateSource.LegacyEs3,
                        "test-only-legacy.es3",
                        new DateTime(2021, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                        CreateSettings(441d));

                    Assert.IsFalse(
                        coordinator.TryImportCandidate(
                            candidate,
                            allowCanonicalOverwrite: false,
                            beforeCommit: null,
                            out PreparedSaveResult rejectedPreparation,
                            out Oracle.SaveDataSettings rejectedSettings,
                            out string rejection));
                    Assert.IsTrue(rejectedPreparation.Succeeded);
                    Assert.IsNull(rejectedSettings);
                    StringAssert.Contains("Explicit overwrite approval", rejection);
                    Assert.AreEqual(canonicalBefore, File.ReadAllText(filePath));
                    Assert.IsEmpty(Directory.GetFiles(backupPath));

                    Assert.IsTrue(
                        coordinator.TryImportCandidate(
                            candidate,
                            allowCanonicalOverwrite: true,
                            beforeCommit: null,
                            out _,
                            out Oracle.SaveDataSettings committed,
                            out string importError),
                        importError);
                    Assert.AreEqual(441d, committed.dysonVerseSaveData.dysonVerseInfinityData.money);
                    Assert.IsTrue(
                        store.TryLoad(out Oracle.SaveDataSettings reread, out string readError),
                        readError);
                    Assert.AreEqual(441d, reread.dysonVerseSaveData.dysonVerseInfinityData.money);
                    Assert.IsTrue(
                        Directory.GetFiles(backupPath)
                            .Any(path => File.ReadAllText(path) == canonicalBefore),
                        "The explicitly replaced canonical artifact was not preserved.");
                });
        }

        /// <summary>
        /// Verifies console recovery during a blocked startup commits the repair and requests a clean startup reload.
        /// </summary>
        [Test]
        public void ConsoleRecovery_DuringBlockedStartup_CommitsThenLeavesRecoveryThroughCleanReload()
        {
            string root = Path.Combine(
                Path.GetTempPath(),
                "ids-console-blocked-recovery-" + Guid.NewGuid().ToString("N"));
            string filePath = Path.Combine(root, "save.txt");
            string backupPath = Path.Combine(root, "backups");
            Directory.CreateDirectory(root);
            Directory.CreateDirectory(backupPath);
            try
            {
                using var migrationScope = new SaveMigrationTestScope();
                var storage = new OdinStringFileStorage(filePath, backupPath, maxBackups: 5);
                var store = new CanonicalSaveStore(
                    new SaveSystem(storage, migrationScope.CreatePreparationPipeline()));
                const string invalidCanonical = "IDB1:not-valid-base64";
                File.WriteAllText(filePath, invalidCanonical);

                Oracle oracle = migrationScope.Subject;
                SetPrivateField(oracle, "_saveStore", store);
                SetPrivateField(
                    oracle,
                    "_recoveryListSnapshot",
                    new List<LegacyEs3RecoveryCandidate>
                    {
                        new LegacyEs3RecoveryCandidate(
                            "test-only-blocked-startup.es3",
                            CreateSettings(450d),
                            new DateTime(2026, 7, 25, 4, 5, 6, DateTimeKind.Utc),
                            trust: 4)
                    });
                SetPrivateField(oracle, "_startupRecoveryBlocked", true);
                SetPrivateField(oracle, "_canonicalWriteBlockedByUnpreparedArtifact", true);
                int reloadCount = 0;
                SetPrivateField(
                    oracle,
                    "_reloadAfterStartupRecoveryImport",
                    (Action)(() => reloadCount++));

                string result = oracle.RecoverApply(index: 1, overwriteCanonical: true);

                Assert.IsTrue(store.TryLoad(out Oracle.SaveDataSettings committed, out string loadError), loadError);
                Assert.AreEqual(450d, committed.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.IsTrue(
                    Directory.GetFiles(backupPath)
                        .Any(path => File.ReadAllText(path) == invalidCanonical),
                    "The blocked canonical artifact was not preserved before recovery.");
                Assert.AreEqual(1, reloadCount);
                Assert.IsFalse(oracle.Loaded);
                Assert.IsFalse(GetPrivateField<bool>(oracle, "_startupRecoveryBlocked"));
                Assert.IsFalse(GetPrivateField<bool>(oracle, "_canonicalWriteBlockedByUnpreparedArtifact"));
                Assert.IsFalse(GetPrivateField<bool>(oracle, "_isSaveReady"));
                Assert.IsNull(GetPrivateField<object>(oracle, "_startupRecoveryInteraction"));
                StringAssert.Contains("Restarting safely from the repaired save", result);
            }
            finally
            {
                try
                {
                    Directory.Delete(root, recursive: true);
                }
                catch
                {
                    // Best-effort test cleanup.
                }
            }
        }

        /// <summary>
        /// Runs one assertion against disposable production transactional storage.
        /// </summary>
        /// <param name="pipeline">The preparation pipeline under test.</param>
        /// <param name="assertion">The storage assertion.</param>
        /// <param name="utcNow">Optional deterministic import clock.</param>
        private static void WithStore(
            SavePreparationPipeline pipeline,
            Action<CanonicalSaveStore, SaveRecoveryImportCoordinator, string, string> assertion,
            Func<DateTime> utcNow = null)
        {
            string root = Path.Combine(
                Path.GetTempPath(),
                "ids-stage4-" + Guid.NewGuid().ToString("N"));
            string filePath = Path.Combine(root, "save.txt");
            string backupPath = Path.Combine(root, "backups");
            Directory.CreateDirectory(root);
            Directory.CreateDirectory(backupPath);
            try
            {
                var storage = new OdinStringFileStorage(filePath, backupPath, maxBackups: 5);
                var store = new CanonicalSaveStore(new SaveSystem(storage, pipeline));
                var coordinator = new SaveRecoveryImportCoordinator(store, utcNow);
                assertion(store, coordinator, filePath, backupPath);
            }
            finally
            {
                try
                {
                    Directory.Delete(root, recursive: true);
                }
                catch
                {
                    // Best-effort test cleanup.
                }
            }
        }

        /// <summary>
        /// Creates an independent current-schema save with one durable sentinel.
        /// </summary>
        /// <param name="money">The durable money sentinel.</param>
        /// <returns>The settings.</returns>
        private static Oracle.SaveDataSettings CreateSettings(double money)
        {
            var settings = new Oracle.SaveDataSettings { saveVersion = 12 };
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = money;
            return settings;
        }

        /// <summary>
        /// Encodes one save as canonical uppercase IDB1 text.
        /// </summary>
        /// <param name="settings">The save settings.</param>
        /// <returns>The canonical envelope.</returns>
        private static string Encode(Oracle.SaveDataSettings settings)
        {
            return SaveCodec.EncodeBinary(
                SaveCodec.SerializeSaveSettingsBinary(settings),
                compress: true);
        }

        /// <summary>
        /// Sets one private Oracle field without widening the runtime API for test-only state arrangement.
        /// </summary>
        private static void SetPrivateField(object target, string fieldName, object value)
        {
            FieldInfo field = target.GetType().GetField(
                fieldName,
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"Missing private field {fieldName}.");
            field.SetValue(target, value);
        }

        /// <summary>
        /// Reads one private Oracle field for focused recovery transition assertions.
        /// </summary>
        private static T GetPrivateField<T>(object target, string fieldName)
        {
            FieldInfo field = target.GetType().GetField(
                fieldName,
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"Missing private field {fieldName}.");
            return (T)field.GetValue(target);
        }
    }
}
