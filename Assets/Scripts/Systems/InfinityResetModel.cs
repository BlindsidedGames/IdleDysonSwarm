/*
 * Purpose: Canonical model-only Infinity reset, including durable skill
 * assignment and modifier rebuilding. Presentation, persistence, alerts, and
 * wall-clock timestamps remain caller responsibilities.
 */

using System;
using System.Collections.Generic;
using GameData;
using Systems.Numeric;
using Systems.Skills;
using static Expansion.Oracle;

namespace Systems.Simulation
{
    public readonly struct SkillAutoAssignmentRule
    {
        public SkillAutoAssignmentRule(
            string id,
            int cost,
            bool refundable,
            bool isFragment,
            string[] requiredSkillIds,
            string[] shadowRequirementIds,
            string[] exclusiveWithIds,
            bool valid)
        {
            Id = id;
            Cost = Math.Max(0, cost);
            Refundable = refundable;
            IsFragment = isFragment;
            RequiredSkillIds =
                requiredSkillIds ?? Array.Empty<string>();
            ShadowRequirementIds =
                shadowRequirementIds ?? Array.Empty<string>();
            ExclusiveWithIds =
                exclusiveWithIds ?? Array.Empty<string>();
            Valid = valid;
        }

        public string Id { get; }
        public int Cost { get; }
        public bool Refundable { get; }
        public bool IsFragment { get; }
        public string[] RequiredSkillIds { get; }
        public string[] ShadowRequirementIds { get; }
        public string[] ExclusiveWithIds { get; }
        public bool Valid { get; }
    }

    public sealed class InfinityResetPolicy
    {
        private InfinityResetPolicy(
            int artifactSkillPoints,
            SkillAutoAssignmentRule[] autoAssignmentRules)
        {
            ArtifactSkillPoints =
                Math.Max(0, artifactSkillPoints);
            AutoAssignmentRules =
                autoAssignmentRules ??
                Array.Empty<SkillAutoAssignmentRule>();
        }

        public int ArtifactSkillPoints { get; }
        public SkillAutoAssignmentRule[] AutoAssignmentRules {
            get;
        }

        public static bool TryCapture(
            SaveDataSettings settings,
            int artifactSkillPoints,
            SkillDatabase skillDatabase,
            out InfinityResetPolicy policy)
        {
            policy = null;
            DysonVerseSaveData dyson =
                settings?.dysonVerseSaveData;
            if (dyson == null)
                return false;

            List<string> ids = ResolveAssignmentIds(dyson);
            if (ids.Count > 0 && skillDatabase == null)
                return false;

            var rules =
                new SkillAutoAssignmentRule[ids.Count];
            for (int index = 0;
                 index < ids.Count;
                 index++)
            {
                string id = ids[index];
                if (string.IsNullOrEmpty(id) ||
                    !skillDatabase.TryGet(
                        id,
                        out SkillDefinition definition) ||
                    definition == null)
                {
                    rules[index] =
                        new SkillAutoAssignmentRule(
                            id,
                            0,
                            refundable: true,
                            isFragment: false,
                            null,
                            null,
                            null,
                            valid: false);
                    continue;
                }

                rules[index] =
                    new SkillAutoAssignmentRule(
                        id,
                        definition.cost,
                        definition.refundable,
                        definition.isFragment,
                        CloneIds(
                            definition.requiredSkillIds),
                        CloneIds(
                            definition.shadowRequirementIds),
                        CloneIds(
                            definition.exclusiveWithIds),
                        valid: true);
            }

            policy = new InfinityResetPolicy(
                artifactSkillPoints,
                rules);
            return true;
        }

        private static List<string> ResolveAssignmentIds(
            DysonVerseSaveData dyson)
        {
            if (dyson.skillAutoAssignmentIds != null &&
                dyson.skillAutoAssignmentIds.Count > 0)
            {
                return new List<string>(
                    dyson.skillAutoAssignmentIds);
            }

            if (dyson.skillAutoAssignmentBits != null &&
                dyson.skillAutoAssignmentBits.Length > 0)
            {
                return SkillBitsetUtility.ConvertBitsetToIds(
                    dyson.skillAutoAssignmentBits);
            }

            return dyson.skillAutoAssignmentList != null &&
                   dyson.skillAutoAssignmentList.Count > 0
                ? SkillIdMap.ConvertKeysToIds(
                    dyson.skillAutoAssignmentList)
                : new List<string>();
        }

        private static string[] CloneIds(string[] ids)
        {
            return ids == null
                ? Array.Empty<string>()
                : (string[])ids.Clone();
        }
    }

    public static class InfinityResetModel
    {
        private const double MaximumInfinityBuff = 1e44d;

        public static bool TryApply(
            SaveDataSettings settings,
            bool breakInfinity,
            long requestedReward,
            bool botCapTransition,
            InfinityResetPolicy policy,
            out InfinityResetOutcome outcome)
        {
            outcome = default;
            if (settings?.dysonVerseSaveData
                    ?.dysonVerseInfinityData == null ||
                settings.dysonVerseSaveData
                    .dysonVerseSkillTreeData == null ||
                policy == null)
            {
                return false;
            }

            DysonVerseInfinityData beforeInfinity =
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            DysonVerseSkillTreeData beforeSkills =
                settings.dysonVerseSaveData
                    .dysonVerseSkillTreeData;
            int bankedSkillPoints = 0;
            if (SkillOwnershipState.IsOwned(
                    beforeInfinity,
                    beforeSkills,
                    "banking"))
            {
                bankedSkillPoints++;
            }
            if (SkillOwnershipState.IsOwned(
                    beforeInfinity,
                    beforeSkills,
                    "investmentPortfolio"))
            {
                bankedSkillPoints++;
            }

            if (!InfinityResetTransitions.TryApply(
                    settings,
                    new InfinityResetRequest(
                        breakInfinity,
                        requestedReward,
                        bankedSkillPoints,
                        policy.ArtifactSkillPoints,
                        botCapTransition),
                    out outcome))
            {
                return false;
            }

            ApplyAutoAssignment(
                settings,
                policy.AutoAssignmentRules);
            RebuildDerivedState(settings);
            return true;
        }

        private static void ApplyAutoAssignment(
            SaveDataSettings settings,
            SkillAutoAssignmentRule[] rules)
        {
            if (rules == null || rules.Length == 0)
                return;

            DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData
                    .dysonVerseInfinityData;
            DysonVerseSkillTreeData skills =
                settings.dysonVerseSaveData
                    .dysonVerseSkillTreeData;
            bool assignedAny;
            int passesRemaining = rules.Length;
            do
            {
                assignedAny = false;
                for (int index = 0;
                     index < rules.Length;
                     index++)
                {
                    SkillAutoAssignmentRule rule =
                        rules[index];
                    if (!rule.Valid ||
                        string.IsNullOrEmpty(rule.Id) ||
                        SkillOwnershipState.IsOwned(
                            infinity,
                            skills,
                            rule.Id) ||
                        skills.skillPointsTree < rule.Cost ||
                        !AllOwned(
                            infinity,
                            skills,
                            rule.RequiredSkillIds) ||
                        !AllOwned(
                            infinity,
                            skills,
                            rule.ShadowRequirementIds) ||
                        AnyOwned(
                            infinity,
                            skills,
                            rule.ExclusiveWithIds) ||
                        (!settings
                              .autoAssignNonRefundableSkills &&
                         !rule.Refundable))
                    {
                        continue;
                    }

                    DiscreteDebitResult debit =
                        EconomyTransaction.TryDebit(
                            skills.skillPointsTree,
                            rule.Cost);
                    if (!debit.Succeeded)
                        continue;

                    skills.skillPointsTree = debit.Balance;
                    SkillOwnershipState.SetOwned(
                        infinity,
                        skills,
                        rule.Id,
                        true);
                    if (rule.IsFragment)
                    {
                        skills.fragments =
                            NumericSafety.Add(
                                skills.fragments,
                                1L).Value;
                    }
                    assignedAny = true;
                    if (skills.skillPointsTree <= 0L)
                        break;
                }

                passesRemaining--;
            } while (assignedAny &&
                     skills.skillPointsTree > 0L &&
                     passesRemaining > 0);
        }

        private static bool AllOwned(
            DysonVerseInfinityData infinity,
            DysonVerseSkillTreeData skills,
            string[] ids)
        {
            if (ids == null || ids.Length == 0)
                return true;
            for (int index = 0;
                 index < ids.Length;
                 index++)
            {
                if (!SkillOwnershipState.IsOwned(
                        infinity,
                        skills,
                        ids[index]))
                {
                    return false;
                }
            }
            return true;
        }

        private static bool AnyOwned(
            DysonVerseInfinityData infinity,
            DysonVerseSkillTreeData skills,
            string[] ids)
        {
            if (ids == null || ids.Length == 0)
                return false;
            for (int index = 0;
                 index < ids.Length;
                 index++)
            {
                if (SkillOwnershipState.IsOwned(
                        infinity,
                        skills,
                        ids[index]))
                {
                    return true;
                }
            }
            return false;
        }

        public static void RebuildDerivedState(
            SaveDataSettings settings)
        {
            DysonVerseSaveData dyson =
                settings.dysonVerseSaveData;
            DysonVerseInfinityData infinity =
                dyson.dysonVerseInfinityData;
            DysonVerseSkillTreeData skills =
                dyson.dysonVerseSkillTreeData;
            DysonVersePrestigeData prestige =
                dyson.dysonVersePrestigeData;
            SecretBuffState secrets =
                ModifierSystem.BuildSecretBuffState(prestige);
            ModifierSystem.CalculateModifiers(
                infinity,
                skills,
                prestige,
                settings.prestigePlus,
                secrets,
                MaximumInfinityBuff);
            ProductionSystem.SetBotDistribution(
                infinity,
                prestige,
                settings.prestigePlus);
            ProductionSystem.RecalculateDerivedState(
                infinity,
                skills,
                prestige,
                settings.prestigePlus);
        }
    }
}
