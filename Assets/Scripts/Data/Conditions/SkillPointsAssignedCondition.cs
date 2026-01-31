using GameData;
using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if total skill points assigned meets a threshold.
    /// Skill points are counted by summing the cost of all owned skills.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Skill Points Assigned")]
    public sealed class SkillPointsAssignedCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterOrEqual;

        [SerializeField]
        [Tooltip("The threshold value to compare against.")]
        private int _threshold = 42;

        public override bool Evaluate(EffectContext context)
        {
            int totalAssigned = CountAssignedSkillPoints(context);
            return _operator.Compare(totalAssigned, _threshold);
        }

        private int CountAssignedSkillPoints(EffectContext context)
        {
            int total = 0;

            var registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null)
                return 0;

            var skillStateById = context.InfinityData?.skillStateById;
            if (skillStateById == null)
                return 0;

            foreach (var skill in registry.skillDatabase.skills)
            {
                if (skill == null || string.IsNullOrEmpty(skill.id))
                    continue;

                if (skillStateById.TryGetValue(skill.id, out var state) && state.owned)
                {
                    total += skill.cost;
                }
            }

            return total;
        }

        protected override string GenerateDescription()
        {
            return $"Skill points assigned {_operator.ToSymbol()} {_threshold}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            int total = CountAssignedSkillPoints(context);
            bool isMet = _operator.Compare(total, _threshold);
            return $"Current: {total} ({(isMet ? "MET" : "NOT MET")})";
        }
    }
}
