using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

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
    [SerializeField] private Image background;

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
        if (!oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(skillTreeManager.skillKey)) return;
        oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Remove(skillTreeManager.skillKey);
        _gameManager.UpdateSkillsInvoke();
        autoAssignRemovalButton.gameObject.SetActive(false);
        autoAssignAddButton.gameObject.SetActive(true);
    }

    private void AddSkillToAutoAssign()
    {
        if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(skillTreeManager.skillKey)) return;
        oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Add(skillTreeManager.skillKey);
        _gameManager.UpdateSkillsInvoke();
        autoAssignAddButton.gameObject.SetActive(false);
        autoAssignRemovalButton.gameObject.SetActive(true);
    }

    public void SetPosition(Vector3 pos)
    {
        var thisRect = GetComponent<RectTransform>();
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
        notRefundableMessage.SetActive(!oracle.SkillTree[skillTreeManager.skillKey].Refundable);
        autoAssignRemovalButton.gameObject.SetActive(
            oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(skillTreeManager.skillKey));
        autoAssignAddButton.gameObject.SetActive(
            !oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(skillTreeManager.skillKey));
        nameText.text = name;
        descText.text = description;
        technicalDescText.text = technicalDescription;
        if (oracle.SkillTree[skillTreeManager.skillKey].isFragment &&
            oracle.SkillTree[skillTreeManager.skillKey].Refundable)
        {
            var fragmentPlusOrMinus = oracle.SkillTree[skillTreeManager.skillKey].Owned ? "-1" : "+1";
            cost +=
                $"<br>Fragments owned: {oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.fragments}<color=#91DD8F><size=70%>{fragmentPlusOrMinus}";
            foreach (var image in highlights) image.color = fragmentColours[0];
            background.color = fragmentColours[1];
        }

        if (oracle.SkillTree[skillTreeManager.skillKey].ExclusvieWith != null)
            if (oracle.SkillTree[skillTreeManager.skillKey].ExclusvieWith.Length >= 1 &&
                !oracle.SkillTree[skillTreeManager.skillKey].Refundable)
            {
                var makeComma = true;

                for (var i = 0; i < oracle.SkillTree[skillTreeManager.skillKey].ExclusvieWith.Length; i++)
                    if (makeComma)
                    {
                        cost +=
                            $"<br>Exclusive With: {oracle.SkillTree[oracle.SkillTree[skillTreeManager.skillKey].ExclusvieWith[i]].SkillName}";
                        makeComma = false;
                    }
                    else
                    {
                        cost +=
                            $", {oracle.SkillTree[oracle.SkillTree[skillTreeManager.skillKey].ExclusvieWith[i]].SkillName}";
                    }
            }

        if (oracle.SkillTree[skillTreeManager.skillKey].isFragment)
        {
            foreach (var image in highlights) image.color = fragmentColours[0];
            background.color = fragmentColours[1];
        }
        else if (!oracle.SkillTree[skillTreeManager.skillKey].Refundable)
        {
            foreach (var image in highlights) image.color = nonRefundableColours[0];
            background.color = nonRefundableColours[1];
        }
        else
        {
            foreach (var image in highlights) image.color = normalColours[0];
            background.color = normalColours[1];
        }

        costText.text = cost;
    }
}