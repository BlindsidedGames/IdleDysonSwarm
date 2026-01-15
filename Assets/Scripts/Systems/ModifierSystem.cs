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

    /// <summary>
    /// Defines the type of buff applied by a secret level.
    /// </summary>
    internal enum SecretBuffType
    {
        PlanetMulti,
        ServerMulti,
        AiMulti,
        AssemblyMulti,
        CashMulti,
        ScienceMulti,
        AssemblyLineUpgradePercent,
        ServerUpgradePercent,
        AiManagerUpgradePercent,
        PlanetUpgradePercent
    }

    /// <summary>
    /// Represents a single secret buff entry in the progression table.
    /// </summary>
    internal readonly struct SecretBuffEntry
    {
        public readonly int Level;
        public readonly SecretBuffType BuffType;
        public readonly double Value;

        public SecretBuffEntry(int level, SecretBuffType buffType, double value)
        {
            Level = level;
            BuffType = buffType;
            Value = value;
        }
    }

    public static class ModifierSystem
    {
        /// <summary>
        /// Table-driven secret buff progression. Each entry defines a level, buff type, and value.
        /// Buffs are applied in order from lowest level to highest, with higher levels overwriting lower values.
        /// </summary>
        private static readonly SecretBuffEntry[] SecretBuffTable =
        {
            // Level 1 - Assembly Line Upgrade Percent
            new SecretBuffEntry(1, SecretBuffType.AssemblyLineUpgradePercent, 0.06),
            // Level 2 - Cash Multiplier
            new SecretBuffEntry(2, SecretBuffType.CashMulti, 2),
            // Level 3 - Server Upgrade Percent
            new SecretBuffEntry(3, SecretBuffType.ServerUpgradePercent, 0.06),
            // Level 4 - Assembly Line Upgrade Percent (overwrite)
            new SecretBuffEntry(4, SecretBuffType.AssemblyLineUpgradePercent, 0.09),
            // Level 5 - AI Manager Upgrade Percent
            new SecretBuffEntry(5, SecretBuffType.AiManagerUpgradePercent, 0.06),
            // Level 6 - Science Multiplier
            new SecretBuffEntry(6, SecretBuffType.ScienceMulti, 2),
            // Level 7 - Planet Upgrade Percent
            new SecretBuffEntry(7, SecretBuffType.PlanetUpgradePercent, 0.06),
            // Level 8 - Cash Multiplier (overwrite)
            new SecretBuffEntry(8, SecretBuffType.CashMulti, 4),
            // Level 9 - Server Upgrade Percent (overwrite)
            new SecretBuffEntry(9, SecretBuffType.ServerUpgradePercent, 0.09),
            // Level 10 - Science Multiplier (overwrite)
            new SecretBuffEntry(10, SecretBuffType.ScienceMulti, 4),
            // Level 11 - Science Multiplier (overwrite)
            new SecretBuffEntry(11, SecretBuffType.ScienceMulti, 6),
            // Level 12 - Assembly Line Upgrade Percent (overwrite)
            new SecretBuffEntry(12, SecretBuffType.AssemblyLineUpgradePercent, 0.12),
            // Level 13 - AI Manager Upgrade Percent (overwrite)
            new SecretBuffEntry(13, SecretBuffType.AiManagerUpgradePercent, 0.09),
            // Level 14 - Planet Upgrade Percent (overwrite)
            new SecretBuffEntry(14, SecretBuffType.PlanetUpgradePercent, 0.09),
            // Level 15 - Science Multiplier (overwrite)
            new SecretBuffEntry(15, SecretBuffType.ScienceMulti, 8),
            // Level 16 - Assembly Multiplier
            new SecretBuffEntry(16, SecretBuffType.AssemblyMulti, 2),
            // Level 17 - Planet Multiplier
            new SecretBuffEntry(17, SecretBuffType.PlanetMulti, 2),
            // Level 18 - Planet Multiplier (overwrite)
            new SecretBuffEntry(18, SecretBuffType.PlanetMulti, 5),
            // Level 19 - Cash Multiplier (overwrite)
            new SecretBuffEntry(19, SecretBuffType.CashMulti, 6),
            // Level 20 - Server Multiplier
            new SecretBuffEntry(20, SecretBuffType.ServerMulti, 2),
            // Level 21 - Server Multiplier (overwrite)
            new SecretBuffEntry(21, SecretBuffType.ServerMulti, 3),
            // Level 22 - Science Multiplier (overwrite)
            new SecretBuffEntry(22, SecretBuffType.ScienceMulti, 10),
            // Level 23 - Assembly Multiplier (overwrite)
            new SecretBuffEntry(23, SecretBuffType.AssemblyMulti, 7),
            // Level 24 - AI Multiplier
            new SecretBuffEntry(24, SecretBuffType.AiMulti, 2.5),
            // Level 25 - Cash Multiplier (overwrite)
            new SecretBuffEntry(25, SecretBuffType.CashMulti, 8),
            // Level 26 - AI Multiplier (overwrite)
            new SecretBuffEntry(26, SecretBuffType.AiMulti, 3),
            // Level 27 - AI Multiplier (overwrite)
            new SecretBuffEntry(27, SecretBuffType.AiMulti, 42),
        };

        /// <summary>
        /// Applies a single buff entry to the appropriate target.
        /// </summary>
        private static void ApplyBuff(SecretBuffEntry entry, SecretBuffState secrets, DysonVerseInfinityData infinityData)
        {
            switch (entry.BuffType)
            {
                case SecretBuffType.PlanetMulti:
                    secrets.PlanetMulti = entry.Value;
                    break;
                case SecretBuffType.ServerMulti:
                    secrets.ServerMulti = entry.Value;
                    break;
                case SecretBuffType.AiMulti:
                    secrets.AiMulti = entry.Value;
                    break;
                case SecretBuffType.AssemblyMulti:
                    secrets.AssemblyMulti = entry.Value;
                    break;
                case SecretBuffType.CashMulti:
                    secrets.CashMulti = entry.Value;
                    break;
                case SecretBuffType.ScienceMulti:
                    secrets.ScienceMulti = entry.Value;
                    break;
                case SecretBuffType.AssemblyLineUpgradePercent:
                    if (infinityData != null) infinityData.assemblyLineUpgradePercent = (float)entry.Value;
                    break;
                case SecretBuffType.ServerUpgradePercent:
                    if (infinityData != null) infinityData.serverUpgradePercent = (float)entry.Value;
                    break;
                case SecretBuffType.AiManagerUpgradePercent:
                    if (infinityData != null) infinityData.aiManagerUpgradePercent = (float)entry.Value;
                    break;
                case SecretBuffType.PlanetUpgradePercent:
                    if (infinityData != null) infinityData.planetUpgradePercent = (float)entry.Value;
                    break;
            }
        }

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

        /// <summary>
        /// Applies secret buffs based on the player's current secrets level.
        /// Uses table-driven approach - iterates through all buffs up to the current level.
        /// </summary>
        public static void SecretBuffs(DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData,
            SecretBuffState secrets)
        {
            if (prestigeData == null || secrets == null) return;

            long currentLevel = prestigeData.secretsOfTheUniverse;
            if (currentLevel <= 0) return;

            // Apply all buffs from level 1 up to current level
            // Higher levels overwrite values set by lower levels (same as original behavior)
            foreach (var entry in SecretBuffTable)
            {
                if (entry.Level <= currentLevel)
                {
                    ApplyBuff(entry, secrets, infinityData);
                }
            }
        }

        /// <summary>
        /// Builds a SecretBuffState containing only the multiplier buffs for the given prestige data.
        /// Does not modify infinityData - only returns multiplier values.
        /// </summary>
        public static SecretBuffState BuildSecretBuffState(DysonVersePrestigeData prestigeData)
        {
            var secrets = new SecretBuffState();
            if (prestigeData == null) return secrets;

            long currentLevel = prestigeData.secretsOfTheUniverse;
            if (currentLevel <= 0) return secrets;

            // Apply only multiplier buffs (skip upgrade percent buffs since infinityData is null)
            foreach (var entry in SecretBuffTable)
            {
                if (entry.Level <= currentLevel)
                {
                    // Pass null for infinityData - ApplyBuff will skip upgrade percent buffs
                    ApplyBuff(entry, secrets, null);
                }
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

        /// <summary>
        /// Calculates the global buff multiplier from skill tree bonuses and Avocado contributions.
        /// </summary>
        /// <remarks>
        /// Legacy overload that uses StaticSaveSettings.avocadoData for backward compatibility.
        /// </remarks>
        public static double GlobalBuff(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData, PrestigePlus prestigePlus)
        {
            return GlobalBuff(infinityData, skillTreeData, StaticSaveSettings?.avocadoData ?? new AvocadoData());
        }

        /// <summary>
        /// Calculates the global buff multiplier from skill tree bonuses and Avocado contributions.
        /// </summary>
        public static double GlobalBuff(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData, AvocadoData avocadoData)
        {
            double multi = 1f;
            if (skillTreeData.purityOfSEssence && skillTreeData.skillPointsTree > 0) multi *= 1.42f * skillTreeData.skillPointsTree;
            if (skillTreeData.superRadiantScattering)
            {
                double scatteringTimer = GetSkillTimerSeconds(infinityData, "superRadiantScattering");
                multi *= 1 + 0.01f * scatteringTimer;
            }
            if (avocadoData != null && avocadoData.unlocked)
            {
                if (avocadoData.infinityPoints >= AvocadoLogThreshold)
                    multi *= Math.Log10(avocadoData.infinityPoints);
                if (avocadoData.influence >= AvocadoLogThreshold)
                    multi *= Math.Log10(avocadoData.influence);
                if (avocadoData.strangeMatter >= AvocadoLogThreshold)
                    multi *= Math.Log10(avocadoData.strangeMatter);
                if (avocadoData.overflowMultiplier >= 1)
                    multi *= 1 + avocadoData.overflowMultiplier;
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

