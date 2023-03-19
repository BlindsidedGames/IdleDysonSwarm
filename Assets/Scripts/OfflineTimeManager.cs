using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class OfflineTimeManager : MonoBehaviour
{
    [SerializeField] private TMP_Text timeDisplay;
    [SerializeField] private Button allTime;
    [SerializeField] private Button oneHour;
    [SerializeField] private Button tenMinutes;
    [SerializeField] private Slider timeSlider;
    [SerializeField] private TMP_Text sliderText;
    [SerializeField] private GameObject spendAgain;
    [SerializeField] private TMP_Text spendAgainButtonText;
    [SerializeField] private TMP_Text doublerText;
    [SerializeField] private Button doublerButton;
    [SerializeField] private GameObject doublerButtonObj;
    [SerializeField] private bool doubleTap;

    [SerializeField] private GameManager _gameManager;
    private SaveDataSettings ss => oracle.saveSettings;

    private void Start()
    {
        doubleTap = false;
        doublerButton.onClick.AddListener(DoubleOfflineTime);
        if (ss.maxOfflineTime >= 8640000) ss.maxOfflineTime = 86400;
    }

    public void SetDoublerActive()
    {
        doublerText.gameObject.SetActive(ss.offlineTime >= ss.maxOfflineTime);
        doublerButtonObj.SetActive(ss.offlineTime >= ss.maxOfflineTime);
    }

    private void DoubleOfflineTime()
    {
        if (ss.offlineTime < ss.maxOfflineTime) return;
        ss.maxOfflineTime *= 2;
        ss.offlineTime = 0;
        SetTimeDisplay();
        SetSliderMaxToAll();
        doublerText.text = $"New Max: {CalcUtils.FormatTimeLarge(ss.maxOfflineTime)}";
        doublerButtonObj.SetActive(ss.offlineTime >= ss.maxOfflineTime);
    }

    public void SetTimeDisplay()
    {
        var color = "<color=#91DD8F>";
        var colorS = "<color=#00E1FF>";
        timeDisplay.text =
            $"You have {colorS}{CalcUtils.FormatTimeLarge(ss.offlineTime)}</color> stored";
        oneHour.interactable = ss.offlineTime >= 3600;
        tenMinutes.interactable = ss.offlineTime >= 600;
        allTime.interactable = ss.offlineTime > 0;
    }

    public void SpendTime()
    {
        if (doubleTap == false)
        {
            sliderText.text = "Tap again to confirm";
            doubleTap = true;
            return;
        }

        gameObject.SetActive(false);
        _gameManager.RunAwayTime(timeSlider.value > ss.offlineTime ? ss.offlineTime : timeSlider.value);
        ss.offlineTime -= timeSlider.value > ss.offlineTime ? ss.offlineTime : timeSlider.value;
        spendAgain.SetActive(timeSlider.value < ss.offlineTime);
        spendAgainButtonText.text = CalcUtils.FormatTimeLarge(timeSlider.value);
        sliderText.text = CalcUtils.FormatTimeLarge(timeSlider.value);
        doubleTap = false;
    }

    public void SetSliderMaxToAll()
    {
        var time = (float)ss.offlineTime;
        timeSlider.maxValue = time;
        timeSlider.value = time;
    }

    public void SetSliderToSixty()
    {
        timeSlider.value = 60;
    }

    public void SetSliderMax(float time)
    {
        timeSlider.maxValue = time;
        timeSlider.value = time;
        doubleTap = false;
    }

    public void Slide(float amount)
    {
        sliderText.text = CalcUtils.FormatTimeLarge(amount);
        doubleTap = false;
    }
}