using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using IdleDysonSwarm.UI;
using Systems.Simulation;
using static Expansion.Oracle;

public class DoubleTimeManager : MonoBehaviour
{
    [SerializeField] private TMP_Text doubleTimeText;
    [SerializeField] private TMP_Text doubletimeMultiText;
    [SerializeField] private GameObject[] doubletimeBox;
    [SerializeField] private Slider doubleTimeSlider;

    private bool _initialized;
    private void Update()
    {
        if (!_initialized)
        {
            int savedRate = oracle.saveSettings.sdPrestige.doubleTimeRate;
            doubleTimeSlider.value = savedRate;
            doubletimeMultiText.text = $"{savedRate}x Boost";
            _initialized = true;
        }

        foreach (GameObject VARIABLE in doubletimeBox) VARIABLE.SetActive(oracle.saveSettings.sdPrestige.doubleTimeOwned);
        doubleTimeText.text = oracle.saveSettings.sdPrestige.doDoubleTime
            ? $"Boost Remaining: {CalcUtils.FormatTime(oracle.saveSettings.sdPrestige.doubleTime, shortForm: true, colourOverride: UIThemeProvider.TextColourBlue)}"
            : "No Boost Remaining.";
    }

    public DreamDoubleTimeTick PrepareSimulationTick(double deltaTime)
    {
        SaveDataPrestige prestige = oracle.saveSettings.sdPrestige;
        DreamDoubleTimeTick tick = DreamDoubleTimeMath.Prepare(
            prestige.doubleTimeOwned,
            prestige.doubleTime,
            prestige.doubleTimeRate,
            deltaTime);
        prestige.doDoubleTime = tick.Active;
        return tick;
    }

    public void CompleteSimulationTick(DreamDoubleTimeTick tick)
    {
        SaveDataPrestige prestige = oracle.saveSettings.sdPrestige;
        if (double.IsNaN(prestige.doubleTime) ||
            double.IsInfinity(prestige.doubleTime))
            prestige.doubleTime = 0d;
        prestige.doubleTime = Math.Max(0d, prestige.doubleTime - tick.BankConsumed);
        prestige.doDoubleTime =
            prestige.doubleTimeOwned && prestige.doubleTime > 0d;
    }

    public void DoubleTimeSlider(float i)
    {
        int rate = Mathf.Clamp(Mathf.FloorToInt(i), 0, 10);
        doubletimeMultiText.text = $"{rate}x Boost";
        oracle.saveSettings.sdPrestige.doubleTimeRate = rate;
    }
}
