using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
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
    private bool first;
    private bool second;
    private bool third;
    private bool fourth;
    private bool fifth;
    private bool sixth;
    private bool seventh;
    [SerializeField] private GameObject avoMeditate;
    private const string SecretStep1 = "AVO_MEDITATION_STEP_1";
    private const string SecretStep2 = "AVO_MEDITATION_STEP_2";
    private const string SecretStep3 = "AVO_MEDITATION_STEP_3";
    private const string SecretStep4 = "AVO_MEDITATION_STEP_4";
    private const string SecretStep5 = "AVO_MEDITATION_STEP_5";
    private const string SecretStep6 = "AVO_MEDITATION_STEP_6";
    private const string SecretStep7 = "AVO_MEDITATION_STEP_7";

    private void Start()
    {
        firstButton.onClick.AddListener(() =>
        {
            first = true;
            RegisterSecretStep(SecretStep1);
            secondButton.interactable = true;
            CheckIfAllAreTrue();
        });
        secondButton.onClick.AddListener(() =>
        {
            second = true;
            RegisterSecretStep(SecretStep2);
            thirdButton.interactable = true;
            CheckIfAllAreTrue();
        });
        thirdButton.onClick.AddListener(() =>
        {
            third = true;
            RegisterSecretStep(SecretStep3);
            fourthButton.interactable = true;
            CheckIfAllAreTrue();
        });
        fourthButton.onClick.AddListener(() =>
        {
            fourth = true;
            RegisterSecretStep(SecretStep4);
            fifthButton.interactable = true;
            CheckIfAllAreTrue();
        });
        fifthButton.onClick.AddListener(() =>
        {
            fifth = true;
            RegisterSecretStep(SecretStep5);
            sixthButton.interactable = true;
            CheckIfAllAreTrue();
        });
        sixthButton.onClick.AddListener(() =>
        {
            sixth = true;
            RegisterSecretStep(SecretStep6);
            seventhButton.interactable = true;
            if (seventhButtonAlt != null)
            {
                seventhButtonAlt.interactable = true;
            }
            CheckIfAllAreTrue();
        });
        seventhButton.onClick.AddListener(() =>
        {
            seventh = true;
            RegisterSecretStep(SecretStep7);
            CheckIfAllAreTrue();
        });
        if (seventhButtonAlt != null)
        {
            seventhButtonAlt.onClick.AddListener(() =>
            {
                seventh = true;
                RegisterSecretStep(SecretStep7);
                CheckIfAllAreTrue();
            });
        }
    }

    private void CheckIfAllAreTrue()
    {
        if (first && second && third && fourth && fifth && sixth && seventh)
        {
            avoMeditate.SetActive(true);
            if (!oracle.saveSettings.avotation)
            {
                oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.skillPointsTree += 4;
                oracle.saveSettings.avotation = true;
            }
        }
    }

    private void RegisterSecretStep(string secretId)
    {
        if (ServiceLocator.TryGet<ISteamIntegrationService>(out var service))
        {
            service.RegisterSecretFound(secretId);
        }
    }
}
