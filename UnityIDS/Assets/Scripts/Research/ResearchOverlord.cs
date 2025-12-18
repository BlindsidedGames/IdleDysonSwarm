using UnityEngine;
using static Expansion.Oracle;

public class ResearchOverlord : MonoBehaviour
{
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;

    public double CalculateCosts(long owned, int minusX, double baseCost, double costMulti) => 0;

    public int MaxAffordable(double baseCost, double costMulti, long ownedMinusX)
    {
        int maxAffordable = BuyMultiple.MaxAffordable((float)dvid.science, baseCost, costMulti,
            ownedMinusX);
        if (maxAffordable < 1) maxAffordable = 1;
        return maxAffordable;
    }

    public long AmountToBuy(long currentAmount, long maxAffordable)
    {
        long amountToReturn = 0;


        return amountToReturn;
    }
}