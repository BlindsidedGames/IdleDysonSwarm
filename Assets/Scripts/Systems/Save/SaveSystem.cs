/*
 * Purpose: Orchestrates prepared canonical loads, verified transactional saves, and read-only candidate operations.
 * Runs: Runtime persistence and Unity Editor save-integrity tests.
 * Primary entry points: TryLoad, TrySave, DiscoverCandidates, TryPrepareCandidate, and TryCommitCandidate.
 * Owns: Coordination between preparation and transactional storage without publishing runtime state.
 * Delegates: Decode/migration/validation to SavePreparationPipeline and files/backups/atomic replacement to storage.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/SavePreparationPipeline.cs.
 * - Assets/Scripts/Systems/Save/ITransactionalSaveStorage.cs.
 * - Assets/Scripts/Systems/Save/ISaveStore.cs.
 * - Assets/Scripts/Expansion/Oracle.Persistence.cs.
 *
 * Change notes:
 * - TryLoad returns only successful prepared settings; callers may publish them after this method succeeds.
 * - TrySave never writes caller-owned settings directly and verifies the exact reread temp artifact before replacement.
 * - Candidate preparation is read-only; commits must prepare first and rejected candidates cannot touch canonical data.
 */

using System;
using System.Collections.Generic;
using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Coordinates the prepared-save policy boundary with transactional canonical storage.
    /// </summary>
    public sealed class SaveSystem
    {
        private const int CurrentSchema = 12;
        private readonly ITransactionalSaveStorage _transactionalStorage;

        /// <summary>
        /// Creates a safe current-schema-only save system for tools that cannot provide Oracle migration context.
        /// </summary>
        /// <param name="storage">The canonical storage seam.</param>
        public SaveSystem(ISaveStorage storage)
            : this(storage, SavePreparationPipeline.CreateCurrentSchemaOnly(CurrentSchema))
        {
        }

        /// <summary>
        /// Creates a save system with the production or test preparation pipeline.
        /// </summary>
        /// <param name="storage">The canonical storage seam.</param>
        /// <param name="preparation">The decode/version/migration/validation pipeline.</param>
        public SaveSystem(ISaveStorage storage, SavePreparationPipeline preparation)
        {
            Storage = storage ?? throw new ArgumentNullException(nameof(storage));
            Preparation = preparation ?? throw new ArgumentNullException(nameof(preparation));
            _transactionalStorage = storage as ITransactionalSaveStorage;
        }

        /// <summary>
        /// Gets the underlying storage seam for existence/support queries.
        /// </summary>
        public ISaveStorage Storage { get; }

        /// <summary>
        /// Gets the preparation pipeline used by every load, save, verification, and candidate commit.
        /// </summary>
        public SavePreparationPipeline Preparation { get; }

        /// <summary>
        /// Gets the most recent primary-load preparation outcome.
        /// </summary>
        public PreparedSaveResult LastLoadPreparation { get; private set; }

        /// <summary>
        /// Creates filesystem storage with a safe current-schema-only pipeline.
        /// </summary>
        /// <returns>A default save system suitable for existence queries and already-current saves.</returns>
        public static SaveSystem CreateDefault()
        {
            return CreateDefault(SavePreparationPipeline.CreateCurrentSchemaOnly(CurrentSchema));
        }

        /// <summary>
        /// Creates filesystem storage with the supplied production migration pipeline.
        /// </summary>
        /// <param name="preparation">The production preparation pipeline.</param>
        /// <returns>The default transactional save system.</returns>
        public static SaveSystem CreateDefault(SavePreparationPipeline preparation)
        {
            return new SaveSystem(
                new OdinStringFileStorage(SavePaths.GetCanonicalSavePath()),
                preparation);
        }

        /// <summary>
        /// Reads and fully prepares the primary canonical artifact before returning publishable settings.
        /// </summary>
        /// <param name="settings">The isolated prepared settings on success.</param>
        /// <param name="error">The read or classified preparation failure.</param>
        /// <returns><see langword="true"/> only when settings are safe to publish.</returns>
        public bool TryLoad(out Oracle.SaveDataSettings settings, out string error)
        {
            settings = null;
            error = null;
            LastLoadPreparation = null;

            if (!Storage.TryReadText(out string text, out string readError))
            {
                error = readError;
                return false;
            }

            LastLoadPreparation = Preparation.PrepareText(text);
            if (!LastLoadPreparation.Succeeded)
            {
                error = LastLoadPreparation.Error;
                return false;
            }

            settings = LastLoadPreparation.Settings;
            return true;
        }

        /// <summary>
        /// Prepares a caller-owned snapshot and commits only its verified canonical representation.
        /// </summary>
        /// <param name="settings">The source settings, which remain unmodified.</param>
        /// <param name="stats">Canonical serialization size statistics.</param>
        /// <param name="error">The preparation or transaction failure.</param>
        /// <returns><see langword="true"/> only after verified canonical replacement.</returns>
        public bool TrySave(
            Oracle.SaveDataSettings settings,
            out SaveStringStats stats,
            out string error)
        {
            PreparedSaveResult prepared = Preparation.PrepareSettings(settings);
            return TryCommitPrepared(prepared, out stats, out error);
        }

        /// <summary>
        /// Returns deterministic read-only canonical and explicit legacy candidate descriptors.
        /// </summary>
        /// <param name="explicitLegacyCandidates">Candidates supplied by existing legacy adapters.</param>
        /// <returns>The discovered candidates, or an empty sequence for non-transactional storage.</returns>
        public IReadOnlyList<SaveStorageCandidate> DiscoverCandidates(
            IEnumerable<SaveStorageCandidate> explicitLegacyCandidates = null)
        {
            return _transactionalStorage?.DiscoverCandidates(explicitLegacyCandidates) ??
                   Array.Empty<SaveStorageCandidate>();
        }

        /// <summary>
        /// Reads and prepares one discovered candidate without writing or publishing it.
        /// </summary>
        /// <param name="candidate">The read-only candidate descriptor.</param>
        /// <param name="preparation">The classified preparation result.</param>
        /// <param name="error">The read or preparation failure.</param>
        /// <returns><see langword="true"/> only when the candidate is publishable.</returns>
        public bool TryPrepareCandidate(
            SaveStorageCandidate candidate,
            out PreparedSaveResult preparation,
            out string error)
        {
            preparation = null;
            error = null;
            if (candidate == null)
            {
                error = "Candidate is null.";
                return false;
            }

            if (candidate.HasDecodedSettings)
            {
                preparation = Preparation.PrepareSettings(candidate.DecodedSettings);
            }
            else
            {
                if (_transactionalStorage == null)
                {
                    error = "Storage does not support candidate reads.";
                    return false;
                }

                if (!_transactionalStorage.TryReadCandidateText(candidate, out string text, out string readError))
                {
                    error = readError;
                    return false;
                }

                preparation = Preparation.PrepareText(text);
            }

            if (!preparation.Succeeded)
            {
                error = preparation.Error;
                return false;
            }

            return true;
        }

        /// <summary>
        /// Prepares clipboard or support text without reading or changing storage.
        /// </summary>
        /// <param name="text">The candidate envelope text.</param>
        /// <returns>The classified preparation result.</returns>
        public PreparedSaveResult PrepareText(string text)
        {
            return Preparation.PrepareText(text);
        }

        /// <summary>
        /// Prepares a discovered candidate and transactionally commits it only when every stage succeeds.
        /// </summary>
        /// <param name="candidate">The read-only candidate descriptor.</param>
        /// <param name="preparation">The candidate's classified preparation result.</param>
        /// <param name="error">The read, preparation, or transaction failure.</param>
        /// <returns><see langword="true"/> only after the candidate is committed canonically.</returns>
        public bool TryCommitCandidate(
            SaveStorageCandidate candidate,
            out PreparedSaveResult preparation,
            out string error)
        {
            if (!TryPrepareCandidate(candidate, out preparation, out error))
            {
                return false;
            }
            return TryCommitPrepared(preparation, out _, out error);
        }

        /// <summary>
        /// Reads a filesystem-backed candidate for explicit support copy actions without changing it.
        /// </summary>
        /// <param name="candidate">The discovered descriptor.</param>
        /// <param name="text">The exact trimmed text returned by storage.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when candidate text is available.</returns>
        public bool TryReadCandidateText(
            SaveStorageCandidate candidate,
            out string text,
            out string error)
        {
            text = string.Empty;
            if (_transactionalStorage == null)
            {
                error = "Storage does not support candidate reads.";
                return false;
            }

            return _transactionalStorage.TryReadCandidateText(candidate, out text, out error);
        }

        /// <summary>
        /// Verifies and commits one successful prepared result.
        /// </summary>
        /// <param name="prepared">The candidate or snapshot preparation result.</param>
        /// <param name="stats">Canonical serialization statistics.</param>
        /// <param name="error">The preparation or transaction failure.</param>
        /// <returns><see langword="true"/> only after verified canonical replacement.</returns>
        private bool TryCommitPrepared(
            PreparedSaveResult prepared,
            out SaveStringStats stats,
            out string error)
        {
            stats = default;
            error = null;
            if (prepared == null || !prepared.Succeeded)
            {
                error = prepared?.Error ?? "Save preparation did not produce a result.";
                return false;
            }

            if (_transactionalStorage == null)
            {
                error = "Canonical storage does not support verified transactions.";
                return false;
            }

            try
            {
                byte[] raw = SaveCodec.SerializeSaveSettingsBinary(prepared.Settings);
                string payload = prepared.CanonicalText.Substring(SaveCodec.BinarySavePrefix.Length);
                byte[] compressed = Convert.FromBase64String(payload);
                stats = new SaveStringStats(raw.Length, compressed.Length, prepared.CanonicalText.Length);
            }
            catch (Exception ex)
            {
                error = $"Failed calculating canonical save statistics: {ex.Message}";
                return false;
            }

            return _transactionalStorage.TryWriteTextVerified(
                prepared.CanonicalText,
                reread =>
                {
                    PreparedSaveResult verified = Preparation.PrepareText(reread);
                    bool matches = verified.Succeeded &&
                                   string.Equals(
                                       verified.CanonicalText,
                                       prepared.CanonicalText,
                                       StringComparison.Ordinal);
                    return new SaveTextVerificationResult(
                        matches,
                        matches
                            ? null
                            : verified.Error ?? "Temporary save did not round-trip to the intended canonical snapshot.");
                },
                out error);
        }
    }

    /// <summary>
    /// Reports raw, compressed, and encoded canonical save sizes.
    /// </summary>
    public readonly struct SaveStringStats
    {
        /// <summary>
        /// Creates canonical serialization statistics.
        /// </summary>
        /// <param name="rawBytes">The Odin binary byte count.</param>
        /// <param name="compressedBytes">The gzip byte count.</param>
        /// <param name="encodedChars">The complete IDB1 character count.</param>
        public SaveStringStats(int rawBytes, int compressedBytes, int encodedChars)
        {
            RawBytes = rawBytes;
            CompressedBytes = compressedBytes;
            EncodedChars = encodedChars;
        }

        /// <summary>
        /// Gets the Odin binary byte count.
        /// </summary>
        public int RawBytes { get; }

        /// <summary>
        /// Gets the gzip byte count.
        /// </summary>
        public int CompressedBytes { get; }

        /// <summary>
        /// Gets the complete IDB1 character count.
        /// </summary>
        public int EncodedChars { get; }
    }
}
