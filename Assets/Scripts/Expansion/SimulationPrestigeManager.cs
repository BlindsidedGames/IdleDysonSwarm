using System;
using TMPro;
using UnityEngine;
using Systems.Numeric;
using Systems.Simulation;
using UnityEngine.UI;
using static Expansion.Oracle;

public class SimulationPrestigeManager : MonoBehaviour
{
    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    [SerializeField] private Button blackHole;
    [SerializeField] private GameObject blackHoleGo;
    [SerializeField] private GameObject meteorStormAlert;
    [SerializeField] private GameObject aiAlert;
    [SerializeField] private GameObject globalWarmingAlert;
    [SerializeField] private GameObject blackHoleAlert;
    [SerializeField] private TMP_Text blackHoleAlertEarningsText;


    public static event Action ApplyResearch;
    public static event Action ResetSimulationRuntime;

    public static void InvokeApplyResearch() => ApplyResearch?.Invoke();
    public static void InvokeResetSimulationRuntime() => ResetSimulationRuntime?.Invoke();

    private void Start()
    {
        blackHole.onClick.AddListener(BlackHole);
    }

    private void BlackHole()
    {
        if (GameManager.RequestQueuedPlayerAction(
                SimulationInputKind.BlackHoleAction,
                ApplyBlackHole,
                "dream_black_hole"))
        {
            return;
        }

        ApplyBlackHole();
    }

    private void ApplyBlackHole()
    {
        sp.disasterStage = 0;
        blackHoleAlertEarningsText.text = $"Earned: {sd1.swarmPanels} Strange Matter";
        Prestige(
            sd1.swarmPanels,
            DreamResetCause.BlackHole);
        blackHoleAlert.SetActive(true);
    }

    private void Update()
    {
        blackHoleGo.SetActive(sp.counterGw);
    }

    public bool IsAutomaticResetReady()
    {
        return DreamResetTransitions.IsAutomaticReady(
            oracle.saveSettings);
    }

    public bool EvaluateSimulationTransitions(
        bool updatePresentation = true)
    {
        if (!DreamResetTransitions.TryApplyAutomatic(
                oracle.saveSettings,
                out DreamResetOutcome outcome))
        {
            return false;
        }

        ResetSimulationRuntime?.Invoke();
        ApplyResearch?.Invoke();
        if (updatePresentation)
        {
            switch (outcome.Cause)
            {
                case DreamResetCause.Meteor:
                    meteorStormAlert?.SetActive(true);
                    break;
                case DreamResetCause.ArtificialIntelligence:
                    aiAlert?.SetActive(true);
                    break;
                case DreamResetCause.GlobalWarming:
                    globalWarmingAlert?.SetActive(true);
                    break;
            }
        }
        return true;
    }

    private void Prestige(
        long strangeMatter,
        DreamResetCause cause)
    {
        if (!DreamResetTransitions.TryApplyExplicit(
                oracle.saveSettings,
                cause,
                strangeMatter,
                out _))
        {
            return;
        }
        ResetSimulationRuntime?.Invoke();
        ApplyResearch?.Invoke();
    }
}
