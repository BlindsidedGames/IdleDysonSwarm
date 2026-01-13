using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Specifies which prestige resource to check.
    /// </summary>
    public enum PrestigeResourceType
    {
        /// <summary>Infinity Points (IP) - main prestige currency.</summary>
        InfinityPoints,

        /// <summary>Permanent Skill Points.</summary>
        PermanentSkillPoints,

        /// <summary>Secrets of the Universe.</summary>
        SecretsOfTheUniverse,

        /// <summary>Prestige Plus Points.</summary>
        PrestigePlusPoints,

        /// <summary>Prestige Plus Influence.</summary>
        PrestigePlusInfluence,

        /// <summary>Prestige Plus Cash.</summary>
        PrestigePlusCash,

        /// <summary>Prestige Plus Science.</summary>
        PrestigePlusScience,

        /// <summary>Prestige Plus Secrets.</summary>
        PrestigePlusSecrets,

        /// <summary>Divisions Purchased.</summary>
        DivisionsPurchased
    }

    /// <summary>
    /// Condition that checks if a prestige resource meets a threshold.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Prestige Threshold")]
    public sealed class PrestigeThresholdCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The prestige resource to check.")]
        private PrestigeResourceType _resourceType = PrestigeResourceType.InfinityPoints;

        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterOrEqual;

        [SerializeField]
        [Tooltip("The threshold value to compare against.")]
        private double _threshold;

        public override bool Evaluate(EffectContext context)
        {
            double value = GetResourceValue(context);
            return _operator.Compare(value, _threshold);
        }

        private double GetResourceValue(EffectContext context)
        {
            DysonVersePrestigeData prestigeData = context.PrestigeData;
            PrestigePlus prestigePlus = context.PrestigePlus;

            return _resourceType switch
            {
                PrestigeResourceType.InfinityPoints => prestigeData?.infinityPoints ?? 0,
                PrestigeResourceType.PermanentSkillPoints => prestigeData?.permanentSkillPoint ?? 0,
                PrestigeResourceType.SecretsOfTheUniverse => prestigeData?.secretsOfTheUniverse ?? 0,
                PrestigeResourceType.PrestigePlusPoints => prestigePlus?.points ?? 0,
                PrestigeResourceType.PrestigePlusInfluence => prestigePlus?.influence ?? 0,
                PrestigeResourceType.PrestigePlusCash => prestigePlus?.cash ?? 0,
                PrestigeResourceType.PrestigePlusScience => prestigePlus?.science ?? 0,
                PrestigeResourceType.PrestigePlusSecrets => prestigePlus?.secrets ?? 0,
                PrestigeResourceType.DivisionsPurchased => prestigePlus?.divisionsPurchased ?? 0,
                _ => 0
            };
        }

        protected override string GenerateDescription()
        {
            return $"{_resourceType} {_operator.ToSymbol()} {_threshold:N0}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            double value = GetResourceValue(context);
            bool conditionMet = _operator.Compare(value, _threshold);
            return $"Current: {value:N0} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
