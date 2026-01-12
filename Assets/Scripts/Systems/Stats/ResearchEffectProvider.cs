using System;
using System.Collections.Generic;
using GameData;
using Systems.Facilities;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public static class ResearchEffectProvider
    {
        public static bool TryBuildGlobalEffects(string targetStatId, EffectContext context,
            out List<StatEffect> effects)
        {
            return TryBuildEffects(null, targetStatId, context, null, out effects);
        }

        public static bool TryBuildFacilityEffects(FacilityDefinition facility, string targetStatId,
            EffectContext context, FacilityState state, out List<StatEffect> effects)
        {
            return TryBuildEffects(facility, targetStatId, context, state, out effects);
        }

        private static bool TryBuildEffects(FacilityDefinition facility, string targetStatId, EffectContext context,
            FacilityState state, out List<StatEffect> effects)
        {
            effects = new List<StatEffect>();
            if (string.IsNullOrEmpty(targetStatId)) return false;

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.researchDatabase == null || registry.researchDatabase.research == null ||
                registry.researchDatabase.research.Count == 0)
            {
                return false;
            }

            DysonVerseInfinityData infinityData = context.InfinityData;
            foreach (ResearchDefinition research in registry.researchDatabase.research)
            {
                if (research == null || string.IsNullOrEmpty(research.id)) continue;
                if (research.effects == null || research.effects.Count == 0) continue;

                double level = GetResearchLevel(infinityData, research);
                if (level <= 0) continue;

                foreach (EffectDefinition effect in research.effects)
                {
                    if (effect == null) continue;
                    if (!MatchesStat(effect, targetStatId)) continue;
                    if (!MatchesFacility(effect, facility)) continue;
                    if (!EffectConditionEvaluator.IsConditionMet(effect.conditionId, facility, state, context)) continue;

                    double value = ResolveEffectValue(research, effect, level, context, facility, state);
                    if (ShouldSkipEffect(effect.operation, value)) continue;

                    string sourceName = !string.IsNullOrEmpty(effect.displayName)
                        ? effect.displayName
                        : !string.IsNullOrEmpty(research.displayName)
                            ? research.displayName
                            : research.id;

                    effects.Add(new StatEffect
                    {
                        Id = string.IsNullOrEmpty(effect.id) ? research.id : effect.id,
                        SourceName = sourceName,
                        TargetStatId = effect.targetStatId,
                        Operation = effect.operation,
                        Value = value,
                        Order = effect.order,
                        ConditionId = effect.conditionId
                    });
                }
            }

            return true;
        }

        private static double GetResearchLevel(DysonVerseInfinityData infinityData, ResearchDefinition research)
        {
            if (research == null) return 0;

            double level = 0;
            if (infinityData != null && infinityData.researchLevelsById != null &&
                infinityData.researchLevelsById.TryGetValue(research.id, out double stored))
            {
                level = stored;
            }
            else if (ResearchIdMap.TryGetLegacyLevel(infinityData, research.id, out double legacy))
            {
                level = legacy;
                if (infinityData != null)
                {
                    infinityData.researchLevelsById ??= new Dictionary<string, double>();
                    infinityData.researchLevelsById[research.id] = legacy;
                }
            }

            if (research.maxLevel >= 0)
            {
                level = Math.Min(level, research.maxLevel);
            }

            return level;
        }

        private static double ResolveEffectValue(ResearchDefinition research, EffectDefinition effect, double level,
            EffectContext context, FacilityDefinition facility, FacilityState state)
        {
            if (effect == null) return 0;

            if (TryGetUpgradePercent(research, context, out double percent))
            {
                return percent * level;
            }

            return effect.value + effect.perLevel * level;
        }

        private static bool TryGetUpgradePercent(ResearchDefinition research, EffectContext context, out double percent)
        {
            percent = 0;
            DysonVerseInfinityData infinityData = context.InfinityData;
            if (infinityData == null || research == null) return false;

            switch (research.id)
            {
                case ResearchIdMap.MoneyMultiplier:
                    percent = infinityData.moneyMultiUpgradePercent;
                    return true;
                case ResearchIdMap.ScienceBoost:
                    percent = infinityData.scienceBoostPercent;
                    return true;
                case ResearchIdMap.AssemblyLineUpgrade:
                    percent = infinityData.assemblyLineUpgradePercent;
                    return true;
                case ResearchIdMap.AiManagerUpgrade:
                    percent = infinityData.aiManagerUpgradePercent;
                    return true;
                case ResearchIdMap.ServerUpgrade:
                    percent = infinityData.serverUpgradePercent;
                    return true;
                case ResearchIdMap.DataCenterUpgrade:
                    percent = infinityData.dataCenterUpgradePercent;
                    return true;
                case ResearchIdMap.PlanetUpgrade:
                    percent = infinityData.planetUpgradePercent;
                    return true;
                default:
                    return false;
            }
        }

        private static bool MatchesStat(EffectDefinition effect, string targetStatId)
        {
            if (string.IsNullOrEmpty(effect.targetStatId)) return false;
            return string.Equals(effect.targetStatId, targetStatId, StringComparison.Ordinal);
        }

        private static bool MatchesFacility(EffectDefinition effect, FacilityDefinition facility)
        {
            if (facility == null)
            {
                bool hasFacilityFilter = (effect.targetFacilityIds != null && effect.targetFacilityIds.Length > 0) ||
                                         (effect.targetFacilityTags != null && effect.targetFacilityTags.Length > 0);
                return !hasFacilityFilter;
            }

            if (effect.targetFacilityIds != null && effect.targetFacilityIds.Length > 0)
            {
                bool found = false;
                for (int i = 0; i < effect.targetFacilityIds.Length; i++)
                {
                    if (string.Equals(effect.targetFacilityIds[i], facility.id, StringComparison.OrdinalIgnoreCase))
                    {
                        found = true;
                        break;
                    }
                }

                if (!found) return false;
            }

            if (effect.targetFacilityTags != null && effect.targetFacilityTags.Length > 0)
            {
                if (facility.tags == null || facility.tags.Length == 0) return false;
                bool found = false;
                for (int i = 0; i < effect.targetFacilityTags.Length; i++)
                {
                    for (int j = 0; j < facility.tags.Length; j++)
                    {
                        if (string.Equals(effect.targetFacilityTags[i], facility.tags[j],
                                StringComparison.OrdinalIgnoreCase))
                        {
                            found = true;
                            break;
                        }
                    }

                    if (found) break;
                }

                if (!found) return false;
            }

            return true;
        }

        private static bool ShouldSkipEffect(StatOperation operation, double value)
        {
            const double epsilon = 1e-12;
            switch (operation)
            {
                case StatOperation.Add:
                    return Math.Abs(value) <= epsilon;
                case StatOperation.Multiply:
                case StatOperation.Power:
                    return Math.Abs(value - 1) <= epsilon;
                default:
                    return false;
            }
        }
    }
}

