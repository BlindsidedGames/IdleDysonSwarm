using System;
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

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

    private void Start()
    {
        blackHole.onClick.AddListener(BlackHole);
    }

    private void BlackHole()
    {
        sp.disasterStage = 0;
        blackHoleAlertEarningsText.text = $"Earned: {(int)sd1.swarmPanels} Strange Matter";
        Prestige((int)sd1.swarmPanels);
        blackHoleAlert.SetActive(true);
    }

    private void Update()
    {
        blackHoleGo.SetActive(sp.counterGw);
        switch (sp.disasterStage)
        {
            case 1:
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

    private void Prestige(int strangeMatter)
    {
        sp.simulationCount++;
        sp.strangeMatter += strangeMatter;
        StartCoroutine(WipeForPrestige());
    }

    private IEnumerator WipeForPrestige()
    {
        oracle.WipeDream1Save();
        yield return 0;
        oracle.WipeDream1Save();
        ApplyResearch?.Invoke();
    }
}