/*
 * Purpose: Exposes existing ES3 and legacy Odin readers as explicit read-only prepared-save candidate descriptors.
 * Runs: Runtime recovery discovery and Unity Editor tests where adapter output is injected.
 * Primary entry points: LegacySaveCandidateAdapter.Discover and FromExistingAdapterResults.
 * Owns: Adapter invocation and deterministic descriptor ordering only.
 * Delegates: ES3 probing to LegacyEs3Save and Odin JSON decoding to SaveLoadCandidateSelector.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/LegacyEs3Save.cs.
 * - Assets/Scripts/Systems/Save/SaveLoadCandidateSelector.cs.
 * - Assets/Scripts/Systems/Save/SaveStorageCandidate.cs.
 *
 * Change notes:
 * - Discovery must remain read-only; archiving/deleting legacy artifacts is not permitted here.
 * - Adapter-decoded settings are immutable inputs and are deep-copied by SavePreparationPipeline.
 * - ES3 remains best-effort until an authentic fixture is available.
 */

using System;
using System.Collections.Generic;
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
            return FromExistingAdapterResults(
                LegacyEs3Save.GetRecoverableCandidates(),
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

            if (SaveLoadCandidateSelector.TryLoadLegacyOdinJsonSave(
                    legacyOdinPath,
                    out Oracle.SaveDataSettings odin,
                    out _) &&
                odin != null)
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

            return candidates
                .OrderBy(candidate => candidate.Source)
                .ThenByDescending(candidate => candidate.LastWriteUtc)
                .ThenBy(candidate => candidate.Path, StringComparer.Ordinal)
                .ToArray();
        }
    }
}
