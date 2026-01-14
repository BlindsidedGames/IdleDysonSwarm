using System.Collections.Generic;
using GameData;
using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;

public class SetSkillsOnOracle : MonoBehaviour
{
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

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
        if (registry == null || registry.skillDatabase == null || registry.skillDatabase.skills.Count == 0)
        {
            Debug.LogWarning("Skill sync skipped: SkillDatabase not available.");
            return;
        }

        foreach (SkillDefinition skill in registry.skillDatabase.skills)
        {
            if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
            bool owned = oracle.IsSkillOwned(skill.id);
            SkillFlagAccessor.TrySetFlag(skillTreeData, skill.id, owned);
        }
    }
}

