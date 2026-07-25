/*
 * Purpose: Validates prepared save graphs before they can be published or committed to canonical storage.
 * Runs: Runtime save/load preparation and Unity Editor save-integrity tests.
 * Primary entry point: SaveDataValidator.TryValidate.
 * Owns: Required shape, durable-ID key/value, dense facility-array, and finite-number validation.
 * Delegates: Migration and normalization to Oracle migration code before validation begins.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/SavePreparationPipeline.cs.
 * - Expansion.Oracle.SaveDataSettings and its nested persisted data classes.
 * - Assets/Scripts/Systems/Save/FacilityArrayNormalizer.cs.
 *
 * Change notes:
 * - New required persisted containers or identifier maps must be added to the explicit shape checks.
 * - Stable-ID skill-state entries must have non-null values so published state remains safe to persist.
 * - Facility storage remains eight dense two-slot arrays; changing that contract requires migration and test updates.
 * - Rejecting additional numeric states can make historical saves unloadable and requires fixture evidence.
 */

using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using Expansion;
using UnityEngine;

namespace Systems.Save
{
    /// <summary>
    /// Enforces the minimum publishable and persistable V11 save contract.
    /// </summary>
    public static class SaveDataValidator
    {
        /// <summary>
        /// Validates schema, required containers, durable identifiers, facility arrays, and all serialized finite values.
        /// </summary>
        /// <param name="settings">The isolated migrated settings to validate.</param>
        /// <param name="expectedSchema">The only schema this build may publish.</param>
        /// <param name="error">The first validation failure, or null on success.</param>
        /// <returns><see langword="true"/> when the graph is safe to publish or persist.</returns>
        public static bool TryValidate(
            Oracle.SaveDataSettings settings,
            int expectedSchema,
            out string error)
        {
            error = null;
            if (settings == null)
            {
                error = "Prepared settings are null.";
                return false;
            }

            if (settings.saveVersion != expectedSchema)
            {
                error = $"Prepared schema {settings.saveVersion} does not match supported schema {expectedSchema}.";
                return false;
            }

            if (settings.saveData == null ||
                settings.sdPrestige == null ||
                settings.sdSimulation == null ||
                settings.prestigePlus == null ||
                settings.avocadoData == null ||
                settings.dysonVerseSaveData == null)
            {
                error = "A required root save container is null.";
                return false;
            }

            Oracle.DysonVerseSaveData dyson = settings.dysonVerseSaveData;
            if (dyson.dysonVerseInfinityData == null ||
                dyson.dysonVersePrestigeData == null ||
                dyson.dysonVerseSkillTreeData == null)
            {
                error = "A required Dyson Verse save container is null.";
                return false;
            }

            if (!ValidateAutoAssignmentCollections(dyson, out error))
            {
                return false;
            }

            Oracle.DysonVerseInfinityData infinity = dyson.dysonVerseInfinityData;
            if (infinity.skillStateById == null ||
                infinity.skillOwnedById == null ||
                infinity.researchLevelsById == null)
            {
                error = "A required durable-ID dictionary is null.";
                return false;
            }

            if (!ValidateStringKeys(infinity.skillStateById.Keys, "skillStateById", out error) ||
                !ValidateStringKeys(infinity.skillOwnedById.Keys, "skillOwnedById", out error) ||
                !ValidateStringKeys(infinity.researchLevelsById.Keys, "researchLevelsById", out error))
            {
                return false;
            }

            foreach (var entry in infinity.skillStateById)
            {
                if (entry.Value != null)
                {
                    continue;
                }

                error = $"skillStateById contains a null value for durable identifier '{entry.Key}'.";
                return false;
            }

            if (!ValidateFacilityArray(infinity.assemblyLines, "assemblyLines", out error) ||
                !ValidateFacilityArray(infinity.managers, "managers", out error) ||
                !ValidateFacilityArray(infinity.servers, "servers", out error) ||
                !ValidateFacilityArray(infinity.dataCenters, "dataCenters", out error) ||
                !ValidateFacilityArray(infinity.planets, "planets", out error) ||
                !ValidateFacilityArray(infinity.matrioshkaBrains, "matrioshkaBrains", out error) ||
                !ValidateFacilityArray(infinity.birchPlanets, "birchPlanets", out error) ||
                !ValidateFacilityArray(infinity.galacticBrains, "galacticBrains", out error))
            {
                return false;
            }

            var visited = new HashSet<object>(ReferenceComparer.Instance);
            return ValidateFiniteGraph(settings, "saveSettings", visited, out error);
        }

        /// <summary>
        /// Validates all current and preset legacy-key/stable-ID auto-assignment collections.
        /// </summary>
        /// <param name="data">The normalized Dyson Verse container.</param>
        /// <param name="error">The first missing collection, or null.</param>
        /// <returns><see langword="true"/> when every required collection exists.</returns>
        private static bool ValidateAutoAssignmentCollections(
            Oracle.DysonVerseSaveData data,
            out string error)
        {
            error = null;
            if (data.skillAutoAssignmentList == null ||
                data.skillAutoAssignmentList1 == null ||
                data.skillAutoAssignmentList2 == null ||
                data.skillAutoAssignmentList3 == null ||
                data.skillAutoAssignmentList4 == null ||
                data.skillAutoAssignmentList5 == null ||
                data.skillAutoAssignmentIds == null ||
                data.skillAutoAssignmentIds1 == null ||
                data.skillAutoAssignmentIds2 == null ||
                data.skillAutoAssignmentIds3 == null ||
                data.skillAutoAssignmentIds4 == null ||
                data.skillAutoAssignmentIds5 == null)
            {
                error = "A required skill auto-assignment collection is null.";
                return false;
            }

            return ValidateStringKeys(data.skillAutoAssignmentIds, "skillAutoAssignmentIds", out error) &&
                   ValidateStringKeys(data.skillAutoAssignmentIds1, "skillAutoAssignmentIds1", out error) &&
                   ValidateStringKeys(data.skillAutoAssignmentIds2, "skillAutoAssignmentIds2", out error) &&
                   ValidateStringKeys(data.skillAutoAssignmentIds3, "skillAutoAssignmentIds3", out error) &&
                   ValidateStringKeys(data.skillAutoAssignmentIds4, "skillAutoAssignmentIds4", out error) &&
                   ValidateStringKeys(data.skillAutoAssignmentIds5, "skillAutoAssignmentIds5", out error);
        }

        /// <summary>
        /// Rejects null, empty, or whitespace durable identifiers.
        /// </summary>
        /// <param name="keys">The identifier sequence.</param>
        /// <param name="label">The owning field label.</param>
        /// <param name="error">The validation failure, or null.</param>
        /// <returns><see langword="true"/> when every identifier is durable.</returns>
        private static bool ValidateStringKeys(IEnumerable<string> keys, string label, out string error)
        {
            error = null;
            foreach (string key in keys)
            {
                if (!string.IsNullOrWhiteSpace(key))
                {
                    continue;
                }

                error = $"{label} contains an empty durable identifier.";
                return false;
            }

            return true;
        }

        /// <summary>
        /// Enforces the canonical two-slot dense facility representation.
        /// </summary>
        /// <param name="values">The facility array.</param>
        /// <param name="label">The field label.</param>
        /// <param name="error">The validation failure, or null.</param>
        /// <returns><see langword="true"/> when exactly two slots exist.</returns>
        private static bool ValidateFacilityArray(double[] values, string label, out string error)
        {
            error = null;
            if (values != null && values.Length == 2)
            {
                return true;
            }

            error = $"{label} must contain exactly two dense facility slots.";
            return false;
        }

        /// <summary>
        /// Recursively rejects non-finite serialized floating-point values.
        /// </summary>
        /// <param name="value">The current graph value.</param>
        /// <param name="path">The diagnostic field path.</param>
        /// <param name="visited">Reference-cycle guard.</param>
        /// <param name="error">The first finite-number failure, or null.</param>
        /// <returns><see langword="true"/> when the traversed graph contains only finite numbers.</returns>
        private static bool ValidateFiniteGraph(
            object value,
            string path,
            HashSet<object> visited,
            out string error)
        {
            error = null;
            if (value == null || value is string)
            {
                return true;
            }

            if (value is double doubleValue)
            {
                if (!double.IsNaN(doubleValue) && !double.IsInfinity(doubleValue))
                {
                    return true;
                }

                error = $"{path} contains a non-finite double.";
                return false;
            }

            if (value is float floatValue)
            {
                if (!float.IsNaN(floatValue) && !float.IsInfinity(floatValue))
                {
                    return true;
                }

                error = $"{path} contains a non-finite float.";
                return false;
            }

            Type type = value.GetType();
            if (type.IsPrimitive || type.IsEnum || type == typeof(decimal) || value is UnityEngine.Object)
            {
                return true;
            }

            if (!type.IsValueType && !visited.Add(value))
            {
                return true;
            }

            if (value is IDictionary dictionary)
            {
                foreach (DictionaryEntry entry in dictionary)
                {
                    if (!ValidateFiniteGraph(entry.Value, $"{path}[{entry.Key}]", visited, out error))
                    {
                        return false;
                    }
                }

                return true;
            }

            if (value is IEnumerable sequence)
            {
                int index = 0;
                foreach (object item in sequence)
                {
                    if (!ValidateFiniteGraph(item, $"{path}[{index}]", visited, out error))
                    {
                        return false;
                    }

                    index++;
                }

                return true;
            }

            foreach (FieldInfo field in type.GetFields(BindingFlags.Instance | BindingFlags.Public))
            {
                if (!ValidateFiniteGraph(field.GetValue(value), $"{path}.{field.Name}", visited, out error))
                {
                    return false;
                }
            }

            return true;
        }

        /// <summary>
        /// Compares graph nodes by reference identity for cycle detection.
        /// </summary>
        private sealed class ReferenceComparer : IEqualityComparer<object>
        {
            internal static readonly ReferenceComparer Instance = new ReferenceComparer();

            /// <summary>
            /// Compares two graph nodes by reference.
            /// </summary>
            /// <param name="left">The first node.</param>
            /// <param name="right">The second node.</param>
            /// <returns><see langword="true"/> only for the same object reference.</returns>
            public new bool Equals(object left, object right)
            {
                return ReferenceEquals(left, right);
            }

            /// <summary>
            /// Returns the runtime reference hash code.
            /// </summary>
            /// <param name="value">The graph node.</param>
            /// <returns>The reference identity hash.</returns>
            public int GetHashCode(object value)
            {
                return System.Runtime.CompilerServices.RuntimeHelpers.GetHashCode(value);
            }
        }
    }
}
