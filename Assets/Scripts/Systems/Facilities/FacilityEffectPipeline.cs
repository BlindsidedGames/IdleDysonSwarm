using System;
using System.Collections.Generic;
using GameData;
using Systems;
using Systems.Stats;
using static Expansion.Oracle;

namespace Systems.Facilities
{
    public static class FacilityEffectPipeline
    {
        private const int ModifierEffectOrderStart = 10;
        private const double DefaultMaxInfinityBuff = 1e44;

        public static FacilityRuntime BuildRuntimeFromDefinitions(FacilityDefinition definition, FacilityState state,
            EffectContext context)
        {
            if (definition == null || state == null) return null;

            var runtime = new FacilityRuntime(definition, state);
            List<StatEffect> effects = BuildProductionEffects(definition, state, context);
            runtime.RecalculateProduction(ToLegacyFloat(definition.baseProduction), effects);
            return runtime;
        }

        public static List<StatEffect> BuildProductionEffects(FacilityDefinition definition, FacilityState state,
            EffectContext context)
        {
            var effects = new List<StatEffect>();
            if (definition == null || state == null || string.IsNullOrEmpty(definition.productionStatId))
            {
                return effects;
            }

            string displayName = string.IsNullOrEmpty(definition.displayName) ? definition.id : definition.displayName;

            effects.Add(new StatEffect
            {
                Id = $"{definition.id}.count",
                SourceName = $"{displayName} Count",
                TargetStatId = definition.productionStatId,
                Operation = StatOperation.Multiply,
                Value = state.EffectiveCount,
                Order = 0
            });

            effects.AddRange(BuildModifierEffects(definition, context, displayName));

            effects.AddRange(SkillEffectProvider.BuildFacilityEffects(definition, definition.productionStatId, context,
                state));

            return effects;
        }

        private static List<StatEffect> BuildModifierEffects(FacilityDefinition definition, EffectContext context,
            string displayName)
        {
            var effects = new List<StatEffect>();
            if (definition == null || context.InfinityData == null) return effects;

            if (!TryBuildModifierResult(definition, context, out StatResult result))
            {
                effects.Add(new StatEffect
                {
                    Id = $"{definition.id}.modifier",
                    SourceName = $"{displayName} Modifier",
                    TargetStatId = definition.productionStatId,
                    Operation = StatOperation.Multiply,
                    Value = GetLegacyModifier(definition, context.InfinityData),
                    Order = ModifierEffectOrderStart
                });
                return effects;
            }

            Contribution baseContribution = default;
            bool hasBase = false;
            var modifierContributions = new List<Contribution>();
            foreach (Contribution contribution in result.Contributions)
            {
                if (!hasBase && contribution.Operation == StatOperation.Override &&
                    contribution.Order == int.MinValue)
                {
                    baseContribution = contribution;
                    hasBase = true;
                    continue;
                }

                modifierContributions.Add(contribution);
            }

            if (!hasBase && result.Contributions.Count > 0)
            {
                baseContribution = result.Contributions[0];
                hasBase = true;
            }

            int order = ModifierEffectOrderStart;
            modifierContributions.Sort((left, right) => left.Order.CompareTo(right.Order));

            double baseMultiplier = hasBase ? baseContribution.Value : 1;
            double addAccumulator = 0;
            bool sawMultiply = false;
            var multiplierContributions = new List<Contribution>();

            for (int i = 0; i < modifierContributions.Count; i++)
            {
                Contribution contribution = modifierContributions[i];
                switch (contribution.Operation)
                {
                    case StatOperation.Add:
                        if (sawMultiply)
                        {
                            effects.Clear();
                            effects.Add(new StatEffect
                            {
                                Id = $"{definition.id}.modifier",
                                SourceName = $"{displayName} Modifier",
                                TargetStatId = definition.productionStatId,
                                Operation = StatOperation.Multiply,
                                Value = GetLegacyModifier(definition, context.InfinityData),
                                Order = ModifierEffectOrderStart
                            });
                            return effects;
                        }

                        addAccumulator += contribution.Value;
                        break;
                    case StatOperation.Multiply:
                        sawMultiply = true;
                        if (ShouldApplyMultiplier(contribution.Value))
                        {
                            multiplierContributions.Add(contribution);
                        }

                        break;
                    default:
                        effects.Clear();
                        effects.Add(new StatEffect
                        {
                            Id = $"{definition.id}.modifier",
                            SourceName = $"{displayName} Modifier",
                            TargetStatId = definition.productionStatId,
                            Operation = StatOperation.Multiply,
                            Value = GetLegacyModifier(definition, context.InfinityData),
                            Order = ModifierEffectOrderStart
                        });
                        return effects;
                }
            }

            baseMultiplier += addAccumulator;
            if (ShouldApplyMultiplier(baseMultiplier))
            {
                effects.Add(new StatEffect
                {
                    Id = $"{definition.id}.upgrades",
                    SourceName = $"{displayName} Upgrades",
                    TargetStatId = definition.productionStatId,
                    Operation = StatOperation.Multiply,
                    Value = baseMultiplier,
                    Order = order++
                });
            }

            for (int i = 0; i < multiplierContributions.Count; i++)
            {
                Contribution contribution = multiplierContributions[i];
                effects.Add(new StatEffect
                {
                    Id = string.IsNullOrEmpty(contribution.SourceId)
                        ? $"{definition.id}.modifier.{i}"
                        : contribution.SourceId,
                    SourceName = string.IsNullOrEmpty(contribution.SourceName)
                        ? $"{displayName} Modifier"
                        : contribution.SourceName,
                    TargetStatId = definition.productionStatId,
                    Operation = contribution.Operation,
                    Value = contribution.Value,
                    Order = order++
                });
            }

            return effects;
        }

        private static bool TryBuildModifierResult(FacilityDefinition definition, EffectContext context,
            out StatResult result)
        {
            result = null;
            if (definition == null) return false;

            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVersePrestigeData prestigeData = context.PrestigeData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;
            PrestigePlus prestigePlus = context.PrestigePlus;
            SecretBuffState secrets = ModifierSystem.BuildSecretBuffState(prestigeData);

            switch (definition.id)
            {
                case "assembly_lines":
                    return FacilityModifierPipeline.TryCalculateAssemblyLineModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        DefaultMaxInfinityBuff, out result);
                case "ai_managers":
                    return FacilityModifierPipeline.TryCalculateManagerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        DefaultMaxInfinityBuff, out result);
                case "servers":
                    return FacilityModifierPipeline.TryCalculateServerModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        DefaultMaxInfinityBuff, out result);
                case "data_centers":
                    return FacilityModifierPipeline.TryCalculateDataCenterModifier(infinityData, skillTreeData, prestigeData, prestigePlus,
                        DefaultMaxInfinityBuff, out result);
                case "planets":
                    return FacilityModifierPipeline.TryCalculatePlanetModifier(infinityData, skillTreeData, prestigeData, prestigePlus, secrets,
                        DefaultMaxInfinityBuff, out result);
                default:
                    return false;
            }
        }

        private static double GetLegacyModifier(FacilityDefinition definition, DysonVerseInfinityData infinityData)
        {
            if (definition == null || infinityData == null) return 1;

            switch (definition.id)
            {
                case "assembly_lines":
                    return infinityData.assemblyLineModifier;
                case "ai_managers":
                    return infinityData.managerModifier;
                case "servers":
                    return infinityData.serverModifier;
                case "data_centers":
                    return infinityData.dataCenterModifier;
                case "planets":
                    return infinityData.planetModifier;
                default:
                    return 1;
            }
        }

        private static bool ShouldApplyMultiplier(double value)
        {
            return Math.Abs(value - 1) > 1e-12;
        }

        private static double ToLegacyFloat(double value)
        {
            return (double)(float)value;
        }
    }
}

