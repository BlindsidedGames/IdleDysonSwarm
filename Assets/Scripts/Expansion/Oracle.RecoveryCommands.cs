using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using QFSW.QC;
using Systems.Save;
using UnityEngine;

namespace Expansion
{
    /// <summary>
    /// Purpose: manual legacy-save recovery commands exposed through Quantum Console.
    /// Where it runs: runtime only.
    /// Primary entry points: <see cref="RecoverPreview"/>, <see cref="RecoverList"/>, <see cref="RecoverApply"/>.
    /// Owns: preview/apply flow for restoring archived ES3 artifacts into the canonical save pipeline.
    /// Delegates: artifact selection to <see cref="LegacyEs3Save"/> and preparation/commit to
    /// <see cref="SaveRecoveryImportCoordinator"/>.
    /// </summary>
    /// <remarks>
    /// Interacts with:
    /// - Calls into: <see cref="LegacyEs3Save"/>, <see cref="CanonicalSaveStore"/>, and
    ///   <see cref="SaveRecoveryImportCoordinator"/>.
    /// - Invoked by: Quantum Console command scanner (QFSW) at runtime.
    ///
    /// Change notes:
    /// - Command aliases (<c>recover</c>, <c>recover-list</c>, <c>recover-apply</c>) are part of support workflow;
    ///   changing them breaks runbooks.
    /// - <see cref="RecoverApply"/> uses 1-based candidate indexing from <see cref="RecoverList"/>, backed by the same
    ///   in-memory snapshot to keep index->candidate mapping stable.
    /// - Overwriting canonical save intentionally requires an explicit overwrite flag.
    /// - Recovery apply must use the same prepared candidate result as startup selection.
    /// - Existing canonical data is replaced only when the command's explicit overwrite flag is true.
    /// - Verified transactional storage preserves the previous canonical artifact before replacement.
    /// - Explicit approved recovery clears the unprepared-canonical write block only after verified commit succeeds.
    /// - When startup is blocked, a verified apply reloads the initial scene instead of publishing into the partially
    ///   initialized runtime.
    /// </remarks>
    public partial class Oracle
    {
        private List<LegacyEs3RecoveryCandidate> _recoveryListSnapshot;
        private DateTime _recoveryListSnapshotUtc;

        /// <summary>
        /// Lists recoverable legacy candidates through the short support command alias.
        /// </summary>
        /// <returns>The stable recovery candidate snapshot.</returns>
        [Command("recover", "List recoverable legacy ES3 candidates with indexes for manual selection.",
            MonoTargetType.Single)]
        public string RecoverPreview()
        {
            return RecoverList();
        }

        /// <summary>
        /// Refreshes and formats a deterministic snapshot of recoverable legacy ES3 candidates.
        /// </summary>
        /// <returns>The candidate list and explicit overwrite guidance.</returns>
        [Command("recover-list",
            "List recoverable legacy ES3 candidates with indexes for manual selection.",
            MonoTargetType.Single)]
        public string RecoverList()
        {
            List<LegacyEs3RecoveryCandidate> candidates = RefreshRecoveryListSnapshot();
            if (candidates.Count == 0)
            {
                return "[SaveRecovery] No recoverable ES3 artifacts were found.";
            }

            bool canonicalExists = SaveSystem.CreateDefault().Storage.Exists();
            string canonicalStatus = canonicalExists
                ? "Canonical save exists; append `true` to overwrite (example: `recover-apply 1 true`)."
                : "No canonical save exists; run `recover-apply <index>`.";

            StringBuilder output = new StringBuilder();
            output.Append(
                $"[SaveRecovery] Snapshot UTC {_recoveryListSnapshotUtc.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)}. ");
            output.Append($"Found {candidates.Count} recoverable candidate(s). ");
            output.Append(canonicalStatus);
            for (int i = 0; i < candidates.Count; i++)
            {
                output.AppendLine();
                output.Append(FormatCandidateLine(i + 1, candidates[i], includePath: false));
            }

            return output.ToString();
        }

        /// <summary>
        /// Applies candidate one only when no canonical artifact exists.
        /// </summary>
        /// <returns>The recovery outcome.</returns>
        [Command("recover-apply",
            "Apply candidate #1 when no canonical save exists. Use `recover-apply <index> true` to force overwrite.",
            MonoTargetType.Single)]
        public string RecoverApply()
        {
            return RecoverApplyInternal(index: 1, overwriteCanonical: false);
        }

        /// <summary>
        /// Applies the selected candidate only when no canonical artifact exists.
        /// </summary>
        /// <param name="index">The one-based index from the current recovery list snapshot.</param>
        /// <returns>The recovery outcome.</returns>
        [Command("recover-apply",
            "Apply a specific candidate index from `recover-list`. Example: `recover-apply 2`.",
            MonoTargetType.Single)]
        public string RecoverApply(int index)
        {
            return RecoverApplyInternal(index, overwriteCanonical: false);
        }

        /// <summary>
        /// Applies the selected candidate with an explicit canonical overwrite decision.
        /// </summary>
        /// <param name="index">The one-based index from the current recovery list snapshot.</param>
        /// <param name="overwriteCanonical">Whether replacing an existing canonical artifact is explicitly approved.</param>
        /// <returns>The recovery outcome.</returns>
        [Command("recover-apply",
            "Apply a specific candidate index, optionally overwriting canonical save.",
            MonoTargetType.Single)]
        public string RecoverApply(int index, bool overwriteCanonical)
        {
            return RecoverApplyInternal(index, overwriteCanonical);
        }

        /// <summary>
        /// Prepares and transactionally commits one explicitly selected legacy candidate, then either publishes it
        /// into a ready runtime or requests a clean reload from a blocked startup.
        /// </summary>
        /// <param name="index">The one-based snapshot index.</param>
        /// <param name="overwriteCanonical">Whether replacing an existing canonical artifact is approved.</param>
        /// <returns>The classified recovery outcome.</returns>
        private string RecoverApplyInternal(int index, bool overwriteCanonical)
        {
            if (!TryGetCandidateByIndex(index, out LegacyEs3RecoveryCandidate candidate, out int totalCount,
                    out string selectionError))
            {
                return selectionError;
            }

            if (!TryGetSaveRecoveryImportCoordinator(
                    out SaveRecoveryImportCoordinator coordinator,
                    out CanonicalSaveStore store,
                    out string storeError))
            {
                return $"[SaveRecovery] Recovery unavailable: {storeError}";
            }

            bool canonicalExists = store.Exists();
            if (canonicalExists && !overwriteCanonical)
            {
                return "[SaveRecovery] Canonical save already exists. " +
                       $"Run `recover-apply {index} true` to explicitly overwrite it.";
            }

            var storageCandidate = new SaveStorageCandidate(
                SaveStorageCandidateSource.LegacyEs3,
                candidate.Path,
                candidate.TimestampUtc,
                candidate.Settings);
            if (!coordinator.TryImportCandidate(
                    storageCandidate,
                    allowCanonicalOverwrite: overwriteCanonical,
                    imported =>
                    {
                        imported.doubleIp =
                            imported.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
                        if (imported.debugOptions)
                        {
                            imported.debugEverEnabled = true;
                        }
                    },
                    out _,
                    out SaveDataSettings committed,
                    out string importError))
            {
                return $"[SaveRecovery] Recovery rejected without changing live or stored state. {importError}";
            }

            ClearRecoveryListSnapshot();
            if (_startupRecoveryBlocked)
            {
                string outcome = canonicalExists
                    ? $"[SaveRecovery] Recovery applied from candidate #{index} ('{candidate.Path}'). " +
                      "The previous canonical artifact was preserved in the rotating backup folder."
                    : $"[SaveRecovery] Recovery applied from candidate #{index} ('{candidate.Path}') " +
                      $"out of {totalCount} candidate(s).";
                CompleteBlockingStartupRecoveryImport();
                return outcome + " Restarting safely from the repaired save.";
            }

            ApplyLoadedSettings(committed, "prepared ES3 (manual recover)");
            RunPostLoadEntitlementSync();
            SyncAutoAssignFromSelectedPreset(runAutoAssign: true);
            UpdateSkills?.Invoke();
            _canonicalWriteBlockedByUnpreparedArtifact = false;

            if (canonicalExists)
            {
                return $"[SaveRecovery] Recovery applied from candidate #{index} ('{candidate.Path}'). " +
                       "The previous canonical artifact was preserved in the rotating backup folder.";
            }

            return $"[SaveRecovery] Recovery applied from candidate #{index} ('{candidate.Path}') " +
                   $"out of {totalCount} candidate(s).";
        }

        /// <summary>
        /// Resolves one candidate from the stable recovery-list snapshot.
        /// </summary>
        /// <param name="index">The one-based snapshot index.</param>
        /// <param name="candidate">The selected legacy candidate.</param>
        /// <param name="totalCount">The current snapshot size.</param>
        /// <param name="error">The selection failure.</param>
        /// <returns><see langword="true"/> when the index selects a candidate.</returns>
        private bool TryGetCandidateByIndex(int index, out LegacyEs3RecoveryCandidate candidate, out int totalCount,
            out string error)
        {
            return TryGetCandidateByIndexInternal(index, out candidate, out totalCount, out error);
        }

        /// <summary>
        /// Formats one recovery candidate without exposing full paths unless explicitly requested.
        /// </summary>
        /// <param name="index">The one-based display index.</param>
        /// <param name="candidate">The legacy candidate.</param>
        /// <param name="includePath">Whether support output should include the full artifact path.</param>
        /// <returns>The formatted candidate line.</returns>
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

        /// <summary>
        /// Maps a legacy artifact path to its stable support source label.
        /// </summary>
        /// <param name="candidatePath">The artifact path.</param>
        /// <returns>The support-facing source label.</returns>
        private static string GetCandidateSourceLabel(string candidatePath)
        {
            if (string.IsNullOrEmpty(candidatePath)) return "unknown";
            if (candidatePath.Contains(".corrupt.")) return "archived-corrupt";
            if (candidatePath.EndsWith(".tmp.bak", StringComparison.OrdinalIgnoreCase)) return "backup-tmp-bak";
            if (candidatePath.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase)) return "backup-tmp";
            if (candidatePath.EndsWith(".bac", StringComparison.OrdinalIgnoreCase)) return "backup-bac";
            return "primary";
        }

        /// <summary>
        /// Resolves one one-based candidate index from the retained deterministic snapshot.
        /// </summary>
        /// <param name="index">The one-based index.</param>
        /// <param name="candidate">The selected candidate.</param>
        /// <param name="totalCount">The total candidate count.</param>
        /// <param name="error">The selection failure.</param>
        /// <returns><see langword="true"/> when selection succeeds.</returns>
        private bool TryGetCandidateByIndexInternal(int index, out LegacyEs3RecoveryCandidate candidate, out int totalCount,
            out string error)
        {
            candidate = default;
            totalCount = 0;
            error = null;

            if (index < 1)
            {
                error = "[SaveRecovery] Candidate index must be 1 or greater. Run `recover` first.";
                return false;
            }

            // Use the same ordered snapshot produced by recover/recover-list so index->candidate mapping stays stable.
            List<LegacyEs3RecoveryCandidate> candidates = GetOrCreateRecoveryListSnapshot();
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
                        "Run `recover` to refresh valid indexes.";
                return false;
            }

            candidate = candidates[zeroBasedIndex];
            return true;
        }

        /// <summary>
        /// Returns the retained candidate snapshot or creates it when absent.
        /// </summary>
        /// <returns>The stable ordered candidate list.</returns>
        private List<LegacyEs3RecoveryCandidate> GetOrCreateRecoveryListSnapshot()
        {
            if (_recoveryListSnapshot != null)
            {
                return _recoveryListSnapshot;
            }

            return RefreshRecoveryListSnapshot();
        }

        /// <summary>
        /// Refreshes the stable legacy candidate snapshot and its UTC diagnostic timestamp.
        /// </summary>
        /// <returns>The refreshed candidate list.</returns>
        private List<LegacyEs3RecoveryCandidate> RefreshRecoveryListSnapshot()
        {
            _recoveryListSnapshot = LegacyEs3Save.GetRecoverableCandidates();
            _recoveryListSnapshotUtc = DateTime.UtcNow;
            return _recoveryListSnapshot;
        }

        /// <summary>
        /// Clears candidate index state after a successful recovery commit.
        /// </summary>
        private void ClearRecoveryListSnapshot()
        {
            _recoveryListSnapshot = null;
            _recoveryListSnapshotUtc = default;
        }

        /// <summary>
        /// Synchronizes local entitlement state after a verified recovery has been published.
        /// </summary>
        private void RunPostLoadEntitlementSync()
        {
            // Match startup/clipboard normalization so UI + entitlement-dependent systems are correct immediately.
            bool doubleIpUnlocked = saveSettings.doubleIp || PlayerPrefs.GetInt("doubleip", 0) == 1;
            saveSettings.doubleIp = doubleIpUnlocked;
            if (saveSettings.doubleIp) PlayerPrefs.SetInt("doubleip", 1);

            if (saveSettings.debugOptions)
            {
                saveSettings.debugEverEnabled = true;
                if (!PlayerEntitlementsStore.DebugEntitlementPurchased)
                    PlayerEntitlementsStore.DebugEntitlementPurchased = true;
            }

            NotifyDebugOptionsChanged();
        }
    }
}
