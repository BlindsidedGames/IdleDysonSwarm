using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Classes;
using Expansion;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

[SelectionBase]
public class SkillTreeManager : MonoBehaviour
{
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;
    private LineManager linePrefab => oracle.linePrefab;

    [SerializeField] public int skillKey;
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
        if (oracle.SkillTree[skillKey].RequiredSkill is not { Length: >= 1 })
        {
            ColorBlock colours = skillButton.colors;
            colours.normalColor = noRequiredSkillsColors[0];
            colours.highlightedColor = noRequiredSkillsColors[0];
            colours.pressedColor = noRequiredSkillsColors[1];
            colours.selectedColor = noRequiredSkillsColors[0];
            colours.disabledColor = noRequiredSkillsColors[2];
            skillButton.colors = colours;
        }

        if (oracle.SkillTree[skillKey].isFragment)
        {
            ColorBlock colours = skillButton.colors;
            colours.normalColor = fragmentSkillsColors[0];
            colours.highlightedColor = fragmentSkillsColors[0];
            colours.pressedColor = fragmentSkillsColors[1];
            colours.selectedColor = fragmentSkillsColors[0];
            colours.disabledColor = fragmentSkillsColors[2];
            skillButton.colors = colours;
        }

        skillnameText.text = oracle.SkillTree[skillKey].SkillName;
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

    private void EnableSKills()
    {
        if (oracle.SkillTree[skillKey].purityLine) skillButton.gameObject.SetActive(pp.purity);
        if (oracle.SkillTree[skillKey].isFragment) skillButton.gameObject.SetActive(pp.fragments);
        if (oracle.SkillTree[skillKey].terraLine) skillButton.gameObject.SetActive(pp.terra);
        if (oracle.SkillTree[skillKey].powerLine) skillButton.gameObject.SetActive(pp.power);
        if (oracle.SkillTree[skillKey].paragadeLine) skillButton.gameObject.SetActive(pp.paragade);
        if (oracle.SkillTree[skillKey].stellarLine) skillButton.gameObject.SetActive(pp.stellar);
        if (oracle.SkillTree[skillKey].firstRunBlocked)
            skillButton.gameObject.SetActive(oracle.saveSettings.firstInfinityDone);
    }

    private void UpdateSkill()
    {
        EnableSKills();
        purchasedImage.SetActive(false);
        bool available = true;
        if (oracle.saveSettings.skillsBuyOnTap)
        {
            if (oracle.SkillTree[skillKey].Owned)
            {
                available = false;
                purchasedImage.SetActive(true);
            }
            else
            {
                if (oracle.SkillTree[skillKey].RequiredSkill != null)
                    foreach (int variable in oracle.SkillTree[skillKey].RequiredSkill)
                        if (!oracle.SkillTree[variable].Owned)
                            available = false;
                if (oracle.SkillTree[skillKey].ShadowRequirements != null)
                    foreach (int variable in oracle.SkillTree[skillKey].ShadowRequirements)
                        if (!oracle.SkillTree[variable].Owned)
                            available = false;
                if (dvst.skillPointsTree < oracle.SkillTree[skillKey].Cost) available = false;
            }

            if (oracle.SkillTree[skillKey].ExclusvieWith is { Length: >= 1 })
                foreach (int skill in oracle.SkillTree[skillKey].ExclusvieWith)
                    if (oracle.SkillTree[skill].Owned)
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
        else
        {
            if (oracle.SkillTree[skillKey].Owned) purchasedImage.SetActive(true);
            if (oracle.SkillTree[skillKey].ExclusvieWith is { Length: >= 1 })
                foreach (int skill in oracle.SkillTree[skillKey].ExclusvieWith)
                    if (oracle.SkillTree[skill].Owned)
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


        skillButton.interactable = available;
        ApplySkills?.Invoke();
    }


    public void ResetSkills()
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
                dvst.skillPointsTree += variable.Value.Cost;
                if (oracle.SkillTree[variable.Key].isFragment && dvst.fragments >= 1) dvst.fragments -= 1;
            }
        }

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
                stcm.SetTexts(oracle.SkillTree[skillKey].SkillNamePopup,
                    oracle.SkillTree[skillKey].SkillDescription, oracle.SkillTree[skillKey].SkillTechnicalDescription,
                    $"Cost: {oracle.SkillTree[skillKey].Cost}");
                stcm.SetPosition(GetComponent<RectTransform>().localPosition);
                bool available = true;
                if (!oracle.SkillTree[skillKey].Owned)
                {
                    if (dvst.skillPointsTree < oracle.SkillTree[skillKey].Cost) available = false;
                    if (oracle.SkillTree[skillKey].RequiredSkill != null)
                        foreach (int variable in oracle.SkillTree[skillKey].RequiredSkill)
                            if (!oracle.SkillTree[variable].Owned)
                                available = false;
                    if (oracle.SkillTree[skillKey].ShadowRequirements != null)
                        foreach (int variable in oracle.SkillTree[skillKey].ShadowRequirements)
                            if (!oracle.SkillTree[variable].Owned)
                                available = false;
                }

                if (oracle.SkillTree[skillKey].ExclusvieWith is { Length: >= 1 })
                    foreach (int skill in oracle.SkillTree[skillKey].ExclusvieWith)
                        if (oracle.SkillTree[skill].Owned)
                            available = false;


                if (oracle.SkillTree[skillKey].Owned)
                {
                    foreach (SkillTreeManager skill in oracle.allSkillTreeManagers)
                        if (oracle.SkillTree[skill.skillKey].Owned &&
                            oracle.SkillTree[skill.skillKey].RequiredSkill != null && skill.skillKey != skillKey)
                            foreach (int requiredSkill in oracle.SkillTree[skill.skillKey].RequiredSkill)
                                if (requiredSkill == skillKey)
                                    available = false;

                    if (!oracle.SkillTree[skillKey].Refundable) available = false;
                    stcm.confirmButtonText.text = "Un-Assign";
                }

                stcm.confirm.interactable = available;
            }
                break;
        }
    }

    public void PurchaseSkill()
    {
        if (oracle.SkillTree[skillKey].Owned)
        {
            foreach (SkillTreeManager skill in oracle.allSkillTreeManagers)
                if (oracle.SkillTree[skill.skillKey].Owned &&
                    oracle.SkillTree[skill.skillKey].RequiredSkill != null && skill.skillKey != skillKey)
                    if (oracle.SkillTree[skill.skillKey].RequiredSkill.Any(requiredSkill => requiredSkill == skillKey))
                    {
                        UpdateSkills?.Invoke();
                        return;
                    }

            if (oracle.SkillTree[skillKey].Refundable)
            {
                oracle.SkillTree[skillKey].Owned = false;
                dvst.skillPointsTree += oracle.SkillTree[skillKey].Cost;
                if (oracle.SkillTree[skillKey].isFragment && dvst.fragments >= 1) dvst.fragments -= 1;
                if (oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(skillKey))
                    oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Remove(skillKey);
            }

            UpdateSkills?.Invoke();
            return;
        }


        if (dvst.skillPointsTree < oracle.SkillTree[skillKey].Cost)
        {
            UpdateSkills?.Invoke();
            return;
        }

        dvst.skillPointsTree -= oracle.SkillTree[skillKey].Cost;

        if (oracle.SkillTree[skillKey].isFragment) dvst.fragments += 1;

        if (!oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Contains(skillKey) &&
            !oracle.listOfSkillsNotToAutoBuy.Contains(skillKey))
            oracle.saveSettings.dysonVerseSaveData.skillAutoAssignmentList.Add(skillKey);

        oracle.SkillTree[skillKey].Owned = true;
        UpdateSkills?.Invoke();
    }


    [ContextMenu("MakeLines")]
    public void MakeLines()
    {
        if (linesMade) return;
        if (oracle.SkillTree[skillKey].RequiredSkill != null)
            foreach (int id in oracle.SkillTree[skillKey].RequiredSkill)
                foreach (SkillTreeManager skill in oracle.allSkillTreeManagers)
                {
                    if (skill.skillKey == id)
                    {
                        LineManager line = Instantiate(linePrefab, oracle.lineHolder).GetComponent<LineManager>();
                        /*Array.Resize(ref lines, lines.Length + 1);
                        lines[^1] = line;*/
                        line.startSkillKey = id;
                        line.endSkillKey = skillKey;
                        line.start = gameObject.GetComponent<RectTransform>();
                        line.end = skill.gameObject.GetComponent<RectTransform>();
                    }

                    linesMade = true;
                }
    }
}