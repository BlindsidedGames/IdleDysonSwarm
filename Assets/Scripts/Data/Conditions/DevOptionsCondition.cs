using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if dev options (debug mode) is enabled.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Dev Options")]
    public sealed class DevOptionsCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("If true, condition passes when dev options are ENABLED. If false, passes when DISABLED.")]
        private bool _mustBeEnabled = true;

        public override bool Evaluate(EffectContext context)
        {
            bool isEnabled = StaticSaveSettings?.debugOptions ?? false;
            return isEnabled == _mustBeEnabled;
        }

        protected override string GenerateDescription()
        {
            return _mustBeEnabled ? "Dev Options enabled" : "Dev Options disabled";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            bool isEnabled = StaticSaveSettings?.debugOptions ?? false;
            bool conditionMet = isEnabled == _mustBeEnabled;
            return $"Enabled: {isEnabled} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
