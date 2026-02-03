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
        Normal,
        ExclusiveLock
    }

    private static readonly UITheme.SkillTreeButtonColors FallbackNoRequiredColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.32941177f, 0.63529414f, 0.67058825f),
        pressed = new Color(0.2576f, 0.4390621f, 0.46f),
        disabled = new Color(0.21350001f, 0.33587933f, 0.35f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackFragmentColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.67058825f, 0.32941177f, 0.49019608f),
        pressed = new Color(0.46f, 0.2576f, 0.35298392f),
        disabled = new Color(0.35f, 0.21350001f, 0.2778276f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackNormalColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.5019608f, 0.32941177f, 0.67058825f),
        pressed = new Color(0.35686275f, 0.25490198f, 0.45882353f),
        disabled = new Color(0.2784314f, 0.21176471f, 0.34509805f)
    };

    private static readonly UITheme.SkillTreeButtonColors FallbackExclusiveLockColors = new UITheme.SkillTreeButtonColors
    {
        normal = new Color(0.4f, 0.4f, 0.4f),
        pressed = new Color(0.29803923f, 0.29803923f, 0.29803923f),
        disabled = new Color(0.2f, 0.2f, 0.2f)
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

        for (int presetIndex = 1; presetIndex <= 5; presetIndex++)
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
        purchasedImage.SetActive(false);
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

        if (oracle.saveSettings.skillsBuyOnTap)
        {
            if (owned)
            {
                available = false;
                purchasedImage.SetActive(true);
            }
            else
            {
                if (!AreRequirementsMet(requiredIds)) available = false;
                if (!AreRequirementsMet(shadowIds)) available = false;
                if (skillTreeData.skillPointsTree < cost) available = false;
            }

            if (exclusiveIds is { Length: >= 1 })
            {
                if (HasExclusiveOwned(exclusiveIds))
                {
                    available = false;
                    ApplySkillButtonColors(SkillTreeColorType.ExclusiveLock);
                }
                else
                {
                    ApplySkillButtonColors(SkillTreeColorType.Normal);
                }
            }
        }
        else
        {
            if (owned) purchasedImage.SetActive(true);
            if (exclusiveIds is { Length: >= 1 })
            {
                if (HasExclusiveOwned(exclusiveIds))
                {
                    ApplySkillButtonColors(SkillTreeColorType.ExclusiveLock);
                }
                else
                {
                    ApplySkillButtonColors(SkillTreeColorType.Normal);
                }
            }
        }

        skillButton.interactable = available;
        ApplySkills?.Invoke();
    }

    private void ApplySkillButtonColors(SkillTreeColorType colorType)
    {
        if (skillButton == null) return;
        UITheme.SkillTreeButtonColors colors = ResolveSkillTreeColors(colorType);
        ColorBlock colourBlock = skillButton.colors;
        colourBlock.normalColor = colors.normal;
        colourBlock.highlightedColor = colors.normal;
        colourBlock.pressedColor = colors.pressed;
        colourBlock.selectedColor = colors.normal;
        colourBlock.disabledColor = colors.disabled;
        skillButton.colors = colourBlock;
    }

    private UITheme.SkillTreeButtonColors ResolveSkillTreeColors(SkillTreeColorType colorType)
    {
        UITheme theme = UIThemeProvider.ActiveTheme;
        if (theme != null
            && theme.skillTreeNoRequired != null
            && theme.skillTreeFragment != null
            && theme.skillTreeNormal != null
            && theme.skillTreeExclusiveLock != null)
        {
            return colorType switch
            {
                SkillTreeColorType.NoRequired => theme.skillTreeNoRequired,
                SkillTreeColorType.Fragment => theme.skillTreeFragment,
                SkillTreeColorType.ExclusiveLock => theme.skillTreeExclusiveLock,
                _ => theme.skillTreeNormal
            };
        }

        return colorType switch
        {
            SkillTreeColorType.NoRequired => FallbackNoRequiredColors,
            SkillTreeColorType.Fragment => FallbackFragmentColors,
            SkillTreeColorType.ExclusiveLock => FallbackExclusiveLockColors,
            _ => FallbackNormalColors
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

