/*
 * Purpose: Pins the exact public Unity release whose save graph is certified for Web import mapping.
 * Runs: Unity Editor tooling and EditMode tests only.
 * Owns: Public application version, save schema, source revision, and exact-source validation.
 * Delegates: Save decoding and migration to the production save pipeline.
 *
 * Change notes:
 * - These constants describe the shipped public release, not the current development checkout.
 * - A later development schema must not overwrite this identity until that build is publicly released and certified.
 * - Neutral snapshot exporters must call ValidateExactSource before publishing a certification artifact.
 */

using System;

namespace Web
{
    /// <summary>
    /// Immutable identity of the public Unity save surface accepted as the Web mapping baseline.
    /// </summary>
    public static class PublicUnitySaveCertification
    {
        public const string ApplicationVersion = "3.0.328";
        public const int SaveSchema = 11;
        public const string SourceRevision = "9b840fb2547ad507d4e529a610a031cc13782847";
        public const string UnityEditorVersion = "6000.3.9f1";
        public const string SaveRootType = "Expansion.Oracle+SaveDataSettings";
        public const string SchemaFieldCatalogSha256 =
            "0b0559fc79cda740529fafd6cb075edd3725255147cd8fbd06a568b4e46970b4";

        /// <summary>
        /// Rejects attempts to publish a certification snapshot from a different source identity.
        /// </summary>
        /// <param name="applicationVersion">The candidate Unity application version.</param>
        /// <param name="saveSchema">The candidate save schema.</param>
        /// <param name="sourceRevision">The candidate full Git revision.</param>
        /// <exception cref="InvalidOperationException">
        /// Thrown when any candidate value differs from the pinned public release.
        /// </exception>
        public static void ValidateExactSource(
            string applicationVersion,
            int saveSchema,
            string sourceRevision)
        {
            if (!string.Equals(applicationVersion, ApplicationVersion, StringComparison.Ordinal) ||
                saveSchema != SaveSchema ||
                !string.Equals(sourceRevision, SourceRevision, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Public Unity save certification source mismatch. " +
                    $"Expected app {ApplicationVersion}, schema {SaveSchema}, revision {SourceRevision}; " +
                    $"received app {applicationVersion ?? "<null>"}, schema {saveSchema}, " +
                    $"revision {sourceRevision ?? "<null>"}.");
            }
        }
    }
}
