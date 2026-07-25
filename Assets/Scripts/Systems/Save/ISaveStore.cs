using System;
using Expansion;

namespace Systems.Save
{
    /*
     * ISaveStore / CanonicalSaveStore
     * Purpose (runtime): Narrow save-store seam used by Oracle to load/save canonical save snapshots.
     * Runs: Runtime and editor tests.
     * Primary entry points:
     * - ISaveStore.Exists()
     * - ISaveStore.TryLoad(...)
     * - ISaveStore.TrySave(...)
     * - CanonicalSaveStore.CreateDefault(SavePreparationPipeline)
     * - CanonicalSaveStore candidate/settings preparation and commit support
     * Owns vs delegates:
     * - Owns the store-level contract expected by Oracle save lifecycle code.
     * - Delegates preparation/encoding/storage to SaveSystem, SavePreparationPipeline, and ITransactionalSaveStorage.
     *
     * Interacts with:
     * - Expansion.Oracle.Persistence (Load/TrySaveState)
     * - Systems.Save.SaveSystem
     * - Editor tests in Assets/Editor/Tests/Save/**
     *
     * Change notes:
     * - Changing contract behavior (e.g. TrySave returning false on partial success) affects startup load fallback
     *   and quit-save persistence flow.
     * - TryLoad may return settings only after SaveSystem preparation succeeds.
     * - PrepareSettings must remain read-only and return an isolated graph for import finalization.
     * - Keep this abstraction aligned with SaveSystem expectations to avoid split-brain persistence behavior.
     */
    /// <summary>
    /// Provides Oracle with prepared canonical load and verified transactional save operations.
    /// </summary>
    public interface ISaveStore
    {
        /// <summary>
        /// Reports whether the primary canonical artifact exists.
        /// </summary>
        /// <returns><see langword="true"/> when the primary artifact exists.</returns>
        bool Exists();

        /// <summary>
        /// Loads settings only after complete preparation succeeds.
        /// </summary>
        /// <param name="settings">The isolated publishable settings.</param>
        /// <param name="error">The read or preparation failure.</param>
        /// <returns><see langword="true"/> when settings are safe to publish.</returns>
        bool TryLoad(out Oracle.SaveDataSettings settings, out string error);

        /// <summary>
        /// Prepares and transactionally saves a caller-owned snapshot.
        /// </summary>
        /// <param name="settings">The source settings.</param>
        /// <param name="stats">Canonical serialization statistics.</param>
        /// <param name="error">The preparation or write failure.</param>
        /// <returns><see langword="true"/> after verified canonical replacement.</returns>
        bool TrySave(Oracle.SaveDataSettings settings, out SaveStringStats stats, out string error);
    }

    /// <summary>
    /// Marks stores whose successful loads have completed decode, migration, normalization, and validation.
    /// </summary>
    public interface IPreparedSaveStore : ISaveStore
    {
    }

    /// <summary>
    /// Adapts SaveSystem prepared operations to Oracle's narrow save-store seam.
    /// </summary>
    public sealed class CanonicalSaveStore : IPreparedSaveStore
    {
        private readonly SaveSystem _saveSystem;

        /// <summary>
        /// Creates a canonical store over a configured SaveSystem.
        /// </summary>
        /// <param name="saveSystem">The prepared transactional save system.</param>
        public CanonicalSaveStore(SaveSystem saveSystem)
        {
            _saveSystem = saveSystem ?? throw new ArgumentNullException(nameof(saveSystem));
        }

        /// <summary>
        /// Creates a default current-schema-only store for already-current tools.
        /// </summary>
        /// <returns>The default canonical store.</returns>
        public static CanonicalSaveStore CreateDefault()
        {
            return new CanonicalSaveStore(SaveSystem.CreateDefault());
        }

        /// <summary>
        /// Creates the production store with Oracle's migration-capable preparation pipeline.
        /// </summary>
        /// <param name="preparation">The production preparation pipeline.</param>
        /// <returns>The default canonical store.</returns>
        public static CanonicalSaveStore CreateDefault(SavePreparationPipeline preparation)
        {
            return new CanonicalSaveStore(SaveSystem.CreateDefault(preparation));
        }

        /// <summary>
        /// Gets the most recent primary-load preparation result for classified policy decisions.
        /// </summary>
        public PreparedSaveResult LastLoadPreparation => _saveSystem.LastLoadPreparation;

        /// <summary>
        /// Reports whether the primary canonical artifact exists.
        /// </summary>
        /// <returns><see langword="true"/> when the primary artifact exists.</returns>
        public bool Exists()
        {
            return _saveSystem.Storage.Exists();
        }

        /// <summary>
        /// Loads only a fully prepared canonical save.
        /// </summary>
        /// <param name="settings">The isolated publishable settings.</param>
        /// <param name="error">The read or preparation failure.</param>
        /// <returns><see langword="true"/> when settings are safe to publish.</returns>
        public bool TryLoad(out Oracle.SaveDataSettings settings, out string error)
        {
            return _saveSystem.TryLoad(out settings, out error);
        }

        /// <summary>
        /// Prepares and transactionally commits one snapshot.
        /// </summary>
        /// <param name="settings">The caller-owned source settings.</param>
        /// <param name="stats">Canonical serialization statistics.</param>
        /// <param name="error">The preparation or write failure.</param>
        /// <returns><see langword="true"/> after verified canonical replacement.</returns>
        public bool TrySave(Oracle.SaveDataSettings settings, out SaveStringStats stats, out string error)
        {
            return _saveSystem.TrySave(settings, out stats, out error);
        }

        /// <summary>
        /// Discovers canonical artifacts plus explicit legacy adapter candidates without mutation.
        /// </summary>
        /// <param name="explicitLegacyCandidates">The existing-adapter candidates.</param>
        /// <returns>The deterministic candidate sequence.</returns>
        public System.Collections.Generic.IReadOnlyList<SaveStorageCandidate> DiscoverCandidates(
            System.Collections.Generic.IEnumerable<SaveStorageCandidate> explicitLegacyCandidates = null)
        {
            return _saveSystem.DiscoverCandidates(explicitLegacyCandidates);
        }

        /// <summary>
        /// Prepares one discovered candidate without storage mutation.
        /// </summary>
        /// <param name="candidate">The read-only descriptor.</param>
        /// <param name="preparation">The classified preparation result.</param>
        /// <param name="error">The read or preparation failure.</param>
        /// <returns><see langword="true"/> only when the candidate is publishable.</returns>
        public bool TryPrepareCandidate(
            SaveStorageCandidate candidate,
            out PreparedSaveResult preparation,
            out string error)
        {
            return _saveSystem.TryPrepareCandidate(candidate, out preparation, out error);
        }

        /// <summary>
        /// Prepares clipboard or support text without writing it.
        /// </summary>
        /// <param name="text">The candidate envelope.</param>
        /// <returns>The classified preparation result.</returns>
        public PreparedSaveResult PrepareText(string text)
        {
            return _saveSystem.PrepareText(text);
        }

        /// <summary>
        /// Prepares caller-owned settings on an isolated graph without writing them.
        /// </summary>
        /// <param name="settings">The source settings.</param>
        /// <returns>The classified isolated preparation result.</returns>
        public PreparedSaveResult PrepareSettings(Oracle.SaveDataSettings settings)
        {
            return _saveSystem.Preparation.PrepareSettings(settings);
        }

        /// <summary>
        /// Prepares and transactionally commits one discovered candidate.
        /// </summary>
        /// <param name="candidate">The read-only candidate.</param>
        /// <param name="preparation">The candidate preparation result.</param>
        /// <param name="error">The read, preparation, or transaction failure.</param>
        /// <returns><see langword="true"/> after verified canonical replacement.</returns>
        public bool TryCommitCandidate(
            SaveStorageCandidate candidate,
            out PreparedSaveResult preparation,
            out string error)
        {
            return _saveSystem.TryCommitCandidate(candidate, out preparation, out error);
        }

        /// <summary>
        /// Reads one filesystem-backed artifact for an explicit support copy action.
        /// </summary>
        /// <param name="candidate">The discovered descriptor.</param>
        /// <param name="text">The exact trimmed artifact text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when text is available.</returns>
        public bool TryReadCandidateText(
            SaveStorageCandidate candidate,
            out string text,
            out string error)
        {
            return _saveSystem.TryReadCandidateText(candidate, out text, out error);
        }
    }
}
