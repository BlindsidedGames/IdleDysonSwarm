using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using QFSW.QC;
using Systems.Save;

namespace Expansion
{
    /// <summary>
    /// Purpose: manual legacy-save recovery commands exposed through Quantum Console.
    /// Where it runs: runtime only.
    /// Primary entry points: <see cref="RecoverPreview"/>, <see cref="RecoverList"/>, <see cref="RecoverApply"/>.
    /// Owns: preview/apply flow for restoring archived ES3 artifacts into the canonical save pipeline.
    /// Delegates: artifact selection to <see cref="LegacyEs3Save"/>, persistence/migrations to existing Oracle save APIs.
    /// </summary>
    /// <remarks>
    /// Interacts with:
    /// - Calls into: <see cref="LegacyEs3Save"/>, <see cref="SavePaths"/>, <see cref="SaveSystem"/>.
    /// - Invoked by: Quantum Console command scanner (QFSW) at runtime.
    ///
    /// Change notes:
    /// - Command aliases (<c>recover</c>, <c>recover-list</c>, <c>recover-apply</c>) are part of support workflow;
    ///   changing them breaks runbooks.
    /// - <see cref="RecoverApply"/> uses 1-based candidate indexing from <see cref="RecoverList"/>.
    /// - Overwriting canonical save intentionally requires an explicit overwrite flag.
    /// - Backup naming/location must remain stable for support to locate pre-recovery canonical snapshots.
    /// </remarks>
    public partial class Oracle
    {
        [Command("recover", "List recoverable legacy ES3 candidates with indexes for manual selection.",
            MonoTargetType.Single)]
        public string RecoverPreview()
        {
            return RecoverList();
        }

        [Command("recover-list",
            "List recoverable legacy ES3 candidates with indexes for manual selection.",
            MonoTargetType.Single)]
        public string RecoverList()
        {
            List<LegacyEs3RecoveryCandidate> candidates = LegacyEs3Save.GetRecoverableCandidates();
            if (candidates.Count == 0)
            {
                return "[SaveRecovery] No recoverable ES3 artifacts were found.";
            }

            bool canonicalExists = SaveSystem.CreateDefault().Storage.Exists();
            string canonicalStatus = canonicalExists
                ? "Canonical save exists; append `true` to overwrite (example: `recover-apply 1 true`)."
                : "No canonical save exists; run `recover-apply <index>`.";

            StringBuilder output = new StringBuilder();
            output.Append($"[SaveRecovery] Found {candidates.Count} recoverable candidate(s). ");
            output.Append(canonicalStatus);
            for (int i = 0; i < candidates.Count; i++)
            {
                output.AppendLine();
                output.Append(FormatCandidateLine(i + 1, candidates[i], includePath: false));
            }

            return output.ToString();
        }

        [Command("recover-apply",
            "Apply candidate #1 when no canonical save exists. Use `recover-apply <index> true` to force overwrite.",
            MonoTargetType.Single)]
        public string RecoverApply()
        {
            return RecoverApplyInternal(index: 1, overwriteCanonical: false);
        }

        [Command("recover-apply",
            "Apply a specific candidate index from `recover-list`. Example: `recover-apply 2`.",
            MonoTargetType.Single)]
        public string RecoverApply(int index)
        {
            return RecoverApplyInternal(index, overwriteCanonical: false);
        }

        [Command("recover-apply",
            "Apply a specific candidate index, optionally overwriting canonical save.",
            MonoTargetType.Single)]
        public string RecoverApply(int index, bool overwriteCanonical)
        {
            return RecoverApplyInternal(index, overwriteCanonical);
        }

        private string RecoverApplyInternal(int index, bool overwriteCanonical)
        {
            if (!TryGetCandidateByIndex(index, out LegacyEs3RecoveryCandidate candidate, out int totalCount,
                    out string selectionError))
            {
                return selectionError;
            }

            SaveSystem saveSystem = SaveSystem.CreateDefault();
            bool canonicalExists = saveSystem.Storage.Exists();
            if (canonicalExists && !overwriteCanonical)
            {
                return "[SaveRecovery] Canonical save already exists. " +
                       $"Run `recover-apply {index} true` to explicitly overwrite it.";
            }

            string backupPath = null;
            if (canonicalExists && !TryBackupCanonicalBeforeRecovery(out backupPath, out string backupError))
            {
                return "[SaveRecovery] Recovery aborted: failed to back up canonical save before overwrite. " +
                       $"Error: {backupError}";
            }

            ApplyLoadedSettings(candidate.Settings, "ES3 (manual recover)");
            ApplyMigrations();
            SyncAutoAssignFromSelectedPreset(runAutoAssign: true);
            UpdateSkills?.Invoke();
            SaveInternal(force: true, updateQuitTime: false);

            if (!string.IsNullOrEmpty(backupPath))
            {
                return $"[SaveRecovery] Recovery applied from candidate #{index} ('{candidate.Path}'). " +
                       $"Previous canonical save backed up to '{backupPath}'.";
            }

            return $"[SaveRecovery] Recovery applied from candidate #{index} ('{candidate.Path}') " +
                   $"out of {totalCount} candidate(s).";
        }

        private static bool TryGetCandidateByIndex(int index, out LegacyEs3RecoveryCandidate candidate, out int totalCount,
            out string error)
        {
            candidate = default;
            totalCount = 0;
            error = null;

            if (index < 1)
            {
                error = "[SaveRecovery] Candidate index must be 1 or greater. Run `recover-list` first.";
                return false;
            }

            List<LegacyEs3RecoveryCandidate> candidates = LegacyEs3Save.GetRecoverableCandidates();
            totalCount = candidates.Count;
            if (totalCount == 0)
            {
                error = "[SaveRecovery] No recoverable ES3 artifacts were found.";
                return false;
            }

            int zeroBasedIndex = index - 1;
            if (zeroBasedIndex >= totalCount)
            {
                error = $"[SaveRecovery] Candidate #{index} is out of range (found {totalCount}). " +
                        "Run `recover-list` to see valid indexes.";
                return false;
            }

            candidate = candidates[zeroBasedIndex];
            return true;
        }

        private static string FormatCandidateLine(int index, LegacyEs3RecoveryCandidate candidate, bool includePath)
        {
            string version = candidate.SaveVersion.ToString(CultureInfo.InvariantCulture);
            string started = string.IsNullOrWhiteSpace(candidate.Settings?.dateStarted)
                ? "n/a"
                : candidate.Settings.dateStarted;
            string quit = string.IsNullOrWhiteSpace(candidate.Settings?.dateQuitString)
                ? "n/a"
                : candidate.Settings.dateQuitString;
            string lastUtc = candidate.TimestampUtc.HasValue
                ? candidate.TimestampUtc.Value.ToString("yyyy-MM-dd HH:mm:ss 'UTC'", CultureInfo.InvariantCulture)
                : "n/a";
            string source = GetCandidateSourceLabel(candidate.Path);
            string fileName = Path.GetFileName(candidate.Path);
            string pathSegment = includePath ? $", path='{candidate.Path}'" : string.Empty;

            return $"[{index}] v{version}, source={source}, file='{fileName}', lastUtc='{lastUtc}', " +
                   $"dateQuit='{quit}', dateStarted='{started}'{pathSegment}";
        }

        private static string GetCandidateSourceLabel(string candidatePath)
        {
            if (string.IsNullOrEmpty(candidatePath)) return "unknown";
            if (candidatePath.Contains(".corrupt.")) return "archived-corrupt";
            if (candidatePath.EndsWith(".tmp.bak", StringComparison.OrdinalIgnoreCase)) return "backup-tmp-bak";
            if (candidatePath.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase)) return "backup-tmp";
            if (candidatePath.EndsWith(".bac", StringComparison.OrdinalIgnoreCase)) return "backup-bac";
            return "primary";
        }

        private bool TryBackupCanonicalBeforeRecovery(out string backupPath, out string error)
        {
            backupPath = null;
            error = null;
            try
            {
                string canonicalPath = SavePaths.GetCanonicalSavePath();
                if (!File.Exists(canonicalPath)) return true;

                string backupFolder = SavePaths.GetBackupFolderPath();
                Directory.CreateDirectory(backupFolder);

                string stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
                backupPath = Path.Combine(backupFolder, $"manual_recover_preexisting_{stamp}.txt");

                int counter = 1;
                while (File.Exists(backupPath) && counter < 50)
                {
                    backupPath = Path.Combine(backupFolder, $"manual_recover_preexisting_{stamp}.{counter}.txt");
                    counter++;
                }

                File.Copy(canonicalPath, backupPath, overwrite: false);
                return true;
            }
            catch (Exception ex)
            {
                backupPath = null;
                error = ex.Message;
                return false;
            }
        }
    }
}
