using System;
using System.Collections.Generic;
using System.Reflection;
using static Expansion.Oracle;

/*
 * SimulationUpgradeStateAccessor
 * Purpose: Reflection-backed adapter that maps upgrade keys to existing save fields without schema changes.
 * Runs: Runtime + Editor play mode.
 * Primary entry points: TryGetOwned(), SetOwned(), TrySetNumeric().
 * Owns vs delegates: Owns key-to-field resolution; delegates effect orchestration to SimulationUpgradeEffectApplier.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/ResearchManager.cs
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeEffectApplier.cs
 * - Assets/Scripts/Expansion/Oracle.cs save containers (SaveDataPrestige/SaveData/SaveDataDream1)
 *
 * Change notes:
 * - Keys are resolved against existing field names to preserve save compatibility.
 * - Field renames in save classes require synchronized key updates in balance assets.
 */
namespace IdleDysonSwarm.Systems.Balance
{
    /// <summary>
    /// Resolves upgrade state and value keys against existing save object fields.
    /// </summary>
    public static class SimulationUpgradeStateAccessor
    {
        /// <summary>
        /// Cached SaveDataPrestige fields by name.
        /// </summary>
        private static readonly Dictionary<string, FieldInfo> PrestigeFieldCache = new Dictionary<string, FieldInfo>(StringComparer.Ordinal);

        /// <summary>
        /// Cached SaveData fields by name.
        /// </summary>
        private static readonly Dictionary<string, FieldInfo> SaveFieldCache = new Dictionary<string, FieldInfo>(StringComparer.Ordinal);

        /// <summary>
        /// Cached SaveDataDream1 fields by name.
        /// </summary>
        private static readonly Dictionary<string, FieldInfo> Dream1FieldCache = new Dictionary<string, FieldInfo>(StringComparer.Ordinal);

        /// <summary>
        /// Tries to read a boolean ownership state for an upgrade key.
        /// </summary>
        /// <param name="key">Upgrade key.</param>
        /// <param name="prestige">Prestige save section.</param>
        /// <param name="save">Persistent save section.</param>
        /// <param name="owned">Resolved ownership state.</param>
        /// <returns>True when a matching bool field exists.</returns>
        public static bool TryGetOwned(string key, SaveDataPrestige prestige, SaveData save, out bool owned)
        {
            owned = false;
            if (string.IsNullOrWhiteSpace(key))
            {
                return false;
            }

            if (TryGetBool(prestige, key, PrestigeFieldCache, out owned))
            {
                return true;
            }

            if (TryGetBool(save, key, SaveFieldCache, out owned))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Sets a boolean ownership state for an upgrade key.
        /// </summary>
        /// <param name="key">Upgrade key.</param>
        /// <param name="value">Owned state value.</param>
        /// <param name="prestige">Prestige save section.</param>
        /// <param name="save">Persistent save section.</param>
        /// <returns>True when a matching bool field is updated.</returns>
        public static bool SetOwned(string key, bool value, SaveDataPrestige prestige, SaveData save)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return false;
            }

            if (TrySetBool(prestige, key, value, PrestigeFieldCache))
            {
                return true;
            }

            if (TrySetBool(save, key, value, SaveFieldCache))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Tries to set a numeric value on SaveDataDream1 by key.
        /// </summary>
        /// <param name="key">Field key.</param>
        /// <param name="value">Value to assign.</param>
        /// <param name="dream1">Dream1 save section.</param>
        /// <returns>True when set succeeded.</returns>
        public static bool TrySetDream1Numeric(string key, double value, SaveDataDream1 dream1)
        {
            return TrySetNumeric(dream1, key, value, Dream1FieldCache);
        }

        /// <summary>
        /// Tries to set a numeric value on SaveDataPrestige by key.
        /// </summary>
        /// <param name="key">Field key.</param>
        /// <param name="value">Value to assign.</param>
        /// <param name="prestige">Prestige save section.</param>
        /// <returns>True when set succeeded.</returns>
        public static bool TrySetPrestigeNumeric(string key, double value, SaveDataPrestige prestige)
        {
            return TrySetNumeric(prestige, key, value, PrestigeFieldCache);
        }

        /// <summary>
        /// Tries to set a numeric value on SaveData by key.
        /// </summary>
        /// <param name="key">Field key.</param>
        /// <param name="value">Value to assign.</param>
        /// <param name="save">Persistent save section.</param>
        /// <returns>True when set succeeded.</returns>
        public static bool TrySetSaveNumeric(string key, double value, SaveData save)
        {
            return TrySetNumeric(save, key, value, SaveFieldCache);
        }

        /// <summary>
        /// Tries to set a boolean value on SaveDataDream1 by key.
        /// </summary>
        /// <param name="key">Field key.</param>
        /// <param name="value">Boolean value.</param>
        /// <param name="dream1">Dream1 save section.</param>
        /// <returns>True when set succeeded.</returns>
        public static bool TrySetDream1Flag(string key, bool value, SaveDataDream1 dream1)
        {
            return TrySetBool(dream1, key, value, Dream1FieldCache);
        }

        /// <summary>
        /// Sets a Dream1 numeric field to max(current, value).
        /// </summary>
        /// <param name="key">Field key.</param>
        /// <param name="value">Candidate value.</param>
        /// <param name="dream1">Dream1 save section.</param>
        /// <returns>True when the field exists and update succeeds.</returns>
        public static bool TryMaxDream1Numeric(string key, double value, SaveDataDream1 dream1)
        {
            return TryMaxNumeric(dream1, key, value, Dream1FieldCache);
        }

        /// <summary>
        /// Sets a SaveData numeric field to max(current, value).
        /// </summary>
        /// <param name="key">Field key.</param>
        /// <param name="value">Candidate value.</param>
        /// <param name="save">Persistent save section.</param>
        /// <returns>True when the field exists and update succeeds.</returns>
        public static bool TryMaxSaveNumeric(string key, double value, SaveData save)
        {
            return TryMaxNumeric(save, key, value, SaveFieldCache);
        }

        /// <summary>
        /// Reads a boolean field by key.
        /// </summary>
        /// <param name="target">Target object.</param>
        /// <param name="key">Field key.</param>
        /// <param name="cache">Field cache.</param>
        /// <param name="value">Resolved value.</param>
        /// <returns>True when found and read.</returns>
        private static bool TryGetBool(object target, string key, Dictionary<string, FieldInfo> cache, out bool value)
        {
            value = false;
            if (target == null)
            {
                return false;
            }

            if (!TryResolveField(target.GetType(), key, cache, out FieldInfo field) || field.FieldType != typeof(bool))
            {
                return false;
            }

            value = (bool)field.GetValue(target);
            return true;
        }

        /// <summary>
        /// Sets a boolean field by key.
        /// </summary>
        /// <param name="target">Target object.</param>
        /// <param name="key">Field key.</param>
        /// <param name="value">Boolean value.</param>
        /// <param name="cache">Field cache.</param>
        /// <returns>True when found and set.</returns>
        private static bool TrySetBool(object target, string key, bool value, Dictionary<string, FieldInfo> cache)
        {
            if (target == null)
            {
                return false;
            }

            if (!TryResolveField(target.GetType(), key, cache, out FieldInfo field) || field.FieldType != typeof(bool))
            {
                return false;
            }

            field.SetValue(target, value);
            return true;
        }

        /// <summary>
        /// Sets a numeric field by key for double/float/int/long targets.
        /// </summary>
        /// <param name="target">Target object.</param>
        /// <param name="key">Field key.</param>
        /// <param name="value">Numeric value.</param>
        /// <param name="cache">Field cache.</param>
        /// <returns>True when field exists and assignment succeeds.</returns>
        private static bool TrySetNumeric(object target, string key, double value, Dictionary<string, FieldInfo> cache)
        {
            if (target == null || string.IsNullOrWhiteSpace(key))
            {
                return false;
            }

            if (!TryResolveField(target.GetType(), key, cache, out FieldInfo field))
            {
                return false;
            }

            Type fieldType = field.FieldType;
            if (fieldType == typeof(double))
            {
                field.SetValue(target, value);
                return true;
            }

            if (fieldType == typeof(float))
            {
                field.SetValue(target, (float)value);
                return true;
            }

            if (fieldType == typeof(int))
            {
                field.SetValue(target, (int)Math.Round(value));
                return true;
            }

            if (fieldType == typeof(long))
            {
                field.SetValue(target, (long)Math.Round(value));
                return true;
            }

            return false;
        }

        /// <summary>
        /// Sets a numeric field to max(current, candidate).
        /// </summary>
        /// <param name="target">Target object.</param>
        /// <param name="key">Field key.</param>
        /// <param name="candidate">Candidate value.</param>
        /// <param name="cache">Field cache.</param>
        /// <returns>True when field exists and max assignment succeeds.</returns>
        private static bool TryMaxNumeric(object target, string key, double candidate, Dictionary<string, FieldInfo> cache)
        {
            if (!TryGetNumeric(target, key, cache, out double current))
            {
                return false;
            }

            return TrySetNumeric(target, key, Math.Max(current, candidate), cache);
        }

        /// <summary>
        /// Reads a numeric field for supported numeric types.
        /// </summary>
        /// <param name="target">Target object.</param>
        /// <param name="key">Field key.</param>
        /// <param name="cache">Field cache.</param>
        /// <param name="value">Resolved numeric value.</param>
        /// <returns>True when a numeric field exists and is readable.</returns>
        private static bool TryGetNumeric(object target, string key, Dictionary<string, FieldInfo> cache, out double value)
        {
            value = 0;
            if (target == null || string.IsNullOrWhiteSpace(key))
            {
                return false;
            }

            if (!TryResolveField(target.GetType(), key, cache, out FieldInfo field))
            {
                return false;
            }

            Type fieldType = field.FieldType;
            object raw = field.GetValue(target);
            if (fieldType == typeof(double))
            {
                value = raw != null ? (double)raw : 0;
                return true;
            }

            if (fieldType == typeof(float))
            {
                value = raw != null ? (float)raw : 0;
                return true;
            }

            if (fieldType == typeof(int))
            {
                value = raw != null ? (int)raw : 0;
                return true;
            }

            if (fieldType == typeof(long))
            {
                value = raw != null ? (long)raw : 0;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Resolves a field for a key and caches the result.
        /// </summary>
        /// <param name="targetType">Target object type.</param>
        /// <param name="key">Field key.</param>
        /// <param name="cache">Field cache.</param>
        /// <param name="field">Resolved field.</param>
        /// <returns>True when a field is resolved.</returns>
        private static bool TryResolveField(Type targetType, string key, Dictionary<string, FieldInfo> cache, out FieldInfo field)
        {
            if (cache.TryGetValue(key, out field))
            {
                return field != null;
            }

            field = targetType.GetField(key, BindingFlags.Public | BindingFlags.Instance);
            cache[key] = field;
            return field != null;
        }
    }
}
