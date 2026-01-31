using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Specifies which simulation flag to check.
    /// </summary>
    public enum SimulationFlagType
    {
        // Speed upgrades
        Speed1,
        Speed2,
        Speed3,
        Speed4,
        Speed5,
        Speed6,
        Speed7,
        Speed8,

        // Translation upgrades
        Translation1,
        Translation2,
        Translation3,
        Translation4,
        Translation5,
        Translation6,
        Translation7,
        Translation8,

        // Disaster counteractions
        CounterMeteor,
        CounterAi,
        CounterGw,

        // Engineering
        Engineering1,
        Engineering2,
        Engineering3,

        // World Trade
        WorldTrade1,
        WorldTrade2,
        WorldTrade3,

        // World Peace
        WorldPeace1,
        WorldPeace2,
        WorldPeace3,
        WorldPeace4,

        // Mathematics
        Mathematics1,
        Mathematics2,
        Mathematics3,

        // Advanced Physics
        AdvancedPhysics1,
        AdvancedPhysics2,
        AdvancedPhysics3,
        AdvancedPhysics4
    }

    /// <summary>
    /// Condition that checks if a simulation flag is set.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Simulation Flag")]
    public sealed class SimulationFlagCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The simulation flag to check.")]
        private SimulationFlagType _flagType = SimulationFlagType.Speed1;

        [SerializeField]
        [Tooltip("If true, condition passes when flag IS set. If false, passes when flag is NOT set.")]
        private bool _mustBeSet = true;

        public override bool Evaluate(EffectContext context)
        {
            bool isSet = IsFlagSet();
            return isSet == _mustBeSet;
        }

        private bool IsFlagSet()
        {
            SaveDataPrestige sp = StaticSaveSettings?.sdPrestige;
            if (sp == null)
                return false;

            return _flagType switch
            {
                SimulationFlagType.Speed1 => sp.speed1,
                SimulationFlagType.Speed2 => sp.speed2,
                SimulationFlagType.Speed3 => sp.speed3,
                SimulationFlagType.Speed4 => sp.speed4,
                SimulationFlagType.Speed5 => sp.speed5,
                SimulationFlagType.Speed6 => sp.speed6,
                SimulationFlagType.Speed7 => sp.speed7,
                SimulationFlagType.Speed8 => sp.speed8,

                SimulationFlagType.Translation1 => sp.translation1,
                SimulationFlagType.Translation2 => sp.translation2,
                SimulationFlagType.Translation3 => sp.translation3,
                SimulationFlagType.Translation4 => sp.translation4,
                SimulationFlagType.Translation5 => sp.translation5,
                SimulationFlagType.Translation6 => sp.translation6,
                SimulationFlagType.Translation7 => sp.translation7,
                SimulationFlagType.Translation8 => sp.translation8,

                SimulationFlagType.CounterMeteor => sp.counterMeteor,
                SimulationFlagType.CounterAi => sp.counterAi,
                SimulationFlagType.CounterGw => sp.counterGw,

                SimulationFlagType.Engineering1 => sp.engineering1,
                SimulationFlagType.Engineering2 => sp.engineering2,
                SimulationFlagType.Engineering3 => sp.engineering3,

                SimulationFlagType.WorldTrade1 => sp.worldTrade1,
                SimulationFlagType.WorldTrade2 => sp.worldTrade2,
                SimulationFlagType.WorldTrade3 => sp.worldTrade3,

                SimulationFlagType.WorldPeace1 => sp.worldPeace1,
                SimulationFlagType.WorldPeace2 => sp.worldPeace2,
                SimulationFlagType.WorldPeace3 => sp.worldPeace3,
                SimulationFlagType.WorldPeace4 => sp.worldPeace4,

                SimulationFlagType.Mathematics1 => sp.mathematics1,
                SimulationFlagType.Mathematics2 => sp.mathematics2,
                SimulationFlagType.Mathematics3 => sp.mathematics3,

                SimulationFlagType.AdvancedPhysics1 => sp.advancedPhysics1,
                SimulationFlagType.AdvancedPhysics2 => sp.advancedPhysics2,
                SimulationFlagType.AdvancedPhysics3 => sp.advancedPhysics3,
                SimulationFlagType.AdvancedPhysics4 => sp.advancedPhysics4,

                _ => false
            };
        }

        protected override string GenerateDescription()
        {
            string state = _mustBeSet ? "is set" : "is NOT set";
            return $"{_flagType} {state}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            bool isSet = IsFlagSet();
            bool conditionMet = isSet == _mustBeSet;
            return $"Set: {isSet} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
