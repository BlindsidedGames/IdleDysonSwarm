using System;
using GameData;
using Systems.Facilities;
using Systems.Stats;
using Unity.Mathematics;
using static Expansion.Oracle;

namespace Systems
{
    public static class ProductionSystem
    {
        public static void SetBotDistribution(DysonVerseInfinityData dvid, DysonVersePrestigeData dvpd, PrestigePlus pp)
        {
            if (!pp.botMultitasking)
            {
                dvid.workers =
                    Math.Ceiling(Math.Floor(dvid.bots) / 100f * ((1f - dvpd.botDistribution) * 100f));
                dvid.researchers =
                    Math.Floor(Math.Floor(dvid.bots) / 100f * dvpd.botDistribution * 100f);
            }
            else
            {
                dvid.workers = dvid.bots;
                dvid.researchers = dvid.bots;
            }
        }

        public static void CalculateProduction(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, double deltaTime)
        {
            CalculateMoney(dvid, dvst, deltaTime);
            CalculateScience(dvid, dvst, deltaTime);
            CalculatePanelsPerSec(dvid, dvst, deltaTime);
            CalculateAssemblyLineProduction(dvid, dvst, deltaTime);
            CalculateManagerProduction(dvid, dvst, deltaTime);
            CalculateServerProduction(dvid, dvst, deltaTime);
            CalculateDataCenterProduction(dvid, dvst, deltaTime);
            CalculatePlanetProduction(dvid, dvst, dvpd, deltaTime);
            CalculatePlanetsPerSecond(dvid, dvst, deltaTime);
            CalculateShouldersSkills(dvid, dvst, dvpd, deltaTime);
            if (dvst.androids) dvpd.androidsSkillTimer += deltaTime;
            if (dvst.pocketAndroids) dvpd.pocketAndroidsTimer += deltaTime;
            if (dvst.superRadiantScattering) dvst.superRadiantScatteringTimer += deltaTime;
        }

        public static void CalculatePlanetsPerSecond(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            double deltaTime)
        {
            if (GlobalStatPipeline.TryCalculatePlanetGeneration(dvid, dvst, null, null,
                    out GlobalStatPipeline.PlanetGenerationResult result))
            {
                dvid.totalPlanetProduction = result.TotalResult.Value;
                dvid.scientificPlanetsProduction = result.ScientificPlanets;
                dvid.planetAssemblyProduction = result.PlanetAssembly;
                dvid.shellWorldsProduction = result.ShellWorlds;
                dvid.stellarSacrificesProduction = result.StellarSacrifices;
            }
            else
            {
                dvid.totalPlanetProduction = 0;
                dvid.scientificPlanetsProduction = dvid.researchers > 1 && dvst.scientificPlanets
                    ? Math.Log10(dvid.researchers)
                    : 0;
                if (dvst.hubbleTelescope)
                    dvid.scientificPlanetsProduction *= 2f;
                if (dvst.jamesWebbTelescope)
                    dvid.scientificPlanetsProduction *= 4f;
                dvid.scientificPlanetsProduction += dvst.terraformingProtocols ? dvst.fragments : 0;

                if (dvst.scientificPlanets) dvid.totalPlanetProduction += dvid.scientificPlanetsProduction;

                dvid.planetAssemblyProduction =
                    dvst.planetAssembly && dvid.assemblyLines[0] + dvid.assemblyLines[1] >= 10
                        ? Math.Log10(dvid.assemblyLines[0] + dvid.assemblyLines[1])
                        : 0;
                if (dvst.planetAssembly)
                    dvid.totalPlanetProduction += dvid.planetAssemblyProduction;

                dvid.shellWorldsProduction = dvst.planetAssembly && dvid.planets[0] + dvid.planets[1] >= 2
                    ? Math.Log(dvid.planets[0] + dvid.planets[1], 2)
                    : 0;
                if (dvst.shellWorlds)
                    dvid.totalPlanetProduction += dvid.shellWorldsProduction;

                double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, deltaTime);
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, false, deltaTime);
                double stellarGalaxies = ProductionMath.StellarGalaxies(dvst, galaxiesEngulfed);
                double botsRequired = ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded);

                dvid.stellarSacrificesProduction = dvst.stellarSacrifices && dvid.bots >= botsRequired &&
                                                   stellarGalaxies > 0
                    ? stellarGalaxies
                    : 0;
                if (dvst.stellarSacrifices)
                    dvid.totalPlanetProduction += dvid.stellarSacrificesProduction;
            }

            dvid.planets[0] += dvid.totalPlanetProduction * deltaTime;

            if (dvst.shouldersOfTheFallen && dvid.scienceBoostOwned > 0)
            {
                dvid.scientificPlanetsProduction += math.log2(dvid.scienceBoostOwned);
                if (dvst.shoulderSurgery) dvid.pocketDimensionsProduction += Math.Log(dvid.scienceBoostOwned, 2);
            }
        }

        public static void CalculateShouldersSkills(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, double time)
        {
            if (GlobalStatPipeline.TryCalculateShouldersAccruals(dvid, dvst, dvpd, null,
                    out StatResult scienceBoostResult, out StatResult moneyUpgradeResult))
            {
                AddResearchLevel(ResearchIdMap.ScienceBoost, scienceBoostResult.Value * time);
                AddResearchLevel(ResearchIdMap.MoneyMultiplier, moneyUpgradeResult.Value * time);
                return;
            }

            if (dvst.shouldersOfGiants && dvst.scientificPlanets)
            {
                AddResearchLevel(ResearchIdMap.ScienceBoost, dvid.scientificPlanetsProduction * time);
                if (dvst.whatCouldHaveBeen)
                    AddResearchLevel(ResearchIdMap.ScienceBoost, dvid.pocketDimensionsProduction * time);
            }

            if (dvst.shouldersOfTheEnlightened && dvst.scientificPlanets)
                AddResearchLevel(ResearchIdMap.MoneyMultiplier, dvid.scientificPlanetsProduction * time);
        }

        public static void CalculatePlanetProduction(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, double deltaTime)
        {
            double planetsTotal = dvid.planets[0] + dvid.planets[1];
            double baseProduction = planetsTotal * 0.0002777777777777778f * dvid.planetModifier;
            if (dvst.rule34 && dvid.planets[1] >= 69) baseProduction *= 2;
            if (dvst.superchargedPower) baseProduction *= 1.5f;

            dvid.planetsDataCenterProduction = baseProduction;

            bool useDataDriven = TryBuildFacilityRuntime("planets", dvid, dvpd, dvst, out FacilityRuntime runtime);
            dvid.dataCenterProduction = useDataDriven ? runtime.State.ProductionRate : baseProduction;

            double dataCenterProductionTemp = dvst.pocketDimensions && dvid.workers > 1
                ? Math.Log10(dvid.workers)
                : 0;
            dvid.pocketDimensionsWithoutAnythingElseProduction = dataCenterProductionTemp;

            if (dvst.pocketMultiverse)
            {
                double multiplyBy = 1;
                multiplyBy *= dvst.pocketDimensions && dvid.researchers > 1f
                    ? Math.Log10(dvid.researchers)
                    : 0;
                dvid.pocketMultiverseProduction = dvid.researchers > 0
                    ? dataCenterProductionTemp * multiplyBy - dvid.pocketDimensionsWithoutAnythingElseProduction
                    : 0;
                if (multiplyBy > 0) dataCenterProductionTemp *= multiplyBy;
            }
            else
            {
                double add = 0;
                if (dvst.pocketProtectors)
                    add += dvst.pocketDimensions && dvid.researchers > 1f
                        ? Math.Log10(dvid.researchers)
                        : 0;
                dvid.pocketProtectorsProduction =
                    dataCenterProductionTemp + add - dvid.pocketDimensionsWithoutAnythingElseProduction;

                dataCenterProductionTemp += add;
            }

            if (dvst.dimensionalCatCables) dataCenterProductionTemp *= 5;

            if (dvst.solarBubbles) dataCenterProductionTemp *= 1 + 0.01 * dvid.panelLifetime;

            if (dvst.pocketAndroids)
                dataCenterProductionTemp *=
                    dvpd.pocketAndroidsTimer > 3564 ? 100 : 1 + dvpd.pocketAndroidsTimer / 36;

            if (dvst.quantumComputing)
            {
                double quantumMulti = 1 + (dvid.rudimentrySingularityProduction >= 1
                    ? Math.Log(dvid.rudimentrySingularityProduction, 2)
                    : 0);
                dvid.quantumComputingProduction = quantumMulti;
                dataCenterProductionTemp *= quantumMulti;
            }

            dvid.pocketDimensionsProduction = dataCenterProductionTemp;
            if (dvst.pocketDimensions && !useDataDriven)
                dvid.dataCenterProduction += dvid.pocketDimensionsProduction;

            dvid.dataCenters[0] += dvid.dataCenterProduction * deltaTime;
        }

        public static void CalculateDataCenterProduction(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            double deltaTime)
        {
            double serversTotal = dvid.servers[0] + dvid.servers[1];
            double parallelBonus = dvst.parallelComputation && serversTotal > 1
                ? 0.1f * Math.Log(serversTotal, 2)
                : 0;

            double baseProduction;
            double finalProduction;
            if (TryBuildFacilityRuntime("data_centers", dvid, null, dvst, out FacilityRuntime runtime))
            {
                finalProduction = runtime.State.ProductionRate;
                if (parallelBonus > 0)
                {
                    finalProduction -= parallelBonus;
                }

                baseProduction = finalProduction - dvid.rudimentrySingularityProduction;
            }
            else
            {
                baseProduction =
                    (dvid.dataCenters[0] + dvid.dataCenters[1]) * 0.0011111111f * dvid.dataCenterModifier;
                if (dvst.rule34 && dvid.dataCenters[1] >= 69) baseProduction *= 2;
                if (dvst.superchargedPower) baseProduction *= 1.5f;
                finalProduction = baseProduction + dvid.rudimentrySingularityProduction;
            }

            dvid.dataCenterServerProduction = baseProduction;
            dvid.serverProduction = finalProduction;

            dvid.servers[0] += dvst.parallelComputation && serversTotal > 1
                ? dvid.serverProduction * deltaTime + parallelBonus
                : dvid.serverProduction * deltaTime;
        }

        public static void CalculateServerProduction(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            double deltaTime)
        {
            if (TryBuildFacilityRuntime("servers", dvid, null, dvst, out FacilityRuntime runtime))
            {
                dvid.managerProduction = runtime.State.ProductionRate;
            }
            else
            {
                dvid.managerProduction =
                    (dvid.servers[0] + dvid.servers[1]) * 0.0016666666666667f * dvid.serverModifier;
                if (dvst.rule34 && dvid.servers[1] >= 69) dvid.managerProduction *= 2;

                if (dvst.superchargedPower) dvid.managerProduction *= 1.5f;
            }

            dvid.serverManagerProduction = dvid.managerProduction;

            dvid.managers[0] += dvid.managerProduction * deltaTime;
        }

        public static void CalculateManagerProduction(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            double deltaTime)
        {
            if (TryBuildFacilityRuntime("ai_managers", dvid, null, dvst, out FacilityRuntime runtime))
            {
                dvid.assemblyLineProduction = runtime.State.ProductionRate;
            }
            else
            {
                dvid.assemblyLineProduction =
                    (dvid.managers[0] + dvid.managers[1]) * 0.0166666666666667f * dvid.managerModifier;
                if (dvst.rule34 && dvid.managers[1] >= 69) dvid.assemblyLineProduction *= 2;

                if (dvst.superchargedPower) dvid.assemblyLineProduction *= 1.5f;
            }

            double rudimentaryProduction = 0;
            if (dvst.rudimentarySingularity && dvid.assemblyLineProduction > 1)
                rudimentaryProduction = dvst.unsuspiciousAlgorithms
                    ? 10 * Math.Pow(Math.Log(dvid.assemblyLineProduction, 2),
                        1 + Math.Log10(dvid.assemblyLineProduction) / 10)
                    : Math.Pow(Math.Log(dvid.assemblyLineProduction, 2),
                        1 + Math.Log10(dvid.assemblyLineProduction) / 10);
            if (dvst.clusterNetworking)
                rudimentaryProduction *= 1 + (dvid.servers[0] + dvid.servers[1] > 1
                    ? 0.05f * Math.Log10(dvid.servers[0] + dvid.servers[1])
                    : 0);

            dvid.rudimentrySingularityProduction = rudimentaryProduction;
            dvid.managerAssemblyLineProduction = dvid.assemblyLineProduction;
            dvid.assemblyLines[0] += dvid.assemblyLineProduction * deltaTime;
        }

        public static void CalculateAssemblyLineProduction(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            double deltaTime)
        {
            if (TryBuildFacilityRuntime("assembly_lines", dvid, null, dvst, out FacilityRuntime runtime))
            {
                dvid.botProduction = runtime.State.ProductionRate;
            }
            else
            {
                dvid.botProduction =
                    (dvid.assemblyLines[0] + dvid.assemblyLines[1]) * 0.1f * dvid.assemblyLineModifier;
                if (dvst.stayingPower)
                    dvid.botProduction *= 1 + 0.01f * dvid.panelLifetime;
                if (dvst.rule34 && dvid.assemblyLines[1] >= 69) dvid.botProduction *= 2;
                if (dvst.superchargedPower) dvid.botProduction *= 1.5f;
            }

            dvid.assemblyLineBotProduction = dvid.botProduction;

            dvid.bots += dvid.botProduction * deltaTime;

            if (dvst.stellarSacrifices)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, deltaTime);
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, false, deltaTime);
                double stellarGalaxies = ProductionMath.StellarGalaxies(dvst, galaxiesEngulfed);
                double botsRequired = ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded);

                if (dvid.bots >= botsRequired && stellarGalaxies > 0)
                    dvid.bots -= botsRequired * deltaTime;
            }
        }

        public static void CalculatePanelsPerSec(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            double deltaTime)
        {
            if (GlobalStatPipeline.TryCalculatePanelsPerSecond(dvid, dvst, null, null, out StatResult result))
            {
                dvid.panelsPerSec = result.Value;
                dvid.totalPanelsDecayed += dvid.panelsPerSec * deltaTime;
                return;
            }

            double panels = 1;
            double mult = dvid.panelsPerSecMulti;
            if (dvst.burnOut)
                mult *= 3;
            if (dvst.workerEfficiencyTree)
                panels = dvid.workers / 50 * mult;
            else
                panels = dvid.workers / 100 * mult;

            if (dvst.reapers && dvid.totalPanelsDecayed > 2)
                panels *= 1 + math.log2(dvid.totalPanelsDecayed) / 10;
            if (dvst.rocketMania && dvid.panelsPerSec > 20)
                panels *= Math.Log(dvid.panelsPerSec, 20);
            if (dvst.saren) panels *= 40;

            if (dvst.fusionReactors)
                panels *= 5f;
            dvid.panelsPerSec = panels;

            dvid.totalPanelsDecayed += dvid.panelsPerSec * deltaTime;
        }

        public static void CalculateScience(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            double deltaTime)
        {
            dvid.science += ScienceToAdd(dvid, dvst) * deltaTime;
        }

        public static double ScienceToAdd(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst) =>
            dvst.powerUnderwhelming
                ? Math.Pow(dvid.researchers * dvid.scienceMulti, 1.05)
                : dvid.researchers * dvid.scienceMulti;

        public static void CalculateMoney(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst, double deltaTime)
        {
            dvid.money += MoneyToAdd(dvid, dvst) * deltaTime;
        }

        public static double MoneyToAdd(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst) =>
            dvst.powerOverwhelming
                ? Math.Pow(dvid.panelsPerSec * dvid.panelLifetime * dvid.moneyMulti, 1.03)
                : dvid.panelsPerSec * dvid.panelLifetime * dvid.moneyMulti;

        private static bool TryBuildFacilityRuntime(string facilityId, DysonVerseInfinityData dvid,
            DysonVersePrestigeData dvpd, DysonVerseSkillTreeData dvst, out FacilityRuntime runtime)
        {
            runtime = null;
            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null || registry.skillDatabase.skills == null ||
                registry.skillDatabase.skills.Count == 0)
            {
                return false;
            }

            if (!registry.TryGetFacility(facilityId, out FacilityDefinition definition))
            {
                return false;
            }

            FacilityState state = BuildFacilityState(facilityId, dvid);
            if (state == null)
            {
                return false;
            }

            var context = new EffectContext(dvid, dvpd, dvst, null);
            runtime = FacilityEffectPipeline.BuildRuntimeFromDefinitions(definition, state, context);
            return runtime != null;
        }

        private static FacilityState BuildFacilityState(string facilityId, DysonVerseInfinityData dvid)
        {
            if (string.IsNullOrEmpty(facilityId) || dvid == null) return null;

            switch (facilityId)
            {
                case "assembly_lines":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.assemblyLines[1],
                        AutoOwned = dvid.assemblyLines[0],
                        EffectiveCount = dvid.assemblyLines[0] + dvid.assemblyLines[1]
                    };
                case "ai_managers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.managers[1],
                        AutoOwned = dvid.managers[0],
                        EffectiveCount = dvid.managers[0] + dvid.managers[1]
                    };
                case "servers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.servers[1],
                        AutoOwned = dvid.servers[0],
                        EffectiveCount = dvid.servers[0] + dvid.servers[1]
                    };
                case "data_centers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.dataCenters[1],
                        AutoOwned = dvid.dataCenters[0],
                        EffectiveCount = dvid.dataCenters[0] + dvid.dataCenters[1]
                    };
                case "planets":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = dvid.planets[1],
                        AutoOwned = dvid.planets[0],
                        EffectiveCount = dvid.planets[0] + dvid.planets[1]
                    };
                default:
                    return null;
            }
        }
    }
}
