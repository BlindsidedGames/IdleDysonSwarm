using Systems.Skills;
using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if a skill is owned (or not owned).
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Skill Owned")]
    public sealed class SkillOwnedCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The skill to check.")]
        private SkillId _skillId;

        [SerializeField]
        [Tooltip("If true, condition passes when skill IS owned. If false, passes when skill is NOT owned.")]
        private bool _mustBeOwned = true;

        public override bool Evaluate(EffectContext context)
        {
            if (_skillId == null)
                return false;

            bool isOwned = IsSkillOwned(_skillId.Value, context);
            return isOwned == _mustBeOwned;
        }

        private bool IsSkillOwned(string skillId, EffectContext context)
        {
            if (string.IsNullOrEmpty(skillId))
                return false;

            DysonVerseInfinityData infinityData = context.InfinityData;
            DysonVerseSkillTreeData skillTreeData = context.SkillTreeData;

            // Check modern skill state dictionary first
            if (infinityData?.skillStateById != null &&
                infinityData.skillStateById.TryGetValue(skillId, out SkillState state))
            {
                return state != null && state.owned;
            }

            // Check simple ownership dictionary
            if (infinityData?.skillOwnedById != null &&
                infinityData.skillOwnedById.TryGetValue(skillId, out bool owned))
            {
                return owned;
            }

            // Fall back to legacy flag accessor
            return SkillFlagAccessor.TryGetFlag(skillTreeData, skillId, out bool legacyOwned) && legacyOwned;
        }

        protected override string GenerateDescription()
        {
            string skillName = _skillId != null ? _skillId.Value : "???";
            return _mustBeOwned ? $"Has skill: {skillName}" : $"Does NOT have skill: {skillName}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            if (_skillId == null)
                return "N/A";

            bool isOwned = IsSkillOwned(_skillId.Value, context);
            bool conditionMet = isOwned == _mustBeOwned;
            return $"Owned: {isOwned} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
