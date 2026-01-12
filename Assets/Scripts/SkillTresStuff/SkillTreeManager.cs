using System;
using System.Collections.Generic;
using Classes;
using Expansion;
using GameData;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

[SelectionBase]
public class SkillTreeManager : MonoBehaviour
{
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private LineManager linePrefab => oracle.linePrefab;

    [SerializeField] public int skillKey;
    [SerializeField] private SkillDefinition skillDefinition;
    [SerializeField] private string skillId;
    private SkillDefinition _cachedDefinition;
    private string _cachedSkillId;
    private string[] _cachedRequiredSkillIds;
    private string[] _cachedShadowRequirementIds;
    private string[] _cachedExclusiveWithIds;
    private string[] _cachedUnrefundableWithIds;
    [SerializeField] private Button skillButton;
    [SerializeField] private GameObject purchasedImage;
    [SerializeField] private TMP_Text skillnameText;
    [SerializeField] private bool linesMade;
    [SerializeField] private Color[] noRequiredSkillsColors;
    [SerializeField] private Color[] fragmentSkillsColors;
    [SerializeField] private Color[] normalSkillColours;
    [SerializeField] private Color[] exclusiveLockSkillColours;

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
        string[] requiredIds = GetRequiredSkillIds();
        if (requiredIds is not { Length: >= 1 })
        {
            ColorBlock colours = skillButton.colors;
            colours.normalColor = noRequiredSkillsColors[0];
            colours.highlightedColor = noRequiredSkillsColors[0];
            colours.pressedColor = noRequiredSkillsColors[1];
            colours.selectedColor = noRequiredSkillsColors[0];
            colours.disabledColor = noRequiredSkillsColors[2];
            skillButton.colors = colours;
        }

        if (GetIsFragment())
        {
            ColorBlock colours = skillButton.colors;
            colours.normalColor = fragmentSkillsColors[0];
            colours.highlightedColor = fragmentSkillsColors[0];
            colours.pressedColor = fragmentSkillsColors[1];
            colours.selectedColor = fragmentSkillsColors[0];
            colours.disabledColor = fragmentSkillsColors[2];
            skillButton.colors = colours;
        }

        skillnameText.text = GetDisplayName();
        skillButton.onClick.AddListener(Clicked);
        UpdateSkill();
    }

    private void OnDisable()
    {
        UpdateSkills -= UpdateSkill;
        GameManager.UpdateSkills -= UpdateSkill;
        Oracle.UpdateSkills -= UpdateSkill;
        DebugOptions.UpdateSkills -= UpdateSkill;
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

    private bool TryGetLegacySkill(out SkillTreeItem item)
    {
        item = null;
        return skillKey > 0 && oracle.SkillTree != null && oracle.SkillTree.TryGetValue(skillKey, out item);
    }

    private bool IsOwnedInternal()
    {
        string id = ResolveSkillId();
        if (!string.IsNullOrEmpty(id)) return oracle.IsSkillOwned(id);
        return TryGetLegacySkill(out SkillTreeItem item) && item.Owned;
    }

    private string GetDisplayName()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.displayName)) return definition.displayName;
        if (TryGetLegacySkill(out SkillTreeItem item) && !string.IsNullOrEmpty(item.SkillName)) return item.SkillName;
        return ResolveSkillId() ?? string.Empty;
    }

    private string GetPopupName()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.displayName)) return definition.displayName;
        if (TryGetLegacySkill(out SkillTreeItem item))
        {
            if (!string.IsNullOrEmpty(item.SkillNamePopup)) return item.SkillNamePopup;
            if (!string.IsNullOrEmpty(item.SkillName)) return item.SkillName;
        }

        return ResolveSkillId() ?? string.Empty;
    }

    private string GetDescription()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.description)) return definition.description;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.SkillDescription;
        return string.Empty;
    }

    private string GetTechnicalDescription()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && !string.IsNullOrEmpty(definition.technicalDescription))
            return definition.technicalDescription;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.SkillTechnicalDescription;
        return string.Empty;
    }

    private int GetCost()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.cost;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.Cost;
        return 0;
    }

    private bool GetRefundable()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.refundable;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.Refundable;
        return true;
    }

    private bool GetIsFragment()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.isFragment;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.isFragment;
        return false;
    }

    private bool GetPurityLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.purityLine;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.purityLine;
        return false;
    }

    private bool GetTerraLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.terraLine;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.terraLine;
        return false;
    }

    private bool GetPowerLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.powerLine;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.powerLine;
        return false;
    }

    private bool GetParagadeLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.paragadeLine;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.paragadeLine;
        return false;
    }

    private bool GetStellarLine()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.stellarLine;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.stellarLine;
        return false;
    }

    private bool GetFirstRunBlocked()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null) return definition.firstRunBlocked;
        if (TryGetLegacySkill(out SkillTreeItem item)) return item.firstRunBlocked;
        return false;
    }

    private string[] GetRequiredSkillIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && definition.requiredSkillIds != null && definition.requiredSkillIds.Length > 0)
            return definition.requiredSkillIds;

        if (_cachedRequiredSkillIds != null) return _cachedRequiredSkillIds;
        if (TryGetLegacySkill(out SkillTreeItem item))
            _cachedRequiredSkillIds = ConvertLegacyKeys(item.RequiredSkill);
        return _cachedRequiredSkillIds;
    }

    private string[] GetShadowRequirementIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && definition.shadowRequirementIds != null &&
            definition.shadowRequirementIds.Length > 0)
            return definition.shadowRequirementIds;

        if (_cachedShadowRequirementIds != null) return _cachedShadowRequirementIds;
        if (TryGetLegacySkill(out SkillTreeItem item))
            _cachedShadowRequirementIds = ConvertLegacyKeys(item.ShadowRequirements);
        return _cachedShadowRequirementIds;
    }

    private string[] GetExclusiveWithIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && definition.exclusiveWithIds != null && definition.exclusiveWithIds.Length > 0)
            return definition.exclusiveWithIds;

        if (_cachedExclusiveWithIds != null) return _cachedExclusiveWithIds;
        if (TryGetLegacySkill(out SkillTreeItem item))
            _cachedExclusiveWithIds = ConvertLegacyKeys(item.ExclusvieWith);
        return _cachedExclusiveWithIds;
    }

    private string[] GetUnrefundableWithIds()
    {
        SkillDefinition definition = ResolveSkillDefinition();
        if (definition != null && definition.unrefundableWithIds != null && definition.unrefundableWithIds.Length > 0)
            return definition.unrefundableWithIds;

        if (_cachedUnrefundableWithIds != null) return _cachedUnrefundableWithIds;
        if (TryGetLegacySkill(out SkillTreeItem item))
            _cachedUnrefundableWithIds = ConvertLegacyKeys(item.UnrefundableWith);
        return _cachedUnrefundableWithIds;
    }

    private static string[] ConvertLegacyKeys(int[] keys)
    {
        if (keys == null || keys.Length == 0) return null;
        var ids = new List<string>(keys.Length);
        for (int i = 0; i < keys.Length; i++)
        {
            if (SkillIdMap.TryGetId(keys[i], out string id))
            {
                ids.Add(id);
            }
        }

        return ids.Count > 0 ? ids.ToArray() : null;
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
                    ColorBlock colours = skillButton.colors;
                    colours.normalColor = exclusiveLockSkillColours[0];
                    colours.highlightedColor = exclusiveLockSkillColours[0];
                    colours.pressedColor = exclusiveLockSkillColours[1];
                    colours.selectedColor = exclusiveLockSkillColours[0];
                    colours.disabledColor = exclusiveLockSkillColours[2];
                    skillButton.colors = colours;
                }
                else
                {
                    ColorBlock colours = skillButton.colors;
                    colours.normalColor = normalSkillColours[0];
                    colours.highlightedColor = normalSkillColours[0];
                    colours.pressedColor = normalSkillColours[1];
                    colours.selectedColor = normalSkillColours[0];
                    colours.disabledColor = normalSkillColours[2];
                    skillButton.colors = colours;
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
                    ColorBlock colours = skillButton.colors;
                    colours.normalColor = exclusiveLockSkillColours[0];
                    colours.highlightedColor = exclusiveLockSkillColours[0];
                    colours.pressedColor = exclusiveLockSkillColours[1];
                    colours.selectedColor = exclusiveLockSkillColours[0];
                    colours.disabledColor = exclusiveLockSkillColours[2];
                    skillButton.colors = colours;
                }
                else
                {
                    ColorBlock colours = skillButton.colors;
                    colours.normalColor = normalSkillColours[0];
                    colours.highlightedColor = normalSkillColours[0];
                    colours.pressedColor = normalSkillColours[1];
                    colours.selectedColor = normalSkillColours[0];
                    colours.disabledColor = normalSkillColours[2];
                    skillButton.colors = colours;
                }
            }
        }

        skillButton.interactable = available;
        ApplySkills?.Invoke();
    }


    public void ResetSkills()
    {
        SkillDatabase database = GameDataRegistry.Instance != null ? GameDataRegistry.Instance.skillDatabase : null;
        if (database != null && database.skills.Count > 0)
        {
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
        }
        else
        {
            foreach (KeyValuePair<int, SkillTreeItem> variable in oracle.SkillTree)
            {
                bool refundable = variable.Value.Refundable;
                if (variable.Value.UnrefundableWith != null)
                    foreach (int skill in variable.Value.UnrefundableWith)
                        if (oracle.SkillTree[skill].Owned)
                            refundable = false;

                if (variable.Value.Owned && refundable)
                {
                    variable.Value.Owned = false;
                    skillTreeData.skillPointsTree += variable.Value.Cost;
                    if (oracle.SkillTree[variable.Key].isFragment && skillTreeData.fragments >= 1) skillTreeData.fragments -= 1;
                }
            }
        }

        if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentIds.Count >= 1)
            oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentIds.Clear();
        if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Count >= 1)
            oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Clear();

        UpdateSkills?.Invoke();
    }

    private void Clicked()
    {
        switch (oracle.saveSettings.skillsBuyOnTap)
        {
            case true:
            {
                PurchaseSkill();
            }
                break;
            case false:
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


                if (owned)
                {
                    if (IsRequiredByOtherSkills()) available = false;
                    if (!GetRefundable()) available = false;
                    stcm.confirmButtonText.text = "Un-Assign";
                }

                stcm.confirm.interactable = available;
            }
                break;
        }
    }

    public void PurchaseSkill()
    {
        string id = ResolveSkillId();
        if (string.IsNullOrEmpty(id))
        {
            UpdateSkills?.Invoke();
            return;
        }

        int cost = GetCost();
        bool owned = IsOwnedInternal();
        if (owned)
        {
            if (IsRequiredByOtherSkills())
            {
                UpdateSkills?.Invoke();
                return;
            }

            if (GetRefundable())
            {
                oracle.SetSkillOwned(id, false);
                skillTreeData.skillPointsTree += cost;
                if (GetIsFragment() && skillTreeData.fragments >= 1) skillTreeData.fragments -= 1;
                List<string> autoIds = oracle.GetAutoAssignmentSkillIds();
                if (autoIds.Contains(id)) autoIds.Remove(id);
                oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList =
                    SkillIdMap.ConvertIdsToKeys(autoIds);
            }

            UpdateSkills?.Invoke();
            return;
        }

        if (skillTreeData.skillPointsTree < cost)
        {
            UpdateSkills?.Invoke();
            return;
        }

        skillTreeData.skillPointsTree -= cost;
        if (GetIsFragment()) skillTreeData.fragments += 1;

        List<string> autoAssignIds = oracle.GetAutoAssignmentSkillIds();
        if (!autoAssignIds.Contains(id) && !IsBlockedFromAutoAssign(id))
        {
            autoAssignIds.Add(id);
            oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList =
                SkillIdMap.ConvertIdsToKeys(autoAssignIds);
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

