using System.Collections.Generic;
using GameData;
using UnityEngine;
using static Expansion.Oracle;

/*
Purpose:
- Executes skill auto-assignment from the current queued id list.
- Applies skills in dependency-safe queue order while preserving queue entries that are temporarily blocked.

Where it runs:
- Runtime on the skill auto-assignment scene object.

Primary entry points:
- Unity lifecycle: OnEnable, OnDisable.
- Assignment triggers: UnlockSkill via GameManager.AssignSkills and DebugOptions.AutoAssign.

Interacts with:
- Calls into: Oracle save state (queued ids, owned flags, settings), GameDataRegistry/SkillDatabase, GameManager.
- Called by: GameManager.AutoAssignSkillsInvoke and DebugOptions auto-assign action.

Change notes:
- Queue processing is skip-blocked (not fail-fast) so malformed order does not strand assignable points.
- Save setting SaveDataSettings.autoAssignNonRefundableSkills controls whether intrinsic non-refundable skills
  (SkillDefinition.refundable == false) are eligible for auto-assignment.
*/
public class SkillsAutoAssignment : MonoBehaviour
{
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    [SerializeField] private GameManager _gameManager;

    /// <summary>
    /// Subscribes assignment callbacks.
    /// </summary>
    private void OnEnable()
    {
        GameManager.AssignSkills += UnlockSkill;
        DebugOptions.AutoAssign += UnlockSkill;
    }

    /// <summary>
    /// Unsubscribes assignment callbacks.
    /// </summary>
    private void OnDisable()
    {
        GameManager.AssignSkills -= UnlockSkill;
        DebugOptions.AutoAssign -= UnlockSkill;
    }

    /// <summary>
    /// Applies queued skills while points remain, skipping blocked entries and continuing through the queue.
    /// </summary>
    private void UnlockSkill()
    {
        List<string> autoAssignIds = oracle.GetAutoAssignmentSkillIds();
        if (autoAssignIds.Count < 1) return;
        bool assignedAny;
        do
        {
            assignedAny = false;
            foreach (string skillId in autoAssignIds)
            {
                if (string.IsNullOrEmpty(skillId)) continue;
                SkillDefinition definition = ResolveSkillDefinition(skillId);
                if (definition == null) continue;
                if (oracle.IsSkillOwned(skillId)) continue;

                int cost = definition.cost;
                bool available = true;
                if (skillTreeData.skillPointsTree < cost) available = false;
                if (!AreRequirementsMet(definition.requiredSkillIds)) available = false;
                if (!AreRequirementsMet(definition.shadowRequirementIds)) available = false;
                if (HasExclusiveOwned(definition.exclusiveWithIds)) available = false;
                if (!oracle.saveSettings.autoAssignNonRefundableSkills && !definition.refundable) available = false;

                if (!available)
                {
                    continue;
                }

                skillTreeData.skillPointsTree -= cost;
                oracle.SetSkillOwned(skillId, true);
                if (definition.isFragment) skillTreeData.fragments += 1;
                assignedAny = true;

                if (skillTreeData.skillPointsTree <= 0) break;
            }

            if (assignedAny)
            {
                _gameManager.UpdateSkillsInvoke();
            }
        } while (assignedAny && skillTreeData.skillPointsTree > 0);
    }

    /// <summary>
    /// Resolves a skill definition from registry by id.
    /// </summary>
    /// <param name="id">Skill id.</param>
    /// <returns>Skill definition or null when missing.</returns>
    private SkillDefinition ResolveSkillDefinition(string id)
    {
        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry == null || registry.skillDatabase == null) return null;
        registry.skillDatabase.TryGet(id, out SkillDefinition definition);
        return definition;
    }

    /// <summary>
    /// Returns true when all requirement ids are currently owned.
    /// </summary>
    /// <param name="requirementIds">Required skill ids.</param>
    /// <returns>True when requirements are met.</returns>
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

    /// <summary>
    /// Returns true when any exclusive skill is currently owned.
    /// </summary>
    /// <param name="exclusiveIds">Exclusive skill ids.</param>
    /// <returns>True when a conflict exists.</returns>
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
