using System.Collections.Generic;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Balance;
using NUnit.Framework;
using UnityEngine;

namespace Tests.Balance
{
    /// <summary>
    /// Edit mode tests for balance validation and fallback catalog integrity.
    /// </summary>
    [TestFixture]
    public class BalanceDataValidatorTests
    {
        [Test]
        public void DefaultsCatalog_HasUniqueKeys()
        {
            IReadOnlyList<SimulationUpgradeSpec> specs = SimulationUpgradeDefaultsCatalog.All;
            var keys = new HashSet<string>();

            for (int i = 0; i < specs.Count; i++)
            {
                SimulationUpgradeSpec spec = specs[i];
                Assert.IsNotNull(spec, $"Spec at index {i} should not be null.");
                Assert.IsFalse(string.IsNullOrWhiteSpace(spec.Key), $"Spec at index {i} has empty key.");
                Assert.IsTrue(keys.Add(spec.Key), $"Duplicate key found: {spec.Key}");
                Assert.Greater(spec.Cost, 0, $"Cost should be positive for {spec.Key}");
            }
        }

        [Test]
        public void Validate_ReportsMissingFacilityPrerequisite()
        {
            BalanceToolRegistry registry = ScriptableObject.CreateInstance<BalanceToolRegistry>();
            registry.facilityBalanceProfile = ScriptableObject.CreateInstance<FacilityBalanceProfile>();
            registry.simulationUpgradeDatabase = ScriptableObject.CreateInstance<SimulationUpgradeDatabase>();

            registry.facilityBalanceProfile.ReplaceEntries(new List<FacilityBalanceProfile.FacilityBalanceEntry>
            {
                new FacilityBalanceProfile.FacilityBalanceEntry
                {
                    facilityId = "assembly_lines",
                    displayOrder = 10,
                    countFieldName = "assemblyLines",
                    modifierFieldName = "assemblyLineModifier",
                    modifierKind = FacilityModifierKind.AssemblyLines,
                    prerequisiteFacilityId = "missing_facility",
                    prerequisiteOwned = 1
                }
            });

            registry.simulationUpgradeDatabase.ReplaceUpgrades(new List<SimulationUpgradeDefinition>
            {
                CreateUpgrade("counterMeteor")
            });

            BalanceValidationReport report = BalanceDataValidator.Validate(registry);
            Assert.IsTrue(ContainsCode(report, "facility.prereq.missing"));
            Object.DestroyImmediate(registry);
        }

        [Test]
        public void Validate_DetectsUpgradeCycles()
        {
            BalanceToolRegistry registry = ScriptableObject.CreateInstance<BalanceToolRegistry>();
            registry.facilityBalanceProfile = ScriptableObject.CreateInstance<FacilityBalanceProfile>();
            registry.simulationUpgradeDatabase = ScriptableObject.CreateInstance<SimulationUpgradeDatabase>();

            registry.facilityBalanceProfile.ReplaceEntries(new List<FacilityBalanceProfile.FacilityBalanceEntry>
            {
                new FacilityBalanceProfile.FacilityBalanceEntry
                {
                    facilityId = "assembly_lines",
                    displayOrder = 10,
                    countFieldName = "assemblyLines",
                    modifierFieldName = "assemblyLineModifier",
                    modifierKind = FacilityModifierKind.AssemblyLines
                }
            });

            SimulationUpgradeDefinition a = CreateUpgrade("A", "B");
            SimulationUpgradeDefinition b = CreateUpgrade("B", "A");
            registry.simulationUpgradeDatabase.ReplaceUpgrades(new List<SimulationUpgradeDefinition> { a, b });

            BalanceValidationReport report = BalanceDataValidator.Validate(registry);
            Assert.IsTrue(ContainsCode(report, "upgrade.prereq.cycle"));
            Object.DestroyImmediate(registry);
        }

        private static bool ContainsCode(BalanceValidationReport report, string code)
        {
            if (report == null || report.issues == null)
            {
                return false;
            }

            for (int i = 0; i < report.issues.Count; i++)
            {
                BalanceValidationIssue issue = report.issues[i];
                if (issue != null && issue.code == code)
                {
                    return true;
                }
            }

            return false;
        }

        private static SimulationUpgradeDefinition CreateUpgrade(string key, params string[] prerequisites)
        {
            SimulationUpgradeDefinition definition = ScriptableObject.CreateInstance<SimulationUpgradeDefinition>();
            definition.key = key;
            definition.cost = 1;
            definition.prerequisites = new List<SimulationUpgradePrerequisite>();
            definition.purchaseEffects = new List<SimulationUpgradeEffect>
            {
                new SimulationUpgradeEffect
                {
                    effectType = SimulationUpgradeEffectType.SetPrestigeFlag,
                    targetKey = key,
                    boolValue = true
                }
            };

            for (int i = 0; i < prerequisites.Length; i++)
            {
                definition.prerequisites.Add(new SimulationUpgradePrerequisite
                {
                    key = prerequisites[i],
                    mustBeOwned = true
                });
            }

            return definition;
        }
    }
}
