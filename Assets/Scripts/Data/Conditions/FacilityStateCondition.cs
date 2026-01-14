using Systems.Facilities;
using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Specifies which facility state property to check.
    /// </summary>
    public enum FacilityStateProperty
    {
        /// <summary>Manual owned count from the current facility's state.</summary>
        ManualOwned,

        /// <summary>Auto owned count from the current facility's state.</summary>
        AutoOwned,

        /// <summary>Effective (total) count from the current facility's state.</summary>
        EffectiveCount
    }

    /// <summary>
    /// Condition that checks the state of the CURRENT facility being evaluated.
    /// This is for context-dependent conditions like "manual_owned_gte_69".
    ///
    /// Note: This condition only works when evaluated in the context of a specific
    /// facility (e.g., from FacilityEffectPipeline). If evaluated without facility
    /// context, it will return false.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Facility State")]
    public sealed class FacilityStateCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("Which property of the current facility's state to check.")]
        private FacilityStateProperty _property = FacilityStateProperty.ManualOwned;

        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterOrEqual;

        [SerializeField]
        [Tooltip("The threshold value to compare against.")]
        private int _threshold = 69;

        /// <summary>
        /// Note: This basic Evaluate doesn't have access to FacilityState.
        /// Use EvaluateWithState instead when called from facility effect pipeline.
        /// </summary>
        public override bool Evaluate(EffectContext context)
        {
            // Without facility state context, we can't evaluate this condition
            // This will be extended in the EffectConditionEvaluator to pass state
            return false;
        }

        /// <summary>
        /// Evaluate with facility state context.
        /// </summary>
        public override bool EvaluateWithState(EffectContext context, FacilityState state)
        {
            if (state == null)
                return false;

            double value = _property switch
            {
                FacilityStateProperty.ManualOwned => state.ManualOwned,
                FacilityStateProperty.AutoOwned => state.AutoOwned,
                FacilityStateProperty.EffectiveCount => state.EffectiveCount,
                _ => 0
            };

            return _operator.Compare(value, _threshold);
        }

        protected override string GenerateDescription()
        {
            return $"Current Facility {_property} {_operator.ToSymbol()} {_threshold}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            return "Requires facility context";
        }
    }
}
