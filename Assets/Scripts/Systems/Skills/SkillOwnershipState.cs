using System.Collections.Generic;
using GameData;
using Systems.Stats;
using static Expansion.Oracle;

namespace Systems.Skills
{
    /// <summary>
    /// Reads and writes the durable representations of Dyson skill ownership.
    /// Runtime presentation is deliberately outside this model-only helper.
    /// </summary>
    public static class SkillOwnershipState
    {
        public static bool IsOwned(
            DysonVerseInfinityData infinity,
            DysonVerseSkillTreeData skills,
            string skillId)
        {
            if (infinity == null ||
                string.IsNullOrEmpty(skillId))
            {
                return false;
            }

            if (infinity.skillOwnedBits != null &&
                infinity.skillOwnedBits.Length > 0 &&
                SkillBitsetUtility.TryGetIndex(
                    skillId,
                    out int bitIndex))
            {
                return SkillBitsetUtility.GetBit(
                    infinity.skillOwnedBits,
                    bitIndex);
            }

            if (infinity.skillStateById != null &&
                infinity.skillStateById.TryGetValue(
                    skillId,
                    out SkillState state))
            {
                return state != null && state.owned;
            }

            if (infinity.skillOwnedById != null &&
                infinity.skillOwnedById.TryGetValue(
                    skillId,
                    out bool ownedById))
            {
                EnsureStateEntry(
                    infinity,
                    skillId,
                    ownedById);
                return ownedById;
            }

            if (SkillFlagAccessor.TryGetFlag(
                    skills,
                    skillId,
                    out bool legacyOwned) &&
                legacyOwned)
            {
                EnsureStateEntry(
                    infinity,
                    skillId,
                    true);
                return true;
            }

            return false;
        }

        public static void SetOwned(
            DysonVerseInfinityData infinity,
            DysonVerseSkillTreeData skills,
            string skillId,
            bool owned)
        {
            if (infinity == null ||
                string.IsNullOrEmpty(skillId))
            {
                return;
            }

            infinity.skillStateById ??=
                new Dictionary<string, SkillState>();
            if (!infinity.skillStateById.TryGetValue(
                    skillId,
                    out SkillState state) ||
                state == null)
            {
                state = new SkillState();
                infinity.skillStateById[skillId] = state;
            }
            state.owned = owned;
            state.level = owned
                ? System.Math.Max(state.level, 1)
                : 0;

            infinity.skillOwnedById ??=
                new Dictionary<string, bool>();
            infinity.skillOwnedById[skillId] = owned;

            if (SkillIdMap.TryGetLegacyKey(
                    skillId,
                    out int legacyKey))
            {
                infinity.SkillTreeSaveData ??=
                    new Dictionary<int, bool>();
                infinity.SkillTreeSaveData[legacyKey] = owned;
            }

            if (infinity.skillOwnedBits == null ||
                infinity.skillOwnedBits.Length == 0)
            {
                infinity.skillOwnedBits =
                    SkillBitsetUtility.CreateEmptyBitset();
            }
            if (SkillBitsetUtility.TryGetIndex(
                    skillId,
                    out int bitIndex))
            {
                SkillBitsetUtility.SetBit(
                    infinity.skillOwnedBits,
                    bitIndex,
                    owned);
            }

            SkillFlagAccessor.TrySetFlag(
                skills,
                skillId,
                owned);
        }

        private static void EnsureStateEntry(
            DysonVerseInfinityData infinity,
            string skillId,
            bool owned)
        {
            infinity.skillStateById ??=
                new Dictionary<string, SkillState>();
            if (!infinity.skillStateById.TryGetValue(
                    skillId,
                    out SkillState state) ||
                state == null)
            {
                state = new SkillState();
                infinity.skillStateById[skillId] = state;
            }

            state.owned = owned;
            if (owned && state.level < 1)
                state.level = 1;
        }
    }
}
