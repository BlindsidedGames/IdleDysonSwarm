using IdleDysonSwarm.Services;
using IdleDysonSwarm.Services.Steam;
using Systems.Stats;
using UnityEngine;

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
            if (ServiceLocator.TryGet<ISteamIntegrationService>(out var service) &&
                service is SteamIntegrationService steamService)
            {
                return steamService.FoundSecretsCount;
            }
            return 0;
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
