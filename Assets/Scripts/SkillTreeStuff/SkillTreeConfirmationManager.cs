using System.Collections;
using GameData;
using Blindsided.ProceduralUIImage;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

/*
Purpose:
- Controls the skill confirmation popup: title/description/cost text, assign/unassign button states, auto-assign
  visibility policy, and not-refundable warning messaging.

Where it runs:
- Runtime on the skill tree confirmation panel object.

Primary entry points:
- Unity lifecycle: Start.
- Popup flow: SetPosition, SetTexts, CloseConfirm.

Interacts with:
- Calls into: SkillTreeManager (selection context, purchase call, not-refundable reason labels), Oracle save APIs
  (skill ownership state), GameDataRegistry/SkillDatabase (fallback skill lookup).
- Called by: SkillTreeManager.ShowConfirmation and Unity UI button events.

Change notes:
- Serialized fields map to prefab references in Panel.prefab; renames/type changes require prefab rewiring.
- Not-refundable warning copy now comes from SkillTreeManager.TryGetNotRefundableReasonLabel; changing that method
  changes popup text and warning visibility behavior.
- Color arrays (normalColours, fragmentColours, nonRefundableColours) are popup-local presentation data and are
  independent of the skill-node button colors sourced from UITheme.
- Manual per-skill add/remove auto-assign controls are intentionally disabled; queue changes now flow through
  assign/unassign actions only.
*/
/// <summary>
/// UI controller for skill assign/unassign confirmation popups.
/// </summary>
public class SkillTreeConfirmationManager : MonoBehaviour
{
    [SerializeField] public Button confirm;
    [SerializeField] private Button cancel;
    public SkillTreeManager skillTreeManager;
    [SerializeField] private GameObject confirmationGo;
    [SerializeField] private Button autoAssignRemovalButton;
    [SerializeField] private Button autoAssignAddButton;
    [SerializeField] private GameObject notRefundableMessage;
    [SerializeField] private TMP_Text notRefundableMessageText;
    public TMP_Text confirmButtonText;

    [SerializeField] private TMP_Text nameText;
    [SerializeField] private TMP_Text descText;
    [SerializeField] private TMP_Text technicalDescText;
    [SerializeField] private TMP_Text costText;

    [SerializeField] private Image[] highlights;
    [SerializeField] private ProceduralUIImage background;

    [SerializeField] private Color[] normalColours;
    [SerializeField] private Color[] fragmentColours;
    [SerializeField] private Color[] nonRefundableColours;

    /// <summary>
    /// Wires popup button actions.
    /// </summary>
    private void Start()
    {
        confirm.onClick.AddListener(() => skillTreeManager.PurchaseSkill());
        cancel.onClick.AddListener(CloseConfirm);
    }

    /// <summary>
    /// Hides the confirmation popup.
    /// </summary>
    public void CloseConfirm()
    {
        confirmationGo.SetActive(false);
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

    /// <summary>
    /// Updates popup text and visual state for the selected skill.
    /// </summary>
    /// <param name="name">Display name.</param>
    /// <param name="description">Primary description text.</param>
    /// <param name="technicalDescription">Technical description text.</param>
    /// <param name="cost">Base cost text.</param>
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

        string notRefundableLabel = string.Empty;
        bool isNotRefundable = false;
        if (skillTreeManager != null)
        {
            isNotRefundable = skillTreeManager.TryGetNotRefundableReasonLabel(out notRefundableLabel);
        }
        bool isFragment = definition != null && definition.isFragment;
        bool isDirectIntrinsicNonRefundable = definition != null && !definition.refundable;
        bool owned = skillTreeManager.IsOwned;

        notRefundableMessage.SetActive(isNotRefundable);
        TMP_Text notRefundableText = ResolveNotRefundableMessageText();
        if (notRefundableText != null)
        {
            notRefundableText.text = isNotRefundable ? notRefundableLabel : "Not Refundable";
        }

        if (autoAssignRemovalButton != null) autoAssignRemovalButton.gameObject.SetActive(false);
        if (autoAssignAddButton != null) autoAssignAddButton.gameObject.SetActive(false);
        nameText.text = name;
        descText.text = description;
        technicalDescText.text = technicalDescription;
        if (isFragment && !isNotRefundable)
        {
            string fragmentPlusOrMinus = owned ? "-1" : "+1";
            cost +=
                $"<br>Fragments owned: {oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.fragments}<color=#91DD8F><size=70%>{fragmentPlusOrMinus}";
            foreach (Image image in highlights) image.color = fragmentColours[0];
            background.color = fragmentColours[1];
        }

        if (definition != null && definition.exclusiveWithIds != null)
        {
            if (definition.exclusiveWithIds.Length >= 1 && isDirectIntrinsicNonRefundable)
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

        if (isFragment && !isNotRefundable)
        {
            foreach (Image image in highlights) image.color = fragmentColours[0];
            background.color = fragmentColours[1];
            background.OutlineColor = fragmentColours[0];
        }
        else if (isNotRefundable)
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

    private TMP_Text ResolveNotRefundableMessageText()
    {
        if (notRefundableMessageText != null) return notRefundableMessageText;
        if (notRefundableMessage == null) return null;
        notRefundableMessageText = notRefundableMessage.GetComponent<TMP_Text>();
        return notRefundableMessageText;
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
