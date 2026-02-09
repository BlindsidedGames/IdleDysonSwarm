using System;
using System.Globalization;
using System.IO;
using Expansion;
using Sirenix.Serialization;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;

namespace Systems.Save
{
    // Internal helper types used by Oracle.Load() to choose the best legacy candidate when the canonical file is missing.
    internal enum SaveLoadSource
    {
        CanonicalFile,
        Es3,
        Es3Recovered,
        LegacyOdinJson
    }

    internal readonly struct SaveLoadCandidate
    {
        public SaveLoadCandidate(SaveLoadSource source, Oracle.SaveDataSettings settings, string debugPath = null)
        {
            Source = source;
            Settings = settings;
            DebugPath = debugPath;
            SaveVersion = settings?.saveVersion ?? 0;
            TimestampUtc = SaveLoadCandidateSelector.TryGetCandidateTimestampUtc(settings, out DateTime utc)
                ? utc
                : (DateTime?)null;
        }

        public SaveLoadSource Source { get; }
        public Oracle.SaveDataSettings Settings { get; }
        public string DebugPath { get; }
        public int SaveVersion { get; }
        public DateTime? TimestampUtc { get; }
    }

    internal static class SaveLoadCandidateSelector
    {
        public static bool TryLoadLegacyOdinJsonSave(string filePath, out Oracle.SaveDataSettings settings, out string error)
        {
            settings = null;
            error = null;
            try
            {
                if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
                {
                    error = "File not found.";
                    return false;
                }

                byte[] bytes = File.ReadAllBytes(filePath);
                settings = SirenixSerializationUtility.DeserializeValue<Oracle.SaveDataSettings>(bytes, DataFormat.JSON);
                if (settings == null)
                {
                    error = "Deserialized null settings.";
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                settings = null;
                error = ex.Message;
                return false;
            }
        }

        public static bool TryGetCandidateTimestampUtc(Oracle.SaveDataSettings settings, out DateTime utc)
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

        public static int SourcePriority(SaveLoadSource source)
        {
            // Higher = preferred tie-break when candidates look identical.
            switch (source)
            {
                case SaveLoadSource.Es3:
                    return 3;
                case SaveLoadSource.Es3Recovered:
                    return 2;
                case SaveLoadSource.LegacyOdinJson:
                    return 1;
                case SaveLoadSource.CanonicalFile:
                    return 0;
                default:
                    return 0;
            }
        }

        public static bool IsBetterCandidate(SaveLoadCandidate candidate, SaveLoadCandidate best)
        {
            if (candidate.Settings == null) return false;
            if (best.Settings == null) return true;

            if (candidate.SaveVersion != best.SaveVersion)
            {
                return candidate.SaveVersion > best.SaveVersion;
            }

            if (candidate.TimestampUtc.HasValue || best.TimestampUtc.HasValue)
            {
                if (!best.TimestampUtc.HasValue) return true;
                if (!candidate.TimestampUtc.HasValue) return false;
                if (candidate.TimestampUtc.Value != best.TimestampUtc.Value)
                {
                    return candidate.TimestampUtc.Value > best.TimestampUtc.Value;
                }
            }

            int candidatePriority = SourcePriority(candidate.Source);
            int bestPriority = SourcePriority(best.Source);
            if (candidatePriority != bestPriority)
            {
                return candidatePriority > bestPriority;
            }

            return false;
        }
    }
}

