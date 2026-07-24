/*
 * Purpose: Describes read-only canonical, temporary, backup, and explicit legacy save candidates.
 * Runs: Runtime candidate discovery/recovery foundations and Unity Editor storage tests.
 * Primary entry points: SaveStorageCandidate file and decoded-legacy constructors plus metadata properties.
 * Owns: Candidate identity and immutable discovery metadata only.
 * Delegates: File reads to ITransactionalSaveStorage and preparation to SavePreparationPipeline.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/ITransactionalSaveStorage.cs.
 * - Assets/Scripts/Systems/Save/OdinStringFileStorage.cs.
 * - Assets/Scripts/Systems/Save/LegacySaveCandidateAdapter.cs.
 *
 * Change notes:
 * - Source ordering is a deterministic discovery contract consumed by later startup recovery.
 * - Decoded legacy settings remain caller-owned and are always deep-copied by preparation before use.
 */

using System;
using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Identifies the artifact family represented by a discovered candidate.
    /// </summary>
    public enum SaveStorageCandidateSource
    {
        /// <summary>
        /// The primary canonical save file.
        /// </summary>
        CanonicalPrimary,

        /// <summary>
        /// The known same-directory interrupted-write temporary file.
        /// </summary>
        CanonicalTemporary,

        /// <summary>
        /// A rotating canonical backup.
        /// </summary>
        CanonicalBackup,

        /// <summary>
        /// A decoded candidate supplied by the existing ES3 adapter.
        /// </summary>
        LegacyEs3,

        /// <summary>
        /// A decoded candidate supplied by the legacy Odin JSON adapter.
        /// </summary>
        LegacyOdinJson
    }

    /// <summary>
    /// Holds deterministic metadata for one read-only save candidate.
    /// </summary>
    public sealed class SaveStorageCandidate
    {
        /// <summary>
        /// Creates a filesystem-backed candidate.
        /// </summary>
        /// <param name="source">The canonical artifact source.</param>
        /// <param name="path">The exact artifact path.</param>
        /// <param name="lastWriteUtc">The captured last-write timestamp.</param>
        public SaveStorageCandidate(
            SaveStorageCandidateSource source,
            string path,
            DateTime? lastWriteUtc)
            : this(source, path, lastWriteUtc, null)
        {
        }

        /// <summary>
        /// Creates an explicit decoded legacy candidate.
        /// </summary>
        /// <param name="source">The legacy adapter source.</param>
        /// <param name="path">The support/debug artifact path.</param>
        /// <param name="lastWriteUtc">The best available candidate timestamp.</param>
        /// <param name="decodedSettings">The adapter-decoded settings retained only as immutable input.</param>
        public SaveStorageCandidate(
            SaveStorageCandidateSource source,
            string path,
            DateTime? lastWriteUtc,
            Oracle.SaveDataSettings decodedSettings)
        {
            Source = source;
            Path = path ?? string.Empty;
            LastWriteUtc = lastWriteUtc;
            DecodedSettings = decodedSettings;
        }

        /// <summary>
        /// Gets the candidate artifact family.
        /// </summary>
        public SaveStorageCandidateSource Source { get; }

        /// <summary>
        /// Gets the exact artifact or support path.
        /// </summary>
        public string Path { get; }

        /// <summary>
        /// Gets the timestamp captured during read-only discovery.
        /// </summary>
        public DateTime? LastWriteUtc { get; }

        /// <summary>
        /// Gets adapter-decoded legacy settings, or null for filesystem text candidates.
        /// </summary>
        public Oracle.SaveDataSettings DecodedSettings { get; }

        /// <summary>
        /// Gets whether this candidate must be prepared from adapter-decoded settings instead of text.
        /// </summary>
        public bool HasDecodedSettings => DecodedSettings != null;
    }
}
