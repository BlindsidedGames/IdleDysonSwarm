/*
 * Purpose: Copies discovered save artifacts into a new support folder without changing their sources.
 * Runs: Runtime only after an explicit player export action and Unity EditMode tests.
 * Primary entry points: Export.
 * Owns: Export-folder naming, byte-for-byte file copies, and a plain-text support manifest.
 * Delegates: Candidate discovery/classification to startup recovery orchestration.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/StartupRecoveryInteractionSession.cs.
 * - Assets/Scripts/Systems/Save/SaveStorageCandidate.cs.
 *
 * Change notes:
 * - Export never moves, deletes, overwrites, or rewrites a source artifact.
 * - A new unique folder is required for every export attempt.
 * - Source paths may be support-sensitive and are written only to the local manifest.
 */

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;

namespace Systems.Save
{
    /// <summary>
    /// Creates non-destructive local support bundles from discovered artifact paths.
    /// </summary>
    public static class SaveArtifactExporter
    {
        /// <summary>
        /// Copies every existing unique artifact into a new export folder and writes support details.
        /// </summary>
        /// <param name="exportRoot">The parent folder for the unique export.</param>
        /// <param name="artifacts">The discovered read-only descriptors.</param>
        /// <param name="supportReport">The classified startup report.</param>
        /// <param name="utcNow">The timestamp used for deterministic folder naming.</param>
        /// <param name="exportFolder">The created export folder.</param>
        /// <param name="error">The export failure.</param>
        /// <returns><see langword="true"/> when a manifest and all readable artifacts were copied.</returns>
        public static bool Export(
            string exportRoot,
            IEnumerable<SaveStorageCandidate> artifacts,
            string supportReport,
            DateTime utcNow,
            out string exportFolder,
            out string error)
        {
            exportFolder = string.Empty;
            error = null;
            if (string.IsNullOrWhiteSpace(exportRoot))
            {
                error = "Save recovery export root is unavailable.";
                return false;
            }

            try
            {
                Directory.CreateDirectory(exportRoot);
                exportFolder = CreateUniqueFolder(exportRoot, utcNow);
                Directory.CreateDirectory(exportFolder);

                var failures = new List<string>();
                SaveStorageCandidate[] uniqueArtifacts = (artifacts ?? Array.Empty<SaveStorageCandidate>())
                    .Where(candidate => candidate != null && !string.IsNullOrWhiteSpace(candidate.Path))
                    .GroupBy(candidate => candidate.Path, StringComparer.Ordinal)
                    .Select(group => group.First())
                    .ToArray();

                for (int index = 0; index < uniqueArtifacts.Length; index++)
                {
                    SaveStorageCandidate candidate = uniqueArtifacts[index];
                    if (!File.Exists(candidate.Path))
                    {
                        failures.Add($"Missing: {candidate.Path}");
                        continue;
                    }

                    string sourceName = Path.GetFileName(candidate.Path);
                    string safeName = SanitizeFileName(sourceName);
                    string destination = Path.Combine(
                        exportFolder,
                        $"{index + 1:D2}_{candidate.Source}_{safeName}");
                    try
                    {
                        File.Copy(candidate.Path, destination, overwrite: false);
                    }
                    catch (Exception ex)
                    {
                        failures.Add($"Copy failed: {candidate.Path} ({ex.Message})");
                    }
                }

                var manifest = new StringBuilder();
                manifest.AppendLine(supportReport ?? string.Empty);
                if (failures.Count > 0)
                {
                    manifest.AppendLine();
                    manifest.AppendLine("Export warnings:");
                    foreach (string failure in failures)
                    {
                        manifest.AppendLine(failure);
                    }
                }

                File.WriteAllText(
                    Path.Combine(exportFolder, "recovery-report.txt"),
                    manifest.ToString(),
                    new UTF8Encoding(false));

                if (failures.Count > 0)
                {
                    error = string.Join(Environment.NewLine, failures);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        /// <summary>
        /// Creates a never-overwritten timestamped export folder path.
        /// </summary>
        /// <param name="exportRoot">The export parent.</param>
        /// <param name="utcNow">The naming timestamp.</param>
        /// <returns>A unique path that does not yet exist.</returns>
        private static string CreateUniqueFolder(string exportRoot, DateTime utcNow)
        {
            string stamp = utcNow.ToUniversalTime()
                .ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
            string candidate = Path.Combine(exportRoot, $"save_recovery_{stamp}");
            int counter = 1;
            while (Directory.Exists(candidate))
            {
                candidate = Path.Combine(exportRoot, $"save_recovery_{stamp}_{counter:D2}");
                counter++;
            }

            return candidate;
        }

        /// <summary>
        /// Replaces platform-invalid filename characters in copied artifact names.
        /// </summary>
        /// <param name="name">The source filename.</param>
        /// <returns>A safe non-empty filename.</returns>
        private static string SanitizeFileName(string name)
        {
            string safe = string.IsNullOrWhiteSpace(name) ? "artifact.bin" : name;
            foreach (char invalid in Path.GetInvalidFileNameChars())
            {
                safe = safe.Replace(invalid, '_');
            }

            return safe;
        }
    }
}
