using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class ScienceBoostUpgrade : ResearchOverlord
{
    [SerializeField] private double baseCost;
    [SerializeField] private float costMulti;
    [SerializeField] public double cost;
    [SerializeField] private int maxAffordable;
    [SerializeField] private TMP_Text _name;
    [SerializeField] private TMP_Text production;
    [SerializeField] private TMP_Text buttonCost;
    [SerializeField] private TMP_Text amountToBuy;
    [SerializeField] private Button internButton;
    private readonly string color = "<color=#00E1FF>";
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

    private void Start()
    {
        UpdateCostText();
    }

    private void Update()
    {
        UpdateCostText();
        internButton.interactable = cost <= dvid.science && !dvst.shouldersOfGiants && cost > 0;
        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var percentWholeNumber = dvid.scienceBoostOwned * dvid.scienceBoostPercent * 100;
        var botProduction = CalcUtils.FormatNumber((float)percentWholeNumber);

        production.text = dvid.scienceBoostOwned > 0
            ? $"Boosting by {color}{botProduction}%</color>"
            : "Purchase for a boost!";

        _name.text = dvid.scienceBoostOwned > 0
            ? $"Science boosts {color}{CalcUtils.FormatNumber(dvid.scienceBoostOwned)}</color>"
            : $"Science boost {color}0</color>";
    }

    public void PurchaseUpgrade()
    {
        if (!(cost <= dvid.science)) return;
        dvid.scienceBoostOwned += AmountToBuy((int)dvid.scienceBoostOwned, maxAffordable);

        dvid.science -= cost;
        UpdateCostText();
    }

    private void UpdateCostText()
    {
        if (dvst.shouldersOfGiants)
        {
            buttonCost.text = "Disabled";
            SetProductionSec();
            return;
        }

        var baseAmount = baseCost;
        if (dvst.repeatableResearch)
        {
            var boost1 = dvid.scienceBoostOwned * dvid.scienceBoostPercent;
            baseAmount /= 1 + boost1;
        }

        var totalOwned = (int)Math.Floor(dvid.scienceBoostOwned);
        maxAffordable = MaxAffordable(baseAmount, costMulti, totalOwned);
        cost = CalculateCosts(totalOwned, 0, baseAmount, costMulti);

        buttonCost.text = $"<sprite=1>{CalcUtils.FormatNumber(cost)}";

        switch (oracle.saveSettings.researchBuyMode)
        {
            case ResearchBuyMode.Buy1:
                amountToBuy.text = "+1";
                break;
            case ResearchBuyMode.Buy10:
            {
                amountToBuy.text = oracle.saveSettings.researchRoundedBulkBuy ? $"+{10f - totalOwned % 10}" : "+10";
            }
                break;
            case ResearchBuyMode.Buy50:
            {
                amountToBuy.text = oracle.saveSettings.researchRoundedBulkBuy ? $"+{50f - totalOwned % 50}" : "+50";
            }
                break;
            case ResearchBuyMode.Buy100:
            {
                amountToBuy.text = oracle.saveSettings.researchRoundedBulkBuy ? $"+{100f - totalOwned % 100}" : "+100";
            }
                break;
            case ResearchBuyMode.BuyMax:
                amountToBuy.text = $"+{maxAffordable}";
                break;
        }
    }
}