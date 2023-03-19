using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class ManagerManager : BuildingsOverlord
{
    [SerializeField] private float baseCost;
    [SerializeField] private float costMulti;
    [SerializeField] public double cost;
    [SerializeField] private int maxAffordable;
    [SerializeField] private TMP_Text managers;
    [SerializeField] private TMP_Text production;
    [SerializeField] private TMP_Text buttonCost;
    [SerializeField] private TMP_Text amountToBuy;
    [SerializeField] private Button managerButton;
    private readonly string color = "<color=#FFA45E>";
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

    private void Start()
    {
        UpdateCostText();
    }

    private void Update()
    {
        UpdateCostText();
        var color1 = "<color=#91DD8F>";
        var colorS = "<color=#00E1FF>";
        managerButton.interactable = cost <= dvid.money && cost > 0;
        managers.text = dvst.terraInfirma
            ? $"AI Managers {color}{CalcUtils.FormatNumber(dvid.managers[0] + dvid.managers[1])}<size=70%>{color1}({dvid.managers[1]} {colorS}+{(dvst.terraIrradiant ? dvid.planets[1] * 2 : dvid.planets[1])})"
            : $"AI Managers {color}{CalcUtils.FormatNumber(dvid.managers[0] + dvid.managers[1])}<size=70%>{color1}({dvid.managers[1]})";
        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var _production = dvid.managerAssemblyLineProduction;
        if (_production >= 1)
        {
            production.text =
                $"Generating {color}{CalcUtils.FormatNumber(_production)}</color> lines /s";
        }
        else if (_production > 0)
        {
            if (1 / _production < 60)
                production.text =
                    $"Generating {color}1</color> line /{color}{CalcUtils.FormatNumber(1 / _production)}</color>s";
            else
                production.text =
                    $"Generating {color}1</color> line /{color}{CalcUtils.FormatNumber(1 / _production / 60)}</color> Min";
        }
        else
        {
            production.text = "Purchase a Manager";
        }
    }

    public void PurchaseManager()
    {
        if (cost <= dvid.money)
        {
            switch (oracle.saveSettings.buyMode)
            {
                case BuyMode.Buy1:
                    dvid.managers[1] += 1;
                    break;
                case BuyMode.Buy10:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.managers[1] += 10f - dvid.managers[1] % 10;
                    else
                        dvid.managers[1] += 10f;
                }
                    break;
                case BuyMode.Buy50:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.managers[1] += 50f - dvid.managers[1] % 50;
                    else
                        dvid.managers[1] += 50f;
                }
                    break;
                case BuyMode.Buy100:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.managers[1] += 100f - dvid.managers[1] % 100;
                    else
                        dvid.managers[1] += 100f;
                }
                    break;
                case BuyMode.BuyMax:
                    dvid.managers[1] += maxAffordable;
                    break;
            }

            dvid.money -= cost;
            UpdateCostText();
        }
    }

    public void UpdateCostText()
    {
        maxAffordable = MaxAffordable(baseCost, costMulti,
            dvpd.infinityAiManagers ? (int)dvid.managers[1] - 10 : (int)dvid.managers[1]);
        cost = CalculateCosts((int)dvid.managers[1], dvpd.infinityAiManagers ? 10 : 0, baseCost, costMulti);

        buttonCost.text = $"${CalcUtils.FormatNumber(cost)}";


        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
                amountToBuy.text = "+1";
                break;
            case BuyMode.Buy10:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{10f - dvid.managers[1] % 10}" : "+10";
            }
                break;
            case BuyMode.Buy50:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{50f - dvid.managers[1] % 50}" : "+50";
            }
                break;
            case BuyMode.Buy100:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{100f - dvid.managers[1] % 100}" : "+100";
            }
                break;
            case BuyMode.BuyMax:
                amountToBuy.text = $"+{maxAffordable}";
                break;
        }
    }
}