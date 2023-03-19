using UnityEngine;
using static Oracle;

public class ResearchOverlord : MonoBehaviour
{
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;

    public double CalculateCosts(long owned, int minusX, double baseCost, double costMulti)
    {
        switch (oracle.saveSettings.researchBuyMode)
        {
            case ResearchBuyMode.Buy1:
            {
                return BuyMultiple.BuyX(1, baseCost, costMulti, owned - minusX);
            }
            case ResearchBuyMode.Buy10:
            {
                return !oracle.saveSettings.researchRoundedBulkBuy
                    ? BuyMultiple.BuyX(10, baseCost, costMulti, owned - minusX)
                    : BuyMultiple.BuyX(10f - owned % 10, baseCost, costMulti, owned - minusX);
            }
            case ResearchBuyMode.Buy50:
            {
                return !oracle.saveSettings.researchRoundedBulkBuy
                    ? BuyMultiple.BuyX(50, baseCost, costMulti, owned - minusX)
                    : BuyMultiple.BuyX(50f - owned % 50, baseCost, costMulti, owned - minusX);
            }
            case ResearchBuyMode.Buy100:
            {
                return !oracle.saveSettings.researchRoundedBulkBuy
                    ? BuyMultiple.BuyX(100, baseCost, costMulti, owned - minusX)
                    : BuyMultiple.BuyX(100f - owned % 100, baseCost, costMulti, owned - minusX);
            }
            case ResearchBuyMode.BuyMax:
                return BuyMultiple.BuyX(MaxAffordable(baseCost, costMulti, owned - minusX), baseCost, costMulti,
                    owned - minusX);
        }

        return 0;
    }

    public int MaxAffordable(double baseCost, double costMulti, long ownedMinusX)
    {
        var maxAffordable = BuyMultiple.MaxAffordable((float)dvid.science, baseCost, costMulti,
            ownedMinusX);
        if (maxAffordable < 1) maxAffordable = 1;
        return maxAffordable;
    }

    public long AmountToBuy(long currentAmount, long maxAffordable)
    {
        long amountToReturn = 0;
        switch (oracle.saveSettings.researchBuyMode)
        {
            case ResearchBuyMode.Buy1:
                amountToReturn = 1;
                break;
            case ResearchBuyMode.Buy10:
            {
                if (oracle.saveSettings.researchRoundedBulkBuy)
                    amountToReturn = 10 - currentAmount % 10;
                else amountToReturn = 10;
            }
                break;
            case ResearchBuyMode.Buy50:
            {
                if (oracle.saveSettings.researchRoundedBulkBuy)
                    amountToReturn = 50 - currentAmount % 50;
                else amountToReturn = 50;
            }
                break;
            case ResearchBuyMode.Buy100:
            {
                if (oracle.saveSettings.researchRoundedBulkBuy)
                    amountToReturn = 100 - currentAmount % 100;
                else amountToReturn = 100;
            }
                break;
            case ResearchBuyMode.BuyMax:
                amountToReturn = maxAffordable;
                break;
        }

        return amountToReturn;
    }
}