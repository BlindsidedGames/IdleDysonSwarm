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
        sp.disasterStage = 0;
        blackHoleAlertEarningsText.text = $"Earned: {sd1.swarmPanels} Strange Matter";
        Prestige(sd1.swarmPanels);
        blackHoleAlert.SetActive(true);
    }

    private void Update()
    {
        blackHoleGo.SetActive(sp.counterGw);
    }

    public void EvaluateSimulationTransitions()
    {
        switch (sp.disasterStage)
        {
            case 0 or 1:
                if (sd1.cities >= 1)
                {
                    sp.disasterStage = 0;
                    Prestige(1);
                    meteorStormAlert.SetActive(true);
                }

                break;

            case 2:
                if (sd1.bots >= 100)
                {
                    sp.disasterStage = 0;
                    Prestige(10);
                    aiAlert.SetActive(true);
                }

                break;

            case 3:
                if (sd1.spaceFactories >= 5)
                {
                    sp.disasterStage = 0;
                    Prestige(20);
                    globalWarmingAlert.SetActive(true);
                }

                break;
        }
    }

    private void Prestige(long strangeMatter)
    {
        sp.simulationCount = NumericSafety.Add(sp.simulationCount, 1L).Value;
        sp.strangeMatter = NumericSafety.Add(sp.strangeMatter, strangeMatter).Value;
        DeterministicSimulation.CompleteReset(
            oracle.WipeDream1Save,
            () => ResetSimulationRuntime?.Invoke(),
            () => ApplyResearch?.Invoke());
    }
}
