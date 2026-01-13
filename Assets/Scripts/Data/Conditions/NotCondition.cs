using Systems.Facilities;
using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Composite condition that inverts the result of its child condition.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Composite/NOT")]
    public sealed class NotCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The condition to invert. If this is true, NOT returns false (and vice versa).")]
        private EffectCondition _condition;

        public override bool Evaluate(EffectContext context)
        {
            if (_condition == null)
                return true; // No condition = always true (NOT null = true)

            return !_condition.Evaluate(context);
        }

        public override bool EvaluateWithState(EffectContext context, FacilityState state)
        {
            if (_condition == null)
                return true; // No condition = always true (NOT null = true)

            return !_condition.EvaluateWithState(context, state);
        }

        protected override string GenerateDescription()
        {
            if (_condition == null)
                return "NOT (null)";

            return $"NOT ({_condition.GetDescription()})";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            if (_condition == null)
                return "Inverting: null (MET)";

            bool innerResult = _condition.Evaluate(context);
            bool result = !innerResult;
            return $"Inverting: {innerResult} -> {result} ({(result ? "MET" : "NOT MET")})";
        }
    }
}
