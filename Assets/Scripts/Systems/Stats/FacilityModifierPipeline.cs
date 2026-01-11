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

        public static bool TryCalculateAssemblyLineModifier(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || dvid == null) return false;

            var context = new EffectContext(dvid, dvpd, dvst, pp);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.AssemblyLineModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + dvid.assemblyLineUpgradeOwned * dvid.assemblyLineUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.AssemblyLineModifier, context));

            double terraAmount = GetAssemblyLineTerraAmount(dvid, dvst);
            AddTerraThresholdEffects(effects, StatId.AssemblyLineModifier, "assembly_lines", "Assembly Lines",
                terraAmount, dvst);
            AddInfinityMultiplier(effects, StatId.AssemblyLineModifier, dvpd, 0, maxInfinityBuff,
                "prestige.infinity.assembly_lines", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.AssemblyLineModifier, secrets?.AssemblyMulti ?? 1,
                "secrets.assembly_modifier", "Secrets Assembly Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.AssemblyLineModifier, pp, "prestige.avocato_modifier",
                AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateManagerModifier(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || dvid == null) return false;

            var context = new EffectContext(dvid, dvpd, dvst, pp);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.ManagerModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + dvid.aiManagerUpgradeOwned * dvid.aiManagerUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.ManagerModifier, context));

            double terraAmount = GetManagerTerraAmount(dvid, dvst);
            AddTerraThresholdEffects(effects, StatId.ManagerModifier, "ai_managers", "AI Managers", terraAmount,
                dvst);
            AddInfinityMultiplier(effects, StatId.ManagerModifier, dvpd, 2, maxInfinityBuff,
                "prestige.infinity.ai_managers", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.ManagerModifier, secrets?.AiMulti ?? 1,
                "secrets.ai_manager_modifier", "Secrets AI Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.ManagerModifier, pp, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateServerModifier(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || dvid == null) return false;

            var context = new EffectContext(dvid, dvpd, dvst, pp);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.ServerModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + dvid.serverUpgradeOwned * dvid.serverUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.ServerModifier, context));

            double terraAmount = GetServerTerraAmount(dvid, dvst);
            AddTerraThresholdEffects(effects, StatId.ServerModifier, "servers", "Servers", terraAmount, dvst);
            AddInfinityMultiplier(effects, StatId.ServerModifier, dvpd, 3, maxInfinityBuff,
                "prestige.infinity.servers", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.ServerModifier, secrets?.ServerMulti ?? 1,
                "secrets.server_modifier", "Secrets Server Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.ServerModifier, pp, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateDataCenterModifier(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, double maxInfinityBuff, out StatResult result)
        {
            result = null;
            if (!IsReady() || dvid == null) return false;

            var context = new EffectContext(dvid, dvpd, dvst, pp);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.DataCenterModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + dvid.dataCenterUpgradeOwned * dvid.dataCenterUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.DataCenterModifier, context));

            double terraAmount = GetDataCenterTerraAmount(dvid, dvst);
            AddTerraThresholdEffects(effects, StatId.DataCenterModifier, "data_centers", "Data Centers", terraAmount,
                dvst);
            AddInfinityMultiplier(effects, StatId.DataCenterModifier, dvpd, 4, maxInfinityBuff,
                "prestige.infinity.data_centers", "Infinity Buff", InfinityOrder);
            AddAvocatoMultiplier(effects, StatId.DataCenterModifier, pp, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculatePlanetModifier(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst,
            DysonVersePrestigeData dvpd, PrestigePlus pp, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || dvid == null) return false;

            var context = new EffectContext(dvid, dvpd, dvst, pp);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.PlanetModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + dvid.planetUpgradeOwned * dvid.planetUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.PlanetModifier, context));

            double terraAmount = GetPlanetTerraAmount(dvid, dvst);
            AddTerraThresholdEffects(effects, StatId.PlanetModifier, "planets", "Planets", terraAmount, dvst);
            AddInfinityMultiplier(effects, StatId.PlanetModifier, dvpd, 5, maxInfinityBuff,
                "prestige.infinity.planets", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.PlanetModifier, secrets?.PlanetMulti ?? 1,
                "secrets.planet_modifier", "Secrets Planet Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.PlanetModifier, pp, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        private static bool IsReady()
        {
            GameDataRegistry registry = GameDataRegistry.Instance;
            return registry != null && registry.skillDatabase != null && registry.skillDatabase.skills != null &&
                   registry.skillDatabase.skills.Count > 0;
        }

        private static void AddTerraThresholdEffects(List<StatEffect> effects, string statId, string facilityId,
            string facilityName, double terraAmount, DysonVerseSkillTreeData dvst)
        {
            if (effects == null || dvst == null || dvst.supernova) return;

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

            double threshold = ProductionMath.AmountForBuildingBoostAfterX(dvst);
            if (terraAmount > threshold)
            {
                double division = ProductionMath.DivisionForBoostAfterX(dvst);
                if (division > 0)
                {
                    double perExtraBoost = (terraAmount - threshold) / division + 1;
                    AddMultiplierEffect(effects, $"terra.scaling.{facilityId}",
                        $"{facilityName} Scaling", statId, perExtraBoost, TerraThresholdOrder + 2);
                }
            }
        }

        private static double GetAssemblyLineTerraAmount(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (dvid == null) return 0;
            double planets = GetTerraPlanetCount(dvid, dvst);
            if (dvst != null && dvst.terraNullius)
            {
                return dvid.assemblyLines[1] + planets;
            }

            return dvid.assemblyLines[1];
        }

        private static double GetManagerTerraAmount(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (dvid == null) return 0;
            double planets = GetTerraPlanetCount(dvid, dvst);
            if (dvst != null && dvst.terraInfirma)
            {
                return dvid.managers[1] + planets;
            }

            return dvid.managers[1];
        }

        private static double GetServerTerraAmount(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (dvid == null) return 0;
            double planets = GetTerraPlanetCount(dvid, dvst);
            if (dvst != null && dvst.terraEculeo)
            {
                return dvid.servers[1] + planets;
            }

            return dvid.servers[1];
        }

        private static double GetDataCenterTerraAmount(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (dvid == null) return 0;
            double planets = GetTerraPlanetCount(dvid, dvst);
            if (dvst != null && dvst.terraFirma)
            {
                return dvid.dataCenters[1] + planets;
            }

            return dvid.dataCenters[1];
        }

        private static double GetPlanetTerraAmount(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (dvid == null) return 0;
            double planets = dvid.planets[1];
            if (dvst != null && dvst.terraIrradiant)
            {
                planets *= 12;
            }

            return planets;
        }

        private static double GetTerraPlanetCount(DysonVerseInfinityData dvid, DysonVerseSkillTreeData dvst)
        {
            if (dvid == null) return 0;
            double planets = dvid.planets[1];
            if (dvst != null && dvst.terraIrradiant)
            {
                planets *= 12;
            }

            return planets;
        }

        private static void AddInfinityMultiplier(List<StatEffect> effects, string statId, DysonVersePrestigeData dvpd,
            long minInfinityPoints, double maxInfinityBuff, string id, string name, int order)
        {
            if (effects == null || dvpd == null) return;
            if (dvpd.infinityPoints < minInfinityPoints) return;

            double value = 1 + Math.Clamp((double)dvpd.infinityPoints, 0d, maxInfinityBuff);
            AddMultiplierEffect(effects, id, name, statId, value, order);
        }

        private static void AddSecretMultiplier(List<StatEffect> effects, string statId, double value, string id,
            string name, int order)
        {
            AddMultiplierEffect(effects, id, name, statId, value, order);
        }

        private static void AddAvocatoMultiplier(List<StatEffect> effects, string statId, PrestigePlus pp, string id,
            int order)
        {
            if (effects == null || pp == null || !pp.avocatoPurchased) return;

            double multi = 1;
            if (pp.avocatoIP >= 10)
                multi *= Math.Log10(pp.avocatoIP);
            if (pp.avocatoInfluence >= 10)
                multi *= Math.Log10(pp.avocatoInfluence);
            if (pp.avocatoStrangeMatter >= 10)
                multi *= Math.Log10(pp.avocatoStrangeMatter);
            if (pp.avocatoOverflow >= 1)
                multi *= 1 + pp.avocatoOverflow;

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
