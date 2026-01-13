using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if panel lifetime meets a threshold.
    /// Replaces the "panel_lifetime" condition.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Panel Lifetime")]
    public sealed class PanelLifetimeCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterThan;

        [SerializeField]
        [Tooltip("The threshold value to compare against.")]
        private double _threshold = 0;

        public override bool Evaluate(EffectContext context)
        {
            if (context.InfinityData == null)
                return false;

            double panelLifetime = context.InfinityData.panelLifetime;
            return _operator.Compare(panelLifetime, _threshold);
        }

        protected override string GenerateDescription()
        {
            return $"Panel Lifetime {_operator.ToSymbol()} {_threshold:N0}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            if (context.InfinityData == null)
                return "N/A";

            double panelLifetime = context.InfinityData.panelLifetime;
            bool conditionMet = _operator.Compare(panelLifetime, _threshold);
            return $"Current: {panelLifetime:N1}s ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
