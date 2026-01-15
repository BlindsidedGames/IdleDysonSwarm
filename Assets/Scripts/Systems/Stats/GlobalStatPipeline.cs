using System;
using System.Collections.Generic;
using GameData;
using Systems;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public static class GlobalStatPipeline
    {
        private const string ShouldersOfTheFallenPlanetsEffectId = "effect.shouldersOfTheFallen.planets_per_second";
        private const string ScientificPlanetsEffectId = "effect.scientificPlanets.planets_per_second";
        private const string PlanetAssemblyEffectId = "effect.planetAssembly.planets_per_second";
        private const string ShellWorldsEffectId = "effect.shellWorlds.planets_per_second";
        private const string StellarSacrificesEffectId = "effect.stellarSacrifices.planets_per_second";

        public readonly struct PlanetGenerationResult
        {
            public PlanetGenerationResult(StatResult totalResult, double scientificPlanets, double planetAssembly,
                double shellWorlds, double stellarSacrifices)
            {
                TotalResult = totalResult;
                ScientificPlanets = scientificPlanets;
                PlanetAssembly = planetAssembly;
                ShellWorlds = shellWorlds;
                StellarSacrifices = stellarSacrifices;
            }

            public StatResult TotalResult { get; }
            public double ScientificPlanets { get; }
            public double PlanetAssembly { get; }
            public double ShellWorlds { get; }
            public double StellarSacrifices { get; }
        }

        public readonly struct TinkerResult
        {
            public TinkerResult(StatResult botYield, StatResult assemblyYield, StatResult cooldown)
            {
                BotYield = botYield;
                AssemblyYield = assemblyYield;
                Cooldown = cooldown;
            }

            public StatResult BotYield { get; }
            public StatResult AssemblyYield { get; }
            public StatResult Cooldown { get; }
        }

        public static bool TryCalculateMoneyMultiplier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            double moneyBoost = infinityData.moneyMultiUpgradeOwned * infinityData.moneyMultiUpgradePercent;
            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.MoneyMultiplier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch ? 1 : 1 + moneyBoost;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.MoneyMultiplier, context));
            AddPrestigeMultipliers(effects, StatId.MoneyMultiplier, prestigePlus, true);
            AddSecretMultiplier(effects, StatId.MoneyMultiplier, secrets != null ? secrets.CashMulti : 1,
                "secrets.cash_multiplier", "Secrets Cash Multiplier", 90);
            AddAvocatoMultiplier(effects, StatId.MoneyMultiplier, prestigePlus, 95);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateScienceMultiplier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            double scienceBoost = infinityData.scienceBoostOwned * infinityData.scienceBoostPercent;
            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.ScienceMultiplier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch ? 1 : 1 + scienceBoost;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.ScienceMultiplier, context));
            AddPrestigeMultipliers(effects, StatId.ScienceMultiplier, prestigePlus, false);
            AddSecretMultiplier(effects, StatId.ScienceMultiplier, secrets != null ? secrets.ScienceMulti : 1,
                "secrets.science_multiplier", "Secrets Science Multiplier", 90);
            AddAvocatoMultiplier(effects, StatId.ScienceMultiplier, prestigePlus, 95);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculatePanelsPerSecond(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            double baseValue = infinityData.workers / 100 * infinityData.panelsPerSecMulti;
            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            List<StatEffect> effects = SkillEffectProvider.BuildGlobalEffects(StatId.PanelsPerSecond, context);
            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculatePanelLifetime(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.PanelLifetime, context,
                out List<StatEffect> researchEffects);

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.PanelLifetime, context));

            result = StatCalculator.Calculate(10, effects);
            return true;
        }

        public static bool TryCalculatePlanetGeneration(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, out PlanetGenerationResult result)
        {
            result = default;
            if (!IsReady() || infinityData == null || skillTreeData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            List<StatEffect> effects = SkillEffectProvider.BuildGlobalEffects(StatId.PlanetsPerSecond, context);
            double scientificPlanets = GetEffectValue(effects, ScientificPlanetsEffectId);
            double planetAssembly = GetEffectValue(effects, PlanetAssemblyEffectId);
            double shellWorlds = GetEffectValue(effects, ShellWorldsEffectId);
            double stellarSacrifices = GetEffectValue(effects, StellarSacrificesEffectId);

            List<StatEffect> filtered = FilterEffect(effects, ShouldersOfTheFallenPlanetsEffectId);
            StatResult totalResult = StatCalculator.Calculate(0, filtered);
            result = new PlanetGenerationResult(totalResult, scientificPlanets, planetAssembly, shellWorlds,
                stellarSacrifices);
            return true;
        }

        public static bool TryCalculateShouldersAccruals(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, out StatResult scienceBoostResult,
            out StatResult moneyUpgradeResult)
        {
            scienceBoostResult = null;
            moneyUpgradeResult = null;
            if (!IsReady() || infinityData == null || skillTreeData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            List<StatEffect> scienceEffects =
                SkillEffectProvider.BuildGlobalEffects(StatId.ScienceBoostPerSecond, context);
            List<StatEffect> moneyEffects =
                SkillEffectProvider.BuildGlobalEffects(StatId.MoneyMultiUpgradePerSecond, context);

            scienceBoostResult = StatCalculator.Calculate(0, scienceEffects);
            moneyUpgradeResult = StatCalculator.Calculate(0, moneyEffects);
            return true;
        }

        public static bool TryCalculateTinkerStats(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double manualCreationTime, out TinkerResult result)
        {
            result = default;
            if (infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            List<StatEffect> botEffects = SkillEffectProvider.BuildGlobalEffects(StatId.TinkerBotYield, context);
            List<StatEffect> assemblyEffects =
                SkillEffectProvider.BuildGlobalEffects(StatId.TinkerAssemblyYield, context);
            List<StatEffect> cooldownEffects =
                SkillEffectProvider.BuildGlobalEffects(StatId.TinkerCooldownSeconds, context);

            StatResult botResult = StatCalculator.Calculate(1, botEffects);
            StatResult assemblyResult = StatCalculator.Calculate(0, assemblyEffects);
            StatResult cooldownResult = StatCalculator.Calculate(manualCreationTime, cooldownEffects);

            result = new TinkerResult(botResult, assemblyResult, cooldownResult);
            return true;
        }

        private static bool IsReady()
        {
            return true;
        }

        private static void AddPrestigeMultipliers(List<StatEffect> effects, string targetStatId, PrestigePlus prestigePlus,
            bool isMoney)
        {
            if (prestigePlus == null) return;

            double prestigeMulti = isMoney ? 1 + prestigePlus.cash * 5 / 100.0 : 1 + prestigePlus.science * 5 / 100.0;
            string id = isMoney ? "prestige.cash_multiplier" : "prestige.science_multiplier";
            string name = isMoney ? "Prestige Cash Multiplier" : "Prestige Science Multiplier";
            AddMultiplierEffect(effects, id, name, targetStatId, prestigeMulti, 85);
        }

        private static void AddSecretMultiplier(List<StatEffect> effects, string targetStatId, double value, string id,
            string name, int order)
        {
            AddMultiplierEffect(effects, id, name, targetStatId, value, order);
        }

        private static void AddAvocatoMultiplier(List<StatEffect> effects, string targetStatId, PrestigePlus prestigePlus,
            int order)
        {
            // Use AvocadoData for the actual values (migration moves data there)
            AvocadoData avocadoData = StaticSaveSettings?.avocadoData;
            if (avocadoData == null || !avocadoData.unlocked) return;

            double multi = 1;
            if (avocadoData.infinityPoints >= 10)
                multi *= Math.Log10(avocadoData.infinityPoints);
            if (avocadoData.influence >= 10)
                multi *= Math.Log10(avocadoData.influence);
            if (avocadoData.strangeMatter >= 10)
                multi *= Math.Log10(avocadoData.strangeMatter);
            if (avocadoData.overflowMultiplier >= 1)
                multi *= 1 + avocadoData.overflowMultiplier;

            AddMultiplierEffect(effects, "prestige.avocato_multiplier", "Avocato Multiplier", targetStatId, multi,
                order);
        }

        private static void AddMultiplierEffect(List<StatEffect> effects, string id, string name, string targetStatId,
            double value, int order)
        {
            if (effects == null) return;
            if (Math.Abs(value - 1) <= 1e-12) return;

            effects.Add(new StatEffect
            {
                Id = id,
                SourceName = name,
                TargetStatId = targetStatId,
                Operation = StatOperation.Multiply,
                Value = value,
                Order = order
            });
        }

        private static double GetEffectValue(List<StatEffect> effects, string effectId)
        {
            if (effects == null || string.IsNullOrEmpty(effectId)) return 0;

            for (int i = 0; i < effects.Count; i++)
            {
                if (string.Equals(effects[i].Id, effectId, StringComparison.Ordinal))
                {
                    return effects[i].Value;
                }
            }

            return 0;
        }

        private static List<StatEffect> FilterEffect(List<StatEffect> effects, string effectId)
        {
            if (effects == null || string.IsNullOrEmpty(effectId)) return effects ?? new List<StatEffect>();

            var filtered = new List<StatEffect>();
            for (int i = 0; i < effects.Count; i++)
            {
                if (string.Equals(effects[i].Id, effectId, StringComparison.Ordinal))
                {
                    continue;
                }

                filtered.Add(effects[i]);
            }

            return filtered;
        }
    }
}

