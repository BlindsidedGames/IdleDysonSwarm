using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class AssemblyLineManager : BuildingsOverlord
{
    [SerializeField] private double baseCost;
    [SerializeField] private float costMulti;
    [SerializeField] public double cost;
    [SerializeField] private int maxAffordable;
    [SerializeField] private TMP_Text interns;
    [SerializeField] private TMP_Text production;
    [SerializeField] private TMP_Text buttonCost;
    [SerializeField] private TMP_Text amountToBuy;
    [SerializeField] private Button internButton;
    private readonly string color = "<color=#FFA45E>";
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
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
        internButton.interactable = cost <= dvid.money && cost > 0;
        interns.text = dvst.terraNullius
            ? $"Assembly Lines {color}{CalcUtils.FormatNumber(dvid.assemblyLines[0] + dvid.assemblyLines[1])}<size=70%>{color1}({dvid.assemblyLines[1]} {colorS}+{(dvst.terraIrradiant ? dvid.planets[1] * 2 : dvid.planets[1])})"
            : $"Assembly Lines {color}{CalcUtils.FormatNumber(dvid.assemblyLines[0] + dvid.assemblyLines[1])}<size=70%>{color1}({dvid.assemblyLines[1]})";
        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var _production = dvid.assemblyLineBotProduction;


        if (_production >= 1)
        {
            production.text =
                $"Producing {color}{CalcUtils.FormatNumber(_production)}</color> bots /s";
        }
        else if (_production > 0)
        {
            if (1 / _production < 60)
                production.text =
                    $"Producing {color}1</color> bot /{color}{CalcUtils.FormatNumber(1 / _production)}</color>s";
            else
                production.text =
                    $"Producing {color}1</color> bot /{color}{CalcUtils.FormatNumber(1 / _production / 60)}</color> Min";
        }
        else
        {
            production.text = "Purchase an Assembly Line";
        }
    }

    public void PurchaseIntern()
    {
        if (cost <= dvid.money)
        {
            switch (oracle.saveSettings.buyMode)
            {
                case BuyMode.Buy1:
                    dvid.assemblyLines[1] += 1;
                    break;
                case BuyMode.Buy10:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.assemblyLines[1] += 10f - dvid.assemblyLines[1] % 10;
                    else
                        dvid.assemblyLines[1] += 10f;
                }
                    break;
                case BuyMode.Buy50:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.assemblyLines[1] += 50f - dvid.assemblyLines[1] % 50;
                    else
                        dvid.assemblyLines[1] += 50f;
                }
                    break;
                case BuyMode.Buy100:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.assemblyLines[1] += 100f - dvid.assemblyLines[1] % 100;
                    else
                        dvid.assemblyLines[1] += 100f;
                }
                    break;
                case BuyMode.BuyMax:
                    dvid.assemblyLines[1] += maxAffordable;
                    break;
            }

            dvid.money -= cost;
            UpdateCostText();
        }
    }

    public void UpdateCostText()
    {
        var baseAmount = baseCost;
        if (dvst.assemblyMegaLines && dvid.planets[0] + dvid.planets[1] > 0)
            baseAmount /= dvid.planets[0] + dvid.planets[1];
        maxAffordable = MaxAffordable(baseAmount, costMulti,
            dvpd.infinityAssemblyLines ? (int)dvid.assemblyLines[1] - 10 : (int)dvid.assemblyLines[1]);
        cost = CalculateCosts((int)dvid.assemblyLines[1], dvpd.infinityAssemblyLines ? 10 : 0, baseAmount, costMulti);
        buttonCost.text = $"${CalcUtils.FormatNumber(cost)}";


        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
                amountToBuy.text = "+1";
                break;
            case BuyMode.Buy10:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{10f - dvid.assemblyLines[1] % 10}" : "+10";
            }
                break;
            case BuyMode.Buy50:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{50f - dvid.assemblyLines[1] % 50}" : "+50";
            }
                break;
            case BuyMode.Buy100:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy
                    ? $"+{100f - dvid.assemblyLines[1] % 100}"
                    : "+100";
            }
                break;
            case BuyMode.BuyMax:
                amountToBuy.text = $"+{maxAffordable}";
                break;
        }
    }
}