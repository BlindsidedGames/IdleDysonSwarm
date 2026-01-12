using System.Collections;
using System.Collections.Generic;
using GameData;
using MPUIKIT;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class SkillTreeConfirmationManager : MonoBehaviour
{
    [SerializeField] private GameManager _gameManager;
    [SerializeField] public Button confirm;
    [SerializeField] private Button cancel;
    public SkillTreeManager skillTreeManager;
    [SerializeField] private GameObject confirmationGo;
    [SerializeField] private Button autoAssignRemovalButton;
    [SerializeField] private Button autoAssignAddButton;
    [SerializeField] private GameObject notRefundableMessage;
    public TMP_Text confirmButtonText;

    [SerializeField] private TMP_Text nameText;
    [SerializeField] private TMP_Text descText;
    [SerializeField] private TMP_Text technicalDescText;
    [SerializeField] private TMP_Text costText;

    [SerializeField] private Image[] highlights;
    [SerializeField] private MPImage background;

    [SerializeField] private Color[] normalColours;
    [SerializeField] private Color[] fragmentColours;
    [SerializeField] private Color[] nonRefundableColours;

    private void Start()
    {
        confirm.onClick.AddListener(() => skillTreeManager.PurchaseSkill());
        cancel.onClick.AddListener(CloseConfirm);
        autoAssignRemovalButton.onClick.AddListener(RemoveSkillFromAutoAssign);
        autoAssignAddButton.onClick.AddListener(AddSkillToAutoAssign);
    }

    public void CloseConfirm()
    {
        confirmationGo.SetActive(false);
    }

    private void RemoveSkillFromAutoAssign()
    {
        string skillId = skillTreeManager.SkillId;
        if (string.IsNullOrEmpty(skillId) && !SkillIdMap.TryGetId(skillTreeManager.skillKey, out skillId)) return;
        List<string> autoIds = oracle.GetAutoAssignmentSkillIds();
        if (!autoIds.Contains(skillId)) return;
        autoIds.Remove(skillId);
        oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList = SkillIdMap.ConvertIdsToKeys(autoIds);
        _gameManager.UpdateSkillsInvoke();
        autoAssignRemovalButton.gameObject.SetActive(false);
        autoAssignAddButton.gameObject.SetActive(true);
    }

    private void AddSkillToAutoAssign()
    {
        string skillId = skillTreeManager.SkillId;
        if (string.IsNullOrEmpty(skillId) && !SkillIdMap.TryGetId(skillTreeManager.skillKey, out skillId)) return;
        List<string> autoIds = oracle.GetAutoAssignmentSkillIds();
        if (autoIds.Contains(skillId)) return;
        autoIds.Add(skillId);
        oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList = SkillIdMap.ConvertIdsToKeys(autoIds);
        _gameManager.UpdateSkillsInvoke();
        autoAssignAddButton.gameObject.SetActive(false);
        autoAssignRemovalButton.gameObject.SetActive(true);
    }

    public void SetPosition(Vector3 pos)
    {
        RectTransform thisRect = GetComponent<RectTransform>();
        thisRect.localPosition = pos;
        StartCoroutine(OpenDescription());
    }

    private IEnumerator OpenDescription()
    {
        yield return 0;
        confirmationGo.SetActive(true);
    }

    public void SetTexts(string name, string description, string technicalDescription, string cost)
    {
        SkillDefinition definition = skillTreeManager.Definition;
        if (definition == null)
        {
            string resolvedId = skillTreeManager.SkillId;
            GameDataRegistry registry = GameDataRegistry.Instance;
            if (!string.IsNullOrEmpty(resolvedId) && registry != null && registry.skillDatabase != null)
            {
                registry.skillDatabase.TryGet(resolvedId, out definition);
            }
        }

        bool refundable = definition == null || definition.refundable;
        bool isFragment = definition != null && definition.isFragment;
        bool owned = skillTreeManager.IsOwned;

        notRefundableMessage.SetActive(!refundable);
        string skillId = skillTreeManager.SkillId;
        if (string.IsNullOrEmpty(skillId)) SkillIdMap.TryGetId(skillTreeManager.skillKey, out skillId);
        List<string> autoAssignIds = oracle.GetAutoAssignmentSkillIds();
        bool queued = !string.IsNullOrEmpty(skillId) && autoAssignIds.Contains(skillId);
        autoAssignRemovalButton.gameObject.SetActive(queued);
        autoAssignAddButton.gameObject.SetActive(!queued);
        nameText.text = name;
        descText.text = description;
        technicalDescText.text = technicalDescription;
        if (isFragment && refundable)
        {
            string fragmentPlusOrMinus = owned ? "-1" : "+1";
            cost +=
                $"<br>Fragments owned: {oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.fragments}<color=#91DD8F><size=70%>{fragmentPlusOrMinus}";
            foreach (Image image in highlights) image.color = fragmentColours[0];
            background.color = fragmentColours[1];
        }

        if (definition != null && definition.exclusiveWithIds != null)
        {
            if (definition.exclusiveWithIds.Length >= 1 && !refundable)
            {
                bool makeComma = true;

                for (int i = 0; i < definition.exclusiveWithIds.Length; i++)
                {
                    string exclusiveName = ResolveSkillName(definition.exclusiveWithIds[i]);
                    if (makeComma)
                    {
                        cost += $"<br>Exclusive With: {exclusiveName}";
                        makeComma = false;
                    }
                    else
                    {
                        cost += $", {exclusiveName}";
                    }
                }
            }
        }

        if (isFragment)
        {
            foreach (Image image in highlights) image.color = fragmentColours[0];
            background.color = fragmentColours[1];
            background.OutlineColor = fragmentColours[0];
        }
        else if (!refundable)
        {
            foreach (Image image in highlights) image.color = nonRefundableColours[0];
            background.color = nonRefundableColours[1];
            background.OutlineColor = nonRefundableColours[0];
        }
        else
        {
            foreach (Image image in highlights) image.color = normalColours[0];
            background.color = normalColours[1];
            background.OutlineColor = normalColours[0];
        }

        costText.text = cost;
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
}
