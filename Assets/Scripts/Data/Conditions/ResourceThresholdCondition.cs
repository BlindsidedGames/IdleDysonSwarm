using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Specifies which game resource to check.
    /// </summary>
    public enum GameResourceType
    {
        /// <summary>Current bots (InfinityData.bots).</summary>
        Bots,

        /// <summary>Influence currency (SaveData.influence).</summary>
        Influence,

        /// <summary>Strange Matter (SaveDataPrestige.strangeMatter).</summary>
        StrangeMatter,

        /// <summary>Current science (InfinityData.science).</summary>
        Science,

        /// <summary>Current money (InfinityData.money).</summary>
        Money
    }

    /// <summary>
    /// Condition that checks if a game resource meets a threshold.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Resource Threshold")]
    public sealed class ResourceThresholdCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The resource to check.")]
        private GameResourceType _resourceType = GameResourceType.Bots;

        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterOrEqual;

        [SerializeField]
        [Tooltip("The threshold value to compare against.")]
        private double _threshold;

        public override bool Evaluate(EffectContext context)
        {
            double value = GetResourceValue();
            return _operator.Compare(value, _threshold);
        }

        private double GetResourceValue()
        {
            return _resourceType switch
            {
                GameResourceType.Bots => StaticInfinityData?.bots ?? 0,
                GameResourceType.Influence => StaticSaveSettings?.saveData?.influence ?? 0,
                GameResourceType.StrangeMatter => StaticSaveSettings?.sdPrestige?.strangeMatter ?? 0,
                GameResourceType.Science => StaticInfinityData?.science ?? 0,
                GameResourceType.Money => StaticInfinityData?.money ?? 0,
                _ => 0
            };
        }

        protected override string GenerateDescription()
        {
            return $"{_resourceType} {_operator.ToSymbol()} {_threshold:N0}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            double value = GetResourceValue();
            bool conditionMet = _operator.Compare(value, _threshold);
            return $"Current: {value:N0} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
