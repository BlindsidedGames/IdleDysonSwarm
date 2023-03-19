using System;
using Systems;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class PrestigeFillBar : MonoBehaviour
{
    [SerializeField] private SlicedFilledImage fill;
    [SerializeField] private TMP_Text fillText;
    [SerializeField] private GameObject realityBreak;

    [SerializeField] private GameObject manualInfinityButtonHolder;
    [SerializeField] private Button manualInfinityButton;
    [SerializeField] private TMP_Text manualInfinityButton_Text;
    [SerializeField] private TMP_Text progressToInfinityText;
    [SerializeField] private LayoutElement layoutElement;

    private double percent;

    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private SaveDataPrestige sdp => oracle.saveSettings.sdPrestige;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;

    private void Update()
    {
        var autoPrestige = !pp.breakTheLoop;
        var amount = pp.divisionsPurchased > 0 ? 4.2e19 / Math.Pow(10, pp.divisionsPurchased) : 4.2e19;
        var ipToGain = StaticMethods.InfinityPointsToGain(amount, dvid.bots);

        manualInfinityButtonHolder.SetActive(!autoPrestige);
        layoutElement.minHeight = !autoPrestige ? 148.71f : 103.71f;
        if (!autoPrestige)
            manualInfinityButton_Text.text =
                $"Break Reality for {(pp.doubleIP ? ipToGain * 2 : ipToGain)} Infinity Points";
        manualInfinityButton.interactable = ipToGain >= 1;

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
            var amountForNextPoint =
                BuyMultiple.BuyX(ipToGain + 1, amount, 1.2f, 0);

            percent = (dvid.bots -
                       BuyMultiple.BuyX(ipToGain, amount, 1.2f, 0)) /
                      (amountForNextPoint - BuyMultiple.BuyX(ipToGain, amount, 1.2f, 0));
            if (dvid.bots < 1) percent = 0;
            fill.fillAmount = (float)percent;
            fillText.text = $" {percent * 100:N2}%";
            progressToInfinityText.text =
                $"{CalcUtils.FormatNumber(amountForNextPoint - dvid.bots)} Bots till next Infinity Point";
            realityBreak.SetActive(percent > 0.95f && dvpd.infinityPoints < 42);
        }
    }
}