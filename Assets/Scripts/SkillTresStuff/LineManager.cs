using System;
using System.Collections.Generic;
using System.Reflection;
using Sirenix.OdinInspector;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.UI.Extensions;
using static Oracle;

public class LineManager : MonoBehaviour
{
    [SerializeField] private GameManager _gameManager;
    [SerializeField] private Color colorDefault;
    [SerializeField] private Color colorAvailable;
    [SerializeField] private Color colorQueued;
    [SerializeField] private Color colorMissing;
    [SerializeField] private Color colorDisabled;
    [SerializeField] private Color colorOwned;
    [SerializeField] private Color colorExclusive;
    [SerializeField] public RectTransform start;
    [SerializeField] public RectTransform end;
    private UILineRenderer lr;
    public int startSkillKey;
    public int endSkillKey;

    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;

    private void OnEnable()
    {
        SkillTreeManager.UpdateSkills += SetColor;
        GameManager.UpdateSkills += SetColor;
        UpdateSkills += SetColor;
        GameManager.AssignSkills += SetColor;
    }

    private void OnDisable()
    {
        SkillTreeManager.UpdateSkills -= SetColor;
        GameManager.UpdateSkills -= SetColor;
        GameManager.AssignSkills -= SetColor;
        UpdateSkills -= SetColor;
    }

    private void Start()
    {
        lr = GetComponent<UILineRenderer>();
        SetLine();
        SetColor();
    }

    [Button("SetColor")]
    private void SetColor()
    {
        if (lr == null) return;
        var startOwned = oracle.SkillTree[startSkillKey].Owned;
        var endOwned = oracle.SkillTree[endSkillKey].Owned;
        var missingRequirement = false;
        if (oracle.SkillTree[endSkillKey].RequiredSkill.Length >= 1)
            foreach (var skill in oracle.SkillTree[endSkillKey].RequiredSkill)
                if (oracle.SkillTree[skill].Owned)
                    missingRequirement = true;

        if (oracle.SkillTree[endSkillKey].ExclusvieWith is { Length: >= 1 })
            foreach (var skill in oracle.SkillTree[endSkillKey].ExclusvieWith)
                if (oracle.SkillTree[skill].Owned)
                {
                    lr.color = colorExclusive;
                    return;
                }

        var enabled = true;
        if (oracle.SkillTree[endSkillKey].purityLine && !pp.purity) enabled = false;
        if (oracle.SkillTree[endSkillKey].isFragment && !pp.fragments) enabled = false;
        if (oracle.SkillTree[endSkillKey].terraLine && !pp.terra) enabled = false;
        if (oracle.SkillTree[endSkillKey].powerLine && !pp.power) enabled = false;
        if (oracle.SkillTree[endSkillKey].paragadeLine && !pp.paragade) enabled = false;
        if (oracle.SkillTree[endSkillKey].stellarLine && !pp.stellar) enabled = false;
        if (oracle.SkillTree[endSkillKey].firstRunBlocked && !oracle.saveSettings.firstInfinityDone) enabled = false;

        if (!enabled)
        {
            lr.color = colorDisabled;
            return;
        }

        if (startOwned && endOwned)
            lr.color = colorOwned;
        else if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(endSkillKey))
            lr.color = colorQueued;
        else if (startOwned)
            lr.color = colorAvailable;
        else if (missingRequirement)
            lr.color = colorMissing;
        else
            lr.color = colorDefault;
    }

    private void SetLine()
    {
        var position = start.anchoredPosition;
        var point = new Vector2
            { x = position.x, y = position.y };
        var position2 = end.anchoredPosition;
        var point2 = new Vector2
            { x = position2.x, y = position2.y };
        Vector2[] points = { point, point2 };
        var pointlist = new List<Vector2>(points);
        lr.Points = pointlist.ToArray();
    }
}