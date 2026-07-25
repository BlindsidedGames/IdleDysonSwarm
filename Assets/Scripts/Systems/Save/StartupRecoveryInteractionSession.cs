/*
 * Purpose: Provides explicit non-destructive support actions for one blocked startup recovery result.
 * Runs: Runtime blocking recovery UI and Unity EditMode interaction tests.
 * Primary entry points: TryGetPrimaryText, BuildSupportReport, TryExportArtifacts, and TryImportClipboardText.
 * Owns: Support report formatting and explicit actions for one blocked startup result.
 * Delegates: Safe clipboard import to SaveRecoveryImportCoordinator and file copies to SaveArtifactExporter.
 *
 * Interacts with:
 * - Assets/Scripts/User Interface/StartupRecoveryView.cs.
 * - Assets/Scripts/Systems/Save/StartupSaveRecoveryResult.cs.
 * - Assets/Scripts/Systems/Save/SaveArtifactExporter.cs.
 * - Assets/Scripts/Systems/Save/SaveRecoveryImportCoordinator.cs.
 *
 * Change notes:
 * - Import never publishes directly; it commits canonically and requires a clean startup reload.
 * - Startup import uses the same Stage 4 path as in-game/manual imports and explicitly authorizes replacement because
 *   the blocking screen requires a deliberate player action.
 * - Export/copy actions are read-only with respect to every discovered source artifact.
 */

using System;
using System.Globalization;
using System.Linq;
using System.Text;

namespace Systems.Save
{
    /// <summary>
    /// Exposes explicit support and recovery actions for a blocked startup decision.
    /// </summary>
    public sealed class StartupRecoveryInteractionSession
    {
        private readonly CanonicalSaveStore _store;
        private readonly SaveRecoveryImportCoordinator _importCoordinator;
        private readonly Func<DateTime> _utcNow;

        /// <summary>
        /// Creates interaction actions for one immutable startup result.
        /// </summary>
        /// <param name="store">The prepared transactional store.</param>
        /// <param name="result">The blocking startup result.</param>
        /// <param name="utcNow">Optional deterministic UTC source.</param>
        public StartupRecoveryInteractionSession(
            CanonicalSaveStore store,
            StartupSaveRecoveryResult result,
            Func<DateTime> utcNow = null)
        {
            _store = store ?? throw new ArgumentNullException(nameof(store));
            Result = result ?? throw new ArgumentNullException(nameof(result));
            _utcNow = utcNow ?? (() => DateTime.UtcNow);
            _importCoordinator = new SaveRecoveryImportCoordinator(_store, _utcNow);
        }

        /// <summary>
        /// Gets the immutable blocked startup result.
        /// </summary>
        public StartupSaveRecoveryResult Result { get; }

        /// <summary>
        /// Reads the primary canonical text for an explicit clipboard copy action.
        /// </summary>
        /// <param name="text">The exact primary text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when a primary artifact exists and is readable.</returns>
        public bool TryGetPrimaryText(out string text, out string error)
        {
            SaveStorageCandidate primary = Result.Artifacts.FirstOrDefault(
                candidate => candidate.Source == SaveStorageCandidateSource.CanonicalPrimary);
            if (primary == null)
            {
                text = string.Empty;
                error = "No primary canonical save artifact was discovered.";
                return false;
            }

            return _store.TryReadCandidateText(primary, out text, out error);
        }

        /// <summary>
        /// Builds plain-text status, artifact locations, and classified preparation details.
        /// </summary>
        /// <returns>A support-oriented recovery report.</returns>
        public string BuildSupportReport()
        {
            var report = new StringBuilder();
            report.AppendLine("Idle Dyson Swarm startup save recovery");
            report.AppendLine($"Status: {Result.Status}");
            report.AppendLine($"Generated UTC: {_utcNow().ToUniversalTime():O}");
            if (!string.IsNullOrWhiteSpace(Result.Error))
            {
                report.AppendLine($"Outcome error: {Result.Error}");
            }

            report.AppendLine();
            report.AppendLine($"Discovered artifacts: {Result.Artifacts.Count}");
            for (int index = 0; index < Result.Artifacts.Count; index++)
            {
                SaveStorageCandidate artifact = Result.Artifacts[index];
                string timestamp = artifact.LastWriteUtc.HasValue
                    ? artifact.LastWriteUtc.Value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture)
                    : "unknown";
                report.AppendLine(
                    $"{index + 1}. {artifact.Source} | UTC={timestamp} | {artifact.Path}");
            }

            report.AppendLine();
            report.AppendLine($"Preparation attempts: {Result.Attempts.Count}");
            for (int index = 0; index < Result.Attempts.Count; index++)
            {
                StartupRecoveryCandidateAttempt attempt = Result.Attempts[index];
                string classification = attempt.Preparation == null
                    ? "ReadFailed"
                    : attempt.Preparation.Succeeded
                        ? "Prepared"
                        : attempt.Preparation.FailureReason.ToString();
                report.AppendLine(
                    $"{index + 1}. {attempt.Candidate.Source} | {classification} | {attempt.Error}");
            }

            return report.ToString();
        }

        /// <summary>
        /// Exports source artifacts byte-for-byte into a new local support folder.
        /// </summary>
        /// <param name="exportRoot">The export parent folder.</param>
        /// <param name="exportFolder">The created folder.</param>
        /// <param name="error">The export failure or partial-copy warnings.</param>
        /// <returns><see langword="true"/> when every available artifact and report were exported.</returns>
        public bool TryExportArtifacts(
            string exportRoot,
            out string exportFolder,
            out string error)
        {
            return SaveArtifactExporter.Export(
                exportRoot,
                Result.Artifacts,
                BuildSupportReport(),
                _utcNow(),
                out exportFolder,
                out error);
        }

        /// <summary>
        /// Safely imports a clipboard envelope by preparing it, clearing historical replay input, and committing it.
        /// </summary>
        /// <param name="clipboardText">The clipboard envelope.</param>
        /// <param name="error">The preparation or transaction failure.</param>
        /// <returns><see langword="true"/> only after verified canonical replacement.</returns>
        public bool TryImportClipboardText(string clipboardText, out string error)
        {
            return _importCoordinator.TryImportText(
                clipboardText,
                allowCanonicalOverwrite: true,
                beforeCommit: null,
                out _,
                out _,
                out error);
        }
    }
}
