using Blindsided.ProceduralUIImage;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using IdleDysonSwarm.Services;
using IdleDysonSwarm.Systems.Balance;
using Systems.Numeric;
using static Expansion.Oracle;

public class WorkerController : MonoBehaviour
{
    [SerializeField] private Button gatherInfluenceButton;
    [SerializeField] private TMP_Text influenceDisplay;
    [SerializeField] private TMP_Text consumingText;
    [SerializeField] private Image realityInactive;
    [SerializeField] private Color color_White = Color.white;
    [SerializeField] private Color color_Ready;

    private IWorkerService _workerService;

    private void Awake()
    {
        _workerService = ServiceLocator.Get<IWorkerService>();
    }

    private void Start()
    {
        UpdateWorkersReadyToGo();
        gatherInfluenceButton.onClick.AddListener(SendWorkers);
    }


    private void Update()
    {
        workerGenerationSpeed = _workerService.WorkerGenerationSpeed;
        realityInactive.color = _workerService.CanGather && !_workerService.AutoGatherEnabled ? color_Ready : color_White;
        RunWorkers();
        gatherInfluenceButton.interactable = _workerService.CanGather;
        influenceDisplay.text = $"Influence: {_workerService.InfluenceBalance:N0}";
    }

    #region Reality

    private double workerGenerationSpeed;
    [SerializeField] private ProceduralUIImage workerGenerationBar;
    [SerializeField] private ProceduralUIImage workersReadyToGofill;
    [SerializeField] private TMP_Text universeDesignation;
    [SerializeField] private TMP_Text preWorkerCounter;

    private void RunWorkers()
    {
        consumingText.text = "Consuming";
        if (_workerService.CanGather)
        {
            if (!_workerService.AutoGatherEnabled)
            {
                consumingText.text = "Consumption Halted";
                return;
            }
            SendWorkers();
        }

        workerGenerationBar.fillAmount = workerGenerationSpeed >= 10
            ? 1f
            : NumericUiAdapter.ToUnitInterval(
                oracle.saveSettings.saveData.workerGenerationProgress,
                "worker_generation");

        UpdateWorkersReadyToGo();
    }

    private void UpdateWorkersReadyToGo()
    {
        _workerService.ClampWorkersNonNegative();
        workersReadyToGofill.fillAmount = NumericUiAdapter.ToUnitInterval(
            _workerService.WorkerFillPercent,
            "worker_batch_progress");
        preWorkerCounter.text = $"{_workerService.WorkersReady}/{BalanceRuntime.WorkerBatchSize}";
        universeDesignation.text =
            $"Universe Designation: {_workerService.WorkerBatchesProcessed + 1:N0}";
    }

    private void SendWorkers()
    {
        _workerService.TryGatherInfluence();
        UpdateWorkersReadyToGo();
    }

    #endregion
}
