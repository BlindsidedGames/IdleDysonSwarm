using System.Collections.Generic;
using GameData;
using UnityEngine;
using static Expansion.Oracle;


public class SkillsAutoAssignment : MonoBehaviour
{
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    [SerializeField] private GameManager _gameManager;

    private void OnEnable()
    {
        GameManager.AssignSkills += UnlockSkill;
        DebugOptions.AutoAssign += UnlockSkill;
    }

    private void OnDisable()
    {
        GameManager.AssignSkills -= UnlockSkill;
        DebugOptions.AutoAssign -= UnlockSkill;
    }

    private void UnlockSkill()
    {
        long pointsLeft = skillTreeData.skillPointsTree;
        List<string> autoAssignIds = oracle.GetAutoAssignmentSkillIds();
        if (autoAssignIds.Count < 1) return;
        foreach (string skillId in autoAssignIds)
        {
            if (string.IsNullOrEmpty(skillId)) continue;
            SkillDefinition definition = ResolveSkillDefinition(skillId);
            if (definition == null) continue;
            int cost = definition.cost;
            if (skillTreeData.skillPointsTree < cost) continue;
            if (oracle.IsSkillOwned(skillId)) continue;

            bool available = true;
            if (!AreRequirementsMet(definition.requiredSkillIds)) available = false;
            if (!AreRequirementsMet(definition.shadowRequirementIds)) available = false;
            if (HasExclusiveOwned(definition.exclusiveWithIds)) available = false;
            if (available)
            {
                skillTreeData.skillPointsTree -= cost;
                oracle.SetSkillOwned(skillId, true);
                if (definition.isFragment) skillTreeData.fragments += 1;
                pointsLeft -= 1;
            }

            if (pointsLeft != skillTreeData.skillPointsTree) UnlockSkill();
            _gameManager.UpdateSkillsInvoke();
        }
    }

    private SkillDefinition ResolveSkillDefinition(string id)
    {
        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry == null || registry.skillDatabase == null) return null;
        registry.skillDatabase.TryGet(id, out SkillDefinition definition);
        return definition;
    }

    private bool AreRequirementsMet(string[] requirementIds)
    {
        if (requirementIds != null && requirementIds.Length > 0)
        {
            foreach (string id in requirementIds)
                if (!oracle.IsSkillOwned(id))
                    return false;
            return true;
        }
        return true;
    }

    private bool HasExclusiveOwned(string[] exclusiveIds)
    {
        if (exclusiveIds != null && exclusiveIds.Length > 0)
        {
            foreach (string id in exclusiveIds)
                if (oracle.IsSkillOwned(id))
                    return true;
            return false;
        }
        return false;
    }
}

