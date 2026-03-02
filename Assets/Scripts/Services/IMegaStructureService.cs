namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for mega-structure facility purchases.
    /// Mega-structures are purchased with cash while preserving quantum unlock gates.
    /// </summary>
    public interface IMegaStructureService
    {
        /// <summary>
        /// Gets the cash cost for purchasing the specified quantity.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <param name="quantity">Number to purchase (default 1).</param>
        /// <returns>Cash cost value.</returns>
        double GetCost(string facilityId, int quantity = 1);

        /// <summary>
        /// Checks if the player can afford the specified quantity of a mega-structure.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <param name="quantity">Number to purchase (default 1).</param>
        /// <returns>True if the player has enough cash to cover the cost.</returns>
        bool CanAfford(string facilityId, int quantity = 1);

        /// <summary>
        /// Calculates the maximum number of mega-structures affordable.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <returns>Maximum purchasable quantity.</returns>
        int MaxAffordable(string facilityId);

        /// <summary>
        /// Attempts to purchase the specified quantity of a mega-structure.
        /// Deducts cash if successful.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <param name="quantity">Number to purchase (default 1).</param>
        /// <returns>True if purchase was successful.</returns>
        bool TryPurchase(string facilityId, int quantity = 1);

        /// <summary>
        /// Checks if a facility is a mega-structure.
        /// </summary>
        /// <param name="facilityId">The facility ID to check.</param>
        /// <returns>True if it's a mega-structure.</returns>
        bool IsMegaStructure(string facilityId);

        /// <summary>
        /// Checks if a mega-structure is unlocked (via Quantum upgrade).
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <returns>True if unlocked and available for purchase.</returns>
        bool IsUnlocked(string facilityId);
    }
}
