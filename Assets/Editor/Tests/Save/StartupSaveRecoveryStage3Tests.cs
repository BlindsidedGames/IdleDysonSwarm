/*
 * Purpose: Verifies Stage 3 startup selection, blocking outcomes, one-shot publication/replay, and explicit actions.
 * Runs: Unity EditMode test runner only against disposable filesystem roots.
 * Primary entry points: NUnit startup recovery, interaction, export, reset, and responsive-layout tests.
 * Owns: Recovery artifact arrangements, byte-preservation/reset-boundary assertions, and phone/desktop layout checks.
 * Delegates: Production policy/storage behavior to StartupSaveRecoveryCoordinator, CanonicalSaveStore, and related services.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/StartupSaveRecoveryCoordinator.cs.
 * - Assets/Scripts/Systems/Save/StartupRecoveryInteractionSession.cs.
 * - Assets/Scripts/Systems/Save/OdinStringFileStorage.cs.
 * - Assets/Scripts/User Interface/StartupRecoveryView.cs.
 *
 * Change notes:
 * - Every blocked-outcome test must assert source bytes remain unchanged and no backup/write appears.
 * - Reset gate tests must prove artifacts survive every action before the distinct final confirmation.
 * - Recovery selection tests use explicit timestamps to prevent filesystem-order dependence.
 * - Fixtures are created independently per test so no decoded object is reused or mutated across cases.
 */

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using Expansion;
using NUnit.Framework;
using Systems.Migrations;
using Systems.Save;
using UnityEngine;

namespace Tests.Save
{
    /// <summary>
    /// Exercises the complete Stage 3 decision boundary without publishing game runtime state.
    /// </summary>
    [TestFixture]
    public sealed class StartupSaveRecoveryStage3Tests
    {
        /// <summary>
        /// Verifies a truly empty install is distinguished from invalid artifact recovery.
        /// </summary>
        [Test]
        public void NoArtifacts_ReturnsFirstRunOutcomeWithoutWriting()
        {
            WithRecoveryStorage((store, filePath, backupPath, unusedRoot) =>
            {
                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();

                Assert.AreEqual(StartupSaveRecoveryStatus.NoArtifacts, result.Status);
                Assert.IsFalse(result.IsBlocking);
                Assert.IsFalse(File.Exists(filePath));
                Assert.IsEmpty(Directory.GetFiles(backupPath));
            });
        }

        /// <summary>
        /// Verifies an undecodable legacy artifact blocks instead of being mistaken for a first launch.
        /// </summary>
        [Test]
        public void UndecodableLegacyArtifact_BlocksWithoutCreatingCanonicalSave()
        {
            WithRecoveryStorage((store, filePath, unusedBackupPath, root) =>
            {
                string legacyPath = Path.Combine(root, "legacy.es3");
                File.WriteAllText(legacyPath, "undecodable-legacy-bytes");
                IReadOnlyList<SaveStorageCandidate> legacy =
                    LegacySaveCandidateAdapter.FromExistingAdapterResultsAndArtifacts(
                        Array.Empty<LegacyEs3RecoveryCandidate>(),
                        new[] { legacyPath },
                        legacyOdinPath: null);
                ArtifactSnapshot before = ArtifactSnapshot.Capture(legacyPath);

                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve(legacy);

                Assert.AreEqual(StartupSaveRecoveryStatus.AllCandidatesInvalid, result.Status);
                Assert.IsTrue(result.IsBlocking);
                Assert.IsFalse(File.Exists(filePath));
                Assert.AreEqual(before, ArtifactSnapshot.Capture(legacyPath));
            });
        }

        /// <summary>
        /// Verifies corrupt primary recovery chooses the newest valid backup and preserves the failed primary.
        /// </summary>
        [Test]
        public void CorruptPrimary_RecoversNewestValidBackup_AndPreservesFailedPrimary()
        {
            WithRecoveryStorage((store, filePath, backupPath, unusedRoot) =>
            {
                const string corruptPrimary = "IDB1:AAAA";
                File.WriteAllText(filePath, corruptPrimary);
                string older = WriteBackup(backupPath, filePath, "older", Encode(CreateSettings(10d)));
                string newer = WriteBackup(backupPath, filePath, "newer", Encode(CreateSettings(20d)));
                File.SetLastWriteTimeUtc(older, Utc(2020));
                File.SetLastWriteTimeUtc(newer, Utc(2021));

                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();

                Assert.AreEqual(StartupSaveRecoveryStatus.RecoveredCanonical, result.Status);
                Assert.AreEqual(newer, result.SelectedCandidate.Path);
                Assert.AreEqual(
                    20d,
                    result.Settings.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.IsTrue(
                    SaveCodec.TryDecodeSaveSettings(
                        File.ReadAllText(filePath),
                        out Oracle.SaveDataSettings restored));
                Assert.AreEqual(20d, restored.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.IsTrue(
                    Directory.GetFiles(backupPath)
                        .Any(path => File.ReadAllText(path) == corruptPrimary),
                    "The failed primary was not preserved as recovery evidence.");
            });
        }

        /// <summary>
        /// Verifies a newer corrupt backup is skipped without outranking an older fully valid backup.
        /// </summary>
        [Test]
        public void NewerCorruptBackup_DoesNotOutrankOlderValidBackup()
        {
            WithRecoveryStorage((store, filePath, backupPath, unusedRoot) =>
            {
                File.WriteAllText(filePath, "wrong-prefix");
                string olderValid = WriteBackup(
                    backupPath,
                    filePath,
                    "older-valid",
                    Encode(CreateSettings(31d)));
                string newerCorrupt = WriteBackup(
                    backupPath,
                    filePath,
                    "newer-corrupt",
                    "IDB1:AAAA");
                File.SetLastWriteTimeUtc(olderValid, Utc(2020));
                File.SetLastWriteTimeUtc(newerCorrupt, Utc(2021));

                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();

                Assert.AreEqual(StartupSaveRecoveryStatus.RecoveredCanonical, result.Status);
                Assert.AreEqual(olderValid, result.SelectedCandidate.Path);
                Assert.AreEqual(
                    31d,
                    result.Settings.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.IsTrue(
                    result.Attempts.Any(attempt =>
                        attempt.Candidate.Path == newerCorrupt &&
                        attempt.Preparation?.FailureReason == PreparedSaveFailureReason.DecodeFailed));
            });
        }

        /// <summary>
        /// Verifies all-invalid artifacts block startup without writes, moves, timestamp changes, or pruning.
        /// </summary>
        [Test]
        public void AllInvalidCandidates_BlockWithoutWrites()
        {
            WithRecoveryStorage((store, filePath, backupPath, unusedRoot) =>
            {
                File.WriteAllText(filePath, "invalid-primary");
                File.WriteAllText(filePath + ".tmp", "invalid-temp");
                string backup = WriteBackup(backupPath, filePath, "invalid", "invalid-backup");
                string[] paths = { filePath, filePath + ".tmp", backup };
                Dictionary<string, ArtifactSnapshot> before = paths.ToDictionary(
                    path => path,
                    ArtifactSnapshot.Capture,
                    StringComparer.Ordinal);

                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();

                Assert.AreEqual(StartupSaveRecoveryStatus.AllCandidatesInvalid, result.Status);
                Assert.IsTrue(result.IsBlocking);
                Assert.IsFalse(result.HasPublishableSettings);
                CollectionAssert.AreEquivalent(paths, Directory.GetFiles(Path.GetDirectoryName(filePath))
                    .Concat(Directory.GetFiles(backupPath))
                    .ToArray());
                foreach (string path in paths)
                {
                    Assert.AreEqual(before[path], ArtifactSnapshot.Capture(path), path);
                }
            });
        }

        /// <summary>
        /// Verifies future primary schema stops fallback and leaves a valid older backup untouched.
        /// </summary>
        [Test]
        public void FuturePrimary_BlocksWithoutFallbackOrOverwrite()
        {
            WithRecoveryStorage((store, filePath, backupPath, unusedRoot) =>
            {
                string future = Encode(CreateSettings(40d, schema: 13));
                File.WriteAllText(filePath, future);
                string validBackup = WriteBackup(
                    backupPath,
                    filePath,
                    "valid",
                    Encode(CreateSettings(39d)));
                ArtifactSnapshot primaryBefore = ArtifactSnapshot.Capture(filePath);
                ArtifactSnapshot backupBefore = ArtifactSnapshot.Capture(validBackup);

                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();

                Assert.AreEqual(StartupSaveRecoveryStatus.UnsupportedFutureVersion, result.Status);
                Assert.AreEqual(filePath, result.SelectedCandidate.Path);
                Assert.AreEqual(primaryBefore, ArtifactSnapshot.Capture(filePath));
                Assert.AreEqual(backupBefore, ArtifactSnapshot.Capture(validBackup));
                Assert.AreEqual(1, Directory.GetFiles(backupPath).Length);
            });
        }

        /// <summary>
        /// Verifies a future recovery artifact stops before selecting an older valid backup.
        /// </summary>
        [Test]
        public void FutureBackup_BlocksOlderValidBackup()
        {
            WithRecoveryStorage((store, filePath, backupPath, unusedRoot) =>
            {
                File.WriteAllText(filePath, "invalid-primary");
                string olderValid = WriteBackup(
                    backupPath,
                    filePath,
                    "older-valid",
                    Encode(CreateSettings(50d)));
                string newerFuture = WriteBackup(
                    backupPath,
                    filePath,
                    "newer-future",
                    Encode(CreateSettings(51d, schema: 13)));
                File.SetLastWriteTimeUtc(olderValid, Utc(2020));
                File.SetLastWriteTimeUtc(newerFuture, Utc(2021));

                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();

                Assert.AreEqual(StartupSaveRecoveryStatus.UnsupportedFutureVersion, result.Status);
                Assert.AreEqual(newerFuture, result.SelectedCandidate.Path);
                Assert.AreEqual("invalid-primary", File.ReadAllText(filePath));
            });
        }

        /// <summary>
        /// Verifies publication and offline replay are coupled and authorized exactly once.
        /// </summary>
        [Test]
        public void SuccessfulStartup_PublishesAndSchedulesOfflineReplayExactlyOnce()
        {
            WithRecoveryStorage((store, filePath, unusedBackupPath, unusedRoot) =>
            {
                File.WriteAllText(filePath, Encode(CreateSettings(60d)));
                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();
                var gate = new StartupRecoveryPublicationGate();
                int publishCount = 0;
                int replayCount = 0;

                Assert.IsTrue(gate.TryPublish(result, _ => publishCount++, () => replayCount++));
                Assert.IsFalse(gate.TryPublish(result, _ => publishCount++, () => replayCount++));
                Assert.AreEqual(1, publishCount);
                Assert.AreEqual(1, replayCount);
            });
        }

        /// <summary>
        /// Verifies a numerically repaired primary cannot publish when its required canonical rewrite fails.
        /// </summary>
        [Test]
        public void RepairedPrimary_WriteFailure_BlocksBeforePublicationOrOfflineReplay()
        {
            string root = Path.Combine(
                Path.GetTempPath(),
                "ids-stage3-primary-repair-" + Guid.NewGuid().ToString("N"));
            string filePath = Path.Combine(root, "save.txt");
            string backupPath = Path.Combine(root, "backups");
            Directory.CreateDirectory(root);
            Directory.CreateDirectory(backupPath);
            try
            {
                Oracle.SaveDataSettings source = CreateSettings(double.PositiveInfinity);
                string original = Encode(source);
                File.WriteAllText(filePath, original);
                var storage = new OdinStringFileStorage(
                    filePath,
                    backupPath,
                    maxBackups: 10,
                    replaceExistingFile: (_, _) =>
                        throw new IOException("Injected repaired-primary replace failure."));
                var pipeline = new SavePreparationPipeline(
                    12,
                    settings =>
                    {
                        NumericSaveRepair.Repair(settings);
                        return new MigrationRunResult
                        {
                            Succeeded = true,
                            StartingVersion = settings.saveVersion,
                            EndingVersion = settings.saveVersion
                        };
                    });
                var store = new CanonicalSaveStore(new SaveSystem(storage, pipeline));

                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();
                var gate = new StartupRecoveryPublicationGate();
                int publishCount = 0;
                int replayCount = 0;

                Assert.AreEqual(StartupSaveRecoveryStatus.RecoveryWriteFailed, result.Status);
                Assert.IsTrue(result.IsBlocking);
                Assert.IsFalse(result.HasPublishableSettings);
                Assert.IsFalse(gate.TryPublish(result, _ => publishCount++, () => replayCount++));
                Assert.Zero(publishCount);
                Assert.Zero(replayCount);
                Assert.AreEqual(original, File.ReadAllText(filePath));
                StringAssert.Contains("Injected repaired-primary replace failure", result.Error);
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
        /// Verifies blocking startup cannot publish or schedule offline replay.
        /// </summary>
        [Test]
        public void BlockingStartup_DoesNotPublishOrScheduleOfflineReplay()
        {
            WithRecoveryStorage((store, filePath, unusedBackupPath, unusedRoot) =>
            {
                File.WriteAllText(filePath, "invalid");
                StartupSaveRecoveryResult result =
                    new StartupSaveRecoveryCoordinator(store).Resolve();
                var gate = new StartupRecoveryPublicationGate();
                int publishCount = 0;
                int replayCount = 0;

                Assert.IsFalse(gate.TryPublish(result, _ => publishCount++, () => replayCount++));
                Assert.Zero(publishCount);
                Assert.Zero(replayCount);
            });
        }

        /// <summary>
        /// Verifies clipboard recovery clears historical replay input and commits only after complete preparation.
        /// </summary>
        [Test]
        public void ClipboardImport_CommitsPreparedSaveWithFreshLifecycleBaseline()
        {
            WithRecoveryStorage((store, filePath, backupPath, unusedRoot) =>
            {
                const string failedPrimary = "invalid-primary";
                File.WriteAllText(filePath, failedPrimary);
                StartupSaveRecoveryResult blocked =
                    new StartupSaveRecoveryCoordinator(store).Resolve();
                DateTime now = new DateTime(2026, 7, 24, 12, 0, 0, DateTimeKind.Utc);
                var session = new StartupRecoveryInteractionSession(store, blocked, () => now);
                Oracle.SaveDataSettings imported = CreateSettings(70d);
                imported.dateQuitString = new DateTime(2020, 1, 1).ToString(CultureInfo.InvariantCulture);

                Assert.IsTrue(
                    session.TryImportClipboardText(Encode(imported), out string error),
                    error);
                Assert.IsTrue(
                    SaveCodec.TryDecodeSaveSettings(
                        File.ReadAllText(filePath),
                        out Oracle.SaveDataSettings committed));
                Assert.AreEqual(70d, committed.dysonVerseSaveData.dysonVerseInfinityData.money);
                Assert.AreEqual(string.Empty, committed.dateQuitString);
                Assert.AreEqual(now.ToString(CultureInfo.InvariantCulture), committed.lastSuccessfulLoadUtc);
                Assert.IsTrue(
                    Directory.GetFiles(backupPath)
                        .Any(path => File.ReadAllText(path) == failedPrimary));
            });
        }

        /// <summary>
        /// Verifies local artifact export copies exact bytes and leaves every source unchanged.
        /// </summary>
        [Test]
        public void ArtifactExport_IsBytePreservingAndNonDestructive()
        {
            WithRecoveryStorage((store, filePath, unusedBackupPath, root) =>
            {
                File.WriteAllText(filePath, "invalid-primary");
                StartupSaveRecoveryResult blocked =
                    new StartupSaveRecoveryCoordinator(store).Resolve();
                var session = new StartupRecoveryInteractionSession(
                    store,
                    blocked,
                    () => new DateTime(2026, 7, 24, 12, 0, 0, DateTimeKind.Utc));
                ArtifactSnapshot before = ArtifactSnapshot.Capture(filePath);
                string exportRoot = Path.Combine(root, "exports");

                Assert.IsTrue(
                    session.TryExportArtifacts(exportRoot, out string exportFolder, out string error),
                    error);
                Assert.AreEqual(before, ArtifactSnapshot.Capture(filePath));
                Assert.IsTrue(File.Exists(Path.Combine(exportFolder, "recovery-report.txt")));
                Assert.IsTrue(
                    Directory.GetFiles(exportFolder)
                        .Any(path => File.ReadAllText(path) == "invalid-primary"));
            });
        }

        /// <summary>
        /// Verifies destructive reset cannot run without a separate arm action and cancellation disarms it.
        /// </summary>
        [Test]
        public void ResetGate_RequiresArmThenDistinctConfirmation()
        {
            var gate = new StartupRecoveryResetGate();
            int resetCount = 0;
            string root = Path.Combine(
                Path.GetTempPath(),
                "ids-reset-gate-" + Guid.NewGuid().ToString("N"));
            string supportArtifact = Path.Combine(root, "failed-primary.txt");
            Directory.CreateDirectory(root);
            File.WriteAllText(supportArtifact, "support-evidence");
            try
            {
                Assert.IsFalse(gate.TryConfirm(() => resetCount++));
                Assert.IsTrue(File.Exists(supportArtifact));
                gate.Arm();
                Assert.IsTrue(File.Exists(supportArtifact));
                gate.Cancel();
                Assert.IsFalse(gate.TryConfirm(() => resetCount++));
                Assert.IsTrue(File.Exists(supportArtifact));
                gate.Arm();
                Assert.IsTrue(
                    gate.TryConfirm(
                        () =>
                        {
                            resetCount++;
                            File.Delete(supportArtifact);
                        }));
                Assert.AreEqual(1, resetCount);
                Assert.IsFalse(File.Exists(supportArtifact));
                Assert.IsFalse(gate.IsArmed);
                Assert.IsFalse(gate.TryConfirm(() => resetCount++));
            }
            finally
            {
                if (Directory.Exists(root))
                {
                    Directory.Delete(root, recursive: true);
                }
            }
        }

        /// <summary>
        /// Verifies a phone portrait safe area receives a single-column modal that remains inside its margins.
        /// </summary>
        [Test]
        public void RecoveryViewLayout_PhonePortraitUsesCompactSafeAreaPanel()
        {
            var safeArea = new Vector2(1284f, 2778f);

            bool compact = InvokeRecoveryLayoutMethod<bool>("IsCompactLayout", safeArea);
            Vector2 panel = InvokeRecoveryLayoutMethod<Vector2>(
                "CalculatePanelSize",
                safeArea,
                compact);

            Assert.IsTrue(compact);
            Assert.Less(panel.x, safeArea.x);
            Assert.Less(panel.y, safeArea.y);
            Assert.GreaterOrEqual(safeArea.x - panel.x, 88f);
            Assert.GreaterOrEqual(safeArea.y - panel.y, 88f);
        }

        /// <summary>
        /// Verifies a desktop landscape safe area receives the bounded two-column modal dimensions.
        /// </summary>
        [Test]
        public void RecoveryViewLayout_DesktopLandscapeUsesBoundedWidePanel()
        {
            var safeArea = new Vector2(2778f, 1284f);

            bool compact = InvokeRecoveryLayoutMethod<bool>("IsCompactLayout", safeArea);
            Vector2 panel = InvokeRecoveryLayoutMethod<Vector2>(
                "CalculatePanelSize",
                safeArea,
                compact);

            Assert.IsFalse(compact);
            Assert.AreEqual(new Vector2(1560f, 1080f), panel);
            Assert.Less(panel.x, safeArea.x);
            Assert.Less(panel.y, safeArea.y);
        }

        /// <summary>
        /// Invokes one private pure layout method so tests can lock responsive policy without widening runtime API.
        /// </summary>
        /// <typeparam name="T">The expected method result type.</typeparam>
        /// <param name="methodName">The private static method name.</param>
        /// <param name="arguments">The method arguments.</param>
        /// <returns>The strongly typed result.</returns>
        private static T InvokeRecoveryLayoutMethod<T>(string methodName, params object[] arguments)
        {
            MethodInfo method = typeof(StartupRecoveryView).GetMethod(
                methodName,
                BindingFlags.NonPublic | BindingFlags.Static);
            Assert.IsNotNull(method, $"Missing recovery layout method {methodName}.");
            return (T)method.Invoke(null, arguments);
        }

        /// <summary>
        /// Runs one assertion against disposable production filesystem storage.
        /// </summary>
        /// <param name="assertion">The recovery assertion.</param>
        private static void WithRecoveryStorage(
            Action<CanonicalSaveStore, string, string, string> assertion)
        {
            string root = Path.Combine(
                Path.GetTempPath(),
                "ids-stage3-" + Guid.NewGuid().ToString("N"));
            string filePath = Path.Combine(root, "save.txt");
            string backupPath = Path.Combine(root, "backups");
            Directory.CreateDirectory(root);
            Directory.CreateDirectory(backupPath);
            try
            {
                var storage = new OdinStringFileStorage(filePath, backupPath, maxBackups: 10);
                var system = new SaveSystem(
                    storage,
                    SavePreparationPipeline.CreateCurrentSchemaOnly(12));
                assertion(new CanonicalSaveStore(system), filePath, backupPath, root);
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
        /// Writes one backup matching production discovery naming.
        /// </summary>
        /// <param name="backupPath">The backup folder.</param>
        /// <param name="filePath">The canonical path.</param>
        /// <param name="label">The deterministic test label.</param>
        /// <param name="text">The exact artifact text.</param>
        /// <returns>The backup path.</returns>
        private static string WriteBackup(
            string backupPath,
            string filePath,
            string label,
            string text)
        {
            string path = Path.Combine(
                backupPath,
                $"{Path.GetFileName(filePath)}.{label}.bak");
            File.WriteAllText(path, text);
            return path;
        }

        /// <summary>
        /// Creates an independent current or future-schema save with one durable sentinel.
        /// </summary>
        /// <param name="money">The money sentinel.</param>
        /// <param name="schema">The source schema.</param>
        /// <returns>A new save object.</returns>
        private static Oracle.SaveDataSettings CreateSettings(double money, int schema = 12)
        {
            var settings = new Oracle.SaveDataSettings { saveVersion = schema };
            settings.dysonVerseSaveData.dysonVerseInfinityData.money = money;
            return settings;
        }

        /// <summary>
        /// Encodes a save as a canonical uppercase binary envelope.
        /// </summary>
        /// <param name="settings">The save object.</param>
        /// <returns>The encoded text.</returns>
        private static string Encode(Oracle.SaveDataSettings settings)
        {
            return SaveCodec.EncodeBinary(
                SaveCodec.SerializeSaveSettingsBinary(settings),
                compress: true);
        }

        /// <summary>
        /// Creates a fixed UTC timestamp at the start of a year.
        /// </summary>
        /// <param name="year">The year.</param>
        /// <returns>The UTC timestamp.</returns>
        private static DateTime Utc(int year)
        {
            return new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        }

        /// <summary>
        /// Captures exact bytes and last-write time for non-mutation assertions.
        /// </summary>
        private readonly struct ArtifactSnapshot : IEquatable<ArtifactSnapshot>
        {
            private readonly byte[] _bytes;
            private readonly DateTime _lastWriteUtc;

            /// <summary>
            /// Creates one immutable artifact snapshot.
            /// </summary>
            /// <param name="bytes">The exact bytes.</param>
            /// <param name="lastWriteUtc">The file timestamp.</param>
            private ArtifactSnapshot(byte[] bytes, DateTime lastWriteUtc)
            {
                _bytes = bytes;
                _lastWriteUtc = lastWriteUtc;
            }

            /// <summary>
            /// Captures one existing artifact.
            /// </summary>
            /// <param name="path">The exact path.</param>
            /// <returns>The immutable snapshot.</returns>
            internal static ArtifactSnapshot Capture(string path)
            {
                return new ArtifactSnapshot(
                    File.ReadAllBytes(path),
                    File.GetLastWriteTimeUtc(path));
            }

            /// <summary>
            /// Compares exact bytes and timestamp.
            /// </summary>
            /// <param name="other">The other snapshot.</param>
            /// <returns><see langword="true"/> when equal.</returns>
            public bool Equals(ArtifactSnapshot other)
            {
                return _lastWriteUtc == other._lastWriteUtc &&
                       ((_bytes == null && other._bytes == null) ||
                        (_bytes != null && other._bytes != null &&
                         _bytes.SequenceEqual(other._bytes)));
            }

            /// <summary>
            /// Compares a boxed snapshot.
            /// </summary>
            /// <param name="obj">The other object.</param>
            /// <returns><see langword="true"/> for an equal snapshot.</returns>
            public override bool Equals(object obj)
            {
                return obj is ArtifactSnapshot other && Equals(other);
            }

            /// <summary>
            /// Returns a stable combined hash code.
            /// </summary>
            /// <returns>The hash code.</returns>
            public override int GetHashCode()
            {
                unchecked
                {
                    int hash = _lastWriteUtc.GetHashCode();
                    if (_bytes != null)
                    {
                        foreach (byte value in _bytes)
                        {
                            hash = (hash * 397) ^ value;
                        }
                    }

                    return hash;
                }
            }
        }
    }
}
