using System.Collections.Generic;
using GameData;
using Systems.Stats;
using static Expansion.Oracle;

namespace Systems.Facilities
{
    public static class FacilityLegacyBridge
    {
        public static FacilityRuntime BuildAssemblyLineRuntime(FacilityDefinition definition,
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = dvid.assemblyLines[1],
                AutoOwned = dvid.assemblyLines[0],
                EffectiveCount = dvid.assemblyLines[0] + dvid.assemblyLines[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildAssemblyLineEffects(definition.productionStatId, state, dvid, dvst);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildAiManagerRuntime(FacilityDefinition definition,
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = dvid.managers[1],
                AutoOwned = dvid.managers[0],
                EffectiveCount = dvid.managers[0] + dvid.managers[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildAiManagerEffects(definition.productionStatId, state, dvid, dvst);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildServerRuntime(FacilityDefinition definition,
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = dvid.servers[1],
                AutoOwned = dvid.servers[0],
                EffectiveCount = dvid.servers[0] + dvid.servers[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildServerEffects(definition.productionStatId, state, dvid, dvst);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildDataCenterRuntime(FacilityDefinition definition,
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = dvid.dataCenters[1],
                AutoOwned = dvid.dataCenters[0],
                EffectiveCount = dvid.dataCenters[0] + dvid.dataCenters[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildDataCenterEffects(definition.productionStatId, state, dvid, dvst);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static FacilityRuntime BuildPlanetRuntime(FacilityDefinition definition,
            DysonVerseInfinityData dvid, DysonVersePrestigeData dvpd, DysonVerseSkillTreeData dvst)
        {
            if (definition == null) return null;

            var state = new FacilityState
            {
                FacilityId = definition.id,
                ManualOwned = dvid.planets[1],
                AutoOwned = dvid.planets[0],
                EffectiveCount = dvid.planets[0] + dvid.planets[1]
            };

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildPlanetEffects(definition.productionStatId, state, dvid, dvpd, dvst);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        private static List<StatEffect> BuildAssemblyLineEffects(string statId, FacilityState state,
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
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
                    Value = dvid.assemblyLineModifier,
                    Order = 10
                }
            };

            if (dvst.stayingPower)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.staying_power",
                    SourceName = "Staying Power",
                    TargetStatId = statId,
                    Operation = StatOperation.Multiply,
                    Value = 1 + 0.01f * dvid.panelLifetime,
                    Order = 20,
                    ConditionId = "panel_lifetime"
                });
            }

            if (dvst.rule34 && dvid.assemblyLines[1] >= 69)
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

            if (dvst.superchargedPower)
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
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
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
                    Value = dvid.managerModifier,
                    Order = 10
                }
            };

            if (dvst.rule34 && dvid.managers[1] >= 69)
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

            if (dvst.superchargedPower)
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
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
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
                    Value = dvid.serverModifier,
                    Order = 10
                }
            };

            if (dvst.rule34 && dvid.servers[1] >= 69)
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

            if (dvst.superchargedPower)
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
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
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
                    Value = dvid.dataCenterModifier,
                    Order = 10
                }
            };

            if (dvst.rule34 && dvid.dataCenters[1] >= 69)
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

            if (dvst.superchargedPower)
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

            if (dvid.rudimentrySingularityProduction > 0)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.rudimentary_singularity",
                    SourceName = "Rudimentary Singularity",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = dvid.rudimentrySingularityProduction,
                    Order = 40
                });
            }

            double serversTotal = dvid.servers[0] + dvid.servers[1];
            if (dvst.parallelComputation && serversTotal > 1)
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
            DysonVerseInfinityData dvid, DysonVersePrestigeData dvpd, DysonVerseSkillTreeData dvst)
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
                    Value = dvid.planetModifier,
                    Order = 10
                }
            };

            if (dvst.rule34 && dvid.planets[1] >= 69)
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

            if (dvst.superchargedPower)
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

            if (dvst.pocketDimensions)
            {
                double pocketDimensionsProduction = ComputePocketDimensionsProduction(dvid, dvpd, dvst);
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

        internal static StatResult CalculatePlanetGeneration(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            List<StatEffect> effects = BuildPlanetGenerationEffects(StatId.PlanetsPerSecond, dvid, dvst);
            return StatCalculator.Calculate(0, effects);
        }

        internal static double ComputeScientificPlanetsProduction(DysonVerseInfinityData dvid,
            DysonVerseSkillTreeData dvst)
        {
            double production = dvid.researchers > 1 && dvst.scientificPlanets
                ? System.Math.Log10(dvid.researchers)
                : 0;
            if (dvst.hubbleTelescope) production *= 2;
            if (dvst.jamesWebbTelescope) production *= 4;
            if (dvst.terraformingProtocols) production += dvst.fragments;
            return production;
        }

        internal static double ComputePlanetAssemblyProduction(DysonVerseInfinityData dvid,
            DysonVerseSkillTreeData dvst)
        {
            double totalAssemblyLines = dvid.assemblyLines[0] + dvid.assemblyLines[1];
            return dvst.planetAssembly && totalAssemblyLines >= 10
                ? System.Math.Log10(totalAssemblyLines)
                : 0;
        }

        internal static double ComputeShellWorldsProduction(DysonVerseInfinityData dvid,
            DysonVerseSkillTreeData dvst)
        {
            double totalPlanets = dvid.planets[0] + dvid.planets[1];
            return dvst.planetAssembly && totalPlanets >= 2
                ? System.Math.Log(totalPlanets, 2)
                : 0;
        }

        internal static double ComputeStellarSacrificesProduction(DysonVerseInfinityData dvid,
            DysonVerseSkillTreeData dvst)
        {
            double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, 0);
            double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, false, 0);
            double stellarGalaxies = ProductionMath.StellarGalaxies(dvst, galaxiesEngulfed);
            double botsRequired = ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded);
            return dvst.stellarSacrifices && dvid.bots >= botsRequired && stellarGalaxies > 0
                ? stellarGalaxies
                : 0;
        }

        private static List<StatEffect> BuildPlanetGenerationEffects(string statId,
            DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            var effects = new List<StatEffect>();

            if (dvst.scientificPlanets)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.scientific_planets",
                    SourceName = "Scientific Planets",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputeScientificPlanetsProduction(dvid, dvst),
                    Order = 0
                });
            }

            if (dvst.planetAssembly)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.planet_assembly",
                    SourceName = "Planet Assembly",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputePlanetAssemblyProduction(dvid, dvst),
                    Order = 10
                });
            }

            if (dvst.shellWorlds)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.shell_worlds",
                    SourceName = "Shell Worlds",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputeShellWorldsProduction(dvid, dvst),
                    Order = 20
                });
            }

            if (dvst.stellarSacrifices)
            {
                effects.Add(new StatEffect
                {
                    Id = "skill.stellar_sacrifices",
                    SourceName = "Stellar Sacrifices",
                    TargetStatId = statId,
                    Operation = StatOperation.Add,
                    Value = ComputeStellarSacrificesProduction(dvid, dvst),
                    Order = 30
                });
            }

            return effects;
        }

        private static double ToLegacyFloat(double value)
        {
            return (double)(float)value;
        }

        internal static double ComputePocketDimensionsProduction(DysonVerseInfinityData dvid,
            DysonVersePrestigeData dvpd, DysonVerseSkillTreeData dvst)
        {
            double production = dvst.pocketDimensions && dvid.workers > 1 ? System.Math.Log10(dvid.workers) : 0;

            if (dvst.pocketMultiverse)
            {
                double multiplier = dvst.pocketDimensions && dvid.researchers > 1f ? System.Math.Log10(dvid.researchers) : 0;
                if (dvid.researchers > 0 && multiplier > 0)
                {
                    production *= multiplier;
                }
            }
            else
            {
                double add = dvst.pocketProtectors && dvst.pocketDimensions && dvid.researchers > 1f
                    ? System.Math.Log10(dvid.researchers)
                    : 0;
                production += add;
            }

            if (dvst.dimensionalCatCables) production *= 5;
            if (dvst.solarBubbles) production *= 1 + 0.01f * dvid.panelLifetime;
            if (dvst.pocketAndroids)
                production *= dvpd.pocketAndroidsTimer > 3564 ? 100 : 1 + dvpd.pocketAndroidsTimer / 36;
            if (dvst.quantumComputing)
            {
                double quantumMulti = 1 + (dvid.rudimentrySingularityProduction >= 1
                    ? System.Math.Log(dvid.rudimentrySingularityProduction, 2)
                    : 0);
                production *= quantumMulti;
            }

            return production;
        }
    }
}
