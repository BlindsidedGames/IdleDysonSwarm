using System;
using System.Collections.Generic;
using GameData;
using Sirenix.OdinInspector;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.UI.Extensions;
using static Expansion.Oracle;

/*
Purpose:
- Controls one prerequisite connection line in the skill tree and applies the correct visual color based on ownership,
  availability, queueing, exclusivity, and non-refundable path state.

Where it runs:
- Runtime on each line renderer instance connecting two skill nodes.

Primary entry points:
- Unity lifecycle: OnEnable, Start, OnDisable.
- Refresh callback: SetColor (via skill update events).
- Geometry setup: SetLine.

Interacts with:
- Calls into: Oracle (ownership checks, queue checks, prestige/first-run gates), SkillTreeManager (owned + effective
  non-refundable state), GameDataRegistry/SkillDatabase (fallback skill definition resolution), UILineRenderer.
- Called by: SkillTreeManager.MakeLines (line construction) and skill update events raised by SkillTreeManager/GameManager.

Change notes:
- Serialized color fields are configured on the line prefab/scene; changing semantics requires updating authored values.
- Non-refundable line state now depends on SkillTreeManager.TryGetNotRefundableReasonLabel for each connected owned node.
- State precedence is intentional: exclusive/disabled/non-refundable must resolve before queued/available/default.
*/
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
    [SerializeField] private Color colorNonRefundable = new Color(0.75f, 0.2f, 0.2f, 1f);
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
        bool endNotRefundable = ResolveEffectivelyNotRefundable(endSkillManager, endSkillId, endSkillKey, endOwned);
        bool nonRefundablePath = startOwned && endOwned && endNotRefundable;
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

        if (nonRefundablePath)
        {
            lr.color = colorNonRefundable;
            return;
        }

        bool queued = false;
        string resolvedEndId = ResolveEndSkillId();
        queued = oracle.IsAutoAssignmentQueued(endSkillKey, resolvedEndId);

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

    private bool ResolveEffectivelyNotRefundable(SkillTreeManager manager, string id, int key, bool owned)
    {
        if (!owned) return false;

        SkillTreeManager resolvedManager = ResolveManager(manager, id, key);
        if (resolvedManager != null)
        {
            return resolvedManager.TryGetNotRefundableReasonLabel(out _);
        }

        string resolvedId = ResolveSkillId(id, key);
        if (string.IsNullOrEmpty(resolvedId)) return false;
        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry == null || registry.skillDatabase == null) return false;
        if (!registry.skillDatabase.TryGet(resolvedId, out SkillDefinition definition) || definition == null) return false;
        return !definition.refundable;
    }

    private SkillTreeManager ResolveManager(SkillTreeManager manager, string id, int key)
    {
        if (manager != null) return manager;
        string resolvedId = ResolveSkillId(id, key);
        if (string.IsNullOrEmpty(resolvedId) || oracle == null || oracle.allSkillTreeManagers == null) return null;

        foreach (SkillTreeManager candidate in oracle.allSkillTreeManagers)
        {
            if (candidate == null) continue;
            if (!string.Equals(candidate.SkillId, resolvedId, StringComparison.Ordinal)) continue;
            return candidate;
        }

        return null;
    }

    private static string ResolveSkillId(string id, int key)
    {
        if (!string.IsNullOrEmpty(id)) return id;
        if (SkillIdMap.TryGetId(key, out string mappedId)) return mappedId;
        return null;
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
