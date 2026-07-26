using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Serialization;
using Blindsided.Utilities;
using IdleDysonSwarm.Systems.Balance;
using Systems.Numeric;
using static Expansion.Oracle;

public class AvocadoFeeder : MonoBehaviour
{
    private AvocadoData avocadoData => oracle.saveSettings.avocadoData;
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
            avocadoData.infinityPoints =
                NumericSafety.Add(avocadoData.infinityPoints, availableInfinityPoints).Value;
            prestigeData.infinityPoints =
                EconomyTransaction.TryDebit(prestigeData.infinityPoints, availableInfinityPoints).Balance;
            UpdateText();
        }
    }

    private void FeedInfluence()
    {
        if (saveData.influence > 0)
        {
            avocadoData.influence = NumericSafety.Add(avocadoData.influence, saveData.influence).Value;
            saveData.influence = 0;
            UpdateText();
        }
    }

    private void FeedStrangeMatter()
    {
        if (saveDataPrestige.strangeMatter > 0)
        {
            avocadoData.strangeMatter =
                NumericSafety.Add(avocadoData.strangeMatter, saveDataPrestige.strangeMatter).Value;
            saveDataPrestige.strangeMatter = 0;
            UpdateText();
        }
    }

    public void UpdateText()
    {
        gameObject.SetActive(avocadoData.unlocked);
        int threshold = BalanceRuntime.AvocadoLogThreshold;
        double infinityPointsMultiplier = avocadoData.infinityPoints >= threshold ? Math.Log10(avocadoData.infinityPoints) : 0;
        double influenceMultiplier = avocadoData.influence >= threshold ? Math.Log10(avocadoData.influence) : 0;
        double strangeMatterMultiplier = avocadoData.strangeMatter >= threshold ? Math.Log10(avocadoData.strangeMatter) : 0;
        double overflowMultiplier = 1 + avocadoData.overflowMultiplier;

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
