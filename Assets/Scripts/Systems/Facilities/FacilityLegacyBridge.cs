using System.Collections.Generic;
using GameData;
using Systems.Stats;
using static Expansion.Oracle;

namespace Systems.Facilities
{
    public static class FacilityLegacyBridge
    {
        public static FacilityRuntime BuildAssemblyLineRuntime(FacilityDefinition definition,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = infinityData.assemblyLines[1],
                AutoOwned = infinityData.assemblyLines[0],
                EffectiveCount = infinityData.assemblyLines[0] + infinityData.assemblyLines[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildAssemblyLineEffects(definition.productionStatId, state, infinityData, skillTreeData);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildAiManagerRuntime(FacilityDefinition definition,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = infinityData.managers[1],
                AutoOwned = infinityData.managers[0],
                EffectiveCount = infinityData.managers[0] + infinityData.managers[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildAiManagerEffects(definition.productionStatId, state, infinityData, skillTreeData);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildServerRuntime(FacilityDefinition definition,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = infinityData.servers[1],
                AutoOwned = infinityData.servers[0],
                EffectiveCount = infinityData.servers[0] + infinityData.servers[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildServerEffects(definition.productionStatId, state, infinityData, skillTreeData);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildDataCenterRuntime(FacilityDefinition definition,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = infinityData.dataCenters[1],
                AutoOwned = infinityData.dataCenters[0],
                EffectiveCount = infinityData.dataCenters[0] + infinityData.dataCenters[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildDataCenterEffects(definition.productionStatId, state, infinityData, skillTreeData);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildPlanetRuntime(FacilityDefinition definition,
            DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData, DysonVerseSkillTreeData skillTreeData)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = infinityData.planets[1],
                AutoOwned = infinityData.planets[0],
                EffectiveCount = infinityData.planets[0] + infinityData.planets[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildPlanetEffects(definition.productionStatId, state, infinityData, prestigeData, skillTreeData);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        private static List<StatEffect> BuildAssemblyLineEffects(string statId, FacilityState state,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            var effects = new List<StatEffect>
            {
                new StatEffect
                {
                    Id = "legacy.assembly_lines.count",
                    SourceName = "Assembly Lines",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = state.EffectiveCount,
                    Order = 0
                },
                new StatEffect
                {
                    Id = "legacy.assembly_line_modifier",
                    SourceName = "Assembly Line Modifier",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = infinityData.assemblyLineModifier,
                    Order = 10
                }
            };

            if (skillTreeData.stayingPower)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.staying_power",
                    SourceName = "Staying Power",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 1 + 0.01f * infinityData.panelLifetime,
                    Order = 20,
                    ConditionId = "panel_lifetime"
                });
            }

            if (skillTreeData.rule34 && infinityData.assemblyLines[1] >= 69)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.rule34",
                    SourceName = "Rule 34",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 2,
                    Order = 30,
                    ConditionId = "assembly_lines_69"
                });
            }

            if (skillTreeData.superchargedPower)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.supercharged_power",
                    SourceName = "Supercharged Power",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 1.5,
                    Order = 40
                });
            }

            return effects;
        }

        private static List<StatEffect> BuildAiManagerEffects(string statId, FacilityState state,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            var effects = new List<StatEffect>
            {
                new StatEffect
                {
                    Id = "legacy.ai_managers.count",
                    SourceName = "AI Managers",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = state.EffectiveCount,
                    Order = 0
                },
                new StatEffect
                {
                    Id = "legacy.ai_manager_modifier",
                    SourceName = "AI Manager Modifier",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = infinityData.managerModifier,
                    Order = 10
                }
            };

            if (skillTreeData.rule34 && infinityData.managers[1] >= 69)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.rule34",
                    SourceName = "Rule 34",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 2,
                    Order = 20,
                    ConditionId = "ai_managers_69"
                });
            }

            if (skillTreeData.superchargedPower)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.supercharged_power",
                    SourceName = "Supercharged Power",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 1.5,
                    Order = 30
                });
            }

            return effects;
        }

        private static List<StatEffect> BuildServerEffects(string statId, FacilityState state,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            var effects = new List<StatEffect>
            {
                new StatEffect
                {
                    Id = "legacy.servers.count",
                    SourceName = "Servers",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = state.EffectiveCount,
                    Order = 0
                },
                new StatEffect
                {
                    Id = "legacy.server_modifier",
                    SourceName = "Server Modifier",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = infinityData.serverModifier,
                    Order = 10
                }
            };

            if (skillTreeData.rule34 && infinityData.servers[1] >= 69)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.rule34",
                    SourceName = "Rule 34",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 2,
                    Order = 20,
                    ConditionId = "servers_69"
                });
            }

            if (skillTreeData.superchargedPower)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.supercharged_power",
                    SourceName = "Supercharged Power",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 1.5,
                    Order = 30
                });
            }

            return effects;
        }

        private static List<StatEffect> BuildDataCenterEffects(string statId, FacilityState state,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            var effects = new List<StatEffect>
            {
                new StatEffect
                {
                    Id = "legacy.data_centers.count",
                    SourceName = "Data Centers",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = state.EffectiveCount,
                    Order = 0
                },
                new StatEffect
                {
                    Id = "legacy.data_center_modifier",
                    SourceName = "Data Center Modifier",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = infinityData.dataCenterModifier,
                    Order = 10
                }
            };

            if (skillTreeData.rule34 && infinityData.dataCenters[1] >= 69)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.rule34",
                    SourceName = "Rule 34",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 2,
                    Order = 20,
                    ConditionId = "data_centers_69"
                });
            }

            if (skillTreeData.superchargedPower)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.supercharged_power",
                    SourceName = "Supercharged Power",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 1.5,
                    Order = 30
                });
            }

            if (infinityData.rudimentrySingularityProduction > 0)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.rudimentary_singularity",
                    SourceName = "Rudimentary Singularity",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = infinityData.rudimentrySingularityProduction,
                    Order = 40
                });
            }

            double serversTotal = infinityData.servers[0] + infinityData.servers[1];
            if (skillTreeData.parallelComputation && serversTotal > 1)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.parallel_computation",
                    SourceName = "Parallel Computation",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = 0.1f * System.Math.Log(serversTotal, 2),
                    Order = 50,
                    ConditionId = "servers_total_gt_1"
                });
            }

            return effects;
        }

        private static List<StatEffect> BuildPlanetEffects(string statId, FacilityState state,
            DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData, DysonVerseSkillTreeData skillTreeData)
        {
            var effects = new List<StatEffect>
            {
                new StatEffect
                {
                    Id = "legacy.planets.count",
                    SourceName = "Planets",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = state.EffectiveCount,
                    Order = 0
                },
                new StatEffect
                {
                    Id = "legacy.planet_modifier",
                    SourceName = "Planet Modifier",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = infinityData.planetModifier,
                    Order = 10
                }
            };

            if (skillTreeData.rule34 && infinityData.planets[1] >= 69)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.rule34",
                    SourceName = "Rule 34",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 2,
                    Order = 20,
                    ConditionId = "planets_69"
                });
            }

            if (skillTreeData.superchargedPower)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.supercharged_power",
                    SourceName = "Supercharged Power",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 1.5,
                    Order = 30
                });
            }

            if (skillTreeData.pocketDimensions)
            {
                double pocketDimensionsProduction = ComputePocketDimensionsProduction(infinityData, prestigeData, skillTreeData);
                if (pocketDimensionsProduction > 0)
                {
                    effects.Add(new StatEffect
                    {
                        Id = "skill.pocket_dimensions",
                        SourceName = "Pocket Dimensions",
                        TargetStatId = statId,
                        Operation = StatOperation.Add,
                        Value = pocketDimensionsProduction,
                        Order = 40
                    });
                }
            }

            return effects;
        }

        internal static StatResult CalculatePlanetGeneration(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            List<StatEffect> effects = BuildPlanetGenerationEffects(StatId.PlanetsPerSecond, infinityData, skillTreeData);
            return StatCalculator.Calculate(0, effects);
        }

        internal static double ComputeScientificPlanetsProduction(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData)
        {
            double production = infinityData.researchers > 1 && skillTreeData.scientificPlanets
                ? System.Math.Log10(infinityData.researchers)
                : 0;
            if (skillTreeData.hubbleTelescope) production *= 2;
            if (skillTreeData.jamesWebbTelescope) production *= 4;
            if (skillTreeData.terraformingProtocols) production += skillTreeData.fragments;
            return production;
        }

        internal static double ComputePlanetAssemblyProduction(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData)
        {
            double totalAssemblyLines = infinityData.assemblyLines[0] + infinityData.assemblyLines[1];
            return skillTreeData.planetAssembly && totalAssemblyLines >= 10
                ? System.Math.Log10(totalAssemblyLines)
                : 0;
        }

        internal static double ComputeShellWorldsProduction(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData)
        {
            double totalPlanets = infinityData.planets[0] + infinityData.planets[1];
            return skillTreeData.planetAssembly && totalPlanets >= 2
                ? System.Math.Log(totalPlanets, 2)
                : 0;
        }

        internal static double ComputeStellarSacrificesProduction(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData)
        {
            double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
            double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
            double stellarGalaxies = ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
            double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);
            return skillTreeData.stellarSacrifices && infinityData.bots >= botsRequired && stellarGalaxies > 0
                ? stellarGalaxies
                : 0;
        }

        private static List<StatEffect> BuildPlanetGenerationEffects(string statId,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            var effects = new List<StatEffect>();

            if (skillTreeData.scientificPlanets)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.scientific_planets",
                    SourceName = "Scientific Planets",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputeScientificPlanetsProduction(infinityData, skillTreeData),
                    Order = 0
                });
            }

            if (skillTreeData.planetAssembly)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.planet_assembly",
                    SourceName = "Planet Assembly",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputePlanetAssemblyProduction(infinityData, skillTreeData),
                    Order = 10
                });
            }

            if (skillTreeData.shellWorlds)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.shell_worlds",
                    SourceName = "Shell Worlds",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputeShellWorldsProduction(infinityData, skillTreeData),
                    Order = 20
                });
            }

            if (skillTreeData.stellarSacrifices)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.stellar_sacrifices",
                    SourceName = "Stellar Sacrifices",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputeStellarSacrificesProduction(infinityData, skillTreeData),
                    Order = 30
                });
            }

            return effects;
        }

        private static double ToLegacyFloat(double value)
        {
            return (double)(float)value;
        }

        internal static double ComputePocketDimensionsProduction(DysonVerseInfinityData infinityData,
            DysonVersePrestigeData prestigeData, DysonVerseSkillTreeData skillTreeData)
        {
            double production = skillTreeData.pocketDimensions && infinityData.workers > 1 ? System.Math.Log10(infinityData.workers) : 0;

            if (skillTreeData.pocketMultiverse)
            {
                double multiplier = skillTreeData.pocketDimensions && infinityData.researchers > 1f ? System.Math.Log10(infinityData.researchers) : 0;
                if (infinityData.researchers > 0 && multiplier > 0)
                {
                    production *= multiplier;
                }
            }
            else
            {
                double add = skillTreeData.pocketProtectors && skillTreeData.pocketDimensions && infinityData.researchers > 1f
                    ? System.Math.Log10(infinityData.researchers)
                    : 0;
                production += add;
            }

            if (skillTreeData.dimensionalCatCables) production *= 5;
            if (skillTreeData.solarBubbles) production *= 1 + 0.01f * infinityData.panelLifetime;
            if (skillTreeData.pocketAndroids)
                production *= prestigeData.pocketAndroidsTimer > 3564 ? 100 : 1 + prestigeData.pocketAndroidsTimer / 36;
            if (skillTreeData.quantumComputing)
            {
                double quantumMulti = 1 + (infinityData.rudimentrySingularityProduction >= 1
                    ? System.Math.Log(infinityData.rudimentrySingularityProduction, 2)
                    : 0);
                production *= quantumMulti;
            }

            return production;
        }
    }
}

