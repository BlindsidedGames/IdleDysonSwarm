/*
 * Purpose: Produces isolated, migrated, normalized, validated prepared saves before publication or canonical writes.
 * Runs: Runtime canonical load/save paths and Unity Editor save-integrity tests.
 * Primary entry points: PrepareText and PrepareSettings.
 * Owns: Decode classification, schema gate, deep copy, migration dispatch, validation, and canonical re-encoding.
 * Delegates: Envelope parsing to SaveCodec, migration to an Oracle-supplied delegate, and shape checks to SaveDataValidator.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/PreparedSaveResult.cs and SaveDataValidator.cs.
 * - Assets/Scripts/Expansion/Oracle.Migrations.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs.
 *
 * Change notes:
 * - The pipeline must never return decoded source objects directly; successful Settings are always isolated copies.
 * - Future schemas stop before copy, migration, normalization, validation, publication, or storage.
 * - CanonicalText is emitted only after all stages succeed and always uses uppercase IDB1.
 */

using System;
using Expansion;
using Sirenix.Serialization;
using Systems.Migrations;

namespace Systems.Save
{
    /// <summary>
    /// Converts untrusted save text or settings into a classified publishable prepared result.
    /// </summary>
    public sealed class SavePreparationPipeline
    {
        private readonly int _supportedSchema;
        private readonly Func<Oracle.SaveDataSettings, MigrationRunResult> _migrateAndNormalize;

        /// <summary>
        /// Creates a preparation pipeline for one supported schema and migration implementation.
        /// </summary>
        /// <param name="supportedSchema">The latest schema this build can publish.</param>
        /// <param name="migrateAndNormalize">The migration function operating only on an isolated working copy.</param>
        public SavePreparationPipeline(
            int supportedSchema,
            Func<Oracle.SaveDataSettings, MigrationRunResult> migrateAndNormalize)
        {
            if (supportedSchema < 1)
            {
                throw new ArgumentOutOfRangeException(nameof(supportedSchema));
            }

            _supportedSchema = supportedSchema;
            _migrateAndNormalize = migrateAndNormalize ??
                                   throw new ArgumentNullException(nameof(migrateAndNormalize));
        }

        /// <summary>
        /// Creates a safe current-schema-only pipeline for non-migrating tools and lightweight tests.
        /// </summary>
        /// <param name="supportedSchema">The only accepted schema.</param>
        /// <returns>A pipeline that rejects older and future schemas rather than publishing them unprepared.</returns>
        public static SavePreparationPipeline CreateCurrentSchemaOnly(int supportedSchema)
        {
            return new SavePreparationPipeline(
                supportedSchema,
                settings => new MigrationRunResult
                {
                    Succeeded = settings != null && settings.saveVersion == supportedSchema,
                    StartingVersion = settings?.saveVersion ?? 0,
                    EndingVersion = settings?.saveVersion ?? 0
                });
        }

        /// <summary>
        /// Decodes and prepares untrusted save text without changing the input or publishing runtime state.
        /// </summary>
        /// <param name="text">The candidate envelope or legacy text.</param>
        /// <returns>A successful isolated prepared result or a classified failure.</returns>
        public PreparedSaveResult PrepareText(string text)
        {
            if (!SaveCodec.TryDecodeSaveSettings(
                    text,
                    out Oracle.SaveDataSettings decoded,
                    out SaveDecodeFailureReason decodeFailure))
            {
                return Failure(
                    PreparedSaveFailureReason.DecodeFailed,
                    $"Save decode failed ({decodeFailure}).",
                    decodeFailure);
            }

            return PrepareDecoded(decoded);
        }

        /// <summary>
        /// Prepares an in-memory save snapshot on a deep copy before canonical persistence.
        /// </summary>
        /// <param name="settings">The source settings that must remain unmodified.</param>
        /// <returns>A successful isolated prepared result or a classified failure.</returns>
        public PreparedSaveResult PrepareSettings(Oracle.SaveDataSettings settings)
        {
            if (settings == null)
            {
                return Failure(
                    PreparedSaveFailureReason.ValidationFailed,
                    "Cannot prepare null save settings.");
            }

            return PrepareDecoded(settings);
        }

        /// <summary>
        /// Applies the schema gate, deep copy, migration, validation, and canonical encoding stages.
        /// </summary>
        /// <param name="decoded">The decoded or caller-owned source graph.</param>
        /// <returns>A successful isolated prepared result or a classified failure.</returns>
        private PreparedSaveResult PrepareDecoded(Oracle.SaveDataSettings decoded)
        {
            int sourceSchema = decoded?.saveVersion ?? 0;
            if (sourceSchema > _supportedSchema)
            {
                return Failure(
                    PreparedSaveFailureReason.UnsupportedFutureVersion,
                    $"Save schema {sourceSchema} is newer than supported schema {_supportedSchema}.",
                    sourceSchema: sourceSchema);
            }

            Oracle.SaveDataSettings working;
            try
            {
                working = (Oracle.SaveDataSettings)SerializationUtility.CreateCopy(decoded);
            }
            catch (Exception ex)
            {
                return Failure(
                    PreparedSaveFailureReason.SerializationFailed,
                    $"Failed to isolate decoded save data: {ex.Message}",
                    sourceSchema: sourceSchema);
            }

            MigrationRunResult migration;
            try
            {
                migration = _migrateAndNormalize(working);
            }
            catch (Exception ex)
            {
                return Failure(
                    PreparedSaveFailureReason.MigrationFailed,
                    $"Migration threw before preparation completed: {ex.Message}",
                    sourceSchema: sourceSchema);
            }

            if (migration == null || !migration.Succeeded || working.saveVersion != _supportedSchema)
            {
                string report = migration?.ToReportString()?.Trim();
                return Failure(
                    PreparedSaveFailureReason.MigrationFailed,
                    string.IsNullOrWhiteSpace(report)
                        ? $"Migration did not reach supported schema {_supportedSchema}."
                        : report,
                    sourceSchema: sourceSchema);
            }

            if (!SaveDataValidator.TryValidate(working, _supportedSchema, out string validationError))
            {
                return Failure(
                    PreparedSaveFailureReason.ValidationFailed,
                    validationError,
                    sourceSchema: sourceSchema);
            }

            string canonicalText;
            try
            {
                byte[] bytes = SaveCodec.SerializeSaveSettingsBinary(working);
                canonicalText = SaveCodec.EncodeBinary(bytes, compress: true);
            }
            catch (Exception ex)
            {
                return Failure(
                    PreparedSaveFailureReason.SerializationFailed,
                    $"Failed to encode prepared save: {ex.Message}",
                    sourceSchema: sourceSchema);
            }

            if (string.IsNullOrWhiteSpace(canonicalText) ||
                !canonicalText.StartsWith(SaveCodec.BinarySavePrefix, StringComparison.Ordinal))
            {
                return Failure(
                    PreparedSaveFailureReason.SerializationFailed,
                    "Prepared save did not produce canonical uppercase IDB1 text.",
                    sourceSchema: sourceSchema);
            }

            return new PreparedSaveResult
            {
                Succeeded = true,
                Settings = working,
                CanonicalText = canonicalText,
                SourceSchema = sourceSchema,
                PreparedSchema = working.saveVersion,
                FailureReason = PreparedSaveFailureReason.None,
                DecodeFailureReason = SaveDecodeFailureReason.None
            };
        }

        /// <summary>
        /// Creates a non-publishable classified result.
        /// </summary>
        /// <param name="reason">The failed preparation stage.</param>
        /// <param name="error">The diagnostic error.</param>
        /// <param name="decodeReason">The decoder category when applicable.</param>
        /// <param name="sourceSchema">The decoded source schema when known.</param>
        /// <returns>A failed prepared result with no settings or canonical text.</returns>
        private static PreparedSaveResult Failure(
            PreparedSaveFailureReason reason,
            string error,
            SaveDecodeFailureReason decodeReason = SaveDecodeFailureReason.None,
            int sourceSchema = 0)
        {
            return new PreparedSaveResult
            {
                Succeeded = false,
                SourceSchema = sourceSchema,
                FailureReason = reason,
                DecodeFailureReason = decodeReason,
                Error = error
            };
        }
    }
}
