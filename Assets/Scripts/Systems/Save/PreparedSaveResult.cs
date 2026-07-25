/*
 * Purpose: Represents the classified outcome of preparing decoded save data before runtime publication or storage.
 * Runs: Runtime save/load orchestration and Unity Editor save-integrity tests.
 * Primary entry points: PreparedSaveResult.Succeeded, Settings, CanonicalText, and failure metadata.
 * Owns: Immutable preparation outcome data only.
 * Delegates: Decode, migration, normalization, validation, and encoding to SavePreparationPipeline.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/SavePreparationPipeline.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs.
 * - Assets/Scripts/Expansion/Oracle.RuntimeSeams.cs.
 *
 * Change notes:
 * - Settings may be published only when Succeeded is true.
 * - CanonicalText is produced only for a successful result and must retain uppercase IDB1 output.
 * - Failure categories are policy inputs for later startup recovery UI and must remain stable.
 */

using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Identifies the stage at which save preparation stopped.
    /// </summary>
    public enum PreparedSaveFailureReason
    {
        /// <summary>
        /// Preparation completed successfully.
        /// </summary>
        None,

        /// <summary>
        /// The input envelope could not be decoded.
        /// </summary>
        DecodeFailed,

        /// <summary>
        /// The decoded schema is newer than this build supports.
        /// </summary>
        UnsupportedFutureVersion,

        /// <summary>
        /// Migration or normalization did not complete.
        /// </summary>
        MigrationFailed,

        /// <summary>
        /// The prepared graph failed required shape, identifier, or finite-number validation.
        /// </summary>
        ValidationFailed,

        /// <summary>
        /// Deep-copy or canonical serialization failed.
        /// </summary>
        SerializationFailed
    }

    /// <summary>
    /// Contains either an isolated publishable save plus canonical text or a classified non-publishable failure.
    /// </summary>
    public sealed class PreparedSaveResult
    {
        /// <summary>
        /// Gets whether preparation produced a validated isolated save.
        /// </summary>
        public bool Succeeded { get; internal set; }

        /// <summary>
        /// Gets the validated isolated settings, or null on failure.
        /// </summary>
        public Oracle.SaveDataSettings Settings { get; internal set; }

        /// <summary>
        /// Gets the canonical uppercase IDB1 representation, or null on failure.
        /// </summary>
        public string CanonicalText { get; internal set; }

        /// <summary>
        /// Gets the schema found before migration.
        /// </summary>
        public int SourceSchema { get; internal set; }

        /// <summary>
        /// Gets the schema after successful migration and normalization.
        /// </summary>
        public int PreparedSchema { get; internal set; }

        /// <summary>
        /// Gets the preparation failure category.
        /// </summary>
        public PreparedSaveFailureReason FailureReason { get; internal set; }

        /// <summary>
        /// Gets the lower-level decoder category when decoding failed.
        /// </summary>
        public SaveDecodeFailureReason DecodeFailureReason { get; internal set; }

        /// <summary>
        /// Gets the diagnostic error suitable for logs and support tooling.
        /// </summary>
        public string Error { get; internal set; }
    }
}
