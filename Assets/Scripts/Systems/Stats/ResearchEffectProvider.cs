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

            DysonVerseInfinityData dvid = context.InfinityData;
            foreach (ResearchDefinition research in registry.researchDatabase.research)
            {
                if (research == null || string.IsNullOrEmpty(research.id)) continue;
                if (research.effects == null || research.effects.Count == 0) continue;

                double level = GetResearchLevel(dvid, research);
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

        private static double GetResearchLevel(DysonVerseInfinityData dvid, ResearchDefinition research)
        {
            if (research == null) return 0;

            double level = 0;
            if (dvid != null && dvid.researchLevelsById != null &&
                dvid.researchLevelsById.TryGetValue(research.id, out double stored))
            {
                level = stored;
            }
            else if (ResearchIdMap.TryGetLegacyLevel(dvid, research.id, out double legacy))
            {
                level = legacy;
                if (dvid != null)
                {
                    dvid.researchLevelsById ??= new Dictionary<string, double>();
                    dvid.researchLevelsById[research.id] = legacy;
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
            DysonVerseInfinityData dvid = context.InfinityData;
            if (dvid == null || research == null) return false;

            switch (research.id)
            {
                case ResearchIdMap.MoneyMultiplier:
                    percent = dvid.moneyMultiUpgradePercent;
                    return true;
                case ResearchIdMap.ScienceBoost:
                    percent = dvid.scienceBoostPercent;
                    return true;
                case ResearchIdMap.AssemblyLineUpgrade:
                    percent = dvid.assemblyLineUpgradePercent;
                    return true;
                case ResearchIdMap.AiManagerUpgrade:
                    percent = dvid.aiManagerUpgradePercent;
                    return true;
                case ResearchIdMap.ServerUpgrade:
                    percent = dvid.serverUpgradePercent;
                    return true;
                case ResearchIdMap.DataCenterUpgrade:
                    percent = dvid.dataCenterUpgradePercent;
                    return true;
                case ResearchIdMap.PlanetUpgrade:
                    percent = dvid.planetUpgradePercent;
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
