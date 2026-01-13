using System;
using System.Collections.Generic;
using GameData;
using Systems.Facilities;
using Systems.Skills;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public static class SkillEffectProvider
    {
        public static List<StatEffect> BuildFacilityEffects(FacilityDefinition facility, string targetStatId,
            EffectContext context, FacilityState state)
        {
            return BuildEffects(facility, targetStatId, context, state);
        }

        public static List<StatEffect> BuildGlobalEffects(string targetStatId, EffectContext context)
        {
            return BuildEffects(null, targetStatId, context, null);
        }

        private static List<StatEffect> BuildEffects(FacilityDefinition facility, string targetStatId,
            EffectContext context, FacilityState state)
        {
            var effects = new List<StatEffect>();
            if (string.IsNullOrEmpty(targetStatId)) return effects;

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null) return effects;

            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;
            DysonVerseInfinityData infinityData = context.InfinityData;
            foreach (SkillDefinition skill in registry.skillDatabase.skills)
            {
                if (skill == null) continue;
                if (!IsSkillOwned(skill, skillTreeData, infinityData)) continue;
                if (skill.effects == null) continue;

                foreach (EffectDefinition effect in skill.effects)
                {
                    if (effect == null) continue;
                    if (!MatchesStat(effect, targetStatId)) continue;
                    if (!MatchesFacility(effect, facility)) continue;
                    if (!EffectConditionEvaluator.IsConditionMet(effect, facility, state, context)) continue;

                    double value = ResolveEffectValue(effect, context, facility, state);
                    if (ShouldSkipEffect(effect.operation, value)) continue;

                    string sourceName = !string.IsNullOrEmpty(effect.displayName)
                        ? effect.displayName
                        : !string.IsNullOrEmpty(skill.displayName)
                            ? skill.displayName
                            : skill.id;

                    effects.Add(new StatEffect
                    {
                        Id = string.IsNullOrEmpty(effect.id) ? skill.id : effect.id,
                        SourceName = sourceName,
                        TargetStatId = effect.targetStatId,
                        Operation = effect.operation,
                        Value = value,
                        Order = effect.order,
                        ConditionId = effect.conditionId
                    });
                }
            }

            return effects;
        }

        private static double ResolveEffectValue(EffectDefinition effect, EffectContext context,
            FacilityDefinition facility, FacilityState state)
        {
            if (effect == null) return 0;

            if (SkillEffectCatalog.TryResolveDynamicValue(effect.id, context, facility, state, out double dynamicValue))
            {
                return dynamicValue;
            }

            double value = effect.value;
            if (Math.Abs(effect.perLevel) > double.Epsilon)
            {
                value += effect.perLevel;
            }

            return value;
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

        private static bool IsSkillOwned(SkillDefinition skill, DysonVerseSkillTreeData skillTreeData, DysonVerseInfinityData infinityData)
        {
            if (skill == null || string.IsNullOrEmpty(skill.id)) return false;
            if (infinityData != null && infinityData.skillStateById != null &&
                infinityData.skillStateById.TryGetValue(skill.id, out SkillState state))
            {
                return state != null && state.owned;
            }

            if (infinityData != null && infinityData.skillOwnedById != null &&
                infinityData.skillOwnedById.TryGetValue(skill.id, out bool owned))
            {
                return owned;
            }

            return SkillFlagAccessor.TryGetFlag(skillTreeData, skill.id, out bool legacyOwned) && legacyOwned;
        }
    }
}

