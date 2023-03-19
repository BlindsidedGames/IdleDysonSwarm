using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class ServerManagerUpgrade : ResearchOverlord
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
        internButton.interactable = cost <= dvid.science && cost > 0;
        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var percentWholeNumber = dvid.serverUpgradeOwned * dvid.serverUpgradePercent * 100;
        var amount = CalcUtils.FormatNumber((float)percentWholeNumber);

        production.text = dvid.serverUpgradeOwned > 0
            ? $"Boosting by {color}{amount}%</color>"
            : "Purchase for a boost!";

        _name.text = dvid.serverUpgradeOwned > 0
            ? $"Server boosts {color}{dvid.serverUpgradeOwned}</color>"
            : $"Server boost {color}0</color>";
    }

    public void PurchaseUpgrade()
    {
        if (!(cost <= dvid.science)) return;
        dvid.serverUpgradeOwned += AmountToBuy((int)dvid.serverUpgradeOwned, maxAffordable);

        dvid.science -= cost;
        UpdateCostText();
    }

    private void UpdateCostText()
    {
        var baseAmount = baseCost;
        if (dvst.repeatableResearch)
        {
            var boost1 = dvid.serverUpgradeOwned * dvid.serverUpgradePercent;
            baseAmount /= 1 + boost1;
        }

        var totalOwned = dvid.serverUpgradeOwned;
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