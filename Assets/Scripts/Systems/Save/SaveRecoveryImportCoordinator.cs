/*
 * Purpose: Unifies explicit clipboard, manual, console, and support-assisted save imports behind preparation and
 * verified transactional canonical persistence.
 * Runs: Runtime recovery/import entry points and Unity EditMode save-integrity tests.
 * Primary entry points: TryImportText, TryImportCandidate, and TryPrepareCandidate.
 * Owns: Explicit overwrite policy, fresh local lifecycle baseline establishment, and commit-before-publication output.
 * Delegates: Decode/migration/validation to CanonicalSaveStore and verified backup/replacement to SaveSystem storage.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/Oracle.Clipboard.cs.
 * - Assets/Scripts/Expansion/Oracle.RecoveryCommands.cs.
 * - Assets/Scripts/Expansion/Oracle.Persistence.cs.
 * - Assets/Scripts/Systems/Save/StartupRecoveryInteractionSession.cs.
 *
 * Change notes:
 * - A returned settings graph is the final post-mutation preparation and is publishable only after verified commit.
 * - Existing canonical data cannot be replaced unless the caller records an explicit user overwrite decision.
 * - Imported historical quit timestamps are always cleared before commit, preventing duplicate offline-time grants.
 * - Candidate preparation remains read-only; source artifacts and adapter-owned decoded objects must not be mutated.
 */

using System;
using System.Globalization;
using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Coordinates explicit recovery imports without allowing unprepared state to reach runtime or canonical storage.
    /// </summary>
    public sealed class SaveRecoveryImportCoordinator
    {
        private readonly CanonicalSaveStore _store;
        private readonly Func<DateTime> _utcNow;

        /// <summary>
        /// Creates an import coordinator over the production prepared transactional store.
        /// </summary>
        /// <param name="store">The canonical save store used for preparation and verified writes.</param>
        /// <param name="utcNow">Optional deterministic UTC source for lifecycle baseline tests.</param>
        public SaveRecoveryImportCoordinator(
            CanonicalSaveStore store,
            Func<DateTime> utcNow = null)
        {
            _store = store ?? throw new ArgumentNullException(nameof(store));
            _utcNow = utcNow ?? (() => DateTime.UtcNow);
        }

        /// <summary>
        /// Prepares and transactionally imports untrusted clipboard or support text.
        /// </summary>
        /// <param name="text">The untrusted save envelope or supported legacy text.</param>
        /// <param name="allowCanonicalOverwrite">
        /// Whether the caller has recorded explicit approval to replace an existing canonical artifact.
        /// </param>
        /// <param name="beforeCommit">
        /// Optional local-state merge applied to the isolated prepared graph before it is re-prepared and committed.
        /// </param>
        /// <param name="sourcePreparation">The classified preparation of the untrusted source.</param>
        /// <param name="committedSettings">The settings safe to publish only when the method succeeds.</param>
        /// <param name="error">The preparation, policy, mutation, or transactional write failure.</param>
        /// <returns><see langword="true"/> only after verified canonical replacement.</returns>
        public bool TryImportText(
            string text,
            bool allowCanonicalOverwrite,
            Action<Oracle.SaveDataSettings> beforeCommit,
            out PreparedSaveResult sourcePreparation,
            out Oracle.SaveDataSettings committedSettings,
            out string error)
        {
            sourcePreparation = _store.PrepareText(text);
            return TryCommitPreparedImport(
                sourcePreparation,
                allowCanonicalOverwrite,
                beforeCommit,
                out committedSettings,
                out error);
        }

        /// <summary>
        /// Prepares and transactionally imports one deterministic canonical or legacy adapter candidate.
        /// </summary>
        /// <param name="candidate">The immutable candidate descriptor.</param>
        /// <param name="allowCanonicalOverwrite">
        /// Whether the caller has recorded explicit approval to replace an existing canonical artifact.
        /// </param>
        /// <param name="beforeCommit">
        /// Optional local-state merge applied to the isolated prepared graph before it is re-prepared and committed.
        /// </param>
        /// <param name="sourcePreparation">The classified preparation of the candidate.</param>
        /// <param name="committedSettings">The settings safe to publish only when the method succeeds.</param>
        /// <param name="error">The read, preparation, policy, mutation, or transactional write failure.</param>
        /// <returns><see langword="true"/> only after verified canonical replacement.</returns>
        public bool TryImportCandidate(
            SaveStorageCandidate candidate,
            bool allowCanonicalOverwrite,
            Action<Oracle.SaveDataSettings> beforeCommit,
            out PreparedSaveResult sourcePreparation,
            out Oracle.SaveDataSettings committedSettings,
            out string error)
        {
            if (!_store.TryPrepareCandidate(candidate, out sourcePreparation, out error))
            {
                committedSettings = null;
                return false;
            }

            return TryCommitPreparedImport(
                sourcePreparation,
                allowCanonicalOverwrite,
                beforeCommit,
                out committedSettings,
                out error);
        }

        /// <summary>
        /// Prepares one candidate without writing, publishing, or changing the candidate artifact.
        /// </summary>
        /// <param name="candidate">The immutable candidate descriptor.</param>
        /// <param name="preparation">The classified preparation result.</param>
        /// <param name="error">The read or preparation failure.</param>
        /// <returns><see langword="true"/> when the candidate is valid and supported.</returns>
        public bool TryPrepareCandidate(
            SaveStorageCandidate candidate,
            out PreparedSaveResult preparation,
            out string error)
        {
            return _store.TryPrepareCandidate(candidate, out preparation, out error);
        }

        /// <summary>
        /// Establishes a fresh import baseline and commits the prepared graph before returning publishable settings.
        /// </summary>
        /// <param name="sourcePreparation">The successful isolated source preparation.</param>
        /// <param name="allowCanonicalOverwrite">Whether replacement of an existing canonical artifact is approved.</param>
        /// <param name="beforeCommit">Optional isolated-graph mutation applied before final preparation.</param>
        /// <param name="committedSettings">The successfully committed settings.</param>
        /// <param name="error">The policy, mutation, or transactional write failure.</param>
        /// <returns><see langword="true"/> only after verified canonical replacement.</returns>
        private bool TryCommitPreparedImport(
            PreparedSaveResult sourcePreparation,
            bool allowCanonicalOverwrite,
            Action<Oracle.SaveDataSettings> beforeCommit,
            out Oracle.SaveDataSettings committedSettings,
            out string error)
        {
            committedSettings = null;
            error = null;
            if (sourcePreparation == null || !sourcePreparation.Succeeded)
            {
                error = sourcePreparation?.Error ?? "Save preparation did not produce a result.";
                return false;
            }

            if (_store.Exists() && !allowCanonicalOverwrite)
            {
                error = "A canonical save already exists. Explicit overwrite approval is required.";
                return false;
            }

            try
            {
                beforeCommit?.Invoke(sourcePreparation.Settings);
            }
            catch (Exception ex)
            {
                error = $"Import preparation callback failed: {ex.Message}";
                return false;
            }

            DateTime now = _utcNow().ToUniversalTime();
            sourcePreparation.Settings.dateQuitString = string.Empty;
            sourcePreparation.Settings.lastSuccessfulLoadUtc =
                now.ToString(CultureInfo.InvariantCulture);

            PreparedSaveResult finalPreparation =
                _store.PrepareSettings(sourcePreparation.Settings);
            if (!finalPreparation.Succeeded)
            {
                error = finalPreparation.Error;
                return false;
            }

            if (!_store.TrySave(finalPreparation.Settings, out _, out error))
            {
                return false;
            }

            committedSettings = finalPreparation.Settings;
            return true;
        }
    }
}
