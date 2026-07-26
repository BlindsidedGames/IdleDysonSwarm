using System;
using GameData;
using Systems.Facilities;
using Systems.Numeric;
using Systems.Stats;
using Unity.Mathematics;
using static Expansion.Oracle;

/*
 * ProductionSystem
 * Purpose: Executes per-tick production for facilities, currencies, and derived progression values.
 * Runs: Runtime gameplay tick (called each frame by GameManager and by OfflineProgressContext delegates).
 * Primary entry points: CalculateProduction(), CalculateDataCenterProduction(), MoneyToAdd(), ScienceToAdd().
 * Owns vs delegates: Owns production update ordering and resource accumulation; delegates stat math to
 * FacilityRuntimeBuilder, GlobalStatPipeline, and ProductionMath.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/GameManager.cs (main runtime caller)
 * - Assets/Scripts/Systems/OfflineProgressSystem.cs (offline simulation uses produced rates)
 * - Assets/Scripts/Systems/Facilities/FacilityRuntimeBuilder.cs (data-driven facility production rates)
 * - Assets/Scripts/Systems/Stats/GlobalStatPipeline.cs (global panel/science/money/shoulders rates)
 *
 * Change notes:
 * - The meaning of infinityData.*Production fields is consumed by UI and offline simulation; keep naming/assignment
 *   semantics stable when adjusting formulas.
 * - Facility card production fields for data centers/planets should represent the same total per-second amount that is
 *   actually applied to resources each tick (avoid base-only display fields that diverge from runtime totals).
 * - Data center -> server production must remain strictly deltaTime-scaled in this system to avoid frame-rate
 *   dependent gains.
 * - Any formula changes here should be mirrored in Oracle parity/debug helpers and legacy bridge characterization.
 */
namespace Systems
{
    public static class ProductionSystem
    {
        private static void Accumulate(ref double target, double rate, double deltaTime)
        {
            NumericResult<double> delta = NumericSafety.Multiply(rate, deltaTime);
            if (!delta.IsSuccess) return;
            NumericResult<double> total = NumericSafety.Add(target, delta.Value);
            if (total.IsSuccess) target = total.Value;
        }

        private static void Accumulate(double[] target, int index, double rate, double deltaTime)
        {
            if (target == null || index < 0 || index >= target.Length) return;
            double value = target[index];
            Accumulate(ref value, rate, deltaTime);
            target[index] = value;
        }

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
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double deltaTime,
            bool recomputeDerivedState = true)
        {
            if (infinityData == null || skillTreeData == null || prestigeData == null || prestigePlus == null)
                return;
            if (!NumericSafety.IsFinite(deltaTime) || deltaTime < 0d)
                return;

            if (deltaTime > 0d)
            {
                // Apply only rates captured at tick start. Rate recomputation happens after every
                // delta has been committed, so a newly produced facility starts next tick.
                double moneyRate =
                    NumericSafety.ClampContinuous(MoneyToAdd(infinityData, skillTreeData));
                double scienceRate =
                    NumericSafety.ClampContinuous(ScienceToAdd(infinityData, skillTreeData));
                double panelRate = infinityData.panelsPerSec;
                double botRate = infinityData.botProduction;
                double lineRate = infinityData.assemblyLineProduction;
                double managerRate = infinityData.managerProduction;
                double serverRate = infinityData.serverProduction;
                double dataCenterRate = infinityData.dataCenterProduction;
                double planetRate = NumericSafety.Add(
                    infinityData.totalPlanetProduction,
                    infinityData.matrioshkaBrainPlanetProduction).Value;
                double matrioshkaRate = infinityData.birchPlanetMatrioshkaProduction;
                double birchRate = infinityData.galacticBrainBirchProduction;

                Accumulate(ref infinityData.money, moneyRate, deltaTime);
                Accumulate(ref infinityData.science, scienceRate, deltaTime);
                Accumulate(ref infinityData.totalPanelsDecayed, panelRate, deltaTime);
                Accumulate(ref infinityData.bots, botRate, deltaTime);
                Accumulate(infinityData.assemblyLines, 0, lineRate, deltaTime);
                Accumulate(infinityData.managers, 0, managerRate, deltaTime);
                Accumulate(infinityData.servers, 0, serverRate, deltaTime);
                Accumulate(infinityData.dataCenters, 0, dataCenterRate, deltaTime);
                Accumulate(infinityData.planets, 0, planetRate, deltaTime);
                Accumulate(infinityData.matrioshkaBrains, 0, matrioshkaRate, deltaTime);
                Accumulate(infinityData.birchPlanets, 0, birchRate, deltaTime);

                CalculateShouldersSkills(infinityData, skillTreeData, prestigeData, deltaTime);
                if (skillTreeData.androids) AddSkillTimerSeconds(infinityData, "androids", deltaTime);
                if (skillTreeData.pocketAndroids) AddSkillTimerSeconds(infinityData, "pocketAndroids", deltaTime);
                if (skillTreeData.superRadiantScattering)
                    AddSkillTimerSeconds(infinityData, "superRadiantScattering", deltaTime);
            }

            if (recomputeDerivedState)
                RecalculateDerivedState(infinityData, skillTreeData, prestigeData, prestigePlus);
        }

        public static void RecalculateDerivedState(
            DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData,
            PrestigePlus prestigePlus)
        {
            CalculatePanelsPerSec(infinityData, skillTreeData, 0d);
            CalculateAssemblyLineProduction(infinityData, skillTreeData, prestigeData, prestigePlus, 0d);
            CalculateManagerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, 0d);
            CalculateServerProduction(infinityData, skillTreeData, prestigeData, prestigePlus, 0d);
            CalculateDataCenterProduction(infinityData, skillTreeData, prestigeData, prestigePlus, 0d);
            CalculatePlanetProduction(infinityData, skillTreeData, prestigeData, 0d);
            CalculatePlanetsPerSecond(infinityData, skillTreeData, 0d);
            CalculateMegaStructureProduction(infinityData, skillTreeData, prestigeData, prestigePlus, 0d);
            ClampDerivedRates(infinityData);
        }

        private static void ClampDerivedRates(DysonVerseInfinityData data)
        {
            data.panelsPerSec = NumericSafety.ClampContinuous(data.panelsPerSec);
            data.botProduction = NumericSafety.ClampContinuous(data.botProduction);
            data.assemblyLineBotProduction =
                NumericSafety.ClampContinuous(data.assemblyLineBotProduction);
            data.assemblyLineProduction = NumericSafety.ClampContinuous(data.assemblyLineProduction);
            data.managerAssemblyLineProduction =
                NumericSafety.ClampContinuous(data.managerAssemblyLineProduction);
            data.managerProduction = NumericSafety.ClampContinuous(data.managerProduction);
            data.serverManagerProduction =
                NumericSafety.ClampContinuous(data.serverManagerProduction);
            data.serverProduction = NumericSafety.ClampContinuous(data.serverProduction);
            data.dataCenterServerProduction =
                NumericSafety.ClampContinuous(data.dataCenterServerProduction);
            data.dataCenterProduction = NumericSafety.ClampContinuous(data.dataCenterProduction);
            data.planetsDataCenterProduction =
                NumericSafety.ClampContinuous(data.planetsDataCenterProduction);
            data.totalPlanetProduction = NumericSafety.ClampContinuous(data.totalPlanetProduction);
            data.matrioshkaBrainPlanetProduction =
                NumericSafety.ClampContinuous(data.matrioshkaBrainPlanetProduction);
            data.birchPlanetMatrioshkaProduction =
                NumericSafety.ClampContinuous(data.birchPlanetMatrioshkaProduction);
            data.galacticBrainBirchProduction =
                NumericSafety.ClampContinuous(data.galacticBrainBirchProduction);
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

            Accumulate(infinityData.planets, 0, infinityData.totalPlanetProduction, deltaTime);

            if (skillTreeData.shouldersOfTheFallen && infinityData.scienceBoostOwned > 0)
            {
                infinityData.scientificPlanetsProduction = NumericSafety.Add(
                    infinityData.scientificPlanetsProduction,
                    math.log2(infinityData.scienceBoostOwned)).Value;
                if (skillTreeData.shoulderSurgery)
                {
                    infinityData.pocketDimensionsProduction = NumericSafety.Add(
                        infinityData.pocketDimensionsProduction,
                        Math.Log(infinityData.scienceBoostOwned, 2)).Value;
                }
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
            if (skillTreeData.avocados && infinityData.planets[1] >= 69) baseProduction *= 2;
            if (skillTreeData.superchargedPower) baseProduction *= 1.5f;

            bool hasRuntime = FacilityRuntimeBuilder.TryBuildRuntime("planets", infinityData, prestigeData, skillTreeData, null,
                out FacilityRuntime runtime);
            infinityData.dataCenterProduction = hasRuntime ? runtime.State.ProductionRate : 0;
            // UI-facing "Planets -> Data Centers" should mirror applied gain, not base-only production.
            infinityData.planetsDataCenterProduction = infinityData.dataCenterProduction;

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

            Accumulate(infinityData.dataCenters, 0, infinityData.dataCenterProduction, deltaTime);
        }

        public static void CalculateDataCenterProduction(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double deltaTime)
        {
            double finalProduction;
            if (FacilityRuntimeBuilder.TryBuildRuntime("data_centers", infinityData, prestigeData, skillTreeData, prestigePlus,
                    out FacilityRuntime runtime))
            {
                finalProduction = runtime.State.ProductionRate;
            }
            else
            {
                finalProduction = 0;
            }

            // UI-facing "Data Centers -> Servers" should mirror applied gain, not base-only production.
            infinityData.dataCenterServerProduction = finalProduction;
            infinityData.serverProduction = finalProduction;
            Accumulate(infinityData.servers, 0, infinityData.serverProduction, deltaTime);
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

            Accumulate(infinityData.managers, 0, infinityData.managerProduction, deltaTime);
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
            Accumulate(infinityData.assemblyLines, 0, infinityData.assemblyLineProduction, deltaTime);
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

            Accumulate(ref infinityData.bots, infinityData.botProduction, deltaTime);

            if (skillTreeData.stellarSacrifices)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, deltaTime);
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, deltaTime);
                double stellarGalaxies = ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
                double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);

                if (infinityData.bots >= botsRequired && stellarGalaxies > 0)
                {
                    NumericResult<double> sacrifice =
                        NumericSafety.Multiply(botsRequired, deltaTime);
                    if (sacrifice.IsSuccess && sacrifice.Value <= infinityData.bots)
                    {
                        DebitResult debit =
                            EconomyTransaction.TryDebit(infinityData.bots, sacrifice.Value);
                        if (debit.Succeeded) infinityData.bots = debit.Balance;
                    }
                }
            }
        }

        public static void CalculatePanelsPerSec(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            double deltaTime)
        {
            if (GlobalStatPipeline.TryCalculatePanelsPerSecond(infinityData, skillTreeData, null, null, out StatResult result))
            {
                infinityData.panelsPerSec = result.Value;
                Accumulate(ref infinityData.totalPanelsDecayed, infinityData.panelsPerSec, deltaTime);
                return;
            }
            infinityData.panelsPerSec = 0;
            Accumulate(ref infinityData.totalPanelsDecayed, infinityData.panelsPerSec, deltaTime);
        }

        public static void CalculateScience(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            double deltaTime)
        {
            Accumulate(ref infinityData.science, ScienceToAdd(infinityData, skillTreeData), deltaTime);
        }

        public static double ScienceToAdd(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData) =>
            skillTreeData.powerUnderwhelming
                ? Math.Pow(infinityData.researchers * infinityData.scienceMulti, 1.05)
                : infinityData.researchers * infinityData.scienceMulti;

        public static void CalculateMoney(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData, double deltaTime)
        {
            Accumulate(ref infinityData.money, MoneyToAdd(infinityData, skillTreeData), deltaTime);
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
                    Accumulate(infinityData.planets, 0, planetProduction, deltaTime);
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
                    Accumulate(infinityData.matrioshkaBrains, 0, matrioshkaProduction, deltaTime);
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
                    Accumulate(infinityData.birchPlanets, 0, birchProduction, deltaTime);
                }
                else
                {
                    infinityData.galacticBrainBirchProduction = 0;
                }
            }
        }

    }
}
