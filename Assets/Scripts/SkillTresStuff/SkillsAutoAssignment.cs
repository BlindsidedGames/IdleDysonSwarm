using System.Collections.Generic;
using Classes;
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
            SkillTreeItem legacy = null;
            if (definition == null && SkillIdMap.TryGetLegacyKey(skillId, out int legacyKey))
            {
                oracle.SkillTree?.TryGetValue(legacyKey, out legacy);
            }

            int cost = definition != null ? definition.cost : legacy != null ? legacy.Cost : 0;
            if (skillTreeData.skillPointsTree < cost) continue;
            if (oracle.IsSkillOwned(skillId) || (legacy != null && legacy.Owned)) continue;

            bool available = true;
            if (!AreRequirementsMet(definition?.requiredSkillIds, legacy?.RequiredSkill)) available = false;
            if (!AreRequirementsMet(definition?.shadowRequirementIds, legacy?.ShadowRequirements)) available = false;
            if (HasExclusiveOwned(definition?.exclusiveWithIds, legacy?.ExclusvieWith)) available = false;
            if (available)
            {
                skillTreeData.skillPointsTree -= cost;
                oracle.SetSkillOwned(skillId, true);
                bool isFragment = definition != null ? definition.isFragment : legacy != null && legacy.isFragment;
                if (isFragment) skillTreeData.fragments += 1;
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

    private bool AreRequirementsMet(string[] requirementIds, int[] legacyKeys)
    {
        if (requirementIds != null && requirementIds.Length > 0)
        {
            foreach (string id in requirementIds)
                if (!oracle.IsSkillOwned(id))
                    return false;
            return true;
        }

        if (legacyKeys != null && legacyKeys.Length > 0)
        {
            foreach (int key in legacyKeys)
                if (!oracle.SkillTree[key].Owned)
                    return false;
        }

        return true;
    }

    private bool HasExclusiveOwned(string[] exclusiveIds, int[] legacyKeys)
    {
        if (exclusiveIds != null && exclusiveIds.Length > 0)
        {
            foreach (string id in exclusiveIds)
                if (oracle.IsSkillOwned(id))
                    return true;
            return false;
        }

        if (legacyKeys != null && legacyKeys.Length > 0)
        {
            foreach (int key in legacyKeys)
                if (oracle.SkillTree[key].Owned)
                    return true;
        }

        return false;
    }
}

