/*
 * Purpose: Defines verified canonical writes and deterministic read-only save candidate discovery.
 * Runs: Runtime canonical storage and Unity Editor storage tests.
 * Primary entry points: DiscoverCandidates, TryReadCandidateText, and TryWriteTextVerified.
 * Owns: Storage-level transaction and artifact enumeration contracts.
 * Delegates: Save semantics to verifier callbacks supplied by SaveSystem/SavePreparationPipeline.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/OdinStringFileStorage.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs.
 * - Assets/Scripts/Systems/Save/SaveStorageCandidate.cs.
 *
 * Change notes:
 * - A verified write must not replace the canonical artifact until the exact temp-file bytes pass verification.
 * - Candidate discovery is read-only and deterministically ordered; it must not repair, prune, or rewrite artifacts.
 */

using System;
using System.Collections.Generic;

namespace Systems.Save
{
    /// <summary>
    /// Reports whether a reread temporary artifact is safe to commit.
    /// </summary>
    public readonly struct SaveTextVerificationResult
    {
        /// <summary>
        /// Creates a verifier result.
        /// </summary>
        /// <param name="succeeded">Whether the exact reread text is valid.</param>
        /// <param name="error">The validation failure when unsuccessful.</param>
        public SaveTextVerificationResult(bool succeeded, string error)
        {
            Succeeded = succeeded;
            Error = error;
        }

        /// <summary>
        /// Gets whether verification succeeded.
        /// </summary>
        public bool Succeeded { get; }

        /// <summary>
        /// Gets the verifier error.
        /// </summary>
        public string Error { get; }
    }

    /// <summary>
    /// Extends basic text storage with read-only discovery and verified transactional replacement.
    /// </summary>
    public interface ITransactionalSaveStorage : ISaveStorage
    {
        /// <summary>
        /// Discovers primary, temporary, backup, and caller-supplied legacy candidates without changing artifacts.
        /// </summary>
        /// <param name="explicitLegacyCandidates">Already decoded candidates from existing legacy adapters.</param>
        /// <returns>A deterministic candidate sequence.</returns>
        IReadOnlyList<SaveStorageCandidate> DiscoverCandidates(
            IEnumerable<SaveStorageCandidate> explicitLegacyCandidates = null);

        /// <summary>
        /// Reads one filesystem-backed candidate without modifying it.
        /// </summary>
        /// <param name="candidate">The candidate descriptor returned by discovery.</param>
        /// <param name="text">The exact trimmed artifact text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when non-empty text was read.</returns>
        bool TryReadCandidateText(
            SaveStorageCandidate candidate,
            out string text,
            out string error);

        /// <summary>
        /// Writes a temp artifact, rereads and verifies it, then backs up and atomically replaces canonical storage.
        /// </summary>
        /// <param name="text">The prepared canonical text.</param>
        /// <param name="verifier">The semantic verifier for exact reread temp-file text.</param>
        /// <param name="error">The transaction failure.</param>
        /// <returns><see langword="true"/> only after canonical replacement succeeds.</returns>
        bool TryWriteTextVerified(
            string text,
            Func<string, SaveTextVerificationResult> verifier,
            out string error);
    }
}
