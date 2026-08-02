/*
 * Purpose: Repairs untrusted numeric save state on the preparation pipeline's isolated working copy.
 * Runs: During schema migration/normalization, before SaveDataValidator publication.
 * Primary entry point: NumericSaveRepair.Repair.
 *
 * Policy:
 * - Bot non-finite values are corruption and become zero without reward.
 * - Legacy exact finite double.MaxValue bots become a durable pending cap transition.
 * - Other positive Infinity becomes finite double.MaxValue.
 * - NaN, negative Infinity, and forbidden negative progress become zero.
 * - Invalid positive structural values return to the versioned authored default.
 * - Offline banks are clamped to 42,000,000 seconds and mark the existing cheater flag.
 */

using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using Expansion;
using Systems.Debugging;
using Systems.Numeric;
using UnityEngine;

namespace Systems.Save
{
    public sealed class NumericSaveRepairResult
    {
        public int RepairCount { get; internal set; }
        public IReadOnlyList<string> Entries => _entries;

        private readonly List<string> _entries = new List<string>();

        internal void Add(string path, object original, object replacement, string rule)
        {
            RepairCount++;
            if (_entries.Count >= 128) return;
            _entries.Add($"{path}|{Format(original)}|{Format(replacement)}|{rule}");
        }

        private static string Format(object value)
        {
            if (value is double doubleValue) return doubleValue.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
            if (value is float floatValue) return floatValue.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
            return value?.ToString() ?? "null";
        }
    }

    public static class NumericSaveRepair
    {
        private const double DefaultOfflineCapacitySeconds = 86400d;

        public static NumericSaveRepairResult Repair(Oracle.SaveDataSettings settings)
        {
            var result = new NumericSaveRepairResult();
            if (settings == null) return result;

            Oracle.DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData?.dysonVerseInfinityData;
            if (infinity != null)
            {
                RepairBots(settings, infinity, result);
                RepairDiscreteResearchLevels(infinity, result);
                DiscardDerivedProductionState(infinity);
            }

            Oracle.SaveDataSettings defaults = new Oracle.SaveDataSettings();
            // Preserve the evidence that an infinite bank exceeded the authored cap.
            // The generic graph repair would otherwise turn +Infinity into the exact
            // cap before the comparison flag can be set.
            RepairTimeBanks(settings, result);
            var visited = new HashSet<object>(ReferenceComparer.Instance);
            RepairGraph(settings, defaults, "saveSettings", visited, result);
            RepairRealityProgress(settings, result);
            RepairRailgunState(settings, result);
            RepairAuthoredDiscreteBounds(settings, result);

            if (result.RepairCount > 0)
            {
                settings.numericRepairNoticePending = true;
                settings.lastNumericRepairLog = new List<string>(result.Entries);
                NumericDiagnostics.Report(
                    "NS-SAVE-REPAIR",
                    $"schema={settings.saveVersion};count={result.RepairCount}");
            }

            return result;
        }

        private static void DiscardDerivedProductionState(Oracle.DysonVerseInfinityData infinity)
        {
            infinity.panelsPerSec = 0d;
            infinity.botProduction = 0d;
            infinity.assemblyLineBotProduction = 0d;
            infinity.assemblyLineProduction = 0d;
            infinity.managerAssemblyLineProduction = 0d;
            infinity.managerProduction = 0d;
            infinity.serverManagerProduction = 0d;
            infinity.serverProduction = 0d;
            infinity.dataCenterServerProduction = 0d;
            infinity.dataCenterProduction = 0d;
            infinity.planetsDataCenterProduction = 0d;
            infinity.matrioshkaBrainPlanetProduction = 0d;
            infinity.birchPlanetMatrioshkaProduction = 0d;
            infinity.galacticBrainBirchProduction = 0d;
            infinity.pocketDimensionsProduction = 0d;
            infinity.quantumComputingProduction = 0d;
            infinity.pocketDimensionsWithoutAnythingElseProduction = 0d;
            infinity.pocketProtectorsProduction = 0d;
            infinity.pocketMultiverseProduction = 0d;
            infinity.totalPlanetProduction = 0d;
            infinity.scientificPlanetsProduction = 0d;
            infinity.stellarSacrificesProduction = 0d;
            infinity.rudimentrySingularityProduction = 0d;
            infinity.planetAssemblyProduction = 0d;
            infinity.shellWorldsProduction = 0d;
        }

        private static void RepairDiscreteResearchLevels(
            Oracle.DysonVerseInfinityData infinity,
            NumericSaveRepairResult result)
        {
            if (infinity.researchLevelsById == null) return;
            var keys = new List<string>(infinity.researchLevelsById.Keys);
            foreach (string key in keys)
            {
                double value = infinity.researchLevelsById[key];
                if (!NumericSafety.IsFinite(value) || value < 0d) continue;
                double floored = Math.Floor(value);
                if (value == floored) continue;
                infinity.researchLevelsById[key] = floored;
                result.Add(
                    $"saveSettings.dysonVerseSaveData.dysonVerseInfinityData.researchLevelsById[{key}]",
                    value,
                    floored,
                    "fractional_discrete_level_floor");
            }
        }

        private static void RepairBots(
            Oracle.SaveDataSettings settings,
            Oracle.DysonVerseInfinityData infinity,
            NumericSaveRepairResult result)
        {
            double bots = infinity.bots;
            if (bots == double.MaxValue)
            {
                if (!settings.botCapTransitionPending && !settings.botCapRewardsGranted)
                {
                    settings.botCapTransitionPending = true;
                }

                if (settings.botCapRewardsGranted)
                {
                    // A successful reward checkpoint must resume the reset after reload.
                    settings.botCapTransitionPending = false;
                    settings.infinityInProgress = true;
                    if (settings.hasPackedSettingsFlags)
                        settings.packedSettingsFlags |= 1UL << 6;
                }
                else
                {
                    // Pending means rewards have not been committed. Retry from the
                    // pre-reward state rather than inheriting an unrelated stale guard.
                    settings.infinityInProgress = false;
                    if (settings.hasPackedSettingsFlags)
                        settings.packedSettingsFlags &= ~(1UL << 6);
                }
                return;
            }

            if (!NumericSafety.IsFinite(bots) || bots < 0d)
            {
                infinity.bots = 0d;
                settings.botCapTransitionPending = false;
                settings.botCapRewardsGranted = false;
                settings.infinityInProgress = false;
                if (settings.hasPackedSettingsFlags)
                    settings.packedSettingsFlags &= ~(1UL << 6);
                result.Add(
                    "saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots",
                    bots,
                    0d,
                    "invalid_bot_progress_to_zero_no_reward");
            }
        }

        private static void RepairTimeBanks(Oracle.SaveDataSettings settings, NumericSaveRepairResult result)
        {
            ClampTimeBank(settings, nameof(settings.offlineTime), ref settings.offlineTime, result);
            if (settings.sdPrestige != null)
            {
                int originalRate = settings.sdPrestige.doubleTimeRate;
                settings.sdPrestige.doubleTimeRate = Mathf.Clamp(originalRate, 0, 10);
                if (settings.sdPrestige.doubleTimeRate != originalRate)
                {
                    result.Add(
                        "saveSettings.sdPrestige.doubleTimeRate",
                        originalRate,
                        settings.sdPrestige.doubleTimeRate,
                        "double_time_rate_0_to_10");
                }

                double value = settings.sdPrestige.doubleTime;
                if (value > NumericSafety.StoredTimeMaximumSeconds)
                {
                    settings.sdPrestige.doubleTime = NumericSafety.StoredTimeMaximumSeconds;
                    settings.cheater = true;
                    result.Add(
                        "saveSettings.sdPrestige.doubleTime",
                        value,
                        settings.sdPrestige.doubleTime,
                        "stored_time_cap_and_comparison_flag");
                }
            }

            if (!NumericSafety.IsFinite(settings.maxOfflineTime) ||
                settings.maxOfflineTime <= 0d)
            {
                double original = settings.maxOfflineTime;
                settings.maxOfflineTime = DefaultOfflineCapacitySeconds;
                result.Add(
                    "saveSettings.maxOfflineTime",
                    original,
                    settings.maxOfflineTime,
                    "invalid_structure_to_authored_default");
            }
            else if (settings.maxOfflineTime > NumericSafety.StoredTimeMaximumSeconds)
            {
                double original = settings.maxOfflineTime;
                settings.maxOfflineTime = NumericSafety.StoredTimeMaximumSeconds;
                settings.cheater = true;
                result.Add(
                    "saveSettings.maxOfflineTime",
                    original,
                    settings.maxOfflineTime,
                    "stored_time_capacity_cap_and_comparison_flag");
            }
            else if (!settings.cheater &&
                     settings.maxOfflineTime <
                     DefaultOfflineCapacitySeconds)
            {
                double original = settings.maxOfflineTime;
                settings.maxOfflineTime =
                    DefaultOfflineCapacitySeconds;
                result.Add(
                    "saveSettings.maxOfflineTime",
                    original,
                    settings.maxOfflineTime,
                    "minimum_authored_offline_capacity");
            }
        }

        private static void RepairAuthoredDiscreteBounds(
            Oracle.SaveDataSettings settings,
            NumericSaveRepairResult result)
        {
            ClampInt(
                ref settings.dysonAutomationTargetIndex,
                0,
                7,
                "saveSettings.dysonAutomationTargetIndex",
                result);
            // Research definitions can change between versions. Negative
            // phases are never meaningful; upper normalization happens
            // against the current authored presenter/definition count.
            ClampInt(
                ref settings.researchAutomationTargetIndex,
                0,
                int.MaxValue,
                "saveSettings.researchAutomationTargetIndex",
                result);

            Oracle.DysonVerseSaveData dyson = settings.dysonVerseSaveData;
            if (dyson != null)
            {
                ClampNormalized(
                    ref dyson.botDistPreset1,
                    "saveSettings.dysonVerseSaveData.botDistPreset1",
                    result);
                ClampNormalized(
                    ref dyson.botDistPreset2,
                    "saveSettings.dysonVerseSaveData.botDistPreset2",
                    result);
                ClampNormalized(
                    ref dyson.botDistPreset3,
                    "saveSettings.dysonVerseSaveData.botDistPreset3",
                    result);
                ClampNormalized(
                    ref dyson.botDistPreset4,
                    "saveSettings.dysonVerseSaveData.botDistPreset4",
                    result);
                ClampNormalized(
                    ref dyson.botDistPreset5,
                    "saveSettings.dysonVerseSaveData.botDistPreset5",
                    result);
            }

            if (settings.prestigePlus != null)
            {
                ClampLong(
                    ref settings.prestigePlus.divisionsPurchased,
                    0L,
                    19L,
                    "saveSettings.prestigePlus.divisionsPurchased",
                    result);
                ClampLong(
                    ref settings.prestigePlus.secrets,
                    0L,
                    IdleDysonSwarm.Systems.Constants.QuantumConstants.MaxSecrets,
                    "saveSettings.prestigePlus.secrets",
                    result);
            }

            Oracle.DysonVersePrestigeData prestige =
                settings.dysonVerseSaveData?.dysonVersePrestigeData;
            if (prestige == null) return;
            ClampNormalized(
                ref prestige.botDistribution,
                "saveSettings.dysonVerseSaveData.dysonVersePrestigeData.botDistribution",
                result);
            ClampLong(
                ref prestige.secretsOfTheUniverse,
                0L,
                IdleDysonSwarm.Systems.Constants.QuantumConstants.MaxSecrets,
                "saveSettings.dysonVerseSaveData.dysonVersePrestigeData.secretsOfTheUniverse",
                result);
            ClampLong(
                ref prestige.permanentSkillPoint,
                0L,
                10L,
                "saveSettings.dysonVerseSaveData.dysonVersePrestigeData.permanentSkillPoint",
                result);
        }

        private static void RepairRealityProgress(
            Oracle.SaveDataSettings settings,
            NumericSaveRepairResult result)
        {
            Oracle.SaveData reality = settings.saveData;
            if (reality == null) return;
            double original = reality.workerGenerationProgress;
            double repaired = NumericSafety.IsFinite(original) &&
                              original >= 0d
                ? original % 1d
                : 0d;
            if (original.Equals(repaired)) return;
            reality.workerGenerationProgress = repaired;
            result.Add(
                "saveSettings.saveData.workerGenerationProgress",
                original,
                repaired,
                "fractional_reality_progress_0_to_1");
        }

        private static void RepairRailgunState(
            Oracle.SaveDataSettings settings,
            NumericSaveRepairResult result)
        {
            Oracle.SaveDataDream1 dream = settings.sdSimulation;
            if (dream == null) return;

            int originalShots = dream.railgunShotsRemaining;
            dream.railgunShotsRemaining = Math.Max(
                0,
                Math.Min(10, dream.railgunShotsRemaining));
            if (dream.railgunShotsRemaining != originalShots)
            {
                result.Add(
                    "saveSettings.sdSimulation.railgunShotsRemaining",
                    originalShots,
                    dream.railgunShotsRemaining,
                    "railgun_shots_0_to_10");
            }

            if (dream.railgunFiring)
            {
                if (dream.railgunShotsRemaining <= 0)
                {
                    dream.railgunShotsRemaining = 10;
                    result.Add(
                        "saveSettings.sdSimulation.railgunShotsRemaining",
                        originalShots,
                        dream.railgunShotsRemaining,
                        "legacy_firing_volley_restore");
                }
                return;
            }

            if (dream.railgunFireProgress <= 0d) return;
            if (dream.railgunCharge > 0d &&
                dream.dysonPanels > 0L)
            {
                dream.railgunFiring = true;
                if (dream.railgunShotsRemaining <= 0)
                    dream.railgunShotsRemaining = 10;
                result.Add(
                    "saveSettings.sdSimulation.railgunFiring",
                    false,
                    true,
                    "legacy_mid_volley_resume");
                return;
            }

            double originalProgress =
                dream.railgunFireProgress;
            dream.railgunFireProgress = 0d;
            dream.railgunShotsRemaining = 0;
            result.Add(
                "saveSettings.sdSimulation.railgunFireProgress",
                originalProgress,
                0d,
                "orphaned_railgun_progress_clear");
        }

        private static void ClampLong(
            ref long value,
            long minimum,
            long maximum,
            string path,
            NumericSaveRepairResult result)
        {
            long replacement = Math.Max(minimum, Math.Min(maximum, value));
            if (replacement == value) return;
            long original = value;
            value = replacement;
            result.Add(path, original, replacement, "authored_discrete_bounds");
        }

        private static void ClampInt(
            ref int value,
            int minimum,
            int maximum,
            string path,
            NumericSaveRepairResult result)
        {
            int replacement = Math.Max(minimum, Math.Min(maximum, value));
            if (replacement == value) return;
            int original = value;
            value = replacement;
            result.Add(path, original, replacement, "authored_discrete_bounds");
        }

        private static void ClampNormalized(
            ref double value,
            string path,
            NumericSaveRepairResult result)
        {
            double replacement = Math.Max(0d, Math.Min(1d, value));
            if (replacement == value) return;
            double original = value;
            value = replacement;
            result.Add(path, original, replacement, "authored_normalized_range");
        }

        private static void ClampTimeBank(
            Oracle.SaveDataSettings settings,
            string fieldName,
            ref double value,
            NumericSaveRepairResult result)
        {
            if (!double.IsPositiveInfinity(value) &&
                (!NumericSafety.IsFinite(value) ||
                 value <= NumericSafety.StoredTimeMaximumSeconds))
            {
                return;
            }
            double original = value;
            value = NumericSafety.StoredTimeMaximumSeconds;
            settings.cheater = true;
            result.Add(
                $"saveSettings.{fieldName}",
                original,
                value,
                "stored_time_cap_and_comparison_flag");
        }

        private static void RepairGraph(
            object value,
            object defaultValue,
            string path,
            HashSet<object> visited,
            NumericSaveRepairResult result)
        {
            if (value == null || value is string || value is UnityEngine.Object) return;

            Type type = value.GetType();
            if (type.IsPrimitive || type.IsEnum || type == typeof(decimal)) return;
            if (!type.IsValueType && !visited.Add(value)) return;

            if (value is Array array)
            {
                for (int i = 0; i < array.Length; i++)
                {
                    object item = array.GetValue(i);
                    object defaultItem = defaultValue is Array defaultArray && i < defaultArray.Length
                        ? defaultArray.GetValue(i)
                        : null;
                    if (TryRepairScalar(item, defaultItem, path, $"[{i}]", out object repaired, out string rule))
                    {
                        array.SetValue(repaired, i);
                        result.Add($"{path}[{i}]", item, repaired, rule);
                    }
                    else
                    {
                        RepairGraph(item, defaultItem, $"{path}[{i}]", visited, result);
                    }
                }
                return;
            }

            if (value is IDictionary dictionary)
            {
                var keys = new List<object>();
                foreach (DictionaryEntry entry in dictionary) keys.Add(entry.Key);
                foreach (object key in keys)
                {
                    object item = dictionary[key];
                    if (TryRepairScalar(item, null, path, $"[{key}]", out object repaired, out string rule))
                    {
                        dictionary[key] = repaired;
                        result.Add($"{path}[{key}]", item, repaired, rule);
                    }
                    else
                    {
                        RepairGraph(item, null, $"{path}[{key}]", visited, result);
                    }
                }
                return;
            }

            if (value is IList list)
            {
                for (int i = 0; i < list.Count; i++)
                {
                    object item = list[i];
                    if (TryRepairScalar(item, null, path, $"[{i}]", out object repaired, out string rule))
                    {
                        list[i] = repaired;
                        result.Add($"{path}[{i}]", item, repaired, rule);
                    }
                    else
                    {
                        RepairGraph(item, null, $"{path}[{i}]", visited, result);
                    }
                }
                return;
            }

            foreach (FieldInfo field in type.GetFields(BindingFlags.Instance | BindingFlags.Public))
            {
                if (field.IsStatic || field.IsNotSerialized) continue;
                object fieldValue = field.GetValue(value);
                object fieldDefault = defaultValue != null && defaultValue.GetType() == type
                    ? field.GetValue(defaultValue)
                    : null;
                string fieldPath = $"{path}.{field.Name}";
                if (fieldPath.EndsWith(".dysonVerseInfinityData.bots", StringComparison.Ordinal)) continue;

                if (TryRepairScalar(fieldValue, fieldDefault, fieldPath, field.Name, out object repaired, out string rule))
                {
                    field.SetValue(value, repaired);
                    result.Add(fieldPath, fieldValue, repaired, rule);
                }
                else
                {
                    RepairGraph(fieldValue, fieldDefault, fieldPath, visited, result);
                }
            }
        }

        private static bool TryRepairScalar(
            object value,
            object defaultValue,
            string path,
            string fieldName,
            out object repaired,
            out string rule)
        {
            repaired = value;
            rule = null;
            bool structural = IsStructural(fieldName);

            if (value is double number)
            {
                double authoredDefault = defaultValue is double defaultDouble ? defaultDouble : 0d;
                if (double.IsPositiveInfinity(number))
                {
                    repaired = structural && authoredDefault > 0d ? authoredDefault : double.MaxValue;
                    rule = structural && authoredDefault > 0d
                        ? "invalid_structure_to_authored_default"
                        : "positive_infinity_to_finite_cap";
                    return true;
                }

                if (!NumericSafety.IsFinite(number) || number < 0d)
                {
                    repaired = structural && authoredDefault > 0d ? authoredDefault : 0d;
                    rule = structural && authoredDefault > 0d
                        ? "invalid_structure_to_authored_default"
                        : "invalid_progress_to_zero";
                    return true;
                }

                if (structural && authoredDefault > 0d && number == 0d)
                {
                    repaired = authoredDefault;
                    rule = "invalid_structure_to_authored_default";
                    return true;
                }
            }
            else if (value is float single)
            {
                float authoredDefault = defaultValue is float defaultSingle ? defaultSingle : 0f;
                if (float.IsPositiveInfinity(single))
                {
                    repaired = structural && authoredDefault > 0f ? authoredDefault : float.MaxValue;
                    rule = structural && authoredDefault > 0f
                        ? "invalid_structure_to_authored_default"
                        : "positive_infinity_to_finite_cap";
                    return true;
                }

                if (float.IsNaN(single) || float.IsNegativeInfinity(single) || single < 0f)
                {
                    repaired = structural && authoredDefault > 0f ? authoredDefault : 0f;
                    rule = structural && authoredDefault > 0f
                        ? "invalid_structure_to_authored_default"
                        : "invalid_progress_to_zero";
                    return true;
                }
            }
            else if (value is long longValue)
            {
                long authoredDefault = defaultValue is long defaultLong ? defaultLong : 0L;
                if (longValue < 0L || (structural && authoredDefault > 0L && longValue == 0L))
                {
                    repaired = structural && authoredDefault > 0L ? authoredDefault : 0L;
                    rule = structural && authoredDefault > 0L
                        ? "invalid_structure_to_authored_default"
                        : "negative_discrete_progress_to_zero";
                    return true;
                }
            }
            else if (value is int intValue && intValue < 0)
            {
                int authoredDefault = defaultValue is int defaultInt ? defaultInt : 0;
                repaired = structural && authoredDefault > 0 ? authoredDefault : 0;
                rule = structural && authoredDefault > 0
                    ? "invalid_structure_to_authored_default"
                    : "negative_bounded_value_to_zero";
                return true;
            }

            return false;
        }

        private static bool IsStructural(string fieldName)
        {
            return fieldName.IndexOf("Modifier", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   fieldName.IndexOf("Multi", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   fieldName.IndexOf("Percent", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   fieldName.IndexOf("Duration", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   fieldName.IndexOf("ResearchTime", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   fieldName.EndsWith("Cost", StringComparison.OrdinalIgnoreCase) ||
                   fieldName.IndexOf("MaxCharge", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   fieldName.IndexOf("Lifetime", StringComparison.OrdinalIgnoreCase) >= 0 ||
                   fieldName.IndexOf("Generation", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private sealed class ReferenceComparer : IEqualityComparer<object>
        {
            internal static readonly ReferenceComparer Instance = new ReferenceComparer();
            public new bool Equals(object left, object right) => ReferenceEquals(left, right);
            public int GetHashCode(object value) =>
                System.Runtime.CompilerServices.RuntimeHelpers.GetHashCode(value);
        }
    }
}
