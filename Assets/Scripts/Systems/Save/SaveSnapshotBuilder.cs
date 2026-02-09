using System;
using System.Collections.Generic;
using Expansion;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;
using Systems.Skills;

namespace Systems.Save
{
    /// <summary>
    /// Builds a compact, canonical save snapshot for disk/clipboard persistence.
    /// </summary>
    public static class SaveSnapshotBuilder
    {
        public static Oracle.SaveDataSettings CreateSaveSnapshotForStorage(
            Oracle.SaveDataSettings current,
            bool includeBase64Fields,
            Func<byte[]> buildOwnedBitsetFromRuntime,
            Func<List<string>> getAutoAssignmentSkillIds)
        {
            if (current == null) return null;
            Oracle.SaveDataSettings snapshot = (Oracle.SaveDataSettings)SirenixSerializationUtility.CreateCopy(current);
            CompactSkillTreeDataForSave(snapshot, includeBase64Fields, buildOwnedBitsetFromRuntime, getAutoAssignmentSkillIds);
            return snapshot;
        }

        private static void CompactSkillTreeDataForSave(
            Oracle.SaveDataSettings snapshot,
            bool includeBase64Fields,
            Func<byte[]> buildOwnedBitsetFromRuntime,
            Func<List<string>> getAutoAssignmentSkillIds)
        {
            if (snapshot == null) return;
            Oracle.DysonVerseSaveData saveData = snapshot.dysonVerseSaveData;
            Oracle.DysonVerseInfinityData infData = saveData?.dysonVerseInfinityData;
            if (infData == null) return;

            infData.skillOwnedBits = buildOwnedBitsetFromRuntime?.Invoke();
            infData.skillOwnedBitsBase64 = includeBase64Fields
                ? Convert.ToBase64String(infData.skillOwnedBits ?? Array.Empty<byte>())
                : null;
            ClearSkillTreeFlagsForSave(saveData?.dysonVerseSkillTreeData);

            if (infData.researchLevelsById != null && infData.researchLevelsById.Count > 0)
            {
                var filtered = new Dictionary<string, double>();
                foreach (KeyValuePair<string, double> entry in infData.researchLevelsById)
                {
                    if (entry.Value == 0) continue;
                    filtered[entry.Key] = entry.Value;
                }

                infData.researchLevelsById = filtered;
            }

            // Facility arrays are fixed-size (2 slots: manual/auto) and tiny in the binary format.
            // Avoid saving multiple representations (dense + sparse) and avoid nulling dense arrays
            // because it has proven fragile and can lead to data loss when one representation is missing.
            FacilityArrayNormalizer.Normalize(infData);

            if (infData.skillStateById != null)
            {
                Dictionary<string, Systems.Skills.SkillState> filtered = new Dictionary<string, Systems.Skills.SkillState>();
                foreach (KeyValuePair<string, Systems.Skills.SkillState> entry in infData.skillStateById)
                {
                    if (entry.Value == null) continue;
                    bool keep = entry.Value.timerSeconds != 0 ||
                                entry.Value.secondaryTimerSeconds != 0 ||
                                entry.Value.level > 1;
                    if (keep)
                    {
                        filtered[entry.Key] = entry.Value;
                    }
                }

                infData.skillStateById = filtered;
            }

            infData.skillOwnedById = null;
            infData.SkillTreeSaveData = null;

            if (saveData != null)
            {
                List<string> ids = getAutoAssignmentSkillIds != null ? getAutoAssignmentSkillIds() : new List<string>();
                saveData.skillAutoAssignmentBits = SkillBitsetUtility.BuildBitsetFromIds(ids);
                saveData.skillAutoAssignmentBits1 = null;
                saveData.skillAutoAssignmentBits2 = null;
                saveData.skillAutoAssignmentBits3 = null;
                saveData.skillAutoAssignmentBits4 = null;
                saveData.skillAutoAssignmentBits5 = null;

                if (includeBase64Fields)
                {
                    saveData.skillAutoAssignmentBitsBase64 =
                        Convert.ToBase64String(saveData.skillAutoAssignmentBits ?? Array.Empty<byte>());
                    saveData.skillAutoAssignmentBitsBase64_1 = null;
                    saveData.skillAutoAssignmentBitsBase64_2 = null;
                    saveData.skillAutoAssignmentBitsBase64_3 = null;
                    saveData.skillAutoAssignmentBitsBase64_4 = null;
                    saveData.skillAutoAssignmentBitsBase64_5 = null;
                }
                else
                {
                    saveData.skillAutoAssignmentBitsBase64 = null;
                    saveData.skillAutoAssignmentBitsBase64_1 = null;
                    saveData.skillAutoAssignmentBitsBase64_2 = null;
                    saveData.skillAutoAssignmentBitsBase64_3 = null;
                    saveData.skillAutoAssignmentBitsBase64_4 = null;
                    saveData.skillAutoAssignmentBitsBase64_5 = null;
                }

                saveData.skillAutoAssignmentIds = new List<string>();
                saveData.skillAutoAssignmentList = new List<int>();
            }
        }

        private static void ClearSkillTreeFlagsForSave(Oracle.DysonVerseSkillTreeData data)
        {
            if (data == null) return;
            System.Reflection.FieldInfo[] fields = typeof(Oracle.DysonVerseSkillTreeData).GetFields();
            for (int i = 0; i < fields.Length; i++)
            {
                System.Reflection.FieldInfo field = fields[i];
                if (field.FieldType != typeof(bool)) continue;
                field.SetValue(data, false);
            }
        }
    }
}

