using System;
using Blindsided.ProceduralUIImage;
using Systems;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;
using Systems.Numeric;

public class PrestigeFillBar : MonoBehaviour
{
    [SerializeField] private ProceduralUIImage fill;
    [SerializeField] private TMP_Text fillText;
    [SerializeField] private GameObject realityBreak;

    [SerializeField] private GameObject manualInfinityButtonHolder;

    //[SerializeField] private Button manualInfinityButton;
    // [SerializeField] private TMP_Text manualInfinityButton_Text;
    [SerializeField] private TMP_Text progressToInfinityText;
    [SerializeField] private LayoutElement layoutElement;
    [SerializeField] private Slider ipToBreakForSlider;

    private readonly double actualMin = 1;
    private readonly double actualMax = 1101;

    private double percent;

    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;


    private void Start()
    {
        // Convert them to logarithmic scale for the slider
        float sliderMin = (float)Math.Log10(actualMin + 1); // Adding 1 to avoid Log10(0)
        float sliderMax = (float)Math.Log10(actualMax);

// Set the slider's min and max values
        ipToBreakForSlider.minValue = sliderMin;
        ipToBreakForSlider.maxValue = sliderMax;
        ipToBreakForSlider.value = (float)Math.Log10(oracle.saveSettings.infinityPointsToBreakFor + 1);
        ipToBreakForSlider.onValueChanged.AddListener(SetAmountToBreakFor);
    }

    public void SetAmountToBreakFor(float amount)
    {
        long target = Math.Max(
            1L,
            (long)Math.Pow(10, ipToBreakForSlider.value) - 1L);
        GameManager.RequestBreakTargetChange(target);
    }

    private void Update()
    {
        bool autoPrestige = !prestigePlus.breakTheLoop;
        double amount = prestigePlus.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, prestigePlus.divisionsPurchased) : 4.2e19;
        long ipToGain = StaticMethods.InfinityPointsToGain(amount, infinityData.bots);

        manualInfinityButtonHolder.SetActive(!autoPrestige);

        layoutElement.minHeight = !autoPrestige ? 153.7f : 103.71f;

        if (autoPrestige)
        {
            percent = math.log10(infinityData.bots) / math.log10(amount);
            if (infinityData.bots < 1) percent = 0;
            fill.fillAmount = NumericUiAdapter.ToUnitInterval(percent, "infinity_progress");
            fillText.text = $" {percent * 100:N2}%";
            progressToInfinityText.text = "Progress to Infinity";
            realityBreak.SetActive(percent > 0.95f && prestigeData.infinityPoints < 42);
        }
        else
        {
            double amountForNextPoint =
                CalcUtils.BuyXCost(ipToGain + 1, amount, oracle.infinityExponent, 0);

            double breakTarget = Math.Max(1d, oracle.saveSettings.infinityPointsToBreakFor);
            long displayedGain = ipToGain;
            if (oracle.saveSettings.doubleIp)
                displayedGain = NumericSafety.Add(
                    displayedGain,
                    displayedGain).Value;
            if (prestigePlus.doubleIP)
                displayedGain = NumericSafety.Add(
                    displayedGain,
                    displayedGain).Value;
            fill.fillAmount = NumericUiAdapter.ToUnitInterval(
                displayedGain / breakTarget,
                "auto_infinity_progress");

            if (oracle.saveSettings.doubleIp)
                ipToGain = NumericSafety.Add(ipToGain, ipToGain).Value;
            if (prestigePlus.doubleIP)
                ipToGain = NumericSafety.Add(ipToGain, ipToGain).Value;
            fillText.text =
                $" {ipToGain}/{oracle.saveSettings.infinityPointsToBreakFor}";
            progressToInfinityText.text =
                $"{CalcUtils.FormatNumber(amountForNextPoint - infinityData.bots)} Bots till next Infinity Point";
            realityBreak.SetActive(false);
        }
    }
}
