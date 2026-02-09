using System.Collections.Generic;
using Classes;
using GameData;
using Systems.Skills;

namespace Expansion
{
    /// <summary>
    /// Bridges runtime skill tree UI state with save data dictionaries.
    /// </summary>
    /// <remarks>
    /// Historically, the project stored owned skills in multiple representations (legacy bool fields, legacy int-key
    /// dictionaries, string-id dictionaries, and bitsets). These helpers keep the runtime UI bound to
    /// <see cref="DysonVerseInfinityData.SkillTreeSaveData"/> and help preserve compatibility during migrations.
    /// </remarks>
    public partial class Oracle
    {
        private void LoadDictionaries()
        {
            foreach (KeyValuePair<int, SkillTreeItem> variable in SkillTree)
            {
                infinityData.SkillTreeSaveData ??= new Dictionary<int, bool>();
                infinityData.SkillTreeSaveData.TryAdd(variable.Key, variable.Value.Owned);
                variable.Value.Owned = infinityData.SkillTreeSaveData[variable.Key];
            }
        }

        private void SaveDictionaries()
        {
            infinityData.SkillTreeSaveData = new Dictionary<int, bool>();
            if (infinityData.skillStateById != null && infinityData.skillStateById.Count > 0)
            {
                foreach (KeyValuePair<string, SkillState> entry in infinityData.skillStateById)
                {
                    if (SkillIdMap.TryGetLegacyKey(entry.Key, out int key))
                    {
                        infinityData.SkillTreeSaveData[key] = entry.Value.owned;
                    }
                }

                return;
            }

            if (infinityData.skillOwnedById != null && infinityData.skillOwnedById.Count > 0)
            {
                foreach (KeyValuePair<string, bool> entry in infinityData.skillOwnedById)
                {
                    if (SkillIdMap.TryGetLegacyKey(entry.Key, out int key))
                    {
                        infinityData.SkillTreeSaveData[key] = entry.Value;
                    }
                }

                return;
            }

            foreach (KeyValuePair<int, SkillTreeItem> value in SkillTree)
            {
                if (!infinityData.SkillTreeSaveData.ContainsKey(value.Key))
                    infinityData.SkillTreeSaveData.Add(value.Key, value.Value.Owned);
                infinityData.SkillTreeSaveData[value.Key] = value.Value.Owned;
            }
        }
    }
}
