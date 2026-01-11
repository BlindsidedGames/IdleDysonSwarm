using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public static class SkillFlagAccessor
    {
        private static readonly Dictionary<string, FieldInfo> SkillFlagCache = new Dictionary<string, FieldInfo>();
        private static readonly HashSet<string> MissingSkillFlags = new HashSet<string>();
        private static readonly HashSet<string> InvalidSkillFlags = new HashSet<string>();

        public static bool TryGetFlag(DysonVerseSkillTreeData data, string skillId, out bool value)
        {
            value = false;
            if (data == null || string.IsNullOrEmpty(skillId)) return false;

            FieldInfo field = GetSkillField(skillId);
            if (field == null) return false;
            if (field.FieldType != typeof(bool))
            {
                if (InvalidSkillFlags.Add(skillId))
                    Debug.LogWarning($"SkillDefinition id '{skillId}' is not a bool field on DysonVerseSkillTreeData.");
                return false;
            }

            value = (bool)field.GetValue(data);
            return true;
        }

        public static bool TrySetFlag(DysonVerseSkillTreeData data, string skillId, bool value)
        {
            if (data == null || string.IsNullOrEmpty(skillId)) return false;

            FieldInfo field = GetSkillField(skillId);
            if (field == null) return false;
            if (field.FieldType != typeof(bool))
            {
                if (InvalidSkillFlags.Add(skillId))
                    Debug.LogWarning($"SkillDefinition id '{skillId}' is not a bool field on DysonVerseSkillTreeData.");
                return false;
            }

            field.SetValue(data, value);
            return true;
        }

        private static FieldInfo GetSkillField(string skillId)
        {
            if (SkillFlagCache.TryGetValue(skillId, out FieldInfo cached)) return cached;
            FieldInfo field = typeof(DysonVerseSkillTreeData)
                .GetField(skillId, BindingFlags.Public | BindingFlags.Instance);
            SkillFlagCache[skillId] = field;
            if (field == null && MissingSkillFlags.Add(skillId))
                Debug.LogWarning($"SkillDefinition id '{skillId}' does not map to a skill flag on DysonVerseSkillTreeData.");
            return field;
        }
    }
}
