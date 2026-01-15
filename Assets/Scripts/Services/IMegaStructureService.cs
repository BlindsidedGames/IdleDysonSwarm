namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for mega-structure facility purchases.
    /// Mega-structures cost other facilities instead of currency.
    /// </summary>
    public interface IMegaStructureService
    {
        /// <summary>
        /// Checks if the player can afford the specified quantity of a mega-structure.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <param name="quantity">Number to purchase (default 1).</param>
        /// <returns>True if the player has enough facilities to cover the cost.</returns>
        bool CanAfford(string facilityId, int quantity = 1);

        /// <summary>
        /// Gets the primary facility cost for purchasing the specified quantity.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <param name="quantity">Number to purchase (default 1).</param>
        /// <returns>Amount of the primary cost facility that will be consumed.</returns>
        double GetCost(string facilityId, int quantity = 1);

        /// <summary>
        /// Gets the secondary facility cost (for Galactic Brain).
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <param name="quantity">Number to purchase (default 1).</param>
        /// <returns>Amount of the secondary cost facility that will be consumed, or 0 if none.</returns>
        double GetSecondaryCost(string facilityId, int quantity = 1);

        /// <summary>
        /// Gets the ID of the facility used as the primary cost.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <returns>The facility ID consumed, or null if not a mega-structure.</returns>
        string GetCostFacilityId(string facilityId);

        /// <summary>
        /// Gets the ID of the facility used as the secondary cost.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <returns>The secondary facility ID consumed, or null if none.</returns>
        string GetSecondaryCostFacilityId(string facilityId);

        /// <summary>
        /// Calculates the maximum number of mega-structures affordable.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <returns>Maximum purchasable quantity.</returns>
        int MaxAffordable(string facilityId);

        /// <summary>
        /// Attempts to purchase the specified quantity of a mega-structure.
        /// Deducts facility costs if successful.
        /// </summary>
        /// <param name="facilityId">The mega-structure facility ID.</param>
        /// <param name="quantity">Number to purchase (default 1).</param>
        /// <returns>True if purchase was successful.</returns>
        bool TryPurchase(string facilityId, int quantity = 1);

        /// <summary>
        /// Checks if a facility is a mega-structure (uses facility cost).
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
