using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Serialization;
using Blindsided.Utilities;
using static Expansion.Oracle;

public class AvocadoFeeder : MonoBehaviour
{
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private SaveDataPrestige saveDataPrestige => oracle.saveSettings.sdPrestige;
    private SaveData saveData => oracle.saveSettings.saveData;

    [SerializeField, FormerlySerializedAs("feedIP")] private Button feedInfinityPointsButton;
    [SerializeField, FormerlySerializedAs("feedInfluence")] private Button feedInfluenceButton;
    [SerializeField, FormerlySerializedAs("feedStrangeMatter")] private Button feedStrangeMatterButton;
    [SerializeField, FormerlySerializedAs("feedIpText")] private TMP_Text feedInfinityPointsText;
    [SerializeField, FormerlySerializedAs("feedInfulenceText")] private TMP_Text feedInfluenceText;
    [SerializeField] private TMP_Text feedStrangeMatterText;
    [SerializeField] private TMP_Text overflowText;
    [SerializeField] private TMP_Text totalBoostText;

    private void Start()
    {
        feedInfinityPointsButton.onClick.AddListener(FeedInfinityPoints);
        feedInfluenceButton.onClick.AddListener(FeedInfluence);
        feedStrangeMatterButton.onClick.AddListener(FeedStrangeMatter);
        UpdateText();
    }

    private void FeedInfinityPoints()
    {
        if (prestigeData.infinityPoints - prestigeData.spentInfinityPoints > 0)
        {
            long availableInfinityPoints = prestigeData.infinityPoints - prestigeData.spentInfinityPoints;
            prestigePlus.avocatoIP += availableInfinityPoints;
            prestigeData.infinityPoints -= availableInfinityPoints;
            UpdateText();
        }
    }

    private void FeedInfluence()
    {
        if (saveData.influence > 0)
        {
            prestigePlus.avocatoInfluence += saveData.influence;
            saveData.influence = 0;
            UpdateText();
        }
    }

    private void FeedStrangeMatter()
    {
        if (saveDataPrestige.strangeMatter > 0)
        {
            prestigePlus.avocatoStrangeMatter += saveDataPrestige.strangeMatter;
            saveDataPrestige.strangeMatter = 0;
            UpdateText();
        }
    }

    public void UpdateText()
    {
        gameObject.SetActive(prestigePlus.avocatoPurchased);
        double infinityPointsMultiplier = prestigePlus.avocatoIP >= 10 ? Math.Log10(prestigePlus.avocatoIP) : 0;
        double influenceMultiplier = prestigePlus.avocatoInfluence >= 10 ? Math.Log10(prestigePlus.avocatoInfluence) : 0;
        double strangeMatterMultiplier = prestigePlus.avocatoStrangeMatter >= 10 ? Math.Log10(prestigePlus.avocatoStrangeMatter) : 0;
        double overflowMultiplier = 1 + prestigePlus.avocatoOverflow;

        feedInfinityPointsText.text =
            $"Infinity Multiplier - <color=#00E1FF>x{CalcUtils.FormatNumber(infinityPointsMultiplier)}";
        feedInfluenceText.text =
            $"Influence Multiplier - <color=#00E1FF>x{CalcUtils.FormatNumber(influenceMultiplier)}";
        feedStrangeMatterText.text =
            $"Strange Matter Multiplier - <color=#00E1FF>x{CalcUtils.FormatNumber(strangeMatterMultiplier)}";
        overflowText.text = $"Overflow - <color=#00E1FF>x{CalcUtils.FormatNumber(overflowMultiplier)}";

        totalBoostText.text =
            $"Total boost to Cash, Science, and Buildings - <color=#00E1FF>x{CalcUtils.FormatNumber(infinityPointsMultiplier * influenceMultiplier * strangeMatterMultiplier * overflowMultiplier)}";
    }
}
