using System;
using Systems.Stats;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.RealityConstants;

namespace Systems
{
    public sealed class SecretBuffState
    {
        public double PlanetMulti = 1;
        public double ServerMulti = 1;
        public double AiMulti = 1;
        public double AssemblyMulti = 1;
        public double CashMulti = 1;
        public double ScienceMulti = 1;
    }

    public static class ModifierSystem
    {
        public static void CalculateModifiers(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            UpdateSciencePerSec(infinityData, skillTreeData, prestigeData, prestigePlus, secrets);
            UpdateMoneyPerSecMulti(infinityData, skillTreeData, prestigeData, prestigePlus, secrets);
            UpdateAssemblyLineMulti(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff);
            UpdateManagerMulti(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff);
            UpdateServerMulti(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff);
            UpdateDataCenterMulti(infinityData, skillTreeData, prestigeData, prestigePlus, maxInfinityBuff);
            UpdatePlanetMulti(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff);
            SecretBuffs(infinityData, prestigeData, secrets);
            UpdatePanelLifetime(infinityData, skillTreeData, prestigeData, prestigePlus);
        }

        public static void SecretBuffs(DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData,
            SecretBuffState secrets)
        {
            switch (prestigeData.secretsOfTheUniverse)
            {
                case 27:
                    secrets.AiMulti = 42;
                    goto case 26;
                case 26:
                    secrets.AiMulti = 3;
                    goto case 25;
                case 25:
                    secrets.CashMulti = 8;
                    goto case 24;
                case 24:
                    secrets.AiMulti = 2.5f;
                    goto case 23;
                case 23:
                    secrets.AssemblyMulti = 7;
                    goto case 22;
                case 22:
                    secrets.ScienceMulti = 10;
                    goto case 21;
                case 21:
                    secrets.ServerMulti = 3;
                    goto case 20;
                case 20:
                    secrets.ServerMulti = 2;
                    goto case 19;
                case 19:
                    secrets.CashMulti = 6;
                    goto case 18;
                case 18:
                    secrets.PlanetMulti = 5;
                    goto case 17;
                case 17:
                    secrets.PlanetMulti = 2;
                    goto case 16;
                case 16:
                    secrets.AssemblyMulti = 2;
                    goto case 15;
                case 15:
                    secrets.ScienceMulti = 8;
                    goto case 14;
                case 14:
                    infinityData.planetUpgradePercent = 0.09f;
                    goto case 13;
                case 13:
                    infinityData.aiManagerUpgradePercent = 0.09f;
                    goto case 12;
                case 12:
                    infinityData.assemblyLineUpgradePercent = 0.12f;
                    goto case 11;
                case 11:
                    secrets.ScienceMulti = 6;
                    goto case 10;
                case 10:
                    secrets.ScienceMulti = 4;
                    goto case 9;
                case 9:
                    infinityData.serverUpgradePercent = 0.09f;
                    goto case 8;
                case 8:
                    secrets.CashMulti = 4;
                    goto case 7;
                case 7:
                    infinityData.planetUpgradePercent = 0.06f;
                    goto case 6;
                case 6:
                    secrets.ScienceMulti = 2;
                    goto case 5;
                case 5:
                    infinityData.aiManagerUpgradePercent = 0.06f;
                    goto case 4;
                case 4:
                    infinityData.assemblyLineUpgradePercent = 0.09f;
                    goto case 3;
                case 3:
                    infinityData.serverUpgradePercent = 0.06f;
                    goto case 2;
                case 2:
                    secrets.CashMulti = 2;
                    goto case 1;
                case 1:
                    infinityData.assemblyLineUpgradePercent = 0.06f;
                    break;
            }
        }

        public static SecretBuffState BuildSecretBuffState(DysonVersePrestigeData prestigeData)
        {
            var secrets = new SecretBuffState();
            if (prestigeData == null) return secrets;

            switch (prestigeData.secretsOfTheUniverse)
            {
                case 27:
                    secrets.AiMulti = 42;
                    goto case 26;
                case 26:
                    secrets.AiMulti = 3;
                    goto case 25;
                case 25:
                    secrets.CashMulti = 8;
                    goto case 24;
                case 24:
                    secrets.AiMulti = 2.5;
                    goto case 23;
                case 23:
                    secrets.AssemblyMulti = 7;
                    goto case 22;
                case 22:
                    secrets.ScienceMulti = 10;
                    goto case 21;
                case 21:
                    secrets.ServerMulti = 3;
                    goto case 20;
                case 20:
                    secrets.ServerMulti = 2;
                    goto case 19;
                case 19:
                    secrets.CashMulti = 6;
                    goto case 18;
                case 18:
                    secrets.PlanetMulti = 5;
                    goto case 17;
                case 17:
                    secrets.PlanetMulti = 2;
                    goto case 16;
                case 16:
                    secrets.AssemblyMulti = 2;
                    goto case 15;
                case 15:
                    secrets.ScienceMulti = 8;
                    goto case 14;
                case 14:
                    goto case 13;
                case 13:
                    goto case 12;
                case 12:
                    goto case 11;
                case 11:
                    secrets.ScienceMulti = 6;
                    goto case 10;
                case 10:
                    secrets.ScienceMulti = 4;
                    goto case 9;
                case 9:
                    goto case 8;
                case 8:
                    secrets.CashMulti = 4;
                    goto case 7;
                case 7:
                    goto case 6;
                case 6:
                    secrets.ScienceMulti = 2;
                    goto case 5;
                case 5:
                    goto case 4;
                case 4:
                    goto case 3;
                case 3:
                    goto case 2;
                case 2:
                    secrets.CashMulti = 2;
                    goto case 1;
                case 1:
                    break;
            }

            return secrets;
        }

        public static void UpdatePanelLifetime(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus)
        {
            if (GlobalStatPipeline.TryCalculatePanelLifetime(infinityData, skillTreeData, prestigeData, prestigePlus, out StatResult result))
            {
                infinityData.panelLifetime = result.Value;
            }
            else
            {
                infinityData.panelLifetime = 10;
            }
        }

        internal static double CalculatePanelLifetimeLegacy(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus)
        {
            double lifetime = 10;
            if (infinityData.panelLifetime1) lifetime += 1;
            if (infinityData.panelLifetime2) lifetime += 2;
            if (infinityData.panelLifetime3) lifetime += 3;
            if (infinityData.panelLifetime4) lifetime += 4;
            if (skillTreeData.panelMaintenance)
                lifetime += prestigePlus.botMultitasking ? 100 : (1 - prestigeData.botDistribution) * 100;

            if (skillTreeData.shepherd) lifetime += 600;

            if (skillTreeData.citadelCouncil && infinityData.totalPanelsDecayed > 1) lifetime += Math.Log(infinityData.totalPanelsDecayed, 1.2);

            if (skillTreeData.panelWarranty) lifetime += 5 * skillTreeData.fragments > 1 ? Math.Pow(2, skillTreeData.fragments - 1) : 1;

            if (skillTreeData.panelLifetime20Tree) lifetime += 20;
            if (skillTreeData.burnOut) lifetime -= 5;
            if (skillTreeData.artificiallyEnhancedPanels && infinityData.managers[0] + infinityData.managers[1] >= 1)
                lifetime += 5 * Math.Log10(infinityData.managers[0] + infinityData.managers[1]);
            if (skillTreeData.androids)
            {
                double androidsTimer = GetSkillTimerSeconds(infinityData, "androids");
                lifetime += Math.Floor(androidsTimer > 600 ? 200 : androidsTimer / 3);
            }
            if (skillTreeData.renewableEnergy && infinityData.workers >= 1e7f)
                lifetime *= 1 + 0.1 * Math.Log10(infinityData.workers / 1e6f);
            if (skillTreeData.stellarDominance)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
                if (infinityData.bots > ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded))
                    lifetime *= 10;
            }
            if (skillTreeData.worthySacrifice) lifetime /= 2;
            return lifetime;
        }

        public static void UpdatePlanetMulti(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculatePlanetModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff,
                    out StatResult result))
            {
                infinityData.planetModifier = result.Value;
            }
            else
            {
                infinityData.planetModifier = 1;
            }
        }

        internal static double CalculatePlanetModifierLegacy(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            double boost1 = infinityData.planetUpgradeOwned * infinityData.planetUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(infinityData, skillTreeData, prestigePlus);
            if (skillTreeData.planetsTree) totalBoost *= 2;
            if ((skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) >= 50 && !skillTreeData.supernova)
                totalBoost *= 2;
            if ((skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) >= 100 && !skillTreeData.supernova)
                totalBoost *= 2;
            if (skillTreeData.fragmentAssembly && skillTreeData.fragments > 4) totalBoost *= 3;

            if ((skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) >
                ProductionMath.AmountForBuildingBoostAfterX(skillTreeData) && !skillTreeData.supernova)
            {
                double perExtraBoost =
                    ((skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) -
                     ProductionMath.AmountForBuildingBoostAfterX(skillTreeData)) /
                    ProductionMath.DivisionForBoostAfterX(skillTreeData);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (skillTreeData.galacticPradigmShift)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                totalBoost *= galaxiesEngulfed > 1 ? 3 : 1.5f;
            }

            if (skillTreeData.tasteOfPower) totalBoost *= 1.5f;
            if (skillTreeData.indulgingInPower) totalBoost *= 2;
            if (skillTreeData.addictionToPower) totalBoost *= 3f;

            if (skillTreeData.dimensionalCatCables) totalBoost *= 0.75f;

            if (prestigeData.infinityPoints >= 5) totalBoost *= 1 + Math.Clamp(prestigeData.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.PlanetMulti : 1;

            if (skillTreeData.endOfTheLine) totalBoost /= 2;
            if (skillTreeData.agressiveAlgorithms) totalBoost /= 3;

            return totalBoost;
        }

        public static void UpdateDataCenterMulti(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateDataCenterModifier(infinityData, skillTreeData, prestigeData, prestigePlus, maxInfinityBuff,
                    out StatResult result))
            {
                infinityData.dataCenterModifier = result.Value;
            }
            else
            {
                infinityData.dataCenterModifier = 1;
            }
        }

        internal static double CalculateDataCenterModifierLegacy(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData, DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double maxInfinityBuff)
        {
            double terraAmount = skillTreeData.terraFirma
                ? infinityData.dataCenters[1] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1])
                : infinityData.dataCenters[1];
            double boost1 = infinityData.dataCenterUpgradeOwned * infinityData.dataCenterUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(infinityData, skillTreeData, prestigePlus);
            if (skillTreeData.dataCenterTree) totalBoost *= 2;
            if (terraAmount >= 50 && !skillTreeData.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !skillTreeData.supernova) totalBoost *= 2;
            if (skillTreeData.fragmentAssembly && skillTreeData.fragments > 4) totalBoost *= 3;

            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(skillTreeData) && !skillTreeData.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(skillTreeData)) /
                                       ProductionMath.DivisionForBoostAfterX(skillTreeData);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (skillTreeData.tasteOfPower) totalBoost *= 1.5f;
            if (skillTreeData.indulgingInPower) totalBoost *= 2f;
            if (skillTreeData.addictionToPower) totalBoost *= 3f;
            if (skillTreeData.whatWillComeToPass) totalBoost *= 1 + 0.01 * infinityData.dataCenters[1];
            if (skillTreeData.hypercubeNetworks && infinityData.servers[0] + infinityData.servers[1] > 1)
                totalBoost *= 1 + 0.1f * Math.Log10(infinityData.servers[0] + infinityData.servers[1]);

            if (prestigeData.infinityPoints >= 4) totalBoost *= 1 + Math.Clamp(prestigeData.infinityPoints, 0f, maxInfinityBuff);

            if (skillTreeData.agressiveAlgorithms) totalBoost /= 3;

            return totalBoost;
        }

        public static void UpdateServerMulti(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateServerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff,
                    out StatResult result))
            {
                infinityData.serverModifier = result.Value;
            }
            else
            {
                infinityData.serverModifier = 1;
            }
        }

        internal static double CalculateServerModifierLegacy(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            double terraAmount = skillTreeData.terraEculeo
                ? infinityData.servers[1] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1])
                : infinityData.servers[1];
            double boost1 = infinityData.serverUpgradeOwned * infinityData.serverUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(infinityData, skillTreeData, prestigePlus);
            if (skillTreeData.serverTree) totalBoost *= 2;
            if (terraAmount >= 50 && !skillTreeData.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !skillTreeData.supernova) totalBoost *= 2;
            if (skillTreeData.fragmentAssembly && skillTreeData.fragments > 4) totalBoost *= 3;

            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(skillTreeData) && !skillTreeData.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(skillTreeData)) /
                                       ProductionMath.DivisionForBoostAfterX(skillTreeData);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (skillTreeData.tasteOfPower) totalBoost *= 1.5f;
            if (skillTreeData.indulgingInPower) totalBoost *= 2f;
            if (skillTreeData.addictionToPower) totalBoost *= 3f;
            if (skillTreeData.agressiveAlgorithms) totalBoost *= 3;

            if (skillTreeData.clusterNetworking)
                totalBoost *= 1 + (infinityData.servers[0] + infinityData.servers[1] > 1
                    ? 0.05f * Math.Log10(infinityData.servers[0] + infinityData.servers[1])
                    : 0);

            if (prestigeData.infinityPoints >= 3) totalBoost *= 1 + Math.Clamp(prestigeData.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.ServerMulti : 1;
            if (skillTreeData.parallelProcessing && infinityData.servers[0] + infinityData.servers[1] > 1)
                totalBoost *= 1f + 0.05f * Math.Log(infinityData.servers[0] + infinityData.servers[1], 2);
            return totalBoost;
        }

        public static void UpdateManagerMulti(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateManagerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets, maxInfinityBuff,
                    out StatResult result))
            {
                infinityData.managerModifier = result.Value;
            }
            else
            {
                infinityData.managerModifier = 1;
            }
        }

        internal static double CalculateManagerModifierLegacy(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            double terraAmount = skillTreeData.terraInfirma
                ? infinityData.managers[1] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1])
                : infinityData.managers[1];
            double boost1 = infinityData.aiManagerUpgradeOwned * infinityData.aiManagerUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(infinityData, skillTreeData, prestigePlus);
            if (skillTreeData.aiManagerTree) totalBoost *= 2;
            if (terraAmount >= 50 && !skillTreeData.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !skillTreeData.supernova) totalBoost *= 2;
            if (skillTreeData.fragmentAssembly && skillTreeData.fragments > 4) totalBoost *= 3;

            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(skillTreeData) && !skillTreeData.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(skillTreeData)) /
                                       ProductionMath.DivisionForBoostAfterX(skillTreeData);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (skillTreeData.tasteOfPower) totalBoost *= 1.5f;
            if (skillTreeData.indulgingInPower) totalBoost *= 2f;
            if (skillTreeData.addictionToPower) totalBoost *= 3f;
            if (skillTreeData.agressiveAlgorithms) totalBoost *= 3;

            if (prestigeData.infinityPoints >= 2) totalBoost *= 1 + Math.Clamp(prestigeData.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.AiMulti : 1;

            return totalBoost;
        }

        public static void UpdateAssemblyLineMulti(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateAssemblyLineModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                    maxInfinityBuff, out StatResult result))
            {
                infinityData.assemblyLineModifier = result.Value;
            }
            else
            {
                infinityData.assemblyLineModifier = 1;
            }
        }

        internal static double CalculateAssemblyLineModifierLegacy(DysonVerseInfinityData infinityData,
            DysonVerseSkillTreeData skillTreeData, DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets,
            double maxInfinityBuff)
        {
            double terraAmount = skillTreeData.terraNullius
                ? infinityData.assemblyLines[1] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1])
                : infinityData.assemblyLines[1];

            double boost1 = infinityData.assemblyLineUpgradeOwned * infinityData.assemblyLineUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(infinityData, skillTreeData, prestigePlus);
            if (skillTreeData.assemblyLineTree) totalBoost *= 2;
            if (terraAmount >= 50 && !skillTreeData.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !skillTreeData.supernova) totalBoost *= 2;
            if (skillTreeData.fragmentAssembly && skillTreeData.fragments > 4) totalBoost *= 3;
            if (skillTreeData.worthySacrifice) totalBoost *= 2.5f;
            if (skillTreeData.endOfTheLine) totalBoost *= 5;

            if (skillTreeData.versatileProductionTactics)
                totalBoost *= infinityData.planets[0] + (skillTreeData.terraIrradiant ? infinityData.planets[1] * 12 : infinityData.planets[1]) >= 100
                    ? 2
                    : 1.5f;
            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(skillTreeData) && !skillTreeData.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(skillTreeData)) /
                                       ProductionMath.DivisionForBoostAfterX(skillTreeData);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (skillTreeData.oneMinutePlan) totalBoost *= infinityData.panelLifetime > 60 ? 5 : 1.5f;
            if (skillTreeData.progressiveAssembly) totalBoost *= 1 + 0.5f * skillTreeData.fragments;

            if (skillTreeData.tasteOfPower) totalBoost *= 1.5f;
            if (skillTreeData.indulgingInPower) totalBoost *= 2f;
            if (skillTreeData.addictionToPower) totalBoost *= 3f;
            if (skillTreeData.agressiveAlgorithms) totalBoost *= 3;
            if (skillTreeData.dysonSubsidies)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, true, 0);
                if (starsSurrounded > 1) totalBoost *= 2;
            }

            if (skillTreeData.purityOfBody && skillTreeData.skillPointsTree > 0) totalBoost *= 1.25f * skillTreeData.skillPointsTree;

            totalBoost *= 1 + Math.Clamp(prestigeData.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.AssemblyMulti : 1;

            return totalBoost;
        }

        public static void UpdateSciencePerSec(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets)
        {
            if (GlobalStatPipeline.TryCalculateScienceMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                    out StatResult result))
            {
                infinityData.scienceMulti = result.Value;
            }
            else
            {
                infinityData.scienceMulti = 1;
            }
        }

        public static void UpdateMoneyPerSecMulti(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets)
        {
            if (GlobalStatPipeline.TryCalculateMoneyMultiplier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                    out StatResult result))
            {
                infinityData.moneyMulti = result.Value;
            }
            else
            {
                infinityData.moneyMulti = 1;
            }
        }

        public static double GlobalBuff(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData, PrestigePlus prestigePlus)
        {
            double multi = 1f;
            if (skillTreeData.purityOfSEssence && skillTreeData.skillPointsTree > 0) multi *= 1.42f * skillTreeData.skillPointsTree;
            if (skillTreeData.superRadiantScattering)
            {
                double scatteringTimer = GetSkillTimerSeconds(infinityData, "superRadiantScattering");
                multi *= 1 + 0.01f * scatteringTimer;
            }
            if (prestigePlus.avocatoPurchased)
            {
                if (prestigePlus.avocatoIP >= AvocadoLogThreshold)
                    multi *= Math.Log10(prestigePlus.avocatoIP);
                if (prestigePlus.avocatoInfluence >= AvocadoLogThreshold)
                    multi *= Math.Log10(prestigePlus.avocatoInfluence);
                if (prestigePlus.avocatoStrangeMatter >= AvocadoLogThreshold)
                    multi *= Math.Log10(prestigePlus.avocatoStrangeMatter);
                if (prestigePlus.avocatoOverflow >= 1)
                    multi *= 1 + prestigePlus.avocatoOverflow;
            }

            return multi;
        }

        public static double MoneyMultipliers(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets)
        {
            double moneyBoost = infinityData.moneyMultiUpgradeOwned * infinityData.moneyMultiUpgradePercent;
            if (skillTreeData.regulatedAcademia) moneyBoost *= 1.02f + 1.01f * (skillTreeData.fragments - 1);
            double totalBoost = 1 + moneyBoost;
            totalBoost *= GlobalBuff(infinityData, skillTreeData, prestigePlus);
            if (skillTreeData.startHereTree) totalBoost *= 1.2f;
            totalBoost *= 1 + prestigePlus.cash * 5 / 100;
            totalBoost *= secrets.CashMulti;
            if (skillTreeData.economicRevolution && prestigeData.botDistribution <= .5f ||
                skillTreeData.economicRevolution && prestigePlus.botMultitasking) totalBoost *= 5;
            if (skillTreeData.superchargedPower) totalBoost *= 1.5f;
            if (skillTreeData.higgsBoson)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                if (galaxiesEngulfed >= 1) totalBoost *= 1 + 0.1f * galaxiesEngulfed;
            }
            if (skillTreeData.workerBoost)
            {
                if (!prestigePlus.botMultitasking)
                    totalBoost *= (1f - prestigeData.botDistribution) * 100f;
                else
                    totalBoost *= 100;
            }

            if (skillTreeData.economicDominance)
                totalBoost *= 20f;

            if (skillTreeData.renegade) totalBoost *= 50f;

            if (skillTreeData.shouldersOfTheRevolution) totalBoost *= 1 + 0.01f * infinityData.scienceBoostOwned;
            if (skillTreeData.dysonSubsidies)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, true, 0);
                if (starsSurrounded < 1) totalBoost *= 3;
            }

            if (skillTreeData.purityOfMind && skillTreeData.skillPointsTree > 0) totalBoost *= 1.5f * skillTreeData.skillPointsTree;
            if (skillTreeData.monetaryPolicy) totalBoost *= 1f + 0.75f * skillTreeData.fragments;
            totalBoost *= skillTreeData.tasteOfPower ? skillTreeData.indulgingInPower ? skillTreeData.addictionToPower ? 0.5f : 0.6f : 0.75f : 1;

            if (skillTreeData.stellarObliteration)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                if (galaxiesEngulfed >= 1)
                {
                    double galaxiesEngulfedRaw = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
                    totalBoost /= galaxiesEngulfedRaw;
                }
            }
            if (skillTreeData.fusionReactors)
                totalBoost *= 0.75f;
            if (skillTreeData.coldFusion)
                totalBoost *= 0.5f;
            if (skillTreeData.scientificDominance) totalBoost /= 4f;
            if (skillTreeData.stellarDominance)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
                if (infinityData.bots > ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded))
                    totalBoost /= 100;
            }
            return totalBoost;
        }

        public static double ScienceMultipliers(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets)
        {
            double scienceBoost = infinityData.scienceBoostOwned * infinityData.scienceBoostPercent;
            if (skillTreeData.regulatedAcademia) scienceBoost *= 1.02f + 1.01f * (skillTreeData.fragments - 1);
            double totalBoost = 1 + scienceBoost;
            totalBoost *= GlobalBuff(infinityData, skillTreeData, prestigePlus);
            if (skillTreeData.doubleScienceTree) totalBoost *= 2;
            if (skillTreeData.startHereTree) totalBoost *= 1.2f;
            if (skillTreeData.producedAsScienceTree)
            {
                if (!prestigePlus.botMultitasking)
                    totalBoost *= prestigeData.botDistribution * 100;
                else
                    totalBoost *= 100;
            }

            if (skillTreeData.idleSpaceFlight)
                totalBoost += 0.01 * (infinityData.panelsPerSec * infinityData.panelLifetime) / 100000000;

            if (skillTreeData.scientificRevolution && prestigeData.botDistribution >= .5f ||
                skillTreeData.scientificRevolution && prestigePlus.botMultitasking) totalBoost *= 5;
            if (skillTreeData.superchargedPower) totalBoost *= 1.5;
            if (skillTreeData.purityOfMind && skillTreeData.skillPointsTree > 0) totalBoost *= 1.5 * skillTreeData.skillPointsTree;
            totalBoost *= 1 + prestigePlus.science * 5 / 100;
            totalBoost *= secrets.ScienceMulti;
            if (skillTreeData.coldFusion)
                totalBoost *= 10f;
            if (skillTreeData.scientificDominance)
                totalBoost *= 20f;
            if (skillTreeData.paragon) totalBoost *= 50f;
            totalBoost *= skillTreeData.tasteOfPower ? skillTreeData.indulgingInPower ? skillTreeData.addictionToPower ? 0.5f : 0.6f : 0.75f : 1;

            if (skillTreeData.stellarObliteration)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, true, 0);
                if (galaxiesEngulfed >= 1)
                {
                    double galaxiesEngulfedRaw = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
                    totalBoost /= galaxiesEngulfedRaw;
                }
            }
            if (skillTreeData.economicDominance) totalBoost /= 4f;

            return totalBoost;
        }
    }
}

