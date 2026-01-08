using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class DoubleTimeManager : MonoBehaviour
{
    [SerializeField] private TMP_Text doubleTimeText;
    [SerializeField] private TMP_Text doubletimeMultiText;
    [SerializeField] private GameObject[] doubletimeBox;
    [SerializeField] private Slider doubleTimeSlider;


    private void Start()
    {
        doubleTimeSlider.value = oracle.saveSettings.sdPrestige.doubleTimeRate;
    }

    private void Update()
    {
        foreach (GameObject VARIABLE in doubletimeBox) VARIABLE.SetActive(oracle.saveSettings.sdPrestige.doubleTimeOwned);
        ManageDoubleTime();
        doubleTimeText.text = oracle.saveSettings.sdPrestige.doDoubleTime
            ? $"Boost Remaining: {CalcUtils.FormatTimeLarge(oracle.saveSettings.sdPrestige.doubleTime)}"
            : "No Boost Remaining.";
    }

    private void ManageDoubleTime()
    {
        if (!oracle.saveSettings.sdPrestige.doubleTimeOwned) return;
        switch (oracle.saveSettings.sdPrestige.doubleTime)
        {
            case > 0:
                oracle.saveSettings.sdPrestige.doubleTime -=
                    oracle.saveSettings.sdPrestige.doubleTimeRate * Time.deltaTime;
                oracle.saveSettings.sdPrestige.doDoubleTime = true;
                break;
            case <= 0:
                oracle.saveSettings.sdPrestige.doubleTime = 0;
                oracle.saveSettings.sdPrestige.doDoubleTime = false;
                break;
        }
    }

    public void DoubleTimeSlider(float i)
    {
        doubletimeMultiText.text = $"{i}x Boost";
        oracle.saveSettings.sdPrestige.doubleTimeRate = (int)i;
    }
}