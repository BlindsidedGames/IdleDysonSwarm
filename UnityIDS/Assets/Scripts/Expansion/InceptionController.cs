using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class InceptionController : MonoBehaviour
{
    [SerializeField] private Button gatherInfluenceButton;
    [SerializeField] private TMP_Text influenceDisplay;
    [SerializeField] private TMP_Text consumingText;
    [SerializeField] private Image realityInactive;
    [SerializeField] private Color color_White = Color.white;
    [SerializeField] private Color color_Ready;

    private void Start()
    {
        UpdateWorkersReadyToGo();
        gatherInfluenceButton.onClick.AddListener(SendWorkers);
    }


    private void Update()
    {
        workerGenerationSpeed = 4 + oracle.saveSettings.prestigePlus.influence;
        realityInactive.color = oracle.saveSettings.saveData.workersReadyToGo >= 128 && !oracle.saveSettings.saveData.workerAutoConvert ? color_Ready : color_White;
        RunWorkers();
        gatherInfluenceButton.interactable = oracle.saveSettings.saveData.workersReadyToGo >= 128;
        influenceDisplay.text = $"Influence: {oracle.saveSettings.saveData.influence:N0}";
    }

    private void OnEnable()
    {
        AwayFor += ApplyReturnValues;
    }

    private void OnDisable()
    {
        AwayFor -= ApplyReturnValues;
    }


    #region Reality

    private float workerGenerationSpeed;
    private float workerGenerationTime;
    [SerializeField] private SlicedFilledImage workerGenerationBar;
    [SerializeField] private SlicedFilledImage workersReadyToGofill;
    [SerializeField] private SlicedFilledImage workersReadyToGofillSideMenu;
    [SerializeField] private TMP_Text universeDesignation;
    [SerializeField] private TMP_Text preWorkerCounter;

    private void ApplyReturnValues(double time)
    {
        int amountWhileAway = (int)Math.Round(time * workerGenerationSpeed);


        switch (oracle.saveSettings.saveData.workerAutoConvert)
        {
            case true:
                oracle.saveSettings.saveData.influence += amountWhileAway;
                oracle.saveSettings.saveData.universesConsumed += amountWhileAway;
                break;
            case false:
                long total = oracle.saveSettings.saveData.workersReadyToGo + amountWhileAway;
                if (total >= 128)
                {
                    oracle.saveSettings.saveData.workersReadyToGo = 128;
                    oracle.saveSettings.saveData.universesConsumed +=
                        128 - oracle.saveSettings.saveData.workersReadyToGo;
                }
                else
                {
                    oracle.saveSettings.saveData.workersReadyToGo += amountWhileAway;
                    oracle.saveSettings.saveData.universesConsumed += amountWhileAway;
                }

                break;
        }

        UpdateWorkersReadyToGo();
    }


    private void RunWorkers()
    {
        consumingText.text = "Consuming";
        switch (oracle.saveSettings.saveData.workersReadyToGo)
        {
            case >= 128 when
                !oracle.saveSettings.saveData.workerAutoConvert:
                consumingText.text = "Consumption Halted";
                return;
            case >= 128:
                SendWorkers();
                break;
        }

        workerGenerationTime += workerGenerationSpeed * Time.deltaTime;

        workerGenerationBar.fillAmount = workerGenerationSpeed >= 10 ? 1 : workerGenerationTime / 1;

        if (!(workerGenerationTime >= 1)) return;
        while (workerGenerationTime > 1)
        {
            oracle.saveSettings.saveData.workersReadyToGo++;
            oracle.saveSettings.saveData.universesConsumed++;
            workerGenerationTime -= 1;
        }

        UpdateWorkersReadyToGo();
    }

    private void UpdateWorkersReadyToGo()
    {
        if (oracle.saveSettings.saveData.workersReadyToGo < 0) oracle.saveSettings.saveData.workersReadyToGo = 0;
        workersReadyToGofill.fillAmount = (float)oracle.saveSettings.saveData.workersReadyToGo / 128;
        workersReadyToGofillSideMenu.fillAmount = (float)oracle.saveSettings.saveData.workersReadyToGo / 128;
        preWorkerCounter.text = $"{oracle.saveSettings.saveData.workersReadyToGo}/128";
        universeDesignation.text =
            $"Universe Designation: {oracle.saveSettings.saveData.universesConsumed + 1:N0}";
    }

    private void SendWorkers()
    {
        oracle.saveSettings.saveData.influence += 128;
        oracle.saveSettings.saveData.workersReadyToGo = 0;
        UpdateWorkersReadyToGo();
    }

    #endregion
}