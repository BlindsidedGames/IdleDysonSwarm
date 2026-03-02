using System;
using System.Collections.Generic;
using System.Reflection;
using IdleDysonSwarm.Data.Balance;
using static Expansion.Oracle;

/*
 * BalanceDataValidator
 * Purpose: Validates facility profile and simulation/reality upgrade graph integrity.
 * Runs: Runtime + Editor.
 * Primary entry points: Validate().
 * Owns vs delegates: Owns structural validation rules; delegates field/key mutation checks to SimulationUpgradeStateAccessor.
 *
 * Interacts with:
 * - Assets/Scripts/Data/Balance/FacilityBalanceProfile.cs
 * - Assets/Scripts/Data/Balance/SimulationUpgradeDatabase.cs
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeStateAccessor.cs
 * - Assets/Editor/Balance/BalanceTuningWindow.cs
 *
 * Change notes:
 * - Validation is conservative and reports warnings for recoverable issues.
 * - Cycle detection treats prerequisite edges as hard dependencies.
 */
namespace IdleDysonSwarm.Systems.Balance
{
    /// <summary>
    /// Validation helper for balance profile/catalog assets.
    /// </summary>
    public static class BalanceDataValidator
    {
        /// <summary>
        /// Runs validation against the supplied registry and known fallback defaults.
        /// </summary>
        /// <param name="registry">Balance registry to validate.</param>
        /// <returns>Validation report.</returns>
        public static BalanceValidationReport Validate(BalanceToolRegistry registry)
        {
            var report = new BalanceValidationReport
            {
                title = registry != null && !string.IsNullOrWhiteSpace(registry.diagnosticsReportTitle)
                    ? registry.diagnosticsReportTitle
                    : "Balance Validation"
            };

            ValidateFacilityProfile(registry != null ? registry.facilityBalanceProfile : null, report);
            ValidateUpgradeCatalog(registry != null ? registry.simulationUpgradeDatabase : null, report);

            if (report.issues.Count == 0)
            {
                report.AddInfo("balance.ok", "No validation issues found.");
            }

            return report;
        }

        private static void ValidateFacilityProfile(FacilityBalanceProfile profile, BalanceValidationReport report)
        {
            if (profile == null)
            {
                report.AddWarning("facility.profile.missing", "FacilityBalanceProfile is not assigned.");
                return;
            }

            IReadOnlyList<FacilityBalanceProfile.FacilityBalanceEntry> entries = profile.GetOrderedEntries();
            var seenIds = new HashSet<string>(StringComparer.Ordinal);
            var seenOrders = new Dictionary<int, string>();

            for (int i = 0; i < entries.Count; i++)
            {
                FacilityBalanceProfile.FacilityBalanceEntry entry = entries[i];
                if (entry == null || string.IsNullOrWhiteSpace(entry.facilityId))
                {
                    report.AddError("facility.entry.invalid", "Facility entry is null or missing facilityId.", $"index:{i}");
                    continue;
                }

                if (!seenIds.Add(entry.facilityId))
                {
                    report.AddError("facility.id.duplicate", "Duplicate facilityId in profile.", entry.facilityId);
                }

                if (seenOrders.TryGetValue(entry.displayOrder, out string existingId))
                {
                    report.AddWarning("facility.order.duplicate",
                        $"Display order {entry.displayOrder} is shared by '{existingId}' and '{entry.facilityId}'.", entry.facilityId);
                }
                else
                {
                    seenOrders.Add(entry.displayOrder, entry.facilityId);
                }

                if (!string.IsNullOrWhiteSpace(entry.prerequisiteFacilityId) &&
                    !string.Equals(entry.prerequisiteFacilityId, entry.facilityId, StringComparison.Ordinal) &&
                    !ContainsFacility(entries, entry.prerequisiteFacilityId))
                {
                    report.AddError("facility.prereq.missing",
                        $"Prerequisite facility '{entry.prerequisiteFacilityId}' is not present in profile.", entry.facilityId);
                }

                ValidateInfinityField(entry.countFieldName, typeof(double[]), "facility.countField", entry.facilityId, report);
                if (!string.IsNullOrWhiteSpace(entry.modifierFieldName))
                {
                    ValidateInfinityNumericField(entry.modifierFieldName, "facility.modifierField", entry.facilityId, report);
                }

                if (entry.group == FacilityGroup.Mega && entry.quantumGate == QuantumMegaUnlockGate.None)
                {
                    report.AddWarning("facility.mega.gate",
                        "Mega facility has no quantum gate requirement configured.", entry.facilityId);
                }
            }
        }

        private static void ValidateUpgradeCatalog(SimulationUpgradeDatabase database, BalanceValidationReport report)
        {
            List<UpgradeNode> nodes = BuildUpgradeNodes(database, report);
            if (nodes.Count == 0)
            {
                report.AddWarning("upgrade.catalog.empty", "No upgrade definitions available.");
                return;
            }

            var byKey = new Dictionary<string, UpgradeNode>(StringComparer.Ordinal);
            for (int i = 0; i < nodes.Count; i++)
            {
                UpgradeNode node = nodes[i];
                if (string.IsNullOrWhiteSpace(node.Key))
                {
                    report.AddError("upgrade.key.empty", "Upgrade key is missing.", $"index:{i}");
                    continue;
                }

                if (byKey.ContainsKey(node.Key))
                {
                    report.AddError("upgrade.key.duplicate", "Duplicate upgrade key.", node.Key);
                    continue;
                }

                byKey.Add(node.Key, node);
            }

            for (int i = 0; i < nodes.Count; i++)
            {
                UpgradeNode node = nodes[i];
                for (int j = 0; j < node.Prerequisites.Count; j++)
                {
                    string prerequisite = node.Prerequisites[j];
                    if (!byKey.ContainsKey(prerequisite))
                    {
                        report.AddError("upgrade.prereq.missing",
                            $"Prerequisite '{prerequisite}' is missing from catalog.", node.Key);
                    }
                }
            }

            ValidateUpgradeCycles(byKey, report);
            ValidateEffectMappings(nodes, report);
        }

        private static void ValidateUpgradeCycles(
            IReadOnlyDictionary<string, UpgradeNode> byKey,
            BalanceValidationReport report)
        {
            var visiting = new HashSet<string>(StringComparer.Ordinal);
            var visited = new HashSet<string>(StringComparer.Ordinal);

            foreach (KeyValuePair<string, UpgradeNode> pair in byKey)
            {
                if (!visited.Contains(pair.Key))
                {
                    Visit(pair.Key, byKey, visiting, visited, report);
                }
            }
        }

        private static void Visit(
            string key,
            IReadOnlyDictionary<string, UpgradeNode> byKey,
            HashSet<string> visiting,
            HashSet<string> visited,
            BalanceValidationReport report)
        {
            if (visited.Contains(key))
            {
                return;
            }

            if (!visiting.Add(key))
            {
                report.AddError("upgrade.prereq.cycle", "Detected prerequisite cycle.", key);
                return;
            }

            if (byKey.TryGetValue(key, out UpgradeNode node))
            {
                for (int i = 0; i < node.Prerequisites.Count; i++)
                {
                    string prerequisite = node.Prerequisites[i];
                    if (byKey.ContainsKey(prerequisite))
                    {
                        Visit(prerequisite, byKey, visiting, visited, report);
                    }
                }
            }

            visiting.Remove(key);
            visited.Add(key);
        }

        private static void ValidateEffectMappings(IReadOnlyList<UpgradeNode> nodes, BalanceValidationReport report)
        {
            var prestige = new SaveDataPrestige();
            var save = new SaveData();
            var dream1 = new SaveDataDream1();

            for (int i = 0; i < nodes.Count; i++)
            {
                UpgradeNode node = nodes[i];
                for (int j = 0; j < node.Effects.Count; j++)
                {
                    SimulationUpgradeEffect effect = node.Effects[j];
                    if (effect == null)
                    {
                        continue;
                    }

                    if (!ValidateEffectTarget(node.Key, effect, prestige, save, dream1))
                    {
                        report.AddWarning("upgrade.effect.unmapped",
                            $"Effect target '{effect.targetKey}' did not map to an existing field.",
                            $"{node.Key}:{effect.effectType}");
                    }
                }
            }
        }

        private static bool ValidateEffectTarget(
            string key,
            SimulationUpgradeEffect effect,
            SaveDataPrestige prestige,
            SaveData save,
            SaveDataDream1 dream1)
        {
            switch (effect.effectType)
            {
                case SimulationUpgradeEffectType.SetPrestigeFlag:
                case SimulationUpgradeEffectType.SetSaveFlag:
                    return SimulationUpgradeStateAccessor.SetOwned(effect.targetKey, true, prestige, save);
                case SimulationUpgradeEffectType.SetDream1Flag:
                    return SimulationUpgradeStateAccessor.TrySetDream1Flag(effect.targetKey, true, dream1);
                case SimulationUpgradeEffectType.SetDream1Value:
                    return SimulationUpgradeStateAccessor.TrySetDream1Numeric(effect.targetKey, effect.numericValue, dream1);
                case SimulationUpgradeEffectType.SetSaveValue:
                    return SimulationUpgradeStateAccessor.TrySetSaveNumeric(effect.targetKey, effect.numericValue, save);
                case SimulationUpgradeEffectType.MaxDream1Value:
                    return SimulationUpgradeStateAccessor.TryMaxDream1Numeric(effect.targetKey, effect.numericValue, dream1);
                case SimulationUpgradeEffectType.MaxSaveValue:
                    return SimulationUpgradeStateAccessor.TryMaxSaveNumeric(effect.targetKey, effect.numericValue, save);
                case SimulationUpgradeEffectType.SetPrestigeValue:
                    return SimulationUpgradeStateAccessor.TrySetPrestigeNumeric(effect.targetKey, effect.numericValue, prestige);
                case SimulationUpgradeEffectType.AddSkillPoints:
                    return true;
                default:
                    return false;
            }
        }

        private static List<UpgradeNode> BuildUpgradeNodes(SimulationUpgradeDatabase database, BalanceValidationReport report)
        {
            var nodes = new List<UpgradeNode>();

            if (database != null)
            {
                IReadOnlyList<SimulationUpgradeDefinition> definitions = database.GetAll();
                if (definitions != null && definitions.Count > 0)
                {
                    for (int i = 0; i < definitions.Count; i++)
                    {
                        SimulationUpgradeDefinition definition = definitions[i];
                        if (definition == null)
                        {
                            continue;
                        }

                        nodes.Add(new UpgradeNode(definition.key, definition.prerequisites, definition.purchaseEffects));
                    }

                    return nodes;
                }
            }

            IReadOnlyList<SimulationUpgradeSpec> fallback = SimulationUpgradeDefaultsCatalog.All;
            for (int i = 0; i < fallback.Count; i++)
            {
                SimulationUpgradeSpec spec = fallback[i];
                if (spec == null)
                {
                    continue;
                }

                nodes.Add(new UpgradeNode(spec.Key, spec.Prerequisites, spec.Effects));
            }

            report.AddInfo("upgrade.catalog.fallback", "Upgrade validation used fallback catalog data.");
            return nodes;
        }

        private static bool ContainsFacility(IReadOnlyList<FacilityBalanceProfile.FacilityBalanceEntry> entries, string facilityId)
        {
            for (int i = 0; i < entries.Count; i++)
            {
                FacilityBalanceProfile.FacilityBalanceEntry entry = entries[i];
                if (entry != null && string.Equals(entry.facilityId, facilityId, StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }

        private static void ValidateInfinityField(
            string fieldName,
            Type expectedType,
            string codePrefix,
            string context,
            BalanceValidationReport report)
        {
            if (string.IsNullOrWhiteSpace(fieldName))
            {
                report.AddError($"{codePrefix}.missing", "Field name is missing.", context);
                return;
            }

            FieldInfo field = typeof(DysonVerseInfinityData).GetField(fieldName, BindingFlags.Public | BindingFlags.Instance);
            if (field == null)
            {
                report.AddError($"{codePrefix}.missingField", $"Field '{fieldName}' does not exist on DysonVerseInfinityData.", context);
                return;
            }

            if (field.FieldType != expectedType)
            {
                report.AddError($"{codePrefix}.type",
                    $"Field '{fieldName}' has type '{field.FieldType.Name}', expected '{expectedType.Name}'.", context);
            }
        }

        private static void ValidateInfinityNumericField(
            string fieldName,
            string codePrefix,
            string context,
            BalanceValidationReport report)
        {
            if (string.IsNullOrWhiteSpace(fieldName))
            {
                report.AddWarning($"{codePrefix}.missing", "Modifier field name is missing.", context);
                return;
            }

            FieldInfo field = typeof(DysonVerseInfinityData).GetField(fieldName, BindingFlags.Public | BindingFlags.Instance);
            if (field == null)
            {
                report.AddError($"{codePrefix}.missingField", $"Field '{fieldName}' does not exist on DysonVerseInfinityData.", context);
                return;
            }

            Type type = field.FieldType;
            bool isNumeric = type == typeof(double) || type == typeof(float) || type == typeof(int) || type == typeof(long);
            if (!isNumeric)
            {
                report.AddError($"{codePrefix}.type",
                    $"Field '{fieldName}' has unsupported type '{type.Name}'.", context);
            }
        }

        private readonly struct UpgradeNode
        {
            public UpgradeNode(
                string key,
                IReadOnlyList<SimulationUpgradePrerequisite> prerequisites,
                IReadOnlyList<SimulationUpgradeEffect> effects)
            {
                Key = key;
                Prerequisites = ExtractPrerequisites(prerequisites);
                Effects = effects ?? Array.Empty<SimulationUpgradeEffect>();
            }

            public string Key { get; }
            public IReadOnlyList<string> Prerequisites { get; }
            public IReadOnlyList<SimulationUpgradeEffect> Effects { get; }

            private static IReadOnlyList<string> ExtractPrerequisites(IReadOnlyList<SimulationUpgradePrerequisite> prerequisites)
            {
                if (prerequisites == null || prerequisites.Count == 0)
                {
                    return Array.Empty<string>();
                }

                var keys = new List<string>(prerequisites.Count);
                for (int i = 0; i < prerequisites.Count; i++)
                {
                    SimulationUpgradePrerequisite prerequisite = prerequisites[i];
                    if (prerequisite == null || string.IsNullOrWhiteSpace(prerequisite.key))
                    {
                        continue;
                    }

                    keys.Add(prerequisite.key);
                }

                return keys;
            }
        }
    }
}
