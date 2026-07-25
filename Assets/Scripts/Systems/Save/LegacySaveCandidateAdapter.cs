/*
 * Purpose: Exposes existing ES3 and legacy Odin readers as explicit read-only prepared-save candidate descriptors.
 * Runs: Runtime recovery discovery and Unity Editor tests where adapter output is injected.
 * Primary entry points: LegacySaveCandidateAdapter.Discover and FromExistingAdapterResults.
 * Owns: Adapter invocation plus deterministic descriptors for both decoded and still-invalid legacy artifacts.
 * Delegates: ES3 probing to LegacyEs3Save and Odin JSON decoding to SaveLoadCandidateSelector.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/LegacyEs3Save.cs.
 * - Assets/Scripts/Systems/Save/SaveLoadCandidateSelector.cs.
 * - Assets/Scripts/Systems/Save/SaveStorageCandidate.cs.
 *
 * Change notes:
 * - Discovery must remain read-only; archiving/deleting legacy artifacts is not permitted here.
 * - Undecodable artifact paths must remain visible so startup blocks instead of treating corruption as first launch.
 * - Adapter-decoded settings are immutable inputs and are deep-copied by SavePreparationPipeline.
 * - ES3 remains best-effort until an authentic fixture is available.
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Converts existing legacy adapter results into deterministic prepared-save candidate descriptors.
    /// </summary>
    public static class LegacySaveCandidateAdapter
    {
        /// <summary>
        /// Discovers explicit ES3 and legacy Odin candidates without changing their artifacts.
        /// </summary>
        /// <param name="legacyOdinPath">The exact legacy Odin JSON path.</param>
        /// <returns>Deterministically ordered explicit legacy candidates.</returns>
        public static IReadOnlyList<SaveStorageCandidate> Discover(string legacyOdinPath)
        {
            return FromExistingAdapterResultsAndArtifacts(
                LegacyEs3Save.GetRecoverableCandidates(),
                LegacyEs3Save.GetExistingArtifactPaths(),
                legacyOdinPath);
        }

        /// <summary>
        /// Converts results from the existing ES3 adapter and legacy Odin reader into explicit candidates.
        /// </summary>
        /// <param name="es3Candidates">The read-only results returned by LegacyEs3Save.</param>
        /// <param name="legacyOdinPath">The exact legacy Odin JSON path.</param>
        /// <returns>Deterministically ordered explicit legacy candidates.</returns>
        public static IReadOnlyList<SaveStorageCandidate> FromExistingAdapterResults(
            IEnumerable<LegacyEs3RecoveryCandidate> es3Candidates,
            string legacyOdinPath)
        {
            return FromExistingAdapterResultsAndArtifacts(
                es3Candidates,
                Array.Empty<string>(),
                legacyOdinPath);
        }

        /// <summary>
        /// Converts decoded results and preserves descriptors for existing artifacts that failed adapter decoding.
        /// </summary>
        /// <param name="es3Candidates">The decoded read-only ES3 results.</param>
        /// <param name="es3ArtifactPaths">Every existing ES3 artifact path.</param>
        /// <param name="legacyOdinPath">The exact legacy Odin JSON path.</param>
        /// <returns>Deterministically ordered decoded and invalid legacy candidates.</returns>
        public static IReadOnlyList<SaveStorageCandidate> FromExistingAdapterResultsAndArtifacts(
            IEnumerable<LegacyEs3RecoveryCandidate> es3Candidates,
            IEnumerable<string> es3ArtifactPaths,
            string legacyOdinPath)
        {
            var candidates = new List<SaveStorageCandidate>();
            foreach (LegacyEs3RecoveryCandidate legacy in es3Candidates ??
                                                              Array.Empty<LegacyEs3RecoveryCandidate>())
            {
                candidates.Add(new SaveStorageCandidate(
                    SaveStorageCandidateSource.LegacyEs3,
                    legacy.Path,
                    legacy.TimestampUtc,
                    legacy.Settings));
            }

            var decodedEs3Paths = new HashSet<string>(
                candidates.Select(candidate => candidate.Path),
                StringComparer.Ordinal);
            foreach (string path in es3ArtifactPaths ?? Array.Empty<string>())
            {
                if (string.IsNullOrWhiteSpace(path) || decodedEs3Paths.Contains(path) || !File.Exists(path))
                {
                    continue;
                }

                candidates.Add(new SaveStorageCandidate(
                    SaveStorageCandidateSource.LegacyEs3,
                    path,
                    File.GetLastWriteTimeUtc(path)));
            }

            bool odinDecoded = SaveLoadCandidateSelector.TryLoadLegacyOdinJsonSave(
                    legacyOdinPath,
                    out Oracle.SaveDataSettings odin,
                    out _) &&
                odin != null;
            if (odinDecoded)
            {
                DateTime? timestamp = SaveLoadCandidateSelector.TryGetCandidateTimestampUtc(odin, out DateTime utc)
                    ? utc
                    : (DateTime?)null;
                candidates.Add(new SaveStorageCandidate(
                    SaveStorageCandidateSource.LegacyOdinJson,
                    legacyOdinPath,
                    timestamp,
                    odin));
            }
            else if (!string.IsNullOrWhiteSpace(legacyOdinPath) && File.Exists(legacyOdinPath))
            {
                candidates.Add(new SaveStorageCandidate(
                    SaveStorageCandidateSource.LegacyOdinJson,
                    legacyOdinPath,
                    File.GetLastWriteTimeUtc(legacyOdinPath)));
            }

            return candidates
                .OrderBy(candidate => candidate.Source)
                .ThenByDescending(candidate => candidate.LastWriteUtc)
                .ThenBy(candidate => candidate.Path, StringComparer.Ordinal)
                .ToArray();
        }
    }
}
