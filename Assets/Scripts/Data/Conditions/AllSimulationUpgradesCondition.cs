using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if ALL simulation upgrades have been purchased.
    /// This is a comprehensive check for the "Simulation Complete" achievement.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/All Simulation Upgrades")]
    public sealed class AllSimulationUpgradesCondition : EffectCondition
    {
        public override bool Evaluate(EffectContext context)
        {
            SaveDataPrestige sp = StaticSaveSettings?.sdPrestige;
            if (sp == null)
                return false;

            // Engineering (3)
            if (!sp.engineering1 || !sp.engineering2 || !sp.engineering3)
                return false;

            // Shipping (2)
            if (!sp.shipping1 || !sp.shipping2)
                return false;

            // World Trade (3)
            if (!sp.worldTrade1 || !sp.worldTrade2 || !sp.worldTrade3)
                return false;

            // World Peace (4)
            if (!sp.worldPeace1 || !sp.worldPeace2 || !sp.worldPeace3 || !sp.worldPeace4)
                return false;

            // Mathematics (3)
            if (!sp.mathematics1 || !sp.mathematics2 || !sp.mathematics3)
                return false;

            // Advanced Physics (4)
            if (!sp.advancedPhysics1 || !sp.advancedPhysics2 || !sp.advancedPhysics3 || !sp.advancedPhysics4)
                return false;

            // Foundational Era - Hunters (4)
            if (!sp.hunter1 || !sp.hunter2 || !sp.hunter3 || !sp.hunter4)
                return false;

            // Foundational Era - Gatherers (4)
            if (!sp.gatherer1 || !sp.gatherer2 || !sp.gatherer3 || !sp.gatherer4)
                return false;

            // Boosts (3)
            if (!sp.workerBoost || !sp.citiesBoost || !sp.factoriesBoost)
                return false;

            // Information Era - Bots (2)
            if (!sp.bots1 || !sp.bots2)
                return false;

            // Information Era - Rockets (3)
            if (!sp.rockets1 || !sp.rockets2 || !sp.rockets3)
                return false;

            // Space Age - Solar Factories (3)
            if (!sp.sfacs1 || !sp.sfacs2 || !sp.sfacs3)
                return false;

            // Space Age - Railguns (2)
            if (!sp.railguns1 || !sp.railguns2)
                return false;

            // Speed upgrades (8) - already covered by ALL_SPEED_UPGRADES but include for completeness
            if (!sp.speed1 || !sp.speed2 || !sp.speed3 || !sp.speed4 ||
                !sp.speed5 || !sp.speed6 || !sp.speed7 || !sp.speed8)
                return false;

            // Translation upgrades (8) - already covered by ALL_TRANSLATION_UPGRADES but include for completeness
            if (!sp.translation1 || !sp.translation2 || !sp.translation3 || !sp.translation4 ||
                !sp.translation5 || !sp.translation6 || !sp.translation7 || !sp.translation8)
                return false;

            return true;
        }

        protected override string GenerateDescription()
        {
            return "All simulation upgrades purchased";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            SaveDataPrestige sp = StaticSaveSettings?.sdPrestige;
            if (sp == null)
                return "No data";

            int total = 0;
            int owned = 0;

            // Count all upgrades
            // Engineering (3)
            total += 3;
            if (sp.engineering1) owned++;
            if (sp.engineering2) owned++;
            if (sp.engineering3) owned++;

            // Shipping (2)
            total += 2;
            if (sp.shipping1) owned++;
            if (sp.shipping2) owned++;

            // World Trade (3)
            total += 3;
            if (sp.worldTrade1) owned++;
            if (sp.worldTrade2) owned++;
            if (sp.worldTrade3) owned++;

            // World Peace (4)
            total += 4;
            if (sp.worldPeace1) owned++;
            if (sp.worldPeace2) owned++;
            if (sp.worldPeace3) owned++;
            if (sp.worldPeace4) owned++;

            // Mathematics (3)
            total += 3;
            if (sp.mathematics1) owned++;
            if (sp.mathematics2) owned++;
            if (sp.mathematics3) owned++;

            // Advanced Physics (4)
            total += 4;
            if (sp.advancedPhysics1) owned++;
            if (sp.advancedPhysics2) owned++;
            if (sp.advancedPhysics3) owned++;
            if (sp.advancedPhysics4) owned++;

            // Hunters (4)
            total += 4;
            if (sp.hunter1) owned++;
            if (sp.hunter2) owned++;
            if (sp.hunter3) owned++;
            if (sp.hunter4) owned++;

            // Gatherers (4)
            total += 4;
            if (sp.gatherer1) owned++;
            if (sp.gatherer2) owned++;
            if (sp.gatherer3) owned++;
            if (sp.gatherer4) owned++;

            // Boosts (3)
            total += 3;
            if (sp.workerBoost) owned++;
            if (sp.citiesBoost) owned++;
            if (sp.factoriesBoost) owned++;

            // Bots (2)
            total += 2;
            if (sp.bots1) owned++;
            if (sp.bots2) owned++;

            // Rockets (3)
            total += 3;
            if (sp.rockets1) owned++;
            if (sp.rockets2) owned++;
            if (sp.rockets3) owned++;

            // Solar Factories (3)
            total += 3;
            if (sp.sfacs1) owned++;
            if (sp.sfacs2) owned++;
            if (sp.sfacs3) owned++;

            // Railguns (2)
            total += 2;
            if (sp.railguns1) owned++;
            if (sp.railguns2) owned++;

            // Speed (8)
            total += 8;
            if (sp.speed1) owned++;
            if (sp.speed2) owned++;
            if (sp.speed3) owned++;
            if (sp.speed4) owned++;
            if (sp.speed5) owned++;
            if (sp.speed6) owned++;
            if (sp.speed7) owned++;
            if (sp.speed8) owned++;

            // Translation (8)
            total += 8;
            if (sp.translation1) owned++;
            if (sp.translation2) owned++;
            if (sp.translation3) owned++;
            if (sp.translation4) owned++;
            if (sp.translation5) owned++;
            if (sp.translation6) owned++;
            if (sp.translation7) owned++;
            if (sp.translation8) owned++;

            bool isMet = owned == total;
            return $"Upgrades: {owned}/{total} ({(isMet ? "MET" : "NOT MET")})";
        }
    }
}
