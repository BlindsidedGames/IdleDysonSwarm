using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;


public class PlanetManager : BuildingsOverlord
{
    [SerializeField] private double baseCost;
    [SerializeField] private float costMulti;
    [SerializeField] public double cost;
    [SerializeField] private int maxAffordable;
    [SerializeField] private TMP_Text planet;
    [SerializeField] private TMP_Text production;
    [SerializeField] private TMP_Text buttonCost;
    [SerializeField] private TMP_Text amountToBuy;
    [SerializeField] private Button planetButton;
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
        planetButton.interactable = cost <= dvid.money && cost > 0;
        planet.text =
            $"Planets {color}{CalcUtils.FormatNumber(dvid.planets[0] + dvid.planets[1])}<size=70%>{color1}({dvid.planets[1]})";

        SetProductionSec();
    }

    private void SetProductionSec()
    {
        var _production = dvid.planetsDataCenterProduction;
        if (_production >= 1)
        {
            production.text =
                $"Creating {color}{CalcUtils.FormatNumber(_production)}</color> Data Centers /s";
        }
        else if (_production > 0)
        {
            if (1 / _production < 60)
                production.text =
                    $"Creating {color}1</color> Data Center /{color}{CalcUtils.FormatNumber(1 / _production)}</color>s";
            else
                production.text =
                    $"Creating {color}1</color> Data Center /{color}{CalcUtils.FormatNumber(1 / _production / 60)}</color> Min";
        }
        else
        {
            production.text = "Discover a Planet";
        }
    }

    public void PurchasePlanet()
    {
        if (cost <= dvid.money)
        {
            switch (oracle.saveSettings.buyMode)
            {
                case BuyMode.Buy1:
                    dvid.planets[1] += 1;
                    break;
                case BuyMode.Buy10:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.planets[1] += 10f - dvid.planets[1] % 10;
                    else
                        dvid.planets[1] += 10f;
                }
                    break;
                case BuyMode.Buy50:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.planets[1] += 50f - dvid.planets[1] % 50;
                    else
                        dvid.planets[1] += 50f;
                }
                    break;
                case BuyMode.Buy100:
                {
                    if (oracle.saveSettings.roundedBulkBuy)
                        dvid.planets[1] += 100f - dvid.planets[1] % 100;
                    else
                        dvid.planets[1] += 100f;
                }
                    break;
                case BuyMode.BuyMax:
                    dvid.planets[1] += maxAffordable;
                    break;
            }

            dvid.money -= cost;
            UpdateCostText();
        }
    }

    public void UpdateCostText()
    {
        var baseAmount = baseCost;
        if (dvst.terraNova && dvid.planets[0] + dvid.planets[1] > 0)
            baseAmount /= dvid.planetModifier;

        if (dvst.terraGloriae && dvid.planets[0] + dvid.planets[1] > 0)
            baseAmount /= dvid.planets[0] + dvid.planets[1];

        maxAffordable = MaxAffordable(baseAmount, costMulti,
            dvpd.infinityPlanets ? (int)dvid.planets[1] - 10 : (int)dvid.planets[1]);
        cost = CalculateCosts((int)dvid.planets[1], dvpd.infinityPlanets ? 10 : 0, baseAmount, costMulti);

        buttonCost.text = $"${CalcUtils.FormatNumber(cost)}";


        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
                amountToBuy.text = "+1";
                break;
            case BuyMode.Buy10:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{10f - dvid.planets[1] % 10}" : "+10";
            }
                break;
            case BuyMode.Buy50:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{50f - dvid.planets[1] % 50}" : "+50";
            }
                break;
            case BuyMode.Buy100:
            {
                amountToBuy.text = oracle.saveSettings.roundedBulkBuy ? $"+{100f - dvid.planets[1] % 100}" : "+100";
            }
                break;
            case BuyMode.BuyMax:
                amountToBuy.text = $"+{maxAffordable}";
                break;
        }
    }
}