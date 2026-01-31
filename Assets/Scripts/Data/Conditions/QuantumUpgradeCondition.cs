using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Specifies which quantum upgrade to check.
    /// </summary>
    public enum QuantumUpgradeType
    {
        /// <summary>Terra quantum line unlocked.</summary>
        Terra,

        /// <summary>Purity quantum line unlocked.</summary>
        Purity,

        /// <summary>Power quantum line unlocked.</summary>
        Power,

        /// <summary>Stellar quantum line unlocked.</summary>
        Stellar,

        /// <summary>Paragade quantum line unlocked.</summary>
        Paragade,

        /// <summary>Avocato system purchased (costs 42 QP).</summary>
        Avocato
    }

    /// <summary>
    /// Condition that checks if a quantum upgrade has been unlocked.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Quantum Upgrade")]
    public sealed class QuantumUpgradeCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The quantum upgrade to check.")]
        private QuantumUpgradeType _upgradeType = QuantumUpgradeType.Terra;

        [SerializeField]
        [Tooltip("If true, condition passes when upgrade IS unlocked. If false, passes when NOT unlocked.")]
        private bool _mustBeUnlocked = true;

        public override bool Evaluate(EffectContext context)
        {
            bool isUnlocked = IsUpgradeUnlocked(context);
            return isUnlocked == _mustBeUnlocked;
        }

        private bool IsUpgradeUnlocked(EffectContext context)
        {
            PrestigePlus pp = context.PrestigePlus;
            if (pp == null)
                return false;

            return _upgradeType switch
            {
                QuantumUpgradeType.Terra => pp.terra,
                QuantumUpgradeType.Purity => pp.purity,
                QuantumUpgradeType.Power => pp.power,
                QuantumUpgradeType.Stellar => pp.stellar,
                QuantumUpgradeType.Paragade => pp.paragade,
                QuantumUpgradeType.Avocato => pp.avocatoPurchased,
                _ => false
            };
        }

        protected override string GenerateDescription()
        {
            string unlockState = _mustBeUnlocked ? "unlocked" : "NOT unlocked";
            return $"{_upgradeType} is {unlockState}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            bool isUnlocked = IsUpgradeUnlocked(context);
            bool conditionMet = isUnlocked == _mustBeUnlocked;
            return $"Unlocked: {isUnlocked} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
