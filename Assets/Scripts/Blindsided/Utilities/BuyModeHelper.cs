using static Expansion.Oracle;

namespace Blindsided.Utilities
{
    /// <summary>
    /// Centralized BuyMode quantity calculation. Replaces duplicated switch logic
    /// across Building, BuildingsOverlord, MegaStructurePresenter, and ResearchPresenter.
    /// </summary>
    public static class BuyModeHelper
    {
        /// <summary>
        /// Calculates the number of items to buy based on the current buy mode.
        /// </summary>
        /// <param name="mode">The active buy mode.</param>
        /// <param name="roundedBulkBuy">Whether to round to the next multiple.</param>
        /// <param name="currentOwned">Current count of the item (for rounding).</param>
        /// <param name="maxAffordable">Max items the player can afford (for BuyMax).</param>
        /// <returns>The number of items to buy.</returns>
        public static long GetAmountToBuy(BuyMode mode, bool roundedBulkBuy, long currentOwned, long maxAffordable)
        {
            return mode switch
            {
                BuyMode.Buy1 => 1,
                BuyMode.Buy10 => roundedBulkBuy ? 10 - currentOwned % 10 : 10,
                BuyMode.Buy50 => roundedBulkBuy ? 50 - currentOwned % 50 : 50,
                BuyMode.Buy100 => roundedBulkBuy ? 100 - currentOwned % 100 : 100,
                BuyMode.BuyMax => maxAffordable > 0 ? maxAffordable : 1,
                _ => 1
            };
        }
    }
}
