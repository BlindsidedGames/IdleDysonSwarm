using MPUIKIT;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using IdleDysonSwarm.Services;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.RealityConstants;

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
    [SerializeField] private MPImage workerGenerationBar;
    [SerializeField] private MPImage workersReadyToGofill;
    [SerializeField] private TMP_Text universeDesignation;
    [SerializeField] private TMP_Text preWorkerCounter;

    private void ApplyReturnValues(double time)
    {
        _workerService.ApplyOfflineProgress(time);
        UpdateWorkersReadyToGo();
    }


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

        workerGenerationTime += workerGenerationSpeed * Time.deltaTime;

        workerGenerationBar.fillAmount = workerGenerationSpeed >= 10 ? 1 : workerGenerationTime / 1;

        if (!(workerGenerationTime >= 1)) return;
        while (workerGenerationTime > 1)
        {
            _workerService.IncrementWorker();
            workerGenerationTime -= 1;
        }

        UpdateWorkersReadyToGo();
    }

    private void UpdateWorkersReadyToGo()
    {
        _workerService.ClampWorkersNonNegative();
        workersReadyToGofill.fillAmount = _workerService.WorkerFillPercent;
        preWorkerCounter.text = $"{_workerService.WorkersReady}/{WorkerBatchSize}";
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
