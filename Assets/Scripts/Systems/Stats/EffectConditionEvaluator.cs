using System.Collections.Generic;
using GameData;
using Systems;
using Systems.Facilities;
using UnityEngine;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public static class EffectConditionEvaluator
    {
        private static readonly HashSet<string> UnknownConditions = new HashSet<string>();

        public static bool IsConditionMet(string conditionId, FacilityDefinition facility, FacilityState state,
            EffectContext context)
        {
            if (string.IsNullOrEmpty(conditionId))
            {
                return true;
            }

            DysonVerseInfinityData dvid = context.InfinityData;
            DysonVerseSkillTreeData dvst = context.SkillTreeData;

            switch (conditionId)
            {
                case "assembly_lines_69":
                    return dvid != null && dvid.assemblyLines[1] >= 69;
                case "ai_managers_69":
                    return dvid != null && dvid.managers[1] >= 69;
                case "servers_69":
                    return dvid != null && dvid.servers[1] >= 69;
                case "data_centers_69":
                    return dvid != null && dvid.dataCenters[1] >= 69;
                case "planets_69":
                    return dvid != null && dvid.planets[1] >= 69;
                case "servers_total_gt_1":
                    return dvid != null && dvid.servers[0] + dvid.servers[1] > 1;
                case "assembly_lines_total_gte_10":
                    return dvid != null && dvid.assemblyLines[0] + dvid.assemblyLines[1] >= 10;
                case "planets_total_gte_2":
                    return dvid != null && dvid.planets[0] + dvid.planets[1] >= 2;
                case "workers_gt_1":
                    return dvid != null && dvid.workers > 1;
                case "researchers_gt_1":
                    return dvid != null && dvid.researchers > 1;
                case "panel_lifetime":
                    return dvid != null && dvid.panelLifetime > 0;
                case "manual_owned_gte_69":
                    return state != null && state.ManualOwned >= 69;
                case "effective_owned_gte_69":
                    return state != null && state.EffectiveCount >= 69;
                case "bots_required_met":
                    if (dvid == null || dvst == null) return false;
                    double starsSurrounded = ProductionMath.StarsSurrounded(dvid, false, false, 0);
                    double galaxiesEngulfed = ProductionMath.GalaxiesEngulfed(dvid, false, false, 0);
                    double stellarGalaxies = ProductionMath.StellarGalaxies(dvst, galaxiesEngulfed);
                    double botsRequired = ProductionMath.StellarSacrificesRequiredBots(dvst, starsSurrounded);
                    return dvid.bots >= botsRequired && stellarGalaxies > 0;
            }

            if (UnknownConditions.Add(conditionId))
            {
                Debug.LogWarning($"Unknown condition id '{conditionId}'. Effect will be skipped.");
            }

            return false;
        }
    }
}
