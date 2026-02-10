using System;
using GameData;
using Sirenix.OdinInspector;
using UnityEngine;

namespace Expansion
{
    /// <summary>
    /// Skill point reconciliation and debug tooling.
    /// </summary>
    /// <remarks>
    /// Runtime.
    /// <para>Primary entry points: <see cref="PreviewSkillPointRecalc"/>, <see cref="ApplySkillPointRecalc"/>.</para>
    /// This contains editor/debug buttons for recalculating skill points from known sources.
    /// It is grouped here so future extraction to a dedicated skill system does not require touching clipboard/disk save code.
    /// <para>Change notes: this is intentionally manual. Importing/loading a save does not auto-reconcile skill points,
    /// and there is no persisted "already fixed" flag in the save.</para>
    /// </remarks>
    public partial class Oracle
    {
        private int CountAssignedSkillPoints()
        {
            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null) return 0;

            int total = 0;
            foreach (SkillDefinition skill in registry.skillDatabase.skills)
            {
                if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                if (IsSkillOwned(skill.id)) total += skill.cost;
            }

            return total;
        }

        [TabGroup("SaveData", "Buttons"), Button]
        public void PreviewSkillPointRecalc()
        {
            SkillPointRecalcResult result = CalculateSkillPointRecalc();
            LogSkillPointRecalc(result, apply: false);
        }

        [TabGroup("SaveData", "Buttons"), Button]
        public void ApplySkillPointRecalc()
        {
            SkillPointRecalcResult result = CalculateSkillPointRecalc();
            skillTreeData.skillPointsTree = result.Recalculated;
            LogSkillPointRecalc(result, apply: true);
            UpdateSkills?.Invoke();
        }

        private SkillPointRecalcResult CalculateSkillPointRecalc()
        {
            long earnedKnown = 0;
            if (prestigeData != null) earnedKnown += prestigeData.permanentSkillPoint;
            earnedKnown += ArtifactSkillPoints();
            if (infinityData != null && infinityData.goalSetter > 0) earnedKnown += infinityData.goalSetter;

            int spent = CountAssignedSkillPoints();
            long recalculated = earnedKnown - spent;
            if (recalculated < 0) recalculated = 0;

            return new SkillPointRecalcResult(earnedKnown, spent, skillTreeData.skillPointsTree, recalculated);
        }

        private void LogSkillPointRecalc(SkillPointRecalcResult result, bool apply)
        {
            string note =
                "Note: This uses known sources (permanent IP, artifact points, goalSetter) and ignores points awarded" +
                " by research/debug/manual adjustments.";
            string action = apply ? "Applied" : "Preview";
            Debug.Log(
                $"{action} SkillPointRecalc -> earnedKnown: {result.EarnedKnown}, spent: {result.Spent}, " +
                $"current: {result.Current}, recalculated: {result.Recalculated}. {note}");
        }

        private readonly struct SkillPointRecalcResult
        {
            public long EarnedKnown { get; }
            public int Spent { get; }
            public long Current { get; }
            public long Recalculated { get; }

            public SkillPointRecalcResult(long earnedKnown, int spent, long current, long recalculated)
            {
                EarnedKnown = earnedKnown;
                Spent = spent;
                Current = current;
                Recalculated = recalculated;
            }
        }
    }
}
