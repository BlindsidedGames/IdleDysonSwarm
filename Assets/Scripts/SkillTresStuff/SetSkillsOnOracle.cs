using System.Collections.Generic;
using Classes;
using GameData;
using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

public class SetSkillsOnOracle : MonoBehaviour
{
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

    private void OnEnable()
    {
        SkillTreeManager.ApplySkills += UpdateSavedSkills;
        GameManager.UpdateSkills += UpdateSavedSkills;
        UpdateSkills += UpdateSavedSkills;
    }

    private void OnDisable()
    {
        SkillTreeManager.ApplySkills -= UpdateSavedSkills;
        GameManager.UpdateSkills -= UpdateSavedSkills;
        UpdateSkills -= UpdateSavedSkills;
    }

    private void UpdateSavedSkills()
    {
        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
        {
            foreach (SkillDefinition skill in registry.skillDatabase.skills)
            {
                if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                bool owned = oracle.IsSkillOwned(skill.id);
                SkillFlagAccessor.TrySetFlag(dvst, skill.id, owned);

                if (SkillIdMap.TryGetLegacyKey(skill.id, out int key) &&
                    oracle.SkillTree.TryGetValue(key, out SkillTreeItem item))
                {
                    item.Owned = owned;
                }
            }

            return;
        }

        foreach (KeyValuePair<int, SkillTreeItem> variable in oracle.SkillTree)
        {
            if (!SkillIdMap.TryGetId(variable.Key, out string id)) continue;
            SkillFlagAccessor.TrySetFlag(dvst, id, variable.Value.Owned);
        }
    }
}
