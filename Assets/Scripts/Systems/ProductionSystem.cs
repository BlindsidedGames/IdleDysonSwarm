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
        public static void SetBotDistribution(DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus)
        {
            if (!prestigePlus.botMultitasking)
            {
                infinityData.workers =
                    Math.Ceiling(Math.Floor(infinityData.bots) / 100f * ((1f - prestigeData.botDistribution) * 100f));
                infinityData.researchers =
                    Math.Floor(Math.Floor(infinityData.bots) / 100f * prestigeData.botDistribution * 100f);
            }
            else
            {
                infinityData.workers = infinityData.bots;
                infinityData.researchers = infinityData.bots;
            }
        }

        public static void CalculateProduction(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double deltaTime)
        {
            CalculateMoney(infinityData, skillTreeData, deltaTime);
            CalculateScience(infinityData, skillTreeData, deltaTime);
            CalculatePanelsPerSec(infinityData, skillTreeData, deltaTime);
            CalculateAssemblyLineProduction(infinityData, skillTreeData, prestigeData, prestigePlus, deltaTime);
            CalculateManagerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, deltaTime);
            CalculateServerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, deltaTime);
            CalculateDataCenterProduction(infinityData, skillTreeData, prestigeData, prestigePlus, deltaTime);
            CalculatePlanetProduction(infinityData, skillTreeData, prestigeData, deltaTime);
            CalculatePlanetsPerSecond(infinityData, skillTreeData, deltaTime);
            CalculateMegaStructureProduction(infinityData, skillTreeData, prestigeData, prestigePlus, deltaTime);
            CalculateShouldersSkills(infinityData, skillTreeData, prestigeData, deltaTime);
            if (skillTreeData.androids) AddSkillTimerSeconds(infinityData, "androids", deltaTime);
            if (skillTreeData.pocketAndroids) AddSkillTimerSeconds(infinityData, "pocketAndroids", deltaTime);
            if (skillTreeData.superRadiantScattering) AddSkillTimerSeconds(infinityData, "superRadiantScattering", deltaTime);
        }

        public static void CalculatePlanetsPerSecond(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            double deltaTime)
        {
            if (GlobalStatPipeline.TryCalculatePlanetGeneration(infinityData, skillTreeData, null, null,
                    out GlobalStatPipeline.PlanetGenerationResult result))
            {
                infinityData.totalPlanetProduction = result.TotalResult.Value;
                infinityData.scientificPlanetsProduction = result.ScientificPlanets;
                infinityData.planetAssemblyProduction = result.PlanetAssembly;
                infinityData.shellWorldsProduction = result.ShellWorlds;
                infinityData.stellarSacrificesProduction = result.StellarSacrifices;
            }
            else
            {
                infinityData.totalPlanetProduction = 0;
                infinityData.scientificPlanetsProduction = 0;
                infinityData.planetAssemblyProduction = 0;
                infinityData.shellWorldsProduction = 0;
                infinityData.stellarSacrificesProduction = 0;
            }

            infinityData.planets[0] += infinityData.totalPlanetProduction * deltaTime;

            if (skillTreeData.shouldersOfTheFallen && infinityData.scienceBoostOwned > 0)
            {
                infinityData.scientificPlanetsProduction += math.log2(infinityData.scienceBoostOwned);
                if (skillTreeData.shoulderSurgery) infinityData.pocketDimensionsProduction += Math.Log(infinityData.scienceBoostOwned, 2);
            }
        }

        public static void CalculateShouldersSkills(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, double time)
        {
            if (GlobalStatPipeline.TryCalculateShouldersAccruals(infinityData, skillTreeData, prestigeData, null,
                    out StatResult scienceBoostResult, out StatResult moneyUpgradeResult))
            {
                AddResearchLevel(ResearchIdMap.ScienceBoost, scienceBoostResult.Value * time);
                AddResearchLevel(ResearchIdMap.MoneyMultiplier, moneyUpgradeResult.Value * time);
                return;
            }
        }

        public static void CalculatePlanetProduction(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, double deltaTime)
        {
            double planetsTotal = infinityData.planets[0] + infinityData.planets[1];
            double baseProduction = planetsTotal * 0.0002777777777777778f * infinityData.planetModifier;
            if (skillTreeData.rule34 && infinityData.planets[1] >= 69) baseProduction *= 2;
            if (skillTreeData.superchargedPower) baseProduction *= 1.5f;

            infinityData.planetsDataCenterProduction = baseProduction;

            bool hasRuntime = FacilityRuntimeBuilder.TryBuildRuntime("planets", infinityData, prestigeData, skillTreeData, null,
                out FacilityRuntime runtime);
            infinityData.dataCenterProduction = hasRuntime ? runtime.State.ProductionRate : 0;

            double dataCenterProductionTemp = skillTreeData.pocketDimensions && infinityData.workers > 1
                ? Math.Log10(infinityData.workers)
                : 0;
            infinityData.pocketDimensionsWithoutAnythingElseProduction = dataCenterProductionTemp;

            if (skillTreeData.pocketMultiverse)
            {
                double multiplyBy = 1;
                multiplyBy *= skillTreeData.pocketDimensions && infinityData.researchers > 1f
                    ? Math.Log10(infinityData.researchers)
                    : 0;
                infinityData.pocketMultiverseProduction = infinityData.researchers > 0
                    ? dataCenterProductionTemp * multiplyBy - infinityData.pocketDimensionsWithoutAnythingElseProduction
                    : 0;
                if (multiplyBy > 0) dataCenterProductionTemp *= multiplyBy;
            }
            else
            {
                double add = 0;
                if (skillTreeData.pocketProtectors)
                    add += skillTreeData.pocketDimensions && infinityData.researchers > 1f
                        ? Math.Log10(infinityData.researchers)
                        : 0;
                infinityData.pocketProtectorsProduction =
                    dataCenterProductionTemp + add - infinityData.pocketDimensionsWithoutAnythingElseProduction;

                dataCenterProductionTemp += add;
            }

            if (skillTreeData.dimensionalCatCables) dataCenterProductionTemp *= 5;

            if (skillTreeData.solarBubbles) dataCenterProductionTemp *= 1 + 0.01 * infinityData.panelLifetime;

            if (skillTreeData.pocketAndroids)
            {
                double pocketAndroidsTimer = GetSkillTimerSeconds(infinityData, "pocketAndroids");
                dataCenterProductionTemp *= pocketAndroidsTimer > 3564 ? 100 : 1 + pocketAndroidsTimer / 36;
            }

            if (skillTreeData.quantumComputing)
            {
                double quantumMulti = 1 + (infinityData.rudimentrySingularityProduction >= 1
                    ? Math.Log(infinityData.rudimentrySingularityProduction, 2)
                    : 0);
                infinityData.quantumComputingProduction = quantumMulti;
                dataCenterProductionTemp *= quantumMulti;
            }

            infinityData.pocketDimensionsProduction = dataCenterProductionTemp;

            infinityData.dataCenters[0] += infinityData.dataCenterProduction * deltaTime;
        }

        public static void CalculateDataCenterProduction(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double deltaTime)
        {
            double serversTotal = infinityData.servers[0] + infinityData.servers[1];
            double parallelBonus = skillTreeData.parallelComputation && serversTotal > 1
                ? 0.1f * Math.Log(serversTotal, 2)
                : 0;

            double baseProduction;
            double finalProduction;
            if (FacilityRuntimeBuilder.TryBuildRuntime("data_centers", infinityData, prestigeData, skillTreeData, prestigePlus,
                    out FacilityRuntime runtime))
            {
                finalProduction = runtime.State.ProductionRate;
                if (parallelBonus > 0)
                {
                    finalProduction -= parallelBonus;
                }

                baseProduction = finalProduction - infinityData.rudimentrySingularityProduction;
            }
            else
            {
                baseProduction = 0;
                finalProduction = 0;
            }

            infinityData.dataCenterServerProduction = baseProduction;
            infinityData.serverProduction = finalProduction;

            infinityData.servers[0] += skillTreeData.parallelComputation && serversTotal > 1
                ? infinityData.serverProduction * deltaTime + parallelBonus
                : infinityData.serverProduction * deltaTime;
        }

        public static void CalculateServerProduction(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double deltaTime)
        {
            if (FacilityRuntimeBuilder.TryBuildRuntime("servers", infinityData, prestigeData, skillTreeData, prestigePlus, out FacilityRuntime runtime))
            {
                infinityData.managerProduction = runtime.State.ProductionRate;
            }
            else
            {
                infinityData.managerProduction = 0;
            }

            infinityData.serverManagerProduction = infinityData.managerProduction;

            infinityData.managers[0] += infinityData.managerProduction * deltaTime;
        }

        public static void CalculateManagerProduction(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double deltaTime)
        {
            if (FacilityRuntimeBuilder.TryBuildRuntime("ai_managers", infinityData, prestigeData, skillTreeData, prestigePlus,
                    out FacilityRuntime runtime))
            {
                infinityData.assemblyLineProduction = runtime.State.ProductionRate;
            }
            else
            {
                infinityData.assemblyLineProduction = 0;
            }

            double rudimentaryProduction = 0;
            if (skillTreeData.rudimentarySingularity && infinityData.assemblyLineProduction > 1)
                rudimentaryProduction = skillTreeData.unsuspiciousAlgorithms
                    ? 10 * Math.Pow(Math.Log(infinityData.assemblyLineProduction, 2),
                        1 + Math.Log10(infinityData.assemblyLineProduction) / 10)
                    : Math.Pow(Math.Log(infinityData.assemblyLineProduction, 2),
                        1 + Math.Log10(infinityData.assemblyLineProduction) / 10);
            if (skillTreeData.clusterNetworking)
                rudimentaryProduction *= 1 + (infinityData.servers[0] + infinityData.servers[1] > 1
                    ? 0.05f * Math.Log10(infinityData.servers[0] + infinityData.servers[1])
                    : 0);

            infinityData.rudimentrySingularityProduction = rudimentaryProduction;
            infinityData.managerAssemblyLineProduction = infinityData.assemblyLineProduction;
            infinityData.assemblyLines[0] += infinityData.assemblyLineProduction * deltaTime;
        }

        public static void CalculateAssemblyLineProduction(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double deltaTime)
        {
            if (FacilityRuntimeBuilder.TryBuildRuntime("assembly_lines", infinityData, prestigeData, skillTreeData, prestigePlus,
                    out FacilityRuntime runtime))
            {
                infinityData.botProduction = runtime.State.ProductionRate;
            }
            else
            {
                infinityData.botProduction = 0;
            }

            infinityData.assemblyLineBotProduction = infinityData.botProduction;

            infinityData.bots += infinityData.botProduction * deltaTime;

            if (skillTreeData.stellarSacrifices)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, deltaTime);
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, deltaTime);
                double stellarGalaxies = ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
                double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);

                if (infinityData.bots >= botsRequired && stellarGalaxies > 0)
                    infinityData.bots -= botsRequired * deltaTime;
            }
        }

        public static void CalculatePanelsPerSec(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            double deltaTime)
        {
            if (GlobalStatPipeline.TryCalculatePanelsPerSecond(infinityData, skillTreeData, null, null, out StatResult result))
            {
                infinityData.panelsPerSec = result.Value;
                infinityData.totalPanelsDecayed += infinityData.panelsPerSec * deltaTime;
                return;
            }
            infinityData.panelsPerSec = 0;
            infinityData.totalPanelsDecayed += infinityData.panelsPerSec * deltaTime;
        }

        public static void CalculateScience(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            double deltaTime)
        {
            infinityData.science += ScienceToAdd(infinityData, skillTreeData) * deltaTime;
        }

        public static double ScienceToAdd(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData) =>
            skillTreeData.powerUnderwhelming
                ? Math.Pow(infinityData.researchers * infinityData.scienceMulti, 1.05)
                : infinityData.researchers * infinityData.scienceMulti;

        public static void CalculateMoney(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData, double deltaTime)
        {
            infinityData.money += MoneyToAdd(infinityData, skillTreeData) * deltaTime;
        }

        public static double MoneyToAdd(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData) =>
            skillTreeData.powerOverwhelming
                ? Math.Pow(infinityData.panelsPerSec * infinityData.panelLifetime * infinityData.moneyMulti, 1.03)
                : infinityData.panelsPerSec * infinityData.panelLifetime * infinityData.moneyMulti;

        /// <summary>
        /// Calculates production for mega-structure facilities.
        /// Each tier produces the facility below it.
        /// </summary>
        public static void CalculateMegaStructureProduction(
            DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData,
            PrestigePlus prestigePlus,
            double deltaTime)
        {
            // Matrioshka Brains → produce Planets
            if (prestigeData.unlockedMatrioshkaBrains)
            {
                if (FacilityRuntimeBuilder.TryBuildRuntime("matrioshka_brains", infinityData, prestigeData,
                        skillTreeData, prestigePlus, out FacilityRuntime matrioshkaRuntime))
                {
                    double planetProduction = matrioshkaRuntime.State.ProductionRate;
                    infinityData.matrioshkaBrainPlanetProduction = planetProduction;
                    infinityData.planets[0] += planetProduction * deltaTime;
                }
                else
                {
                    infinityData.matrioshkaBrainPlanetProduction = 0;
                }
            }

            // Birch Planets → produce Matrioshka Brains
            if (prestigeData.unlockedBirchPlanets)
            {
                if (FacilityRuntimeBuilder.TryBuildRuntime("birch_planets", infinityData, prestigeData,
                        skillTreeData, prestigePlus, out FacilityRuntime birchRuntime))
                {
                    double matrioshkaProduction = birchRuntime.State.ProductionRate;
                    infinityData.birchPlanetMatrioshkaProduction = matrioshkaProduction;
                    infinityData.matrioshkaBrains[0] += matrioshkaProduction * deltaTime;
                }
                else
                {
                    infinityData.birchPlanetMatrioshkaProduction = 0;
                }
            }

            // Galactic Brains → produce Birch Planets
            if (prestigeData.unlockedGalacticBrains)
            {
                if (FacilityRuntimeBuilder.TryBuildRuntime("galactic_brains", infinityData, prestigeData,
                        skillTreeData, prestigePlus, out FacilityRuntime galacticRuntime))
                {
                    double birchProduction = galacticRuntime.State.ProductionRate;
                    infinityData.galacticBrainBirchProduction = birchProduction;
                    infinityData.birchPlanets[0] += birchProduction * deltaTime;
                }
                else
                {
                    infinityData.galacticBrainBirchProduction = 0;
                }
            }
        }

    }
}

