using Blindsided.Utilities;
using UnityEngine;
using static Expansion.Oracle;

public class BuildingsOverlord : MonoBehaviour
{
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;

    public double CalculateCosts(long owned, int minusX, double baseCost, double costMulti)
    {
        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
            {
                return CalcUtils.BuyXCost(1, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.Buy10:
            {
                return !oracle.saveSettings.roundedBulkBuy
                    ? CalcUtils.BuyXCost(10, baseCost, costMulti, owned - minusX)
                    : CalcUtils.BuyXCost(10f - owned % 10, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.Buy50:
            {
                return !oracle.saveSettings.roundedBulkBuy
                    ? CalcUtils.BuyXCost(50, baseCost, costMulti, owned - minusX)
                    : CalcUtils.BuyXCost(50f - owned % 50, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.Buy100:
            {
                return !oracle.saveSettings.roundedBulkBuy
                    ? CalcUtils.BuyXCost(100, baseCost, costMulti, owned - minusX)
                    : CalcUtils.BuyXCost(100f - owned % 100, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.BuyMax:
                return CalcUtils.BuyXCost(MaxAffordable(baseCost, costMulti, owned - minusX), baseCost, costMulti,
                    owned - minusX);
        }

        return 0;
    }

    public int MaxAffordable(double baseCost, double costMulti, long ownedMinusX)
    {
        int maxAffordable = CalcUtils.MaxAffordable((float)infinityData.money, baseCost, costMulti,
            ownedMinusX);
        if (maxAffordable < 1) maxAffordable = 1;
        return maxAffordable;
    }

    public long AmountToBuy(long currentAmount, long maxAffordable)
    {
        long amountToReturn = 0;
        switch (oracle.saveSettings.buyMode)
        {
            case BuyMode.Buy1:
                amountToReturn = 1;
                break;
            case BuyMode.Buy10:
            {
                if (oracle.saveSettings.roundedBulkBuy)
                    amountToReturn = 10 - currentAmount % 10;
                else amountToReturn = 10;
            }
                break;
            case BuyMode.Buy50:
            {
                if (oracle.saveSettings.roundedBulkBuy)
                    amountToReturn = 50 - currentAmount % 50;
                else amountToReturn = 50;
            }
                break;
            case BuyMode.Buy100:
            {
                if (oracle.saveSettings.roundedBulkBuy)
                    amountToReturn = 100 - currentAmount % 100;
                else amountToReturn = 100;
            }
                break;
            case BuyMode.BuyMax:
                amountToReturn = maxAffordable;
                break;
        }

        return amountToReturn;
    }
}
