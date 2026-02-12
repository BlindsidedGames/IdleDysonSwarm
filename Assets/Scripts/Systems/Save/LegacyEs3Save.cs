using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Expansion;
using UnityEngine;

namespace Systems.Save
{
    public readonly struct LegacyEs3RecoveryCandidate
    {
        public LegacyEs3RecoveryCandidate(string path, Oracle.SaveDataSettings settings, DateTime? timestampUtc, int trust)
        {
            Path = path;
            Settings = settings;
            SaveVersion = settings?.saveVersion ?? 0;
            TimestampUtc = timestampUtc;
            Trust = trust;
        }

        public string Path { get; }
        public Oracle.SaveDataSettings Settings { get; }
        public int SaveVersion { get; }
        public DateTime? TimestampUtc { get; }
        public int Trust { get; }
    }

    /// <summary>
    /// Purpose: legacy ES3 artifact helpers used to import pre-canonical saves during startup recovery.
    /// Where it runs: runtime only (called from Oracle load/wipe flows).
    /// Primary entry points: <see cref="DeleteDefaultArtifacts"/>, <see cref="ArchiveDefaultArtifacts"/>,
    /// <see cref="TryRecoverDefaultSave"/>, <see cref="GetRecoverableCandidates"/>.
    /// Owns: ES3 file artifact probing, candidate ranking, and legacy format load attempts.
    /// Delegates: selected save adoption/migrations to <c>Expansion.Oracle</c>.
    /// </summary>
    /// <remarks>
    /// Interacts with:
    /// - Calls into: Easy Save 3 APIs (<c>ES3</c>/<c>ES3Settings</c>) and filesystem APIs.
    /// - Called by: <c>Assets/Scripts/Expansion/Oracle.Persistence.cs</c>.
    ///
    /// Change notes:
    /// - The key name <c>saveSettings</c> and ES3 default path assumptions must remain aligned with legacy builds.
    /// - Candidate trust/order affects which historical artifact is chosen when multiple saves exist.
    /// - Removing legacy AES fallback will regress recovery for encrypted ES3 files archived as <c>.corrupt.*</c>.
    /// </remarks>
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
                List<LegacyEs3RecoveryCandidate> candidates = GetRecoverableCandidates();
                if (candidates.Count == 0) return false;

                LegacyEs3RecoveryCandidate best = candidates[0];
                recovered = best.Settings;
                recoveredFromPath = best.Path;
                return true;
            }
            catch
            {
                // ignored
            }

            return false;
        }

        public static List<LegacyEs3RecoveryCandidate> GetRecoverableCandidates()
        {
            var recoverable = new List<LegacyEs3RecoveryCandidate>();
            try
            {
                ES3Settings settings = new ES3Settings();
                if (settings.location != ES3.Location.File) return recoverable;

                string fullPath = settings.FullPath;
                if (string.IsNullOrEmpty(fullPath)) return recoverable;

                foreach (string candidatePath in BuildCandidatePathList(fullPath))
                {
                    if (!TryLoadSaveSettingsFromEs3File(candidatePath, out Oracle.SaveDataSettings candidateSettings))
                        continue;

                    DateTime? utc = TryGetCandidateTimestampUtc(candidateSettings, out DateTime parsed)
                        ? parsed
                        : (DateTime?)null;
                    int trust = GetCandidateTrust(candidatePath);

                    var candidate = new LegacyEs3RecoveryCandidate(candidatePath, candidateSettings, utc, trust);
                    InsertCandidateByPriority(recoverable, candidate);
                }
            }
            catch
            {
                // ignored
            }

            return recoverable;
        }

        private static List<string> BuildCandidatePathList(string fullPath)
        {
            var candidates = new List<string>
            {
                fullPath,
                fullPath + ".bac",
                fullPath + ".tmp.bak",
                fullPath + ".tmp"
            };

            // Also scan for previously-archived files (*.corrupt.*) from earlier failed load attempts.
            // These were moved aside before AES fallback existed, so they may actually be valid.
            try
            {
                string dir = Path.GetDirectoryName(fullPath);
                string baseName = Path.GetFileName(fullPath);
                if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
                {
                    foreach (string archived in Directory.GetFiles(dir, baseName + ".corrupt.*"))
                    {
                        candidates.Add(archived);
                    }
                }
            }
            catch
            {
                // Non-critical — just skip archived file discovery.
            }

            return candidates;
        }

        private static void InsertCandidateByPriority(
            List<LegacyEs3RecoveryCandidate> ordered,
            LegacyEs3RecoveryCandidate candidate)
        {
            for (int i = 0; i < ordered.Count; i++)
            {
                LegacyEs3RecoveryCandidate current = ordered[i];
                if (IsBetter(
                        candidate.SaveVersion,
                        candidate.TimestampUtc,
                        candidate.Trust,
                        current.SaveVersion,
                        current.TimestampUtc,
                        current.Trust))
                {
                    ordered.Insert(i, candidate);
                    return;
                }
            }

            ordered.Add(candidate);
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
            if (candidatePath.Contains(".corrupt.")) return 0; // Previously archived — least trusted but still worth trying.
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
            if (string.IsNullOrEmpty(fullPath)) return false;
            if (!File.Exists(fullPath)) return false;

            // 1) Try with current defaults (no encryption, file location).
            if (TryEs3KeyExistsAndLoad(fullPath, null, out settings))
                return true;

            // 2) Older production installs wrote encrypted ES3 files even when current defaults are unencrypted.
            //    Probe legacy AES settings so encrypted saves are treated as recoverable instead of unrecoverable.
            if (TryLoadSaveSettingsFromLegacyAes(fullPath, out settings))
            {
                return true;
            }

            return false;
        }

        private static bool TryLoadSaveSettingsFromLegacyAes(string fullPath, out Oracle.SaveDataSettings settings)
        {
            settings = null;

            foreach (string password in EnumerateLegacyAesPasswords())
            {
                ES3Settings aesSettings = new ES3Settings(fullPath)
                {
                    encryptionType = ES3.EncryptionType.AES,
                    encryptionPassword = password,
                    compressionType = ES3.CompressionType.None
                };

                if (!TryEs3KeyExistsAndLoad(fullPath, aesSettings, out settings)) continue;

                return true;
            }

            return false;
        }

        private static System.Collections.Generic.IEnumerable<string> EnumerateLegacyAesPasswords()
        {
            var passwords = new System.Collections.Generic.List<string>();
            try
            {
                ES3Settings defaults = new ES3Settings();
                if (!string.IsNullOrWhiteSpace(defaults.encryptionPassword))
                {
                    passwords.Add(defaults.encryptionPassword);
                }
            }
            catch
            {
                // ignored
            }

            // Legacy ES3 defaults commonly used this password.
            if (!passwords.Contains("password"))
            {
                passwords.Add("password");
            }

            return passwords;
        }

        private static bool TryEs3KeyExistsAndLoad(string fullPath, ES3Settings overrideSettings,
            out Oracle.SaveDataSettings settings)
        {
            settings = null;
            try
            {
                bool exists = overrideSettings != null
                    ? ES3.KeyExists("saveSettings", overrideSettings)
                    : ES3.KeyExists("saveSettings", fullPath);
                if (!exists) return false;

                settings = overrideSettings != null
                    ? ES3.Load<Oracle.SaveDataSettings>("saveSettings", overrideSettings)
                    : ES3.Load<Oracle.SaveDataSettings>("saveSettings", fullPath);
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
