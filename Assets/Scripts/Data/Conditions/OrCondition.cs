using System.Linq;
using System.Text;
using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Composite condition that evaluates to true if ANY child condition is true.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Composite/OR")]
    public sealed class OrCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("At least one of these conditions must be true for this condition to be true.")]
        private EffectCondition[] _conditions;

        public override bool Evaluate(EffectContext context)
        {
            if (_conditions == null || _conditions.Length == 0)
                return true; // No conditions = always true

            foreach (var condition in _conditions)
            {
                if (condition == null)
                    continue;

                if (condition.Evaluate(context))
                    return true;
            }

            return false;
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
            sb.Append("ANY OF: [");
            for (int i = 0; i < validConditions.Length; i++)
            {
                if (i > 0) sb.Append(" OR ");
                sb.Append(validConditions[i].GetDescription());
            }
            sb.Append("]");
            return sb.ToString();
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            if (_conditions == null || _conditions.Length == 0)
                return "At least one met (empty)";

            int metCount = 0;
            int totalCount = 0;

            foreach (var condition in _conditions)
            {
                if (condition == null) continue;
                totalCount++;
                if (condition.Evaluate(context))
                    metCount++;
            }

            bool anyMet = metCount > 0;
            return $"{metCount}/{totalCount} conditions met ({(anyMet ? "MET" : "NOT MET")})";
        }
    }
}
