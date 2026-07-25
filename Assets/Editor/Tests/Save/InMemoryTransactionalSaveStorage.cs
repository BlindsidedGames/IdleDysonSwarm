/*
 * Purpose: Provides deterministic in-memory verified transactional storage for save-system EditMode tests.
 * Runs: Unity EditMode test runner only.
 * Primary entry points: Seed, TryWriteTextVerified, DiscoverCandidates, and failure-injection properties.
 * Owns: In-memory primary/temp/backup state and replacement simulation.
 * Delegates: Semantic verification to the callback supplied by SaveSystem.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/ITransactionalSaveStorage.cs.
 * - Assets/Editor/Tests/Save/SaveSystemTests.cs and CanonicalSaveStoreTests.cs.
 * - Assets/Editor/Tests/Systems/OfflinePersistenceRegressionTests.cs.
 *
 * Change notes:
 * - Failure injection must preserve Text exactly so tests model the production old-canonical guarantee.
 * - TempText intentionally remains after verification/replacement failures for artifact-inspection assertions.
 */

using System;
using System.Collections.Generic;
using System.Linq;
using Systems.Save;

namespace Tests.Save
{
    /// <summary>
    /// Simulates the production temp-verify-backup-replace transaction without filesystem IO.
    /// </summary>
    internal sealed class InMemoryTransactionalSaveStorage : ITransactionalSaveStorage
    {
        private readonly List<string> _backups = new List<string>();

        /// <summary>
        /// Gets the storage debug label.
        /// </summary>
        public string DebugName => "in-memory";

        /// <summary>
        /// Gets the current canonical text.
        /// </summary>
        internal string Text { get; private set; } = string.Empty;

        /// <summary>
        /// Gets the retained temporary text after a failed transaction.
        /// </summary>
        internal string TempText { get; private set; }

        /// <summary>
        /// Gets snapshots preserved before successful replacements.
        /// </summary>
        internal IReadOnlyList<string> Backups => _backups;

        /// <summary>
        /// Gets or sets whether replacement fails after successful temp verification.
        /// </summary>
        internal bool FailReplacement { get; set; }

        /// <summary>
        /// Gets or sets an optional transform applied to temp text before verifier reread.
        /// </summary>
        internal Func<string, string> TempTransform { get; set; }

        /// <summary>
        /// Seeds canonical text without invoking transaction behavior.
        /// </summary>
        /// <param name="text">The initial canonical text.</param>
        internal void Seed(string text)
        {
            Text = text ?? string.Empty;
        }

        /// <summary>
        /// Reports whether canonical text exists.
        /// </summary>
        /// <returns><see langword="true"/> for non-empty canonical text.</returns>
        public bool Exists()
        {
            return !string.IsNullOrWhiteSpace(Text);
        }

        /// <summary>
        /// Reads canonical text.
        /// </summary>
        /// <param name="text">The canonical text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> for non-empty canonical text.</returns>
        public bool TryReadText(out string text, out string error)
        {
            text = Text;
            error = Exists() ? null : "File not found.";
            return Exists();
        }

        /// <summary>
        /// Performs a compatibility atomic write with non-empty verification.
        /// </summary>
        /// <param name="text">The candidate text.</param>
        /// <param name="error">The transaction failure.</param>
        /// <returns><see langword="true"/> after replacement.</returns>
        public bool TryWriteTextAtomic(string text, out string error)
        {
            return TryWriteTextVerified(
                text,
                reread => new SaveTextVerificationResult(
                    !string.IsNullOrWhiteSpace(reread),
                    "Temporary text was empty."),
                out error);
        }

        /// <summary>
        /// Simulates temp write, reread verification, backup, and replacement.
        /// </summary>
        /// <param name="text">The prepared canonical text.</param>
        /// <param name="verifier">The exact-reread semantic verifier.</param>
        /// <param name="error">The transaction failure.</param>
        /// <returns><see langword="true"/> after replacement.</returns>
        public bool TryWriteTextVerified(
            string text,
            Func<string, SaveTextVerificationResult> verifier,
            out string error)
        {
            error = null;
            TempText = TempTransform?.Invoke(text) ?? text;
            SaveTextVerificationResult result = verifier(TempText);
            if (!result.Succeeded)
            {
                error = result.Error;
                return false;
            }

            if (FailReplacement)
            {
                error = "Injected replacement failure.";
                return false;
            }

            if (Exists())
            {
                _backups.Add(Text);
            }

            Text = TempText;
            TempText = null;
            return true;
        }

        /// <summary>
        /// Returns deterministic in-memory primary/temp plus explicit candidates.
        /// </summary>
        /// <param name="explicitLegacyCandidates">Explicit adapter candidates.</param>
        /// <returns>The deterministic candidate sequence.</returns>
        public IReadOnlyList<SaveStorageCandidate> DiscoverCandidates(
            IEnumerable<SaveStorageCandidate> explicitLegacyCandidates = null)
        {
            var candidates = new List<SaveStorageCandidate>();
            if (Exists())
            {
                candidates.Add(new SaveStorageCandidate(
                    SaveStorageCandidateSource.CanonicalPrimary,
                    "in-memory",
                    new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)));
            }

            if (!string.IsNullOrWhiteSpace(TempText))
            {
                candidates.Add(new SaveStorageCandidate(
                    SaveStorageCandidateSource.CanonicalTemporary,
                    "in-memory.tmp",
                    new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)));
            }

            if (explicitLegacyCandidates != null)
            {
                candidates.AddRange(explicitLegacyCandidates
                    .Where(candidate => candidate != null)
                    .OrderBy(candidate => candidate.Source)
                    .ThenByDescending(candidate => candidate.LastWriteUtc)
                    .ThenBy(candidate => candidate.Path, StringComparer.Ordinal));
            }

            return candidates;
        }

        /// <summary>
        /// Reads the selected in-memory filesystem candidate.
        /// </summary>
        /// <param name="candidate">The primary or temp candidate.</param>
        /// <param name="text">The candidate text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when candidate text exists.</returns>
        public bool TryReadCandidateText(
            SaveStorageCandidate candidate,
            out string text,
            out string error)
        {
            text = candidate?.Source == SaveStorageCandidateSource.CanonicalTemporary
                ? TempText
                : Text;
            error = string.IsNullOrWhiteSpace(text) ? "Candidate not found." : null;
            return error == null;
        }
    }
}
