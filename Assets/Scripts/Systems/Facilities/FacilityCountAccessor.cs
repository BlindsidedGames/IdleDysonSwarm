using System.Collections.Generic;
using System.Reflection;
using IdleDysonSwarm.Systems.Balance;
using UnityEngine;
using static Expansion.Oracle;

namespace Systems.Facilities
{
    /// <summary>
    /// Provides reflection-based access to facility count arrays in DysonVerseInfinityData.
    /// Follows the same pattern as SkillFlagAccessor for consistency.
    /// </summary>
    public static class FacilityCountAccessor
    {
        /// <summary>
        /// Legacy fallback map used when balance profile assets are unavailable.
        /// </summary>
        private static readonly Dictionary<string, string> LegacyFacilityFieldMap = new Dictionary<string, string>
        {
            { "assembly_lines", "assemblyLines" },
            { "ai_managers", "managers" },
            { "servers", "servers" },
            { "data_centers", "dataCenters" },
            { "planets", "planets" },
            // Mega-structures
            { "matrioshka_brains", "matrioshkaBrains" },
            { "birch_planets", "birchPlanets" },
            { "galactic_brains", "galacticBrains" }
        };

        private static readonly Dictionary<string, FieldInfo> FieldCache = new Dictionary<string, FieldInfo>();
        private static readonly HashSet<string> MissingFacilities = new HashSet<string>();
        private static readonly HashSet<string> InvalidFacilities = new HashSet<string>();

        /// <summary>
        /// Attempts to get the count array [auto, manual] for a facility.
        /// </summary>
        /// <param name="data">The infinity data containing facility counts.</param>
        /// <param name="facilityId">The facility ID (e.g., "assembly_lines").</param>
        /// <param name="counts">Output array containing [auto, manual] counts.</param>
        /// <returns>True if the facility was found and counts retrieved, false otherwise.</returns>
        public static bool TryGetCount(DysonVerseInfinityData data, string facilityId, out double[] counts)
        {
            counts = null;
            if (data == null || string.IsNullOrEmpty(facilityId)) return false;

            FieldInfo field = GetFacilityField(facilityId);
            if (field == null) return false;

            if (field.FieldType != typeof(double[]))
            {
                if (InvalidFacilities.Add(facilityId))
                    Debug.LogWarning($"Facility '{facilityId}' field is not a double[] on DysonVerseInfinityData.");
                return false;
            }

            counts = (double[])field.GetValue(data);
            return counts != null;
        }

        /// <summary>
        /// Attempts to set the count values for a facility.
        /// </summary>
        /// <param name="data">The infinity data containing facility counts.</param>
        /// <param name="facilityId">The facility ID (e.g., "assembly_lines").</param>
        /// <param name="auto">The auto-purchased count (index 0).</param>
        /// <param name="manual">The manually-purchased count (index 1).</param>
        /// <returns>True if the facility was found and counts updated, false otherwise.</returns>
        public static bool TrySetCount(DysonVerseInfinityData data, string facilityId, double auto, double manual)
        {
            if (data == null || string.IsNullOrEmpty(facilityId)) return false;

            FieldInfo field = GetFacilityField(facilityId);
            if (field == null) return false;

            if (field.FieldType != typeof(double[]))
            {
                if (InvalidFacilities.Add(facilityId))
                    Debug.LogWarning($"Facility '{facilityId}' field is not a double[] on DysonVerseInfinityData.");
                return false;
            }

            double[] counts = (double[])field.GetValue(data);
            if (counts == null || counts.Length < 2)
            {
                Debug.LogWarning($"Facility '{facilityId}' has invalid count array.");
                return false;
            }

            counts[0] = auto;
            counts[1] = manual;
            return true;
        }

        /// <summary>
        /// Checks if a facility ID is known and can be accessed.
        /// </summary>
        /// <param name="facilityId">The facility ID to check.</param>
        /// <returns>True if the facility ID is mapped to a field.</returns>
        public static bool IsKnownFacility(string facilityId)
        {
            if (string.IsNullOrEmpty(facilityId)) return false;
            if (BalanceRuntime.TryGetFacilityEntry(facilityId, out _)) return true;
            return LegacyFacilityFieldMap.ContainsKey(facilityId);
        }

        private static FieldInfo GetFacilityField(string facilityId)
        {
            if (FieldCache.TryGetValue(facilityId, out FieldInfo cached)) return cached;

            string fieldName = null;
            if (BalanceRuntime.TryGetFacilityEntry(facilityId, out var entry) &&
                !string.IsNullOrEmpty(entry.countFieldName))
            {
                fieldName = entry.countFieldName;
            }
            else if (LegacyFacilityFieldMap.TryGetValue(facilityId, out string legacyFieldName))
            {
                fieldName = legacyFieldName;
            }

            if (string.IsNullOrEmpty(fieldName))
            {
                if (MissingFacilities.Add(facilityId))
                    Debug.LogWarning($"Facility '{facilityId}' is not mapped in FacilityCountAccessor.");
                FieldCache[facilityId] = null;
                return null;
            }

            FieldInfo field = typeof(DysonVerseInfinityData)
                .GetField(fieldName, BindingFlags.Public | BindingFlags.Instance);

            FieldCache[facilityId] = field;

            if (field == null && MissingFacilities.Add(facilityId))
                Debug.LogWarning($"Facility '{facilityId}' maps to field '{fieldName}' which does not exist on DysonVerseInfinityData.");

            return field;
        }
    }
}
