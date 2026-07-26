/*
 * Purpose: Selects and restores prepared startup save candidates before Oracle publication.
 * Runs: Runtime startup load and Unity EditMode recovery tests.
 * Primary entry points: Resolve.
 * Owns: Candidate decision order, future-version stop policy, and automatic recovery selection.
 * Delegates: Discovery/read/preparation/verified commit to CanonicalSaveStore and SaveSystem.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/ISaveStore.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs.
 * - Assets/Scripts/Systems/Save/StartupSaveRecoveryResult.cs.
 *
 * Change notes:
 * - A byte-identical healthy primary wins without rewriting it.
 * - A primary changed by numeric repair must be transactionally committed before publication.
 * - Canonical recovery candidates are inspected newest-first with deterministic tie-breaks.
 * - Any future-version candidate stops fallback and remains untouched.
 * - Invalid candidates never commit; a valid winner must use the verified transactional writer.
 */

using System;
using System.Collections.Generic;
using System.Linq;

namespace Systems.Save
{
    /// <summary>
    /// Performs deterministic, read-only startup evaluation until a verified winner is selected.
    /// </summary>
    public sealed class StartupSaveRecoveryCoordinator
    {
        private readonly CanonicalSaveStore _store;

        /// <summary>
        /// Creates startup recovery orchestration over the prepared canonical store.
        /// </summary>
        /// <param name="store">The prepared transactional store.</param>
        public StartupSaveRecoveryCoordinator(CanonicalSaveStore store)
        {
            _store = store ?? throw new ArgumentNullException(nameof(store));
        }

        /// <summary>
        /// Resolves primary, canonical recovery, then legacy candidates without publishing runtime state.
        /// </summary>
        /// <param name="explicitLegacyCandidates">Read-only candidates from existing legacy adapters.</param>
        /// <returns>A complete classified startup decision.</returns>
        public StartupSaveRecoveryResult Resolve(
            IEnumerable<SaveStorageCandidate> explicitLegacyCandidates = null)
        {
            IReadOnlyList<SaveStorageCandidate> discovered =
                _store.DiscoverCandidates(explicitLegacyCandidates);
            var attempts = new List<StartupRecoveryCandidateAttempt>();
            if (discovered.Count == 0)
            {
                return CreateResult(
                    StartupSaveRecoveryStatus.NoArtifacts,
                    null,
                    null,
                    discovered,
                    attempts,
                    null);
            }

            SaveStorageCandidate primary = discovered.FirstOrDefault(
                candidate => candidate.Source == SaveStorageCandidateSource.CanonicalPrimary);
            if (primary != null)
            {
                StartupSaveRecoveryResult primaryResult =
                    TryResolvePrimary(primary, discovered, attempts);
                if (primaryResult != null)
                {
                    return primaryResult;
                }
            }

            SaveStorageCandidate[] canonicalRecovery = OrderNewestFirst(
                discovered.Where(candidate =>
                    candidate.Source == SaveStorageCandidateSource.CanonicalTemporary ||
                    candidate.Source == SaveStorageCandidateSource.CanonicalBackup));
            StartupSaveRecoveryResult canonicalResult =
                TryResolveRecoveryGroup(
                    canonicalRecovery,
                    StartupSaveRecoveryStatus.RecoveredCanonical,
                    discovered,
                    attempts);
            if (canonicalResult != null)
            {
                return canonicalResult;
            }

            SaveStorageCandidate[] legacy = OrderNewestFirst(
                discovered.Where(candidate =>
                    candidate.Source == SaveStorageCandidateSource.LegacyEs3 ||
                    candidate.Source == SaveStorageCandidateSource.LegacyOdinJson));
            StartupSaveRecoveryResult legacyResult =
                TryResolveRecoveryGroup(
                    legacy,
                    StartupSaveRecoveryStatus.RecoveredLegacy,
                    discovered,
                    attempts);
            if (legacyResult != null)
            {
                return legacyResult;
            }

            return CreateResult(
                StartupSaveRecoveryStatus.AllCandidatesInvalid,
                null,
                null,
                discovered,
                attempts,
                "Save artifacts were found, but none passed preparation and validation.");
        }

        /// <summary>
        /// Prepares the primary and returns a terminal result only for success or future schema.
        /// </summary>
        /// <param name="primary">The canonical primary descriptor.</param>
        /// <param name="discovered">All discovered artifacts.</param>
        /// <param name="attempts">The mutable support attempt list.</param>
        /// <returns>A terminal result, or null when fallback inspection should continue.</returns>
        private StartupSaveRecoveryResult TryResolvePrimary(
            SaveStorageCandidate primary,
            IReadOnlyList<SaveStorageCandidate> discovered,
            ICollection<StartupRecoveryCandidateAttempt> attempts)
        {
            if (!_store.TryPrepareCandidate(primary, out PreparedSaveResult preparation, out string error))
            {
                attempts.Add(new StartupRecoveryCandidateAttempt(primary, preparation, error));
                return IsFuture(preparation)
                    ? CreateUnsupported(primary, discovered, attempts, error)
                    : null;
            }

            attempts.Add(new StartupRecoveryCandidateAttempt(primary, preparation, null));
            if (preparation.Settings.numericRepairNoticePending)
            {
                if (!_store.TryCommitCandidate(
                        primary,
                        out PreparedSaveResult committed,
                        out string commitError))
                {
                    attempts.Add(new StartupRecoveryCandidateAttempt(primary, committed, commitError));
                    return CreateResult(
                        StartupSaveRecoveryStatus.RecoveryWriteFailed,
                        null,
                        primary,
                        discovered,
                        attempts,
                        commitError);
                }

                preparation = committed;
            }

            return CreateResult(
                StartupSaveRecoveryStatus.PrimaryReady,
                preparation.Settings,
                primary,
                discovered,
                attempts,
                null);
        }

        /// <summary>
        /// Inspects one ordered recovery group and commits only its first fully valid candidate.
        /// </summary>
        /// <param name="candidates">Newest-first deterministic candidates.</param>
        /// <param name="successStatus">Canonical or legacy success classification.</param>
        /// <param name="discovered">All discovered artifacts.</param>
        /// <param name="attempts">The mutable support attempt list.</param>
        /// <returns>A terminal success/future/write-failure result, or null when the group has no valid candidate.</returns>
        private StartupSaveRecoveryResult TryResolveRecoveryGroup(
            IEnumerable<SaveStorageCandidate> candidates,
            StartupSaveRecoveryStatus successStatus,
            IReadOnlyList<SaveStorageCandidate> discovered,
            ICollection<StartupRecoveryCandidateAttempt> attempts)
        {
            foreach (SaveStorageCandidate candidate in candidates)
            {
                if (!_store.TryPrepareCandidate(candidate, out PreparedSaveResult preparation, out string prepareError))
                {
                    attempts.Add(new StartupRecoveryCandidateAttempt(candidate, preparation, prepareError));
                    if (IsFuture(preparation))
                    {
                        return CreateUnsupported(candidate, discovered, attempts, prepareError);
                    }

                    continue;
                }

                attempts.Add(new StartupRecoveryCandidateAttempt(candidate, preparation, null));
                if (!_store.TryCommitCandidate(
                        candidate,
                        out PreparedSaveResult committed,
                        out string commitError))
                {
                    attempts.Add(new StartupRecoveryCandidateAttempt(candidate, committed, commitError));
                    return CreateResult(
                        StartupSaveRecoveryStatus.RecoveryWriteFailed,
                        null,
                        candidate,
                        discovered,
                        attempts,
                        commitError);
                }

                return CreateResult(
                    successStatus,
                    committed.Settings,
                    candidate,
                    discovered,
                    attempts,
                    null);
            }

            return null;
        }

        /// <summary>
        /// Orders candidates by captured timestamp, source, then ordinal path.
        /// </summary>
        /// <param name="candidates">The candidates to order.</param>
        /// <returns>A deterministic newest-first array.</returns>
        private static SaveStorageCandidate[] OrderNewestFirst(
            IEnumerable<SaveStorageCandidate> candidates)
        {
            return candidates
                .OrderByDescending(candidate => candidate.LastWriteUtc ?? DateTime.MinValue)
                .ThenBy(candidate => candidate.Source)
                .ThenBy(candidate => candidate.Path, StringComparer.Ordinal)
                .ToArray();
        }

        /// <summary>
        /// Reports whether a failed preparation is the non-fallback future-schema outcome.
        /// </summary>
        /// <param name="preparation">The candidate preparation result.</param>
        /// <returns><see langword="true"/> for an unsupported future schema.</returns>
        private static bool IsFuture(PreparedSaveResult preparation)
        {
            return preparation?.FailureReason == PreparedSaveFailureReason.UnsupportedFutureVersion;
        }

        /// <summary>
        /// Creates the terminal future-version result.
        /// </summary>
        /// <param name="candidate">The future-version candidate.</param>
        /// <param name="discovered">All artifacts.</param>
        /// <param name="attempts">Attempts completed so far.</param>
        /// <param name="error">The preparation diagnostic.</param>
        /// <returns>The unsupported-version result.</returns>
        private static StartupSaveRecoveryResult CreateUnsupported(
            SaveStorageCandidate candidate,
            IReadOnlyList<SaveStorageCandidate> discovered,
            IEnumerable<StartupRecoveryCandidateAttempt> attempts,
            string error)
        {
            return CreateResult(
                StartupSaveRecoveryStatus.UnsupportedFutureVersion,
                null,
                candidate,
                discovered,
                attempts,
                error);
        }

        /// <summary>
        /// Freezes mutable discovery evidence into one result.
        /// </summary>
        /// <param name="status">The final classification.</param>
        /// <param name="settings">Prepared settings, if publishable.</param>
        /// <param name="selected">The selected or blocking candidate.</param>
        /// <param name="discovered">All artifacts.</param>
        /// <param name="attempts">Attempts completed so far.</param>
        /// <param name="error">The final diagnostic.</param>
        /// <returns>An immutable startup result.</returns>
        private static StartupSaveRecoveryResult CreateResult(
            StartupSaveRecoveryStatus status,
            Expansion.Oracle.SaveDataSettings settings,
            SaveStorageCandidate selected,
            IEnumerable<SaveStorageCandidate> discovered,
            IEnumerable<StartupRecoveryCandidateAttempt> attempts,
            string error)
        {
            return new StartupSaveRecoveryResult(
                status,
                settings,
                selected,
                discovered?.ToArray() ?? Array.Empty<SaveStorageCandidate>(),
                attempts?.ToArray() ?? Array.Empty<StartupRecoveryCandidateAttempt>(),
                error);
        }
    }
}
