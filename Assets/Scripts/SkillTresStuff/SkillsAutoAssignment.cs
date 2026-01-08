using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using static Expansion.Oracle;


public class SkillsAutoAssignment : MonoBehaviour
{
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    [SerializeField] private GameManager _gameManager;

    private void OnEnable()
    {
        GameManager.AssignSkills += UnlockSkill;
        DebugOptions.AutoAssign += UnlockSkill;
    }

    private void OnDisable()
    {
        GameManager.AssignSkills -= UnlockSkill;
        DebugOptions.AutoAssign += UnlockSkill;
    }

    private void UnlockSkill()
    {
        long pointsLeft = dvst.skillPointsTree;
        if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Count < 1) return;
        foreach (int skill in oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList)
        {
            if (dvst.skillPointsTree < oracle.SkillTree[skill].Cost) continue;
            if (oracle.SkillTree[skill].Owned) continue;

            bool available = true;
            if (oracle.SkillTree[skill].RequiredSkill != null)
                foreach (int variable in oracle.SkillTree[skill].RequiredSkill)
                    if (!oracle.SkillTree[variable].Owned)
                        available = false;
            if (oracle.SkillTree[skill].ShadowRequirements != null)
                foreach (int variable in oracle.SkillTree[skill].ShadowRequirements)
                    if (!oracle.SkillTree[variable].Owned)
                        available = false;
            if (oracle.SkillTree[skill].ExclusvieWith is { Length: >= 1 })
                foreach (int variable in oracle.SkillTree[skill].ExclusvieWith)
                    if (oracle.SkillTree[variable].Owned)
                        available = false;
            if (available)
            {
                dvst.skillPointsTree -= oracle.SkillTree[skill].Cost;
                oracle.SkillTree[skill].Owned = true;
                if (oracle.SkillTree[skill].isFragment) dvst.fragments += 1;
                pointsLeft -= 1;
            }

            if (pointsLeft != dvst.skillPointsTree) UnlockSkill();
            _gameManager.UpdateSkillsInvoke();
        }
    }
}