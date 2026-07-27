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
        return sp.disasterStage switch
        {
            0 or 1 => sd1.cities >= 1d,
            2 => sd1.bots >= 100d,
            3 => sd1.spaceFactories >= 5d,
            _ => false
        };
    }

    public bool EvaluateSimulationTransitions(
        bool updatePresentation = true)
    {
        bool reset = false;
        switch (sp.disasterStage)
        {
            case 0 or 1:
                if (sd1.cities >= 1)
                {
                    sp.disasterStage = 0;
                    Prestige(1, DreamResetCause.Meteor);
                    reset = true;
                    if (updatePresentation) meteorStormAlert.SetActive(true);
                }

                break;

            case 2:
                if (sd1.bots >= 100)
                {
                    sp.disasterStage = 0;
                    Prestige(10, DreamResetCause.ArtificialIntelligence);
                    reset = true;
                    if (updatePresentation) aiAlert.SetActive(true);
                }

                break;

            case 3:
                if (sd1.spaceFactories >= 5)
                {
                    sp.disasterStage = 0;
                    Prestige(20, DreamResetCause.GlobalWarming);
                    reset = true;
                    if (updatePresentation) globalWarmingAlert.SetActive(true);
                }

                break;
        }
        return reset;
    }

    private void Prestige(
        long strangeMatter,
        DreamResetCause cause)
    {
        sp.simulationCount = NumericSafety.Add(sp.simulationCount, 1L).Value;
        sp.strangeMatter = NumericSafety.Add(sp.strangeMatter, strangeMatter).Value;
        oracle.saveSettings.simulationStatistics?.RecordDreamReset(
            cause,
            strangeMatter);
        DeterministicSimulation.CompleteReset(
            oracle.WipeDream1Save,
            () => ResetSimulationRuntime?.Invoke(),
            () => ApplyResearch?.Invoke());
    }
}
