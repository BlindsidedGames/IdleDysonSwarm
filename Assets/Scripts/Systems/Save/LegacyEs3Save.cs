using System;
using System.Globalization;
using System.IO;
using Expansion;
using UnityEngine;

namespace Systems.Save
{
    /// <summary>
    /// Legacy ES3 save helpers kept for importing older saves during the Odin-only transition.
    /// </summary>
    public static class LegacyEs3Save
    {
        public static void DeleteDefaultArtifacts()
        {
            // Some devices end up with a truncated/corrupted ES3 file (or encryption mismatch),
            // which can make even ES3.KeyExists throw on startup. If that happens, the only
            // practical recovery is to delete the ES3 file and start fresh.
            try
            {
                ES3Settings settings = new ES3Settings();

                // Primary delete via ES3 API (handles PlayerPrefs vs File location).
                try { ES3.DeleteFile(settings); }
                catch (Exception e) { Debug.LogWarning($"[SaveRecovery] ES3.DeleteFile failed: {e.Message}"); }

                // Also delete ES3 temp/backup artifacts if using file storage.
                if (settings.location == ES3.Location.File)
                {
                    string fullPath = settings.FullPath;
                    if (!string.IsNullOrEmpty(fullPath))
                    {
                        // ES3IO uses these suffixes internally.
                        TryDeleteFile(fullPath + ".tmp");
                        TryDeleteFile(fullPath + ".tmp.bak");
                        TryDeleteFile(fullPath + ".bac");
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[SaveRecovery] Failed deleting ES3 artifacts: {e.Message}");
            }
        }

        public static void ArchiveDefaultArtifacts(string reason)
        {
            // Best-effort: keep a copy of the broken save on disk for support/debugging.
            // This only applies when ES3 is writing to a file (default for this project).
            try
            {
                ES3Settings settings = new ES3Settings();
                if (settings.location != ES3.Location.File) return;

                string fullPath = settings.FullPath;
                if (string.IsNullOrEmpty(fullPath)) return;
                if (!File.Exists(fullPath)) return;

                string stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
                string archivePath = $"{fullPath}.corrupt.{stamp}";

                int counter = 1;
                while (File.Exists(archivePath) && counter < 50)
                {
                    archivePath = $"{fullPath}.corrupt.{stamp}.{counter}";
                    counter++;
                }

                File.Move(fullPath, archivePath);
                Debug.LogWarning($"[SaveRecovery] Archived broken ES3 save to '{archivePath}' (reason={reason}).");

                // Also archive temp/backup artifacts if they exist.
                TryArchiveFile(fullPath + ".tmp", $"{archivePath}.tmp");
                TryArchiveFile(fullPath + ".tmp.bak", $"{archivePath}.tmp.bak");
                TryArchiveFile(fullPath + ".bac", $"{archivePath}.bac");
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[SaveRecovery] Failed archiving ES3 artifacts: {e.Message}");
            }
        }

        public static bool TryRecoverDefaultSave(out Oracle.SaveDataSettings recovered, out string recoveredFromPath)
        {
            recovered = null;
            recoveredFromPath = null;
            try
            {
                ES3Settings settings = new ES3Settings();
                if (settings.location != ES3.Location.File) return false;
                string fullPath = settings.FullPath;
                if (string.IsNullOrEmpty(fullPath)) return false;

                // ES3 writes via a temp file and keeps a copy of the previous file at "<fullPath>.tmp.bak".
                // If the main file is corrupt/truncated or silently loads defaults, the backup artifacts
                // often still contain the last good save.
                //
                // Try all candidates and pick the "best" by:
                // - saveVersion (higher wins)
                // - timestamp (later wins; best-effort parse)
                // - file trust (main > .bac > .tmp.bak > .tmp)
                string[] candidates =
                {
                    fullPath,
                    fullPath + ".bac",
                    fullPath + ".tmp.bak",
                    fullPath + ".tmp"
                };

                Oracle.SaveDataSettings best = null;
                string bestPath = null;
                int bestVersion = -1;
                DateTime? bestUtc = null;
                int bestTrust = -1;

                foreach (string candidate in candidates)
                {
                    if (!TryLoadSaveSettingsFromEs3File(candidate, out Oracle.SaveDataSettings candidateSettings)) continue;

                    int version = candidateSettings?.saveVersion ?? 0;
                    DateTime? utc = TryGetCandidateTimestampUtc(candidateSettings, out DateTime parsed) ? parsed : (DateTime?)null;
                    int trust = GetCandidateTrust(candidate);

                    if (IsBetter(version, utc, trust, bestVersion, bestUtc, bestTrust))
                    {
                        best = candidateSettings;
                        bestPath = candidate;
                        bestVersion = version;
                        bestUtc = utc;
                        bestTrust = trust;
                    }
                }

                if (best == null) return false;
                recovered = best;
                recoveredFromPath = bestPath;
                return true;
            }
            catch
            {
                // ignored
            }

            return false;
        }

        private static bool IsBetter(
            int version,
            DateTime? utc,
            int trust,
            int bestVersion,
            DateTime? bestUtc,
            int bestTrust)
        {
            if (bestVersion < 0) return true;
            if (version != bestVersion) return version > bestVersion;

            if (utc.HasValue || bestUtc.HasValue)
            {
                if (!bestUtc.HasValue) return true;
                if (!utc.HasValue) return false;
                if (utc.Value != bestUtc.Value) return utc.Value > bestUtc.Value;
            }

            return trust > bestTrust;
        }

        private static int GetCandidateTrust(string candidatePath)
        {
            // Higher = more trusted.
            if (string.IsNullOrEmpty(candidatePath)) return 0;
            if (candidatePath.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase)) return 1;
            if (candidatePath.EndsWith(".tmp.bak", StringComparison.OrdinalIgnoreCase)) return 2;
            if (candidatePath.EndsWith(".bac", StringComparison.OrdinalIgnoreCase)) return 3;
            return 4;
        }

        private static bool TryGetCandidateTimestampUtc(Oracle.SaveDataSettings settings, out DateTime utc)
        {
            utc = default;
            if (settings == null) return false;
            if (TryParseInvariantUtc(settings.lastSuccessfulLoadUtc, out utc)) return true;
            if (TryParseInvariantUtc(settings.dateQuitString, out utc)) return true;
            return TryParseInvariantUtc(settings.dateStarted, out utc);
        }

        private static bool TryParseInvariantUtc(string value, out DateTime utc)
        {
            utc = default;
            if (string.IsNullOrWhiteSpace(value)) return false;
            return DateTime.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out utc);
        }

        private static void TryArchiveFile(string sourcePath, string destPath)
        {
            try
            {
                if (!File.Exists(sourcePath)) return;
                if (File.Exists(destPath)) return;
                File.Move(sourcePath, destPath);
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[SaveRecovery] Failed archiving '{sourcePath}': {e.Message}");
            }
        }

        private static bool TryLoadSaveSettingsFromEs3File(string fullPath, out Oracle.SaveDataSettings settings)
        {
            settings = null;
            try
            {
                if (string.IsNullOrEmpty(fullPath)) return false;
                if (!File.Exists(fullPath)) return false;
                if (!ES3.KeyExists("saveSettings", fullPath)) return false;
                settings = ES3.Load<Oracle.SaveDataSettings>("saveSettings", fullPath);
                return settings != null;
            }
            catch
            {
                settings = null;
                return false;
            }
        }

        private static void TryDeleteFile(string path)
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
            }
            catch
            {
                // ignored
            }
        }
    }
}
