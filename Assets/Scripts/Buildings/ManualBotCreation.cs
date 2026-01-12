using System;
using MPUIKIT;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using Systems.Stats;
using static Expansion.Oracle;

public class ManualBotCreation : MonoBehaviour
{
    [SerializeField] private TMP_Text counter;
    [SerializeField] private TMP_Text description;
    [SerializeField] private GameObject clickHere;
    [SerializeField] private Button _button;

    [SerializeField] private MPImage fill;
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private bool running;
    private float time;

    private void Start()
    {
        fill.fillAmount = 0;
        counter.text = $"{GetTinkerCooldownSeconds():F1}s";
        clickHere.SetActive(true);
    }

    private void Update()
    {
        double botYield = 1;
        double assemblyProduction = 0;
        double cooldownSeconds = GetTinkerCooldownSeconds();
        if (TryGetTinkerStats(out GlobalStatPipeline.TinkerResult tinker))
        {
            botYield = tinker.BotYield.Value;
            assemblyProduction = tinker.AssemblyYield.Value;
            cooldownSeconds = Math.Max(0.01, tinker.Cooldown.Value);
        }

        description.text = skillTreeData.manualLabour
            ? $"Having nothing better to do you decide to set up some more assembly lines. Masterfully made you will produce <color=#00E1FF>{CalcUtils.FormatNumber(assemblyProduction)}"
            : "Manually put together a new bot from parts in your shed. <br>There has to be a better way of going about this...";
        if (running)
        {
            if (time < cooldownSeconds)
            {
                time += Time.deltaTime;
                fill.fillAmount = time / (float)cooldownSeconds;
                counter.text = $"{(cooldownSeconds - time):F1}s";
            }
            else
            {
                fill.fillAmount = 0;
                clickHere.SetActive(true);
                _button.interactable = true;
                infinityData.bots += botYield;


                if (skillTreeData.manualLabour)
                    infinityData.assemblyLines[0] += assemblyProduction;
                if (dvsd.manualCreationTime >= 1 && !skillTreeData.manualLabour)
                    dvsd.manualCreationTime -= 1;
                else
                {
                    dvsd.manualCreationTime = 0.2f;
                }

                running = false;
                counter.text = $"{cooldownSeconds:F1}s";
            }
        }
    }

    public void StartButton()
    {
        if (!running)
        {
            time = .1f;
            clickHere.SetActive(false);
            _button.interactable = false;
            running = true;
        }
    }

    private double GetTinkerCooldownSeconds()
    {
        double cooldown = dvsd.manualCreationTime;
        if (TryGetTinkerStats(out GlobalStatPipeline.TinkerResult tinker))
        {
            cooldown = tinker.Cooldown.Value;
        }

        return Math.Max(0.01, cooldown);
    }

    private bool TryGetTinkerStats(out GlobalStatPipeline.TinkerResult result)
    {
        return GlobalStatPipeline.TryCalculateTinkerStats(infinityData, skillTreeData, prestigeData, prestigePlus, dvsd.manualCreationTime, out result);
    }
}

