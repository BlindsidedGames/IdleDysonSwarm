/*
 * Purpose: Describes deterministic startup save-recovery decisions without publishing runtime state.
 * Runs: Runtime startup orchestration and Unity EditMode recovery tests.
 * Primary entry points: StartupSaveRecoveryResult, StartupRecoveryPublicationGate, and StartupRecoveryResetGate.
 * Owns: Immutable decision metadata plus one-shot publication/replay and two-step reset authorization.
 * Delegates: Candidate preparation/commit to StartupSaveRecoveryCoordinator and runtime adoption to Oracle.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/StartupSaveRecoveryCoordinator.cs.
 * - Assets/Scripts/Expansion/Oracle.StartupRecovery.cs.
 * - Assets/Scripts/User Interface/StartupRecoveryView.cs.
 *
 * Change notes:
 * - Blocking statuses must never expose publishable settings.
 * - Future-version outcomes must remain distinct from generic invalid-data outcomes.
 * - Publication and offline replay are a single one-shot authorization boundary.
 */

using System;
using System.Collections.Generic;
using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Identifies the player-visible result of startup save selection.
    /// </summary>
    public enum StartupSaveRecoveryStatus
    {
        /// <summary>
        /// No save artifacts exist, so normal first-run creation may proceed.
        /// </summary>
        NoArtifacts,

        /// <summary>
        /// The primary canonical artifact prepared successfully without a write.
        /// </summary>
        PrimaryReady,

        /// <summary>
        /// A canonical temporary or backup artifact was verified and restored.
        /// </summary>
        RecoveredCanonical,

        /// <summary>
        /// An explicit legacy candidate was verified and restored canonically.
        /// </summary>
        RecoveredLegacy,

        /// <summary>
        /// A newer-schema artifact requires a newer game build and blocks fallback.
        /// </summary>
        UnsupportedFutureVersion,

        /// <summary>
        /// Artifacts exist but none can be safely prepared.
        /// </summary>
        AllCandidatesInvalid,

        /// <summary>
        /// A valid candidate was found but its verified canonical restoration failed.
        /// </summary>
        RecoveryWriteFailed
    }

    /// <summary>
    /// Records one read-only candidate preparation attempt for support details.
    /// </summary>
    public sealed class StartupRecoveryCandidateAttempt
    {
        /// <summary>
        /// Creates one immutable candidate attempt record.
        /// </summary>
        /// <param name="candidate">The inspected descriptor.</param>
        /// <param name="preparation">The classified preparation result, or null after a read failure.</param>
        /// <param name="error">The read, preparation, or commit diagnostic.</param>
        public StartupRecoveryCandidateAttempt(
            SaveStorageCandidate candidate,
            PreparedSaveResult preparation,
            string error)
        {
            Candidate = candidate;
            Preparation = preparation;
            Error = error ?? preparation?.Error ?? string.Empty;
        }

        /// <summary>
        /// Gets the inspected descriptor.
        /// </summary>
        public SaveStorageCandidate Candidate { get; }

        /// <summary>
        /// Gets the classified preparation result when candidate bytes were readable.
        /// </summary>
        public PreparedSaveResult Preparation { get; }

        /// <summary>
        /// Gets the support diagnostic.
        /// </summary>
        public string Error { get; }
    }

    /// <summary>
    /// Contains one complete startup recovery decision and its read-only evidence.
    /// </summary>
    public sealed class StartupSaveRecoveryResult
    {
        /// <summary>
        /// Creates an immutable startup recovery result.
        /// </summary>
        /// <param name="status">The classified startup outcome.</param>
        /// <param name="settings">The isolated publishable settings for successful existing-save outcomes.</param>
        /// <param name="selectedCandidate">The primary or restored candidate.</param>
        /// <param name="artifacts">Every discovered candidate descriptor.</param>
        /// <param name="attempts">Candidate preparation attempts made before the decision.</param>
        /// <param name="error">The final diagnostic, if any.</param>
        internal StartupSaveRecoveryResult(
            StartupSaveRecoveryStatus status,
            Oracle.SaveDataSettings settings,
            SaveStorageCandidate selectedCandidate,
            IReadOnlyList<SaveStorageCandidate> artifacts,
            IReadOnlyList<StartupRecoveryCandidateAttempt> attempts,
            string error)
        {
            Status = status;
            Settings = settings;
            SelectedCandidate = selectedCandidate;
            Artifacts = artifacts ?? Array.Empty<SaveStorageCandidate>();
            Attempts = attempts ?? Array.Empty<StartupRecoveryCandidateAttempt>();
            Error = error ?? string.Empty;
        }

        /// <summary>
        /// Gets the classified startup outcome.
        /// </summary>
        public StartupSaveRecoveryStatus Status { get; }

        /// <summary>
        /// Gets isolated publishable settings for successful existing-save outcomes.
        /// </summary>
        public Oracle.SaveDataSettings Settings { get; }

        /// <summary>
        /// Gets the primary or restored candidate.
        /// </summary>
        public SaveStorageCandidate SelectedCandidate { get; }

        /// <summary>
        /// Gets every read-only artifact descriptor discovered for this decision.
        /// </summary>
        public IReadOnlyList<SaveStorageCandidate> Artifacts { get; }

        /// <summary>
        /// Gets candidate attempts made before the decision.
        /// </summary>
        public IReadOnlyList<StartupRecoveryCandidateAttempt> Attempts { get; }

        /// <summary>
        /// Gets the final support diagnostic.
        /// </summary>
        public string Error { get; }

        /// <summary>
        /// Gets whether existing prepared settings may enter runtime publication.
        /// </summary>
        public bool HasPublishableSettings =>
            Settings != null &&
            (Status == StartupSaveRecoveryStatus.PrimaryReady ||
             Status == StartupSaveRecoveryStatus.RecoveredCanonical ||
             Status == StartupSaveRecoveryStatus.RecoveredLegacy);

        /// <summary>
        /// Gets whether startup must remain blocked for a player decision.
        /// </summary>
        public bool IsBlocking =>
            Status == StartupSaveRecoveryStatus.UnsupportedFutureVersion ||
            Status == StartupSaveRecoveryStatus.AllCandidatesInvalid ||
            Status == StartupSaveRecoveryStatus.RecoveryWriteFailed;
    }

    /// <summary>
    /// Couples exactly one prepared-state publication with exactly one offline-replay schedule.
    /// </summary>
    public sealed class StartupRecoveryPublicationGate
    {
        private bool _published;

        /// <summary>
        /// Publishes one successful result and schedules replay exactly once.
        /// </summary>
        /// <param name="result">The startup recovery decision.</param>
        /// <param name="publish">The runtime publication callback.</param>
        /// <param name="scheduleOfflineReplay">The replay-scheduling callback.</param>
        /// <returns><see langword="true"/> only for the first successful publication.</returns>
        public bool TryPublish(
            StartupSaveRecoveryResult result,
            Action<Oracle.SaveDataSettings> publish,
            Action scheduleOfflineReplay)
        {
            if (_published || result == null || !result.HasPublishableSettings ||
                publish == null || scheduleOfflineReplay == null)
            {
                return false;
            }

            _published = true;
            publish(result.Settings);
            scheduleOfflineReplay();
            return true;
        }
    }

    /// <summary>
    /// Requires a distinct arm action before a destructive reset callback may run.
    /// </summary>
    public sealed class StartupRecoveryResetGate
    {
        /// <summary>
        /// Gets whether reset confirmation is currently armed.
        /// </summary>
        public bool IsArmed { get; private set; }

        /// <summary>
        /// Arms the second destructive confirmation step without changing data.
        /// </summary>
        public void Arm()
        {
            IsArmed = true;
        }

        /// <summary>
        /// Cancels the armed reset without changing data.
        /// </summary>
        public void Cancel()
        {
            IsArmed = false;
        }

        /// <summary>
        /// Runs the destructive callback only when separately armed, then disarms.
        /// </summary>
        /// <param name="confirmedReset">The destructive callback.</param>
        /// <returns><see langword="true"/> only when an armed reset was confirmed.</returns>
        public bool TryConfirm(Action confirmedReset)
        {
            if (!IsArmed || confirmedReset == null)
            {
                return false;
            }

            IsArmed = false;
            confirmedReset();
            return true;
        }
    }
}
