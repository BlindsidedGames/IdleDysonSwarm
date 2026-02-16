using System;
using System.Collections.Generic;
using Expansion;
using GameData;
using IdleDysonSwarm.UI;
using Systems.Skills;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using static Expansion.Oracle;

/*
Purpose:
- Owns one skill node's runtime behavior in the skill tree: presentation, availability checks, click handling,
  purchase/unassign, and line generation.

Where it runs:
- Runtime on each skill node GameObject in the skill tree UI.

Primary entry points:
- Unity lifecycle: OnEnable, Start, OnDisable.
- UI input: Clicked, RightClicked, OnPointerClick.
- Refresh path: UpdateSkill (from local and global update events).
- Mutations: PurchaseSkill, ResetSkills.
- Confirmation read API: TryGetNotRefundableReasonLabel.

Interacts with:
- Calls into: Expansion.Oracle (save data, ownership reads/writes, events, auto-assign APIs), GameDataRegistry/
  SkillDatabase/SkillDefinition (skill metadata), SkillTreeConfirmationManager (description/confirm modal),
  UIThemeProvider/UITheme (color sets), GameManager and DebugOptions update events.
- Called by: Unity UI Button events, Unity lifecycle, Oracle/GameManager/DebugOptions skill update events,
  SkillTreeConfirmationManager (reason label queries), and other systems that invoke SkillTreeManager.UpdateSkills.

Change notes:
- Serialized references (skillButton, purchasedImage, texts, ids/keys) are scene/prefab wired; renames require
  updating Unity references.
- Skill availability logic must stay aligned across UpdateSkill, ShowConfirmation, and PurchaseSkill; changing one
  without the others can allow visual state and purchase rules to diverge.
- skillKey/SkillId/SkillDefinition mapping relies on SkillIdMap + SkillDatabase + Oracle skill flags; ID changes
  must be coordinated with save data migration and any ScriptableObject ID updates.
- Effective non-refundable visuals and labels are computed from direct refundable flags, dynamic unrefundable locks,
  and transitive required-skill ancestry of assigned direct non-refundable skills; changing that contract affects both
  node coloring and confirmation warnings. Owned refundable/non-refundable skills use dedicated button color sets and
  the purchased overlay is kept hidden.
*/
[SelectionBase]
public class SkillTreeManager : MonoBehaviour, IPointerClickHandler
{
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private LineManager linePrefab => oracle.linePrefab;

    [SerializeField] public int skillKey;
    [SerializeField, HideInInspector] private SkillDefinition skillDefinition;
    [SerializeField, HideInInspector] private string skillId;
    private SkillDefinition _cachedDefinition;
    private string _cachedSkillId;
    private bool _loggedMissingDefinition;
    [SerializeField] private Button skillButton;
    [SerializeField] private GameObject purchasedImage;
    [SerializeField] private TMP_Text skillnameText;
    [SerializeField] private GameObject searchResultHighlight;
    [SerializeField] private bool linesMade;

    private enum SkillTreeColorType
    {
        NoRequired,
        Fragment,
        Owned,
        NonRefundable,
        NonRefundableOwned,
        Normal,
        ExclusiveLock
    }

    private enum NotRefundableReasonType
    {
        None,
        DirectIntrinsic,
        DirectDynamicLock,
        RequiredByDirectNonRefundableSkill
    }

    private const string NotRefundableWithRequiredSkillsLabel = "Not Refundable (Including Required Skills)";

    private static readonly UITheme.SkillTreeButtonColors FallbackNoRequiredColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.32941177f, 0.63529414f, 0.67058825f),
        pressed = new Color(0.2576f, 0.4390621f, 0.46f),
        disabled = new Color(0.21350001f, 0.33587933f, 0.35f),
        notPurchasableNormal = new Color(0.21350001f, 0.33587933f, 0.35f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackFragmentColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.67058825f, 0.32941177f, 0.49019608f),
        pressed = new Color(0.46f, 0.2576f, 0.35298392f),
        disabled = new Color(0.35f, 0.21350001f, 0.2778276f),
        notPurchasableNormal = new Color(0.35f, 0.21350001f, 0.2778276f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackNormalColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.5019608f, 0.32941177f, 0.67058825f),
        pressed = new Color(0.35686275f, 0.25490198f, 0.45882353f),
        disabled = new Color(0.2784314f, 0.21176471f, 0.34509805f),
        notPurchasableNormal = new Color(0.2784314f, 0.21176471f, 0.34509805f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackOwnedColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.32941177f, 0.67058825f, 0.32941177f),
        pressed = new Color(0.239f, 0.49f, 0.239f),
        disabled = new Color(0.17f, 0.34f, 0.17f),
        notPurchasableNormal = new Color(0.17f, 0.34f, 0.17f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackNonRefundableColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.45f, 0.18f, 0.18f),
        pressed = new Color(0.35f, 0.12f, 0.12f),
        disabled = new Color(0.22f, 0.08f, 0.08f),
        notPurchasableNormal = new Color(0.22f, 0.08f, 0.08f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackNonRefundableOwnedColors =
        new UITheme.SkillTreeButtonColors
        {
            normal = new Color(0.75f, 0.2f, 0.2f),
            pressed = new Color(0.55f, 0.12f, 0.12f),
            disabled = new Color(0.35f, 0.08f, 0.08f),
            notPurchasableNormal = new Color(0.35f, 0.08f, 0.08f)
        };

    private static readonly UITheme.SkillTreeButtonColors FallbackExclusiveLockColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.4f, 0.4f, 0.4f),
        pressed = new Color(0.29803923f, 0.29803923f, 0.29803923f),
        disabled = new Color(0.2f, 0.2f, 0.2f),
        notPurchasableNormal = new Color(0.2f, 0.2f, 0.2f)
    };

    public static event Action UpdateSkills;
    public static event Action ApplySkills;


    private void OnEnable()
    {
        UpdateSkills += UpdateSkill;
        GameManager.UpdateSkills += UpdateSkill;
        Oracle.UpdateSkills += UpdateSkill;
        DebugOptions.UpdateSkills += UpdateSkill;
    }

    private void Start()
    {
        CacheSearchHighlight();
        string[] requiredIds = GetRequiredSkillIds();
        if (requiredIds is not { Length: >= 1 })
        {
            ApplySkillButtonColors(SkillTreeColorType.NoRequired);
        }

        if (GetIsFragment())
        {
            ApplySkillButtonColors(SkillTreeColorType.Fragment);
        }

        skillnameText.text = GetDisplayName();
        skillButton.onClick.AddListener(Clicked);
        EnsureRightClickForwarder();
        UpdateSkill();
    }

    private void OnDisable()
    {
        UpdateSkills -= UpdateSkill;
        GameManager.UpdateSkills -= UpdateSkill;
        Oracle.UpdateSkills -= UpdateSkill;
        DebugOptions.UpdateSkills -= UpdateSkill;
    }

    public void OnPointerClick(PointerEventData eventData)
    {
        if (eventData != null && eventData.button == PointerEventData.InputButton.Right)
        {
            RightClicked();
        }
    }

    private void EnsureRightClickForwarder()
    {
        if (skillButton == null) return;
        RightClickForwarder forwarder = skillButton.GetComponent<RightClickForwarder>();
        if (forwarder == null)
        {
            forwarder = skillButton.gameObject.AddComponent<RightClickForwarder>();
        }

        forwarder.Initialize(this);
    }

    private void CacheSearchHighlight()
    {
        if (searchResultHighlight != null) return;
        Transform highlight = transform.Find("treeButton/SearchResultHighlight");
        if (highlight == null)
        {
            highlight = transform.Find("SearchResultHighlight");
        }
        if (highlight != null)
        {
            searchResultHighlight = highlight.gameObject;
        }
    }

    public void SetSearchHighlight(bool enabled)
    {
        CacheSearchHighlight();
        if (searchResultHighlight == null) return;
        searchResultHighlight.SetActive(enabled);
    }

    private sealed class RightClickForwarder : MonoBehaviour, IPointerClickHandler
    {
        private SkillTreeManager _manager;

        public void Initialize(SkillTreeManager manager)
        {
            _manager = manager;
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            if (_manager == null) return;
            if (eventData != null && eventData.button == PointerEventData.InputButton.Right)
            {
                _manager.RightClicked();
            }
        }
    }

    public string SkillId => ResolveSkillId();

    public SkillDefinition Definition => ResolveSkillDefinition();

    public bool IsOwned => IsOwnedInternal();

    public bool TryGetNotRefundableReasonLabel(out string label)
    {
        if (!TryResolveNotRefundableReason(out NotRefundableReasonType reasonType, out string reasonSkillId))
        {
            label = null;
            return false;
        }

        label = reasonType switch
        {
            NotRefundableReasonType.DirectIntrinsic => NotRefundableWithRequiredSkillsLabel,
            NotRefundableReasonType.DirectDynamicLock => $"Not Refundable (Due to: {ResolveSkillName(reasonSkillId)})",
            NotRefundableReasonType.RequiredByDirectNonRefundableSkill =>
                $"Not Refundable (Required by: {ResolveSkillName(reasonSkillId)})",
            _ => NotRefundableWithRequiredSkillsLabel
        };
        return true;
    }

    private SkillDefinition ResolveSkillDefinition()
    {
        if (_cachedDefinition != null) return _cachedDefinition;
        if (skillDefinition != null)
        {
            _cachedDefinition = skillDefinition;
            return _cachedDefinition;
        }

        string resolvedId = ResolveSkillId();
        if (string.IsNullOrEmpty(resolvedId)) return null;

        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry == null || registry.skillDatabase == null) return null;
        if (registry.skillDatabase.TryGet(resolvedId, out SkillDefinition definition))
        {
            _cachedDefinition = definition;
            return _cachedDefinition;
        }

        if (!_loggedMissingDefinition)
        {
            Debug.LogWarning($"SkillDefinition not found for id '{resolvedId}'.");
            _loggedMissingDefinition = true;
        }

        return null;
    }

    private string ResolveSkillId()
    {
        if (!string.IsNullOrEmpty(_cachedSkillId)) return _cachedSkillId;
        if (skillDefinition != null && !string.IsNullOrEmpty(skillDefinition.id))
        {
            _cachedSkillId = skillDefinition.id;
            return _cachedSkillId;
        }

        if (!string.IsNullOrEmpty(skillId))
        {
            _cachedSkillId = skillId;
            return _cachedSkillId;
        }

        if (SkillIdMap.TryGetId(skillKey, out string mappedId))
        {
            _cachedSkillId = mappedId;
            return _cachedSkillId;
        }

        return null;
    }

    private bool IsOwnedInternal()
    {
        string id = ResolveSkillId();
        return !string.IsNullOrEmpty(id) && oracle.IsSkillOwned(id);
    }

    private string GetDisplayName()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.displayName)) return definition.displayName;
        return ResolveSkillId() ?? string.Empty;
    }

    private string GetPopupName()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.displayName)) return definition.displayName;
        return ResolveSkillId() ?? string.Empty;
    }

    private string GetDescription()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.description)) return definition.description;
        return string.Empty;
    }

    private string GetTechnicalDescription()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.technicalDescription))
            return definition.technicalDescription;
        return string.Empty;
    }

    private int GetCost()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null ? definition.cost : 0;
    }

    private bool GetRefundable()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition == null || definition.refundable;
    }

    private bool IsRefundableConsideringLocks(string id)
    {
        if (string.IsNullOrEmpty(id)) return false;
        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry == null || registry.skillDatabase == null) return false;
        if (!registry.skillDatabase.TryGet(id, out SkillDefinition definition)) return false;

        bool refundable = definition.refundable;
        if (refundable && definition.unrefundableWithIds != null)
        {
            foreach (string otherId in definition.unrefundableWithIds)
            {
                if (oracle.IsSkillOwned(otherId))
                {
                    refundable = false;
                    break;
                }
            }
        }

        return refundable;
    }

    private bool IsEffectivelyNotRefundable()
    {
        return TryResolveNotRefundableReason(out _, out _);
    }

    private bool TryResolveNotRefundableReason(out NotRefundableReasonType reasonType, out string reasonSkillId)
    {
        reasonType = NotRefundableReasonType.None;
        reasonSkillId = null;

        SkillDefinition definition = ResolveSkillDefinition();
        if (definition == null) return false;

        if (!definition.refundable)
        {
            reasonType = NotRefundableReasonType.DirectIntrinsic;
            return true;
        }

        if (TryGetDynamicLockingSkillId(definition, out string lockingSkillId))
        {
            reasonType = NotRefundableReasonType.DirectDynamicLock;
            reasonSkillId = lockingSkillId;
            return true;
        }

        string currentSkillId = ResolveSkillId();
        if (TryGetRequiringDirectNonRefundableSkillId(currentSkillId, out string requiringSkillId))
        {
            reasonType = NotRefundableReasonType.RequiredByDirectNonRefundableSkill;
            reasonSkillId = requiringSkillId;
            return true;
        }

        return false;
    }

    private bool TryGetDynamicLockingSkillId(SkillDefinition definition, out string lockingSkillId)
    {
        lockingSkillId = null;
        if (definition == null || definition.unrefundableWithIds == null || definition.unrefundableWithIds.Length == 0)
            return false;
        if (!IsOwnedInternal()) return false;

        foreach (string otherId in definition.unrefundableWithIds)
        {
            if (string.IsNullOrEmpty(otherId)) continue;
            if (!oracle.IsSkillOwned(otherId)) continue;
            lockingSkillId = otherId;
            return true;
        }

        return false;
    }

    private bool TryGetRequiringDirectNonRefundableSkillId(string currentSkillId, out string requiringSkillId)
    {
        requiringSkillId = null;
        if (string.IsNullOrEmpty(currentSkillId)) return false;
        if (!IsOwnedInternal()) return false;

        GameDataRegistry registry = GameDataRegistry.Instance;
        SkillDatabase database = registry != null ? registry.skillDatabase : null;
        if (database != null && database.skills != null && database.skills.Count > 0)
        {
            foreach (SkillDefinition candidate in database.skills)
            {
                if (candidate == null || string.IsNullOrEmpty(candidate.id)) continue;
                if (candidate.refundable) continue;
                if (!oracle.IsSkillOwned(candidate.id)) continue;
                if (candidate.id == currentSkillId) continue;
                if (!IsInRequiredChain(candidate.id, currentSkillId, database)) continue;

                requiringSkillId = candidate.id;
                return true;
            }

            return false;
        }

        if (oracle == null || oracle.allSkillTreeManagers == null) return false;
        foreach (SkillTreeManager manager in oracle.allSkillTreeManagers)
        {
            if (manager == null || manager == this) continue;
            string candidateSkillId = manager.SkillId;
            if (string.IsNullOrEmpty(candidateSkillId) || candidateSkillId == currentSkillId) continue;
            if (!manager.IsOwned) continue;
            SkillDefinition candidateDefinition = manager.Definition;
            if (candidateDefinition == null || candidateDefinition.refundable) continue;
            if (!IsInRequiredChain(candidateSkillId, currentSkillId, null)) continue;

            requiringSkillId = candidateSkillId;
            return true;
        }

        return false;
    }

    private bool IsInRequiredChain(string rootSkillId, string targetSkillId, SkillDatabase database)
    {
        if (string.IsNullOrEmpty(rootSkillId) || string.IsNullOrEmpty(targetSkillId)) return false;
        HashSet<string> visited = new HashSet<string>(StringComparer.Ordinal) { rootSkillId };
        Queue<string> toVisit = new Queue<string>();
        toVisit.Enqueue(rootSkillId);

        while (toVisit.Count > 0)
        {
            string current = toVisit.Dequeue();
            string[] requiredIds = GetRequiredIdsBySkillId(current, database);
            if (requiredIds == null || requiredIds.Length == 0) continue;

            foreach (string requiredId in requiredIds)
            {
                if (string.IsNullOrEmpty(requiredId)) continue;
                if (requiredId == targetSkillId) return true;
                if (!visited.Add(requiredId)) continue;
                toVisit.Enqueue(requiredId);
            }
        }

        return false;
    }

    private string[] GetRequiredIdsBySkillId(string id, SkillDatabase database)
    {
        if (string.IsNullOrEmpty(id)) return null;
        if (database != null && database.TryGet(id, out SkillDefinition definition))
        {
            return definition.requiredSkillIds;
        }

        if (oracle == null || oracle.allSkillTreeManagers == null) return null;
        foreach (SkillTreeManager manager in oracle.allSkillTreeManagers)
        {
            if (manager == null) continue;
            if (!string.Equals(manager.SkillId, id, StringComparison.Ordinal)) continue;
            return manager.GetRequiredSkillIds();
        }

        return null;
    }

    private string ResolveSkillName(string id)
    {
        if (string.IsNullOrEmpty(id)) return string.Empty;
        GameDataRegistry registry = GameDataRegistry.Instance;
        if (registry != null && registry.skillDatabase != null &&
            registry.skillDatabase.TryGet(id, out SkillDefinition definition) &&
            !string.IsNullOrEmpty(definition.displayName))
        {
            return definition.displayName;
        }

        return id;
    }

    private List<string> GetOwnedDependentSkillIdsRecursive(string rootId)
    {
        return GetDependentSkillIdsRecursive(rootId, ownedOnly: true);
    }

    private List<string> GetAllDependentSkillIdsRecursive(string rootId)
    {
        return GetDependentSkillIdsRecursive(rootId, ownedOnly: false);
    }

    private List<string> GetDependentSkillIdsRecursive(string rootId, bool ownedOnly)
    {
        List<string> dependents = new List<string>();
        if (string.IsNullOrEmpty(rootId)) return dependents;
        HashSet<string> visited = new HashSet<string>(StringComparer.Ordinal) { rootId };
        Queue<string> toVisit = new Queue<string>();
        toVisit.Enqueue(rootId);

        GameDataRegistry registry = GameDataRegistry.Instance;
        SkillDatabase database = registry != null ? registry.skillDatabase : null;
        bool useDatabase = database != null && database.skills != null && database.skills.Count > 0;

        while (toVisit.Count > 0)
        {
            string current = toVisit.Dequeue();
            if (useDatabase)
            {
                foreach (SkillDefinition definition in database.skills)
                {
                    if (definition == null) continue;
                    string id = definition.id;
                    if (string.IsNullOrEmpty(id) || visited.Contains(id)) continue;
                    if (ownedOnly && !oracle.IsSkillOwned(id)) continue;
                    string[] required = definition.requiredSkillIds;
                    if (required == null || required.Length == 0) continue;
                    for (int i = 0; i < required.Length; i++)
                    {
                        if (required[i] != current) continue;
                        visited.Add(id);
                        dependents.Add(id);
                        toVisit.Enqueue(id);
                        break;
                    }
                }
            }
            else
            {
                foreach (SkillTreeManager skill in oracle.allSkillTreeManagers)
                {
                    if (skill == null) continue;
                    if (ownedOnly && !skill.IsOwned) continue;
                    string id = skill.SkillId;
                    if (string.IsNullOrEmpty(id) || visited.Contains(id)) continue;
                    string[] required = skill.GetRequiredSkillIds();
                    if (required == null || required.Length == 0) continue;
                    for (int i = 0; i < required.Length; i++)
                    {
                        if (required[i] != current) continue;
                        visited.Add(id);
                        dependents.Add(id);
                        toVisit.Enqueue(id);
                        break;
                    }
                }
            }
        }

        return dependents;
    }

    private void RemoveFromAutoAssignAndPresets(List<string> ids)
    {
        if (ids == null || ids.Count == 0) return;

        HashSet<string> toRemove = new HashSet<string>(StringComparer.Ordinal);
        foreach (string id in ids)
        {
            if (!string.IsNullOrEmpty(id))
            {
                toRemove.Add(id);
            }
        }

        if (toRemove.Count == 0) return;

        List<string> autoIds = oracle.GetAutoAssignmentSkillIds();
        if (autoIds.RemoveAll(id => toRemove.Contains(id)) > 0)
        {
            oracle.SetAutoAssignmentSkillIds(autoIds);
        }

        int presetIndex = 1;
        if (oracle != null && oracle.saveSettings != null && oracle.saveSettings.dysonVerseSaveData != null)
        {
            presetIndex = oracle.saveSettings.dysonVerseSaveData.selectedPreset;
        }

        presetIndex = Mathf.Clamp(presetIndex, 1, 5);
        {
            List<string> presetIds = oracle.GetPresetAutoAssignmentSkillIds(presetIndex);
            if (presetIds.RemoveAll(id => toRemove.Contains(id)) > 0)
            {
                oracle.SetPresetAutoAssignmentSkillIds(presetIndex, presetIds);
            }
        }
    }

    private bool GetIsFragment()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null && definition.isFragment;
    }

    private bool GetPurityLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null && definition.purityLine;
    }

    private bool GetTerraLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null && definition.terraLine;
    }

    private bool GetPowerLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null && definition.powerLine;
    }

    private bool GetParagadeLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null && definition.paragadeLine;
    }

    private bool GetStellarLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null && definition.stellarLine;
    }

    private bool GetFirstRunBlocked()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null && definition.firstRunBlocked;
    }

    private string[] GetRequiredSkillIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null ? definition.requiredSkillIds : null;
    }

    private string[] GetShadowRequirementIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null ? definition.shadowRequirementIds : null;
    }

    private string[] GetExclusiveWithIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null ? definition.exclusiveWithIds : null;
    }

    private string[] GetUnrefundableWithIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        return definition != null ? definition.unrefundableWithIds : null;
    }

    private bool AreRequirementsMet(string[] requiredIds)
    {
        if (requiredIds == null || requiredIds.Length == 0) return true;
        for (int i = 0; i < requiredIds.Length; i++)
        {
            if (!oracle.IsSkillOwned(requiredIds[i])) return false;
        }

        return true;
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

    private bool IsRequiredByOtherSkills()
    {
        string id = ResolveSkillId();
        if (string.IsNullOrEmpty(id)) return false;
        foreach (SkillTreeManager skill in oracle.allSkillTreeManagers)
        {
            if (skill == null || skill == this) continue;
            if (!skill.IsOwned) continue;
            string[] required = skill.GetRequiredSkillIds();
            if (required == null) continue;
            for (int i = 0; i < required.Length; i++)
            {
                if (required[i] == id) return true;
            }
        }

        return false;
    }

    private bool IsBlockedFromAutoAssign(string id)
    {
        if (string.IsNullOrEmpty(id)) return true;
        return SkillIdMap.TryGetLegacyKey(id, out int key) && oracle.listOfSkillsNotToAutoBuy.Contains(key);
    }

    private void EnableSKills()
    {
        if (GetPurityLine()) skillButton.gameObject.SetActive(prestigePlus.purity);
        if (GetIsFragment()) skillButton.gameObject.SetActive(prestigePlus.fragments);
        if (GetTerraLine()) skillButton.gameObject.SetActive(prestigePlus.terra);
        if (GetPowerLine()) skillButton.gameObject.SetActive(prestigePlus.power);
        if (GetParagadeLine()) skillButton.gameObject.SetActive(prestigePlus.paragade);
        if (GetStellarLine()) skillButton.gameObject.SetActive(prestigePlus.stellar);
        if (GetFirstRunBlocked())
            skillButton.gameObject.SetActive(oracle.saveSettings.firstInfinityDone);
    }

    private void UpdateSkill()
    {
        EnableSKills();
        if (purchasedImage != null) purchasedImage.SetActive(false);
        if (ResolveSkillDefinition() == null)
        {
            skillButton.interactable = false;
            return;
        }
        bool available = true;
        bool owned = IsOwnedInternal();
        int cost = GetCost();
        string[] requiredIds = GetRequiredSkillIds();
        string[] shadowIds = GetShadowRequirementIds();
        string[] exclusiveIds = GetExclusiveWithIds();
        bool exclusiveOwned = HasExclusiveOwned(exclusiveIds);
        bool canPurchaseNow = !owned
                              && AreRequirementsMet(requiredIds)
                              && AreRequirementsMet(shadowIds)
                              && skillTreeData.skillPointsTree >= cost
                              && !exclusiveOwned;
        bool isEffectivelyNotRefundable = IsEffectivelyNotRefundable();
        SkillTreeColorType colorType = ResolveCurrentColorType(exclusiveOwned, isEffectivelyNotRefundable, owned);
        bool useNotPurchasableVisual = !oracle.saveSettings.skillsBuyOnTap && !owned && !canPurchaseNow;

        if (oracle.saveSettings.skillsBuyOnTap)
        {
            if (owned)
            {
                available = false;
            }
            else
            {
                if (!AreRequirementsMet(requiredIds)) available = false;
                if (!AreRequirementsMet(shadowIds)) available = false;
                if (skillTreeData.skillPointsTree < cost) available = false;
            }
            if (exclusiveOwned) available = false;
        }

        ApplySkillButtonColors(colorType, useNotPurchasableVisual);
        skillButton.interactable = oracle.saveSettings.skillsBuyOnTap ? available : true;
        ApplySkills?.Invoke();
    }

    private SkillTreeColorType ResolveCurrentColorType(bool exclusiveOwned, bool isEffectivelyNotRefundable, bool owned)
    {
        if (exclusiveOwned) return SkillTreeColorType.ExclusiveLock;
        if (isEffectivelyNotRefundable && owned) return SkillTreeColorType.NonRefundableOwned;
        if (isEffectivelyNotRefundable) return SkillTreeColorType.NonRefundable;
        if (owned) return SkillTreeColorType.Owned;
        if (GetIsFragment()) return SkillTreeColorType.Fragment;
        string[] requiredIds = GetRequiredSkillIds();
        if (requiredIds == null || requiredIds.Length == 0) return SkillTreeColorType.NoRequired;
        return SkillTreeColorType.Normal;
    }

    private void ApplySkillButtonColors(SkillTreeColorType colorType, bool useNotPurchasableNormal = false)
    {
        if (skillButton == null) return;
        UITheme.SkillTreeButtonColors colors = ResolveSkillTreeColors(colorType);
        Color normalColor = colors.normal;
        if (useNotPurchasableNormal)
        {
            normalColor = ResolveNotPurchasableNormalColor(colors);
        }

        ColorBlock colourBlock = skillButton.colors;
        colourBlock.normalColor = normalColor;
        colourBlock.highlightedColor = normalColor;
        colourBlock.pressedColor = colors.pressed;
        colourBlock.selectedColor = normalColor;
        colourBlock.disabledColor = colors.disabled;
        skillButton.colors = colourBlock;
    }

    private static Color ResolveNotPurchasableNormalColor(UITheme.SkillTreeButtonColors colors)
    {
        Color fallback = Color.Lerp(colors.normal, Color.black, 0.35f);
        fallback.a = colors.normal.a;
        if (colors.notPurchasableNormal.a <= 0f) return fallback;
        return colors.notPurchasableNormal;
    }

    private UITheme.SkillTreeButtonColors ResolveSkillTreeColors(SkillTreeColorType colorType)
    {
        UITheme theme = UIThemeProvider.ActiveTheme;
        return colorType switch
        {
            SkillTreeColorType.NoRequired => theme?.skillTreeNoRequired ?? FallbackNoRequiredColors,
            SkillTreeColorType.Fragment => theme?.skillTreeFragment ?? FallbackFragmentColors,
            SkillTreeColorType.Owned => theme?.skillTreeOwned ?? FallbackOwnedColors,
            SkillTreeColorType.NonRefundable => theme?.skillTreeNonRefundable ?? FallbackNonRefundableColors,
            SkillTreeColorType.NonRefundableOwned =>
                theme?.skillTreeNonRefundableOwned ?? FallbackNonRefundableOwnedColors,
            SkillTreeColorType.ExclusiveLock => theme?.skillTreeExclusiveLock ?? FallbackExclusiveLockColors,
            _ => theme?.skillTreeNormal ?? FallbackNormalColors
        };
    }


    public void ResetSkills()
    {
        SkillDatabase database = GameDataRegistry.Instance != null ? GameDataRegistry.Instance.skillDatabase : null;
        if (database == null || database.skills.Count == 0)
        {
            Debug.LogWarning("Skill reset skipped: SkillDatabase not available.");
            return;
        }

        foreach (SkillDefinition skill in database.skills)
        {
            if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
            bool refundable = skill.refundable;
            if (refundable && skill.unrefundableWithIds != null)
            {
                foreach (string id in skill.unrefundableWithIds)
                {
                    if (oracle.IsSkillOwned(id))
                    {
                        refundable = false;
                        break;
                    }
                }
            }

            if (oracle.IsSkillOwned(skill.id) && refundable)
            {
                oracle.SetSkillOwned(skill.id, false);
                skillTreeData.skillPointsTree += skill.cost;
                if (skill.isFragment && skillTreeData.fragments >= 1) skillTreeData.fragments -= 1;
            }
        }

        if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentIds.Count >= 1)
            oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentIds.Clear();
        if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Count >= 1)
            oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Clear();
        oracle.SetAutoAssignmentSkillIds(new List<string>());

        UpdateSkills?.Invoke();
    }

    private void Clicked()
    {
        switch (oracle.saveSettings.skillsBuyOnTap)
        {
            case true:
            {
                bool owned = IsOwnedInternal();
                if (!owned && !GetRefundable())
                {
                    ShowConfirmation(false);
                }
                else
                {
                    PurchaseSkill();
                }
            }
                break;
            case false:
            {
                ShowConfirmation(true);
            }
                break;
        }
    }

    private void RightClicked()
    {
        if (!IsOwnedInternal()) return;
        if (oracle.saveSettings.skillsBuyOnTap)
        {
            PurchaseSkill();
            return;
        }

        ShowConfirmation(true);
    }

    private void ShowConfirmation(bool allowUnassign)
    {
        SkillTreeConfirmationManager stcm = oracle._skillTreeConfirmationManager;
        stcm.skillTreeManager = this;
        stcm.CloseConfirm();
        stcm.confirmButtonText.text = "Assign";
        int cost = GetCost();
        stcm.SetTexts(GetPopupName(), GetDescription(), GetTechnicalDescription(), $"Cost: {cost}");
        stcm.SetPosition(GetComponent<RectTransform>().localPosition);
        bool available = true;
        bool owned = IsOwnedInternal();
        string[] requiredIds = GetRequiredSkillIds();
        string[] shadowIds = GetShadowRequirementIds();
        string[] exclusiveIds = GetExclusiveWithIds();
        if (!owned)
        {
            if (skillTreeData.skillPointsTree < cost) available = false;
            if (!AreRequirementsMet(requiredIds)) available = false;
            if (!AreRequirementsMet(shadowIds)) available = false;
        }

        if (HasExclusiveOwned(exclusiveIds)) available = false;

        if (allowUnassign && owned)
        {
            List<string> dependents = GetOwnedDependentSkillIdsRecursive(ResolveSkillId());
            if (dependents.Count > 0)
            {
                foreach (string dependentId in dependents)
                {
                    if (!IsRefundableConsideringLocks(dependentId))
                    {
                        available = false;
                        break;
                    }
                }
            }

            if (!IsRefundableConsideringLocks(ResolveSkillId())) available = false;
            stcm.confirmButtonText.text = "Un-Assign";
        }

        stcm.confirm.interactable = available;
    }

    public void PurchaseSkill()
    {
        string id = ResolveSkillId();
        if (string.IsNullOrEmpty(id))
        {
            UpdateSkills?.Invoke();
            return;
        }

        SkillDefinition definition = ResolveSkillDefinition();
        if (definition == null)
        {
            UpdateSkills?.Invoke();
            return;
        }

        int cost = definition.cost;
        bool owned = IsOwnedInternal();
        if (owned)
        {
            List<string> dependents = GetOwnedDependentSkillIdsRecursive(id);
            List<string> allDependents = GetAllDependentSkillIdsRecursive(id);
            if (dependents.Count > 0)
            {
                foreach (string dependentId in dependents)
                {
                    if (!IsRefundableConsideringLocks(dependentId))
                    {
                        UpdateSkills?.Invoke();
                        return;
                    }
                }
            }

            if (!IsRefundableConsideringLocks(id))
            {
                UpdateSkills?.Invoke();
                return;
            }

            GameDataRegistry registry = GameDataRegistry.Instance;
            SkillDatabase database = registry != null ? registry.skillDatabase : null;
            if (dependents.Count > 0 && database != null)
            {
                foreach (string dependentId in dependents)
                {
                    if (!database.TryGet(dependentId, out SkillDefinition dependentDef)) continue;
                    if (!oracle.IsSkillOwned(dependentId)) continue;
                    oracle.SetSkillOwned(dependentId, false);
                    skillTreeData.skillPointsTree += dependentDef.cost;
                    if (dependentDef.isFragment && skillTreeData.fragments >= 1) skillTreeData.fragments -= 1;
                }
            }
            if (allDependents.Count > 0)
            {
                RemoveFromAutoAssignAndPresets(allDependents);
            }

            oracle.SetSkillOwned(id, false);
            skillTreeData.skillPointsTree += cost;
            if (definition.isFragment && skillTreeData.fragments >= 1) skillTreeData.fragments -= 1;
            List<string> autoIdsRoot = oracle.GetAutoAssignmentSkillIds();
            if (autoIdsRoot.Contains(id)) autoIdsRoot.Remove(id);
            oracle.SetAutoAssignmentSkillIds(autoIdsRoot);

            UpdateSkills?.Invoke();
            return;
        }

        if (skillTreeData.skillPointsTree < cost)
        {
            UpdateSkills?.Invoke();
            return;
        }

        skillTreeData.skillPointsTree -= cost;
        if (definition.isFragment) skillTreeData.fragments += 1;

        List<string> autoAssignIds = oracle.GetAutoAssignmentSkillIds();
        if (!autoAssignIds.Contains(id) && !IsBlockedFromAutoAssign(id))
        {
            autoAssignIds.Add(id);
            oracle.SetAutoAssignmentSkillIds(autoAssignIds);
        }

        oracle.SetSkillOwned(id, true);
        UpdateSkills?.Invoke();
    }


    [ContextMenu("MakeLines")]
    public void MakeLines()
    {
        if (linesMade) return;
        string[] requiredIds = GetRequiredSkillIds();
        if (requiredIds == null || requiredIds.Length == 0) return;
        string currentId = ResolveSkillId();
        foreach (string id in requiredIds)
            foreach (SkillTreeManager skill in oracle.allSkillTreeManagers)
            {
                if (skill == null) continue;
                if (!string.Equals(skill.SkillId, id, StringComparison.Ordinal)) continue;
                LineManager line = Instantiate(linePrefab, oracle.lineHolder).GetComponent<LineManager>();
                line.startSkillId = id;
                line.endSkillId = currentId;
                line.startSkillKey = skill.skillKey;
                line.endSkillKey = skillKey;
                line.startSkillManager = skill;
                line.endSkillManager = this;
                line.start = gameObject.GetComponent<RectTransform>();
                line.end = skill.gameObject.GetComponent<RectTransform>();
            }

        linesMade = true;
    }
}
