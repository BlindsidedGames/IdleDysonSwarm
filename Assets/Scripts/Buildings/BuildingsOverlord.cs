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
                return BuyMultiple.BuyX(1, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.Buy10:
            {
                return !oracle.saveSettings.roundedBulkBuy
                    ? BuyMultiple.BuyX(10, baseCost, costMulti, owned - minusX)
                    : BuyMultiple.BuyX(10f - owned % 10, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.Buy50:
            {
                return !oracle.saveSettings.roundedBulkBuy
                    ? BuyMultiple.BuyX(50, baseCost, costMulti, owned - minusX)
                    : BuyMultiple.BuyX(50f - owned % 50, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.Buy100:
            {
                return !oracle.saveSettings.roundedBulkBuy
                    ? BuyMultiple.BuyX(100, baseCost, costMulti, owned - minusX)
                    : BuyMultiple.BuyX(100f - owned % 100, baseCost, costMulti, owned - minusX);
            }
            case BuyMode.BuyMax:
                return BuyMultiple.BuyX(MaxAffordable(baseCost, costMulti, owned - minusX), baseCost, costMulti,
                    owned - minusX);
        }

        return 0;
    }

    public int MaxAffordable(double baseCost, double costMulti, long ownedMinusX)
    {
        int maxAffordable = BuyMultiple.MaxAffordable((float)infinityData.money, baseCost, costMulti,
            ownedMinusX);
        if (maxAffordable < 1) maxAffordable = 1;
        return maxAffordable;
    }

    public long AmountToBuy(long currentAmount, long maxAffordable)
    {
        return BuyModeHelper.GetAmountToBuy(
            oracle.saveSettings.buyMode, oracle.saveSettings.roundedBulkBuy,
            currentAmount, maxAffordable);
    }
}
