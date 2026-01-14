using System.Collections.Generic;
using GameData;
using Sirenix.OdinInspector;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.UI.Extensions;
using static Expansion.Oracle;

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
    public string startSkillId;
    public string endSkillId;
    public SkillTreeManager startSkillManager;
    public SkillTreeManager endSkillManager;

    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;

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
        SkillDefinition endDefinition = ResolveEndDefinition();
        bool startOwned = ResolveOwned(startSkillManager, startSkillId, startSkillKey);
        bool endOwned = ResolveOwned(endSkillManager, endSkillId, endSkillKey);
        bool missingRequirement = false;
        if (endDefinition != null && endDefinition.requiredSkillIds != null &&
            endDefinition.requiredSkillIds.Length >= 1)
            foreach (string requiredId in endDefinition.requiredSkillIds)
                if (oracle.IsSkillOwned(requiredId))
                    missingRequirement = true;

        if (endDefinition != null && endDefinition.exclusiveWithIds is { Length: >= 1 })
        {
            if (HasExclusiveOwned(endDefinition.exclusiveWithIds))
            {
                lr.color = colorExclusive;
                return;
            }
        }

        bool enabled = true;
        if (endDefinition != null)
        {
            if (endDefinition.purityLine && !prestigePlus.purity) enabled = false;
            if (endDefinition.isFragment && !prestigePlus.fragments) enabled = false;
            if (endDefinition.terraLine && !prestigePlus.terra) enabled = false;
            if (endDefinition.powerLine && !prestigePlus.power) enabled = false;
            if (endDefinition.paragadeLine && !prestigePlus.paragade) enabled = false;
            if (endDefinition.stellarLine && !prestigePlus.stellar) enabled = false;
            if (endDefinition.firstRunBlocked && !oracle.saveSettings.firstInfinityDone) enabled = false;
        }

        if (!enabled)
        {
            lr.color = colorDisabled;
            return;
        }

        bool queued = false;
        List<string> autoIds = oracle.GetAutoAssignmentSkillIds();
        string resolvedEndId = ResolveEndSkillId();
        if (!string.IsNullOrEmpty(resolvedEndId) && autoIds.Contains(resolvedEndId)) queued = true;
        if (!queued && oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(endSkillKey))
            queued = true;

        if (startOwned && endOwned)
            lr.color = colorOwned;
        else if (queued)
            lr.color = colorQueued;
        else if (startOwned)
            lr.color = colorAvailable;
        else if (missingRequirement)
            lr.color = colorMissing;
        else
            lr.color = colorDefault;
    }

    private bool ResolveOwned(SkillTreeManager manager, string id, int key)
    {
        if (manager != null) return manager.IsOwned;
        string resolvedId = id;
        if (string.IsNullOrEmpty(resolvedId) && SkillIdMap.TryGetId(key, out string mappedId))
        {
            resolvedId = mappedId;
        }

        return !string.IsNullOrEmpty(resolvedId) && oracle.IsSkillOwned(resolvedId);
    }

    private SkillDefinition ResolveEndDefinition()
    {
        if (endSkillManager != null && endSkillManager.Definition != null) return endSkillManager.Definition;
        string id = ResolveEndSkillId();
        if (string.IsNullOrEmpty(id)) return null;
        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry == null || registry.skillDatabase == null) return null;
        registry.skillDatabase.TryGet(id, out SkillDefinition definition);
        return definition;
    }

    private string ResolveEndSkillId()
    {
        if (!string.IsNullOrEmpty(endSkillId)) return endSkillId;
        if (endSkillManager != null && !string.IsNullOrEmpty(endSkillManager.SkillId)) return endSkillManager.SkillId;
        if (SkillIdMap.TryGetId(endSkillKey, out string mappedId)) return mappedId;
        return null;
    }

    private bool HasExclusiveOwned(string[] exclusiveIds)
    {
        if (exclusiveIds == null || exclusiveIds.Length == 0) return false;
        for (int i = 0; i < exclusiveIds.Length; i++)
        {
            if (oracle.IsSkillOwned(exclusiveIds[i])) return true;
        }

        return false;
    }

    private void SetLine()
    {
        Vector2 position = start.anchoredPosition;
        Vector2 point = new Vector2
            { x = position.x, y = position.y };
        Vector2 position2 = end.anchoredPosition;
        Vector2 point2 = new Vector2
            { x = position2.x, y = position2.y };
        Vector2[] points = { point, point2 };
        List<Vector2> pointlist = new List<Vector2>(points);
        lr.Points = pointlist.ToArray();
    }
}

