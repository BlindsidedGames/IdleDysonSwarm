using GameData;
using IdleDysonSwarm.Data;
using Systems.Facilities;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for facility management operations.
    /// Provides high-level facility operations (getting runtime data, state, counts).
    /// </summary>
    public interface IFacilityService
    {
        /// <summary>
        /// Attempts to build the runtime data for a facility.
        /// </summary>
        /// <param name="facilityId">The facility ID</param>
        /// <param name="runtime">The facility runtime data if successful</param>
        /// <returns>True if the runtime was built successfully, false otherwise</returns>
        bool TryGetFacilityRuntime(string facilityId, out FacilityRuntime runtime);

        /// <summary>
        /// Attempts to build the runtime data for a facility using typed ID.
        /// </summary>
        bool TryGetFacilityRuntime(FacilityId facilityId, out FacilityRuntime runtime);

        /// <summary>
        /// Gets the current state (counts, production, etc.) for a facility.
        /// </summary>
        /// <param name="facilityId">The facility ID</param>
        /// <returns>The facility state, or null if the facility doesn't exist</returns>
        FacilityState GetFacilityState(string facilityId);

        /// <summary>
        /// Gets the current state for a facility using typed ID.
        /// </summary>
        FacilityState GetFacilityState(FacilityId facilityId);

        /// <summary>
        /// Sets the facility count (manual and auto).
        /// </summary>
        /// <param name="facilityId">The facility ID</param>
        /// <param name="manual">The manual count</param>
        /// <param name="auto">The auto count</param>
        void SetFacilityCount(string facilityId, double manual, double auto);

        /// <summary>
        /// Gets the facility count (returns [auto, manual]).
        /// </summary>
        /// <param name="facilityId">The facility ID</param>
        /// <returns>Array containing [auto, manual] counts</returns>
        double[] GetFacilityCount(string facilityId);
    }
}
