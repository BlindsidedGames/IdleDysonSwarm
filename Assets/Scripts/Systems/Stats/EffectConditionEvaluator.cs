using System.Collections.Generic;
using GameData;
using IdleDysonSwarm.Data.Conditions;
using Systems;
using Systems.Facilities;
using UnityEngine;
using static Expansion.Oracle;

namespace Systems.Stats
{
    /// <summary>
    /// Evaluates effect conditions using both scriptable conditions and legacy string-based conditions.
    /// </summary>
    public static class EffectConditionEvaluator
    {
        private static readonly HashSet<string> UnknownConditions = new HashSet<string>();

        /// <summary>
        /// Evaluate a condition from an EffectDefinition.
        /// Checks scriptable condition first, falls back to legacy string condition.
        /// </summary>
        public static bool IsConditionMet(EffectDefinition effect, FacilityDefinition facility, FacilityState state,
            EffectContext context)
        {
            if (effect == null)
                return true;

            // Prefer scriptable condition if available
            if (effect.Condition != null)
            {
                return EvaluateScriptableCondition(effect.Condition, context, state);
            }

            // Fall back to legacy string condition
            return IsConditionMet(effect.conditionId, facility, state, context);
        }

        /// <summary>
        /// Evaluate a scriptable condition asset.
        /// </summary>
        public static bool EvaluateScriptableCondition(EffectCondition condition, EffectContext context,
            FacilityState state = null)
        {
            if (condition == null)
                return true;

            // Special handling for FacilityStateCondition which needs state context
            if (condition is FacilityStateCondition facilityStateCondition)
            {
                return facilityStateCondition.EvaluateWithState(context, state);
            }

            return condition.Evaluate(context);
        }

        /// <summary>
        /// Legacy method: Evaluate a string-based condition ID.
        /// </summary>
        public static bool IsConditionMet(string conditionId, FacilityDefinition facility, FacilityState state,
            EffectContext context)
        {
            if (string.IsNullOrEmpty(conditionId))
            {
                return true;
            }

            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;

            switch (conditionId)
            {
                case "assembly_lines_69":
                    return infinityData != null && infinityData.assemblyLines[1] >= 69;
                case "ai_managers_69":
                    return infinityData != null && infinityData.managers[1] >= 69;
                case "servers_69":
                    return infinityData != null && infinityData.servers[1] >= 69;
                case "data_centers_69":
                    return infinityData != null && infinityData.dataCenters[1] >= 69;
                case "planets_69":
                    return infinityData != null && infinityData.planets[1] >= 69;
                case "servers_total_gt_1":
                    return infinityData != null && infinityData.servers[0] + infinityData.servers[1] > 1;
                case "assembly_lines_total_gte_10":
                    return infinityData != null && infinityData.assemblyLines[0] + infinityData.assemblyLines[1] >= 10;
                case "planets_total_gte_2":
                    return infinityData != null && infinityData.planets[0] + infinityData.planets[1] >= 2;
                case "workers_gt_1":
                    return infinityData != null && infinityData.workers > 1;
                case "researchers_gt_1":
                    return infinityData != null && infinityData.researchers > 1;
                case "panel_lifetime":
                    return infinityData != null && infinityData.panelLifetime > 0;
                case "manual_owned_gte_69":
                    return state != null && state.ManualOwned >= 69;
                case "effective_owned_gte_69":
                    return state != null && state.EffectiveCount >= 69;
                case "bots_required_met":
                    if (infinityData == null || skillTreeData == null) return false;
                    double starsSurrounded = ProductionMath.StarsSurrounded(infinityData, false, false, 0);
                    double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(infinityData, false, false, 0);
                    double stellarGalaxies = ProductionMath.StellarGalaxies(skillTreeData, galaxiesEngulfed);
                    double botsRequired = ProductionMath.StellarSacrificesRequiredBots(skillTreeData, starsSurrounded);
                    return infinityData.bots >= botsRequired && stellarGalaxies > 0;
            }

            if (UnknownConditions.Add(conditionId))
            {
                Debug.LogWarning($"Unknown condition id '{conditionId}'. Effect will be skipped.");
            }

            return false;
        }
    }
}

