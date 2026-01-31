using System;
using System.Collections.Generic;
using GameData;
using Systems;
using Systems.Facilities;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public readonly struct SkillEffectSpec
    {
        public SkillEffectSpec(string skillId, string effectId, string displayName, string targetStatId,
            StatOperation operation, double value, int order, string conditionId, string[] targetFacilityIds,
            string[] targetFacilityTags)
        {
            SkillId = skillId;
            EffectId = effectId;
            DisplayName = displayName;
            TargetStatId = targetStatId;
            Operation = operation;
            Value = value;
            Order = order;
            ConditionId = conditionId;
            TargetFacilityIds = targetFacilityIds;
            TargetFacilityTags = targetFacilityTags;
        }

        public string SkillId { get; }
        public string EffectId { get; }
        public string DisplayName { get; }
        public string TargetStatId { get; }
        public StatOperation Operation { get; }
        public double Value { get; }
        public int Order { get; }
        public string ConditionId { get; }
        public string[] TargetFacilityIds { get; }
        public string[] TargetFacilityTags { get; }
    }

    public static class SkillEffectCatalog
    {
        private const string EffectPrefix = "effect.";
        private const string MoneySuffix = ".money_multiplier";
        private const string ScienceSuffix = ".science_multiplier";
        private const string PanelLifetimeSuffix = ".panel_lifetime";
        private const string PanelsPerSecondSuffix = ".panels_per_second";
        private const string PlanetsPerSecondSuffix = ".planets_per_second";
        private const string MoneyPerSecondSuffix = ".money_per_second";
        private const string SciencePerSecondSuffix = ".science_per_second";
        private const string ScienceBoostPerSecondSuffix = ".science_boost_per_second";
        private const string MoneyMultiUpgradePerSecondSuffix = ".money_multi_upgrade_per_second";
        private const string TinkerBotYieldSuffix = ".tinker_bot_yield";
        private const string TinkerAssemblyYieldSuffix = ".tinker_assembly_yield";
        private const string TinkerCooldownSuffix = ".tinker_cooldown";

        private static readonly FacilityModifierSpec[] FacilityModifierSpecs =
        {
            new FacilityModifierSpec("assembly_lines", StatId.AssemblyLineModifier),
            new FacilityModifierSpec("ai_managers", StatId.ManagerModifier),
            new FacilityModifierSpec("servers", StatId.ServerModifier),
            new FacilityModifierSpec("data_centers", StatId.DataCenterModifier),
            new FacilityModifierSpec("planets", StatId.PlanetModifier)
        };

        private static readonly List<SkillEffectSpec> AllEffects = BuildAll();

        public static IReadOnlyList<SkillEffectSpec> GetAll()
        {
            return AllEffects;
        }

        public static bool TryResolveDynamicValue(string effectId, EffectContext context, FacilityDefinition facility,
            FacilityState state, out double value)
        {
            value = 0;
            if (string.IsNullOrEmpty(effectId))
            {
                return false;
            }

            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVersePrestigeData prestigeData = context.PrestigeData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;
            switch (effectId)
            {
                case "effect.staying_power.assembly_lines":
                    value = infinityData != null ? 1 + 0.01f * infinityData.panelLifetime : 1;
                    return true;
                case "effect.rudimentary_singularity.data_centers":
                    value = skillTreeData != null && skillTreeData.rudimentarySingularity && infinityData != null
                        ? infinityData.rudimentrySingularityProduction
                        : 0;
                    return true;
                case "effect.parallel_computation.data_centers":
                {
                    if (skillTreeData == null || infinityData == null || !skillTreeData.parallelComputation)
                    {
                        value = 0;
                        return true;
                    }

                    double serversTotal = infinityData.servers[0] + infinityData.servers[1];
                    value = serversTotal > 1 ? 0.1f * Math.Log(serversTotal, 2) : 0;
                    return true;
                }
                case "effect.pocket_dimensions.planets":
                    value = infinityData != null && skillTreeData != null
                        ? FacilityLegacyBridge.ComputePocketDimensionsProduction(infinityData, skillTreeData)
                        : 0;
                    return true;
            }

            if (effectId.EndsWith("_modifier", StringComparison.Ordinal))
            {
                if (IsModifierSkill(effectId, "fragmentAssembly"))
                {
                    value = skillTreeData != null && skillTreeData.fragmentAssembly && skillTreeData.fragments > 4 ? 3 : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "progressiveAssembly"))
                {
                    value = skillTreeData != null && skillTreeData.progressiveAssembly ? 1 + 0.5 * skillTreeData.fragments : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "versatileProductionTactics"))
                {
                    // Check if this is the assembly_lines or planets modifier
                    if (effectId.EndsWith("assembly_lines_modifier", StringComparison.Ordinal))
                    {
                        // Assembly Lines always get 1.5x bonus
                        value = skillTreeData != null && skillTreeData.versatileProductionTactics ? 1.5 : 1;
                        return true;
                    }

                    if (effectId.EndsWith("planets_modifier", StringComparison.Ordinal))
                    {
                        // Planets get 1.5x bonus only when >= 100 planets
                        if (skillTreeData == null || infinityData == null || !skillTreeData.versatileProductionTactics)
                        {
                            value = 1;
                            return true;
                        }

                        double planetsTotal = infinityData.planets[0] +
                                              (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]);
                        value = planetsTotal >= 100 ? 1.5 : 1;
                        return true;
                    }

                    value = 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "oneMinutePlan"))
                {
                    if (skillTreeData == null || infinityData == null || !skillTreeData.oneMinutePlan)
                    {
                        value = 1;
                        return true;
                    }

                    value = infinityData.panelLifetime > 60 ? 5 : 1.5;
                    return true;
                }

                if (IsModifierSkill(effectId, "dysonSubsidies"))
                {
                    if (skillTreeData == null || infinityData == null || !skillTreeData.dysonSubsidies)
                    {
                        value = 1;
                        return true;
                    }

                    double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, true, 0);
                    value = starsSurrounded > 1 ? 2 : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "purityOfBody"))
                {
                    value = skillTreeData != null && skillTreeData.purityOfBody && skillTreeData.skillPointsTree > 0
                        ? 1.25 * skillTreeData.skillPointsTree
                        : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "clusterNetworking"))
                {
                    if (skillTreeData == null || infinityData == null || !skillTreeData.clusterNetworking)
                    {
                        value = 1;
                        return true;
                    }

                    double serversTotal = infinityData.servers[0] + infinityData.servers[1];
                    value = serversTotal > 1 ? 1 + 0.05f * Math.Log10(serversTotal) : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "parallelProcessing"))
                {
                    if (skillTreeData == null || infinityData == null || !skillTreeData.parallelProcessing)
                    {
                        value = 1;
                        return true;
                    }

                    double serversTotal = infinityData.servers[0] + infinityData.servers[1];
                    value = serversTotal > 1 ? 1 + 0.05f * Math.Log(serversTotal, 2) : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "whatWillComeToPass"))
                {
                    value = skillTreeData != null && infinityData != null && skillTreeData.whatWillComeToPass
                        ? 1 + 0.01 * infinityData.dataCenters[1]
                        : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "hypercubeNetworks"))
                {
                    if (skillTreeData == null || infinityData == null || !skillTreeData.hypercubeNetworks)
                    {
                        value = 1;
                        return true;
                    }

                    double serversTotal = infinityData.servers[0] + infinityData.servers[1];
                    value = serversTotal > 1 ? 1 + 0.1 * Math.Log10(serversTotal) : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "galacticPradigmShift"))
                {
                    if (skillTreeData == null || infinityData == null || !skillTreeData.galacticPradigmShift)
                    {
                        value = 1;
                        return true;
                    }

                    double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                    value = galaxiesEngulfed > 1 ? 3 : 1.5;
                    return true;
                }

                if (IsModifierSkill(effectId, "purityOfSEssence"))
                {
                    value = skillTreeData != null && skillTreeData.purityOfSEssence && skillTreeData.skillPointsTree > 0
                        ? 1.42 * skillTreeData.skillPointsTree
                        : 1;
                    return true;
                }

                if (IsModifierSkill(effectId, "superRadiantScattering"))
                {
                    value = skillTreeData != null && skillTreeData.superRadiantScattering
                        ? 1 + 0.01 * GetSkillTimerSeconds(infinityData, "superRadiantScattering")
                        : 1;
                    return true;
                }
            }

            if (TryResolveMoneyScienceEffects(effectId, context, out value))
            {
                return true;
            }

            if (TryResolvePanelLifetimeEffects(effectId, context, out value))
            {
                return true;
            }

            if (TryResolvePanelsPerSecondEffects(effectId, context, out value))
            {
                return true;
            }

            if (TryResolvePlanetGenerationEffects(effectId, context, out value))
            {
                return true;
            }

            if (TryResolveShouldersAccrualEffects(effectId, context, out value))
            {
                return true;
            }

            if (TryResolveTinkerEffects(effectId, context, out value))
            {
                return true;
            }

            return false;
        }

        private static List<SkillEffectSpec> BuildAll()
        {
            var specs = new List<SkillEffectSpec>();
            AddFacilityProductionEffects(specs);
            AddFacilityModifierEffects(specs);
            AddMoneyScienceEffects(specs);
            AddPanelLifetimeEffects(specs);
            AddPanelsPerSecondEffects(specs);
            AddPlanetGenerationEffects(specs);
            AddShouldersAccrualEffects(specs);
            AddTinkerEffects(specs);
            AddMoneySciencePerSecondEffects(specs);
            return specs;
        }

        private static void AddFacilityProductionEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("stayingPower", "effect.staying_power.assembly_lines", "Staying Power",
                StatId.AssemblyLineProduction, StatOperation.Multiply, 1, 20, null,
                new[] { "assembly_lines" }, null));

            specs.Add(new SkillEffectSpec("rule34", "effect.rule34.assembly_lines", "Rule 34",
                StatId.AssemblyLineProduction, StatOperation.Multiply, 2, 30, "assembly_lines_69",
                new[] { "assembly_lines" }, null));
            specs.Add(new SkillEffectSpec("rule34", "effect.rule34.ai_managers", "Rule 34",
                StatId.ManagerProduction, StatOperation.Multiply, 2, 20, "ai_managers_69",
                new[] { "ai_managers" }, null));
            specs.Add(new SkillEffectSpec("rule34", "effect.rule34.servers", "Rule 34",
                StatId.ServerProduction, StatOperation.Multiply, 2, 20, "servers_69",
                new[] { "servers" }, null));
            specs.Add(new SkillEffectSpec("rule34", "effect.rule34.data_centers", "Rule 34",
                StatId.DataCenterProduction, StatOperation.Multiply, 2, 20, "data_centers_69",
                new[] { "data_centers" }, null));
            specs.Add(new SkillEffectSpec("rule34", "effect.rule34.planets", "Rule 34",
                StatId.PlanetProduction, StatOperation.Multiply, 2, 20, "planets_69",
                new[] { "planets" }, null));

            specs.Add(new SkillEffectSpec("superchargedPower", "effect.supercharged_power.assembly_lines",
                "Supercharged Power", StatId.AssemblyLineProduction, StatOperation.Multiply, 1.5, 40, null,
                new[] { "assembly_lines" }, null));
            specs.Add(new SkillEffectSpec("superchargedPower", "effect.supercharged_power.ai_managers",
                "Supercharged Power", StatId.ManagerProduction, StatOperation.Multiply, 1.5, 30, null,
                new[] { "ai_managers" }, null));
            specs.Add(new SkillEffectSpec("superchargedPower", "effect.supercharged_power.servers",
                "Supercharged Power", StatId.ServerProduction, StatOperation.Multiply, 1.5, 30, null,
                new[] { "servers" }, null));
            specs.Add(new SkillEffectSpec("superchargedPower", "effect.supercharged_power.data_centers",
                "Supercharged Power", StatId.DataCenterProduction, StatOperation.Multiply, 1.5, 30, null,
                new[] { "data_centers" }, null));
            specs.Add(new SkillEffectSpec("superchargedPower", "effect.supercharged_power.planets",
                "Supercharged Power", StatId.PlanetProduction, StatOperation.Multiply, 1.5, 30, null,
                new[] { "planets" }, null));

            specs.Add(new SkillEffectSpec("rudimentarySingularity", "effect.rudimentary_singularity.data_centers",
                "Rudimentary Singularity", StatId.DataCenterProduction, StatOperation.Add, 0, 40, null,
                new[] { "data_centers" }, null));
            specs.Add(new SkillEffectSpec("parallelComputation", "effect.parallel_computation.data_centers",
                "Parallel Computation", StatId.DataCenterProduction, StatOperation.Add, 0, 50, null,
                new[] { "data_centers" }, null));

            specs.Add(new SkillEffectSpec("pocketDimensions", "effect.pocket_dimensions.planets",
                "Pocket Dimensions", StatId.PlanetProduction, StatOperation.Add, 0, 40, null,
                new[] { "planets" }, null));
        }

        private static void AddFacilityModifierEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("assemblyLineTree", ModifierEffectId("assemblyLineTree", "assembly_lines"),
                "Assembly Line Tree", StatId.AssemblyLineModifier, StatOperation.Multiply, 2, 20, null, null, null));
            specs.Add(new SkillEffectSpec("aiManagerTree", ModifierEffectId("aiManagerTree", "ai_managers"),
                "AI Manager Tree", StatId.ManagerModifier, StatOperation.Multiply, 2, 20, null, null, null));
            specs.Add(new SkillEffectSpec("serverTree", ModifierEffectId("serverTree", "servers"),
                "Server Tree", StatId.ServerModifier, StatOperation.Multiply, 2, 20, null, null, null));
            specs.Add(new SkillEffectSpec("dataCenterTree", ModifierEffectId("dataCenterTree", "data_centers"),
                "Data Center Tree", StatId.DataCenterModifier, StatOperation.Multiply, 2, 20, null, null, null));
            specs.Add(new SkillEffectSpec("planetsTree", ModifierEffectId("planetsTree", "planets"),
                "Planets Tree", StatId.PlanetModifier, StatOperation.Multiply, 2, 20, null, null, null));

            AddModifierToAll(specs, "fragmentAssembly", "Fragment Assembly", StatOperation.Multiply, 1, 30);
            AddModifierToAll(specs, "tasteOfPower", "Taste Of Power", StatOperation.Multiply, 1.5, 60);
            AddModifierToAll(specs, "indulgingInPower", "Indulging In Power", StatOperation.Multiply, 2, 70);
            AddModifierToAll(specs, "addictionToPower", "Addiction To Power", StatOperation.Multiply, 3, 80);

            AddModifierToAll(specs, "purityOfSEssence", "Purity Of Essence", StatOperation.Multiply, 1, 40);
            AddModifierToAll(specs, "superRadiantScattering", "Super Radiant Scattering", StatOperation.Multiply, 1, 45);

            specs.Add(new SkillEffectSpec("progressiveAssembly",
                ModifierEffectId("progressiveAssembly", "assembly_lines"), "Progressive Assembly",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 1, 65, null, null, null));
            specs.Add(new SkillEffectSpec("worthySacrifice",
                ModifierEffectId("worthySacrifice", "assembly_lines"), "Worthy Sacrifice",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 2.5, 70, null, null, null));
            specs.Add(new SkillEffectSpec("endOfTheLine",
                ModifierEffectId("endOfTheLine", "assembly_lines"), "End Of The Line",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 5, 75, null, null, null));
            specs.Add(new SkillEffectSpec("endOfTheLine",
                ModifierEffectId("endOfTheLine", "planets"), "End Of The Line",
                StatId.PlanetModifier, StatOperation.Multiply, 0.5, 75, null, null, null));
            specs.Add(new SkillEffectSpec("versatileProductionTactics",
                ModifierEffectId("versatileProductionTactics", "assembly_lines"), "Versatile Production Tactics",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 1, 62, null, null, null));
            specs.Add(new SkillEffectSpec("versatileProductionTactics",
                ModifierEffectId("versatileProductionTactics", "planets"), "Versatile Production Tactics",
                StatId.PlanetModifier, StatOperation.Multiply, 1, 62, null, null, null));
            specs.Add(new SkillEffectSpec("oneMinutePlan",
                ModifierEffectId("oneMinutePlan", "assembly_lines"), "One Minute Plan",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 1, 63, null, null, null));
            specs.Add(new SkillEffectSpec("dysonSubsidies",
                ModifierEffectId("dysonSubsidies", "assembly_lines"), "Dyson Subsidies",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 1, 90, null, null, null));
            specs.Add(new SkillEffectSpec("purityOfBody",
                ModifierEffectId("purityOfBody", "assembly_lines"), "Purity Of Body",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 1, 95, null, null, null));

            specs.Add(new SkillEffectSpec("agressiveAlgorithms",
                ModifierEffectId("agressiveAlgorithms", "assembly_lines"), "Aggressive Algorithms",
                StatId.AssemblyLineModifier, StatOperation.Multiply, 3, 85, null, null, null));
            specs.Add(new SkillEffectSpec("agressiveAlgorithms",
                ModifierEffectId("agressiveAlgorithms", "ai_managers"), "Aggressive Algorithms",
                StatId.ManagerModifier, StatOperation.Multiply, 3, 85, null, null, null));
            specs.Add(new SkillEffectSpec("agressiveAlgorithms",
                ModifierEffectId("agressiveAlgorithms", "servers"), "Aggressive Algorithms",
                StatId.ServerModifier, StatOperation.Multiply, 3, 85, null, null, null));
            specs.Add(new SkillEffectSpec("agressiveAlgorithms",
                ModifierEffectId("agressiveAlgorithms", "data_centers"), "Aggressive Algorithms",
                StatId.DataCenterModifier, StatOperation.Multiply, 1.0 / 3.0, 85, null, null, null));
            specs.Add(new SkillEffectSpec("agressiveAlgorithms",
                ModifierEffectId("agressiveAlgorithms", "planets"), "Aggressive Algorithms",
                StatId.PlanetModifier, StatOperation.Multiply, 1.0 / 3.0, 85, null, null, null));

            specs.Add(new SkillEffectSpec("clusterNetworking",
                ModifierEffectId("clusterNetworking", "servers"), "Cluster Networking",
                StatId.ServerModifier, StatOperation.Multiply, 1, 86, null, null, null));
            specs.Add(new SkillEffectSpec("parallelProcessing",
                ModifierEffectId("parallelProcessing", "servers"), "Parallel Processing",
                StatId.ServerModifier, StatOperation.Multiply, 1, 91, null, null, null));

            specs.Add(new SkillEffectSpec("whatWillComeToPass",
                ModifierEffectId("whatWillComeToPass", "data_centers"), "What Will Come To Pass",
                StatId.DataCenterModifier, StatOperation.Multiply, 1, 66, null, null, null));
            specs.Add(new SkillEffectSpec("hypercubeNetworks",
                ModifierEffectId("hypercubeNetworks", "data_centers"), "Hypercube Networks",
                StatId.DataCenterModifier, StatOperation.Multiply, 1, 67, null, null, null));

            specs.Add(new SkillEffectSpec("galacticPradigmShift",
                ModifierEffectId("galacticPradigmShift", "planets"), "Galactic Paradigm Shift",
                StatId.PlanetModifier, StatOperation.Multiply, 1, 66, null, null, null));
            specs.Add(new SkillEffectSpec("dimensionalCatCables",
                ModifierEffectId("dimensionalCatCables", "planets"), "Dimensional Cat Cables",
                StatId.PlanetModifier, StatOperation.Multiply, 0.75, 70, null, null, null));
        }

        private static void AddMoneyScienceEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("startHereTree", EffectId("startHereTree", MoneySuffix),
                "Start Here", StatId.MoneyMultiplier, StatOperation.Multiply, 1.2, 20, null, null, null));
            specs.Add(new SkillEffectSpec("startHereTree", EffectId("startHereTree", ScienceSuffix),
                "Start Here", StatId.ScienceMultiplier, StatOperation.Multiply, 1.2, 20, null, null, null));

            specs.Add(new SkillEffectSpec("regulatedAcademia", EffectId("regulatedAcademia", MoneySuffix),
                "Regulated Academia", StatId.MoneyMultiplier, StatOperation.Add, 0, 5, null, null, null));
            specs.Add(new SkillEffectSpec("regulatedAcademia", EffectId("regulatedAcademia", ScienceSuffix),
                "Regulated Academia", StatId.ScienceMultiplier, StatOperation.Add, 0, 5, null, null, null));

            specs.Add(new SkillEffectSpec("doubleScienceTree", EffectId("doubleScienceTree", ScienceSuffix),
                "Double Science", StatId.ScienceMultiplier, StatOperation.Multiply, 2, 25, null, null, null));
            specs.Add(new SkillEffectSpec("producedAsScienceTree", EffectId("producedAsScienceTree", ScienceSuffix),
                "Produced As Science", StatId.ScienceMultiplier, StatOperation.Multiply, 1, 26, null, null, null));

            specs.Add(new SkillEffectSpec("economicRevolution", EffectId("economicRevolution", MoneySuffix),
                "Economic Revolution", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 30, null, null, null));
            specs.Add(new SkillEffectSpec("scientificRevolution", EffectId("scientificRevolution", ScienceSuffix),
                "Scientific Revolution", StatId.ScienceMultiplier, StatOperation.Multiply, 1, 30, null, null, null));

            specs.Add(new SkillEffectSpec("superchargedPower", EffectId("superchargedPower", MoneySuffix),
                "Supercharged Power", StatId.MoneyMultiplier, StatOperation.Multiply, 1.5, 40, null, null, null));
            specs.Add(new SkillEffectSpec("superchargedPower", EffectId("superchargedPower", ScienceSuffix),
                "Supercharged Power", StatId.ScienceMultiplier, StatOperation.Multiply, 1.5, 40, null, null, null));

            specs.Add(new SkillEffectSpec("higgsBoson", EffectId("higgsBoson", MoneySuffix),
                "Higgs Boson", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 42, null, null, null));
            specs.Add(new SkillEffectSpec("workerBoost", EffectId("workerBoost", MoneySuffix),
                "Worker Boost", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 45, null, null, null));

            specs.Add(new SkillEffectSpec("economicDominance", EffectId("economicDominance", MoneySuffix),
                "Economic Dominance", StatId.MoneyMultiplier, StatOperation.Multiply, 20, 55, null, null, null));
            specs.Add(new SkillEffectSpec("economicDominance", EffectId("economicDominance", ScienceSuffix),
                "Economic Dominance", StatId.ScienceMultiplier, StatOperation.Multiply, 0.25, 55, null, null, null));
            specs.Add(new SkillEffectSpec("scientificDominance", EffectId("scientificDominance", ScienceSuffix),
                "Scientific Dominance", StatId.ScienceMultiplier, StatOperation.Multiply, 20, 55, null, null, null));
            specs.Add(new SkillEffectSpec("scientificDominance", EffectId("scientificDominance", MoneySuffix),
                "Scientific Dominance", StatId.MoneyMultiplier, StatOperation.Multiply, 0.25, 55, null, null, null));

            specs.Add(new SkillEffectSpec("renegade", EffectId("renegade", MoneySuffix),
                "Renegade", StatId.MoneyMultiplier, StatOperation.Multiply, 50, 60, null, null, null));
            specs.Add(new SkillEffectSpec("paragon", EffectId("paragon", ScienceSuffix),
                "Paragon", StatId.ScienceMultiplier, StatOperation.Multiply, 50, 60, null, null, null));

            specs.Add(new SkillEffectSpec("shouldersOfTheRevolution", EffectId("shouldersOfTheRevolution", MoneySuffix),
                "Shoulders Of The Revolution", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 62, null, null,
                null));
            specs.Add(new SkillEffectSpec("shouldersOfPrecursors", EffectId("shouldersOfPrecursors", MoneySuffix),
                "Shoulders Of Precursors", StatId.MoneyMultiplier, StatOperation.Override, 0, 200, null, null, null));
            specs.Add(new SkillEffectSpec("dysonSubsidies", EffectId("dysonSubsidies", MoneySuffix),
                "Dyson Subsidies", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 64, null, null, null));

            specs.Add(new SkillEffectSpec("purityOfMind", EffectId("purityOfMind", MoneySuffix),
                "Purity Of Mind", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 66, null, null, null));
            specs.Add(new SkillEffectSpec("purityOfMind", EffectId("purityOfMind", ScienceSuffix),
                "Purity Of Mind", StatId.ScienceMultiplier, StatOperation.Multiply, 1, 66, null, null, null));

            specs.Add(new SkillEffectSpec("monetaryPolicy", EffectId("monetaryPolicy", MoneySuffix),
                "Monetary Policy", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 67, null, null, null));

            specs.Add(new SkillEffectSpec("tasteOfPower", EffectId("tasteOfPower", MoneySuffix),
                "Power Tradeoff", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 70, null, null, null));
            specs.Add(new SkillEffectSpec("tasteOfPower", EffectId("tasteOfPower", ScienceSuffix),
                "Power Tradeoff", StatId.ScienceMultiplier, StatOperation.Multiply, 1, 70, null, null, null));

            specs.Add(new SkillEffectSpec("fusionReactors", EffectId("fusionReactors", MoneySuffix),
                "Fusion Reactors", StatId.MoneyMultiplier, StatOperation.Multiply, 0.75, 72, null, null, null));
            specs.Add(new SkillEffectSpec("coldFusion", EffectId("coldFusion", MoneySuffix),
                "Cold Fusion", StatId.MoneyMultiplier, StatOperation.Multiply, 0.5, 73, null, null, null));
            specs.Add(new SkillEffectSpec("coldFusion", EffectId("coldFusion", ScienceSuffix),
                "Cold Fusion", StatId.ScienceMultiplier, StatOperation.Multiply, 10, 73, null, null, null));

            specs.Add(new SkillEffectSpec("stellarObliteration", EffectId("stellarObliteration", MoneySuffix),
                "Stellar Obliteration", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 80, null, null, null));
            specs.Add(new SkillEffectSpec("stellarObliteration", EffectId("stellarObliteration", ScienceSuffix),
                "Stellar Obliteration", StatId.ScienceMultiplier, StatOperation.Multiply, 1, 80, null, null, null));
            specs.Add(new SkillEffectSpec("stellarDominance", EffectId("stellarDominance", MoneySuffix),
                "Stellar Dominance", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 85, null, null, null));

            specs.Add(new SkillEffectSpec("purityOfSEssence", EffectId("purityOfSEssence", MoneySuffix),
                "Purity Of Essence", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 18, null, null, null));
            specs.Add(new SkillEffectSpec("purityOfSEssence", EffectId("purityOfSEssence", ScienceSuffix),
                "Purity Of Essence", StatId.ScienceMultiplier, StatOperation.Multiply, 1, 18, null, null, null));
            specs.Add(new SkillEffectSpec("superRadiantScattering", EffectId("superRadiantScattering", MoneySuffix),
                "Super Radiant Scattering", StatId.MoneyMultiplier, StatOperation.Multiply, 1, 19, null, null, null));
            specs.Add(new SkillEffectSpec("superRadiantScattering", EffectId("superRadiantScattering", ScienceSuffix),
                "Super Radiant Scattering", StatId.ScienceMultiplier, StatOperation.Multiply, 1, 19, null, null, null));

            specs.Add(new SkillEffectSpec("idleSpaceFlight", EffectId("idleSpaceFlight", ScienceSuffix),
                "Idle Space Flight", StatId.ScienceMultiplier, StatOperation.Add, 0, 15, null, null, null));
        }

        private static void AddPanelLifetimeEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("panelMaintenance", EffectId("panelMaintenance", PanelLifetimeSuffix),
                "Panel Maintenance", StatId.PanelLifetime, StatOperation.Add, 0, 10, null, null, null));
            specs.Add(new SkillEffectSpec("panelWarranty", EffectId("panelWarranty", PanelLifetimeSuffix),
                "Panel Warranty", StatId.PanelLifetime, StatOperation.Add, 0, 11, null, null, null));
            specs.Add(new SkillEffectSpec("panelLifetime20Tree", EffectId("panelLifetime20Tree", PanelLifetimeSuffix),
                "Panel Lifetime +20", StatId.PanelLifetime, StatOperation.Add, 20, 12, null, null, null));
            specs.Add(new SkillEffectSpec("burnOut", EffectId("burnOut", PanelLifetimeSuffix),
                "Burn Out", StatId.PanelLifetime, StatOperation.Add, -5, 13, null, null, null));
            specs.Add(new SkillEffectSpec("artificiallyEnhancedPanels",
                EffectId("artificiallyEnhancedPanels", PanelLifetimeSuffix),
                "Artificially Enhanced Panels", StatId.PanelLifetime, StatOperation.Add, 0, 14, null, null, null));
            specs.Add(new SkillEffectSpec("androids", EffectId("androids", PanelLifetimeSuffix),
                "Androids", StatId.PanelLifetime, StatOperation.Add, 0, 15, null, null, null));
            specs.Add(new SkillEffectSpec("shepherd", EffectId("shepherd", PanelLifetimeSuffix),
                "Shepherd", StatId.PanelLifetime, StatOperation.Add, 600, 16, null, null, null));
            specs.Add(new SkillEffectSpec("citadelCouncil", EffectId("citadelCouncil", PanelLifetimeSuffix),
                "Citadel Council", StatId.PanelLifetime, StatOperation.Add, 0, 17, null, null, null));
            specs.Add(new SkillEffectSpec("renewableEnergy", EffectId("renewableEnergy", PanelLifetimeSuffix),
                "Renewable Energy", StatId.PanelLifetime, StatOperation.Multiply, 1, 60, null, null, null));
            specs.Add(new SkillEffectSpec("stellarDominance", EffectId("stellarDominance", PanelLifetimeSuffix),
                "Stellar Dominance", StatId.PanelLifetime, StatOperation.Multiply, 1, 65, null, null, null));
            specs.Add(new SkillEffectSpec("worthySacrifice", EffectId("worthySacrifice", PanelLifetimeSuffix),
                "Worthy Sacrifice", StatId.PanelLifetime, StatOperation.Multiply, 0.5, 70, null, null, null));
        }

        private static void AddPanelsPerSecondEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("burnOut", EffectId("burnOut", PanelsPerSecondSuffix),
                "Burn Out", StatId.PanelsPerSecond, StatOperation.Multiply, 3, 20, null, null, null));
            specs.Add(new SkillEffectSpec("workerEfficiencyTree", EffectId("workerEfficiencyTree", PanelsPerSecondSuffix),
                "Worker Efficiency", StatId.PanelsPerSecond, StatOperation.Multiply, 2, 25, null, null, null));
            specs.Add(new SkillEffectSpec("reapers", EffectId("reapers", PanelsPerSecondSuffix),
                "Reapers", StatId.PanelsPerSecond, StatOperation.Multiply, 1, 30, null, null, null));
            specs.Add(new SkillEffectSpec("rocketMania", EffectId("rocketMania", PanelsPerSecondSuffix),
                "Rocket Mania", StatId.PanelsPerSecond, StatOperation.Multiply, 1, 35, null, null, null));
            specs.Add(new SkillEffectSpec("saren", EffectId("saren", PanelsPerSecondSuffix),
                "Saren", StatId.PanelsPerSecond, StatOperation.Multiply, 40, 40, null, null, null));
            specs.Add(new SkillEffectSpec("fusionReactors", EffectId("fusionReactors", PanelsPerSecondSuffix),
                "Fusion Reactors", StatId.PanelsPerSecond, StatOperation.Multiply, 5, 45, null, null, null));
        }

        private static void AddPlanetGenerationEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("scientificPlanets", EffectId("scientificPlanets", PlanetsPerSecondSuffix),
                "Scientific Planets", StatId.PlanetsPerSecond, StatOperation.Add, 0, 10, null, null, null));
            specs.Add(new SkillEffectSpec("planetAssembly", EffectId("planetAssembly", PlanetsPerSecondSuffix),
                "Planet Assembly", StatId.PlanetsPerSecond, StatOperation.Add, 0, 20, null, null, null));
            specs.Add(new SkillEffectSpec("shellWorlds", EffectId("shellWorlds", PlanetsPerSecondSuffix),
                "Shell Worlds", StatId.PlanetsPerSecond, StatOperation.Add, 0, 30, null, null, null));
            specs.Add(new SkillEffectSpec("stellarSacrifices", EffectId("stellarSacrifices", PlanetsPerSecondSuffix),
                "Stellar Sacrifices", StatId.PlanetsPerSecond, StatOperation.Add, 0, 40, null, null, null));
            specs.Add(new SkillEffectSpec("shouldersOfTheFallen",
                EffectId("shouldersOfTheFallen", PlanetsPerSecondSuffix),
                "Shoulders Of The Fallen", StatId.PlanetsPerSecond, StatOperation.Add, 0, 45, null, null, null));
        }

        private static void AddShouldersAccrualEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("shouldersOfGiants", EffectId("shouldersOfGiants", ScienceBoostPerSecondSuffix),
                "Shoulders Of Giants", StatId.ScienceBoostPerSecond, StatOperation.Add, 0, 10, null, null, null));
            specs.Add(new SkillEffectSpec("whatCouldHaveBeen",
                EffectId("whatCouldHaveBeen", ScienceBoostPerSecondSuffix),
                "What Could Have Been", StatId.ScienceBoostPerSecond, StatOperation.Add, 0, 20, null, null, null));
            specs.Add(new SkillEffectSpec("shouldersOfTheEnlightened",
                EffectId("shouldersOfTheEnlightened", MoneyMultiUpgradePerSecondSuffix),
                "Shoulders Of The Enlightened", StatId.MoneyMultiUpgradePerSecond, StatOperation.Add, 0, 10, null,
                null, null));
        }

        private static void AddTinkerEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("manualLabour", EffectId("manualLabour", TinkerAssemblyYieldSuffix),
                "Manual Labour", StatId.TinkerAssemblyYield, StatOperation.Add, 0, 10, null, null, null));
            specs.Add(new SkillEffectSpec("versatileProductionTactics",
                EffectId("versatileProductionTactics", TinkerAssemblyYieldSuffix), "Versatile Production Tactics",
                StatId.TinkerAssemblyYield, StatOperation.Multiply, 1, 20, null, null, null));
        }

        private static void AddMoneySciencePerSecondEffects(List<SkillEffectSpec> specs)
        {
            specs.Add(new SkillEffectSpec("powerOverwhelming", EffectId("powerOverwhelming", MoneyPerSecondSuffix),
                "Power Overwhelming", StatId.MoneyPerSecond, StatOperation.Power, 1.03, 100, null, null, null));
            specs.Add(new SkillEffectSpec("powerUnderwhelming", EffectId("powerUnderwhelming", SciencePerSecondSuffix),
                "Power Underwhelming", StatId.SciencePerSecond, StatOperation.Power, 1.05, 100, null, null, null));
        }

        private static bool TryResolveMoneyScienceEffects(string effectId, EffectContext context, out double value)
        {
            value = 0;
            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVersePrestigeData prestigeData = context.PrestigeData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;
            PrestigePlus prestigePlus = context.PrestigePlus;

            if (effectId.EndsWith(MoneySuffix, StringComparison.Ordinal))
            {
                string skillId = ExtractSkillId(effectId, MoneySuffix);
                if (string.IsNullOrEmpty(skillId))
                {
                    return false;
                }

                switch (skillId)
                {
                    case "regulatedAcademia":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.regulatedAcademia)
                        {
                            value = 0;
                            return true;
                        }

                        double moneyBoost = infinityData.moneyMultiUpgradeOwned * infinityData.moneyMultiUpgradePercent;
                        double factor = 1.02 + 1.01 * (skillTreeData.fragments - 1);
                        value = moneyBoost * (factor - 1);
                        return true;
                    case "economicRevolution":
                        if (skillTreeData == null || prestigeData == null || prestigePlus == null || !skillTreeData.economicRevolution)
                        {
                            value = 1;
                            return true;
                        }

                        value = prestigeData.botDistribution <= 0.5f || prestigePlus.botMultitasking ? 5 : 1;
                        return true;
                    case "higgsBoson":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.higgsBoson)
                        {
                            value = 1;
                            return true;
                        }

                        double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                        value = galaxiesEngulfed >= 1 ? 1 + 0.1 * galaxiesEngulfed : 1;
                        return true;
                    case "workerBoost":
                        if (skillTreeData == null || prestigeData == null || prestigePlus == null || !skillTreeData.workerBoost)
                        {
                            value = 1;
                            return true;
                        }

                        value = prestigePlus.botMultitasking ? 100 : (1 - prestigeData.botDistribution) * 100;
                        return true;
                    case "shouldersOfTheRevolution":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.shouldersOfTheRevolution)
                        {
                            value = 1;
                            return true;
                        }

                        value = 1 + 0.01 * infinityData.scienceBoostOwned;
                        return true;
                    case "shouldersOfPrecursors":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.shouldersOfPrecursors)
                        {
                            value = 1;
                            return true;
                        }

                        value = infinityData.scienceMulti;
                        return true;
                    case "dysonSubsidies":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.dysonSubsidies)
                        {
                            value = 1;
                            return true;
                        }

                        double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, true, 0);
                        value = starsSurrounded < 1 ? 3 : 1;
                        return true;
                    case "purityOfMind":
                        value = skillTreeData != null && skillTreeData.purityOfMind && skillTreeData.skillPointsTree > 0
                            ? 1.5 * skillTreeData.skillPointsTree
                            : 1;
                        return true;
                    case "monetaryPolicy":
                        value = skillTreeData != null && skillTreeData.monetaryPolicy
                            ? 1 + 0.75 * skillTreeData.fragments
                            : 1;
                        return true;
                    case "tasteOfPower":
                        if (skillTreeData == null || !skillTreeData.tasteOfPower)
                        {
                            value = 1;
                            return true;
                        }

                        value = skillTreeData.indulgingInPower ? skillTreeData.addictionToPower ? 0.5 : 0.6 : 0.75;
                        return true;
                    case "stellarObliteration":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.stellarObliteration)
                        {
                            value = 1;
                            return true;
                        }

                        double galaxiesEngulfedFloor = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                        if (galaxiesEngulfedFloor < 1)
                        {
                            value = 1;
                            return true;
                        }

                        double galaxiesEngulfedRaw = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
                        value = galaxiesEngulfedRaw > 0 ? 1 / galaxiesEngulfedRaw : 1;
                        return true;
                    case "stellarDominance":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.stellarDominance)
                        {
                            value = 1;
                            return true;
                        }

                        double stars = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
                        double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, stars);
                        value = infinityData.bots > botsRequired ? 0.01 : 1;
                        return true;
                    case "purityOfSEssence":
                        value = skillTreeData != null && skillTreeData.purityOfSEssence && skillTreeData.skillPointsTree > 0
                            ? 1.42 * skillTreeData.skillPointsTree
                            : 1;
                        return true;
                    case "superRadiantScattering":
                        value = skillTreeData != null && skillTreeData.superRadiantScattering
                            ? 1 + 0.01 * GetSkillTimerSeconds(infinityData, "superRadiantScattering")
                            : 1;
                        return true;
                    default:
                        return false;
                }
            }

            if (effectId.EndsWith(ScienceSuffix, StringComparison.Ordinal))
            {
                string skillId = ExtractSkillId(effectId, ScienceSuffix);
                if (string.IsNullOrEmpty(skillId))
                {
                    return false;
                }

                switch (skillId)
                {
                    case "regulatedAcademia":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.regulatedAcademia)
                        {
                            value = 0;
                            return true;
                        }

                        double scienceBoost = infinityData.scienceBoostOwned * infinityData.scienceBoostPercent;
                        double factor = 1.02 + 1.01 * (skillTreeData.fragments - 1);
                        value = scienceBoost * (factor - 1);
                        return true;
                    case "producedAsScienceTree":
                        if (skillTreeData == null || prestigeData == null || prestigePlus == null || !skillTreeData.producedAsScienceTree)
                        {
                            value = 1;
                            return true;
                        }

                        value = prestigePlus.botMultitasking ? 100 : prestigeData.botDistribution * 100;
                        return true;
                    case "idleSpaceFlight":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.idleSpaceFlight)
                        {
                            value = 0;
                            return true;
                        }

                        value = 0.01 * (infinityData.panelsPerSec * infinityData.panelLifetime) / 100000000;
                        return true;
                    case "scientificRevolution":
                        if (skillTreeData == null || prestigeData == null || prestigePlus == null || !skillTreeData.scientificRevolution)
                        {
                            value = 1;
                            return true;
                        }

                        value = prestigeData.botDistribution >= 0.5f || prestigePlus.botMultitasking ? 5 : 1;
                        return true;
                    case "purityOfMind":
                        value = skillTreeData != null && skillTreeData.purityOfMind && skillTreeData.skillPointsTree > 0
                            ? 1.5 * skillTreeData.skillPointsTree
                            : 1;
                        return true;
                    case "tasteOfPower":
                        if (skillTreeData == null || !skillTreeData.tasteOfPower)
                        {
                            value = 1;
                            return true;
                        }

                        value = skillTreeData.indulgingInPower ? skillTreeData.addictionToPower ? 0.5 : 0.6 : 0.75;
                        return true;
                    case "stellarObliteration":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.stellarObliteration)
                        {
                            value = 1;
                            return true;
                        }

                        double galaxiesEngulfedFloor = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                        if (galaxiesEngulfedFloor < 1)
                        {
                            value = 1;
                            return true;
                        }

                        double galaxiesEngulfedRaw = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
                        value = galaxiesEngulfedRaw > 0 ? 1 / galaxiesEngulfedRaw : 1;
                        return true;
                    case "purityOfSEssence":
                        value = skillTreeData != null && skillTreeData.purityOfSEssence && skillTreeData.skillPointsTree > 0
                            ? 1.42 * skillTreeData.skillPointsTree
                            : 1;
                        return true;
                    case "superRadiantScattering":
                        value = skillTreeData != null && skillTreeData.superRadiantScattering
                            ? 1 + 0.01 * GetSkillTimerSeconds(infinityData, "superRadiantScattering")
                            : 1;
                        return true;
                    default:
                        return false;
                }
            }

            return false;
        }

        private static bool TryResolvePanelLifetimeEffects(string effectId, EffectContext context, out double value)
        {
            value = 0;
            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVersePrestigeData prestigeData = context.PrestigeData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;
            PrestigePlus prestigePlus = context.PrestigePlus;

            if (!effectId.EndsWith(PanelLifetimeSuffix, StringComparison.Ordinal))
            {
                return false;
            }

            string skillId = ExtractSkillId(effectId, PanelLifetimeSuffix);
            if (string.IsNullOrEmpty(skillId))
            {
                return false;
            }

            switch (skillId)
            {
                case "panelMaintenance":
                    if (skillTreeData == null || prestigeData == null || prestigePlus == null || !skillTreeData.panelMaintenance)
                    {
                        value = 0;
                        return true;
                    }

                    value = prestigePlus.botMultitasking ? 100 : (1 - prestigeData.botDistribution) * 100;
                    return true;
                case "panelWarranty":
                    if (skillTreeData == null || !skillTreeData.panelWarranty)
                    {
                        value = 0;
                        return true;
                    }

                    bool warranty = 5 * skillTreeData.fragments > 1;
                    value = warranty ? Math.Pow(2, skillTreeData.fragments - 1) : 1;
                    return true;
                case "artificiallyEnhancedPanels":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.artificiallyEnhancedPanels)
                    {
                        value = 0;
                        return true;
                    }

                    double managersTotal = infinityData.managers[0] + infinityData.managers[1];
                    value = managersTotal >= 1 ? 5 * Math.Log10(managersTotal) : 0;
                    return true;
                case "androids":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.androids)
                    {
                        value = 0;
                        return true;
                    }

                    double androidsTimer = GetSkillTimerSeconds(infinityData, "androids");
                    value = Math.Floor(androidsTimer > 600 ? 200 : androidsTimer / 3);
                    return true;
                case "renewableEnergy":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.renewableEnergy)
                    {
                        value = 1;
                        return true;
                    }

                    value = infinityData.workers >= 1e7f ? 1 + 0.1 * Math.Log10(infinityData.workers / 1e6f) : 1;
                    return true;
                case "citadelCouncil":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.citadelCouncil)
                    {
                        value = 0;
                        return true;
                    }

                    value = infinityData.totalPanelsDecayed > 1 ? Math.Log(infinityData.totalPanelsDecayed, 1.2) : 0;
                    return true;
                case "stellarDominance":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.stellarDominance)
                    {
                        value = 1;
                        return true;
                    }

                    double stars = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
                    double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, stars);
                    value = infinityData.bots > botsRequired ? 10 : 1;
                    return true;
                default:
                    return false;
            }
        }

        private static bool TryResolvePanelsPerSecondEffects(string effectId, EffectContext context, out double value)
        {
            value = 0;
            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;

            if (!effectId.EndsWith(PanelsPerSecondSuffix, StringComparison.Ordinal))
            {
                return false;
            }

            string skillId = ExtractSkillId(effectId, PanelsPerSecondSuffix);
            if (string.IsNullOrEmpty(skillId))
            {
                return false;
            }

            switch (skillId)
            {
                case "reapers":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.reapers)
                    {
                        value = 1;
                        return true;
                    }

                    value = infinityData.totalPanelsDecayed > 2
                        ? 1 + Math.Log(infinityData.totalPanelsDecayed, 2) / 10
                        : 1;
                    return true;
                case "rocketMania":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.rocketMania)
                    {
                        value = 1;
                        return true;
                    }

                    value = infinityData.panelsPerSec > 20 ? Math.Log(infinityData.panelsPerSec, 20) : 1;
                    return true;
                default:
                    return false;
            }
        }

        private static bool TryResolvePlanetGenerationEffects(string effectId, EffectContext context, out double value)
        {
            value = 0;
            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;

            if (!effectId.EndsWith(PlanetsPerSecondSuffix, StringComparison.Ordinal))
            {
                return false;
            }

            string skillId = ExtractSkillId(effectId, PlanetsPerSecondSuffix);
            if (string.IsNullOrEmpty(skillId))
            {
                return false;
            }

            switch (skillId)
            {
                case "scientificPlanets":
                    value = infinityData != null && skillTreeData != null
                        ? FacilityLegacyBridge.ComputeScientificPlanetsProduction(infinityData, skillTreeData)
                        : 0;
                    return true;
                case "planetAssembly":
                    value = infinityData != null && skillTreeData != null
                        ? FacilityLegacyBridge.ComputePlanetAssemblyProduction(infinityData, skillTreeData)
                        : 0;
                    return true;
                case "shellWorlds":
                    value = infinityData != null && skillTreeData != null
                        ? FacilityLegacyBridge.ComputeShellWorldsProduction(infinityData, skillTreeData)
                        : 0;
                    return true;
                case "stellarSacrifices":
                    value = infinityData != null && skillTreeData != null
                        ? FacilityLegacyBridge.ComputeStellarSacrificesProduction(infinityData, skillTreeData)
                        : 0;
                    return true;
                case "shouldersOfTheFallen":
                    if (skillTreeData == null || infinityData == null || !skillTreeData.shouldersOfTheFallen || infinityData.scienceBoostOwned <= 0 ||
                        !skillTreeData.scientificPlanets)
                    {
                        value = 0;
                        return true;
                    }

                    value = Math.Log(infinityData.scienceBoostOwned, 2);
                    return true;
                default:
                    return false;
            }
        }

        private static bool TryResolveShouldersAccrualEffects(string effectId, EffectContext context, out double value)
        {
            value = 0;
            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVersePrestigeData prestigeData = context.PrestigeData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;

            if (effectId.EndsWith(ScienceBoostPerSecondSuffix, StringComparison.Ordinal))
            {
                string skillId = ExtractSkillId(effectId, ScienceBoostPerSecondSuffix);
                if (string.IsNullOrEmpty(skillId))
                {
                    return false;
                }

                switch (skillId)
                {
                    case "shouldersOfGiants":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.shouldersOfGiants || !skillTreeData.scientificPlanets)
                        {
                            value = 0;
                            return true;
                        }

                        value = ComputeScientificPlanetsWithShouldersBonus(infinityData, skillTreeData);
                        return true;
                    case "whatCouldHaveBeen":
                        if (skillTreeData == null || infinityData == null || prestigeData == null || !skillTreeData.whatCouldHaveBeen ||
                            !skillTreeData.shouldersOfGiants || !skillTreeData.scientificPlanets)
                        {
                            value = 0;
                            return true;
                        }

                        value = ComputePocketDimensionsWithShoulderSurgery(infinityData, skillTreeData);
                        return true;
                    default:
                        return false;
                }
            }

            if (effectId.EndsWith(MoneyMultiUpgradePerSecondSuffix, StringComparison.Ordinal))
            {
                string skillId = ExtractSkillId(effectId, MoneyMultiUpgradePerSecondSuffix);
                if (string.IsNullOrEmpty(skillId))
                {
                    return false;
                }

                switch (skillId)
                {
                    case "shouldersOfTheEnlightened":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.shouldersOfTheEnlightened || !skillTreeData.scientificPlanets)
                        {
                            value = 0;
                            return true;
                        }

                        value = ComputeScientificPlanetsWithShouldersBonus(infinityData, skillTreeData);
                        return true;
                    default:
                        return false;
                }
            }

            return false;
        }

        private static bool TryResolveTinkerEffects(string effectId, EffectContext context, out double value)
        {
            value = 0;
            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;

            if (effectId.EndsWith(TinkerAssemblyYieldSuffix, StringComparison.Ordinal))
            {
                string skillId = ExtractSkillId(effectId, TinkerAssemblyYieldSuffix);
                if (string.IsNullOrEmpty(skillId))
                {
                    return false;
                }

                switch (skillId)
                {
                    case "manualLabour":
                        if (skillTreeData == null || infinityData == null || !skillTreeData.manualLabour)
                        {
                            value = 0;
                            return true;
                        }

                        double manualLabourAmount = (infinityData.assemblyLines[0] + infinityData.assemblyLines[1]) / 50;
                        double managerProduction = infinityData.managerAssemblyLineProduction * 20;
                        value = Math.Min(manualLabourAmount, managerProduction);
                        return true;
                    case "versatileProductionTactics":
                        if (skillTreeData == null || !skillTreeData.versatileProductionTactics)
                        {
                            value = 1;
                            return true;
                        }

                        value = 1.5;
                        return true;
                    default:
                        return false;
                }
            }

            if (effectId.EndsWith(TinkerBotYieldSuffix, StringComparison.Ordinal))
            {
                return false;
            }

            if (effectId.EndsWith(TinkerCooldownSuffix, StringComparison.Ordinal))
            {
                return false;
            }

            return false;
        }

        private static double ComputeScientificPlanetsWithShouldersBonus(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData)
        {
            double production = FacilityLegacyBridge.ComputeScientificPlanetsProduction(infinityData, skillTreeData);
            if (skillTreeData.shouldersOfTheFallen && infinityData.scienceBoostOwned > 0)
            {
                production += Math.Log(infinityData.scienceBoostOwned, 2);
            }

            return production;
        }

        private static double ComputePocketDimensionsWithShoulderSurgery(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData)
        {
            double production = FacilityLegacyBridge.ComputePocketDimensionsProduction(infinityData, skillTreeData);
            if (skillTreeData.shouldersOfTheFallen && skillTreeData.shoulderSurgery && infinityData.scienceBoostOwned > 0)
            {
                production += Math.Log(infinityData.scienceBoostOwned, 2);
            }

            return production;
        }

        private static bool IsModifierSkill(string effectId, string skillId)
        {
            return effectId.StartsWith($"{EffectPrefix}{skillId}.", StringComparison.Ordinal);
        }

        private static string ExtractSkillId(string effectId, string suffix)
        {
            if (!effectId.StartsWith(EffectPrefix, StringComparison.Ordinal) ||
                !effectId.EndsWith(suffix, StringComparison.Ordinal))
            {
                return null;
            }

            int start = EffectPrefix.Length;
            int length = effectId.Length - EffectPrefix.Length - suffix.Length;
            if (length <= 0)
            {
                return null;
            }

            return effectId.Substring(start, length);
        }

        private static void AddModifierToAll(List<SkillEffectSpec> specs, string skillId, string displayName,
            StatOperation operation, double value, int order)
        {
            foreach (FacilityModifierSpec spec in FacilityModifierSpecs)
            {
                specs.Add(new SkillEffectSpec(skillId, ModifierEffectId(skillId, spec.FacilityId),
                    displayName, spec.StatId, operation, value, order, null, null, null));
            }
        }

        private static string ModifierEffectId(string skillId, string facilityId)
        {
            return $"{EffectPrefix}{skillId}.{facilityId}_modifier";
        }

        private static string EffectId(string skillId, string suffix)
        {
            return $"{EffectPrefix}{skillId}{suffix}";
        }

        private readonly struct FacilityModifierSpec
        {
            public FacilityModifierSpec(string facilityId, string statId)
            {
                FacilityId = facilityId;
                StatId = statId;
            }

            public string FacilityId { get; }
            public string StatId { get; }
        }
    }
}

