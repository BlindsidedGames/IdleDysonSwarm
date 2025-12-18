using System;
using MPUIKIT;
using Systems;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class PrestigeFillBar : MonoBehaviour
{
    [SerializeField] private MPImage fill;
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

    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;


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
        oracle.saveSettings.infinityPointsToBreakFor = (int)Math.Pow(10, ipToBreakForSlider.value) - 1;
    }

    private void Update()
    {
        bool autoPrestige = !pp.breakTheLoop;
        double amount = pp.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, pp.divisionsPurchased) : 4.2e19;
        int ipToGain = StaticMethods.InfinityPointsToGain(amount, dvid.bots);

        manualInfinityButtonHolder.SetActive(!autoPrestige);

        layoutElement.minHeight = !autoPrestige ? 153.7f : 103.71f;

        if (autoPrestige)
        {
            percent = math.log10(dvid.bots) / math.log10(amount);
            if (dvid.bots < 1) percent = 0;
            fill.fillAmount = (float)percent;
            fillText.text = $" {percent * 100:N2}%";
            progressToInfinityText.text = "Progress to Infinity";
            realityBreak.SetActive(percent > 0.95f && dvpd.infinityPoints < 42);
        }
        else
        {
            double amountForNextPoint =
                BuyMultiple.BuyX(ipToGain + 1, amount, oracle.infinityExponent, 0);

            fill.fillAmount = (pp.doubleIP ? ipToGain * 2 : ipToGain) /
                              (float)oracle.saveSettings.infinityPointsToBreakFor;

            ipToGain *= oracle.saveSettings.doubleIp ? 2 : 1;
            ipToGain *= pp.doubleIP ? 2 : 1;
            fillText.text =
                $" {ipToGain}/{oracle.saveSettings.infinityPointsToBreakFor}";
            progressToInfinityText.text =
                $"{CalcUtils.FormatNumber(amountForNextPoint - dvid.bots)} Bots till next Infinity Point";
            realityBreak.SetActive(false);
        }
    }
}