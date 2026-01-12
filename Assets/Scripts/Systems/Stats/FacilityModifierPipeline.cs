using System;
using System.Collections.Generic;
using GameData;
using Systems;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public static class FacilityModifierPipeline
    {
        private const int TerraThresholdOrder = 32;
        private const int InfinityOrder = 88;
        private const int SecretOrder = 90;
        private const int AvocatoOrder = 95;

        public static bool TryCalculateAssemblyLineModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.AssemblyLineModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + infinityData.assemblyLineUpgradeOwned * infinityData.assemblyLineUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.AssemblyLineModifier, context));

            double terraAmount = GetAssemblyLineTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.AssemblyLineModifier, "assembly_lines", "Assembly Lines",
                terraAmount, skillTreeData);
            AddInfinityMultiplier(effects, StatId.AssemblyLineModifier, prestigeData, 0, maxInfinityBuff,
                "prestige.infinity.assembly_lines", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.AssemblyLineModifier, secrets?.AssemblyMulti ?? 1,
                "secrets.assembly_modifier", "Secrets Assembly Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.AssemblyLineModifier, prestigePlus, "prestige.avocato_modifier",
                AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateManagerModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.ManagerModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + infinityData.aiManagerUpgradeOwned * infinityData.aiManagerUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.ManagerModifier, context));

            double terraAmount = GetManagerTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.ManagerModifier, "ai_managers", "AI Managers", terraAmount,
                skillTreeData);
            AddInfinityMultiplier(effects, StatId.ManagerModifier, prestigeData, 2, maxInfinityBuff,
                "prestige.infinity.ai_managers", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.ManagerModifier, secrets?.AiMulti ?? 1,
                "secrets.ai_manager_modifier", "Secrets AI Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.ManagerModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateServerModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.ServerModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + infinityData.serverUpgradeOwned * infinityData.serverUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.ServerModifier, context));

            double terraAmount = GetServerTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.ServerModifier, "servers", "Servers", terraAmount, skillTreeData);
            AddInfinityMultiplier(effects, StatId.ServerModifier, prestigeData, 3, maxInfinityBuff,
                "prestige.infinity.servers", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.ServerModifier, secrets?.ServerMulti ?? 1,
                "secrets.server_modifier", "Secrets Server Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.ServerModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateDataCenterModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double maxInfinityBuff, out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.DataCenterModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + infinityData.dataCenterUpgradeOwned * infinityData.dataCenterUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.DataCenterModifier, context));

            double terraAmount = GetDataCenterTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.DataCenterModifier, "data_centers", "Data Centers", terraAmount,
                skillTreeData);
            AddInfinityMultiplier(effects, StatId.DataCenterModifier, prestigeData, 4, maxInfinityBuff,
                "prestige.infinity.data_centers", "Infinity Buff", InfinityOrder);
            AddAvocatoMultiplier(effects, StatId.DataCenterModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculatePlanetModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.PlanetModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + infinityData.planetUpgradeOwned * infinityData.planetUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.PlanetModifier, context));

            double terraAmount = GetPlanetTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.PlanetModifier, "planets", "Planets", terraAmount, skillTreeData);
            AddInfinityMultiplier(effects, StatId.PlanetModifier, prestigeData, 5, maxInfinityBuff,
                "prestige.infinity.planets", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.PlanetModifier, secrets?.PlanetMulti ?? 1,
                "secrets.planet_modifier", "Secrets Planet Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.PlanetModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        private static bool IsReady()
        {
            return true;
        }

        private static void AddTerraThresholdEffects(List<StatEffect> effects, string statId, string facilityId,
            string facilityName, double terraAmount, DysonVerseSkillTreeData skillTreeData)
        {
            if (effects == null || skillTreeData == null || skillTreeData.supernova) return;

            if (terraAmount >= 50)
            {
                AddMultiplierEffect(effects, $"terra.threshold50.{facilityId}",
                    $"{facilityName} Threshold (50)", statId, 2, TerraThresholdOrder);
            }

            if (terraAmount >= 100)
            {
                AddMultiplierEffect(effects, $"terra.threshold100.{facilityId}",
                    $"{facilityName} Threshold (100)", statId, 2, TerraThresholdOrder + 1);
            }

            double threshold = ProductionMath.AmountForBuildingBoostAfterX(skillTreeData);
            if (terraAmount > threshold)
            {
                double division = ProductionMath.DivisionForBoostAfterX(skillTreeData);
                if (division > 0)
                {
                    double perExtraBoost = (terraAmount - threshold) / division + 1;
                    AddMultiplierEffect(effects, $"terra.scaling.{facilityId}",
                        $"{facilityName} Scaling", statId, perExtraBoost, TerraThresholdOrder + 2);
                }
            }
        }

        private static double GetAssemblyLineTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraNullius)
            {
                return infinityData.assemblyLines[1] + planets;
            }

            return infinityData.assemblyLines[1];
        }

        private static double GetManagerTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraInfirma)
            {
                return infinityData.managers[1] + planets;
            }

            return infinityData.managers[1];
        }

        private static double GetServerTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraEculeo)
            {
                return infinityData.servers[1] + planets;
            }

            return infinityData.servers[1];
        }

        private static double GetDataCenterTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraFirma)
            {
                return infinityData.dataCenters[1] + planets;
            }

            return infinityData.dataCenters[1];
        }

        private static double GetPlanetTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = infinityData.planets[1];
            if (skillTreeData != null && skillTreeData.terraIrradiant)
            {
                planets *= 12;
            }

            return planets;
        }

        private static double GetTerraPlanetCount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = infinityData.planets[1];
            if (skillTreeData != null && skillTreeData.terraIrradiant)
            {
                planets *= 12;
            }

            return planets;
        }

        private static void AddInfinityMultiplier(List<StatEffect> effects, string statId, DysonVersePrestigeData prestigeData,
            long minInfinityPoints, double maxInfinityBuff, string id, string name, int order)
        {
            if (effects == null || prestigeData == null) return;
            if (prestigeData.infinityPoints < minInfinityPoints) return;

            double value = 1 + Math.Clamp((double)prestigeData.infinityPoints, 0d, maxInfinityBuff);
            AddMultiplierEffect(effects, id, name, statId, value, order);
        }

        private static void AddSecretMultiplier(List<StatEffect> effects, string statId, double value, string id,
            string name, int order)
        {
            AddMultiplierEffect(effects, id, name, statId, value, order);
        }

        private static void AddAvocatoMultiplier(List<StatEffect> effects, string statId, PrestigePlus prestigePlus, string id,
            int order)
        {
            if (effects == null || prestigePlus == null || !prestigePlus.avocatoPurchased) return;

            double multi = 1;
            if (prestigePlus.avocatoIP >= 10)
                multi *= Math.Log10(prestigePlus.avocatoIP);
            if (prestigePlus.avocatoInfluence >= 10)
                multi *= Math.Log10(prestigePlus.avocatoInfluence);
            if (prestigePlus.avocatoStrangeMatter >= 10)
                multi *= Math.Log10(prestigePlus.avocatoStrangeMatter);
            if (prestigePlus.avocatoOverflow >= 1)
                multi *= 1 + prestigePlus.avocatoOverflow;

            AddMultiplierEffect(effects, id, "Avocato Multiplier", statId, multi, order);
        }

        private static void AddMultiplierEffect(List<StatEffect> effects, string id, string name, string statId,
            double value, int order)
        {
            if (effects == null) return;
            if (Math.Abs(value - 1) <= 1e-12) return;

            effects.Add(new StatEffect
            {
                Id = id,
                SourceName = name,
                TargetStatId = statId,
                Operation = StatOperation.Multiply,
                Value = value,
                Order = order
            });
        }
    }
}

