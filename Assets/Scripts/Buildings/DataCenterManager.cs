using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class DataCenterManager : BuildingsOverlord
{
    [SerializeField] private float baseCost;
    [SerializeField] private float costMulti;
    [SerializeField] public double cost;
    [SerializeField] private int maxAffordable;
    [SerializeField] private TMP_Text dataCenters;
    [SerializeField] private TMP_Text production;
    [SerializeField] private TMP_Text buttonCost;
    [SerializeField] private TMP_Text amountToBuy;
    [SerializeField] private Button internButton;
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
        internButton.interactable = cost <= dvid.money && cost > 0;

        dataCenters.text =
            dvst.terraFirma
                ? $"Data Centers {color}{CalcUtils.FormatNumber(dvid.dataCenters[0] + dvid.dataCenters[1])}<size=70%>{color1}({dvid.dataCenters[1]} {colorS}+{(dvst.terraIrradiant ? dvid.planets[1] * 2 : dvid.planets[1])})"
                : $"Data Centers {color}{CalcUtils.FormatNumber(dvid.dataCenters[0] + dvid.dataCenters[1])}<size=70%>{color1}({dvid.dataCenters[1]})";
        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var _production = dvid.dataCenterServerProduction;


        if (_production >= 1)
        {
            production.text =
                $"Booting {color}{CalcUtils.FormatNumber(_production)}</color> Servers /s";
        }
        else if (_production > 0)
        {
            if (1 / _production < 60)
                production.text =
                    $"Booting {color}1</color> Server /{color}{CalcUtils.FormatNumber(1 / _production)}</color>s";
            else
                production.text =
                    $"Booting {color}1</color> Server /{color}{CalcUtils.FormatNumber(1 / _production / 60)}</color> Min";
        }
        else
        {
            production.text = "Purchase a Data Center";
        }
    }

    public void PurchaseDataCenter()
    {
        if (cost <= dvid.money)
        {
            switch (oracle.saveSettings.buyMode)
            {
                case BuyMode.Buy1:
                    dvid.dataCenters[1] += 1;
                    break;
                case BuyMode.Buy10:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.dataCenters[1] += 10f - dvid.dataCenters[1] % 10;
                    else
                        dvid.dataCenters[1] += 10f;
                }
                    break;
                case BuyMode.Buy50:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.dataCenters[1] += 50f - dvid.dataCenters[1] % 50;
                    else
                        dvid.dataCenters[1] += 50f;
                }
                    break;
                case BuyMode.Buy100:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.dataCenters[1] += 100f - dvid.dataCenters[1] % 100;
                    else
                        dvid.dataCenters[1] += 100f;
                }
                    break;
                case BuyMode.BuyMax:
                    dvid.dataCenters[1] += maxAffordable;
                    break;
            }

            dvid.money -= cost;
            UpdateCostText();
        }
    }

    public void UpdateCostText()
    {
        maxAffordable = MaxAffordable(baseCost, costMulti,
            dvpd.infinityDataCenter ? (int)dvid.dataCenters[1] - 10 : (int)dvid.dataCenters[1]);
        cost = CalculateCosts((int)dvid.dataCenters[1], dvpd.infinityDataCenter ? 10 : 0, baseCost, costMulti);

        buttonCost.text = $"${CalcUtils.FormatNumber(cost)}";


        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
                amountToBuy.text = "+1";
                break;
            case BuyMode.Buy10:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{10f - dvid.dataCenters[1] % 10}" : "+10";
            }
                break;
            case BuyMode.Buy50:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{50f - dvid.dataCenters[1] % 50}" : "+50";
            }
                break;
            case BuyMode.Buy100:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{100f - dvid.dataCenters[1] % 100}" : "+100";
            }
                break;
            case BuyMode.BuyMax:
                amountToBuy.text = $"+{maxAffordable}";
                break;
        }
    }
}