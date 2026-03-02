using System.Collections.Generic;
using IdleDysonSwarm.Data.Balance;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Provides read-only access to facility balance metadata used by runtime and editor tooling.
    /// </summary>
    public interface IFacilityBalanceProvider
    {
        /// <summary>
        /// Gets all facility entries sorted by progression order.
        /// </summary>
        /// <returns>Ordered facility balance entries.</returns>
        IReadOnlyList<FacilityBalanceProfile.FacilityBalanceEntry> GetOrderedEntries();

        /// <summary>
        /// Tries to fetch a facility balance entry by facility ID.
        /// </summary>
        /// <param name="facilityId">Facility ID key.</param>
        /// <param name="entry">Resolved entry when found.</param>
        /// <returns>True when an entry exists for the ID.</returns>
        bool TryGetEntry(string facilityId, out FacilityBalanceProfile.FacilityBalanceEntry entry);
    }
}
