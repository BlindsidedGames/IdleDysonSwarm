using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using IdleDysonSwarm.Services;
using static Expansion.Oracle;

public class AvocadoMeditation : MonoBehaviour
{
    [SerializeField] private Button firstButton;
    [SerializeField] private Button secondButton;
    [SerializeField] private Button thirdButton;
    [SerializeField] private Button fourthButton;
    [SerializeField] private Button fifthButton;
    [SerializeField] private Button sixthButton;
    [SerializeField] private Button seventhButton;
    [SerializeField] private Button seventhButtonAlt;

    [SerializeField] private GameObject avoMeditate;

    [Header("Progress UI")]
    [SerializeField] private List<GameObject> progressImages = new List<GameObject>();
    [SerializeField] private GameObject completionImage;
    [SerializeField] private TMP_Text hintText;
    [SerializeField] private Button helpSkipButton;
    [SerializeField] private TMP_Text helpSkipButtonText;

    [Header("Help Settings")]
    [SerializeField] private float helpCountdownSeconds = 120f;

    private const string SecretStep1 = "AVO_MEDITATION_STEP_1";
    private const string SecretStep2 = "AVO_MEDITATION_STEP_2";
    private const string SecretStep3 = "AVO_MEDITATION_STEP_3";
    private const string SecretStep4 = "AVO_MEDITATION_STEP_4";
    private const string SecretStep5 = "AVO_MEDITATION_STEP_5";
    private const string SecretStep6 = "AVO_MEDITATION_STEP_6";
    private const string SecretStep7 = "AVO_MEDITATION_STEP_7";
    private const int TotalSteps = 7;
    private const string FinalMessage = "Skill points granted: 4. Well done!";

    private readonly string[] _stepHints =
    {
        "Quantum; SU?",
        "Infinity has a point... top-right.",
        "Workers produced more than output.",
        "Some paths are preset. Start with 1.",
        "Settings hides a door to more.",
        "Research has settings too...",
        "The last clue sits in plain sight to the side."
    };

    private float _countdownRemaining;
    private bool _helpActivatedForStep;
    private bool _countdownRunning;

    private int ProgressStep
    {
        get => Mathf.Clamp(oracle.saveSettings.avotationProgressStep, 0, TotalSteps);
        set => oracle.saveSettings.avotationProgressStep = Mathf.Clamp(value, 0, TotalSteps);
    }

    private void Start()
    {
        if (oracle.saveSettings.avotation && ProgressStep < TotalSteps)
        {
            ProgressStep = TotalSteps;
        }

        firstButton.onClick.AddListener(() => TryCompleteStep(0, SecretStep1));
        secondButton.onClick.AddListener(() => TryCompleteStep(1, SecretStep2));
        thirdButton.onClick.AddListener(() => TryCompleteStep(2, SecretStep3));
        fourthButton.onClick.AddListener(() => TryCompleteStep(3, SecretStep4));
        fifthButton.onClick.AddListener(() => TryCompleteStep(4, SecretStep5));
        sixthButton.onClick.AddListener(() => TryCompleteStep(5, SecretStep6));
        seventhButton.onClick.AddListener(() => TryCompleteStep(6, SecretStep7));

        if (seventhButtonAlt != null)
        {
            seventhButtonAlt.onClick.AddListener(() => TryCompleteStep(6, SecretStep7));
        }

        if (helpSkipButton != null)
        {
            helpSkipButton.onClick.AddListener(OnHelpSkipClicked);
        }

        if (oracle.saveSettings.avotation || ProgressStep >= TotalSteps)
        {
            CompleteSequenceIfNeeded();
        }

        ResetHelpState();
        RefreshUi();
    }

    private void Update()
    {
        if (!_countdownRunning || oracle.saveSettings.avotation)
        {
            return;
        }

        _countdownRemaining -= Time.unscaledDeltaTime;
        if (_countdownRemaining <= 0f)
        {
            _countdownRemaining = 0f;
            _countdownRunning = false;
        }

        RefreshHelpButtonUi();
    }

    private void TryCompleteStep(int requiredStepIndex, string secretId)
    {
        if (oracle.saveSettings.avotation) return;
        if (ProgressStep != requiredStepIndex) return;

        ProgressStep = requiredStepIndex + 1;
        RegisterSecretStep(secretId);
        ResetHelpState();

        if (ProgressStep >= TotalSteps)
        {
            CompleteSequenceIfNeeded();
            return;
        }

        RefreshUi();
    }

    private void CompleteSequenceIfNeeded()
    {
        avoMeditate.SetActive(true);

        if (!oracle.saveSettings.avotation)
        {
            oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.skillPointsTree += 4;
            oracle.saveSettings.avotation = true;
        }

        ProgressStep = TotalSteps;
        ResetHelpState();
        RefreshUi();
    }

    private void OnHelpSkipClicked()
    {
        if (oracle.saveSettings.avotation || ProgressStep >= TotalSteps) return;

        if (!_helpActivatedForStep)
        {
            _helpActivatedForStep = true;
            _countdownRunning = true;
            _countdownRemaining = Mathf.Max(1f, helpCountdownSeconds);
            RefreshUi();
            return;
        }

        if (_countdownRunning) return;

        // Skip reveals exactly one secret step.
        TryCompleteStep(ProgressStep, string.Empty);
    }

    private void RefreshUi()
    {
        RefreshSecretButtonInteractableState();
        RefreshProgressImages();
        RefreshHintUi();
        RefreshHelpButtonUi();
    }

    private void RefreshSecretButtonInteractableState()
    {
        bool completed = oracle.saveSettings.avotation || ProgressStep >= TotalSteps;
        int step = ProgressStep;

        firstButton.interactable = !completed && step == 0;
        secondButton.interactable = !completed && step == 1;
        thirdButton.interactable = !completed && step == 2;
        fourthButton.interactable = !completed && step == 3;
        fifthButton.interactable = !completed && step == 4;
        sixthButton.interactable = !completed && step == 5;
        seventhButton.interactable = !completed && step == 6;
        if (seventhButtonAlt != null)
        {
            seventhButtonAlt.interactable = !completed && step == 6;
        }
    }

    private void RefreshProgressImages()
    {
        bool completed = oracle.saveSettings.avotation || ProgressStep >= TotalSteps;
        int shown = Mathf.Clamp(ProgressStep, 0, TotalSteps);

        for (int i = 0; i < progressImages.Count; i++)
        {
            if (progressImages[i] == null) continue;
            progressImages[i].SetActive(!completed && i < shown);
        }

        if (completionImage != null)
        {
            completionImage.SetActive(completed);
        }
    }

    private void RefreshHintUi()
    {
        bool completed = oracle.saveSettings.avotation || ProgressStep >= TotalSteps;

        if (hintText == null) return;

        if (completed)
        {
            hintText.gameObject.SetActive(true);
            hintText.text = FinalMessage;
            return;
        }

        hintText.gameObject.SetActive(_helpActivatedForStep);
        if (_helpActivatedForStep)
        {
            int index = Mathf.Clamp(ProgressStep, 0, _stepHints.Length - 1);
            hintText.text = _stepHints[index];
        }
    }

    private void RefreshHelpButtonUi()
    {
        if (helpSkipButton == null) return;

        bool completed = oracle.saveSettings.avotation || ProgressStep >= TotalSteps;
        helpSkipButton.gameObject.SetActive(!completed);
        if (completed) return;

        if (!_helpActivatedForStep)
        {
            helpSkipButton.interactable = true;
            if (helpSkipButtonText != null) helpSkipButtonText.text = "Help";
            return;
        }

        if (_countdownRunning)
        {
            helpSkipButton.interactable = false;
            int seconds = Mathf.CeilToInt(_countdownRemaining);
            if (helpSkipButtonText != null) helpSkipButtonText.text = $"{seconds}s";
            return;
        }

        helpSkipButton.interactable = true;
        if (helpSkipButtonText != null) helpSkipButtonText.text = "Skip";
    }

    private void ResetHelpState()
    {
        _helpActivatedForStep = false;
        _countdownRunning = false;
        _countdownRemaining = 0f;
    }

    private void RegisterSecretStep(string secretId)
    {
        if (ServiceLocator.TryGet<ISteamIntegrationService>(out var service))
        {
            service.RegisterSecretFound(secretId);
        }
    }
}
