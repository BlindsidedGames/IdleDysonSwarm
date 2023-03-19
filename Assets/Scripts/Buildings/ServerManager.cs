using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class ServerManager : BuildingsOverlord
{
    [SerializeField] private float baseCost;
    [SerializeField] private float costMulti;
    [SerializeField] public double cost;
    [SerializeField] private int maxAffordable;
    [SerializeField] private TMP_Text server;
    [SerializeField] private TMP_Text production;
    [SerializeField] private TMP_Text buttonCost;
    [SerializeField] private TMP_Text amountToBuy;
    [SerializeField] private Button serverButton;
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
        serverButton.interactable = cost <= dvid.money && cost > 0;
        server.text = dvst.terraEculeo
            ? $"Servers {color}{CalcUtils.FormatNumber(dvid.servers[0] + dvid.servers[1])}<size=70%>{color1}({dvid.servers[1]} {colorS}+{(dvst.terraIrradiant ? dvid.planets[1] * 2 : dvid.planets[1])})"
            : $"Servers {color}{CalcUtils.FormatNumber(dvid.servers[0] + dvid.servers[1])}<size=70%>{color1}({dvid.servers[1]})";


        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var _production = dvid.managerProduction;
        if (_production >= 1)
        {
            production.text =
                $"Initiating {color}{CalcUtils.FormatNumber(_production)}</color> managers /s";
        }
        else if (_production > 0)
        {
            if (1 / _production < 60)
                production.text =
                    $"Initiating {color}1</color> manager /{color}{CalcUtils.FormatNumber(1 / _production)}</color>s";
            else
                production.text =
                    $"Initiating {color}1</color> manager /{color}{CalcUtils.FormatNumber(1 / _production / 60)}</color> Min";
        }
        else
        {
            production.text = "Build a Server";
        }
    }

    public void PurchaseServer()
    {
        if (cost <= dvid.money)
        {
            switch (oracle.saveSettings.buyMode)
            {
                case BuyMode.Buy1:
                    dvid.servers[1] += 1;
                    break;
                case BuyMode.Buy10:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.servers[1] += 10f - dvid.servers[1] % 10;
                    else
                        dvid.servers[1] += 10f;
                }
                    break;
                case BuyMode.Buy50:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.servers[1] += 50f - dvid.servers[1] % 50;
                    else
                        dvid.servers[1] += 50f;
                }
                    break;
                case BuyMode.Buy100:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.servers[1] += 100f - dvid.servers[1] % 100;
                    else
                        dvid.servers[1] += 100f;
                }
                    break;
                case BuyMode.BuyMax:
                    dvid.servers[1] += maxAffordable;
                    break;
            }

            dvid.money -= cost;
            UpdateCostText();
        }
    }

    public void UpdateCostText()
    {
        maxAffordable = MaxAffordable(baseCost, costMulti,
            dvpd.infinityServers ? (int)dvid.servers[1] - 10 : (int)dvid.servers[1]);
        cost = CalculateCosts((int)dvid.servers[1], dvpd.infinityServers ? 10 : 0, baseCost, costMulti);

        buttonCost.text = $"${CalcUtils.FormatNumber(cost)}";


        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
                amountToBuy.text = "+1";
                break;
            case BuyMode.Buy10:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{10f - dvid.servers[1] % 10}" : "+10";
            }
                break;
            case BuyMode.Buy50:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{50f - dvid.servers[1] % 50}" : "+50";
            }
                break;
            case BuyMode.Buy100:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{100f - dvid.servers[1] % 100}" : "+100";
            }
                break;
            case BuyMode.BuyMax:
                amountToBuy.text = $"+{maxAffordable}";
                break;
        }
    }
}