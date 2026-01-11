using System;
using Systems.Stats;
using static Expansion.Oracle;

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
        public static void CalculateModifiers(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            UpdateSciencePerSec(dvid, dvst, dvpd, pp, secrets);
            UpdateMoneyPerSecMulti(dvid, dvst, dvpd, pp, secrets);
            UpdateAssemblyLineMulti(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
            UpdateManagerMulti(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
            UpdateServerMulti(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
            UpdateDataCenterMulti(dvid, dvst, dvpd, pp, maxInfinityBuff);
            UpdatePlanetMulti(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
            SecretBuffs(dvid, dvpd, secrets);
            UpdatePanelLifetime(dvid, dvst, dvpd, pp);
        }

        public static void SecretBuffs(DysonVerseInfinityData dvid, DysonVersePrestigeData dvpd,
            SecretBuffState secrets)
        {
            switch (dvpd.secretsOfTheUniverse)
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
                    dvid.planetUpgradePercent = 0.09f;
                    goto case 13;
                case 13:
                    dvid.aiManagerUpgradePercent = 0.09f;
                    goto case 12;
                case 12:
                    dvid.assemblyLineUpgradePercent = 0.12f;
                    goto case 11;
                case 11:
                    secrets.ScienceMulti = 6;
                    goto case 10;
                case 10:
                    secrets.ScienceMulti = 4;
                    goto case 9;
                case 9:
                    dvid.serverUpgradePercent = 0.09f;
                    goto case 8;
                case 8:
                    secrets.CashMulti = 4;
                    goto case 7;
                case 7:
                    dvid.planetUpgradePercent = 0.06f;
                    goto case 6;
                case 6:
                    secrets.ScienceMulti = 2;
                    goto case 5;
                case 5:
                    dvid.aiManagerUpgradePercent = 0.06f;
                    goto case 4;
                case 4:
                    dvid.assemblyLineUpgradePercent = 0.09f;
                    goto case 3;
                case 3:
                    dvid.serverUpgradePercent = 0.06f;
                    goto case 2;
                case 2:
                    secrets.CashMulti = 2;
                    goto case 1;
                case 1:
                    dvid.assemblyLineUpgradePercent = 0.06f;
                    break;
            }
        }

        public static SecretBuffState BuildSecretBuffState(DysonVersePrestigeData dvpd)
        {
            var secrets = new SecretBuffState();
            if (dvpd == null) return secrets;

            switch (dvpd.secretsOfTheUniverse)
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

        public static void UpdatePanelLifetime(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp)
        {
            if (GlobalStatPipeline.TryCalculatePanelLifetime(dvid, dvst, dvpd, pp, out StatResult result))
            {
                dvid.panelLifetime = result.Value;
                return;
            }
            dvid.panelLifetime = CalculatePanelLifetimeLegacy(dvid, dvst, dvpd, pp);
        }

        internal static double CalculatePanelLifetimeLegacy(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp)
        {
            double lifetime = 10;
            if (dvid.panelLifetime1) lifetime += 1;
            if (dvid.panelLifetime2) lifetime += 2;
            if (dvid.panelLifetime3) lifetime += 3;
            if (dvid.panelLifetime4) lifetime += 4;
            if (dvst.panelMaintenance)
                lifetime += pp.botMultitasking ? 100 : (1 - dvpd.botDistribution) * 100;

            if (dvst.shepherd) lifetime += 600;

            if (dvst.citadelCouncil && dvid.totalPanelsDecayed > 1) lifetime += Math.Log(dvid.totalPanelsDecayed, 1.2);

            if (dvst.panelWarranty) lifetime += 5 * dvst.fragments > 1 ? Math.Pow(2, dvst.fragments - 1) : 1;

            if (dvst.panelLifetime20Tree) lifetime += 20;
            if (dvst.burnOut) lifetime -= 5;
            if (dvst.artificiallyEnhancedPanels && dvid.managers[0] + dvid.managers[1] >= 1)
                lifetime += 5 * Math.Log10(dvid.managers[0] + dvid.managers[1]);
            if (dvst.androids) lifetime += Math.Floor(dvpd.androidsSkillTimer > 600 ? 200 : dvpd.androidsSkillTimer / 3);
            if (dvst.renewableEnergy && dvid.workers >= 1e7f)
                lifetime *= 1 + 0.1 * Math.Log10(dvid.workers / 1e6f);
            if (dvst.stellarDominance)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, 0);
                if (dvid.bots > ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded))
                    lifetime *= 10;
            }
            if (dvst.worthySacrifice) lifetime /= 2;
            return lifetime;
        }

        public static void UpdatePlanetMulti(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculatePlanetModifier(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff,
                    out StatResult result))
            {
                dvid.planetModifier = result.Value;
                return;
            }

            dvid.planetModifier = CalculatePlanetModifierLegacy(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
        }

        internal static double CalculatePlanetModifierLegacy(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            double boost1 = dvid.planetUpgradeOwned * dvid.planetUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(dvst, pp);
            if (dvst.planetsTree) totalBoost *= 2;
            if ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 50 && !dvst.supernova)
                totalBoost *= 2;
            if ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 100 && !dvst.supernova)
                totalBoost *= 2;
            if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

            if ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >
                ProductionMath.AmountForBuildingBoostAfterX(dvst) && !dvst.supernova)
            {
                double perExtraBoost =
                    ((dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) -
                     ProductionMath.AmountForBuildingBoostAfterX(dvst)) /
                    ProductionMath.DivisionForBoostAfterX(dvst);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (dvst.galacticPradigmShift)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, true, 0);
                totalBoost *= galaxiesEngulfed > 1 ? 3 : 1.5f;
            }

            if (dvst.tasteOfPower) totalBoost *= 1.5f;
            if (dvst.indulgingInPower) totalBoost *= 2;
            if (dvst.addictionToPower) totalBoost *= 3f;

            if (dvst.dimensionalCatCables) totalBoost *= 0.75f;

            if (dvpd.infinityPoints >= 5) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.PlanetMulti : 1;

            if (dvst.endOfTheLine) totalBoost /= 2;
            if (dvst.agressiveAlgorithms) totalBoost /= 3;

            return totalBoost;
        }

        public static void UpdateDataCenterMulti(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateDataCenterModifier(dvid, dvst, dvpd, pp, maxInfinityBuff,
                    out StatResult result))
            {
                dvid.dataCenterModifier = result.Value;
                return;
            }

            dvid.dataCenterModifier = CalculateDataCenterModifierLegacy(dvid, dvst, dvpd, pp, maxInfinityBuff);
        }

        internal static double CalculateDataCenterModifierLegacy(DysonVerseInfinityData dvid,
            DysonVerseSkillTreeData dvst, DysonVersePrestigeData dvpd, PrestigePlus pp, double maxInfinityBuff)
        {
            double terraAmount = dvst.terraFirma
                ? dvid.dataCenters[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
                : dvid.dataCenters[1];
            double boost1 = dvid.dataCenterUpgradeOwned * dvid.dataCenterUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(dvst, pp);
            if (dvst.dataCenterTree) totalBoost *= 2;
            if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
            if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(dvst) && !dvst.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(dvst)) /
                                       ProductionMath.DivisionForBoostAfterX(dvst);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (dvst.tasteOfPower) totalBoost *= 1.5f;
            if (dvst.indulgingInPower) totalBoost *= 2f;
            if (dvst.addictionToPower) totalBoost *= 3f;
            if (dvst.whatWillComeToPass) totalBoost *= 1 + 0.01 * dvid.dataCenters[1];
            if (dvst.hypercubeNetworks && dvid.servers[0] + dvid.servers[1] > 1)
                totalBoost *= 1 + 0.1f * Math.Log10(dvid.servers[0] + dvid.servers[1]);

            if (dvpd.infinityPoints >= 4) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);

            if (dvst.agressiveAlgorithms) totalBoost /= 3;

            return totalBoost;
        }

        public static void UpdateServerMulti(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateServerModifier(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff,
                    out StatResult result))
            {
                dvid.serverModifier = result.Value;
                return;
            }

            dvid.serverModifier = CalculateServerModifierLegacy(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
        }

        internal static double CalculateServerModifierLegacy(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            double terraAmount = dvst.terraEculeo
                ? dvid.servers[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
                : dvid.servers[1];
            double boost1 = dvid.serverUpgradeOwned * dvid.serverUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(dvst, pp);
            if (dvst.serverTree) totalBoost *= 2;
            if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
            if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(dvst) && !dvst.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(dvst)) /
                                       ProductionMath.DivisionForBoostAfterX(dvst);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (dvst.tasteOfPower) totalBoost *= 1.5f;
            if (dvst.indulgingInPower) totalBoost *= 2f;
            if (dvst.addictionToPower) totalBoost *= 3f;
            if (dvst.agressiveAlgorithms) totalBoost *= 3;

            if (dvst.clusterNetworking)
                totalBoost *= 1 + (dvid.servers[0] + dvid.servers[1] > 1
                    ? 0.05f * Math.Log10(dvid.servers[0] + dvid.servers[1])
                    : 0);

            if (dvpd.infinityPoints >= 3) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.ServerMulti : 1;
            if (dvst.parallelProcessing && dvid.servers[0] + dvid.servers[1] > 1)
                totalBoost *= 1f + 0.05f * Math.Log(dvid.servers[0] + dvid.servers[1], 2);
            return totalBoost;
        }

        public static void UpdateManagerMulti(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateManagerModifier(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff,
                    out StatResult result))
            {
                dvid.managerModifier = result.Value;
                return;
            }

            dvid.managerModifier = CalculateManagerModifierLegacy(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
        }

        internal static double CalculateManagerModifierLegacy(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            double terraAmount = dvst.terraInfirma
                ? dvid.managers[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
                : dvid.managers[1];
            double boost1 = dvid.aiManagerUpgradeOwned * dvid.aiManagerUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(dvst, pp);
            if (dvst.aiManagerTree) totalBoost *= 2;
            if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
            if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;

            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(dvst) && !dvst.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(dvst)) /
                                       ProductionMath.DivisionForBoostAfterX(dvst);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (dvst.tasteOfPower) totalBoost *= 1.5f;
            if (dvst.indulgingInPower) totalBoost *= 2f;
            if (dvst.addictionToPower) totalBoost *= 3f;
            if (dvst.agressiveAlgorithms) totalBoost *= 3;

            if (dvpd.infinityPoints >= 2) totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.AiMulti : 1;

            return totalBoost;
        }

        public static void UpdateAssemblyLineMulti(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff)
        {
            if (FacilityModifierPipeline.TryCalculateAssemblyLineModifier(dvid, dvst, dvpd, pp, secrets,
                    maxInfinityBuff, out StatResult result))
            {
                dvid.assemblyLineModifier = result.Value;
                return;
            }

            dvid.assemblyLineModifier =
                CalculateAssemblyLineModifierLegacy(dvid, dvst, dvpd, pp, secrets, maxInfinityBuff);
        }

        internal static double CalculateAssemblyLineModifierLegacy(DysonVerseInfinityData dvid,
            DysonVerseSkillTreeData dvst, DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets,
            double maxInfinityBuff)
        {
            double terraAmount = dvst.terraNullius
                ? dvid.assemblyLines[1] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1])
                : dvid.assemblyLines[1];

            double boost1 = dvid.assemblyLineUpgradeOwned * dvid.assemblyLineUpgradePercent;
            double totalBoost = 1 + boost1;
            totalBoost *= GlobalBuff(dvst, pp);
            if (dvst.assemblyLineTree) totalBoost *= 2;
            if (terraAmount >= 50 && !dvst.supernova) totalBoost *= 2;
            if (terraAmount >= 100 && !dvst.supernova) totalBoost *= 2;
            if (dvst.fragmentAssembly && dvst.fragments > 4) totalBoost *= 3;
            if (dvst.worthySacrifice) totalBoost *= 2.5f;
            if (dvst.endOfTheLine) totalBoost *= 5;

            if (dvst.versatileProductionTactics)
                totalBoost *= dvid.planets[0] + (dvst.terraIrradiant ? dvid.planets[1] * 12 : dvid.planets[1]) >= 100
                    ? 2
                    : 1.5f;
            if (terraAmount > ProductionMath.AmountForBuildingBoostAfterX(dvst) && !dvst.supernova)
            {
                double perExtraBoost = (terraAmount - ProductionMath.AmountForBuildingBoostAfterX(dvst)) /
                                       ProductionMath.DivisionForBoostAfterX(dvst);
                perExtraBoost += 1;
                totalBoost *= perExtraBoost;
            }

            if (dvst.oneMinutePlan) totalBoost *= dvid.panelLifetime > 60 ? 5 : 1.5f;
            if (dvst.progressiveAssembly) totalBoost *= 1 + 0.5f * dvst.fragments;

            if (dvst.tasteOfPower) totalBoost *= 1.5f;
            if (dvst.indulgingInPower) totalBoost *= 2f;
            if (dvst.addictionToPower) totalBoost *= 3f;
            if (dvst.agressiveAlgorithms) totalBoost *= 3;
            if (dvst.dysonSubsidies)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, true, 0);
                if (starsSurrounded > 1) totalBoost *= 2;
            }

            if (dvst.purityOfBody && dvst.skillPointsTree > 0) totalBoost *= 1.25f * dvst.skillPointsTree;

            totalBoost *= 1 + Math.Clamp(dvpd.infinityPoints, 0f, maxInfinityBuff);
            totalBoost *= secrets != null ? secrets.AssemblyMulti : 1;

            return totalBoost;
        }

        public static void UpdateSciencePerSec(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets)
        {
            if (GlobalStatPipeline.TryCalculateScienceMultiplier(dvid, dvst, dvpd, pp, secrets,
                    out StatResult result))
            {
                dvid.scienceMulti = result.Value;
                return;
            }

            dvid.scienceMulti = ScienceMultipliers(dvid, dvst, dvpd, pp, secrets);
        }

        public static void UpdateMoneyPerSecMulti(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets)
        {
            if (GlobalStatPipeline.TryCalculateMoneyMultiplier(dvid, dvst, dvpd, pp, secrets,
                    out StatResult result))
            {
                dvid.moneyMulti = result.Value;
                return;
            }

            dvid.moneyMulti = dvst.shouldersOfPrecursors
                ? ScienceMultipliers(dvid, dvst, dvpd, pp, secrets)
                : MoneyMultipliers(dvid, dvst, dvpd, pp, secrets);
        }

        public static double GlobalBuff(DysonVerseSkillTreeData dvst, PrestigePlus pp)
        {
            double multi = 1f;
            if (dvst.purityOfSEssence && dvst.skillPointsTree > 0) multi *= 1.42f * dvst.skillPointsTree;
            if (dvst.superRadiantScattering) multi *= 1 + 0.01f * dvst.superRadiantScatteringTimer;
            if (pp.avocatoPurchased)
            {
                if (pp.avocatoIP >= 10)
                    multi *= Math.Log10(pp.avocatoIP);
                if (pp.avocatoInfluence >= 10)
                    multi *= Math.Log10(pp.avocatoInfluence);
                if (pp.avocatoStrangeMatter >= 10)
                    multi *= Math.Log10(pp.avocatoStrangeMatter);
                if (pp.avocatoOverflow >= 1)
                    multi *= 1 + pp.avocatoOverflow;
            }

            return multi;
        }

        public static double MoneyMultipliers(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets)
        {
            double moneyBoost = dvid.moneyMultiUpgradeOwned * dvid.moneyMultiUpgradePercent;
            if (dvst.regulatedAcademia) moneyBoost *= 1.02f + 1.01f * (dvst.fragments - 1);
            double totalBoost = 1 + moneyBoost;
            totalBoost *= GlobalBuff(dvst, pp);
            if (dvst.startHereTree) totalBoost *= 1.2f;
            totalBoost *= 1 + pp.cash * 5 / 100;
            totalBoost *= secrets.CashMulti;
            if (dvst.economicRevolution && dvpd.botDistribution <= .5f ||
                dvst.economicRevolution && pp.botMultitasking) totalBoost *= 5;
            if (dvst.superchargedPower) totalBoost *= 1.5f;
            if (dvst.higgsBoson)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, true, 0);
                if (galaxiesEngulfed >= 1) totalBoost *= 1 + 0.1f * galaxiesEngulfed;
            }
            if (dvst.workerBoost)
            {
                if (!pp.botMultitasking)
                    totalBoost *= (1f - dvpd.botDistribution) * 100f;
                else
                    totalBoost *= 100;
            }

            if (dvst.economicDominance)
                totalBoost *= 20f;

            if (dvst.renegade) totalBoost *= 50f;

            if (dvst.shouldersOfTheRevolution) totalBoost *= 1 + 0.01f * dvid.scienceBoostOwned;
            if (dvst.dysonSubsidies)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, true, 0);
                if (starsSurrounded < 1) totalBoost *= 3;
            }

            if (dvst.purityOfMind && dvst.skillPointsTree > 0) totalBoost *= 1.5f * dvst.skillPointsTree;
            if (dvst.monetaryPolicy) totalBoost *= 1f + 0.75f * dvst.fragments;
            totalBoost *= dvst.tasteOfPower ? dvst.indulgingInPower ? dvst.addictionToPower ? 0.5f : 0.6f : 0.75f : 1;

            if (dvst.stellarObliteration)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, true, 0);
                if (galaxiesEngulfed >= 1)
                {
                    double galaxiesEngulfedRaw = ProductionMath.GalaxiesEngulfed(dvid, false, false, 0);
                    totalBoost /= galaxiesEngulfedRaw;
                }
            }
            if (dvst.fusionReactors)
                totalBoost *= 0.75f;
            if (dvst.coldFusion)
                totalBoost *= 0.5f;
            if (dvst.scientificDominance) totalBoost /= 4f;
            if (dvst.stellarDominance)
            {
                double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, 0);
                if (dvid.bots > ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded))
                    totalBoost /= 100;
            }
            return totalBoost;
        }

        public static double ScienceMultipliers(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets)
        {
            double scienceBoost = dvid.scienceBoostOwned * dvid.scienceBoostPercent;
            if (dvst.regulatedAcademia) scienceBoost *= 1.02f + 1.01f * (dvst.fragments - 1);
            double totalBoost = 1 + scienceBoost;
            totalBoost *= GlobalBuff(dvst, pp);
            if (dvst.doubleScienceTree) totalBoost *= 2;
            if (dvst.startHereTree) totalBoost *= 1.2f;
            if (dvst.producedAsScienceTree)
            {
                if (!pp.botMultitasking)
                    totalBoost *= dvpd.botDistribution * 100;
                else
                    totalBoost *= 100;
            }

            if (dvst.idleSpaceFlight)
                totalBoost += 0.01 * (dvid.panelsPerSec * dvid.panelLifetime) / 100000000;

            if (dvst.scientificRevolution && dvpd.botDistribution >= .5f ||
                dvst.scientificRevolution && pp.botMultitasking) totalBoost *= 5;
            if (dvst.superchargedPower) totalBoost *= 1.5;
            if (dvst.purityOfMind && dvst.skillPointsTree > 0) totalBoost *= 1.5 * dvst.skillPointsTree;
            totalBoost *= 1 + pp.science * 5 / 100;
            totalBoost *= secrets.ScienceMulti;
            if (dvst.coldFusion)
                totalBoost *= 10f;
            if (dvst.scientificDominance)
                totalBoost *= 20f;
            if (dvst.paragon) totalBoost *= 50f;
            totalBoost *= dvst.tasteOfPower ? dvst.indulgingInPower ? dvst.addictionToPower ? 0.5f : 0.6f : 0.75f : 1;

            if (dvst.stellarObliteration)
            {
                double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, true, 0);
                if (galaxiesEngulfed >= 1)
                {
                    double galaxiesEngulfedRaw = ProductionMath.GalaxiesEngulfed(dvid, false, false, 0);
                    totalBoost /= galaxiesEngulfedRaw;
                }
            }
            if (dvst.economicDominance) totalBoost /= 4f;

            return totalBoost;
        }
    }
}
