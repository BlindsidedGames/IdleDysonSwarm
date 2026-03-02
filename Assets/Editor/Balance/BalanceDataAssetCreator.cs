using System.Collections.Generic;
using GameData;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Balance;
using UnityEditor;
using UnityEngine;

/*
 * BalanceDataAssetCreator
 * Purpose: Creates and seeds ScriptableObject assets required by the balance tuning workflow.
 * Runs: Unity Editor only.
 * Primary entry points: CreateOrRefreshBalanceAssets() menu action.
 * Owns vs delegates: Owns asset creation + default seeding; delegates runtime consumption to BalanceRuntime.
 *
 * Interacts with:
 * - Assets/Scripts/Data/Balance/*.cs assets
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeDefaultsCatalog.cs (fallback seeds)
 * - Assets/Editor/Balance/BalanceTuningWindow.cs
 *
 * Change notes:
 * - Registry asset must stay at Resources path Balance/BalanceToolRegistry for runtime loading.
 */
public static class BalanceDataAssetCreator
{
    private const string DataRoot = "Assets/Data";
    private const string BalanceFolder = "Assets/Data/Balance";
    private const string UpgradeFolder = "Assets/Data/Balance/Upgrades";
    private const string ResourcesFolder = "Assets/Resources";
    private const string ResourcesBalanceFolder = "Assets/Resources/Balance";
    private const string FacilityDatabasePath = "Assets/Data/Databases/FacilityDatabase.asset";
    private const string FacilityProfilePath = "Assets/Data/Balance/FacilityBalanceProfile.asset";
    private const string UpgradeDatabasePath = "Assets/Data/Balance/SimulationUpgradeDatabase.asset";
    private const string RealityTuningPath = "Assets/Data/Balance/RealitySystemTuning.asset";
    private const string RegistryPath = "Assets/Resources/Balance/BalanceToolRegistry.asset";

    /// <summary>
    /// Creates or refreshes all balance tooling assets.
    /// </summary>
    [MenuItem(IdleDysonEditorMenu.DataCreate + "Balance Tool Assets")]
    public static void CreateOrRefreshBalanceAssets()
    {
        EnsureFolder("Assets", "Data");
        EnsureFolder(DataRoot, "Balance");
        EnsureFolder(BalanceFolder, "Upgrades");
        EnsureFolder("Assets", "Resources");
        EnsureFolder(ResourcesFolder, "Balance");

        FacilityBalanceProfile facilityProfile = LoadOrCreateAsset<FacilityBalanceProfile>(FacilityProfilePath);
        SimulationUpgradeDatabase upgradeDatabase = LoadOrCreateAsset<SimulationUpgradeDatabase>(UpgradeDatabasePath);
        RealitySystemTuning realityTuning = LoadOrCreateAsset<RealitySystemTuning>(RealityTuningPath);
        BalanceToolRegistry registry = LoadOrCreateAsset<BalanceToolRegistry>(RegistryPath);

        FacilityDatabase facilityDatabase = AssetDatabase.LoadAssetAtPath<FacilityDatabase>(FacilityDatabasePath);
        registry.facilityDatabase = facilityDatabase;
        registry.facilityBalanceProfile = facilityProfile;
        registry.simulationUpgradeDatabase = upgradeDatabase;
        registry.realitySystemTuning = realityTuning;
        EditorUtility.SetDirty(registry);

        SeedFacilityProfile(facilityProfile);
        SeedRealityTuning(realityTuning);
        SeedUpgradeDatabase(upgradeDatabase);

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[BalanceDataAssetCreator] Balance assets created/refreshed.");
    }

    private static void SeedFacilityProfile(FacilityBalanceProfile profile)
    {
        var entries = new List<FacilityBalanceProfile.FacilityBalanceEntry>
        {
            Entry("assembly_lines", 10, FacilityGroup.Core, "assemblyLines", "assemblyLineModifier", FacilityModifierKind.AssemblyLines, null, 0, QuantumMegaUnlockGate.None, new[] { "ai_managers" }),
            Entry("ai_managers", 20, FacilityGroup.Core, "managers", "managerModifier", FacilityModifierKind.AiManagers, "assembly_lines", 5, QuantumMegaUnlockGate.None, new[] { "servers" }),
            Entry("servers", 30, FacilityGroup.Core, "servers", "serverModifier", FacilityModifierKind.Servers, "ai_managers", 1, QuantumMegaUnlockGate.None, new[] { "data_centers" }),
            Entry("data_centers", 40, FacilityGroup.Core, "dataCenters", "dataCenterModifier", FacilityModifierKind.DataCenters, "servers", 1, QuantumMegaUnlockGate.None, new[] { "planets" }),
            Entry("planets", 50, FacilityGroup.Core, "planets", "planetModifier", FacilityModifierKind.Planets, "data_centers", 1, QuantumMegaUnlockGate.None, new[] { "matrioshka_brains" }),
            Entry("matrioshka_brains", 60, FacilityGroup.Mega, "matrioshkaBrains", null, FacilityModifierKind.None, "planets", 1, QuantumMegaUnlockGate.MatrioshkaBrains, new[] { "birch_planets" }),
            Entry("birch_planets", 70, FacilityGroup.Mega, "birchPlanets", null, FacilityModifierKind.None, "matrioshka_brains", 1, QuantumMegaUnlockGate.BirchPlanets, new[] { "galactic_brains" }),
            Entry("galactic_brains", 80, FacilityGroup.Mega, "galacticBrains", null, FacilityModifierKind.None, "birch_planets", 1, QuantumMegaUnlockGate.GalacticBrains, null)
        };

        entries[4].bonusContributionRules = new List<FacilityBalanceProfile.BonusContributionRule>
        {
            new FacilityBalanceProfile.BonusContributionRule
            {
                sourceId = "effect.pocket_dimensions.planets",
                label = "Bonus: Pocket Dimensions"
            }
        };

        profile.ReplaceEntries(entries);
        EditorUtility.SetDirty(profile);
    }

    private static FacilityBalanceProfile.FacilityBalanceEntry Entry(
        string id,
        int order,
        FacilityGroup group,
        string countField,
        string modifierField,
        FacilityModifierKind modifierKind,
        string prerequisiteId,
        double prerequisiteOwned,
        QuantumMegaUnlockGate gate,
        string[] upstream)
    {
        return new FacilityBalanceProfile.FacilityBalanceEntry
        {
            facilityId = id,
            displayOrder = order,
            group = group,
            countFieldName = countField,
            modifierFieldName = modifierField,
            modifierKind = modifierKind,
            prerequisiteFacilityId = prerequisiteId,
            prerequisiteOwned = prerequisiteOwned,
            quantumGate = gate,
            upstreamFacilityIds = upstream != null ? new List<string>(upstream) : new List<string>()
        };
    }

    private static void SeedRealityTuning(RealitySystemTuning tuning)
    {
        tuning.workerBatchSize = 128;
        tuning.baseWorkerGenerationSpeed = 4;
        tuning.avocadoLogThreshold = 10;

        tuning.artifactSpeedRules = new List<ArtifactSpeedRule>
        {
            Speed("speed1", 57),
            Speed("speed2", 54),
            Speed("speed3", 48),
            Speed("speed4", 42),
            Speed("speed5", 30),
            Speed("speed6", 15),
            Speed("speed7", 6)
        };

        tuning.artifactTranslationRules = new List<ArtifactTranslationRule>
        {
            Translation("translation1", "i", "|"),
            Translation("translation2", "r", "}"),
            Translation("translation3", "e", "%"),
            Translation("translation4", "f", "$"),
            Translation("translation5", "c", "{"),
            Translation("translation6", "h", "*"),
            Translation("translation7", "a", "@"),
            Translation("translation7", "A", "#"),
            Translation("translation8", "t", "^"),
            Translation("translation8", "T", "&")
        };

        EditorUtility.SetDirty(tuning);
    }

    private static ArtifactSpeedRule Speed(string key, int interval)
    {
        return new ArtifactSpeedRule
        {
            upgradeKey = key,
            tickInterval = interval
        };
    }

    private static ArtifactTranslationRule Translation(string key, string source, string replacement)
    {
        return new ArtifactTranslationRule
        {
            upgradeKey = key,
            source = source,
            replacement = replacement
        };
    }

    private static void SeedUpgradeDatabase(SimulationUpgradeDatabase database)
    {
        var definitions = new List<SimulationUpgradeDefinition>();
        IReadOnlyList<SimulationUpgradeSpec> specs = SimulationUpgradeDefaultsCatalog.All;
        for (int i = 0; i < specs.Count; i++)
        {
            SimulationUpgradeSpec spec = specs[i];
            if (spec == null || string.IsNullOrWhiteSpace(spec.Key))
            {
                continue;
            }

            string assetPath = $"{UpgradeFolder}/{spec.Key}.asset";
            SimulationUpgradeDefinition definition = AssetDatabase.LoadAssetAtPath<SimulationUpgradeDefinition>(assetPath);
            if (definition == null)
            {
                definition = ScriptableObject.CreateInstance<SimulationUpgradeDefinition>();
                AssetDatabase.CreateAsset(definition, assetPath);
            }

            definition.key = spec.Key;
            definition.layer = spec.Layer;
            definition.category = spec.Category;
            definition.title = spec.Title;
            definition.description = spec.Description;
            definition.cost = spec.Cost;
            definition.prerequisites = ClonePrerequisites(spec.Prerequisites);
            definition.purchaseEffects = CloneEffects(spec.Effects);
            EditorUtility.SetDirty(definition);
            definitions.Add(definition);
        }

        database.ReplaceUpgrades(definitions);
        EditorUtility.SetDirty(database);
    }

    private static List<SimulationUpgradePrerequisite> ClonePrerequisites(IReadOnlyList<SimulationUpgradePrerequisite> source)
    {
        var copy = new List<SimulationUpgradePrerequisite>();
        if (source == null)
        {
            return copy;
        }

        for (int i = 0; i < source.Count; i++)
        {
            SimulationUpgradePrerequisite prerequisite = source[i];
            if (prerequisite == null)
            {
                continue;
            }

            copy.Add(new SimulationUpgradePrerequisite
            {
                key = prerequisite.key,
                mustBeOwned = prerequisite.mustBeOwned
            });
        }

        return copy;
    }

    private static List<SimulationUpgradeEffect> CloneEffects(IReadOnlyList<SimulationUpgradeEffect> source)
    {
        var copy = new List<SimulationUpgradeEffect>();
        if (source == null)
        {
            return copy;
        }

        for (int i = 0; i < source.Count; i++)
        {
            SimulationUpgradeEffect effect = source[i];
            if (effect == null)
            {
                continue;
            }

            copy.Add(new SimulationUpgradeEffect
            {
                effectType = effect.effectType,
                targetKey = effect.targetKey,
                boolValue = effect.boolValue,
                numericValue = effect.numericValue
            });
        }

        return copy;
    }

    private static T LoadOrCreateAsset<T>(string path) where T : ScriptableObject
    {
        T asset = AssetDatabase.LoadAssetAtPath<T>(path);
        if (asset != null)
        {
            return asset;
        }

        asset = ScriptableObject.CreateInstance<T>();
        AssetDatabase.CreateAsset(asset, path);
        return asset;
    }

    private static void EnsureFolder(string parent, string child)
    {
        string path = $"{parent}/{child}";
        if (!AssetDatabase.IsValidFolder(path))
        {
            AssetDatabase.CreateFolder(parent, child);
        }
    }
}
