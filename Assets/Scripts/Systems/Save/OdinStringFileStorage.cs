/*
 * Purpose: Stores canonical IDB1 text with verified temp-file transactions, rotating backups, and candidate discovery.
 * Runs: Runtime canonical persistence and Unity Editor filesystem tests.
 * Primary entry points: TryWriteTextVerified, DiscoverCandidates, TryReadCandidateText, and primary read helpers.
 * Owns: Canonical/temp/backup paths, file reads, backup creation/pruning, and atomic filesystem replacement.
 * Delegates: Save decoding, migration, normalization, and validation to the verifier supplied by SaveSystem.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/ITransactionalSaveStorage.cs and SaveStorageCandidate.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs.
 * - Assets/Scripts/Systems/Save/SavePaths.cs.
 *
 * Change notes:
 * - Canonical replacement must occur only after exact temp bytes reread and verify successfully.
 * - Any failure before/during replacement preserves the previous canonical artifact and leaves the temp for inspection.
 * - Backup ordering/pruning uses last-write time plus ordinal path tie-breaks and must remain deterministic.
 */

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using UnityEngine;

namespace Systems.Save
{
    /// <summary>
    /// Implements transactional canonical text storage and deterministic artifact discovery.
    /// </summary>
    public sealed class OdinStringFileStorage : ITransactionalSaveStorage
    {
        private const int DefaultBackupCount = 5;
        private const string TempSuffix = ".tmp";
        private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);

        private readonly string _filePath;
        private readonly string _backupFolderPath;
        private readonly int _maxBackups;
        private readonly Action<string, string> _replaceExistingFile;

        /// <summary>
        /// Creates canonical storage at an exact path.
        /// </summary>
        /// <param name="filePath">The primary canonical save path.</param>
        /// <param name="backupFolderPath">The rotating backup folder, or the default save backup folder.</param>
        /// <param name="maxBackups">The retained backup count, clamped between one and fifty.</param>
        /// <param name="replaceExistingFile">Optional atomic-replace seam used by failure tests.</param>
        public OdinStringFileStorage(
            string filePath,
            string backupFolderPath = null,
            int maxBackups = DefaultBackupCount,
            Action<string, string> replaceExistingFile = null)
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                throw new ArgumentException("filePath is required.", nameof(filePath));
            }

            _filePath = filePath;
            _backupFolderPath = string.IsNullOrWhiteSpace(backupFolderPath)
                ? SavePaths.GetBackupFolderPath()
                : backupFolderPath;
            _maxBackups = Mathf.Clamp(maxBackups, 1, 50);
            _replaceExistingFile = replaceExistingFile ??
                                   ((source, destination) => File.Replace(source, destination, null));
        }

        /// <summary>
        /// Gets the primary canonical path.
        /// </summary>
        public string DebugName => _filePath;

        /// <summary>
        /// Reports whether the primary canonical file exists.
        /// </summary>
        /// <returns><see langword="true"/> when the primary file exists.</returns>
        public bool Exists()
        {
            return File.Exists(_filePath);
        }

        /// <summary>
        /// Reads the primary canonical text without modifying any artifact.
        /// </summary>
        /// <param name="text">The trimmed primary text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when non-empty text was read.</returns>
        public bool TryReadText(out string text, out string error)
        {
            return TryReadPath(_filePath, out text, out error);
        }

        /// <summary>
        /// Performs a compatibility atomic write with non-empty temp-file verification.
        /// </summary>
        /// <param name="text">The non-empty text.</param>
        /// <param name="error">The transaction failure.</param>
        /// <returns><see langword="true"/> when canonical replacement succeeds.</returns>
        public bool TryWriteTextAtomic(string text, out string error)
        {
            return TryWriteTextVerified(
                text,
                reread => new SaveTextVerificationResult(
                    !string.IsNullOrWhiteSpace(reread),
                    "Temporary save text was empty."),
                out error);
        }

        /// <summary>
        /// Writes, rereads, and verifies a temp artifact before backup and atomic canonical replacement.
        /// </summary>
        /// <param name="text">The prepared canonical text.</param>
        /// <param name="verifier">The semantic verifier for the exact reread temp text.</param>
        /// <param name="error">The transaction failure.</param>
        /// <returns><see langword="true"/> only after canonical replacement succeeds.</returns>
        public bool TryWriteTextVerified(
            string text,
            Func<string, SaveTextVerificationResult> verifier,
            out string error)
        {
            error = null;
            if (string.IsNullOrWhiteSpace(text))
            {
                error = "Refusing to write empty save text.";
                return false;
            }

            if (verifier == null)
            {
                error = "A temp-file verifier is required.";
                return false;
            }

            string directory = Path.GetDirectoryName(_filePath);
            if (string.IsNullOrEmpty(directory))
            {
                error = "Invalid save path (no directory).";
                return false;
            }

            string tempPath = _filePath + TempSuffix;
            try
            {
                Directory.CreateDirectory(directory);
                Directory.CreateDirectory(_backupFolderPath);
                File.WriteAllText(tempPath, text.Trim(), Utf8NoBom);

                if (!TryReadPath(tempPath, out string reread, out string readError))
                {
                    error = $"Failed reading temporary save: {readError}";
                    return false;
                }

                SaveTextVerificationResult verification = verifier(reread);
                if (!verification.Succeeded)
                {
                    error = string.IsNullOrWhiteSpace(verification.Error)
                        ? "Temporary save verification failed."
                        : verification.Error;
                    return false;
                }

                if (File.Exists(_filePath) && !TryCreateBackup(out _, out string backupError))
                {
                    error = $"Failed preserving previous canonical save: {backupError}";
                    return false;
                }

                if (File.Exists(_filePath))
                {
                    _replaceExistingFile(tempPath, _filePath);
                }
                else
                {
                    File.Move(tempPath, _filePath);
                }

                PruneBackups();
                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        /// <summary>
        /// Discovers canonical artifacts and appends explicit legacy candidates without reading or changing files.
        /// </summary>
        /// <param name="explicitLegacyCandidates">Candidates already supplied by legacy adapters.</param>
        /// <returns>Primary, temp, newest-first backups, then deterministically sorted explicit legacy candidates.</returns>
        public IReadOnlyList<SaveStorageCandidate> DiscoverCandidates(
            IEnumerable<SaveStorageCandidate> explicitLegacyCandidates = null)
        {
            var discovered = new List<SaveStorageCandidate>();
            AddFileCandidate(discovered, SaveStorageCandidateSource.CanonicalPrimary, _filePath);
            AddFileCandidate(discovered, SaveStorageCandidateSource.CanonicalTemporary, _filePath + TempSuffix);

            if (Directory.Exists(_backupFolderPath))
            {
                string baseName = Path.GetFileName(_filePath);
                IEnumerable<string> backups = Directory
                    .GetFiles(_backupFolderPath, $"{baseName}.*.bak")
                    .OrderByDescending(File.GetLastWriteTimeUtc)
                    .ThenByDescending(path => path, StringComparer.Ordinal);
                foreach (string backup in backups)
                {
                    AddFileCandidate(discovered, SaveStorageCandidateSource.CanonicalBackup, backup);
                }
            }

            if (explicitLegacyCandidates != null)
            {
                IEnumerable<SaveStorageCandidate> orderedLegacy = explicitLegacyCandidates
                    .Where(candidate => candidate != null)
                    .OrderBy(candidate => candidate.Source)
                    .ThenByDescending(candidate => candidate.LastWriteUtc)
                    .ThenBy(candidate => candidate.Path, StringComparer.Ordinal);
                discovered.AddRange(orderedLegacy);
            }

            return discovered;
        }

        /// <summary>
        /// Reads one filesystem-backed discovered artifact without modifying it.
        /// </summary>
        /// <param name="candidate">The discovered candidate.</param>
        /// <param name="text">The trimmed candidate text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when non-empty text was read.</returns>
        public bool TryReadCandidateText(
            SaveStorageCandidate candidate,
            out string text,
            out string error)
        {
            text = string.Empty;
            error = null;
            if (candidate == null)
            {
                error = "Candidate is null.";
                return false;
            }

            if (candidate.HasDecodedSettings)
            {
                error = "Decoded legacy candidates must be prepared from settings.";
                return false;
            }

            return TryReadPath(candidate.Path, out text, out error);
        }

        /// <summary>
        /// Adds an existing file candidate with a captured last-write timestamp.
        /// </summary>
        /// <param name="candidates">The discovery result.</param>
        /// <param name="source">The artifact source.</param>
        /// <param name="path">The exact path.</param>
        private static void AddFileCandidate(
            ICollection<SaveStorageCandidate> candidates,
            SaveStorageCandidateSource source,
            string path)
        {
            if (!File.Exists(path))
            {
                return;
            }

            candidates.Add(new SaveStorageCandidate(source, path, File.GetLastWriteTimeUtc(path)));
        }

        /// <summary>
        /// Reads non-empty UTF-8 text from an exact path.
        /// </summary>
        /// <param name="path">The exact artifact path.</param>
        /// <param name="text">The trimmed text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when non-empty text was read.</returns>
        private static bool TryReadPath(string path, out string text, out string error)
        {
            text = string.Empty;
            error = null;
            try
            {
                if (!File.Exists(path))
                {
                    error = "File not found.";
                    return false;
                }

                text = File.ReadAllText(path, Utf8NoBom)?.Trim();
                if (string.IsNullOrWhiteSpace(text))
                {
                    error = "File is empty.";
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        /// <summary>
        /// Copies the previous canonical artifact to a unique rotating backup.
        /// </summary>
        /// <param name="backupPath">The created backup path.</param>
        /// <param name="error">The backup failure.</param>
        /// <returns><see langword="true"/> when the prior canonical artifact was preserved.</returns>
        private bool TryCreateBackup(out string backupPath, out string error)
        {
            backupPath = null;
            error = null;
            try
            {
                if (!File.Exists(_filePath))
                {
                    error = "Canonical file does not exist.";
                    return false;
                }

                string stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss_fffffff", CultureInfo.InvariantCulture);
                string baseName = Path.GetFileName(_filePath);
                backupPath = Path.Combine(_backupFolderPath, $"{baseName}.{stamp}.bak");
                int counter = 1;
                while (File.Exists(backupPath))
                {
                    backupPath = Path.Combine(_backupFolderPath, $"{baseName}.{stamp}.{counter}.bak");
                    counter++;
                }

                File.Copy(_filePath, backupPath, false);
                return true;
            }
            catch (Exception ex)
            {
                backupPath = null;
                error = ex.Message;
                return false;
            }
        }

        /// <summary>
        /// Retains the newest configured backup count using deterministic timestamp and path ordering.
        /// </summary>
        private void PruneBackups()
        {
            try
            {
                if (!Directory.Exists(_backupFolderPath))
                {
                    return;
                }

                string baseName = Path.GetFileName(_filePath);
                string[] backups = Directory.GetFiles(_backupFolderPath, $"{baseName}.*.bak");
                IEnumerable<string> stale = backups
                    .OrderByDescending(File.GetLastWriteTimeUtc)
                    .ThenByDescending(path => path, StringComparer.Ordinal)
                    .Skip(_maxBackups);
                foreach (string path in stale)
                {
                    File.Delete(path);
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[SaveStorage] Failed pruning backups: {ex.Message}");
            }
        }
    }
}
