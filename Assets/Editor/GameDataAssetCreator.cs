using UnityEditor;
using UnityEngine;
using UnityEditor.SceneManagement;
using GameData;
using Systems.Stats;
using System.Collections.Generic;
using Expansion;
using Classes;
using ResearchComponent = Research.ResearchPresenter;

public static class GameDataAssetCreator
{
    private const string DataFolder = "Assets/Data";
    private const string DatabasesFolder = "Assets/Data/Databases";
    private const string FacilitiesFolder = "Assets/Data/Facilities";
    private const string SkillsFolder = "Assets/Data/Skills";
    private const string EffectsFolder = "Assets/Data/Effects";
    private const string ResearchFolder = "Assets/Data/Research";

    [MenuItem("Tools/Idle Dyson/Create Game Data Assets")]
    public static void CreateGameDataAssets()
    {
        EnsureFolder("Assets", "Data");
        EnsureFolder(DataFolder, "Databases");
        EnsureFolder(DataFolder, "Research");

        CreateAsset<FacilityDatabase>($"{DatabasesFolder}/FacilityDatabase.asset");
        CreateAsset<SkillDatabase>($"{DatabasesFolder}/SkillDatabase.asset");
        CreateAsset<EffectDatabase>($"{DatabasesFolder}/EffectDatabase.asset");
        CreateAsset<ResearchDatabase>($"{DatabasesFolder}/ResearchDatabase.asset");

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    [MenuItem("Tools/Idle Dyson/Create Game Data Registry In Scene")]
    public static void CreateRegistryInScene()
    {
        CreateGameDataAssets();

        var registry = Object.FindFirstObjectByType<GameDataRegistry>();
        if (registry == null)
        {
            GameObject go = new GameObject("GameDataRegistry");
            registry = go.AddComponent<GameDataRegistry>();
        }

        registry.facilityDatabase = AssetDatabase.LoadAssetAtPath<FacilityDatabase>(
            $"{DatabasesFolder}/FacilityDatabase.asset");
        registry.skillDatabase = AssetDatabase.LoadAssetAtPath<SkillDatabase>(
            $"{DatabasesFolder}/SkillDatabase.asset");
        registry.effectDatabase = AssetDatabase.LoadAssetAtPath<EffectDatabase>(
            $"{DatabasesFolder}/EffectDatabase.asset");
        registry.researchDatabase = AssetDatabase.LoadAssetAtPath<ResearchDatabase>(
            $"{DatabasesFolder}/ResearchDatabase.asset");

        EditorUtility.SetDirty(registry);
        if (!Application.isPlaying)
        {
            EditorSceneManager.MarkSceneDirty(registry.gameObject.scene);
        }
    }

    [MenuItem("Tools/Idle Dyson/Create Core Facility Definitions")]
    public static void CreateCoreFacilityDefinitions()
    {
        CreateGameDataAssets();
        EnsureFolder(DataFolder, "Facilities");

        FacilityDatabase database = AssetDatabase.LoadAssetAtPath<FacilityDatabase>(
            $"{DatabasesFolder}/FacilityDatabase.asset");
        if (database == null)
        {
            database = CreateAsset<FacilityDatabase>($"{DatabasesFolder}/FacilityDatabase.asset");
        }

        var specs = new[]
        {
            new FacilitySpec("assembly_lines", "Assembly Lines", "Assembly lines that produce bots.",
                new[] { "facility", "assembly" }, 0.1, "Facility.AssemblyLine.Production"),
            new FacilitySpec("ai_managers", "AI Managers", "AI managers that produce assembly lines.",
                new[] { "facility", "manager" }, 1d / 60d, "Facility.Manager.Production"),
            new FacilitySpec("servers", "Servers", "Servers that produce AI managers.",
                new[] { "facility", "server" }, 1d / 600d, "Facility.Server.Production"),
            new FacilitySpec("data_centers", "Data Centers", "Data centers that produce servers.",
                new[] { "facility", "data_center" }, 1d / 900d, "Facility.DataCenter.Production"),
            new FacilitySpec("planets", "Planets", "Planets that produce data centers.",
                new[] { "facility", "planet" }, 1d / 3600d, "Facility.Planet.Production")
        };

        foreach (FacilitySpec spec in specs)
        {
            FacilityDefinition definition = FindFacility(database, spec.Id);
            if (definition == null)
            {
                string assetPath = $"{FacilitiesFolder}/{spec.Id}.asset";
                definition = CreateAsset<FacilityDefinition>(assetPath);
                database.facilities.Add(definition);
                EditorUtility.SetDirty(database);
            }

            ApplyFacilityDefaults(definition, spec);
            EditorUtility.SetDirty(definition);
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    [MenuItem("Tools/Idle Dyson/Create Core Facility Skill Effects")]
    public static void CreateCoreFacilitySkillEffects()
    {
        CreateGameDataAssets();
        EnsureFolder(DataFolder, "Skills");
        EnsureFolder(DataFolder, "Effects");

        SkillDatabase skillDatabase = AssetDatabase.LoadAssetAtPath<SkillDatabase>(
            $"{DatabasesFolder}/SkillDatabase.asset");
        if (skillDatabase == null)
        {
            skillDatabase = CreateAsset<SkillDatabase>($"{DatabasesFolder}/SkillDatabase.asset");
        }

        EffectDatabase effectDatabase = AssetDatabase.LoadAssetAtPath<EffectDatabase>(
            $"{DatabasesFolder}/EffectDatabase.asset");
        if (effectDatabase == null)
        {
            effectDatabase = CreateAsset<EffectDatabase>($"{DatabasesFolder}/EffectDatabase.asset");
        }

        var specs = new List<SkillSpec>
        {
            new SkillSpec("stayingPower", "Staying Power", new[]
            {
                new EffectSpec("effect.staying_power.assembly_lines", "Staying Power", StatId.AssemblyLineProduction,
                    StatOperation.Multiply, 1, 20, "panel_lifetime", new[] { "assembly_lines" })
            }),
            new SkillSpec("rule34", "Rule 34", new[]
            {
                new EffectSpec("effect.rule34.assembly_lines", "Rule 34", StatId.AssemblyLineProduction,
                    StatOperation.Multiply, 2, 30, "assembly_lines_69", new[] { "assembly_lines" }),
                new EffectSpec("effect.rule34.ai_managers", "Rule 34", StatId.ManagerProduction,
                    StatOperation.Multiply, 2, 20, "ai_managers_69", new[] { "ai_managers" }),
                new EffectSpec("effect.rule34.servers", "Rule 34", StatId.ServerProduction,
                    StatOperation.Multiply, 2, 20, "servers_69", new[] { "servers" }),
                new EffectSpec("effect.rule34.data_centers", "Rule 34", StatId.DataCenterProduction,
                    StatOperation.Multiply, 2, 20, "data_centers_69", new[] { "data_centers" }),
                new EffectSpec("effect.rule34.planets", "Rule 34", StatId.PlanetProduction,
                    StatOperation.Multiply, 2, 20, "planets_69", new[] { "planets" })
            }),
            new SkillSpec("superchargedPower", "Supercharged Power", new[]
            {
                new EffectSpec("effect.supercharged_power.assembly_lines", "Supercharged Power",
                    StatId.AssemblyLineProduction, StatOperation.Multiply, 1.5, 40, null,
                    new[] { "assembly_lines" }),
                new EffectSpec("effect.supercharged_power.ai_managers", "Supercharged Power", StatId.ManagerProduction,
                    StatOperation.Multiply, 1.5, 30, null, new[] { "ai_managers" }),
                new EffectSpec("effect.supercharged_power.servers", "Supercharged Power", StatId.ServerProduction,
                    StatOperation.Multiply, 1.5, 30, null, new[] { "servers" }),
                new EffectSpec("effect.supercharged_power.data_centers", "Supercharged Power", StatId.DataCenterProduction,
                    StatOperation.Multiply, 1.5, 30, null, new[] { "data_centers" }),
                new EffectSpec("effect.supercharged_power.planets", "Supercharged Power", StatId.PlanetProduction,
                    StatOperation.Multiply, 1.5, 30, null, new[] { "planets" })
            }),
            new SkillSpec("rudimentarySingularity", "Rudimentary Singularity", new[]
            {
                new EffectSpec("effect.rudimentary_singularity.data_centers", "Rudimentary Singularity",
                    StatId.DataCenterProduction, StatOperation.Add, 0, 40, null, new[] { "data_centers" })
            }),
            new SkillSpec("parallelComputation", "Parallel Computation", new[]
            {
                new EffectSpec("effect.parallel_computation.data_centers", "Parallel Computation",
                    StatId.DataCenterProduction, StatOperation.Add, 0, 50, "servers_total_gt_1", new[] { "data_centers" })
            }),
            new SkillSpec("pocketDimensions", "Pocket Dimensions", new[]
            {
                new EffectSpec("effect.pocket_dimensions.planets", "Pocket Dimensions", StatId.PlanetProduction,
                    StatOperation.Add, 0, 40, null, new[] { "planets" })
            })
        };

        foreach (SkillSpec spec in specs)
        {
            SkillDefinition skill = FindSkill(skillDatabase, spec.Id);
            if (skill == null)
            {
                string assetPath = $"{SkillsFolder}/{spec.Id}.asset";
                skill = CreateAsset<SkillDefinition>(assetPath);
                skillDatabase.skills.Add(skill);
                EditorUtility.SetDirty(skillDatabase);
            }

            ApplySkillDefaults(skill, spec);
            if (skill.effects == null) skill.effects = new List<EffectDefinition>();

            foreach (EffectSpec effectSpec in spec.Effects)
            {
                EffectDefinition effect = FindEffect(effectDatabase, effectSpec.Id);
                if (effect == null)
                {
                    string assetPath = $"{EffectsFolder}/{effectSpec.Id}.asset";
                    effect = CreateAsset<EffectDefinition>(assetPath);
                    effectDatabase.effects.Add(effect);
                    EditorUtility.SetDirty(effectDatabase);
                }

                ApplyEffectDefaults(effect, effectSpec);
                if (!skill.effects.Contains(effect)) skill.effects.Add(effect);
                EditorUtility.SetDirty(effect);
            }

            EditorUtility.SetDirty(skill);
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    [MenuItem("Tools/Idle Dyson/Create Core Research Definitions")]
    public static void CreateCoreResearchDefinitions()
    {
        CreateGameDataAssets();
        EnsureFolder(DataFolder, "Research");
        EnsureFolder(DataFolder, "Effects");

        ResearchDatabase researchDatabase = AssetDatabase.LoadAssetAtPath<ResearchDatabase>(
            $"{DatabasesFolder}/ResearchDatabase.asset");
        if (researchDatabase == null)
        {
            researchDatabase = CreateAsset<ResearchDatabase>($"{DatabasesFolder}/ResearchDatabase.asset");
        }

        EffectDatabase effectDatabase = AssetDatabase.LoadAssetAtPath<EffectDatabase>(
            $"{DatabasesFolder}/EffectDatabase.asset");
        if (effectDatabase == null)
        {
            effectDatabase = CreateAsset<EffectDatabase>($"{DatabasesFolder}/EffectDatabase.asset");
        }

        Dictionary<string, ResearchDefaults> defaults = BuildResearchDefaultsFromScene();

        string moneyName = "Cash";
        double moneyCost = 5000;
        double moneyExponent = 1.77;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.MoneyMultiplier, ref moneyName, ref moneyCost,
            ref moneyExponent);

        string scienceName = "Science";
        double scienceCost = 10000;
        double scienceExponent = 1.55;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.ScienceBoost, ref scienceName, ref scienceCost,
            ref scienceExponent);

        string assemblyName = "Assembly Line";
        double assemblyCost = 50000;
        double assemblyExponent = 1.4;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.AssemblyLineUpgrade, ref assemblyName, ref assemblyCost,
            ref assemblyExponent);

        string managerName = "AI Manager";
        double managerCost = 1000000;
        double managerExponent = 1.5;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.AiManagerUpgrade, ref managerName, ref managerCost,
            ref managerExponent);

        string serverName = "Server";
        double serverCost = 100000000;
        double serverExponent = 1.6;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.ServerUpgrade, ref serverName, ref serverCost,
            ref serverExponent);

        string dataCenterName = "Data Center";
        double dataCenterCost = 1000000000;
        double dataCenterExponent = 1.7;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.DataCenterUpgrade, ref dataCenterName, ref dataCenterCost,
            ref dataCenterExponent);

        string planetName = "Planet";
        double planetCost = 2000000000;
        double planetExponent = 1.8;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.PlanetUpgrade, ref planetName, ref planetCost,
            ref planetExponent);

        string panelLifetime1Name = "Panel Lifetime I";
        double panelLifetime1Cost = 1000000000;
        double panelLifetime1Exponent = 1;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.PanelLifetime1, ref panelLifetime1Name,
            ref panelLifetime1Cost, ref panelLifetime1Exponent);

        string panelLifetime2Name = "Panel Lifetime II";
        double panelLifetime2Cost = 1000000000000;
        double panelLifetime2Exponent = 1;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.PanelLifetime2, ref panelLifetime2Name,
            ref panelLifetime2Cost, ref panelLifetime2Exponent);

        string panelLifetime3Name = "Panel Lifetime III";
        double panelLifetime3Cost = 1000000000000000;
        double panelLifetime3Exponent = 1;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.PanelLifetime3, ref panelLifetime3Name,
            ref panelLifetime3Cost, ref panelLifetime3Exponent);

        string panelLifetime4Name = "Panel Lifetime IV";
        double panelLifetime4Cost = 1e18;
        double panelLifetime4Exponent = 1;
        ApplyResearchDefaultsFromScene(defaults, ResearchIdMap.PanelLifetime4, ref panelLifetime4Name,
            ref panelLifetime4Cost, ref panelLifetime4Exponent);

        var specs = new List<ResearchSpec>
        {
            new ResearchSpec(ResearchIdMap.MoneyMultiplier, moneyName, moneyCost, moneyExponent, -1,
                ResearchAutoBuyGroup.Money, null, new[]
            {
                new ResearchEffectSpec("effect.research.money_multiplier", "Money Multiplier",
                    StatId.MoneyMultiplier, StatOperation.Add, 0, 0, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.ScienceBoost, scienceName, scienceCost, scienceExponent, -1,
                ResearchAutoBuyGroup.Science, null, new[]
            {
                new ResearchEffectSpec("effect.research.science_multiplier", "Science Multiplier",
                    StatId.ScienceMultiplier, StatOperation.Add, 0, 0, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.AssemblyLineUpgrade, assemblyName, assemblyCost, assemblyExponent, -1,
                ResearchAutoBuyGroup.Assembly, null, new[]
            {
                new ResearchEffectSpec("effect.research.assembly_line_modifier", "Assembly Line Upgrades",
                    StatId.AssemblyLineModifier, StatOperation.Add, 0, 0, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.AiManagerUpgrade, managerName, managerCost, managerExponent, -1,
                ResearchAutoBuyGroup.Ai, null, new[]
            {
                new ResearchEffectSpec("effect.research.ai_manager_modifier", "AI Manager Upgrades",
                    StatId.ManagerModifier, StatOperation.Add, 0, 0, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.ServerUpgrade, serverName, serverCost, serverExponent, -1,
                ResearchAutoBuyGroup.Server, null, new[]
            {
                new ResearchEffectSpec("effect.research.server_modifier", "Server Upgrades",
                    StatId.ServerModifier, StatOperation.Add, 0, 0, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.DataCenterUpgrade, dataCenterName, dataCenterCost, dataCenterExponent, -1,
                ResearchAutoBuyGroup.DataCenter, null, new[]
            {
                new ResearchEffectSpec("effect.research.data_center_modifier", "Data Center Upgrades",
                    StatId.DataCenterModifier, StatOperation.Add, 0, 0, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.PlanetUpgrade, planetName, planetCost, planetExponent, -1,
                ResearchAutoBuyGroup.Planet, null, new[]
            {
                new ResearchEffectSpec("effect.research.planet_modifier", "Planet Upgrades",
                    StatId.PlanetModifier, StatOperation.Add, 0, 0, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.PanelLifetime1, panelLifetime1Name, panelLifetime1Cost,
                panelLifetime1Exponent, 1, ResearchAutoBuyGroup.None, null, new[]
            {
                new ResearchEffectSpec("effect.research.panel_lifetime_1", "Panel Lifetime I",
                    StatId.PanelLifetime, StatOperation.Add, 0, 1, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.PanelLifetime2, panelLifetime2Name, panelLifetime2Cost,
                panelLifetime2Exponent, 1, ResearchAutoBuyGroup.None,
                new[] { ResearchIdMap.PanelLifetime1 }, new[]
            {
                new ResearchEffectSpec("effect.research.panel_lifetime_2", "Panel Lifetime II",
                    StatId.PanelLifetime, StatOperation.Add, 0, 2, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.PanelLifetime3, panelLifetime3Name, panelLifetime3Cost,
                panelLifetime3Exponent, 1, ResearchAutoBuyGroup.None,
                new[] { ResearchIdMap.PanelLifetime2 }, new[]
            {
                new ResearchEffectSpec("effect.research.panel_lifetime_3", "Panel Lifetime III",
                    StatId.PanelLifetime, StatOperation.Add, 0, 3, 0, null, null)
            }),
            new ResearchSpec(ResearchIdMap.PanelLifetime4, panelLifetime4Name, panelLifetime4Cost,
                panelLifetime4Exponent, 1, ResearchAutoBuyGroup.None,
                new[] { ResearchIdMap.PanelLifetime3 }, new[]
            {
                new ResearchEffectSpec("effect.research.panel_lifetime_4", "Panel Lifetime IV",
                    StatId.PanelLifetime, StatOperation.Add, 0, 4, 0, null, null)
            })
        };

        foreach (ResearchSpec spec in specs)
        {
            ResearchDefinition definition = FindResearch(researchDatabase, spec.Id);
            if (definition == null)
            {
                string assetPath = $"{ResearchFolder}/{spec.Id}.asset";
                definition = CreateAsset<ResearchDefinition>(assetPath);
                researchDatabase.research.Add(definition);
                EditorUtility.SetDirty(researchDatabase);
            }

            ApplyResearchDefaults(definition, spec);
            if (definition.effects == null) definition.effects = new List<EffectDefinition>();

            foreach (ResearchEffectSpec effectSpec in spec.Effects)
            {
                EffectDefinition effect = FindEffect(effectDatabase, effectSpec.Id);
                if (effect == null)
                {
                    string assetPath = $"{EffectsFolder}/{effectSpec.Id}.asset";
                    effect = CreateAsset<EffectDefinition>(assetPath);
                    effectDatabase.effects.Add(effect);
                    EditorUtility.SetDirty(effectDatabase);
                }

                ApplyResearchEffectSpec(effect, effectSpec);
                if (!definition.effects.Contains(effect)) definition.effects.Add(effect);
                EditorUtility.SetDirty(effect);
            }

            EditorUtility.SetDirty(definition);
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    [MenuItem("Tools/Idle Dyson/Create All Skill Definitions + Effects")]
    public static void CreateAllSkillDefinitionsAndEffects()
    {
        CreateGameDataAssets();
        EnsureFolder(DataFolder, "Skills");
        EnsureFolder(DataFolder, "Effects");

        SkillDatabase skillDatabase = AssetDatabase.LoadAssetAtPath<SkillDatabase>(
            $"{DatabasesFolder}/SkillDatabase.asset");
        if (skillDatabase == null)
        {
            skillDatabase = CreateAsset<SkillDatabase>($"{DatabasesFolder}/SkillDatabase.asset");
        }

        EffectDatabase effectDatabase = AssetDatabase.LoadAssetAtPath<EffectDatabase>(
            $"{DatabasesFolder}/EffectDatabase.asset");
        if (effectDatabase == null)
        {
            effectDatabase = CreateAsset<EffectDatabase>($"{DatabasesFolder}/EffectDatabase.asset");
        }

        Oracle oracle = Object.FindFirstObjectByType<Oracle>();
        if (oracle == null)
        {
            Debug.LogWarning("Oracle not found. Open the Game scene and retry.");
            return;
        }

        if (oracle.SkillTree == null || oracle.SkillTree.Count == 0)
        {
            Debug.LogWarning("Oracle.SkillTree is empty. Ensure the skill tree data is loaded in the scene.");
            return;
        }

        IReadOnlyList<SkillEffectSpec> effectSpecs = SkillEffectCatalog.GetAll();

        foreach (KeyValuePair<int, SkillTreeItem> entry in oracle.SkillTree)
        {
            if (!TryGetSkillId(entry.Key, out string skillId))
            {
                Debug.LogWarning($"Skill key {entry.Key} is missing from the skill id map.");
                continue;
            }

            SkillDefinition skill = FindSkill(skillDatabase, skillId);
            if (skill == null)
            {
                string assetPath = $"{SkillsFolder}/{skillId}.asset";
                skill = CreateAsset<SkillDefinition>(assetPath);
                skillDatabase.skills.Add(skill);
                EditorUtility.SetDirty(skillDatabase);
            }

            ApplySkillData(skill, skillId, entry.Value);
            if (skill.effects == null) skill.effects = new List<EffectDefinition>();

            for (int i = 0; i < effectSpecs.Count; i++)
            {
                SkillEffectSpec spec = effectSpecs[i];
                if (!string.Equals(spec.SkillId, skillId, System.StringComparison.Ordinal)) continue;

                EffectDefinition effect = FindEffect(effectDatabase, spec.EffectId);
                if (effect == null)
                {
                    string assetPath = $"{EffectsFolder}/{spec.EffectId}.asset";
                    effect = CreateAsset<EffectDefinition>(assetPath);
                    effectDatabase.effects.Add(effect);
                    EditorUtility.SetDirty(effectDatabase);
                }

                ApplyEffectSpec(effect, spec);
                if (!skill.effects.Contains(effect)) skill.effects.Add(effect);
                EditorUtility.SetDirty(effect);
            }

            EditorUtility.SetDirty(skill);
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    private static void EnsureFolder(string parent, string child)
    {
        string path = $"{parent}/{child}";
        if (!AssetDatabase.IsValidFolder(path))
        {
            AssetDatabase.CreateFolder(parent, child);
        }
    }

    private static T CreateAsset<T>(string path) where T : ScriptableObject
    {
        T asset = AssetDatabase.LoadAssetAtPath<T>(path);
        if (asset != null) return asset;

        asset = ScriptableObject.CreateInstance<T>();
        AssetDatabase.CreateAsset(asset, path);
        return asset;
    }

    private static FacilityDefinition FindFacility(FacilityDatabase database, string id)
    {
        if (database == null || database.facilities == null) return null;
        foreach (FacilityDefinition definition in database.facilities)
        {
            if (definition != null && definition.id == id) return definition;
        }

        return null;
    }

    private static ResearchDefinition FindResearch(ResearchDatabase database, string id)
    {
        if (database == null || database.research == null) return null;
        foreach (ResearchDefinition definition in database.research)
        {
            if (definition != null && definition.id == id) return definition;
        }

        return null;
    }

    private static void ApplyFacilityDefaults(FacilityDefinition definition, FacilitySpec spec)
    {
        if (definition == null) return;

        if (string.IsNullOrEmpty(definition.id))
        {
            // Use reflection to set private _id field
            var idField = typeof(FacilityDefinition).GetField("_id", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (idField != null)
            {
                var facilityIdPath = $"Assets/Data/IDs/Facilities/{spec.Id}.asset";
                var facilityId = AssetDatabase.LoadAssetAtPath<IdleDysonSwarm.Data.FacilityId>(facilityIdPath);
                if (facilityId != null) idField.SetValue(definition, facilityId);
            }
        }
        if (string.IsNullOrEmpty(definition.displayName)) definition.displayName = spec.Name;
        if (string.IsNullOrEmpty(definition.description)) definition.description = spec.Description;
        if (definition.tags == null || definition.tags.Length == 0) definition.tags = spec.Tags;
        if (definition.baseProduction == 0) definition.baseProduction = spec.BaseProduction;
        if (string.IsNullOrEmpty(definition.productionStatId)) definition.productionStatId = spec.ProductionStatId;
    }

    private static SkillDefinition FindSkill(SkillDatabase database, string id)
    {
        if (database == null || database.skills == null) return null;
        foreach (SkillDefinition definition in database.skills)
        {
            if (definition != null && definition.id == id) return definition;
        }

        return null;
    }

    private static EffectDefinition FindEffect(EffectDatabase database, string id)
    {
        if (database == null || database.effects == null) return null;
        foreach (EffectDefinition definition in database.effects)
        {
            if (definition != null && definition.id == id) return definition;
        }

        return null;
    }

    private static void ApplySkillDefaults(SkillDefinition definition, SkillSpec spec)
    {
        if (definition == null) return;
        if (string.IsNullOrEmpty(definition.id))
        {
            // Use reflection to set private _id field
            var idField = typeof(SkillDefinition).GetField("_id", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (idField != null)
            {
                var skillIdPath = $"Assets/Data/IDs/Skills/{spec.Id}.asset";
                var skillId = AssetDatabase.LoadAssetAtPath<IdleDysonSwarm.Data.SkillId>(skillIdPath);
                if (skillId != null) idField.SetValue(definition, skillId);
            }
        }
        if (string.IsNullOrEmpty(definition.displayName)) definition.displayName = spec.Name;
    }

    private static void ApplyResearchDefaults(ResearchDefinition definition, ResearchSpec spec)
    {
        if (definition == null) return;
        // Use reflection to set private _id field
        var idField = typeof(ResearchDefinition).GetField("_id", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        if (idField != null)
        {
            var researchIdPath = $"Assets/Data/IDs/Research/{spec.Id}.asset";
            var researchId = AssetDatabase.LoadAssetAtPath<IdleDysonSwarm.Data.ResearchId>(researchIdPath);
            if (researchId != null) idField.SetValue(definition, researchId);
        }
        if (string.IsNullOrEmpty(definition.displayName)) definition.displayName = spec.Name;
        definition.baseCost = spec.BaseCost;
        definition.exponent = spec.Exponent;
        definition.maxLevel = spec.MaxLevel;
        if (definition.autoBuyGroup == ResearchAutoBuyGroup.Inherit)
        {
            definition.autoBuyGroup = spec.AutoBuyGroup;
        }
        if ((definition.prerequisiteResearchIds == null || definition.prerequisiteResearchIds.Length == 0) &&
            spec.PrerequisiteResearchIds != null && spec.PrerequisiteResearchIds.Length > 0)
        {
            definition.prerequisiteResearchIds = spec.PrerequisiteResearchIds;
        }
    }

    private static void ApplyEffectDefaults(EffectDefinition definition, EffectSpec spec)
    {
        if (definition == null) return;
        if (string.IsNullOrEmpty(definition.id)) definition.id = spec.Id;
        if (string.IsNullOrEmpty(definition.displayName)) definition.displayName = spec.Name;
        if (string.IsNullOrEmpty(definition.targetStatId)) definition.targetStatId = spec.TargetStatId;
        definition.operation = spec.Operation;
        if (definition.value == 0) definition.value = spec.Value;
        if (definition.order == 0) definition.order = spec.Order;
        if (string.IsNullOrEmpty(definition.conditionId)) definition.conditionId = spec.ConditionId;
        if ((definition.targetFacilityIds == null || definition.targetFacilityIds.Length == 0) &&
            spec.TargetFacilityIds != null && spec.TargetFacilityIds.Length > 0)
        {
            definition.targetFacilityIds = spec.TargetFacilityIds;
        }
    }

    private static void ApplySkillData(SkillDefinition definition, string skillId, SkillTreeItem item)
    {
        if (definition == null || item == null) return;

        // Use reflection to set private _id field
        var idField = typeof(SkillDefinition).GetField("_id", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        if (idField != null)
        {
            var skillIdPath = $"Assets/Data/IDs/Skills/{skillId}.asset";
            var skillIdAsset = AssetDatabase.LoadAssetAtPath<IdleDysonSwarm.Data.SkillId>(skillIdPath);
            if (skillIdAsset != null) idField.SetValue(definition, skillIdAsset);
        }
        if (string.IsNullOrEmpty(definition.displayName)) definition.displayName = item.SkillName;
        if (string.IsNullOrEmpty(definition.description)) definition.description = item.SkillDescription;
        if (string.IsNullOrEmpty(definition.technicalDescription))
            definition.technicalDescription = item.SkillTechnicalDescription;

        definition.cost = item.Cost;
        definition.refundable = item.Refundable;
        definition.isFragment = item.isFragment;
        definition.purityLine = item.purityLine;
        definition.terraLine = item.terraLine;
        definition.powerLine = item.powerLine;
        definition.paragadeLine = item.paragadeLine;
        definition.stellarLine = item.stellarLine;
        definition.firstRunBlocked = item.firstRunBlocked;
        definition.requiredSkillIds = ConvertSkillKeys(item.RequiredSkill);
        definition.shadowRequirementIds = ConvertSkillKeys(item.ShadowRequirements);
        definition.exclusiveWithIds = ConvertSkillKeys(item.ExclusvieWith);
        definition.unrefundableWithIds = ConvertSkillKeys(item.UnrefundableWith);
    }

    private static void ApplyEffectSpec(EffectDefinition definition, SkillEffectSpec spec)
    {
        if (definition == null) return;
        definition.id = spec.EffectId;
        definition.displayName = spec.DisplayName;
        definition.targetStatId = spec.TargetStatId;
        definition.operation = spec.Operation;
        definition.value = spec.Value;
        definition.order = spec.Order;
        definition.conditionId = spec.ConditionId;
        definition.targetFacilityIds = spec.TargetFacilityIds;
        definition.targetFacilityTags = spec.TargetFacilityTags;
    }

    private static void ApplyResearchEffectSpec(EffectDefinition definition, ResearchEffectSpec spec)
    {
        if (definition == null) return;
        definition.id = spec.Id;
        definition.displayName = spec.Name;
        definition.targetStatId = spec.TargetStatId;
        definition.operation = spec.Operation;
        definition.value = spec.Value;
        definition.perLevel = spec.PerLevel;
        definition.order = spec.Order;
        definition.conditionId = spec.ConditionId;
        definition.targetFacilityIds = spec.TargetFacilityIds;
    }

    private static bool TryGetSkillId(int skillKey, out string skillId)
    {
        return SkillIdMap.TryGetId(skillKey, out skillId);
    }

    private static string[] ConvertSkillKeys(int[] keys)
    {
        if (keys == null || keys.Length == 0) return null;
        var ids = new List<string>(keys.Length);
        for (int i = 0; i < keys.Length; i++)
        {
            if (TryGetSkillId(keys[i], out string id))
            {
                ids.Add(id);
            }
        }

        return ids.Count > 0 ? ids.ToArray() : null;
    }

    private static Dictionary<string, ResearchDefaults> BuildResearchDefaultsFromScene()
    {
        var defaults = new Dictionary<string, ResearchDefaults>();
        ResearchComponent[] components =
            Object.FindObjectsByType<ResearchComponent>(FindObjectsInactive.Include, FindObjectsSortMode.None);
        if (components == null || components.Length == 0) return defaults;

        foreach (ResearchComponent component in components)
        {
            if (component == null) continue;
            ResearchDefinition resolved = component.ResolvedDefinition;
            if (resolved == null) continue;
            string id = resolved.id;
            if (string.IsNullOrEmpty(id)) continue;
            if (!defaults.ContainsKey(id))
            {
                defaults.Add(id, new ResearchDefaults(resolved.baseCost, resolved.exponent, resolved.displayName));
            }
        }

        return defaults;
    }

    private static void ApplyResearchDefaultsFromScene(Dictionary<string, ResearchDefaults> defaults, string id,
        ref string name, ref double baseCost, ref double exponent)
    {
        if (defaults == null || string.IsNullOrEmpty(id)) return;
        if (!defaults.TryGetValue(id, out ResearchDefaults found)) return;
        if (!string.IsNullOrEmpty(found.Name)) name = found.Name;
        if (found.BaseCost > 0) baseCost = found.BaseCost;
        if (found.Exponent > 0) exponent = found.Exponent;
    }

    private readonly struct FacilitySpec
    {
        public FacilitySpec(string id, string name, string description, string[] tags, double baseProduction,
            string productionStatId)
        {
            Id = id;
            Name = name;
            Description = description;
            Tags = tags;
            BaseProduction = baseProduction;
            ProductionStatId = productionStatId;
        }

        public string Id { get; }
        public string Name { get; }
        public string Description { get; }
        public string[] Tags { get; }
        public double BaseProduction { get; }
        public string ProductionStatId { get; }
    }

    private readonly struct SkillSpec
    {
        public SkillSpec(string id, string name, EffectSpec[] effects)
        {
            Id = id;
            Name = name;
            Effects = effects;
        }

        public string Id { get; }
        public string Name { get; }
        public EffectSpec[] Effects { get; }
    }

    private readonly struct EffectSpec
    {
        public EffectSpec(string id, string name, string targetStatId, StatOperation operation, double value,
            int order, string conditionId, string[] targetFacilityIds)
        {
            Id = id;
            Name = name;
            TargetStatId = targetStatId;
            Operation = operation;
            Value = value;
            Order = order;
            ConditionId = conditionId;
            TargetFacilityIds = targetFacilityIds;
        }

        public string Id { get; }
        public string Name { get; }
        public string TargetStatId { get; }
        public StatOperation Operation { get; }
        public double Value { get; }
        public int Order { get; }
        public string ConditionId { get; }
        public string[] TargetFacilityIds { get; }
    }

    private readonly struct ResearchDefaults
    {
        public ResearchDefaults(double baseCost, double exponent, string name)
        {
            BaseCost = baseCost;
            Exponent = exponent;
            Name = name;
        }

        public double BaseCost { get; }
        public double Exponent { get; }
        public string Name { get; }
    }

    private readonly struct ResearchSpec
    {
        public ResearchSpec(string id, string name, double baseCost, double exponent, int maxLevel,
            ResearchAutoBuyGroup autoBuyGroup, string[] prerequisiteResearchIds, ResearchEffectSpec[] effects)
        {
            Id = id;
            Name = name;
            BaseCost = baseCost;
            Exponent = exponent;
            MaxLevel = maxLevel;
            AutoBuyGroup = autoBuyGroup;
            PrerequisiteResearchIds = prerequisiteResearchIds;
            Effects = effects;
        }

        public string Id { get; }
        public string Name { get; }
        public double BaseCost { get; }
        public double Exponent { get; }
        public int MaxLevel { get; }
        public ResearchAutoBuyGroup AutoBuyGroup { get; }
        public string[] PrerequisiteResearchIds { get; }
        public ResearchEffectSpec[] Effects { get; }
    }

    private readonly struct ResearchEffectSpec
    {
        public ResearchEffectSpec(string id, string name, string targetStatId, StatOperation operation, double value,
            double perLevel, int order, string conditionId, string[] targetFacilityIds)
        {
            Id = id;
            Name = name;
            TargetStatId = targetStatId;
            Operation = operation;
            Value = value;
            PerLevel = perLevel;
            Order = order;
            ConditionId = conditionId;
            TargetFacilityIds = targetFacilityIds;
        }

        public string Id { get; }
        public string Name { get; }
        public string TargetStatId { get; }
        public StatOperation Operation { get; }
        public double Value { get; }
        public double PerLevel { get; }
        public int Order { get; }
        public string ConditionId { get; }
        public string[] TargetFacilityIds { get; }
    }
}
