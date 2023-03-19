using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class AssemblyLineUpgrade : ResearchOverlord
{
    [SerializeField] private double baseCost;
    [SerializeField] private float costMulti;
    [SerializeField] public double cost;
    [SerializeField] private long maxAffordable;
    [SerializeField] private TMP_Text _name;
    [SerializeField] private TMP_Text production;
    [SerializeField] private TMP_Text buttonCost;
    [SerializeField] private TMP_Text amountToBuy;
    [SerializeField] private Button internButton;
    private readonly string color = "<color=#00E1FF>";
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

    private void Start()
    {
        UpdateCostText();
    }

    private void Update()
    {
        UpdateCostText();
        internButton.interactable = cost <= dvid.science && cost > 0;
        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var percentWholeNumber = dvid.assemblyLineUpgradeOwned * dvid.assemblyLineUpgradePercent * 100;
        var amount = CalcUtils.FormatNumber((float)percentWholeNumber);

        production.text = dvid.assemblyLineUpgradeOwned > 0
            ? $"Boosting by {color}{amount}%</color>"
            : "Purchase for a boost!";

        _name.text = dvid.assemblyLineUpgradeOwned > 0
            ? $"Assembly Line boosts {color}{dvid.assemblyLineUpgradeOwned}</color>"
            : $"Assembly Line boost {color}0</color>";
    }

    public void PurchaseUpgrade()
    {
        if (!(cost <= dvid.science)) return;
        dvid.assemblyLineUpgradeOwned += AmountToBuy((int)dvid.assemblyLineUpgradeOwned, maxAffordable);

        dvid.science -= cost;
        UpdateCostText();
    }

    private void UpdateCostText()
    {
        var baseAmount = baseCost;
        if (dvst.repeatableResearch)
        {
            var boost1 = dvid.assemblyLineUpgradeOwned * dvid.assemblyLineUpgradePercent;
            baseAmount /= 1 + boost1;
        }

        var totalOwned = dvid.assemblyLineUpgradeOwned;
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