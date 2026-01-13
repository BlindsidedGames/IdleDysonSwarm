using GameData;
using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if a research level meets a threshold.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Research Level")]
    public sealed class ResearchLevelCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The research to check.")]
        private ResearchId _researchId;

        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterOrEqual;

        [SerializeField]
        [Tooltip("The threshold level to compare against.")]
        private int _threshold = 1;

        public override bool Evaluate(EffectContext context)
        {
            if (_researchId == null)
                return false;

            double level = GetResearchLevel(_researchId.Value, context);
            return _operator.Compare(level, _threshold);
        }

        private double GetResearchLevel(string researchId, EffectContext context)
        {
            if (string.IsNullOrEmpty(researchId))
                return 0;

            DysonVerseInfinityData infinityData = context.InfinityData;
            if (infinityData == null)
                return 0;

            // Check modern dictionary first
            if (infinityData.researchLevelsById != null &&
                infinityData.researchLevelsById.TryGetValue(researchId, out double level))
            {
                return level;
            }

            // Fall back to legacy accessor
            if (ResearchIdMap.TryGetLegacyLevel(infinityData, researchId, out double legacyLevel))
            {
                return legacyLevel;
            }

            return 0;
        }

        protected override string GenerateDescription()
        {
            string researchName = _researchId != null ? _researchId.Value : "???";
            return $"{researchName} level {_operator.ToSymbol()} {_threshold}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            if (_researchId == null)
                return "N/A";

            double level = GetResearchLevel(_researchId.Value, context);
            bool conditionMet = _operator.Compare(level, _threshold);
            return $"Level: {level} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
