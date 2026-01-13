using System.Linq;
using System.Text;
using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Composite condition that evaluates to true only if ALL child conditions are true.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Composite/AND")]
    public sealed class AndCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("All of these conditions must be true for this condition to be true.")]
        private EffectCondition[] _conditions;

        public override bool Evaluate(EffectContext context)
        {
            if (_conditions == null || _conditions.Length == 0)
                return true; // No conditions = always true

            foreach (var condition in _conditions)
            {
                if (condition == null)
                    continue;

                if (!condition.Evaluate(context))
                    return false;
            }

            return true;
        }

        protected override string GenerateDescription()
        {
            if (_conditions == null || _conditions.Length == 0)
                return "Always True (no conditions)";

            var validConditions = _conditions.Where(c => c != null).ToArray();
            if (validConditions.Length == 0)
                return "Always True (no conditions)";

            if (validConditions.Length == 1)
                return validConditions[0].GetDescription();

            var sb = new StringBuilder();
            sb.Append("ALL OF: [");
            for (int i = 0; i < validConditions.Length; i++)
            {
                if (i > 0) sb.Append(" AND ");
                sb.Append(validConditions[i].GetDescription());
            }
            sb.Append("]");
            return sb.ToString();
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            if (_conditions == null || _conditions.Length == 0)
                return "All conditions met (empty)";

            int metCount = 0;
            int totalCount = 0;

            foreach (var condition in _conditions)
            {
                if (condition == null) continue;
                totalCount++;
                if (condition.Evaluate(context))
                    metCount++;
            }

            bool allMet = metCount == totalCount;
            return $"{metCount}/{totalCount} conditions met ({(allMet ? "MET" : "NOT MET")})";
        }
    }
}
