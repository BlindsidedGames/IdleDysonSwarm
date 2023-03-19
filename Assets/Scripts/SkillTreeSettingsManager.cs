using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class SkillTreeSettingsManager : MonoBehaviour
{
    [SerializeField] private GameManager _gameManager;
    [SerializeField] private SkillTreeManager _skillTreeManager;
    [SerializeField] private TMP_Text feedbackMessage;
    [SerializeField] private Button preset1Save;
    [SerializeField] private Button preset1Load;
    [SerializeField] private Button preset2Save;
    [SerializeField] private Button preset2Load;
    [SerializeField] private Button preset3Save;
    [SerializeField] private Button preset3Load;
    [SerializeField] private Button preset4Save;
    [SerializeField] private Button preset4Load;
    [SerializeField] private Button preset5Save;
    [SerializeField] private Button preset5Load;
    [SerializeField] private Button resetSkills;

    private void Start()
    {
        preset1Save.onClick.AddListener(() => SetFeedbackText("Preset 1 Saved"));
        preset1Save.onClick.AddListener(() => SavePreset(1));
        preset1Load.onClick.AddListener(() => SetFeedbackText("Preset 1 Loaded"));
        preset1Load.onClick.AddListener(() => LoadPreset(1));

        preset2Save.onClick.AddListener(() => SetFeedbackText("Preset 2 Saved"));
        preset2Save.onClick.AddListener(() => SavePreset(2));
        preset2Load.onClick.AddListener(() => SetFeedbackText("Preset 2 Loaded"));
        preset2Load.onClick.AddListener(() => LoadPreset(2));

        preset3Save.onClick.AddListener(() => SetFeedbackText("Preset 3 Saved"));
        preset3Save.onClick.AddListener(() => SavePreset(3));
        preset3Load.onClick.AddListener(() => SetFeedbackText("Preset 3 Loaded"));
        preset3Load.onClick.AddListener(() => LoadPreset(3));

        preset4Save.onClick.AddListener(() => SetFeedbackText("Preset 4 Saved"));
        preset4Save.onClick.AddListener(() => SavePreset(4));
        preset4Load.onClick.AddListener(() => SetFeedbackText("Preset 4 Loaded"));
        preset4Load.onClick.AddListener(() => LoadPreset(4));

        preset5Save.onClick.AddListener(() => SetFeedbackText("Preset 5 Saved"));
        preset5Save.onClick.AddListener(() => SavePreset(5));
        preset5Load.onClick.AddListener(() => SetFeedbackText("Preset 5 Loaded"));
        preset5Load.onClick.AddListener(() => LoadPreset(5));

        resetSkills.onClick.AddListener(() => SetFeedbackText("Skill Tree Reset"));
    }

    private void SavePreset(int presetSlot)
    {
        oracle.SaveList(presetSlot);
        oracle.InvokeUpdateSkills();
    }

    private void LoadPreset(int presetSlot)
    {
        _skillTreeManager.ResetSkills();
        oracle.LoadList(presetSlot);
        oracle.InvokeUpdateSkills();
        _gameManager.AutoAssignSkillsInvoke();
    }

    private void SetFeedbackText(string text)
    {
        feedbackMessage.text = text;
        feedbackMessage.gameObject.SetActive(true);
    }
}