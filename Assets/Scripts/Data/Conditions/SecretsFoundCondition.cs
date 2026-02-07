using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if a certain number of secret buttons have been found.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Secrets Found")]
    public sealed class SecretsFoundCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterOrEqual;

        [SerializeField]
        [Tooltip("The threshold number of secrets to compare against.")]
        private int _threshold = 10;

        public override bool Evaluate(EffectContext context)
        {
            int secretsFound = GetSecretsFoundCount();
            return _operator.Compare(secretsFound, _threshold);
        }

        private int GetSecretsFoundCount()
        {
            SaveDataSettings settings = StaticSaveSettings;
            if (settings == null) return 0;
            if (settings.avotation) return 7;
            return Mathf.Clamp(settings.avotationProgressStep, 0, 7);
        }

        protected override string GenerateDescription()
        {
            return $"Secrets found {_operator.ToSymbol()} {_threshold}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            int secretsFound = GetSecretsFoundCount();
            bool isMet = _operator.Compare(secretsFound, _threshold);
            return $"Current: {secretsFound} ({(isMet ? "MET" : "NOT MET")})";
        }
    }
}
